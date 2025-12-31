import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, FileText, ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Citation {
  chunkIndex?: number;
  retrievedContext?: {
    uri?: string;
    title?: string;
    text?: string;
  };
}

interface QueryResult {
  text: string;
  citations?: Citation[];
  groundingMetadata?: any;
}

interface SmartSearchProps {
  caseId: string;
}

export function SmartSearch({ caseId }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const queryMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/file-search/query`, {
        query: searchQuery,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to execute smart search");
      }
      return await response.json() as QueryResult;
    },
    onSuccess: (data) => {
      setError(null);
      setResult(data);
      if (!data.text) {
        toast({
          title: "No results found",
          description: "Try rephrasing your question or upload documents to search.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      const message = error.message || "Failed to execute smart search";
      setError(message);
      setResult(null);
      toast({
        title: "Search failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Empty query",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }
    setResult(null);
    setError(null);
    queryMutation.mutate(query);
  };

  const handleCitationClick = (citation: Citation) => {
    if (citation.retrievedContext?.uri) {
      const docId = extractDocIdFromUri(citation.retrievedContext.uri);
      if (docId) {
        navigate(`/document-review?caseId=${caseId}&id=${docId}`);
      }
    }
  };

  const extractDocIdFromUri = (uri: string): string | null => {
    // Match various document ID patterns: comm_, email_, file_, etc.
    const match = uri.match(/(comm|email|file|chat|doc)_(\w+)/);
    return match ? `${match[1]}_${match[2]}` : null;
  };

  return (
    <Card data-testid="card-smart-search">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Smart Search with AI
        </CardTitle>
        <CardDescription>
          Ask natural language questions about your case documents and get AI-powered answers with citations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            data-testid="input-smart-search-query"
            placeholder="Ask a question about your case documents, e.g., 'What emails discuss pricing strategies?'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Press Enter to search, Shift+Enter for new line
            </p>
            <Button
              data-testid="button-smart-search-submit"
              onClick={handleSearch}
              disabled={queryMutation.isPending || !query.trim()}
            >
              {queryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="space-y-2">
            <Separator />
            <Alert variant="destructive" data-testid="alert-smart-search-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <Separator />
            
            {result.text && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Answer</h3>
                <Alert>
                  <AlertDescription className="whitespace-pre-wrap" data-testid="text-smart-search-answer">
                    {result.text}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {result.citations && result.citations.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Sources ({result.citations.length})
                </h3>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-3">
                    {result.citations.map((citation, idx) => (
                      <Card key={idx} className="hover-elevate active-elevate-2" data-testid={`card-citation-${idx}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-sm">
                                {citation.retrievedContext?.title || `Source ${idx + 1}`}
                              </CardTitle>
                              {citation.retrievedContext?.uri && (
                                <CardDescription className="text-xs mt-1 font-mono">
                                  {citation.retrievedContext.uri}
                                </CardDescription>
                              )}
                            </div>
                            <Badge variant="secondary" data-testid={`badge-citation-index-${idx}`}>
                              #{idx + 1}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                          {citation.retrievedContext?.text && (
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                              {citation.retrievedContext.text}
                            </p>
                          )}
                          {citation.retrievedContext?.uri && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCitationClick(citation)}
                              data-testid={`button-view-source-${idx}`}
                            >
                              <ExternalLink className="mr-2 h-3 w-3" />
                              View in Document Review
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {queryMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
