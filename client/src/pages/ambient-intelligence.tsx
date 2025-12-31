import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Case } from "@shared/schema";
import { 
  Mic, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Brain,
  Sparkles,
  ChevronRight,
  Volume2,
  Shield,
  History,
  Video,
  Mail,
  MessageSquare,
  Copy,
  Check,
  Waves,
  Users,
  Target,
  Scale,
  Upload,
  Trash2,
  Edit3,
  X,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type SessionMode = "audio" | "video" | null;

type AmbientSession = {
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
};

export default function AmbientIntelligence() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  // Mode selection state
  const [selectedMode, setSelectedMode] = useState<SessionMode>(null);
  
  // Parse caseId from URL query params
  const urlParams = new URLSearchParams(search);
  const caseIdFromUrl = urlParams.get("caseId") || "";
  
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState<string>("");
  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseIdFromUrl);
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  
  // Focus Issues state
  const [showFocusIssues, setShowFocusIssues] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"plaintiff" | "defendant">("plaintiff");
  const [pleadingInputMethod, setPleadingInputMethod] = useState<"upload" | "paste" | "manual">("upload");
  const [pleadingText, setPleadingText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedAllegations, setExtractedAllegations] = useState<{
    id: string;
    paragraph: string;
    text: string;
    type: string;
    keywords: string[];
    active: boolean;
  }[]>([]);
  const [showAllegationReview, setShowAllegationReview] = useState(false);
  const [editingAllegationId, setEditingAllegationId] = useState<string | null>(null);
  const [editingAllegationText, setEditingAllegationText] = useState("");
  const [manualIssueTitle, setManualIssueTitle] = useState("");
  
  // Update selectedCaseId when URL changes
  useEffect(() => {
    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl);
    }
  }, [caseIdFromUrl]);
  
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });
  
  // Video meeting creation state
  const [isCreatingVideoMeeting, setIsCreatingVideoMeeting] = useState(false);
  
  const { data: recentSessions = [], isLoading: sessionsLoading } = useQuery<AmbientSession[]>({
    queryKey: ["/api/ambient-sessions"],
  });
  
  // Helper to create focus issues from extracted allegations
  const createFocusIssuesFromAllegations = async (sessionId: string | null, meetingId: string | null, caseId: string | null) => {
    const activeAllegations = extractedAllegations.filter(a => a.active);
    if (activeAllegations.length === 0) return;
    
    for (const allegation of activeAllegations) {
      try {
        await apiRequest("POST", "/api/focus-issues", {
          sessionId,
          meetingId,
          caseId,
          title: allegation.text,
          shortName: `${allegation.paragraph} ${allegation.type}`,
          keywords: allegation.keywords,
        });
      } catch (error) {
        console.error("Failed to create focus issue:", error);
      }
    }
  };
  
  const createSessionMutation = useMutation({
    mutationFn: async (data: {
      sessionName: string;
      sessionType: string;
      caseId: string | null;
      participants: string[];
      notes: string;
    }) => {
      const response = await apiRequest("POST", "/api/ambient-sessions", data);
      return response.json() as Promise<AmbientSession>;
    },
    onSuccess: async (data: AmbientSession) => {
      // Create focus issues from allegations
      await createFocusIssuesFromAllegations(data.id, null, data.caseId);
      
      queryClient.invalidateQueries({ queryKey: ["/api/ambient-sessions"] });
      toast({
        title: "Session Created",
        description: extractedAllegations.filter(a => a.active).length > 0
          ? `Session ready with ${extractedAllegations.filter(a => a.active).length} focus issues.`
          : "Your ambient intelligence session is ready to start.",
      });
      navigate(`/ambient-intelligence/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleStartSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: "Session Name Required",
        description: "Please enter a name for this session.",
        variant: "destructive",
      });
      return;
    }
    
    if (!sessionType) {
      toast({
        title: "Session Type Required",
        description: "Please select a session type.",
        variant: "destructive",
      });
      return;
    }
    
    if (!consentGiven) {
      toast({
        title: "Consent Required",
        description: "Please confirm that all participants consent to recording.",
        variant: "destructive",
      });
      return;
    }
    
    const participantList = participants
      .split(",")
      .map(p => p.trim())
      .filter(Boolean);
    
    if (selectedMode === "audio") {
      createSessionMutation.mutate({
        sessionName: sessionName.trim(),
        sessionType,
        caseId: selectedCaseId || null,
        participants: participantList,
        notes: notes.trim(),
      });
    } else if (selectedMode === "video") {
      // Create video meeting directly and navigate to room
      setIsCreatingVideoMeeting(true);
      try {
        // Map session type to video meeting type
        const meetingTypeMap: Record<string, string> = {
          "interview": "witness_interview",
          "deposition": "deposition",
          "client_call": "client_meeting",
          "strategy_meeting": "team_meeting",
          "witness": "witness_interview",
          "other": "other",
        };
        
        const meetingData = {
          title: sessionName.trim(),
          description: notes.trim() || undefined,
          meetingType: meetingTypeMap[sessionType] || "other",
          caseId: selectedCaseId || undefined,
          recordingEnabled: "true",
          transcriptionEnabled: "true",
        };
        
        const response = await apiRequest("POST", "/api/video-meetings", meetingData);
        const meeting = await response.json();
        
        // Create focus issues from allegations
        await createFocusIssuesFromAllegations(null, meeting.id, selectedCaseId || null);
        
        queryClient.invalidateQueries({ queryKey: ["/api/video-meetings"] });
        
        const activeCount = extractedAllegations.filter(a => a.active).length;
        toast({
          title: "Meeting Created",
          description: activeCount > 0
            ? `Video conference ready with ${activeCount} focus issues.`
            : "Your video conference is ready. Joining now...",
        });
        
        // Navigate directly to the video meeting room
        navigate(`/video-meeting/${meeting.roomId}`);
      } catch (error: any) {
        console.error("Error creating video meeting:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to create video meeting. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCreatingVideoMeeting(false);
      }
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const modeCardVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 },
  };

  const formVariants = {
    hidden: { 
      opacity: 0, 
      height: 0,
      marginTop: 0,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    visible: { 
      opacity: 1, 
      height: "auto",
      marginTop: 24,
      transition: { duration: 0.4, ease: "easeOut" }
    },
  };

  return (
    <>
      <Helmet>
        <title>Ambient Intelligence | Sentinel Counsel</title>
        <meta name="description" content="AI-powered live meeting intelligence with real-time document suggestions" />
      </Helmet>
      
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="stagger-1 mb-8 text-center">
          <motion.div 
            className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-8 w-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            Ambient Intelligence
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-page-description">
            AI-powered live meeting transcription with real-time document suggestions
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-0">
            {/* Mode Selection Cards */}
            <div className="stagger-2">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Audio Recording Card */}
                <motion.button
                  type="button"
                  variants={modeCardVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedMode(selectedMode === "audio" ? null : "audio")}
                  aria-pressed={selectedMode === "audio"}
                  aria-label="Select audio recording mode"
                  className={`relative text-left rounded-xl border-2 p-6 transition-all duration-300 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    selectedMode === "audio"
                      ? "border-primary bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                      : selectedMode === "video"
                      ? "border-muted bg-muted/30 opacity-60"
                      : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                  }`}
                  data-testid="card-audio-mode"
                >
                  {/* Selected Check Mark */}
                  <AnimatePresence>
                    {selectedMode === "audio" && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-4 right-4 bg-white rounded-full p-1"
                      >
                        <Check className="h-4 w-4 text-primary" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    selectedMode === "audio" 
                      ? "bg-white/20" 
                      : "bg-primary/10"
                  }`}>
                    <Mic className={`h-6 w-6 ${selectedMode === "audio" ? "text-white" : "text-primary"}`} />
                  </div>
                  
                  <h3 className={`text-lg font-semibold mb-2 ${
                    selectedMode === "audio" ? "text-white" : "text-foreground"
                  }`}>
                    Audio Recording
                  </h3>
                  
                  <p className={`text-sm mb-4 ${
                    selectedMode === "audio" ? "text-white/80" : "text-muted-foreground"
                  }`}>
                    Capture audio for transcription and AI analysis without video
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      selectedMode === "audio" 
                        ? "bg-white/15 text-white/90" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Waves className="h-3 w-3" />
                      Live Transcription
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      selectedMode === "audio" 
                        ? "bg-white/15 text-white/90" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Brain className="h-3 w-3" />
                      AI Suggestions
                    </span>
                  </div>
                </motion.button>
                
                {/* Video Conference Card */}
                <motion.button
                  type="button"
                  variants={modeCardVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedMode(selectedMode === "video" ? null : "video")}
                  aria-pressed={selectedMode === "video"}
                  aria-label="Select video conference mode"
                  className={`relative text-left rounded-xl border-2 p-6 transition-all duration-300 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    selectedMode === "video"
                      ? "border-primary bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                      : selectedMode === "audio"
                      ? "border-muted bg-muted/30 opacity-60"
                      : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                  }`}
                  data-testid="card-video-mode"
                >
                  {/* Selected Check Mark */}
                  <AnimatePresence>
                    {selectedMode === "video" && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-4 right-4 bg-white rounded-full p-1"
                      >
                        <Check className="h-4 w-4 text-primary" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    selectedMode === "video" 
                      ? "bg-white/20" 
                      : "bg-primary/10"
                  }`}>
                    <Video className={`h-6 w-6 ${selectedMode === "video" ? "text-white" : "text-primary"}`} />
                  </div>
                  
                  <h3 className={`text-lg font-semibold mb-2 ${
                    selectedMode === "video" ? "text-white" : "text-foreground"
                  }`}>
                    Video Conference
                  </h3>
                  
                  <p className={`text-sm mb-4 ${
                    selectedMode === "video" ? "text-white/80" : "text-muted-foreground"
                  }`}>
                    Full video meeting with ambient intelligence features
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      selectedMode === "video" 
                        ? "bg-white/15 text-white/90" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Users className="h-3 w-3" />
                      Multi-Party
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      selectedMode === "video" 
                        ? "bg-white/15 text-white/90" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <FileText className="h-3 w-3" />
                      Document Discovery
                    </span>
                  </div>
                </motion.button>
              </div>
            </div>
            
            {/* Configuration Form - Slides in when mode is selected */}
            <AnimatePresence mode="wait">
              {selectedMode && (
                <motion.div
                  key="config-form"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="overflow-hidden"
                >
                  <Card className="border-primary/20">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
                          {selectedMode === "audio" ? (
                            <Mic className="h-5 w-5 text-white" />
                          ) : (
                            <Video className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {selectedMode === "audio" ? "Configure Audio Session" : "Configure Video Conference"}
                          </CardTitle>
                          <CardDescription>
                            {selectedMode === "audio" 
                              ? "Set up your audio recording session with AI transcription"
                              : "Set up your video meeting with ambient intelligence"
                            }
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="session-name">Session Name</Label>
                          <Input
                            id="session-name"
                            placeholder="e.g., Witness Interview - John Doe"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            data-testid="input-session-name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="session-type">Session Type</Label>
                          <Select value={sessionType} onValueChange={setSessionType}>
                            <SelectTrigger id="session-type" data-testid="select-session-type">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="interview">Witness Interview</SelectItem>
                              <SelectItem value="deposition">Deposition</SelectItem>
                              <SelectItem value="client_call">Client Call</SelectItem>
                              <SelectItem value="strategy_meeting">Strategy Meeting</SelectItem>
                              <SelectItem value="witness">Witness Session</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="case-link">Link to Case <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                        <Select value={selectedCaseId || "none"} onValueChange={(value) => setSelectedCaseId(value === "none" ? "" : value)}>
                          <SelectTrigger id="case-link" data-testid="select-case-link">
                            <SelectValue placeholder="Select a case..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No case linked</SelectItem>
                            {cases.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.caseNumber} - {c.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Linking to a case enables document suggestions from the case data room
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="participants">Participants <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                        <Input
                          id="participants"
                          placeholder="John Doe, Jane Smith, ..."
                          value={participants}
                          onChange={(e) => setParticipants(e.target.value)}
                          data-testid="input-participants"
                        />
                        <p className="text-xs text-muted-foreground">
                          Comma-separated list of participant names
                        </p>
                        
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const inviteLink = `${window.location.origin}/join-meeting?session=new`;
                              navigator.clipboard.writeText(inviteLink);
                              toast({
                                title: "Link Copied",
                                description: "Invite link copied to clipboard. Share with participants.",
                              });
                            }}
                            data-testid="button-copy-invite-link"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy Link
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "SendGrid API Required",
                                description: "Please configure the SENDGRID_API_KEY environment variable to send email invites.",
                                variant: "destructive",
                              });
                            }}
                            data-testid="button-send-email-invite"
                          >
                            <Mail className="h-3.5 w-3.5 mr-1.5" />
                            Email
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Twilio API Required",
                                description: "Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to send SMS invites.",
                                variant: "destructive",
                              });
                            }}
                            data-testid="button-send-sms-invite"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                            SMS
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="notes">Session Notes <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                        <Textarea
                          id="notes"
                          placeholder="Add any context or notes about this session..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          data-testid="textarea-notes"
                        />
                      </div>
                      
                      {/* Focus Issues Section */}
                      <Collapsible open={showFocusIssues} onOpenChange={setShowFocusIssues}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border cursor-pointer hover-elevate" data-testid="focus-issues-toggle">
                            <div className="flex items-center gap-3">
                              <Target className="h-5 w-5 text-primary" />
                              <div>
                                <h4 className="font-medium text-sm">Focus Issues <span className="text-muted-foreground font-normal">(Optional)</span></h4>
                                <p className="text-xs text-muted-foreground">
                                  Upload a pleading to auto-extract allegations for AI monitoring
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {extractedAllegations.length > 0 && (
                                <Badge variant="secondary">{extractedAllegations.filter(a => a.active).length} active</Badge>
                              )}
                              {showFocusIssues ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-4 space-y-4">
                          {/* Side Selection */}
                          <div className="space-y-2">
                            <Label>Which side are you representing?</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setSelectedSide("plaintiff")}
                                className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                  selectedSide === "plaintiff"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-muted-foreground/50"
                                }`}
                                data-testid="button-side-plaintiff"
                              >
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                  selectedSide === "plaintiff" ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}>
                                  <Scale className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-sm">Plaintiff</div>
                                  <div className="text-[10px] text-muted-foreground">Proving allegations</div>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedSide("defendant")}
                                className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                  selectedSide === "defendant"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-muted-foreground/50"
                                }`}
                                data-testid="button-side-defendant"
                              >
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                  selectedSide === "defendant" ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}>
                                  <Shield className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-sm">Defendant</div>
                                  <div className="text-[10px] text-muted-foreground">Defending allegations</div>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Input Method Tabs */}
                          <div className="space-y-2">
                            <Label>Add Focus Issues</Label>
                            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
                              <button
                                type="button"
                                onClick={() => setPleadingInputMethod("upload")}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                  pleadingInputMethod === "upload"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                data-testid="button-input-upload"
                              >
                                <Upload className="h-3 w-3 inline mr-1.5" />
                                Upload
                              </button>
                              <button
                                type="button"
                                onClick={() => setPleadingInputMethod("paste")}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                  pleadingInputMethod === "paste"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                data-testid="button-input-paste"
                              >
                                <FileText className="h-3 w-3 inline mr-1.5" />
                                Paste Text
                              </button>
                              <button
                                type="button"
                                onClick={() => setPleadingInputMethod("manual")}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                  pleadingInputMethod === "manual"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                data-testid="button-input-manual"
                              >
                                <Edit3 className="h-3 w-3 inline mr-1.5" />
                                Manual
                              </button>
                            </div>
                          </div>

                          {/* Upload Area */}
                          {pleadingInputMethod === "upload" && (
                            <div 
                              className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/30 hover:border-muted-foreground/50 hover:bg-muted/50 transition-all cursor-pointer"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.pdf,.docx,.doc,.txt';
                                input.onchange = async (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    setIsExtracting(true);
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    formData.append('side', selectedSide);
                                    try {
                                      const response = await fetch('/api/focus-issues/extract-from-file', {
                                        method: 'POST',
                                        body: formData,
                                      });
                                      const data = await response.json();
                                      if (data.allegations && data.allegations.length > 0) {
                                        setExtractedAllegations(data.allegations);
                                        setShowAllegationReview(true);
                                        toast({
                                          title: "Allegations Extracted",
                                          description: `Found ${data.allegations.length} factual allegations in the pleading.`,
                                        });
                                      } else {
                                        toast({
                                          title: "No Allegations Found",
                                          description: "Could not extract allegations from this document. Try pasting the text directly.",
                                          variant: "destructive",
                                        });
                                      }
                                    } catch (error) {
                                      toast({
                                        title: "Extraction Failed",
                                        description: "Failed to extract allegations. Please try again.",
                                        variant: "destructive",
                                      });
                                    } finally {
                                      setIsExtracting(false);
                                    }
                                  }
                                };
                                input.click();
                              }}
                              data-testid="drop-zone-pleading"
                            >
                              {isExtracting ? (
                                <>
                                  <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-3 animate-spin" />
                                  <p className="text-sm text-muted-foreground">Extracting allegations...</p>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                                  <p className="text-sm font-medium text-foreground mb-1">
                                    Drop pleading here or click to browse
                                  </p>
                                  <p className="text-xs text-muted-foreground mb-3">
                                    Supports PDF, Word (.docx), or text files
                                  </p>
                                  <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-muted-foreground">
                                    <span className="px-2 py-0.5 bg-muted rounded">Complaint</span>
                                    <span className="px-2 py-0.5 bg-muted rounded">Answer</span>
                                    <span className="px-2 py-0.5 bg-muted rounded">Motion</span>
                                    <span className="px-2 py-0.5 bg-muted rounded">Brief</span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* Paste Text Area */}
                          {pleadingInputMethod === "paste" && (
                            <div className="space-y-2">
                              <Textarea
                                value={pleadingText}
                                onChange={(e) => setPleadingText(e.target.value)}
                                placeholder={`Paste the text of your complaint, motion, or other pleading here...

