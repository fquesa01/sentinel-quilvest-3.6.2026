import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, CreditCard, Camera, Brain, Shield, CheckCircle2,
  XCircle, AlertTriangle, Loader2, ChevronRight, Upload, ScanFace, FileCheck,
  UserCheck, Eye, Users
} from "lucide-react";
import type { RonSigner, RonTransaction } from "@shared/schema";

type KBAQuestion = { id: number; question: string; options: string[] };
type KBAResult = { score: number; total: number; passed: boolean; results: Array<{ questionId: number; correct: boolean }>; idvStatus: string };
type AltIdvRecord = {
  id: string;
  method: "credible_witness" | "personal_knowledge";
  status: string;
  witnessFirstName?: string;
  witnessLastName?: string;
  witnessEmail?: string;
  witnessIdvPassed?: boolean;
  notaryId?: string;
  notaryAttestation?: string;
  completedAt?: string;
};

const idvStepOrder = ["credential", "liveness", "kba", "ofac"] as const;
type IdvStep = typeof idvStepOrder[number];

const stepLabels: Record<IdvStep, string> = {
  credential: "ID Verification",
  liveness: "Liveness Check",
  kba: "Knowledge-Based Auth",
  ofac: "OFAC Screening",
};

const stepIcons: Record<IdvStep, typeof CreditCard> = {
  credential: CreditCard,
  liveness: ScanFace,
  kba: Brain,
  ofac: Shield,
};

function getStepStatus(signer: RonSigner, step: IdvStep): "completed" | "current" | "pending" | "failed" {
  const status = signer.idvStatus;
  if (status === "fully_verified") return "completed";
  if (status === "failed") return "failed";

  const passedStates: Record<IdvStep, string[]> = {
    credential: ["credential_passed", "liveness_pending", "liveness_passed", "kba_pending", "kba_passed", "ofac_pending", "ofac_cleared", "fully_verified"],
    liveness: ["liveness_passed", "kba_pending", "kba_passed", "ofac_pending", "ofac_cleared", "fully_verified"],
    kba: ["kba_passed", "ofac_pending", "ofac_cleared", "fully_verified"],
    ofac: ["ofac_cleared", "fully_verified"],
  };

  const failedStates: Record<IdvStep, string[]> = {
    credential: ["credential_failed"],
    liveness: ["liveness_failed"],
    kba: ["kba_failed"],
    ofac: ["ofac_flagged"],
  };

  if (passedStates[step].includes(status)) return "completed";
  if (failedStates[step].includes(status)) return "failed";

  const currentStates: Record<IdvStep, string[]> = {
    credential: ["not_started", "credential_pending"],
    liveness: ["credential_passed", "liveness_pending"],
    kba: ["liveness_passed", "kba_pending"],
    ofac: ["kba_passed", "ofac_pending"],
  };

  if (currentStates[step].includes(status)) return "current";
  return "pending";
}

