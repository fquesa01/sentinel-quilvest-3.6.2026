import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Flag,
  FlagOff,
  StickyNote,
  Tag,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  Filter,
  Users,
  Calendar,
  Clock,
  Smartphone,
  Check,
  AlertTriangle,
  Eye,
  ChevronDown,
  Send,
  Trash2,
  MoreVertical,
  FileText,
  ExternalLink,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ChatThread, IngestedChatMessage, ChatMessageNote } from "@shared/schema";

type ThreadWithMessages = ChatThread & { messages?: IngestedChatMessage[] };

export default function ChatReviewPage() {
  const params = useParams();
  const caseId = params.caseId || "";
  const [location] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeSidebar, setActiveSidebar] = useState<'nav' | 'none'>('none');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const { data: threads = [], isLoading: threadsLoading } = useQuery<ChatThread[]>({
    queryKey: ['/api/cases', caseId, 'chat-threads'],
    queryFn: async () => {
      const response = await fetch(`/api/cases/${caseId}/chat-threads`);
      if (!response.ok) throw new Error('Failed to fetch chat threads');
      return response.json();
    },
    enabled: !!caseId,
  });

  const { data: threadData, isLoading: messagesLoading } = useQuery<ThreadWithMessages>({
    queryKey: ['/api/chat-threads', selectedThreadId],
    queryFn: async () => {
      const response = await fetch(`/api/chat-threads/${selectedThreadId}`);
      if (!response.ok) throw new Error('Failed to fetch thread messages');
      return response.json();
    },
    enabled: !!selectedThreadId,
  });

  const messages = threadData?.messages || [];

  const { data: messageNotes = [] } = useQuery<ChatMessageNote[]>({
    queryKey: ['/api/chat-messages', selectedMessageId, 'notes'],
    queryFn: async () => {
      const response = await fetch(`/api/chat-messages/${selectedMessageId}/notes`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
    enabled: !!selectedMessageId,
  });

  const flagMessageMutation = useMutation({
    mutationFn: async ({ messageId, isFlagged }: { messageId: string; isFlagged: boolean }) => {
      const response = await apiRequest('PATCH', `/api/chat-messages/${messageId}`, { isFlagged });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-threads', selectedThreadId] });
      toast({ title: "Message flagged status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update flag", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const response = await apiRequest('POST', `/api/chat-messages/${messageId}/notes`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-messages', selectedMessageId, 'notes'] });
      setNewNote("");
      setNoteDialogOpen(false);
      toast({ title: "Note added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ messageId, noteId }: { messageId: string; noteId: string }) => {
      const response = await apiRequest('DELETE', `/api/chat-messages/${messageId}/notes/${noteId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-messages', selectedMessageId, 'notes'] });
      toast({ title: "Note deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (threads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const targetMessageId = searchParams.get('id');
    
    if (targetMessageId && threads.length > 0) {
      const findMessageThread = async () => {
        try {
          const response = await fetch(`/api/chat-messages/${targetMessageId}`);
          if (response.ok) {
            const message = await response.json();
            if (message?.threadId) {
              setSelectedThreadId(message.threadId);
              setSelectedMessageId(targetMessageId);
            }
          }
        } catch (error) {
          console.error('Failed to find message thread:', error);
        }
      };
      findMessageThread();
    }
  }, [location, threads]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = !searchQuery || 
      (msg.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.senderName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFlag = !showFlaggedOnly || msg.isFlagged;
    return matchesSearch && matchesFlag;
  });

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'whatsapp':
        return <SiWhatsapp className="h-4 w-4 text-green-600" />;
      case 'sms_android':
      case 'sms_ios':
        return <Smartphone className="h-4 w-4 text-blue-600" />;
      case 'imessage':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'telegram':
        return <Send className="h-4 w-4 text-sky-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getSenderColor = (senderId: string | null) => {
    if (!senderId) return 'bg-gray-400';
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
    ];
    const hash = senderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (threadsLoading) {
    return (
      <SidebarProvider 
        defaultOpen={false}
        open={activeSidebar !== 'none'} 
        onOpenChange={(open) => { if (!open) setActiveSidebar('none'); }}
        style={sidebarStyle as React.CSSProperties}
      >
        <div className="flex h-screen w-full">
          {activeSidebar === 'nav' && <AppSidebar />}
          <SidebarInset>
            <div className="flex items-center justify-center h-full">
              <div className="text-lg text-muted-foreground">Loading chat conversations...</div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (threads.length === 0) {
    return (
      <SidebarProvider 
        defaultOpen={false}
        open={activeSidebar !== 'none'} 
        onOpenChange={(open) => { if (!open) setActiveSidebar('none'); }}
        style={sidebarStyle as React.CSSProperties}
      >
        <div className="flex h-screen w-full">
          {activeSidebar === 'nav' && <AppSidebar />}
          <SidebarInset>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 px-4 py-3 border-b bg-background">
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setActiveSidebar(activeSidebar === 'nav' ? 'none' : 'nav')}
                  data-testid="button-sidebar-toggle"
                >
                  {activeSidebar === 'nav' ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
                <h1 className="text-lg font-semibold">Chat Message Review</h1>
              </div>
              <div className="flex items-center justify-center flex-1">
                <Card className="max-w-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      No Chat Conversations
                    </CardTitle>
                    <CardDescription>
                      No chat messages have been ingested for this case yet.
                      Upload WhatsApp exports or other chat files to begin review.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  return (
    <SidebarProvider 
      defaultOpen={false}
      open={activeSidebar !== 'none'} 
      onOpenChange={(open) => { if (!open) setActiveSidebar('none'); }}
      style={sidebarStyle as React.CSSProperties}
    >
      <div className="flex h-screen w-full">
        {activeSidebar === 'nav' && <AppSidebar />}
        
        <SidebarInset>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 px-4 py-3 border-b bg-background flex-shrink-0">
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => setActiveSidebar(activeSidebar === 'nav' ? 'none' : 'nav')}
                data-testid="button-sidebar-toggle"
              >
                {activeSidebar === 'nav' ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <h1 className="text-lg font-semibold">Chat Message Review</h1>
              {selectedThread && (
                <Badge variant="outline" className="gap-1">
                  {getSourceIcon(selectedThread.sourceType)}
                  {selectedThread.conversationName || 'Conversation'}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              <div className="w-80 border-r flex flex-col flex-shrink-0">
                <div className="p-3 border-b space-y-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Conversations</span>
                    <Badge variant="secondary" className="ml-auto">{threads.length}</Badge>
                  </div>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {threads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => setSelectedThreadId(thread.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors hover-elevate ${
                          selectedThreadId === thread.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted'
                        }`}
                        data-testid={`thread-item-${thread.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${
                            thread.sourceType === 'whatsapp' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                          }`}>
                            {getSourceIcon(thread.sourceType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">
                              {thread.conversationName || 'Unknown Conversation'}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Users className="h-3 w-3" />
                              <span>{(thread.participants as any[])?.length || 0} participants</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <MessageSquare className="h-3 w-3" />
                              <span>{thread.messageCount || 0} messages</span>
                            </div>
                            {thread.startedAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(thread.startedAt), 'MMM d, yyyy')}
                                {thread.endedAt && thread.endedAt !== thread.startedAt && (
                                  <> - {format(new Date(thread.endedAt), 'MMM d, yyyy')}</>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b bg-muted/30 flex-shrink-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-messages"
                    />
                  </div>
                  <Button
                    variant={showFlaggedOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
                    className="gap-1"
                    data-testid="button-filter-flagged"
                  >
                    <Flag className="h-4 w-4" />
                    Flagged
                  </Button>
                  {selectedThread && (
                    <div className="ml-auto text-sm text-muted-foreground">
                      {filteredMessages.length} of {messages.length} messages
                    </div>
                  )}
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-muted-foreground">Loading messages...</div>
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No messages to display</p>
                        {showFlaggedOnly && <p className="text-sm">Try removing the flagged filter</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-3xl mx-auto">
                      {filteredMessages.map((message, index) => {
                        const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
                        const showDateHeader = !prevMessage || (
                          message.sentAt && prevMessage.sentAt &&
                          format(new Date(message.sentAt), 'yyyy-MM-dd') !== 
                          format(new Date(prevMessage.sentAt), 'yyyy-MM-dd')
                        );
                        
                        return (
                          <div key={message.id}>
                            {showDateHeader && message.sentAt && (
                              <div className="flex items-center gap-4 my-4">
                                <Separator className="flex-1" />
                                <Badge variant="outline" className="text-xs font-normal">
                                  {format(new Date(message.sentAt), 'EEEE, MMMM d, yyyy')}
                                </Badge>
                                <Separator className="flex-1" />
                              </div>
                            )}
                            
                            <div 
                              className={`group flex gap-3 p-3 rounded-lg transition-colors ${
                                selectedMessageId === message.id 
                                  ? 'bg-primary/5 ring-1 ring-primary/20' 
                                  : 'hover:bg-muted/50'
                              } ${message.isFlagged ? 'border-l-2 border-l-orange-500' : ''}`}
                              onClick={() => setSelectedMessageId(message.id)}
                              data-testid={`message-item-${message.id}`}
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className={`text-xs text-white ${getSenderColor(message.senderId)}`}>
                                  {getInitials(message.senderName)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {message.senderName || message.senderPhone || 'Unknown'}
                                  </span>
                                  {message.sentAt && (
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(message.sentAt), 'h:mm a')}
                                    </span>
                                  )}
                                  {message.isFlagged && (
                                    <Flag className="h-3 w-3 text-orange-500" />
                                  )}
                                  {message.notes && (
                                    <StickyNote className="h-3 w-3 text-blue-500" />
                                  )}
                                </div>
                                
                                <div className="text-sm whitespace-pre-wrap break-words">
                                  {message.text || (
                                    <span className="text-muted-foreground italic">
                                      {message.mediaAttachments && (message.mediaAttachments as any[]).length > 0
                                        ? `[Media: ${(message.mediaAttachments as any[]).map(m => m.type || 'attachment').join(', ')}]`
                                        : '[No text content]'
                                      }
                                    </span>
                                  )}
                                </div>
                                
                                {message.mediaAttachments && Array.isArray(message.mediaAttachments) && (message.mediaAttachments as Array<{type?: string; file_name?: string}>).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {(message.mediaAttachments as Array<{type?: string; file_name?: string}>).map((media, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {media.type || 'attachment'}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        flagMessageMutation.mutate({ 
                                          messageId: message.id, 
                                          isFlagged: !message.isFlagged 
                                        });
                                      }}
                                      data-testid={`button-flag-${message.id}`}
                                    >
                                      {message.isFlagged ? (
                                        <FlagOff className="h-4 w-4 text-orange-500" />
                                      ) : (
                                        <Flag className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {message.isFlagged ? 'Remove flag' : 'Flag message'}
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMessageId(message.id);
                                        setNoteDialogOpen(true);
                                      }}
                                      data-testid={`button-note-${message.id}`}
                                    >
                                      <StickyNote className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Add note</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </div>
              
              {selectedMessageId && (
                <div className="w-80 border-l flex flex-col flex-shrink-0 bg-muted/20">
                  <div className="p-3 border-b flex items-center justify-between">
                    <h3 className="font-medium text-sm">Message Details</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setSelectedMessageId(null)}
                      data-testid="button-close-details"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-4">
                      {(() => {
                        const msg = messages.find(m => m.id === selectedMessageId);
                        if (!msg) return null;
                        
                        return (
                          <>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Sender</div>
                              <div className="text-sm font-medium">
                                {msg.senderName || 'Unknown'}
                              </div>
                              {msg.senderPhone && (
                                <div className="text-xs text-muted-foreground">{msg.senderPhone}</div>
                              )}
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Date & Time</div>
                              <div className="text-sm">
                                {msg.sentAt 
                                  ? format(new Date(msg.sentAt), 'PPpp')
                                  : 'Unknown'
                                }
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Status</div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={msg.isFlagged ? "destructive" : "secondary"}
                                  className="gap-1"
                                >
                                  {msg.isFlagged ? <Flag className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                  {msg.isFlagged ? 'Flagged' : 'Not Flagged'}
                                </Badge>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-muted-foreground">Notes</div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs gap-1"
                                  onClick={() => setNoteDialogOpen(true)}
                                  data-testid="button-add-note"
                                >
                                  <StickyNote className="h-3 w-3" />
                                  Add
                                </Button>
                              </div>
                              
                              {messageNotes.length === 0 ? (
                                <div className="text-sm text-muted-foreground italic">
                                  No notes yet
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {messageNotes.map((note) => (
                                    <div 
                                      key={note.id} 
                                      className="p-2 rounded bg-background border text-sm group"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">{note.noteText}</div>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                          onClick={() => deleteNoteMutation.mutate({ 
                                            messageId: selectedMessageId, 
                                            noteId: note.id 
                                          })}
                                          data-testid={`button-delete-note-${note.id}`}
                                        >
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {msg.notes && (
                              <>
                                <Separator />
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Quick Notes</div>
                                  <div className="text-sm">{msg.notes}</div>
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
      
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note to this message for future reference
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
            data-testid="textarea-note-content"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedMessageId && newNote.trim()) {
                  addNoteMutation.mutate({ messageId: selectedMessageId, content: newNote.trim() });
                }
              }}
              disabled={!newNote.trim() || addNoteMutation.isPending}
              data-testid="button-save-note"
            >
              {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
