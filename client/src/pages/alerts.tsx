import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { AlertTriangle, Plus, Search, Filter, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Alert } from "@shared/schema";

export default function Alerts() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    sender: "",
    recipients: "",
    subject: "",
    body: "",
    communicationType: "email",
  });
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const createCommunicationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/communications", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setOpen(false);
      setFormData({
        sender: "",
        recipients: "",
        subject: "",
        body: "",
        communicationType: "email",
      });
      toast({
        title: "Communication Analyzed",
        description: "The communication has been processed and analyzed for violations.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return await apiRequest("POST", `/api/cases`, { alertId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Case Created",
        description: "A new case has been created from this alert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert recipients string to array
    const recipients = formData.recipients.split(",").map(r => r.trim());
    createCommunicationMutation.mutate({
      sender: formData.sender,
      recipients,
      subject: formData.subject,
      body: formData.body,
      communicationType: formData.communicationType,
    });
  };

  const filteredAlerts = alerts?.filter((alert) => {
    const matchesSearch =
      !searchTerm ||
      alert.violationType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity =
      severityFilter === "all" || alert.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between stagger-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-alerts">
            Alert Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage compliance alerts
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-analyze-communication">
              <Mail className="h-4 w-4 mr-2" />
              Analyze Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Analyze New Communication</DialogTitle>
                <DialogDescription>
                  Enter communication details for AI-powered violation analysis
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="communicationType">Channel</Label>
                  <Select
                    value={formData.communicationType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, communicationType: value }))
                    }
                  >
                    <SelectTrigger id="communicationType" data-testid="select-channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="teams">Teams</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sender">Sender</Label>
                  <Input
                    id="sender"
                    value={formData.sender}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sender: e.target.value }))
                    }
                    placeholder="sender@example.com"
                    required
                    data-testid="input-sender"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recipients">Recipients</Label>
                  <Input
                    id="recipients"
                    value={formData.recipients}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, recipients: e.target.value }))
                    }
                    placeholder="recipient@example.com, other@example.com"
                    required
                    data-testid="input-recipient"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple recipients with commas
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    placeholder="Email subject"
                    required
                    data-testid="input-subject"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="body">Message Body</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, body: e.target.value }))
                    }
                    placeholder="Message content..."
                    rows={6}
                    required
                    data-testid="textarea-body"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createCommunicationMutation.isPending}
                  data-testid="button-submit-communication"
                >
                  {createCommunicationMutation.isPending ? "Analyzing..." : "Analyze"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="stagger-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Active Alerts</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                  data-testid="input-search-alerts"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40" data-testid="select-severity-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="informational">Informational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredAlerts || filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No alerts found</p>
              <p className="text-sm">
                {searchTerm || severityFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Alerts will appear here when violations are detected"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Violation Type</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => (
                    <TableRow key={alert.id} data-testid={`alert-row-${alert.id}`}>
                      <TableCell>
                        <SeverityBadge severity={alert.severity} />
                      </TableCell>
                      <TableCell className="font-medium capitalize">
                        {alert.violationType.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{alert.riskScore || "N/A"}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={alert.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => createCaseMutation.mutate(alert.id)}
                          disabled={createCaseMutation.isPending}
                          data-testid={`button-create-case-${alert.id}`}
                        >
                          Create Case
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