export default function RonIdvPage() {
  const { transactionId, signerId } = useParams<{ transactionId: string; signerId: string }>();
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<IdvStep>("credential");
  const [credentialType, setCredentialType] = useState("drivers_license");
  const [credentialNumber, setCredentialNumber] = useState("");
  const [kbaAnswers, setKbaAnswers] = useState<(number | null)[]>([null, null, null, null, null]);
  const [kbaResult, setKbaResult] = useState<KBAResult | null>(null);
  const [showAltIdv, setShowAltIdv] = useState(false);
  const [altIdvMethod, setAltIdvMethod] = useState<"credible_witness" | "personal_knowledge">("credible_witness");

  const [witnessForm, setWitnessForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", relationship: "", reason: "",
  });
  const [personalKnowledgeForm, setPersonalKnowledgeForm] = useState({
    notaryId: "", attestation: "", reason: "",
  });

  const { data: signer, isLoading: signerLoading } = useQuery<RonSigner>({
    queryKey: ["/api/ron/signers", signerId],
  });

  const { data: transaction } = useQuery<RonTransaction & { eligibilityCheck?: any }>({
    queryKey: ["/api/ron/transactions", transactionId],
  });

  const { data: kbaData } = useQuery<{ signerId: string; questions: KBAQuestion[] }>({
    queryKey: ["/api/ron/signers", signerId, "kba-questions"],
    enabled: !!signerId,
  });

  const { data: altIdvData } = useQuery<{
    records: AltIdvRecord[];
    availableMethods: { credibleWitness: boolean; personalKnowledge: boolean };
    requirements: any;
  }>({
    queryKey: ["/api/ron/signers", signerId, "alt-idv"],
    enabled: !!signerId,
  });

  const { data: notaries } = useQuery<any[]>({
    queryKey: ["/api/ron/notaries"],
  });

  const credentialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/signers/${signerId}/credential-verify`, {
        credentialType,
        credentialNumber: credentialNumber || `SIM-${Date.now()}`,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId] });
      toast({ title: "ID Verified", description: "Credential verification complete." });
      setActiveStep("liveness");
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const livenessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/signers/${signerId}/liveness-check`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId] });
      toast({ title: "Liveness Confirmed", description: "Biometric match score: 95%" });
      setActiveStep("kba");
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const kbaMutation = useMutation({
    mutationFn: async () => {
      const answers = kbaAnswers.map(a => a ?? -1);
      const res = await apiRequest("POST", `/api/ron/signers/${signerId}/kba-submit`, { answers });
      return res.json();
    },
    onSuccess: (data: KBAResult) => {
      setKbaResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId] });
      if (data.passed) {
        toast({ title: "KBA Passed", description: `Score: ${data.score}/${data.total}` });
        setActiveStep("ofac");
      } else {
        toast({ title: "KBA Failed", description: `Score: ${data.score}/${data.total}. 4/5 required.`, variant: "destructive" });
        setShowAltIdv(true);
      }
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const ofacMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/signers/${signerId}/ofac-screen`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId] });
      toast({ title: "OFAC Cleared", description: "No matches found on sanctions lists." });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/signers/${signerId}/complete-idv`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId] });
      toast({ title: "IDV Complete", description: "Signer identity fully verified." });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const credibleWitnessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/signers/${signerId}/alt-idv/credible-witness`, {
        witnessFirstName: witnessForm.firstName,
        witnessLastName: witnessForm.lastName,
        witnessEmail: witnessForm.email,
        witnessPhone: witnessForm.phone,
        witnessRelationship: witnessForm.relationship,
        reason: witnessForm.reason || "KBA failed — using credible witness alternative",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId, "alt-idv"] });
      toast({ title: "Witness Added", description: "Credible witness pathway initiated. The witness must now complete their own identity verification." });
      setWitnessForm({ firstName: "", lastName: "", email: "", phone: "", relationship: "", reason: "" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const witnessVerifyMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await apiRequest("POST", `/api/ron/alt-idv/${recordId}/witness-verify`, {
        credentialType: "drivers_license",
        credentialNumber: `WIT-${Date.now()}`,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId, "alt-idv"] });
      toast({ title: "Witness Verified", description: "Credible witness identity verified." });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const altIdvCompleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await apiRequest("POST", `/api/ron/alt-idv/${recordId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId, "alt-idv"] });
      toast({ title: "IDV Complete", description: "Signer identity verified via alternative pathway." });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const personalKnowledgeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ron/signers/${signerId}/alt-idv/personal-knowledge`, {
        notaryId: personalKnowledgeForm.notaryId,
        notaryAttestation: personalKnowledgeForm.attestation,
        reason: personalKnowledgeForm.reason || "KBA failed — using personal knowledge alternative",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId, "alt-idv"] });
      toast({ title: "Attestation Created", description: "Personal knowledge attestation recorded. Notary signature required to complete." });
      setPersonalKnowledgeForm({ notaryId: "", attestation: "", reason: "" });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const signAttestationMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await apiRequest("POST", `/api/ron/alt-idv/${recordId}/sign-attestation`, {
        notarySignature: `DIGITAL_SIGNATURE_${Date.now()}`,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/signers", signerId, "alt-idv"] });
      toast({ title: "Attestation Signed", description: "Signer identity verified via personal knowledge." });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  if (signerLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  if (!signer) {
    return <div className="p-6"><Card><CardContent className="pt-6 text-center text-muted-foreground">Signer not found</CardContent></Card></div>;
  }

  const allStepsComplete = idvStepOrder.every(s => getStepStatus(signer, s) === "completed");
  const isFullyVerified = signer.idvStatus === "fully_verified";
  const kbaFailed = signer.idvStatus === "kba_failed" || (kbaResult && !kbaResult.passed);
  const hasAltIdvRecords = (altIdvData?.records?.length || 0) > 0;
  const completedAltIdv = altIdvData?.records?.find(r => r.status === "completed");
  const canUseCredibleWitness = altIdvData?.availableMethods?.credibleWitness || false;
  const canUsePersonalKnowledge = altIdvData?.availableMethods?.personalKnowledge || false;
  const hasAnyAltMethod = canUseCredibleWitness || canUsePersonalKnowledge;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/ron/transactions/${transactionId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-to-transaction">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold" data-testid="text-idv-title">
            Identity Verification — {signer.firstName} {signer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{transaction?.title || "RON Transaction"}</p>
        </div>
        {isFullyVerified && (
          <Badge className="bg-green-500/20 text-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Fully Verified
          </Badge>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {idvStepOrder.map((step, i) => {
          const status = getStepStatus(signer, step);
          const Icon = stepIcons[step];
          return (
            <button
              key={step}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${activeStep === step ? "border-primary bg-accent" : ""} ${status === "completed" ? "opacity-80" : ""}`}
              onClick={() => setActiveStep(step)}
              data-testid={`button-step-${step}`}
            >
              {status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : status === "failed" ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : status === "current" ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <Icon className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{stepLabels[step]}</span>
              {i < idvStepOrder.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </button>
          );
        })}
      </div>

      {activeStep === "credential" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Credential Verification</CardTitle>
            <CardDescription>Upload and verify a government-issued photo ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getStepStatus(signer, "credential") === "completed" ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Credential Verified</span>
                <span className="text-sm text-muted-foreground ml-2">Type: {signer.credentialType || "N/A"}</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <Select value={credentialType} onValueChange={setCredentialType}>
                    <SelectTrigger data-testid="select-credential-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="state_id">State ID Card</SelectItem>
                      <SelectItem value="military_id">Military ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID Number (Optional)</Label>
                  <Input
                    placeholder="Enter ID number"
                    value={credentialNumber}
                    onChange={(e) => setCredentialNumber(e.target.value)}
                    data-testid="input-credential-number"
                  />
                </div>
                <div className="border-2 border-dashed rounded-md p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload front of ID</p>
                  <p className="text-xs text-muted-foreground mt-1">(Simulated — click verify to proceed)</p>
                </div>
                <Button onClick={() => credentialMutation.mutate()} disabled={credentialMutation.isPending} data-testid="button-verify-credential">
                  {credentialMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
                  Verify Credential
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeStep === "liveness" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ScanFace className="h-5 w-5" /> Liveness Check</CardTitle>
            <CardDescription>Confirm the signer is a live person matching the photo ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getStepStatus(signer, "liveness") === "completed" ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Liveness Confirmed</span>
                <span className="text-sm text-muted-foreground ml-2">
                  Match Score: {signer.biometricMatchScore ? `${parseFloat(String(signer.biometricMatchScore)) * 100}%` : "95%"}
                </span>
              </div>
            ) : getStepStatus(signer, "credential") !== "completed" ? (
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
                <span>Complete credential verification first</span>
              </div>
            ) : (
              <>
                <div className="border-2 border-dashed rounded-md p-8 text-center">
                  <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Camera Capture Area</p>
                  <p className="text-xs text-muted-foreground mt-1">Position your face in the frame</p>
                  <p className="text-xs text-muted-foreground">(Simulated — click to proceed)</p>
                </div>
                <Button onClick={() => livenessMutation.mutate()} disabled={livenessMutation.isPending} data-testid="button-liveness-check">
                  {livenessMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanFace className="h-4 w-4 mr-2" />}
                  Run Liveness Check
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeStep === "kba" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> Knowledge-Based Authentication</CardTitle>
            <CardDescription>Answer 5 questions from public records — 4 of 5 correct required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {getStepStatus(signer, "kba") === "completed" ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">KBA Passed</span>
                <span className="text-sm text-muted-foreground ml-2">Score: {signer.kbaScore}/5</span>
              </div>
            ) : getStepStatus(signer, "liveness") !== "completed" ? (
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
                <span>Complete liveness check first</span>
              </div>
            ) : (
              <>
                {kbaResult && !kbaResult.passed && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 text-sm">
                    <p className="font-medium text-red-500">Quiz Failed — Score: {kbaResult.score}/{kbaResult.total}</p>
                    <p className="text-muted-foreground">You may retry or use an alternative identity verification method below.</p>
                  </div>
                )}
                {kbaData?.questions.map((q, i) => (
                  <div key={q.id} className="space-y-2" data-testid={`kba-question-${q.id}`}>
                    <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                    <RadioGroup
                      value={kbaAnswers[i]?.toString() || ""}
                      onValueChange={(val) => {
                        const newAnswers = [...kbaAnswers];
                        newAnswers[i] = parseInt(val);
                        setKbaAnswers(newAnswers);
                      }}
                    >
                      {q.options.map((opt, j) => (
                        <div key={j} className="flex items-center space-x-2">
                          <RadioGroupItem value={j.toString()} id={`q${q.id}-opt${j}`} data-testid={`radio-kba-q${q.id}-opt${j}`} />
                          <Label htmlFor={`q${q.id}-opt${j}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {kbaResult && (
                      <div className="flex items-center gap-1 text-xs">
                        {kbaResult.results[i]?.correct ? (
                          <><CheckCircle2 className="h-3 w-3 text-green-500" /> Correct</>
                        ) : (
                          <><XCircle className="h-3 w-3 text-red-500" /> Incorrect</>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  onClick={() => kbaMutation.mutate()}
                  disabled={kbaMutation.isPending || kbaAnswers.some(a => a === null)}
                  data-testid="button-submit-kba"
                >
                  {kbaMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                  Submit Answers
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeStep === "ofac" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> OFAC Screening</CardTitle>
            <CardDescription>Screen against the Office of Foreign Assets Control sanctions lists</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getStepStatus(signer, "ofac") === "completed" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">OFAC Cleared</span>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-md p-3 text-sm">
                  <p>No matches found on SDN, Consolidated, or Sectoral Sanctions lists.</p>
                  <p className="text-xs text-muted-foreground mt-1">Screened: {signer.firstName} {signer.lastName}</p>
                </div>
              </div>
            ) : getStepStatus(signer, "kba") !== "completed" ? (
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
                <span>Complete KBA first</span>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  <p>This will screen the signer against:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Specially Designated Nationals (SDN) List</li>
                    <li>Consolidated Sanctions List</li>
                    <li>Sectoral Sanctions Identifications List</li>
                    <li>Foreign Sanctions Evaders List</li>
                  </ul>
                </div>
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <p className="font-medium">Screening Details</p>
                  <p className="text-muted-foreground">Name: {signer.firstName} {signer.lastName}</p>
                  <p className="text-muted-foreground">Email: {signer.email}</p>
                </div>
                <Button onClick={() => ofacMutation.mutate()} disabled={ofacMutation.isPending} data-testid="button-ofac-screen">
                  {ofacMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  Run OFAC Screening
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {(kbaFailed || showAltIdv) && !isFullyVerified && !completedAltIdv && hasAnyAltMethod && (
        <>
          <Separator />
          <Card className="border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Alternative Identity Verification
              </CardTitle>
              <CardDescription>
                KBA failed or is unavailable. You can verify this signer's identity through an alternative pathway permitted by {transaction?.jurisdiction || "your"} state regulations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {canUseCredibleWitness && (
                  <Button
                    variant={altIdvMethod === "credible_witness" ? "default" : "outline"}
                    onClick={() => setAltIdvMethod("credible_witness")}
                    data-testid="button-alt-idv-credible-witness"
                  >
                    <Users className="h-4 w-4 mr-2" /> Credible Witness
                  </Button>
                )}
                {canUsePersonalKnowledge && (
                  <Button
                    variant={altIdvMethod === "personal_knowledge" ? "default" : "outline"}
                    onClick={() => setAltIdvMethod("personal_knowledge")}
                    data-testid="button-alt-idv-personal-knowledge"
                  >
                    <Eye className="h-4 w-4 mr-2" /> Personal Knowledge
                  </Button>
                )}
              </div>

              {altIdvMethod === "credible_witness" && canUseCredibleWitness && (
                <div className="space-y-4 border border-border rounded-md p-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Credible Witness Verification</h4>
                    <p className="text-xs text-muted-foreground">
                      A third party who personally knows the signer vouches for their identity. The witness must complete their own identity verification process.
                    </p>
                  </div>
                  {altIdvData?.requirements?.credibleWitness && (
                    <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Requirements for {transaction?.jurisdiction}:</p>
                      <p>Number of witnesses required: {altIdvData.requirements.credibleWitness.witnessCount}</p>
                      <p>Witness IDV required: {altIdvData.requirements.credibleWitness.witnessIdvRequired ? "Yes" : "No"}</p>
                      <p>Witness KBA required: {altIdvData.requirements.credibleWitness.witnessKbaRequired ? "Yes" : "No"}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Witness First Name *</Label>
                      <Input
                        value={witnessForm.firstName}
                        onChange={(e) => setWitnessForm({ ...witnessForm, firstName: e.target.value })}
                        data-testid="input-witness-first-name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Witness Last Name *</Label>
                      <Input
                        value={witnessForm.lastName}
                        onChange={(e) => setWitnessForm({ ...witnessForm, lastName: e.target.value })}
                        data-testid="input-witness-last-name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Witness Email *</Label>
                    <Input
                      type="email"
                      value={witnessForm.email}
                      onChange={(e) => setWitnessForm({ ...witnessForm, email: e.target.value })}
                      data-testid="input-witness-email"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={witnessForm.phone}
                        onChange={(e) => setWitnessForm({ ...witnessForm, phone: e.target.value })}
                        data-testid="input-witness-phone"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Relationship to Signer</Label>
                      <Input
                        value={witnessForm.relationship}
                        onChange={(e) => setWitnessForm({ ...witnessForm, relationship: e.target.value })}
                        placeholder="e.g., Colleague, Neighbor"
                        data-testid="input-witness-relationship"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Reason for Alternative IDV</Label>
                    <Textarea
                      value={witnessForm.reason}
                      onChange={(e) => setWitnessForm({ ...witnessForm, reason: e.target.value })}
                      placeholder="e.g., Signer failed KBA quiz after multiple attempts"
                      data-testid="input-witness-reason"
                    />
                  </div>
                  <Button
                    onClick={() => credibleWitnessMutation.mutate()}
                    disabled={credibleWitnessMutation.isPending || !witnessForm.firstName || !witnessForm.lastName || !witnessForm.email}
                    data-testid="button-submit-credible-witness"
                  >
                    {credibleWitnessMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
                    Initiate Credible Witness Pathway
                  </Button>
                </div>
              )}

              {altIdvMethod === "personal_knowledge" && canUsePersonalKnowledge && (
                <div className="space-y-4 border border-border rounded-md p-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Personal Knowledge Verification</h4>
                    <p className="text-xs text-muted-foreground">
                      For notaries who personally know the signer. The notary provides a formal attestation that is recorded in the audit journal with their digital signature.
                    </p>
                  </div>
                  {altIdvData?.requirements?.personalKnowledge && (
                    <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Requirements for {transaction?.jurisdiction}:</p>
                      <p>Notary must be commissioned: {altIdvData.requirements.personalKnowledge.notaryMustBeCommissioned ? "Yes" : "No"}</p>
                      <p>Formal attestation required: {altIdvData.requirements.personalKnowledge.formalAttestationRequired ? "Yes" : "No"}</p>
                      <p>Prior relationship required: {altIdvData.requirements.personalKnowledge.priorRelationshipRequired ? "Yes" : "No"}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Select Notary *</Label>
                    <Select value={personalKnowledgeForm.notaryId} onValueChange={(v) => setPersonalKnowledgeForm({ ...personalKnowledgeForm, notaryId: v })}>
                      <SelectTrigger data-testid="select-pk-notary">
                        <SelectValue placeholder="Choose notary..." />
                      </SelectTrigger>
                      <SelectContent>
                        {notaries?.filter(n => n.status === "active").map((n: any) => (
                          <SelectItem key={n.id} value={n.id}>{n.firstName} {n.lastName} ({n.commissionState})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Notary Attestation *</Label>
                    <Textarea
                      value={personalKnowledgeForm.attestation}
                      onChange={(e) => setPersonalKnowledgeForm({ ...personalKnowledgeForm, attestation: e.target.value })}
                      placeholder="I, [Notary Name], do hereby attest that I personally know the signer [Signer Name] and can confirm their identity based on my personal knowledge..."
                      className="min-h-[100px]"
                      data-testid="input-pk-attestation"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reason</Label>
                    <Input
                      value={personalKnowledgeForm.reason}
                      onChange={(e) => setPersonalKnowledgeForm({ ...personalKnowledgeForm, reason: e.target.value })}
                      placeholder="e.g., KBA failed — notary personally knows signer"
                      data-testid="input-pk-reason"
                    />
                  </div>
                  <Button
                    onClick={() => personalKnowledgeMutation.mutate()}
                    disabled={personalKnowledgeMutation.isPending || !personalKnowledgeForm.notaryId || !personalKnowledgeForm.attestation}
                    data-testid="button-submit-personal-knowledge"
                  >
                    {personalKnowledgeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                    Submit Personal Knowledge Attestation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {hasAltIdvRecords && !isFullyVerified && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Alternative IDV Records
            </CardTitle>
            <CardDescription>Active alternative identity verification pathways</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {altIdvData?.records?.map((record) => (
              <div key={record.id} className="border border-border rounded-md p-4 space-y-3" data-testid={`alt-idv-record-${record.id}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {record.method === "credible_witness" ? (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">
                      {record.method === "credible_witness" ? "Credible Witness" : "Personal Knowledge"}
                    </span>
                  </div>
                  <Badge variant={
                    record.status === "completed" ? "default" :
                    record.status === "rejected" || record.status === "expired" ? "destructive" : "outline"
                  }>
                    {record.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                {record.method === "credible_witness" && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Witness: {record.witnessFirstName} {record.witnessLastName}</p>
                    <p>Email: {record.witnessEmail}</p>
                    <p>Witness IDV: {record.witnessIdvPassed ? "Passed" : "Pending"}</p>
                  </div>
                )}

                {record.method === "credible_witness" && record.status === "witness_idv_pending" && (
                  <Button
                    size="sm"
                    onClick={() => witnessVerifyMutation.mutate(record.id)}
                    disabled={witnessVerifyMutation.isPending}
                    data-testid={`button-verify-witness-${record.id}`}
                  >
                    {witnessVerifyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
                    Verify Witness Identity
                  </Button>
                )}

                {record.method === "credible_witness" && record.status === "witness_idv_complete" && (
                  <Button
                    size="sm"
                    onClick={() => altIdvCompleteMutation.mutate(record.id)}
                    disabled={altIdvCompleteMutation.isPending}
                    data-testid={`button-complete-alt-idv-${record.id}`}
                  >
                    {altIdvCompleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Complete Credible Witness Verification
                  </Button>
                )}

                {record.method === "personal_knowledge" && record.status === "attestation_pending" && (
                  <Button
                    size="sm"
                    onClick={() => signAttestationMutation.mutate(record.id)}
                    disabled={signAttestationMutation.isPending}
                    data-testid={`button-sign-attestation-${record.id}`}
                  >
                    {signAttestationMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
                    Sign Attestation (Notary)
                  </Button>
                )}

                {record.status === "completed" && (
                  <div className="flex items-center gap-2 text-green-500 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Completed {record.completedAt ? `on ${new Date(record.completedAt).toLocaleDateString()}` : ""}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {allStepsComplete && !isFullyVerified && (
        <Card className="border-green-500/30">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
            <h3 className="text-lg font-semibold">All Verification Steps Complete</h3>
            <p className="text-sm text-muted-foreground">Mark this signer as fully verified to proceed with the notarization session.</p>
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} data-testid="button-complete-idv">
              {completeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark as Fully Verified
            </Button>
          </CardContent>
        </Card>
      )}

      {isFullyVerified && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
            <h3 className="text-lg font-semibold">Identity Fully Verified</h3>
            <p className="text-sm text-muted-foreground">
              This signer has completed all identity verification requirements.
              {completedAltIdv && (
                <span className="block mt-1">
                  Verified via: {completedAltIdv.method === "credible_witness" ? "Credible Witness" : "Personal Knowledge"}
                </span>
              )}
            </p>
            <Link href={`/ron/transactions/${transactionId}`}>
              <Button variant="outline" data-testid="button-return-to-transaction">
                Return to Transaction
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
