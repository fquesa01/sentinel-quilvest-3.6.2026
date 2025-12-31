import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Circle,
  Square,
  ScreenShare,
  ScreenShareOff,
  Settings,
  Copy,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Clock,
  Calendar,
  Link as LinkIcon,
  Shield,
  Lock,
  FileText,
  MoreVertical,
  Home,
  Brain,
  Briefcase,
  FolderOpen,
  Layout,
  Grid3X3,
  User,
  ChevronDown,
  MessageSquare,
  GripVertical,
  Radio,
  UserCheck,
  UserX,
  DoorOpen,
  Sparkles as SparklesIcon,
  ImageOff,
} from 'lucide-react';
import { Link } from 'wouter';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Volume2, PanelLeftClose, PanelLeft, Maximize2 } from 'lucide-react';
import type { VideoMeeting } from '@shared/schema';
import { AISuggestionsPanel } from '@/components/ambient/AISuggestionsPanel';
import { FocusIssuesPanel } from '@/components/ambient/FocusIssuesPanel';
import { SuggestionData } from '@/components/ambient/SuggestionCard';

// Type for boolean search results from API
type BooleanSearchResult = {
  query: string;
  topic: string;
  rationale: string;
  riskLevel: "high" | "medium" | "low";
  documents: Array<{
    id: string;
    subject: string | null;
    sender: string | null;
    riskLevel: string | null;
    matchType: string;
  }>;
};

interface TranscriptSegment {
  id: string;
  content: string;
  timestampMs: number;
  confidence?: number;
}

// Helper function to format seconds as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface VideoMeetingWithCaseInfo extends VideoMeeting {
  caseNumber?: string;
  caseTitle?: string;
  privilegeStatus?: 'none' | 'privileged' | 'confidential';
}

