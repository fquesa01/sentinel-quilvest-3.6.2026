import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  FileSearch, 
  Building, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
  Filter,
  ChevronRight,
  Files,
  RefreshCw,
  Trash2,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BackgroundResearch = {
  id: string;
  dealId: string | null;
  caseId: string | null;
  targetName: string;
  targetWebsite: string | null;
  targetIndustry: string | null;
  targetDescription: string | null;
  researchType: string;
  enabledModules: string[];
  status: "draft" | "processing" | "completed" | "failed";
  progress: number;
  currentStep: string | null;
  executiveSummary: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  keyFindings: any[];
  documentCount: number;
  pageCount: number;
  processingTimeSeconds: number | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
};

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Manufacturing",
  "Real Estate",
  "Energy",
  "Consumer Goods",
  "Retail",
  "Media & Entertainment",
  "Transportation",
  "Professional Services",
  "Telecommunications",
  "Other"
];

const ALL_MODULES = [
  { id: "company_overview", name: "Company Overview", description: "Business description, history, and market position" },
  { id: "key_people", name: "Key People", description: "Executives, board members, and key personnel" },
  { id: "risk_indicators", name: "Risk Indicators", description: "Financial, operational, and legal risks" },
  { id: "financial_analysis", name: "Financial Analysis", description: "Revenue, profitability, and financial health" },
  { id: "material_contracts", name: "Material Contracts", description: "Key agreements and contractual obligations" },
  { id: "litigation_regulatory", name: "Litigation & Regulatory", description: "Lawsuits, investigations, and compliance" },
  { id: "competitive_landscape", name: "Competitive Landscape", description: "Market position and competitors" },
  { id: "ip_technology", name: "IP & Technology", description: "Patents, trademarks, and tech assets" },
  { id: "customer_concentration", name: "Customer Concentration", description: "Revenue concentration and key accounts" },
  { id: "news_media", name: "News & Media", description: "Press coverage and public perception" },
  { id: "business_lines", name: "Business Lines", description: "Products, services, and segments" },
  { id: "contradiction_detection", name: "Contradiction Detection", description: "Inconsistencies across documents" },
];

