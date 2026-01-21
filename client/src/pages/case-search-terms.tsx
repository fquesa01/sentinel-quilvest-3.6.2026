import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FileUp,
  ChevronDown,
  ChevronRight,
  Play,
  PlayCircle,
  Loader2,
  Search,
  FileText,
  Scale,
  Shield,
  Download,
  RefreshCw,
  Trash2,
  Edit,
  Check,
  X,
  Plus,
  Code,
  Pencil,
  Upload,
  FileSpreadsheet,
  Users,
  BarChart3,
  Mail,
  File,
  Table,
  FileBox,
} from "lucide-react";

interface SearchTerm {
  id: string;
  term: string;
  type: "boolean" | "phrase" | "proximity" | "wildcard";
  enabled: boolean;
  aiGenerated: boolean;
  rationale?: string;
}

interface SearchTermItem {
  id: string;
  searchTermSetId: string;
  itemNumber: number;
  itemType: string;
  fullText: string;
  summary: string;
  causeOfAction?: string;
  legalElements?: any[];
  searchTerms: SearchTerm[];
  combinedBooleanString: string;
  executionStatus: string;
  lastExecutedAt?: string;
  documentsMatched: number;
  isPrivilegeCategory: boolean;
  tagName?: string;
}

interface SearchTermSet {
  id: string;
  caseId: string;
  sourceType: string;
  sourceDocumentName?: string;
  name: string;
  description?: string;
  generationStatus: string;
  generationProgress?: number;
  generationError?: string;
  totalRequests?: number;
  documentsTagged?: number;
  lastExecutedAt?: string;
  createdAt: string;
}

