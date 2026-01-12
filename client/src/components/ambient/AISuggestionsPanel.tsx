import { SuggestionCard, SuggestionData, DocumentResult } from './SuggestionCard';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, LayoutPanelLeft, Loader2, Target, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, TrendingUp, MessageSquareWarning, FileText,
  Lightbulb, ListTodo, MessageCircle, X
} from "lucide-react";
import { useState } from "react";

export interface InsightSuggestion {
  id: string;
  topic: string;
  triggerQuote: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  suggestionType: string;
}

interface FocusIssueResult {
  documentId: string;
  documentType: string;
  documentTitle: string;
  documentDate: string | null;
  preview: string;
  relevance: "contradicts" | "supports" | "pattern" | "impeaches" | "related";
  relevanceNote: string;
  confidence: "high" | "medium" | "low";
  focusIssueId: string;
  focusIssueTitle: string;
}

interface AISuggestionsPanelProps {
  suggestions: SuggestionData[];
  insightSuggestions?: InsightSuggestion[];
  caseId?: string;
  isAnalyzing?: boolean;
  isRecording?: boolean;
  isPaused?: boolean;
  focusMode?: "all" | "focused";
  focusResults?: FocusIssueResult[];
  onViewDocument: (docId: string) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onDismissDocument: (suggestionId: string, docId: string) => void;
  onViewAllSplit?: () => void;
}

const relevanceIcons = {
  contradicts: AlertTriangle,
  supports: CheckCircle2,
  pattern: TrendingUp,
  impeaches: MessageSquareWarning,
  related: FileText,
};

const relevanceColors = {
  contradicts: "text-red-500 bg-red-500/10",
  supports: "text-green-500 bg-green-500/10",
  pattern: "text-blue-500 bg-blue-500/10",
  impeaches: "text-orange-500 bg-orange-500/10",
  related: "text-muted-foreground bg-muted",
};

const relevanceLabels = {
  contradicts: "Contradicts",
  supports: "Supports",
  pattern: "Pattern",
  impeaches: "Impeaches",
  related: "Related",
};

const insightIcons = {
  summary: MessageCircle,
  key_point: Lightbulb,
  action_item: ListTodo,
};

const insightColors = {
  summary: "border-l-blue-500 bg-blue-500/5",
  key_point: "border-l-amber-500 bg-amber-500/5",
  action_item: "border-l-green-500 bg-green-500/5",
};

const insightLabels = {
  summary: "Summary",
  key_point: "Key Point",
  action_item: "Action Item",
};

