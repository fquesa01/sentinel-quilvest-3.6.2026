import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  FileText,
  Users,
  CalendarClock,
  ScrollText,
  Plus,
  Upload,
  Stamp,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Trash2,
  Play,
  Square,
  Send,
  Hash,
  Link2,
  Eye,
  UserPlus,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type {
  RonTransaction,
  RonDocument,
  RonSigner,
  RonSession,
  RonJournalEntry,
  RonNotary,
  Deal,
} from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  pending_idv: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  ready: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  uploaded: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_signing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  fully_signed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  notarized: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const idvSteps = ["credential_analysis", "liveness", "kba", "ofac"] as const;
const idvLabels: Record<string, string> = {
  credential_analysis: "ID Check",
  liveness: "Liveness",
  kba: "KBA Quiz",
  ofac: "OFAC Screen",
};

const signerRoleLabels: Record<string, string> = {
  signer: "Signer",
  witness: "Witness",
  observer: "Observer",
  attorney_in_fact: "Attorney-in-Fact",
  authorized_representative: "Auth. Rep.",
  gp: "GP",
  lp: "LP",
  counsel: "Counsel",
};

const journalEventLabels: Record<string, string> = {
  transaction_created: "Transaction Created",
  document_uploaded: "Document Uploaded",
  signer_added: "Signer Added",
  signer_verified: "Signer Verified",
  session_scheduled: "Session Scheduled",
  session_started: "Session Started",
  session_paused: "Session Paused",
  session_resumed: "Session Resumed",
  session_completed: "Session Completed",
  session_cancelled: "Session Cancelled",
  signature_applied: "Signature Applied",
  initial_applied: "Initial Applied",
  seal_applied: "Seal Applied",
  compliance_check: "Compliance Check",
  document_notarized: "Document Notarized",
  notary_assigned: "Notary Assigned",
  recording_started: "Recording Started",
  recording_stopped: "Recording Stopped",
  signer_joined: "Signer Joined",
  signer_left: "Signer Left",
  signing_order_changed: "Signing Order Changed",
};

