import { useState, useEffect, useRef, useReducer } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Video, Mic, MicOff, VideoOff, Play, Square, Send, Loader2, ShieldAlert, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

type SessionState = {
  sessionData: any;
  loading: boolean;
  error: string | null;
  upjohnAcknowledged: boolean;
  isRecording: boolean;
  currentQuestionIndex: number;
  conversationHistory: Array<{
    questionId: string;
    question: string;
    answer: string;
    transcript: string;
    followUps: string[];
  }>;
  currentAnswer: string;
  mediaStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  recordedChunks: Blob[];
  isSubmitting: boolean;
  transcriptionSegments: Array<{
    text: string;
    timestamp: number;
    isFinal: boolean;
  }>;
  transcriptionSocket: WebSocket | null;
};

type Action =
  | { type: "SET_SESSION_DATA"; payload: any }
  | { type: "SET_ERROR"; payload: string }
  | { type: "ACKNOWLEDGE_UPJOHN" }
  | { type: "START_RECORDING"; mediaStream: MediaStream; mediaRecorder: MediaRecorder }
  | { type: "STOP_RECORDING" }
  | { type: "ADD_CHUNK"; chunk: Blob }
  | { type: "NEXT_QUESTION" }
  | { type: "ADD_FOLLOW_UP"; followUp: string }
  | { type: "SET_ANSWER"; answer: string }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "ADD_FINAL_SEGMENT"; segment: { text: string; timestamp: number } }
  | { type: "UPDATE_INTERIM_SEGMENT"; text: string }
  | { type: "CLEAR_TRANSCRIPTION" }
  | { type: "SET_TRANSCRIPTION_SOCKET"; socket: WebSocket | null };

const initialState: SessionState = {
  sessionData: null,
  loading: true,
  error: null,
  upjohnAcknowledged: false,
  isRecording: false,
  currentQuestionIndex: 0,
  conversationHistory: [],
  currentAnswer: "",
  mediaStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  isSubmitting: false,
  transcriptionSegments: [],
  transcriptionSocket: null,
};

function sessionReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SET_SESSION_DATA":
      return { ...state, sessionData: action.payload, loading: false };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "ACKNOWLEDGE_UPJOHN":
      return { ...state, upjohnAcknowledged: true };
    case "START_RECORDING":
      return {
        ...state,
        isRecording: true,
        mediaStream: action.mediaStream,
        mediaRecorder: action.mediaRecorder,
        recordedChunks: [],
      };
    case "STOP_RECORDING":
      return { ...state, isRecording: false };
    case "ADD_CHUNK":
      return { ...state, recordedChunks: [...state.recordedChunks, action.chunk] };
    case "NEXT_QUESTION":
      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        currentAnswer: "",
      };
    case "ADD_FOLLOW_UP":
      const updatedHistory = [...state.conversationHistory];
      if (updatedHistory.length > 0) {
        const lastEntry = updatedHistory[updatedHistory.length - 1];
        lastEntry.followUps.push(action.followUp);
      }
      return { ...state, conversationHistory: updatedHistory };
    case "SET_ANSWER":
      return { ...state, currentAnswer: action.answer };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.submitting };
    case "ADD_FINAL_SEGMENT":
      // Replace last interim segment with final version if present
      const segments = [...state.transcriptionSegments];
      if (segments.length > 0 && !segments[segments.length - 1].isFinal) {
        segments[segments.length - 1] = {
          text: action.segment.text,
          timestamp: action.segment.timestamp,
          isFinal: true,
        };
      } else {
        segments.push({
          text: action.segment.text,
          timestamp: action.segment.timestamp,
          isFinal: true,
        });
      }
      return { ...state, transcriptionSegments: segments };
    case "UPDATE_INTERIM_SEGMENT":
      // Update or add interim segment
      const updatedSegments = [...state.transcriptionSegments];
      if (updatedSegments.length > 0 && !updatedSegments[updatedSegments.length - 1].isFinal) {
        // Update existing interim segment (keep original timestamp for stability)
        updatedSegments[updatedSegments.length - 1].text = action.text;
      } else {
        // Add new interim segment
        updatedSegments.push({
          text: action.text,
          timestamp: Date.now(),
          isFinal: false,
        });
      }
      return { ...state, transcriptionSegments: updatedSegments };
    case "CLEAR_TRANSCRIPTION":
      return { ...state, transcriptionSegments: [] };
    case "SET_TRANSCRIPTION_SOCKET":
      return { ...state, transcriptionSocket: action.socket };
    default:
      return state;
  }
}

