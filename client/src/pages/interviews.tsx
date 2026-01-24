import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import InterviewTemplatesPanel from "@/components/interviews/templates-panel";
import InterviewInvitesPanel from "@/components/interviews/interview-invites-panel";
import RecordedInterviewDetailDialog from "@/components/interviews/recorded-interview-detail-dialog";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Calendar, 
  Plus, 
  Video, 
  FileText, 
  Shield, 
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  Eye,
  Play,
  Search,
  Filter,
  Radio,
  TrendingUp,
  Activity,
  Target,
  Users,
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
  HelpCircle,
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
import type { Interview, Case, InterviewTemplate, RecordedInterview, LiveInterviewSession, InterviewAnalysis, InterviewResponse, VideoMeeting } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";

export default function Interviews() {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null);
  const [recordedDetailOpen, setRecordedDetailOpen] = useState(false);
  const [selectedRecordedId, setSelectedRecordedId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState("");
  const [selectedSummary, setSelectedSummary] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [mainTab, setMainTab] = useState("live-sessions");
  const [formData, setFormData] = useState({
    caseId: "",
    interviewType: "fact_finding",
    scheduledFor: "",
    intervieweeName: "",
    intervieweeEmail: "",
    intervieweeJurisdiction: "",
    notes: "",
    consentRequired: "true",
    // Pre-Interview specific fields
    interviewTemplateId: "",
    deliveryChannel: "email",
    intervieweePhone: "",
    // Template and questions for all interview types
    templateId: "",
    questions: [] as string[],
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: interviews, isLoading } = useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
  });

  const { data: cases } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: templates } = useQuery<InterviewTemplate[]>({
    queryKey: ["/api/interview-templates"],
  });

  const { data: recordedInterviews, isLoading: isLoadingRecorded } = useQuery<RecordedInterview[]>({
    queryKey: ["/api/recorded-interviews"],
  });

  // Interviews with recorded responses (self-recording platform)
  const { data: interviewsWithResponses, isLoading: isLoadingWithResponses } = useQuery<{ interview: Interview; responses: InterviewResponse[] }[]>({
    queryKey: ["/api/interviews/with-responses"],
  });

  // State for expanded completed interview responses - maps interviewId to selected response index
  const [expandedCompletedId, setExpandedCompletedId] = useState<string | null>(null);
  const [responseIndices, setResponseIndices] = useState<Record<string, number>>({});
  
  // State for court transcript dialog
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

  // State for managing interview questions
  const [newQuestionText, setNewQuestionText] = useState("");
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false);
  const [selectedApplyTemplateId, setSelectedApplyTemplateId] = useState("");
  const [deleteQuestionConfirm, setDeleteQuestionConfirm] = useState<{
    open: boolean;
    interviewId: string;
    questionIndex: number;
    questionText: string;
  }>({ open: false, interviewId: "", questionIndex: -1, questionText: "" });

  // State for expanded AI summary view with follow-up questions
  const [expandedSummaryData, setExpandedSummaryData] = useState<{
    open: boolean;
    interviewId: string;
    intervieweeName: string;
    summaryText: string;
    responses: InterviewResponse[];
  } | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpMessages, setFollowUpMessages] = useState<{role: "user" | "assistant"; content: string}[]>([]);
  const [isAskingFollowUp, setIsAskingFollowUp] = useState(false);

  const { data: liveSessions, isLoading: isLoadingLive } = useQuery<LiveInterviewSession[]>({
    queryKey: ["/api/live-interview-sessions"],
  });

  // Video meetings (video conferencing)
  const { data: videoMeetings, isLoading: isLoadingVideoMeetings } = useQuery<VideoMeeting[]>({
    queryKey: ["/api/video-meetings"],
  });

  const { data: expandedInterview } = useQuery<Interview>({
    queryKey: ["/api/interviews", expandedInterviewId],
    enabled: !!expandedInterviewId,
  });

  const createInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      // Validate and convert scheduledFor to a proper date
      let scheduledForDate: Date | undefined = undefined;
      if (data.scheduledFor && data.scheduledFor.trim() !== "") {
        const parsed = new Date(data.scheduledFor);
        if (!isNaN(parsed.getTime())) {
          scheduledForDate = parsed;
        }
      }
      
      if (!scheduledForDate) {
        throw new Error("Please select a valid date and time for the interview");
      }
      
      return await apiRequest("POST", "/api/interviews", {
        ...data,
        scheduledFor: scheduledForDate.toISOString(),
        interviewerIds: [user?.id],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      setScheduleOpen(false);
      resetForm();
      toast({
        title: "Interview Scheduled",
        description: "Investigation interview scheduled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPreInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/interview-invites", {
        caseId: data.caseId,
        interviewTemplateId: data.interviewTemplateId,
        intervieweeName: data.intervieweeName,
        intervieweeEmail: data.intervieweeEmail || undefined,
        intervieweePhone: data.intervieweePhone || undefined,
        deliveryChannel: data.deliveryChannel,
        status: "draft",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-invites"] });
      setScheduleOpen(false);
      resetForm();
      toast({
        title: "Pre-Interview Invite Created",
        description: "AI pre-interview invitation created successfully. You can now send it to the interviewee.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateInterviewMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Interview> }) => {
      return await apiRequest("PATCH", `/api/interviews/${id}`, updates);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/interviews", variables.id] });
      toast({
        title: "Interview Updated",
        description: "Interview details updated successfully",
      });
    },
  });

  // Transcribe a specific interview response
  const transcribeResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      return await apiRequest("POST", `/api/interview-responses/${responseId}/transcribe`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/interviews/with-responses"] });
      await queryClient.refetchQueries({ queryKey: ["/api/interviews/with-responses"] });
      toast({
        title: "Transcription Complete",
        description: "The interview response has been transcribed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transcription Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate AI summary for an interview
  const generateSummaryMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      return await apiRequest("POST", `/api/interviews/${interviewId}/generate-summary`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/interviews/with-responses"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      await queryClient.refetchQueries({ queryKey: ["/api/interviews/with-responses"] });
      toast({
        title: "AI Summary Generated",
        description: "The interview summary has been generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Summary Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Track which responses are being transcribed
  const [transcribingResponses, setTranscribingResponses] = useState<Set<string>>(new Set());
  const [generatingSummary, setGeneratingSummary] = useState<Set<string>>(new Set());

  const handleTranscribeResponse = async (responseId: string) => {
    setTranscribingResponses(prev => new Set(Array.from(prev).concat(responseId)));
    try {
      await transcribeResponseMutation.mutateAsync(responseId);
    } finally {
      setTranscribingResponses(prev => {
        const next = new Set(prev);
        next.delete(responseId);
        return next;
      });
    }
  };

  const handleGenerateSummary = async (interviewId: string) => {
    setGeneratingSummary(prev => new Set(Array.from(prev).concat(interviewId)));
    try {
      await generateSummaryMutation.mutateAsync(interviewId);
    } finally {
      setGeneratingSummary(prev => {
        const next = new Set(prev);
        next.delete(interviewId);
        return next;
      });
    }
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
      caseId: "",
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

  // Handle applying a template to an interview (populates questions)
  const handleApplyTemplateToForm = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template && template.baseQuestions) {
      const questions = Array.isArray(template.baseQuestions) 
        ? template.baseQuestions as string[]
        : [];
      setFormData({
        ...formData,
        templateId,
        questions,
      });
    }
  };

  // Handle applying a template to an existing interview
  const handleApplyTemplateToInterview = async (interviewId: string, templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template && template.baseQuestions) {
      const templateQuestions = Array.isArray(template.baseQuestions) 
        ? template.baseQuestions as string[]
        : [];
      
      // Merge with existing questions (avoiding duplicates)
      const existingQuestions = (expandedInterview?.questions as string[]) || [];
      const newQuestions = [...existingQuestions];
      for (const q of templateQuestions) {
        if (!newQuestions.includes(q)) {
          newQuestions.push(q);
        }
      }
      
      await updateInterviewMutation.mutateAsync({
        id: interviewId,
        updates: { 
          templateId,
          questions: newQuestions,
        },
      });
      setApplyTemplateDialogOpen(false);
      setSelectedApplyTemplateId("");
    }
  };

  // Handle adding a single question to an interview
  const handleAddQuestion = async (interviewId: string, questionText: string) => {
    if (!questionText.trim()) return;
    
    const existingQuestions = (expandedInterview?.questions as string[]) || [];
    const newQuestions = [...existingQuestions, questionText.trim()];
    
    await updateInterviewMutation.mutateAsync({
      id: interviewId,
      updates: { questions: newQuestions },
    });
    setNewQuestionText("");
    toast({
      title: "Question Added",
      description: "The question has been added to this interview",
    });
  };

  // Handle opening confirmation dialog for question removal
  const handleRemoveQuestion = (interviewId: string, questionIndex: number, questionText: string) => {
    setDeleteQuestionConfirm({
      open: true,
      interviewId,
      questionIndex,
      questionText,
    });
  };

  // Handle confirmed question removal
  const handleConfirmRemoveQuestion = async () => {
    const { interviewId, questionIndex, questionText } = deleteQuestionConfirm;
    const existingQuestions = (expandedInterview?.questions as string[]) || [];
    
    // Validate the question at the index still matches what user selected
    // If it doesn't match, find by text content instead to handle stale data
    let newQuestions: string[];
    if (existingQuestions[questionIndex] === questionText) {
      newQuestions = existingQuestions.filter((_, idx) => idx !== questionIndex);
    } else {
      // Find first matching question by text
      const matchIndex = existingQuestions.findIndex(q => q === questionText);
      if (matchIndex === -1) {
        toast({
          title: "Question Not Found",
          description: "The question may have already been removed",
          variant: "destructive",
        });
        setDeleteQuestionConfirm({ open: false, interviewId: "", questionIndex: -1, questionText: "" });
        return;
      }
      newQuestions = existingQuestions.filter((_, idx) => idx !== matchIndex);
    }
    
    try {
      await updateInterviewMutation.mutateAsync({
        id: interviewId,
        updates: { questions: newQuestions },
      });
      toast({
        title: "Question Removed",
        description: "The question has been removed from this interview",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove question",
        variant: "destructive",
      });
    }
    setDeleteQuestionConfirm({ open: false, interviewId: "", questionIndex: -1, questionText: "" });
  };

  const handleSchedule = () => {
    if (formData.interviewType === "pre_interview") {
      // Validate Pre-Interview specific fields
      if (!formData.interviewTemplateId) {
        toast({
          title: "Template Required",
          description: "Please select an interview template",
          variant: "destructive",
        });
        return;
      }
      if (formData.deliveryChannel === "sms" || formData.deliveryChannel === "both") {
        if (!formData.intervieweePhone) {
          toast({
            title: "Phone Required",
            description: "Phone number is required for SMS delivery",
            variant: "destructive",
          });
          return;
        }
      }
      if (formData.deliveryChannel === "email" || formData.deliveryChannel === "both") {
        if (!formData.intervieweeEmail) {
          toast({
            title: "Email Required",
            description: "Email is required for email delivery",
            variant: "destructive",
          });
          return;
        }
      }
      createPreInterviewMutation.mutate(formData);
    } else {
      createInterviewMutation.mutate(formData);
    }
  };

  const handleGiveUpjohnWarning = (interviewId: string) => {
    const upjohnWarning = `UPJOHN WARNING: This interview is being conducted by counsel for the company. 
I represent the company, not you individually. The attorney-client privilege belongs to the company, not to you. 
The company can waive the privilege and disclose what you tell me to third parties, including government authorities. 
Do you understand and consent to proceed with this interview?`;

    updateInterviewMutation.mutate({
      id: interviewId,
      updates: {
        upjohnWarningGiven: "true",
        upjohnWarningTimestamp: new Date() as any,
        upjohnWarningText: upjohnWarning,
        privilegeAssertedBy: user?.id,
        privilegeAssertedAt: new Date() as any,
      },
    });
  };

  const handleRecordConsent = (interviewId: string) => {
    updateInterviewMutation.mutate({
      id: interviewId,
      updates: {
        consentObtained: "true",
      },
    });
  };

  const handleUploadRecording = (interviewId: string, url: string) => {
    updateInterviewMutation.mutate({
      id: interviewId,
      updates: {
        recordingUrl: url,
      },
    });
  };

  const handleUploadTranscript = (interviewId: string, text: string, url?: string) => {
    updateInterviewMutation.mutate({
      id: interviewId,
      updates: {
        transcriptText: text,
        transcriptUrl: url,
      },
    });
  };

  const handleCompleteInterview = (interviewId: string) => {
    updateInterviewMutation.mutate({
      id: interviewId,
      updates: {
        status: "completed",
        completedAt: new Date() as any,
      },
    });
  };

  const getStatusBadge = (interview: Interview) => {
    if (interview.status === "completed") {
      return <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    if (interview.status === "cancelled") {
      return <Badge variant="outline">Cancelled</Badge>;
    }
    return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
  };

  const getPrivilegeBadge = (interview: Interview) => {
    if (interview.privilegeStatus === "attorney_client_privileged") {
      return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />Attorney-Client Privileged</Badge>;
    }
    if (interview.privilegeStatus === "work_product") {
      return <Badge variant="default"><Shield className="h-3 w-3 mr-1" />Work Product</Badge>;
    }
    return null;
  };

  const getLiveSessionStatusBadge = (session: LiveInterviewSession) => {
    switch (session.status) {
      case "in_progress":
        return <Badge className="bg-green-500 hover:bg-green-600"><Radio className="h-3 w-3 mr-1 animate-pulse" />Live</Badge>;
      case "completed":
        return <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      case "scheduled":
      default:
        return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
    }
  };

  const getRelatedInterview = (session: LiveInterviewSession) => {
    return interviews?.find(i => i.id === session.interviewId);
  };

  const getRelatedCase = (session: LiveInterviewSession) => {
    return cases?.find(c => c.id === session.caseId);
  };

  const filteredLiveSessions = liveSessions?.filter(session => {
    const interview = getRelatedInterview(session);
    const caseInfo = getRelatedCase(session);
    
    const searchMatch = searchQuery === "" || 
      interview?.intervieweeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview?.intervieweeEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseInfo?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.roomId?.toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatch = statusFilter === "all" || session.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  const liveSessionStats = {
    total: liveSessions?.length || 0,
    live: liveSessions?.filter(s => s.status === "in_progress").length || 0,
    completed: liveSessions?.filter(s => s.status === "completed").length || 0,
    scheduled: liveSessions?.filter(s => s.status === "scheduled").length || 0,
    withAnalysis: liveSessions?.filter(s => s.status === "completed").length || 0, // Placeholder for now
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between stagger-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-interviews">Investigation Interviews</h1>
          <p className="text-muted-foreground mt-1">End-to-end interview workflow with consent capture, and privilege protection</p>
        </div>
        <Button onClick={() => setScheduleOpen(true)} data-testid="button-schedule-interview">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </div>
      <div className="stagger-2">
        <InterviewTemplatesPanel />
      </div>
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4 stagger-3">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="live-sessions" data-testid="tab-live-sessions" className="text-xs sm:text-sm py-2">
            <Radio className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Live</span>
            {liveSessionStats.live > 0 && (
              <Badge className="ml-1 sm:ml-2 bg-green-500 shrink-0" variant="default">{liveSessionStats.live}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="video-conferencing" data-testid="tab-video-conferencing" className="text-xs sm:text-sm py-2">
            <Video className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Video</span>
            {videoMeetings && videoMeetings.filter(m => m.status === 'in_progress').length > 0 && (
              <Badge className="ml-1 sm:ml-2 bg-green-500 shrink-0" variant="default">
                {videoMeetings.filter(m => m.status === 'in_progress').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled" className="text-xs sm:text-sm py-2">
            <Clock className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Scheduled</span>
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed" className="text-xs sm:text-sm py-2">
            <CheckCircle2 className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Completed</span>
            {interviewsWithResponses && interviewsWithResponses.length > 0 && (
              <Badge className="ml-1 sm:ml-2 shrink-0" variant="secondary">{interviewsWithResponses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recorded" data-testid="tab-recorded" className="text-xs sm:text-sm py-2">
            <Upload className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Recordings</span>
          </TabsTrigger>
          <TabsTrigger value="ai-interviews" data-testid="tab-ai-interviews" className="text-xs sm:text-sm py-2">
            <Target className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live-sessions" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, case, or room ID..." 
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
                const caseInfo = getRelatedCase(session);
                
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
                            {session.upjohnWarningGivenAt && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                <Shield className="h-3 w-3 mr-1" />
                                Upjohn
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg">
                            {interview?.intervieweeName || "Unknown Interviewee"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {interview?.intervieweeEmail}
                          </p>
                        </div>
                        
                        <div className="flex-1 min-w-[150px]">
                          <p className="text-sm font-medium text-muted-foreground">Case</p>
                          <p className="font-medium">{caseInfo?.title || "—"}</p>
                        </div>
                        
                        <div className="flex-1 min-w-[150px]">
                          <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                          <p className="font-medium">
                            {format(new Date(session.scheduledStartTime), "MMM dd, yyyy h:mm a")}
                          </p>
                          {session.duration && (
                            <p className="text-sm text-muted-foreground">
                              Duration: {Math.floor(session.duration / 60)}m {session.duration % 60}s
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {session.status === "in_progress" && (
                            <Link href={`/live-interview?room=${session.roomId}`}>
                              <Button className="bg-green-500 hover:bg-green-600" data-testid={`button-join-${session.id}`}>
                                <Video className="h-4 w-4 mr-2" />
                                Join Session
                              </Button>
                            </Link>
                          )}
                          {session.status === "scheduled" && (
                            <Link href={`/live-interview?room=${session.roomId}`}>
                              <Button variant="default" data-testid={`button-start-${session.id}`}>
                                <Play className="h-4 w-4 mr-2" />
                                Start Session
                              </Button>
                            </Link>
                          )}
                          {session.status === "completed" && (
                            <Link href={`/interviews/${session.id}/review`}>
                              <Button variant="outline" data-testid={`button-review-${session.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No live interview sessions</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all" 
                      ? "Try adjusting your search or filter criteria" 
                      : "Schedule an interview to start a live session"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="video-conferencing" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search video meetings by title, case, or description..." 
                value={videoSearchQuery}
                onChange={(e) => setVideoSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-video-meetings"
              />
            </div>
            <Link href="/create-video-meeting">
              <Button data-testid="button-create-video-meeting">
                <Plus className="h-4 w-4 mr-2" />
                New Video Meeting
              </Button>
            </Link>
          </div>

          {isLoadingVideoMeetings ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : videoMeetings && videoMeetings.length > 0 ? (
            <div className="space-y-3">
              {videoMeetings
                .filter((meeting) => {
                  if (!videoSearchQuery) return true;
                  const query = videoSearchQuery.toLowerCase();
                  return (
                    meeting.title.toLowerCase().includes(query) ||
                    meeting.description?.toLowerCase().includes(query) ||
                    meeting.roomId.toLowerCase().includes(query)
                  );
                })
                .map((meeting) => {
                  const caseInfo = cases?.find(c => c.id === meeting.caseId);
                  
                  return (
                    <Card key={meeting.id} className="hover-elevate" data-testid={`video-meeting-card-${meeting.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2">
                              {meeting.status === "in_progress" && (
                                <Badge className="bg-green-500">
                                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                                  Live
                                </Badge>
                              )}
                              {meeting.status === "scheduled" && (
                                <Badge variant="secondary">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Scheduled
                                </Badge>
                              )}
                              {meeting.status === "completed" && (
                                <Badge variant="outline">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              <Badge variant="outline">{meeting.meetingType.replace(/_/g, " ")}</Badge>
                              {meeting.recordingEnabled === "true" && meeting.status === "in_progress" && (
                                <Badge variant="outline" className="border-red-500 text-red-600">
                                  <Video className="h-3 w-3 mr-1 animate-pulse" />
                                  Recording
                                </Badge>
                              )}
                              {meeting.recordingEnabled === "true" && meeting.status !== "in_progress" && (
                                <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground">
                                  <Video className="h-3 w-3 mr-1" />
                                  Rec Enabled
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg">{meeting.title}</h3>
                            {meeting.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{meeting.description}</p>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-[150px]">
                            <p className="text-sm font-medium text-muted-foreground">Case</p>
                            <p className="font-medium">{caseInfo?.title || "—"}</p>
                            {caseInfo?.caseNumber && (
                              <p className="text-xs text-muted-foreground">{caseInfo.caseNumber}</p>
                            )}
                          </div>

                          <div className="flex-1 min-w-[150px]">
                            <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                            {meeting.scheduledStartTime ? (
                              <>
                                <p className="font-medium">{format(new Date(meeting.scheduledStartTime), "MMM d, yyyy")}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(meeting.scheduledStartTime), "h:mm a")}</p>
                              </>
                            ) : (
                              <p className="text-muted-foreground">—</p>
                            )}
                          </div>

                          <div className="flex-1 min-w-[120px]">
                            <p className="text-sm font-medium text-muted-foreground">Duration</p>
                            {meeting.duration ? (
                              <p className="font-medium">{Math.round(meeting.duration / 60)} min</p>
                            ) : meeting.actualStartTime && !meeting.actualEndTime ? (
                              <p className="font-medium text-green-600">In progress</p>
                            ) : (
                              <p className="text-muted-foreground">—</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Link href={`/video-meeting/${meeting.roomId}`}>
                              <Button 
                                variant={meeting.status === "in_progress" ? "default" : "outline"} 
                                size="sm"
                                data-testid={`button-join-meeting-${meeting.id}`}
                              >
                                <Video className="h-4 w-4 mr-2" />
                                {meeting.status === "in_progress" ? "Join" : meeting.status === "completed" ? "View" : "Open"}
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/video-meeting/${meeting.roomId}`);
                                toast({
                                  title: "Link Copied",
                                  description: "Meeting invite link copied to clipboard.",
                                });
                              }}
                              data-testid={`button-copy-link-${meeting.id}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent className="pt-6">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Video Meetings</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first video meeting for depositions, witness interviews, or team conferences.
                </p>
                <Link href="/create-video-meeting">
                  <Button data-testid="button-create-first-video-meeting">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Video Meeting
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Accordion type="multiple" defaultValue={["schedule"]} className="space-y-4">
        <AccordionItem value="schedule">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-trigger-schedule">
              <div className="flex flex-col items-start text-left">
                <CardTitle>Interview Schedule</CardTitle>
                <CardDescription>Manage investigation interviews with full compliance workflow</CardDescription>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
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
                        <TableHead>Case</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Upjohn</TableHead>
                        <TableHead>Consent</TableHead>
                        <TableHead>Recording</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interviews.map((interview) => (
                        <>
                          <TableRow key={interview.id} data-testid={`interview-${interview.id}`} className={expandedInterviewId === interview.id ? "border-b-0" : ""}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{interview.intervieweeName}</div>
                                <div className="text-sm text-muted-foreground">{interview.intervieweeEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {cases?.find(c => c.id === interview.caseId)?.title || interview.caseId}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{interview.interviewType.replace(/_/g, " ")}</Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(interview.scheduledFor).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(interview)}</TableCell>
                            <TableCell>
                              {interview.upjohnWarningGiven === "true" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              )}
                            </TableCell>
                            <TableCell>
                              {interview.consentObtained === "true" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              )}
                            </TableCell>
                            <TableCell>
                              {interview.recordingUrl ? (
                                <Video className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Video className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {(interview as any).accessToken && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const link = `${window.location.origin}/join-interview/${(interview as any).accessToken}`;
                                      navigator.clipboard.writeText(link);
                                      toast({
                                        title: "Link Copied",
                                        description: "Interview link copied to clipboard. Share it with your interviewee.",
                                      });
                                    }}
                                    data-testid={`button-copy-link-${interview.id}`}
                                  >
                                    <LinkIcon className="h-4 w-4 mr-1" />
                                    Copy Link
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setExpandedInterviewId(expandedInterviewId === interview.id ? null : interview.id);
                                  }}
                                  data-testid={`button-view-${interview.id}`}
                                >
                                  {expandedInterviewId === interview.id ? (
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                  )}
                                  {expandedInterviewId === interview.id ? "Collapse" : "View"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedInterviewId === interview.id && expandedInterview && (
                            <TableRow key={`${interview.id}-details`} data-testid={`interview-details-${interview.id}`}>
                              <TableCell colSpan={9} className="bg-muted/30 p-0">
                                <div className="p-6">
                                  <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-lg font-semibold">
                                      Investigation Interview: {expandedInterview.intervieweeName}
                                    </h3>
                                    {getPrivilegeBadge(expandedInterview)}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    {cases?.find(c => c.id === expandedInterview.caseId)?.title}
                                  </p>

                                  <Tabs defaultValue="details" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto gap-1">
                                      <TabsTrigger value="details" className="text-xs sm:text-sm py-2">Details</TabsTrigger>
                                      <TabsTrigger value="questions" className="text-xs sm:text-sm py-2">Questions</TabsTrigger>
                                      <TabsTrigger value="upjohn" className="text-xs sm:text-sm py-2">Upjohn</TabsTrigger>
                                      <TabsTrigger value="recording" className="text-xs sm:text-sm py-2">Recording</TabsTrigger>
                                      <TabsTrigger value="transcript" className="text-xs sm:text-sm py-2">Transcript</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="details" className="space-y-4 mt-4">
                                      <Card>
                                        <CardHeader>
                                          <CardTitle>Interview Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div>
                                            <Label className="text-muted-foreground">Type</Label>
                                            <p className="font-medium">{expandedInterview.interviewType.replace(/_/g, " ")}</p>
                                          </div>
                                          <div>
                                            <Label className="text-muted-foreground">Scheduled For</Label>
                                            <p className="font-medium">{new Date(expandedInterview.scheduledFor).toLocaleString()}</p>
                                          </div>
                                          <div>
                                            <Label className="text-muted-foreground">Email</Label>
                                            <p className="font-medium">{expandedInterview.intervieweeEmail}</p>
                                          </div>
                                          {expandedInterview.intervieweeJurisdiction && (
                                            <div>
                                              <Label className="text-muted-foreground">Jurisdiction</Label>
                                              <p className="font-medium">{expandedInterview.intervieweeJurisdiction}</p>
                                            </div>
                                          )}
                                          <div>
                                            <Label className="text-muted-foreground">Status</Label>
                                            <div className="mt-1">{getStatusBadge(expandedInterview)}</div>
                                          </div>
                                          {expandedInterview.notes && (
                                            <div>
                                              <Label className="text-muted-foreground">Notes</Label>
                                              <p className="font-medium">{expandedInterview.notes}</p>
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>

                                      <Card>
                                        <CardHeader>
                                          <CardTitle>Consent & Compliance</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <Label className="text-muted-foreground">Consent Required</Label>
                                              <p className="font-medium">{expandedInterview.consentRequired === "true" ? "Yes" : "No"}</p>
                                            </div>
                                            <div>
                                              <Label className="text-muted-foreground">Consent Obtained</Label>
                                              <div className="flex items-center gap-2 mt-1">
                                                {expandedInterview.consentObtained === "true" ? (
                                                  <>
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    <span>Yes</span>
                                                  </>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    onClick={() => handleRecordConsent(expandedInterview.id)}
                                                    data-testid="button-record-consent"
                                                  >
                                                    Record Consent
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>

                                      {expandedInterview.status === "scheduled" && (
                                        <Button
                                          onClick={() => handleCompleteInterview(expandedInterview.id)}
                                          className="w-full"
                                          data-testid="button-complete-interview"
                                        >
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Mark Interview Complete
                                        </Button>
                                      )}
                                    </TabsContent>

                                    <TabsContent value="questions" className="space-y-4 mt-4">
                                      <Card>
                                        <CardHeader>
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <CardTitle className="flex items-center gap-2">
                                                <HelpCircle className="h-5 w-5" />
                                                Interview Questions
                                              </CardTitle>
                                              <CardDescription>
                                                Manage questions for this interview. Apply a template or add custom questions.
                                              </CardDescription>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => setApplyTemplateDialogOpen(true)}
                                              data-testid="btn-apply-template"
                                            >
                                              <ListPlus className="h-4 w-4 mr-1" />
                                              Apply Template
                                            </Button>
                                          </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                          {/* Template info if applied */}
                                          {expandedInterview.templateId && (
                                            <div className="p-3 bg-muted rounded-md">
                                              <p className="text-sm text-muted-foreground">
                                                Template applied: <span className="font-medium">{templates?.find(t => t.id === expandedInterview.templateId)?.name}</span>
                                              </p>
                                            </div>
                                          )}

                                          {/* Questions list */}
                                          {((expandedInterview.questions as string[]) || []).length > 0 ? (
                                            <div className="space-y-2">
                                              {((expandedInterview.questions as string[]) || []).map((question, idx) => (
                                                <div
                                                  key={idx}
                                                  className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-md group"
                                                  data-testid={`question-item-${idx}`}
                                                >
                                                  <div className="flex items-start gap-2 flex-1">
                                                    <span className="text-muted-foreground font-mono text-sm min-w-[24px]">{idx + 1}.</span>
                                                    <p className="text-sm">{question}</p>
                                                  </div>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveQuestion(expandedInterview.id, idx, question)}
                                                    data-testid={`btn-remove-question-${idx}`}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                              <p>No questions added yet</p>
                                              <p className="text-sm">Apply a template or add custom questions below</p>
                                            </div>
                                          )}

                                          {/* Add new question form */}
                                          <div className="border-t pt-4">
                                            <Label className="text-sm font-medium mb-2 block">Add New Question</Label>
                                            <div className="flex gap-2">
                                              <Input
                                                placeholder="Type a new interview question..."
                                                value={newQuestionText}
                                                onChange={(e) => setNewQuestionText(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter" && newQuestionText.trim()) {
                                                    handleAddQuestion(expandedInterview.id, newQuestionText);
                                                  }
                                                }}
                                                data-testid="input-new-question"
                                              />
                                              <Button
                                                onClick={() => handleAddQuestion(expandedInterview.id, newQuestionText)}
                                                disabled={!newQuestionText.trim()}
                                                data-testid="btn-add-question"
                                              >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add
                                              </Button>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </TabsContent>

                                    <TabsContent value="upjohn" className="space-y-4 mt-4">
                                      {expandedInterview.upjohnWarningGiven === "true" ? (
                                        <Alert>
                                          <Shield className="h-4 w-4" />
                                          <AlertTitle>Upjohn Warning Given</AlertTitle>
                                          <AlertDescription>
                                            {expandedInterview.upjohnWarningTimestamp && (
                                              <p className="text-sm text-muted-foreground mb-2">
                                                Given {formatDistanceToNow(new Date(expandedInterview.upjohnWarningTimestamp), { addSuffix: true })}
                                              </p>
                                            )}
                                            <div className="mt-3 p-3 bg-muted rounded-md">
                                              <p className="whitespace-pre-wrap text-sm">{expandedInterview.upjohnWarningText}</p>
                                            </div>
                                          </AlertDescription>
                                        </Alert>
                                      ) : (
                                        <Card>
                                          <CardHeader>
                                            <CardTitle>Upjohn Warning Not Yet Given</CardTitle>
                                            <CardDescription>
                                              Required before conducting interview to establish attorney-client privilege
                                            </CardDescription>
                                          </CardHeader>
                                          <CardContent>
                                            <Alert className="mb-4">
                                              <AlertTriangle className="h-4 w-4" />
                                              <AlertTitle>Attorney-Client Privilege Notice</AlertTitle>
                                              <AlertDescription>
                                                The Upjohn warning informs the interviewee that you represent the company, not them individually,
                                                and that the company can waive privilege. This is required for corporate investigations.
                                              </AlertDescription>
                                            </Alert>
                                            <Button onClick={() => handleGiveUpjohnWarning(expandedInterview.id)} data-testid="button-give-upjohn-warning">
                                              <Shield className="h-4 w-4 mr-2" />
                                              Give Upjohn Warning
                                            </Button>
                                          </CardContent>
                                        </Card>
                                      )}
                                    </TabsContent>

                                    <TabsContent value="recording" className="space-y-4 mt-4">
                                      {expandedInterview.recordingUrl ? (
                                        <Card>
                                          <CardHeader>
                                            <CardTitle>Interview Recording</CardTitle>
                                          </CardHeader>
                                          <CardContent>
                                            <div className="space-y-4">
                                              <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                                                <div className="flex items-center gap-3">
                                                  <Video className="h-8 w-8 text-blue-600" />
                                                  <div>
                                                    <p className="font-medium">Recording Available</p>
                                                    <p className="text-sm text-muted-foreground">{expandedInterview.recordingUrl}</p>
                                                  </div>
                                                </div>
                                                <Button size="sm" variant="outline">
                                                  <Play className="h-4 w-4 mr-2" />
                                                  Play
                                                </Button>
                                              </div>
                                              {expandedInterview.isPrivileged === "true" && (
                                                <Alert variant="destructive">
                                                  <Shield className="h-4 w-4" />
                                                  <AlertTitle>Attorney-Client Privileged</AlertTitle>
                                                  <AlertDescription>
                                                    This recording is protected by attorney-client privilege and work product doctrine.
                                                    Unauthorized disclosure may waive privilege.
                                                  </AlertDescription>
                                                </Alert>
                                              )}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ) : (
                                        <Card>
                                          <CardHeader>
                                            <CardTitle>Upload Recording</CardTitle>
                                            <CardDescription>Upload the recorded interview video</CardDescription>
                                          </CardHeader>
                                          <CardContent>
                                            <div className="space-y-4">
                                              <Input
                                                placeholder="Recording URL or file path"
                                                data-testid="input-recording-url"
                                              />
                                              <Button onClick={() => {
                                                const url = (document.querySelector('[data-testid="input-recording-url"]') as HTMLInputElement)?.value;
                                                if (url) handleUploadRecording(expandedInterview.id, url);
                                              }} data-testid="button-upload-recording">
                                                <Upload className="h-4 w-4 mr-2" />
                                                Upload Recording
                                              </Button>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      )}
                                    </TabsContent>

                                    <TabsContent value="transcript" className="space-y-4 mt-4">
                                      {expandedInterview.transcriptText ? (
                                        <Card>
                                          <CardHeader>
                                            <CardTitle>Interview Transcript</CardTitle>
                                            {expandedInterview.transcriptUrl && (
                                              <CardDescription>{expandedInterview.transcriptUrl}</CardDescription>
                                            )}
                                          </CardHeader>
                                          <CardContent>
                                            <div className="p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                                              <pre className="whitespace-pre-wrap text-sm">{expandedInterview.transcriptText}</pre>
                                            </div>
                                            {expandedInterview.isPrivileged === "true" && (
                                              <Alert variant="destructive" className="mt-4">
                                                <Shield className="h-4 w-4" />
                                                <AlertTitle>Attorney-Client Privileged</AlertTitle>
                                                <AlertDescription>
                                                  This transcript is protected by attorney-client privilege. Do not disclose without authorization.
                                                </AlertDescription>
                                              </Alert>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ) : (
                                        <Card>
                                          <CardHeader>
                                            <CardTitle>Upload Transcript</CardTitle>
                                            <CardDescription>Upload or paste the interview transcript</CardDescription>
                                          </CardHeader>
                                          <CardContent>
                                            <div className="space-y-4">
                                              <Textarea
                                                placeholder="Paste transcript text here..."
                                                className="min-h-48"
                                                data-testid="textarea-transcript"
                                              />
                                              <Input
                                                placeholder="Transcript URL (optional)"
                                                data-testid="input-transcript-url"
                                              />
                                              <Button onClick={() => {
                                                const text = (document.querySelector('[data-testid="textarea-transcript"]') as HTMLTextAreaElement)?.value;
                                                const url = (document.querySelector('[data-testid="input-transcript-url"]') as HTMLInputElement)?.value;
                                                if (text) handleUploadTranscript(expandedInterview.id, text, url);
                                              }} data-testid="button-upload-transcript">
                                                <Upload className="h-4 w-4 mr-2" />
                                                Upload Transcript
                                              </Button>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      )}
                                    </TabsContent>
                                  </Tabs>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No interviews scheduled</h3>
                    <p className="text-muted-foreground">Schedule your first investigation interview</p>
                  </div>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="invites">
          <InterviewInvitesPanel cases={cases} templates={templates} />
        </AccordionItem>

        <AccordionItem value="completed">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-trigger-completed">
              <div className="flex flex-col items-start text-left">
                <CardTitle>Completed Interviews</CardTitle>
                <CardDescription>Pre-interview recordings with AI-generated summaries and transcripts</CardDescription>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
                {isLoadingRecorded ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recordedInterviews && recordedInterviews.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Interviewee</TableHead>
                        <TableHead>Case</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Video</TableHead>
                        <TableHead>Audio</TableHead>
                        <TableHead>Transcript</TableHead>
                        <TableHead>AI Summary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recordedInterviews.map((interview) => (
                        <TableRow key={interview.id} data-testid={`recorded-interview-${interview.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{interview.intervieweeName}</div>
                              <div className="text-sm text-muted-foreground">{interview.intervieweeEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {cases?.find(c => c.id === interview.caseId)?.title || interview.caseId}
                          </TableCell>
                          <TableCell>
                            {interview.completedAt 
                              ? format(new Date(interview.completedAt), "MMM dd, yyyy")
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {interview.videoUrl ? (
                              <a 
                                href={interview.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                data-testid={`link-video-${interview.id}`}
                              >
                                <Button size="sm" variant="outline">
                                  <Video className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">No video</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {interview.audioUrl ? (
                              <a 
                                href={interview.audioUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                data-testid={`link-audio-${interview.id}`}
                              >
                                <Button size="sm" variant="outline">
                                  <Play className="h-4 w-4 mr-1" />
                                  Play
                                </Button>
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">No audio</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {interview.transcriptText ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedTranscript(interview.transcriptText || "");
                                  setTranscriptOpen(true);
                                }}
                                data-testid={`button-transcript-${interview.id}`}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Read
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">No transcript</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {interview.aiSummaryText ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedSummary(interview.aiSummaryText || "");
                                  setSummaryOpen(true);
                                }}
                                data-testid={`button-summary-${interview.id}`}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">No summary</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedRecordedId(interview.id);
                                setRecordedDetailOpen(true);
                              }}
                              data-testid={`button-view-details-${interview.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No completed interviews</h3>
                    <p className="text-muted-foreground">Completed pre-interview recordings will appear here</p>
                  </div>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
          </Accordion>
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
                                    <>
                                      <Clock className="h-3 w-3 mr-1" />
                                      In Progress
                                    </>
                                  )}
                                </Badge>
                                <Badge variant="outline">
                                  {recordedCount} / {totalQuestions} responses
                                </Badge>
                              </div>
                              <div className="font-medium text-lg">{interview.intervieweeName}</div>
                              <div className="text-sm text-muted-foreground">{interview.intervieweeEmail}</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Case</div>
                                <div className="font-medium">
                                  {cases?.find(c => c.id === interview.caseId)?.title || "Unknown Case"}
                                </div>
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
                                <div className="flex gap-2 flex-wrap">
                                  {responses.map((response, idx) => (
                                    <Button
                                      key={response.id}
                                      size="sm"
                                      variant={selectedIdx === idx ? "default" : "outline"}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setResponseIndices(prev => ({ ...prev, [interview.id]: idx }));
                                      }}
                                      data-testid={`btn-response-${response.id}`}
                                    >
                                      Q{response.questionIndex + 1}
                                      {response.videoUrl && <Video className="h-3 w-3 ml-1" />}
                                    </Button>
                                  ))}
                                </div>

                                {currentResponse && (
                                  <div className="bg-card rounded-lg p-4 space-y-4">
                                    <div>
                                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Question {currentResponse.questionIndex + 1}</Label>
                                      <p className="text-lg font-medium mt-1">{currentResponse.questionText}</p>
                                    </div>

                                    {currentResponse.videoUrl && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Video Response</Label>
                                        <div className="mt-2 rounded-lg overflow-hidden bg-black aspect-video">
                                          <video 
                                            src={currentResponse.videoUrl} 
                                            controls 
                                            className="w-full h-full"
                                            data-testid={`video-response-${currentResponse.id}`}
                                          />
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                          <a 
                                            href={currentResponse.videoUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            data-testid={`link-download-video-${currentResponse.id}`}
                                          >
                                            <Button size="sm" variant="outline">
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Open in new tab
                                            </Button>
                                          </a>
                                          {currentResponse.duration && (
                                            <Badge variant="secondary">
                                              Duration: {Math.floor(currentResponse.duration / 60)}:{String(currentResponse.duration % 60).padStart(2, '0')}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {currentResponse.audioUrl && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Audio</Label>
                                        <audio 
                                          src={currentResponse.audioUrl} 
                                          controls 
                                          className="w-full mt-2"
                                          data-testid={`audio-response-${currentResponse.id}`}
                                        />
                                      </div>
                                    )}

                                    <div>
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Transcript</Label>
                                        {currentResponse.status === "transcription_failed" && (currentResponse.videoUrl || currentResponse.audioUrl) && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTranscribeResponse(currentResponse.id);
                                            }}
                                            disabled={transcribingResponses.has(currentResponse.id)}
                                            data-testid={`btn-transcribe-${currentResponse.id}`}
                                          >
                                            {transcribingResponses.has(currentResponse.id) ? (
                                              <>
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                Transcribing...
                                              </>
                                            ) : (
                                              <>
                                                <Mic className="h-3 w-3 mr-1" />
                                                Retry Transcribe
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                      {currentResponse.transcriptText ? (
                                        <div className="mt-2 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
                                          <p className="text-sm whitespace-pre-wrap">{currentResponse.transcriptText}</p>
                                        </div>
                                      ) : currentResponse.status === "transcription_failed" ? (
                                        <div className="mt-2 p-3 bg-destructive/10 rounded-lg text-center text-destructive text-sm">
                                          Automatic transcription failed. Click "Transcribe" to retry.
                                        </div>
                                      ) : (
                                        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Transcription in progress... Refresh to see results.
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

                                {/* AI Summary Section */}
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
                                      <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert leading-relaxed">
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

                                {/* Court Transcript Section */}
                                {responses.some(r => r.transcriptText) && (
                                  <div className="bg-card rounded-lg p-4 space-y-3 border">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-primary" />
                                        <Label className="text-sm font-medium">Court Transcript</Label>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const caseData = cases?.find(c => c.id === interview.caseId);
                                          setCourtTranscriptData({
                                            intervieweeName: interview.intervieweeName,
                                            interviewDate: interview.scheduledFor 
                                              ? format(new Date(interview.scheduledFor), "MM/dd/yyyy")
                                              : format(new Date(), "MM/dd/yyyy"),
                                            caseNumber: caseData?.caseNumber,
                                            caseName: caseData?.title,
                                            questions: responses
                                              .filter(r => r.transcriptText)
                                              .sort((a, b) => a.questionIndex - b.questionIndex)
                                              .map(r => ({
                                                questionIndex: r.questionIndex,
                                                questionText: r.questionText,
                                                answerText: r.transcriptText || "",
                                                recordedAt: r.recordedAt || undefined,
                                              })),
                                            caseId: interview.caseId,
                                            interviewId: interview.id,
                                          });
                                          setCourtTranscriptOpen(true);
                                        }}
                                        data-testid={`btn-view-transcript-${interview.id}`}
                                      >
                                        <BookOpen className="h-3 w-3 mr-1" />
                                        View Full Transcript
                                      </Button>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                                      {responses.filter(r => r.transcriptText).length} of {responses.length} responses transcribed.
                                      View the full court-formatted transcript with line numbers and page breaks.
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No responses recorded yet</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No completed interview responses</h3>
                  <p className="text-muted-foreground">
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
              {isLoadingRecorded ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recordedInterviews && recordedInterviews.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interviewee</TableHead>
                      <TableHead>Case</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Audio</TableHead>
                      <TableHead>Transcript</TableHead>
                      <TableHead>AI Summary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordedInterviews.map((interview) => (
                      <TableRow key={interview.id} data-testid={`recording-${interview.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{interview.intervieweeName}</div>
                            <div className="text-sm text-muted-foreground">{interview.intervieweeEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {cases?.find(c => c.id === interview.caseId)?.title || interview.caseId}
                        </TableCell>
                        <TableCell>
                          {interview.completedAt 
                            ? format(new Date(interview.completedAt), "MMM dd, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {interview.videoUrl ? (
                            <a 
                              href={interview.videoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              data-testid={`link-recording-video-${interview.id}`}
                            >
                              <Button size="sm" variant="outline">
                                <Video className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">No video</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {interview.audioUrl ? (
                            <a 
                              href={interview.audioUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              data-testid={`link-recording-audio-${interview.id}`}
                            >
                              <Button size="sm" variant="outline">
                                <Play className="h-4 w-4 mr-1" />
                                Play
                              </Button>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">No audio</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {interview.transcriptText ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedTranscript(interview.transcriptText || "");
                                setTranscriptOpen(true);
                              }}
                              data-testid={`button-recording-transcript-${interview.id}`}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Read
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">No transcript</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {interview.aiSummaryText ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedSummary(interview.aiSummaryText || "");
                                setSummaryOpen(true);
                              }}
                              data-testid={`button-recording-summary-${interview.id}`}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">No summary</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedRecordedId(interview.id);
                              setRecordedDetailOpen(true);
                            }}
                            data-testid={`button-recording-details-${interview.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No recordings available</h3>
                  <p className="text-muted-foreground">Completed interview recordings will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-interviews" className="space-y-4">
          <InterviewInvitesPanel cases={cases} templates={templates} />
        </TabsContent>
      </Tabs>
      {/* Schedule Interview Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-schedule-interview">
          <DialogHeader>
            <DialogTitle>Schedule Investigation Interview</DialogTitle>
            <DialogDescription>
              Schedule a new interview with Upjohn warning and consent requirements
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="case">Case</Label>
              <Select value={formData.caseId} onValueChange={(value) => setFormData({...formData, caseId: value})}>
                <SelectTrigger data-testid="select-case">
                  <SelectValue placeholder="Select case" />
                </SelectTrigger>
                <SelectContent>
                  {cases?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {/* Template selector for regular interview types */}
            {formData.interviewType !== "pre_interview" && (
              <div className="grid gap-2">
                <Label htmlFor="template">Question Template (Optional)</Label>
                <Select 
                  value={formData.templateId} 
                  onValueChange={(value) => handleApplyTemplateToForm(value)}
                >
                  <SelectTrigger data-testid="select-question-template">
                    <SelectValue placeholder="Select a template to pre-populate questions" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.filter(t => t.isActive === "true").map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.questions.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.questions.length} questions will be added from this template
                  </p>
                )}
              </div>
            )}

            {/* Pre-Interview specific fields */}
            {formData.interviewType === "pre_interview" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="template">Interview Template</Label>
                  <Select value={formData.interviewTemplateId} onValueChange={(value) => setFormData({...formData, interviewTemplateId: value})}>
                    <SelectTrigger data-testid="select-template">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.filter(t => t.isActive === "true").map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="delivery">Delivery Method</Label>
                  <Select value={formData.deliveryChannel} onValueChange={(value) => setFormData({...formData, deliveryChannel: value})}>
                    <SelectTrigger data-testid="select-delivery-channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email Only</SelectItem>
                      <SelectItem value="sms">SMS Only</SelectItem>
                      <SelectItem value="both">Email + SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
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
                <Label htmlFor="email">Email {formData.interviewType === "pre_interview" && (formData.deliveryChannel === "email" || formData.deliveryChannel === "both") && "*"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.intervieweeEmail}
                  onChange={(e) => setFormData({...formData, intervieweeEmail: e.target.value})}
                  data-testid="input-interviewee-email"
                />
              </div>
            </div>

            {/* Phone field for Pre-Interview SMS delivery */}
            {formData.interviewType === "pre_interview" && (formData.deliveryChannel === "sms" || formData.deliveryChannel === "both") && (
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.intervieweePhone}
                  onChange={(e) => setFormData({...formData, intervieweePhone: e.target.value})}
                  data-testid="input-interviewee-phone"
                />
              </div>
            )}

            {/* Hide jurisdiction and scheduled for Pre-Interview */}
            {formData.interviewType !== "pre_interview" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Input
                      id="jurisdiction"
                      placeholder="e.g., California, New York"
                      value={formData.intervieweeJurisdiction}
                      onChange={(e) => setFormData({...formData, intervieweeJurisdiction: e.target.value})}
                      data-testid="input-jurisdiction"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="scheduled">Scheduled For</Label>
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      value={formData.scheduledFor}
                      onChange={(e) => setFormData({...formData, scheduledFor: e.target.value})}
                      data-testid="input-scheduled-for"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Interview notes and preparation details"
                    data-testid="textarea-notes"
                  />
                </div>
              </>
            )}

            {/* Pre-Interview information */}
            {formData.interviewType === "pre_interview" && (
              <Alert>
                <AlertDescription>
                  Pre-Interview invitations are sent via secure link with a 7-day expiration. The interviewee will complete a remote AI-powered interview session with video recording and dynamic questioning based on the selected template.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSchedule} 
              disabled={createInterviewMutation.isPending || createPreInterviewMutation.isPending} 
              data-testid="button-submit-schedule"
            >
              {createInterviewMutation.isPending || createPreInterviewMutation.isPending 
                ? "Creating..." 
                : formData.interviewType === "pre_interview" 
                  ? "Create Pre-Interview Invite" 
                  : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Transcript Dialog */}
      <Dialog open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-transcript">
          <DialogHeader>
            <DialogTitle>Interview Transcript</DialogTitle>
            <DialogDescription>
              Full transcript of the interview recording
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-md">
              <p className="whitespace-pre-wrap text-sm">{selectedTranscript}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTranscriptOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* AI Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-summary">
          <DialogHeader>
            <DialogTitle>AI Interview Summary</DialogTitle>
            <DialogDescription>
              AI-generated summary highlighting key topics and insights
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-md">
              <p className="whitespace-pre-wrap text-sm">{selectedSummary}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Recorded Interview Detail Dialog */}
      <RecordedInterviewDetailDialog
        open={recordedDetailOpen}
        onOpenChange={setRecordedDetailOpen}
        interviewId={selectedRecordedId}
      />
      {/* Court Transcript Dialog */}
      <Dialog open={courtTranscriptOpen} onOpenChange={setCourtTranscriptOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-court-transcript">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Court Transcript
            </DialogTitle>
            <DialogDescription>
              Formatted transcript with line numbers and page breaks. Export to PDF for official records.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
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
            <Button variant="outline" onClick={() => setCourtTranscriptOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Apply Template Dialog */}
      <Dialog open={applyTemplateDialogOpen} onOpenChange={setApplyTemplateDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-apply-template">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="h-5 w-5" />
              Apply Question Template
            </DialogTitle>
            <DialogDescription>
              Select a template to add its questions to this interview. Existing questions will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label>Select Template</Label>
              <Select 
                value={selectedApplyTemplateId} 
                onValueChange={setSelectedApplyTemplateId}
              >
                <SelectTrigger data-testid="select-apply-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.filter(t => t.isActive === "true").map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedApplyTemplateId && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Template Questions:</p>
                <ul className="space-y-1">
                  {((templates?.find(t => t.id === selectedApplyTemplateId)?.baseQuestions as string[]) || []).map((q, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="font-mono">{idx + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setApplyTemplateDialogOpen(false);
              setSelectedApplyTemplateId("");
            }}>Cancel</Button>
            <Button 
              onClick={() => expandedInterview && handleApplyTemplateToInterview(expandedInterview.id, selectedApplyTemplateId)}
              disabled={!selectedApplyTemplateId}
              data-testid="btn-confirm-apply-template"
            >
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Question Confirmation Dialog */}
      <AlertDialog open={deleteQuestionConfirm.open} onOpenChange={(open) => 
        !open && setDeleteQuestionConfirm({ open: false, interviewId: "", questionIndex: -1, questionText: "" })
      }>
        <AlertDialogContent data-testid="dialog-confirm-delete-question">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this question from the interview?
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium text-foreground">{deleteQuestionConfirm.questionText}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete-question">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveQuestion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="btn-confirm-delete-question"
            >
              Remove Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Expanded AI Summary Dialog with Follow-up Questions */}
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
            {/* Summary Section */}
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="p-6 bg-muted rounded-lg">
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed">
                  {expandedSummaryData?.summaryText}
                </div>
              </div>
            </div>

            {/* Follow-up Questions Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Ask Follow-up Questions</Label>
              </div>
              
              {/* Chat Messages */}
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

              {/* Input for new question */}
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
    </div>
  );
}
