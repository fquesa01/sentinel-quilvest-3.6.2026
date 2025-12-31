import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Video, 
  VideoOff,
  Mic, 
  MicOff, 
  Play, 
  Square, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  Camera,
  Loader2,
  RefreshCw,
  MessageCircle,
  Send,
  X,
  Upload
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface InterviewData {
  interview: {
    id: string;
    intervieweeName: string;
    intervieweeEmail: string;
    interviewType: string;
    scheduledFor: string;
    status: string;
    questions: string[] | null;
    accessToken: string;
  };
  case: {
    id: string;
    title: string;
    caseNumber: string;
  } | null;
}

type InterviewStage = "setup" | "consent" | "recording" | "review" | "upload" | "complete";

export default function WitnessInterview() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [data, setData] = useState<InterviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [stage, setStage] = useState<InterviewStage>("setup");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobs, setRecordedBlobs] = useState<Map<number, Blob>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  
  const [recordingTime, setRecordingTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchInterview() {
      try {
        const response = await fetch(`/api/join-interview/${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to load interview");
        }
        const interviewData = await response.json();
        setData(interviewData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchInterview();
    }
  }, [token]);

  const initializeMedia = useCallback(async () => {
    setIsTestingCamera(true);
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      mediaStreamRef.current = stream;
      setHasCamera(true);
      setHasMic(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Media access error:", err);
      if (err.name === "NotAllowedError") {
        setMediaError("Camera and microphone access is required. Please allow access in your browser and try again.");
      } else if (err.name === "NotFoundError") {
        setMediaError("No camera or microphone found. Please connect a webcam and try again.");
      } else {
        setMediaError("Failed to access camera/microphone. Please check your device settings and try again.");
      }
    } finally {
      setIsTestingCamera(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Keep video stream connected when stage changes to recording
  useEffect(() => {
    if (stage === "recording" && mediaStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [stage]);

  // Recording timer management
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Format recording time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  const stopResolverRef = useRef<(() => void) | null>(null);
  const recordingQuestionIndexRef = useRef<number>(0);

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    
    chunksRef.current = [];
    recordingQuestionIndexRef.current = currentQuestionIndex;
    
    const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType: "video/webm;codecs=vp9,opus"
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const questionIdx = recordingQuestionIndexRef.current;
      setRecordedBlobs(prev => new Map(prev).set(questionIdx, blob));
      
      if (stopResolverRef.current) {
        stopResolverRef.current();
        stopResolverRef.current = null;
      }
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);
  };

  const stopRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        stopResolverRef.current = resolve;
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } else {
        resolve();
      }
    });
  };

  const nextQuestion = async () => {
    const questions = data?.interview.questions || [];
    
    // Track if we were recording to auto-restart
    const wasRecording = isRecording;
    
    // Auto-stop recording if active
    if (isRecording) {
      await stopRecording();
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowAIChat(false);
      setAiResponse(null);
      setAiQuestion("");
      
      // Auto-start recording on new question after state updates
      if (wasRecording) {
        setTimeout(() => startRecording(), 100);
      }
    } else {
      // Wait for React state update to propagate before transitioning
      // This ensures the last recorded blob is in state when review renders
      await new Promise(resolve => setTimeout(resolve, 100));
      setStage("review");
    }
  };

  const previousQuestion = async () => {
    // Track if we were recording to auto-restart
    const wasRecording = isRecording;
    
    // Auto-stop recording if active
    if (isRecording) {
      await stopRecording();
    }
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowAIChat(false);
      setAiResponse(null);
      setAiQuestion("");
      
      // Auto-start recording on new question after state updates
      if (wasRecording) {
        setTimeout(() => startRecording(), 100);
      }
    }
  };

  const goToQuestion = async (index: number) => {
    if (index !== currentQuestionIndex) {
      // Track if we were recording to auto-restart
      const wasRecording = isRecording;
      
      // Auto-stop recording if active
      if (isRecording) {
        await stopRecording();
      }
      
      setCurrentQuestionIndex(index);
      setShowAIChat(false);
      setAiResponse(null);
      setAiQuestion("");
      
      // Auto-start recording on new question after state updates
      if (wasRecording) {
        setTimeout(() => startRecording(), 100);
      }
    }
  };

  const endInterview = async () => {
    // Stop any active recording first
    if (isRecording) {
      await stopRecording();
    }
    
    // Go directly to upload stage
    setStage("upload");
    await uploadResponses();
  };

  const uploadResponses = async () => {
    if (!data || recordedBlobs.size === 0) return;
    
    setIsUploading(true);
    const questions = data.interview.questions || [];
    const totalResponses = recordedBlobs.size;
    let uploaded = 0;

    try {
      for (const [index, blob] of Array.from(recordedBlobs.entries())) {
        // Step 1: Get upload URL from server
        const urlResponse = await fetch("/api/interview-responses/get-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId: data.interview.id,
            questionIndex: index,
            accessToken: token
          })
        });

        if (!urlResponse.ok) {
          throw new Error(`Failed to get upload URL for response ${index + 1}`);
        }

        const { uploadUrl, objectPath } = await urlResponse.json();

        // Step 2: Upload the video blob to object storage
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: blob,
          headers: {
            "Content-Type": "video/webm"
          }
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload video for response ${index + 1}`);
        }

        // Step 3: Save the response metadata to database
        const saveResponse = await fetch("/api/interview-responses/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId: data.interview.id,
            questionIndex: index,
            questionText: questions[index],
            accessToken: token,
            videoUrl: objectPath
          })
        });

        if (!saveResponse.ok) {
          throw new Error(`Failed to save response ${index + 1}`);
        }

        uploaded++;
        setUploadProgress((uploaded / totalResponses) * 100);
      }

      // Mark interview as complete
      await fetch(`/api/interviews/${data.interview.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token })
      });

      setStage("complete");
      toast({
        title: "Interview Submitted",
        description: "Your responses have been successfully recorded."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  const askAIQuestion = async () => {
    if (!aiQuestion.trim() || !data) return;
    
    setIsAskingAI(true);
    setAiResponse(null);
    
    const currentQuestion = data.interview.questions?.[currentQuestionIndex] || "";
    
    try {
      const response = await fetch("/api/ai/clarify-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewQuestion: currentQuestion,
          witnessQuestion: aiQuestion,
          accessToken: token
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }
      
      const { response: aiAnswer } = await response.json();
      setAiResponse(aiAnswer);
    } catch (err) {
      setAiResponse("I'm sorry, I couldn't process your question. Please try rephrasing or proceed with your best understanding of the question.");
    } finally {
      setIsAskingAI(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Interview Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="mt-4 w-full" 
              onClick={() => setLocation(`/join-interview/${token}`)}
              data-testid="button-back-to-invitation"
            >
              Back to Invitation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const questions = data.interview.questions || [];
  const hasQuestions = questions.length > 0;

  if (stage === "upload") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl" data-testid="heading-uploading">Uploading Interview</CardTitle>
            <CardDescription>
              Please wait while we upload your responses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={uploadProgress} className="h-3" data-testid="progress-upload" />
            <p className="text-center text-muted-foreground">
              {Math.round(uploadProgress)}% complete
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Do not close this window until the upload is complete.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Interview Complete</CardTitle>
            <CardDescription>
              Thank you for participating in this interview
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your responses have been recorded and submitted. The investigation team will review your answers.
            </p>
            <p className="text-sm text-muted-foreground">
              You may close this window now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "setup") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl" data-testid="heading-camera-setup">Camera & Microphone Setup</CardTitle>
              <CardDescription>
                Please verify your camera and microphone are working before starting the interview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                  data-testid="video-preview"
                />
                {!hasCamera && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center p-4">
                      <VideoOff className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        {isTestingCamera ? "Requesting camera access..." : "Click 'Test Camera' to enable your webcam"}
                      </p>
                      {!isTestingCamera && !mediaError && (
                        <Button
                          onClick={initializeMedia}
                          data-testid="button-test-camera"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Test Camera
                        </Button>
                      )}
                      {isTestingCamera && (
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {mediaError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Media Access Error</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>{mediaError}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={initializeMedia}
                      disabled={isTestingCamera}
                      data-testid="button-retry-camera"
                    >
                      {isTestingCamera ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {hasCamera && (
                <div className="flex justify-center gap-4">
                  <Button
                    variant={cameraEnabled ? "default" : "secondary"}
                    size="lg"
                    onClick={toggleCamera}
                    disabled={!hasCamera}
                    data-testid="button-toggle-camera"
                  >
                    {cameraEnabled ? <Video className="h-5 w-5 mr-2" /> : <VideoOff className="h-5 w-5 mr-2" />}
                    {cameraEnabled ? "Camera On" : "Camera Off"}
                  </Button>
                  <Button
                    variant={micEnabled ? "default" : "secondary"}
                    size="lg"
                    onClick={toggleMic}
                    disabled={!hasMic}
                    data-testid="button-toggle-mic"
                  >
                    {micEnabled ? <Mic className="h-5 w-5 mr-2" /> : <MicOff className="h-5 w-5 mr-2" />}
                    {micEnabled ? "Mic On" : "Mic Off"}
                  </Button>
                </div>
              )}

              {hasQuestions ? (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This interview has {questions.length} question{questions.length !== 1 ? "s" : ""}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You will record your response to each question one at a time.
                  </p>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No Questions Available</AlertTitle>
                  <AlertDescription>
                    This interview does not have any questions configured. Please contact the organizer.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/join-interview/${token}`)}
                  data-testid="button-back-to-invitation"
                >
                  Back to Invitation
                </Button>
                <Button 
                  size="lg" 
                  disabled={!hasCamera || !hasMic || !hasQuestions}
                  onClick={() => setStage("consent")}
                  data-testid="button-continue-consent"
                >
                  Continue to Consent
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "consent") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Before We Begin</CardTitle>
              <CardDescription>
                Please review the following important information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-2 text-amber-800 dark:text-amber-400">Upjohn Warning</h3>
                      <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
                        <p>
                          I am a lawyer for the Company. I represent only the Company, and I do not represent you personally.
                        </p>
                        <p>
                          I am conducting this interview to gather facts in order to provide legal advice for the Company. 
                          This interview is part of an investigation to determine the facts and circumstances of particular events.
                        </p>
                        <p>
                          Our conversation may be protected by the attorney-client privilege. However, that privilege belongs 
                          solely to the Company, not to you. The Company alone may elect to waive the privilege and disclose 
                          our conversation to third parties, including the government.
                        </p>
                        <p>
                          In order for this discussion to be protected by the attorney-client privilege, it must be kept in 
                          confidence. Therefore, please do not discuss this interview or its contents with anyone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Recording Consent</h3>
                  <p className="text-sm text-muted-foreground">
                    By continuing, you consent to having your responses recorded for the purposes of this investigation. 
                    Your recordings will be reviewed by authorized personnel only.
                  </p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Confidentiality Notice</h3>
                  <p className="text-sm text-muted-foreground">
                    The contents of this interview are confidential and may be subject to attorney-client privilege. 
                    Please do not discuss the questions or your responses with others.
                  </p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Interview Process</h3>
                  <p className="text-sm text-muted-foreground">
                    You will be shown one question at a time. Click "Start Recording" to begin your response, 
                    and "Stop Recording" when finished. You can re-record any response before final submission.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setStage("setup")}
                  data-testid="button-back-to-setup"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStage("recording")}
                  data-testid="button-agree-and-continue"
                >
                  I Agree & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "recording") {
    const currentQuestion = questions[currentQuestionIndex];
    const hasRecordingForCurrent = recordedBlobs.has(currentQuestionIndex);
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Header with progress */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Interview Recording</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <Progress value={progress} className="w-48" />
          </div>

          {/* LARGE QUESTION DISPLAY - Full Width */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
            <CardContent className="py-8 px-8">
              <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">
                Question {currentQuestionIndex + 1}
              </p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight" data-testid="text-current-question">
                {currentQuestion}
              </h2>
              
              {/* AI Clarification Button */}
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowAIChat(!showAIChat);
                    setAiResponse(null);
                    setAiQuestion("");
                  }}
                  data-testid="button-ask-clarification"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {showAIChat ? "Close" : "Need clarification?"}
                </Button>
              </div>
              
              {/* AI Chat Panel */}
              {showAIChat && (
                <div className="mt-4 p-4 bg-background rounded-lg border space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask a clarifying question about this question..."
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && askAIQuestion()}
                      disabled={isAskingAI}
                      className="flex-1"
                      data-testid="input-ai-question"
                    />
                    <Button 
                      onClick={askAIQuestion}
                      disabled={!aiQuestion.trim() || isAskingAI}
                      data-testid="button-send-ai-question"
                    >
                      {isAskingAI ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* AI Response Display */}
                  {aiResponse && (
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-primary mb-1">AI Assistant</p>
                          <p className="text-sm leading-relaxed" data-testid="text-ai-response">{aiResponse}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setAiResponse(null)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* VIDEO PREVIEW - Always visible during recording */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                      data-testid="video-recording"
                    />
                    
                    {/* Recording indicator with timer */}
                    {isRecording && (
                      <div className="absolute top-4 left-4 flex items-center gap-3 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg">
                        <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        <span className="font-semibold">RECORDING</span>
                        <span className="font-mono text-lg" data-testid="text-recording-time">{formatTime(recordingTime)}</span>
                      </div>
                    )}
                    
                    {/* Response recorded indicator */}
                    {hasRecordingForCurrent && !isRecording && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Response Recorded</span>
                      </div>
                    )}
                    
                    {/* Camera icon overlay when not recording and no video yet */}
                    {!hasRecordingForCurrent && !isRecording && (
                      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        <Camera className="h-4 w-4 inline mr-2" />
                        Click "Start Recording" to begin
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isRecording ? (
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={startRecording}
                      data-testid="button-start-recording"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {hasRecordingForCurrent ? "Re-Record" : "Start Recording"}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant="destructive"
                      onClick={stopRecording}
                      data-testid="button-stop-recording"
                    >
                      <Square className="h-5 w-5 mr-2" />
                      Stop Recording
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={previousQuestion}
                      disabled={currentQuestionIndex === 0}
                      data-testid="button-previous-question"
                    >
                      Previous
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={nextQuestion}
                      data-testid="button-next-question"
                    >
                      {currentQuestionIndex === questions.length - 1 ? "Review" : "Next"}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  <Separator className="my-2" />

                  <Button 
                    variant="secondary"
                    className="w-full"
                    onClick={endInterview}
                    disabled={recordedBlobs.size === 0}
                    data-testid="button-end-interview"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    End Interview
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <button 
                        key={idx}
                        onClick={() => goToQuestion(idx)}
                        className={`w-full flex items-center gap-2 p-2 rounded text-sm text-left transition-colors cursor-pointer ${
                          idx === currentQuestionIndex 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:bg-muted/50"
                        }`}
                        data-testid={`button-go-to-question-${idx}`}
                      >
                        {recordedBlobs.has(idx) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                        )}
                        <span className="truncate">Q{idx + 1}: {q.substring(0, 30)}...</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "review") {
    const answeredCount = recordedBlobs.size;
    const allAnswered = answeredCount === questions.length;

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Review & Submit</CardTitle>
              <CardDescription>
                Review your responses before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Responses Recorded</span>
                  <span className={`font-bold ${allAnswered ? "text-green-600" : "text-amber-600"}`}>
                    {answeredCount} / {questions.length}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 bg-background rounded"
                    >
                      <div className="flex items-center gap-2">
                        {recordedBlobs.has(idx) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                        <span className="text-sm truncate max-w-[200px]">
                          Q{idx + 1}: {q.substring(0, 30)}...
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setCurrentQuestionIndex(idx);
                          setStage("recording");
                        }}
                        data-testid={`button-edit-response-${idx}`}
                      >
                        {recordedBlobs.has(idx) ? "Re-record" : "Record"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {!allAnswered && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Incomplete Responses</AlertTitle>
                  <AlertDescription>
                    You have {questions.length - answeredCount} unanswered question(s). 
                    You can still submit your interview with partial responses, or go back to record remaining answers.
                  </AlertDescription>
                </Alert>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading responses...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <div className="flex gap-4 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setStage("recording")}
                  disabled={isUploading}
                  data-testid="button-back-to-recording"
                >
                  Back to Recording
                </Button>
                <Button 
                  onClick={uploadResponses}
                  disabled={answeredCount === 0 || isUploading}
                  data-testid="button-submit-interview"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    allAnswered ? "Submit Interview" : `Submit ${answeredCount} Response${answeredCount !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
