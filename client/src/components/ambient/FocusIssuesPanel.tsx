import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Target, Search, Plus, Trash2, ChevronDown, ChevronRight,
  Settings, Lightbulb, GripVertical, Edit3, Check, X, Loader2
} from "lucide-react";

interface FocusIssue {
  id: string;
  sessionId?: string | null;
  meetingId?: string | null;
  dealId?: string | null;
  title: string;
  shortName?: string | null;
  active: boolean;
  displayOrder: number;
  keywords?: string[] | null;
  pinnedDocumentIds?: string[] | null;
  createdAt?: string;
}

interface FocusIssuesPanelProps {
  sessionId?: string;
  meetingId?: string;
  dealId?: string;
  focusMode: "all" | "focused";
  onFocusModeChange: (mode: "all" | "focused") => void;
  onIssuesChange?: (issues: FocusIssue[]) => void;
}

export function FocusIssuesPanel({
  sessionId,
  meetingId,
  dealId,
  focusMode,
  onFocusModeChange,
  onIssuesChange,
}: FocusIssuesPanelProps) {
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const { data: issues = [], isLoading } = useQuery<FocusIssue[]>({
    queryKey: ["/api/focus-issues", { sessionId, meetingId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sessionId) params.append("sessionId", sessionId);
      if (meetingId) params.append("meetingId", meetingId);
      const res = await fetch(`/api/focus-issues?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!(sessionId || meetingId),
  });

  const activeIssuesCount = issues.filter(i => i.active).length;

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/focus-issues", {
        sessionId,
        meetingId,
        dealId,
        title,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-issues"] });
      setNewIssueTitle("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FocusIssue> }) => {
      const response = await apiRequest("PATCH", `/api/focus-issues/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-issues"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/focus-issues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-issues"] });
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/focus-issues/suggest", {
        dealId,
      });
      return response.json();
    },
  });

  const handleAddIssue = () => {
    if (!newIssueTitle.trim()) return;
    createMutation.mutate(newIssueTitle.trim());
  };

  const handleToggleActive = (issue: FocusIssue) => {
    updateMutation.mutate({
      id: issue.id,
      data: { active: !issue.active },
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editingTitle.trim()) return;
    updateMutation.mutate({
      id,
      data: { title: editingTitle.trim() },
    });
  };

  const handleAddSuggestion = (suggestion: { title: string; shortName: string }) => {
    createMutation.mutate(suggestion.title);
  };

  return (
    <div className="border-b border-border/50 bg-muted/20">
      <div className="px-3 py-2">
        <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-lg">
          <button
            onClick={() => onFocusModeChange("all")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              focusMode === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-focus-mode-all"
          >
            <Search className="w-3.5 h-3.5" />
            All Topics
          </button>
          <button
            onClick={() => onFocusModeChange("focused")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              focusMode === "focused"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-focus-mode-focused"
          >
            <Target className="w-3.5 h-3.5" />
            Focus Issues ({activeIssuesCount})
          </button>
        </div>
      </div>

      {focusMode === "focused" && (
        <Collapsible open={showSetup} onOpenChange={setShowSetup}>
          <CollapsibleTrigger asChild>
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              data-testid="button-toggle-focus-setup"
            >
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Configure Focus Issues
              </span>
              {showSetup ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-start gap-2 p-2 rounded-md border bg-background/50"
                      data-testid={`focus-issue-${issue.id}`}
                    >
                      <Switch
                        checked={issue.active}
                        onCheckedChange={() => handleToggleActive(issue)}
                        className="mt-0.5"
                        data-testid={`switch-issue-active-${issue.id}`}
                      />
                      
                      {editingId === issue.id ? (
                        <div className="flex-1 flex items-center gap-1">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                            data-testid={`input-edit-issue-${issue.id}`}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleSaveEdit(issue.id)}
                            data-testid={`button-save-edit-${issue.id}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setEditingId(null)}
                            data-testid={`button-cancel-edit-${issue.id}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-snug ${issue.active ? "text-foreground" : "text-muted-foreground"}`}>
                              {issue.title}
                            </p>
                            {issue.shortName && issue.shortName !== issue.title && (
                              <Badge variant="secondary" className="mt-1 text-[10px]">
                                {issue.shortName}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingId(issue.id);
                                setEditingTitle(issue.title);
                              }}
                              data-testid={`button-edit-issue-${issue.id}`}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(issue.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-issue-${issue.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a focus issue..."
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddIssue()}
                  className="flex-1 h-8 text-xs"
                  data-testid="input-new-focus-issue"
                />
                <Button
                  size="sm"
                  onClick={handleAddIssue}
                  disabled={!newIssueTitle.trim() || createMutation.isPending}
                  className="h-8"
                  data-testid="button-add-focus-issue"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>

              {caseId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => suggestMutation.mutate()}
                  disabled={suggestMutation.isPending}
                  data-testid="button-suggest-focus-issues"
                >
                  {suggestMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Analyzing case documents...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                      Suggest issues from case documents
                    </>
                  )}
                </Button>
              )}

              {suggestMutation.isSuccess && suggestMutation.data?.suggestions && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Suggested Issues:</p>
                  {suggestMutation.data.suggestions.map((suggestion: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-md border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleAddSuggestion(suggestion)}
                      data-testid={`suggested-issue-${i}`}
                    >
                      <Plus className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">{suggestion.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {suggestion.rationale}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export default FocusIssuesPanel;
