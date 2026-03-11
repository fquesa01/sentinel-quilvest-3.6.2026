import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Plus, 
  Search, 
  Filter, 
  Handshake,
  ArrowLeft,
  Calendar,
  DollarSign,
  ExternalLink,
  Trash2,
  Share2,
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
import { useAuth } from "@/hooks/useAuth";
import { ShareDealDialog } from "@/components/share-deal-dialog";
import { format } from "date-fns";
import type { Deal } from "@shared/schema";

const dealTypes = [
  { group: "M&A / Corporate", value: "ma_asset", label: "M&A (Asset Purchase)" },
  { group: "M&A / Corporate", value: "ma_stock", label: "M&A (Stock Purchase)" },
  { group: "M&A / Corporate", value: "merger", label: "Merger" },
  { group: "M&A / Corporate", value: "investment", label: "Investment" },
  { group: "M&A / Corporate", value: "jv", label: "Joint Venture" },
  { group: "M&A / Corporate", value: "franchise", label: "Franchise" },
  { group: "Residential", value: "residential_financed", label: "Residential Purchase (Financed)" },
  { group: "Residential", value: "residential_cash", label: "Residential Purchase (Cash)" },
  { group: "Residential", value: "refinance", label: "Residential Refinance" },
  { group: "Residential", value: "heloc", label: "HELOC" },
  { group: "Residential", value: "reverse_mortgage", label: "Reverse Mortgage (HECM)" },
  { group: "Residential", value: "new_construction", label: "New Construction Purchase" },
  { group: "Residential", value: "short_sale", label: "Short Sale" },
  { group: "Residential", value: "foreclosure_reo", label: "Foreclosure / REO" },
  { group: "Residential", value: "estate_probate", label: "Estate / Probate Sale" },
  { group: "Residential", value: "real_estate", label: "Real Estate (General)" },
  { group: "Commercial", value: "commercial_financed", label: "Commercial Purchase (Financed)" },
  { group: "Commercial", value: "commercial_cash", label: "Commercial Purchase (Cash)" },
  { group: "Commercial", value: "commercial_refinance", label: "Commercial Refinance" },
  { group: "Commercial", value: "cmbs", label: "CMBS Loan" },
  { group: "Commercial", value: "construction_loan", label: "Construction Loan" },
  { group: "Commercial", value: "ground_lease", label: "Ground Lease" },
  { group: "Commercial", value: "exchange_1031", label: "1031 Exchange" },
  { group: "Commercial", value: "portfolio_bulk", label: "Portfolio / Bulk Acquisition" },
  { group: "Commercial", value: "sale_leaseback", label: "Sale-Leaseback" },
  { group: "Commercial", value: "distressed_asset", label: "Distressed Asset / Note Sale" },
  { group: "Commercial", value: "mixed_use", label: "Mixed-Use Development" },
  { group: "Specialized", value: "debt", label: "Debt Transaction" },
  { group: "Specialized", value: "capital_stack", label: "Multi-Layer Capital Stack" },
  { group: "Specialized", value: "loan_assumption", label: "Loan Assumption" },
  { group: "Specialized", value: "deed_in_lieu", label: "Deed in Lieu of Foreclosure" },
  { group: "Specialized", value: "co_op", label: "Co-op Transfer" },
  { group: "Specialized", value: "reit_contribution", label: "REIT / Fund Contribution" },
  { group: "Specialized", value: "opportunity_zone", label: "Opportunity Zone (QOF)" },
  { group: "Specialized", value: "condo_subdivision", label: "Condo / Subdivision Creation" },
  { group: "Specialized", value: "leasehold_financing", label: "Leasehold Financing" },
  { group: "Specialized", value: "other", label: "Other" },
];

const dealStatuses = [
  { value: "pipeline", label: "Pipeline" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "closed", label: "Closed" },
  { value: "terminated", label: "Terminated" },
];

