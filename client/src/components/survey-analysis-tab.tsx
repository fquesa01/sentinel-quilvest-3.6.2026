import { useState, useRef, useCallback } from "react";
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

export function SurveyAnalysisTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [surveyText, setSurveyText] = useState("");
  const [commitmentIdForAnalysis, setCommitmentIdForAnalysis] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/deals", dealId, "title", "survey"],
  });

  const activeSurveyId = surveys.length > 0 ? surveys[0].id : null;

  const { data: surveyDetail } = useQuery<SurveyWithDetails>({
    queryKey: ["/api/deals", dealId, "title", "survey", activeSurveyId],
    enabled: !!activeSurveyId,
  });

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
            <DialogDescription>Upload a survey PDF or paste the survey text below. AI will extract boundaries, easements, encroachments, improvements, and cross-reference against title exceptions.</DialogDescription>
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
                disabled={pdfUploadMutation.isPending || analyzeMutation.isPending}
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
              disabled={!surveyText.trim() || analyzeMutation.isPending || pdfUploadMutation.isPending}
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

  if (!survey || !survey.boundaries || survey.boundaries.length === 0) {
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