export function AISuggestionsPanel({
  suggestions,
  insightSuggestions = [],
  caseId,
  isAnalyzing = false,
  isRecording = false,
  isPaused = false,
  focusMode = "all",
  focusResults = [],
  onViewDocument,
  onDismissSuggestion,
  onDismissDocument,
  onViewAllSplit
}: AISuggestionsPanelProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  
  const activeInsights = insightSuggestions.filter(i => !dismissedInsights.has(i.id));
  
  const activeSuggestions = suggestions.filter(s => 
    s.status !== 'dismissed' && (s.status === 'searching' || s.results.length > 0)
  );

  const totalDocs = focusMode === "focused" 
    ? focusResults.length
    : activeSuggestions.reduce((sum, s) => sum + (s.results?.length || 0), 0);

  const groupedByIssue = focusResults.reduce((acc, result) => {
    const key = result.focusIssueId;
    if (!acc[key]) {
      acc[key] = {
        title: result.focusIssueTitle,
        results: [],
      };
    }
    acc[key].results.push(result);
    return acc;
  }, {} as Record<string, { title: string; results: FocusIssueResult[] }>);

  const toggleIssue = (issueId: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-muted/20" data-testid="ai-suggestions-panel">
      <div className="p-4 border-b bg-muted/30" data-testid="ai-suggestions-header">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" data-testid="icon-sparkles" />
            <h2 className="font-semibold" data-testid="text-ai-suggestions-title">AI Suggestions</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {isAnalyzing && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </Badge>
            )}
            {totalDocs > 0 && !isAnalyzing && (
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-primary">{totalDocs}</span>
                <span className="text-xs text-muted-foreground">found</span>
              </div>
            )}
          </div>
        </div>
        
        {isRecording && !isPaused && (
          <p className="text-xs text-muted-foreground mt-1">
            Auto-analyzing every 20 seconds
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {/* Real-time Insight Cards - Always show at top regardless of mode */}
          {activeInsights.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meeting Insights</span>
              </div>
              {activeInsights.map((insight) => {
                const insightType = insight.suggestionType as keyof typeof insightIcons;
                const InsightIcon = insightIcons[insightType] || Lightbulb;
                const colorClass = insightColors[insightType] || "border-l-gray-500 bg-gray-500/5";
                const label = insightLabels[insightType] || insight.topic;
                
                return (
                  <Card 
                    key={insight.id} 
                    className={`p-3 border-l-4 ${colorClass}`}
                    data-testid={`insight-card-${insight.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <InsightIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px]">{label}</Badge>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            insight.confidence === 'high' ? 'bg-green-500' :
                            insight.confidence === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground'
                          }`} />
                        </div>
                        <p className="text-sm">{insight.triggerQuote}</p>
                        {insight.explanation && (
                          <p className="text-xs text-muted-foreground mt-1">{insight.explanation}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-foreground"
                        onClick={() => setDismissedInsights(prev => { const next = new Set(prev); next.add(insight.id); return next; })}
                        data-testid={`button-dismiss-insight-${insight.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          
          {focusMode === "focused" ? (
            Object.keys(groupedByIssue).length === 0 && activeInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="focus-empty-state">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Target className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No focus issue results yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Add focus issues to see targeted document discovery
                </p>
              </div>
            ) : (
              Object.entries(groupedByIssue).map(([issueId, { title, results }]) => (
                <Collapsible
                  key={issueId}
                  open={expandedIssues.has(issueId) || expandedIssues.size === 0}
                  onOpenChange={() => toggleIssue(issueId)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-2 p-2 rounded-md bg-card border hover:bg-accent/50 transition-colors">
                      {expandedIssues.has(issueId) || expandedIssues.size === 0 ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Target className="w-4 h-4 text-primary" />
                      <span className="flex-1 text-left text-sm font-medium truncate">
                        {title}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {results.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2 pl-6">
                      {results.map((result) => {
                        const RelevanceIcon = relevanceIcons[result.relevance];
                        return (
                          <div
                            key={result.documentId}
                            className="p-3 rounded-md border bg-background hover:bg-accent/30 transition-colors cursor-pointer"
                            onClick={() => onViewDocument(result.documentId)}
                            data-testid={`focus-result-${result.documentId}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`mt-0.5 p-1 rounded ${relevanceColors[result.relevance]}`}>
                                <RelevanceIcon className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium truncate flex-1">
                                    {result.documentTitle}
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] ${relevanceColors[result.relevance]}`}
                                  >
                                    {relevanceLabels[result.relevance]}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {result.relevanceNote}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1 italic">
                                  {result.preview}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )
          ) : (
            <>
              {/* Document Suggestions */}
              {activeSuggestions.length === 0 && activeInsights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="ai-suggestions-empty-state">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Sparkles className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-listening">Listening for relevant topics...</p>
                  <p className="text-xs text-muted-foreground/70 mt-1" data-testid="text-emma-message">
                    Emma will surface documents as you speak
                  </p>
                </div>
              ) : (
                activeSuggestions.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    caseId={caseId}
                    onViewDocument={onViewDocument}
                    onDismiss={() => onDismissSuggestion(suggestion.id)}
                    onDismissDocument={(docId) => onDismissDocument(suggestion.id, docId)}
                  />
                ))
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {totalDocs > 0 && onViewAllSplit && (
        <div className="p-3 border-t bg-card">
          <Button
            variant="outline"
            className="w-full"
            onClick={onViewAllSplit}
            data-testid="button-view-all-split"
          >
            <LayoutPanelLeft className="h-4 w-4 mr-2" />
            View All in Split
          </Button>
        </div>
      )}
    </div>
  );
}
