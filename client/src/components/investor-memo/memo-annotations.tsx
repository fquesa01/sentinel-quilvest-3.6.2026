import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  MessageSquare, Sparkles, Send, X, Check,
  Trash2, Reply, ChevronDown, ChevronUp, CornerDownRight,
} from "lucide-react";
import type { MemoAnnotation } from "@shared/schema";

interface SelectionToolbarProps {
  position: { x: number; y: number } | null;
  onAskAI: () => void;
  onComment: () => void;
  onClose: () => void;
}

function SelectionToolbar({ position, onAskAI, onComment, onClose }: SelectionToolbarProps) {
  if (!position) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 p-1 rounded-md border bg-popover shadow-lg"
      style={{ left: position.x, top: position.y }}
      data-testid="toolbar-text-selection"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onAskAI}
        className="gap-1.5 text-xs"
        data-testid="button-ask-ai-selection"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ask AI
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onComment}
        className="gap-1.5 text-xs"
        data-testid="button-add-comment-selection"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Comment
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-7 w-7"
        data-testid="button-close-selection-toolbar"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface AnnotationInputProps {
  type: "comment" | "ai_question";
  selectedText: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

function AnnotationInput({ type, selectedText, onSubmit, onCancel, isPending }: AnnotationInputProps) {
  const [content, setContent] = useState("");

  return (
    <Card className="p-4 mt-4 border-primary/30">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {type === "ai_question" ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : (
            <MessageSquare className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium">
            {type === "ai_question" ? "Ask AI about this text" : "Add a comment"}
          </span>
        </div>
        <div className="bg-muted/50 rounded-md p-2 text-xs text-muted-foreground border-l-2 border-primary/40 italic">
          "{selectedText.length > 200 ? selectedText.slice(0, 200) + "..." : selectedText}"
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={type === "ai_question" ? "What would you like to know about this text?" : "Add your comment or note..."}
          className="min-h-[80px] text-sm"
          data-testid={`input-annotation-${type}`}
          autoFocus
        />
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} data-testid="button-cancel-annotation">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => content.trim() && onSubmit(content.trim())}
            disabled={!content.trim() || isPending}
            data-testid="button-submit-annotation"
          >
            {isPending ? (
              <Sparkles className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            {type === "ai_question" ? "Ask AI" : "Post Comment"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface AnnotationThreadProps {
  annotation: MemoAnnotation;
  memoId: string;
  currentUserId?: string;
  isAdmin: boolean;
}

function AnnotationThread({ annotation, memoId, currentUserId, isAdmin }: AnnotationThreadProps) {
  const { toast } = useToast();
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const { user } = useAuth();

  const replies = (annotation.replies || []) as Array<{
    id: string; authorId: string; authorName: string; content: string; createdAt: string;
  }>;

  const canModify = currentUserId === annotation.authorId || isAdmin;

  const resolveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/memos/${memoId}/annotations/${annotation.id}`, {
        resolved: !annotation.resolved,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos", memoId, "annotations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/memos/${memoId}/annotations/${annotation.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos", memoId, "annotations"] });
      toast({ title: "Annotation deleted" });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/memos/${memoId}/annotations/${annotation.id}/replies`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos", memoId, "annotations"] });
      setReplyContent("");
      setShowReplyInput(false);
    },
  });

  const initials = annotation.authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div
      className={`p-3 rounded-md border text-sm ${
        annotation.resolved ? "opacity-60 bg-muted/30" : "bg-background"
      }`}
      data-testid={`annotation-thread-${annotation.id}`}
    >
      <div className="flex items-start gap-2">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-xs">{annotation.authorName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(annotation.createdAt as unknown as string)}</span>
            <Badge variant={annotation.type === "ai_question" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
              {annotation.type === "ai_question" ? "AI Q&A" : "Comment"}
            </Badge>
            {annotation.resolved && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600">Resolved</Badge>
            )}
          </div>

          <div className="mt-1.5 bg-muted/50 rounded p-1.5 text-xs text-muted-foreground border-l-2 border-primary/30 italic">
            "{(annotation.selectedText || "").slice(0, 120)}{(annotation.selectedText || "").length > 120 ? "..." : ""}"
          </div>

          <p className="mt-2 text-foreground leading-relaxed">{annotation.content}</p>

          {annotation.type === "ai_question" && annotation.aiResponse && (
            <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">AI Response</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground">{annotation.aiResponse}</p>
            </div>
          )}

          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                setShowReplyInput(!showReplyInput);
                setShowReplies(true);
              }}
              data-testid={`button-reply-${annotation.id}`}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            {canModify && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => resolveMutation.mutate()}
                  data-testid={`button-resolve-${annotation.id}`}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {annotation.resolved ? "Reopen" : "Resolve"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2 text-destructive"
                  onClick={() => deleteMutation.mutate()}
                  data-testid={`button-delete-${annotation.id}`}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </>
            )}
            {replies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 ml-auto"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </Button>
            )}
          </div>

          {showReplies && replies.length > 0 && (
            <div className="mt-2 space-y-2 pl-3 border-l border-border">
              {replies.map((reply) => {
                const rInitials = reply.authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={reply.id} className="flex items-start gap-2">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarFallback className="text-[9px]">{rInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-xs">{reply.authorName}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="text-xs mt-0.5">{reply.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showReplyInput && (
            <div className="mt-2 flex items-center gap-2">
              <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid={`input-reply-${annotation.id}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && replyContent.trim()) {
                    replyMutation.mutate(replyContent.trim());
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => replyContent.trim() && replyMutation.mutate(replyContent.trim())}
                disabled={!replyContent.trim() || replyMutation.isPending}
                data-testid={`button-send-reply-${annotation.id}`}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MemoAnnotationsPanelProps {
  memoId: string;
  sectionKey: string;
  annotations: MemoAnnotation[];
}

export function MemoAnnotationsPanel({ memoId, sectionKey, annotations }: MemoAnnotationsPanelProps) {
  const { user } = useAuth();
  const sectionAnnotations = annotations.filter((a) => a.sectionKey === sectionKey);
  const unresolvedCount = sectionAnnotations.filter((a) => !a.resolved).length;
  const [showResolved, setShowResolved] = useState(false);

  const displayAnnotations = showResolved
    ? sectionAnnotations
    : sectionAnnotations.filter((a) => !a.resolved);

  if (sectionAnnotations.length === 0) return null;

  return (
    <div className="mt-6" data-testid="panel-memo-annotations">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">
            Comments & Questions ({unresolvedCount})
          </h3>
        </div>
        {sectionAnnotations.length !== unresolvedCount && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowResolved(!showResolved)}
            data-testid="button-toggle-resolved"
          >
            {showResolved ? "Hide resolved" : `Show resolved (${sectionAnnotations.length - unresolvedCount})`}
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {displayAnnotations.map((annotation) => (
          <AnnotationThread
            key={annotation.id}
            annotation={annotation}
            memoId={memoId}
            currentUserId={user?.id}
            isAdmin={user?.role === "admin"}
          />
        ))}
      </div>
    </div>
  );
}

interface UseTextSelectionReturn {
  toolbarPosition: { x: number; y: number } | null;
  selectedText: string;
  selectionOffset: number | null;
  clearSelection: () => void;
}

export function useTextSelection(containerRef: React.RefObject<HTMLDivElement | null>): UseTextSelectionReturn {
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionOffset, setSelectionOffset] = useState<number | null>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) return;

    const rect = range.getBoundingClientRect();
    setToolbarPosition({
      x: Math.min(rect.left + rect.width / 2 - 80, window.innerWidth - 220),
      y: rect.top - 45,
    });
    setSelectedText(text);

    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    setSelectionOffset(preRange.toString().length);
  }, [containerRef]);

  const clearSelection = useCallback(() => {
    setToolbarPosition(null);
    setSelectedText("");
    setSelectionOffset(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mouseup", handleMouseUp);
    const handleClickOutside = (e: MouseEvent) => {
      const toolbar = document.querySelector('[data-testid="toolbar-text-selection"]');
      if (toolbar && toolbar.contains(e.target as Node)) return;
      if (!container.contains(e.target as Node)) {
        clearSelection();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef, handleMouseUp, clearSelection]);

  return { toolbarPosition, selectedText, selectionOffset, clearSelection };
}

export { SelectionToolbar, AnnotationInput };
