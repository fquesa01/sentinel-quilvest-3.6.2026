import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  ClipboardCheck,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GrcRiskAssessment, GrcRisk } from "@shared/schema";

type AssessmentStatus = "draft" | "in_progress" | "pending_review" | "approved" | "rejected" | "completed";

const statusColors: Record<AssessmentStatus, string> = {
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  pending_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
};

function getRiskScoreColor(score: number): string {
  if (score >= 15) return "text-red-600 dark:text-red-400";
  if (score >= 8) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function RiskAssessmentDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Partial<GrcRiskAssessment>>({});

  const { data: assessment, isLoading } = useQuery<GrcRiskAssessment>({
    queryKey: ["/api/grc/risk-assessments", params.id],
    enabled: !!params.id,
  });

  const { data: risks = [] } = useQuery<GrcRisk[]>({
    queryKey: ["/api/grc/risks"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<GrcRiskAssessment>) => {
      return apiRequest("PATCH", `/api/grc/risk-assessments/${params.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risk-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risk-assessments", params.id] });
      setIsEditing(false);
      toast({ title: "Assessment updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update assessment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/grc/risk-assessments/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risk-assessments"] });
      toast({ title: "Assessment deleted successfully" });
      navigate("/risk-management/assessments");
    },
    onError: () => {
      toast({ title: "Failed to delete assessment", variant: "destructive" });
    },
  });

  const handleEdit = () => {
    if (assessment) {
      setFormData({
        ...assessment,
        assessmentDate: assessment.assessmentDate,
        dueDate: assessment.dueDate,
        completedDate: assessment.completedDate,
        nextAssessmentDate: assessment.nextAssessmentDate,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const inherentScore = (formData.inherentLikelihood || 1) * (formData.inherentImpact || 1);
    const residualScore = formData.residualLikelihood && formData.residualImpact 
      ? formData.residualLikelihood * formData.residualImpact 
      : null;

    updateMutation.mutate({
      ...formData,
      inherentRiskScore: inherentScore,
      residualRiskScore: residualScore,
    });
  };

  const handleCancel = () => {
    setFormData({});
    setIsEditing(false);
  };

  const risk = risks.find(r => r.id === assessment?.riskId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Assessment not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/risk-management/assessments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{assessment.assessmentNumber} | Risk Assessments | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/risk-management/assessments")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{assessment.assessmentNumber}</h1>
                <Badge className={statusColors[assessment.status as AssessmentStatus]}>
                  {assessment.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-muted-foreground">{assessment.assessmentTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit} data-testid="button-edit">
                  Edit Assessment
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" data-testid="button-delete">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this assessment? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Assessment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Assessment Title</Label>
                        <Input
                          value={formData.assessmentTitle || ""}
                          onChange={(e) => setFormData({ ...formData, assessmentTitle: e.target.value })}
                          data-testid="input-assessment-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Assessment Type</Label>
                        <Select
                          value={formData.assessmentType || "periodic"}
                          onValueChange={(v) => setFormData({ ...formData, assessmentType: v as any })}
                        >
                          <SelectTrigger data-testid="select-assessment-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="initial">Initial</SelectItem>
                            <SelectItem value="periodic">Periodic</SelectItem>
                            <SelectItem value="triggered">Triggered</SelectItem>
                            <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status || "draft"}
                          onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                        >
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="pending_review">Pending Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Risk Velocity</Label>
                        <Select
                          value={formData.riskVelocity || "moderate"}
                          onValueChange={(v) => setFormData({ ...formData, riskVelocity: v })}
                        >
                          <SelectTrigger data-testid="select-risk-velocity">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="slow">Slow</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="fast">Fast</SelectItem>
                            <SelectItem value="immediate">Immediate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Assessment Type</p>
                      <p className="font-medium capitalize">{assessment.assessmentType.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Velocity</p>
                      <p className="font-medium capitalize">{assessment.riskVelocity || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Linked Risk</p>
                      <p className="font-medium">{risk?.riskTitle || assessment.riskId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assessment Date</p>
                      <p className="font-medium">{format(new Date(assessment.assessmentDate), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-3">Inherent Risk (Before Controls)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Likelihood (1-5)</Label>
                          <Select
                            value={String(formData.inherentLikelihood || 3)}
                            onValueChange={(v) => setFormData({ ...formData, inherentLikelihood: parseInt(v) })}
                          >
                            <SelectTrigger data-testid="select-inherent-likelihood">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Impact (1-5)</Label>
                          <Select
                            value={String(formData.inherentImpact || 3)}
                            onValueChange={(v) => setFormData({ ...formData, inherentImpact: parseInt(v) })}
                          >
                            <SelectTrigger data-testid="select-inherent-impact">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Risk Score</Label>
                          <div className={`text-2xl font-bold ${getRiskScoreColor((formData.inherentLikelihood || 3) * (formData.inherentImpact || 3))}`}>
                            {(formData.inherentLikelihood || 3) * (formData.inherentImpact || 3)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3">Residual Risk (After Controls)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Likelihood (1-5)</Label>
                          <Select
                            value={String(formData.residualLikelihood || "")}
                            onValueChange={(v) => setFormData({ ...formData, residualLikelihood: v ? parseInt(v) : null })}
                          >
                            <SelectTrigger data-testid="select-residual-likelihood">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Impact (1-5)</Label>
                          <Select
                            value={String(formData.residualImpact || "")}
                            onValueChange={(v) => setFormData({ ...formData, residualImpact: v ? parseInt(v) : null })}
                          >
                            <SelectTrigger data-testid="select-residual-impact">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Risk Score</Label>
                          <div className={`text-2xl font-bold ${formData.residualLikelihood && formData.residualImpact ? getRiskScoreColor(formData.residualLikelihood * formData.residualImpact) : "text-muted-foreground"}`}>
                            {formData.residualLikelihood && formData.residualImpact 
                              ? formData.residualLikelihood * formData.residualImpact 
                              : "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Control Effectiveness (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.controlEffectivenessScore || ""}
                        onChange={(e) => setFormData({ ...formData, controlEffectivenessScore: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="0-100"
                        data-testid="input-control-effectiveness"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Inherent Risk</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Likelihood</span>
                          <span>{assessment.inherentLikelihood}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Impact</span>
                          <span>{assessment.inherentImpact}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Score</span>
                          <span className={`font-bold ${getRiskScoreColor(assessment.inherentRiskScore)}`}>
                            {assessment.inherentRiskScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Residual Risk</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Likelihood</span>
                          <span>{assessment.residualLikelihood ? `${assessment.residualLikelihood}/5` : "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Impact</span>
                          <span>{assessment.residualImpact ? `${assessment.residualImpact}/5` : "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Score</span>
                          <span className={`font-bold ${assessment.residualRiskScore ? getRiskScoreColor(assessment.residualRiskScore) : ""}`}>
                            {assessment.residualRiskScore || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {assessment.controlEffectivenessScore && (
                      <div className="col-span-2">
                        <h4 className="font-medium mb-2">Control Effectiveness</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2" 
                              style={{ width: `${assessment.controlEffectivenessScore}%` }}
                            />
                          </div>
                          <span className="font-medium">{assessment.controlEffectivenessScore}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Findings & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Assessment Findings</Label>
                      <Textarea
                        value={formData.assessmentFindings || ""}
                        onChange={(e) => setFormData({ ...formData, assessmentFindings: e.target.value })}
                        rows={4}
                        placeholder="Document key findings from the assessment..."
                        data-testid="textarea-findings"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Recommendations</Label>
                      <Textarea
                        value={formData.recommendations || ""}
                        onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                        rows={4}
                        placeholder="Provide recommendations for risk mitigation..."
                        data-testid="textarea-recommendations"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mitigation Actions</Label>
                      <Textarea
                        value={formData.mitigationActions || ""}
                        onChange={(e) => setFormData({ ...formData, mitigationActions: e.target.value })}
                        rows={4}
                        placeholder="List specific mitigation actions to be taken..."
                        data-testid="textarea-mitigation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.assessmentNotes || ""}
                        onChange={(e) => setFormData({ ...formData, assessmentNotes: e.target.value })}
                        rows={3}
                        placeholder="Additional notes..."
                        data-testid="textarea-notes"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">Findings</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {assessment.assessmentFindings || "No findings documented yet."}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {assessment.recommendations || "No recommendations yet."}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Mitigation Actions</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {assessment.mitigationActions || "No mitigation actions defined yet."}
                      </p>
                    </div>
                    {assessment.assessmentNotes && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Notes</h4>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {assessment.assessmentNotes}
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Risk Quantification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Expected Loss ($)</Label>
                      <Input
                        type="number"
                        value={formData.expectedLoss || ""}
                        onChange={(e) => setFormData({ ...formData, expectedLoss: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Annual expected loss"
                        data-testid="input-expected-loss"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Value at Risk ($)</Label>
                      <Input
                        type="number"
                        value={formData.valueAtRisk || ""}
                        onChange={(e) => setFormData({ ...formData, valueAtRisk: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="95% confidence VaR"
                        data-testid="input-var"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Worst Case Loss ($)</Label>
                      <Input
                        type="number"
                        value={formData.worstCaseLoss || ""}
                        onChange={(e) => setFormData({ ...formData, worstCaseLoss: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="95th percentile"
                        data-testid="input-worst-case"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Best Case Loss ($)</Label>
                      <Input
                        type="number"
                        value={formData.bestCaseLoss || ""}
                        onChange={(e) => setFormData({ ...formData, bestCaseLoss: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="5th percentile"
                        data-testid="input-best-case"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Loss</span>
                      <span className="font-medium">{formatCurrency(assessment.expectedLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value at Risk</span>
                      <span className="font-medium">{formatCurrency(assessment.valueAtRisk)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Worst Case</span>
                      <span className="font-medium">{formatCurrency(assessment.worstCaseLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Best Case</span>
                      <span className="font-medium">{formatCurrency(assessment.bestCaseLoss)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assessment Date</span>
                  <span className="font-medium">
                    {format(new Date(assessment.assessmentDate), "MMM d, yyyy")}
                  </span>
                </div>
                {assessment.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className="font-medium">
                      {format(new Date(assessment.dueDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {assessment.completedDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">
                      {format(new Date(assessment.completedDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {assessment.nextAssessmentDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Assessment</span>
                    <span className="font-medium">
                      {format(new Date(assessment.nextAssessmentDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {format(new Date(assessment.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">
                    {format(new Date(assessment.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
