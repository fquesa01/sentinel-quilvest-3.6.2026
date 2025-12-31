import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  ScreenShare, 
  ScreenShareOff,
  Circle,
  Square,
  Users,
  MessageSquare,
  FileText,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { LiveInterviewSession, LiveInterviewParticipant } from '@shared/schema';

interface Participant {
  peerId: string;
  participantId: string;
  userId?: string;
  userName: string;
  role: string;
  stream?: MediaStream;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
}

interface TranscriptSegment {
  id: string;
  speakerName: string;
  speakerRole: string;
  text: string;
  startTime: number;
  endTime?: number;
  isFinal: boolean;
}

interface Props {
  sessionId: string;
  roomId: string;
  userName: string;
  userId: string;
  userRole: 'interviewer' | 'interviewee' | 'observer';
  onLeave?: () => void;
}

export function LiveInterviewRoom({ sessionId, roomId, userName, userId, userRole, onLeave }: Props) {
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, Participant>>(new Map());
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showUpjohnDialog, setShowUpjohnDialog] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [upjohnGiven, setUpjohnGiven] = useState(false);
  
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  
  const { data: session, isLoading: sessionLoading } = useQuery<LiveInterviewSession>({
    queryKey: ['/api/live-interview-sessions', sessionId],
    enabled: !!sessionId,
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest('PATCH', `/api/live-interview-sessions/${sessionId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-interview-sessions', sessionId] });
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', `/api/live-interview-sessions/${sessionId}/participants`, data);
      return res.json();
    },
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async ({ participantId, updates }: { participantId: string; updates: any }) => {
      const res = await apiRequest('PATCH', `/api/live-interview-sessions/${sessionId}/participants/${participantId}`, updates);
      return res.json();
    },
  });

  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error: any) {
      console.error('Failed to get media:', error);
      toast({
        title: 'Camera/Microphone Error',
        description: 'Please allow access to your camera and microphone to join the interview.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const createPeerConnection = useCallback((remotePeerId: string) => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
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
    
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remotePeerId}:`, pc.connectionState);
    };
    
    return pc;
  }, [localStream, roomId]);

  const handleOffer = useCallback(async (fromPeerId: string, sdp: RTCSessionDescriptionInit) => {
    let pc = peerConnectionsRef.current.get(fromPeerId);
    if (!pc) {
      pc = createPeerConnection(fromPeerId);
    }
    
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        roomId,
        payload: {
          targetPeerId: fromPeerId,
          sdp: answer,
        },
      }));
    }
  }, [createPeerConnection, roomId]);

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
    const pc = createPeerConnection(remotePeerId);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'offer',
        roomId,
        payload: {
          targetPeerId: remotePeerId,
          sdp: offer,
        },
      }));
    }
  }, [createPeerConnection, roomId]);

  const connectWebSocket = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const stream = await initializeMedia();
      
      // First, get a signaling token from the server
      const tokenResponse = await fetch(`/api/live-interview-sessions/${sessionId}/signaling-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: userRole }),
      });
      
      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.message || 'Failed to get signaling token');
      }
      
      const { token } = await tokenResponse.json();
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/signaling?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = async () => {
        console.log('WebSocket connected (authenticated)');
        
        // Send join message - server will use token data for auth
        ws.send(JSON.stringify({
          type: 'join',
          roomId,
        }));
        
        const participantResult = await addParticipantMutation.mutateAsync({
          userId,
          externalName: userName,
          role: userRole,
        });
        
        setMyPeerId(participantResult.id);
      };
      
      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'joined':
            setIsConnected(true);
            setIsConnecting(false);
            setMyPeerId(message.peerId);
            setIsHost(message.isHost);
            
            if (message.participants) {
              const participants = new Map<string, Participant>();
              for (const p of message.participants) {
                if (p.peerId !== message.peerId) {
                  participants.set(p.peerId, {
                    peerId: p.peerId,
                    participantId: p.participantId,
                    userId: p.userId,
                    userName: p.userName,
                    role: p.role,
                  });
                  await initiateCall(p.peerId);
                }
              }
              setRemoteParticipants(participants);
            }
            
            if (userRole === 'interviewee') {
              setShowConsentDialog(true);
            }
            break;
            
          case 'participant-joined':
            if (message.peerId !== myPeerId) {
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
                description: `${message.userName} has joined the interview.`,
              });
            }
            break;
            
          case 'participant-left':
            setRemoteParticipants(prev => {
              const updated = new Map(prev);
              const participant = updated.get(message.peerId);
              if (participant) {
                toast({
                  title: 'Participant Left',
                  description: `${participant.userName} has left the interview.`,
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
            await handleOffer(message.fromPeerId, message.sdp);
            break;
            
          case 'answer':
            await handleAnswer(message.fromPeerId, message.sdp);
            break;
            
          case 'ice-candidate':
            await handleIceCandidate(message.fromPeerId, message.candidate);
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
                  screenSharing: message.screenSharing ?? participant.screenSharing,
                });
              }
              return updated;
            });
            break;
            
          case 'error':
            console.error('WebSocket error:', message.error);
            setConnectionError(message.error);
            break;
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error');
        setIsConnecting(false);
      };
      
    } catch (error: any) {
      console.error('Failed to connect:', error);
      setConnectionError(error.message);
      setIsConnecting(false);
    }
  }, [roomId, userId, userName, userRole, initializeMedia, addParticipantMutation, initiateCall, handleOffer, handleAnswer, handleIceCandidate, myPeerId, toast]);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
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
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isConnected && session?.status === 'in_progress') {
      durationIntervalRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isConnected, session?.status]);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
        
        wsRef.current?.send(JSON.stringify({
          type: 'participant-update',
          roomId,
          payload: { videoEnabled: videoTrack.enabled },
        }));
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
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      
      wsRef.current?.send(JSON.stringify({
        type: 'session-state',
        roomId,
        payload: { isRecording: true },
      }));
      
      toast({
        title: 'Recording Started',
        description: 'The interview is now being recorded.',
      });
    } catch (error: any) {
      console.error('Failed to start recording:', error);
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

  const handleConsentGiven = async () => {
    setConsentGiven(true);
    setShowConsentDialog(false);
    
    await updateSessionMutation.mutateAsync({
      consentCapturedAt: new Date().toISOString(),
    });
    
    if (userRole === 'interviewee' && !upjohnGiven) {
      setShowUpjohnDialog(true);
    }
    
    toast({
      title: 'Consent Recorded',
      description: 'Your consent has been recorded for the interview.',
    });
  };

  const handleUpjohnAcknowledged = async () => {
    setUpjohnGiven(true);
    setShowUpjohnDialog(false);
    
    await updateSessionMutation.mutateAsync({
      upjohnWarningGivenAt: new Date().toISOString(),
    });
    
    toast({
      title: 'Upjohn Warning Acknowledged',
      description: 'Thank you for acknowledging the Upjohn warning.',
    });
  };

  const startSession = async () => {
    await updateSessionMutation.mutateAsync({
      status: 'in_progress',
      actualStartTime: new Date().toISOString(),
    });
    
    toast({
      title: 'Interview Started',
      description: 'The interview session has officially started.',
    });
  };

  const endSession = async () => {
    if (isRecording) {
      stopRecording();
    }
    
    await updateSessionMutation.mutateAsync({
      status: 'completed',
      actualEndTime: new Date().toISOString(),
      duration: sessionDuration,
    });
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave', roomId }));
      wsRef.current.close();
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    toast({
      title: 'Interview Ended',
      description: 'The interview session has been completed.',
    });
    
    onLeave?.();
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-interview">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading interview session...</span>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" data-testid="connection-error">
        <XCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Connection Error</h2>
        <p className="text-muted-foreground">{connectionError}</p>
        <Button onClick={connectWebSocket} data-testid="button-retry-connection">
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background" data-testid="live-interview-room">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-4">
          <Badge variant={session?.status === 'in_progress' ? 'default' : 'secondary'} data-testid="session-status">
            {session?.status === 'in_progress' ? 'Live' : session?.status || 'Connecting'}
          </Badge>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span data-testid="session-duration">{formatDuration(sessionDuration)}</span>
          </div>
          
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse" data-testid="recording-indicator">
              <Circle className="h-2 w-2 mr-1 fill-current" />
              Recording
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span data-testid="participant-count">{remoteParticipants.size + 1}</span>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTranscriptPanel(!showTranscriptPanel)}
            data-testid="button-toggle-transcript"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex flex-col ${showTranscriptPanel ? '' : ''}`}>
          <div className="flex-1 p-4 grid gap-4 grid-cols-2 auto-rows-fr" data-testid="video-grid">
            <Card className="relative overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="local-video"
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <Badge variant="secondary" className="bg-background/80">
                  {userName} (You)
                </Badge>
                {!audioEnabled && <MicOff className="h-4 w-4 text-destructive" />}
                {!videoEnabled && <VideoOff className="h-4 w-4 text-destructive" />}
              </div>
            </Card>
            
            {Array.from(remoteParticipants.values()).map((participant) => (
              <Card key={participant.peerId} className="relative overflow-hidden" data-testid={`remote-video-${participant.peerId}`}>
                <video
                  ref={(el) => {
                    remoteVideoRefs.current.set(participant.peerId, el);
                    if (el && participant.stream) {
                      el.srcObject = participant.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!participant.stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="text-2xl">
                        {participant.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-background/80">
                    {participant.userName}
                    {participant.role === 'interviewer' && ' (Interviewer)'}
                    {participant.role === 'interviewee' && ' (Interviewee)'}
                  </Badge>
                  {participant.audioEnabled === false && <MicOff className="h-4 w-4 text-destructive" />}
                  {participant.videoEnabled === false && <VideoOff className="h-4 w-4 text-destructive" />}
                </div>
              </Card>
            ))}
            
            {remoteParticipants.size === 0 && (
              <Card className="flex items-center justify-center bg-muted" data-testid="waiting-for-participants">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Waiting for other participants...</p>
                </div>
              </Card>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-4 p-4 border-t bg-card" data-testid="controls-bar">
            <Button
              variant={audioEnabled ? 'secondary' : 'destructive'}
              size="icon"
              onClick={toggleAudio}
              data-testid="button-toggle-audio"
            >
              {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={videoEnabled ? 'secondary' : 'destructive'}
              size="icon"
              onClick={toggleVideo}
              data-testid="button-toggle-video"
            >
              {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            
            <Separator orientation="vertical" className="h-8" />
            
            {(userRole === 'interviewer' || isHost) && (
              <>
                {!isRecording ? (
                  <Button
                    variant="outline"
                    onClick={startRecording}
                    disabled={session?.status !== 'in_progress'}
                    data-testid="button-start-recording"
                  >
                    <Circle className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={stopRecording}
                    data-testid="button-stop-recording"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </Button>
                )}
                
                {session?.status !== 'in_progress' && (
                  <Button
                    variant="default"
                    onClick={startSession}
                    data-testid="button-start-session"
                  >
                    Start Interview
                  </Button>
                )}
              </>
            )}
            
            <Separator orientation="vertical" className="h-8" />
            
            <Button
              variant="destructive"
              onClick={endSession}
              data-testid="button-end-session"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Call
            </Button>
          </div>
        </div>
        
        {showTranscriptPanel && (
          <div className="w-96 border-l bg-card flex flex-col" data-testid="transcript-panel">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Live Transcript
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowTranscriptPanel(false)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4" ref={transcriptScrollRef}>
              {transcriptSegments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Transcript will appear here as participants speak...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transcriptSegments.map((segment) => (
                    <div key={segment.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{segment.speakerName}</span>
                        <Badge variant="outline" className="text-xs">
                          {segment.speakerRole}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(segment.startTime)}
                        </span>
                      </div>
                      <p className={segment.isFinal ? '' : 'opacity-70 italic'}>
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="border-t p-4 space-y-3">
              <div className="flex items-center gap-2">
                {consentGiven ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Consent Given
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Awaiting Consent
                  </Badge>
                )}
                
                {upjohnGiven ? (
                  <Badge variant="default" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Upjohn Acknowledged
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Upjohn Pending
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <AlertDialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <AlertDialogContent data-testid="consent-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Recording Consent</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This interview session may be recorded for documentation purposes. 
                By continuing, you consent to the recording and understand that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The recording will be used for compliance and legal purposes</li>
                <li>The recording may be reviewed by authorized personnel</li>
                <li>You have the right to request a copy of the recording</li>
              </ul>
              <p className="font-medium">
                Do you consent to the recording of this interview?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onLeave?.()} data-testid="button-decline-consent">
              Decline & Leave
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConsentGiven} data-testid="button-accept-consent">
              I Consent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showUpjohnDialog} onOpenChange={setShowUpjohnDialog}>
        <AlertDialogContent className="max-w-2xl" data-testid="upjohn-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Upjohn Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="font-medium text-foreground">
                Before we proceed, please understand the following:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Company Representation:</strong> The attorneys conducting this interview represent the company, not you personally.
                </li>
                <li>
                  <strong>Attorney-Client Privilege:</strong> Communications during this interview may be protected by attorney-client privilege, but that privilege belongs to the company, not to you.
                </li>
                <li>
                  <strong>Waiver of Privilege:</strong> The company may choose to waive this privilege at any time and disclose the contents of this interview to third parties, including government agencies.
                </li>
                <li>
                  <strong>Cooperation Required:</strong> You are expected to cooperate fully and provide truthful answers. Failure to do so may result in disciplinary action.
                </li>
                <li>
                  <strong>Personal Counsel:</strong> You have the right to obtain your own personal attorney if you wish.
                </li>
              </ul>
              <p className="font-medium">
                Do you understand and acknowledge these terms?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-upjohn-need-clarification">
              I Need Clarification
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpjohnAcknowledged} data-testid="button-upjohn-acknowledge">
              I Understand & Acknowledge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
