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
          <div className="border-b px-6">
            <TabsList className="bg-transparent h-12">
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({ title: "RFP uploaded", description: "AI is parsing the document..." });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    uploadMutation.mutate(formData);
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
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-rfp">
              <FileUp className="h-4 w-4 mr-2" />
              Upload RFP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Request for Production</DialogTitle>
              <DialogDescription>
                Upload a PDF, Word, or text file containing the RFP document
              </DialogDescription>
            </DialogHeader>
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({ title: "Complaint uploaded", description: "AI is parsing the document..." });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    uploadMutation.mutate(formData);
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
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-complaint">
              <FileUp className="h-4 w-4 mr-2" />
              Upload Complaint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Complaint</DialogTitle>
              <DialogDescription>
                Upload a PDF, Word, or text file containing the complaint
              </DialogDescription>
            </DialogHeader>
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
          <div className="text-sm text-muted-foreground">{item.summary || item.fullText}</div>

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
