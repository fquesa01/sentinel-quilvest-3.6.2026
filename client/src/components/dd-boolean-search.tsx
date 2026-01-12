import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Search, ChevronDown, ChevronRight, FileText, AlertTriangle, 
  CheckCircle2, XCircle, Edit2, Save, Plus, Play, Tag, Brain,
  Filter, File, Folder, Building2, Scale, MessageSquare, RefreshCw, FileDown
} from "lucide-react";

interface DDSection {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  category: string;
}

interface DDBooleanQuery {
  id: string;
  sectionId: string;
  queryName: string;
  booleanQuery: string;
  description: string | null;
  priority: number;
}

interface DocumentMatch {
  id: string;
  source: string;
  title: string;
  path?: string;
  content?: string;
  matchedTerms: string[];
  matchedExcerpts: { text: string; page?: number; location?: string }[];
  relevanceScore: number;
  metadata?: any;
}

interface SearchResult {
  sectionId: string;
  sectionName: string;
  queryId: string;
  queryName: string;
  documentsFound: number;
  documents: DocumentMatch[];
}

interface DDBooleanSearchProps {
  dealId: string;
  dealName: string;
  sourceType: "pe_deal" | "transaction" | "data_room";
}

export function DDBooleanSearch({ dealId, dealName, sourceType }: DDBooleanSearchProps) {
  const { toast } = useToast();
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [editingQuery, setEditingQuery] = useState<{ queryId: string; sectionId: string; value: string } | null>(null);
  const [isRunningSearch, setIsRunningSearch] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data: sections = [], isLoading: sectionsLoading } = useQuery<DDSection[]>({
    queryKey: ["/api/dd-boolean-search/sections"],
  });

  const { data: queries = [], isLoading: queriesLoading, refetch: refetchQueries } = useQuery<DDBooleanQuery[]>({
    queryKey: ["/api/dd-boolean-search/queries", dealId],
    queryFn: async () => {
      const response = await fetch(`/api/dd-boolean-search/queries/${dealId}`);
      if (!response.ok) throw new Error("Failed to fetch queries");
      return response.json();
    },
    enabled: !!dealId,
  });

  const updateQuery = useMutation({
    mutationFn: async ({ queryId, booleanQuery }: { queryId: string; booleanQuery: string }) => {
      const response = await apiRequest("PATCH", `/api/dd-boolean-search/queries/${queryId}`, { booleanQuery });
      if (!response.ok) throw new Error("Failed to update query");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Query updated", description: "Boolean query saved successfully" });
      refetchQueries();
      setEditingQuery(null);
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const runAnalysis = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/dd-boolean-search/analysis/run", {
        dealId,
        sourceType,
        targetCompanyName: dealName,
      });
      if (!response.ok) throw new Error("Failed to start analysis");
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentRunId(data.runId);
      toast({ title: "Analysis started", description: "AI is analyzing matched documents..." });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const downloadPdf = async (runId: string) => {
    setIsExportingPdf(true);
    try {
      const response = await fetch(`/api/dd-boolean-search/analysis/results/${runId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DD_Boolean_Search_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "PDF Downloaded", description: "Report has been saved to your downloads" });
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const runSearch = useMutation({
    mutationFn: async () => {
      const selectedQueries = queries.filter(q => selectedSections.has(q.sectionId));
      if (selectedQueries.length === 0) {
        throw new Error("Please select at least one section to search");
      }

      const results: SearchResult[] = [];
      
      for (const query of selectedQueries) {
        const response = await fetch("/api/dd-boolean-search/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.booleanQuery,
            dealId,
            sourceType,
            limit: 100,
          }),
        });
        
        if (!response.ok) {
          console.error(`Search failed for query ${query.queryName}`);
          continue;
        }
        
        const data = await response.json();
        const section = sections.find(s => s.id === query.sectionId);
        
        results.push({
          sectionId: query.sectionId,
          sectionName: section?.name || query.sectionId,
          queryId: query.id,
          queryName: query.queryName,
          documentsFound: data.results?.length || 0,
          documents: data.results || [],
        });
      }
      
      return results;
    },
    onSuccess: (results) => {
      setSearchResults(results);
      const totalDocs = results.reduce((sum, r) => sum + r.documentsFound, 0);
      toast({ 
        title: "Search complete", 
        description: `Found ${totalDocs} document matches across ${results.length} queries` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleSection = (sectionId: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(sectionId)) {
      newSelected.delete(sectionId);
    } else {
      newSelected.add(sectionId);
    }
    setSelectedSections(newSelected);
  };

  const toggleAllSections = () => {
    if (selectedSections.size === sections.length) {
      setSelectedSections(new Set());
    } else {
      setSelectedSections(new Set(sections.map(s => s.id)));
    }
  };

  const toggleExpandSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleDocument = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const getQueriesForSection = (sectionId: string) => {
    return queries.filter(q => q.sectionId === sectionId);
  };

  const getResultsForSection = (sectionId: string) => {
    return searchResults.filter(r => r.sectionId === sectionId);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "data_room": return <Folder className="h-4 w-4" />;
      case "case_evidence": return <Scale className="h-4 w-4" />;
      case "transaction_folder": return <Building2 className="h-4 w-4" />;
      case "court_pleading": return <FileText className="h-4 w-4" />;
      case "communication": return <MessageSquare className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "legal": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "financial": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "tax": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "commercial": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "ip": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
      case "hr": return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
      case "regulatory": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "technology": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "environmental": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  if (sectionsLoading || queriesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card data-testid="card-dd-sections">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                DD Boolean Search & Checklist
              </CardTitle>
              <CardDescription>
                Select DD sections to search. Boolean queries filter documents across all sources before AI analysis.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllSections}
                data-testid="button-toggle-all-sections"
              >
                {selectedSections.size === sections.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                onClick={() => runSearch.mutate()}
                disabled={runSearch.isPending || selectedSections.size === 0}
                data-testid="button-run-search"
              >
                {runSearch.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Search ({selectedSections.size} sections)
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {sections.map((section) => {
                const sectionQueries = getQueriesForSection(section.id);
                const sectionResults = getResultsForSection(section.id);
                const isExpanded = expandedSections.has(section.id);
                const totalMatches = sectionResults.reduce((sum, r) => sum + r.documentsFound, 0);
                
                return (
                  <Collapsible 
                    key={section.id} 
                    open={isExpanded}
                    onOpenChange={() => toggleExpandSection(section.id)}
                  >
                    <div className="flex items-center gap-2 p-3 border rounded-lg hover-elevate">
                      <Checkbox
                        checked={selectedSections.has(section.id)}
                        onCheckedChange={() => toggleSection(section.id)}
                        data-testid={`checkbox-section-${section.id}`}
                      />
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-auto">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{section.displayOrder}. {section.name}</span>
                          <Badge variant="outline" className={getCategoryColor(section.category)}>
                            {section.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {sectionQueries.length} queries
                          </Badge>
                          {totalMatches > 0 && (
                            <Badge className="text-xs bg-primary">
                              {totalMatches} matches
                            </Badge>
                          )}
                        </div>
                        {section.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{section.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="ml-10 mt-2 space-y-2 pb-2">
                        {sectionQueries.map((query) => {
                          const isEditing = editingQuery?.queryId === query.id;
                          const queryResults = sectionResults.find(r => r.queryId === query.id);
                          
                          return (
                            <div 
                              key={query.id} 
                              className="p-3 border rounded bg-muted/30"
                              data-testid={`query-${query.id}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{query.queryName}</span>
                                    {queryResults && (
                                      <Badge 
                                        variant={queryResults.documentsFound > 0 ? "default" : "outline"}
                                        className="text-xs"
                                      >
                                        {queryResults.documentsFound} docs
                                      </Badge>
                                    )}
                                  </div>
                                  {query.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{query.description}</p>
                                  )}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingQuery(null);
                                    } else {
                                      setEditingQuery({ 
                                        queryId: query.id, 
                                        sectionId: query.sectionId, 
                                        value: query.booleanQuery 
                                      });
                                    }
                                  }}
                                  data-testid={`button-edit-query-${query.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {isEditing ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editingQuery.value}
                                    onChange={(e) => setEditingQuery({ ...editingQuery, value: e.target.value })}
                                    placeholder="Boolean query (e.g., contract AND NOT amendment)"
                                    className="font-mono text-sm"
                                    rows={3}
                                    data-testid={`textarea-query-${query.id}`}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateQuery.mutate({ 
                                        queryId: query.id, 
                                        booleanQuery: editingQuery.value 
                                      })}
                                      disabled={updateQuery.isPending}
                                      data-testid={`button-save-query-${query.id}`}
                                    >
                                      {updateQuery.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                      )}
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingQuery(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <code className="text-xs bg-muted p-2 rounded block font-mono overflow-x-auto">
                                  {query.booleanQuery}
                                </code>
                              )}
                              
                              {queryResults && queryResults.documents.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <Separator />
                                  <div className="text-xs font-medium text-muted-foreground mb-2">
                                    Matched Documents
                                  </div>
                                  {queryResults.documents.slice(0, 5).map((doc, idx) => (
                                    <div 
                                      key={doc.id || idx} 
                                      className="flex items-start gap-2 p-2 bg-background rounded border"
                                      data-testid={`doc-match-${doc.id || idx}`}
                                    >
                                      <Checkbox
                                        checked={selectedDocuments.has(doc.id)}
                                        onCheckedChange={() => toggleDocument(doc.id)}
                                        className="mt-0.5"
                                      />
                                      {getSourceIcon(doc.source)}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{doc.title}</div>
                                        {doc.path && (
                                          <div className="text-xs text-muted-foreground truncate">{doc.path}</div>
                                        )}
                                        {doc.matchedExcerpts.length > 0 && (
                                          <div className="text-xs mt-1 p-1 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                                            ...{doc.matchedExcerpts[0].text.slice(0, 150)}...
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs">
                                            {doc.source.replace(/_/g, ' ')}
                                          </Badge>
                                          <Badge variant="secondary" className="text-xs">
                                            Score: {doc.relevanceScore.toFixed(2)}
                                          </Badge>
                                          {doc.matchedTerms.slice(0, 3).map((term, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                              {term}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {queryResults.documents.length > 5 && (
                                    <div className="text-xs text-muted-foreground text-center py-1">
                                      + {queryResults.documents.length - 5} more documents
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedDocuments.size > 0 && (
        <Card data-testid="card-selected-documents">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Selected Documents ({selectedDocuments.size})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDocuments(new Set())}
                  data-testid="button-clear-selection"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear
                </Button>
                <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-tag-documents">
                      <Tag className="mr-2 h-4 w-4" />
                      Tag Documents
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tag Selected Documents</DialogTitle>
                      <DialogDescription>
                        Apply a tag to the {selectedDocuments.size} selected documents
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="tag-name">Tag Name</Label>
                      <Input
                        id="tag-name"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="e.g., Material Contract, IP-Related, Review Needed"
                        data-testid="input-tag-name"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={async () => {
                          try {
                            await apiRequest("POST", "/api/dd-boolean-search/documents/tag", {
                              documentIds: Array.from(selectedDocuments),
                              tagName: newTagName,
                              dealId,
                            });
                            toast({ title: "Documents tagged", description: `Applied tag "${newTagName}" to ${selectedDocuments.size} documents` });
                            setTagDialogOpen(false);
                            setNewTagName("");
                            setSelectedDocuments(new Set());
                          } catch (error: any) {
                            toast({ title: "Tagging failed", description: error.message, variant: "destructive" });
                          }
                        }}
                        disabled={!newTagName.trim()}
                        data-testid="button-apply-tag"
                      >
                        Apply Tag
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {searchResults.length > 0 && (
        <Card data-testid="card-search-summary">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Search Results Summary
                </CardTitle>
                <CardDescription>
                  {searchResults.reduce((sum, r) => sum + r.documentsFound, 0)} total documents matched across {searchResults.length} queries
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    runAnalysis.mutate();
                  }}
                  disabled={runAnalysis.isPending}
                  data-testid="button-run-ai-analysis"
                >
                  {runAnalysis.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Run AI Analysis
                    </>
                  )}
                </Button>
                {currentRunId && (
                  <Button
                    onClick={() => downloadPdf(currentRunId)}
                    disabled={isExportingPdf}
                    data-testid="button-export-pdf"
                  >
                    {isExportingPdf ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export PDF
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchResults([]);
                    setSelectedDocuments(new Set());
                    setCurrentRunId(null);
                  }}
                  data-testid="button-clear-results"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Clear Results
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.filter(r => r.documentsFound > 0).map((result) => (
                <div 
                  key={result.queryId}
                  className="p-4 border rounded-lg bg-muted/30"
                  data-testid={`result-card-${result.queryId}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge>{result.sectionName}</Badge>
                    <Badge variant="secondary">{result.documentsFound} docs</Badge>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{result.queryName}</h4>
                  <p className="text-xs text-muted-foreground">
                    {result.documents.slice(0, 2).map(d => d.title).join(", ")}
                    {result.documents.length > 2 && ` +${result.documents.length - 2} more`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
