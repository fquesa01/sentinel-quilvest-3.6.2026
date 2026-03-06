import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams, useLocation, useRoute } from "wouter";
import { 
  ArrowLeft,
  Building2,
  DollarSign,
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Brain,
  MessageSquare,
  Target,
  TrendingUp,
  Shield,
  Lightbulb,
  Sparkles,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface PEDeal {
  id: string;
  firmId: string | null;
  name: string;
  codeName: string | null;
  status: string;
  dealType: string;
  sector: string;
  subsector: string | null;
  geography: string;
  targetDescription: string | null;
  enterpriseValue: string | null;
  revenue: string | null;
  ebitda: string | null;
  cimReceivedDate: string | null;
  loiSubmittedDate: string | null;
  loiSignedDate: string | null;
  exclusivityStart: string | null;
  exclusivityEnd: string | null;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  dataRoomUrl: string | null;
  dataRoomType: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Workstream {
  id: string;
  name: string;
  status: string;
  progress: number;
  owner: string | null;
  dueDate: string | null;
}

interface DiligenceQuestion {
  id: string;
  workstreamId: string | null;
  questionNumber: string;
  questionText: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  response: string | null;
  dueDate: string | null;
}

interface PECall {
  id: string;
  title: string;
  callType: string;
  scheduledDate: string | null;
  status: string;
  participants: string[] | null;
  aiSummary: string | null;
}

interface RiskFlag {
  id: string;
  category: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  mitigationPlan: string | null;
}

interface PatternMatch {
  id: string;
  portfolioCompanyId: string | null;
  matchType: string;
  similarity: number;
  insight: string | null;
  acknowledged: boolean;
}

const dealStages = [
  { value: "pipeline", label: "Pipeline" },
  { value: "preliminary_review", label: "Preliminary Review" },
  { value: "management_meeting", label: "Management Meeting" },
  { value: "loi_submitted", label: "LOI Submitted" },
  { value: "loi_signed", label: "LOI Signed" },
  { value: "diligence", label: "Diligence" },
  { value: "exclusivity", label: "Exclusivity" },
  { value: "definitive_docs", label: "Definitive Docs" },
  { value: "closed", label: "Closed" },
  { value: "passed", label: "Passed" },
  { value: "lost", label: "Lost" },
];

const dealTypes = [
  { value: "platform", label: "Platform" },
  { value: "add_on", label: "Add-on" },
  { value: "carve_out", label: "Carve-out" },
  { value: "growth_equity", label: "Growth Equity" },
  { value: "recap", label: "Recapitalization" },
  { value: "secondary", label: "Secondary" },
];

const severityColors: Record<string, string> = {
  deal_breaker: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  price_chip: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  integration_issue: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  watch_item: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  acceptable: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  pending_response: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  answered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  mitigated: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  accepted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  escalated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function PEDealDetail() {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [selectedStage, setSelectedStage] = useState("");
  const [isAddWorkstreamOpen, setIsAddWorkstreamOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isAddRiskOpen, setIsAddRiskOpen] = useState(false);

  const [newWorkstream, setNewWorkstream] = useState({
    name: "",
    owner: "",
    dueDate: "",
  });

  const [newQuestion, setNewQuestion] = useState({
    workstreamId: "",
    questionText: "",
    priority: "medium",
    assignedTo: "",
  });

  const [newRisk, setNewRisk] = useState({
    category: "operational",
    title: "",
    description: "",
    severity: "watch_item",
  });

  const { data: deal, isLoading: dealLoading } = useQuery<PEDeal>({
    queryKey: ["/api/pe/deals", id],
    enabled: !!id,
  });

  const { data: workstreams, isLoading: workstreamsLoading } = useQuery<Workstream[]>({
    queryKey: ["/api/pe/deals", id, "workstreams"],
    enabled: !!id,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<DiligenceQuestion[]>({
    queryKey: ["/api/pe/deals", id, "questions"],
    enabled: !!id,
  });

  const { data: calls, isLoading: callsLoading } = useQuery<PECall[]>({
    queryKey: ["/api/pe/deals", id, "calls"],
    enabled: !!id,
  });

  const { data: risks, isLoading: risksLoading } = useQuery<RiskFlag[]>({
    queryKey: ["/api/pe/deals", id, "risks"],
    enabled: !!id,
  });

  const { data: patterns, isLoading: patternsLoading } = useQuery<PatternMatch[]>({
    queryKey: ["/api/pe/deals", id, "patterns"],
    enabled: !!id,
  });

  const updateDealMutation = useMutation({
    mutationFn: async (updates: Partial<PEDeal>) => {
      return apiRequest("PATCH", `/api/pe/deals/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pe/deals", id] });
      toast({ title: "Deal updated successfully" });
      setIsEditingStage(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update deal", description: error.message, variant: "destructive" });
    },
  });

  const createWorkstreamMutation = useMutation({
    mutationFn: async (data: typeof newWorkstream) => {
      return apiRequest("POST", `/api/pe/deals/${id}/workstreams`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pe/deals", id, "workstreams"] });
      setIsAddWorkstreamOpen(false);
      setNewWorkstream({ name: "", owner: "", dueDate: "" });
      toast({ title: "Workstream created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create workstream", description: error.message, variant: "destructive" });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: typeof newQuestion) => {
      return apiRequest("POST", `/api/pe/deals/${id}/questions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pe/deals", id, "questions"] });
      setIsAddQuestionOpen(false);
      setNewQuestion({ workstreamId: "", questionText: "", priority: "medium", assignedTo: "" });
      toast({ title: "Question created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create question", description: error.message, variant: "destructive" });
    },
  });

  const createRiskMutation = useMutation({
    mutationFn: async (data: typeof newRisk) => {
      return apiRequest("POST", `/api/pe/deals/${id}/risks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pe/deals", id, "risks"] });
      setIsAddRiskOpen(false);
      setNewRisk({ category: "operational", title: "", description: "", severity: "watch_item" });
      toast({ title: "Risk flag created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create risk flag", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return "-";
    const num = parseFloat(value);
    if (isNaN(num)) return "-";
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}B`;
    }
    return `$${num.toFixed(0)}M`;
  };

  if (dealLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Deal not found</p>
            <Button variant="outline" className="mt-4" onClick={() => setLocation("/pe/deals")}>
              Back to Deals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageInfo = dealStages.find(s => s.value === deal.status);
  const overallProgress = workstreams?.length 
    ? Math.round(workstreams.reduce((sum, w) => sum + (w.progress || 0), 0) / workstreams.length)
    : 0;

  const dealBreakerRisks = risks?.filter(r => r.severity === "deal_breaker" && r.status !== "mitigated").length || 0;
  const openQuestions = questions?.filter(q => q.status !== "answered" && q.status !== "closed").length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pe/deals">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold" data-testid="text-deal-name">
                {deal.name}
              </h1>
              <Badge variant="outline">{deal.sector}</Badge>
              {deal.geography && <Badge variant="outline">{deal.geography}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {dealTypes.find(t => t.value === deal.dealType)?.label || deal.dealType}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <GenerateMemoButton dealId={id!} dealName={deal.name} />
          {isEditingStage ? (
            <div className="flex items-center gap-2">
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-[180px]" data-testid="select-stage">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {dealStages.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={() => updateDealMutation.mutate({ status: selectedStage })}
                disabled={updateDealMutation.isPending}
                data-testid="button-save-stage"
              >
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingStage(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedStage(deal.status);
                setIsEditingStage(true);
              }}
              data-testid="button-change-stage"
            >
              {stageInfo?.label || deal.status}
              <Edit2 className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-ev">{formatCurrency(deal.enterpriseValue)}</p>
                <p className="text-xs text-muted-foreground">Enterprise Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-progress">{overallProgress}%</p>
                <p className="text-xs text-muted-foreground">DD Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-questions">{openQuestions}</p>
                <p className="text-xs text-muted-foreground">Open Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dealBreakerRisks > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
                <AlertTriangle className={`h-5 w-5 ${dealBreakerRisks > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-risks">{dealBreakerRisks}</p>
                <p className="text-xs text-muted-foreground">Deal Breaker Risks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="workstreams" data-testid="tab-workstreams">
            Workstreams ({workstreams?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">
            Questions ({questions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="calls" data-testid="tab-calls">
            Calls ({calls?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="risks" data-testid="tab-risks">
            Risks ({risks?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="patterns" data-testid="tab-patterns">
            <Sparkles className="h-4 w-4 mr-1" />
            Patterns ({patterns?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Company</Label>
                    <p className="font-medium">{deal.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Sector</Label>
                    <p className="font-medium">{deal.sector}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Deal Type</Label>
                    <p className="font-medium">{dealTypes.find(t => t.value === deal.dealType)?.label || deal.dealType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Geography</Label>
                    <p className="font-medium">{deal.geography || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Enterprise Value</Label>
                    <p className="font-medium">{formatCurrency(deal.enterpriseValue)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Revenue</Label>
                    <p className="font-medium">{formatCurrency(deal.revenue)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">EBITDA</Label>
                    <p className="font-medium">{formatCurrency(deal.ebitda)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Room</Label>
                    <p className="font-medium">{deal.dataRoomType || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Expected Close</Label>
                    <p className="font-medium">
                      {deal.expectedCloseDate 
                        ? format(new Date(deal.expectedCloseDate), "MMM d, yyyy")
                        : "-"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Exclusivity Ends</Label>
                    <p className="font-medium">
                      {deal.exclusivityEnd 
                        ? format(new Date(deal.exclusivityEnd), "MMM d, yyyy")
                        : "-"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">LOI Signed</Label>
                    <p className="font-medium">
                      {deal.loiSignedDate 
                        ? format(new Date(deal.loiSignedDate), "MMM d, yyyy")
                        : "-"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Deal Created</Label>
                    <p className="font-medium">
                      {format(new Date(deal.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Target Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {deal.targetDescription || "No description provided."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workstreams" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Track due diligence progress across workstreams
            </p>
            <Button onClick={() => setIsAddWorkstreamOpen(true)} data-testid="button-add-workstream">
              <Plus className="h-4 w-4 mr-2" />
              Add Workstream
            </Button>
          </div>
          
          {workstreamsLoading ? (
            <Skeleton className="h-[300px]" />
          ) : workstreams?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No workstreams yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add workstreams to track due diligence progress
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {workstreams?.map((ws) => (
                <Card key={ws.id} data-testid={`card-workstream-${ws.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{ws.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {ws.owner || "Unassigned"} 
                          {ws.dueDate && ` • Due ${format(new Date(ws.dueDate), "MMM d")}`}
                        </p>
                      </div>
                      <Badge className={statusColors[ws.status] || statusColors.open}>
                        {ws.status}
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{ws.progress || 0}%</span>
                      </div>
                      <Progress value={ws.progress || 0} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Diligence questions and management responses
            </p>
            <Button onClick={() => setIsAddQuestionOpen(true)} data-testid="button-add-question">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questionsLoading ? (
            <Skeleton className="h-[300px]" />
          ) : questions?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No questions yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions?.map((q) => (
                    <TableRow key={q.id} data-testid={`row-question-${q.id}`}>
                      <TableCell className="font-mono text-sm">{q.questionNumber}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2">{q.questionText}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[q.status] || statusColors.open}>
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{q.assignedTo || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" data-testid={`button-view-question-${q.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Management calls and expert interviews
            </p>
            <Button data-testid="button-schedule-call">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Call
            </Button>
          </div>

          {callsLoading ? (
            <Skeleton className="h-[300px]" />
          ) : calls?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No calls scheduled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {calls?.map((call) => (
                <Card key={call.id} data-testid={`card-call-${call.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                          <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">{call.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {call.callType} 
                            {call.scheduledDate && ` • ${format(new Date(call.scheduledDate), "MMM d, h:mm a")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[call.status] || statusColors.open}>
                          {call.status}
                        </Badge>
                        {call.aiSummary && (
                          <Badge variant="outline" className="gap-1">
                            <Brain className="h-3 w-3" />
                            AI Summary
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Risk flags and mitigation plans
            </p>
            <Button onClick={() => setIsAddRiskOpen(true)} data-testid="button-add-risk">
              <Plus className="h-4 w-4 mr-2" />
              Add Risk
            </Button>
          </div>

          {risksLoading ? (
            <Skeleton className="h-[300px]" />
          ) : risks?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No risks flagged</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {risks?.map((risk) => (
                <Card key={risk.id} data-testid={`card-risk-${risk.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${
                          risk.severity === "deal_breaker" 
                            ? "bg-red-100 dark:bg-red-900" 
                            : "bg-amber-100 dark:bg-amber-900"
                        }`}>
                          <AlertTriangle className={`h-5 w-5 ${
                            risk.severity === "deal_breaker"
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{risk.title}</h4>
                            <Badge variant="outline">{risk.category}</Badge>
                          </div>
                          {risk.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {risk.description}
                            </p>
                          )}
                          {risk.mitigationPlan && (
                            <p className="text-sm mt-2">
                              <span className="font-medium">Mitigation:</span> {risk.mitigationPlan}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={severityColors[risk.severity] || severityColors.watch_item}>
                          {risk.severity.replace(/_/g, " ")}
                        </Badge>
                        <Badge className={statusColors[risk.status] || statusColors.open}>
                          {risk.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              AI-identified patterns from portfolio history
            </p>
          </div>

          {patternsLoading ? (
            <Skeleton className="h-[300px]" />
          ) : patterns?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No patterns detected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI will identify patterns as you add more deal data
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {patterns?.map((pattern) => (
                <Card key={pattern.id} className={pattern.acknowledged ? "opacity-60" : ""} data-testid={`card-pattern-${pattern.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                        <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{pattern.matchType}</Badge>
                          <Badge variant="outline">{Math.round(pattern.similarity * 100)}% match</Badge>
                        </div>
                        {pattern.insight && (
                          <p className="text-sm mt-2">{pattern.insight}</p>
                        )}
                      </div>
                      {pattern.acknowledged && (
                        <Badge variant="secondary">Acknowledged</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isAddWorkstreamOpen} onOpenChange={setIsAddWorkstreamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Workstream</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workstream Name *</Label>
              <Input
                id="ws-name"
                value={newWorkstream.name}
                onChange={(e) => setNewWorkstream({ ...newWorkstream, name: e.target.value })}
                placeholder="e.g., Financial Due Diligence"
                data-testid="input-workstream-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-owner">Owner</Label>
              <Input
                id="ws-owner"
                value={newWorkstream.owner}
                onChange={(e) => setNewWorkstream({ ...newWorkstream, owner: e.target.value })}
                placeholder="Team member name"
                data-testid="input-workstream-owner"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-due">Due Date</Label>
              <Input
                id="ws-due"
                type="date"
                value={newWorkstream.dueDate}
                onChange={(e) => setNewWorkstream({ ...newWorkstream, dueDate: e.target.value })}
                data-testid="input-workstream-due"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddWorkstreamOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createWorkstreamMutation.mutate(newWorkstream)}
              disabled={createWorkstreamMutation.isPending || !newWorkstream.name}
              data-testid="button-submit-workstream"
            >
              Add Workstream
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Diligence Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="q-text">Question *</Label>
              <Textarea
                id="q-text"
                value={newQuestion.questionText}
                onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                placeholder="Enter your diligence question..."
                rows={3}
                data-testid="input-question-text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="q-priority">Priority</Label>
                <Select value={newQuestion.priority} onValueChange={(v) => setNewQuestion({ ...newQuestion, priority: v })}>
                  <SelectTrigger data-testid="select-question-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="q-assigned">Assigned To</Label>
                <Input
                  id="q-assigned"
                  value={newQuestion.assignedTo}
                  onChange={(e) => setNewQuestion({ ...newQuestion, assignedTo: e.target.value })}
                  placeholder="Team member"
                  data-testid="input-question-assigned"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddQuestionOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createQuestionMutation.mutate(newQuestion)}
              disabled={createQuestionMutation.isPending || !newQuestion.questionText}
              data-testid="button-submit-question"
            >
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddRiskOpen} onOpenChange={setIsAddRiskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Risk Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="risk-title">Title *</Label>
              <Input
                id="risk-title"
                value={newRisk.title}
                onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                placeholder="Brief risk description"
                data-testid="input-risk-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="risk-category">Category</Label>
                <Select value={newRisk.category} onValueChange={(v) => setNewRisk({ ...newRisk, category: v })}>
                  <SelectTrigger data-testid="select-risk-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="hr">HR/People</SelectItem>
                    <SelectItem value="environmental">Environmental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk-severity">Severity</Label>
                <Select value={newRisk.severity} onValueChange={(v) => setNewRisk({ ...newRisk, severity: v })}>
                  <SelectTrigger data-testid="select-risk-severity">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deal_breaker">Deal Breaker</SelectItem>
                    <SelectItem value="price_chip">Price Chip</SelectItem>
                    <SelectItem value="integration_issue">Integration Issue</SelectItem>
                    <SelectItem value="watch_item">Watch Item</SelectItem>
                    <SelectItem value="acceptable">Acceptable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk-description">Description</Label>
              <Textarea
                id="risk-description"
                value={newRisk.description}
                onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                placeholder="Detailed risk description..."
                rows={3}
                data-testid="input-risk-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRiskOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createRiskMutation.mutate(newRisk)}
              disabled={createRiskMutation.isPending || !newRisk.title}
              data-testid="button-submit-risk"
            >
              Add Risk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GenerateMemoButton({ dealId, dealName }: { dealId: string; dealName: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: existingMemos } = useQuery({
    queryKey: ["/api/deals", dealId, "memos"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/deals/${dealId}/memos/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceType: "pe_deal" }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let memoId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.memoId) memoId = data.memoId;
            if (data.stage === "error") {
              toast({ title: "Generation failed", description: data.message, variant: "destructive" });
              setIsGenerating(false);
              return;
            }
          } catch {}
        }
      }

      if (memoId) {
        navigate(`/investor-memo/${memoId}`);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIsGenerating(false);
  };

  const latestMemo = (existingMemos as any[])?.[0];

  return (
    <div className="flex items-center gap-2">
      {latestMemo && (
        <Link href={`/investor-memo/${latestMemo.id}`}>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            View Memo
          </Button>
        </Link>
      )}
      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <><Sparkles className="h-4 w-4 animate-pulse" /> Generating...</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Generate Investor Memo</>
        )}
      </Button>
    </div>
  );
}
