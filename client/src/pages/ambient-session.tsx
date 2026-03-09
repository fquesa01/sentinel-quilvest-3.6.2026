import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  Square, 
  Clock, 
  FileText, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Volume2,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  MessageSquare,
  ArrowLeft,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Maximize2,
  MoreVertical,
  FolderOpen,
  Link,
  Unlink
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AISuggestionsPanel, InsightSuggestion } from "@/components/ambient/AISuggestionsPanel";
import { FocusIssuesPanel } from "@/components/ambient/FocusIssuesPanel";

import { SuggestionData } from "@/components/ambient/SuggestionCard";

type Deal = {
  id: string;
  title: string;
  dealNumber: string | null;
  status: string;
};

type AmbientSession = {
  id: string;
  sessionName: string;
  sessionType: string;
  status: string;
  caseId: string | null;
  dealId: string | null;
  useDataLake: boolean | null;
  notes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  participantNames: string[] | null;
  createdAt: string;
};

type Transcript = {
  id: string;
  sessionId: string;
  timestampMs: number;
  speakerLabel: string | null;
  speakerId: number | null;
  content: string;
  confidence: number | null;
  isFinal: boolean;
  createdAt: string;
};

type Suggestion = {
  id: string;
  sessionId: string;
  suggestionType: string;
  triggerQuote: string | null;
  explanation: string | null;
  userPrompt: string | null;
  searchQuery: string | null;
  documentIds: string[] | null;
  confidence: string;
  status: string;
  userAction: string | null;
  timestampMs: number | null;
  createdAt: string;
};

type SuggestionDocument = {
  id: string;
  subject: string | null;
  sender: string | null;
  recipients: string | null;
  messageType: string | null;
  riskLevel: string | null;
  body: string | null;
  sentAt: string | null;
  caseId: string | null;
};

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

