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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, CreditCard, Camera, Brain, Shield, CheckCircle2,
  XCircle, AlertTriangle, Loader2, ChevronRight, Upload, ScanFace, FileCheck
} from "lucide-react";
import type { RonSigner, RonTransaction } from "@shared/schema";

type KBAQuestion = { id: number; question: string; options: string[] };
type KBAResult = { score: number; total: number; passed: boolean; results: Array<{ questionId: number; correct: boolean }>; idvStatus: string };

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

  const { data: signer, isLoading: signerLoading } = useQuery<RonSigner>({
    queryKey: ["/api/ron/signers", signerId],
  });

  const { data: transaction } = useQuery<RonTransaction>({
    queryKey: ["/api/ron/transactions", transactionId],
  });

  const { data: kbaData } = useQuery<{ signerId: string; questions: KBAQuestion[] }>({
    queryKey: ["/api/ron/signers", signerId, "kba-questions"],
    enabled: !!signerId,
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

  if (signerLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  if (!signer) {
    return <div className="p-6"><Card><CardContent className="pt-6 text-center text-muted-foreground">Signer not found</CardContent></Card></div>;
  }

  const allStepsComplete = idvStepOrder.every(s => getStepStatus(signer, s) === "completed");
  const isFullyVerified = signer.idvStatus === "fully_verified";

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
                    <p className="text-muted-foreground">You may retry. 4 of 5 correct answers are required.</p>
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
            <p className="text-sm text-muted-foreground">This signer has completed all identity verification requirements.</p>
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
