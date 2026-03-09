import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Flag,
  FileText,
  LogOut,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  closing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  terminated: "bg-red-500/20 text-red-400 border-red-500/30",
};

const priorityColors: Record<string, string> = {
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatDate(d: string | null | undefined) {
  if (!d) return "\u2014";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return "\u2014"; }
}

function formatCurrency(v: string | number | null | undefined, currency = "USD") {
  if (!v || v === "0") return "\u2014";
  const num = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
}

export default function GuestDealView() {
  const [, params] = useRoute("/guest/deals/:dealId");
  const dealId = params?.dealId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

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

  const dealQuery = useQuery<any>({
    queryKey: ["/api/guest/deals", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/guest/deals/${dealId}`);
      if (!res.ok) throw new Error("Access denied");
      return res.json();
    },
    enabled: !!dealId && !sessionQuery.error,
  });

  const milestonesQuery = useQuery<any[]>({
    queryKey: ["/api/guest/deals", dealId, "milestones"],
    queryFn: async () => {
      const res = await fetch(`/api/guest/deals/${dealId}/milestones`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!dealId && !sessionQuery.error,
  });

  const participantsQuery = useQuery<any[]>({
    queryKey: ["/api/guest/deals", dealId, "participants"],
    queryFn: async () => {
      const res = await fetch(`/api/guest/deals/${dealId}/participants`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!dealId && !sessionQuery.error,
  });

  const issuesQuery = useQuery<any[]>({
    queryKey: ["/api/guest/deals", dealId, "issues"],
    queryFn: async () => {
      const res = await fetch(`/api/guest/deals/${dealId}/issues`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!dealId && !sessionQuery.error,
  });

  const termsQuery = useQuery<any[]>({
    queryKey: ["/api/guest/deals", dealId, "terms"],
    queryFn: async () => {
      const res = await fetch(`/api/guest/deals/${dealId}/terms`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!dealId && !sessionQuery.error,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/guest/logout", { method: "POST" });
    },
    onSuccess: () => setLocation("/"),
  });

  const deal = dealQuery.data;
  const milestones = milestonesQuery.data || [];
  const participants = participantsQuery.data || [];
  const issues = issuesQuery.data || [];
  const terms = termsQuery.data || [];

  if (sessionQuery.isLoading || dealQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GuestHeader onLogout={() => logoutMutation.mutate()} />
        <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-48 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GuestHeader onLogout={() => logoutMutation.mutate()} />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4 p-8 text-center" data-testid="guest-deal-not-found">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Deal Not Found</h2>
            <p className="text-muted-foreground text-sm mb-4">
              This deal may have been removed or your access has been revoked.
            </p>
            <Button onClick={() => setLocation("/guest/deals")} data-testid="button-back-to-deals">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Deals
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GuestHeader onLogout={() => logoutMutation.mutate()} />

      <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/guest/deals")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold" data-testid="text-deal-title">{deal.title}</h1>
              {deal.status && <Badge className={statusColors[deal.status] || ""} data-testid="badge-status">{deal.status}</Badge>}
              {deal.priority && <Badge className={priorityColors[deal.priority] || ""} data-testid="badge-priority">{deal.priority} Priority</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {deal.deal_number} &middot; {deal.deal_type?.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap" data-testid="tabs-list">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="terms" data-testid="tab-terms">Deal Terms</TabsTrigger>
            <TabsTrigger value="parties" data-testid="tab-parties">Parties</TabsTrigger>
            <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones</TabsTrigger>
            <TabsTrigger value="issues" data-testid="tab-issues">Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4" data-testid="card-deal-value">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Deal Value</span>
                </div>
                <p className="text-lg font-semibold">{formatCurrency(deal.deal_value, deal.deal_currency)}</p>
              </Card>
              <Card className="p-4" data-testid="card-target-close">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Target Close</span>
                </div>
                <p className="text-lg font-semibold">{formatDate(deal.closing_target_date)}</p>
              </Card>
              <Card className="p-4" data-testid="card-participants-count">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Participants</span>
                </div>
                <p className="text-lg font-semibold">{participants.length}</p>
              </Card>
              <Card className="p-4" data-testid="card-milestones-count">
                <div className="flex items-center gap-2 mb-1">
                  <Flag className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Milestones</span>
                </div>
                <p className="text-lg font-semibold">{milestones.length}</p>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5" data-testid="card-deal-details">
                <CardHeader className="p-0 mb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Deal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                  <DetailRow label="Deal Type" value={deal.deal_type?.replace(/_/g, " ")} />
                  <DetailRow label="Sub-Type" value={deal.sub_type} />
                  <DetailRow label="Currency" value={deal.deal_currency || "USD"} />
                  <DetailRow label="Structure" value={deal.deal_structure} />
                </CardContent>
              </Card>

              <Card className="p-5" data-testid="card-key-dates">
                <CardHeader className="p-0 mb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Key Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                  <DetailRow label="LOI Date" value={formatDate(deal.loi_date)} />
                  <DetailRow label="Signing Target" value={formatDate(deal.signing_target_date)} />
                  <DetailRow label="Closing Target" value={formatDate(deal.closing_target_date)} />
                  <DetailRow label="Exclusivity Expires" value={formatDate(deal.exclusivity_expiration)} />
                  <DetailRow label="Created" value={formatDate(deal.created_at)} />
                </CardContent>
              </Card>
            </div>

            {deal.buyer_parties && (
              <Card className="p-5" data-testid="card-buyer-parties">
                <CardHeader className="p-0 mb-3">
                  <CardTitle className="text-sm">Buyer Parties</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <PartiesDisplay parties={deal.buyer_parties} />
                </CardContent>
              </Card>
            )}
            {deal.seller_parties && (
              <Card className="p-5" data-testid="card-seller-parties">
                <CardHeader className="p-0 mb-3">
                  <CardTitle className="text-sm">Seller Parties</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <PartiesDisplay parties={deal.seller_parties} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="terms" className="mt-4">
            {terms.length === 0 ? (
              <Card className="p-8 text-center" data-testid="no-terms">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No deal terms have been added yet.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {terms.map((term: any) => (
                  <Card key={term.id} className="p-4" data-testid={`card-term-${term.id}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-sm">{term.term_name || term.name}</p>
                        {term.category && <Badge variant="outline" className="mt-1 text-xs">{term.category}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{term.term_value || term.value || "\u2014"}</p>
                    </div>
                    {term.description && <p className="text-xs text-muted-foreground mt-2">{term.description}</p>}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="parties" className="mt-4">
            {participants.length === 0 ? (
              <Card className="p-8 text-center" data-testid="no-parties">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No participants have been added yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {participants.map((p: any) => (
                  <Card key={p.id} className="p-4" data-testid={`card-participant-${p.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {(p.first_name?.[0] || p.email?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email || "Unknown"}
                        </p>
                        {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                      </div>
                      {p.role && <Badge variant="outline" className="text-xs">{p.role}</Badge>}
                      {p.team && <Badge variant="secondary" className="text-xs">{p.team}</Badge>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="milestones" className="mt-4">
            {milestones.length === 0 ? (
              <Card className="p-8 text-center" data-testid="no-milestones">
                <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No milestones have been added yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {milestones.map((m: any) => (
                  <Card key={m.id} className="p-4" data-testid={`card-milestone-${m.id}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {m.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <p className="text-sm font-medium">{m.title || m.milestone_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.category && <Badge variant="outline" className="text-xs">{m.category}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(m.target_date)}
                        </span>
                      </div>
                    </div>
                    {m.description && <p className="text-xs text-muted-foreground mt-1 ml-6">{m.description}</p>}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="issues" className="mt-4">
            {issues.length === 0 ? (
              <Card className="p-8 text-center" data-testid="no-issues">
                <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No issues have been logged.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {issues.map((issue: any) => (
                  <Card key={issue.id} className="p-4" data-testid={`card-issue-${issue.id}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium">{issue.title}</p>
                        {issue.description && <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {issue.severity && (
                          <Badge className={
                            issue.severity === "critical" ? "bg-red-500/20 text-red-400" :
                            issue.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                            issue.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-blue-500/20 text-blue-400"
                          }>
                            {issue.severity}
                          </Badge>
                        )}
                        {issue.status && <Badge variant="outline" className="text-xs">{issue.status}</Badge>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        Sentinel Counsel LLP &middot; Secure Deal Portal
      </footer>
    </div>
  );
}

function GuestHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="border-b px-4 md:px-6 py-3 flex items-center justify-between gap-2 sticky top-0 z-50 bg-background">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">SENTINEL COUNSEL LLP</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onLogout} data-testid="button-guest-logout">
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
    </header>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "\u2014"}</span>
    </div>
  );
}

function PartiesDisplay({ parties }: { parties: any }) {
  if (!parties) return null;
  const parsed = typeof parties === "string" ? JSON.parse(parties) : parties;
  if (!Array.isArray(parsed) || parsed.length === 0) return <p className="text-sm text-muted-foreground">None</p>;
  return (
    <div className="space-y-1">
      {parsed.map((p: any, i: number) => (
        <p key={i} className="text-sm">{typeof p === "string" ? p : p.name || JSON.stringify(p)}</p>
      ))}
    </div>
  );
}
