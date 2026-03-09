import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Hash,
  Sparkles,
  X,
  Loader2,
  PanelRightClose,
  PanelRight,
  Lightbulb,
  ListTodo,
  MessageCircle,
  FileText,
} from "lucide-react";
import { SiWhatsapp, SiSlack } from "react-icons/si";

type Deal = {
  id: string;
  title: string;
  dealNumber: string;
  status: string | null;
};

type Channel = {
  id: string;
  deal_id: string;
  channel_name: string;
  channel_type: string;
  ambient_session_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  message_count: number;
  last_message: string | null;
  last_message_at: string | null;
};

type Message = {
  id: string;
  channel_id: string;
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  message_type: string;
  metadata: any;
  created_at: string;
};

type Member = {
  id: string;
  channel_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type InsightData = {
  summaries: Array<{
    id: string;
    summary_text: string;
    key_topics: string[] | null;
    action_items: string[] | null;
    created_at: string;
  }>;
  suggestions: Array<{
    id: string;
    suggestion_type: string;
    trigger_quote: string | null;
    explanation: string | null;
    confidence: string;
    status: string;
    created_at: string;
  }>;
  sessionId: string | null;
};

const channelTypeIcons: Record<string, any> = {
  whatsapp: SiWhatsapp,
  slack: SiSlack,
  teams: Users,
};

const channelTypeColors: Record<string, string> = {
  whatsapp: "text-green-500",
  slack: "text-purple-500",
  teams: "text-blue-500",
  sms: "text-amber-500",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DealChat() {
  const { toast } = useToast();
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [showInsights, setShowInsights] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("internal");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: channels = [], isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ["/api/deals", selectedDealId, "channels"],
    enabled: !!selectedDealId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/channels", selectedChannelId, "messages"],
    enabled: !!selectedChannelId,
    refetchInterval: 3000,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/channels", selectedChannelId, "members"],
    enabled: !!selectedChannelId,
  });

  const { data: insights } = useQuery<InsightData>({
    queryKey: ["/api/channels", selectedChannelId, "insights"],
    enabled: !!selectedChannelId && showInsights,
    refetchInterval: showInsights ? 10000 : false,
  });

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    setSelectedChannelId("");
  }, [selectedDealId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/channels/${selectedChannelId}/messages`, {
        content,
        senderName: "You",
      });
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/channels", selectedChannelId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", selectedDealId, "channels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: { channelName: string; channelType: string }) => {
      const response = await apiRequest("POST", `/api/deals/${selectedDealId}/channels`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", selectedDealId, "channels"] });
      setSelectedChannelId(data.id);
      setShowCreateChannel(false);
      setNewChannelName("");
      setNewChannelType("internal");
      toast({
        title: "Channel Created",
        description: "New channel has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create channel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || !selectedChannelId) return;
    sendMessageMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannelMutation.mutate({
      channelName: newChannelName.trim(),
      channelType: newChannelType,
    });
  };

  return (
    <>
      <Helmet>
        <title>Deal Chat | Compliance Platform</title>
        <meta name="description" content="Real-time deal messaging with AI-powered ambient intelligence analysis" />
      </Helmet>

      <div className="flex h-full" data-testid="deal-chat-page">
        <div className="w-72 border-r flex flex-col bg-muted/20" data-testid="channel-list-panel">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm" data-testid="text-deal-chat-title">Deal Chat</span>
            </div>
            <Select value={selectedDealId} onValueChange={setSelectedDealId} data-testid="select-deal">
              <SelectTrigger data-testid="select-deal-trigger">
                <SelectValue placeholder="Select a deal..." />
              </SelectTrigger>
              <SelectContent>
                {deals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id} data-testid={`select-deal-option-${deal.id}`}>
                    {deal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-auto">
            {!selectedDealId ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center" data-testid="no-deal-selected">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Select a deal to view channels</p>
              </div>
            ) : channelsLoading ? (
              <div className="flex items-center justify-center p-4" data-testid="channels-loading">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-2 space-y-1" data-testid="channel-list">
                {channels.map((channel) => {
                  const TypeIcon = channelTypeIcons[channel.channel_type];
                  const isSelected = channel.id === selectedChannelId;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannelId(channel.id)}
                      className={`w-full text-left rounded-md p-2 transition-colors ${
                        isSelected ? "bg-accent" : "hover-elevate"
                      }`}
                      data-testid={`channel-item-${channel.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate flex-1">{channel.channel_name}</span>
                        {TypeIcon && (
                          <TypeIcon className={`h-3 w-3 shrink-0 ${channelTypeColors[channel.channel_type] || ""}`} />
                        )}
                      </div>
                      {channel.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-1 pl-6">
                          {channel.last_message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 pl-6">
                        <span className="text-[10px] text-muted-foreground/70">
                          {channel.member_count} members
                        </span>
                        {channel.last_message_at && (
                          <span className="text-[10px] text-muted-foreground/70">
                            {formatTime(channel.last_message_at)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="w-full text-left rounded-md p-2 hover-elevate flex items-center gap-2 text-muted-foreground"
                  data-testid="button-create-channel"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">New Channel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0" data-testid="chat-main-panel">
          {!selectedChannelId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8" data-testid="no-channel-selected">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground" data-testid="text-select-channel">
                {selectedDealId ? "Select a channel to start chatting" : "Select a deal and channel to begin"}
              </p>
            </div>
          ) : (
            <>
              <div className="border-b p-3 flex items-center justify-between gap-3" data-testid="channel-header">
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-semibold truncate" data-testid="text-channel-name">
                    {selectedChannel?.channel_name}
                  </span>
                  {selectedChannel?.channel_type && selectedChannel.channel_type !== "internal" && (
                    <Badge variant="secondary" data-testid="badge-channel-type">
                      {(() => {
                        const TypeIcon = channelTypeIcons[selectedChannel.channel_type];
                        return (
                          <span className="flex items-center gap-1">
                            {TypeIcon && <TypeIcon className={`h-3 w-3 ${channelTypeColors[selectedChannel.channel_type] || ""}`} />}
                            {selectedChannel.channel_type}
                          </span>
                        );
                      })()}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="flex items-center gap-1" data-testid="badge-member-count">
                    <Users className="h-3 w-3" />
                    {selectedChannel?.member_count ?? members.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowInsights(!showInsights)}
                    className={`toggle-elevate ${showInsights ? "toggle-elevated" : ""}`}
                    data-testid="button-toggle-insights"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                  <ScrollArea className="flex-1 p-4" data-testid="messages-container">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full" data-testid="messages-loading">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center" data-testid="messages-empty">
                        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div key={msg.id} className="flex items-start gap-3" data-testid={`message-item-${msg.id}`}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs">
                                {getInitials(msg.sender_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-sm font-medium" data-testid={`text-sender-${msg.id}`}>
                                  {msg.sender_name || "Unknown"}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70" data-testid={`text-time-${msg.id}`}>
                                  {formatMessageTime(msg.created_at)}
                                </span>
                                {msg.message_type === "system" && (
                                  <Badge variant="secondary" className="text-[10px]">System</Badge>
                                )}
                              </div>
                              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words" data-testid={`text-content-${msg.id}`}>
                                {msg.content}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className="border-t p-3" data-testid="message-input-container">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={sendMessageMutation.isPending}
                        data-testid="input-message"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {showInsights && (
                  <div className="w-80 border-l flex flex-col bg-muted/20" data-testid="insights-panel">
                    <div className="p-3 border-b flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm" data-testid="text-insights-title">AI Insights</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowInsights(false)}
                        data-testid="button-close-insights"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <ScrollArea className="flex-1 p-3" data-testid="insights-content">
                      {!insights || (!insights.summaries?.length && !insights.suggestions?.length) ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="insights-empty">
                          <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">No insights yet</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            AI will analyze conversations as messages accumulate
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {insights.summaries?.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Summaries
                                </span>
                              </div>
                              {insights.summaries.map((summary) => (
                                <Card key={summary.id} className="p-3" data-testid={`insight-summary-${summary.id}`}>
                                  <p className="text-sm">{summary.summary_text}</p>
                                  {summary.key_topics && summary.key_topics.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {summary.key_topics.map((topic, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px]">
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {summary.action_items && summary.action_items.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      <div className="flex items-center gap-1">
                                        <ListTodo className="h-3 w-3 text-green-500" />
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Action Items</span>
                                      </div>
                                      {summary.action_items.map((item, i) => (
                                        <p key={i} className="text-xs text-muted-foreground pl-4">{item}</p>
                                      ))}
                                    </div>
                                  )}
                                </Card>
                              ))}
                            </div>
                          )}

                          {insights.suggestions?.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-amber-500" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Suggestions
                                </span>
                              </div>
                              {insights.suggestions.map((suggestion) => (
                                <Card key={suggestion.id} className="p-3" data-testid={`insight-suggestion-${suggestion.id}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-[10px]">
                                      {suggestion.suggestion_type.replace(/_/g, " ")}
                                    </Badge>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      suggestion.confidence === "high" ? "bg-green-500" :
                                      suggestion.confidence === "medium" ? "bg-amber-500" : "bg-muted-foreground"
                                    }`} />
                                  </div>
                                  {suggestion.trigger_quote && (
                                    <p className="text-xs text-muted-foreground italic mb-1">
                                      &ldquo;{suggestion.trigger_quote}&rdquo;
                                    </p>
                                  )}
                                  {suggestion.explanation && (
                                    <p className="text-sm">{suggestion.explanation}</p>
                                  )}
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent data-testid="dialog-create-channel">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>
              Create a new messaging channel for this deal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" data-testid="label-channel-name">Channel Name</label>
              <Input
                placeholder="e.g. general, due-diligence, legal-review"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); }}
                data-testid="input-channel-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" data-testid="label-channel-type">Channel Type</label>
              <Select value={newChannelType} onValueChange={setNewChannelType}>
                <SelectTrigger data-testid="select-channel-type-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateChannel(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={!newChannelName.trim() || createChannelMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createChannelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
