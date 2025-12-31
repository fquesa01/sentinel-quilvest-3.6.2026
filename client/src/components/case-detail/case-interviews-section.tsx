import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import InterviewInvitesPanel from "@/components/interviews/interview-invites-panel";
import { CourtTranscript } from "@/components/court-transcript";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Calendar, 
  Plus, 
  Video, 
  FileText, 
  Shield, 
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Play,
  Search,
  Filter,
  Radio,
  ExternalLink,
  Copy,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Mic,
  Download,
  BookOpen,
  Trash2,
  ListPlus,
  Maximize2,
  MessageSquare,
  Send,
  X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Interview, Case, InterviewTemplate, LiveInterviewSession, InterviewResponse } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

interface CaseInterviewsSectionProps {
  caseId: string;
  caseData: Case;
}

export function CaseInterviewsSection({ caseId, caseData }: CaseInterviewsSectionProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState("");
  const [selectedSummary, setSelectedSummary] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mainTab, setMainTab] = useState("live-sessions");
  const [formData, setFormData] = useState({
    interviewType: "fact_finding",
    scheduledFor: "",
    intervieweeName: "",
    intervieweeEmail: "",
    intervieweeJurisdiction: "",
    notes: "",
    consentRequired: "true",
    interviewTemplateId: "",
    deliveryChannel: "email",
    intervieweePhone: "",
    templateId: "",
    questions: [] as string[],
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: interviews, isLoading } = useQuery<Interview[]>({
    queryKey: [`/api/cases/${caseId}/interviews`],
  });

  const { data: templates } = useQuery<InterviewTemplate[]>({
    queryKey: ["/api/interview-templates"],
  });

  const { data: liveSessions, isLoading: isLoadingLive } = useQuery<LiveInterviewSession[]>({
    queryKey: [`/api/live-interview-sessions?caseId=${caseId}`],
  });

  const { data: interviewsWithResponses, isLoading: isLoadingWithResponses } = useQuery<{ interview: Interview; responses: InterviewResponse[] }[]>({
    queryKey: [`/api/interviews/with-responses?caseId=${caseId}`],
  });

  const [expandedCompletedId, setExpandedCompletedId] = useState<string | null>(null);
  const [responseIndices, setResponseIndices] = useState<Record<string, number>>({});
  
  const [courtTranscriptOpen, setCourtTranscriptOpen] = useState(false);
  const [courtTranscriptData, setCourtTranscriptData] = useState<{
    intervieweeName: string;
    interviewDate: string;
    caseNumber?: string;
    caseName?: string;
    questions: { questionIndex: number; questionText: string; answerText: string; recordedAt?: Date | string }[];
    caseId?: string;
    interviewId?: string;
  } | null>(null);

  const [newQuestionText, setNewQuestionText] = useState("");
  const [deleteQuestionConfirm, setDeleteQuestionConfirm] = useState<{
    open: boolean;
    interviewId: string;
    questionIndex: number;
    questionText: string;
  }>({ open: false, interviewId: "", questionIndex: -1, questionText: "" });

  const [expandedSummaryData, setExpandedSummaryData] = useState<{
    open: boolean;
    interviewId: string;
    intervieweeName: string;
    summaryText: string;
    responses: InterviewResponse[];
  } | null>(null);
  const [followUpMessages, setFollowUpMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [isAskingFollowUp, setIsAskingFollowUp] = useState(false);

  const [addToFindingsOpen, setAddToFindingsOpen] = useState(false);
  const [addToFindingsData, setAddToFindingsData] = useState<{
    interview: Interview;
    responses: InterviewResponse[];
  } | null>(null);
  const [findingsFormData, setFindingsFormData] = useState({
    title: "",
    entryType: "note",
    includeTranscript: true,
    includeSummary: true,
    notes: "",
  });

  const [generatingSummary, setGeneratingSummary] = useState<Set<string>>(new Set());
  const [transcribingResponse, setTranscribingResponse] = useState<Set<string>>(new Set());

  const liveSessionStats = {
    live: liveSessions?.filter(s => s.status === "in_progress").length || 0,
    scheduled: liveSessions?.filter(s => s.status === "scheduled").length || 0,
    completed: liveSessions?.filter(s => s.status === "completed").length || 0,
  };

  const filteredLiveSessions = liveSessions?.filter(session => {
    if (statusFilter !== "all" && session.status !== statusFilter) return false;
    if (searchQuery) {
      const interview = interviews?.find(i => i.id === session.interviewId);
      const searchLower = searchQuery.toLowerCase();
      return (
        interview?.intervieweeName?.toLowerCase().includes(searchLower) ||
        interview?.intervieweeEmail?.toLowerCase().includes(searchLower) ||
        session.roomId?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const scheduledForDate = new Date(data.scheduledFor);
      return await apiRequest("POST", "/api/interviews", {
        ...data,
        caseId,
        scheduledFor: scheduledForDate.toISOString(),
        interviewerIds: [user?.id],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/interviews`] });
      setScheduleOpen(false);
      resetForm();
      toast({
        title: "Interview Scheduled",
        description: "The interview has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule interview",
        variant: "destructive",
      });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async (responseId: string) => {
      setTranscribingResponse(prev => new Set(prev).add(responseId));
      return await apiRequest("POST", `/api/interview-responses/${responseId}/transcribe`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/interviews/with-responses?caseId=${caseId}`] });
      toast({
        title: "Transcription Complete",
        description: "The interview response has been transcribed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe response",
        variant: "destructive",
      });
    },
    onSettled: (_, __, responseId) => {
      setTranscribingResponse(prev => {
        const newSet = new Set(prev);
        newSet.delete(responseId);
        return newSet;
      });
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      setGeneratingSummary(prev => new Set(prev).add(interviewId));
      return await apiRequest("POST", `/api/interviews/${interviewId}/generate-summary`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/interviews/with-responses?caseId=${caseId}`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/interviews`] });
      toast({
        title: "Summary Generated",
        description: "AI summary has been generated for this interview.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Summary Generation Failed",
        description: error.message || "Failed to generate AI summary",
        variant: "destructive",
      });
    },
    onSettled: (_, __, interviewId) => {
      setGeneratingSummary(prev => {
        const newSet = new Set(prev);
        newSet.delete(interviewId);
        return newSet;
      });
    },
  });

  const addToFindingsMutation = useMutation({
    mutationFn: async (data: {
      interview: Interview;
      responses: InterviewResponse[];
      title: string;
      entryType: string;
      includeTranscript: boolean;
      includeSummary: boolean;
      notes: string;
    }) => {
      let content = "";
      
      if (data.includeSummary && data.interview.aiSummaryText) {
        content += `## AI Summary\n\n${data.interview.aiSummaryText}\n\n`;
      }
      
      if (data.includeTranscript) {
        const transcribedResponses = data.responses.filter(r => r.transcriptText);
        if (transcribedResponses.length > 0) {
          content += `## Interview Transcript\n\n`;
          transcribedResponses.forEach((r) => {
            content += `**Q${r.questionIndex + 1}: ${r.questionText}**\n\n${r.transcriptText}\n\n---\n\n`;
          });
        }
      }
      
      if (data.notes) {
        content += `## Notes\n\n${data.notes}\n`;
      }
      
      const finding = await apiRequest("POST", `/api/cases/${caseId}/findings`, {
        title: data.title,
        content: content.trim() || "Interview record",
        entryType: data.entryType,
        summary: `Interview with ${data.interview.intervieweeName}`,
        categories: [],
      });
      
      const findingData = await finding.json();
      
      await apiRequest("POST", `/api/findings/${findingData.id}/evidence-links`, {
        targetType: "interview",
        targetId: data.interview.id,
        targetTitle: `Interview: ${data.interview.intervieweeName}`,
        targetExcerpt: data.interview.aiSummaryText?.substring(0, 200) || "Recorded interview",
        notes: "Auto-linked from interview",
      });
      
      return findingData;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/findings`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings", "counts"] });
      setAddToFindingsOpen(false);
      setAddToFindingsData(null);
      setFindingsFormData({
        title: "",
        entryType: "note",
        includeTranscript: true,
        includeSummary: true,
        notes: "",
      });
      toast({
        title: "Added to Findings",
        description: "The interview has been added to your case findings with an evidence link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Finding",
        description: error.message || "Could not add interview to findings",
        variant: "destructive",
      });
    },
  });

  const [videoMeetingOpen, setVideoMeetingOpen] = useState(false);
  const [videoMeetingForm, setVideoMeetingForm] = useState({
    title: "",
    description: "",
    meetingType: "deposition",
  });

  const createVideoMeetingMutation = useMutation({
    mutationFn: async (data: typeof videoMeetingForm) => {
      const res = await apiRequest("POST", "/api/video-meetings", {
        ...data,
        caseId,
        hostId: user?.id,
      });
      return res.json();
    },
    onSuccess: async (meeting) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/video-meetings"] });
      setVideoMeetingOpen(false);
      setVideoMeetingForm({ title: "", description: "", meetingType: "deposition" });
      toast({
        title: "Video Meeting Created",
        description: "Redirecting to the meeting room...",
      });
      window.location.href = `/video-meeting/${meeting.roomId}`;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create video meeting",
        variant: "destructive",
      });
    },
  });

  const handleAddToFindings = (interview: Interview, responses: InterviewResponse[]) => {
    setAddToFindingsData({ interview, responses });
    setFindingsFormData({
      title: `Interview: ${interview.intervieweeName}`,
      entryType: "note",
      includeTranscript: true,
      includeSummary: !!interview.aiSummaryText,
      notes: "",
    });
    setAddToFindingsOpen(true);
  };

  const handleGenerateSummary = (interviewId: string) => {
    generateSummaryMutation.mutate(interviewId);
  };

  const handleAskFollowUp = async () => {
    if (!followUpQuestion.trim() || !expandedSummaryData) return;
    
    const question = followUpQuestion.trim();
    setFollowUpQuestion("");
    setFollowUpMessages(prev => [...prev, { role: "user", content: question }]);
    setIsAskingFollowUp(true);
    
    try {
      const response = await apiRequest("POST", `/api/interviews/${expandedSummaryData.interviewId}/ask-followup`, {
        question,
        context: {
          summary: expandedSummaryData.summaryText,
          responses: expandedSummaryData.responses.map(r => ({
            question: r.questionText,
            answer: r.transcriptText
          }))
        }
      });
      
      const result = await response.json();
      setFollowUpMessages(prev => [...prev, { role: "assistant", content: result.answer }]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
      setFollowUpMessages(prev => prev.slice(0, -1));
    } finally {
      setIsAskingFollowUp(false);
    }
  };

  const openExpandedSummary = (interviewId: string, intervieweeName: string, summaryText: string, responses: InterviewResponse[]) => {
    setExpandedSummaryData({
      open: true,
      interviewId,
      intervieweeName,
      summaryText,
      responses,
    });
    setFollowUpMessages([]);
    setFollowUpQuestion("");
  };

  const closeExpandedSummary = () => {
    setExpandedSummaryData(null);
    setFollowUpMessages([]);
    setFollowUpQuestion("");
  };

  const resetForm = () => {
    setFormData({
      interviewType: "fact_finding",
      scheduledFor: "",
      intervieweeName: "",
      intervieweeEmail: "",
      intervieweeJurisdiction: "",
      notes: "",
      consentRequired: "true",
      interviewTemplateId: "",
      deliveryChannel: "email",
      intervieweePhone: "",
      templateId: "",
      questions: [],
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    // Handle "none" selection - clear template
    if (templateId === "none") {
      setFormData(prev => ({
        ...prev,
        templateId: "",
        questions: [],
      }));
      return;
    }
    
    const template = templates?.find(t => t.id === templateId);
    if (template && template.baseQuestions) {
      const questions = Array.isArray(template.baseQuestions) ? template.baseQuestions : [];
      setFormData(prev => ({
        ...prev,
        templateId,
        questions: questions.map((q: any) => typeof q === "string" ? q : q.text || q.question || ""),
      }));
    }
  };

  const getLiveSessionStatusBadge = (session: LiveInterviewSession) => {
    switch (session.status) {
      case "in_progress":
        return <Badge className="bg-green-500 animate-pulse">Live Now</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{session.status}</Badge>;
    }
  };

  const getRelatedInterview = (session: LiveInterviewSession) => {
    return interviews?.find(i => i.id === session.interviewId);
  };

  const handleOpenCourtTranscript = (interview: Interview, responses: InterviewResponse[]) => {
    const questions = responses
      .filter(r => r.transcriptText)
      .map(r => ({
        questionIndex: r.questionIndex,
        questionText: r.questionText || `Question ${r.questionIndex + 1}`,
        answerText: r.transcriptText || "",
        recordedAt: r.recordedAt || undefined,
      }));

    setCourtTranscriptData({
      intervieweeName: interview.intervieweeName,
      interviewDate: interview.completedAt 
        ? format(new Date(interview.completedAt), "MMMM d, yyyy")
        : format(new Date(), "MMMM d, yyyy"),
      caseNumber: caseData.caseNumber,
      caseName: caseData.title,
      questions,
      caseId: caseId,
      interviewId: interview.id,
    });
    setCourtTranscriptOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="live-sessions" data-testid="tab-live-sessions">
            <Radio className="h-4 w-4 mr-2" />
            Live Sessions
            {liveSessionStats.live > 0 && (
              <Badge className="ml-2 bg-green-500" variant="default">{liveSessionStats.live}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">
            <Clock className="h-4 w-4 mr-2" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completed
            {interviewsWithResponses && interviewsWithResponses.length > 0 && (
              <Badge className="ml-2" variant="secondary">{interviewsWithResponses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recorded" data-testid="tab-recorded">
            <Video className="h-4 w-4 mr-2" />
            Recordings
          </TabsTrigger>
          <TabsTrigger value="ai-interviews" data-testid="tab-ai-interviews">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Interviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live-sessions" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or room ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-sessions"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in_progress">Live Now</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setScheduleOpen(true)} data-testid="btn-schedule-interview">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
            <Button variant="secondary" onClick={() => setVideoMeetingOpen(true)} data-testid="btn-start-video-meeting">
              <Video className="h-4 w-4 mr-2" />
              Start Video Meeting
            </Button>
          </div>

          {isLoadingLive ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredLiveSessions && filteredLiveSessions.length > 0 ? (
            <div className="space-y-3">
              {filteredLiveSessions.map((session) => {
                const interview = getRelatedInterview(session);
                
                return (
                  <Card key={session.id} className="hover-elevate" data-testid={`session-card-${session.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-2">
                            {getLiveSessionStatusBadge(session)}
                            {session.consentCapturedAt && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <Shield className="h-3 w-3 mr-1" />
                                Consent
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{interview?.intervieweeName || "Unknown"}</h4>
                          <p className="text-sm text-muted-foreground">{interview?.intervieweeEmail}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              Room: {session.roomId}
                            </span>
                            {session.scheduledStartTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(session.scheduledStartTime), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/live-interview/${session.roomId}`);
                              toast({
                                title: "Link Copied",
                                description: "Interview room link copied to clipboard",
                              });
                            }}
                            data-testid={`btn-copy-link-${session.id}`}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Link
                          </Button>
                          {session.status === "in_progress" ? (
                            <Button
                              size="sm"
                              onClick={() => window.open(`/live-interview/${session.roomId}`, "_blank")}
                              data-testid={`btn-join-session-${session.id}`}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Join Session
                            </Button>
                          ) : session.status === "scheduled" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/live-interview/${session.roomId}`, "_blank")}
                              data-testid={`btn-start-session-${session.id}`}
                            >
                              <Video className="h-4 w-4 mr-1" />
                              Start Session
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No live interview sessions</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Schedule an interview to start a live session
                </p>
                <Button onClick={() => setScheduleOpen(true)} data-testid="btn-schedule-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Interview
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Interview Schedule</CardTitle>
                  <CardDescription>Manage investigation interviews with full compliance workflow</CardDescription>
                </div>
                <Button onClick={() => setScheduleOpen(true)} data-testid="btn-schedule-new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Interview
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : interviews && interviews.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interviewee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Upjohn</TableHead>
                      <TableHead>Consent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.map((interview) => (
                      <TableRow key={interview.id} data-testid={`interview-${interview.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{interview.intervieweeName}</div>
                            <div className="text-sm text-muted-foreground">{interview.intervieweeEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{interview.interviewType.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          {interview.scheduledFor 
                            ? format(new Date(interview.scheduledFor), "MMM dd, yyyy h:mm a")
                            : "Not scheduled"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={interview.status === "completed" ? "default" : "secondary"}>
                            {interview.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {interview.upjohnWarningGiven ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          {interview.consentObtained ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {interview.accessToken && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const link = `${window.location.origin}/witness-interview/${interview.accessToken}`;
                                  navigator.clipboard.writeText(link);
                                  toast({
                                    title: "Link Copied",
                                    description: "Witness interview link copied to clipboard",
                                  });
                                }}
                                data-testid={`btn-copy-witness-link-${interview.id}`}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy Link
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedInterviewId(expandedInterviewId === interview.id ? null : interview.id)}
                              data-testid={`btn-toggle-details-${interview.id}`}
                            >
                              {expandedInterviewId === interview.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No interviews scheduled</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Schedule your first interview for this case
                  </p>
                  <Button onClick={() => setScheduleOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Interview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Interview Responses</CardTitle>
              <CardDescription>
                Review video and audio recordings from self-recorded witness interviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWithResponses ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : interviewsWithResponses && interviewsWithResponses.length > 0 ? (
                <div className="space-y-4">
                  {interviewsWithResponses.map(({ interview, responses }) => {
                    const isExpanded = expandedCompletedId === interview.id;
                    const totalQuestions = (interview.questions as string[] | undefined)?.length || 0;
                    const recordedCount = responses.length;
                    const selectedIdx = responseIndices[interview.id] ?? 0;
                    const currentResponse = responses.length > 0 ? responses[Math.min(selectedIdx, responses.length - 1)] : undefined;
                    
                    return (
                      <Card key={interview.id} className="overflow-hidden" data-testid={`completed-interview-${interview.id}`}>
                        <div 
                          className="p-4 cursor-pointer hover-elevate"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedCompletedId(null);
                            } else {
                              setExpandedCompletedId(interview.id);
                              setResponseIndices(prev => ({ ...prev, [interview.id]: 0 }));
                            }
                          }}
                          data-testid={`toggle-completed-${interview.id}`}
                        >
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={interview.status === "completed" ? "default" : "secondary"}>
                                  {interview.status === "completed" ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Completed
                                    </>
                                  ) : (
                                    interview.status
                                  )}
                                </Badge>
                                <Badge variant="outline">
                                  {recordedCount} / {totalQuestions} responses
                                </Badge>
                              </div>
                              <h4 className="font-medium">{interview.intervieweeName}</h4>
                              <p className="text-sm text-muted-foreground">{interview.intervieweeEmail}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right text-sm text-muted-foreground">
                                {interview.completedAt && (
                                  <div>Completed {formatDistanceToNow(new Date(interview.completedAt), { addSuffix: true })}</div>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t p-4 bg-muted/30">
                            {responses.length > 0 ? (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  {responses.map((response, idx) => (
                                    <div key={response.id} className="flex items-center gap-3">
                                      <Button
                                        size="sm"
                                        variant={selectedIdx === idx ? "default" : "outline"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setResponseIndices(prev => ({ ...prev, [interview.id]: idx }));
                                        }}
                                        data-testid={`btn-response-${response.id}`}
                                      >
                                        Q{response.questionIndex + 1}
                                        {response.transcriptText && <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />}
                                      </Button>
                                      <span 
                                        className={`text-sm line-clamp-1 flex-1 ${
                                          selectedIdx === idx ? "text-foreground font-medium" : "text-muted-foreground"
                                        }`}
                                        data-testid={`text-question-${response.id}`}
                                      >
                                        {response.questionText || `Question ${response.questionIndex + 1}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {currentResponse && (
                                  <div className="space-y-4">
                                    <div className="bg-card rounded-lg p-4 border">
                                      <Label className="text-sm font-medium text-muted-foreground">Question {currentResponse.questionIndex + 1}</Label>
                                      <p className="mt-1 font-medium">{currentResponse.questionText}</p>
                                    </div>

                                    {currentResponse.videoUrl && (
                                      <div className="bg-card rounded-lg p-4 border">
                                        <Label className="text-sm font-medium mb-2 block">Video Response</Label>
                                        <video
                                          src={currentResponse.videoUrl}
                                          controls
                                          className="w-full max-w-xl rounded-lg"
                                          data-testid={`video-response-${currentResponse.id}`}
                                        />
                                      </div>
                                    )}

                                    <div className="bg-card rounded-lg p-4 border space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">Transcript</Label>
                                        {!currentResponse.transcriptText && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              transcribeMutation.mutate(currentResponse.id);
                                            }}
                                            disabled={transcribingResponse.has(currentResponse.id)}
                                            data-testid={`btn-transcribe-${currentResponse.id}`}
                                          >
                                            {transcribingResponse.has(currentResponse.id) ? (
                                              <>
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                Transcribing...
                                              </>
                                            ) : (
                                              <>
                                                <Mic className="h-3 w-3 mr-1" />
                                                Transcribe
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                      {currentResponse.transcriptText ? (
                                        <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                                          {currentResponse.transcriptText}
                                        </div>
                                      ) : (
                                        <div className="p-3 bg-muted/50 rounded-lg text-center text-muted-foreground text-sm">
                                          No transcript available. Click "Transcribe" to generate one.
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      Recorded {currentResponse.recordedAt 
                                        ? formatDistanceToNow(new Date(currentResponse.recordedAt), { addSuffix: true })
                                        : 'Unknown time'}
                                    </div>
                                  </div>
                                )}

                                <div className="bg-card rounded-lg p-4 space-y-3 border">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-4 w-4 text-primary" />
                                      <Label className="text-sm font-medium">AI Interview Summary</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {interview.aiSummaryText && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openExpandedSummary(
                                              interview.id,
                                              interview.intervieweeName,
                                              interview.aiSummaryText || "",
                                              responses
                                            );
                                          }}
                                          data-testid={`btn-expand-summary-${interview.id}`}
                                        >
                                          <Maximize2 className="h-3 w-3 mr-1" />
                                          Expand
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant={interview.aiSummaryText ? "outline" : "default"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleGenerateSummary(interview.id);
                                        }}
                                        disabled={generatingSummary.has(interview.id) || !responses.some(r => r.transcriptText)}
                                        data-testid={`btn-generate-summary-${interview.id}`}
                                      >
                                        {generatingSummary.has(interview.id) ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            Generating...
                                          </>
                                        ) : interview.aiSummaryText ? (
                                          <>
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Regenerate
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Generate Summary
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {interview.aiSummaryText ? (
                                    <div className="p-4 bg-muted rounded-lg max-h-[400px] overflow-y-auto">
                                      <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert leading-relaxed text-foreground">
                                        {interview.aiSummaryText}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-muted/50 rounded-lg text-center text-muted-foreground text-sm">
                                      {responses.some(r => r.transcriptText) 
                                        ? "Click \"Generate Summary\" to create an AI-powered analysis of this interview."
                                        : "Transcribe at least one response before generating an AI summary."}
                                    </div>
                                  )}
                                </div>

                                {responses.some(r => r.transcriptText) && (
                                  <div className="bg-card rounded-lg p-4 space-y-3 border">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-primary" />
                                        <Label className="text-sm font-medium">Court Transcript</Label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenCourtTranscript(interview, responses);
                                          }}
                                          data-testid={`btn-court-transcript-${interview.id}`}
                                        >
                                          <FileText className="h-3 w-3 mr-1" />
                                          View Transcript
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToFindings(interview, responses);
                                          }}
                                          data-testid={`btn-add-to-findings-${interview.id}`}
                                        >
                                          <ListPlus className="h-3 w-3 mr-1" />
                                          Add to Findings
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                No responses recorded yet
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Video className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No completed interviews</h3>
                  <p className="text-muted-foreground text-center">
                    Interview responses from the self-recording platform will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recorded" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Video Recordings</CardTitle>
              <CardDescription>Review completed interview recordings with AI analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {interviewsWithResponses && interviewsWithResponses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interviewee</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead>Transcribed</TableHead>
                      <TableHead>AI Summary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviewsWithResponses.map(({ interview, responses }) => (
                      <TableRow key={interview.id} data-testid={`recording-${interview.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{interview.intervieweeName}</div>
                            <div className="text-sm text-muted-foreground">{interview.intervieweeEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {interview.completedAt 
                            ? format(new Date(interview.completedAt), "MMM dd, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {responses.filter(r => r.videoUrl).length} videos
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {responses.filter(r => r.transcriptText).length === responses.length ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {responses.filter(r => r.transcriptText).length}/{responses.length}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {interview.aiSummaryText ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setExpandedCompletedId(interview.id);
                              setMainTab("completed");
                            }}
                            data-testid={`btn-view-recording-${interview.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Video className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No recordings yet</h3>
                  <p className="text-muted-foreground text-center">
                    Completed interview recordings will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-interviews" className="space-y-4">
          <InterviewInvitesPanel cases={[caseData]} templates={templates} />
        </TabsContent>
      </Tabs>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-schedule-interview">
          <DialogHeader>
            <DialogTitle>Schedule Investigation Interview</DialogTitle>
            <DialogDescription>
              Schedule a new interview for case: {caseData.title}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Interview Type</Label>
              <Select value={formData.interviewType} onValueChange={(value) => setFormData({...formData, interviewType: value})}>
                <SelectTrigger data-testid="select-interview-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fact_finding">Fact Finding</SelectItem>
                  <SelectItem value="custodian">Custodian</SelectItem>
                  <SelectItem value="witness">Witness</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                  <SelectItem value="pre_interview">Pre-Interview (AI Remote)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.interviewType !== "pre_interview" && (
              <div className="grid gap-2">
                <Label htmlFor="template">Question Template (Optional)</Label>
                <Select 
                  value={formData.templateId} 
                  onValueChange={(value) => handleApplyTemplate(value)}
                >
                  <SelectTrigger data-testid="select-question-template">
                    <SelectValue placeholder="Select a template to pre-populate questions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Template</SelectItem>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Interviewee Name</Label>
                <Input 
                  id="name" 
                  value={formData.intervieweeName}
                  onChange={(e) => setFormData({...formData, intervieweeName: e.target.value})}
                  data-testid="input-interviewee-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Interviewee Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.intervieweeEmail}
                  onChange={(e) => setFormData({...formData, intervieweeEmail: e.target.value})}
                  data-testid="input-interviewee-email"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduled">Scheduled Date & Time</Label>
              <Input 
                id="scheduled" 
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({...formData, scheduledFor: e.target.value})}
                data-testid="input-scheduled-for"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea 
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional notes about the interview..."
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} data-testid="btn-cancel-schedule">
              Cancel
            </Button>
            <Button 
              onClick={() => scheduleMutation.mutate(formData)}
              disabled={scheduleMutation.isPending || !formData.intervieweeName || !formData.scheduledFor}
              data-testid="btn-confirm-schedule"
            >
              {scheduleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={courtTranscriptOpen} onOpenChange={setCourtTranscriptOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-court-transcript">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Court Transcript
            </DialogTitle>
            <DialogDescription>
              Formatted interview transcript for legal proceedings
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {courtTranscriptData && (
              <CourtTranscript
                intervieweeName={courtTranscriptData.intervieweeName}
                interviewDate={courtTranscriptData.interviewDate}
                caseNumber={courtTranscriptData.caseNumber}
                caseName={courtTranscriptData.caseName}
                questions={courtTranscriptData.questions}
                caseId={courtTranscriptData.caseId}
                interviewId={courtTranscriptData.interviewId}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourtTranscriptOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!expandedSummaryData?.open} onOpenChange={(open) => !open && closeExpandedSummary()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-expanded-summary">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Interview Summary - {expandedSummaryData?.intervieweeName}
            </DialogTitle>
            <DialogDescription>
              Full AI-generated analysis with the ability to ask follow-up questions
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="p-6 bg-muted rounded-lg">
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed text-foreground">
                  {expandedSummaryData?.summaryText}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Ask Follow-up Questions</Label>
              </div>
              
              {followUpMessages.length > 0 && (
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {followUpMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg text-sm ${
                        msg.role === "user" 
                          ? "bg-primary/10 ml-8" 
                          : "bg-muted mr-8"
                      }`}
                    >
                      <div className="font-medium text-xs text-muted-foreground mb-1">
                        {msg.role === "user" ? "You" : "AI"}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question about this interview..."
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && followUpQuestion.trim()) {
                      e.preventDefault();
                      handleAskFollowUp();
                    }
                  }}
                  disabled={isAskingFollowUp}
                  data-testid="input-followup-question"
                />
                <Button
                  onClick={handleAskFollowUp}
                  disabled={!followUpQuestion.trim() || isAskingFollowUp}
                  data-testid="btn-send-followup"
                >
                  {isAskingFollowUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeExpandedSummary}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addToFindingsOpen} onOpenChange={setAddToFindingsOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-to-findings">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="h-5 w-5" />
              Add to Findings
            </DialogTitle>
            <DialogDescription>
              Create a finding entry from this interview with automatic evidence linking
            </DialogDescription>
          </DialogHeader>
          
          {addToFindingsData && (
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="finding-title">Finding Title</Label>
                <Input
                  id="finding-title"
                  value={findingsFormData.title}
                  onChange={(e) => setFindingsFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a title for this finding..."
                  data-testid="input-finding-title"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="finding-type">Entry Type</Label>
                <Select 
                  value={findingsFormData.entryType} 
                  onValueChange={(value) => setFindingsFormData(prev => ({ ...prev, entryType: value }))}
                >
                  <SelectTrigger id="finding-type" data-testid="select-finding-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="legal_issue">Legal Issue</SelectItem>
                    <SelectItem value="credibility">Credibility</SelectItem>
                    <SelectItem value="contradiction">Contradiction</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Content to Include</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="include-transcript"
                    checked={findingsFormData.includeTranscript}
                    onChange={(e) => setFindingsFormData(prev => ({ ...prev, includeTranscript: e.target.checked }))}
                    className="h-4 w-4"
                    data-testid="checkbox-include-transcript"
                  />
                  <Label htmlFor="include-transcript" className="text-sm font-normal">
                    Include interview transcript
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="include-summary"
                    checked={findingsFormData.includeSummary}
                    disabled={!addToFindingsData.interview.aiSummaryText}
                    onChange={(e) => setFindingsFormData(prev => ({ ...prev, includeSummary: e.target.checked }))}
                    className="h-4 w-4"
                    data-testid="checkbox-include-summary"
                  />
                  <Label htmlFor="include-summary" className="text-sm font-normal">
                    Include AI summary {!addToFindingsData.interview.aiSummaryText && "(not available)"}
                  </Label>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="finding-notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="finding-notes"
                  value={findingsFormData.notes}
                  onChange={(e) => setFindingsFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add your own notes or analysis..."
                  rows={3}
                  data-testid="textarea-finding-notes"
                />
              </div>

              <div className="bg-muted p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LinkIcon className="h-4 w-4" />
                  <span>An evidence link to this interview will be automatically created</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToFindingsOpen(false)} data-testid="btn-cancel-add-finding">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (addToFindingsData) {
                  addToFindingsMutation.mutate({
                    ...findingsFormData,
                    interview: addToFindingsData.interview,
                    responses: addToFindingsData.responses,
                  });
                }
              }}
              disabled={addToFindingsMutation.isPending || !findingsFormData.title}
              data-testid="btn-confirm-add-finding"
            >
              {addToFindingsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ListPlus className="h-4 w-4 mr-2" />
                  Add to Findings
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={videoMeetingOpen} onOpenChange={setVideoMeetingOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-video-meeting">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Start Video Meeting
            </DialogTitle>
            <DialogDescription>
              Create a new video meeting for depositions, recorded statements, or witness interviews.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meeting-title">Meeting Title</Label>
              <Input
                id="meeting-title"
                value={videoMeetingForm.title}
                onChange={(e) => setVideoMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Deposition - John Smith"
                data-testid="input-meeting-title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meeting-type">Meeting Type</Label>
              <Select 
                value={videoMeetingForm.meetingType} 
                onValueChange={(value) => setVideoMeetingForm(prev => ({ ...prev, meetingType: value }))}
              >
                <SelectTrigger data-testid="select-meeting-type">
                  <SelectValue placeholder="Select meeting type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposition">Deposition</SelectItem>
                  <SelectItem value="recorded_statement">Recorded Statement</SelectItem>
                  <SelectItem value="witness_interview">Witness Interview</SelectItem>
                  <SelectItem value="expert_consultation">Expert Consultation</SelectItem>
                  <SelectItem value="client_meeting">Client Meeting</SelectItem>
                  <SelectItem value="team_meeting">Team Meeting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meeting-description">Description (Optional)</Label>
              <Textarea
                id="meeting-description"
                value={videoMeetingForm.description}
                onChange={(e) => setVideoMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add any relevant details..."
                rows={3}
                data-testid="textarea-meeting-description"
              />
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                This meeting will be linked to case: <strong>{caseData.title}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoMeetingOpen(false)} data-testid="btn-cancel-video-meeting">
              Cancel
            </Button>
            <Button 
              onClick={() => createVideoMeetingMutation.mutate(videoMeetingForm)}
              disabled={createVideoMeetingMutation.isPending || !videoMeetingForm.title}
              data-testid="btn-start-video-meeting"
            >
              {createVideoMeetingMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Start Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
