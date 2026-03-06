import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ArrowLeft,
  Play,
  Upload,
  FileText,
  Building,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
  Files,
  User,
  Globe,
  FileSearch,
  Trash2,
  Download,
  Eye,
  ChevronRight,
  AlertCircle,
  MessageCircleQuestion,
  Users,
  DollarSign,
  Scale,
  TrendingUp,
  Newspaper,
  Lightbulb,
  ShieldAlert,
  Link as LinkIcon,
  Check,
  X as XIcon,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type ResearchDocument = {
  id: string;
  researchId: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  filePath: string | null;
  documentCategory: string;
  documentDate: string | null;
  extractedText: string | null;
  pageCount: number | null;
  processingStatus: string;
  aiSummary: string | null;
  createdAt: string;
};

type ResearchFinding = {
  id: string;
  researchId: string;
  module: string;
  category: string | null;
  subcategory: string | null;
  title: string;
  description: string;
  details: any;
  severity: "info" | "low" | "medium" | "high" | "critical";
  isKeyFinding: boolean;
  requiresFollowUp: boolean;
  sourceType: string | null;
  sourceDocumentId: string | null;
  sourceUrl: string | null;
  sourceExcerpt: string | null;
  isVerified: boolean;
  verifiedBy: string | null;
  userNotes: string | null;
  isDismissed: boolean;
  createdAt: string;
};

type ResearchEntity = {
  id: string;
  researchId: string;
  entityType: string;
  entityName: string;
  normalizedName: string | null;
  title: string | null;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  relationship: string | null;
  mentionCount: number;
  createdAt: string;
};

type FollowUpQuestion = {
  id: string;
  researchId: string;
  findingId: string | null;
  question: string;
  context: string | null;
  priority: string;
  category: string | null;
  isAnswered: boolean;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
};

type BackgroundResearch = {
  id: string;
  dealId: string | null;
  caseId: string | null;
  targetName: string;
  targetWebsite: string | null;
  targetIndustry: string | null;
  targetDescription: string | null;
  researchType: string;
  enabledModules: string[];
  status: "draft" | "processing" | "completed" | "failed";
  progress: number;
  currentStep: string | null;
  executiveSummary: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  keyFindings: any[];
  documentCount: number;
  pageCount: number;
  processingTimeSeconds: number | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
};

const MODULE_ICONS: Record<string, any> = {
  company_overview: Building,
  key_people: Users,
  risk_indicators: ShieldAlert,
  financial_analysis: DollarSign,
  material_contracts: FileText,
  litigation_regulatory: Scale,
  competitive_landscape: TrendingUp,
  ip_technology: Lightbulb,
  customer_concentration: Users,
  news_media: Newspaper,
  business_lines: Building,
  contradiction_detection: AlertCircle,
};

const MODULE_NAMES: Record<string, string> = {
  company_overview: "Company Overview",
  key_people: "Key People",
  risk_indicators: "Risk Indicators",
  financial_analysis: "Financial Analysis",
  material_contracts: "Material Contracts",
  litigation_regulatory: "Litigation & Regulatory",
  competitive_landscape: "Competitive Landscape",
  ip_technology: "IP & Technology",
  customer_concentration: "Customer Concentration",
  news_media: "News & Media",
  business_lines: "Business Lines",
  contradiction_detection: "Contradiction Detection",
};

