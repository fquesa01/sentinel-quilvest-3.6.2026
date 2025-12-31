import { useState, useRef, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  ArrowLeft,
  FileText,
  Brain,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  User,
  Bookmark,
  BookmarkPlus,
  Flag,
  Link as LinkIcon,
  ChevronRight,
  Search,
  Download,
  Loader2,
  Sparkles,
  Shield,
  Target,
  PenLine,
  Quote,
  Users,
  Scale,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  LiveInterviewSession,
  InterviewRecording,
  InterviewTranscriptSegment,
  InterviewAnalysis,
  InterviewSessionNote,
  InterviewQuestion,
  Interview,
  Case,
  InterviewEvidenceLink,
  Communication,
} from '@shared/schema';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-500';
  if (score >= 60) return 'text-orange-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-green-500';
}

function getCredibilityColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

export default function InterviewReviewPage() {
  const [, params] = useRoute('/interviews/:sessionId/review');
  const sessionId = params?.sessionId || '';
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNotePrivileged, setNewNotePrivileged] = useState(true);
  const [selectedTab, setSelectedTab] = useState('transcript');
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery<LiveInterviewSession>({
    queryKey: ['/api/live-interview-sessions', sessionId],
    enabled: !!sessionId,
  });

  const { data: recordings } = useQuery<InterviewRecording[]>({
    queryKey: ['/api/live-interview-sessions', sessionId, 'recordings'],
    enabled: !!sessionId,
  });

  const { data: transcriptSegments } = useQuery<InterviewTranscriptSegment[]>({
    queryKey: ['/api/live-interview-sessions', sessionId, 'transcript-segments'],
    enabled: !!sessionId,
  });

  const { data: analyses } = useQuery<InterviewAnalysis[]>({
    queryKey: ['/api/live-interview-sessions', sessionId, 'analyses'],
    enabled: !!sessionId,
  });

  const { data: notes } = useQuery<InterviewSessionNote[]>({
    queryKey: ['/api/live-interview-sessions', sessionId, 'notes'],
    enabled: !!sessionId,
  });

  const { data: questions } = useQuery<InterviewQuestion[]>({
    queryKey: ['/api/live-interview-sessions', sessionId, 'questions'],
    enabled: !!sessionId,
  });

  const { data: interview } = useQuery<Interview>({
    queryKey: ['/api/interviews', session?.interviewId],
    enabled: !!session?.interviewId,
  });

  const { data: caseData } = useQuery<Case>({
    queryKey: ['/api/cases', session?.caseId],
    enabled: !!session?.caseId,
  });

  const { data: evidenceLinks } = useQuery<InterviewEvidenceLink[]>({
    queryKey: ['/api/live-interview-sessions', sessionId, 'evidence-links'],
    enabled: !!sessionId,
  });

  const { data: caseCommunications } = useQuery<Communication[]>({
    queryKey: ['/api/cases', session?.caseId, 'communications'],
    enabled: !!session?.caseId,
  });

  const [showAddEvidenceDialog, setShowAddEvidenceDialog] = useState(false);
  const [newEvidenceType, setNewEvidenceType] = useState('');
  const [newEvidenceLabel, setNewEvidenceLabel] = useState('');
  const [newEvidenceDescription, setNewEvidenceDescription] = useState('');
  const [newEvidenceCommunicationId, setNewEvidenceCommunicationId] = useState('');
  const [newEvidenceDocumentUrl, setNewEvidenceDocumentUrl] = useState('');

  const triggerAnalysisMutation = useMutation({
    mutationFn: () =>
      apiRequest('POST', `/api/live-interview-sessions/${sessionId}/analyses`, {
        analysisType: 'comprehensive',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-interview-sessions', sessionId, 'analyses'] });
      toast({
        title: 'Analysis Started',
        description: 'AI analysis is running in the background. Results will appear when complete.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Analysis Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: { noteText: string; isPrivileged: string }) =>
      apiRequest('POST', `/api/live-interview-sessions/${sessionId}/notes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-interview-sessions', sessionId, 'notes'] });
      setShowAddNoteDialog(false);
      setNewNoteText('');
      toast({
        title: 'Note Added',
        description: 'Your note has been saved.',
      });
    },
  });

  const createEvidenceLinkMutation = useMutation({
    mutationFn: (data: { evidenceType: string; label: string; description?: string; communicationId?: string; documentUrl?: string }) =>
      apiRequest('POST', `/api/live-interview-sessions/${sessionId}/evidence-links`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-interview-sessions', sessionId, 'evidence-links'] });
      setShowAddEvidenceDialog(false);
      setNewEvidenceType('');
      setNewEvidenceLabel('');
      setNewEvidenceDescription('');
      setNewEvidenceCommunicationId('');
      setNewEvidenceDocumentUrl('');
      toast({
        title: 'Evidence Linked',
        description: 'The evidence has been linked to this interview.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteEvidenceLinkMutation = useMutation({
    mutationFn: (linkId: string) =>
      apiRequest('DELETE', `/api/live-interview-sessions/${sessionId}/evidence-links/${linkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-interview-sessions', sessionId, 'evidence-links'] });
      toast({
        title: 'Evidence Unlinked',
        description: 'The evidence link has been removed.',
      });
    },
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      if (transcriptSegments && transcriptSegments.length > 0) {
        const currentSegment = transcriptSegments.find(
          (seg) => video.currentTime >= (seg.startTime || 0) && video.currentTime < (seg.endTime || 0)
        );
        if (currentSegment) {
          setActiveSegmentId(currentSegment.id);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [transcriptSegments]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const seekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const filteredSegments = transcriptSegments?.filter(
    (seg) => !searchQuery || seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const primaryRecording = recordings?.find((r) => r.status === 'completed') || recordings?.[0];
  const latestAnalysis = analyses?.sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )[0];

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-review">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading interview review...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" data-testid="session-not-found">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Interview Session Not Found</h2>
        <Button asChild data-testid="button-back-to-interviews">
          <Link href="/interviews">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interviews
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col bg-background" data-testid="interview-review-page">
      <Helmet>
        <title>Review Interview | Sentinel Counsel</title>
        <meta name="description" content="Review interview recordings, transcripts, and AI analysis" />
      </Helmet>

      <header className="px-6 py-4 border-b flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back">
            <Link href="/interviews">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold" data-testid="interview-title">
              {interview?.intervieweeName || 'Interview Review'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {caseData && (
                <span>Case: {caseData.title}</span>
              )}
              {session.actualStartTime && (
                <>
                  <span>|</span>
                  <span>{format(new Date(session.actualStartTime), 'PPP p')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              session.status === 'completed'
                ? 'default'
                : session.status === 'in_progress'
                ? 'secondary'
                : 'outline'
            }
            data-testid="session-status"
          >
            {session.status === 'completed' ? 'Completed' : session.status}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerAnalysisMutation.mutate()}
            disabled={triggerAnalysisMutation.isPending || !transcriptSegments?.length}
            data-testid="button-run-analysis"
          >
            {triggerAnalysisMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Run AI Analysis
          </Button>
          
          <Button variant="outline" size="sm" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col">
          <div className="bg-black aspect-video max-h-[50vh] relative" data-testid="video-container">
            {primaryRecording?.videoUrl ? (
              <video
                ref={videoRef}
                className="w-full h-full"
                src={primaryRecording.videoUrl}
                poster="/api/placeholder/video-poster"
                data-testid="video-player"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/60">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2" />
                  <p>No recording available</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="mb-2">
                <div
                  className="h-1 bg-white/30 rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    seekToTime(percent * duration);
                  }}
                  data-testid="video-progress-bar"
                >
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={skipBackward}
                    data-testid="button-skip-back"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={togglePlay}
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={skipForward}
                    data-testid="button-skip-forward"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                  <span className="text-white text-sm ml-2" data-testid="video-time">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={toggleMute}
                    data-testid="button-mute"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => videoRef.current?.requestFullscreen()}
                    data-testid="button-fullscreen"
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
              <div className="border-b px-4">
                <TabsList className="h-12">
                  <TabsTrigger value="transcript" data-testid="tab-transcript">
                    <FileText className="h-4 w-4 mr-2" />
                    Transcript
                  </TabsTrigger>
                  <TabsTrigger value="analysis" data-testid="tab-analysis">
                    <Brain className="h-4 w-4 mr-2" />
                    AI Analysis
                    {latestAnalysis?.status === 'completed' && (
                      <Badge variant="secondary" className="ml-2">
                        {latestAnalysis.overallScore || 0}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="questions" data-testid="tab-questions">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Questions ({questions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="notes" data-testid="tab-notes">
                    <PenLine className="h-4 w-4 mr-2" />
                    Notes ({notes?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="evidence" data-testid="tab-evidence">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Evidence ({evidenceLinks?.length || 0})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="transcript" className="flex-1 overflow-hidden m-0 p-0">
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-transcript"
                    />
                  </div>
                </div>

                <ScrollArea className="flex-1 h-[calc(100%-60px)]">
                  <div className="p-4 space-y-3">
                    {filteredSegments?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {transcriptSegments?.length === 0
                          ? 'No transcript available'
                          : 'No matching segments found'}
                      </div>
                    ) : (
                      filteredSegments?.map((segment) => (
                        <div
                          key={segment.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            activeSegmentId === segment.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => seekToTime(segment.startTime || 0)}
                          data-testid={`segment-${segment.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {segment.speakerRole || 'Participant'}
                              </Badge>
                              <span>{segment.speakerName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(segment.startTime || 0)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm">{segment.text}</p>
                          {segment.isHighlighted === 'true' && (
                            <div className="mt-2 flex items-center gap-1">
                              <Flag className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-600">
                                Highlighted
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analysis" className="flex-1 overflow-auto m-0 p-4">
                {!latestAnalysis ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No AI Analysis Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Run an AI analysis to get insights, scores, and recommendations.
                    </p>
                    <Button
                      onClick={() => triggerAnalysisMutation.mutate()}
                      disabled={triggerAnalysisMutation.isPending || !transcriptSegments?.length}
                      data-testid="button-run-analysis-empty"
                    >
                      {triggerAnalysisMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Run AI Analysis
                    </Button>
                  </div>
                ) : latestAnalysis.status === 'processing' ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <h3 className="text-lg font-medium mb-2">Analysis in Progress</h3>
                    <p className="text-muted-foreground">
                      AI is analyzing the interview. This may take a few minutes.
                    </p>
                  </div>
                ) : latestAnalysis.status === 'failed' ? (
                  <div className="text-center py-8">
                    <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                    <h3 className="text-lg font-medium mb-2">Analysis Failed</h3>
                    <p className="text-muted-foreground mb-4">
                      There was an error running the analysis. Please try again.
                    </p>
                    <Button
                      onClick={() => triggerAnalysisMutation.mutate()}
                      disabled={triggerAnalysisMutation.isPending}
                    >
                      Retry Analysis
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card data-testid="score-overall">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <div className="text-3xl font-bold">{latestAnalysis.overallScore || 0}</div>
                            <div className="text-sm text-muted-foreground">Overall Score</div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card data-testid="score-credibility">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Scale className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                            <div className={`text-3xl font-bold ${getCredibilityColor(latestAnalysis.credibilityScore || 0)}`}>
                              {latestAnalysis.credibilityScore || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Credibility</div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card data-testid="score-risk">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                            <div className={`text-3xl font-bold ${getRiskColor(latestAnalysis.complianceRiskScore || 0)}`}>
                              {latestAnalysis.complianceRiskScore || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Risk Score</div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card data-testid="score-evasion">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Shield className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                            <div className={`text-3xl font-bold ${getRiskColor(latestAnalysis.evasionProbability || 0)}`}>
                              {latestAnalysis.evasionProbability || 0}%
                            </div>
                            <div className="text-sm text-muted-foreground">Evasion Probability</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {(latestAnalysis.summaryInsights as string[])?.length > 0 && (
                      <Card>
                        <CardHeader 
                          className="cursor-pointer"
                          onClick={() => setExpandedAnalysis(expandedAnalysis === 'insights' ? null : 'insights')}
                        >
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5" />
                              Key Insights
                            </CardTitle>
                            {expandedAnalysis === 'insights' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </CardHeader>
                        {expandedAnalysis === 'insights' && (
                          <CardContent>
                            <ul className="space-y-2">
                              {(latestAnalysis.summaryInsights as string[]).map((insight, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <ChevronRight className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                  <span className="text-sm">{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        )}
                      </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {(latestAnalysis.keyAdmissions as string[])?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-5 w-5" />
                              Key Admissions
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {(latestAnalysis.keyAdmissions as string[]).map((admission, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <Quote className="h-4 w-4 mt-1 text-green-500 flex-shrink-0" />
                                  <span>{admission}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {(latestAnalysis.keyDenials as string[])?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-600">
                              <XCircle className="h-5 w-5" />
                              Key Denials
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {(latestAnalysis.keyDenials as string[]).map((denial, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <Quote className="h-4 w-4 mt-1 text-red-500 flex-shrink-0" />
                                  <span>{denial}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {(latestAnalysis.contradictions as any[])?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-5 w-5" />
                            Contradictions Detected
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {(latestAnalysis.contradictions as any[]).map((contradiction, idx) => (
                              <div key={idx} className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                                <div className="space-y-2">
                                  <div className="flex items-start gap-2">
                                    <Badge variant="outline" className="text-xs">Statement 1</Badge>
                                    <span className="text-sm">{contradiction.statement1}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Badge variant="outline" className="text-xs">Statement 2</Badge>
                                    <span className="text-sm">{contradiction.statement2}</span>
                                  </div>
                                  <div className="pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">{contradiction.explanation}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {(latestAnalysis.followUpRecommendations as string[])?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Follow-Up Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {(latestAnalysis.followUpRecommendations as string[]).map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                                <span className="text-sm">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="questions" className="flex-1 overflow-auto m-0 p-4">
                {!questions?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No questions recorded for this interview
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, idx) => (
                      <Card key={question.id} data-testid={`question-${question.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <Badge variant="outline" className="flex-shrink-0">
                              Q{idx + 1}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium">{question.questionText}</p>
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <Badge variant="secondary">{question.category}</Badge>
                                {question.askedAt && (
                                  <span>Asked at {formatDuration(0)}</span>
                                )}
                              </div>
                              {question.aiAnalysis ? (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Analysis available
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="flex-1 overflow-auto m-0 p-4">
                <div className="flex justify-end mb-4">
                  <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-note">
                        <PenLine className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Session Note</DialogTitle>
                        <DialogDescription>
                          Add a note about this interview session. Privileged notes are protected.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Enter your note..."
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          rows={5}
                          data-testid="input-note-text"
                        />
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newNotePrivileged}
                              onChange={(e) => setNewNotePrivileged(e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm">Mark as privileged</span>
                          </label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() =>
                            createNoteMutation.mutate({
                              noteText: newNoteText,
                              isPrivileged: newNotePrivileged ? 'true' : 'false',
                            })
                          }
                          disabled={!newNoteText.trim() || createNoteMutation.isPending}
                          data-testid="button-save-note"
                        >
                          {createNoteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Save Note
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {!notes?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notes for this interview yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <Card key={note.id} data-testid={`note-${note.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {note.isPrivileged === 'true' && (
                              <Shield className="h-5 w-5 text-purple-500 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm">{note.noteText}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>{format(new Date(note.createdAt || Date.now()), 'PPp')}</span>
                                {note.isPrivileged === 'true' && (
                                  <Badge variant="outline" className="text-xs text-purple-600">
                                    Privileged
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evidence" className="flex-1 overflow-auto m-0 p-4">
                <div className="flex justify-end mb-4">
                  <Dialog open={showAddEvidenceDialog} onOpenChange={setShowAddEvidenceDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-evidence">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Link Evidence
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Link Evidence to Interview</DialogTitle>
                        <DialogDescription>
                          Connect case documents, emails, or chats to this interview for comprehensive analysis.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Evidence Type</label>
                          <Select value={newEvidenceType} onValueChange={setNewEvidenceType}>
                            <SelectTrigger data-testid="select-evidence-type">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="communication">Email/Communication</SelectItem>
                              <SelectItem value="chat_message">Chat Message</SelectItem>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="attachment">Attachment</SelectItem>
                              <SelectItem value="external">External Link</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Label</label>
                          <Input
                            placeholder="Brief description of the evidence..."
                            value={newEvidenceLabel}
                            onChange={(e) => setNewEvidenceLabel(e.target.value)}
                            data-testid="input-evidence-label"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description (Optional)</label>
                          <Textarea
                            placeholder="Detailed notes about relevance..."
                            value={newEvidenceDescription}
                            onChange={(e) => setNewEvidenceDescription(e.target.value)}
                            rows={3}
                            data-testid="input-evidence-description"
                          />
                        </div>
                        
                        {newEvidenceType === 'communication' && caseCommunications && caseCommunications.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Select Communication</label>
                            <Select value={newEvidenceCommunicationId} onValueChange={setNewEvidenceCommunicationId}>
                              <SelectTrigger data-testid="select-communication">
                                <SelectValue placeholder="Select a communication..." />
                              </SelectTrigger>
                              <SelectContent>
                                {caseCommunications.slice(0, 20).map((comm) => (
                                  <SelectItem key={comm.id} value={comm.id}>
                                    {comm.subject || comm.sender || 'Communication'} - {comm.communicationType}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {(newEvidenceType === 'document' || newEvidenceType === 'attachment' || newEvidenceType === 'external') && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Document URL</label>
                            <Input
                              placeholder="Enter document URL or path..."
                              value={newEvidenceDocumentUrl}
                              onChange={(e) => setNewEvidenceDocumentUrl(e.target.value)}
                              data-testid="input-document-url"
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddEvidenceDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() =>
                            createEvidenceLinkMutation.mutate({
                              evidenceType: newEvidenceType,
                              label: newEvidenceLabel,
                              description: newEvidenceDescription || undefined,
                              communicationId: newEvidenceCommunicationId || undefined,
                              documentUrl: newEvidenceDocumentUrl || undefined,
                            })
                          }
                          disabled={!newEvidenceType || !newEvidenceLabel.trim() || createEvidenceLinkMutation.isPending}
                          data-testid="button-save-evidence"
                        >
                          {createEvidenceLinkMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Link Evidence
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {!evidenceLinks?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No evidence linked to this interview yet</p>
                    <p className="text-sm mt-1">Link documents, emails, and chats for comprehensive case analysis</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evidenceLinks.map((link) => (
                      <Card key={link.id} data-testid={`evidence-${link.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-muted">
                                {link.evidenceType === 'communication' && <FileText className="h-5 w-5" />}
                                {link.evidenceType === 'chat_message' && <MessageSquare className="h-5 w-5" />}
                                {link.evidenceType === 'document' && <FileText className="h-5 w-5" />}
                                {link.evidenceType === 'attachment' && <FileText className="h-5 w-5" />}
                                {link.evidenceType === 'external' && <LinkIcon className="h-5 w-5" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {link.evidenceType?.replace(/_/g, ' ')}
                                  </Badge>
                                  {link.relevance && (
                                    <Badge variant="secondary" className="text-xs">
                                      {link.relevance}
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium">{link.label}</p>
                                {link.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                                )}
                                {link.documentUrl && (
                                  <a 
                                    href={link.documentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline mt-1 flex items-center gap-1"
                                  >
                                    View document
                                    <ChevronRight className="h-3 w-3" />
                                  </a>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <span>{format(new Date(link.createdAt || Date.now()), 'PPp')}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEvidenceLinkMutation.mutate(link.id)}
                              data-testid={`button-delete-evidence-${link.id}`}
                            >
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
