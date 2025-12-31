import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, TrendingUp, FileCheck, Clock, Plus, Search, BarChart3, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const regulatoryChangeSchema = z.object({
  changeType: z.string(),
  changeTitle: z.string().min(1, "Title is required"),
  changeDescription: z.string().min(1, "Description is required"),
  affectedLegislation: z.string().optional(),
  announcementDate: z.string().optional(),
  effectiveDate: z.string().optional(),
  complianceDeadline: z.string().optional(),
  impactLevel: z.string(),
  impactSummary: z.string().optional(),
  sourceUrl: z.string().optional(),
});

type RegulatoryChange = {
  id: string;
  changeType: string;
  changeTitle: string;
  changeDescription: string;
  affectedLegislation?: string;
  announcementDate?: string;
  effectiveDate?: string;
  complianceDeadline?: string;
  impactLevel: string;
  impactSummary?: string;
  implementationStatus: string;
  sourceUrl?: string;
  createdAt: string;
};

const impactLevelColors = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const statusColors = {
  pending: "secondary",
  in_progress: "default",
  completed: "outline",
  not_applicable: "outline",
} as const;

export default function RegulatoryChangesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<RegulatoryChange | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<any>(null);
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const { data: changes, isLoading } = useQuery<RegulatoryChange[]>({
    queryKey: ["/api/regulatory-changes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof regulatoryChangeSchema>) => {
      return await apiRequest("POST", "/api/regulatory-changes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-changes"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Regulatory change created successfully",
      });
    },
  });

  const impactAnalysisMutation = useMutation({
    mutationFn: async (changeId: string) => {
      return await apiRequest("POST", `/api/regulatory-changes/${changeId}/impact-analysis`, {});
    },
    onSuccess: (data: any) => {
      setImpactAnalysis(data);
      toast({
        title: "Impact Analysis Complete",
        description: `Identified ${data.affectedRegulationsCount} regulations, ${data.affectedPoliciesCount} policies, and ${data.affectedTrainingCount} training courses`,
      });
    },
  });

  const gapAnalysisMutation = useMutation({
    mutationFn: async (changeId: string) => {
      return await apiRequest("POST", `/api/regulatory-changes/${changeId}/gap-analysis`, {});
    },
    onSuccess: (data: any) => {
      setGapAnalysis(data);
      toast({
        title: "Gap Analysis Complete",
        description: `Identified ${data.totalGaps} compliance gaps with ${data.overallRisk} risk level`,
      });
    },
  });

  const form = useForm<z.infer<typeof regulatoryChangeSchema>>({
    resolver: zodResolver(regulatoryChangeSchema),
    defaultValues: {
      changeType: "new_regulation",
      impactLevel: "medium",
      changeTitle: "",
      changeDescription: "",
    },
  });

  const onSubmit = (data: z.infer<typeof regulatoryChangeSchema>) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Change Tracking</h1>
          <p className="text-muted-foreground">
            Monitor and analyze global/regional regulatory changes and update compliance obligations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-change">
              <Plus className="mr-2 h-4 w-4" />
              Log Regulatory Change
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log New Regulatory Change</DialogTitle>
              <DialogDescription>
                Track new regulations, amendments, court rulings, or guidance updates
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="changeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Change Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-change-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new_regulation">New Regulation</SelectItem>
                            <SelectItem value="amendment">Amendment</SelectItem>
                            <SelectItem value="repeal">Repeal</SelectItem>
                            <SelectItem value="court_ruling">Court Ruling</SelectItem>
                            <SelectItem value="guidance_update">Guidance Update</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="impactLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-impact-level">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="changeTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., SEC Climate Disclosure Rules 2024" data-testid="input-change-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="changeDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="Describe the regulatory change and its requirements..." data-testid="textarea-change-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="affectedLegislation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affected Legislation</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., SOX, Dodd-Frank, EU Directive" data-testid="input-affected-legislation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="announcementDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Announcement Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-announcement-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="effectiveDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-effective-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="complianceDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compliance Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-compliance-deadline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" placeholder="https://..." data-testid="input-source-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-change">
                    {createMutation.isPending ? "Creating..." : "Log Change"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-changes">{changes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Tracked regulatory changes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical/High Impact</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-critical-high">
              {changes?.filter(c => c.impactLevel === "critical" || c.impactLevel === "high").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Implementation</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending">
              {changes?.filter(c => c.implementationStatus === "pending").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed">
              {changes?.filter(c => c.implementationStatus === "completed").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Successfully implemented</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Regulatory Changes</CardTitle>
            <CardDescription>Latest updates tracked in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {changes?.slice(0, 10).map((change) => (
                <div
                  key={change.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => setSelectedChange(change)}
                  data-testid={`change-card-${change.id}`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{change.changeTitle}</h4>
                      <Badge variant={impactLevelColors[change.impactLevel as keyof typeof impactLevelColors]} data-testid={`badge-impact-${change.id}`}>
                        {change.impactLevel}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{change.changeDescription}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {change.affectedLegislation && (
                        <span className="flex items-center gap-1">
                          <FileCheck className="h-3 w-3" />
                          {change.affectedLegislation}
                        </span>
                      )}
                      {change.complianceDeadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Deadline: {format(new Date(change.complianceDeadline), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusColors[change.implementationStatus as keyof typeof statusColors]} data-testid={`badge-status-${change.id}`}>
                    {change.implementationStatus.replace("_", " ")}
                  </Badge>
                </div>
              ))}
              {!changes?.length && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No regulatory changes tracked yet</p>
                  <p className="text-sm">Click "Log Regulatory Change" to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedChange && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Tools</CardTitle>
              <CardDescription>Analyze impact and identify compliance gaps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">{selectedChange.changeTitle}</h4>
                <p className="text-sm text-muted-foreground">{selectedChange.changeDescription}</p>
              </div>

              <div className="grid gap-2">
                <Button
                  onClick={() => impactAnalysisMutation.mutate(selectedChange.id)}
                  disabled={impactAnalysisMutation.isPending}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-impact-analysis"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Run Impact Analysis
                </Button>
                <Button
                  onClick={() => gapAnalysisMutation.mutate(selectedChange.id)}
                  disabled={gapAnalysisMutation.isPending}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-gap-analysis"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Run Compliance Gap Analysis
                </Button>
              </div>

              {impactAnalysis && impactAnalysis.changeId === selectedChange.id && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <h5 className="font-semibold text-sm">Impact Analysis Results</h5>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Affected Regulations:</span>
                      <span className="font-medium" data-testid="text-affected-regulations">{impactAnalysis.affectedRegulationsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Affected Policies:</span>
                      <span className="font-medium" data-testid="text-affected-policies">{impactAnalysis.affectedPoliciesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Affected Training:</span>
                      <span className="font-medium" data-testid="text-affected-training">{impactAnalysis.affectedTrainingCount}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h6 className="font-semibold text-sm">Recommended Actions:</h6>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {impactAnalysis.recommendedActions.map((action: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {gapAnalysis && gapAnalysis.changeId === selectedChange.id && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <h5 className="font-semibold text-sm">Compliance Gap Analysis</h5>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overall Risk:</span>
                    <Badge variant={impactLevelColors[gapAnalysis.overallRisk as keyof typeof impactLevelColors]} data-testid="badge-overall-risk">
                      {gapAnalysis.overallRisk}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Gaps:</span>
                      <span className="font-medium" data-testid="text-total-gaps">{gapAnalysis.totalGaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Critical Gaps:</span>
                      <span className="font-medium text-destructive" data-testid="text-critical-gaps">{gapAnalysis.criticalGaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">High Priority Gaps:</span>
                      <span className="font-medium" data-testid="text-high-gaps">{gapAnalysis.highGaps}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h6 className="font-semibold text-sm">Identified Gaps:</h6>
                    <ul className="text-xs space-y-2">
                      {gapAnalysis.identifiedGaps.map((gap: any, idx: number) => (
                        <li key={idx} className="p-2 bg-background rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">{gap.area}</span>
                            <Badge variant={impactLevelColors[gap.severity as keyof typeof impactLevelColors]}>
                              {gap.severity}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{gap.description}</p>
                          <p className="text-primary mt-1">→ {gap.recommendation}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
