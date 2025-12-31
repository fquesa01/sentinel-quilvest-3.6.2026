import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Activity, Plus, Search, ArrowLeft, Calendar, User } from "lucide-react";
import { Link } from "wouter";
import type { GrcIncident } from "@shared/schema";
import { format } from "date-fns";

const incidentCategories = [
  "data_breach",
  "policy_violation",
  "security_incident",
  "compliance_failure",
  "operational_failure",
  "fraud",
  "third_party_incident",
  "regulatory_inquiry",
];

const incidentSeverities = ["low", "medium", "high", "critical"];
const incidentStatuses = ["reported", "investigating", "contained", "remediated", "closed"];

export default function GrcIncidents() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    incidentTitle: "",
    incidentDescription: "",
    incidentType: "policy_violation",
    severity: "medium",
    reportedBy: "",
    affectedSystems: [] as string[],
    correctiveActions: "",
  });

  const { data: incidents, isLoading } = useQuery<GrcIncident[]>({
    queryKey: ["/api/grc/incidents"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/grc/incidents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/dashboard"] });
      setIsCreateDialogOpen(false);
      setNewIncident({
        incidentTitle: "",
        incidentDescription: "",
        incidentType: "policy_violation",
        severity: "medium",
        reportedBy: "",
        affectedSystems: [],
        correctiveActions: "",
      });
      toast({ title: "Incident reported successfully" });
    },
    onError: () => {
      toast({ title: "Failed to report incident", variant: "destructive" });
    },
  });

  const filteredIncidents = incidents?.filter((incident) => {
    const matchesSearch =
      incident.incidentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.incidentDescription?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "closed":
        return "default";
      case "remediated":
        return "secondary";
      case "contained":
        return "outline";
      default:
        return "destructive";
    }
  };

  const handleCreateIncident = () => {
    createMutation.mutate(newIncident);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/grc">
              <Button variant="ghost" size="icon" data-testid="button-back-grc">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold" data-testid="heading-incidents">Incident Management</h1>
              <p className="text-muted-foreground text-sm">
                Report, track, and resolve compliance incidents
              </p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-incident">
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Report New Incident</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Incident Title</Label>
                  <Input
                    value={newIncident.incidentTitle}
                    onChange={(e) => setNewIncident({ ...newIncident, incidentTitle: e.target.value })}
                    placeholder="Brief description of the incident"
                    data-testid="input-incident-title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newIncident.incidentDescription}
                    onChange={(e) => setNewIncident({ ...newIncident, incidentDescription: e.target.value })}
                    placeholder="Detailed description of what happened"
                    data-testid="input-incident-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Incident Type</Label>
                    <Select
                      value={newIncident.incidentType}
                      onValueChange={(v) => setNewIncident({ ...newIncident, incidentType: v })}
                    >
                      <SelectTrigger data-testid="select-incident-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select
                      value={newIncident.severity}
                      onValueChange={(v) => setNewIncident({ ...newIncident, severity: v })}
                    >
                      <SelectTrigger data-testid="select-incident-severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentSeverities.map((sev) => (
                          <SelectItem key={sev} value={sev}>
                            {sev.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Reported By</Label>
                  <Input
                    value={newIncident.reportedBy}
                    onChange={(e) => setNewIncident({ ...newIncident, reportedBy: e.target.value })}
                    placeholder="Your name or department"
                    data-testid="input-reported-by"
                  />
                </div>
                <div>
                  <Label>Corrective Actions</Label>
                  <Textarea
                    value={newIncident.correctiveActions}
                    onChange={(e) => setNewIncident({ ...newIncident, correctiveActions: e.target.value })}
                    placeholder="What steps have been taken or will be taken?"
                    data-testid="input-corrective-actions"
                  />
                </div>
                <Button
                  onClick={handleCreateIncident}
                  disabled={!newIncident.incidentTitle || createMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-incident"
                >
                  Report Incident
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-incidents"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {incidentStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40" data-testid="select-severity-filter">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {incidentSeverities.map((sev) => (
                <SelectItem key={sev} value={sev}>
                  {sev.replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {filteredIncidents?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Incidents Found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchTerm || statusFilter !== "all" || severityFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Click 'Report Incident' to log a new incident"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredIncidents?.map((incident) => (
              <Card key={incident.id} className="hover-elevate" data-testid={`card-incident-${incident.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{incident.incidentNumber}</Badge>
                        <CardTitle className="text-lg">{incident.incidentTitle}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {incident.incidentDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={getSeverityColor(incident.severity)}>
                        {incident.severity.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                      <Badge variant={getStatusColor(incident.status)}>
                        {incident.status.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm flex-wrap">
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      <span className="font-medium">
                        {incident.incidentType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    </div>
                    {incident.reportedBy && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Reported by:</span>{" "}
                        <span className="font-medium">{incident.reportedBy}</span>
                      </div>
                    )}
                    {incident.reportedDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Date:</span>{" "}
                        <span className="font-medium">
                          {format(new Date(incident.reportedDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
