import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown,
  ChevronRight,
  FileUp,
  Loader2,
  Scale,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Circle,
  Link,
  Search,
  FileText,
  Plus,
  Eye,
  Trash2,
  Sparkles,
  Users,
  UserCheck,
} from "lucide-react";

interface CauseOfAction {
  id: string;
  caseId: string;
  claimNumber: number;
  claimName: string;
  claimType: string;
  statutoryBasis?: string;
  jurisdiction?: string;
  overallStrength: number;
  elementsTotal: number;
  elementsSatisfied: number;
  criticalGaps: number;
  elements?: CaseElement[];
}

interface CaseElement {
  id: string;
  caseId: string;
  causeOfActionId: string;
  elementNumber: number;
  elementName: string;
  elementDescription: string;
  legalStandard?: string;
  strengthAssessment: string;
  supportingEvidence?: ElementEvidence[];
  contradictingEvidence?: ElementEvidence[];
  neutralEvidence?: ElementEvidence[];
  searchTermLinks?: ElementSearchTerm[];
  evidenceCounts?: {
    supporting: number;
    contradicting: number;
    neutral: number;
  };
}

interface ElementEvidence {
  id: string;
  elementId: string;
  documentId?: string;
  documentType: string;
  documentTitle?: string;
  evidenceClassification: "supporting" | "contradicting" | "neutral";
  excerpt?: string;
  excerptLocation?: string;
  attorneyNotes?: string;
  confidenceScore?: number;
  aiGenerated?: boolean;
  isKeyEvidence?: boolean;
  isVerified?: boolean;
  createdAt?: string;
}

interface ElementSearchTerm {
  id: string;
  elementId: string;
  searchTerm: string;
  termType: string;
  aiGenerated: boolean;
}

interface DocumentSuggestion {
  documentId: string;
  documentType: string;
  documentTitle: string;
  documentDate?: string;
  classification: string;
  confidence: number;
  excerpt: string;
  reasoning: string;
}

interface CaseChecklistTabProps {
  caseId: string;
}

