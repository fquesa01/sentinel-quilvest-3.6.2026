import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bot, Send, MessageSquare, Sparkles, FileText, ExternalLink, Mic, MicOff, Navigation, Calendar, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { cn } from "@/lib/utils";
import { executeAvaCommand } from "@/lib/ava-command-router";

type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: {
    ragUsed?: boolean;
    mode?: "command" | "qa";
    intent?: string;
    actionLink?: {
      label: string;
      href: string;
    };
    citations?: Array<{
      chunkIndex?: number;
      retrievedContext?: {
        uri?: string;
        title?: string;
        text?: string;
      };
    }>;
  };
};

type ChatSession = {
  id: string;
  userId: string;
  title: string;
  contextType: string | null;
  contextId: string | null;
  contextData: any;
  isActive: boolean;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

type AvaInterpretResponse = {
  mode: "command" | "qa";
  intent?: string;
  parameters?: Record<string, any>;
  assistantMessage: string;
  actionLink?: {
    label: string;
    href: string;
  };
  requiresConfirmation?: boolean;
  followUpQuestion?: string;
};

export interface AvaChatContext {
  currentRoute?: string;
  currentCaseId?: string;
  currentCaseName?: string;
  currentTab?: string;
  currentView?: string;
  timezone?: string;
}

interface AvaChatProps {
  contextType?: string;
  contextId?: string;
  contextData?: any;
  context?: AvaChatContext;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: boolean;
}

export function AvaChat({ 
  contextType, 
  contextId, 
  contextData, 
  context,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  triggerButton = true 
}: AvaChatProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen;
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  const {
    isSupported: isVoiceSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        setMessageInput(text.trim());
        setTimeout(() => {
          handleSendMessage(text.trim());
        }, 100);
      }
    },
    onError: (error) => {
      toast({
        title: "Voice Input Error",
        description: error,
        variant: "destructive",
      });
    },
  });

  const extractDocIdFromUri = (uri: string): string | null => {
    const match = uri.match(/(comm|email|file|chat|doc)_(\w+)/);
    return match ? `${match[1]}_${match[2]}` : null;
  };

  const handleCitationClick = (uri: string) => {
    if (!contextId) return;
    const docId = extractDocIdFromUri(uri);
    if (docId) {
      navigate(`/document-review?caseId=${contextId}&id=${docId}`);
      setIsOpen(false);
    }
  };

  const { data: sessions } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat/sessions"],
    enabled: isOpen,
  });

  const { data: sessionData, isLoading: isLoadingMessages } = useQuery<{
    session: ChatSession;
    messages: ChatMessage[];
  }>({
    queryKey: ["/api/chat/sessions", currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) throw new Error("No session ID");
      const res = await fetch(`/api/chat/sessions/${currentSessionId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch session: ${res.statusText}`);
      return await res.json();
    },
    enabled: !!currentSessionId,
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/sessions", {
        title: "New Chat with Emma",
        contextType: contextType || null,
        contextId: contextId || null,
        contextData: contextData || null,
      });
      return await response.json();
    },
    onSuccess: (newSession: ChatSession) => {
      setCurrentSessionId(newSession.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create chat session",
        variant: "destructive",
      });
    },
  });

  const interpretMutation = useMutation({
    mutationFn: async (message: string): Promise<AvaInterpretResponse> => {
      const response = await apiRequest("POST", "/api/ava/interpret", {
        message,
        context: {
          currentRoute: location,
          currentCaseId: context?.currentCaseId || contextId,
          currentCaseName: context?.currentCaseName,
          currentTab: context?.currentTab,
          currentView: context?.currentView,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return await response.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, sessionId, metadata }: { 
      content: string; 
      sessionId: string;
      metadata?: Record<string, any>;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/chat/sessions/${sessionId}/messages`,
        { content, metadata }
      );
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Add assistant message to optimistic state for immediate display
      if (data.assistantMessage) {
        setOptimisticMessages(prev => {
          // Replace temp user messages with server versions and add assistant message
          const filtered = prev.filter(m => !m.id.startsWith('temp-'));
          return [...filtered, data.userMessage, data.assistantMessage];
        });
      }
      // Invalidate and refetch session data - the duplicate filtering in the render will handle removing optimistic messages once server data arrives
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions", variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
    },
    onError: (error: any) => {
      // Clear optimistic messages on error
      setOptimisticMessages([]);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const executeCommand = useCallback(async (intent: string, parameters: Record<string, any>): Promise<{ responseMessage?: string; actionLink?: { label: string; href: string } } | void> => {
    const result = await executeAvaCommand(
      intent,
      parameters,
      { 
        currentCaseId: context?.currentCaseId,
        timezone: context?.timezone,
      },
      {
        navigate,
        showToast: toast,
        closeDrawer: () => setTimeout(() => setIsOpen(false), 100),
      }
    );

    if (result.responseMessage || result.actionLink) {
      return {
        responseMessage: result.responseMessage,
        actionLink: result.actionLink,
      };
    }

    if (result.errorMessage) {
      toast({
        title: "Error",
        description: result.errorMessage,
        variant: "destructive",
      });
    }
  }, [navigate, setIsOpen, context, toast]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const serverMessages = sessionData?.messages || [];
  const serverMessageIds = new Set(serverMessages.map(m => m.id));
  const uniqueOptimisticMessages = optimisticMessages.filter(m => !serverMessageIds.has(m.id));
  const messages = [...serverMessages, ...uniqueOptimisticMessages];

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (isOpen && sessions && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [isOpen, sessions, currentSessionId]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  const handleSendMessage = async (overrideMessage?: string) => {
    const trimmedMessage = (overrideMessage || messageInput).trim();
    if (!trimmedMessage) return;

    setMessageInput("");
    setIsProcessingCommand(true);
    resetTranscript();

    const tempUserMessageId = `temp-user-${Date.now()}`;
    setOptimisticMessages(prev => [...prev, {
      id: tempUserMessageId,
      sessionId: currentSessionId || "pending",
      role: "user" as const,
      content: trimmedMessage,
      createdAt: new Date().toISOString(),
    }]);

    try {
      const interpretation = await interpretMutation.mutateAsync(trimmedMessage);

      // Execute command and capture any response message
      let commandResponse: { responseMessage?: string; actionLink?: { label: string; href: string } } | undefined;
      if (interpretation.mode === "command" && interpretation.intent) {
        commandResponse = (await executeCommand(interpretation.intent, interpretation.parameters || {})) || undefined;
      }

      const sessionId = currentSessionId || (await (async () => {
        const newSession = await createSessionMutation.mutateAsync();
        return newSession.id;
      })());

      // If the command returned a response message, use it; otherwise use the interpretation's message
      const preGeneratedResponse = commandResponse?.responseMessage || 
        (interpretation.mode === "command" ? interpretation.assistantMessage : undefined);
      
      // Use command response's actionLink if available, otherwise use interpretation's
      const finalActionLink = commandResponse?.actionLink || interpretation.actionLink;

      await sendMessageMutation.mutateAsync({
        content: trimmedMessage,
        sessionId,
        metadata: {
          mode: interpretation.mode,
          intent: interpretation.intent,
          actionLink: finalActionLink,
          preGeneratedResponse,
        },
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCommand(false);
    }
  };

  const handleNewChat = () => {
    setOptimisticMessages([]);
    createSessionMutation.mutate();
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const isProcessing = sendMessageMutation.isPending || isProcessingCommand || interpretMutation.isPending;
  const displayTranscript = isListening ? (interimTranscript || transcript) : "";

  const renderContent = () => (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-2 px-6 py-3 border-b">
        <Button
          size="sm"
          variant="outline"
          onClick={handleNewChat}
          disabled={createSessionMutation.isPending}
          data-testid="button-new-chat"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        {sessions && sessions.length > 1 && (
          <select
            className="text-sm border rounded px-2 py-1 flex-1 bg-background"
            value={currentSessionId || ""}
            onChange={(e) => {
              setOptimisticMessages([]);
              setCurrentSessionId(e.target.value);
            }}
            data-testid="select-chat-session"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        {isLoadingMessages ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-20 flex-1" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Welcome to Emma</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              I'm your AI compliance assistant. Ask me questions, or tell me what to do.
            </p>
            
            <div className="space-y-3 w-full max-w-sm text-left">
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  Try saying or typing:
                </p>
                <div className="space-y-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("Take me to the Safety PPE case")}
                    data-testid="button-suggested-nav-1"
                  >
                    "Take me to the Safety PPE case"
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("Show me my queue")}
                    data-testid="button-suggested-nav-2"
                  >
                    "Show me my queue"
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Schedule actions:
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                  onClick={() => setMessageInput("Schedule an interview with John Doe for tomorrow at 3pm")}
                  data-testid="button-suggested-action-1"
                >
                  "Schedule an interview with John Doe for tomorrow at 3pm"
                </Button>
              </div>

              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Ask compliance questions:
                </p>
                <div className="space-y-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("What are the key elements of an FCPA violation?")}
                    data-testid="button-suggested-question-1"
                  >
                    "What are the key elements of an FCPA violation?"
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                data-testid={`message-${message.role}`}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-3 max-w-[85%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.role === "assistant" && message.metadata?.mode === "command" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      <span>Command executed</span>
                    </div>
                  )}
                  
                  {message.role === "assistant" && message.metadata?.actionLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-auto p-0 text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => {
                        navigate(message.metadata!.actionLink!.href);
                        setIsOpen(false);
                      }}
                      data-testid="button-action-link"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {message.metadata.actionLink.label}
                    </Button>
                  )}
                  
                  {message.role === "assistant" && message.metadata?.citations && message.metadata.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-1" data-testid="section-ava-citations">
                      <p className="text-xs font-medium flex items-center gap-1" data-testid="text-citation-count">
                        <FileText className="h-3 w-3" />
                        Sources ({message.metadata.citations.length})
                      </p>
                      <div className="space-y-1">
                        {message.metadata.citations.slice(0, 3).map((citation, idx) => (
                          <div key={idx} className="text-xs bg-background/50 rounded p-2 space-y-1" data-testid={`card-ava-citation-${idx}`}>
                            <p className="font-medium truncate" data-testid={`text-citation-title-${idx}`}>
                              {citation.retrievedContext?.title || `Source ${idx + 1}`}
                            </p>
                            {citation.retrievedContext?.text && (
                              <p className="text-muted-foreground line-clamp-2" data-testid={`text-citation-excerpt-${idx}`}>
                                {citation.retrievedContext.text}
                              </p>
                            )}
                            {citation.retrievedContext?.uri && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => handleCitationClick(citation.retrievedContext!.uri!)}
                                data-testid={`button-ava-citation-view-${idx}`}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Document
                              </Button>
                            )}
                          </div>
                        ))}
                        {message.metadata.citations.length > 3 && (
                          <p className="text-xs text-muted-foreground italic" data-testid="text-more-citations">
                            +{message.metadata.citations.length - 3} more sources
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs opacity-70 mt-2">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground font-medium text-sm">
                    U
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="px-6 py-4 border-t">
        {isListening && displayTranscript && (
          <div className="mb-2 text-sm text-muted-foreground italic bg-muted/50 rounded px-3 py-2">
            {displayTranscript}...
          </div>
        )}
        
        {!isVoiceSupported && (
          <p className="text-xs text-muted-foreground mb-2 text-center">
            Voice input is not supported in this browser. You can still type commands.
          </p>
        )}
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={isListening ? displayTranscript : messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Ask Emma anything... or tell Emma what to do"
            disabled={isProcessing || isListening}
            className="flex-1"
            data-testid="input-chat-message"
          />
          
          {isVoiceSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              onClick={handleMicClick}
              disabled={isProcessing}
              className={cn(
                "relative",
                isListening && "animate-pulse"
              )}
              data-testid="button-voice-input"
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                </>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
          
          <Button
            type="submit"
            size="icon"
            disabled={(!messageInput.trim() && !isListening) || isProcessing}
            data-testid="button-send-message"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">K</kbd> to open Emma anytime
        </p>
      </div>
    </div>
  );

  if (!triggerButton) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col" role="dialog" aria-label="Emma AI Compliance Assistant">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-xl">Emma</SheetTitle>
                  <p className="text-sm text-muted-foreground">AI Compliance Assistant</p>
                </div>
              </div>
            </div>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="default"
          className="w-full justify-start gap-2 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
          data-testid="button-open-emma-chat"
          aria-label="Open Emma AI Compliance Assistant chat"
        >
          <Bot className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" /> to Navigate or Create</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col" role="dialog" aria-label="Emma AI Compliance Assistant">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl">Emma</SheetTitle>
                <p className="text-sm text-muted-foreground">AI Compliance Assistant</p>
              </div>
            </div>
          </div>
        </SheetHeader>
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
