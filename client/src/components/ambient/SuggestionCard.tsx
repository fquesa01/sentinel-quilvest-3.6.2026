import { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Eye, 
  FileText, 
  Mail, 
  Sparkles, 
  ChevronsRight,
  Loader2,
  AlignLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export interface BulletPoint {
  text: string;
  category?: string;
}

export interface DocumentResult {
  id: string;
  title: string;
  type: 'email' | 'document';
  sender?: string;
  date: string;
  preview: string;
  riskLevel?: string;
  bullets?: BulletPoint[];
  viewUrl?: string;
}

export interface SuggestionData {
  id: string;
  topic: string;
  triggerQuote: string;
  confidence: 'high' | 'medium' | 'low';
  results: DocumentResult[];
  status: 'found' | 'searching' | 'no_results' | 'dismissed';
}

interface SuggestionCardProps {
  suggestion: SuggestionData;
  dealId?: string;
  onViewDocument: (docId: string) => void;
  onDismiss: () => void;
  onDismissDocument: (docId: string) => void;
}

export function SuggestionCard({
  suggestion,
  dealId,
  onViewDocument,
  onDismiss,
  onDismissDocument
}: SuggestionCardProps) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const handleSummarize = async (docId: string) => {
    setSummarizing(docId);
    try {
      const response = await apiRequest("POST", `/api/communications/${docId}/context-summarize`, {
        context: suggestion.triggerQuote
      });
      const data = await response.json();
      setSummaries(prev => ({ ...prev, [docId]: data.summary }));
      setExpandedDoc(docId);
    } catch (error) {
      console.error('Summarization failed:', error);
    }
    setSummarizing(null);
  };

  if (suggestion.status === 'searching') {
    return (
      <Card className="overflow-hidden animate-pulse" data-testid={`suggestion-card-${suggestion.id}`}>
        <div className="p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
          <span className="text-sm font-medium text-primary">{suggestion.topic}</span>
        </div>
      </Card>
    );
  }

  if (suggestion.results.length === 0) return null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`suggestion-card-${suggestion.id}`}>
      <CardHeader className="p-3 pb-2 bg-muted/30 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span className="text-lg text-muted-foreground/50 font-serif leading-none">"</span>
            <span className="text-xs text-muted-foreground italic line-clamp-2">
              {suggestion.triggerQuote}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-foreground"
            onClick={onDismiss}
            data-testid={`button-dismiss-suggestion-${suggestion.id}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <div className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            suggestion.confidence === 'high' ? 'bg-green-500' :
            suggestion.confidence === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground'
          }`} />
          <span className="text-sm font-semibold flex-1">{suggestion.topic}</span>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {suggestion.results.length}
          </Badge>
        </div>
      </div>

      <CardContent className="p-2 pt-0 space-y-2">
        {suggestion.results.map((doc) => (
          <div key={doc.id} className="rounded-lg overflow-hidden border border-border/50" data-testid={`doc-item-${doc.id}`}>
            <div 
              className="flex items-center gap-2 p-2 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => onViewDocument(doc.id)}
              data-testid={`doc-row-${doc.id}`}
            >
              <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                doc.type === 'email' 
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' 
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
              }`}>
                {doc.type === 'email' ? (
                  <Mail className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{doc.title}</p>
                {doc.sender && (
                  <p className="text-xs text-muted-foreground truncate">{doc.sender}</p>
                )}
              </div>

              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {!doc.bullets?.length && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border-green-200 text-green-600 hover:bg-green-50 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950/50"
                    onClick={() => handleSummarize(doc.id)}
                    disabled={summarizing === doc.id}
                    title="AI Summary"
                    data-testid={`button-summarize-doc-${doc.id}`}
                  >
                    {summarizing === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlignLeft className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => onDismissDocument(doc.id)}
                  title="Skip"
                  data-testid={`button-skip-doc-${doc.id}`}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {doc.bullets && doc.bullets.length > 0 && (
              <div className="px-3 py-2 bg-primary/5 border-t border-border/30">
                <ul className="space-y-1">
                  {doc.bullets.slice(0, 3).map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span className="leading-relaxed">{bullet.text}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-auto px-0 mt-2 text-xs text-primary hover:text-primary/80 hover:bg-transparent"
                  onClick={() => onViewDocument(doc.id)}
                  data-testid={`button-view-full-${doc.id}`}
                >
                  View Full {doc.type === 'email' ? 'Email' : 'Document'} →
                </Button>
              </div>
            )}

            {expandedDoc === doc.id && summaries[doc.id] && !doc.bullets?.length && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border-t border-green-200 dark:border-green-900">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                  <Sparkles className="h-3 w-3" />
                  AI Summary
                </div>
                <p className="text-sm text-green-900 dark:text-green-100 leading-relaxed mb-3">
                  {summaries[doc.id]}
                </p>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onViewDocument(doc.id)}
                  data-testid={`button-view-full-summary-${doc.id}`}
                >
                  View Full Document →
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
