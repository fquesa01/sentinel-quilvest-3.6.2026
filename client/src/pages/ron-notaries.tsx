import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { RonNotary, RonSession } from "@shared/schema";

const stateOptions = ["FL", "TX", "VA", "CA", "NY", "AZ", "CO", "GA", "IL", "NJ", "OH", "PA"];

const languageOptions = ["English", "Spanish", "French", "Portuguese", "Mandarin", "Korean", "Japanese", "Vietnamese", "Arabic", "Russian", "German"];

export default function RonNotaries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [selectedNotary, setSelectedNotary] = useState<RonNotary | null>(null);

  const { data: notaries, isLoading } = useQuery<RonNotary[]>({
    queryKey: ["/api/ron/notaries"],
  });

  const { data: notaryDetail } = useQuery<RonNotary & { recentSessions?: RonSession[] }>({
    queryKey: ["/api/ron/notaries", selectedNotary?.id],
    enabled: !!selectedNotary,
  });

  const notarySessions = notaryDetail?.recentSessions ?? [];

  const filtered = notaries?.filter((n) => {
    const matchesSearch =
      !searchTerm ||
      `${n.firstName} ${n.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.commissionNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === "all" || n.commissionState === stateFilter;

    const notaryLangs = Array.isArray(n.languages) ? (n.languages as string[]).map(l => l.toLowerCase()) : [];
    const matchesLanguage = languageFilter === "all" || notaryLangs.includes(languageFilter.toLowerCase());

    const isExpired = n.commissionExpiration && new Date(n.commissionExpiration) < new Date();
    const isActive = n.status === "active" && !isExpired;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && isActive) ||
      (availabilityFilter === "unavailable" && !isActive);

    return matchesSearch && matchesState && matchesLanguage && matchesAvailability;
  });

  const hasActiveFilters = stateFilter !== "all" || languageFilter !== "all" || availabilityFilter !== "all";

  const clearFilters = () => {
    setStateFilter("all");
    setLanguageFilter("all");
    setAvailabilityFilter("all");
    setSearchTerm("");
  };

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
            placeholder="Search by name, email, commission..."
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
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-language-filter">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {languageOptions.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-availability-filter">
            <SelectValue placeholder="All Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Availability</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-notary-filters">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((notary) => {
            const isExpired = notary.commissionExpiration && new Date(notary.commissionExpiration) < new Date();
            const isActive = notary.status === "active" && !isExpired;
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
                      isActive
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
                    {notary.languages && Array.isArray(notary.languages) && (notary.languages as string[]).length > 0 && (
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
              {searchTerm || hasActiveFilters
                ? "Try adjusting your filters"
                : "No notaries registered in the system"}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedNotary} onOpenChange={() => setSelectedNotary(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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

              <Separator />

              <div>
                <p className="font-medium text-sm mb-3">Session History</p>
                {notarySessions.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {notarySessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border text-sm">
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{session.sessionType?.replace(/_/g, " ")} Session</p>
                          <p className="text-xs text-muted-foreground">
                            {session.scheduledStart
                              ? format(new Date(session.scheduledStart), "MMM d, yyyy h:mm a")
                              : "No date"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {session.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {session.status === "scheduled" && <Clock className="h-3 w-3 mr-1" />}
                          {session.status?.replace(/_/g, " ") || "Unknown"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No session history available</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
