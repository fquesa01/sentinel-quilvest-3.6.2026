import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, BarChart3, TrendingUp, AlertTriangle, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBoardReportSchema, type BoardReport } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

export default function BoardReports() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BoardReport | null>(null);

  const { data: reports, isLoading } = useQuery<BoardReport[]>({
    queryKey: ["/api/board-reports"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/board-reports", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/board-reports"] });
      setIsCreateOpen(false);
      toast({ title: "Success", description: "Board report created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/board-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/board-reports"] });
      toast({ title: "Success", description: "Board report deleted" });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertBoardReportSchema),
    defaultValues: {
      reportPeriodStart: format(new Date(), "yyyy-MM-dd"),
      reportPeriodEnd: format(new Date(), "yyyy-MM-dd"),
      reportType: "quarterly",
      executiveSummary: "",
      keyMetrics: {},
      recommendedActions: "",
    },
  });

  const getReportTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "annual":
        return "default";
      case "quarterly":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading board reports...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-semibold">Board Reports</h1>
              <p className="text-sm text-muted-foreground">
                Executive compliance reporting and data visualization
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-report">
                <Plus className="h-4 w-4 mr-2" />
                Create Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Board Report</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reportPeriodStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Report Period Start</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-period-start" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reportPeriodEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Report Period End</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-period-end" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-report-type">
                              <SelectValue placeholder="Select report type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                            <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="executiveSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Executive Summary</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Provide a high-level summary for board members..."
                            rows={4}
                            data-testid="textarea-executive-summary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recommendedActions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recommended Actions</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Recommend key actions for the board to consider..."
                            rows={3}
                            data-testid="textarea-recommended-actions"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-report">
                      {createMutation.isPending ? "Creating..." : "Create Report"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {reports && reports.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {reports.filter((r) => r.reportType === "quarterly").length} quarterly reports
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Recent</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {format(new Date(reports[0]?.reportPeriodEnd || new Date()), "MMM yyyy")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reports[0]?.reportType} report
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Presented Reports</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reports.filter((r) => r.presentedAt).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {reports.length} total reports
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="hover-elevate" data-testid={`card-report-${report.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {report.reportType.toUpperCase()} Report -{" "}
                          {format(new Date(report.reportPeriodStart), "MMM d")} to{" "}
                          {format(new Date(report.reportPeriodEnd), "MMM d, yyyy")}
                        </CardTitle>
                        {report.executiveSummary && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {report.executiveSummary}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getReportTypeBadgeVariant(report.reportType)}>
                          {report.reportType}
                        </Badge>
                        {report.presentedAt && (
                          <Badge variant="default">Presented</Badge>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(report.id)}
                          data-testid={`button-delete-${report.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {report.keyMetrics && Object.keys(report.keyMetrics as object).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(report.keyMetrics as Record<string, any>).map(([key, value]) => (
                            <div key={key} className="bg-muted p-3 rounded">
                              <div className="text-xs text-muted-foreground capitalize">
                                {key.replace(/_/g, " ")}
                              </div>
                              <div className="text-lg font-semibold">{String(value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.recommendedActions && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Recommended Actions
                        </h4>
                        <p className="text-sm text-muted-foreground">{report.recommendedActions}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 pt-2 border-t text-sm text-muted-foreground">
                      <span>Created {format(new Date(report.createdAt), "MMM d, yyyy")}</span>
                      {report.pdfUrl && (
                        <Button variant="outline" size="sm" data-testid={`button-download-${report.id}`}>
                          <Download className="h-3 w-3 mr-2" />
                          Download PDF
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Board Reports</h3>
              <p className="text-muted-foreground mb-4">
                Create a board report to provide executives with compliance insights.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Report
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