export default function RonTransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const [addSignerOpen, setAddSignerOpen] = useState(false);
  const [signerForm, setSignerForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", role: "signer",
    signingOrder: 1,
  });

  const [addDocOpen, setAddDocOpen] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("general");

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledStart: "",
    scheduledEnd: "",
    notaryId: "",
    sessionType: "live",
  });

  const { data: transaction, isLoading } = useQuery<RonTransaction>({
    queryKey: ["/api/ron/transactions", id],
  });

  const { data: documents = [] } = useQuery<RonDocument[]>({
    queryKey: ["/api/ron/transactions", id, "documents"],
    enabled: !!id,
  });

  const { data: signers = [] } = useQuery<RonSigner[]>({
    queryKey: ["/api/ron/transactions", id, "signers"],
    enabled: !!id,
  });

  const { data: sessions = [] } = useQuery<RonSession[]>({
    queryKey: ["/api/ron/transactions", id, "sessions"],
    enabled: !!id,
  });

  const { data: journal = [] } = useQuery<RonJournalEntry[]>({
    queryKey: ["/api/ron/transactions", id, "journal"],
    enabled: !!id && activeTab === "journal",
  });

  const { data: journalVerification } = useQuery<{ valid: boolean; totalEntries: number; brokenAt?: number }>({
    queryKey: ["/api/ron/transactions", id, "journal", "verify"],
    enabled: !!id && activeTab === "journal",
  });

  const { data: notaries = [] } = useQuery<RonNotary[]>({
    queryKey: ["/api/ron/notaries"],
    enabled: scheduleOpen,
  });

  const { data: linkedDeal } = useQuery<Deal>({
    queryKey: ["/api/deals", transaction?.dealId],
    enabled: !!transaction?.dealId,
  });

  const addSignerMutation = useMutation({
    mutationFn: async (data: typeof signerForm) => {
      return apiRequest("POST", `/api/ron/transactions/${id}/signers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions", id, "signers"] });
      toast({ title: "Signer added" });
      setAddSignerOpen(false);
      setSignerForm({ firstName: "", lastName: "", email: "", phone: "", role: "signer", signingOrder: 1 });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (docFile) formData.append("file", docFile);
      formData.append("title", docTitle || docFile?.name || "Untitled");
      formData.append("documentType", docType);
      const res = await fetch(`/api/ron/transactions/${id}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions", id, "documents"] });
      toast({ title: "Document uploaded" });
      setAddDocOpen(false);
      setDocFile(null);
      setDocTitle("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const scheduleSessionMutation = useMutation({
    mutationFn: async (data: typeof scheduleForm) => {
      return apiRequest("POST", `/api/ron/transactions/${id}/sessions`, {
        ...data,
        scheduledStart: new Date(data.scheduledStart).toISOString(),
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions", id, "sessions"] });
      toast({ title: "Session scheduled" });
      setScheduleOpen(false);
      setScheduleForm({ scheduledStart: "", scheduledEnd: "", notaryId: "", sessionType: "live" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => apiRequest("POST", `/api/ron/sessions/${sessionId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions", id, "sessions"] });
      toast({ title: "Session started" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => apiRequest("POST", `/api/ron/sessions/${sessionId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions", id, "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions", id] });
      toast({ title: "Session completed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSignerMutation = useMutation({
    mutationFn: async (signerId: string) => apiRequest("DELETE", `/api/ron/signers/${signerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions", id, "signers"] });
      toast({ title: "Signer removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Transaction not found</p>
        <Link href="/ron/transactions">
          <Button variant="outline" className="mt-4">Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ron-transaction-detail-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/ron/transactions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" data-testid="text-txn-title">
                {transaction.title || "Untitled Transaction"}
              </h1>
              <Badge className={statusColors[transaction.status] || statusColors.draft}>
                {transaction.status?.replace(/_/g, " ") || "Draft"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {transaction.jurisdiction && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {transaction.jurisdiction}
                </span>
              )}
              {transaction.transactionType && (
                <span>{transaction.transactionType.replace(/_/g, " ")}</span>
              )}
              {transaction.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Created {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                </span>
              )}
              {linkedDeal && (
                <Link href={`/transactions/deals/${linkedDeal.id}`}>
                  <span className="flex items-center gap-1 text-primary hover:underline">
                    <Link2 className="h-3 w-3" /> {linkedDeal.title}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="signers" data-testid="tab-signers">
            Signers ({signers.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions">
            Sessions ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="journal" data-testid="tab-journal">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documents.length}</div>
                <p className="text-xs text-muted-foreground">
                  {documents.filter(d => d.status === "notarized").length} notarized
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Signers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{signers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {signers.filter(s => s.identityVerified).length} verified
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sessions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {sessions.filter(s => s.status === "completed").length} completed
                </p>
              </CardContent>
            </Card>
          </div>

          {transaction.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{transaction.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Documents</h3>
            <Button size="sm" onClick={() => setAddDocOpen(true)} data-testid="button-add-document">
              <Upload className="h-4 w-4 mr-2" /> Upload Document
            </Button>
          </div>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.documentType || "General"} &middot; {doc.pageCount ?? "?"} pages
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[doc.status || "uploaded"]}>
                      {doc.status?.replace(/_/g, " ") || "Uploaded"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="signers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Signers</h3>
            <Button size="sm" onClick={() => setAddSignerOpen(true)} data-testid="button-add-signer">
              <UserPlus className="h-4 w-4 mr-2" /> Add Signer
            </Button>
          </div>
          {signers.length > 0 ? (
            <div className="space-y-2">
              {signers.map((signer) => (
                <Card key={signer.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm">
                            {signer.firstName} {signer.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {signerRoleLabels[signer.role || ""] || signer.role} &middot; {signer.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {signer.identityVerified ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Pending IDV
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSignerMutation.mutate(signer.id)}
                          data-testid={`button-remove-signer-${signer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {idvSteps.map((step) => {
                        const checks = (signer as any).complianceChecks || [];
                        const check = Array.isArray(checks) ? checks.find((c: any) => c.checkType === step) : null;
                        const passed = check?.result === "pass";
                        const pending = !check || check?.result === "pending";
                        return (
                          <Badge
                            key={step}
                            variant="outline"
                            className={`text-xs ${passed ? "border-green-500 text-green-700 dark:text-green-400" : pending ? "border-muted-foreground/30" : "border-red-500 text-red-700 dark:text-red-400"}`}
                          >
                            {idvLabels[step]}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No signers added yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Sessions</h3>
            <Button size="sm" onClick={() => setScheduleOpen(true)} data-testid="button-schedule-session">
              <CalendarClock className="h-4 w-4 mr-2" /> Schedule Session
            </Button>
          </div>
          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {session.sessionType?.replace(/_/g, " ")} Session
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.scheduledStart
                            ? format(new Date(session.scheduledStart), "MMM d, yyyy h:mm a")
                            : "Not scheduled"}
                          {session.durationSeconds
                            ? ` (${Math.round(session.durationSeconds / 60)} min)`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={statusColors[session.status || "scheduled"]}>
                          {session.status?.replace(/_/g, " ") || "Scheduled"}
                        </Badge>
                        {session.status === "scheduled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startSessionMutation.mutate(session.id)}
                            disabled={startSessionMutation.isPending}
                            data-testid={`button-start-session-${session.id}`}
                          >
                            <Play className="h-3 w-3 mr-1" /> Start
                          </Button>
                        )}
                        {(session.status === "in_progress" || session.status === "paused") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => completeSessionMutation.mutate(session.id)}
                            disabled={completeSessionMutation.isPending}
                            data-testid={`button-complete-session-${session.id}`}
                          >
                            <Square className="h-3 w-3 mr-1" /> Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sessions scheduled</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="journal" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Audit Journal</h3>
              {journalVerification && (
                <Badge className={journalVerification.valid
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                }>
                  {journalVerification.valid ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Chain Verified</>
                  ) : (
                    <><AlertTriangle className="h-3 w-3 mr-1" /> Chain Broken</>
                  )}
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {journal.length} entries
            </span>
          </div>
          {journal.length > 0 ? (
            <div className="space-y-2">
              {journal.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex gap-3 p-3 rounded-md border border-border"
                  data-testid={`journal-entry-${entry.id}`}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    {idx < journal.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">
                        {journalEventLabels[entry.eventType] || entry.eventType}
                      </p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        #{entry.sequenceNumber}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {entry.timestamp && (
                        <span>{format(new Date(entry.timestamp), "MMM d, h:mm:ss a")}</span>
                      )}
                      {entry.actorName && <span>by {entry.actorName}</span>}
                      <span className="font-mono text-[10px] truncate max-w-[120px]" title={entry.entryHash || ""}>
                        <Hash className="h-3 w-3 inline" />
                        {entry.entryHash?.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No journal entries yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={addSignerOpen} onOpenChange={setAddSignerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Signer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={signerForm.firstName}
                  onChange={(e) => setSignerForm({ ...signerForm, firstName: e.target.value })}
                  data-testid="input-signer-first-name"
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={signerForm.lastName}
                  onChange={(e) => setSignerForm({ ...signerForm, lastName: e.target.value })}
                  data-testid="input-signer-last-name"
                />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={signerForm.email}
                onChange={(e) => setSignerForm({ ...signerForm, email: e.target.value })}
                data-testid="input-signer-email"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={signerForm.phone}
                onChange={(e) => setSignerForm({ ...signerForm, phone: e.target.value })}
                data-testid="input-signer-phone"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select value={signerForm.role} onValueChange={(v) => setSignerForm({ ...signerForm, role: v })}>
                  <SelectTrigger data-testid="select-signer-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(signerRoleLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Signing Order</Label>
                <Input
                  type="number"
                  min={1}
                  value={signerForm.signingOrder}
                  onChange={(e) => setSignerForm({ ...signerForm, signingOrder: parseInt(e.target.value) || 1 })}
                  data-testid="input-signer-order"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSignerOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addSignerMutation.mutate(signerForm)}
              disabled={!signerForm.firstName || !signerForm.lastName || !signerForm.email || addSignerMutation.isPending}
              data-testid="button-submit-signer"
            >
              {addSignerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Signer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDocOpen} onOpenChange={setAddDocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>File *</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                data-testid="input-doc-file"
              />
            </div>
            <div>
              <Label>Document Title</Label>
              <Input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Leave blank to use filename"
                data-testid="input-doc-title"
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="deed">Deed</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="power_of_attorney">Power of Attorney</SelectItem>
                  <SelectItem value="affidavit">Affidavit</SelectItem>
                  <SelectItem value="trust">Trust Document</SelectItem>
                  <SelectItem value="closing_disclosure">Closing Disclosure</SelectItem>
                  <SelectItem value="note">Promissory Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDocOpen(false)}>Cancel</Button>
            <Button
              onClick={() => uploadDocMutation.mutate()}
              disabled={!docFile || uploadDocMutation.isPending}
              data-testid="button-submit-doc"
            >
              {uploadDocMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Start Date & Time *</Label>
              <Input
                type="datetime-local"
                value={scheduleForm.scheduledStart}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledStart: e.target.value })}
                data-testid="input-session-start"
              />
            </div>
            <div>
              <Label>End Date & Time</Label>
              <Input
                type="datetime-local"
                value={scheduleForm.scheduledEnd}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledEnd: e.target.value })}
                data-testid="input-session-end"
              />
            </div>
            <div>
              <Label>Notary</Label>
              <Select value={scheduleForm.notaryId} onValueChange={(v) => setScheduleForm({ ...scheduleForm, notaryId: v })}>
                <SelectTrigger data-testid="select-session-notary">
                  <SelectValue placeholder="Select notary..." />
                </SelectTrigger>
                <SelectContent>
                  {notaries.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.firstName} {n.lastName} ({n.commissionState})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session Type</Label>
              <Select value={scheduleForm.sessionType} onValueChange={(v) => setScheduleForm({ ...scheduleForm, sessionType: v })}>
                <SelectTrigger data-testid="select-session-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live Video</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="ipen">IPEN (In-Person Electronic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              onClick={() => scheduleSessionMutation.mutate(scheduleForm)}
              disabled={!scheduleForm.scheduledStart || scheduleSessionMutation.isPending}
              data-testid="button-submit-session"
            >
              {scheduleSessionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
