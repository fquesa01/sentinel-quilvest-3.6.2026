import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FileEdit,
  Send,
  Trash2,
  Check,
  Loader2,
  Copy,
  X,
  Edit3,
  Building2,
  Newspaper,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";

type DraftNote = {
  id: string;
  userId: string;
  contactId: string | null;
  alertId: string | null;
  subjectLine: string | null;
  body: string;
  tone: string;
  status: "draft" | "sent" | "discarded";
  channel: string;
  contextSources: any;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactCompany: string | null;
  contactJobTitle: string | null;
  alertHeadline: string | null;
  alertSourceName: string | null;
  alertCategory: string | null;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function timeAgo(date: string | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

function DraftCard({
  draft,
  isSelected,
  onToggleSelect,
}: {
  draft: DraftNote;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(draft.body);
  const [editSubject, setEditSubject] = useState(draft.subjectLine || "");
  const [copied, setCopied] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await apiRequest("PATCH", `/api/relationship-intelligence/drafts/${draft.id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/drafts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/relationship-intelligence/drafts/${draft.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/drafts"] });
      toast({ title: "Deleted", description: "Draft removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveEdit = () => {
    updateMutation.mutate({ body: editBody, subjectLine: editSubject });
    setIsEditing(false);
    toast({ title: "Updated", description: "Draft updated successfully." });
  };

  const handleMarkSent = () => {
    updateMutation.mutate({ status: "sent" });
    toast({ title: "Marked as Sent", description: "Draft marked as sent." });
  };

  const handleDiscard = () => {
    updateMutation.mutate({ status: "discarded" });
    toast({ title: "Discarded", description: "Draft discarded." });
  };

  const handleCopy = () => {
    const text = draft.subjectLine
      ? `Subject: ${draft.subjectLine}\n\n${draft.body}`
      : draft.body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "Draft copied to clipboard." });
  };

  const statusIcon = draft.status === "sent"
    ? <CheckCircle2 className="w-3.5 h-3.5" />
    : draft.status === "discarded"
    ? <XCircle className="w-3.5 h-3.5" />
    : <FileEdit className="w-3.5 h-3.5" />;

  const statusVariant = draft.status === "sent"
    ? "default" as const
    : draft.status === "discarded"
    ? "destructive" as const
    : "secondary" as const;

  return (
    <Card data-testid={`draft-card-${draft.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {draft.status === "draft" && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                data-testid={`checkbox-select-draft-${draft.id}`}
                className="shrink-0"
              />
            )}
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback>{getInitials(draft.contactName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="font-semibold text-sm" data-testid={`text-draft-contact-${draft.id}`}>
                {draft.contactName || "Unknown Contact"}
              </span>
              {draft.contactCompany && (
                <span className="text-xs text-muted-foreground ml-1.5 flex items-center gap-1 inline-flex">
                  <Building2 className="w-3 h-3" />
                  {draft.contactCompany}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Badge variant={statusVariant} data-testid={`badge-draft-status-${draft.id}`}>
              {statusIcon}
              <span className="ml-1 capitalize">{draft.status}</span>
            </Badge>
            <Badge variant="outline" data-testid={`badge-draft-tone-${draft.id}`}>
              {draft.tone}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(draft.createdAt)}
            </span>
          </div>
        </div>

        {draft.alertHeadline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Newspaper className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1" data-testid={`text-draft-headline-${draft.id}`}>
              {draft.alertHeadline}
            </span>
            {draft.alertCategory && (
              <Badge variant="outline" className="text-xs">
                {draft.alertCategory}
              </Badge>
            )}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              placeholder="Subject line"
              data-testid={`input-edit-subject-${draft.id}`}
            />
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={5}
              data-testid={`textarea-edit-body-${draft.id}`}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid={`button-save-edit-${draft.id}`}>
                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditBody(draft.body);
                  setEditSubject(draft.subjectLine || "");
                }}
                data-testid={`button-cancel-edit-${draft.id}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {draft.subjectLine && (
              <p className="text-sm font-medium" data-testid={`text-draft-subject-${draft.id}`}>
                Subject: {draft.subjectLine}
              </p>
            )}
            <p className="text-sm whitespace-pre-wrap" data-testid={`text-draft-body-${draft.id}`}>
              {draft.body}
            </p>
          </>
        )}

        {!isEditing && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {draft.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid={`button-edit-draft-${draft.id}`}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={handleMarkSent}
                  disabled={updateMutation.isPending}
                  data-testid={`button-send-draft-${draft.id}`}
                >
                  {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Log as Sent
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy} data-testid={`button-copy-draft-${draft.id}`}>
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            {draft.status === "draft" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={updateMutation.isPending}
                data-testid={`button-discard-draft-${draft.id}`}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Discard
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-draft-${draft.id}`}
            >
              {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RelationshipDraftsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("draft");
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());

  const { data: drafts, isLoading } = useQuery<DraftNote[]>({
    queryKey: ["/api/relationship-intelligence/drafts"],
  });

  const allDrafts = drafts || [];
  const draftItems = allDrafts.filter((d) => d.status === "draft");
  const sentItems = allDrafts.filter((d) => d.status === "sent");
  const discardedItems = allDrafts.filter((d) => d.status === "discarded");

  const currentItems = activeTab === "draft" ? draftItems : activeTab === "sent" ? sentItems : discardedItems;

  const toggleDraftSelection = (id: string) => {
    setSelectedDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkMarkSentMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedDraftIds);
      await Promise.all(
        ids.map((id) =>
          apiRequest("PATCH", `/api/relationship-intelligence/drafts/${id}`, { status: "sent" })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/drafts"] });
      setSelectedDraftIds(new Set());
      toast({ title: "Sent", description: `${selectedDraftIds.size} draft(s) marked as sent.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkDiscardMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedDraftIds);
      await Promise.all(
        ids.map((id) =>
          apiRequest("PATCH", `/api/relationship-intelligence/drafts/${id}`, { status: "discarded" })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/drafts"] });
      setSelectedDraftIds(new Set());
      toast({ title: "Discarded", description: `${selectedDraftIds.size} draft(s) discarded.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 space-y-4 max-w-[1200px] mx-auto w-full">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-drafts-title">
              Drafts
            </h1>
            <p className="text-sm text-muted-foreground">
              Review, edit, and send your AI-generated draft responses
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-draft-count">
              {draftItems.length} pending
            </Badge>
            <Badge variant="outline" data-testid="badge-sent-count">
              {sentItems.length} sent
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedDraftIds(new Set()); }}>
          <TabsList data-testid="tabs-draft-status">
            <TabsTrigger value="draft" data-testid="tab-drafts">
              <FileEdit className="w-3.5 h-3.5 mr-1" />
              Drafts ({draftItems.length})
            </TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Sent ({sentItems.length})
            </TabsTrigger>
            <TabsTrigger value="discarded" data-testid="tab-discarded">
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Discarded ({discardedItems.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === "draft" && selectedDraftIds.size > 0 && (
            <Card className="mt-3" data-testid="card-bulk-draft-actions">
              <CardContent className="p-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary">
                    {selectedDraftIds.size} selected
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => bulkMarkSentMutation.mutate()}
                    disabled={bulkMarkSentMutation.isPending}
                    data-testid="button-bulk-send"
                  >
                    {bulkMarkSentMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Send className="w-3.5 h-3.5 mr-1" />
                    )}
                    Log {selectedDraftIds.size} as Sent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bulkDiscardMutation.mutate()}
                    disabled={bulkDiscardMutation.isPending}
                    data-testid="button-bulk-discard"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Discard Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDraftIds(new Set())}
                    data-testid="button-clear-draft-selection"
                  >
                    Clear
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds = draftItems.map((d) => d.id);
                      setSelectedDraftIds(new Set(allIds));
                    }}
                    data-testid="button-select-all-drafts"
                  >
                    Select All ({draftItems.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-3 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : currentItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileEdit className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold" data-testid="text-no-drafts">
                    {activeTab === "draft"
                      ? "No pending drafts"
                      : activeTab === "sent"
                      ? "No sent drafts"
                      : "No discarded drafts"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === "draft"
                      ? "Generate drafts from the Intelligence Feed by selecting alerts and clicking \"Generate Drafts\"."
                      : activeTab === "sent"
                      ? "Drafts you mark as sent will appear here."
                      : "Discarded drafts will appear here."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              currentItems.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  isSelected={selectedDraftIds.has(draft.id)}
                  onToggleSelect={() => toggleDraftSelection(draft.id)}
                />
              ))
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
