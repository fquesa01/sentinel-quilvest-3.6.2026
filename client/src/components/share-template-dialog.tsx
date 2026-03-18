import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Share2, Send, X, Plus } from "lucide-react";

interface ShareTemplateDialogProps {
  templateId: string;
  templateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTemplateDialog({ templateId, templateName, open, onOpenChange }: ShareTemplateDialogProps) {
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const shareMutation = useMutation({
    mutationFn: async (data: { emails: string[]; message?: string }) => {
      const res = await apiRequest("POST", `/api/form-templates/${templateId}/share`, data);
      return res.json() as Promise<{ success: boolean; succeeded: number; failed: number; total: number }>;
    },
    onSuccess: async (data) => {
      setEmailInput("");
      setEmails([]);
      setMessage("");
      onOpenChange(false);
      if (data.failed > 0) {
        toast({
          title: "Partially shared",
          description: `Sent to ${data.succeeded} of ${data.total} recipient${data.total > 1 ? "s" : ""}. ${data.failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Template shared",
          description: `Email sent to ${data.succeeded} recipient${data.succeeded > 1 ? "s" : ""}.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to share template",
        description: error.message || "Could not send the email.",
        variant: "destructive",
      });
    },
  });

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (emails.includes(trimmed)) {
      toast({ title: "Duplicate email", description: "This email has already been added.", variant: "destructive" });
      return;
    }
    setEmails([...emails, trimmed]);
    setEmailInput("");
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSend = () => {
    if (emails.length === 0 && emailInput.trim()) {
      const trimmed = emailInput.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
        return;
      }
      shareMutation.mutate({ emails: [trimmed], message: message.trim() || undefined });
      return;
    }
    if (emails.length === 0) {
      toast({ title: "Email required", description: "Please add at least one email address.", variant: "destructive" });
      return;
    }
    shareMutation.mutate({ emails, message: message.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Template
          </DialogTitle>
          <DialogDescription>
            Share &ldquo;{templateName}&rdquo; via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="share-template-email">Email Address(es)</Label>
            <div className="flex gap-2">
              <Input
                id="share-template-email"
                type="email"
                placeholder="recipient@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                data-testid="input-share-template-email"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={addEmail}
                disabled={!emailInput.trim()}
                data-testid="button-add-share-email"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {emails.map((e) => (
                  <Badge key={e} variant="secondary" className="gap-1">
                    {e}
                    <button
                      onClick={() => removeEmail(e)}
                      className="ml-1 rounded-full"
                      data-testid={`button-remove-email-${e}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-template-message">Message (optional)</Label>
            <Textarea
              id="share-template-message"
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              data-testid="input-share-template-message"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={shareMutation.isPending || (emails.length === 0 && !emailInput.trim())}
            className="w-full"
            data-testid="button-send-share-template"
          >
            {shareMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send{emails.length > 1 ? ` to ${emails.length} Recipients` : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}