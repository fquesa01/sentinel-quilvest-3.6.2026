import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2,
  Send,
  Brain,
  FileText,
  MessageSquare,
  Users,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Clock,
  Sparkles,
  X,
  RefreshCw,
  Mic,
  MicOff,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AskCaseRequest, AskCaseResponse, CaseEvidenceItem } from "@shared/schema";

interface CaseAIAssistantProps {
  caseId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToEvidence?: (evidence: CaseEvidenceItem) => void;
}

interface ConversationEntry {
  id: string;
  question: string;
  response: AskCaseResponse | null;
  isLoading: boolean;
  error: string | null;
  timestamp: Date;
}

const SOURCE_TYPE_CONFIG = {
  document: { icon: FileText, label: "Document", color: "text-blue-600 dark:text-blue-400" },
  interview: { icon: Users, label: "Interview", color: "text-purple-600 dark:text-purple-400" },
  chat: { icon: MessageSquare, label: "Chat Message", color: "text-green-600 dark:text-green-400" },
  finding: { icon: BookOpen, label: "Finding", color: "text-amber-600 dark:text-amber-400" },
  transcript: { icon: Clock, label: "Transcript", color: "text-cyan-600 dark:text-cyan-400" },
};

export function CaseAIAssistant({
  caseId,
  isOpen,
  onOpenChange,
  onNavigateToEvidence,
}: CaseAIAssistantProps) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setQuestion(transcript);
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error !== 'aborted') {
            toast({
              title: "Speech Recognition Error",
              description: "Could not recognize speech. Please try again.",
              variant: "destructive",
            });
          }
        };
        
        recognition.onend = () => {
          setIsRecording(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast]);
  
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setQuestion(""); // Clear previous text when starting new recording
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const askMutation = useMutation({
    mutationFn: async (request: AskCaseRequest): Promise<AskCaseResponse> => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/ask`, request);
      return await response.json() as AskCaseResponse;
    },
    onSuccess: (data, variables) => {
      setConversation((prev) =>
        prev.map((entry) =>
          entry.isLoading
            ? { ...entry, response: data, isLoading: false }
            : entry
        )
      );
    },
    onError: (error: Error, variables) => {
      // Sanitize error message - don't show raw HTML responses
      let errorMessage = error.message;
      if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html') || errorMessage.length > 200) {
        errorMessage = "AI service temporarily unavailable. Please try again in a moment.";
      }
      
      setConversation((prev) =>
        prev.map((entry) =>
          entry.isLoading
            ? { ...entry, error: errorMessage, isLoading: false }
            : entry
        )
      );
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || askMutation.isPending) return;

    const entryId = crypto.randomUUID();
    const newEntry: ConversationEntry = {
      id: entryId,
      question: question.trim(),
      response: null,
      isLoading: true,
      error: null,
      timestamp: new Date(),
    };

    setConversation((prev) => [...prev, newEntry]);
    setQuestion("");

    askMutation.mutate({
      question: newEntry.question,
    });
  };

  const toggleEvidenceExpanded = (id: string) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getSourceConfig = (sourceType: string) => {
    return SOURCE_TYPE_CONFIG[sourceType as keyof typeof SOURCE_TYPE_CONFIG] || {
      icon: FileText,
      label: sourceType,
      color: "text-muted-foreground",
    };
  };

  const handleEvidenceClick = (evidence: CaseEvidenceItem) => {
    if (onNavigateToEvidence) {
      onNavigateToEvidence(evidence);
    }
  };

  const formatTimestamp = (timestamp: string | undefined): string | null => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return null;
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return null;
    }
  };

  const renderEvidenceItem = (evidence: CaseEvidenceItem, index: number) => {
    if (!evidence || !evidence.sourceId) return null;
    
    const config = getSourceConfig(evidence.sourceType || "document");
    const Icon = config.icon;
    const isExpanded = expandedEvidence[evidence.sourceId] ?? false;
    const relevancePercent = Math.round(evidence.relevanceScore ?? 0);
    const formattedTimestamp = formatTimestamp(evidence.timestamp);

    return (
      <Collapsible
        key={evidence.sourceId}
        open={isExpanded}
        onOpenChange={() => toggleEvidenceExpanded(evidence.sourceId)}
      >
        <div
          className={cn(
            "border rounded-md p-2 transition-colors",
            "hover-elevate cursor-pointer"
          )}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-start gap-2 w-full">
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Relevance: {relevancePercent}%
                  </span>
                </div>
                <p className="text-xs mt-1 line-clamp-2">{evidence.excerpt || "No excerpt available"}</p>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-2 pt-2 border-t">
            <p className="text-xs whitespace-pre-wrap mb-2">{evidence.excerpt || "No excerpt available"}</p>
            {formattedTimestamp && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                {formattedTimestamp}
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs gap-1"
              onClick={() => handleEvidenceClick(evidence)}
              data-testid={`button-view-evidence-${evidence.sourceId}`}
            >
              <ExternalLink className="h-3 w-3" />
              View Source
            </Button>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const renderConversationEntry = (entry: ConversationEntry) => {
    return (
      <div key={entry.id} className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">You</p>
            <p className="text-sm mt-1">{entry.question}</p>
            <span className="text-[10px] text-muted-foreground">
              {format(entry.timestamp, "h:mm a")}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              AI Assistant
              <Sparkles className="h-3 w-3 text-primary" />
            </p>

            {entry.isLoading && (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {entry.error && (
              <div className="mt-2 p-3 rounded-md bg-destructive/10 text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Failed to get response</p>
                    <p className="text-xs mt-1">{entry.error}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs gap-1"
                  onClick={() => {
                    setQuestion(entry.question);
                    setConversation(prev => prev.filter(e => e.id !== entry.id));
                  }}
                  data-testid={`button-retry-${entry.id}`}
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry Question
                </Button>
              </div>
            )}

            {entry.response && (
              <div className="mt-2 space-y-3">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-sm whitespace-pre-wrap">{entry.response.answer || "No answer provided"}</p>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>Confidence: {entry.response.confidence ?? 0}%</span>
                  <span className="text-muted-foreground/50">|</span>
                  <span>
                    Searched {entry.response.searchedSources?.documents ?? 0} docs, 
                    {entry.response.searchedSources?.interviews ?? 0} interviews
                  </span>
                </div>

                {entry.response.evidenceItems && entry.response.evidenceItems.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-xs font-medium text-muted-foreground">
                      Supporting Evidence ({entry.response.evidenceItems.length})
                    </p>
                    <div className="space-y-2">
                      {entry.response.evidenceItems.map((evidence, index) =>
                        renderEvidenceItem(evidence, index)
                      )}
                    </div>
                  </div>
                )}

                {(!entry.response.evidenceItems || entry.response.evidenceItems.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    No specific evidence was found to support this response.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">Ask About Case</SheetTitle>
                <SheetDescription className="text-xs">
                  AI-powered investigation assistant
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {conversation.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Ask About This Case</h3>
              <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
                Ask questions about the evidence, interviews, communications, and findings in this case.
                The AI will search all case materials and provide answers with cited sources.
              </p>
              <div className="space-y-2 w-full max-w-[280px]">
                <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
                <div className="space-y-1.5">
                  {[
                    "What are the key facts of this case?",
                    "Who are the main people involved?",
                    "What contradictions exist in the testimony?",
                    "What evidence supports the allegations?",
                  ].map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs h-auto py-2 px-3 text-left"
                      onClick={() => setQuestion(suggestion)}
                      data-testid={`button-suggestion-${i}`}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-6">
                {conversation.map(renderConversationEntry)}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="p-3 border-t flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this case..."
              className="flex-1"
              disabled={askMutation.isPending || isRecording}
              data-testid="input-ask-case-question"
            />
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              onClick={toggleRecording}
              disabled={askMutation.isPending}
              data-testid="button-voice-input"
              className={cn(isRecording && "animate-pulse")}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={!question.trim() || askMutation.isPending}
              data-testid="button-submit-question"
            >
              {askMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            AI responses are generated from case materials and may require verification
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
