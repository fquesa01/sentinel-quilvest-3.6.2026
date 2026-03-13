import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  Search,
  ArrowLeft,
  Shield,
  MapPin,
  Calendar,
  Globe,
  Award,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import type { RonNotary } from "@shared/schema";

const stateOptions = ["FL", "TX", "VA", "CA", "NY", "AZ", "CO", "GA", "IL", "NJ", "OH", "PA"];

export default function RonNotaries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedNotary, setSelectedNotary] = useState<RonNotary | null>(null);

  const { data: notaries, isLoading } = useQuery<RonNotary[]>({
    queryKey: ["/api/ron/notaries"],
  });

  const filtered = notaries?.filter((n) => {
    const matchesSearch =
      !searchTerm ||
      `${n.firstName} ${n.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.commissionNumber || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === "all" || n.commissionState === stateFilter;
    return matchesSearch && matchesState;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ron-notaries-page">
      <div className="flex items-center gap-3">
        <Link href="/ron/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-notaries-title">
            Notary Directory
          </h1>
          <p className="text-muted-foreground">
            {filtered?.length ?? 0} notaries
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-notaries"
          />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-state-filter">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {stateOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((notary) => {
            const isExpired = notary.commissionExpiration && new Date(notary.commissionExpiration) < new Date();
            return (
              <Card
                key={notary.id}
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => setSelectedNotary(notary)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium" data-testid={`notary-name-${notary.id}`}>
                        {notary.firstName} {notary.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {notary.commissionState}
                        </span>
                        {notary.commissionNumber && (
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" /> #{notary.commissionNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={
                      notary.status === "active" && !isExpired
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }>
                      {isExpired ? "Expired" : notary.status || "Active"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {notary.commissionExpiration && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Exp: {format(new Date(notary.commissionExpiration), "MMM d, yyyy")}
                      </span>
                    )}
                    {notary.languages && Array.isArray(notary.languages) && notary.languages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {(notary.languages as string[]).join(", ")}
                      </span>
                    )}
                  </div>
                  {notary.totalSessions !== undefined && notary.totalSessions !== null && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {notary.totalSessions} sessions completed
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No notaries found</p>
            <p className="text-sm mt-1">
              {searchTerm || stateFilter !== "all"
                ? "Try adjusting your filters"
                : "No notaries registered in the system"}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedNotary} onOpenChange={() => setSelectedNotary(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notary Profile</DialogTitle>
          </DialogHeader>
          {selectedNotary && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-lg">
                    {selectedNotary.firstName} {selectedNotary.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedNotary.commissionState} &middot; Commission #{selectedNotary.commissionNumber || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={
                    selectedNotary.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  }>
                    {selectedNotary.status || "Active"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Commission State</p>
                  <p className="font-medium">{selectedNotary.commissionState}</p>
                </div>
                {selectedNotary.commissionExpiration && (
                  <div>
                    <p className="text-muted-foreground">Commission Expires</p>
                    <p className="font-medium">
                      {format(new Date(selectedNotary.commissionExpiration), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                {selectedNotary.bondExpiration && (
                  <div>
                    <p className="text-muted-foreground">Bond Expires</p>
                    <p className="font-medium">
                      {format(new Date(selectedNotary.bondExpiration), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                {selectedNotary.eoInsuranceExpiration && (
                  <div>
                    <p className="text-muted-foreground">E&O Insurance Expires</p>
                    <p className="font-medium">
                      {format(new Date(selectedNotary.eoInsuranceExpiration), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                {selectedNotary.languages && Array.isArray(selectedNotary.languages) && (
                  <div>
                    <p className="text-muted-foreground">Languages</p>
                    <p className="font-medium">{(selectedNotary.languages as string[]).join(", ")}</p>
                  </div>
                )}
                {selectedNotary.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedNotary.email}</p>
                  </div>
                )}
                {selectedNotary.totalSessions !== undefined && selectedNotary.totalSessions !== null && (
                  <div>
                    <p className="text-muted-foreground">Total Sessions</p>
                    <p className="font-medium">{selectedNotary.totalSessions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
