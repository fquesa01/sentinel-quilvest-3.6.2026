import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MailOpen, Send, Search, Filter, Clock, AlertCircle, User, FileText, PenSquare } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { CaseMessage, User as UserType, Case } from "@shared/schema";
import { ContextSourceSelector, type ContextSource } from "@/components/context-source-selector";

type InboxMessage = CaseMessage & { sender: UserType; case: Case };

export default function MailboxPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    caseId: "",
    contextType: "" as string,
    contextId: "" as string,
    recipientIds: [] as string[],
    subject: "",
    body: "",
    priority: "normal",
  });
  const [selectedContext, setSelectedContext] = useState<ContextSource | null>(null);

  // Fetch inbox messages
  const { data: inbox = [], isLoading } = useQuery<InboxMessage[]>({
    queryKey: ["/api/messages/inbox"],
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
  });

  const unreadCount = unreadData?.count || 0;

  // Fetch all users for compose form
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all cases for compose form
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await fetch(`/api/messages/${messageId}/read`, {
        method: "PATCH",
        credentials: "include",
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: typeof composeData) => {
      // For case context, use the existing case messages endpoint for backward compatibility
      // For other contexts, use the new context-aware endpoint
      if (data.contextType === "case" && data.caseId) {
        const response = await apiRequest("POST", `/api/cases/${data.caseId}/messages`, {
          recipientIds: data.recipientIds,
          subject: data.subject,
          body: data.body,
          priority: data.priority,
        });
        return response.json();
      }
      
      // Use context-aware messages endpoint for non-case contexts
      const response = await apiRequest("POST", "/api/messages/send", {
        contextType: data.contextType,
        contextId: data.contextId,
        recipientIds: data.recipientIds,
        subject: data.subject,
        body: data.body,
        priority: data.priority,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setComposeDialogOpen(false);
      setComposeData({
        caseId: "",
        contextType: "",
        contextId: "",
        recipientIds: [],
        subject: "",
        body: "",
        priority: "normal",
      });
      setSelectedContext(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!composeData.contextId || composeData.recipientIds.length === 0 || !composeData.subject || !composeData.body) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including a context source.",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate(composeData);
  };

  // Filter messages based on search
  const filteredMessages = inbox.filter((message) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      message.subject.toLowerCase().includes(searchLower) ||
      message.body.toLowerCase().includes(searchLower) ||
      message.sender?.firstName?.toLowerCase().includes(searchLower) ||
      message.sender?.lastName?.toLowerCase().includes(searchLower) ||
      message.case?.title?.toLowerCase().includes(searchLower) ||
      message.case?.caseNumber?.toLowerCase().includes(searchLower)
    );
  });

  // Separate unread and read messages
  const unreadMessages = filteredMessages.filter((msg) => {
    const readBy = msg.readBy || [];
    return !readBy.includes(msg.id);
  });

  const readMessages = filteredMessages.filter((msg) => {
    const readBy = msg.readBy || [];
    return readBy.includes(msg.id);
  });

  const handleMessageClick = (message: InboxMessage) => {
    setSelectedMessage(message);
    
    // Mark as read if not already
    const readBy = message.readBy || [];
    const userId = message.id; // This should be current user's ID
    if (!readBy.includes(userId)) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "destructive";
      case "normal":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  const MessageListItem = ({ message }: { message: InboxMessage }) => {
    const readBy = message.readBy || [];
    const isUnread = !readBy.includes(message.id);
    
    return (
      <Card
        className={`hover-elevate active-elevate-2 cursor-pointer transition-all ${
          selectedMessage?.id === message.id ? "border-primary" : ""
        }`}
        onClick={() => handleMessageClick(message)}
        data-testid={`message-item-${message.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {isUnread ? (
                <Mail className="h-5 w-5 text-primary" data-testid="icon-unread" />
              ) : (
                <MailOpen className="h-5 w-5 text-muted-foreground" data-testid="icon-read" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-sm font-medium truncate ${isUnread ? "font-semibold" : ""}`}>
                    {message.sender?.firstName} {message.sender?.lastName}
                  </h3>
                  {message.priority && message.priority !== "normal" && (
                    <Badge variant={getPriorityColor(message.priority)} className="text-xs" data-testid={`badge-priority-${message.priority}`}>
                      {message.priority}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid="text-timestamp">
                  {format(new Date(message.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground" data-testid="text-case-number">
                  {message.case?.caseNumber}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate" data-testid="text-case-title">
                  {message.case?.title}
                </span>
              </div>
              <p className={`text-sm mb-1 ${isUnread ? "font-medium" : ""}`} data-testid="text-subject">
                {message.subject}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-body-preview">
                {message.body}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">
              Mailbox
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-page-description">
              Internal case communications and collaboration
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <Badge variant="destructive" data-testid="badge-unread-count">
                {unreadCount} Unread
              </Badge>
            )}
            <Button
              onClick={() => setComposeDialogOpen(true)}
              data-testid="button-compose-message"
            >
              <PenSquare className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages by subject, sender, or case..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-hidden p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground" data-testid="text-loading">Loading messages...</div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-empty-title">
              {searchQuery ? "No messages found" : "No messages yet"}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="text-empty-description">
              {searchQuery
                ? "Try adjusting your search query"
                : "You'll see internal case communications here"}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="unread" className="h-full flex flex-col">
            <TabsList className="mb-4" data-testid="tabs-message-filter">
              <TabsTrigger value="unread" className="flex items-center gap-2" data-testid="tab-unread">
                <Mail className="h-4 w-4" />
                Unread ({unreadMessages.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2" data-testid="tab-all">
                <MailOpen className="h-4 w-4" />
                All ({filteredMessages.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unread" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {unreadMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MailOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2" data-testid="text-no-unread">
                        All caught up!
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        You have no unread messages
                      </p>
                    </div>
                  ) : (
                    unreadMessages.map((message) => (
                      <MessageListItem key={message.id} message={message} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {filteredMessages.map((message) => (
                    <MessageListItem key={message.id} message={message} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col" data-testid="dialog-message-detail">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2" data-testid="text-dialog-title">
                <Mail className="h-5 w-5" />
                {selectedMessage?.subject}
              </DialogTitle>
              {selectedMessage?.priority && selectedMessage.priority !== "normal" && (
                <Badge variant={getPriorityColor(selectedMessage.priority)} data-testid="badge-dialog-priority">
                  {selectedMessage.priority}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedMessage && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {/* Message Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid="text-sender">
                    From: {selectedMessage.sender?.firstName} {selectedMessage.sender?.lastName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({selectedMessage.sender?.email})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid="text-case-link">
                    Case: {selectedMessage.case?.caseNumber} - {selectedMessage.case?.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground" data-testid="text-sent-time">
                    {format(new Date(selectedMessage.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Message Body */}
              <ScrollArea className="flex-1">
                <div className="whitespace-pre-wrap text-sm" data-testid="text-message-body">
                  {selectedMessage.body}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Message Dialog */}
      <Dialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-compose-message">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-compose-title">
              <PenSquare className="h-5 w-5" />
              Compose Message
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Context Source Selection */}
            <div className="space-y-2">
              <Label>Link to Context *</Label>
              <ContextSourceSelector
                value={selectedContext}
                onChange={(ctx) => {
                  setSelectedContext(ctx);
                  setComposeData({ 
                    ...composeData, 
                    caseId: ctx?.type === "case" ? ctx.id : "",
                    contextType: ctx?.type || "",
                    contextId: ctx?.id || "",
                  });
                }}
                placeholder="Select case, transaction, PE deal, or data room..."
              />
              <p className="text-xs text-muted-foreground">
                Message will be linked to the selected context
              </p>
            </div>

            {/* Recipients Selection */}
            <div className="space-y-2">
              <Label>Recipients *</Label>
              <ScrollArea className="h-40 border rounded-md p-3">
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center gap-2" data-testid={`recipient-option-${user.id}`}>
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={composeData.recipientIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setComposeData({
                              ...composeData,
                              recipientIds: [...composeData.recipientIds, user.id],
                            });
                          } else {
                            setComposeData({
                              ...composeData,
                              recipientIds: composeData.recipientIds.filter((id) => id !== user.id),
                            });
                          }
                        }}
                        data-testid={`checkbox-recipient-${user.id}`}
                      />
                      <label
                        htmlFor={`user-${user.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {user.firstName} {user.lastName} - {user.email}
                        {user.role && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {user.role.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {composeData.recipientIds.length} recipient(s) selected
              </p>
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <Label htmlFor="priority-select">Priority</Label>
              <Select
                value={composeData.priority}
                onValueChange={(value) => setComposeData({ ...composeData, priority: value })}
              >
                <SelectTrigger id="priority-select" data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" data-testid="priority-low">Low</SelectItem>
                  <SelectItem value="normal" data-testid="priority-normal">Normal</SelectItem>
                  <SelectItem value="high" data-testid="priority-high">High</SelectItem>
                  <SelectItem value="urgent" data-testid="priority-urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject-input">Subject *</Label>
              <Input
                id="subject-input"
                placeholder="Enter message subject"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                data-testid="input-subject"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <Label htmlFor="body-input">Message *</Label>
              <Textarea
                id="body-input"
                placeholder="Enter your message"
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                rows={6}
                data-testid="textarea-body"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setComposeDialogOpen(false)}
              data-testid="button-cancel-compose"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