export function CaseChecklistTab({ caseId }: CaseChecklistTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [perspective, setPerspective] = useState<"plaintiff" | "defendant">("plaintiff");
  const [expandedCauses, setExpandedCauses] = useState<Set<string>>(new Set());
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [selectedElement, setSelectedElement] = useState<CaseElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFindingDocs, setIsFindingDocs] = useState(false);
  const [suggestedDocs, setSuggestedDocs] = useState<DocumentSuggestion[]>([]);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);

  const { data: causesOfAction, isLoading } = useQuery<CauseOfAction[]>({
    queryKey: ["/api/cases", caseId, "checklist"],
  });

  const { data: courtPleadings } = useQuery<any[]>({
    queryKey: ["/api/court-pleadings", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/court-pleadings?caseId=${caseId}`, { credentials: "include" });
      return res.json();
    },
  });

  const generateChecklistMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("POST", `/api/cases/${caseId}/checklist/generate`, {
        sourceDocumentId: documentId,
        sourceDocumentType: "court_filing",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "checklist"] });
      toast({ title: "Checklist Generated", description: "Causes of action and elements extracted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateStrengthMutation = useMutation({
    mutationFn: async ({ elementId, strength }: { elementId: string; strength: string }) => {
      return apiRequest("PATCH", `/api/checklist/elements/${elementId}/strength`, {
        strengthAssessment: strength,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "checklist"] });
    },
  });

  const linkEvidenceMutation = useMutation({
    mutationFn: async (data: {
      elementId: string;
      documentId: string;
      documentType: string;
      documentTitle?: string;
      evidenceClassification: string;
      excerpt?: string;
      attorneyNotes?: string;
      confidenceScore?: number;
      aiGenerated?: boolean;
    }) => {
      return apiRequest("POST", `/api/checklist/elements/${data.elementId}/evidence`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "checklist"] });
      toast({ title: "Evidence Linked", description: "Document added to element evidence." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Link", description: error.message, variant: "destructive" });
    },
  });

  const removeEvidenceMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      return apiRequest("DELETE", `/api/checklist/evidence/${evidenceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "checklist"] });
    },
  });

  const findDocumentSuggestions = async (element: CaseElement) => {
    setSelectedElement(element);
    setIsFindingDocs(true);
    setShowSuggestionsDialog(true);

    try {
      const res = await fetch(`/api/checklist/elements/${element.id}/suggestions?caseId=${caseId}`, {
        credentials: "include",
      });
      const data = await res.json();
      setSuggestedDocs(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to find related documents", variant: "destructive" });
    } finally {
      setIsFindingDocs(false);
    }
  };

  const toggleCause = (id: string) => {
    setExpandedCauses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleElement = (id: string) => {
    setExpandedElements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStrengthIcon = (strength: string) => {
    switch (strength) {
      case "strong":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "moderate":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "weak":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "critical_gap":
        return <XCircle className="h-4 w-4 text-red-700" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStrengthLabel = (strength: string) => {
    const labels: Record<string, string> = {
      not_evaluated: "Not Evaluated",
      strong: "Strong",
      moderate: "Moderate",
      weak: "Weak",
      critical_gap: "Critical Gap",
    };
    return labels[strength] || "Unknown";
  };

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case "supporting":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Supporting</Badge>;
      case "contradicting":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Contradicting</Badge>;
      default:
        return <Badge variant="secondary">Neutral</Badge>;
    }
  };

  const complaints = useMemo(() => {
    return (courtPleadings || []).filter(
      (p: any) => p.pleadingType === "complaint" || p.pleadingType === "petition"
    );
  }, [courtPleadings]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Case Checklist</h2>
          <p className="text-muted-foreground">
            Track causes of action, legal elements, and evidence strength
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Perspective:</span>
            <Select value={perspective} onValueChange={(v) => setPerspective(v as "plaintiff" | "defendant")}>
              <SelectTrigger className="w-40" data-testid="select-perspective">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plaintiff">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Plaintiff
                  </div>
                </SelectItem>
                <SelectItem value="defendant">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Defendant
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {(!causesOfAction || causesOfAction.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Generate Checklist from Complaint
            </CardTitle>
            <CardDescription>
              Select a complaint or petition to extract causes of action and required legal elements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {complaints.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No complaints found. Upload a complaint in the Court Docket tab first.
              </p>
            ) : (
              <div className="space-y-4">
                <Select
                  onValueChange={(docId) => {
                    setIsGenerating(true);
                    generateChecklistMutation.mutate(docId, {
                      onSettled: () => setIsGenerating(false),
                    });
                  }}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-full max-w-md" data-testid="select-complaint">
                    <SelectValue placeholder="Select a complaint to analyze..." />
                  </SelectTrigger>
                  <SelectContent>
                    {complaints.map((doc: any) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {doc.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing complaint and extracting legal elements...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {causesOfAction && causesOfAction.length > 0 && (
        <div className="space-y-4">
          {causesOfAction.map((coa) => (
            <Card key={coa.id} data-testid={`coa-card-${coa.id}`}>
              <Collapsible
                open={expandedCauses.has(coa.id)}
                onOpenChange={() => toggleCause(coa.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover-elevate">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedCauses.has(coa.id) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{coa.claimName}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{coa.claimType}</Badge>
                            {coa.statutoryBasis && <span className="text-xs">{coa.statutoryBasis}</span>}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {coa.elements?.length || 0} elements
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {coa.elements?.map((element, idx) => (
                        <ElementCard
                          key={element.id}
                          element={element}
                          perspective={perspective}
                          isExpanded={expandedElements.has(element.id)}
                          onToggle={() => toggleElement(element.id)}
                          onStrengthChange={(strength) =>
                            updateStrengthMutation.mutate({ elementId: element.id, strength })
                          }
                          onFindDocs={() => findDocumentSuggestions(element)}
                          onRemoveEvidence={(evidenceId) => removeEvidenceMutation.mutate(evidenceId)}
                          getStrengthIcon={getStrengthIcon}
                          getStrengthLabel={getStrengthLabel}
                          getClassificationBadge={getClassificationBadge}
                        />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI-Suggested Documents
            </DialogTitle>
            <DialogDescription>
              Documents potentially relevant to: {selectedElement?.elementName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[50vh]">
            {isFindingDocs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Searching case documents...</span>
              </div>
            ) : suggestedDocs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No related documents found
              </p>
            ) : (
              <div className="space-y-3 pr-4">
                {suggestedDocs.map((doc, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{doc.documentTitle}</span>
                          <Badge variant="outline" className="text-xs">{doc.documentType}</Badge>
                        </div>
                        {doc.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            "{doc.excerpt}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{doc.reasoning}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs">Confidence: {Math.round(doc.confidence * 100)}%</span>
                          <Badge
                            className={
                              doc.classification === "supporting"
                                ? "bg-green-100 text-green-800"
                                : doc.classification === "contradicting"
                                ? "bg-red-100 text-red-800"
                                : ""
                            }
                            variant={doc.classification === "neutral" ? "secondary" : "default"}
                          >
                            {doc.classification}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (selectedElement) {
                            linkEvidenceMutation.mutate({
                              elementId: selectedElement.id,
                              documentId: doc.documentId,
                              documentType: doc.documentType,
                              documentTitle: doc.documentTitle,
                              evidenceClassification: doc.classification as any,
                              excerpt: doc.excerpt,
                              attorneyNotes: doc.reasoning,
                              confidenceScore: doc.confidence,
                              aiGenerated: true,
                            });
                          }
                        }}
                        data-testid={`btn-link-doc-${idx}`}
                      >
                        <Link className="h-4 w-4 mr-1" />
                        Link
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ElementCardProps {
  element: CaseElement;
  perspective: "plaintiff" | "defendant";
  isExpanded: boolean;
  onToggle: () => void;
  onStrengthChange: (strength: string) => void;
  onFindDocs: () => void;
  onRemoveEvidence: (evidenceId: string) => void;
  getStrengthIcon: (strength: string) => JSX.Element;
  getStrengthLabel: (strength: string) => string;
  getClassificationBadge: (classification: string) => JSX.Element;
}

function ElementCard({
  element,
  perspective,
  isExpanded,
  onToggle,
  onStrengthChange,
  onFindDocs,
  onRemoveEvidence,
  getStrengthIcon,
  getStrengthLabel,
  getClassificationBadge,
}: ElementCardProps) {
  const supportingEvidence = element.supportingEvidence || [];
  const contradictingEvidence = element.contradictingEvidence || [];
  const neutralEvidence = element.neutralEvidence || [];
  const allEvidence = [...supportingEvidence, ...contradictingEvidence, ...neutralEvidence];

  const perspectiveLabel = perspective === "plaintiff" ? "Elements to Prove" : "Elements to Defend";

  return (
    <div
      className="border rounded-md bg-card"
      data-testid={`element-card-${element.id}`}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover-elevate flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <div className="flex items-center gap-2">
                {getStrengthIcon(element.strengthAssessment)}
                <span className="font-medium">{element.elementName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {supportingEvidence.length > 0 && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  {supportingEvidence.length} supporting
                </Badge>
              )}
              {contradictingEvidence.length > 0 && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                  {contradictingEvidence.length} contradicting
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            <div>
              <p className="text-sm text-muted-foreground">{element.elementDescription}</p>
            </div>

            {element.legalStandard && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-1">
                  <Scale className="h-3 w-3" />
                  Legal Standard
                </h4>
                <p className="text-sm text-muted-foreground">{element.legalStandard}</p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Strength:</span>
                <Select
                  value={element.strengthAssessment}
                  onValueChange={onStrengthChange}
                >
                  <SelectTrigger className="w-36" data-testid={`select-strength-${element.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_evaluated">Not Evaluated</SelectItem>
                    <SelectItem value="strong">Strong</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="weak">Weak</SelectItem>
                    <SelectItem value="critical_gap">Critical Gap</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onFindDocs}
                data-testid={`btn-find-docs-${element.id}`}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Find Related Documents
              </Button>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" data-testid={`tab-evidence-all-${element.id}`}>
                  All ({allEvidence.length})
                </TabsTrigger>
                <TabsTrigger value="supporting" data-testid={`tab-evidence-supporting-${element.id}`}>
                  Supporting ({supportingEvidence.length})
                </TabsTrigger>
                <TabsTrigger value="contradicting" data-testid={`tab-evidence-contradicting-${element.id}`}>
                  Contradicting ({contradictingEvidence.length})
                </TabsTrigger>
                <TabsTrigger value="neutral" data-testid={`tab-evidence-neutral-${element.id}`}>
                  Neutral ({neutralEvidence.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-3">
                <EvidenceList
                  evidence={allEvidence}
                  onRemove={onRemoveEvidence}
                  getClassificationBadge={getClassificationBadge}
                />
              </TabsContent>
              <TabsContent value="supporting" className="mt-3">
                <EvidenceList
                  evidence={supportingEvidence}
                  onRemove={onRemoveEvidence}
                  getClassificationBadge={getClassificationBadge}
                />
              </TabsContent>
              <TabsContent value="contradicting" className="mt-3">
                <EvidenceList
                  evidence={contradictingEvidence}
                  onRemove={onRemoveEvidence}
                  getClassificationBadge={getClassificationBadge}
                />
              </TabsContent>
              <TabsContent value="neutral" className="mt-3">
                <EvidenceList
                  evidence={neutralEvidence}
                  onRemove={onRemoveEvidence}
                  getClassificationBadge={getClassificationBadge}
                />
              </TabsContent>
            </Tabs>

            {element.searchTermLinks && element.searchTermLinks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Search className="h-3 w-3" />
                  Search Terms
                </h4>
                <div className="flex flex-wrap gap-1">
                  {element.searchTermLinks.map((term: ElementSearchTerm) => (
                    <Badge key={term.id} variant="outline" className="text-xs">
                      {term.searchTerm}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface EvidenceListProps {
  evidence: ElementEvidence[];
  onRemove: (id: string) => void;
  getClassificationBadge: (classification: string) => JSX.Element;
}

function EvidenceList({ evidence, onRemove, getClassificationBadge }: EvidenceListProps) {
  if (evidence.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No evidence linked yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {evidence.map((ev) => (
        <div
          key={ev.id}
          className="flex items-start justify-between p-3 border rounded-md bg-muted/30"
          data-testid={`evidence-item-${ev.id}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4" />
              <span className="font-medium text-sm">{ev.documentTitle || "Document"}</span>
              {getClassificationBadge(ev.evidenceClassification)}
              {ev.aiGenerated && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            {ev.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2">"{ev.excerpt}"</p>
            )}
            {ev.attorneyNotes && (
              <p className="text-xs text-muted-foreground mt-1">{ev.attorneyNotes}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(ev.id)}
            data-testid={`btn-remove-evidence-${ev.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
