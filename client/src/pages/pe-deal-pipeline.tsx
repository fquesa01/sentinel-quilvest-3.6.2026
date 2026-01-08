import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Plus, 
  Search, 
  Filter, 
  TrendingUp,
  Building2,
  DollarSign,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Eye,
  Target,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  Activity,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface PEDeal {
  id: string;
  firmId: string | null;
  name: string;
  codeName: string | null;
  status: string;
  dealType: string;
  sector: string;
  subsector: string | null;
  geography: string;
  targetDescription: string | null;
  enterpriseValue: string | null;
  revenue: string | null;
  ebitda: string | null;
  cimReceivedDate: string | null;
  loiSubmittedDate: string | null;
  loiSignedDate: string | null;
  exclusivityStart: string | null;
  exclusivityEnd: string | null;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  dataRoomUrl: string | null;
  dataRoomType: string | null;
  createdAt: string;
  updatedAt: string;
}

const dealStages = [
  { value: "pipeline", label: "Pipeline", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
  { value: "preliminary_review", label: "Preliminary Review", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { value: "management_meeting", label: "Management Meeting", color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300" },
  { value: "loi_submitted", label: "LOI Submitted", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300" },
  { value: "loi_signed", label: "LOI Signed", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  { value: "diligence", label: "Diligence", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  { value: "exclusivity", label: "Exclusivity", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  { value: "definitive_docs", label: "Definitive Docs", color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300" },
  { value: "closed", label: "Closed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { value: "passed", label: "Passed", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
];

const sectors = [
  "Technology", "Healthcare", "Consumer", "Industrials", "Financial Services",
  "Energy", "Real Estate", "Telecom", "Media", "Transportation", "Other"
];

const dealTypes = [
  { value: "platform", label: "Platform" },
  { value: "add_on", label: "Add-on" },
  { value: "carve_out", label: "Carve-out" },
  { value: "growth_equity", label: "Growth Equity" },
  { value: "recap", label: "Recapitalization" },
  { value: "secondary", label: "Secondary" },
];

const stageOrder = dealStages.map(s => s.value);

export default function PEDealPipeline() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"pipeline" | "table">("pipeline");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<PEDeal | null>(null);
  const [newDeal, setNewDeal] = useState({
    name: "",
    sector: "Technology",
    subsector: "",
    geography: "North America",
    status: "pipeline",
    dealType: "platform",
    enterpriseValue: "",
    targetDescription: "",
    expectedCloseDate: "",
  });

  const { data: deals, isLoading } = useQuery<PEDeal[]>({
    queryKey: ["/api/pe/deals"],
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: typeof newDeal) => {
      return apiRequest("POST", "/api/pe/deals", {
        name: data.name,
        sector: data.sector,
        subsector: data.subsector || null,
        geography: data.geography,
        status: data.status,
        dealType: data.dealType,
        enterpriseValue: data.enterpriseValue || null,
        targetDescription: data.targetDescription || null,
        expectedCloseDate: data.expectedCloseDate ? data.expectedCloseDate : null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/pe/deals"] });
      setIsCreateDialogOpen(false);
      setNewDeal({
        name: "",
        sector: "Technology",
        subsector: "",
        geography: "North America",
        status: "pipeline",
        dealType: "platform",
        enterpriseValue: "",
        targetDescription: "",
        expectedCloseDate: "",
      });
      toast({ title: "Deal created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create deal", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest("DELETE", `/api/pe/deals/${dealId}`);
    },
    onSuccess: () => {
      setDealToDelete(null);
      toast({ title: "Deal deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/pe/deals"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete deal", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCreateDeal = () => {
    if (!newDeal.name.trim()) {
      toast({ title: "Please enter a target company name", variant: "destructive" });
      return;
    }
    createDealMutation.mutate(newDeal);
  };

  const filteredDeals = deals?.filter((deal) => {
    const matchesSearch = 
      deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === "all" || deal.status === stageFilter;
    const matchesSector = sectorFilter === "all" || deal.sector === sectorFilter;
    return matchesSearch && matchesStage && matchesSector;
  });

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return "-";
    const num = parseFloat(value);
    if (isNaN(num)) return "-";
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}B`;
    }
    return `$${num.toFixed(0)}M`;
  };

  const getStageInfo = (stage: string) => {
    return dealStages.find(s => s.value === stage) || dealStages[0];
  };

  const getDealsByStage = (stage: string) => {
    return filteredDeals?.filter(d => d.status === stage) || [];
  };

  const activeStages = stageOrder.filter(s => !["passed", "lost"].includes(s));

  const pipelineStats = {
    totalDeals: deals?.length || 0,
    activeDeals: deals?.filter(d => !["closed", "passed", "lost"].includes(d.status)).length || 0,
    closedDeals: deals?.filter(d => d.status === "closed").length || 0,
    totalEV: deals?.reduce((sum, d) => sum + (parseFloat(d.enterpriseValue || "0") || 0), 0) || 0,
    inDueDiligence: deals?.filter(d => d.status === "diligence").length || 0,
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <TrendingUp className="h-6 w-6 text-primary" />
            PE Deal Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline tracking, due diligence management, and institutional memory
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-deal">
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-deals">{pipelineStats.totalDeals}</p>
                <p className="text-xs text-muted-foreground">Total Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-active-deals">{pipelineStats.activeDeals}</p>
                <p className="text-xs text-muted-foreground">Active Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-due-diligence">{pipelineStats.inDueDiligence}</p>
                <p className="text-xs text-muted-foreground">In Due Diligence</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-closed-deals">{pipelineStats.closedDeals}</p>
                <p className="text-xs text-muted-foreground">Closed Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-ev">{formatCurrency(pipelineStats.totalEV.toString())}</p>
                <p className="text-xs text-muted-foreground">Total EV</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-stage-filter">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {dealStages.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-sector-filter">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>
                {sector}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg">
          <Button 
            variant={viewMode === "pipeline" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("pipeline")}
            data-testid="button-view-pipeline"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "table" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "pipeline" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activeStages.map((stage) => {
            const stageInfo = getStageInfo(stage);
            const stageDeals = getDealsByStage(stage);
            return (
              <div key={stage} className="min-w-[280px] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={stageInfo.color}>{stageInfo.label}</Badge>
                    <span className="text-sm text-muted-foreground">({stageDeals.length})</span>
                  </div>
                </div>
                <div className="space-y-3 bg-muted/30 rounded-lg p-3 min-h-[400px]">
                  {stageDeals.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No deals
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <Link key={deal.id} href={`/pe/deals/${deal.id}`}>
                        <Card className="cursor-pointer hover-elevate" data-testid={`card-deal-${deal.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm line-clamp-1" data-testid={`text-deal-name-${deal.id}`}>
                                  {deal.name}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {deal.sector}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {deal.enterpriseValue && (
                                <Badge variant="outline" className="text-xs">
                                  {formatCurrency(deal.enterpriseValue)}
                                </Badge>
                              )}
                              {deal.geography && (
                                <Badge variant="outline" className="text-xs">
                                  {deal.geography}
                                </Badge>
                              )}
                            </div>
                            {deal.expectedCloseDate && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Target: {format(new Date(deal.expectedCloseDate), "MMM d, yyyy")}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target Company</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Deal Type</TableHead>
                <TableHead>Enterprise Value</TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeals?.map((deal) => {
                const stageInfo = getStageInfo(deal.status);
                return (
                  <TableRow key={deal.id} data-testid={`row-deal-${deal.id}`}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{deal.name}</span>
                        {deal.geography && (
                          <span className="text-xs text-muted-foreground ml-2">({deal.geography})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{deal.sector}</TableCell>
                    <TableCell>
                      <Badge className={stageInfo.color}>{stageInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {dealTypes.find(t => t.value === deal.dealType)?.label || deal.dealType}
                    </TableCell>
                    <TableCell>{formatCurrency(deal.enterpriseValue)}</TableCell>
                    <TableCell>
                      {deal.expectedCloseDate 
                        ? format(new Date(deal.expectedCloseDate), "MMM d, yyyy")
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(deal.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/pe/deals/${deal.id}`}>
                        <Button variant="ghost" size="icon" data-testid={`button-view-deal-${deal.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredDeals || filteredDeals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No deals found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Target Company Name *</Label>
              <Input
                id="name"
                value={newDeal.name}
                onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                placeholder="Enter company name"
                data-testid="input-target-company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector *</Label>
              <Select value={newDeal.sector} onValueChange={(v) => setNewDeal({ ...newDeal, sector: v })}>
                <SelectTrigger data-testid="select-sector">
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Deal Stage</Label>
              <Select value={newDeal.status} onValueChange={(v) => setNewDeal({ ...newDeal, status: v })}>
                <SelectTrigger data-testid="select-deal-stage">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {dealStages.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dealType">Deal Type</Label>
              <Select value={newDeal.dealType} onValueChange={(v) => setNewDeal({ ...newDeal, dealType: v })}>
                <SelectTrigger data-testid="select-deal-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {dealTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enterpriseValue">Enterprise Value ($M)</Label>
              <Input
                id="enterpriseValue"
                type="number"
                value={newDeal.enterpriseValue}
                onChange={(e) => setNewDeal({ ...newDeal, enterpriseValue: e.target.value })}
                placeholder="e.g., 500"
                data-testid="input-enterprise-value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geography">Geography</Label>
              <Input
                id="geography"
                value={newDeal.geography}
                onChange={(e) => setNewDeal({ ...newDeal, geography: e.target.value })}
                placeholder="e.g., North America"
                data-testid="input-geography"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedCloseDate">Expected Closing Date</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={newDeal.expectedCloseDate}
                onChange={(e) => setNewDeal({ ...newDeal, expectedCloseDate: e.target.value })}
                data-testid="input-expected-close"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="targetDescription">Target Description</Label>
              <Textarea
                id="targetDescription"
                value={newDeal.targetDescription}
                onChange={(e) => setNewDeal({ ...newDeal, targetDescription: e.target.value })}
                placeholder="Brief description of the target company..."
                rows={3}
                data-testid="input-target-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDeal} 
              disabled={createDealMutation.isPending}
              data-testid="button-submit-deal"
            >
              {createDealMutation.isPending ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!dealToDelete} onOpenChange={() => setDealToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{dealToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => dealToDelete && deleteDealMutation.mutate(dealToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