export default function CaseSearchTermsPage() {
  const { id: caseId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("discovery");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rfpSets, isLoading: rfpLoading } = useQuery<{ data: SearchTermSet[] }>({
    queryKey: ["/api/cases", caseId, "search-term-sets", "rfp"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/search-term-sets?sourceType=rfp`, { credentials: "include" });
      return res.json();
    },
    enabled: !!caseId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.data) return false;
      const hasProcessing = data.data.some((s) => s.generationStatus === "processing");
      return hasProcessing ? 2000 : false;
    },
  });

  const { data: complaintSets, isLoading: complaintLoading } = useQuery<{ data: SearchTermSet[] }>({
    queryKey: ["/api/cases", caseId, "search-term-sets", "complaint"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/search-term-sets?sourceType=complaint`, { credentials: "include" });
      return res.json();
    },
    enabled: !!caseId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.data) return false;
      const hasProcessing = data.data.some((s) => s.generationStatus === "processing");
      return hasProcessing ? 2000 : false;
    },
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Search className="h-6 w-6" />
              Auto Search Term Generation
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered Boolean search term generation from legal documents
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <div className="border-b px-6 overflow-x-auto">
            <TabsList className="bg-transparent h-12 w-max min-w-full">
              <TabsTrigger
                value="discovery"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                data-testid="tab-discovery-response"
              >
                <FileText className="h-4 w-4 mr-2" />
                Discovery Response
              </TabsTrigger>
              <TabsTrigger
                value="prove-case"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                data-testid="tab-prove-case"
              >
                <Scale className="h-4 w-4 mr-2" />
                Prove Your Case
              </TabsTrigger>
              <TabsTrigger
                value="privilege"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                data-testid="tab-privilege-log"
              >
                <Shield className="h-4 w-4 mr-2" />
                Privilege Log
              </TabsTrigger>
              <TabsTrigger
                value="custom"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                data-testid="tab-custom-search"
              >
                <Search className="h-4 w-4 mr-2" />
                Custom Search
              </TabsTrigger>
              <TabsTrigger
                value="term-comparison"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                data-testid="tab-term-comparison"
              >
                <Scale className="h-4 w-4 mr-2" />
                Term Comparison
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="discovery" className="flex-1 overflow-auto p-6 m-0">
            <DiscoveryResponseTab
              caseId={caseId!}
              sets={rfpSets?.data || []}
              isLoading={rfpLoading}
            />
          </TabsContent>

          <TabsContent value="prove-case" className="flex-1 overflow-auto p-6 m-0">
            <ProveYourCaseTab
              caseId={caseId!}
              sets={complaintSets?.data || []}
              isLoading={complaintLoading}
            />
          </TabsContent>

          <TabsContent value="privilege" className="flex-1 overflow-auto p-6 m-0">
            <PrivilegeLogTab caseId={caseId!} />
          </TabsContent>

          <TabsContent value="custom" className="flex-1 overflow-auto p-6 m-0">
            <CustomSearchTab caseId={caseId!} />
          </TabsContent>

          <TabsContent value="term-comparison" className="flex-1 overflow-auto p-6 m-0">
            <TermComparisonTab caseId={caseId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DiscoveryResponseTab({
  caseId,
  sets,
  isLoading,
}: {
  caseId: string;
  sets: SearchTermSet[];
  isLoading: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<"upload" | "existing">("upload");
  const [selectedPleadingId, setSelectedPleadingId] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch court pleadings for the case
  const { data: pleadingsData, isLoading: pleadingsLoading } = useQuery<CourtPleading[]>({
    queryKey: ["/api/cases", caseId, "court-pleadings"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/court-pleadings`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch court pleadings");
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    enabled: uploadOpen && !!caseId,
  });
  
  const pleadings = pleadingsData ?? [];

  // Sort pleadings: discovery documents first, then alphabetically
  const sortedPleadings = [...pleadings].sort((a, b) => {
    const aIsDiscovery = a.pleadingType === "discovery";
    const bIsDiscovery = b.pleadingType === "discovery";
    if (aIsDiscovery && !bIsDiscovery) return -1;
    if (!aIsDiscovery && bIsDiscovery) return 1;
    return (a.title || "").localeCompare(b.title || "");
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/cases/${caseId}/search-term-sets/upload-rfp`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets"] });
      setUploadOpen(false);
      setSourceMode("upload");
      setSelectedPleadingId("");
      toast({ title: "RFP uploaded", description: "AI is parsing the document..." });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const analyzeExistingMutation = useMutation({
    mutationFn: async (data: { pleadingId: string; name?: string; description?: string }) => {
      const response = await fetch(`/api/cases/${caseId}/search-term-sets/analyze-pleading`, {
        method: "POST",
        body: JSON.stringify({ ...data, sourceType: "rfp" }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to analyze document");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets"] });
      setUploadOpen(false);
      setSourceMode("upload");
      setSelectedPleadingId("");
      toast({ title: "Analysis started", description: "AI is parsing the document..." });
    },
    onError: () => {
      toast({ title: "Analysis failed", variant: "destructive" });
    },
  });

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    uploadMutation.mutate(formData);
  };

  const handleAnalyzeExisting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPleadingId) {
      toast({ title: "Please select a document", variant: "destructive" });
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);
    analyzeExistingMutation.mutate({
      pleadingId: selectedPleadingId,
      name: formData.get("name") as string || undefined,
      description: formData.get("description") as string || undefined,
    });
  };

  const handleDialogClose = (open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      setSourceMode("upload");
      setSelectedPleadingId("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">RFP Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Upload a Request for Production to generate Boolean search terms
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-rfp">
              <FileUp className="h-4 w-4 mr-2" />
              Upload RFP
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Request for Production</DialogTitle>
              <DialogDescription>
                Upload a new document or select an existing one from the Court Docket
              </DialogDescription>
            </DialogHeader>
            
            {/* Source Mode Tabs */}
            <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as "upload" | "existing")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" data-testid="tab-rfp-upload-new">
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload New
                </TabsTrigger>
                <TabsTrigger value="existing" data-testid="tab-rfp-select-existing">
                  <FileText className="h-4 w-4 mr-2" />
                  Court Docket
                </TabsTrigger>
              </TabsList>
              
              {/* Upload New Tab */}
              <TabsContent value="upload" className="mt-4">
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="file">Document File</Label>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      required
                      data-testid="input-rfp-file"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name (optional)</Label>
                    <Input id="name" name="name" placeholder="Analysis name" data-testid="input-rfp-name" />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Notes about this RFP"
                      data-testid="input-rfp-description"
                    />
                  </div>
                  <Button type="submit" disabled={uploadMutation.isPending} className="w-full" data-testid="button-submit-rfp">
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upload & Analyze"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Select Existing Tab */}
              <TabsContent value="existing" className="mt-4">
                <form onSubmit={handleAnalyzeExisting} className="space-y-4">
                  <div>
                    <Label htmlFor="pleading-rfp">Select Document</Label>
                    {pleadingsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading documents...</span>
                      </div>
                    ) : sortedPleadings.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No documents in Court Docket. Upload a document first.
                      </div>
                    ) : (
                      <Select value={selectedPleadingId} onValueChange={setSelectedPleadingId}>
                        <SelectTrigger data-testid="select-rfp-existing-pleading">
                          <SelectValue placeholder="Choose a document..." />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="max-h-[200px]">
                            {sortedPleadings.map((pleading) => (
                              <SelectItem 
                                key={pleading.id} 
                                value={pleading.id}
                                data-testid={`option-rfp-pleading-${pleading.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {pleading.pleadingType}
                                  </Badge>
                                  <span className="truncate">{pleading.title}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="name-existing-rfp">Name (optional)</Label>
                    <Input id="name-existing-rfp" name="name" placeholder="Analysis name" data-testid="input-rfp-existing-name" />
                  </div>
                  <div>
                    <Label htmlFor="description-existing-rfp">Description (optional)</Label>
                    <Textarea
                      id="description-existing-rfp"
                      name="description"
                      placeholder="Notes about this RFP"
                      data-testid="input-rfp-existing-description"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={analyzeExistingMutation.isPending || !selectedPleadingId || sortedPleadings.length === 0} 
                    className="w-full" 
                    data-testid="button-analyze-rfp-existing"
                  >
                    {analyzeExistingMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Analyze Document"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {sets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No RFP Analyses Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload an RFP document to generate search terms automatically
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sets.map((set) => (
            <SearchTermSetCard key={set.id} set={set} caseId={caseId} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CourtPleading {
  id: string;
  title: string;
  pleadingType: string;
  filingDate: string | null;
  extractedText: string | null;
}

function ProveYourCaseTab({
  caseId,
  sets,
  isLoading,
}: {
  caseId: string;
  sets: SearchTermSet[];
  isLoading: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<"upload" | "existing">("upload");
  const [selectedPleadingId, setSelectedPleadingId] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch court pleadings for the case
  const { data: pleadings = [], isLoading: pleadingsLoading } = useQuery<CourtPleading[]>({
    queryKey: ["/api/cases", caseId, "court-pleadings"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/court-pleadings`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch court pleadings");
      return res.json();
    },
    enabled: uploadOpen && !!caseId,
  });

  // Filter to show complaint-type documents first, then others
  const sortedPleadings = [...pleadings].sort((a, b) => {
    const aIsComplaint = a.pleadingType === "complaint";
    const bIsComplaint = b.pleadingType === "complaint";
    if (aIsComplaint && !bIsComplaint) return -1;
    if (!aIsComplaint && bIsComplaint) return 1;
    return (a.title || "").localeCompare(b.title || "");
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/cases/${caseId}/search-term-sets/upload-complaint`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets"] });
      setUploadOpen(false);
      setSourceMode("upload");
      setSelectedPleadingId("");
      toast({ title: "Complaint uploaded", description: "AI is parsing the document..." });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const analyzeExistingMutation = useMutation({
    mutationFn: async (data: { pleadingId: string; name?: string; description?: string }) => {
      const response = await fetch(`/api/cases/${caseId}/search-term-sets/analyze-pleading`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to analyze document");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets"] });
      setUploadOpen(false);
      setSourceMode("upload");
      setSelectedPleadingId("");
      toast({ title: "Analysis started", description: "AI is parsing the document..." });
    },
    onError: () => {
      toast({ title: "Analysis failed", variant: "destructive" });
    },
  });

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    uploadMutation.mutate(formData);
  };

  const handleAnalyzeExisting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPleadingId) {
      toast({ title: "Please select a document", variant: "destructive" });
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);
    analyzeExistingMutation.mutate({
      pleadingId: selectedPleadingId,
      name: formData.get("name") as string || undefined,
      description: formData.get("description") as string || undefined,
    });
  };

  const handleDialogClose = (open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      setSourceMode("upload");
      setSelectedPleadingId("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Complaint Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Upload a complaint to generate search terms for each claim
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-complaint">
              <FileUp className="h-4 w-4 mr-2" />
              Upload Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Complaint for Analysis</DialogTitle>
              <DialogDescription>
                Upload a new document or select an existing one from the Court Docket
              </DialogDescription>
            </DialogHeader>
            
            {/* Source Mode Tabs */}
            <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as "upload" | "existing")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" data-testid="tab-upload-new">
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload New
                </TabsTrigger>
                <TabsTrigger value="existing" data-testid="tab-select-existing">
                  <FileText className="h-4 w-4 mr-2" />
                  Court Docket
                </TabsTrigger>
              </TabsList>
              
              {/* Upload New Tab */}
              <TabsContent value="upload" className="mt-4">
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="file">Document File</Label>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      required
                      data-testid="input-complaint-file"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name (optional)</Label>
                    <Input id="name" name="name" placeholder="Analysis name" data-testid="input-complaint-name" />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Notes about this complaint"
                      data-testid="input-complaint-description"
                    />
                  </div>
                  <Button type="submit" disabled={uploadMutation.isPending} className="w-full" data-testid="button-submit-complaint">
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upload & Analyze"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Select Existing Tab */}
              <TabsContent value="existing" className="mt-4">
                <form onSubmit={handleAnalyzeExisting} className="space-y-4">
                  <div>
                    <Label htmlFor="pleading">Select Document</Label>
                    {pleadingsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading documents...</span>
                      </div>
                    ) : sortedPleadings.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No documents in Court Docket. Upload a document first.
                      </div>
                    ) : (
                      <Select value={selectedPleadingId} onValueChange={setSelectedPleadingId}>
                        <SelectTrigger data-testid="select-existing-pleading">
                          <SelectValue placeholder="Choose a document..." />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="max-h-[200px]">
                            {sortedPleadings.map((pleading) => (
                              <SelectItem 
                                key={pleading.id} 
                                value={pleading.id}
                                data-testid={`option-pleading-${pleading.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {pleading.pleadingType}
                                  </Badge>
                                  <span className="truncate">{pleading.title}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="name-existing">Name (optional)</Label>
                    <Input id="name-existing" name="name" placeholder="Analysis name" data-testid="input-existing-name" />
                  </div>
                  <div>
                    <Label htmlFor="description-existing">Description (optional)</Label>
                    <Textarea
                      id="description-existing"
                      name="description"
                      placeholder="Notes about this complaint"
                      data-testid="input-existing-description"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={analyzeExistingMutation.isPending || !selectedPleadingId || sortedPleadings.length === 0} 
                    className="w-full" 
                    data-testid="button-analyze-existing"
                  >
                    {analyzeExistingMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Analyze Document"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {sets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Complaint Analyses Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a complaint to generate search terms for proving each claim
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sets.map((set) => (
            <SearchTermSetCard key={set.id} set={set} caseId={caseId} />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchTermSetCard({ set, caseId }: { set: SearchTermSet; caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: itemsData, isLoading: itemsLoading } = useQuery<{ data: SearchTermItem[] }>({
    queryKey: ["/api/cases", caseId, "search-term-sets", set.id, "items"],
    queryFn: () =>
      fetch(`/api/cases/${caseId}/search-term-sets/${set.id}/items`).then((r) => r.json()),
    enabled: isOpen,
  });

  const executeAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/cases/${caseId}/search-term-sets/${set.id}/execute-all`
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      const totalTagged = data.data?.reduce((s: number, r: any) => s + r.documentsTagged, 0) || 0;
      toast({
        title: "Searches executed",
        description: `Tagged ${totalTagged} documents`,
      });
    },
    onError: () => {
      toast({ title: "Execution failed", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/cases/${caseId}/search-term-sets/${set.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets"] });
      toast({ title: "Analysis deleted" });
    },
  });

  const statusBadge = () => {
    switch (set.generationStatus) {
      case "processing":
        const progress = set.generationProgress || 0;
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {progress > 0 ? `${progress}%` : "Processing"}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <Check className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <X className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const regularItems = itemsData?.data?.filter((i) => !i.isPrivilegeCategory) || [];
  const privilegeItems = itemsData?.data?.filter((i) => i.isPrivilegeCategory) || [];

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base">{set.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {set.sourceDocumentName} • {set.totalRequests || 0} items
                    {set.documentsTagged ? ` • ${set.documentsTagged} docs tagged` : ""}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">{statusBadge()}</div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {set.generationStatus === "failed" && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-sm text-red-700 dark:text-red-300">
                {set.generationError || "An error occurred during processing"}
              </div>
            )}

            {set.generationStatus === "completed" && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  onClick={() => executeAllMutation.mutate()}
                  disabled={executeAllMutation.isPending}
                  data-testid={`button-execute-all-${set.id}`}
                >
                  {executeAllMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Execute All Searches
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`/api/cases/${caseId}/search-term-sets/${set.id}/export`, "_blank");
                  }}
                  data-testid={`button-export-${set.id}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["/api/cases", caseId, "search-term-sets", set.id, "items"],
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate()}
                  className="text-destructive"
                  data-testid={`button-delete-set-${set.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {itemsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                {regularItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {set.sourceType === "rfp" ? "RFP Requests" : "Claims/Causes of Action"}
                    </h4>
                    {regularItems.map((item) => (
                      <SearchTermItemCard key={item.id} item={item} caseId={caseId} />
                    ))}
                  </div>
                )}

                {privilegeItems.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Privilege Categories
                    </h4>
                    {privilegeItems.map((item) => (
                      <SearchTermItemCard key={item.id} item={item} caseId={caseId} />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function SearchTermItemCard({ item, caseId }: { item: SearchTermItem; caseId: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTerms, setEditingTerms] = useState(false);
  const [editingCombined, setEditingCombined] = useState(false);
  const [localTerms, setLocalTerms] = useState<SearchTerm[]>(item.searchTerms);
  const [combinedQuery, setCombinedQuery] = useState(item.combinedBooleanString || "");
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTerm, setNewTerm] = useState<{ term: string; rationale: string; type: SearchTerm["type"] }>({ term: "", rationale: "", type: "boolean" });
  const [editingTagName, setEditingTagName] = useState(false);
  const [localTagName, setLocalTagName] = useState(item.tagName || "");
  const [savedTagName, setSavedTagName] = useState<string | null>(item.tagName || null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Generate default tag name if not set
  const getDefaultTagName = () => {
    if (item.itemType === "rfp_request") {
      const summary = item.summary?.replace(/^all documents (and communications )?(relating|pertaining) to /i, "").trim() || "";
      const words = summary.split(/\s+/).slice(0, 5).join(" ");
      return `RFP ${item.itemNumber} ${words}`;
    }
    return `Claim ${item.itemNumber} ${item.causeOfAction || ""}`.trim();
  };

  // Use savedTagName (local state after edit) or item.tagName (from server) or generate default
  const displayTagName = savedTagName || item.tagName || getDefaultTagName();

  const executeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/cases/${caseId}/search-term-sets/${item.searchTermSetId}/items/${item.id}/execute`
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      toast({
        title: "Search executed",
        description: `Tagged ${data.data?.documentsTagged || 0} documents`,
      });
    },
    onError: () => {
      toast({ title: "Execution failed", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { searchTerms: SearchTerm[]; combinedBooleanString: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/cases/${caseId}/search-term-sets/${item.searchTermSetId}/items/${item.id}`,
        payload
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      setEditingTerms(false);
      setEditingCombined(false);
      setEditingTermId(null);
      toast({ title: "Search terms updated" });
    },
  });

  const updateTagNameMutation = useMutation({
    mutationFn: async (newTagName: string) => {
      const response = await apiRequest(
        "PATCH",
        `/api/cases/${caseId}/search-term-sets/${item.searchTermSetId}/items/${item.id}`,
        { tagName: newTagName }
      );
      return response.json();
    },
    onSuccess: (_data, newTagName) => {
      // Update local state immediately for instant feedback
      setSavedTagName(newTagName);
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      setEditingTagName(false);
      toast({ title: "Tag name updated" });
    },
    onError: () => {
      toast({ title: "Failed to update tag name", variant: "destructive" });
    },
  });

  const handleSaveTagName = () => {
    const newName = localTagName.trim() || getDefaultTagName();
    updateTagNameMutation.mutate(newName);
  };

  const handleCancelTagName = () => {
    setLocalTagName(item.tagName || "");
    setEditingTagName(false);
  };

  const toggleTerm = (termId: string) => {
    setLocalTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const updateTermText = (termId: string, newText: string) => {
    setLocalTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, term: newText } : t))
    );
  };

  const updateTermRationale = (termId: string, newRationale: string) => {
    setLocalTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, rationale: newRationale } : t))
    );
  };

  const updateTermType = (termId: string, newType: SearchTerm["type"]) => {
    setLocalTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, type: newType } : t))
    );
  };

  const deleteTerm = (termId: string) => {
    setLocalTerms((prev) => prev.filter((t) => t.id !== termId));
  };

  const addNewTerm = () => {
    if (!newTerm.term.trim()) return;
    const id = `custom-${Date.now()}`;
    setLocalTerms((prev) => [
      ...prev,
      {
        id,
        term: newTerm.term.trim(),
        type: newTerm.type,
        enabled: true,
        aiGenerated: false,
        rationale: newTerm.rationale.trim() || undefined,
      },
    ]);
    setNewTerm({ term: "", rationale: "", type: "boolean" });
    setShowAddDialog(false);
  };

  const handleSave = () => {
    const combined = localTerms
      .filter((t) => t.enabled)
      .map((t) => `(${t.term})`)
      .join(" OR ");
    updateMutation.mutate({ searchTerms: localTerms, combinedBooleanString: combined });
  };

  const handleSaveCombined = () => {
    updateMutation.mutate({ searchTerms: localTerms, combinedBooleanString: combinedQuery });
  };

  const handleCancel = () => {
    setLocalTerms(item.searchTerms);
    setCombinedQuery(item.combinedBooleanString || "");
    setEditingTerms(false);
    setEditingCombined(false);
    setEditingTermId(null);
  };

  const statusIcon = () => {
    if (item.executionStatus === "running") {
      return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
    }
    if (item.executionStatus === "completed") {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  return (
    <div
      className={`border rounded-md ${
        item.isPrivilegeCategory ? "border-red-200 dark:border-red-800" : ""
      }`}
    >
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover-elevate"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <div className="font-medium text-sm flex items-center gap-2">
              {item.isPrivilegeCategory ? (
                <Shield className="h-4 w-4 text-red-500" />
              ) : item.itemType === "rfp_request" ? (
                `Request ${item.itemNumber}`
              ) : (
                `Claim ${item.itemNumber}: ${item.causeOfAction || ""}`
              )}
              {item.isPrivilegeCategory && item.summary}
              {statusIcon()}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {localTerms.filter((t) => t.enabled).length} of {localTerms.length} terms
              enabled
              {item.documentsMatched > 0 && ` • ${item.documentsMatched} docs matched`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending}
            data-testid={`button-execute-item-${item.id}`}
          >
            {executeMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.fullText}</div>

          {/* Tag Name Section */}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700">
              Tag
            </Badge>
            {editingTagName ? (
              <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={localTagName}
                  onChange={(e) => setLocalTagName(e.target.value)}
                  placeholder={getDefaultTagName()}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTagName();
                    if (e.key === "Escape") handleCancelTagName();
                  }}
                  data-testid={`input-tag-name-${item.id}`}
                />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleSaveTagName} disabled={updateTagNameMutation.isPending}>
                  {updateTagNameMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCancelTagName}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium">{displayTagName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalTagName(item.tagName || "");
                    setEditingTagName(true);
                  }}
                  data-testid={`button-edit-tag-${item.id}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h5 className="text-sm font-medium">Search Terms</h5>
              <div className="flex gap-1">
                {(editingTerms || editingCombined) ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={editingCombined ? handleSaveCombined : handleSave}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTerms(true)} data-testid="button-edit-terms">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCombined(true)} data-testid="button-edit-combined">
                      <Code className="h-3 w-3 mr-1" />
                      Edit Query
                    </Button>
                  </>
                )}
              </div>
            </div>

            {editingCombined ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Edit the combined Boolean query directly (used for document search)
                </Label>
                <Textarea
                  value={combinedQuery}
                  onChange={(e) => setCombinedQuery(e.target.value)}
                  className="font-mono text-xs min-h-[100px]"
                  placeholder="Enter Boolean query: (term1 OR term2) AND term3"
                  data-testid="textarea-combined-query"
                />
              </div>
            ) : (
              <>
                {editingTerms && (
                  <div className="flex gap-2 pb-2">
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" data-testid="button-add-term">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Term
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Search Term</DialogTitle>
                          <DialogDescription>
                            Add a new Boolean search term to this request
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="new-term">Search Query</Label>
                            <Textarea
                              id="new-term"
                              value={newTerm.term}
                              onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                              placeholder='e.g., ("contract" OR "agreement") AND (breach OR violation)'
                              className="font-mono text-sm"
                              data-testid="input-new-term"
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-type">Term Type</Label>
                            <Select
                              value={newTerm.type}
                              onValueChange={(val) => setNewTerm({ ...newTerm, type: val as SearchTerm["type"] })}
                            >
                              <SelectTrigger data-testid="select-new-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="boolean">Boolean (AND/OR)</SelectItem>
                                <SelectItem value="phrase">Phrase (exact match)</SelectItem>
                                <SelectItem value="proximity">Proximity (w/n)</SelectItem>
                                <SelectItem value="wildcard">Wildcard (*/?)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="new-rationale">Rationale (optional)</Label>
                            <Input
                              id="new-rationale"
                              value={newTerm.rationale}
                              onChange={(e) => setNewTerm({ ...newTerm, rationale: e.target.value })}
                              placeholder="Describe what this term captures"
                              data-testid="input-new-rationale"
                            />
                          </div>
                          <Button onClick={addNewTerm} className="w-full" data-testid="button-confirm-add-term">
                            Add Term
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                <div className="space-y-1">
                  {localTerms.map((term) => (
                    <div
                      key={term.id}
                      className={`flex items-start gap-2 p-2 rounded text-sm ${
                        term.enabled ? "bg-muted/50" : "bg-muted/20 opacity-60"
                      }`}
                    >
                      <Checkbox
                        checked={term.enabled}
                        onCheckedChange={() => editingTerms && toggleTerm(term.id)}
                        disabled={!editingTerms}
                        className="mt-0.5"
                        data-testid={`checkbox-term-${term.id}`}
                      />
                      <div className="flex-1 space-y-1">
                        {editingTerms && editingTermId === term.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={term.term}
                              onChange={(e) => updateTermText(term.id, e.target.value)}
                              className="font-mono text-xs min-h-[60px]"
                              data-testid={`textarea-edit-term-${term.id}`}
                            />
                            <div className="flex gap-2 items-center">
                              <Label className="text-xs shrink-0">Type:</Label>
                              <Select
                                value={term.type}
                                onValueChange={(val) => updateTermType(term.id, val as SearchTerm["type"])}
                              >
                                <SelectTrigger className="h-7 text-xs" data-testid={`select-edit-type-${term.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="phrase">Phrase</SelectItem>
                                  <SelectItem value="proximity">Proximity</SelectItem>
                                  <SelectItem value="wildcard">Wildcard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              value={term.rationale || ""}
                              onChange={(e) => updateTermRationale(term.id, e.target.value)}
                              placeholder="Rationale (optional)"
                              className="text-xs"
                              data-testid={`input-edit-rationale-${term.id}`}
                            />
                            <Button size="sm" variant="ghost" onClick={() => setEditingTermId(null)}>
                              Done
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <code className="text-xs break-all">{term.term}</code>
                              <Badge variant="outline" className="text-[9px] shrink-0">
                                {term.type || "boolean"}
                              </Badge>
                            </div>
                            {term.rationale && (
                              <div className="text-xs text-muted-foreground">{term.rationale}</div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {term.aiGenerated && (
                          <Badge variant="outline" className="text-[10px]">
                            AI
                          </Badge>
                        )}
                        {editingTerms && editingTermId !== term.id && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => setEditingTermId(term.id)}
                              data-testid={`button-inline-edit-${term.id}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive"
                              onClick={() => deleteTerm(term.id)}
                              data-testid={`button-delete-term-${term.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PrivilegeLogTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: logData, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ["/api/cases", caseId, "privilege-log"],
    queryFn: () => fetch(`/api/cases/${caseId}/privilege-log`).then((r) => r.json()),
    enabled: !!caseId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/privilege-log/generate`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "privilege-log"] });
      toast({
        title: "Privilege log generated",
        description: `Created ${data.entriesCreated || 0} entries`,
      });
    },
    onError: () => {
      toast({ title: "Generation failed", variant: "destructive" });
    },
  });

  const handleExport = (format: "xlsx" | "csv") => {
    window.open(`/api/cases/${caseId}/privilege-log/export?format=${format}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const entries = logData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Privilege Log</h2>
          <p className="text-sm text-muted-foreground">
            Auto-generated privilege log from tagged documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-privilege-log"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Generate from Tags
          </Button>
          <Button variant="outline" onClick={() => handleExport("xlsx")} data-testid="button-export-xlsx">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport("csv")} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Privilege Log Entries</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Run privilege searches on your documents first, then generate the privilege log
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Bates #</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Author</th>
                  <th className="text-left p-3 font-medium">Recipients</th>
                  <th className="text-left p-3 font-medium">Privilege</th>
                  <th className="text-left p-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      {entry.batesBegin || "-"}
                      {entry.batesEnd && entry.batesEnd !== entry.batesBegin && ` - ${entry.batesEnd}`}
                    </td>
                    <td className="p-3">{entry.documentDate || "-"}</td>
                    <td className="p-3">{entry.documentType || "-"}</td>
                    <td className="p-3">
                      <div>{entry.author || "-"}</div>
                      {entry.authorTitle && (
                        <div className="text-xs text-muted-foreground">{entry.authorTitle}</div>
                      )}
                    </td>
                    <td className="p-3 max-w-[200px] truncate">
                      {entry.recipients?.join("; ") || "-"}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {formatPrivilegeType(entry.privilegeType)}
                      </Badge>
                    </td>
                    <td className="p-3 max-w-[300px]">
                      <div className="truncate">{entry.privilegeDescription}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

function CustomSearchTab({ caseId }: { caseId: string }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [searchObjective, setSearchObjective] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch custom search sets
  const { data: customSets, isLoading: setsLoading } = useQuery<{ data: SearchTermSet[] }>({
    queryKey: ["/api/cases", caseId, "search-term-sets", "custom"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/search-term-sets?sourceType=custom`, { credentials: "include" });
      return res.json();
    },
    enabled: !!caseId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.data) return false;
      return data.data.some((s) => s.generationStatus === "processing") ? 2000 : false;
    },
  });

  // Create custom search mutation
  const createMutation = useMutation({
    mutationFn: async ({ title, searchObjective }: { title: string; searchObjective: string }) => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/search-term-sets/create-custom`, {
        title,
        searchObjective,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets", "custom"] });
      toast({ title: "Custom search created", description: "AI is generating search terms..." });
      setCreateDialogOpen(false);
      setTitle("");
      setSearchObjective("");
    },
    onError: () => {
      toast({ title: "Failed to create search", variant: "destructive" });
    },
  });

  // Upload reference document mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/cases/${caseId}/search-term-sets/upload-reference`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets", "custom"] });
      toast({ title: "Document uploaded", description: "AI is analyzing for related materials..." });
      setUploadDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !searchObjective.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({ title, searchObjective });
  };

  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    if (!file || file.size === 0) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(formData);
  };

  const sets = customSets?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">Custom Search</h2>
          <p className="text-sm text-muted-foreground">
            Create custom searches by describing what you're looking for, or upload a document to find related materials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-custom-search">
                <Search className="h-4 w-4 mr-2" />
                Create Search
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Custom Search</DialogTitle>
                <DialogDescription>
                  Describe what you're looking for and AI will generate Boolean search terms
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Search Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., CEO Communications"
                    data-testid="input-custom-title"
                  />
                </div>
                <div>
                  <Label htmlFor="objective">What are you looking for?</Label>
                  <Textarea
                    id="objective"
                    value={searchObjective}
                    onChange={(e) => setSearchObjective(e.target.value)}
                    placeholder="Describe what you want to find. Be specific about people, topics, date ranges, or types of documents. AI will generate comprehensive Boolean search terms."
                    rows={5}
                    data-testid="input-custom-objective"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: "All communications between executives about the merger, including emails, memos, and meeting notes from 2024"
                  </p>
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full" data-testid="button-submit-custom-search">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Generate Search Terms"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-upload-reference">
                <FileUp className="h-4 w-4 mr-2" />
                Find Related
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Find Related Documents</DialogTitle>
                <DialogDescription>
                  Upload a document and AI will generate search terms to find all mentions and related materials
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="reference-file">Reference Document</Label>
                  <Input
                    id="reference-file"
                    name="file"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    data-testid="input-reference-file"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a contract, agreement, memo, or any document to find related communications and materials
                  </p>
                </div>
                <div>
                  <Label htmlFor="reference-name">Name (optional)</Label>
                  <Input
                    id="reference-name"
                    name="name"
                    placeholder="Search name"
                    data-testid="input-reference-name"
                  />
                </div>
                <Button type="submit" disabled={uploadMutation.isPending} className="w-full" data-testid="button-submit-reference">
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload & Analyze"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {setsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : sets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Custom Searches Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a custom search by describing what you're looking for, or upload a document to find related materials
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sets.map((set) => (
            <SearchTermSetCard key={set.id} set={set} caseId={caseId} />
          ))}
        </div>
      )}
    </div>
  );
}

interface OpposingCounselSet {
  id: string;
  caseId: string;
  sourceType: string;
  sourceDocumentName?: string;
  name: string;
  description?: string;
  partyName?: string;
  generationStatus: string;
  generationProgress?: number;
  generationError?: string;
  totalRequests?: number;
  documentsTagged?: number;
  lastExecutedAt?: string;
  createdAt: string;
}

interface TermComparisonResult {
  termId: string;
  term: string;
  totalCount: number;
  emailCount: number;
  pdfCount: number;
  wordCount: number;
  excelCount: number;
  otherCount: number;
  executionStatus: string;
  lastExecutedAt?: string;
}

function TermComparisonTab({ caseId }: { caseId: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [manualTerms, setManualTerms] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: opposingSets, isLoading: setsLoading } = useQuery<{ data: OpposingCounselSet[] }>({
    queryKey: ["/api/cases", caseId, "search-term-sets", "opposing_counsel"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/search-term-sets?sourceType=opposing_counsel`, { credentials: "include" });
      return res.json();
    },
    enabled: !!caseId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.data) return false;
      const hasProcessing = data.data.some((s) => s.generationStatus === "processing");
      return hasProcessing ? 2000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/cases/${caseId}/opposing-counsel-terms`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets", "opposing_counsel"] });
      setUploadOpen(false);
      setPartyName("");
      setManualTerms("");
      toast({ title: "Terms uploaded", description: "Opposing counsel terms are being processed" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("partyName", partyName);
    formData.append("uploadMode", uploadMode);
    if (uploadMode === "text") {
      formData.append("manualTerms", manualTerms);
    }
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Opposing Counsel Term Comparison
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload search terms proposed by opposing counsel and compare hit counts across your document collection
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-opposing-terms">
              <Upload className="h-4 w-4 mr-2" />
              Import Terms
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Opposing Counsel Search Terms</DialogTitle>
              <DialogDescription>
                Upload a court filing, Excel spreadsheet, or paste terms directly
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <Label htmlFor="party-name">Party Name</Label>
                <Input
                  id="party-name"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g., Plaintiff, Defendant, DOJ"
                  data-testid="input-party-name"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={uploadMode === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUploadMode("file")}
                  data-testid="button-mode-file"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  type="button"
                  variant={uploadMode === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUploadMode("text")}
                  data-testid="button-mode-text"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Paste Terms
                </Button>
              </div>

              {uploadMode === "file" ? (
                <div>
                  <Label htmlFor="terms-file">Document with Search Terms</Label>
                  <Input
                    id="terms-file"
                    name="file"
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
                    data-testid="input-terms-file"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: Court filings (PDF), Excel spreadsheets, Word documents, CSV, text files
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="manual-terms">Search Terms (one per line)</Label>
                  <Textarea
                    id="manual-terms"
                    value={manualTerms}
                    onChange={(e) => setManualTerms(e.target.value)}
                    placeholder={'fraud OR misrepresent*\n"breach of contract"\ndefendant AND (negligence OR negligent)\n...'}
                    rows={8}
                    data-testid="input-manual-terms"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter Boolean search terms, one per line
                  </p>
                </div>
              )}

              <Button type="submit" disabled={uploadMutation.isPending} className="w-full" data-testid="button-submit-opposing-terms">
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Import & Analyze"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {setsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : opposingSets?.data?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Opposing Counsel Terms Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Import search terms from opposing counsel to compare hit counts and evaluate their discovery requests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {opposingSets?.data?.map((set) => (
            <OpposingCounselSetCard key={set.id} set={set} caseId={caseId} />
          ))}
        </div>
      )}
    </div>
  );
}

function OpposingCounselSetCard({ set, caseId }: { set: OpposingCounselSet; caseId: string }) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: itemsData, isLoading: itemsLoading } = useQuery<{ data: SearchTermItem[] }>({
    queryKey: ["/api/search-term-sets", set.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/search-term-sets/${set.id}/items`, { credentials: "include" });
      return res.json();
    },
    enabled: expanded,
  });

  const { data: comparisonResults, isLoading: resultsLoading } = useQuery<{ data: TermComparisonResult[] }>({
    queryKey: ["/api/search-term-sets", set.id, "comparison-results"],
    queryFn: async () => {
      const res = await fetch(`/api/search-term-sets/${set.id}/comparison-results`, { credentials: "include" });
      return res.json();
    },
    enabled: expanded && set.generationStatus === "completed",
  });

  const executeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/search-term-sets/${set.id}/execute-all`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to execute search terms");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-term-sets", set.id, "comparison-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search-term-sets", set.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets", "opposing_counsel"] });
      toast({ title: "Search complete", description: "All search terms have been executed" });
    },
    onError: (err: Error) => {
      toast({ title: "Execution failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/search-term-sets/${set.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "search-term-sets", "opposing_counsel"] });
      toast({ title: "Deleted", description: "Term set removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const items = itemsData?.data || [];
  const results = comparisonResults?.data || [];

  const totalHits = results.reduce((sum, r) => sum + r.totalCount, 0);
  const totalEmails = results.reduce((sum, r) => sum + r.emailCount, 0);
  const totalPdfs = results.reduce((sum, r) => sum + r.pdfCount, 0);
  const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
  const totalExcels = results.reduce((sum, r) => sum + r.excelCount, 0);
  const totalOthers = results.reduce((sum, r) => sum + r.otherCount, 0);

  return (
    <Card data-testid={`opposing-set-card-${set.id}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {set.name}
                    {set.generationStatus === "processing" && (
                      <Badge variant="outline" className="ml-2">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Processing
                      </Badge>
                    )}
                    {set.generationStatus === "completed" && (
                      <Badge variant="secondary" className="ml-2">
                        {items.length} terms
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {set.sourceDocumentName || "Manual entry"} 
                    {set.lastExecutedAt && ` • Last run: ${new Date(set.lastExecutedAt).toLocaleDateString()}`}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => executeAllMutation.mutate()}
                  disabled={executeAllMutation.isPending || set.generationStatus !== "completed"}
                  data-testid={`button-execute-all-${set.id}`}
                >
                  {executeAllMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Run All
                    </>
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-set-${set.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            {set.generationStatus === "processing" && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">Extracting search terms from document...</p>
                {set.generationProgress !== undefined && set.generationProgress > 0 && (
                  <p className="text-sm font-medium mt-2">{set.generationProgress}% complete</p>
                )}
              </div>
            )}

            {set.generationStatus === "failed" && (
              <div className="text-center py-8 text-destructive">
                <X className="h-8 w-8 mx-auto mb-4" />
                <p className="font-medium">Processing Failed</p>
                <p className="text-sm">{set.generationError || "Unknown error"}</p>
              </div>
            )}

            {set.generationStatus === "completed" && (
              <div className="space-y-4">
                {results.length > 0 && (
                  <div className="grid grid-cols-6 gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{totalHits.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Hits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold flex items-center justify-center gap-1">
                        <Mail className="h-4 w-4" />
                        {totalEmails.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Emails</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold flex items-center justify-center gap-1">
                        <FileText className="h-4 w-4" />
                        {totalPdfs.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">PDFs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold flex items-center justify-center gap-1">
                        <File className="h-4 w-4" />
                        {totalWords.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Word</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold flex items-center justify-center gap-1">
                        <Table className="h-4 w-4" />
                        {totalExcels.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Excel</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold flex items-center justify-center gap-1">
                        <FileBox className="h-4 w-4" />
                        {totalOthers.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Other</div>
                    </div>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Search Term</th>
                        <th className="text-right p-3 font-medium">Total</th>
                        <th className="text-right p-3 font-medium">
                          <span className="flex items-center justify-end gap-1">
                            <Mail className="h-3 w-3" /> Emails
                          </span>
                        </th>
                        <th className="text-right p-3 font-medium">
                          <span className="flex items-center justify-end gap-1">
                            <FileText className="h-3 w-3" /> PDFs
                          </span>
                        </th>
                        <th className="text-right p-3 font-medium">
                          <span className="flex items-center justify-end gap-1">
                            <File className="h-3 w-3" /> Word
                          </span>
                        </th>
                        <th className="text-right p-3 font-medium">
                          <span className="flex items-center justify-end gap-1">
                            <Table className="h-3 w-3" /> Excel
                          </span>
                        </th>
                        <th className="text-right p-3 font-medium">
                          <span className="flex items-center justify-end gap-1">
                            <FileBox className="h-3 w-3" /> Other
                          </span>
                        </th>
                        <th className="text-center p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsLoading || resultsLoading ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-muted-foreground">
                            No terms extracted yet
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => {
                          const result = results.find((r) => r.termId === item.id);
                          return (
                            <tr key={item.id} className="border-t hover-elevate" data-testid={`term-row-${item.id}`}>
                              <td className="p-3">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {item.combinedBooleanString || item.fullText}
                                </code>
                              </td>
                              <td className="text-right p-3 font-medium">
                                {result ? result.totalCount.toLocaleString() : "—"}
                              </td>
                              <td className="text-right p-3">
                                {result ? result.emailCount.toLocaleString() : "—"}
                              </td>
                              <td className="text-right p-3">
                                {result ? result.pdfCount.toLocaleString() : "—"}
                              </td>
                              <td className="text-right p-3">
                                {result ? result.wordCount.toLocaleString() : "—"}
                              </td>
                              <td className="text-right p-3">
                                {result ? result.excelCount.toLocaleString() : "—"}
                              </td>
                              <td className="text-right p-3">
                                {result ? result.otherCount.toLocaleString() : "—"}
                              </td>
                              <td className="text-center p-3">
                                {item.executionStatus === "completed" ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    <Check className="h-3 w-3 mr-1" />
                                    Done
                                  </Badge>
                                ) : item.executionStatus === "running" ? (
                                  <Badge variant="outline">
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Running
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Pending</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {results.length > 0 && (
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" data-testid={`button-export-results-${set.id}`}>
                      <Download className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function formatPrivilegeType(type: string): string {
  const labels: Record<string, string> = {
    attorney_client: "A-C Privilege",
    work_product: "Work Product",
    work_product_opinion: "Work Product (Opinion)",
    common_interest: "Common Interest",
    joint_defense: "Joint Defense",
    deliberative_process: "Deliberative",
    other: "Other",
  };
  return labels[type] || type;
}
