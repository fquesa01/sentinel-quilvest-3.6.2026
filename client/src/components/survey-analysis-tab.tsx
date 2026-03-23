import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Loader2,
  Sparkles,
  Upload,
  Ruler,
  TreePine,
  Building,
  AlertTriangle,
  Home,
  Eye,
  CheckCircle,
  XCircle,
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  FolderOpen,
} from "lucide-react";
import type {
  Survey,
  SurveyBoundary,
  SurveyEasement,
  SurveyEncroachment,
  SurveyImprovement,
  SurveyDiscrepancy,
} from "@shared/schema";

type SurveyWithDetails = Survey & {
  boundaries: SurveyBoundary[];
  easements: SurveyEasement[];
  encroachments: SurveyEncroachment[];
  improvements: SurveyImprovement[];
  discrepancies: SurveyDiscrepancy[];
};

const subSections = [
  { id: "overview", label: "Overview", icon: MapPin },
  { id: "boundaries", label: "Boundaries", icon: Compass },
  { id: "easements", label: "Easements", icon: TreePine },
  { id: "encroachments", label: "Encroachments", icon: AlertTriangle },
  { id: "improvements", label: "Improvements", icon: Home },
  { id: "discrepancies", label: "Discrepancies", icon: XCircle },
  { id: "plat", label: "Plat Visual", icon: Eye },
] as const;