const dealPriorities = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const statusColors: Record<string, string> = {
  pipeline: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  terminated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export default function TransactionsDeals() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [initParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const createDeal = params.get("createDeal");
    const title = params.get("title");
    const dealType = params.get("dealType");
    return { createDeal: !!createDeal, title, dealType };
  });
  useEffect(() => {
    if (initParams.createDeal) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(() => {
    if (initParams.createDeal && !initParams.title) {
      return true;
    }
    return false;
  });
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [dealToShare, setDealToShare] = useState<Deal | null>(null);
  const [deletedDealIds, setDeletedDealIds] = useState<Set<string>>(new Set());
  const [newDeal, setNewDeal] = useState({
    title: "",
    dealType: "ma_asset",
    status: "active",
    priority: "medium",
    dealValue: "",
    dealCurrency: "USD",
    description: "",
    closingTargetDate: "",
  });

  const { data: deals, isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("shareDeal") && deals && deals.length > 0) {
      window.history.replaceState({}, "", window.location.pathname);
      setDealToShare(deals[0]);
    }
  }, [deals]);

  const createDealMutation = useMutation({
    mutationFn: async (data: typeof newDeal) => {
      return apiRequest("POST", "/api/deals", {
        ...data,
        closingTargetDate: data.closingTargetDate ? new Date(data.closingTargetDate) : null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/transactions/dashboard"] });
      setIsCreateDialogOpen(false);
      setNewDeal({
        title: "",
        dealType: "ma_asset",
        status: "active",
        priority: "medium",
        dealValue: "",
        dealCurrency: "USD",
        description: "",
        closingTargetDate: "",
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

  const autoCreateRef = useRef(false);
  useEffect(() => {
    if (initParams.createDeal && initParams.title?.trim() && !autoCreateRef.current) {
      autoCreateRef.current = true;
      const autoData = {
        title: initParams.title.trim(),
        dealType: initParams.dealType || "ma_asset",
        status: "active",
        priority: "medium",
        dealValue: "",
        dealCurrency: "USD",
        description: "",
        closingTargetDate: "",
      };
      createDealMutation.mutate(autoData);
    }
  }, []);

  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const result = await apiRequest("DELETE", `/api/deals/${dealId}`);
      return { dealId, result };
    },
    onMutate: (dealId) => {
      setDeletedDealIds(prev => new Set([...Array.from(prev), dealId]));
      setDealToDelete(null);
    },
    onSuccess: ({ dealId }) => {
      toast({ title: "Deal deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/dashboard"] });
    },
    onError: (error: any, dealId) => {
      setDeletedDealIds(prev => {
        const next = new Set(Array.from(prev));
        next.delete(dealId);
        return next;
      });
      toast({ 
        title: "Failed to delete deal", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleDeleteDeal = () => {
    if (dealToDelete) {
      deleteDealMutation.mutate(dealToDelete.id);
    }
  };

  const isAdmin = user?.role === "admin";

  const handleCreateDeal = () => {
    if (!newDeal.title.trim()) {
      toast({ title: "Please enter a deal title", variant: "destructive" });
      return;
    }
    createDealMutation.mutate(newDeal);
  };

  const filteredDeals = deals?.filter((deal) => {
    // Exclude locally deleted deals for instant UI feedback
    if (deletedDealIds.has(deal.id)) return false;
    
    const matchesSearch = 
      deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.dealNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
    const matchesType = typeFilter === "all" || deal.dealType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (value: string | null | undefined, currency: string = "USD") => {
    if (!value) return "-";
    const num = parseFloat(value);
    if (isNaN(num)) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="transactions-deals-page">
      <div className="flex items-center justify-between stagger-1">
        <div className="flex items-center gap-3">
          <Link href="/transactions/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Active Deals</h1>
            <p className="text-muted-foreground">
              Manage business transactions and due diligence
            </p>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-deal">
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Deal Title *</Label>
                  <Input
                    id="title"
                    value={newDeal.title}
                    onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                    placeholder="e.g., Acquisition of XYZ Corp"
                    data-testid="input-deal-title"
                  />
                </div>
                <div>
                  <Label>Deal Type</Label>
                  <Select
                    value={newDeal.dealType}
                    onValueChange={(v) => setNewDeal({ ...newDeal, dealType: v })}
                  >
                    <SelectTrigger data-testid="select-deal-type">
                      <SelectValue />
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
                <div>
                  <Label>Status</Label>
                  <Select
                    value={newDeal.status}
                    onValueChange={(v) => setNewDeal({ ...newDeal, status: v })}
                  >
                    <SelectTrigger data-testid="select-deal-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dealStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={newDeal.priority}
                    onValueChange={(v) => setNewDeal({ ...newDeal, priority: v })}
                  >
                    <SelectTrigger data-testid="select-deal-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dealPriorities.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Closing Date</Label>
                  <Input
                    type="date"
                    value={newDeal.closingTargetDate}
                    onChange={(e) => setNewDeal({ ...newDeal, closingTargetDate: e.target.value })}
                    data-testid="input-closing-date"
                  />
                </div>
                <div>
                  <Label>Deal Value</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newDeal.dealValue}
                      onChange={(e) => setNewDeal({ ...newDeal, dealValue: e.target.value })}
                      placeholder="0"
                      className="flex-1"
                      data-testid="input-deal-value"
                    />
                    <Select
                      value={newDeal.dealCurrency}
                      onValueChange={(v) => setNewDeal({ ...newDeal, dealCurrency: v })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newDeal.description}
                    onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                    placeholder="Brief description of the transaction..."
                    rows={3}
                    data-testid="input-deal-description"
                  />
                </div>
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
      </div>

      <div className="flex items-center gap-4 stagger-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or deal number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-deals"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-filter-status">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {dealStatuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48" data-testid="select-filter-type">
            <SelectValue placeholder="Deal Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {dealTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="stagger-3">
        <CardContent className="p-0">
          {filteredDeals && filteredDeals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target Close</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow key={deal.id} data-testid={`row-deal-${deal.id}`}>
                    <TableCell>
                      <div>
                        <Link href={`/transactions/deals/${deal.id}`}>
                          <span className="font-medium hover:underline cursor-pointer">
                            {deal.title}
                          </span>
                        </Link>
                        <div className="text-sm text-muted-foreground">{deal.dealNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {dealTypes.find(t => t.value === deal.dealType)?.label || deal.dealType}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        {formatCurrency(deal.dealValue, deal.dealCurrency || "USD")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[deal.priority || "medium"]}>
                        {deal.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[deal.status || "active"]}>
                        {deal.status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {deal.closingTargetDate ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(deal.closingTargetDate), "MMM d, yyyy")}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/transactions/deals/${deal.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-deal-${deal.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDealToShare(deal)}
                          data-testid={`button-share-deal-${deal.id}`}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setDealToDelete(deal)}
                            disabled={deletedDealIds.has(deal.id) || deleteDealMutation.isPending}
                            data-testid={`button-delete-deal-${deal.id}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Handshake className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">No deals found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first deal to get started"}
              </p>
              {!searchTerm && statusFilter === "all" && typeFilter === "all" && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)} 
                  className="mt-4"
                  data-testid="button-create-first-deal"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Deal
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {dealToShare && (
        <ShareDealDialog
          dealId={dealToShare.id}
          dealTitle={dealToShare.title}
          open={!!dealToShare}
          onOpenChange={(open) => !open && setDealToShare(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!dealToDelete} onOpenChange={(open) => !open && setDealToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{dealToDelete?.title}"? This action cannot be undone and will also delete all associated data including milestones, participants, data rooms, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteDeal}
              disabled={deleteDealMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteDealMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