Example:
¶ 12. On March 15, 2024, Defendant HOBAO Industries knew or should have known that the PPE storage cabinet was empty...

¶ 15. Defendant's supervisor, James Miller, was informed of the safety equipment shortage at approximately 7:45 AM...`}
                                rows={6}
                                data-testid="textarea-pleading"
                              />
                              <Button
                                type="button"
                                onClick={async () => {
                                  if (!pleadingText.trim()) {
                                    toast({
                                      title: "No Text",
                                      description: "Please paste the pleading text first.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setIsExtracting(true);
                                  try {
                                    const response = await apiRequest("POST", "/api/focus-issues/extract-from-text", {
                                      text: pleadingText,
                                      side: selectedSide,
                                    });
                                    const data = await response.json();
                                    if (data.allegations && data.allegations.length > 0) {
                                      setExtractedAllegations(data.allegations);
                                      setShowAllegationReview(true);
                                      toast({
                                        title: "Allegations Extracted",
                                        description: `Found ${data.allegations.length} factual allegations.`,
                                      });
                                    } else {
                                      toast({
                                        title: "No Allegations Found",
                                        description: "Could not extract allegations from the text.",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Extraction Failed",
                                      description: "Failed to extract allegations. Please try again.",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setIsExtracting(false);
                                  }
                                }}
                                disabled={isExtracting || !pleadingText.trim()}
                                data-testid="button-extract-allegations"
                              >
                                {isExtracting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Extracting...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Extract Allegations
                                  </>
                                )}
                              </Button>
                            </div>
                          )}

                          {/* Manual Entry */}
                          {pleadingInputMethod === "manual" && (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  value={manualIssueTitle}
                                  onChange={(e) => setManualIssueTitle(e.target.value)}
                                  placeholder="Enter a focus issue (e.g., 'Did Miller know about the PPE shortage?')"
                                  data-testid="input-manual-issue"
                                />
                                <Button
                                  type="button"
                                  onClick={() => {
                                    if (!manualIssueTitle.trim()) return;
                                    const newIssue = {
                                      id: `manual-${Date.now()}`,
                                      paragraph: `#${extractedAllegations.length + 1}`,
                                      text: manualIssueTitle.trim(),
                                      type: "custom",
                                      keywords: [],
                                      active: true,
                                    };
                                    setExtractedAllegations([...extractedAllegations, newIssue]);
                                    setManualIssueTitle("");
                                    setShowAllegationReview(true);
                                  }}
                                  disabled={!manualIssueTitle.trim()}
                                  data-testid="button-add-manual-issue"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Extracted Allegations Review */}
                          {showAllegationReview && extractedAllegations.length > 0 && (
                            <div className="space-y-3 border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="text-sm font-medium">
                                    {extractedAllegations.filter(a => a.active).length} of {extractedAllegations.length} allegations active
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {selectedSide === "plaintiff" ? "Proving" : "Defending"}
                                </Badge>
                              </div>
                              
                              <ScrollArea className="max-h-[300px]">
                                <div className="space-y-2">
                                  {extractedAllegations.map((allegation) => (
                                    <div
                                      key={allegation.id}
                                      className={`p-3 rounded-lg border transition-colors ${
                                        allegation.active ? "bg-background" : "bg-muted/50 opacity-60"
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <Checkbox
                                          checked={allegation.active}
                                          onCheckedChange={(checked) => {
                                            setExtractedAllegations(prev =>
                                              prev.map(a =>
                                                a.id === allegation.id ? { ...a, active: checked === true } : a
                                              )
                                            );
                                          }}
                                          data-testid={`checkbox-allegation-${allegation.id}`}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono text-muted-foreground">
                                              {allegation.paragraph}
                                            </span>
                                            <Badge variant="secondary" className="text-[10px]">
                                              {allegation.type}
                                            </Badge>
                                          </div>
                                          {editingAllegationId === allegation.id ? (
                                            <div className="flex gap-2">
                                              <Input
                                                value={editingAllegationText}
                                                onChange={(e) => setEditingAllegationText(e.target.value)}
                                                className="text-sm"
                                                data-testid={`input-edit-allegation-${allegation.id}`}
                                              />
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                  setExtractedAllegations(prev =>
                                                    prev.map(a =>
                                                      a.id === allegation.id ? { ...a, text: editingAllegationText } : a
                                                    )
                                                  );
                                                  setEditingAllegationId(null);
                                                }}
                                                data-testid={`button-save-edit-${allegation.id}`}
                                              >
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setEditingAllegationId(null)}
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-foreground line-clamp-2">
                                              {allegation.text}
                                            </p>
                                          )}
                                          {allegation.keywords.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {allegation.keywords.slice(0, 4).map((kw, i) => (
                                                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                                                  {kw}
                                                </span>
                                              ))}
                                              {allegation.keywords.length > 4 && (
                                                <span className="text-[10px] text-muted-foreground">
                                                  +{allegation.keywords.length - 4} more
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => {
                                              setEditingAllegationId(allegation.id);
                                              setEditingAllegationText(allegation.text);
                                            }}
                                            data-testid={`button-edit-allegation-${allegation.id}`}
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => {
                                              setExtractedAllegations(prev =>
                                                prev.filter(a => a.id !== allegation.id)
                                              );
                                            }}
                                            data-testid={`button-delete-allegation-${allegation.id}`}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                      
                      {/* Recording Consent */}
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">Recording Consent</h4>
                            <p className="text-xs text-muted-foreground mb-3">
                              This session will record {selectedMode === "video" ? "audio and video" : "audio"} and generate a transcript. 
                              Please ensure all participants are informed and have consented.
                            </p>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="consent"
                                checked={consentGiven}
                                onCheckedChange={(checked) => setConsentGiven(checked === true)}
                                data-testid="checkbox-consent"
                              />
                              <Label htmlFor="consent" className="text-sm font-normal cursor-pointer">
                                I confirm that all participants have consented to this recording
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Submit Button */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          size="lg"
                          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                          onClick={handleStartSession}
                          disabled={createSessionMutation.isPending || isCreatingVideoMeeting}
                          data-testid="button-start-session"
                        >
                          {createSessionMutation.isPending || isCreatingVideoMeeting ? (
                            <>Processing...</>
                          ) : selectedMode === "audio" ? (
                            <>
                              <Mic className="h-5 w-5 mr-2" />
                              Start Audio Session
                            </>
                          ) : (
                            <>
                              <Video className="h-5 w-5 mr-2" />
                              Start Video Conference
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* How It Works - Only show when no mode selected */}
            <AnimatePresence>
              {!selectedMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="stagger-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        How It Works
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/30">
                          <div className="p-3 rounded-full bg-primary/10 mb-3">
                            <Volume2 className="h-6 w-6 text-primary" />
                          </div>
                          <h4 className="font-medium mb-1">Live Transcription</h4>
                          <p className="text-sm text-muted-foreground">
                            Real-time speech-to-text captures every word of your meeting
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/30">
                          <div className="p-3 rounded-full bg-primary/10 mb-3">
                            <Sparkles className="h-6 w-6 text-primary" />
                          </div>
                          <h4 className="font-medium mb-1">AI Analysis</h4>
                          <p className="text-sm text-muted-foreground">
                            Emma AI analyzes the conversation for relevant documents
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/30">
                          <div className="p-3 rounded-full bg-primary/10 mb-3">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <h4 className="font-medium mb-1">Smart Suggestions</h4>
                          <p className="text-sm text-muted-foreground">
                            Get real-time document suggestions based on discussion topics
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="stagger-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sessionsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading sessions...
                  </div>
                ) : recentSessions.length === 0 ? (
                  <div className="p-6 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No sessions yet. Start your first session above.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y">
                      {recentSessions.slice(0, 10).map((session) => (
                        <div
                          key={session.id}
                          className="p-4 hover-elevate cursor-pointer transition-colors relative"
                          onClick={() => navigate(`/ambient-intelligence/${session.id}`)}
                          data-testid={`session-item-${session.id}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm truncate pr-2">
                              {session.sessionName}
                            </span>
                            {getStatusBadge(session.status)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{session.sessionType.replace("_", " ")}</span>
                            <span>&middot;</span>
                            <span>
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
            
            <Card className="stagger-5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Use a quiet environment for best transcription accuracy
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Link sessions to cases for relevant document suggestions
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Speak clearly and at a moderate pace for optimal results
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Chrome or Edge browser recommended for best performance
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