const severityColors: Record<string, string> = {
  minor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  major: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const matchStatusColors: Record<string, string> = {
  matched: "bg-green-500/20 text-green-400 border-green-500/30",
  unmatched: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  partial_match: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  pending_review: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const matchStatusLabels: Record<string, string> = {
  matched: "Matched Exception",
  unmatched: "No Exception Found",
  partial_match: "Partial Match",
  pending_review: "Pending Review",
};

const easementTypeLabels: Record<string, string> = {
  utility: "Utility",
  drainage: "Drainage",
  access: "Access",
  conservation: "Conservation",
  sidewalk: "Sidewalk",
  ingress_egress: "Ingress/Egress",
  other: "Other",
};

const discrepancyTypeLabels: Record<string, string> = {
  exception_mismatch: "Exception Mismatch",
  legal_description_mismatch: "Legal Desc. Mismatch",
  boundary_conflict: "Boundary Conflict",
  boundary_monument_missing: "Monument Missing",
  easement_missing: "Easement Missing",
  encroachment_unaddressed: "Encroachment Unaddressed",
  setback_violation: "Setback Violation",
  area_discrepancy: "Area Discrepancy",
  other: "Other",
};

const discrepancyStatusLabels: Record<string, string> = {
  identified: "Identified",
  under_review: "Under Review",
  resolved: "Resolved",
  accepted_risk: "Accepted Risk",
};

interface DataRoomDoc {
  id: string;
  fileName: string | null;
  fileSize: number | null;
  hasExtractedText: boolean;
}

const SURVEY_KEYWORDS = ["survey", "alta", "boundary survey", "plat survey", "as-built", "topographic survey"];

function isSurveyDocument(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SURVEY_KEYWORDS.some(kw => lower.includes(kw));
}

export function SurveyAnalysisTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [surveyText, setSurveyText] = useState("");
  const [commitmentIdForAnalysis, setCommitmentIdForAnalysis] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [autoDetectDismissed, setAutoDetectDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/deals", dealId, "title", "survey"],
  });

  const activeSurveyId = surveys.length > 0 ? surveys[0].id : null;

  const { data: surveyDetail } = useQuery<SurveyWithDetails>({
    queryKey: ["/api/deals", dealId, "title", "survey", activeSurveyId],
    enabled: !!activeSurveyId,
  });

  const { data: dataRoomDocs = [] } = useQuery<DataRoomDoc[]>({
    queryKey: ["/api/deals", dealId, "data-room-documents-list"],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/data-room-documents-list`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const detectedSurveyDoc = dataRoomDocs.find(d => d.fileName && isSurveyDocument(d.fileName) && d.hasExtractedText);
  const showAutoDetect = !activeSurveyId && !autoDetectDismissed && !!detectedSurveyDoc && surveys.length === 0 && !isLoading;

  const analyzeMutation = useMutation({
    mutationFn: async (data: { surveyText: string; commitmentId?: string }) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/title/survey/analyze`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "survey"] });
      toast({ title: "Survey Analyzed", description: "AI has extracted and cross-referenced all survey data." });
      setAnalyzeDialogOpen(false);
      setSurveyText("");
    },
    onError: (err: Error) => {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
    },
  });

  const pdfUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("surveyPdf", file);
      if (commitmentIdForAnalysis) formData.append("commitmentId", commitmentIdForAnalysis);
      const res = await fetch(`/api/deals/${dealId}/title/survey/upload-analyze`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errBody.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "survey"] });
      toast({ title: "Survey PDF Analyzed", description: "AI has extracted data from the uploaded PDF and cross-referenced against title exceptions." });
      setAnalyzeDialogOpen(false);
      setSurveyText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: Error) => {
      toast({ title: "PDF Analysis Failed", description: err.message, variant: "destructive" });
    },
  });

  const dataRoomAnalyzeMutation = useMutation({
    mutationFn: async (data: { documentId: string; commitmentId?: string }) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/title/survey/analyze-from-dataroom`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "survey"] });
      toast({ title: "Survey Analyzed", description: "AI has analyzed the data room document and extracted survey data." });
      setAnalyzeDialogOpen(false);
      setSelectedDocId("");
    },
    onError: (err: Error) => {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateDiscrepancyMutation = useMutation({
    mutationFn: async ({ discrepancyId, data }: { discrepancyId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/title/survey/${activeSurveyId}/discrepancies/${discrepancyId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "survey", activeSurveyId] });
      toast({ title: "Discrepancy Updated" });
    },
  });

  const isAnyPending = analyzeMutation.isPending || pdfUploadMutation.isPending || dataRoomAnalyzeMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {subSections.map(s => {
            const Icon = s.icon;
            return (
              <Button
                key={s.id}
                size="sm"
                variant={activeSection === s.id ? "default" : "ghost"}
                onClick={() => setActiveSection(s.id)}
                data-testid={`button-survey-section-${s.id}`}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {s.label}
              </Button>
            );
          })}
        </div>
        <Button
          size="sm"
          onClick={() => setAnalyzeDialogOpen(true)}
          data-testid="button-analyze-survey"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          AI Analyze Survey
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {!surveyDetail && surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {showAutoDetect && detectedSurveyDoc ? (
              <Card className="mb-6 max-w-lg w-full border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium" data-testid="text-auto-detect-title">Survey Document Detected</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Found <span className="font-medium">{detectedSurveyDoc.fileName}</span> in the data room. Would you like to analyze it automatically?
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => dataRoomAnalyzeMutation.mutate({ documentId: detectedSurveyDoc.id })}
                          disabled={isAnyPending}
                          data-testid="button-auto-analyze-survey"
                        >
                          {dataRoomAnalyzeMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                          )}
                          Analyze Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAutoDetectDismissed(true)}
                          data-testid="button-dismiss-auto-detect"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-survey">No Survey Analyzed Yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Upload survey text and let AI extract boundaries, easements, encroachments, and improvements. The system will cross-reference findings against title exceptions.
            </p>
            <Button onClick={() => setAnalyzeDialogOpen(true)} data-testid="button-start-analysis">
              <Upload className="h-4 w-4 mr-2" />
              Start Survey Analysis
            </Button>
          </div>
        ) : (
          <>
            {activeSection === "overview" && <OverviewSection survey={surveyDetail} />}
            {activeSection === "boundaries" && <BoundariesSection boundaries={surveyDetail?.boundaries || []} />}
            {activeSection === "easements" && <EasementsSection easements={surveyDetail?.easements || []} />}
            {activeSection === "encroachments" && <EncroachmentsSection encroachments={surveyDetail?.encroachments || []} />}
            {activeSection === "improvements" && <ImprovementsSection improvements={surveyDetail?.improvements || []} />}
            {activeSection === "discrepancies" && (
              <DiscrepanciesSection
                discrepancies={surveyDetail?.discrepancies || []}
                onUpdateStatus={(id, status) => updateDiscrepancyMutation.mutate({ discrepancyId: id, data: { status } })}
              />
            )}
            {activeSection === "plat" && <PlatVisualSection survey={surveyDetail} />}
          </>
        )}
      </ScrollArea>

      <Dialog open={analyzeDialogOpen} onOpenChange={setAnalyzeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Survey Analysis</DialogTitle>
            <DialogDescription>Select a document from the data room, upload a survey PDF, or paste text below. AI will extract boundaries, easements, encroachments, improvements, and cross-reference against title exceptions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Commitment ID (optional)</Label>
              <Input
                placeholder="Link to a specific commitment..."
                value={commitmentIdForAnalysis}
                onChange={e => setCommitmentIdForAnalysis(e.target.value)}
                data-testid="input-analysis-commitment"
              />
            </div>

            {dataRoomDocs.length > 0 && (
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  Select from Data Room
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                    <SelectTrigger className="flex-1" data-testid="select-dataroom-doc">
                      <SelectValue placeholder="Choose a document..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dataRoomDocs.map(doc => (
                        <SelectItem key={doc.id} value={doc.id} data-testid={`select-doc-${doc.id}`}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{doc.fileName || "Untitled"}</span>
                            {doc.fileSize && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                ({(doc.fileSize / 1024).toFixed(0)} KB)
                              </span>
                            )}
                            {!doc.hasExtractedText && (
                              <Badge variant="outline" className="text-[10px] flex-shrink-0">No OCR</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => dataRoomAnalyzeMutation.mutate({ documentId: selectedDocId, commitmentId: commitmentIdForAnalysis || undefined })}
                    disabled={!selectedDocId || isAnyPending}
                    data-testid="button-analyze-dataroom-doc"
                  >
                    {dataRoomAnalyzeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Analyze
                  </Button>
                </div>
                {dataRoomAnalyzeMutation.isPending && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing data room document...
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or upload / paste</span>
              <div className="flex-1 border-t" />
            </div>

            <div>
              <Label className="text-xs">Upload Survey PDF</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                data-testid="input-survey-pdf"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) pdfUploadMutation.mutate(file);
                }}
                disabled={isAnyPending}
              />
              {pdfUploadMutation.isPending && (
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Extracting and analyzing PDF...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or paste text</span>
              <div className="flex-1 border-t" />
            </div>
            <div>
              <Label className="text-xs">Survey Text</Label>
              <Textarea
                placeholder="Paste full survey document text here..."
                value={surveyText}
                onChange={e => setSurveyText(e.target.value)}
                className="min-h-[200px]"
                data-testid="input-survey-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyzeDialogOpen(false)} data-testid="button-cancel-analysis">Cancel</Button>
            <Button
              onClick={() => analyzeMutation.mutate({ surveyText, commitmentId: commitmentIdForAnalysis || undefined })}
              disabled={!surveyText.trim() || isAnyPending}
              data-testid="button-run-analysis"
            >
              {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Analyze Text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewSection({ survey }: { survey?: SurveyWithDetails | null }) {
  if (!survey) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Survey Identification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Number:</span><span data-testid="text-survey-number">{survey.surveyNumber || "N/A"}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Company:</span><span data-testid="text-surveyor-company">{survey.surveyorCompany || "N/A"}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Surveyor:</span><span data-testid="text-surveyor-name">{survey.surveyorName || "N/A"}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">License:</span><span>{survey.surveyorLicense || "N/A"}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Certification:</span><span>{survey.certificationDate || "N/A"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Address:</span><span data-testid="text-property-address">{survey.propertyAddress || "N/A"}</span></div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Area:</span>
              <span data-testid="text-area">
                {survey.totalAreaSqft ? `${Number(survey.totalAreaSqft).toLocaleString()} sq ft` : "N/A"}
                {survey.totalAreaAcres ? ` (${survey.totalAreaAcres} acres)` : ""}
              </span>
            </div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Status:</span><Badge variant="outline" data-testid="badge-survey-status">{survey.status}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flood & Zoning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Flood Zone:</span><span data-testid="text-flood-zone">{survey.floodZone || "N/A"}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Map #:</span><span>{survey.floodMapNumber || "N/A"}</span></div>
          </CardContent>
        </Card>
      </div>

      {survey.legalDescription && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Legal Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-legal-description">{survey.legalDescription}</p>
          </CardContent>
        </Card>
      )}

      {survey.aiAnalysisSummary && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed" data-testid="text-ai-summary">{survey.aiAnalysisSummary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-boundary-count">{survey.boundaries?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Boundaries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-easement-count">{survey.easements?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Easements</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-encroachment-count">{survey.encroachments?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Encroachments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-improvement-count">{survey.improvements?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Improvements</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-discrepancy-count">{survey.discrepancies?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Discrepancies</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BoundariesSection({ boundaries }: { boundaries: SurveyBoundary[] }) {
  if (boundaries.length === 0) {
    return <EmptyState icon={Compass} title="No Boundaries" description="Run AI analysis to extract boundary data from the survey." />;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Boundary Lines ({boundaries.length})</h3>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">#</th>
              <th className="text-left p-2 font-medium">Direction</th>
              <th className="text-left p-2 font-medium">Bearing</th>
              <th className="text-right p-2 font-medium">Distance (ft)</th>
              <th className="text-left p-2 font-medium">Adjoins</th>
              <th className="text-left p-2 font-medium">Monument</th>
              <th className="text-center p-2 font-medium">Found</th>
            </tr>
          </thead>
          <tbody>
            {boundaries.map((b, idx) => (
              <tr key={b.id} className="border-t" data-testid={`row-boundary-${idx}`}>
                <td className="p-2 text-muted-foreground">{(b.orderIndex ?? idx) + 1}</td>
                <td className="p-2">{b.direction || "-"}</td>
                <td className="p-2 font-mono text-xs">{b.bearing || "-"}</td>
                <td className="p-2 text-right">{b.distanceFt ? Number(b.distanceFt).toFixed(2) : "-"}</td>
                <td className="p-2 text-muted-foreground">{b.adjoinsDescription || "-"}</td>
                <td className="p-2">{b.monumentType || "-"}</td>
                <td className="p-2 text-center">
                  {b.monumentFound ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EasementsSection({ easements }: { easements: SurveyEasement[] }) {
  if (easements.length === 0) {
    return <EmptyState icon={TreePine} title="No Easements" description="Run AI analysis to extract easement data from the survey." />;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Easements ({easements.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {easements.map((e, idx) => (
          <Card key={e.id} data-testid={`card-easement-${idx}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant="outline">{easementTypeLabels[e.easementType || ""] || e.easementType || "Unknown"}</Badge>
                <Badge className={matchStatusColors[e.matchStatus || "pending_review"]}>
                  {e.matchStatus === "matched" && e.matchedExceptionId
                    ? `Matches B-${e.matchedExceptionId.slice(-4).toUpperCase()}`
                    : matchStatusLabels[e.matchStatus || "pending_review"]}
                </Badge>
              </div>
              <p className="text-sm">{e.locationDescription || "No location specified"}</p>
              {e.holder && <div className="text-xs text-muted-foreground">Holder: {e.holder}</div>}
              {e.widthFt && <div className="text-xs text-muted-foreground">Width: {Number(e.widthFt).toFixed(1)} ft</div>}
              {e.recordingReference && <div className="text-xs text-muted-foreground">Rec: {e.recordingReference}</div>}
              {e.notes && <div className="text-xs italic text-muted-foreground">{e.notes}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EncroachmentsSection({ encroachments }: { encroachments: SurveyEncroachment[] }) {
  if (encroachments.length === 0) {
    return <EmptyState icon={AlertTriangle} title="No Encroachments" description="No encroachments were found in the survey analysis." />;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Encroachments ({encroachments.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {encroachments.map((e, idx) => (
          <Card key={e.id} data-testid={`card-encroachment-${idx}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge className={severityColors[e.severity || "minor"]}>
                  {(e.severity || "minor").charAt(0).toUpperCase() + (e.severity || "minor").slice(1)}
                </Badge>
                <Badge variant="outline">{e.status || "identified"}</Badge>
              </div>
              <p className="text-sm font-medium">{e.encroachingElement || "Unknown element"}</p>
              <p className="text-sm text-muted-foreground">{e.description || "No description"}</p>
              {e.encroachmentDistanceFt && (
                <div className="text-xs text-muted-foreground">
                  Distance: {Number(e.encroachmentDistanceFt).toFixed(1)} ft {e.encroachmentDirection ? `(${e.encroachmentDirection})` : ""}
                </div>
              )}
              {e.affectedBoundary && <div className="text-xs text-muted-foreground">Affected boundary: {e.affectedBoundary}</div>}
              {e.recommendedAction && (
                <div className="text-xs p-2 bg-muted rounded-md">
                  <span className="font-medium">Recommended:</span> {e.recommendedAction}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ImprovementsSection({ improvements }: { improvements: SurveyImprovement[] }) {
  if (improvements.length === 0) {
    return <EmptyState icon={Home} title="No Improvements" description="Run AI analysis to extract improvement data from the survey." />;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Improvements ({improvements.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {improvements.map((imp, idx) => (
          <Card key={imp.id} data-testid={`card-improvement-${idx}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium text-sm">{imp.improvementType || "Unknown"}</span>
                {imp.zoningCompliant !== null && (
                  <Badge className={imp.zoningCompliant ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                    {imp.zoningCompliant ? "Compliant" : "Non-Compliant"}
                  </Badge>
                )}
              </div>
              {imp.approxSqft && <div className="text-xs text-muted-foreground">{Number(imp.approxSqft).toLocaleString()} sq ft</div>}

              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex items-center justify-between p-1.5 bg-muted rounded-md">
                  <span className="text-muted-foreground">Front</span>
                  <span className="font-mono">{imp.setbackFrontFt ? `${Number(imp.setbackFrontFt).toFixed(1)}'` : "-"}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-muted rounded-md">
                  <span className="text-muted-foreground">Rear</span>
                  <span className="font-mono">{imp.setbackRearFt ? `${Number(imp.setbackRearFt).toFixed(1)}'` : "-"}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-muted rounded-md">
                  <span className="text-muted-foreground">Left</span>
                  <span className="font-mono">{imp.setbackLeftFt ? `${Number(imp.setbackLeftFt).toFixed(1)}'` : "-"}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-muted rounded-md">
                  <span className="text-muted-foreground">Right</span>
                  <span className="font-mono">{imp.setbackRightFt ? `${Number(imp.setbackRightFt).toFixed(1)}'` : "-"}</span>
                </div>
              </div>

              {imp.notes && <div className="text-xs italic text-muted-foreground">{imp.notes}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DiscrepanciesSection({
  discrepancies,
  onUpdateStatus,
}: {
  discrepancies: SurveyDiscrepancy[];
  onUpdateStatus: (id: string, status: string) => void;
}) {
  if (discrepancies.length === 0) {
    return <EmptyState icon={XCircle} title="No Discrepancies" description="No mismatches found between survey and title exceptions." />;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Discrepancies ({discrepancies.length})</h3>
      <div className="space-y-3">
        {discrepancies.map((d, idx) => (
          <Card key={d.id} data-testid={`card-discrepancy-${idx}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={severityColors[d.severity || "low"]}>
                    {(d.severity || "low").charAt(0).toUpperCase() + (d.severity || "low").slice(1)}
                  </Badge>
                  <Badge variant="outline">{discrepancyTypeLabels[d.discrepancyType || "other"] || d.discrepancyType}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{discrepancyStatusLabels[d.status || "identified"]}</Badge>
                  <Select
                    value={d.status || "identified"}
                    onValueChange={val => onUpdateStatus(d.id, val)}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs" data-testid={`select-discrepancy-status-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identified">Identified</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="accepted_risk">Accepted Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm">{d.issueDescription || "No description"}</p>
              {d.recommendedAction && (
                <div className="text-xs p-2 bg-muted rounded-md">
                  <span className="font-medium">AI Recommended Action:</span> {d.recommendedAction}
                </div>
              )}
              {d.resolutionNotes && (
                <div className="text-xs text-muted-foreground">Resolution: {d.resolutionNotes}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PlatVisualSection({ survey }: { survey?: SurveyWithDetails | null }) {
  const hasSourceDoc = !!(survey?.sourceDocumentId);

  if (!survey || (!hasSourceDoc && (!survey.boundaries || survey.boundaries.length === 0))) {
    return <EmptyState icon={Eye} title="No Plat Data" description="Run AI analysis to generate the plat visual from survey boundaries." />;
  }

  if (hasSourceDoc) {
    return <PlatImageViewer survey={survey} />;
  }
  return <PlatSvgDiagram survey={survey} />;
}

function PlatImageViewer({ survey }: { survey: SurveyWithDetails }) {
  const [zoom, setZoom] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragPanStart, setDragPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number }>({ w: 900, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const containerH = 600;

  const [showEasements, setShowEasements] = useState(true);
  const [showEncroachments, setShowEncroachments] = useState(true);
  const [showImprovements, setShowImprovements] = useState(true);
  const [showSetbacks, setShowSetbacks] = useState(true);

  const easements = survey.easements || [];
  const encroachments = survey.encroachments || [];
  const improvements = survey.improvements || [];

  useEffect(() => {
    let cancelled = false;
    async function renderPdf() {
      try {
        setPdfLoading(true);
        setPdfError(null);
        const resp = await fetch(`/api/data-room-documents/${survey.sourceDocumentId}/preview`, { credentials: "include" });
        if (!resp.ok) throw new Error("Failed to load document");
        const blob = await resp.blob();
        if (blob.type.startsWith("image/")) {
          const url = URL.createObjectURL(blob);
          if (!cancelled) {
            setPdfImageUrl(url);
            const img = new Image();
            img.onload = () => {
              if (!cancelled) {
                setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
                const cw = containerRef.current?.clientWidth || 800;
                const fitScale = Math.min(cw / img.naturalWidth, containerH / img.naturalHeight);
                setBaseScale(fitScale);
              }
            };
            img.src = url;
          }
          setPdfLoading(false);
          return;
        }
        const arrayBuffer = await blob.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const scale = 2.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/png");
        if (!cancelled) {
          setPdfImageUrl(dataUrl);
          setImgDimensions({ w: viewport.width, h: viewport.height });
          const cw = containerRef.current?.clientWidth || 800;
          const fitScale = Math.min(cw / viewport.width, containerH / viewport.height);
          setBaseScale(fitScale);
        }
      } catch (err) {
        if (!cancelled) setPdfError(err instanceof Error ? err.message : "Failed to render document");
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }
    if (survey.sourceDocumentId) renderPdf();
    return () => { cancelled = true; };
  }, [survey.sourceDocumentId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragPanStart({ x: panX, y: panY });
  }, [panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    setPanX(dragPanStart.x + (e.clientX - dragStart.x));
    setPanY(dragPanStart.y + (e.clientY - dragStart.y));
  }, [isDragging, dragStart, dragPanStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom(z => Math.min(Math.max(z + delta, 0.3), 5));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  if (pdfLoading) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Property Survey Document</h3>
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Rendering survey document...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pdfError || !pdfImageUrl) {
    if (survey.sourceDocumentId) {
      return (
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Property Survey Document</h3>
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] gap-4">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Survey document could not be loaded</p>
                <p className="text-xs text-muted-foreground">
                  {pdfError || "The source file may have been removed or is temporarily unavailable."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Try re-uploading the survey PDF to the Data Room, then re-run the analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return <PlatSvgDiagram survey={survey} />;
  }

  const overlayW = imgDimensions.w;
  const overlayH = imgDimensions.h;

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Property Survey Document</h3>

      <Card>
        <CardContent className="p-2">
          <div
            ref={containerRef}
            className="relative border rounded-md bg-muted/30 select-none"
            style={{ height: "600px", overflow: "hidden", cursor: isDragging ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            data-testid="plat-image-viewer"
          >
            <div className="absolute top-3 right-3 z-50 flex items-center gap-1 bg-background/90 backdrop-blur-sm border rounded-md p-1 shadow-sm">
              <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.min(z + 0.25, 5))} data-testid="button-zoom-in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.max(z - 0.25, 0.3))} data-testid="button-zoom-out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setZoom(1); setPanX(0); setPanY(0); }} data-testid="button-zoom-reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2 tabular-nums">{Math.round(baseScale * zoom * 100)}%</span>
            </div>
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${baseScale * zoom})`,
                transformOrigin: "0 0",
                position: "relative",
                display: "inline-block",
              }}
            >
              <img
                src={pdfImageUrl}
                alt="Survey document"
                style={{ display: "block", maxWidth: "none" }}
                draggable={false}
                data-testid="img-survey-document"
              />

              <svg
                width={overlayW}
                height={overlayH}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
                data-testid="svg-ai-overlay"
              >
                {showEasements && easements.map((e, i) => {
                  const yPos = overlayH * 0.15 + i * (overlayH * 0.06);
                  const xStart = overlayW * 0.05;
                  const xEnd = overlayW * 0.95;
                  const widthPx = e.widthFt ? Math.max(Number(e.widthFt) * 2, 20) : 20;
                  return (
                    <g key={`ov-easement-${i}`}>
                      <rect x={xStart} y={yPos - widthPx / 2} width={xEnd - xStart} height={widthPx}
                        fill="rgba(234, 179, 8, 0.15)" stroke="rgba(234, 179, 8, 0.8)" strokeWidth={2} strokeDasharray="8 4" rx={2} />
                      <rect x={xStart + 4} y={yPos - widthPx / 2 - 20} width="auto" height={18} fill="rgba(234, 179, 8, 0.9)" rx={3} style={{ width: "auto" }} />
                      <text x={xStart + 8} y={yPos - widthPx / 2 - 6} fontSize={12} fontWeight="600" fill="#fff" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                        {easementTypeLabels[e.easementType || ""] || "Easement"}: {e.locationDescription || `#${i + 1}`}
                      </text>
                    </g>
                  );
                })}

                {showEncroachments && encroachments.map((enc, i) => {
                  const cx = overlayW * (0.3 + (i % 3) * 0.2);
                  const cy = overlayH * (0.5 + Math.floor(i / 3) * 0.15);
                  const r = 35;
                  return (
                    <g key={`ov-encr-${i}`}>
                      <circle cx={cx} cy={cy} r={r} fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.8)" strokeWidth={3} strokeDasharray="6 3" />
                      <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="rgba(239, 68, 68, 0.4)" strokeWidth={1} strokeDasharray="4 4" />
                      <text x={cx} y={cy - r - 8} fontSize={11} fontWeight="600" fill="rgba(239, 68, 68, 1)" textAnchor="middle" style={{ textShadow: "0 0 4px rgba(255,255,255,0.9)" }}>
                        {enc.encroachingElement || "Encroachment"}
                      </text>
                      {enc.encroachmentDistanceFt && (
                        <text x={cx} y={cy + 4} fontSize={10} fill="rgba(239, 68, 68, 0.9)" textAnchor="middle" style={{ textShadow: "0 0 4px rgba(255,255,255,0.9)" }}>
                          {enc.encroachmentDistanceFt}ft
                        </text>
                      )}
                    </g>
                  );
                })}

                {showImprovements && improvements.map((imp, i) => {
                  const iw = overlayW * 0.18;
                  const ih = overlayH * 0.12;
                  const ix = overlayW * 0.3 + (i % 3) * (iw + 20);
                  const iy = overlayH * 0.4 + Math.floor(i / 3) * (ih + 20);
                  return (
                    <g key={`ov-impr-${i}`}>
                      <rect x={ix} y={iy} width={iw} height={ih} fill="rgba(59, 130, 246, 0.12)" stroke="rgba(59, 130, 246, 0.7)" strokeWidth={2} rx={4} />
                      <text x={ix + iw / 2} y={iy - 6} fontSize={11} fontWeight="600" fill="rgba(59, 130, 246, 1)" textAnchor="middle" style={{ textShadow: "0 0 4px rgba(255,255,255,0.9)" }}>
                        {imp.improvementType || "Structure"}
                      </text>
                      {imp.approxSqft && (
                        <text x={ix + iw / 2} y={iy + ih / 2 + 4} fontSize={10} fill="rgba(59, 130, 246, 0.8)" textAnchor="middle" style={{ textShadow: "0 0 4px rgba(255,255,255,0.9)" }}>
                          ~{Number(imp.approxSqft).toLocaleString()} sqft
                        </text>
                      )}
                    </g>
                  );
                })}

                {showSetbacks && improvements.map((imp, impIdx) => {
                  const setbacks = [
                    { val: imp.setbackFrontFt, label: "Front Setback", y: overlayH * 0.08, horizontal: true },
                    { val: imp.setbackRearFt, label: "Rear Setback", y: overlayH * 0.92, horizontal: true },
                    { val: imp.setbackLeftFt, label: "Left Setback", x: overlayW * 0.04, horizontal: false },
                    { val: imp.setbackRightFt, label: "Right Setback", x: overlayW * 0.96, horizontal: false },
                  ];
                  return setbacks.map((sb, sbIdx) => {
                    if (!sb.val || Number(sb.val) <= 0) return null;
                    if (sb.horizontal) {
                      return (
                        <g key={`ov-setback-${impIdx}-${sbIdx}`}>
                          <line x1={overlayW * 0.05} y1={sb.y!} x2={overlayW * 0.95} y2={sb.y!}
                            stroke="rgba(34, 197, 94, 0.7)" strokeWidth={2} strokeDasharray="10 5" />
                          <text x={overlayW * 0.5} y={sb.y! - 6} fontSize={11} fontWeight="600" fill="rgba(34, 197, 94, 1)" textAnchor="middle" style={{ textShadow: "0 0 4px rgba(255,255,255,0.9)" }}>
                            {sb.label}: {sb.val}ft
                          </text>
                        </g>
                      );
                    }
                    return (
                      <g key={`ov-setback-${impIdx}-${sbIdx}`}>
                        <line x1={sb.x!} y1={overlayH * 0.05} x2={sb.x!} y2={overlayH * 0.95}
                          stroke="rgba(34, 197, 94, 0.7)" strokeWidth={2} strokeDasharray="10 5" />
                        <text x={sb.x!} y={overlayH * 0.03} fontSize={11} fontWeight="600" fill="rgba(34, 197, 94, 1)" textAnchor="middle" style={{ textShadow: "0 0 4px rgba(255,255,255,0.9)" }}>
                          {sb.label}: {sb.val}ft
                        </text>
                      </g>
                    );
                  });
                })}
              </svg>
            </div>

            <div className="absolute bottom-3 right-3 bg-background/95 border rounded-md p-3 shadow-md" style={{ zIndex: 10 }} data-testid="overlay-legend">
              <p className="text-xs font-semibold mb-2">AI Overlay</p>
              <div className="space-y-1.5">
                {easements.length > 0 && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer" data-testid="toggle-easements">
                    <input type="checkbox" checked={showEasements} onChange={e => setShowEasements(e.target.checked)} className="rounded" />
                    <span className="inline-block w-3 h-0.5 bg-yellow-500" style={{ borderBottom: "2px dashed" }} />
                    <span>Easements ({easements.length})</span>
                  </label>
                )}
                {encroachments.length > 0 && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer" data-testid="toggle-encroachments">
                    <input type="checkbox" checked={showEncroachments} onChange={e => setShowEncroachments(e.target.checked)} className="rounded" />
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-red-500" />
                    <span>Encroachments ({encroachments.length})</span>
                  </label>
                )}
                {improvements.length > 0 && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer" data-testid="toggle-improvements">
                    <input type="checkbox" checked={showImprovements} onChange={e => setShowImprovements(e.target.checked)} className="rounded" />
                    <span className="inline-block w-3 h-3 border-2 border-blue-500 bg-blue-500/20 rounded-sm" />
                    <span>Improvements ({improvements.length})</span>
                  </label>
                )}
                {improvements.some(i => i.setbackFrontFt || i.setbackRearFt || i.setbackLeftFt || i.setbackRightFt) && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer" data-testid="toggle-setbacks">
                    <input type="checkbox" checked={showSetbacks} onChange={e => setShowSetbacks(e.target.checked)} className="rounded" />
                    <span className="inline-block w-3 h-0.5 bg-green-500" style={{ borderBottom: "2px dashed" }} />
                    <span>Setback Lines</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlatSvgDiagram({ survey }: { survey: SurveyWithDetails }) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragPanStart, setDragPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragPanStart({ x: panX, y: panY });
  }, [panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const dx = (e.clientX - dragStart.x) / zoom;
    const dy = (e.clientY - dragStart.y) / zoom;
    setPanX(dragPanStart.x + dx);
    setPanY(dragPanStart.y + dy);
  }, [isDragging, dragStart, dragPanStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(Math.max(z + delta, 0.4), 3));
  }, []);

  if (!survey.boundaries || survey.boundaries.length === 0) {
    return <EmptyState icon={Eye} title="No Plat Data" description="Run AI analysis to generate the plat visual from survey boundaries." />;
  }

  const boundaries = survey.boundaries;
  const easements = survey.easements || [];
  const encroachments = survey.encroachments || [];
  const improvements = survey.improvements || [];

  const svgWidth = 700;
  const svgHeight = 500;
  const padding = 60;

  const points: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  let cx = 0, cy = 0;

  for (const b of boundaries) {
    const dist = b.distanceFt ? Number(b.distanceFt) : 50;
    const dir = (b.direction || "").toLowerCase();
    let angle = 0;
    if (dir.includes("north") || dir === "n") angle = -90;
    else if (dir.includes("south") || dir === "s") angle = 90;
    else if (dir.includes("east") || dir === "e") angle = 0;
    else if (dir.includes("west") || dir === "w") angle = 180;
    else if (dir === "ne" || dir.includes("northeast")) angle = -45;
    else if (dir === "nw" || dir.includes("northwest")) angle = -135;
    else if (dir === "se" || dir.includes("southeast")) angle = 45;
    else if (dir === "sw" || dir.includes("southwest")) angle = 135;

    if (b.bearing) {
      const bearingMatch = b.bearing.match(/[NS]\s*(\d+)/i);
      if (bearingMatch) {
        const degrees = parseInt(bearingMatch[1]);
        const isNorth = b.bearing.toUpperCase().startsWith("N");
        const isEast = b.bearing.toUpperCase().includes("E");
        if (isNorth && isEast) angle = -90 + degrees;
        else if (isNorth && !isEast) angle = -90 - degrees;
        else if (!isNorth && isEast) angle = 90 - degrees;
        else angle = 90 + degrees;
      }
    }

    const rad = (angle * Math.PI) / 180;
    cx += Math.cos(rad) * dist;
    cy += Math.sin(rad) * dist;
    points.push({ x: cx, y: cy });
  }

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  const dataW = maxX - minX || 100;
  const dataH = maxY - minY || 100;
  const drawW = svgWidth - 2 * padding;
  const drawH = svgHeight - 2 * padding;
  const scale = Math.min(drawW / dataW, drawH / dataH);

  const toSvg = (pt: { x: number; y: number }) => ({
    x: padding + (pt.x - minX) * scale + (drawW - dataW * scale) / 2,
    y: padding + (pt.y - minY) * scale + (drawH - dataH * scale) / 2,
  });

  const svgPoints = points.map(toSvg);
  const pathData = svgPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

  const centerX = svgPoints.reduce((s, p) => s + p.x, 0) / svgPoints.length;
  const centerY = svgPoints.reduce((s, p) => s + p.y, 0) / svgPoints.length;

  const setbackLines: Array<{ x1: number; y1: number; x2: number; y2: number; label: string }> = [];
  for (const imp of improvements) {
    const setbacks = [
      { val: imp.setbackFrontFt, side: "front", dir: "top" },
      { val: imp.setbackRearFt, side: "rear", dir: "bottom" },
      { val: imp.setbackLeftFt, side: "left", dir: "left" },
      { val: imp.setbackRightFt, side: "right", dir: "right" },
    ];
    for (const sb of setbacks) {
      if (!sb.val || Number(sb.val) <= 0) continue;
      const offset = Number(sb.val) * scale * 0.3;
      if (sb.dir === "top") {
        const yLine = centerY - 20 / zoom - offset / zoom;
        setbackLines.push({ x1: svgPoints[0]?.x || padding, y1: yLine, x2: svgPoints[1]?.x || svgWidth - padding, y2: yLine, label: `${sb.val}' ${sb.side}` });
      } else if (sb.dir === "bottom") {
        const yLine = centerY + 20 / zoom + offset / zoom;
        setbackLines.push({ x1: svgPoints[0]?.x || padding, y1: yLine, x2: svgPoints[1]?.x || svgWidth - padding, y2: yLine, label: `${sb.val}' ${sb.side}` });
      } else if (sb.dir === "left") {
        const xLine = centerX - 25 / zoom - offset / zoom;
        setbackLines.push({ x1: xLine, y1: svgPoints[0]?.y || padding, x2: xLine, y2: svgPoints[svgPoints.length - 2]?.y || svgHeight - padding, label: `${sb.val}' ${sb.side}` });
      } else if (sb.dir === "right") {
        const xLine = centerX + 25 / zoom + offset / zoom;
        setbackLines.push({ x1: xLine, y1: svgPoints[0]?.y || padding, x2: xLine, y2: svgPoints[svgPoints.length - 2]?.y || svgHeight - padding, label: `${sb.val}' ${sb.side}` });
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-medium text-sm">Property Plat Visualization</h3>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.min(z + 0.2, 3))} data-testid="button-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} data-testid="button-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setZoom(1); setPanX(0); setPanY(0); }} data-testid="button-zoom-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-2 overflow-auto">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            viewBox={`${-panX} ${-panY} ${svgWidth / zoom} ${svgHeight / zoom}`}
            className="w-full h-auto border rounded-md bg-background select-none"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
            data-testid="svg-plat-visual"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <path d={pathData} fill="hsl(var(--primary) / 0.05)" stroke="hsl(var(--foreground))" strokeWidth={2 / zoom} />

            {svgPoints.map((p, i) => (
              <g key={`monument-${i}`}>
                <circle cx={p.x} cy={p.y} r={4 / zoom} fill="hsl(142 76% 36%)" stroke="hsl(var(--foreground))" strokeWidth={1 / zoom} />
                {boundaries[i] && (
                  <text x={p.x + 6 / zoom} y={p.y - 6 / zoom} fontSize={9 / zoom} fill="hsl(var(--muted-foreground))">
                    {boundaries[i]?.monumentType || `Pt ${i + 1}`}
                  </text>
                )}
              </g>
            ))}

            {svgPoints.slice(0, -1).map((p, i) => {
              const next = svgPoints[i + 1];
              const midX = (p.x + next.x) / 2;
              const midY = (p.y + next.y) / 2;
              const b = boundaries[i];
              if (!b) return null;
              return (
                <text key={`label-${i}`} x={midX} y={midY - 4 / zoom} fontSize={8 / zoom} fill="hsl(var(--foreground))" textAnchor="middle">
                  {b.distanceFt ? `${Number(b.distanceFt).toFixed(1)}'` : ""}
                </text>
              );
            })}

            {setbackLines.map((sl, i) => (
              <g key={`setback-${i}`}>
                <line x1={sl.x1} y1={sl.y1} x2={sl.x2} y2={sl.y2}
                  stroke="hsl(142 71% 45%)" strokeWidth={1.5 / zoom} strokeDasharray={`${6 / zoom} ${3 / zoom}`} opacity={0.7} />
                <text x={(sl.x1 + sl.x2) / 2} y={(sl.y1 + sl.y2) / 2 - 3 / zoom} fontSize={7 / zoom} fill="hsl(142 71% 45%)" textAnchor="middle">
                  {sl.label}
                </text>
              </g>
            ))}

            {easements.map((e, i) => {
              const offset = 15 + i * 8;
              const ePt1 = { x: svgPoints[0].x, y: svgPoints[0].y + offset / zoom };
              const ePt2 = { x: svgPoints[1]?.x || svgPoints[0].x + 50, y: svgPoints[0].y + offset / zoom };
              return (
                <g key={`easement-${i}`}>
                  <line x1={ePt1.x} y1={ePt1.y} x2={ePt2.x} y2={ePt2.y}
                    stroke="hsl(45 93% 47%)" strokeWidth={2 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} />
                  <text x={ePt1.x} y={ePt1.y - 2 / zoom} fontSize={7 / zoom} fill="hsl(45 93% 47%)">
                    {easementTypeLabels[e.easementType || ""] || "Easement"}
                  </text>
                </g>
              );
            })}

            {encroachments.map((enc, i) => {
              const ox = centerX + (i * 15) / zoom;
              const oy = centerY + (i * 15) / zoom;
              return (
                <g key={`encr-${i}`}>
                  <circle cx={ox} cy={oy} r={8 / zoom} fill="none" stroke="hsl(0 84% 60%)" strokeWidth={2 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} />
                  <text x={ox + 10 / zoom} y={oy + 3 / zoom} fontSize={7 / zoom} fill="hsl(0 84% 60%)">
                    {enc.encroachingElement || "Encr."}
                  </text>
                </g>
              );
            })}

            {improvements.map((imp, i) => {
              const iw = 40 / zoom;
              const ih = 30 / zoom;
              const ix = centerX - iw / 2 + (i * 20 - improvements.length * 10) / zoom;
              const iy = centerY - ih / 2;
              return (
                <g key={`impr-${i}`}>
                  <rect x={ix} y={iy} width={iw} height={ih} fill="hsl(217 91% 60% / 0.2)" stroke="hsl(217 91% 60%)" strokeWidth={1.5 / zoom} rx={2 / zoom} />
                  <text x={ix + iw / 2} y={iy + ih / 2 + 3 / zoom} fontSize={6 / zoom} fill="hsl(217 91% 60%)" textAnchor="middle">
                    {(imp.improvementType || "Bldg").substring(0, 8)}
                  </text>
                </g>
              );
            })}

            <g transform={`translate(${svgWidth / zoom - 150 / zoom}, ${svgHeight / zoom - 115 / zoom})`}>
              <rect width={140 / zoom} height={105 / zoom} fill="hsl(var(--background) / 0.9)" stroke="hsl(var(--border))" strokeWidth={1 / zoom} rx={3 / zoom} />
              <text x={8 / zoom} y={12 / zoom} fontSize={8 / zoom} fill="hsl(var(--foreground))" fontWeight="bold">Legend</text>
              <line x1={8 / zoom} y1={22 / zoom} x2={24 / zoom} y2={22 / zoom} stroke="hsl(var(--foreground))" strokeWidth={2 / zoom} />
              <text x={28 / zoom} y={25 / zoom} fontSize={7 / zoom} fill="hsl(var(--muted-foreground))">Property Line</text>
              <circle cx={12 / zoom} cy={35 / zoom} r={3 / zoom} fill="hsl(142 76% 36%)" />
              <text x={28 / zoom} y={38 / zoom} fontSize={7 / zoom} fill="hsl(var(--muted-foreground))">Monument</text>
              <line x1={8 / zoom} y1={48 / zoom} x2={24 / zoom} y2={48 / zoom} stroke="hsl(45 93% 47%)" strokeWidth={2 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} />
              <text x={28 / zoom} y={51 / zoom} fontSize={7 / zoom} fill="hsl(var(--muted-foreground))">Easement</text>
              <circle cx={12 / zoom} cy={61 / zoom} r={4 / zoom} fill="none" stroke="hsl(0 84% 60%)" strokeWidth={1 / zoom} strokeDasharray={`${2 / zoom} ${1 / zoom}`} />
              <text x={28 / zoom} y={64 / zoom} fontSize={7 / zoom} fill="hsl(var(--muted-foreground))">Encroachment</text>
              <rect x={8 / zoom} y={72 / zoom} width={12 / zoom} height={8 / zoom} fill="hsl(217 91% 60% / 0.2)" stroke="hsl(217 91% 60%)" strokeWidth={1 / zoom} />
              <text x={28 / zoom} y={79 / zoom} fontSize={7 / zoom} fill="hsl(var(--muted-foreground))">Improvement</text>
              <line x1={8 / zoom} y1={88 / zoom} x2={24 / zoom} y2={88 / zoom} stroke="hsl(142 71% 45%)" strokeWidth={1.5 / zoom} strokeDasharray={`${4 / zoom} ${2 / zoom}`} />
              <text x={28 / zoom} y={91 / zoom} fontSize={7 / zoom} fill="hsl(var(--muted-foreground))">Setback Line</text>
            </g>
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof MapPin; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground mb-3" />
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