const DOCUMENT_CATEGORIES = [
  { value: "financial_statement", label: "Financial Statement" },
  { value: "contract", label: "Contract" },
  { value: "email", label: "Email" },
  { value: "presentation", label: "Presentation" },
  { value: "legal_filing", label: "Legal Filing" },
  { value: "internal_memo", label: "Internal Memo" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case "low": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
  }
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "Unknown";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function BackgroundResearchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [viewingDoc, setViewingDoc] = useState<ResearchDocument | null>(null);
  const [answeringQuestion, setAnsweringQuestion] = useState<FollowUpQuestion | null>(null);
  const [answerText, setAnswerText] = useState("");

  const { data: research, isLoading: researchLoading, refetch } = useQuery<BackgroundResearch>({
    queryKey: ["/api/background-research", id],
    refetchInterval: (data) => data?.status === "processing" ? 3000 : false,
  });

  const { data: documents, isLoading: docsLoading } = useQuery<ResearchDocument[]>({
    queryKey: ["/api/background-research", id, "documents"],
    enabled: !!id,
  });

  const { data: findings } = useQuery<ResearchFinding[]>({
    queryKey: ["/api/background-research", id, "findings"],
    enabled: !!id && research?.status === "completed",
  });

  const { data: entities } = useQuery<ResearchEntity[]>({
    queryKey: ["/api/background-research", id, "entities"],
    enabled: !!id && research?.status === "completed",
  });

  const { data: questions } = useQuery<FollowUpQuestion[]>({
    queryKey: ["/api/background-research", id, "follow-up-questions"],
    enabled: !!id && research?.status === "completed",
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/background-research/${id}/analyze`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Analysis started", description: "AI is now analyzing your documents." });
      queryClient.invalidateQueries({ queryKey: ["/api/background-research", id] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentCategory", uploadCategory);
      
      const res = await fetch(`/api/background-research/${id}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded", description: "Text extraction is in progress." });
      queryClient.invalidateQueries({ queryKey: ["/api/background-research", id, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/background-research", id] });
      setIsUploadOpen(false);
      setUploadFile(null);
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest(`/api/research-documents/${docId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Document deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/background-research", id, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/background-research", id] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateFindingMutation = useMutation({
    mutationFn: async ({ findingId, updates }: { findingId: string; updates: any }) => {
      const res = await apiRequest(`/api/research-findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/background-research", id, "findings"] });
    },
  });

  const answerQuestionMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const res = await apiRequest(`/api/research-follow-up-questions/${questionId}/answer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Answer saved", description: "The question has been marked as answered." });
      queryClient.invalidateQueries({ queryKey: ["/api/background-research", id, "follow-up-questions"] });
      setAnsweringQuestion(null);
      setAnswerText("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const groupedFindings = findings?.reduce((acc, f) => {
    if (!acc[f.module]) acc[f.module] = [];
    acc[f.module].push(f);
    return acc;
  }, {} as Record<string, ResearchFinding[]>) || {};

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setUploadFile(file);
  }, []);

  if (researchLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Research Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested research project does not exist.</p>
          <Button onClick={() => setLocation("/background-research")} data-testid="button-back-to-list">
            Back to Research List
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{research.targetName} - Background Research | Sentinel Counsel LLP</title>
      </Helmet>

      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/background-research")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold" data-testid="text-target-name">{research.targetName}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {research.targetIndustry && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {research.targetIndustry}
                  </span>
                )}
                {research.targetWebsite && (
                  <a href={research.targetWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                    <Globe className="h-3 w-3" />
                    Website
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Created {format(new Date(research.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {research.status === "draft" && (
                <Button
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending || (documents?.length || 0) === 0}
                  data-testid="button-run-analysis"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Analysis
                </Button>
              )}
              {research.status === "processing" && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Processing ({research.progress}%)
                </Badge>
              )}
              {research.status === "completed" && (
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
              {research.status === "failed" && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>
          </div>

          {research.status === "processing" && (
            <div className="space-y-2 mt-4">
              <Progress value={research.progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{research.currentStep || "Processing..."}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              Documents ({research.documentCount})
            </TabsTrigger>
            {research.status === "completed" && (
              <>
                <TabsTrigger value="findings" data-testid="tab-findings">Findings</TabsTrigger>
                <TabsTrigger value="entities" data-testid="tab-entities">Entities</TabsTrigger>
                <TabsTrigger value="questions" data-testid="tab-questions">
                  Follow-up ({questions?.filter(q => !q.isAnswered).length || 0})
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{research.documentCount}</div>
                  <p className="text-xs text-muted-foreground">{research.pageCount} pages total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Risk Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{research.riskScore ?? "—"}</div>
                  {research.riskLevel && (
                    <Badge className={getSeverityColor(research.riskLevel)} variant="outline">
                      {research.riskLevel.charAt(0).toUpperCase() + research.riskLevel.slice(1)}
                    </Badge>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Key Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{research.keyFindings?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Requiring attention</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Processing Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {research.processingTimeSeconds 
                      ? `${Math.floor(research.processingTimeSeconds / 60)}m ${research.processingTimeSeconds % 60}s`
                      : "—"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {research.executiveSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                    {research.executiveSummary}
                  </div>
                </CardContent>
              </Card>
            )}

            {research.keyFindings && research.keyFindings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Findings</CardTitle>
                  <CardDescription>Critical issues requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {research.keyFindings.map((finding: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                          finding.severity === "critical" ? "text-red-500" :
                          finding.severity === "high" ? "text-orange-500" :
                          "text-yellow-500"
                        }`} />
                        <div>
                          <div className="font-medium">{finding.title}</div>
                          <div className="text-sm text-muted-foreground">
                            <Badge variant="outline" className="mr-2">{MODULE_NAMES[finding.module] || finding.module}</Badge>
                            <Badge className={getSeverityColor(finding.severity)} variant="outline">
                              {finding.severity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {research.targetDescription && (
              <Card>
                <CardHeader>
                  <CardTitle>Target Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{research.targetDescription}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Uploaded Documents</h3>
              <Button onClick={() => setIsUploadOpen(true)} disabled={research.status === "processing"} data-testid="button-upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>

            {docsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !documents || documents.length === 0 ? (
              <Card className="p-8 text-center">
                <Files className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Documents Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload documents to analyze. Supported formats: PDF, DOCX, TXT, CSV, EML
                </p>
                <Button onClick={() => setIsUploadOpen(true)} data-testid="button-upload-empty">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <Card key={doc.id} className="p-4" data-testid={`card-document-${doc.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.fileName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <Badge variant="outline">{doc.documentCategory.replace("_", " ")}</Badge>
                          {doc.pageCount && <span>{doc.pageCount} pages</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.processingStatus === "pending" && (
                          <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                        )}
                        {doc.processingStatus === "processing" && (
                          <Badge variant="outline" className="bg-blue-50"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>
                        )}
                        {doc.processingStatus === "completed" && (
                          <Badge variant="outline" className="bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>
                        )}
                        {doc.processingStatus === "failed" && (
                          <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setViewingDoc(doc)}
                              disabled={doc.processingStatus !== "completed" || !doc.extractedText}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Extracted Text
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Delete "${doc.fileName}"?`)) {
                                  deleteDocMutation.mutate(doc.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="findings" className="space-y-4">
            <div className="grid grid-cols-4 gap-6">
              <div className="col-span-1">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Modules</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      {Object.keys(MODULE_NAMES).map(mod => {
                        const Icon = MODULE_ICONS[mod] || FileSearch;
                        const count = groupedFindings[mod]?.length || 0;
                        const isActive = activeModule === mod;
                        return (
                          <button
                            key={mod}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover-elevate transition-colors ${
                              isActive ? "bg-primary/10 border-l-2 border-primary" : ""
                            }`}
                            onClick={() => setActiveModule(isActive ? null : mod)}
                            data-testid={`button-module-${mod}`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 text-sm">{MODULE_NAMES[mod]}</span>
                            {count > 0 && (
                              <Badge variant="secondary" className="text-xs">{count}</Badge>
                            )}
                          </button>
                        );
                      })}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {activeModule ? MODULE_NAMES[activeModule] : "All Findings"}
                    </CardTitle>
                    <CardDescription>
                      {activeModule 
                        ? `${groupedFindings[activeModule]?.length || 0} findings in this category`
                        : `${findings?.length || 0} total findings`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[450px]">
                      <Accordion type="multiple" className="space-y-2">
                        {(activeModule ? groupedFindings[activeModule] || [] : findings || [])
                          .filter(f => !f.isDismissed)
                          .map(finding => (
                          <AccordionItem key={finding.id} value={finding.id} className="border rounded-lg px-4" data-testid={`accordion-finding-${finding.id}`}>
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center gap-3 text-left">
                                <Badge className={getSeverityColor(finding.severity)} variant="outline">
                                  {finding.severity}
                                </Badge>
                                <span className="font-medium">{finding.title}</span>
                                {finding.isKeyFinding && (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                                {finding.isVerified && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="space-y-3">
                                <p className="text-muted-foreground">{finding.description}</p>
                                
                                {finding.sourceExcerpt && (
                                  <div className="p-3 bg-muted rounded text-sm">
                                    <div className="font-medium mb-1">Source</div>
                                    <p className="italic">"{finding.sourceExcerpt}"</p>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateFindingMutation.mutate({
                                      findingId: finding.id,
                                      updates: { isVerified: !finding.isVerified }
                                    })}
                                  >
                                    {finding.isVerified ? <XIcon className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                    {finding.isVerified ? "Unverify" : "Verify"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateFindingMutation.mutate({
                                      findingId: finding.id,
                                      updates: { isKeyFinding: !finding.isKeyFinding }
                                    })}
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {finding.isKeyFinding ? "Remove Key" : "Mark Key"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground"
                                    onClick={() => updateFindingMutation.mutate({
                                      findingId: finding.id,
                                      updates: { isDismissed: true }
                                    })}
                                  >
                                    Dismiss
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="entities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Discovered Entities</CardTitle>
                <CardDescription>People, companies, and key data points extracted from documents</CardDescription>
              </CardHeader>
              <CardContent>
                {!entities || entities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No entities discovered yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        People ({entities.filter(e => e.entityType === "person").length})
                      </h4>
                      <div className="space-y-2">
                        {entities.filter(e => e.entityType === "person").slice(0, 10).map(entity => (
                          <div key={entity.id} className="p-3 border rounded-lg">
                            <div className="font-medium">{entity.entityName}</div>
                            {entity.title && <div className="text-sm text-muted-foreground">{entity.title}</div>}
                            <div className="text-xs text-muted-foreground mt-1">
                              Mentioned {entity.mentionCount} times
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Companies ({entities.filter(e => e.entityType === "company").length})
                      </h4>
                      <div className="space-y-2">
                        {entities.filter(e => e.entityType === "company").slice(0, 10).map(entity => (
                          <div key={entity.id} className="p-3 border rounded-lg">
                            <div className="font-medium">{entity.entityName}</div>
                            {entity.relationship && <div className="text-sm text-muted-foreground">{entity.relationship}</div>}
                            <div className="text-xs text-muted-foreground mt-1">
                              Mentioned {entity.mentionCount} times
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircleQuestion className="h-5 w-5" />
                  Follow-up Questions
                </CardTitle>
                <CardDescription>AI-generated questions requiring additional information</CardDescription>
              </CardHeader>
              <CardContent>
                {!questions || questions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No follow-up questions generated.</p>
                ) : (
                  <div className="space-y-3">
                    {questions.map(q => (
                      <div key={q.id} className={`p-4 border rounded-lg ${q.isAnswered ? "bg-muted/50" : ""}`} data-testid={`card-question-${q.id}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-1 rounded ${q.isAnswered ? "bg-green-100 dark:bg-green-900" : "bg-yellow-100 dark:bg-yellow-900"}`}>
                            {q.isAnswered ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <MessageCircleQuestion className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{q.question}</div>
                            {q.context && <div className="text-sm text-muted-foreground mt-1">{q.context}</div>}
                            {q.answer && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <span className="font-medium">Answer:</span> {q.answer}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline">{q.priority} priority</Badge>
                              {q.category && <Badge variant="outline">{q.category}</Badge>}
                              {!q.isAnswered && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAnsweringQuestion(q);
                                    setAnswerText("");
                                  }}
                                  data-testid={`button-answer-${q.id}`}
                                >
                                  <MessageCircleQuestion className="h-3 w-3 mr-1" />
                                  Provide Answer
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Add a document for AI analysis</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.csv,.json,.eml,.msg"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-medium">{uploadFile.name}</div>
                    <div className="text-sm text-muted-foreground">{formatFileSize(uploadFile.size)}</div>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drag & drop or click to select</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, CSV, EML supported</p>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label>Document Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button
              onClick={() => uploadFile && uploadMutation.mutate(uploadFile)}
              disabled={!uploadFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingDoc?.fileName}
            </DialogTitle>
            <DialogDescription>
              {viewingDoc?.documentCategory.replace("_", " ")} - {formatFileSize(viewingDoc?.fileSize || null)}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] border rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {viewingDoc?.extractedText || "No extracted text available."}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDoc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!answeringQuestion} onOpenChange={() => setAnsweringQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Answer Question</DialogTitle>
            <DialogDescription>Provide an answer to the follow-up question</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">Question:</div>
              <p className="text-muted-foreground">{answeringQuestion?.question}</p>
              {answeringQuestion?.context && (
                <p className="text-sm text-muted-foreground mt-2 italic">{answeringQuestion.context}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Your Answer</Label>
              <Textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Enter your answer..."
                rows={4}
                data-testid="textarea-answer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnsweringQuestion(null)}>Cancel</Button>
            <Button
              onClick={() => answeringQuestion && answerQuestionMutation.mutate({
                questionId: answeringQuestion.id,
                answer: answerText,
              })}
              disabled={!answerText.trim() || answerQuestionMutation.isPending}
              data-testid="button-submit-answer"
            >
              {answerQuestionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Answer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
