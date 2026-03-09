import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  ArrowRight,
  LogOut,
  Briefcase,
  Calendar,
  DollarSign,
  FolderOpen,
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  closing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function GuestDeals() {
  const [, setLocation] = useLocation();

  const sessionQuery = useQuery<any>({
    queryKey: ["/api/guest/session"],
    queryFn: async () => {
      const res = await fetch("/api/guest/session");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
  });

  useEffect(() => {
    if (sessionQuery.error) {
      setLocation("/guest/login");
    }
  }, [sessionQuery.error, setLocation]);

  const dealsQuery = useQuery<any[]>({
    queryKey: ["/api/guest/deals"],
    queryFn: async () => {
      const res = await fetch("/api/guest/deals");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !sessionQuery.error && !sessionQuery.isLoading,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/guest/logout", { method: "POST" });
    },
    onSuccess: () => setLocation("/"),
  });

  const deals = dealsQuery.data || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-4 md:px-6 py-3 flex items-center justify-between gap-2 sticky top-0 z-50 bg-background">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">SENTINEL COUNSEL LLP</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()} data-testid="button-guest-logout">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </header>

      <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-xl font-semibold mb-1" data-testid="text-page-title">Shared Deals</h1>
        <p className="text-sm text-muted-foreground mb-6">Deals that have been shared with you for review.</p>

        {dealsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : deals.length === 0 ? (
          <Card className="p-8 text-center" data-testid="no-deals">
            <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No deals have been shared with you yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {deals.map((deal: any) => (
              <Card
                key={deal.id}
                className="p-4 hover-elevate cursor-pointer"
                onClick={() => setLocation(`/guest/deals/${deal.id}`)}
                data-testid={`card-deal-${deal.id}`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.deal_number} &middot; {deal.deal_type?.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {deal.deal_value && deal.deal_value !== "0" && (
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: deal.deal_currency || "USD", maximumFractionDigits: 0 }).format(parseFloat(deal.deal_value))}
                      </Badge>
                    )}
                    {deal.status && <Badge className={statusColors[deal.status] || ""}>{deal.status}</Badge>}
                    {deal.shared_at && (
                      <span className="text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Shared {format(new Date(deal.shared_at), "MMM d")}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        Sentinel Counsel LLP &middot; Secure Deal Portal
      </footer>
    </div>
  );
}
