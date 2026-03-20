import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bot, Send, MessageSquare, Sparkles, FileText, ExternalLink, Mic, MicOff, Navigation, Calendar, Loader2, Database, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { cn } from "@/lib/utils";
import { executeAvaCommand } from "@/lib/ava-command-router";

type ToolCallResult = {
  toolName: string;
  toolCategory: "read" | "write";
  params: Record<string, any>;
  result: any;
};

type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: {
    ragUsed?: boolean;
    mode?: "command" | "qa" | "tool_response";
    intent?: string;
    actionLink?: {
      label: string;
      href: string;
    };
    toolCalls?: ToolCallResult[];
    structuredData?: Record<string, any>;
    requiresConfirmation?: boolean;
    pendingActionId?: string;
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
  mode: "command" | "qa" | "tool_response";
  intent?: string;
  parameters?: Record<string, any>;
  assistantMessage: string;
  actionLink?: {
    label: string;
    href: string;
  };
  requiresConfirmation?: boolean;
  pendingActionId?: string;
  followUpQuestion?: string;
  toolCalls?: ToolCallResult[];
  structuredData?: Record<string, any>;
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
  const [actionStates, setActionStates] = useState<Record<string, "confirmed" | "cancelled" | "processing">>({});
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
      const recentMessages = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

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
        conversationHistory: recentMessages,
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

      let commandResponse: { responseMessage?: string; actionLink?: { label: string; href: string } } | undefined;
      if (interpretation.mode === "command" && interpretation.intent) {
        commandResponse = (await executeCommand(interpretation.intent, interpretation.parameters || {})) || undefined;
      }

      const sessionId = currentSessionId || (await (async () => {
        const newSession = await createSessionMutation.mutateAsync();
        return newSession.id;
      })());

      const preGeneratedResponse = commandResponse?.responseMessage || 
        (interpretation.mode === "command" ? interpretation.assistantMessage : undefined) ||
        (interpretation.mode === "tool_response" ? interpretation.assistantMessage : undefined);
      
      const finalActionLink = commandResponse?.actionLink || interpretation.actionLink;

      await sendMessageMutation.mutateAsync({
        content: trimmedMessage,
        sessionId,
        metadata: {
          mode: interpretation.mode,
          intent: interpretation.intent,
          actionLink: finalActionLink,
          preGeneratedResponse,
          toolCalls: interpretation.toolCalls,
          structuredData: interpretation.structuredData,
          requiresConfirmation: interpretation.requiresConfirmation,
          pendingActionId: interpretation.pendingActionId,
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

  const handleConfirmAction = async (actionId: string) => {
    setActionStates(prev => ({ ...prev, [actionId]: "processing" }));
    try {
      const response = await apiRequest("POST", "/api/ava/confirm-action", { actionId, sessionId: currentSessionId });
      const result = await response.json();
      if (result.success) {
        setActionStates(prev => ({ ...prev, [actionId]: "confirmed" }));
        const confirmMsg: ChatMessage = {
          id: `confirm-${Date.now()}`,
          sessionId: currentSessionId || "pending",
          role: "assistant" as const,
          content: result.message || "Action completed successfully.",
          createdAt: new Date().toISOString(),
          metadata: result.link ? { actionLink: { label: "View", href: result.link } } : undefined,
        };
        setOptimisticMessages(prev => [...prev, confirmMsg]);
      } else {
        setActionStates(prev => { const s = { ...prev }; delete s[actionId]; return s; });
        toast({ title: "Action failed", description: result.error || "Could not execute action.", variant: "destructive" });
      }
    } catch {
      setActionStates(prev => { const s = { ...prev }; delete s[actionId]; return s; });
      toast({ title: "Error", description: "Failed to confirm action.", variant: "destructive" });
    }
  };

  const handleCancelAction = async (actionId: string) => {
    setActionStates(prev => ({ ...prev, [actionId]: "processing" }));
    try {
      await apiRequest("POST", "/api/ava/cancel-action", { actionId });
      setActionStates(prev => ({ ...prev, [actionId]: "cancelled" }));
    } catch {
      setActionStates(prev => { const s = { ...prev }; delete s[actionId]; return s; });
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
                  Navigate anywhere:
                </p>
                <div className="space-y-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("Go to my intelligence feed")}
                    data-testid="button-suggested-nav-1"
                  >
                    "Go to my intelligence feed"
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("Open the deal pipeline")}
                    data-testid="button-suggested-nav-2"
                  >
                    "Open the deal pipeline"
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("Show me my data lake")}
                    data-testid="button-suggested-nav-3"
                  >
                    "Show me my data lake"
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Query your data:
                </p>
                <div className="space-y-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("What deals are currently in due diligence?")}
                    data-testid="button-suggested-action-1"
                  >
                    "What deals are currently in due diligence?"
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("Show me all open compliance alerts")}
                    data-testid="button-suggested-action-2"
                  >
                    "Show me all open compliance alerts"
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("What's the checklist status for my current case?")}
                    data-testid="button-suggested-action-3"
                  >
                    "What's the checklist status for my current case?"
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Strategy and analysis:
                </p>
                <div className="space-y-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("What are the key risks across my active deals?")}
                    data-testid="button-suggested-question-1"
                  >
                    "What are the key risks across my active deals?"
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setMessageInput("Summarize findings for my current case")}
                    data-testid="button-suggested-question-2"
                  >
                    "Summarize findings for my current case"
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

                  {message.role === "assistant" && message.metadata?.mode === "tool_response" && message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50" data-testid="section-tool-calls">
                      <p className="text-xs font-medium flex items-center gap-1 mb-2">
                        <Database className="h-3 w-3" />
                        Data retrieved ({message.metadata.toolCalls.length} {message.metadata.toolCalls.length === 1 ? "source" : "sources"})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {message.metadata.toolCalls.map((tc, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                            data-testid={`badge-tool-${idx}`}
                          >
                            {tc.toolCategory === "write" ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <Database className="h-3 w-3 mr-1" />
                            )}
                            {tc.toolName.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.role === "assistant" && message.metadata?.requiresConfirmation && message.metadata?.pendingActionId && (
                    <div className="mt-3 pt-3 border-t border-border/50" data-testid="section-action-confirmation">
                      {actionStates[message.metadata.pendingActionId] === "confirmed" ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Action confirmed and executed</span>
                        </div>
                      ) : actionStates[message.metadata.pendingActionId] === "cancelled" ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          <span>Action cancelled</span>
                        </div>
                      ) : actionStates[message.metadata.pendingActionId] === "processing" ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <ShieldCheck className="h-4 w-4" />
                            <span>This action requires your confirmation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleConfirmAction(message.metadata!.pendingActionId!)}
                              data-testid="button-confirm-action"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelAction(message.metadata!.pendingActionId!)}
                              data-testid="button-cancel-action"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
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
          <Mic className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">to Navigate or Create</span>
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
