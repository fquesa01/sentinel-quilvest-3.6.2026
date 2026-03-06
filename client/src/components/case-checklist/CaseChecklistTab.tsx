import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
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
  EyeOff,
  Trash2,
  Sparkles,
  Users,
  UserCheck,
  Upload,
  RefreshCw,
  Download,
  Pencil,
  Save,
  X,
  StickyNote,
  Paperclip,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
  suggestedSearchTerms?: string[];
  supportingEvidence?: ElementEvidence[];
  contradictingEvidence?: ElementEvidence[];
  neutralEvidence?: ElementEvidence[];
  searchTermLinks?: ElementSearchTerm[];
  handwrittenNotes?: string;
  showSearchTerms?: boolean;
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
  searchTermText?: string;
  searchTermItemId?: string;
  isPrimary?: boolean;
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
  const [isUploading, setIsUploading] = useState(false);
  const [isFindingDocs, setIsFindingDocs] = useState(false);
  const [suggestedDocs, setSuggestedDocs] = useState<DocumentSuggestion[]>([]);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadAndGenerateMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pleadingType", "complaint");
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("filingParty", "plaintiff");
      formData.append("filingStatus", "court_filing");
      
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;

      const uploadRes = await fetch(`/api/cases/${caseId}/court-pleadings`, {
        method: "POST",
        body: formData,
        headers: authHeaders,
      });
      
      if (!uploadRes.ok) {
        throw new Error("Failed to upload document");
      }
      
      const uploadedDoc = await uploadRes.json();
      
      return apiRequest("POST", `/api/cases/${caseId}/checklist/generate`, {
        sourceDocumentId: uploadedDoc.id,
        sourceDocumentType: "court_filing",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "checklist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/court-pleadings", caseId] });
      toast({ title: "Document Uploaded & Analyzed", description: "Causes of action and elements extracted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadAndGenerateMutation.mutate(file, {
        onSettled: () => setIsUploading(false),
      });
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  
  const regenerateChecklistMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("POST", `/api/cases/${caseId}/checklist/regenerate`, {
        sourceDocumentId: documentId,
        sourceDocumentType: "court_filing",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "checklist"] });
      toast({ title: "Checklist Regenerated", description: "Updated with fact-specific search terms for each element." });
      setShowRegenerateDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Regeneration Failed", description: error.message, variant: "destructive" });
    },
  });

  // Upload amended complaint and regenerate (replaces existing checklist)
  const uploadAndRegenerateMutation = useMutation({
    mutationFn: async (file: File) => {
      // First upload the file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pleadingType", "amended_complaint");
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("filingParty", "plaintiff");
      formData.append("filingStatus", "court_filing");
      
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;

      const uploadRes = await fetch(`/api/cases/${caseId}/court-pleadings`, {
        method: "POST",
        body: formData,
        headers: authHeaders,
      });
      
      if (!uploadRes.ok) {
        throw new Error("Failed to upload document");
      }
      
      const uploadedDoc = await uploadRes.json();
      
      return apiRequest("POST", `/api/cases/${caseId}/checklist/regenerate`, {
        sourceDocumentId: uploadedDoc.id,
        sourceDocumentType: "court_filing",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "checklist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/court-pleadings", caseId] });
      toast({ title: "Amended Complaint Uploaded", description: "Checklist regenerated with updated search terms." });
      setShowRegenerateDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
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

  const updateElementMutation = useMutation({
    mutationFn: async (data: { elementId: string; [key: string]: any }) => {
      const { elementId, ...updates } = data;
      return apiRequest("PATCH", `/api/cases/${caseId}/elements/${elementId}`, updates);
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

  // Show all court docket documents for selection
  const courtDocuments = useMemo(() => {
    return courtPleadings || [];
  }, [courtPleadings]);

  // Separate complaints/petitions for prominent display
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
              Generate Checklist from Document
            </CardTitle>
            <CardDescription>
              Upload a document or select from court docket to extract causes of action and required legal elements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Upload Option */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Upload a New Document</p>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isGenerating}
                    data-testid="btn-upload-document"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading & Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    PDF, Word, or text files
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Select from Court Docket */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Select from Court Docket</p>
                {courtDocuments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No documents in court docket. Upload a document above or add files in the Court Docket tab.
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
                      disabled={isGenerating || isUploading}
                    >
                      <SelectTrigger className="w-full max-w-md" data-testid="select-document">
                        <SelectValue placeholder="Select a document to analyze..." />
                      </SelectTrigger>
                      <SelectContent>
                        {complaints.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Complaints & Petitions
                            </div>
                            {complaints.map((doc: any) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                <div className="flex items-center gap-2">
                                  <Scale className="h-4 w-4 text-primary" />
                                  {doc.title}
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {courtDocuments.filter((d: any) => d.pleadingType !== "complaint" && d.pleadingType !== "petition").length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                              Other Documents
                            </div>
                            {courtDocuments
                              .filter((d: any) => d.pleadingType !== "complaint" && d.pleadingType !== "petition")
                              .map((doc: any) => (
                                <SelectItem key={doc.id} value={doc.id}>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {doc.title}
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {doc.pleadingType}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {isGenerating && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing document and extracting legal elements...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {causesOfAction && causesOfAction.length > 0 && (
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {/* Export to Excel Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/api/cases/${caseId}/checklist/export`, "_blank");
              }}
              data-testid="btn-export-checklist"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            
            <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="btn-regenerate-checklist">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate with Search Terms
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Regenerate Checklist</DialogTitle>
                  <DialogDescription>
                    Upload an amended complaint or select an existing document to regenerate the checklist with fact-specific boolean search terms.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Upload New Complaint Option */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Upload Amended Complaint</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsRegenerating(true);
                          uploadAndRegenerateMutation.mutate(file, {
                            onSettled: () => {
                              setIsRegenerating(false);
                            },
                          });
                        }
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="hidden"
                      data-testid="input-regenerate-upload"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isRegenerating}
                      data-testid="btn-upload-amended-complaint"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Complaint
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, or text files
                    </p>
                  </div>

                  {/* Divider */}
                  {complaints.length > 0 && (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-sm text-muted-foreground">or</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      {/* Select Existing Document */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Use Existing Document</p>
                        <Select
                          onValueChange={(docId) => {
                            setIsRegenerating(true);
                            regenerateChecklistMutation.mutate(docId, {
                              onSettled: () => setIsRegenerating(false),
                            });
                          }}
                          disabled={isRegenerating}
                        >
                          <SelectTrigger data-testid="select-regenerate-document">
                            <SelectValue placeholder="Select complaint document..." />
                          </SelectTrigger>
                          <SelectContent>
                            {complaints.map((doc: any) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {isRegenerating && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading & regenerating checklist...
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
                          caseId={caseId}
                          perspective={perspective}
                          isExpanded={expandedElements.has(element.id)}
                          onToggle={() => toggleElement(element.id)}
                          onStrengthChange={(strength) =>
                            updateStrengthMutation.mutate({ elementId: element.id, strength })
                          }
                          onFindDocs={() => findDocumentSuggestions(element)}
                          onRemoveEvidence={(evidenceId) => removeEvidenceMutation.mutate(evidenceId)}
                          onUpdateElement={(updates) => 
                            updateElementMutation.mutate({ elementId: element.id, ...updates })
                          }
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
  caseId: string;
  perspective: "plaintiff" | "defendant";
  isExpanded: boolean;
  onToggle: () => void;
  onStrengthChange: (strength: string) => void;
  onFindDocs: () => void;
  onRemoveEvidence: (evidenceId: string) => void;
  onUpdateElement: (updates: Partial<CaseElement>) => void;
  getStrengthIcon: (strength: string) => JSX.Element;
  getStrengthLabel: (strength: string) => string;
  getClassificationBadge: (classification: string) => JSX.Element;
}

function ElementCard({
  element,
  caseId,
  perspective,
  isExpanded,
  onToggle,
  onStrengthChange,
  onFindDocs,
  onRemoveEvidence,
  onUpdateElement,
  getStrengthIcon,
  getStrengthLabel,
  getClassificationBadge,
}: ElementCardProps) {
  const [showSearchTerms, setShowSearchTerms] = useState(element.showSearchTerms !== false);
  const [editingSearchTerms, setEditingSearchTerms] = useState(false);
  const [localSearchTerms, setLocalSearchTerms] = useState<string[]>(
    Array.isArray(element.suggestedSearchTerms) ? element.suggestedSearchTerms : []
  );
  const [editingNotes, setEditingNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(element.handwrittenNotes || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDocumentUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Upload the file to court pleadings (which stores the document)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pleadingType", "exhibit");
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("filingParty", "plaintiff");
      formData.append("filingStatus", "draft");
      
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;

      const uploadRes = await fetch(`/api/cases/${caseId}/court-pleadings`, {
        method: "POST",
        body: formData,
        headers: authHeaders,
      });
      
      if (!uploadRes.ok) {
        throw new Error("Failed to upload document");
      }
      
      const uploadResult = await uploadRes.json();
      
      // The API returns { success: true, pleading: {...} } format
      const pleading = uploadResult.pleading || uploadResult;
      
      if (!pleading?.id) {
        throw new Error("Upload response did not include document ID");
      }
      
      // Now link this document as evidence to the element
      await apiRequest("POST", `/api/checklist/elements/${element.id}/evidence`, {
        documentType: "exhibit",
        documentId: pleading.id,
        documentTitle: pleading.title || file.name,
        evidenceClassification: "supporting",
      });
      
      // Refresh the checklist data
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "checklist"] });
      
      toast({ 
        title: "Document Attached", 
        description: `${file.name} has been uploaded and linked to this element.` 
      });
    } catch (error) {
      toast({ 
        title: "Upload Failed", 
        description: "Could not upload document. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const supportingEvidence = element.supportingEvidence || [];
  const contradictingEvidence = element.contradictingEvidence || [];
  const neutralEvidence = element.neutralEvidence || [];
  const allEvidence = [...supportingEvidence, ...contradictingEvidence, ...neutralEvidence];

  const perspectiveLabel = perspective === "plaintiff" ? "Elements to Prove" : "Elements to Defend";

  const hasSearchTerms = (element.suggestedSearchTerms && Array.isArray(element.suggestedSearchTerms) && element.suggestedSearchTerms.length > 0) || 
    (element.searchTermLinks && element.searchTermLinks.length > 0);

  const handleToggleSearchTerms = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !showSearchTerms;
    setShowSearchTerms(newValue);
    onUpdateElement({ showSearchTerms: newValue });
  };

  const handleSaveSearchTerms = () => {
    onUpdateElement({ suggestedSearchTerms: localSearchTerms });
    setEditingSearchTerms(false);
    toast({ title: "Search terms updated" });
  };

  const handleSaveNotes = () => {
    onUpdateElement({ handwrittenNotes: localNotes });
    setEditingNotes(false);
    toast({ title: "Notes saved" });
  };

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
              {element.handwrittenNotes && (
                <Badge variant="outline" className="text-xs">
                  <StickyNote className="h-3 w-3 mr-1" />
                  Has Notes
                </Badge>
              )}
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
        
        {/* Search Terms Section - With Toggle & Edit */}
        {hasSearchTerms && showSearchTerms && (
          <div className="px-4 pb-3 border-t bg-muted/30">
            <div className="flex items-start gap-2 pt-2">
              <Search className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                {editingSearchTerms ? (
                  <div className="space-y-2">
                    {localSearchTerms.map((term, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={term}
                          onChange={(e) => {
                            const updated = [...localSearchTerms];
                            updated[idx] = e.target.value;
                            setLocalSearchTerms(updated);
                          }}
                          className="text-xs font-mono h-7"
                          data-testid={`input-search-term-${element.id}-${idx}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setLocalSearchTerms(localSearchTerms.filter((_, i) => i !== idx));
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocalSearchTerms([...localSearchTerms, ""])}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Term
                      </Button>
                      <Button size="sm" onClick={handleSaveSearchTerms}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setLocalSearchTerms(Array.isArray(element.suggestedSearchTerms) ? element.suggestedSearchTerms : []);
                        setEditingSearchTerms(false);
                      }}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {element.suggestedSearchTerms && Array.isArray(element.suggestedSearchTerms) && element.suggestedSearchTerms.length > 0 ? (
                      element.suggestedSearchTerms.map((term: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="text-xs font-mono bg-background rounded px-2 py-1 border text-muted-foreground break-all"
                          data-testid={`search-term-${element.id}-${idx}`}
                        >
                          {term}
                        </div>
                      ))
                    ) : (
                      element.searchTermLinks?.map((link: any) => (
                        <div 
                          key={link.id} 
                          className="text-xs font-mono bg-background rounded px-2 py-1 border text-muted-foreground break-all"
                          data-testid={`search-term-link-${link.id}`}
                        >
                          {link.searchTermText}
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
              {!editingSearchTerms && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSearchTerms(true);
                    }}
                    data-testid={`btn-edit-search-terms-${element.id}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleToggleSearchTerms}
                    data-testid={`btn-hide-search-terms-${element.id}`}
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Show search terms toggle when hidden */}
        {hasSearchTerms && !showSearchTerms && (
          <div className="px-4 pb-2 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={handleToggleSearchTerms}
              data-testid={`btn-show-search-terms-${element.id}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              Show Search Terms
            </Button>
          </div>
        )}

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

            {/* Notes Section */}
            <div className="border rounded-md p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Trial Notes
                </h4>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNotes(true)}
                    data-testid={`btn-edit-notes-${element.id}`}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    {element.handwrittenNotes ? "Edit" : "Add Notes"}
                  </Button>
                )}
              </div>
              
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="Add your trial prep notes, witness questions, or evidence reminders..."
                    className="min-h-[100px]"
                    data-testid={`textarea-notes-${element.id}`}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveNotes} data-testid={`btn-save-notes-${element.id}`}>
                      <Save className="h-3 w-3 mr-1" />
                      Save Notes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocalNotes(element.handwrittenNotes || "");
                        setEditingNotes(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : element.handwrittenNotes ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {element.handwrittenNotes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No notes yet. Click "Add Notes" to add trial preparation notes.
                </p>
              )}
            </div>

            {/* Upload Supporting Documents */}
            <div className="border rounded-md p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attach Documents
                </h4>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleDocumentUpload(file);
                  }
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                data-testid={`input-upload-document-${element.id}`}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid={`btn-upload-document-${element.id}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Upload supporting documents, photos, or evidence to attach to this element
              </p>
            </div>

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
