import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface MessageComposerProps {
  caseId: string;
  caseNumber: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function MessageComposer({ caseId, caseNumber, trigger, onSuccess }: MessageComposerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  // Fetch investigators for recipient selection
  const { data: investigators = [], isError: investigatorsError } = useQuery<User[]>({
    queryKey: ["/api/users/investigators"],
    enabled: open,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string; recipientIds: string[]; priority: string }) => {
      return await fetch(`/api/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to send message");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSubject("");
    setBody("");
    setPriority("normal");
    setSelectedRecipients([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a message subject",
        variant: "destructive",
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message body",
        variant: "destructive",
      });
      return;
    }

    if (selectedRecipients.length === 0) {
      toast({
        title: "Recipients required",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      subject,
      body,
      recipientIds: selectedRecipients,
      priority,
    });
  };

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getRecipientName = (userId: string) => {
    const user = investigators.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" size="sm" data-testid="button-compose-message">
            <Mail className="h-4 w-4 mr-2" />
            New Message
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl" data-testid="dialog-compose-message">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-dialog-title">
            <Mail className="h-5 w-5" />
            New Message - Case {caseNumber}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipients */}
          <div className="space-y-2">
            <Label htmlFor="recipients" data-testid="label-recipients">
              Recipients *
            </Label>
            {investigatorsError ? (
              <p className="text-sm text-destructive">Failed to load investigators. Please try again.</p>
            ) : (
              <Select onValueChange={toggleRecipient} disabled={investigators.length === 0}>
                <SelectTrigger id="recipients" data-testid="select-recipients">
                  <SelectValue placeholder={investigators.length === 0 ? "Loading..." : "Select recipients..."} />
                </SelectTrigger>
                <SelectContent>
                  {investigators.map((user) => (
                    <SelectItem key={user.id} value={user.id} data-testid={`option-recipient-${user.id}`}>
                      {user.firstName} {user.lastName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedRecipients.map((userId) => (
                  <Badge key={userId} variant="secondary" className="flex items-center gap-1" data-testid={`badge-recipient-${userId}`}>
                    {getRecipientName(userId)}
                    <button
                      type="button"
                      onClick={() => toggleRecipient(userId)}
                      className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
                      data-testid={`button-remove-recipient-${userId}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" data-testid="label-priority">
              Priority
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority" data-testid="select-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent" data-testid="option-priority-urgent">Urgent</SelectItem>
                <SelectItem value="high" data-testid="option-priority-high">High</SelectItem>
                <SelectItem value="normal" data-testid="option-priority-normal">Normal</SelectItem>
                <SelectItem value="low" data-testid="option-priority-low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" data-testid="label-subject">
              Subject *
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject"
              data-testid="input-subject"
            />
          </div>

          {/* Message Body */}
          <div className="space-y-2">
            <Label htmlFor="body" data-testid="label-body">
              Message *
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your message"
              rows={6}
              data-testid="textarea-body"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendMessageMutation.isPending}
              data-testid="button-send"
            >
              {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
