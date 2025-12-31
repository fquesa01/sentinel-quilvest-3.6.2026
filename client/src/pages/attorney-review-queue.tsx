import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Scale, AlertTriangle, MessageSquare, Eye, Clock, Filter } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function AttorneyReviewQueue() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: queue, isLoading } = useQuery<{
    cases: any[];
    alerts: any[];
    communications: any[];
    totalItems: number;
  }>({
    queryKey: ["/api/attorney-review-queue", statusFilter],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading review queue...</div>
      </div>
    );
  }

  const allCases = queue?.cases || [];
  const allAlerts = queue?.alerts || [];
  const allCommunications = queue?.communications || [];

  // Apply status filter
  const filterByStatus = (items: any[]) => {
    if (statusFilter === "all") return items;
    return items.filter((item: any) => item.status === statusFilter);
  };

  const cases = filterByStatus(allCases);
  const alerts = filterByStatus(allAlerts);
  const communications = filterByStatus(allCommunications);
  const totalItems = cases.length + alerts.length + communications.length;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "under_investigation":
      case "new":
        return "default";
      case "under_review":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-semibold">Attorney Review Queue</h1>
              <p className="text-sm text-muted-foreground">
                Cases, alerts, and communications requiring attorney review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="under_investigation">Under Investigation</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-total-items">
              {totalItems} items pending
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({totalItems})
            </TabsTrigger>
            <TabsTrigger value="cases" data-testid="tab-cases">
              Cases ({cases.length})
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              Alerts ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="communications" data-testid="tab-communications">
              Communications ({communications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {cases.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Cases</h3>
                <div className="space-y-3">
                  {cases.map((item: any) => (
                    <Card key={item.id} className="hover-elevate" data-testid={`card-case-${item.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={getStatusBadgeVariant(item.status)}>
                              {item.status.replace(/_/g, " ")}
                            </Badge>
                            <Badge variant={getSeverityBadgeVariant(item.severity)}>
                              {item.severity}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {item.violationType?.replace(/_/g, " ")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(item.createdAt), "MMM d, yyyy")}
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Link href={`/cases/${item.id}`}>
                            <Button size="sm" data-testid={`button-review-case-${item.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Review Case
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {alerts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Alerts</h3>
                <div className="space-y-3">
                  {alerts.map((item: any) => (
                    <Card key={item.id} className="hover-elevate" data-testid={`card-alert-${item.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base">{item.alertType?.replace(/_/g, " ")}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Risk Score: {item.riskScore}/100
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {item.violationType?.replace(/_/g, " ")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(item.detectedAt), "MMM d, yyyy h:mm a")}
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Link href={`/alerts/${item.id}`}>
                            <Button size="sm" data-testid={`button-review-alert-${item.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Review Alert
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {communications.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Communications</h3>
                <div className="space-y-3">
                  {communications.map((item: any) => (
                    <Card key={item.id} className="hover-elevate" data-testid={`card-communication-${item.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              {item.subject || "No Subject"}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              From: {item.sender} → To: {item.recipients?.join(", ")}
                            </p>
                          </div>
                          <Badge variant="secondary">Flagged</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {item.channel}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(item.timestamp), "MMM d, yyyy h:mm a")}
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Link href={item.caseId ? `/cases/${item.caseId}/document-review?id=${item.id}` : `/document-review?id=${item.id}`}>
                            <Button size="sm" data-testid={`button-review-communication-${item.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Review Communication
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {totalItems === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Items Pending Review</h3>
                  <p className="text-muted-foreground">
                    All cases, alerts, and communications have been reviewed.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cases" className="space-y-3 mt-6">
            {cases.length > 0 ? (
              cases.map((item: any) => (
                <Card key={item.id} className="hover-elevate" data-testid={`card-case-${item.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant={getSeverityBadgeVariant(item.severity)}>
                          {item.severity}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {item.violationType?.replace(/_/g, " ")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(item.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Link href={`/cases/${item.id}`}>
                        <Button size="sm" data-testid={`button-review-case-${item.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review Case
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No cases pending review</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-3 mt-6">
            {alerts.length > 0 ? (
              alerts.map((item: any) => (
                <Card key={item.id} className="hover-elevate" data-testid={`card-alert-${item.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{item.alertType?.replace(/_/g, " ")}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Risk Score: {item.riskScore}/100
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {item.violationType?.replace(/_/g, " ")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(item.detectedAt), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Link href={`/alerts/${item.id}`}>
                        <Button size="sm" data-testid={`button-review-alert-${item.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review Alert
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No alerts pending review</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="communications" className="space-y-3 mt-6">
            {communications.length > 0 ? (
              communications.map((item: any) => (
                <Card key={item.id} className="hover-elevate" data-testid={`card-communication-${item.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {item.subject || "No Subject"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          From: {item.sender} → To: {item.recipients?.join(", ")}
                        </p>
                      </div>
                      <Badge variant="secondary">Flagged</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {item.channel}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(item.timestamp), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Link href={item.caseId ? `/cases/${item.caseId}/document-review?id=${item.id}` : `/document-review?id=${item.id}`}>
                        <Button size="sm" data-testid={`button-review-communication-${item.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review Communication
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No communications pending review</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
