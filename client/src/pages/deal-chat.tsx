import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  Send,
  Users,
  Sparkles,
  X,
  Loader2,
  Lightbulb,
  ListTodo,
  MessageCircle,
  UserPlus,
  Link2,
  Check,
  Copy,
  ExternalLink,
  Mail,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SiWhatsapp, SiSlack } from "react-icons/si";

type Deal = {
  id: string;
  title: string;
  dealNumber: string;
  status: string | null;
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
  first_name?: string | null;
  last_name?: string | null;
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

type SearchUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function DealChat() {
  const { toast } = useToast();
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [channelId, setChannelId] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [showInsights, setShowInsights] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [channelLoading, setChannelLoading] = useState(false);

  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/channels", channelId, "messages"],
    enabled: !!channelId,
    refetchInterval: 3000,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/channels", channelId, "members"],
    enabled: !!channelId,
  });

  const { data: insights } = useQuery<InsightData>({
    queryKey: ["/api/channels", channelId, "insights"],
    enabled: !!channelId && showInsights,
    refetchInterval: showInsights ? 10000 : false,
  });

  const { data: dealEmailData } = useQuery<{ emailAddress: string }>({
    queryKey: ["/api/deals", selectedDealId, "email-address"],
    enabled: !!selectedDealId && showIntegrations,
  });

  const { data: searchUsers = [] } = useQuery<SearchUser[]>({
    queryKey: ["/api/users/search", `?q=${memberSearchQuery}`],
    enabled: memberSearchQuery.length >= 2,
  });

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  useEffect(() => {
    if (!selectedDealId) {
      setChannelId("");
      return;
    }
    setChannelLoading(true);
    apiRequest("POST", `/api/deals/${selectedDealId}/default-channel`, {})
      .then((res) => res.json())
      .then((channel) => {
        setChannelId(channel.id);
        setChannelLoading(false);
      })
      .catch(() => {
        setChannelLoading(false);
        toast({ title: "Error", description: "Failed to open deal chat", variant: "destructive" });
      });
  }, [selectedDealId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/channels/${channelId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/channels", channelId, "messages"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/channels/${channelId}/members`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", channelId, "members"] });
      setShowAddMember(false);
      setMemberSearchQuery("");
      toast({ title: "Member added" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add member", description: error.message, variant: "destructive" });
    },
  });

  const connectIntegrationMutation = useMutation({
    mutationFn: async ({ type, externalChannelId }: { type: string; externalChannelId: string }) => {
      await apiRequest("POST", `/api/deals/${selectedDealId}/channels`, {
        channelName: `${type.charAt(0).toUpperCase() + type.slice(1)} Integration`,
        channelType: type,
      });
    },
    onSuccess: () => {
      toast({ title: "Integration connected" });
      setShowIntegrations(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to connect", description: error.message, variant: "destructive" });
    },
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = (type: string) => `${baseUrl}/api/integrations/${type}/webhook`;

  const copyWebhook = (type: string) => {
    navigator.clipboard.writeText(webhookUrl(type));
    setCopiedWebhook(type);
    setTimeout(() => setCopiedWebhook(null), 2000);
    toast({ title: "Webhook URL copied" });
  };

  const copyEmailAddress = () => {
    if (dealEmailData?.emailAddress) {
      navigator.clipboard.writeText(dealEmailData.emailAddress);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      toast({ title: "Email address copied" });
    }
  };

  const startSlackOAuth = async () => {
    try {
      const res = await apiRequest("GET", `/api/integrations/slack/authorize?dealId=${selectedDealId}`);
      const data = await res.json();
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=700');
      }
    } catch (error: any) {
      toast({ title: "Slack Setup", description: error.message || "Slack OAuth is not configured yet. Ask your admin to set up SLACK_CLIENT_ID.", variant: "destructive" });
    }
  };

  const startTeamsOAuth = async () => {
    try {
      const res = await apiRequest("GET", `/api/integrations/teams/authorize?dealId=${selectedDealId}`);
      const data = await res.json();
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=700');
      }
    } catch (error: any) {
      toast({ title: "Teams Setup", description: error.message || "Teams OAuth is not configured yet. Ask your admin to set up TEAMS_CLIENT_ID.", variant: "destructive" });
    }
  };

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || !channelId) return;
    sendMessageMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  let lastDate = "";

  return (
    <>
      <Helmet>
        <title>Deal Chat | Sentinel Counsel LLP</title>
        <meta name="description" content="Real-time deal messaging with ambient intelligence" />
      </Helmet>

      <div className="flex flex-col h-full" data-testid="deal-chat-page">
        <div className="border-b p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="font-semibold" data-testid="text-deal-chat-title">Deal Chat</span>
            </div>
            <Select value={selectedDealId} onValueChange={setSelectedDealId} data-testid="select-deal">
              <SelectTrigger className="w-64" data-testid="select-deal-trigger">
                <SelectValue placeholder="Select a deal to chat..." />
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

          {channelId && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowIntegrations(true)}
                data-testid="button-integrations"
              >
                <Link2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddMember(true)}
                data-testid="button-add-member"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="flex items-center gap-1" data-testid="badge-member-count">
                <Users className="h-3 w-3" />
                {members.length}
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
          )}
        </div>

        {!selectedDealId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8" data-testid="no-deal-selected">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-lg font-medium text-muted-foreground">Select a deal to start chatting</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Pick a deal from the dropdown above to open the conversation
            </p>
          </div>
        ) : channelLoading ? (
          <div className="flex-1 flex items-center justify-center" data-testid="channel-loading">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                    <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Start the conversation about {selectedDeal?.title}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const msgDate = formatMessageDate(msg.created_at);
                      let showDateHeader = false;
                      if (msgDate !== lastDate) {
                        lastDate = msgDate;
                        showDateHeader = true;
                      }

                      if (msg.message_type === "system") {
                        return (
                          <div key={msg.id}>
                            {showDateHeader && (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-[10px] text-muted-foreground/60 font-medium">{msgDate}</span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                            )}
                            <div className="flex justify-center" data-testid={`message-system-${msg.id}`}>
                              <span className="text-xs text-muted-foreground/60 bg-muted/50 px-3 py-1 rounded-full">
                                {msg.content}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const isEmailMessage = msg.metadata?.source === 'email';

                      return (
                        <div key={msg.id}>
                          {showDateHeader && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-[10px] text-muted-foreground/60 font-medium">{msgDate}</span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <div className="flex items-start gap-3" data-testid={`message-item-${msg.id}`}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs">
                                {isEmailMessage ? <Mail className="h-3.5 w-3.5" /> : getInitials(msg.sender_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium" data-testid={`text-sender-${msg.id}`}>
                                  {msg.sender_name || "Unknown"}
                                </span>
                                {isEmailMessage && (
                                  <Badge variant="secondary" className="text-[10px]" data-testid={`badge-email-${msg.id}`}>
                                    <Mail className="h-2.5 w-2.5 mr-1" />
                                    via email
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground/70" data-testid={`text-time-${msg.id}`}>
                                  {formatMessageTime(msg.created_at)}
                                </span>
                              </div>
                              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words" data-testid={`text-content-${msg.id}`}>
                                {msg.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-3" data-testid="message-input-container">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`Message ${selectedDeal?.title || ""}...`}
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
        )}
      </div>

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent data-testid="dialog-add-member">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Search for a user to add to this deal conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Search by name or email..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              data-testid="input-search-member"
            />
            {searchUsers.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-auto">
                {searchUsers
                  .filter((u) => !members.some((m) => m.user_id === u.id))
                  .map((user) => (
                    <button
                      key={user.id}
                      onClick={() => addMemberMutation.mutate(user.id)}
                      className="w-full text-left rounded-md p-2 hover-elevate flex items-center gap-3"
                      data-testid={`member-search-result-${user.id}`}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {getInitials(`${user.first_name || ""} ${user.last_name || ""}`.trim())}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowAddMember(false); setMemberSearchQuery(""); }} data-testid="button-cancel-add-member">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrations} onOpenChange={setShowIntegrations}>
        <DialogContent className="max-w-lg" data-testid="dialog-integrations">
          <DialogHeader>
            <DialogTitle>Connect Messaging Platforms</DialogTitle>
            <DialogDescription>
              Route messages from external platforms into this deal chat. All incoming messages are analyzed by Ambient Intelligence.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Card className="p-4" data-testid="integration-card-email">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
                  <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">Email Forwarding</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    CC or forward emails to this address and they will appear in the deal chat automatically.
                  </p>
                  <div className="mt-3 flex items-center gap-1">
                    <code className="flex-1 text-[11px] bg-muted px-2 py-1.5 rounded-md truncate font-mono" data-testid="text-deal-email-address">
                      {dealEmailData?.emailAddress || "Loading..."}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyEmailAddress}
                      disabled={!dealEmailData?.emailAddress}
                      data-testid="button-copy-email-address"
                    >
                      {copiedEmail ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Quick Connect</p>
              <Card className="p-4" data-testid="integration-card-slack">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/30">
                    <SiSlack className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">Slack</h4>
                      <Button size="sm" onClick={startSlackOAuth} data-testid="button-connect-slack">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Connect Slack
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Authorize your Slack workspace and link a channel in one click.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4" data-testid="integration-card-teams">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">Microsoft Teams</h4>
                      <Button size="sm" onClick={startTeamsOAuth} data-testid="button-connect-teams">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Connect Teams
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Authorize your Teams organization and link a channel automatically.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4" data-testid="integration-card-whatsapp">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/30">
                  <SiWhatsapp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">WhatsApp Business</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Route WhatsApp Business messages into this deal chat.
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Setup:</p>
                    <ol className="space-y-0.5">
                      <li className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="font-medium text-muted-foreground/70 shrink-0">1.</span>
                        In Meta Business Suite, add this webhook URL to WhatsApp settings
                      </li>
                      <li className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="font-medium text-muted-foreground/70 shrink-0">2.</span>
                        Subscribe to message events and verify
                      </li>
                    </ol>
                    <div className="flex items-center gap-1 mt-2">
                      <code className="flex-1 text-[11px] bg-muted px-2 py-1.5 rounded-md truncate font-mono" data-testid="webhook-url-whatsapp">
                        {webhookUrl("whatsapp")}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyWebhook("whatsapp")}
                        data-testid="button-copy-webhook-whatsapp"
                      >
                        {copiedWebhook === "whatsapp" ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowIntegrations(false)} data-testid="button-close-integrations">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