export default function AmbientSession() {
  const [match, params] = useRoute("/ambient-intelligence/:sessionId");
  const sessionId = params?.sessionId;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [suggestionDocs, setSuggestionDocs] = useState<Record<string, SuggestionDocument[]>>({});
  const [bulletSummaries, setBulletSummaries] = useState<Record<string, Array<{ text: string; category?: string }>>>({});
  const [failedSuggestionIds, setFailedSuggestionIds] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [booleanResults, setBooleanResults] = useState<BooleanSearchResult[]>([]);
  const [previousQueries, setPreviousQueries] = useState<Set<string>>(new Set());
  const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(false);
  const [dismissedDocIds, setDismissedDocIds] = useState<Set<string>>(new Set());
  const [showLinkDealDialog, setShowLinkDealDialog] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [linkUseDataLake, setLinkUseDataLake] = useState(false);
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
  
  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const { data: session, isLoading: sessionLoading } = useQuery<AmbientSession>({
    queryKey: ["/api/ambient-sessions", sessionId],
    enabled: !!sessionId,
  });
  
  const { data: transcripts = [], refetch: refetchTranscripts } = useQuery<Transcript[]>({
    queryKey: ["/api/ambient-sessions", sessionId, "transcripts"],
    enabled: !!sessionId,
  });
  
  const { data: suggestions = [], refetch: refetchSuggestions } = useQuery<Suggestion[]>({
    queryKey: ["/api/ambient-sessions", sessionId, "suggestions"],
    enabled: !!sessionId,
  });
  
  // Fetch available deals for linking
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Fetch focus issues for this session
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
    queryKey: ["/api/focus-issues", { sessionId }],
    queryFn: async () => {
      const res = await fetch(`/api/focus-issues?sessionId=${sessionId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!sessionId,
  });
  
  // Fetch focus issue results when in focused mode
  const focusSearchMutation = useMutation({
    mutationFn: async () => {
      if (!session?.dealId) return { results: [] };
      
      // Get recent transcript text for context
      const transcriptText = transcripts
        .slice(-10)
        .map(t => t.content)
        .join(" ");
      
      const response = await apiRequest("POST", "/api/focus-issues/search-all", {
        sessionId,
        dealId: session.dealId,
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
    if (focusMode === "focused" && session?.dealId && activeIssueCount > 0) {
      setIsFocusSearching(true);
      focusSearchMutation.mutate();
    }
  }, [focusMode, session?.dealId, activeIssueCount]);
  
  // Link session to deal mutation
  const linkDealMutation = useMutation({
    mutationFn: async (data: { dealId: string | null; useDataLake: boolean }) => {
      const response = await apiRequest("PATCH", `/api/ambient-sessions/${sessionId}`, { dealId: data.dealId, useDataLake: data.useDataLake });
      if (!response.ok) {
        throw new Error("Failed to link session");
      }
      return response.json();
    },
    onSuccess: (_, data) => {
      queryClient.refetchQueries({ queryKey: ["/api/ambient-sessions", sessionId] });
      toast({
        title: data.dealId ? "Session Linked" : "Session Updated",
        description: data.dealId 
          ? "This session is now linked to the selected transaction."
          : "Session document sources updated.",
      });
      setShowLinkDealDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link session",
        variant: "destructive",
      });
    },
  });
  
  const addTranscriptMutation = useMutation({
    mutationFn: async (data: {
      timestampMs: number;
      content: string;
      speakerLabel?: string;
      confidence?: number;
      isFinal: boolean;
    }) => {
      const response = await apiRequest("POST", `/api/ambient-sessions/${sessionId}/transcripts`, data);
      return response.json();
    },
    onSuccess: () => {
      refetchTranscripts();
    },
  });
  
  const updateSessionMutation = useMutation({
    mutationFn: async (data: { status: string; endedAt?: string; durationSeconds?: number }) => {
      const response = await apiRequest("PATCH", `/api/ambient-sessions/${sessionId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ambient-sessions", sessionId] });
    },
  });
  
  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ suggestionId, status, userAction }: { suggestionId: string; status: string; userAction: string }) => {
      const response = await apiRequest("PATCH", `/api/ambient-sessions/${sessionId}/suggestions/${suggestionId}`, { status, userAction });
      return response.json();
    },
    onSuccess: () => {
      refetchSuggestions();
    },
  });
  
  const triggerAnalysisMutation = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      const response = await apiRequest("POST", `/api/ambient-sessions/${sessionId}/analyze`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setIsAnalyzing(false);
      lastAnalyzedCountRef.current = transcriptsRef.current.length;
      if (data.suggestionsGenerated > 0) {
        refetchSuggestions();
        // Don't show toast - suggestions appear directly in the panel
      }
    },
    onError: () => {
      setIsAnalyzing(false);
    },
  });
  
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/ambient-sessions/${sessionId}/generate-summary`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Summary Generated",
        description: "Emma has analyzed the session and created a summary.",
      });
    },
  });
  
  const booleanSearchMutation = useMutation({
    mutationFn: async (transcriptText: string) => {
      const response = await apiRequest("POST", `/api/ambient-sessions/${sessionId}/boolean-search`, {
        dealId: session?.dealId,
        transcriptText,
      });
      return response.json();
    },
    onSuccess: async (data: { queries: any[]; results: BooleanSearchResult[] }) => {
      if (data.results && data.results.length > 0) {
        const newResults = data.results.filter(r => !previousQueries.has(r.query));
        if (newResults.length > 0) {
          setBooleanResults(prev => [...newResults, ...prev].slice(0, 10));
          setPreviousQueries(prev => new Set(Array.from(prev).concat(newResults.map(r => r.query))));
          
          // Fetch bullet summaries for new documents
          const docIds = newResults.flatMap(r => r.documents.map(d => d.id));
          if (docIds.length > 0) {
            try {
              const bulletResponse = await apiRequest("POST", "/api/bullet-summaries/batch", {
                documentIds: docIds,
              });
              if (bulletResponse.ok) {
                const bulletData = await bulletResponse.json();
                if (bulletData.summaries) {
                  setBulletSummaries((prev) => ({ ...prev, ...Object.fromEntries(
                    Object.entries(bulletData.summaries).map(([id, data]: [string, any]) => [id, data.bullets])
                  )}));
                }
              }
            } catch (bulletError) {
              console.error("Error fetching bullet summaries for boolean results:", bulletError);
            }
          }
        }
      }
    },
  });
  
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptsRef = useRef(transcripts);
  const hasTriggeredInitialAnalysis = useRef(false);
  const lastAnalyzedCountRef = useRef(0);
  
  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);
  

  // Fetch document details and bullet summaries for suggestions with documentIds
  useEffect(() => {
    // Wait for session to load with dealId before fetching documents
    if (!session?.dealId && !session?.useDataLake) return;
    
    const fetchDocs = async () => {
      const suggestionsWithDocs = suggestions.filter(
        (s) => s.documentIds && s.documentIds.length > 0 && !suggestionDocs[s.id] && !failedSuggestionIds.has(s.id)
      );
      
      for (const suggestion of suggestionsWithDocs) {
        try {
          const response = await apiRequest("POST", "/api/communications/batch", {
            ids: suggestion.documentIds,
            dealId: session.dealId,
          });
          if (response.ok) {
            const docs = await response.json();
            setSuggestionDocs((prev) => ({ ...prev, [suggestion.id]: docs }));
            
            // Fetch bullet summaries for these documents
            const docIds = docs.map((d: SuggestionDocument) => d.id);
            if (docIds.length > 0) {
              try {
                const bulletResponse = await apiRequest("POST", "/api/bullet-summaries/batch", {
                  documentIds: docIds,
                });
                if (bulletResponse.ok) {
                  const bulletData = await bulletResponse.json();
                  if (bulletData.summaries) {
                    setBulletSummaries((prev) => ({ ...prev, ...Object.fromEntries(
                      Object.entries(bulletData.summaries).map(([id, data]: [string, any]) => [id, data.bullets])
                    )}));
                  }
                }
              } catch (bulletError) {
                console.error("Error fetching bullet summaries:", bulletError);
              }
            }
          } else {
            // Mark as failed to prevent infinite retries
            setFailedSuggestionIds((prev) => new Set(Array.from(prev).concat(suggestion.id)));
          }
        } catch (error) {
          console.error("Error fetching suggestion docs:", error);
          setFailedSuggestionIds((prev) => new Set(Array.from(prev).concat(suggestion.id)));
        }
      }
    };
    
    if (suggestions.length > 0) {
      fetchDocs();
    }
  }, [suggestions, session?.dealId, session?.useDataLake]);
  // Track if this is a fresh recording start vs a resume
  const isFirstStartRef = useRef(true);
  
  useEffect(() => {
    if (isRecording && !isPaused) {
      // Only reset refs on first start of recording (not on resume)
      if (isFirstStartRef.current) {
        hasTriggeredInitialAnalysis.current = false;
        lastAnalyzedCountRef.current = 0;
        isFirstStartRef.current = false;
      }
      
      // Run analysis every 20 seconds when there's new content
      analysisIntervalRef.current = setInterval(() => {
        const currentCount = transcriptsRef.current.length;
        const hasNewContent = currentCount > lastAnalyzedCountRef.current;
        if (hasNewContent && currentCount >= 2) {
          // Trigger traditional keyword search
          if (!triggerAnalysisMutation.isPending) {
            triggerAnalysisMutation.mutate();
          }
          // Also trigger Claude-powered boolean search
          if (!booleanSearchMutation.isPending && session?.dealId) {
            const recentText = transcriptsRef.current
              .slice(-5)
              .map(t => t.content)
              .join(" ");
            if (recentText.length >= 50) {
              booleanSearchMutation.mutate(recentText);
            }
          }
        }
      }, 20000); // 20 second interval for faster feedback
    } else {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    }
    
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);
  
  // Trigger initial analysis after 3 transcript segments (lowered from 5)
  useEffect(() => {
    if (isRecording && !isPaused && transcripts.length >= 3 && !hasTriggeredInitialAnalysis.current) {
      hasTriggeredInitialAnalysis.current = true;
      triggerAnalysisMutation.mutate();
    }
  }, [isRecording, isPaused, transcripts.length]);
  
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const scrollToBottom = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [transcripts, interimTranscript, scrollToBottom]);
  
  const initSpeechRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        title: "Browser Not Supported",
        description: "Please use Chrome or Edge for speech recognition.",
        variant: "destructive",
      });
      return null;
    }
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            const timestampMs = Date.now() - startTimeRef.current;
            addTranscriptMutation.mutate({
              timestampMs,
              content: transcript,
              confidence: result[0].confidence,
              isFinal: true,
            });
          }
          setInterimTranscript("");
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) {
        setInterimTranscript(interim);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access in your browser settings.",
          variant: "destructive",
        });
        setIsRecording(false);
      } else if (event.error !== "aborted") {
        setTimeout(() => {
          if (isRecording && !isPaused && recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 1000);
      }
    };
    
    recognition.onend = () => {
      if (isRecording && !isPaused) {
        setTimeout(() => {
          if (recognitionRef.current && isRecording && !isPaused) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
            }
          }
        }, 100);
      }
    };
    
    return recognition;
  }, [isRecording, isPaused, addTranscriptMutation, toast]);
  
  const startRecording = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to start recording.",
        variant: "destructive",
      });
      return;
    }
    
    const recognition = initSpeechRecognition();
    if (!recognition) return;
    
    recognitionRef.current = recognition;
    startTimeRef.current = Date.now();
    
    try {
      recognition.start();
      setIsRecording(true);
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Listening for speech...",
      });
    } catch (err) {
      console.error("Failed to start recognition:", err);
      toast({
        title: "Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive",
      });
    }
  }, [initSpeechRecognition, toast]);
  
  const pauseRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsPaused(true);
    setInterimTranscript("");
    
    updateSessionMutation.mutate({ status: "paused" });
    
    toast({
      title: "Recording Paused",
      description: "Click resume to continue.",
    });
  }, [updateSessionMutation, toast]);
  
  const resumeRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current = initSpeechRecognition();
        recognitionRef.current?.start();
      }
    }
    
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    
    setIsPaused(false);
    updateSessionMutation.mutate({ status: "active" });
    
    toast({
      title: "Recording Resumed",
      description: "Listening for speech...",
    });
  }, [initSpeechRecognition, updateSessionMutation, toast]);
  
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setInterimTranscript("");
    
    // Reset for potential future recording in same session
    isFirstStartRef.current = true;
    
    updateSessionMutation.mutate({
      status: "completed",
      endedAt: new Date().toISOString(),
      durationSeconds: elapsedTime,
    });
    
    if (transcripts.length > 0) {
      generateSummaryMutation.mutate();
    }
    
    toast({
      title: "Session Completed",
      description: "Your session has been saved. Emma is generating a summary...",
    });
    
    setShowEndDialog(false);
  }, [elapsedTime, updateSessionMutation, generateSummaryMutation, transcripts.length, toast]);
  
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const handleDismissSuggestion = (suggestionId: string) => {
    updateSuggestionMutation.mutate({
      suggestionId,
      status: "dismissed",
      userAction: "dismissed",
    });
  };
  
  const handleViewSuggestion = (suggestionId: string) => {
    updateSuggestionMutation.mutate({
      suggestionId,
      status: "viewed",
      userAction: "viewed",
    });
  };
  
  const handleDismissDocument = (docId: string) => {
    setDismissedDocIds(prev => new Set(Array.from(prev).concat(docId)));
  };
  
  const handleViewDocument = (docId: string) => {
    if (session?.dealId) {
      window.open(`/transactions/deals/${session.dealId}`, "_blank");
    }
  };
  
  const pendingSuggestions = suggestions.filter(s => s.status === "pending");
  
  // Transform booleanResults into glanceable SuggestionData format
  const transformedSuggestions = booleanResults.map((result, idx) => ({
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
        bullets: bulletSummaries[doc.id] || undefined,
      })),
    status: 'found' as const,
  }));
  
  // Also transform traditional suggestions with their loaded docs
  const transformedTraditionalSuggestions = suggestions
    .filter(s => s.status !== "dismissed" && suggestionDocs[s.id]?.length > 0)
    .map(s => ({
      id: s.id,
      topic: s.suggestionType,
      triggerQuote: s.triggerQuote || s.userPrompt || "",
      confidence: (s.confidence || 'medium') as 'high' | 'medium' | 'low',
      results: (suggestionDocs[s.id] || [])
        .filter(doc => !dismissedDocIds.has(doc.id))
        .map(doc => ({
          id: doc.id,
          title: doc.subject || "(No subject)",
          type: 'email' as const,
          sender: doc.sender || undefined,
          date: doc.sentAt || "",
          preview: doc.body?.substring(0, 150) || "",
          riskLevel: doc.riskLevel || undefined,
          bullets: bulletSummaries[doc.id] || undefined,
          viewUrl: `/communications/${doc.id}`,
        })),
      status: 'found' as const,
    }));
  
  // Transform insight suggestions (summary, key_point, action_item) - no documents
  const insightTypes = ["summary", "key_point", "action_item"];
  const insightSuggestions: InsightSuggestion[] = suggestions
    .filter(s => s.status !== "dismissed" && insightTypes.includes(s.suggestionType))
    .map(s => ({
      id: s.id,
      topic: s.suggestionType === "summary" ? "Meeting Summary" : 
             s.suggestionType === "key_point" ? "Key Point" : 
             s.suggestionType === "action_item" ? "Action Item" : s.suggestionType,
      triggerQuote: s.triggerQuote || s.userPrompt || "",
      explanation: s.explanation || "",
      confidence: (s.confidence || 'medium') as 'high' | 'medium' | 'low',
      suggestionType: s.suggestionType,
    }));
  
  const allGlanceableSuggestions = [...transformedSuggestions, ...transformedTraditionalSuggestions]
    .filter(s => s.results.length > 0);
  
  if (!sessionId || !match) {
    return null;
  }
  
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="container max-w-4xl py-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The session you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => navigate("/ambient-intelligence")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{session.sessionName} | Ambient Intelligence</title>
      </Helmet>
      
      <div className="h-full flex flex-col">
        <div className="border-b bg-card/50 px-4 py-3 stagger-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/ambient-intelligence")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold" data-testid="text-session-name">
                  {session.sessionName}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="capitalize">
                    {session.sessionType?.replace("_", " ")}
                  </Badge>
                  {session.participantNames && session.participantNames.length > 0 && (
                    <span>{session.participantNames.join(", ")}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-lg" data-testid="text-elapsed-time">
                  {formatTime(elapsedTime)}
                </span>
              </div>
              
              {!isRecording && session.status !== "completed" && (
                <Button onClick={startRecording} data-testid="button-start-recording">
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
              )}
              
              {isRecording && !isPaused && (
                <div className="flex items-center gap-2">
                  <div className="recording-dot" />
                  <span className="text-sm text-red-500 font-medium">Recording</span>
                  <Button variant="outline" onClick={pauseRecording} data-testid="button-pause">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button variant="destructive" onClick={() => setShowEndDialog(true)} data-testid="button-stop">
                    <Square className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                </div>
              )}
              
              {isRecording && isPaused && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Paused</Badge>
                  <Button variant="outline" onClick={resumeRecording} data-testid="button-resume">
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                  <Button variant="destructive" onClick={() => setShowEndDialog(true)} data-testid="button-stop-paused">
                    <Square className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                </div>
              )}
              
              {session.status === "completed" && (
                <>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                  
                  {/* Actions dropdown for completed sessions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-session-actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedDealId(session.dealId);
                          setLinkUseDataLake(session.useDataLake || false);
                          setShowLinkDealDialog(true);
                        }}
                        data-testid="menu-item-link-deal"
                      >
                        {session.dealId ? (
                          <>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Change Linked Transaction
                          </>
                        ) : (
                          <>
                            <Link className="h-4 w-4 mr-2" />
                            Link to Transaction
                          </>
                        )}
                      </DropdownMenuItem>
                      {session.dealId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => linkDealMutation.mutate({ dealId: null, useDataLake: session.useDataLake || false })}
                            className="text-destructive"
                            data-testid="menu-item-unlink-deal"
                          >
                            <Unlink className="h-4 w-4 mr-2" />
                            Unlink from Transaction
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
        
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Collapsible Transcript Panel */}
          {!isTranscriptCollapsed && (
            <>
              <ResizablePanel defaultSize={60} minSize={30} maxSize={75}>
                <div className="h-full flex flex-col border-r">
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-primary" />
                      <h2 className="font-semibold">Live Transcript</h2>
                      <Badge variant="secondary" className="ml-auto">
                        {transcripts.length} segments
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsTranscriptCollapsed(true)}
                        title="Collapse transcript to focus on AI Suggestions"
                        data-testid="button-collapse-transcript"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                      {transcripts.length === 0 && !interimTranscript && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Mic className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No transcript yet.</p>
                          <p className="text-sm">Start recording to begin transcription.</p>
                        </div>
                      )}
                      
                      {/* Compact flowing transcript grouped by speaker */}
                      {(() => {
                        // Group consecutive segments by speaker (or by time gaps > 5 seconds)
                        const speakerColors = [
                          "text-blue-600 dark:text-blue-400",
                          "text-green-600 dark:text-green-400", 
                          "text-purple-600 dark:text-purple-400",
                          "text-orange-600 dark:text-orange-400",
                          "text-pink-600 dark:text-pink-400",
                          "text-cyan-600 dark:text-cyan-400",
                        ];
                        const getSpeakerColor = (speakerId: number | null) => {
                          if (speakerId === null) return "text-foreground";
                          return speakerColors[speakerId % speakerColors.length];
                        };
                        const getSpeakerLabel = (speakerId: number | null, speakerLabel: string | null) => {
                          if (speakerLabel) return speakerLabel;
                          if (speakerId !== null) return `Speaker ${speakerId + 1}`;
                          return null;
                        };
                        
                        type GroupedSegment = {
                          id: string;
                          speakerId: number | null;
                          speakerLabel: string | null;
                          startTime: number;
                          segments: Transcript[];
                        };
                        
                        const groups: GroupedSegment[] = [];
                        let currentGroup: GroupedSegment | null = null;
                        
                        transcripts.forEach((t, idx) => {
                          const prevT = idx > 0 ? transcripts[idx - 1] : null;
                          const timeDiff = prevT ? (t.timestampMs - prevT.timestampMs) : 0;
                          const speakerChanged = prevT && t.speakerId !== prevT.speakerId;
                          const longPause = timeDiff > 5000; // 5 second gap starts new group
                          
                          if (!currentGroup || speakerChanged || longPause) {
                            currentGroup = {
                              id: t.id,
                              speakerId: t.speakerId,
                              speakerLabel: t.speakerLabel,
                              startTime: t.timestampMs,
                              segments: [t],
                            };
                            groups.push(currentGroup);
                          } else {
                            currentGroup.segments.push(t);
                          }
                        });
                        
                        return groups.map((group) => {
                          const speakerLabel = getSpeakerLabel(group.speakerId, group.speakerLabel);
                          const speakerColor = getSpeakerColor(group.speakerId);
                          const combinedText = group.segments.map(s => s.content).join(" ");
                          
                          return (
                            <div
                              key={group.id}
                              className="py-1"
                              data-testid={`transcript-group-${group.id}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-muted-foreground font-mono shrink-0 pt-0.5 w-10">
                                  {formatTime(Math.floor(group.startTime / 1000))}
                                </span>
                                <div className="flex-1 min-w-0">
                                  {speakerLabel && (
                                    <span className={`text-xs font-semibold ${speakerColor} mr-1.5`}>
                                      {speakerLabel}:
                                    </span>
                                  )}
                                  <span className="text-sm leading-relaxed">
                                    {combinedText}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      
                      {interimTranscript && (
                        <div className="py-1 flex items-start gap-2">
                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5 w-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          </div>
                          <span className="text-sm text-muted-foreground italic">{interimTranscript}</span>
                        </div>
                      )}
                      
                      <div ref={transcriptEndRef} />
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
            </>
          )}
          
          {/* AI Suggestions Panel - Expands to full width when transcript is collapsed */}
          <ResizablePanel 
            defaultSize={isTranscriptCollapsed ? 100 : 40} 
            minSize={isTranscriptCollapsed ? 100 : 25}
          >
            <div className="h-full flex flex-col">
              {/* Custom header with expand button when transcript is collapsed */}
              {isTranscriptCollapsed && (
                <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsTranscriptCollapsed(false)}
                    title="Show transcript panel"
                    data-testid="button-expand-transcript"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                  <Badge variant="outline" className="text-xs">
                    <Maximize2 className="h-3 w-3 mr-1" />
                    Full Screen
                  </Badge>
                </div>
              )}
              
              {/* Focus Issues Toggle and Panel */}
              <FocusIssuesPanel
                sessionId={sessionId}
                dealId={session?.dealId || undefined}
                focusMode={focusMode}
                onFocusModeChange={setFocusMode}
              />
              
              {/* Use the new AISuggestionsPanel component */}
              <AISuggestionsPanel
                suggestions={allGlanceableSuggestions as SuggestionData[]}
                insightSuggestions={insightSuggestions}
                dealId={session?.dealId || undefined}
                isAnalyzing={isAnalyzing || isFocusSearching}
                isRecording={isRecording}
                isPaused={isPaused}
                focusMode={focusMode}
                focusResults={focusResults}
                onViewDocument={handleViewDocument}
                onDismissSuggestion={handleDismissSuggestion}
                onDismissDocument={(suggestionId, docId) => handleDismissDocument(docId)}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the recording and save the session. You can review the transcript and suggestions afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Recording</AlertDialogCancel>
            <AlertDialogAction onClick={stopRecording}>
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Link to Transaction Dialog */}
      <Dialog open={showLinkDealDialog} onOpenChange={setShowLinkDealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <FolderOpen className="h-5 w-5 inline-block mr-2" />
              Link Session to Transaction
            </DialogTitle>
            <DialogDescription>
              Select a transaction to link this session to. Documents from the transaction's data room will be available for AI suggestions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Transaction</Label>
              <Select
                value={selectedDealId || "none"}
                onValueChange={(value) => setSelectedDealId(value === "none" ? null : value)}
              >
                <SelectTrigger data-testid="select-deal">
                  <SelectValue placeholder="Select a transaction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No transaction linked</SelectItem>
                  {deals.map((d: Deal) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.dealNumber ? `${d.dealNumber} - ` : ""}{d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {session?.dealId && (
              <p className="text-sm text-muted-foreground">
                Currently linked to: <strong>{deals.find((d: Deal) => d.id === session.dealId)?.title || "Unknown"}</strong>
              </p>
            )}
            
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="link-data-lake"
                checked={linkUseDataLake}
                onCheckedChange={(checked) => setLinkUseDataLake(checked === true)}
                data-testid="checkbox-link-data-lake"
              />
              <Label htmlFor="link-data-lake" className="cursor-pointer text-sm">
                Connect to My Data Lake
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Include your personal uploaded documents for AI suggestions
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowLinkDealDialog(false)}
              data-testid="button-cancel-link"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => linkDealMutation.mutate({ dealId: selectedDealId, useDataLake: linkUseDataLake })}
              disabled={linkDealMutation.isPending}
              data-testid="button-confirm-link"
            >
              {linkDealMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  {selectedDealId ? "Link to Transaction" : "Save"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
