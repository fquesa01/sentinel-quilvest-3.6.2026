import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Share2, Send, Copy, Trash2, Check, Mail, Clock, UserCheck, XCircle } from "lucide-react";
import type { DealShare } from "@shared/schema";

type ShareWithSharer = DealShare & {
  sharer_name?: string;
  sharer_email?: string;
};

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  accepted: { label: "Accepted", icon: UserCheck, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  revoked: { label: "Revoked", icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

interface ShareDealDialogProps {
  dealId: string;
  dealTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDealDialog({ dealId, dealTitle, open, onOpenChange }: ShareDealDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: shares = [], isLoading: sharesLoading } = useQuery<ShareWithSharer[]>({
    queryKey: ["/api/deals", dealId, "shares"],
    enabled: open && !!dealId,
  });

  const shareMutation = useMutation({
    mutationFn: async (data: { email: string; message?: string }) => {
      return apiRequest("POST", `/api/deals/${dealId}/share`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "shares"] });
      setEmail("");
      setMessage("");
      toast({ title: "Deal shared", description: `Invite sent to ${email}` });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to share deal",
        description: error.message || "Could not share this deal.",
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (shareId: string) => {
      return apiRequest("DELETE", `/api/deals/${dealId}/shares/${shareId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "shares"] });
      toast({ title: "Access revoked", description: "The share has been revoked." });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to revoke",
        description: error.message || "Could not revoke this share.",
        variant: "destructive",
      });
    },
  });

  const handleShare = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Email required", description: "Please enter an email address.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    shareMutation.mutate({ email: trimmed, message: message.trim() || undefined });
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/guest/share/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(token);
      toast({ title: "Link copied", description: "Share link copied to clipboard." });
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const activeShares = shares.filter((s) => s.status !== "revoked");
  const revokedShares = shares.filter((s) => s.status === "revoked");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Deal
          </DialogTitle>
          <DialogDescription>
            Share "{dealTitle}" with external parties via email invite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="share-email">Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="share-email"
                type="email"
                placeholder="recipient@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
                data-testid="input-share-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-message">Message (optional)</Label>
            <Textarea
              id="share-message"
              placeholder="Add a message for the recipient..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              data-testid="input-share-message"
            />
          </div>

          <Button
            onClick={handleShare}
            disabled={shareMutation.isPending || !email.trim()}
            className="w-full"
            data-testid="button-send-share"
          >
            {shareMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invite
              </>
            )}
          </Button>

          {sharesLoading ? (
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : shares.length > 0 ? (
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-medium">
                Shared With ({activeShares.length})
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeShares.map((share) => {
                  const config = statusConfig[share.status || "pending"];
                  const StatusIcon = config?.icon || Clock;
                  return (
                    <div
                      key={share.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                      data-testid={`row-share-${share.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" data-testid={`text-share-email-${share.id}`}>
                            {share.email}
                          </p>
                          {share.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Shared {new Date(share.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className={config?.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config?.label || share.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(share.token)}
                          data-testid={`button-copy-link-${share.id}`}
                        >
                          {copiedId === share.token ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        {share.status !== "revoked" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => revokeMutation.mutate(share.id)}
                            disabled={revokeMutation.isPending}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-revoke-share-${share.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {revokedShares.length > 0 && (
                  <details className="pt-1">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      {revokedShares.length} revoked {revokedShares.length === 1 ? "share" : "shares"}
                    </summary>
                    <div className="space-y-2 pt-2">
                      {revokedShares.map((share) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-dashed p-2 opacity-60"
                          data-testid={`row-share-revoked-${share.id}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{share.email}</span>
                          </div>
                          <Badge variant="outline" className={statusConfig.revoked.className}>
                            <XCircle className="h-3 w-3 mr-1" />
                            Revoked
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