function getStatusIcon(status: string) {
  switch (status) {
    case "draft":
      return <FileSearch className="h-4 w-4 text-muted-foreground" />;
    case "processing":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function getRiskBadge(riskLevel: string | null) {
  if (!riskLevel) return null;
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };
  return (
    <Badge className={colors[riskLevel] || ""} variant="outline">
      <AlertTriangle className="h-3 w-3 mr-1" />
      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
    </Badge>
  );
}

export default function BackgroundResearchPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newResearch, setNewResearch] = useState({
    targetName: "",
    targetWebsite: "",
    targetIndustry: "",
    targetDescription: "",
    researchType: "full",
    enabledModules: ALL_MODULES.map(m => m.id),
  });

  const { data: researchList, isLoading } = useQuery<BackgroundResearch[]>({
    queryKey: ["/api/background-research"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newResearch) => {
      const res = await apiRequest("/api/background-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/background-research"] });
      setIsNewDialogOpen(false);
      setNewResearch({
        targetName: "",
        targetWebsite: "",
        targetIndustry: "",
        targetDescription: "",
        researchType: "full",
        enabledModules: ALL_MODULES.map(m => m.id),
      });
      toast({ title: "Research project created", description: "You can now upload documents and run analysis." });
      setLocation(`/background-research/${data.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/background-research/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/background-research"] });
      toast({ title: "Research deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredList = researchList?.filter((r) => {
    const matchesSearch = r.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.targetIndustry?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const toggleModule = (moduleId: string) => {
    setNewResearch(prev => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(moduleId)
        ? prev.enabledModules.filter(m => m !== moduleId)
        : [...prev.enabledModules, moduleId]
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <Helmet>
        <title>Background Research | Sentinel Counsel LLP</title>
      </Helmet>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between stagger-1">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Background Research</h1>
            <p className="text-muted-foreground">AI-powered preliminary due diligence for M&A transactions</p>
          </div>
          
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-research">
                <Plus className="h-4 w-4 mr-2" />
                New Research
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Background Research</DialogTitle>
                <DialogDescription>
                  Create a new research project to analyze a target company
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetName">Target Company Name *</Label>
                    <Input
                      id="targetName"
                      data-testid="input-target-name"
                      placeholder="Acme Corporation"
                      value={newResearch.targetName}
                      onChange={(e) => setNewResearch(prev => ({ ...prev, targetName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetWebsite">Website</Label>
                    <Input
                      id="targetWebsite"
                      data-testid="input-target-website"
                      placeholder="https://example.com"
                      value={newResearch.targetWebsite}
                      onChange={(e) => setNewResearch(prev => ({ ...prev, targetWebsite: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetIndustry">Industry</Label>
                  <Select
                    value={newResearch.targetIndustry}
                    onValueChange={(v) => setNewResearch(prev => ({ ...prev, targetIndustry: v }))}
                  >
                    <SelectTrigger data-testid="select-industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetDescription">Description</Label>
                  <Textarea
                    id="targetDescription"
                    data-testid="input-target-description"
                    placeholder="Brief description of the target company..."
                    value={newResearch.targetDescription}
                    onChange={(e) => setNewResearch(prev => ({ ...prev, targetDescription: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Research Type</Label>
                  <div className="flex gap-4">
                    {[
                      { id: "full", name: "Full Analysis", desc: "All 12 modules" },
                      { id: "quick", name: "Quick Scan", desc: "Key modules only" },
                      { id: "custom", name: "Custom", desc: "Select modules" },
                    ].map(type => (
                      <div
                        key={type.id}
                        className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                          newResearch.researchType === type.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover-elevate"
                        }`}
                        onClick={() => {
                          setNewResearch(prev => ({ 
                            ...prev, 
                            researchType: type.id,
                            enabledModules: type.id === "full" 
                              ? ALL_MODULES.map(m => m.id)
                              : type.id === "quick"
                                ? ["company_overview", "key_people", "risk_indicators", "financial_analysis"]
                                : prev.enabledModules
                          }));
                        }}
                        data-testid={`button-type-${type.id}`}
                      >
                        <div className="font-medium">{type.name}</div>
                        <div className="text-sm text-muted-foreground">{type.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {newResearch.researchType === "custom" && (
                  <div className="space-y-2">
                    <Label>Select Modules</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                      {ALL_MODULES.map(mod => (
                        <div
                          key={mod.id}
                          className={`p-2 border rounded cursor-pointer transition-colors ${
                            newResearch.enabledModules.includes(mod.id)
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover-elevate"
                          }`}
                          onClick={() => toggleModule(mod.id)}
                          data-testid={`checkbox-module-${mod.id}`}
                        >
                          <div className="font-medium text-sm">{mod.name}</div>
                          <div className="text-xs text-muted-foreground">{mod.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newResearch)}
                  disabled={!newResearch.targetName || createMutation.isPending}
                  data-testid="button-create-research"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Research
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name or industry..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileSearch className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Research Projects</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" 
                ? "No projects match your filters." 
                : "Create your first background research project to get started."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsNewDialogOpen(true)} data-testid="button-empty-new">
                <Plus className="h-4 w-4 mr-2" />
                New Research
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((research) => (
              <Card key={research.id} className="hover-elevate cursor-pointer group" data-testid={`card-research-${research.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/background-research/${research.id}`}>
                        <CardTitle className="text-lg truncate hover:underline" data-testid={`text-target-name-${research.id}`}>
                          {research.targetName}
                        </CardTitle>
                      </Link>
                      {research.targetIndustry && (
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Building className="h-3 w-3" />
                          {research.targetIndustry}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-menu-${research.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/background-research/${research.id}`)}>
                          <ChevronRight className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {research.status === "completed" && (
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Re-analyze
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Delete research for "${research.targetName}"?`)) {
                              deleteMutation.mutate(research.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(research.status)}
                      <span className="text-sm">{getStatusLabel(research.status)}</span>
                      {research.status === "processing" && research.progress > 0 && (
                        <span className="text-xs text-muted-foreground">({research.progress}%)</span>
                      )}
                    </div>
                    {getRiskBadge(research.riskLevel)}
                  </div>
                  
                  {research.status === "processing" && research.currentStep && (
                    <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                      {research.currentStep}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Files className="h-3 w-3" />
                      {research.documentCount} docs, {research.pageCount} pages
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(research.createdAt), "MMM d")}
                    </div>
                  </div>
                  
                  {research.status === "completed" && research.keyFindings && research.keyFindings.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs font-medium mb-1">Key Findings</div>
                      <div className="space-y-1">
                        {research.keyFindings.slice(0, 2).map((finding: any, i: number) => (
                          <div key={i} className="text-xs text-muted-foreground truncate">
                            <Badge variant="outline" className="mr-1 text-[10px] px-1 py-0">
                              {finding.severity}
                            </Badge>
                            {finding.title}
                          </div>
                        ))}
                        {research.keyFindings.length > 2 && (
                          <div className="text-xs text-primary">+{research.keyFindings.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
