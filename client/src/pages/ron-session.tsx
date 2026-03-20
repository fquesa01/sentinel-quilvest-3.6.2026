import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/ron-signature-pad";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Play, Pause, Square, Users, FileText, Video,
  CheckCircle2, XCircle, AlertTriangle, Clock, Shield, Pen,
  Stamp, Loader2, Timer, Eye, ChevronRight, ChevronLeft,
  User, MonitorSmartphone, Circle, Fingerprint, MapPin,
  ShieldAlert, ShieldCheck, VideoOff, Mic, MicOff, Camera, CameraOff
} from "lucide-react";
import type { RonSession, RonTransaction, RonNotary, RonSigner, RonDocument, RonAnnotationPlacement, RonSignature, RonSeal, RonJournalEntry, RonVideoRoom, RonRecording, RonFraudDetection } from "@shared/schema";

type EnrichedDocument = RonDocument & {
  annotations: RonAnnotationPlacement[];
  signatures: RonSignature[];
  seals: RonSeal[];
};

type FraudSummary = {
  overallScore: number;
  severity: "low" | "medium" | "high" | "critical";
  totalDetections: number;
  unacknowledged: number;
  detections: RonFraudDetection[];
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
};

type SessionDetail = {
  session: RonSession;
  transaction: RonTransaction;
  notary: RonNotary | null;
  signers: RonSigner[];
  documents: EnrichedDocument[];
  journal: RonJournalEntry[];
  videoRoom: RonVideoRoom | null;
  recordings: RonRecording[];
  fraudSummary: FraudSummary;
};

type ChecklistData = {
  sessionId: string;
  sessionStatus: string;
  canStart: boolean;
  checks: {
    signers: Array<{
      signerId: string;
      signerName: string;
      email: string;
      idvStatus: string;
      credentialVerified: boolean;
      kbaPassed: boolean;
      kbaScore: number | null;
      ofacCleared: boolean;
      livenessPassed: boolean;
      overallReady: boolean;
    }>;
    allSignersVerified: boolean;
    documentsReady: boolean;
    notaryReady: boolean;
    notaryName: string | null;
    hasDocuments: boolean;
    hasSigners: boolean;
    documentCount: number;
    signerCount: number;
  };
};

const sessionStatusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400",
  lobby: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-green-500/20 text-green-400",
  paused: "bg-orange-500/20 text-orange-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  failed: "bg-red-500/20 text-red-400",
};

const docStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  uploaded: "secondary",
  preparing: "secondary",
  ready: "default",
  in_signing: "default",
  partially_signed: "default",
  fully_signed: "default",
  notarized: "default",
};

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RonSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("checklist");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [signPadOpen, setSignPadOpen] = useState(false);
  const [signPadMode, setSignPadMode] = useState<"signature" | "initial">("signature");
  const [signPadTarget, setSignPadTarget] = useState<{ signerId: string; annotationId?: string; docId: string; pageNumber: number; x: number; y: number } | null>(null);
  const [sealConfirmOpen, setSealConfirmOpen] = useState(false);
  const [sealTarget, setSealTarget] = useState<{ docId: string; pageNumber: number } | null>(null);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<Record<string, string>>({});

  const { data: detail, isLoading } = useQuery<SessionDetail>({
    queryKey: ["/api/ron/sessions", id, "detail"],
    refetchInterval: 5000,
  });

  const { data: checklist, refetch: refetchChecklist } = useQuery<ChecklistData>({
    queryKey: ["/api/ron/sessions", id, "checklist"],
    enabled: !!id,
  });

  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [consentSignerId, setConsentSignerId] = useState<string | null>(null);

  const session = detail?.session;
  const transaction = detail?.transaction;
  const notary = detail?.notary ?? null;
  const signers = detail?.signers || [];
  const documents = detail?.documents || [];
  const journal = detail?.journal || [];
  const videoRoom = detail?.videoRoom || null;
  const recordings = detail?.recordings || [];
  const fraudSummary = detail?.fraudSummary || null;

  useEffect(() => {
    if (session?.status === "in_progress" && session.actualStart) {
      const startTime = new Date(session.actualStart).getTime();
      const update = () => setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      update();
      timerRef.current = setInterval(update, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.status, session?.actualStart]);

  useEffect(() => {
    if (session?.status === "in_progress") setActiveTab("documents");
    else if (session?.status === "completed") setActiveTab("journal");
  }, [session?.status]);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/sessions/${id}/start`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/sessions", id, "detail"] });
      toast({ title: "Session Started", description: "The notarization session is now in progress." });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/sessions/${id}/pause`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/sessions", id, "detail"] });
      if (timerRef.current) clearInterval(timerRef.current);
      toast({ title: "Session Paused" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/sessions/${id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/sessions", id, "detail"] });
      if (timerRef.current) clearInterval(timerRef.current);
      setCompleteConfirmOpen(false);
      toast({ title: "Session Completed", description: "The notarization session has been finalized." });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const signMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/ron/signatures`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/sessions", id, "detail"] });
      setSignPadOpen(false);
      setSignPadTarget(null);
      toast({ title: "Signature Applied" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const sealMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/ron/seals`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/sessions", id, "detail"] });
      setSealConfirmOpen(false);
      setSealTarget(null);
      toast({ title: "Notary Seal Applied" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const handleSignatureClick = useCallback((ann: RonAnnotationPlacement, doc: EnrichedDocument) => {
    if (ann.completed) return;
    if (!ann.signerId) return;
    setSignPadTarget({
      signerId: ann.signerId,
      annotationId: ann.id,
      docId: doc.id,
      pageNumber: ann.pageNumber,
      x: parseFloat(String(ann.xPosition)),
      y: parseFloat(String(ann.yPosition)),
    });
    setSignPadMode(ann.annotationType === "initial" ? "initial" : "signature");

    if (savedSignatures[ann.signerId]) {
      signMutation.mutate({
        signerId: ann.signerId,
        documentId: doc.id,
        annotationId: ann.id,
        sessionId: id,
        signatureType: ann.annotationType === "initial" ? "initial" : "signature",
        signatureData: savedSignatures[ann.signerId],
        pageNumber: ann.pageNumber,
        xPosition: parseFloat(String(ann.xPosition)),
        yPosition: parseFloat(String(ann.yPosition)),
      });
    } else {
      setSignPadOpen(true);
    }
  }, [savedSignatures, id, signMutation]);

  const handleSealClick = useCallback((doc: EnrichedDocument, pageNumber: number) => {
    setSealTarget({ docId: doc.id, pageNumber });
    setSealConfirmOpen(true);
  }, []);

  const handleSignatureSave = useCallback((dataUrl: string) => {
    if (!signPadTarget) return;
    setSavedSignatures(prev => ({ ...prev, [signPadTarget.signerId]: dataUrl }));
    signMutation.mutate({
      signerId: signPadTarget.signerId,
      documentId: signPadTarget.docId,
      annotationId: signPadTarget.annotationId,
      sessionId: id,
      signatureType: signPadMode,
      signatureData: dataUrl,
      pageNumber: signPadTarget.pageNumber,
      xPosition: signPadTarget.x,
      yPosition: signPadTarget.y,
    });
  }, [signPadTarget, signPadMode, id, signMutation]);

  const consentMutation = useMutation({
    mutationFn: async ({ signerId, consentType }: { signerId: string; consentType: string }) => {
      const res = await apiRequest("POST", `/api/ron/signers/${signerId}/consent`, { consentType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/sessions", id, "detail"] });
      setConsentDialogOpen(false);
      setConsentAgreed(false);
      setConsentSignerId(null);
      toast({ title: "Consent Recorded", description: "Recording consent has been captured." });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const fraudAnalysisMutation = useMutation({
    mutationFn: async (signerId?: string) => {
      const res = await apiRequest("POST", `/api/ron/sessions/${id}/fraud-analysis`, {
        signerId,
        frameTimestamp: Math.floor(Date.now() / 1000),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/sessions", id, "detail"] });
    },
  });

  const handleSealConfirm = useCallback(() => {
    if (!sealTarget || !notary) return;
    sealMutation.mutate({
      notaryId: notary.id,
      documentId: sealTarget.docId,
      sessionId: id,
      pageNumber: sealTarget.pageNumber,
      xPosition: 50,
      yPosition: 50,
    });
  }, [sealTarget, notary, id, sealMutation]);

  const handleConsentSubmit = useCallback((signerId: string) => {
    consentMutation.mutate({ signerId, consentType: "clickthrough" });
  }, [consentMutation]);

  useEffect(() => {
    if (session?.status === "in_progress" && !fraudAnalysisMutation.isPending) {
      const interval = setInterval(() => {
        if (signers.length > 0) {
          fraudAnalysisMutation.mutate(signers[0].id);
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.status, signers.length]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session || !transaction) {
    return (
      <div className="p-6">
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Session not found</CardContent></Card>
      </div>
    );
  }

  const currentDoc = documents[selectedDocIndex];
  const isActive = session.status === "in_progress";
  const isPaused = session.status === "paused";
  const isCompleted = session.status === "completed";
  const allDocsSigned = documents.length > 0 && documents.every(d => ["fully_signed", "notarized"].includes(d.status));
  const allDocsNotarized = documents.length > 0 && documents.every(d => d.status === "notarized");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b flex-wrap">
        <Link href={`/ron/transactions/${transaction.id}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-to-transaction">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate" data-testid="text-session-title">{transaction.title}</h1>
          <p className="text-sm text-muted-foreground">
            {notary ? `Notary: ${notary.firstName} ${notary.lastName}` : "No notary assigned"}
          </p>
        </div>
        <Badge className={sessionStatusColors[session.status] || ""} data-testid="badge-session-status">
          {session.status.replace(/_/g, " ")}
        </Badge>
        {(isActive || isPaused) && (
          <div className="flex items-center gap-1 font-mono text-lg" data-testid="text-session-timer">
            <Timer className="h-5 w-5" />
            {formatTimer(elapsedSeconds)}
          </div>
        )}
        {isCompleted && session.durationSeconds && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-session-duration">
            <Clock className="h-4 w-4" />
            {Math.round(session.durationSeconds / 60)} min
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-3 border-b flex-wrap">
        {session.status === "scheduled" && (
          <Button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending || !(checklist?.canStart)}
            data-testid="button-start-session"
          >
            {startMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Start Session
          </Button>
        )}
        {isPaused && (
          <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} data-testid="button-resume-session">
            <Play className="h-4 w-4 mr-2" /> Resume
          </Button>
        )}
        {isActive && (
          <>
            <Button variant="outline" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending} data-testid="button-pause-session">
              <Pause className="h-4 w-4 mr-2" /> Pause
            </Button>
            <Button
              variant="destructive"
              onClick={() => setCompleteConfirmOpen(true)}
              disabled={completeMutation.isPending}
              data-testid="button-complete-session"
            >
              <Square className="h-4 w-4 mr-2" /> End Session
            </Button>
          </>
        )}
        {isCompleted && (
          <Badge className="bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Session Complete
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-64 border-r flex-shrink-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="w-full justify-start rounded-none border-b px-2">
              <TabsTrigger value="checklist" className="text-xs" data-testid="tab-checklist">Checklist</TabsTrigger>
              <TabsTrigger value="participants" className="text-xs" data-testid="tab-participants">People</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs" data-testid="tab-documents">Docs</TabsTrigger>
              <TabsTrigger value="journal" className="text-xs" data-testid="tab-journal">Journal</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="checklist" className="p-3 mt-0 space-y-3">
                <ChecklistPanel checklist={checklist} />
              </TabsContent>

              <TabsContent value="participants" className="p-3 mt-0 space-y-3">
                <ParticipantsPanel notary={notary} signers={signers} session={session} onRequestConsent={(signerId) => { setConsentSignerId(signerId); setConsentDialogOpen(true); }} />
              </TabsContent>

              <TabsContent value="documents" className="p-3 mt-0 space-y-2">
                {documents.map((doc, i) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocIndex(i)}
                    className={`w-full text-left p-2 rounded-md text-sm hover-elevate ${i === selectedDocIndex ? "bg-accent" : ""}`}
                    data-testid={`button-select-doc-${doc.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate flex-1">{doc.title}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <Badge variant={docStatusColors[doc.status] || "default"} className="text-[10px]">
                        {doc.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {doc.annotations.filter(a => a.completed).length}/{doc.annotations.length} signed
                      </span>
                    </div>
                  </button>
                ))}
              </TabsContent>

              <TabsContent value="journal" className="p-3 mt-0 space-y-2">
                {journal.map((entry) => (
                  <div key={entry.id} className="text-xs border-l-2 border-muted pl-2 py-1" data-testid={`journal-entry-${entry.id}`}>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                      {entry.actorName && ` — ${entry.actorName}`}
                    </p>
                  </div>
                ))}
                {journal.length === 0 && <p className="text-xs text-muted-foreground">No journal entries yet</p>}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {currentDoc ? (
            <DocumentViewer
              doc={currentDoc}
              isActive={isActive}
              signers={signers}
              notary={notary}
              onSignatureClick={handleSignatureClick}
              onSealClick={handleSealClick}
              onPrev={() => setSelectedDocIndex(Math.max(0, selectedDocIndex - 1))}
              onNext={() => setSelectedDocIndex(Math.min(documents.length - 1, selectedDocIndex + 1))}
              currentIndex={selectedDocIndex}
              totalDocs={documents.length}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No documents in this session</p>
              </div>
            </div>
          )}

          <div className="border-t p-3">
            <VideoSessionPanel
              session={session}
              videoRoom={videoRoom}
              recordings={recordings}
              fraudSummary={fraudSummary}
              signers={signers}
              sessionId={id || ""}
              onRequestConsent={(signerId) => {
                setConsentSignerId(signerId);
                setConsentDialogOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      <Dialog open={signPadOpen} onOpenChange={setSignPadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {signPadMode === "initial" ? "Draw Your Initials" : "Draw Your Signature"}
            </DialogTitle>
            <DialogDescription>
              This will be applied to the document at the selected annotation field.
            </DialogDescription>
          </DialogHeader>
          <SignaturePad
            title={signPadMode === "initial" ? "Draw Initials" : "Draw Signature"}
            onSave={handleSignatureSave}
            onCancel={() => { setSignPadOpen(false); setSignPadTarget(null); }}
            savedSignature={signPadTarget ? savedSignatures[signPadTarget.signerId] : null}
            width={380}
            height={120}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={sealConfirmOpen} onOpenChange={setSealConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Notary Seal</DialogTitle>
            <DialogDescription>
              This action applies the official notary seal to the document. This is a legally binding action.
            </DialogDescription>
          </DialogHeader>
          {notary && (
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Notary</span><span>{notary.firstName} {notary.lastName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">State</span><span>{notary.commissionState}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commission #</span><span>{notary.commissionNumber || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span>{notary.commissionExpiration ? new Date(notary.commissionExpiration).toLocaleDateString() : "N/A"}</span></div>
              </CardContent>
            </Card>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSealConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSealConfirm} disabled={sealMutation.isPending} data-testid="button-confirm-seal">
              {sealMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Stamp className="h-4 w-4 mr-2" /> Apply Seal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this notarization session? This will finalize all journal entries, stop recording, and update document statuses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {allDocsSigned ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              <span>{allDocsSigned ? "All documents signed" : "Some documents are not fully signed"}</span>
            </div>
            <div className="flex items-center gap-2">
              {allDocsNotarized ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              <span>{allDocsNotarized ? "All documents notarized" : "Some documents are not notarized"}</span>
            </div>
            {recordings.some(r => r.status === "recording") && (
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-red-500" />
                <span>Recording will be stopped and saved</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} data-testid="button-confirm-complete">
              {completeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recording Consent Required</DialogTitle>
            <DialogDescription>
              This notarization session will be recorded (audio and video). Your consent is required before joining.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3 text-sm">
                <p>By checking the box below and clicking &quot;I Consent,&quot; you acknowledge and agree to the following:</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>This session will be recorded in its entirety, including audio and video</li>
                  <li>The recording will be securely stored and encrypted</li>
                  <li>The recording will be retained according to applicable state retention requirements</li>
                  <li>The recording may be used as evidence of the notarization</li>
                </ul>
              </CardContent>
            </Card>
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-checkbox"
                checked={consentAgreed}
                onCheckedChange={(checked) => setConsentAgreed(checked === true)}
                data-testid="checkbox-consent"
              />
              <label htmlFor="consent-checkbox" className="text-sm leading-tight cursor-pointer">
                I understand and consent to the recording of this notarization session
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConsentDialogOpen(false); setConsentAgreed(false); }}>
              Cancel
            </Button>
            <Button
              disabled={!consentAgreed || consentMutation.isPending}
              onClick={() => consentSignerId && handleConsentSubmit(consentSignerId)}
              data-testid="button-submit-consent"
            >
              {consentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              I Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistPanel({ checklist }: { checklist?: ChecklistData }) {
  if (!checklist) return <Skeleton className="h-40" />;
  const c = checklist.checks;
  const items = [
    { label: "Signers Added", ok: c.hasSigners, detail: `${c.signerCount} signer(s)` },
    { label: "All IDV Complete", ok: c.allSignersVerified, detail: c.allSignersVerified ? "All verified" : "Pending" },
    { label: "Documents Ready", ok: c.documentsReady && c.hasDocuments, detail: `${c.documentCount} document(s)` },
    { label: "Notary Assigned", ok: c.notaryReady, detail: c.notaryName || "None" },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Pre-Session Checklist</h3>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm" data-testid={`checklist-item-${i}`}>
          {item.ok ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
          </div>
        </div>
      ))}
      <Separator />
      <h4 className="text-xs font-semibold text-muted-foreground">Signer Verification</h4>
      {c.signers.map((s) => (
        <div key={s.signerId} className="text-xs space-y-1 border rounded-md p-2" data-testid={`signer-check-${s.signerId}`}>
          <p className="font-medium">{s.signerName}</p>
          <div className="flex gap-1 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {s.credentialVerified ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <XCircle className="h-2.5 w-2.5 mr-0.5" />} ID
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {s.livenessPassed ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <XCircle className="h-2.5 w-2.5 mr-0.5" />} Liveness
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {s.kbaPassed ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <XCircle className="h-2.5 w-2.5 mr-0.5" />} KBA {s.kbaScore !== null ? `(${s.kbaScore}/5)` : ""}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {s.ofacCleared ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <XCircle className="h-2.5 w-2.5 mr-0.5" />} OFAC
            </Badge>
          </div>
        </div>
      ))}
      {!checklist.canStart && (
        <p className="text-xs text-yellow-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Resolve all items before starting
        </p>
      )}
    </div>
  );
}

function ParticipantsPanel({ notary, signers, session, onRequestConsent }: { notary: RonNotary | null; signers: RonSigner[]; session: RonSession; onRequestConsent?: (signerId: string) => void }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Participants</h3>
      {notary && (
        <div className="flex items-center gap-2 p-2 border rounded-md" data-testid="participant-notary">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{notary.firstName} {notary.lastName}</p>
            <p className="text-[10px] text-muted-foreground">Notary — {notary.commissionState}</p>
          </div>
          <Circle className="h-3 w-3 fill-green-500 text-green-500" />
        </div>
      )}
      {signers.map((signer) => {
        const geo = signer.geolocationData as Record<string, unknown> | null;
        return (
          <div key={signer.id} className="space-y-1" data-testid={`participant-signer-${signer.id}`}>
            <div className="flex items-center gap-2 p-2 border rounded-md">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{signer.firstName} {signer.lastName}</p>
                <p className="text-[10px] text-muted-foreground">{signer.role} — {signer.email}</p>
              </div>
              {signer.signingCompleted ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : signer.joinedSessionAt ? (
                <Circle className="h-3 w-3 fill-green-500 text-green-500" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
            </div>

            <div className="ml-10 space-y-0.5 text-[10px] text-muted-foreground">
              {signer.consentRecordedAt ? (
                <div className="flex items-center gap-1" data-testid={`consent-status-${signer.id}`}>
                  <ShieldCheck className="h-3 w-3 text-green-500" />
                  <span>Consent: {signer.consentType} ({new Date(signer.consentRecordedAt).toLocaleTimeString()})</span>
                </div>
              ) : session.status === "in_progress" && onRequestConsent ? (
                <button
                  className="flex items-center gap-1 text-yellow-500 hover:underline"
                  onClick={() => onRequestConsent(signer.id)}
                  data-testid={`button-request-consent-${signer.id}`}
                >
                  <ShieldAlert className="h-3 w-3" />
                  <span>Consent not recorded — click to capture</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-yellow-500" />
                  <span>Consent pending</span>
                </div>
              )}

              {signer.deviceFingerprint && (
                <div className="flex items-center gap-1" data-testid={`device-fingerprint-${signer.id}`}>
                  <Fingerprint className="h-3 w-3" />
                  <span>Device: {signer.deviceFingerprint.substring(0, 12)}...</span>
                </div>
              )}

              {signer.ipAddress && (
                <div className="flex items-center gap-1" data-testid={`ip-address-${signer.id}`}>
                  <MonitorSmartphone className="h-3 w-3" />
                  <span>IP: {signer.ipAddress}</span>
                </div>
              )}

              {geo && (geo as any).city && (
                <div className="flex items-center gap-1" data-testid={`geolocation-${signer.id}`}>
                  <MapPin className="h-3 w-3" />
                  <span>{(geo as any).city}{(geo as any).region ? `, ${(geo as any).region}` : ""}{(geo as any).country ? ` (${(geo as any).country})` : ""}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocumentViewer({
  doc, isActive, signers, notary, onSignatureClick, onSealClick,
  onPrev, onNext, currentIndex, totalDocs
}: {
  doc: EnrichedDocument;
  isActive: boolean;
  signers: RonSigner[];
  notary: RonNotary | null;
  onSignatureClick: (ann: RonAnnotationPlacement, doc: EnrichedDocument) => void;
  onSealClick: (doc: EnrichedDocument, pageNumber: number) => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalDocs: number;
}) {
  const signerMap = new Map(signers.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
  const pages = doc.pageCount || 1;

  const annotationColorMap: Record<string, string> = {
    signature: "border-blue-500 bg-blue-500/10",
    initial: "border-purple-500 bg-purple-500/10",
    date: "border-green-500 bg-green-500/10",
    seal: "border-amber-500 bg-amber-500/10",
    notary_signature: "border-cyan-500 bg-cyan-500/10",
    notary_seal: "border-amber-500 bg-amber-500/10",
    text: "border-gray-500 bg-gray-500/10",
    checkbox: "border-gray-500 bg-gray-500/10",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-2 border-b flex-wrap">
        <Button variant="ghost" size="icon" onClick={onPrev} disabled={currentIndex === 0} data-testid="button-prev-doc">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium flex-1 text-center truncate">{doc.title}</span>
        <Badge variant={docStatusColors[doc.status] || "default"} className="text-xs">
          {doc.status.replace(/_/g, " ")}
        </Badge>
        <span className="text-xs text-muted-foreground">{currentIndex + 1}/{totalDocs}</span>
        <Button variant="ghost" size="icon" onClick={onNext} disabled={currentIndex === totalDocs - 1} data-testid="button-next-doc">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {isActive && notary && doc.status === "fully_signed" && (
          <Button size="sm" onClick={() => onSealClick(doc, 1)} data-testid="button-apply-seal">
            <Stamp className="h-4 w-4 mr-1" /> Apply Seal
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Array.from({ length: pages }, (_, pageIdx) => {
            const pageNum = pageIdx + 1;
            const pageAnnotations = doc.annotations.filter(a => a.pageNumber === pageNum);
            const pageSignatures = doc.signatures.filter(s => s.pageNumber === pageNum);
            const pageSeals = doc.seals.filter(s => s.pageNumber === pageNum);

            return (
              <div key={pageNum} className="relative border rounded-md bg-white dark:bg-gray-900 min-h-[400px] p-6" data-testid={`doc-page-${pageNum}`}>
                <div className="absolute top-2 right-2 text-xs text-muted-foreground">Page {pageNum}</div>

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-foreground">{doc.title}</h3>
                  {pageNum === 1 && <p className="text-sm text-muted-foreground mt-1">{doc.documentType || "Legal Document"}</p>}
                </div>

                {pageNum === 1 && (
                  <div className="space-y-3 text-sm text-muted-foreground mb-8">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-5/6" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-4/6" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                )}

                <div className="space-y-3 mt-4">
                  {pageAnnotations.map((ann) => {
                    const signerName = ann.signerId ? signerMap.get(ann.signerId) : "Notary";
                    const isComplete = ann.completed;
                    const matchingSig = pageSignatures.find(s => s.annotationId === ann.id);
                    const colorClass = annotationColorMap[ann.annotationType] || "border-gray-500 bg-gray-500/10";

                    return (
                      <div
                        key={ann.id}
                        className={`border-2 rounded-md p-3 relative ${colorClass} ${isComplete ? "opacity-70" : isActive ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => isActive && !isComplete ? onSignatureClick(ann, doc) : undefined}
                        data-testid={`annotation-field-${ann.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {ann.annotationType === "signature" || ann.annotationType === "notary_signature" ? (
                              <Pen className="h-4 w-4" />
                            ) : ann.annotationType === "seal" || ann.annotationType === "notary_seal" ? (
                              <Stamp className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium capitalize">{ann.annotationType.replace(/_/g, " ")}</span>
                            <span className="text-xs text-muted-foreground">— {signerName}</span>
                          </div>
                          {isComplete ? (
                            <Badge className="bg-green-500/20 text-green-500 text-[10px]">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Signed
                            </Badge>
                          ) : ann.required ? (
                            <Badge variant="secondary" className="text-[10px]">Required</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                          )}
                        </div>
                        {matchingSig && matchingSig.signatureData && (
                          <div className="mt-2 flex items-center gap-2">
                            <img
                              src={matchingSig.signatureData}
                              alt="Signature"
                              className="h-10 border rounded"
                              data-testid={`img-signature-${matchingSig.id}`}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(matchingSig.signedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {pageSeals.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {pageSeals.map((seal) => (
                      <div key={seal.id} className="border-2 border-amber-500 bg-amber-500/10 rounded-md p-3 text-center" data-testid={`seal-applied-${seal.id}`}>
                        <Stamp className="h-6 w-6 mx-auto mb-1 text-amber-600" />
                        <p className="text-sm font-semibold">NOTARY SEAL</p>
                        <p className="text-xs text-muted-foreground">State of {seal.commissionState}</p>
                        <p className="text-xs text-muted-foreground">Commission #{seal.commissionNumber}</p>
                        {seal.commissionExpiration && (
                          <p className="text-xs text-muted-foreground">Expires: {new Date(seal.commissionExpiration).toLocaleDateString()}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">Applied: {new Date(seal.appliedAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function FraudIndicator({ fraudSummary }: { fraudSummary: FraudSummary | null }) {
  if (!fraudSummary || fraudSummary.totalDetections === 0) {
    return (
      <div className="flex items-center gap-1.5" data-testid="fraud-indicator-clean">
        <ShieldCheck className="h-4 w-4 text-green-500" />
        <span className="text-xs text-green-600 dark:text-green-400">No fraud signals</span>
      </div>
    );
  }

  const severityColors: Record<string, string> = {
    low: "text-yellow-500",
    medium: "text-orange-500",
    high: "text-red-500",
    critical: "text-red-600",
  };

  const severityBgColors: Record<string, string> = {
    low: "bg-yellow-500/10",
    medium: "bg-orange-500/10",
    high: "bg-red-500/10",
    critical: "bg-red-500/20",
  };

  const color = severityColors[fraudSummary.severity] || "text-yellow-500";
  const bgColor = severityBgColors[fraudSummary.severity] || "bg-yellow-500/10";

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${bgColor}`} data-testid="fraud-indicator-alert">
      <ShieldAlert className={`h-4 w-4 ${color}`} />
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${color}`}>
          Fraud Score: {fraudSummary.overallScore}/100
        </span>
        <span className="text-[10px] text-muted-foreground">
          {fraudSummary.unacknowledged} unreviewed / {fraudSummary.totalDetections} total
        </span>
      </div>
      <Progress value={fraudSummary.overallScore} className="w-16 h-1.5" />
    </div>
  );
}

function VideoSessionPanel({
  session, videoRoom, recordings, fraudSummary, signers, sessionId, onRequestConsent,
}: {
  session: RonSession;
  videoRoom: RonVideoRoom | null;
  recordings: RonRecording[];
  fraudSummary: FraudSummary | null;
  signers: RonSigner[];
  sessionId: string;
  onRequestConsent: (signerId: string) => void;
}) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const isActive = session.status === "in_progress";
  const isRecording = recordings.some(r => r.status === "recording");

  return (
    <Card className="bg-muted/50">
      <CardContent className="py-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Video Session</span>
          </div>
          <Separator orientation="vertical" className="h-5" />

          {isActive ? (
            <div className="flex items-center gap-2 text-sm">
              <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
              <span className="text-red-500 font-medium text-xs">LIVE</span>
              {isRecording && (
                <Badge variant="destructive" className="text-[10px]">
                  Recording
                </Badge>
              )}
            </div>
          ) : session.status === "completed" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <VideoOff className="h-4 w-4" />
              <span className="text-xs">Session ended</span>
              {recordings.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {recordings.length} recording{recordings.length > 1 ? "s" : ""} saved
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MonitorSmartphone className="h-4 w-4" />
              <span className="text-xs">Waiting to start</span>
            </div>
          )}

          <div className="flex-1" />

          <FraudIndicator fraudSummary={fraudSummary} />

          <Badge variant="secondary" className="text-xs">
            {session.videoProvider || "Daily.co"}
          </Badge>
        </div>

        {isActive && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 flex items-center gap-4 bg-background/50 rounded-md p-2 min-h-[120px] justify-center" data-testid="video-feed-area">
              <div className="text-center space-y-2">
                <div className="h-16 w-24 bg-muted rounded-md flex items-center justify-center mx-auto border" data-testid="video-feed-notary">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-[10px] text-muted-foreground">Notary</p>
              </div>
              {signers.map((signer) => (
                <div key={signer.id} className="text-center space-y-2" data-testid={`video-feed-signer-${signer.id}`}>
                  <div className="h-16 w-24 bg-muted rounded-md flex items-center justify-center mx-auto border relative">
                    <User className="h-6 w-6 text-muted-foreground" />
                    {!signer.consentRecordedAt && (
                      <div className="absolute -top-1 -right-1">
                        <ShieldAlert className="h-3 w-3 text-yellow-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[96px]">{signer.firstName} {signer.lastName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isActive && (
          <div className="flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant={audioEnabled ? "secondary" : "destructive"}
              onClick={() => setAudioEnabled(!audioEnabled)}
              data-testid="button-toggle-audio"
            >
              {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant={videoEnabled ? "secondary" : "destructive"}
              onClick={() => setVideoEnabled(!videoEnabled)}
              data-testid="button-toggle-video"
            >
              {videoEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {videoRoom && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
            <span>Room: {videoRoom.roomName}</span>
            <span>Status: {videoRoom.status}</span>
            {videoRoom.participantCount !== null && videoRoom.participantCount !== undefined && (
              <span>Participants: {videoRoom.participantCount}/{videoRoom.maxParticipants || 10}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
