import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GrcRiskAssessment, GrcRisk } from "@shared/schema";

type AssessmentStatus = "draft" | "in_progress" | "pending_review" | "approved" | "rejected" | "completed";
type AssessmentType = "initial" | "periodic" | "triggered" | "ad_hoc";

const statusColors: Record<AssessmentStatus, string> = {
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  pending_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
};

const typeLabels: Record<AssessmentType, string> = {
  initial: "Initial",
  periodic: "Periodic",
  triggered: "Triggered",
  ad_hoc: "Ad Hoc",
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

export default function RiskAssessments() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formAssessmentType, setFormAssessmentType] = useState("periodic");
  const [formRiskId, setFormRiskId] = useState("");
  const [formLikelihood, setFormLikelihood] = useState("3");
  const [formImpact, setFormImpact] = useState("3");

  const { data: assessments = [], isLoading } = useQuery<GrcRiskAssessment[]>({
    queryKey: ["/api/grc/risk-assessments"],
  });

  const { data: risks = [] } = useQuery<GrcRisk[]>({
    queryKey: ["/api/grc/risks"],
  });

  const createAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/grc/risk-assessments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risk-assessments"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Assessment created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create assessment", variant: "destructive" });
    },
  });

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch =
      assessment.assessmentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.assessmentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || assessment.status === statusFilter;
    const matchesType = typeFilter === "all" || assessment.assessmentType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: assessments.length,
    inProgress: assessments.filter((a) => a.status === "in_progress").length,
    pendingReview: assessments.filter((a) => a.status === "pending_review").length,
    completed: assessments.filter((a) => a.status === "completed").length,
  };

  const handleCreateAssessment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inherentLikelihood = parseInt(formLikelihood);
    const inherentImpact = parseInt(formImpact);
    
    if (!formRiskId) {
      toast({ title: "Please select a risk", variant: "destructive" });
      return;
    }
    
    createAssessmentMutation.mutate({
      assessmentTitle: formData.get("assessmentTitle"),
      assessmentType: formAssessmentType,
      riskId: formRiskId,
      inherentLikelihood,
      inherentImpact,
      inherentRiskScore: inherentLikelihood * inherentImpact,
      assessmentDate: new Date().toISOString(),
    });
  };

  return (
    <>
      <Helmet>
        <title>Risk Assessments | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Risk Assessments</h1>
            <p className="text-muted-foreground">Conduct and manage risk assessments</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-assessment">
                <Plus className="h-4 w-4 mr-2" />
                New Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Risk Assessment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAssessment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assessmentTitle">Assessment Title</Label>
                  <Input
                    id="assessmentTitle"
                    name="assessmentTitle"
                    placeholder="Enter assessment title"
                    required
                    data-testid="input-assessment-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessmentType">Assessment Type</Label>
                  <Select value={formAssessmentType} onValueChange={setFormAssessmentType}>
                    <SelectTrigger data-testid="select-assessment-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="initial">Initial Assessment</SelectItem>
                      <SelectItem value="periodic">Periodic Review</SelectItem>
                      <SelectItem value="triggered">Triggered Assessment</SelectItem>
                      <SelectItem value="ad_hoc">Ad Hoc Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riskId">Risk to Assess</Label>
                  <Select value={formRiskId} onValueChange={setFormRiskId}>
                    <SelectTrigger data-testid="select-risk">
                      <SelectValue placeholder="Select a risk" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {risks.map((risk) => (
                        <SelectItem key={risk.id} value={risk.id}>
                          {risk.riskTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inherentLikelihood">Inherent Likelihood (1-5)</Label>
                    <Select value={formLikelihood} onValueChange={setFormLikelihood}>
                      <SelectTrigger data-testid="select-likelihood">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="1">1 - Rare</SelectItem>
                        <SelectItem value="2">2 - Unlikely</SelectItem>
                        <SelectItem value="3">3 - Possible</SelectItem>
                        <SelectItem value="4">4 - Likely</SelectItem>
                        <SelectItem value="5">5 - Almost Certain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inherentImpact">Inherent Impact (1-5)</Label>
                    <Select value={formImpact} onValueChange={setFormImpact}>
                      <SelectTrigger data-testid="select-impact">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="1">1 - Negligible</SelectItem>
                        <SelectItem value="2">2 - Minor</SelectItem>
                        <SelectItem value="3">3 - Moderate</SelectItem>
                        <SelectItem value="4">4 - Major</SelectItem>
                        <SelectItem value="5">5 - Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAssessmentMutation.isPending}
                    data-testid="button-submit-assessment"
                  >
                    Create Assessment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-assessments">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-in-progress">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-review">{stats.pendingReview}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-completed">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Assessment Register</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assessments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-assessments"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40" data-testid="select-type-filter">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="initial">Initial</SelectItem>
                    <SelectItem value="periodic">Periodic</SelectItem>
                    <SelectItem value="triggered">Triggered</SelectItem>
                    <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Assessments Found</h3>
                <p className="text-muted-foreground mb-4">
                  {assessments.length === 0
                    ? "Start by creating your first risk assessment"
                    : "No assessments match your current filters"}
                </p>
                {assessments.length === 0 && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assessment
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Inherent Score</TableHead>
                    <TableHead className="text-center">Residual Score</TableHead>
                    <TableHead className="text-right">Expected Loss</TableHead>
                    <TableHead>Assessment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow
                      key={assessment.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/risk-management/assessment/${assessment.id}`)}
                      data-testid={`row-assessment-${assessment.id}`}
                    >
                      <TableCell className="font-mono text-sm">
                        {assessment.assessmentNumber}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {assessment.assessmentTitle}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {typeLabels[assessment.assessmentType as AssessmentType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[assessment.status as AssessmentStatus]}>
                          {assessment.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${getRiskScoreColor(assessment.inherentRiskScore)}`}>
                          {assessment.inherentRiskScore}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {assessment.residualRiskScore ? (
                          <span className={`font-semibold ${getRiskScoreColor(assessment.residualRiskScore)}`}>
                            {assessment.residualRiskScore}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(assessment.expectedLoss)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {assessment.assessmentDate
                          ? format(new Date(assessment.assessmentDate), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