interface Participant {
  peerId: string;
  participantId: string;
  userId?: string;
  userName: string;
  role: string;
  stream?: MediaStream;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

// Separate component for remote video to prevent re-renders from causing stream reassignment
function RemoteVideoTile({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  
  // Only update srcObject when the actual stream changes, not on every render
  useEffect(() => {
    const video = videoRef.current;
    const stream = participant.stream;
    
    // Only assign if stream actually changed
    if (video && stream && currentStreamRef.current !== stream) {
      console.log('[RemoteVideoTile] Assigning new stream for:', participant.userName);
      video.srcObject = stream;
      currentStreamRef.current = stream;
    }
  }, [participant.stream, participant.userName]);

  return (
    <Card className="relative overflow-hidden h-full" data-testid={`remote-video-${participant.peerId}`}>
      <div className="bg-muted relative h-full w-full">
        {participant.stream && participant.videoEnabled !== false ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <VideoOff className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 z-10">
          <Badge variant="secondary">{participant.userName}</Badge>
        </div>
        {participant.audioEnabled === false && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="destructive"><MicOff className="h-3 w-3" /></Badge>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function VideoMeetingPage() {
  const [, params] = useRoute('/video-meeting/:roomId');
  const [, setLocation] = useLocation();
  const roomId = params?.roomId || '';
  const { toast } = useToast();
  const { user } = useAuth();

  const [hasJoined, setHasJoined] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const [isCheckingMedia, setIsCheckingMedia] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [displayName, setDisplayName] = useState('');

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, Participant>>(new Map());
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [privilegeStatus, setPrivilegeStatus] = useState<'none' | 'privileged' | 'confidential'>('none');
  const [ambientIntelligenceEnabled, setAmbientIntelligenceEnabled] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [isStartingTranscription, setIsStartingTranscription] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcriptionSource, setTranscriptionSource] = useState<'elevenlabs' | 'webspeech' | null>(null);
  const [showAmbientPanel, setShowAmbientPanel] = useState(false);
  const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(false);
  const [linkedMatterId, setLinkedMatterId] = useState<string | null>(null);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; fromPeerId?: string; userName: string; message: string; timestamp: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<Array<{ peerId: string; participantId: string; userId?: string; userName: string; role: string; requestedAt: string }>>([]);
  const [wasAdmitted, setWasAdmitted] = useState(false);
  const [wasDenied, setWasDenied] = useState(false);
  const [showWaitingRoomPanel, setShowWaitingRoomPanel] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [virtualBackgroundEnabled, setVirtualBackgroundEnabled] = useState(false);
  const [virtualBackgroundMode, setVirtualBackgroundMode] = useState<'blur' | 'none'>('none');
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const virtualVideoRef = useRef<HTMLVideoElement | null>(null);
  const virtualAnimationRef = useRef<number | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const virtualCanvasStreamRef = useRef<MediaStream | null>(null);
  
  // Flexible layout system state - with localStorage persistence
  const [viewMode, setViewMode] = useState<'transcript' | 'balanced' | 'video'>(() => {
    try {
      const saved = localStorage.getItem('video-meeting-view-mode');
      if (saved && ['transcript', 'balanced', 'video'].includes(saved)) {
        return saved as 'transcript' | 'balanced' | 'video';
      }
    } catch {}
    return 'balanced';
  });
  const [videoLayout, setVideoLayout] = useState<'grid' | 'speaker'>(() => {
    try {
      const saved = localStorage.getItem('video-meeting-video-layout');
      if (saved && ['grid', 'speaker'].includes(saved)) {
        return saved as 'grid' | 'speaker';
      }
    } catch {}
    return 'grid';
  });
  const [transcriptPanelWidth, setTranscriptPanelWidth] = useState(55);
  const [showViewPicker, setShowViewPicker] = useState(false);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [localIsSpeaking, setLocalIsSpeaking] = useState(false);
  const [linkedMatterType, setLinkedMatterType] = useState<'case' | 'deal' | null>(null);
  const [showMatterSelector, setShowMatterSelector] = useState(false);
  
  // AI Suggestions state for ambient intelligence
  const [booleanResults, setBooleanResults] = useState<BooleanSearchResult[]>([]);
  const [dismissedDocIds, setDismissedDocIds] = useState<Set<string>>(new Set());
  const [previousQueries, setPreviousQueries] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [focusMode, setFocusMode] = useState<"all" | "focused">("all");
  const [focusResults, setFocusResults] = useState<Array<{
    documentId: string;
    documentType: string;
    documentTitle: string;
    documentDate: string | null;
    preview: string;
    relevance: "contradicts" | "supports" | "pattern" | "impeaches" | "related";
    relevanceNote: string;
    confidence: "high" | "medium" | "low";
    focusIssueId: string;
    focusIssueTitle: string;
  }>>([]);
  const [isFocusSearching, setIsFocusSearching] = useState(false);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const speakerDetectionRef = useRef<{ audioContext: AudioContext | null; analyzers: Map<string, AnalyserNode> }>({ audioContext: null, analyzers: new Map() });
  const speakerDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  
  // Refs for AI analysis
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptsRef = useRef(transcriptSegments);
  const hasTriggeredInitialAnalysis = useRef(false);
  const lastAnalyzedCountRef = useRef(0);
  const linkedMatterIdRef = useRef(linkedMatterId);
  const linkedMatterTypeRef = useRef(linkedMatterType);

  const wsRef = useRef<WebSocket | null>(null);
  const transcriptionWsRef = useRef<WebSocket | null>(null);
  // Use any type for Web Speech API as it may not be available in all browsers
  const webSpeechRecognitionRef = useRef<any>(null);
  const transcriptionAudioContextRef = useRef<AudioContext | null>(null);
  const transcriptionSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const transcriptionProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to store latest callback versions to avoid stale closures in WebSocket handler
  const initiateCallRef = useRef<(remotePeerId: string) => Promise<void>>();
  const handleOfferRef = useRef<(fromPeerId: string, sdp: RTCSessionDescriptionInit) => Promise<void>>();
  const handleAnswerRef = useRef<(fromPeerId: string, sdp: RTCSessionDescriptionInit) => Promise<void>>();
  const handleIceCandidateRef = useRef<(fromPeerId: string, candidate: RTCIceCandidateInit) => Promise<void>>();

  const { data: meeting, isLoading: meetingLoading, error: meetingError } = useQuery<VideoMeetingWithCaseInfo>({
    queryKey: ['/api/video-meetings/room', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/video-meetings/room/${roomId}`);
      if (!res.ok) {
        throw new Error('Meeting not found');
      }
      return res.json();
    },
    enabled: !!roomId,
  });

  // Case info is now included in the meeting data - no need for separate expensive query

  // Query for cases list to allow linking video meeting to a case
  const { data: cases = [] } = useQuery<Array<{ id: string; caseNumber: string; title: string }>>({
    queryKey: ['/api/cases/list'],
    queryFn: async () => {
      const res = await fetch('/api/cases');
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((c: any) => ({ id: c.id, caseNumber: c.caseNumber, title: c.title }));
    },
    enabled: !!user, // Only fetch for authenticated users
  });

  // Query for deals list to allow linking video meeting to a business transaction
  const { data: deals = [] } = useQuery<Array<{ id: string; name: string; dealType: string }>>({
    queryKey: ['/api/deals/list'],
    queryFn: async () => {
      const res = await fetch('/api/deals');
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({ id: d.id, name: d.name, dealType: d.dealType }));
    },
    enabled: !!user, // Only fetch for authenticated users
  });

  // Fetch focus issues for this meeting
  interface FocusIssue {
    id: string;
    sessionId?: string | null;
    meetingId?: string | null;
    caseId?: string | null;
    title: string;
    shortName?: string | null;
    active: boolean;
    displayOrder: number;
    keywords?: string[] | null;
    pinnedDocumentIds?: string[] | null;
  }
  
  const { data: focusIssues = [] } = useQuery<FocusIssue[]>({
    queryKey: ["/api/focus-issues", { meetingId: meeting?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/focus-issues?meetingId=${meeting?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!meeting?.id,
  });
  
  // Fetch focus issue results when in focused mode
  const focusSearchMutation = useMutation({
    mutationFn: async () => {
      const caseId = linkedMatterType === 'case' ? linkedMatterId : null;
      if (!caseId) return { results: [] };
      
      // Get recent transcript text for context
      const transcriptText = transcriptSegments
        .slice(-10)
        .map(t => t.content)
        .join(" ");
      
      const response = await apiRequest("POST", "/api/focus-issues/search-all", {
        meetingId: meeting?.id,
        caseId,
        transcriptText,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setFocusResults(data.results || []);
      setIsFocusSearching(false);
    },
    onError: () => {
      setIsFocusSearching(false);
    },
  });
  
  // Trigger focus search when mode changes or issues update
  const activeIssueCount = focusIssues.filter(i => i.active).length;
  useEffect(() => {
    const caseId = linkedMatterType === 'case' ? linkedMatterId : null;
    if (focusMode === "focused" && caseId && activeIssueCount > 0) {
      setIsFocusSearching(true);
      focusSearchMutation.mutate();
    }
  }, [focusMode, linkedMatterId, linkedMatterType, activeIssueCount]);

  const updateMeetingMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest('PATCH', `/api/video-meetings/${meeting?.id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-meetings/room', roomId] });
    },
  });

  // Boolean search mutation for AI-powered document discovery
  const booleanSearchMutation = useMutation({
    mutationFn: async (transcriptText: string) => {
      // Use refs to get latest values and avoid stale closures
      const currentMatterType = linkedMatterTypeRef.current;
      const currentMatterId = linkedMatterIdRef.current;
      const caseId = currentMatterType === 'case' ? currentMatterId : (meeting?.caseId || null);
      const response = await apiRequest("POST", `/api/video-meetings/${meeting?.id}/boolean-search`, {
        caseId,
        transcriptText,
      });
      return response.json();
    },
    onMutate: () => {
      setIsAnalyzing(true);
    },
    onSuccess: (data: { queries: any[]; results: BooleanSearchResult[] }) => {
      setIsAnalyzing(false);
      if (data.results && data.results.length > 0) {
        const newResults = data.results.filter(r => !previousQueries.has(r.query));
        if (newResults.length > 0) {
          setBooleanResults(prev => [...newResults, ...prev].slice(0, 10));
          setPreviousQueries(prev => new Set(Array.from(prev).concat(newResults.map(r => r.query))));
        }
      }
    },
    onError: () => {
      setIsAnalyzing(false);
    },
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email || '');
    }
  }, [user]);

  // Load settings from meeting metadata
  useEffect(() => {
    if (meeting?.metadata) {
      const metadata = meeting.metadata as Record<string, unknown>;
      if (metadata.privilegeStatus) {
        setPrivilegeStatus(metadata.privilegeStatus as 'none' | 'privileged' | 'confidential');
      }
      if (typeof metadata.ambientIntelligenceEnabled === 'boolean') {
        setAmbientIntelligenceEnabled(metadata.ambientIntelligenceEnabled);
      }
      if (metadata.linkedMatterId && metadata.linkedMatterType) {
        setLinkedMatterId(metadata.linkedMatterId as string);
        setLinkedMatterType(metadata.linkedMatterType as 'case' | 'deal');
      }
    }
    // Also check if meeting already has a caseId
    if (meeting?.caseId && !linkedMatterId) {
      setLinkedMatterId(meeting.caseId);
      setLinkedMatterType('case');
    }
  }, [meeting]);

  // Keep transcriptsRef in sync with transcriptSegments
  useEffect(() => {
    transcriptsRef.current = transcriptSegments;
  }, [transcriptSegments]);

  // Keep linkedMatter refs in sync to avoid stale closures in interval
  useEffect(() => {
    linkedMatterIdRef.current = linkedMatterId;
    linkedMatterTypeRef.current = linkedMatterType;
  }, [linkedMatterId, linkedMatterType]);

  // Periodic AI analysis for ambient intelligence - runs every 20 seconds when recording with ambient intelligence enabled
  useEffect(() => {
    // Always clear any existing interval first to prevent overlapping intervals
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    // Only start analysis if all conditions are met including meeting being loaded
    if (ambientIntelligenceEnabled && isRecording && showTranscription && meeting?.id) {
      // Reset analysis tracking on start
      hasTriggeredInitialAnalysis.current = false;
      lastAnalyzedCountRef.current = 0;
      
      // Run analysis every 20 seconds when there's new content
      analysisIntervalRef.current = setInterval(() => {
        const currentCount = transcriptsRef.current.length;
        const hasNewContent = currentCount > lastAnalyzedCountRef.current;
        if (hasNewContent && currentCount >= 2) {
          // Use refs to get the latest values (avoid stale closures)
          const currentMatterType = linkedMatterTypeRef.current;
          const currentMatterId = linkedMatterIdRef.current;
          
          // Need a linked case for boolean search
          if (currentMatterType === 'case' && currentMatterId) {
            const recentText = transcriptsRef.current
              .slice(-5)
              .map(t => t.content)
              .join(" ");
            if (recentText.length >= 50) {
              booleanSearchMutation.mutate(recentText);
              lastAnalyzedCountRef.current = currentCount;
            }
          }
        }
      }, 20000); // 20 second interval
    }
    
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    };
  }, [ambientIntelligenceEnabled, isRecording, showTranscription, meeting?.id]);

  // Trigger initial analysis after 3 transcript segments
  useEffect(() => {
    // Use refs for matter state to avoid stale closures
    const currentMatterType = linkedMatterTypeRef.current;
    const currentMatterId = linkedMatterIdRef.current;
    
    if (ambientIntelligenceEnabled && isRecording && showTranscription && meeting?.id &&
        transcriptSegments.length >= 3 && !hasTriggeredInitialAnalysis.current &&
        currentMatterType === 'case' && currentMatterId) {
      hasTriggeredInitialAnalysis.current = true;
      const recentText = transcriptSegments
        .slice(-5)
        .map(t => t.content)
        .join(" ");
      if (recentText.length >= 50) {
        booleanSearchMutation.mutate(recentText);
      }
    }
  }, [ambientIntelligenceEnabled, isRecording, showTranscription, transcriptSegments.length, meeting?.id]);

  // Active speaker detection - monitors audio levels from local and remote streams
  useEffect(() => {
    if (!hasJoined || !localStream) return;

    const SPEAKING_THRESHOLD = 30; // Audio level threshold (0-255)
    const SILENCE_TIMEOUT = 1000; // Time before marking as not speaking
    
    let lastSpeakingTime: Map<string, number> = new Map();
    
    const setupAnalyzer = (stream: MediaStream, id: string) => {
      try {
        if (!speakerDetectionRef.current.audioContext) {
          speakerDetectionRef.current.audioContext = new AudioContext();
        }
        const audioContext = speakerDetectionRef.current.audioContext;
        
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        speakerDetectionRef.current.analyzers.set(id, analyser);
      } catch (err) {
        console.error('Failed to setup audio analyzer:', err);
      }
    };
    
    // Setup analyzer for local stream
    setupAnalyzer(localStream, 'local');
    
    // Setup analyzers for remote participants
    remoteParticipants.forEach((participant, peerId) => {
      if (participant.stream && !speakerDetectionRef.current.analyzers.has(peerId)) {
        setupAnalyzer(participant.stream, peerId);
      }
    });
    
    // Monitoring interval
    speakerDetectionIntervalRef.current = setInterval(() => {
      const analyzers = speakerDetectionRef.current.analyzers;
      const now = Date.now();
      let maxLevel = 0;
      let maxSpeakerId: string | null = null;
      
      analyzers.forEach((analyser, id) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average audio level
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        
        if (average > SPEAKING_THRESHOLD) {
          lastSpeakingTime.set(id, now);
          if (average > maxLevel) {
            maxLevel = average;
            maxSpeakerId = id;
          }
        }
      });
      
      // Update local speaking state
      const localLastSpoke = lastSpeakingTime.get('local') || 0;
      const isLocalSpeaking = (now - localLastSpoke) < SILENCE_TIMEOUT;
      setLocalIsSpeaking(isLocalSpeaking);
      
      // Find the loudest current speaker among remote participants
      let loudestRemote: string | null = null;
      if (maxSpeakerId && maxSpeakerId !== 'local') {
        loudestRemote = maxSpeakerId;
      }
      
      setActiveSpeakerId(loudestRemote);
    }, 100);
    
    return () => {
      if (speakerDetectionIntervalRef.current) {
        clearInterval(speakerDetectionIntervalRef.current);
      }
      speakerDetectionRef.current.analyzers.clear();
      if (speakerDetectionRef.current.audioContext) {
        speakerDetectionRef.current.audioContext.close().catch(() => {});
        speakerDetectionRef.current.audioContext = null;
      }
    };
  }, [hasJoined, localStream, remoteParticipants]);

  // Keyboard shortcuts for meeting controls - use ref to avoid stale closure issue
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  
  useEffect(() => {
    if (!hasJoined) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'm':
          // Toggle mute
          setAudioEnabled(prev => !prev);
          break;
        case 'v':
          // Toggle video
          setVideoEnabled(prev => !prev);
          break;
        case '1':
          // Transcript Focus mode
          setViewMode('transcript');
          setShowViewPicker(false);
          break;
        case '2':
          // Balanced mode
          setViewMode('balanced');
          setShowViewPicker(false);
          break;
        case '3':
          // Video Focus mode
          setViewMode('video');
          setShowViewPicker(false);
          break;
        case 'g':
          // Toggle grid/speaker layout (only in video/balanced modes)
          if (viewModeRef.current === 'video' || viewModeRef.current === 'balanced') {
            setVideoLayout(prev => prev === 'grid' ? 'speaker' : 'grid');
          }
          break;
        case 'escape':
          // Close any open dropdowns
          setShowViewPicker(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasJoined]);

  // Persist view mode and video layout preferences
  useEffect(() => {
    try {
      localStorage.setItem('video-meeting-view-mode', viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('video-meeting-video-layout', videoLayout);
    } catch {}
  }, [videoLayout]);

  // Re-attach localStream to video element when viewMode changes (video elements get recreated on mode switch)
  useEffect(() => {
    if (localStream && localVideoRef.current && hasJoined) {
      // Small delay to ensure the new video element is rendered
      const timer = setTimeout(() => {
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [viewMode, localStream, hasJoined]);

  useEffect(() => {
    const checkMediaPermissions = async () => {
      setIsCheckingMedia(true);
      try {
        // Check if mediaDevices API is available (not available on some mobile browsers without HTTPS)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('MediaDevices API not available');
          setHasMediaPermission(false);
          setIsCheckingMedia(false);
          return;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        setHasMediaPermission(true);
      } catch (error: any) {
        console.error('Media permission denied:', error?.name, error?.message);
        setHasMediaPermission(false);
      } finally {
        setIsCheckingMedia(false);
      }
    };

    // Delay slightly to ensure page is fully rendered first
    const timer = setTimeout(() => {
      checkMediaPermissions();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];

      if (videoTrack) videoTrack.enabled = videoEnabled;
      if (audioTrack) audioTrack.enabled = audioEnabled;
    }
  }, [localStream, videoEnabled, audioEnabled]);

  const createPeerConnection = useCallback((remotePeerId: string) => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);
    peerConnectionsRef.current.set(remotePeerId, pc);

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteParticipants(prev => {
        const updated = new Map(prev);
        const participant = updated.get(remotePeerId);
        if (participant) {
          updated.set(remotePeerId, { ...participant, stream: remoteStream });
        }
        return updated;
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          roomId,
          payload: {
            targetPeerId: remotePeerId,
            candidate: event.candidate,
          },
        }));
      }
    };

    return pc;
  }, [localStream, roomId]);

  const handleOffer = useCallback(async (fromPeerId: string, sdp: RTCSessionDescriptionInit) => {
    console.log('[VideoMeeting] Handling offer from:', fromPeerId);
    let pc = peerConnectionsRef.current.get(fromPeerId);
    if (!pc) {
      console.log('[VideoMeeting] Creating new peer connection for:', fromPeerId);
      pc = createPeerConnection(fromPeerId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    console.log('[VideoMeeting] Sending answer to:', fromPeerId);
    wsRef.current?.send(JSON.stringify({
      type: 'answer',
      roomId,
      payload: {
        targetPeerId: fromPeerId,
        sdp: answer,
      },
    }));
  }, [roomId, createPeerConnection]);

  const handleAnswer = useCallback(async (fromPeerId: string, sdp: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(fromPeerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }, []);

  const handleIceCandidate = useCallback(async (fromPeerId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionsRef.current.get(fromPeerId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const initiateCall = useCallback(async (remotePeerId: string) => {
    console.log('[VideoMeeting] Initiating call to:', remotePeerId);
    const pc = createPeerConnection(remotePeerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log('[VideoMeeting] Sending offer to:', remotePeerId);
    wsRef.current?.send(JSON.stringify({
      type: 'offer',
      roomId,
      payload: {
        targetPeerId: remotePeerId,
        sdp: offer,
      },
    }));
  }, [roomId, createPeerConnection]);

  // Keep refs updated with latest callback versions to avoid stale closures
  useEffect(() => {
    initiateCallRef.current = initiateCall;
    handleOfferRef.current = handleOffer;
    handleAnswerRef.current = handleAnswer;
    handleIceCandidateRef.current = handleIceCandidate;
  }, [initiateCall, handleOffer, handleAnswer, handleIceCandidate]);

  const connectWebSocket = useCallback(async () => {
    if (!meeting?.id) return;

    setIsConnecting(true);

    try {
      let token: string;
      let meetingRoomId: string;
      
      // Check if user is authenticated - if so, use authenticated endpoint
      // Otherwise use guest endpoint
      if (user) {
        const tokenRes = await apiRequest('POST', `/api/video-meetings/${meeting.id}/signaling-token`, {
          role: 'participant',
        });
        const data = await tokenRes.json();
        token = data.token;
        meetingRoomId = data.roomId;
      } else {
        // Guest user - use guest token endpoint
        const tokenRes = await fetch(`/api/video-meetings/${meeting.id}/guest-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: displayName.trim() }),
        });
        if (!tokenRes.ok) {
          const error = await tokenRes.json();
          throw new Error(error.message || 'Failed to join as guest');
        }
        const data = await tokenRes.json();
        token = data.token;
        meetingRoomId = data.roomId;
      }

      // Try to get media stream - but continue even if it fails on mobile
      let stream: MediaStream | null = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setLocalStream(stream);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else {
          console.warn('MediaDevices API not available - joining without camera/mic');
        }
      } catch (mediaError: any) {
        console.warn('Media access failed, joining without camera/mic:', mediaError?.name, mediaError?.message);
        // Continue without media - user can still see others
      }

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/signaling?token=${token}`;
      console.log('[VideoMeeting] Connecting to signaling server:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'join',
          roomId: meetingRoomId,
          userName: displayName,
          role: 'participant',
        }));
        
        // Set up keepalive ping every 30 seconds to prevent connection timeout
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'joined':
            setMyPeerId(message.peerId);
            setIsConnected(true);
            setIsConnecting(false);
            setIsHost(message.isHost === true);

            if (message.existingParticipants) {
              const participants = new Map<string, Participant>();
              for (const p of message.existingParticipants) {
                participants.set(p.peerId, {
                  peerId: p.peerId,
                  participantId: p.participantId,
                  userId: p.userId,
                  userName: p.userName,
                  role: p.role,
                });
                // Don't initiate calls here - existing participants will initiate calls to us
                // This prevents the WebRTC "glare" condition where both sides create offers
              }
              setRemoteParticipants(participants);
            }
            break;

          case 'participant-joined':
            console.log('[VideoMeeting] Participant joined:', message.userName, message.peerId);
            setRemoteParticipants(prev => {
              const updated = new Map(prev);
              updated.set(message.peerId, {
                peerId: message.peerId,
                participantId: message.participantId,
                userId: message.userId,
                userName: message.userName,
                role: message.role,
              });
              return updated;
            });
            toast({
              title: 'Participant Joined',
              description: `${message.userName} has joined the meeting.`,
            });
            // Initiate WebRTC call to the new participant using ref to get latest callback
            if (initiateCallRef.current) {
              await initiateCallRef.current(message.peerId);
            }
            break;

          case 'participant-left':
            setRemoteParticipants(prev => {
              const updated = new Map(prev);
              const participant = updated.get(message.peerId);
              if (participant) {
                toast({
                  title: 'Participant Left',
                  description: `${participant.userName} has left the meeting.`,
                });
                updated.delete(message.peerId);
              }
              return updated;
            });

            const pc = peerConnectionsRef.current.get(message.peerId);
            if (pc) {
              pc.close();
              peerConnectionsRef.current.delete(message.peerId);
            }
            break;

          case 'offer':
            console.log('[VideoMeeting] Received offer from:', message.fromPeerId);
            if (handleOfferRef.current) {
              await handleOfferRef.current(message.fromPeerId, message.sdp);
            }
            break;

          case 'answer':
            console.log('[VideoMeeting] Received answer from:', message.fromPeerId);
            if (handleAnswerRef.current) {
              await handleAnswerRef.current(message.fromPeerId, message.sdp);
            }
            break;

          case 'ice-candidate':
            if (handleIceCandidateRef.current) {
              await handleIceCandidateRef.current(message.fromPeerId, message.candidate);
            }
            break;

          case 'session-state':
            if (message.state?.isRecording !== undefined) {
              setIsRecording(message.state.isRecording);
            }
            break;

          case 'participant-update':
            setRemoteParticipants(prev => {
              const updated = new Map(prev);
              const participant = updated.get(message.peerId);
              if (participant) {
                updated.set(message.peerId, {
                  ...participant,
                  audioEnabled: message.audioEnabled ?? participant.audioEnabled,
                  videoEnabled: message.videoEnabled ?? participant.videoEnabled,
                });
              }
              return updated;
            });
            break;

          case 'chat':
            setChatMessages(prev => [...prev, {
              id: `${Date.now()}-${message.fromPeerId}`,
              fromPeerId: message.fromPeerId,
              userName: message.userName,
              message: message.message,
              timestamp: message.timestamp,
            }]);
            break;

          case 'waiting-room':
            // User is in waiting room
            setIsInWaitingRoom(true);
            setIsConnecting(false);
            toast({
              title: 'Waiting Room',
              description: message.message || 'Please wait for the host to admit you.',
            });
            break;

          case 'waiting-room-update':
            // Host receives updates about waiting participants
            setWaitingParticipants(message.waitingParticipants || []);
            break;

          case 'admitted':
            // User was admitted from waiting room
            setIsInWaitingRoom(false);
            setWasAdmitted(true);
            setMyPeerId(message.peerId);
            setIsConnected(true);
            setIsConnecting(false);

            if (message.existingParticipants) {
              const participants = new Map<string, Participant>();
              for (const p of message.existingParticipants) {
                participants.set(p.peerId, {
                  peerId: p.peerId,
                  participantId: p.participantId,
                  userId: p.userId,
                  userName: p.userName,
                  role: p.role,
                });
              }
              setRemoteParticipants(participants);
              // Initiate calls to all existing participants
              for (const p of message.existingParticipants) {
                if (initiateCallRef.current) {
                  await initiateCallRef.current(p.peerId);
                }
              }
            }
            toast({
              title: 'Admitted',
              description: 'You have been admitted to the meeting.',
            });
            break;

          case 'denied':
            // User was denied from waiting room
            setIsInWaitingRoom(false);
            setWasDenied(true);
            setIsConnecting(false);
            toast({
              title: 'Access Denied',
              description: message.message || 'Your request to join was denied.',
              variant: 'destructive',
            });
            break;
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = () => {
        setIsConnecting(false);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to the meeting room.',
          variant: 'destructive',
        });
      };

    } catch (error: any) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [meeting?.id, user, displayName, initiateCall, handleOffer, handleAnswer, handleIceCandidate, toast]);

  useEffect(() => {
    if (hasJoined && meeting) {
      connectWebSocket();
    }

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'leave', roomId }));
        wsRef.current.close();
      }

      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [hasJoined, meeting]);

  useEffect(() => {
    if (isConnected) {
      durationIntervalRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isConnected]);

  const handleJoinMeeting = () => {
    if (!displayName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your display name to join the meeting.',
        variant: 'destructive',
      });
      return;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    setHasJoined(true);
  };

  const handleLeaveMeeting = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    // Clean up transcription
    stopTranscription();
    
    // Clean up virtual background if active
    if (virtualBackgroundEnabled) {
      cleanupVirtualBackground();
    }
    originalVideoTrackRef.current = null;
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave', roomId }));
      wsRef.current.close();
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    setHasJoined(false);
    setIsConnected(false);
    setLocation('/interviews');
  };

  const toggleVideo = async () => {
    if (!localStream) return;
    
    if (videoEnabled) {
      // Disabling video
      // If virtual background is enabled, clean it up first
      if (virtualBackgroundEnabled) {
        cleanupVirtualBackground();
      }
      
      // Disable all video tracks in localStream
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = false;
      });
      
      // Also disable sender tracks in peer connections
      peerConnectionsRef.current.forEach((pc) => {
        pc.getSenders().forEach(sender => {
          if (sender.track?.kind === 'video') {
            sender.track.enabled = false;
          }
        });
      });
      
      setVideoEnabled(false);
      
      wsRef.current?.send(JSON.stringify({
        type: 'participant-update',
        roomId,
        payload: { videoEnabled: false },
      }));
    } else {
      // Re-enabling video
      try {
        // Check if we have a live track that just needs re-enabling
        const existingTrack = localStream.getVideoTracks()[0];
        
        if (existingTrack && existingTrack.readyState === 'live') {
          // Track is still alive, just re-enable it
          existingTrack.enabled = true;
          
          // Also re-enable in peer connections
          peerConnectionsRef.current.forEach((pc) => {
            pc.getSenders().forEach(sender => {
              if (sender.track?.kind === 'video') {
                sender.track.enabled = true;
              }
            });
          });
        } else {
          // Need to request a new video track
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const newVideoTrack = newStream.getVideoTracks()[0];
          
          if (newVideoTrack) {
            // Remove any existing dead video tracks
            localStream.getVideoTracks().forEach(track => {
              if (track.readyState === 'ended') {
                localStream.removeTrack(track);
              }
            });
            
            // Add the new track
            localStream.addTrack(newVideoTrack);
            
            // Store as original track for virtual background
            originalVideoTrackRef.current = newVideoTrack;
            
            // Update all peer connection senders with new track
            peerConnectionsRef.current.forEach((pc) => {
              const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
              if (videoSender) {
                videoSender.replaceTrack(newVideoTrack).catch(console.error);
              } else {
                pc.addTrack(newVideoTrack, localStream);
              }
            });
          }
        }
        
        // Refresh local video display
        if (localVideoRef.current) {
          // Reassign srcObject to force refresh
          const currentStream = localVideoRef.current.srcObject;
          localVideoRef.current.srcObject = null;
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(() => {});
        }
        
        setVideoEnabled(true);
        
        wsRef.current?.send(JSON.stringify({
          type: 'participant-update',
          roomId,
          payload: { videoEnabled: true },
        }));
      } catch (error) {
        console.error('Failed to re-enable camera:', error);
        toast({
          title: 'Camera Error',
          description: 'Could not re-enable the camera. Please check your permissions.',
          variant: 'destructive',
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);

        wsRef.current?.send(JSON.stringify({
          type: 'participant-update',
          roomId,
          payload: { audioEnabled: audioTrack.enabled },
        }));
      }
    }
  };

  const startRecording = async () => {
    if (!localStream) return;

    try {
      // Set recording start time for transcript timestamps
      recordingStartTimeRef.current = Date.now();
      
      const combinedStream = new MediaStream();
      localStream.getTracks().forEach(track => combinedStream.addTrack(track));

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];
        console.log('Recording stopped, blob size:', blob.size);

        // Upload recording to object storage
        if (blob.size > 0 && meeting?.id) {
          try {
            // Request upload URL
            const urlResponse = await fetch(`/api/video-meetings/${meeting.id}/recordings/request-upload-url`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: `recording-${Date.now()}.webm`,
                contentType: 'video/webm',
                duration: sessionDuration,
                fileSize: blob.size,
              }),
            });

            if (!urlResponse.ok) {
              throw new Error('Failed to get upload URL');
            }

            const { uploadURL, recordingId, objectPath } = await urlResponse.json();

            // Upload the blob directly to the presigned URL
            const uploadResponse = await fetch(uploadURL, {
              method: 'PUT',
              body: blob,
              headers: { 'Content-Type': 'video/webm' },
            });

            if (!uploadResponse.ok) {
              throw new Error('Failed to upload recording');
            }

            // Finalize the recording
            const finalizeResponse = await fetch(`/api/video-meetings/${meeting.id}/recordings/${recordingId}/finalize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                objectPath: uploadURL, // Use the full URL for normalization
                duration: sessionDuration,
                fileSize: blob.size,
              }),
            });

            if (!finalizeResponse.ok) {
              throw new Error('Failed to finalize recording');
            }

            toast({
              title: 'Recording Uploaded',
              description: 'Your recording has been saved successfully.',
            });
          } catch (uploadError: any) {
            console.error('Failed to upload recording:', uploadError);
            toast({
              title: 'Upload Failed',
              description: 'Could not save the recording. Please try again.',
              variant: 'destructive',
            });
          }
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      
      // Show ambient panel if ambient intelligence is enabled
      if (ambientIntelligenceEnabled) {
        setShowAmbientPanel(true);
      }

      wsRef.current?.send(JSON.stringify({
        type: 'session-state',
        roomId,
        payload: { isRecording: true },
      }));

      toast({
        title: 'Recording Started',
        description: 'The meeting is now being recorded.',
      });
    } catch (error: any) {
      toast({
        title: 'Recording Error',
        description: 'Failed to start recording.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Clean up transcription state for next recording session
      setTranscriptSegments([]);
      setInterimTranscript('');
      setTranscriptionText('');
      recordingStartTimeRef.current = 0;

      wsRef.current?.send(JSON.stringify({
        type: 'session-state',
        roomId,
        payload: { isRecording: false },
      }));

      toast({
        title: 'Recording Stopped',
        description: 'The recording has been saved.',
      });
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      roomId,
      payload: { message: chatInput.trim() },
    }));
    
    setChatInput('');
  };

  const admitParticipant = (peerId: string) => {
    if (!wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'admit-participant',
      roomId,
      peerId,
    }));
    
    toast({
      title: 'Participant Admitted',
      description: 'The participant has been admitted to the meeting.',
    });
  };

  const denyParticipant = (peerId: string) => {
    if (!wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'deny-participant',
      roomId,
      peerId,
    }));
    
    toast({
      title: 'Participant Denied',
      description: 'The participant has been denied access to the meeting.',
    });
  };

  const screenStreamRef = useRef<MediaStream | null>(null);

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Update local video to show screen
      if (localVideoRef.current) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const displayStream = new MediaStream([videoTrack]);
        localVideoRef.current.srcObject = displayStream;
      }

      setIsScreenSharing(true);

      // Notify other participants via WebSocket
      wsRef.current?.send(JSON.stringify({
        type: 'participant-update',
        roomId,
        payload: { screenSharing: true },
      }));

      // When screen sharing ends (user clicks "Stop sharing" in browser)
      screenTrack.onended = () => {
        stopScreenShare();
      };

      toast({
        title: 'Screen Sharing Started',
        description: 'Your screen is now being shared.',
      });
    } catch (error: any) {
      console.error('Screen share error:', error);
      if (error.name !== 'NotAllowedError') {
        toast({
          title: 'Screen Share Error',
          description: 'Failed to start screen sharing.',
          variant: 'destructive',
        });
      }
    }
  };

  const stopScreenShare = async () => {
    try {
      // Stop screen share tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      // Re-enable camera if it was on
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        
        // Replace screen track with camera track in all peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Restore local video to camera
        if (localVideoRef.current && videoTrack) {
          localVideoRef.current.srcObject = localStream;
        }
      }

      setIsScreenSharing(false);

      // Notify other participants via WebSocket
      wsRef.current?.send(JSON.stringify({
        type: 'participant-update',
        roomId,
        payload: { screenSharing: false },
      }));

      toast({
        title: 'Screen Sharing Stopped',
        description: 'You are no longer sharing your screen.',
      });
    } catch (error) {
      console.error('Stop screen share error:', error);
    }
  };

  // Virtual Background Functions
  
  // Shared cleanup helper for virtual background resources
  const cleanupVirtualBackground = useCallback(() => {
    // Stop animation frame first to prevent further processing
    if (virtualAnimationRef.current) {
      cancelAnimationFrame(virtualAnimationRef.current);
      virtualAnimationRef.current = null;
    }
    
    // Clean up video element
    if (virtualVideoRef.current) {
      virtualVideoRef.current.pause();
      virtualVideoRef.current.srcObject = null;
      virtualVideoRef.current = null;
    }
    
    // Stop canvas stream tracks to prevent frame leakage
    if (virtualCanvasStreamRef.current) {
      virtualCanvasStreamRef.current.getTracks().forEach(track => {
        track.enabled = false;
        track.stop();
      });
      virtualCanvasStreamRef.current = null;
    }
    
    // Clean up canvas
    virtualCanvasRef.current = null;
    virtualCtxRef.current = null;
    
    // Restore original video track to peer connections
    if (originalVideoTrackRef.current && localStream) {
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && originalVideoTrackRef.current) {
          sender.replaceTrack(originalVideoTrackRef.current);
        }
      });
      
      // Restore local video preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }
    
    setVirtualBackgroundEnabled(false);
    setVirtualBackgroundMode('none');
  }, [localStream]);
  
  const startVirtualBackground = useCallback(async () => {
    if (!localStream || isScreenSharing) return;

    try {
      const videoTrack = localStream.getVideoTracks()[0];
      if (!videoTrack) return;

      // Store original track
      originalVideoTrackRef.current = videoTrack;

      // Create hidden video element to capture camera frames
      const video = document.createElement('video');
      video.srcObject = localStream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      await video.play();
      virtualVideoRef.current = video;

      // Create canvas for processing
      const canvas = document.createElement('canvas');
      canvas.width = videoTrack.getSettings().width || 640;
      canvas.height = videoTrack.getSettings().height || 480;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get canvas context');
      virtualCanvasRef.current = canvas;
      virtualCtxRef.current = ctx;

      // Start processing frames
      const processFrame = () => {
        if (!virtualVideoRef.current || !virtualCanvasRef.current || !virtualCtxRef.current) return;

        const ctx = virtualCtxRef.current;
        const canvas = virtualCanvasRef.current;
        const video = virtualVideoRef.current;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply blur effect using CSS filter
        if (virtualBackgroundMode === 'blur') {
          ctx.filter = 'blur(10px)';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          
          // Draw the person on top (simplified - just uses center portion)
          // For a real implementation, you'd use ML-based segmentation
          const centerX = canvas.width * 0.25;
          const centerY = canvas.height * 0.1;
          const centerW = canvas.width * 0.5;
          const centerH = canvas.height * 0.8;
          
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(
            canvas.width / 2,
            canvas.height / 2,
            centerW / 2,
            centerH / 2,
            0, 0, 2 * Math.PI
          );
          ctx.clip();
          ctx.filter = 'none';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        virtualAnimationRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();

      // Get canvas stream and replace video track
      const canvasStream = canvas.captureStream(30);
      virtualCanvasStreamRef.current = canvasStream; // Store for cleanup
      const processedTrack = canvasStream.getVideoTracks()[0];

      // Replace in peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(processedTrack);
        }
      });

      // Update local video preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = canvasStream;
      }

      setVirtualBackgroundEnabled(true);
      setVirtualBackgroundMode('blur');

      toast({
        title: 'Virtual Background Enabled',
        description: 'Background blur is now active.',
      });
    } catch (error) {
      console.error('Virtual background error:', error);
      toast({
        title: 'Virtual Background Error',
        description: 'Failed to enable virtual background.',
        variant: 'destructive',
      });
    }
  }, [localStream, isScreenSharing, toast]);

  const stopVirtualBackground = useCallback(async () => {
    try {
      cleanupVirtualBackground();
      
      toast({
        title: 'Virtual Background Disabled',
        description: 'Background blur has been turned off.',
      });
    } catch (error) {
      console.error('Stop virtual background error:', error);
    }
  }, [cleanupVirtualBackground, toast]);

  const toggleVirtualBackground = useCallback(() => {
    if (virtualBackgroundEnabled) {
      stopVirtualBackground();
    } else {
      startVirtualBackground();
    }
  }, [virtualBackgroundEnabled, startVirtualBackground, stopVirtualBackground]);

  const startTranscription = async (): Promise<boolean> => {
    if (!localStream) {
      toast({
        title: 'Transcription Error',
        description: 'No audio stream available for transcription.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Fetch single-use token from backend
      console.log('[Transcription] Fetching token...');
      const res = await fetch(`/api/video-meetings/room/${roomId}/transcription-token`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to get transcription token: ${errText}`);
      }
      const { token } = await res.json();
      console.log('[Transcription] Token received');

      // Use the same endpoint that works in interview-session.tsx: /v1/speech-to-text/stream
      const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/stream?token=${token}`;
      console.log('[Transcription] Connecting to WebSocket...');
      
      return new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        transcriptionWsRef.current = ws;

        ws.onopen = () => {
          console.log('[Transcription] WebSocket connected successfully');
          
          // Initialize timestamp reference if not already set (for transcript timing)
          if (recordingStartTimeRef.current === 0) {
            recordingStartTimeRef.current = Date.now();
          }
          
          try {
            // Set up audio processing - use default sample rate, we'll resample to 16kHz
            const audioContext = new AudioContext();
            transcriptionAudioContextRef.current = audioContext;
            const inputSampleRate = audioContext.sampleRate;
            const outputSampleRate = 16000; // ElevenLabs expects 16kHz
            
            console.log(`[Transcription] Audio: resampling from ${inputSampleRate}Hz to ${outputSampleRate}Hz`);

            // Create source from local audio track
            const audioTrack = localStream.getAudioTracks()[0];
            if (!audioTrack) {
              throw new Error('No audio track available');
            }
            
            // Create a new stream with just the audio track
            const audioOnlyStream = new MediaStream([audioTrack]);
            const source = audioContext.createMediaStreamSource(audioOnlyStream);
            transcriptionSourceRef.current = source;

            // Use ScriptProcessorNode for audio processing
            const bufferSize = 4096;
            const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
            transcriptionProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (ws.readyState !== WebSocket.OPEN) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Linear resampling from native rate to 16kHz
              const ratio = inputSampleRate / outputSampleRate;
              const outputLength = Math.floor(inputData.length / ratio);
              const resampled = new Float32Array(outputLength);
              
              for (let i = 0; i < outputLength; i++) {
                const srcIndex = i * ratio;
                const srcIndexFloor = Math.floor(srcIndex);
                const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
                const fraction = srcIndex - srcIndexFloor;
                
                // Linear interpolation
                resampled[i] = inputData[srcIndexFloor] * (1 - fraction) + 
                              inputData[srcIndexCeil] * fraction;
              }
              
              // Convert to PCM16
              const pcm16 = new Int16Array(resampled.length);
              for (let i = 0; i < resampled.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, resampled[i] * 32768));
              }
              
              // Send raw PCM binary data (same as interview-session.tsx)
              ws.send(pcm16.buffer);
            };

            // Create silent gain node to prevent audio loopback/echo
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0; // Mute output to prevent feedback loop
            
            source.connect(processor);
            processor.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            console.log('[Transcription] Audio processing initialized');

            setTranscriptionSource('elevenlabs');
            toast({
              title: 'Transcription Started',
              description: 'Live transcription with ElevenLabs is now active.',
            });
            
            resolve(true);
          } catch (initError: any) {
            console.error('[Transcription] Error initializing audio:', initError);
            toast({
              title: 'Transcription Error',
              description: initError.message || 'Failed to initialize audio processing.',
              variant: 'destructive',
            });
            ws.close();
            stopTranscription();
            resolve(false);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle ElevenLabs stream response format (same as interview-session.tsx)
            if (data.text) {
              if (data.is_final) {
                // Final transcript segment
                const text = data.text;
                if (text.trim()) {
                  setTranscriptionText((prev) => {
                    const separator = prev ? ' ' : '';
                    return prev + separator + text;
                  });
                  
                  // Add to transcript segments for ambient panel
                  const segment: TranscriptSegment = {
                    id: `ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    content: text,
                    timestampMs: Date.now() - recordingStartTimeRef.current,
                    confidence: 0.9,
                  };
                  setTranscriptSegments(prev => [...prev, segment]);
                  setInterimTranscript('');
                  
                  // Auto-scroll to bottom
                  setTimeout(() => {
                    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              } else {
                // Interim result - update in place for real-time streaming
                setInterimTranscript(data.text);
              }
            }
          } catch (e) {
            console.error('[Transcription] Error parsing message:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('[Transcription] WebSocket error:', error);
          toast({
            title: 'Transcription Error',
            description: 'Connection error occurred. Check console for details.',
            variant: 'destructive',
          });
          stopTranscription();
          resolve(false);
        };

        ws.onclose = (event) => {
          console.log('[Transcription] WebSocket closed, code:', event.code, 'reason:', event.reason);
          
          // Cleanup on close
          if (transcriptionProcessorRef.current) {
            transcriptionProcessorRef.current.disconnect();
            transcriptionProcessorRef.current = null;
          }
          if (transcriptionAudioContextRef.current && transcriptionAudioContextRef.current.state !== 'closed') {
            transcriptionAudioContextRef.current.close();
            transcriptionAudioContextRef.current = null;
          }
          
          if (event.code !== 1000) {
            console.warn('[Transcription] Abnormal close:', event.code, event.reason);
          }
        };
        
        // Timeout if connection takes too long
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.error('[Transcription] Connection timeout');
            ws.close();
            resolve(false);
          }
        }, 10000);
      });

    } catch (error: any) {
      console.error('[Transcription] Error starting:', error);
      toast({
        title: 'Transcription Error',
        description: error.message || 'Failed to start transcription.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const cleanupElevenLabsTranscription = () => {
    // Clean up ElevenLabs audio processing resources
    if (transcriptionProcessorRef.current) {
      transcriptionProcessorRef.current.disconnect();
      transcriptionProcessorRef.current = null;
    }
    if (transcriptionSourceRef.current) {
      transcriptionSourceRef.current.disconnect();
      transcriptionSourceRef.current = null;
    }
    if (transcriptionAudioContextRef.current) {
      transcriptionAudioContextRef.current.close();
      transcriptionAudioContextRef.current = null;
    }
    if (transcriptionWsRef.current) {
      transcriptionWsRef.current.close();
      transcriptionWsRef.current = null;
    }
  };

  const stopTranscription = () => {
    // Clean up ElevenLabs resources
    cleanupElevenLabsTranscription();
    
    // Clean up Web Speech API if active
    if (webSpeechRecognitionRef.current) {
      webSpeechRecognitionRef.current.stop();
      webSpeechRecognitionRef.current = null;
    }
    
    // Reset timestamp reference for fresh start on next session
    // Only reset if not recording (recording manages its own timestamp)
    if (!isRecording) {
      recordingStartTimeRef.current = 0;
    }
    
    // Reset state
    setInterimTranscript('');
    setTranscriptionSource(null);
    setShowTranscription(false);
  };

  const startWebSpeechFallback = (): boolean => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Transcription] Web Speech API not supported');
      return false;
    }

    try {
      console.log('[Transcription] Starting Web Speech API fallback...');
      
      // Initialize timestamp reference if not already set (for transcript timing)
      if (recordingStartTimeRef.current === 0) {
        recordingStartTimeRef.current = Date.now();
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        
        if (final) {
          setTranscriptionText((prev) => {
            const separator = prev ? ' ' : '';
            return prev + separator + final;
          });
          
          // Add to transcript segments for ambient panel
          const segment: TranscriptSegment = {
            id: `ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: final,
            timestampMs: Date.now() - recordingStartTimeRef.current,
            confidence: 0.85,
          };
          setTranscriptSegments(prev => [...prev, segment]);
          setInterimTranscript('');
          
          setTimeout(() => {
            transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        
        if (interim) {
          setInterimTranscript(interim);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('[Transcription] Web Speech error:', event.error);
        if (event.error === 'no-speech') {
          // This is normal, restart
          return;
        }
      };
      
      recognition.onend = () => {
        // Restart if still showing transcription
        if (webSpeechRecognitionRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore errors on restart
          }
        }
      };
      
      recognition.start();
      webSpeechRecognitionRef.current = recognition;
      setTranscriptionSource('webspeech');
      
      toast({
        title: 'Transcription Started',
        description: 'Using browser speech recognition (fallback mode).',
      });
      
      return true;
    } catch (error: any) {
      console.error('[Transcription] Web Speech error:', error);
      return false;
    }
  };

  const toggleTranscription = async () => {
    // Guard against concurrent toggle attempts
    if (isStartingTranscription) {
      return;
    }
    
    if (showTranscription) {
      stopTranscription();
    } else {
      setIsStartingTranscription(true);
      try {
        // Try ElevenLabs first
        const success = await startTranscription();
        if (success) {
          setShowTranscription(true);
        } else {
          // Clean up any partial ElevenLabs resources before fallback
          cleanupElevenLabsTranscription();
          setInterimTranscript('');
          
          // Fallback to Web Speech API
          console.log('[Transcription] ElevenLabs failed, trying Web Speech API fallback...');
          const fallbackSuccess = startWebSpeechFallback();
          if (fallbackSuccess) {
            setShowTranscription(true);
          } else {
            toast({
              title: 'Transcription Unavailable',
              description: 'Neither ElevenLabs nor browser speech recognition is available.',
              variant: 'destructive',
            });
          }
        }
      } finally {
        setIsStartingTranscription(false);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/video-meeting/${roomId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link Copied',
      description: 'Meeting invite link copied to clipboard.',
    });
  };

  // Helper functions for AI suggestions
  const handleDismissSuggestion = (suggestionId: string) => {
    // For boolean results, filter them out
    if (suggestionId.startsWith('bool-')) {
      const idx = parseInt(suggestionId.replace('bool-', ''));
      setBooleanResults(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleDismissDocument = (docId: string) => {
    // Track dismissed doc ID to filter from transforms
    setDismissedDocIds(prev => new Set(Array.from(prev).concat(docId)));
    // Also prune from booleanResults to persist the dismissal
    setBooleanResults(prev => prev.map(result => ({
      ...result,
      documents: result.documents.filter(doc => doc.id !== docId)
    })).filter(result => result.documents.length > 0));
  };

  const handleViewDocument = (docId: string) => {
    if (linkedMatterType === 'case' && linkedMatterId) {
      window.open(`/cases/${linkedMatterId}/document-review?docId=${docId}`, "_blank");
    }
  };

  // Transform booleanResults into SuggestionData format for AISuggestionsPanel
  const transformedSuggestions: SuggestionData[] = booleanResults.map((result, idx) => ({
    id: `bool-${idx}`,
    topic: result.topic,
    triggerQuote: result.rationale,
    confidence: result.riskLevel as 'high' | 'medium' | 'low',
    results: result.documents
      .filter(doc => !dismissedDocIds.has(doc.id))
      .map(doc => ({
        id: doc.id,
        title: doc.subject || "(No subject)",
        type: 'email' as const,
        sender: doc.sender || undefined,
        date: "",
        preview: "",
        riskLevel: doc.riskLevel || undefined,
      })),
    status: 'found' as const,
  })).filter(s => s.results.length > 0);

  if (meetingLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-meeting">
        <Helmet>
          <title>Loading Meeting | Sentinel Counsel</title>
        </Helmet>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading meeting...</span>
      </div>
    );
  }

  if (meetingError || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" data-testid="meeting-error">
        <Helmet>
          <title>Meeting Not Found | Sentinel Counsel</title>
        </Helmet>
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Meeting Not Found</h2>
        <p className="text-muted-foreground">
          The meeting you're looking for doesn't exist or has expired.
        </p>
        <Button asChild data-testid="button-back">
          <Link href="/interviews">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interviews
          </Link>
        </Button>
      </div>
    );
  }

  // Waiting room screen for participants waiting to be admitted
  if (isInWaitingRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6" data-testid="waiting-room">
        <Helmet>
          <title>Waiting Room | {meeting.title}</title>
        </Helmet>
        <div className="text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Waiting Room</h2>
          <p className="text-muted-foreground mb-6">
            Please wait for the host to admit you to the meeting.
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Waiting for host approval...</span>
          </div>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{meeting.title}</CardTitle>
            {meeting.description && (
              <CardDescription>{meeting.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Scheduled: {format(new Date((meeting as any).scheduledAt || meeting.createdAt || Date.now()), 'PPP p')}</span>
            </div>
          </CardContent>
        </Card>
        <Button 
          variant="outline" 
          onClick={() => {
            wsRef.current?.close();
            setLocation('/');
          }}
          data-testid="button-leave-waiting"
        >
          Leave Waiting Room
        </Button>
      </div>
    );
  }

  // Denied access screen
  if (wasDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6" data-testid="access-denied">
        <Helmet>
          <title>Access Denied | {meeting.title}</title>
        </Helmet>
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            The host has denied your request to join this meeting.
          </p>
        </div>
        <Button asChild data-testid="button-back-home">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return Home
          </Link>
        </Button>
      </div>
    );
  }

  if (hasJoined) {
    const meetingContent = (
      <div className="h-full bg-background flex flex-col" data-testid="meeting-room">
        <Helmet>
          <title>{meeting.title} | Video Meeting</title>
        </Helmet>

        <div className="flex items-center justify-between px-4 py-2 border-b bg-card gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {user && (
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            )}
            {!user && (
              <Button variant="ghost" size="icon" asChild data-testid="button-home">
                <Link href="/">
                  <Home className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <h1 className="font-semibold">{meeting.title}</h1>
            {meeting.caseNumber && (
              <Badge variant="secondary">{meeting.caseNumber}</Badge>
            )}
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                <Circle className="h-2 w-2 mr-1 fill-current" />
                Recording
              </Badge>
            )}
            {privilegeStatus === 'privileged' && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <Shield className="h-3 w-3 mr-1" />
                Privileged
              </Badge>
            )}
            {privilegeStatus === 'confidential' && (
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                <Lock className="h-3 w-3 mr-1" />
                Confidential
              </Badge>
            )}
            {ambientIntelligenceEnabled && (
              <Badge variant="outline" className="border-purple-500 text-purple-600">
                <Brain className="h-3 w-3 mr-1" />
                Ambient AI
              </Badge>
            )}
            {linkedMatterId && linkedMatterType && (
              <Badge variant="outline" className="border-green-500 text-green-600">
                {linkedMatterType === 'case' ? (
                  <FolderOpen className="h-3 w-3 mr-1" />
                ) : (
                  <Briefcase className="h-3 w-3 mr-1" />
                )}
                {linkedMatterType === 'case' 
                  ? cases.find(c => c.id === linkedMatterId)?.caseNumber || 'Case'
                  : deals.find(d => d.id === linkedMatterId)?.name || 'Deal'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {formatDuration(sessionDuration)}
            </span>

            {/* View Mode Picker */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowViewPicker(!showViewPicker)}
                className="flex items-center gap-2"
                data-testid="button-view-mode-picker"
                aria-expanded={showViewPicker}
                aria-haspopup="listbox"
              >
                {viewMode === 'transcript' && <FileText className="w-4 h-4" />}
                {viewMode === 'balanced' && <Layout className="w-4 h-4" />}
                {viewMode === 'video' && <Users className="w-4 h-4" />}
                <span className="hidden sm:inline text-xs">
                  {viewMode === 'transcript' ? 'Transcript Focus' : viewMode === 'balanced' ? 'Balanced' : 'Video Focus'}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
              
              {showViewPicker && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowViewPicker(false)}
                    onKeyDown={(e) => e.key === 'Escape' && setShowViewPicker(false)}
                  />
                  <div 
                    className="absolute top-full right-0 mt-1 w-52 bg-popover rounded-lg shadow-xl border z-50"
                    role="listbox"
                    aria-label="View mode selection"
                  >
                    <div className="p-2 border-b">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">View Layout</span>
                    </div>
                    {[
                      { key: 'transcript' as const, name: 'Transcript Focus', icon: FileText, desc: 'Maximize transcript & AI' },
                      { key: 'balanced' as const, name: 'Balanced', icon: Layout, desc: 'Video + Transcript + AI' },
                      { key: 'video' as const, name: 'Video Focus', icon: Users, desc: 'Maximize participant video' },
                    ].map((mode) => (
                      <button
                        key={mode.key}
                        onClick={() => { setViewMode(mode.key); setShowViewPicker(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors ${
                          viewMode === mode.key ? 'bg-primary/10 text-primary' : ''
                        }`}
                        role="option"
                        aria-selected={viewMode === mode.key}
                        data-testid={`view-mode-${mode.key}`}
                      >
                        <mode.icon className="w-4 h-4" />
                        <div>
                          <div className="text-xs font-medium">{mode.name}</div>
                          <div className="text-[10px] text-muted-foreground">{mode.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Video Layout Toggle (Grid/Speaker) - only visible in video or balanced mode */}
            {(viewMode === 'video' || viewMode === 'balanced') && (
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setVideoLayout('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    videoLayout === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Grid View"
                  data-testid="button-video-layout-grid"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setVideoLayout('speaker')}
                  className={`p-1.5 rounded transition-colors ${
                    videoLayout === 'speaker' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Speaker View"
                  data-testid="button-video-layout-speaker"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-meeting-options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={copyInviteLink} data-testid="menu-copy-link">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Invite Link
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    const newStatus = privilegeStatus === 'privileged' ? 'none' : 'privileged';
                    setPrivilegeStatus(newStatus);
                    const currentMetadata = (meeting.metadata || {}) as Record<string, unknown>;
                    updateMeetingMutation.mutate({ metadata: { ...currentMetadata, privilegeStatus: newStatus } });
                  }}
                  data-testid="menu-toggle-privileged"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {privilegeStatus === 'privileged' ? 'Remove Privileged' : 'Mark as Privileged'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    const newStatus = privilegeStatus === 'confidential' ? 'none' : 'confidential';
                    setPrivilegeStatus(newStatus);
                    const currentMetadata = (meeting.metadata || {}) as Record<string, unknown>;
                    updateMeetingMutation.mutate({ metadata: { ...currentMetadata, privilegeStatus: newStatus } });
                  }}
                  data-testid="menu-toggle-confidential"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {privilegeStatus === 'confidential' ? 'Remove Confidential' : 'Mark as Confidential'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={toggleTranscription}
                  disabled={isStartingTranscription}
                  data-testid="menu-toggle-transcription"
                >
                  {isStartingTranscription ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  {isStartingTranscription ? 'Starting...' : showTranscription ? 'Hide Transcription' : 'Show Transcription'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    const newValue = !ambientIntelligenceEnabled;
                    setAmbientIntelligenceEnabled(newValue);
                    // Auto-show panel when enabling ambient intelligence
                    if (newValue) {
                      setShowAmbientPanel(true);
                    }
                    const currentMetadata = (meeting.metadata || {}) as Record<string, unknown>;
                    updateMeetingMutation.mutate({ 
                      metadata: { ...currentMetadata, ambientIntelligenceEnabled: newValue } 
                    });
                    toast({
                      title: newValue ? 'Ambient Intelligence Enabled' : 'Ambient Intelligence Disabled',
                      description: newValue 
                        ? 'AI-powered document discovery is now active.' 
                        : 'AI-powered document discovery has been turned off.',
                    });
                  }}
                  data-testid="menu-toggle-ambient-intelligence"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {ambientIntelligenceEnabled ? 'Disable Ambient Intelligence' : 'Enable Ambient Intelligence'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowMatterSelector(true)}
                  data-testid="menu-link-matter"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  {linkedMatterId ? 'Change Linked Matter' : 'Link to Case/Transaction'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <ThemeToggle />
          </div>
        </div>

        {/* Participant Audio Bar - shows in transcript and balanced modes */}
        {viewMode !== 'video' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b" data-testid="participant-audio-bar">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">On Call:</span>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              localIsSpeaking ? 'bg-primary/20 text-primary ring-1 ring-primary/50' : 'bg-muted text-muted-foreground'
            }`}>
              {localIsSpeaking && (
                <span className="flex gap-0.5 items-end h-3">
                  <span className="w-0.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="w-0.5 h-2.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                  <span className="w-0.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                </span>
              )}
              <span>{displayName}</span>
              <span className="text-muted-foreground/60">(You)</span>
              {!audioEnabled && <MicOff className="w-3 h-3 text-destructive" />}
            </div>
            {Array.from(remoteParticipants.values()).map(p => (
              <div key={p.peerId} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                activeSpeakerId === p.peerId ? 'bg-primary/20 text-primary ring-1 ring-primary/50' : 'bg-muted text-muted-foreground'
              }`}>
                {activeSpeakerId === p.peerId && (
                  <span className="flex gap-0.5 items-end h-3">
                    <span className="w-0.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <span className="w-0.5 h-2.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                    <span className="w-0.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  </span>
                )}
                <span>{p.userName}</span>
              </div>
            ))}
            {remoteParticipants.size === 0 && <span className="text-[10px] text-muted-foreground italic">Waiting for others...</span>}
          </div>
        )}

        {/* Main Content Area - Three Layout Modes */}
        <div className="flex-1 overflow-hidden">
          {/* TRANSCRIPT FOCUS MODE */}
          {viewMode === 'transcript' && (
            <div className="h-full flex" data-testid="layout-transcript-focus">
              <div className="h-full flex flex-col border-r" style={{ width: `${transcriptPanelWidth}%` }}>
                <div className="p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Live Transcript</h3>
                    <Button
                      size="sm"
                      variant={showTranscription ? "default" : "outline"}
                      onClick={toggleTranscription}
                      disabled={isStartingTranscription}
                      className="ml-2 h-6 px-2 text-xs"
                      data-testid="button-toggle-transcription"
                    >
                      {isStartingTranscription ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : showTranscription ? (
                        <>
                          <MicOff className="h-3 w-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="h-3 w-3 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                    <Badge variant="secondary" className="ml-auto text-xs">{transcriptSegments.length}</Badge>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <div className="text-sm leading-relaxed">
                    {transcriptSegments.length === 0 && !interimTranscript && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Mic className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No transcript yet</p>
                        <p className="text-xs mt-1">Start recording to begin transcription</p>
                      </div>
                    )}
                    {transcriptSegments.length > 0 && (
                      <p className="text-foreground" data-testid="transcript-paragraph">
                        {transcriptSegments.map((segment, index) => (
                          <span key={segment.id} data-testid={`transcript-segment-${segment.id}`}>
                            <span className="text-muted-foreground font-mono text-[10px] align-super mr-0.5">[{formatTime(Math.floor(segment.timestampMs / 1000))}]</span>
                            <span>{segment.content}</span>
                            {index < transcriptSegments.length - 1 && ' '}
                          </span>
                        ))}
                        {interimTranscript && (
                          <span className="text-muted-foreground italic">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse mx-1 align-middle" />
                            {interimTranscript}
                          </span>
                        )}
                      </p>
                    )}
                    {transcriptSegments.length === 0 && interimTranscript && (
                      <p className="text-muted-foreground italic" data-testid="transcript-interim">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1 align-middle" />
                        {interimTranscript}
                      </p>
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </ScrollArea>
              </div>
              <div
                className="w-1 bg-border hover:bg-primary cursor-col-resize flex items-center justify-center group transition-colors relative"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = transcriptPanelWidth;
                  const container = e.currentTarget.parentElement;
                  if (!container) return;
                  const containerWidth = container.offsetWidth;
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaPercent = (deltaX / containerWidth) * 100;
                    setTranscriptPanelWidth(Math.max(25, Math.min(75, startWidth + deltaPercent)));
                  };
                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="h-full flex flex-col" style={{ width: `${100 - transcriptPanelWidth}%` }}>
                <FocusIssuesPanel
                  meetingId={meeting?.id}
                  caseId={linkedMatterType === 'case' ? linkedMatterId || undefined : undefined}
                  focusMode={focusMode}
                  onFocusModeChange={setFocusMode}
                />
                <AISuggestionsPanel
                  suggestions={transformedSuggestions}
                  caseId={linkedMatterType === 'case' ? linkedMatterId || undefined : undefined}
                  isAnalyzing={isAnalyzing || isFocusSearching}
                  isRecording={isRecording}
                  isPaused={false}
                  focusMode={focusMode}
                  focusResults={focusResults}
                  onViewDocument={handleViewDocument}
                  onDismissSuggestion={handleDismissSuggestion}
                  onDismissDocument={(suggestionId, docId) => handleDismissDocument(docId)}
                />
              </div>
            </div>
          )}

          {/* BALANCED MODE */}
          {viewMode === 'balanced' && (
            <div className="h-full flex" data-testid="layout-balanced">
              <div className="w-64 shrink-0 border-r bg-muted/30 p-2 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                    {videoEnabled ? (
                      <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center"><VideoOff className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                    <div className="absolute bottom-1 left-1 right-1 z-10">
                      <span className="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded truncate block">{displayName}</span>
                    </div>
                  </div>
                  {Array.from(remoteParticipants.values()).slice(0, 3).map(p => (
                    <div key={p.peerId} className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                      {p.stream && p.videoEnabled !== false ? (
                        <video autoPlay playsInline ref={(el) => { if (el && p.stream) el.srcObject = p.stream; }} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center"><VideoOff className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                      <div className="absolute bottom-1 left-1 right-1 z-10">
                        <span className="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded truncate block">{p.userName}</span>
                      </div>
                    </div>
                  ))}
                  {remoteParticipants.size < 3 && Array.from({ length: 3 - remoteParticipants.size }).map((_, i) => (
                    <div key={`empty-${i}`} className="relative rounded-lg overflow-hidden bg-muted/50 aspect-video flex items-center justify-center border border-dashed border-muted-foreground/20">
                      <Users className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 h-full flex flex-col border-r">
                <div className="p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Live Transcript</h3>
                    <Button
                      size="sm"
                      variant={showTranscription ? "default" : "outline"}
                      onClick={toggleTranscription}
                      disabled={isStartingTranscription}
                      className="ml-2 h-6 px-2 text-xs"
                      data-testid="button-toggle-transcription-balanced"
                    >
                      {isStartingTranscription ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : showTranscription ? (
                        <>
                          <MicOff className="h-3 w-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="h-3 w-3 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                    <Badge variant="secondary" className="ml-auto text-xs">{transcriptSegments.length}</Badge>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <div className="text-xs leading-relaxed">
                    {transcriptSegments.length === 0 && !interimTranscript && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No transcript yet</p>
                      </div>
                    )}
                    {transcriptSegments.length > 0 && (
                      <p className="text-foreground" data-testid="transcript-paragraph-balanced">
                        {transcriptSegments.map((segment, index) => (
                          <span key={segment.id} data-testid={`transcript-segment-balanced-${segment.id}`}>
                            <span className="text-muted-foreground font-mono text-[9px] align-super mr-0.5">[{formatTime(Math.floor(segment.timestampMs / 1000))}]</span>
                            <span>{segment.content}</span>
                            {index < transcriptSegments.length - 1 && ' '}
                          </span>
                        ))}
                        {interimTranscript && (
                          <span className="text-muted-foreground italic">
                            <span className="inline-block w-1 h-1 rounded-full bg-primary animate-pulse mx-0.5 align-middle" />
                            {interimTranscript}
                          </span>
                        )}
                      </p>
                    )}
                    {transcriptSegments.length === 0 && interimTranscript && (
                      <p className="text-muted-foreground italic" data-testid="transcript-interim-balanced">
                        <span className="inline-block w-1 h-1 rounded-full bg-primary animate-pulse mr-0.5 align-middle" />
                        {interimTranscript}
                      </p>
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </ScrollArea>
              </div>
              <div className="w-72 shrink-0 h-full flex flex-col">
                <FocusIssuesPanel
                  meetingId={meeting?.id}
                  caseId={linkedMatterType === 'case' ? linkedMatterId || undefined : undefined}
                  focusMode={focusMode}
                  onFocusModeChange={setFocusMode}
                />
                <AISuggestionsPanel
                  suggestions={transformedSuggestions}
                  caseId={linkedMatterType === 'case' ? linkedMatterId || undefined : undefined}
                  isAnalyzing={isAnalyzing || isFocusSearching}
                  isRecording={isRecording}
                  isPaused={false}
                  focusMode={focusMode}
                  focusResults={focusResults}
                  onViewDocument={handleViewDocument}
                  onDismissSuggestion={handleDismissSuggestion}
                  onDismissDocument={(suggestionId, docId) => handleDismissDocument(docId)}
                />
              </div>
            </div>
          )}

          {/* VIDEO FOCUS MODE */}
          {viewMode === 'video' && (
            <div className="h-full flex flex-col" data-testid="layout-video-focus">
              <div className="flex-1 p-3 overflow-hidden">
                {videoLayout === 'grid' ? (
                  <div className="h-full grid grid-cols-2 gap-3" style={{ gridAutoRows: '1fr' }}>
                    <Card className="relative overflow-hidden" data-testid="local-video-container">
                      <div className="bg-muted relative h-full w-full">
                        {videoEnabled ? (
                          <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center"><VideoOff className="h-12 w-12 text-muted-foreground" /></div>
                        )}
                        <div className="absolute bottom-3 left-3 z-10"><Badge variant="secondary">{displayName} (You)</Badge></div>
                        {!audioEnabled && <div className="absolute top-3 right-3 z-10"><Badge variant="destructive"><MicOff className="h-3 w-3" /></Badge></div>}
                      </div>
                    </Card>
                    {Array.from(remoteParticipants.values()).map(p => (
                      <Card key={p.peerId} className={`relative overflow-hidden ${activeSpeakerId === p.peerId ? 'ring-2 ring-primary' : ''}`}>
                        <div className="bg-muted relative h-full w-full">
                          {p.stream && p.videoEnabled !== false ? (
                            <video autoPlay playsInline ref={(el) => { if (el && p.stream) el.srcObject = p.stream; }} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center"><VideoOff className="h-12 w-12 text-muted-foreground" /></div>
                          )}
                          <div className="absolute bottom-3 left-3 z-10"><Badge variant="secondary">{p.userName}</Badge></div>
                        </div>
                      </Card>
                    ))}
                    {remoteParticipants.size === 0 && (
                      <Card className="flex items-center justify-center">
                        <CardContent className="text-center py-8">
                          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                          <h3 className="font-semibold text-sm mb-2">Waiting for participants</h3>
                          <Button variant="outline" size="sm" onClick={copyInviteLink}><LinkIcon className="h-4 w-4 mr-2" />Copy Link</Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col gap-3">
                    <Card className="flex-1 relative overflow-hidden">
                      <div className="bg-muted relative h-full w-full">
                        {videoEnabled ? (
                          <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center"><VideoOff className="h-16 w-16 text-muted-foreground" /></div>
                        )}
                        <div className="absolute bottom-4 left-4 z-10"><Badge className="bg-primary">{displayName} (You)</Badge></div>
                      </div>
                    </Card>
                    <div className="h-20 flex gap-2 overflow-x-auto">
                      {Array.from(remoteParticipants.values()).map(p => (
                        <div key={p.peerId} className="h-full aspect-video rounded-lg overflow-hidden bg-muted shrink-0 relative cursor-pointer hover:ring-2 hover:ring-primary" onClick={() => setActiveSpeakerId(p.peerId)}>
                          {p.stream && p.videoEnabled !== false ? (
                            <video autoPlay playsInline ref={(el) => { if (el && p.stream) el.srcObject = p.stream; }} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center"><VideoOff className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                          <span className="absolute bottom-1 left-1 text-[8px] text-white bg-black/50 px-1 rounded truncate">{p.userName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="shrink-0 border-t flex h-10">
                <div className="flex-1 border-r flex items-center px-3 gap-3 bg-muted/30">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Transcript</span>
                  <p className="flex-1 text-xs text-muted-foreground truncate">
                    {transcriptSegments.length > 0 ? transcriptSegments[transcriptSegments.length - 1].content : 'No transcript yet...'}
                  </p>
                  <button onClick={() => setViewMode('balanced')} className="text-[10px] text-primary hover:underline">Expand</button>
                </div>
                <div className="w-72 shrink-0 flex items-center px-3 gap-2 bg-muted/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">AI Suggestions</span>
                  {ambientIntelligenceEnabled && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-600 text-[10px] rounded">Active</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border-t bg-card">
          <div className="flex items-center justify-center gap-2 sm:gap-4 p-2 sm:p-4 min-w-max">
            <Button
              variant={audioEnabled ? "secondary" : "destructive"}
              size="icon"
              onClick={toggleAudio}
              className="rounded-full w-10 h-10 sm:w-14 sm:h-14 shrink-0"
              data-testid="button-toggle-audio"
            >
              {audioEnabled ? <Mic className="h-4 w-4 sm:h-6 sm:w-6" /> : <MicOff className="h-4 w-4 sm:h-6 sm:w-6" />}
            </Button>

            <Button
              variant={videoEnabled ? "secondary" : "destructive"}
              size="icon"
              onClick={toggleVideo}
              className="rounded-full w-10 h-10 sm:w-14 sm:h-14 shrink-0"
              data-testid="button-toggle-video"
            >
              {videoEnabled ? <Video className="h-4 w-4 sm:h-6 sm:w-6" /> : <VideoOff className="h-4 w-4 sm:h-6 sm:w-6" />}
            </Button>

            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              className="rounded-full w-10 h-10 sm:w-14 sm:h-14 shrink-0"
              data-testid="button-toggle-recording"
            >
              {isRecording ? <Square className="h-4 w-4 sm:h-6 sm:w-6" /> : <Circle className="h-4 w-4 sm:h-6 sm:w-6" />}
            </Button>

            <Button
              variant={showChatPanel ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowChatPanel(!showChatPanel)}
              className="rounded-full w-10 h-10 sm:w-14 sm:h-14 relative shrink-0"
              data-testid="button-toggle-chat"
            >
              <MessageSquare className="h-4 w-4 sm:h-6 sm:w-6" />
              {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full flex items-center justify-center">
                  {chatMessages.length > 99 ? '99+' : chatMessages.length}
                </span>
              )}
            </Button>

            <Button
              variant={isScreenSharing ? "destructive" : "outline"}
              size="icon"
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className="rounded-full w-10 h-10 sm:w-14 sm:h-14 shrink-0"
              data-testid="button-toggle-screen-share"
            >
              {isScreenSharing ? <ScreenShareOff className="h-4 w-4 sm:h-6 sm:w-6" /> : <ScreenShare className="h-4 w-4 sm:h-6 sm:w-6" />}
            </Button>

            <Button
              variant={virtualBackgroundEnabled ? "secondary" : "outline"}
              size="icon"
              onClick={toggleVirtualBackground}
              className="rounded-full w-10 h-10 sm:w-14 sm:h-14 shrink-0"
              disabled={isScreenSharing}
              title={isScreenSharing ? "Virtual background unavailable while screen sharing" : virtualBackgroundEnabled ? "Disable background blur" : "Enable background blur"}
              data-testid="button-toggle-virtual-bg"
            >
              {virtualBackgroundEnabled ? <ImageOff className="h-4 w-4 sm:h-6 sm:w-6" /> : <SparklesIcon className="h-4 w-4 sm:h-6 sm:w-6" />}
            </Button>

            {isHost && meeting.waitingRoomEnabled === 'true' && (
              <Button
                variant={showWaitingRoomPanel ? "secondary" : "outline"}
                size="icon"
                onClick={() => setShowWaitingRoomPanel(!showWaitingRoomPanel)}
                className="rounded-full w-10 h-10 sm:w-14 sm:h-14 relative shrink-0"
                data-testid="button-toggle-waiting-room"
              >
                <DoorOpen className="h-4 w-4 sm:h-6 sm:w-6" />
                {waitingParticipants.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full flex items-center justify-center animate-pulse">
                    {waitingParticipants.length}
                  </span>
                )}
              </Button>
            )}

            {ambientIntelligenceEnabled && (
              <Button
                variant={showAmbientPanel ? "secondary" : "outline"}
                size="icon"
                onClick={() => setShowAmbientPanel(!showAmbientPanel)}
                className="rounded-full w-10 h-10 sm:w-14 sm:h-14 shrink-0"
                data-testid="button-toggle-ambient-panel"
              >
                <Brain className="h-4 w-4 sm:h-6 sm:w-6" />
              </Button>
            )}

            <Button
              variant="destructive"
              size="default"
              onClick={handleLeaveMeeting}
              className="rounded-full px-4 sm:px-8 h-10 sm:h-14 shrink-0"
              data-testid="button-leave-meeting"
            >
              <PhoneOff className="h-4 w-4 sm:h-6 sm:w-6 sm:mr-2" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          </div>
        </div>

        {/* Chat Panel */}
        {showChatPanel && (
          <div className="absolute right-4 bottom-24 w-80 h-96 bg-card border rounded-lg shadow-lg flex flex-col z-50" data-testid="chat-panel">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Meeting Chat</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowChatPanel(false)} data-testid="button-close-chat">
                <span className="sr-only">Close</span>
                <span className="text-muted-foreground">&times;</span>
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.fromPeerId === myPeerId ? 'items-end' : 'items-start'}`} data-testid={`chat-message-${msg.id}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.fromPeerId === myPeerId ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-xs font-medium mb-0.5">{msg.userName}</p>
                        <p className="text-sm break-words">{msg.message}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-3 border-t">
              <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 text-sm"
                  data-testid="input-chat-message"
                />
                <Button type="submit" size="sm" disabled={!chatInput.trim()} data-testid="button-send-chat">
                  Send
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Waiting Room Panel */}
        {showWaitingRoomPanel && isHost && (
          <div className="absolute left-4 bottom-24 w-80 h-96 bg-card border rounded-lg shadow-lg flex flex-col z-50" data-testid="waiting-room-panel">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Waiting Room</span>
                {waitingParticipants.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{waitingParticipants.length}</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowWaitingRoomPanel(false)} data-testid="button-close-waiting-room">
                <span className="sr-only">Close</span>
                <span className="text-muted-foreground">&times;</span>
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              {waitingParticipants.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">No participants waiting to join.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {waitingParticipants.map((participant) => (
                    <div key={participant.peerId} className="flex items-center justify-between p-2 rounded-lg bg-muted" data-testid={`waiting-participant-${participant.peerId}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{participant.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            Waiting since {new Date(participant.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={() => admitParticipant(participant.peerId)}
                          data-testid={`button-admit-${participant.peerId}`}
                        >
                          <UserCheck className="h-4 w-4" />
                          <span className="sr-only">Admit</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                          onClick={() => denyParticipant(participant.peerId)}
                          data-testid={`button-deny-${participant.peerId}`}
                        >
                          <UserX className="h-4 w-4" />
                          <span className="sr-only">Deny</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {waitingParticipants.length > 1 && (
              <div className="p-3 border-t flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => waitingParticipants.forEach(p => admitParticipant(p.peerId))}
                  data-testid="button-admit-all"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Admit All
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Matter Selector Dialog */}
        <Dialog open={showMatterSelector} onOpenChange={setShowMatterSelector}>
          <DialogContent className="sm:max-w-md" data-testid="dialog-matter-selector">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Link to Case or Transaction
              </DialogTitle>
              <DialogDescription>
                Connect this video meeting to a specific case or business transaction for better organization and document discovery.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select a Case</Label>
                <Select
                  value={linkedMatterType === 'case' ? linkedMatterId || '' : ''}
                  onValueChange={(value) => {
                    if (value) {
                      setLinkedMatterId(value);
                      setLinkedMatterType('case');
                      const currentMetadata = (meeting.metadata || {}) as Record<string, unknown>;
                      updateMeetingMutation.mutate({ 
                        caseId: value,
                        metadata: { 
                          ...currentMetadata, 
                          linkedMatterId: value, 
                          linkedMatterType: 'case' 
                        } 
                      });
                      setShowMatterSelector(false);
                      toast({
                        title: 'Meeting Linked',
                        description: 'This meeting is now linked to the selected case.',
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-case">
                    <SelectValue placeholder="Select a case..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id} data-testid={`select-case-${c.id}`}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          <span className="font-medium">{c.caseNumber}</span>
                          <span className="text-muted-foreground truncate">{c.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {cases.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No cases available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select a Business Transaction</Label>
                <Select
                  value={linkedMatterType === 'deal' ? linkedMatterId || '' : ''}
                  onValueChange={(value) => {
                    if (value) {
                      setLinkedMatterId(value);
                      setLinkedMatterType('deal');
                      const currentMetadata = (meeting.metadata || {}) as Record<string, unknown>;
                      updateMeetingMutation.mutate({ 
                        caseId: null, // Clear case when linking to a deal
                        metadata: { 
                          ...currentMetadata, 
                          linkedMatterId: value, 
                          linkedMatterType: 'deal' 
                        } 
                      });
                      setShowMatterSelector(false);
                      toast({
                        title: 'Meeting Linked',
                        description: 'This meeting is now linked to the selected transaction.',
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-deal">
                    <SelectValue placeholder="Select a transaction..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id} data-testid={`select-deal-${d.id}`}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span className="font-medium">{d.name}</span>
                          <Badge variant="outline" className="text-xs">{d.dealType}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                    {deals.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No transactions available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {linkedMatterId && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setLinkedMatterId(null);
                    setLinkedMatterType(null);
                    const currentMetadata = (meeting.metadata || {}) as Record<string, unknown>;
                    updateMeetingMutation.mutate({ 
                      caseId: null,
                      metadata: { 
                        ...currentMetadata, 
                        linkedMatterId: null, 
                        linkedMatterType: null 
                      } 
                    });
                    setShowMatterSelector(false);
                    toast({
                      title: 'Link Removed',
                      description: 'This meeting is no longer linked to any matter.',
                    });
                  }}
                  data-testid="button-unlink-matter"
                >
                  Remove Link
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );

    // Wrap with sidebar for authenticated users
    if (user) {
      const sidebarStyle = {
        "--sidebar-width": "16rem",
        "--sidebar-width-icon": "3rem",
      };
      return (
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              {meetingContent}
            </div>
          </div>
        </SidebarProvider>
      );
    }

    // Guest users don't get the sidebar
    return <div className="h-screen">{meetingContent}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8" data-testid="pre-join-screen">
      <Helmet>
        <title>Join Meeting | Sentinel Counsel</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          {user ? (
            <Link href="/interviews" className="text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Interviews
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                <Users className="h-3 w-3 mr-1" />
                Joining as Guest
              </Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card data-testid="meeting-details-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Meeting Details
              </CardTitle>
              <CardDescription>
                Review the meeting information before joining
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Title</Label>
                <p className="font-medium">{meeting.title}</p>
              </div>

              {meeting.description && (
                <div>
                  <Label className="text-muted-foreground text-sm">Description</Label>
                  <p className="font-medium">{meeting.description}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-sm">Type</Label>
                <Badge variant="secondary" className="ml-2">
                  {meeting.meetingType?.replace('_', ' ')}
                </Badge>
              </div>

              {meeting.caseTitle && (
                <div>
                  <Label className="text-muted-foreground text-sm">Related Case</Label>
                  <p className="font-medium">{meeting.caseTitle}</p>
                </div>
              )}

              {meeting.scheduledStartTime && (
                <div>
                  <Label className="text-muted-foreground text-sm">Scheduled Time</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(meeting.scheduledStartTime), 'PPP')}
                    <Clock className="h-4 w-4 ml-2" />
                    {format(new Date(meeting.scheduledStartTime), 'p')}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-sm">Status</Label>
                <Badge
                  variant={meeting.status === 'in_progress' ? 'default' : 'secondary'}
                  className="ml-2"
                  data-testid="meeting-status-badge"
                >
                  {meeting.status === 'in_progress' ? 'In Progress' :
                   meeting.status === 'scheduled' ? 'Scheduled' :
                   meeting.status === 'completed' ? 'Completed' : meeting.status}
                </Badge>
              </div>

              {user && (
                <>
                  <Separator />
                  <Button variant="outline" size="sm" onClick={copyInviteLink} className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Invite Link
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="media-preview-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Camera & Microphone
              </CardTitle>
              <CardDescription>
                Check your audio and video before joining
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative" data-testid="video-preview">
                {isCheckingMedia ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : hasMediaPermission === false ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <VideoOff className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Camera not available. You can still join and see other participants.
                    </p>
                  </div>
                ) : !videoEnabled ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VideoOff className="h-12 w-12 text-muted-foreground" />
                  </div>
                ) : (
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    ref={(el) => {
                      if (el && localStream) {
                        el.srcObject = localStream;
                      }
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="video-toggle"
                    checked={videoEnabled}
                    onCheckedChange={setVideoEnabled}
                    disabled={!hasMediaPermission}
                    data-testid="switch-video"
                  />
                  <Label htmlFor="video-toggle" className="flex items-center gap-1">
                    {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    Camera
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="audio-toggle"
                    checked={audioEnabled}
                    onCheckedChange={setAudioEnabled}
                    disabled={!hasMediaPermission}
                    data-testid="switch-audio"
                  />
                  <Label htmlFor="audio-toggle" className="flex items-center gap-1">
                    {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    Microphone
                  </Label>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="display-name">Your Display Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  data-testid="input-display-name"
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleJoinMeeting}
                disabled={isCheckingMedia || !displayName.trim() || meeting.status === 'completed' || meeting.status === 'cancelled'}
                data-testid="button-join-meeting"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : meeting.status === 'completed' ? (
                  'Meeting Completed'
                ) : meeting.status === 'cancelled' ? (
                  'Meeting Cancelled'
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    {user ? 'Join Meeting' : 'Join as Guest'}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {hasMediaPermission === false 
                  ? "You'll join without camera/microphone. You can still see and hear other participants."
                  : "By joining, you agree to the recording and privacy policies."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
