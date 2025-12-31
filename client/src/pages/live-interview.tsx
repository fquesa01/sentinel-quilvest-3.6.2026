import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { LiveInterviewRoom } from '@/components/interviews/live-interview-room';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Shield
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { LiveInterviewSession, Interview, Case } from '@shared/schema';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet';

export default function LiveInterviewPage() {
  const [, params] = useRoute('/live-interview/:sessionId');
  const [, setLocation] = useLocation();
  const sessionId = params?.sessionId || '';
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [hasJoined, setHasJoined] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const [isCheckingMedia, setIsCheckingMedia] = useState(true);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [displayName, setDisplayName] = useState(user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '');
  
  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery<LiveInterviewSession>({
    queryKey: ['/api/live-interview-sessions', sessionId],
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

  useEffect(() => {
    const checkMediaPermissions = async () => {
      setIsCheckingMedia(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        setHasMediaPermission(true);
      } catch (error) {
        console.error('Media permission denied:', error);
        setHasMediaPermission(false);
      } finally {
        setIsCheckingMedia(false);
      }
    };
    
    checkMediaPermissions();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      
      if (videoTrack) {
        videoTrack.enabled = videoEnabled;
      }
      if (audioTrack) {
        audioTrack.enabled = audioEnabled;
      }
    }
  }, [localStream, videoEnabled, audioEnabled]);

  const handleJoinSession = () => {
    if (!displayName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your display name to join the interview.',
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

  const handleLeaveSession = () => {
    setHasJoined(false);
    setLocation('/interviews');
  };

  const determineUserRole = (): 'interviewer' | 'interviewee' | 'observer' => {
    if (!user || !interview) return 'observer';
    
    const interviewerIds = interview.interviewerIds as string[] | null | undefined;
    if (interviewerIds && Array.isArray(interviewerIds) && interviewerIds.includes(user.id)) {
      return 'interviewer';
    }
    
    if (user.role === 'admin' || user.role === 'compliance_officer' || user.role === 'attorney') {
      return 'interviewer';
    }
    
    return 'interviewee';
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-session">
        <Helmet>
          <title>Loading Interview | Sentinel Counsel</title>
        </Helmet>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading interview session...</span>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" data-testid="session-error">
        <Helmet>
          <title>Interview Not Found | Sentinel Counsel</title>
        </Helmet>
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Interview Session Not Found</h2>
        <p className="text-muted-foreground">
          The interview session you're looking for doesn't exist or has expired.
        </p>
        <Button asChild data-testid="button-back-to-interviews">
          <Link href="/interviews">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interviews
          </Link>
        </Button>
      </div>
    );
  }

  if (hasJoined && session.roomId) {
    return (
      <>
        <Helmet>
          <title>Live Interview | Sentinel Counsel</title>
        </Helmet>
        <LiveInterviewRoom
          sessionId={sessionId}
          roomId={session.roomId}
          userName={displayName}
          userId={user?.id || 'guest'}
          userRole={determineUserRole()}
          onLeave={handleLeaveSession}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8" data-testid="pre-join-screen">
      <Helmet>
        <title>Join Interview | Sentinel Counsel</title>
      </Helmet>
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/interviews" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Interviews
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card data-testid="interview-details-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Interview Details
              </CardTitle>
              <CardDescription>
                Review the interview information before joining
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseData && (
                <div>
                  <Label className="text-muted-foreground text-sm">Case</Label>
                  <p className="font-medium">{caseData.title}</p>
                </div>
              )}
              
              {interview && (
                <>
                  <div>
                    <Label className="text-muted-foreground text-sm">Interviewee</Label>
                    <p className="font-medium">{interview.intervieweeName}</p>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground text-sm">Interview Type</Label>
                    <Badge variant="secondary" className="ml-2">
                      {interview.interviewType?.replace('_', ' ')}
                    </Badge>
                  </div>
                </>
              )}
              
              <div>
                <Label className="text-muted-foreground text-sm">Scheduled Time</Label>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {session.scheduledStartTime 
                    ? format(new Date(session.scheduledStartTime), 'PPP')
                    : 'Not scheduled'}
                  <Clock className="h-4 w-4 ml-2" />
                  {session.scheduledStartTime 
                    ? format(new Date(session.scheduledStartTime), 'p')
                    : ''}
                </p>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-sm">Status</Label>
                <Badge 
                  variant={session.status === 'in_progress' ? 'default' : 'secondary'}
                  className="ml-2"
                  data-testid="session-status-badge"
                >
                  {session.status === 'in_progress' ? 'In Progress' : 
                   session.status === 'scheduled' ? 'Scheduled' :
                   session.status === 'completed' ? 'Completed' : session.status}
                </Badge>
              </div>
              
              <Separator />
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Confidentiality Notice</AlertTitle>
                <AlertDescription>
                  This interview may be recorded for compliance purposes. 
                  All information shared is confidential and protected.
                </AlertDescription>
              </Alert>
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
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                    <p className="text-sm text-muted-foreground">
                      Camera and microphone access was denied. 
                      Please allow access in your browser settings.
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
                onClick={handleJoinSession}
                disabled={!hasMediaPermission || !displayName.trim() || session.status === 'completed'}
                data-testid="button-join-session"
              >
                {session.status === 'completed' ? (
                  'Interview Completed'
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Join Interview
                  </>
                )}
              </Button>
              
              {hasMediaPermission && (
                <p className="text-xs text-center text-muted-foreground">
                  By joining, you agree to the recording and privacy policies.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
