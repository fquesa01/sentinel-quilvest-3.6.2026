import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Mic, 
  PlayCircle, 
  Clock, 
  Users,
  FileText,
  Calendar,
  ExternalLink,
  CheckCircle2,
  PauseCircle,
  Upload,
  Video,
  AudioLines,
  FileType,
  AlertTriangle,
  Shield,
  User,
  MapPin,
  Loader2,
  MoreVertical,
  Trash2,
  Eye,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Brain,
  FolderInput,
  Link as LinkIcon
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AmbientSession {
  id: string;
  sessionName: string;
  sessionType: string;
  status: string;
  caseId: string | null;
  notes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  participantNames: string[] | null;
  createdAt: string;
  fullTranscript: string | null;
  aiSummary: string | null;
}

interface RecordedStatement {
  id: number;
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
  keyMoments: object | null;
  credibilityScore: number | null;
  credibilityAnalysis: object | null;
  analysisStatus: string | null;
  createdAt: string;
}

interface RecordingsTabProps {
  caseId: string;
}

export function RecordingsTab({ caseId }: RecordingsTabProps) {
  const { toast } = useToast();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedSessionToImport, setSelectedSessionToImport] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    statementType: "interview",
    otherTypeDetail: "",
    description: "",
    statementDate: "",
    location: "",
    speakerName: "",
    speakerRole: "",
    interviewerName: "",
    isPrivileged: false,
    privilegeNotes: "",
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<AmbientSession[]>({
    queryKey: [`/api/ambient-sessions?caseId=${caseId}`],
    staleTime: 30000,
    refetchOnMount: true,
  });

  const { data: statements = [], isLoading: statementsLoading } = useQuery<RecordedStatement[]>({
    queryKey: [`/api/recorded-statements?caseId=${caseId}`],
    staleTime: 30000,
    refetchOnMount: true,
  });
  
  // Fetch unlinked sessions for import dialog
  const { data: unlinkedSessions = [], isLoading: unlinkedLoading } = useQuery<AmbientSession[]>({
    queryKey: ["/api/ambient-sessions?unlinked=true"],
    enabled: isImportDialogOpen, // Only fetch when dialog is open
    staleTime: 10000,
  });
  
  // Link session to case mutation
  const linkSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("PATCH", `/api/ambient-sessions/${sessionId}`, { caseId });
      if (!response.ok) {
        throw new Error("Failed to link session");
      }
      return response.json();
    },
    onSuccess: () => {
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ queryKey: [`/api/ambient-sessions?caseId=${caseId}`] });
      queryClient.refetchQueries({ queryKey: ["/api/ambient-sessions?unlinked=true"] });
      toast({
        title: "Session Imported",
        description: "The recording session has been linked to this case.",
      });
      setIsImportDialogOpen(false);
      setSelectedSessionToImport(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import session",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (statementId: number) => {
      return apiRequest("DELETE", `/api/recorded-statements/${statementId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/recorded-statements?caseId=${caseId}`] });
      toast({ title: "Statement deleted" });
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: async (statementId: number) => {
      return apiRequest("POST", `/api/recorded-statements/${statementId}/reprocess`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [`/api/recorded-statements?caseId=${caseId}`] });
      toast({ 
        title: "Reprocessing started",
        description: "The document is being processed again. Refresh in a few moments to see results."
      });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive",
        title: "Reprocess failed",
        description: error.message || "Could not reprocess this document"
      });
    },
  });

  const isStuckInProcessing = (statement: RecordedStatement) => {
    const hasNoResults = !statement.aiSummary && statement.credibilityScore === null;
    const isProcessing = statement.analysisStatus === "processing" || !statement.analysisStatus;
    return hasNoResults && isProcessing;
  };

  const resetForm = () => {
    setFormData({
      title: "",
      statementType: "interview",
      otherTypeDetail: "",
      description: "",
      statementDate: "",
      location: "",
      speakerName: "",
      speakerRole: "",
      interviewerName: "",
      isPrivileged: false,
      privilegeNotes: "",
    });
    setUploadFiles([]);
    setUploadProgress(0);
    setCurrentUploadIndex(0);
    setIsUploading(false);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No files selected",
        description: "Please select at least one file to upload.",
      });
      return;
    }
    
    if (formData.statementType === "other" && !formData.otherTypeDetail.trim()) {
      toast({
        variant: "destructive",
        title: "Missing required field",
        description: "Please specify the statement type.",
      });
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < uploadFiles.length; i++) {
      setCurrentUploadIndex(i);
      setUploadProgress(Math.round((i / uploadFiles.length) * 100));
      
      const file = uploadFiles[i];
      const data = new FormData();
      data.append("caseId", caseId);
      
      // For multi-file upload, we don't use form metadata (auto-generate everything)
      if (uploadFiles.length === 1) {
        // Single file - use form data if provided
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== "" && value !== null) {
            data.append(key, String(value));
          }
        });
      } else {
        // Multiple files - use defaults, only apply statement type
        data.append("statementType", formData.statementType);
        if (formData.statementType === "other" && formData.otherTypeDetail) {
          data.append("otherTypeDetail", formData.otherTypeDetail);
        }
        if (formData.isPrivileged) {
          data.append("isPrivileged", "true");
          if (formData.privilegeNotes) {
            data.append("privilegeNotes", formData.privilegeNotes);
          }
        }
      }
      data.append("file", file);

      try {
        const response = await fetch("/api/recorded-statements", {
          method: "POST",
          body: data,
          credentials: "include",
        });
        if (!response.ok) {
          failCount++;
        } else {
          // Check if this was a zip file that created multiple statements
          const isZipFile = file.name.toLowerCase().endsWith(".zip") || 
                           file.type === "application/zip" || 
                           file.type === "application/x-zip-compressed";
          
          if (isZipFile) {
            try {
              const result = await response.json();
              if (result.count && result.count > 0) {
                successCount += result.count;
              } else {
                successCount++;
              }
            } catch {
              // If JSON parse fails for some reason, count as one success
              successCount++;
            }
          } else {
            // Regular file upload - just count as one success
            successCount++;
          }
        }
      } catch (error) {
        failCount++;
      }
    }

    setUploadProgress(100);
    queryClient.invalidateQueries({ queryKey: [`/api/recorded-statements?caseId=${caseId}`] });
    setIsUploadDialogOpen(false);
    resetForm();

    if (failCount === 0) {
      toast({
        title: `${successCount} statement${successCount > 1 ? 's' : ''} uploaded`,
        description: "The recordings are being processed. AI analysis will begin shortly.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Some uploads failed",
        description: `${successCount} succeeded, ${failCount} failed`,
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500"><PlayCircle className="h-3 w-3 mr-1" />Recording</Badge>;
      case "paused":
        return <Badge variant="secondary"><PauseCircle className="h-3 w-3 mr-1" />Paused</Badge>;
      case "completed":
        return <Badge variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAnalysisStatusBadge = (statement: RecordedStatement) => {
    const { analysisStatus, aiSummary, credibilityScore } = statement;
    
    // If we have AI summary or credibility score, show as analyzed even if status wasn't updated
    if (aiSummary || credibilityScore !== null) {
      return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Analyzed</Badge>;
    }
    
    switch (analysisStatus) {
      case "completed":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Analyzed</Badge>;
      case "processing":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    }
  };
  
  const getDisplayDate = (statement: RecordedStatement) => {
    if (statement.statementDate) {
      return format(new Date(statement.statementDate), "MMM d, yyyy");
    }
    return format(new Date(statement.createdAt), "MMM d, yyyy");
  };
  
  const getDateSource = (statement: RecordedStatement) => {
    if (statement.statementDate) {
      return null; // No label needed for statement date
    }
    return "(uploaded)";
  };

  const getFileTypeIcon = (fileType: string | null) => {
    switch (fileType) {
      case "video":
        return <Video className="h-4 w-4 text-blue-500" />;
      case "audio":
        return <AudioLines className="h-4 w-4 text-green-500" />;
      case "transcript":
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <FileType className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSessionTypeLabel = (type: string, otherDetail?: string | null) => {
    if (type === "other" && otherDetail) {
      return otherDetail;
    }
    const labels: Record<string, string> = {
      interview: "Witness Interview",
      deposition: "Deposition",
      client_meeting: "Client Meeting",
      strategy_session: "Strategy Session",
      negotiation: "Negotiation",
      expert_testimony: "Expert Testimony",
      police_statement: "Police Statement",
      regulatory_hearing: "Regulatory Hearing",
      other: "Other",
    };
    return labels[type] || type;
  };

  const formatDuration = (startedAt: string | null, endedAt: string | null) => {
    if (!startedAt) return "Not started";
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getCredibilityColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const isLoading = sessionsLoading || statementsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Case Recordings & Statements
          </h2>
          <p className="text-sm text-muted-foreground">
            Live recordings, depositions, interviews, and witness statements
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} data-testid="button-import-session">
            <FolderInput className="h-4 w-4 mr-2" />
            Import Session
          </Button>
          <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)} data-testid="button-upload-statement">
            <Upload className="h-4 w-4 mr-2" />
            Upload Statement
          </Button>
          <Link href={`/ambient-intelligence?caseId=${caseId}`}>
            <Button data-testid="button-new-recording">
              <Mic className="h-4 w-4 mr-2" />
              Live Recording
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="statements" className="w-full">
        <TabsList>
          <TabsTrigger value="statements" data-testid="tab-statements">
            <FileText className="h-4 w-4 mr-2" />
            Recorded Statements ({statements.length})
          </TabsTrigger>
          <TabsTrigger value="ambient" data-testid="tab-ambient">
            <Mic className="h-4 w-4 mr-2" />
            Live Recordings ({sessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statements" className="mt-4">
          {statements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recorded Statements</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Upload video, audio, or transcript files of depositions, interviews, and witness statements. 
                  AI will automatically transcribe, summarize, and analyze credibility.
                </p>
                <Button onClick={() => setIsUploadDialogOpen(true)} data-testid="button-upload-first-statement">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Statement
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {statements.map((statement) => (
                  <Link key={statement.id} href={`/cases/${caseId}/statements/${statement.id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`statement-card-${statement.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base flex items-center gap-2">
                              {getFileTypeIcon(statement.fileType)}
                              <span className="truncate">{statement.title}</span>
                              {statement.isPrivileged && (
                                <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {getSessionTypeLabel(statement.statementType, statement.otherTypeDetail)}
                              </Badge>
                              {getAnalysisStatusBadge(statement)}
                              {statement.credibilityScore !== null && (
                                <Badge variant="outline" className={`text-xs ${getCredibilityColor(statement.credibilityScore)}`}>
                                  Credibility: {statement.credibilityScore}%
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                              <Button variant="ghost" size="icon" data-testid={`button-statement-menu-${statement.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild data-testid={`button-view-statement-${statement.id}`}>
                                <Link href={`/cases/${caseId}/statements/${statement.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {isStuckInProcessing(statement) && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    reprocessMutation.mutate(statement.id);
                                  }}
                                  disabled={reprocessMutation.isPending}
                                  data-testid={`button-reprocess-statement-${statement.id}`}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  {reprocessMutation.isPending ? "Reprocessing..." : "Reprocess"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteMutation.mutate(statement.id);
                                }}
                                data-testid={`button-delete-statement-${statement.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span className="truncate">{statement.speakerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {getDisplayDate(statement)}
                            {getDateSource(statement) && (
                              <span className="text-xs text-muted-foreground/60 ml-1">{getDateSource(statement)}</span>
                            )}
                          </span>
                        </div>
                        {statement.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{statement.location}</span>
                          </div>
                        )}
                        {statement.fileName && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileType className="h-4 w-4" />
                            <span className="truncate">{formatFileSize(statement.fileSizeBytes)}</span>
                          </div>
                        )}
                      </div>

                      {statement.aiSummary && (
                        <Collapsible className="mt-3">
                          <CollapsibleTrigger asChild>
                            <button 
                              className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                              data-testid={`button-toggle-summary-${statement.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>AI Summary</span>
                              <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 border-l-2 border-purple-400">
                              {statement.aiSummary}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {statement.description && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          <span className="font-medium">Notes:</span> {statement.description}
                        </div>
                      )}

                      {statement.isPrivileged && statement.privilegeNotes && (
                        <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-sm">
                          <div className="flex items-center gap-2 font-medium text-amber-600">
                            <Shield className="h-4 w-4" />
                            Privileged
                          </div>
                          <p className="text-muted-foreground mt-1">{statement.privilegeNotes}</p>
                        </div>
                      )}
                    </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="ambient" className="mt-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mic className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Live Recordings</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Start an ambient intelligence session and link it to this case to capture 
                  meeting transcripts with real-time AI document suggestions.
                </p>
                <Link href={`/ambient-intelligence?caseId=${caseId}`}>
                  <Button data-testid="button-start-first-recording">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {sessions.map((session) => (
                  <Card key={session.id} className="hover-elevate" data-testid={`recording-card-${session.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Mic className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="truncate">{session.sessionName}</span>
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getSessionTypeLabel(session.sessionType)}
                            </Badge>
                            {getStatusBadge(session.status)}
                          </CardDescription>
                        </div>
                        <Link href={`/ambient-intelligence/${session.id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-recording-${session.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(session.createdAt), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(session.startedAt, session.endedAt)}</span>
                        </div>
                        {session.participantNames && session.participantNames.length > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{session.participantNames.length} participants</span>
                          </div>
                        )}
                        {session.fullTranscript && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>Transcript available</span>
                          </div>
                        )}
                      </div>

                      {session.aiSummary && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm font-medium mb-2">
                            <Brain className="h-4 w-4 text-primary" />
                            AI Summary
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {session.aiSummary}
                          </p>
                        </div>
                      )}

                      {session.notes && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          <span className="font-medium">Notes:</span> {session.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Recorded Statement
            </DialogTitle>
            <DialogDescription>
              Upload video, audio, or transcript files. AI will automatically transcribe audio/video 
              and analyze for credibility, key moments, and summary.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                id="statement-file"
                className="hidden"
                accept="video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,application/zip,application/x-zip-compressed"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    setUploadFiles(prev => [...prev, ...files]);
                    // Only set title if single file and no title yet
                    if (files.length === 1 && uploadFiles.length === 0 && !formData.title) {
                      setFormData(prev => ({ ...prev, title: files[0].name.replace(/\.[^/.]+$/, "") }));
                    }
                  }
                  e.target.value = "";
                }}
                data-testid="input-statement-file"
              />
              <label htmlFor="statement-file" className="cursor-pointer">
                {uploadFiles.length > 0 ? (
                  <div className="text-left space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium">{uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} selected</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.preventDefault(); setUploadFiles([]); }}
                        data-testid="button-clear-files"
                      >
                        Clear all
                      </Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {uploadFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            {file.type.startsWith("video/") ? <Video className="h-4 w-4 text-blue-500 flex-shrink-0" /> :
                             file.type.startsWith("audio/") ? <AudioLines className="h-4 w-4 text-green-500 flex-shrink-0" /> :
                             <FileText className="h-4 w-4 text-orange-500 flex-shrink-0" />}
                            <span className="truncate">{file.name}</span>
                            <span className="text-muted-foreground flex-shrink-0">({formatFileSize(file.size)})</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => { e.preventDefault(); removeFile(index); }}
                            data-testid={`button-remove-file-${index}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-2">Click to add more files</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium">Drop files or click to upload</p>
                    <p className="text-sm text-muted-foreground">Video, audio, or document files (multiple allowed)</p>
                  </div>
                )}
              </label>
            </div>

            {uploadFiles.length > 1 && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p>Uploading {uploadFiles.length} files. Titles and speaker names will be auto-generated from content.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {uploadFiles.length <= 1 && (
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    placeholder="Auto-generated if left blank"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-statement-title"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="statementType">Type</Label>
                <Select 
                  value={formData.statementType} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, statementType: v, otherTypeDetail: v === "other" ? prev.otherTypeDetail : "" }))}
                >
                  <SelectTrigger id="statementType" data-testid="select-statement-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposition">Deposition</SelectItem>
                    <SelectItem value="interview">Witness Interview</SelectItem>
                    <SelectItem value="expert_testimony">Expert Testimony</SelectItem>
                    <SelectItem value="police_statement">Police Statement</SelectItem>
                    <SelectItem value="regulatory_hearing">Regulatory Hearing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.statementType === "other" && (
              <div className="space-y-2">
                <Label htmlFor="otherTypeDetail">Please Specify Type *</Label>
                <Input
                  id="otherTypeDetail"
                  placeholder="Describe the type of statement..."
                  value={formData.otherTypeDetail}
                  onChange={(e) => setFormData(prev => ({ ...prev, otherTypeDetail: e.target.value }))}
                  data-testid="input-other-type-detail"
                />
              </div>
            )}

            {uploadFiles.length <= 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="speakerName">Speaker Name (optional)</Label>
                    <Input
                      id="speakerName"
                      placeholder="Name of witness/deponent"
                      value={formData.speakerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, speakerName: e.target.value }))}
                      data-testid="input-speaker-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="speakerRole">Speaker Role</Label>
                    <Input
                      id="speakerRole"
                      placeholder="e.g., Plaintiff, Expert Witness"
                      value={formData.speakerRole}
                      onChange={(e) => setFormData(prev => ({ ...prev, speakerRole: e.target.value }))}
                      data-testid="input-speaker-role"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="statementDate">Statement Date</Label>
                    <Input
                      id="statementDate"
                      type="date"
                      value={formData.statementDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, statementDate: e.target.value }))}
                      data-testid="input-statement-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Conference Room A"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      data-testid="input-location"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewerName">Interviewer/Attorney</Label>
                  <Input
                    id="interviewerName"
                    placeholder="Name of questioning attorney"
                    value={formData.interviewerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewerName: e.target.value }))}
                    data-testid="input-interviewer-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Notes / Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Any additional context or notes about this statement..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    data-testid="input-description"
                  />
                </div>
              </>
            )}

            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <Label htmlFor="isPrivileged" className="font-medium">Mark as Privileged</Label>
                </div>
                <Switch
                  id="isPrivileged"
                  checked={formData.isPrivileged}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivileged: checked }))}
                  data-testid="switch-privileged"
                />
              </div>
              {formData.isPrivileged && (
                <div className="mt-3">
                  <Label htmlFor="privilegeNotes" className="text-sm">Privilege Notes</Label>
                  <Textarea
                    id="privilegeNotes"
                    placeholder="Describe the basis for privilege claim..."
                    value={formData.privilegeNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, privilegeNotes: e.target.value }))}
                    rows={2}
                    className="mt-1"
                    data-testid="input-privilege-notes"
                  />
                </div>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading {currentUploadIndex + 1} of {uploadFiles.length}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsUploadDialogOpen(false); resetForm(); }} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || uploadFiles.length === 0 || (formData.statementType === "other" && !formData.otherTypeDetail.trim())}
              data-testid="button-submit-upload"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadFiles.length > 1 ? `Upload ${uploadFiles.length} Files` : "Upload Statement"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Session Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderInput className="h-5 w-5" />
              Import Recording Session
            </DialogTitle>
            <DialogDescription>
              Link an existing recording session to this case. The session will appear in this case's recordings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {unlinkedLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : unlinkedSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No Unlinked Sessions</p>
                <p className="text-sm">All recording sessions are already linked to cases.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {unlinkedSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSessionToImport === session.id 
                          ? "border-primary bg-primary/5" 
                          : "hover-elevate"
                      }`}
                      onClick={() => setSelectedSessionToImport(session.id)}
                      data-testid={`import-session-${session.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{session.sessionName}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">
                              {session.sessionType?.replace("_", " ") || "Other"}
                            </Badge>
                            {session.status === "completed" && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {session.createdAt && formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      {session.participantNames && session.participantNames.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {session.participantNames.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImportDialogOpen(false);
                setSelectedSessionToImport(null);
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedSessionToImport && linkSessionMutation.mutate(selectedSessionToImport)}
              disabled={!selectedSessionToImport || linkSessionMutation.isPending}
              data-testid="button-confirm-import"
            >
              {linkSessionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Import to Case
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
