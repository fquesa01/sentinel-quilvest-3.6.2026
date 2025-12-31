import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Download,
  FileText,
  User,
  Users,
  Brain,
  MessageSquare,
  Send,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  Shield,
  Video,
  AudioLines,
  Bot,
  AlertTriangle,
  Sparkles,
  PlayCircle,
  FileType,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Pencil,
  Check,
  X,
  StickyNote
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface RecordedStatement {
  id: string;
  caseId: string;
  title: string;
  statementType: string;
  otherTypeDetail: string | null;
  description: string | null;
  statementDate: string | null;
  location: string | null;
  speakerName: string;
  speakerRole: string | null;
  interviewerName: string | null;
  additionalParticipants: string[] | null;
  videoUrl: string | null;
  audioUrl: string | null;
  transcriptUrl: string | null;
  thumbnailUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  transcriptText: string | null;
  transcriptionStatus: string | null;
  isPrivileged: boolean;
  privilegeNotes: string | null;
  tags: string[] | null;
  aiSummary: string | null;
  keyMoments: KeyMoment[] | null;
  credibilityScore: number | null;
  credibilityAnalysis: CredibilityAnalysis | null;
  analysisStatus: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface KeyMoment {
  timestamp?: number;
  description: string;
  type: string;
  quote?: string;
}

interface CredibilityAnalysis {
  overall_assessment?: string;
  consistency_score?: number;
  specificity_score?: number;
  emotional_cues_score?: number;
  logical_coherence_score?: number;
  red_flags?: string[];
  recommendations?: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getStatementTypeLabel(type: string, otherDetail?: string | null): string {
  const labels: Record<string, string> = {
    deposition: "Deposition",
    interview: "Interview",
    witness_statement: "Witness Statement",
    affidavit: "Affidavit",
    declaration: "Declaration",
    recorded_call: "Recorded Call",
    other: otherDetail || "Other",
  };
  return labels[type] || type;
}

function getFileTypeIcon(fileType: string | null) {
  switch (fileType) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "audio":
      return <AudioLines className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export default function StatementDetailPage() {
  const [, params] = useRoute("/cases/:caseId/statements/:statementId");
  const caseId = params?.caseId;
  const statementId = params?.statementId;
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");

  const { data: statement, isLoading: statementLoading } = useQuery<RecordedStatement>({
    queryKey: [`/api/recorded-statements/${statementId}`],
    enabled: !!statementId,
  });

  const { data: caseData } = useQuery<Case>({
    queryKey: [`/api/cases/${caseId}`],
    enabled: !!caseId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { title?: string; description?: string }) => {
      return apiRequest("PATCH", `/api/recorded-statements/${statementId}`, data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [`/api/recorded-statements/${statementId}`] });
      toast({ title: "Statement updated" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    },
  });

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== statement?.title) {
      updateMutation.mutate({ title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveNotes = () => {
    if (editedNotes !== (statement?.description || "")) {
      updateMutation.mutate({ description: editedNotes });
    }
    setIsEditingNotes(false);
  };

  const startEditingTitle = () => {
    setEditedTitle(statement?.title || "");
    setIsEditingTitle(true);
  };

  const startEditingNotes = () => {
    setEditedNotes(statement?.description || "");
    setIsEditingNotes(true);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamedContent]);

  const extractParticipants = (): string[] => {
    if (!statement) return [];
    const participants: string[] = [];
    
    if (statement.speakerName) {
      participants.push(`${statement.speakerName}${statement.speakerRole ? ` (${statement.speakerRole})` : ""}`);
    }
    if (statement.interviewerName) {
      participants.push(`${statement.interviewerName} (Interviewer)`);
    }
    if (statement.additionalParticipants) {
      participants.push(...statement.additionalParticipants);
    }
    
    return participants;
  };

  const handleAskQuestion = async () => {
    if (!inputValue.trim() || !statementId) return;

    const userQuestion = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userQuestion, timestamp: new Date() }]);
    setIsAsking(true);
    setStreamedContent("");

    try {
      const response = await fetch(`/api/recorded-statements/${statementId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuestion }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  setStreamedContent(fullResponse);
                }
                if (data.done) {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: fullResponse, timestamp: new Date() },
                  ]);
                  setStreamedContent("");
                }
              } catch {
                // Skip non-JSON lines
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error asking question:", error);
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I apologize, but I encountered an error processing your question. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setIsAsking(false);
      setStreamedContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const handleDownloadFile = async () => {
    if (!statementId || !statement) return;

    // Check if there's an original file to download
    const hasOriginalFile = statement.transcriptUrl || statement.videoUrl || statement.audioUrl;

    try {
      if (hasOriginalFile) {
        toast({ title: "Downloading...", description: "Downloading the original file." });
        
        const response = await fetch(`/api/recorded-statements/${statementId}/download`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to download file");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = statement.fileName || `${statement.title || "statement"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Fall back to summary PDF if no original file
        toast({ title: "Generating PDF...", description: "No original file found, generating summary PDF." });
        
        const response = await fetch(`/api/recorded-statements/${statementId}/pdf`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to generate PDF");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${statement?.title || "statement"}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      toast({ title: "Downloaded", description: "PDF has been downloaded successfully." });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [isReprocessing, setIsReprocessing] = useState(false);

  const handleReprocess = async () => {
    if (!statementId || !statement) return;
    
    const isPdf = statement.mimeType?.includes("pdf") || statement.transcriptUrl?.endsWith(".pdf");
    if (!isPdf) {
      toast({
        title: "Not Supported",
        description: "Reprocessing is only available for PDF documents.",
        variant: "destructive",
      });
      return;
    }

    setIsReprocessing(true);
    try {
      const response = await apiRequest("POST", `/api/recorded-statements/${statementId}/reprocess`);
      toast({
        title: "Processing Started",
        description: "Text extraction and AI analysis is now in progress. This may take a few minutes.",
      });
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          await queryClient.refetchQueries({ queryKey: [`/api/recorded-statements/${statementId}`] });
          const updatedData = queryClient.getQueryData<RecordedStatement>([`/api/recorded-statements/${statementId}`]);
          if (updatedData?.analysisStatus === "completed" || updatedData?.analysisStatus === "failed") {
            clearInterval(pollInterval);
            setIsReprocessing(false);
            if (updatedData.analysisStatus === "completed") {
              toast({
                title: "Processing Complete",
                description: "The document has been processed and is ready for chat.",
              });
            } else {
              toast({
                title: "Processing Failed",
                description: "Could not extract text from this document.",
                variant: "destructive",
              });
            }
          }
        } catch {
          clearInterval(pollInterval);
          setIsReprocessing(false);
        }
      }, 5000);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsReprocessing(false);
      }, 300000);
    } catch (error) {
      setIsReprocessing(false);
      toast({
        title: "Error",
        description: "Failed to start reprocessing. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (statementLoading) {
    return (
      <div className="flex flex-col h-full p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex-1 grid grid-cols-2 gap-4">
          <Skeleton className="h-full" />
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Statement Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested statement could not be found.</p>
        <Link href={caseId ? `/cases/${caseId}?tab=recordings` : "/cases"}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Case
          </Button>
        </Link>
      </div>
    );
  }

  const participants = extractParticipants();

  return (
    <div className="flex flex-col h-full" data-testid="statement-detail-page">
      <Helmet>
        <title>{statement.title} | Statement | Sentinel Counsel</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Link href={caseId ? `/cases/${caseId}?tab=recordings` : "/cases"}>
            <Button variant="ghost" size="sm" data-testid="button-back-to-case">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {caseData?.caseNumber || "Case"}
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            {getFileTypeIcon(statement.fileType)}
            {isEditingTitle ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="h-8 text-lg font-semibold w-64"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  data-testid="input-edit-title"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveTitle} disabled={updateMutation.isPending} data-testid="button-save-title">
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)} data-testid="button-cancel-edit-title">
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-lg font-semibold" data-testid="text-statement-title">{statement.title}</h1>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={startEditingTitle}
                  data-testid="button-edit-title"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <Badge variant="outline" data-testid="badge-statement-type">
            {getStatementTypeLabel(statement.statementType, statement.otherTypeDetail)}
          </Badge>
          {statement.isPrivileged && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Shield className="h-3 w-3 mr-1" />
              Privileged
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {statement?.mimeType?.includes("pdf") && !statement?.transcriptText && (
            <Button 
              onClick={handleReprocess} 
              variant="outline" 
              size="sm" 
              disabled={isReprocessing || statement.transcriptionStatus === "processing"}
              data-testid="button-reprocess"
            >
              {isReprocessing || statement.transcriptionStatus === "processing" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {isReprocessing || statement.transcriptionStatus === "processing" ? "Processing..." : "Process Document"}
            </Button>
          )}
          <Button onClick={handleDownloadFile} variant="outline" size="sm" data-testid="button-download-file">
            <Download className="h-4 w-4 mr-2" />
            {statement?.fileName ? "Download File" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Main Content - Split Pane */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Document View */}
        <ResizablePanel defaultSize={55} minSize={35}>
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Metadata Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileType className="h-4 w-4" />
                    Statement Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {statement.statementDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Date</p>
                          <p className="font-medium" data-testid="text-statement-date">
                            {format(new Date(statement.statementDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}
                    {statement.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Location</p>
                          <p className="font-medium" data-testid="text-statement-location">{statement.location}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">File Size</p>
                        <p className="font-medium">{formatFileSize(statement.fileSizeBytes)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Uploaded</p>
                        <p className="font-medium">
                          {format(new Date(statement.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      Notes
                    </div>
                    {!isEditingNotes && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={startEditingNotes}
                        data-testid="button-edit-notes"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        {statement.description ? "Edit" : "Add Note"}
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        placeholder="Add notes about this document..."
                        className="min-h-[100px]"
                        autoFocus
                        data-testid="textarea-edit-notes"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(false)} data-testid="button-cancel-edit-notes">
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveNotes} disabled={updateMutation.isPending} data-testid="button-save-notes">
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : statement.description ? (
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">{statement.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes added yet. Click "Add Note" to add notes about this document.</p>
                  )}
                </CardContent>
              </Card>

              {/* Participants Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants ({participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {participants.length > 0 ? (
                    <div className="flex flex-wrap gap-2" data-testid="list-participants">
                      {participants.map((participant, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                          data-testid={`badge-participant-${index}`}
                        >
                          <User className="h-3 w-3" />
                          {participant}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No participants listed</p>
                  )}
                </CardContent>
              </Card>

              {/* AI Summary Card */}
              {statement.aiSummary && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-ai-summary">
                      <p className="text-sm whitespace-pre-wrap">{statement.aiSummary}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Credibility Analysis */}
              {statement.credibilityScore !== null && statement.credibilityAnalysis && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Credibility Analysis
                      <Badge 
                        variant="outline" 
                        className={
                          statement.credibilityScore >= 70 
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : statement.credibilityScore >= 50
                            ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                            : "bg-red-500/10 text-red-600 border-red-500/20"
                        }
                        data-testid="badge-credibility-score"
                      >
                        Score: {statement.credibilityScore}/100
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {statement.credibilityAnalysis.overall_assessment && (
                      <p className="text-sm" data-testid="text-credibility-assessment">
                        {statement.credibilityAnalysis.overall_assessment}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {statement.credibilityAnalysis.consistency_score !== undefined && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Consistency</p>
                          <p className="text-lg font-semibold">{statement.credibilityAnalysis.consistency_score}%</p>
                        </div>
                      )}
                      {statement.credibilityAnalysis.specificity_score !== undefined && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Specificity</p>
                          <p className="text-lg font-semibold">{statement.credibilityAnalysis.specificity_score}%</p>
                        </div>
                      )}
                      {statement.credibilityAnalysis.emotional_cues_score !== undefined && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Emotional Cues</p>
                          <p className="text-lg font-semibold">{statement.credibilityAnalysis.emotional_cues_score}%</p>
                        </div>
                      )}
                      {statement.credibilityAnalysis.logical_coherence_score !== undefined && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Logical Coherence</p>
                          <p className="text-lg font-semibold">{statement.credibilityAnalysis.logical_coherence_score}%</p>
                        </div>
                      )}
                    </div>

                    {statement.credibilityAnalysis.red_flags && statement.credibilityAnalysis.red_flags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1 mb-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Red Flags
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {statement.credibilityAnalysis.red_flags.map((flag, i) => (
                            <li key={i}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Key Moments */}
              {statement.keyMoments && statement.keyMoments.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Key Moments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3" data-testid="list-key-moments">
                      {statement.keyMoments.map((moment, index) => (
                        <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50" data-testid={`card-key-moment-${index}`}>
                          <Badge variant="outline" className="shrink-0">{moment.type}</Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{moment.description}</p>
                            {moment.quote && (
                              <p className="text-sm text-muted-foreground italic mt-1">"{moment.quote}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transcript */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Transcript
                    {statement.transcriptionStatus && (
                      <Badge 
                        variant="outline"
                        className={
                          statement.transcriptionStatus === "completed"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : statement.transcriptionStatus === "processing"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            : "bg-muted"
                        }
                      >
                        {statement.transcriptionStatus === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {statement.transcriptionStatus === "processing" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {statement.transcriptionStatus}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statement.transcriptText ? (
                    <div className="max-w-none" data-testid="text-transcript">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-normal bg-white dark:bg-muted/30 p-4 rounded-lg max-h-96 overflow-y-auto text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-border/50">
                        {statement.transcriptText}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No transcript available</p>
                      {statement.transcriptionStatus === "processing" && (
                        <p className="text-xs mt-1">Transcription in progress...</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Chat Interface */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <div className="flex flex-col h-full bg-muted/30">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-background">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Ask About This Statement</h2>
                <p className="text-xs text-muted-foreground">
                  Chat with the document to get insights
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4" data-testid="chat-messages">
                {messages.length === 0 && !streamedContent && (
                  <div className="text-center py-12">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium text-muted-foreground mb-2">Start a Conversation</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Ask questions about this statement. I'll help you find key information, 
                      identify inconsistencies, or summarize specific sections.
                    </p>
                    <div className="mt-6 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Try asking:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          "What are the key claims made?",
                          "Summarize the timeline of events",
                          "Are there any contradictions?",
                        ].map((suggestion, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setInputValue(suggestion)}
                            data-testid={`button-suggestion-${i}`}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                    data-testid={`chat-message-${index}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}

                {streamedContent && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="max-w-[85%] rounded-lg px-4 py-3 bg-background border">
                      <p className="text-sm whitespace-pre-wrap">{streamedContent}</p>
                    </div>
                  </div>
                )}

                {isAsking && !streamedContent && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="max-w-[85%] rounded-lg px-4 py-3 bg-background border">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analyzing statement...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about this statement..."
                  className="min-h-[44px] max-h-32 resize-none"
                  disabled={isAsking}
                  data-testid="input-chat-question"
                />
                <Button
                  onClick={handleAskQuestion}
                  disabled={!inputValue.trim() || isAsking}
                  size="icon"
                  className="shrink-0 h-11 w-11"
                  data-testid="button-send-question"
                >
                  {isAsking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
