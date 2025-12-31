import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  Trash2,
  Shield,
  AlertCircle,
  Clock,
  User,
  Calendar,
  TrendingUp,
  FileText,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  History,
} from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { GrcRisk, GrcControl, GrcIncident } from "@shared/schema";
import { Helmet } from "react-helmet";
import { format } from "date-fns";

const riskFormSchema = z.object({
  riskTitle: z.string().min(5, "Title must be at least 5 characters"),
  riskDescription: z.string().min(20, "Description must be at least 20 characters"),
  category: z.enum(["operational", "financial", "compliance", "strategic", "reputational", "cybersecurity", "third_party", "legal"]),
  likelihood: z.enum(["rare", "unlikely", "possible", "likely", "almost_certain"]),
  impact: z.enum(["minimal", "minor", "moderate", "major", "catastrophic"]),
  status: z.enum(["identified", "assessed", "mitigating", "monitored", "closed", "accepted"]),
  residualRiskScore: z.number().min(1).max(25).optional(),
  mitigationStrategy: z.string().optional(),
  riskAppetite: z.string().optional(),
  riskTolerance: z.string().optional(),
});

type RiskFormValues = z.infer<typeof riskFormSchema>;

function getRiskScoreColor(score: number): string {
  if (score >= 20) return "bg-red-500";
  if (score >= 12) return "bg-orange-500";
  if (score >= 6) return "bg-yellow-500";
  return "bg-green-500";
}

function getRiskScoreLabel(score: number): string {
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "closed":
    case "accepted":
      return "secondary";
    case "identified":
      return "destructive";
    case "monitored":
      return "default";
    default:
      return "outline";
  }
}

function formatCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function formatLikelihood(likelihood: string): string {
  return likelihood.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export default function RiskDetail() {
  const [, params] = useRoute("/risk-management/risk/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const riskId = params?.id;

  const { data: risk, isLoading: riskLoading } = useQuery<GrcRisk>({
    queryKey: ["/api/grc/risks", riskId],
    enabled: !!riskId,
  });

  const { data: controls } = useQuery<GrcControl[]>({
    queryKey: ["/api/grc/controls"],
  });

  const { data: incidents } = useQuery<GrcIncident[]>({
    queryKey: ["/api/grc/incidents"],
  });

  const relatedControls = controls?.filter((control) => {
    const relatedRiskIds = control.relatedRiskIds as string[] | null;
    return relatedRiskIds?.includes(riskId || "");
  }) || [];

  const relatedIncidents = incidents?.filter((incident) => {
    const relatedRiskIds = incident.relatedRiskIds as string[] | null;
    return relatedRiskIds?.includes(riskId || "");
  }) || [];

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: {
      riskTitle: "",
      riskDescription: "",
      category: "operational",
      likelihood: "possible",
      impact: "moderate",
      status: "identified",
      residualRiskScore: undefined,
      mitigationStrategy: "",
      riskAppetite: "",
      riskTolerance: "",
    },
  });

  const updateRiskMutation = useMutation({
    mutationFn: async (data: RiskFormValues) => {
      const likelihoodScore = { rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5 }[data.likelihood];
      const impactScore = { minimal: 1, minor: 2, moderate: 3, major: 4, catastrophic: 5 }[data.impact];
      const inherentRiskScore = likelihoodScore * impactScore;

      return apiRequest("PATCH", `/api/grc/risks/${riskId}`, {
        ...data,
        inherentRiskScore,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risks", riskId], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risks"], refetchType: "all" });
      toast({ title: "Risk updated successfully" });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error updating risk", description: error.message, variant: "destructive" });
    },
  });

  const deleteRiskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/grc/risks/${riskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risks"], refetchType: "all" });
      toast({ title: "Risk deleted successfully" });
      navigate("/risk-management/register");
    },
    onError: (error: any) => {
      toast({ title: "Error deleting risk", description: error.message, variant: "destructive" });
    },
  });

  const handleEditClick = () => {
    if (risk) {
      form.reset({
        riskTitle: risk.riskTitle,
        riskDescription: risk.riskDescription,
        category: risk.category as any,
        likelihood: risk.likelihood as any,
        impact: risk.impact as any,
        status: risk.status as any,
        residualRiskScore: risk.residualRiskScore || undefined,
        mitigationStrategy: risk.mitigationStrategy || "",
        riskAppetite: risk.riskAppetite || "",
        riskTolerance: risk.riskTolerance || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  const onSubmit = (data: RiskFormValues) => {
    updateRiskMutation.mutate(data);
  };

  if (riskLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Risk Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested risk could not be found.</p>
            <Link href="/risk-management/register">
              <Button data-testid="button-back-to-register">Back to Risk Register</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskScore = risk.inherentRiskScore;
  const residualScore = risk.residualRiskScore || riskScore;

  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>{risk.riskTitle} | Risk Detail | Sentinel Counsel</title>
      </Helmet>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/risk-management/register">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" data-testid="text-risk-title">{risk.riskTitle}</h1>
              <Badge variant={getStatusBadgeVariant(risk.status)} data-testid="badge-status">
                {risk.status.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground" data-testid="text-risk-id">
              Risk ID: {risk.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleEditClick} data-testid="button-edit">
            <Edit className="h-4 w-4 mr-2" />
            Edit Risk
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} data-testid="button-delete">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Risk Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm" data-testid="text-description">{risk.riskDescription}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                  <Badge variant="outline" data-testid="badge-category">
                    {formatCategory(risk.category)}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Likelihood</h4>
                  <p className="text-sm font-medium" data-testid="text-likelihood">
                    {formatLikelihood(risk.likelihood)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Impact</h4>
                  <p className="text-sm font-medium" data-testid="text-impact">
                    {formatCategory(risk.impact)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Risk Owner</h4>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm" data-testid="text-owner">{risk.riskOwner}</span>
                  </div>
                </div>
              </div>

              {risk.mitigationStrategy && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Mitigation Strategy</h4>
                    <p className="text-sm" data-testid="text-mitigation">{risk.mitigationStrategy}</p>
                  </div>
                </>
              )}

              {(risk.riskAppetite || risk.riskTolerance) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    {risk.riskAppetite && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Risk Appetite</h4>
                        <p className="text-sm" data-testid="text-appetite">{risk.riskAppetite}</p>
                      </div>
                    )}
                    {risk.riskTolerance && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Risk Tolerance</h4>
                        <p className="text-sm" data-testid="text-tolerance">{risk.riskTolerance}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="controls" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="controls" data-testid="tab-controls">
                <Shield className="h-4 w-4 mr-2" />
                Controls ({relatedControls.length})
              </TabsTrigger>
              <TabsTrigger value="incidents" data-testid="tab-incidents">
                <AlertCircle className="h-4 w-4 mr-2" />
                Incidents ({relatedIncidents.length})
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="controls" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Controls</CardTitle>
                  <CardDescription>Controls that mitigate this risk</CardDescription>
                </CardHeader>
                <CardContent>
                  {relatedControls.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No controls linked to this risk</p>
                      <Button variant="outline" className="mt-4" data-testid="button-add-control">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Link Control
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Control ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Effectiveness</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatedControls.map((control) => (
                          <TableRow key={control.id}>
                            <TableCell className="font-mono text-sm">{control.controlId}</TableCell>
                            <TableCell>{control.controlTitle}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{formatCategory(control.controlType)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={control.effectiveness === "fully_effective" || control.effectiveness === "largely_effective" ? "default" : "secondary"}>
                                {formatCategory(control.effectiveness)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="incidents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Incidents</CardTitle>
                  <CardDescription>Incidents related to this risk</CardDescription>
                </CardHeader>
                <CardContent>
                  {relatedIncidents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No incidents linked to this risk</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Incident #</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatedIncidents.map((incident) => (
                          <TableRow key={incident.id}>
                            <TableCell className="font-mono text-sm">{incident.incidentNumber}</TableCell>
                            <TableCell>{incident.incidentTitle}</TableCell>
                            <TableCell>
                              <Badge variant={incident.severity === "critical" ? "destructive" : "outline"}>
                                {formatCategory(incident.severity)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{formatCategory(incident.status)}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk History</CardTitle>
                  <CardDescription>Audit trail of changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 border-l-2 border-primary pl-4 py-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Risk Created</p>
                        <p className="text-xs text-muted-foreground">
                          Created by {risk.createdBy} on {format(new Date(risk.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                    {risk.lastReviewDate && (
                      <div className="flex items-start gap-3 border-l-2 border-muted pl-4 py-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Last Reviewed</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(risk.lastReviewDate), "MMM dd, yyyy 'at' HH:mm")}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 border-l-2 border-muted pl-4 py-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Last Updated</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(risk.updatedAt), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Risk Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Inherent Risk Score</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${getRiskScoreColor(riskScore)}`} />
                  <span className="text-3xl font-bold" data-testid="text-inherent-score">{riskScore}</span>
                </div>
                <Badge variant="outline" className="mt-2" data-testid="badge-risk-level">
                  {getRiskScoreLabel(riskScore)}
                </Badge>
              </div>

              <Separator />

              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Residual Risk Score</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${getRiskScoreColor(residualScore)}`} />
                  <span className="text-3xl font-bold" data-testid="text-residual-score">{residualScore}</span>
                </div>
                <Badge variant="outline" className="mt-2">
                  {getRiskScoreLabel(residualScore)}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Reduction</span>
                  <span className="font-medium">
                    {riskScore > residualScore ? `-${riskScore - residualScore}` : "0"} points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Controls Applied</span>
                  <span className="font-medium">{relatedControls.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Identified</span>
                <span>{format(new Date(risk.identifiedDate), "MMM dd, yyyy")}</span>
              </div>
              {risk.lastReviewDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Review</span>
                  <span>{format(new Date(risk.lastReviewDate), "MMM dd, yyyy")}</span>
                </div>
              )}
              {risk.nextReviewDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Review</span>
                  <span className="font-medium text-primary">
                    {format(new Date(risk.nextReviewDate), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Risk</DialogTitle>
            <DialogDescription>Update the risk details below</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="riskTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px]" {...field} data-testid="textarea-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="strategic">Strategic</SelectItem>
                          <SelectItem value="reputational">Reputational</SelectItem>
                          <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                          <SelectItem value="third_party">Third Party</SelectItem>
                          <SelectItem value="legal">Legal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="identified">Identified</SelectItem>
                          <SelectItem value="assessed">Assessed</SelectItem>
                          <SelectItem value="mitigating">Mitigating</SelectItem>
                          <SelectItem value="monitored">Monitored</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="likelihood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Likelihood</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-likelihood">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rare">Rare (1)</SelectItem>
                          <SelectItem value="unlikely">Unlikely (2)</SelectItem>
                          <SelectItem value="possible">Possible (3)</SelectItem>
                          <SelectItem value="likely">Likely (4)</SelectItem>
                          <SelectItem value="almost_certain">Almost Certain (5)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-impact">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal (1)</SelectItem>
                          <SelectItem value="minor">Minor (2)</SelectItem>
                          <SelectItem value="moderate">Moderate (3)</SelectItem>
                          <SelectItem value="major">Major (4)</SelectItem>
                          <SelectItem value="catastrophic">Catastrophic (5)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="residualRiskScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Residual Risk Score (After Controls)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={25} 
                        placeholder="Enter residual score (1-25)"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-edit-residual-score"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mitigationStrategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mitigation Strategy</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-edit-mitigation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateRiskMutation.isPending} data-testid="button-save-risk">
                  {updateRiskMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Risk</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this risk? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteRiskMutation.mutate()}
              disabled={deleteRiskMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteRiskMutation.isPending ? "Deleting..." : "Delete Risk"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