export default function InterviewSession() {
  const { token } = useParams();
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const resamplerRef = useRef<{
    inputBuffer: Float32Array[];
    inputSampleRate: number;
    outputSampleRate: number;
  } | null>(null);

  useEffect(() => {
    if (token) {
      fetchSessionData();
    }
  }, [token]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`/api/interview-session/${token}`);
      if (!response.ok) {
        const error = await response.json();
        dispatch({ type: "SET_ERROR", payload: error.message });
        return;
      }
      const data = await response.json();
      dispatch({ type: "SET_SESSION_DATA", payload: data });

      await fetch(`/api/interview-session/${token}/mark-opened`, {
        method: "POST",
      });
    } catch (error: any) {
      dispatch({ type: "SET_ERROR", payload: error.message });
    }
  };

  const startRecording = async () => {
    try {
      // Step 1: Get real-time transcription token from backend
      const tokenResponse = await fetch(`/api/interview-session/${token}/realtime-token`);
      if (!tokenResponse.ok) {
        throw new Error("Failed to get transcription token");
      }
      const { realtimeToken } = await tokenResponse.json();
      
      // Step 2: Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled,
        audio: audioEnabled,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          dispatch({ type: "ADD_CHUNK", chunk: event.data });
        }
      };

      recorder.start(1000);
      dispatch({ type: "START_RECORDING", mediaStream: stream, mediaRecorder: recorder });

      // Step 3: Setup ElevenLabs WebSocket for real-time transcription
      dispatch({ type: "CLEAR_TRANSCRIPTION" });
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/stream?token=${realtimeToken}`
      );

      ws.onopen = () => {
        console.log("ElevenLabs transcription WebSocket connected");
        
        // Setup audio context - browser will use native sample rate (typically 48kHz)
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        
        const inputSampleRate = audioContext.sampleRate;
        const outputSampleRate = 16000; // ElevenLabs expects 16kHz
        
        console.log(`Audio: resampling from ${inputSampleRate}Hz to ${outputSampleRate}Hz`);
        
        // Initialize resampler
        resamplerRef.current = {
          inputBuffer: [],
          inputSampleRate,
          outputSampleRate,
        };
        
        // NOTE: createScriptProcessor is deprecated but still widely supported
        // Future: migrate to AudioWorklet for better performance and longevity
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || !resamplerRef.current) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Linear resampling from native rate to 16kHz
          const ratio = resamplerRef.current.inputSampleRate / resamplerRef.current.outputSampleRate;
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
          
          ws.send(pcm16.buffer);
        };

        // Create silent gain node to prevent audio loopback/echo
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Mute output to prevent feedback loop
        
        source.connect(processor);
        processor.connect(gainNode); // Connect to silent gain instead of destination
        gainNode.connect(audioContext.destination);
      };

      let lastSegmentTimestamp = Date.now();
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            // Use monotonic timestamps to ensure ordering stability
            const currentTime = Date.now();
            
            if (data.is_final) {
              // Add final segment (replaces last interim if present)
              dispatch({
                type: "ADD_FINAL_SEGMENT",
                segment: {
                  text: data.text,
                  timestamp: currentTime,
                },
              });
              lastSegmentTimestamp = currentTime;
            } else {
              // Update interim segment in place for real-time streaming
              // Keep timestamp stable during interim updates
              dispatch({
                type: "UPDATE_INTERIM_SEGMENT",
                text: data.text,
              });
            }
          }
        } catch (error) {
          console.error("Failed to parse transcription message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        
        // Cleanup on error
        if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        resamplerRef.current = null;
        
        dispatch({ type: "SET_TRANSCRIPTION_SOCKET", socket: null });
        
        toast({
          title: "Transcription Error",
          description: "Real-time transcription connection lost. Recording continues.",
          variant: "destructive",
        });
      };

      ws.onclose = () => {
        console.log("ElevenLabs transcription WebSocket closed");
        
        // Cleanup on close
        if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        resamplerRef.current = null;
        
        dispatch({ type: "SET_TRANSCRIPTION_SOCKET", socket: null });
      };

      dispatch({ type: "SET_TRANSCRIPTION_SOCKET", socket: ws });

      toast({
        title: "Recording Started",
        description: "Your interview is now being recorded with real-time transcription.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start recording: " + error.message,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (state.mediaRecorder) {
      state.mediaRecorder.stop();
      dispatch({ type: "STOP_RECORDING" });

      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach((track) => track.stop());
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Stop real-time transcription
      if (state.transcriptionSocket) {
        state.transcriptionSocket.close();
        dispatch({ type: "SET_TRANSCRIPTION_SOCKET", socket: null });
      }

      // Stop audio processing
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      resamplerRef.current = null;
    }
  };

  const generateAIFollowUp = async (question: string, answer: string) => {
    try {
      const response = await fetch(`/api/interview-session/${token}/ai-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationHistory: state.conversationHistory,
          currentQuestion: question,
          currentAnswer: answer,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI follow-up");
      }

      const data = await response.json();
      dispatch({ type: "ADD_FOLLOW_UP", followUp: data.question });

      toast({
        title: "AI Follow-up Generated",
        description: data.question,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate AI follow-up: " + error.message,
        variant: "destructive",
      });
    }
  };

  const submitInterview = async () => {
    try {
      dispatch({ type: "SET_SUBMITTING", submitting: true });

      // Step 1: Create video blob from recorded chunks
      const recordingBlob = new Blob(state.recordedChunks, { type: "video/webm" });

      // Step 2: Get presigned upload URL and object path from backend
      const uploadUrlResponse = await fetch(`/api/interview-session/${token}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!uploadUrlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await uploadUrlResponse.json();

      // Step 3: Upload video blob to object storage using presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: recordingBlob,
        headers: {
          "Content-Type": "video/webm",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload video");
      }

      // Step 4: Prepare interview data
      const transcriptText = state.conversationHistory
        .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
        .join("\n\n");

      const transcriptSegments = state.conversationHistory.map((item, index) => ({
        questionId: item.questionId,
        question: item.question,
        answer: item.answer,
        transcript: item.transcript,
        followUps: item.followUps,
        timestamp: Date.now() + index * 1000,
      }));

      const timelineEvents = state.conversationHistory.map((item, index) => ({
        eventType: "question_answered",
        timestamp: Date.now() + index * 1000,
        description: `Answered: ${item.question}`,
      }));

      const deviceMetadata = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
      };

      // Step 5: Submit interview with object path (already normalized by backend)
      const response = await fetch(`/api/interview-session/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectPath,
          transcriptText,
          transcriptSegments,
          timelineEvents,
          deviceMetadata,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit interview");
      }

      toast({
        title: "Interview Submitted",
        description: "Thank you for completing the interview. Your video has been securely uploaded.",
      });

      dispatch({ type: "SET_SUBMITTING", submitting: false });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit interview: " + error.message,
        variant: "destructive",
      });
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    }
  };

  const currentQuestion =
    state.sessionData?.template?.baseQuestions?.[state.currentQuestionIndex];
  const totalQuestions = state.sessionData?.template?.baseQuestions?.length || 0;
  const progress = totalQuestions > 0 ? ((state.currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading interview session...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <AlertDialog open={!state.upjohnAcknowledged}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Upjohn Warning - Attorney-Client Privilege
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-4 pt-4">
              <p>
                <strong>IMPORTANT LEGAL NOTICE:</strong> This interview is being conducted at the
                direction of legal counsel for {state.sessionData?.case?.title}.
              </p>
              <p>
                The purpose of this interview is to gather information for legal advice and
                representation. All communications during this interview are protected by the
                attorney-client privilege and work product doctrine.
              </p>
              <p className="font-semibold">
                You must keep this interview and all information discussed completely confidential.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Do not discuss this interview or its contents with anyone other than the
                  attorneys representing the company
                </li>
                <li>
                  Do not discuss this interview with other employees, managers, or third parties
                </li>
                <li>Disclosure could waive the attorney-client privilege</li>
                <li>This recording is for legal purposes only and will be kept confidential</li>
              </ul>
              <p>
                By proceeding, you acknowledge that you understand and will comply with these
                confidentiality requirements.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => dispatch({ type: "ACKNOWLEDGE_UPJOHN" })}
              data-testid="button-acknowledge-upjohn"
            >
              I Understand and Agree
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Interview Session</CardTitle>
            <CardDescription>
              Case: {state.sessionData?.case?.caseNumber} - {state.sessionData?.case?.title}
            </CardDescription>
            <CardDescription>
              Interviewee: {state.sessionData?.invite?.intervieweeName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Question {state.currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  <Badge variant="secondary" data-testid="badge-template-category">
                    {state.sessionData?.template?.category}
                  </Badge>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-interview" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Video Recording</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-muted rounded-md overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  data-testid="video-preview"
                />
                {state.isRecording && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="destructive" className="animate-pulse" data-testid="badge-recording">
                      REC
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={cameraEnabled ? () => setCameraEnabled(false) : () => setCameraEnabled(true)}
                  variant="outline"
                  size="icon"
                  data-testid="button-toggle-camera"
                >
                  {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={audioEnabled ? () => setAudioEnabled(false) : () => setAudioEnabled(true)}
                  variant="outline"
                  size="icon"
                  data-testid="button-toggle-audio"
                >
                  {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                {!state.isRecording ? (
                  <Button
                    onClick={startRecording}
                    variant="default"
                    className="flex-1"
                    data-testid="button-start-recording"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="flex-1"
                    data-testid="button-stop-recording"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQuestion ? (
                <>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-lg" data-testid="text-current-question">
                      {currentQuestion}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => generateAIFollowUp(currentQuestion, state.currentAnswer)}
                      variant="outline"
                      disabled={!state.isRecording}
                      data-testid="button-generate-ai-followup"
                    >
                      Generate AI Follow-up
                    </Button>
                    <Button
                      onClick={() => dispatch({ type: "NEXT_QUESTION" })}
                      disabled={state.currentQuestionIndex >= totalQuestions - 1}
                      data-testid="button-next-question"
                    >
                      Next Question
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">All questions completed!</p>
                  <Button
                    onClick={submitInterview}
                    disabled={state.isSubmitting || state.isRecording}
                    data-testid="button-submit-interview"
                  >
                    {state.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Interview
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Real-time Transcription Display */}
        {state.isRecording && (
          <Card data-testid="card-live-transcription">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Live Transcription</CardTitle>
                {state.transcriptionSocket && state.transcriptionSocket.readyState === WebSocket.OPEN && (
                  <Badge variant="default" className="ml-auto">
                    Active
                  </Badge>
                )}
              </div>
              <CardDescription>
                Real-time speech-to-text powered by ElevenLabs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full rounded-md border p-4" data-testid="scroll-transcription">
                {state.transcriptionSegments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Waiting for speech...</p>
                    <p className="text-sm mt-2">Start speaking and the transcription will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {state.transcriptionSegments.map((segment, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded ${
                          segment.isFinal ? "bg-muted" : "bg-muted/50 italic"
                        }`}
                        data-testid={`transcript-segment-${index}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm flex-1">{segment.text}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(segment.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {!segment.isFinal && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Interim
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
