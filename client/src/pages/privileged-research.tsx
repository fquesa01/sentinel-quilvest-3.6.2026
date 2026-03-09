import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Helmet } from "react-helmet";
import { useSidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Send, 
  Plus,
  MessageSquare,
  Shield,
  Lock,
  Archive,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Bot,
  User,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Clock,
  FileText,
  Sparkles,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Briefcase,
  Building2,
  Scale,
  Mail,
  Phone,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Trash } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type PrivilegedSession = {
  id: string;
  userId: string;
  caseId: string | null;
  clientId: string | null;
  title: string;
  modelProvider: string;
  modelId: string;
  retentionPolicy: "save" | "auto_delete";
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;
  case?: { id: string; caseNumber: string; title: string } | null;
  client?: { id: string; companyName: string } | null;
};

type PrivilegedMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  referencedDocuments: any | null;
  tokenCount: number | null;
  createdAt: string;
};

type SessionWithMessages = PrivilegedSession & {
  messages: PrivilegedMessage[];
};

export default function PrivilegedResearch() {
  const [match, params] = useRoute("/privileged-research/:sessionId");
  const sessionId = params?.sessionId;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setOpen: setMainSidebarOpen } = useSidebar();
  
  // Collapse main navigation sidebar on mount for focused research experience
  useEffect(() => {
    setMainSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const [inputValue, setInputValue] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    if (topic) {
      window.history.replaceState({}, "", window.location.pathname);
      return topic;
    }
    return "";
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [nonStoredMessages, setNonStoredMessages] = useState<{user: string; assistant: string} | null>(null);
  const [showRetentionDialog, setShowRetentionDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkType, setLinkType] = useState<"case" | "client">("case");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [attorneyName, setAttorneyName] = useState("");
  const [lawFirm, setLawFirm] = useState("");
  const [attorneyEmail, setAttorneyEmail] = useState("");
  const [attorneyPhone, setAttorneyPhone] = useState("");
  const [inviteMethod, setInviteMethod] = useState<"email" | "sms">("email");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<PrivilegedSession[]>({
    queryKey: ["/api/privileged-sessions"],
  });

  const { data: casesData = [] } = useQuery<{ id: string; caseNumber: string; title: string }[]>({
    queryKey: ["/api/cases"],
    enabled: showLinkDialog,
  });

  const { data: clientsData = [] } = useQuery<{ id: string; companyName: string }[]>({
    queryKey: ["/api/clients"],
    enabled: showLinkDialog,
  });

  const { data: currentSession, isLoading: sessionLoading, refetch: refetchSession } = useQuery<SessionWithMessages>({
    queryKey: ["/api/privileged-sessions", sessionId],
    enabled: !!sessionId,
  });

  const { data: attorneyInfo, isLoading: attorneyInfoLoading } = useQuery<any>({
    queryKey: ["/api/attorney-info"],
  });

  useEffect(() => {
    if (attorneyInfo) {
      setAttorneyName(attorneyInfo.attorney_name || "");
      setLawFirm(attorneyInfo.law_firm || "");
      setAttorneyEmail(attorneyInfo.attorney_email || "");
      setAttorneyPhone(attorneyInfo.attorney_phone || "");
    }
  }, [attorneyInfo]);

  const saveAttorneyInfo = useMutation({
    mutationFn: async (data: { attorneyName: string; lawFirm: string; attorneyEmail: string; attorneyPhone: string }) => {
      const response = await apiRequest("PUT", "/api/attorney-info", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attorney-info"] });
      toast({ title: "Saved", description: "Attorney information updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save attorney info", variant: "destructive" });
    },
  });

  const sendInvite = useMutation({
    mutationFn: async (data: { method: string; attorneyName: string; lawFirm: string; attorneyEmail: string; attorneyPhone: string }) => {
      const response = await apiRequest("POST", "/api/attorney-info/invite", data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attorney-info"] });
      toast({ title: "Invite Sent", description: result.message });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send invite", variant: "destructive" });
    },
  });

  const createSession = useMutation({
    mutationFn: async (params: { retentionPolicy: "save" | "auto_delete"; caseId?: string; clientId?: string }) => {
      const response = await apiRequest("POST", "/api/privileged-sessions", params);
      return response.json();
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/privileged-sessions"] });
      navigate(`/privileged-research/${newSession.id}`);
      setSidebarOpen(false);
      setShowRetentionDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new session",
        variant: "destructive",
      });
      setShowRetentionDialog(false);
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, title, isArchived }: { id: string; title?: string; isArchived?: boolean }) => {
      const response = await apiRequest("PATCH", `/api/privileged-sessions/${id}`, { title, isArchived });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/privileged-sessions"] });
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/privileged-sessions", sessionId] });
      }
      setEditingSessionId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update session",
        variant: "destructive",
      });
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/privileged-sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/privileged-sessions"] });
      if (sessionId === deleteSessionId) {
        navigate("/privileged-research");
      }
      setDeleteSessionId(null);
      toast({
        title: "Session Deleted",
        description: "The research session has been permanently deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, streamedContent, pendingUserMessage, nonStoredMessages, scrollToBottom]);

  // Track auto-delete sessions for cleanup when navigating away from Privileged Research
  const autoDeleteSessionRef = useRef<string | null>(null);
  
  // Update the auto-delete session ref when viewing an auto_delete session
  useEffect(() => {
    if (currentSession?.retentionPolicy === "auto_delete") {
      autoDeleteSessionRef.current = currentSession.id;
    } else {
      autoDeleteSessionRef.current = null;
    }
  }, [currentSession]);
  
  // Handle page unload/close - delete auto_delete sessions
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionToDelete = autoDeleteSessionRef.current;
      if (sessionToDelete) {
        // Use sendBeacon for reliable delivery on page unload
        navigator.sendBeacon(`/api/privileged-sessions/${sessionToDelete}/cleanup`, '');
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionId || isStreaming) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    setPendingUserMessage(messageContent);
    setIsStreaming(true);
    setStreamedContent("");
    setNonStoredMessages(null); // Clear any previous non-stored messages

    let isNotStored = false;

    try {
      const response = await fetch(`/api/privileged-sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream");
      }

      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.notStored) {
                isNotStored = true;
              }
              if (data.content) {
                fullContent += data.content;
                setStreamedContent(fullContent);
              }
              if (data.done) {
                if (isNotStored) {
                  // For non-stored messages, keep them in local state
                  setNonStoredMessages({
                    user: messageContent,
                    assistant: fullContent
                  });
                } else {
                  // For stored messages, refetch from database
                  await refetchSession();
                  queryClient.invalidateQueries({ queryKey: ["/api/privileged-sessions"] });
                }
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
      setPendingUserMessage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const activeSessions = sessions.filter(s => !s.isArchived);
  const archivedSessions = sessions.filter(s => s.isArchived);

  return (
    <>
      <Helmet>
        <title>Privileged Research | Sentinel Counsel LLP</title>
        <meta name="description" content="AI-powered confidential legal research under attorney-client privilege" />
      </Helmet>
      <div className="flex h-[calc(100vh-64px)] bg-background relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar - hidden on mobile by default, shown when sidebarOpen is true */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-50 md:z-auto
          border-r flex flex-col bg-muted/30 md:bg-muted/30
          transition-all duration-200 ease-in-out
          ${sidebarCollapsed ? 'md:w-12' : 'w-72'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:flex
        `}>
          {/* Collapsed state - just show expand button (desktop only) */}
          {sidebarCollapsed && (
            <div className="hidden md:flex flex-col items-center py-4 gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
                data-testid="button-expand-sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="default"
                onClick={() => setShowRetentionDialog(true)}
                disabled={createSession.isPending}
                title="New session"
                data-testid="button-new-session-collapsed"
              >
                {createSession.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          
          {/* Expanded state - full sidebar content (always shown on mobile, hidden on desktop when collapsed) */}
          <div className={`flex flex-col flex-1 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
          <div className="p-4 border-b flex items-center gap-2">
            <Button 
              onClick={() => setShowRetentionDialog(true)} 
              disabled={createSession.isPending}
              className="flex-1 gap-2"
              data-testid="button-new-session"
            >
              {createSession.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              New Research Session
            </Button>
            {/* Collapse button for desktop */}
            <Button
              size="icon"
              variant="ghost"
              className="hidden md:flex shrink-0"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse sidebar"
              data-testid="button-collapse-sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            {/* Close button for mobile */}
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden shrink-0"
              onClick={() => setSidebarOpen(false)}
              data-testid="button-close-sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No research sessions yet</p>
                  <p className="text-xs mt-1">Start a new session to begin</p>
                </div>
              ) : (
                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                      data-testid="button-toggle-history"
                    >
                      {historyOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <span>Session History</span>
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {activeSessions.length}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors hover-elevate ${
                        session.id === sessionId
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/70 hover:text-foreground"
                      }`}
                      onClick={() => {
                        navigate(`/privileged-research/${session.id}`);
                        setSidebarOpen(false);
                      }}
                      data-testid={`session-item-${session.id}`}
                    >
                      {editingSessionId === session.id ? (
                        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="h-6 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateSession.mutate({ id: session.id, title: editingTitle });
                              } else if (e.key === "Escape") {
                                setEditingSessionId(null);
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => updateSession.mutate({ id: session.id, title: editingTitle })}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setEditingSessionId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{session.title}</span>
                          {session.retentionPolicy === "auto_delete" && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-destructive border-destructive/30 shrink-0" title="Auto-delete when closed">
                              <Trash className="h-2.5 w-2.5" />
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(session.id);
                                  setEditingTitle(session.title);
                                }}
                              >
                                <Edit3 className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSession.mutate({ id: session.id, isArchived: true });
                                }}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteSessionId(session.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  ))}
                  </CollapsibleContent>
                  
                  {archivedSessions.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Archived
                      </div>
                      {archivedSessions.map((session) => (
                        <div
                          key={session.id}
                          className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground hover-elevate"
                          onClick={() => {
                            navigate(`/privileged-research/${session.id}`);
                            setSidebarOpen(false);
                          }}
                          data-testid={`session-archived-${session.id}`}
                        >
                          <Archive className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{session.title}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSession.mutate({ id: session.id, isArchived: false });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </Collapsible>
              )}
            </div>
          </ScrollArea>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Compact privilege banner - scrolls with content on mobile */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
            {/* Mobile menu button */}
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden shrink-0 h-8 w-8"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-open-sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              <Lock className="h-4 w-4 text-amber-600" />
            </div>
            <Shield className="h-4 w-4 text-amber-600 sm:hidden shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400 truncate block sm:inline">
                Attorney-Client Privileged
              </span>
              <span className="hidden lg:inline text-xs text-amber-600/80 dark:text-amber-500/80 ml-2">
                This research is protected work product. Do not disclose without authorization.
              </span>
            </div>
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-[10px] sm:text-xs shrink-0">
              PRIVILEGED
            </Badge>
          </div>

          {!sessionId ? (
            <div className="flex-1 overflow-auto">
              <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
                <div className="text-center stagger-1">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-3">Privileged Legal Research</h2>
                  <p className="text-muted-foreground mb-6">Confidential and attorney work product privileged research.</p>
                </div>

                <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-semibold text-amber-800 dark:text-amber-300">Attorney-Client Privilege Notice</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                      To ensure attorney-client privilege protections apply to communications and research conducted on this platform, 
                      you must invite your attorney of record to participate. Without an attorney present on this platform, 
                      privilege protections may not attach to your research and communications.
                    </p>
                    <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                      Please provide your attorney's information below and send them an invitation to create an account. 
                      Once your attorney joins, all sessions will be protected under attorney-client privilege and work product doctrine.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Your Attorney</h3>
                    </div>
                    {attorneyInfo?.attorney_name && (
                      <div className="flex items-center gap-3 mt-2 p-3 bg-muted/50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Scale className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid="text-attorney-name">{attorneyInfo.attorney_name}</p>
                          {attorneyInfo.law_firm && (
                            <p className="text-sm text-muted-foreground truncate" data-testid="text-law-firm">
                              <Building2 className="h-3 w-3 inline mr-1" />
                              {attorneyInfo.law_firm}
                            </p>
                          )}
                          {attorneyInfo.invite_sent_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Invite sent via {attorneyInfo.invite_method} on {new Date(attorneyInfo.invite_sent_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {attorneyInfo.attorney_user_id ? (
                          <Badge variant="secondary" className="shrink-0 ml-auto">
                            <Check className="h-3 w-3 mr-1" />
                            Joined
                          </Badge>
                        ) : attorneyInfo.invite_sent_at ? (
                          <Badge variant="outline" className="shrink-0 ml-auto border-amber-500/50 text-amber-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        ) : null}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="attorney-name">Attorney Name</Label>
                        <Input
                          id="attorney-name"
                          placeholder="e.g. Jane Smith, Esq."
                          value={attorneyName}
                          onChange={(e) => setAttorneyName(e.target.value)}
                          data-testid="input-attorney-name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="law-firm">Law Firm</Label>
                        <Input
                          id="law-firm"
                          placeholder="e.g. Smith & Associates LLP"
                          value={lawFirm}
                          onChange={(e) => setLawFirm(e.target.value)}
                          data-testid="input-law-firm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="attorney-email">Attorney Email</Label>
                        <Input
                          id="attorney-email"
                          type="email"
                          placeholder="attorney@lawfirm.com"
                          value={attorneyEmail}
                          onChange={(e) => setAttorneyEmail(e.target.value)}
                          data-testid="input-attorney-email"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="attorney-phone">Attorney Phone</Label>
                        <Input
                          id="attorney-phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={attorneyPhone}
                          onChange={(e) => setAttorneyPhone(e.target.value)}
                          data-testid="input-attorney-phone"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        disabled={!attorneyName.trim() || saveAttorneyInfo.isPending}
                        onClick={() => saveAttorneyInfo.mutate({ attorneyName, lawFirm, attorneyEmail, attorneyPhone })}
                        data-testid="button-save-attorney"
                      >
                        {saveAttorneyInfo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Attorney Info
                      </Button>
                      <Button
                        className="flex-1 gap-2"
                        disabled={!attorneyName.trim() || !attorneyEmail.trim() || sendInvite.isPending}
                        onClick={() => sendInvite.mutate({ method: "email", attorneyName, lawFirm, attorneyEmail, attorneyPhone })}
                        data-testid="button-invite-email"
                      >
                        {sendInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Email Invite Link
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        disabled={!attorneyName.trim() || !attorneyPhone.trim() || sendInvite.isPending}
                        onClick={() => sendInvite.mutate({ method: "sms", attorneyName, lawFirm, attorneyEmail, attorneyPhone })}
                        data-testid="button-invite-sms"
                      >
                        {sendInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                        Text Invite Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-3 text-sm text-left bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Legal Research & Analysis</p>
                      <p className="text-muted-foreground">Get help with case law, statutes, and regulatory research</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Strategic Advice</p>
                      <p className="text-muted-foreground">Explore legal strategies and risk assessments</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Confidential & Secure</p>
                      <p className="text-muted-foreground">All communications are encrypted and privileged</p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button 
                    size="lg" 
                    onClick={() => setShowRetentionDialog(true)}
                    disabled={createSession.isPending}
                    className="gap-2"
                    data-testid="button-start-research"
                  >
                    {createSession.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Start New Research Session
                  </Button>
                </div>
              </div>
            </div>
          ) : sessionLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : currentSession ? (
            <>
              {attorneyInfo?.attorney_name && (
                <div className="border-b px-4 py-2 bg-muted/30 flex items-center gap-3 flex-wrap">
                  <Scale className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium" data-testid="text-session-attorney">{attorneyInfo.attorney_name}</span>
                  {attorneyInfo.law_firm && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-session-firm">
                        <Building2 className="h-3 w-3" />
                        {attorneyInfo.law_firm}
                      </span>
                    </>
                  )}
                  {attorneyInfo.attorney_user_id ? (
                    <Badge variant="secondary" className="ml-auto">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto border-amber-500/50 text-amber-600 text-[10px]">
                      Invite Pending
                    </Badge>
                  )}
                </div>
              )}
              {!attorneyInfo?.attorney_name && !attorneyInfoLoading && (
                <div className="border-b px-4 py-2 bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-800 dark:text-amber-300">
                    No attorney linked. Return to the main screen to invite your attorney for privilege protection.
                  </span>
                </div>
              )}
              <ScrollArea className="flex-1 p-2 sm:p-4">
                <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                  {currentSession.messages.length === 0 && !isStreaming && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-1">Start your research</p>
                      <p className="text-sm">Ask a legal question or describe what you're researching</p>
                    </div>
                  )}
                  
                  {currentSession.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 sm:gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${message.id}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </div>
                        <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs opacity-60 flex items-center gap-1 sm:gap-2">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {pendingUserMessage && (
                    <div
                      className="flex gap-2 sm:gap-4 justify-end"
                      data-testid="message-pending-user"
                    >
                      <div className="max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 bg-primary text-primary-foreground">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {pendingUserMessage}
                        </div>
                        <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs opacity-60 flex items-center gap-1 sm:gap-2">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </div>
                  )}
                  
                  {isStreaming && streamedContent && (
                    <div className="flex gap-2 sm:gap-4 justify-start">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 bg-muted">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {streamedContent}
                          <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isStreaming && !streamedContent && (
                    <div className="flex gap-2 sm:gap-4 justify-start">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="rounded-lg px-3 py-2 sm:px-4 sm:py-3 bg-muted">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Researching...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Non-stored messages - displayed after streaming completes for non-legal queries */}
                  {nonStoredMessages && !isStreaming && (
                    <>
                      {/* User's message */}
                      <div
                        className="flex gap-2 sm:gap-4 justify-end"
                        data-testid="message-non-stored-user"
                      >
                        <div className="max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 bg-primary text-primary-foreground">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {nonStoredMessages.user}
                          </div>
                          <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs opacity-60 flex items-center gap-1 sm:gap-2">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                      </div>
                      
                      {/* Assistant's response */}
                      <div className="flex gap-2 sm:gap-4 justify-start" data-testid="message-non-stored-assistant">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <div className="max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 bg-muted">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {nonStoredMessages.assistant}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-2 sm:p-4 bg-background">
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-2 sm:gap-3">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a legal question..."
                      className="min-h-[50px] sm:min-h-[60px] max-h-[150px] sm:max-h-[200px] resize-none text-sm"
                      disabled={isStreaming}
                      data-testid="input-message"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isStreaming}
                      className="shrink-0 h-[50px] w-[50px] sm:h-[60px] sm:w-[60px]"
                      data-testid="button-send"
                    >
                      {isStreaming ? (
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>
                  </div>
                  <p className="hidden sm:block text-xs text-muted-foreground mt-2 text-center">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Session not found</p>
            </div>
          )}
        </div>
      </div>
      {/* Retention Policy Dialog */}
      <Dialog open={showRetentionDialog} onOpenChange={setShowRetentionDialog}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Session Retention Policy
            </DialogTitle>
            <DialogDescription>
              How would you like this research session to be handled when completed?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="h-auto py-4 px-4 justify-start gap-4 w-full overflow-hidden"
              onClick={() => createSession.mutate({ retentionPolicy: "save" })}
              disabled={createSession.isPending}
              data-testid="button-retention-save"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Save className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left flex-1 min-w-0 overflow-hidden">
                <div className="font-medium">Save Session</div>
                <div className="text-sm text-muted-foreground whitespace-normal break-words">
                  Keep this research in your history for future reference
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 px-4 justify-start gap-4 w-full overflow-hidden"
              onClick={() => createSession.mutate({ retentionPolicy: "auto_delete" })}
              disabled={createSession.isPending}
              data-testid="button-retention-delete"
            >
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-left flex-1 min-w-0 overflow-hidden">
                <div className="font-medium">Auto-Delete When Done</div>
                <div className="text-sm text-muted-foreground whitespace-normal break-words">
                  Permanently delete this session when you close or leave it
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 px-4 justify-start gap-4 w-full overflow-hidden"
              onClick={() => { setShowRetentionDialog(false); setShowLinkDialog(true); }}
              disabled={createSession.isPending}
              data-testid="button-retention-link"
            >
              <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5 text-foreground" />
              </div>
              <div className="text-left flex-1 min-w-0 overflow-hidden">
                <div className="font-medium">Save to Case or Client</div>
                <div className="text-sm text-muted-foreground whitespace-normal break-words">
                  Link this research to a specific case or client matter
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this research session and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Save Research to Case or Client
            </DialogTitle>
            <DialogDescription>
              Link this research session to a case or client for easy access later.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={linkType} onValueChange={(v) => setLinkType(v as "case" | "client")} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="case" className="gap-2" data-testid="tab-link-case">
                <Scale className="h-4 w-4" />
                Case
              </TabsTrigger>
              <TabsTrigger value="client" className="gap-2" data-testid="tab-link-client">
                <Building2 className="h-4 w-4" />
                Client
              </TabsTrigger>
            </TabsList>
            <TabsContent value="case" className="mt-4 space-y-4">
              <div>
                <Label>Select Case</Label>
                <Select value={selectedCaseId || ""} onValueChange={setSelectedCaseId}>
                  <SelectTrigger data-testid="select-link-case">
                    <SelectValue placeholder="Choose a case..." />
                  </SelectTrigger>
                  <SelectContent>
                    {casesData.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.caseNumber} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                disabled={!selectedCaseId || createSession.isPending}
                onClick={() => {
                  createSession.mutate({ retentionPolicy: "save", caseId: selectedCaseId! });
                  setShowLinkDialog(false);
                  setSelectedCaseId(null);
                }}
                data-testid="button-confirm-link-case"
              >
                {createSession.isPending ? "Creating..." : "Save & Link to Case"}
              </Button>
            </TabsContent>
            <TabsContent value="client" className="mt-4 space-y-4">
              <div>
                <Label>Select Client</Label>
                <Select value={selectedClientId || ""} onValueChange={setSelectedClientId}>
                  <SelectTrigger data-testid="select-link-client">
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsData.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                disabled={!selectedClientId || createSession.isPending}
                onClick={() => {
                  createSession.mutate({ retentionPolicy: "save", clientId: selectedClientId! });
                  setShowLinkDialog(false);
                  setSelectedClientId(null);
                }}
                data-testid="button-confirm-link-client"
              >
                {createSession.isPending ? "Creating..." : "Save & Link to Client"}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
            <AlertDialogAction
              onClick={() => deleteSessionId && deleteSession.mutate(deleteSessionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
