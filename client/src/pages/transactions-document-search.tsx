import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search,
  FileText,
  ArrowLeft,
  Sparkles,
  FileSearch,
  BarChart3,
  Scale,
  Loader2,
  MessageSquareText,
  Building2,
  Send,
} from "lucide-react";
import type { Deal, DataRoomDocument } from "@shared/schema";

interface SearchResult {
  answer: string;
  citations: any[];
  documents: DataRoomDocument[];
}

interface DocumentSummary {
  summary: string;
}

interface FinancialAnalysis {
  metrics: Record<string, any>;
  insights: string[];
  recommendations: string[];
}

interface ContractTerms {
  parties: string[];
  effectiveDate: string | null;
  termLength: string | null;
  keyTerms: { term: string; description: string }[];
  obligations: { party: string; obligation: string }[];
  terminationClauses: string[];
}

export default function TransactionsDocumentSearch() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const initialDealId = urlParams.get("dealId") || "";
  
  const { toast } = useToast();
  const [selectedDealId, setSelectedDealId] = useState<string>(initialDealId || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("search");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const searchDocumentsMutation = useMutation({
    mutationFn: async ({ dealId, query }: { dealId: string; query: string }) => {
      const response = await apiRequest("POST", `/api/deals/${dealId}/search`, { query });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search documents",
        variant: "destructive",
      });
    },
  });

  const searchAllMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/transactions/search", { query });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search transactions",
        variant: "destructive",
      });
    },
  });
  
  const isSearching = searchDocumentsMutation.isPending || searchAllMutation.isPending;
  const searchResult = searchDocumentsMutation.data || searchAllMutation.data;

  const summarizeMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/summarize`, {});
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Summarization Failed",
        description: error.message || "Failed to summarize document",
        variant: "destructive",
      });
    },
  });

  const analyzeFinancialsMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const response = await apiRequest("POST", `/api/deals/${dealId}/analyze-financials`, {});
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze financials",
        variant: "destructive",
      });
    },
  });

  const extractTermsMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/extract-terms`, {});
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract contract terms",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    if (selectedDealId && selectedDealId !== "all") {
      searchDocumentsMutation.mutate({ dealId: selectedDealId, query: searchQuery });
    } else {
      searchAllMutation.mutate(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const selectedDeal = selectedDealId !== "all" ? deals?.find((d) => d.id === selectedDealId) : undefined;

  if (dealsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/transactions")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Document Search
            </h1>
            <p className="text-muted-foreground">
              Search and analyze transaction documents using natural language
            </p>
          </div>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Intelligent Document Search
          </CardTitle>
          <CardDescription>
            Ask questions in plain English to search across all indexed transaction documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select
              value={selectedDealId}
              onValueChange={setSelectedDealId}
            >
              <SelectTrigger className="w-[300px]" data-testid="select-deal">
                <SelectValue placeholder="All Transactions (Enterprise-wide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                {deals?.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {deal.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex">
            <Textarea
              placeholder="Ask a question about your transaction documents... 
Examples:
• What are the key financial terms in the acquisition agreement?
• Find all documents mentioning indemnification clauses
• What is the total deal value across all signed agreements?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[120px] flex-1 resize-none"
              data-testid="input-search-query"
            />
            <div className="absolute right-2 bottom-2">
              <Button
                size="icon"
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
                data-testid="button-search"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {selectedDeal && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Building2 className="h-3 w-3 mr-1" />
                {selectedDeal.title}
              </Badge>
              <Badge variant="outline">{selectedDeal.dealType}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {(searchResult || isSearching) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareText className="h-5 w-5" />
              Search Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : searchResult && (
              <div className="space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-foreground" data-testid="text-search-answer">
                    {searchResult.answer}
                  </p>
                </div>

                {searchResult.documents && searchResult.documents.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Related Documents</h4>
                      <div className="flex flex-wrap gap-2">
                        {searchResult.documents.map((doc: DataRoomDocument, idx: number) => (
                          <Badge
                            key={doc.id || idx}
                            variant="outline"
                            className="cursor-pointer hover-elevate"
                            onClick={() => setSelectedDocumentId(doc.id)}
                            data-testid={`badge-document-${idx}`}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {doc.fileName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="search" data-testid="tab-search">
            <Search className="h-4 w-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="summarize" data-testid="tab-summarize">
            <FileText className="h-4 w-4 mr-2" />
            Summarize
          </TabsTrigger>
          <TabsTrigger value="financials" data-testid="tab-financials">
            <BarChart3 className="h-4 w-4 mr-2" />
            Financial Analysis
          </TabsTrigger>
          <TabsTrigger value="terms" data-testid="tab-terms">
            <Scale className="h-4 w-4 mr-2" />
            Contract Terms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Use the search box above to ask questions about your transaction documents. 
                The AI will analyze indexed documents and provide answers with citations.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summarize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Summarization</CardTitle>
              <CardDescription>
                Get an AI-generated summary of any indexed document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter document ID"
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                  data-testid="input-document-id"
                />
                <Button
                  onClick={() => selectedDocumentId && summarizeMutation.mutate(selectedDocumentId)}
                  disabled={!selectedDocumentId || summarizeMutation.isPending}
                  data-testid="button-summarize"
                >
                  {summarizeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Summarize
                </Button>
              </div>

              {summarizeMutation.data && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-summary">
                    {summarizeMutation.data.summary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Analysis</CardTitle>
              <CardDescription>
                AI-powered analysis of financial metrics from transaction documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select
                  value={selectedDealId}
                  onValueChange={setSelectedDealId}
                >
                  <SelectTrigger className="w-[300px]" data-testid="select-deal-financials">
                    <SelectValue placeholder="Select a transaction" />
                  </SelectTrigger>
                  <SelectContent>
                    {deals?.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => selectedDealId && analyzeFinancialsMutation.mutate(selectedDealId)}
                  disabled={!selectedDealId || analyzeFinancialsMutation.isPending}
                  data-testid="button-analyze-financials"
                >
                  {analyzeFinancialsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Analyze Financials
                </Button>
              </div>

              {analyzeFinancialsMutation.data && (
                <div className="space-y-4">
                  {Object.keys(analyzeFinancialsMutation.data.metrics || {}).length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Key Metrics</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(analyzeFinancialsMutation.data.metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analyzeFinancialsMutation.data.insights?.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Insights</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {analyzeFinancialsMutation.data.insights.map((insight: string, idx: number) => (
                          <li key={idx}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analyzeFinancialsMutation.data.recommendations?.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {analyzeFinancialsMutation.data.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contract Terms Extraction</CardTitle>
              <CardDescription>
                Extract key terms, obligations, and clauses from contracts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter document ID"
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                  data-testid="input-document-id-terms"
                />
                <Button
                  onClick={() => selectedDocumentId && extractTermsMutation.mutate(selectedDocumentId)}
                  disabled={!selectedDocumentId || extractTermsMutation.isPending}
                  data-testid="button-extract-terms"
                >
                  {extractTermsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Extract Terms
                </Button>
              </div>

              {extractTermsMutation.data && (
                <div className="space-y-4">
                  {extractTermsMutation.data.parties?.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Parties</h4>
                      <div className="flex flex-wrap gap-2">
                        {extractTermsMutation.data.parties.map((party: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{party}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {extractTermsMutation.data.effectiveDate && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium text-sm">Effective Date</h4>
                        <p className="text-sm">{extractTermsMutation.data.effectiveDate}</p>
                      </div>
                    )}
                    {extractTermsMutation.data.termLength && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium text-sm">Term</h4>
                        <p className="text-sm">{extractTermsMutation.data.termLength}</p>
                      </div>
                    )}
                  </div>

                  {extractTermsMutation.data.keyTerms?.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Key Terms</h4>
                      <div className="space-y-2 text-sm">
                        {extractTermsMutation.data.keyTerms.map((term: { term: string; description: string }, idx: number) => (
                          <div key={idx}>
                            <span className="font-medium">{term.term}:</span>
                            <span className="text-muted-foreground ml-1">{term.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractTermsMutation.data.obligations?.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Obligations</h4>
                      <div className="space-y-2 text-sm">
                        {extractTermsMutation.data.obligations.map((ob: { party: string; obligation: string }, idx: number) => (
                          <div key={idx}>
                            <Badge variant="outline" className="mr-2">{ob.party}</Badge>
                            <span className="text-muted-foreground">{ob.obligation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractTermsMutation.data.terminationClauses?.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Termination Clauses</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {extractTermsMutation.data.terminationClauses.map((clause: string, idx: number) => (
                          <li key={idx}>{clause}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
