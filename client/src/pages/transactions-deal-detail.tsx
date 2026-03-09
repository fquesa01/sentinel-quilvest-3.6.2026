import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  Plus,
  Trash2,
  Target,
  Briefcase,
  Flag,
  FolderOpen,
  X,
  Search,
  ListChecks,
  FileSearch,
  Scale,
  BarChart3,
  ClipboardCheck,
  FileStack,
  Sparkles,
  Loader2,
  Send,
  Upload,
  Download,
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  ExternalLink,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Deal, DealMilestone, DealParticipant } from "@shared/schema";
import { format } from "date-fns";

type DealWithRelations = Deal & {
  participants?: DealParticipant[];
  milestones?: DealMilestone[];
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  closed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  terminated: "bg-red-500/20 text-red-400 border-red-500/30",
  on_hold: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const dealTypeLabels: Record<string, string> = {
  ma_asset_purchase: "M&A (Asset Purchase)",
  ma_stock_purchase: "M&A (Stock Purchase)",
  ma_merger: "M&A (Merger)",
  financing_debt: "Financing (Debt)",
  financing_equity: "Financing (Equity)",
  joint_venture: "Joint Venture",
  licensing: "Licensing",
  real_estate: "Real Estate",
  restructuring: "Restructuring",
  other: "Other",
};

export default function TransactionsDealDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Deal>>({});
  
  // Party/Entity/Advisor add dialog states
  const [addDialogType, setAddDialogType] = useState<"buyerParties" | "sellerParties" | "targetEntities" | "advisors" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemRole, setNewItemRole] = useState("");
  
  // Milestone dialog states
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<DealMilestone | null>(null);
  const [isCreateDataRoomOpen, setIsCreateDataRoomOpen] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    targetDate: "",
    milestoneType: "custom" as string,
    status: "pending" as string,
  });

  const { data: deal, isLoading, error, refetch: refetchDeal } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
  });

  const { data: milestones = [] } = useQuery<DealMilestone[]>({
    queryKey: ["/api/deals", id, "milestones"],
    enabled: !!id,
  });

  const { data: participants = [] } = useQuery<DealParticipant[]>({
    queryKey: ["/api/deals", id, "participants"],
    enabled: !!id,
  });

  const { data: dataRooms = [] } = useQuery<any[]>({
    queryKey: ["/api/data-rooms"],
    select: (rooms) => rooms.filter((r: any) => r.dealId === id),
  });

  const [isDealTypeDismissed, setIsDealTypeDismissed] = useState(false);

  const updateDealMutation = useMutation({
    mutationFn: async (data: Partial<Deal>) => {
      const res = await apiRequest("PATCH", `/api/deals/${id}`, data);
      return res.json();
    },
    onSuccess: async () => {
      // Directly refetch the deal data to update UI
      await refetchDeal();
      toast({ title: "Deal updated", description: "Changes have been saved." });
      setIsEditOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update deal.", variant: "destructive" });
    },
  });

  // Mutation for adding party/entity/advisor
  const addItemMutation = useMutation({
    mutationFn: async ({ type, updatedItems }: { type: string; updatedItems: any[] }) => {
      const res = await apiRequest("PATCH", `/api/deals/${id}`, { [type]: updatedItems });
      return res.json();
    },
    onSuccess: async () => {
      // Directly refetch the deal data to update UI
      await refetchDeal();
      toast({ title: "Added successfully", description: "The item has been added." });
      setAddDialogType(null);
      setNewItemName("");
      setNewItemRole("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add item.", variant: "destructive" });
    },
  });

  // Helper to add a party/entity/advisor
  const handleAddItem = () => {
    if (!addDialogType || !newItemName.trim() || !deal) return;
    
    const newItem = addDialogType === "advisors" 
      ? { name: newItemName.trim(), role: newItemRole.trim() || undefined }
      : { name: newItemName.trim() };
    
    // Compute the updated array
    const currentItems = (deal[addDialogType] as any[]) || [];
    const updatedItems = [...currentItems, newItem];
    
    addItemMutation.mutate({ type: addDialogType, updatedItems });
  };

  // Mutation for removing party/entity/advisor
  const removeItemMutation = useMutation({
    mutationFn: async ({ type, updatedItems }: { type: string; updatedItems: any[] }) => {
      const res = await apiRequest("PATCH", `/api/deals/${id}`, { [type]: updatedItems });
      return res.json();
    },
    onSuccess: async () => {
      // Directly refetch the deal data to update UI
      await refetchDeal();
      toast({ title: "Removed", description: "The item has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove item.", variant: "destructive" });
    },
  });

  // Helper to remove a party/entity/advisor
  const handleRemoveItem = (type: "buyerParties" | "sellerParties" | "targetEntities" | "advisors", index: number) => {
    if (!deal) return;
    
    // Compute the updated array
    const currentItems = [...((deal[type] as any[]) || [])];
    currentItems.splice(index, 1);
    
    removeItemMutation.mutate({ type, updatedItems: currentItems });
  };

  const extractPartiesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${id}/extract-parties`);
      return res.json();
    },
    onSuccess: async (data: any) => {
      await refetchDeal();
      const added = data.totalAdded || 0;
      const found = data.totalFound || 0;
      const desc = added > 0
        ? `Added ${added} new ${added === 1 ? "party" : "parties"} (${found} found in documents).`
        : found > 0
          ? `Found ${found} ${found === 1 ? "party" : "parties"} but all were already listed.`
          : "No parties could be identified in the documents.";
      toast({ title: "Party Extraction Complete", description: desc });
    },
    onError: (error: any) => {
      toast({ title: "Extraction Failed", description: error.message || "Could not extract parties from documents.", variant: "destructive" });
    },
  });

  // Dialog title labels
  const dialogLabels: Record<string, string> = {
    buyerParties: "Buyer Party",
    sellerParties: "Seller Party",
    targetEntities: "Target Entity",
    advisors: "Advisor",
  };

  // Milestone mutations
  const addMilestoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/deals/${id}/milestones`, data);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Milestone added", description: "The milestone has been created." });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "milestones"] });
      closeMilestoneDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add milestone.", variant: "destructive" });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, data }: { milestoneId: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/deals/${id}/milestones/${milestoneId}`, data);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Milestone updated", description: "Changes have been saved." });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "milestones"] });
      closeMilestoneDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update milestone.", variant: "destructive" });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await apiRequest("DELETE", `/api/deals/${id}/milestones/${milestoneId}`);
      return res.json();
    },
    onMutate: async (milestoneId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/deals", id, "milestones"] });
      
      // Snapshot the previous value
      const previousMilestones = queryClient.getQueryData<DealMilestone[]>(["/api/deals", id, "milestones"]);
      
      // Optimistically remove the milestone
      if (previousMilestones) {
        queryClient.setQueryData<DealMilestone[]>(
          ["/api/deals", id, "milestones"],
          previousMilestones.filter(m => m.id !== milestoneId)
        );
      }
      
      return { previousMilestones };
    },
    onSuccess: () => {
      toast({ title: "Milestone deleted", description: "The milestone has been removed." });
    },
    onError: (_err, _milestoneId, context) => {
      // Rollback on error
      if (context?.previousMilestones) {
        queryClient.setQueryData(["/api/deals", id, "milestones"], context.previousMilestones);
      }
      toast({ title: "Error", description: "Failed to delete milestone.", variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "milestones"] });
    },
  });

  // Data room creation mutation
  const createDataRoomMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", `/api/deals/${id}/data-rooms`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/data-rooms"] });
      setIsCreateDataRoomOpen(false);
      toast({
        title: "Data room created",
        description: "The virtual data room has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create data room",
        variant: "destructive",
      });
    },
  });

  const applyDetectedTypeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${id}/apply-detected-type`);
      return res.json();
    },
    onSuccess: async (data) => {
      await refetchDeal();
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "checklists"] });
      toast({
        title: "Deal type applied",
        description: data.message || "Deal type has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply deal type.",
        variant: "destructive",
      });
    },
  });

  const dismissDetectedTypeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${id}/dismiss-detected-type`);
      return res.json();
    },
    onSuccess: async () => {
      setIsDealTypeDismissed(true);
      await refetchDeal();
      toast({ title: "Suggestion dismissed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to dismiss suggestion.", variant: "destructive" });
    },
  });

  // Milestone dialog helpers
  const openAddMilestoneDialog = () => {
    setEditingMilestone(null);
    setMilestoneForm({
      title: "",
      description: "",
      targetDate: "",
      milestoneType: "custom",
      status: "pending",
    });
    setMilestoneDialogOpen(true);
  };

  const openEditMilestoneDialog = (milestone: DealMilestone) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description || "",
      targetDate: milestone.targetDate ? format(new Date(milestone.targetDate), "yyyy-MM-dd'T'HH:mm") : "",
      milestoneType: milestone.milestoneType || "custom",
      status: milestone.status || "pending",
    });
    setMilestoneDialogOpen(true);
  };

  const closeMilestoneDialog = () => {
    setMilestoneDialogOpen(false);
    setEditingMilestone(null);
    setMilestoneForm({
      title: "",
      description: "",
      targetDate: "",
      milestoneType: "custom",
      status: "pending",
    });
  };

  const handleSaveMilestone = () => {
    if (!milestoneForm.title.trim()) return;
    
    const data = {
      title: milestoneForm.title.trim(),
      description: milestoneForm.description.trim() || null,
      targetDate: milestoneForm.targetDate ? new Date(milestoneForm.targetDate).toISOString() : null,
      milestoneType: milestoneForm.milestoneType,
      status: milestoneForm.status,
    };

    if (editingMilestone) {
      updateMilestoneMutation.mutate({ milestoneId: editingMilestone.id, data });
    } else {
      addMilestoneMutation.mutate(data);
    }
  };

  // Calendar link generators
  const generateGoogleCalendarUrl = (milestone: DealMilestone) => {
    if (!milestone.targetDate) return null;
    const date = new Date(milestone.targetDate);
    const startDate = format(date, "yyyyMMdd'T'HHmmss");
    const endDate = format(new Date(date.getTime() + 60 * 60 * 1000), "yyyyMMdd'T'HHmmss"); // 1 hour duration
    const title = encodeURIComponent(`${deal?.title || "Deal"} - ${milestone.title}`);
    const details = encodeURIComponent(milestone.description || "");
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
  };

  const generateOutlookCalendarUrl = (milestone: DealMilestone) => {
    if (!milestone.targetDate) return null;
    const date = new Date(milestone.targetDate);
    const startDate = date.toISOString();
    const endDate = new Date(date.getTime() + 60 * 60 * 1000).toISOString();
    const title = encodeURIComponent(`${deal?.title || "Deal"} - ${milestone.title}`);
    const body = encodeURIComponent(milestone.description || "");
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&body=${body}`;
  };

  const milestoneTypeLabels: Record<string, string> = {
    signing: "Signing",
    closing: "Closing",
    due_diligence: "Due Diligence",
    regulatory: "Regulatory Approval",
    financing: "Financing",
    custom: "Other",
  };

  const milestoneStatusLabels: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    delayed: "Delayed",
    cancelled: "Cancelled",
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load deal details</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return "—";
    const num = parseFloat(value.replace(/[^0-9.-]/g, ""));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: deal.dealCurrency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return format(new Date(date), "MMM d, yyyy");
  };

  const openEditDialog = () => {
    setEditForm({
      title: deal.title,
      description: deal.description,
      dealValue: deal.dealValue,
      status: deal.status,
      priority: deal.priority,
    });
    setIsEditOpen(true);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between stagger-1">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/transactions/deals")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold" data-testid="text-deal-title">{deal.title}</h1>
                <Badge variant="outline" className={statusColors[deal.status || "active"]}>
                  {deal.status?.replace("_", " ") || "Active"}
                </Badge>
                <Badge variant="outline" className={priorityColors[deal.priority || "medium"]}>
                  {deal.priority || "Medium"} Priority
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {deal.dealNumber} • {dealTypeLabels[deal.dealType] || deal.dealType}
              </p>
            </div>
          </div>
          <Button onClick={openEditDialog} data-testid="button-edit-deal">
            <Edit className="h-4 w-4 mr-2" />
            Edit Deal
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="stagger-2">
          <div className="md:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger data-testid="select-tab-mobile" aria-label="Select deal section">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="terms">Deal Terms</SelectItem>
                <SelectItem value="parties">Parties</SelectItem>
                <SelectItem value="milestones">Milestones</SelectItem>
                <SelectItem value="dataroom">Data Room</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="checklists">Checklists</SelectItem>
                <SelectItem value="issues">Issues</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
                <SelectItem value="reports">Reports</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden md:inline-flex flex-nowrap overflow-x-auto scrollbar-thin max-w-full gap-1 pb-0.5">
            <TabsTrigger value="overview" className="flex-shrink-0" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="terms" className="flex-shrink-0" data-testid="tab-terms">Deal Terms</TabsTrigger>
            <TabsTrigger value="parties" className="flex-shrink-0" data-testid="tab-parties">Parties</TabsTrigger>
            <TabsTrigger value="milestones" className="flex-shrink-0" data-testid="tab-milestones">Milestones</TabsTrigger>
            <TabsTrigger value="dataroom" className="flex-shrink-0" data-testid="tab-dataroom">Data Room</TabsTrigger>
            <TabsTrigger value="documents" className="flex-shrink-0" data-testid="tab-documents">Documents</TabsTrigger>
            <TabsTrigger value="checklists" className="flex-shrink-0" data-testid="tab-checklists">Checklists</TabsTrigger>
            <TabsTrigger value="issues" className="flex-shrink-0" data-testid="tab-issues">Issues</TabsTrigger>
            <TabsTrigger value="research" className="flex-shrink-0" data-testid="tab-research">Research</TabsTrigger>
            <TabsTrigger value="closing" className="flex-shrink-0" data-testid="tab-closing">Closing</TabsTrigger>
            <TabsTrigger value="reports" className="flex-shrink-0" data-testid="tab-reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6 stagger-3">
            {(() => {
              const settings = (deal.settings || {}) as Record<string, any>;
              const detectedType = settings.detectedDealType;
              const confidence = settings.detectedConfidence;
              const reason = settings.detectedReason;
              const confirmed = settings.dealTypeConfirmed;
              const detectedLabel: Record<string, string> = {
                debt: "Debt Financing",
                equity: "Equity / Investment",
                real_estate: "Real Estate",
              };
              if (detectedType && !confirmed && !isDealTypeDismissed) {
                return (
                  <Card className="border-primary/40" data-testid="card-detected-deal-type">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Sparkles className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium" data-testid="text-detected-type-label">
                              AI detected this as a <span className="text-primary">{detectedLabel[detectedType] || detectedType}</span> transaction
                            </p>
                            {reason && (
                              <p className="text-sm text-muted-foreground mt-1" data-testid="text-detected-type-reason">{reason}</p>
                            )}
                            {confidence && (
                              <Badge variant="outline" className="mt-2" data-testid="badge-detected-confidence">
                                {Math.round(confidence * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dismissDetectedTypeMutation.mutate()}
                            disabled={dismissDetectedTypeMutation.isPending || applyDetectedTypeMutation.isPending}
                            data-testid="button-dismiss-detected-type"
                          >
                            {dismissDetectedTypeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applyDetectedTypeMutation.mutate()}
                            disabled={applyDetectedTypeMutation.isPending || dismissDetectedTypeMutation.isPending}
                            data-testid="button-apply-detected-type"
                          >
                            {applyDetectedTypeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                            Apply
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Deal Value</p>
                      <p className="text-xl font-semibold" data-testid="text-deal-value">
                        {formatCurrency(deal.dealValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Calendar className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Target Close</p>
                      <p className="text-xl font-semibold" data-testid="text-target-close">
                        {formatDate(deal.closingTargetDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Participants</p>
                      <p className="text-xl font-semibold">{participants.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Flag className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Milestones</p>
                      <p className="text-xl font-semibold">{milestones.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Deal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Deal Type</Label>
                      <p className="font-medium">{dealTypeLabels[deal.dealType] || deal.dealType}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Sub-Type</Label>
                      <p className="font-medium">{deal.subType || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Currency</Label>
                      <p className="font-medium">{deal.dealCurrency || "USD"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Structure</Label>
                      <p className="font-medium">{deal.dealStructure || "—"}</p>
                    </div>
                  </div>
                  {deal.description && (
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="mt-1">{deal.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Key Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">LOI Date</span>
                      <span className="font-medium">{formatDate(deal.loiDate)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Signing Target</span>
                      <span className="font-medium">{formatDate(deal.signingTargetDate)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Closing Target</span>
                      <span className="font-medium">{formatDate(deal.closingTargetDate)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Exclusivity Expires</span>
                      <span className="font-medium">{formatDate(deal.exclusivityExpiration)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{formatDate(deal.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(deal.overallRiskScore !== null && deal.overallRiskScore !== undefined) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-bold ${
                      deal.overallRiskScore > 70 ? "text-red-500" :
                      deal.overallRiskScore > 40 ? "text-yellow-500" : "text-green-500"
                    }`}>
                      {deal.overallRiskScore}
                    </div>
                    <div>
                      <p className="font-medium">
                        {deal.overallRiskScore > 70 ? "High Risk" :
                         deal.overallRiskScore > 40 ? "Medium Risk" : "Low Risk"}
                      </p>
                      <p className="text-sm text-muted-foreground">Overall risk score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      Deal Terms
                    </CardTitle>
                    <CardDescription>
                      Manage extracted or manually entered deal terms for document generation
                    </CardDescription>
                  </div>
                  <Link href={`/transactions/deals/${id}/terms`}>
                    <Button data-testid="button-manage-terms">
                      <FileText className="h-4 w-4 mr-2" />
                      Manage Terms
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Deal terms can be extracted from an uploaded LOI or Term Sheet using AI, or entered manually. 
                  These terms are used to automatically generate transaction documents like Purchase & Sale Agreements, 
                  Deeds, and Closing Certificates.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parties" className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">Manage the parties involved in this transaction.</p>
              <Button
                variant="outline"
                onClick={() => extractPartiesMutation.mutate()}
                disabled={extractPartiesMutation.isPending}
                data-testid="button-extract-parties"
              >
                {extractPartiesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {extractPartiesMutation.isPending ? "Extracting..." : "Extract Parties from Documents"}
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Buyer Parties</CardTitle>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setAddDialogType("buyerParties")}
                    data-testid="button-add-buyer-party"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {Array.isArray(deal.buyerParties) && deal.buyerParties.length > 0 ? (
                    <div className="space-y-2">
                      {deal.buyerParties.map((party: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 group">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{typeof party === "string" ? party : party.name || "Unknown"}</span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0 invisible group-hover:visible"
                            onClick={() => handleRemoveItem("buyerParties", i)}
                            data-testid={`button-delete-buyer-party-${i}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No buyer parties added</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Seller Parties</CardTitle>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setAddDialogType("sellerParties")}
                    data-testid="button-add-seller-party"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {Array.isArray(deal.sellerParties) && deal.sellerParties.length > 0 ? (
                    <div className="space-y-2">
                      {deal.sellerParties.map((party: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 group">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{typeof party === "string" ? party : party.name || "Unknown"}</span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0 invisible group-hover:visible"
                            onClick={() => handleRemoveItem("sellerParties", i)}
                            data-testid={`button-delete-seller-party-${i}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No seller parties added</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Target Entities</CardTitle>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setAddDialogType("targetEntities")}
                    data-testid="button-add-target-entity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {Array.isArray(deal.targetEntities) && deal.targetEntities.length > 0 ? (
                    <div className="space-y-2">
                      {deal.targetEntities.map((entity: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 group">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{typeof entity === "string" ? entity : entity.name || "Unknown"}</span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0 invisible group-hover:visible"
                            onClick={() => handleRemoveItem("targetEntities", i)}
                            data-testid={`button-delete-target-entity-${i}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No target entities added</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Advisors</CardTitle>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setAddDialogType("advisors")}
                    data-testid="button-add-advisor"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {Array.isArray(deal.advisors) && deal.advisors.length > 0 ? (
                    <div className="space-y-2">
                      {deal.advisors.map((advisor: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 group">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <span className="truncate">{typeof advisor === "string" ? advisor : advisor.name || "Unknown"}</span>
                              {advisor.role && (
                                <span className="text-muted-foreground text-sm ml-2">({advisor.role})</span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0 invisible group-hover:visible"
                            onClick={() => handleRemoveItem("advisors", i)}
                            data-testid={`button-delete-advisor-${i}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No advisors added</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {participants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Deal Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {participants.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">{p.userId?.charAt(0).toUpperCase() || "?"}</span>
                          </div>
                          <div>
                            <p className="font-medium">{p.userId}</p>
                            <p className="text-sm text-muted-foreground">{p.role}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{p.role}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="milestones" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Deal Milestones</CardTitle>
                  <Button size="sm" onClick={openAddMilestoneDialog} data-testid="button-add-milestone">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {milestones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Flag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No milestones defined for this deal</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={openAddMilestoneDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Milestone
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {milestones.map((m: DealMilestone) => {
                      const googleUrl = generateGoogleCalendarUrl(m);
                      const outlookUrl = generateOutlookCalendarUrl(m);
                      return (
                        <div key={m.id} className="group relative flex items-start gap-4 p-4 rounded-lg border" data-testid={`milestone-item-${m.id}`}>
                          <div className={`p-2 rounded-full ${
                            m.status === "completed" ? "bg-green-500/20" :
                            m.status === "in_progress" ? "bg-blue-500/20" :
                            m.status === "delayed" ? "bg-red-500/20" : "bg-muted"
                          }`}>
                            {m.status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : m.status === "delayed" ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="font-medium">{m.title}</h4>
                              <div className="flex items-center gap-2">
                                {m.milestoneType && (
                                  <Badge variant="secondary">
                                    {milestoneTypeLabels[m.milestoneType] || m.milestoneType}
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  {milestoneStatusLabels[m.status || "pending"] || m.status?.replace("_", " ") || "Pending"}
                                </Badge>
                              </div>
                            </div>
                            {m.description && (
                              <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                            )}
                            {m.targetDate && (
                              <p className="text-sm text-muted-foreground mt-2">
                                Target: {format(new Date(m.targetDate), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            )}
                            {m.targetDate && (
                              <div className="flex items-center gap-2 mt-3">
                                {googleUrl && (
                                  <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" data-testid={`button-google-calendar-${m.id}`}>
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Google Calendar
                                    </Button>
                                  </a>
                                )}
                                {outlookUrl && (
                                  <a href={outlookUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" data-testid={`button-outlook-calendar-${m.id}`}>
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Outlook
                                    </Button>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="invisible group-hover:visible flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditMilestoneDialog(m)}
                              data-testid={`button-edit-milestone-${m.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMilestoneMutation.mutate(m.id)}
                              data-testid={`button-delete-milestone-${m.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dataroom" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Data Rooms</CardTitle>
                  <Button size="sm" onClick={() => setIsCreateDataRoomOpen(true)} data-testid="button-create-data-room">
                    <Plus className="h-4 w-4 mr-2" />
                    New Data Room
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dataRooms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No data rooms for this deal</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsCreateDataRoomOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Data Room
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dataRooms.map((room: any) => (
                      <Link key={room.id} href={`/transactions/data-rooms/${room.id}`}>
                        <div className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer" data-testid={`dataroom-card-${room.id}`}>
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">{room.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {room.folderCount || 0} folders • {room.documentCount || 0} documents
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{room.status}</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DocumentSearchTab dealId={id!} />
          </TabsContent>

          <TabsContent value="checklists" className="mt-6">
            <ChecklistsTab dealId={id!} dealTitle={deal.title} />
          </TabsContent>

          <TabsContent value="issues" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Issue Tracker</CardTitle>
                    <CardDescription>Track and manage deal-related issues</CardDescription>
                  </div>
                  <Button size="sm" data-testid="button-new-issue">
                    <Plus className="h-4 w-4 mr-2" />
                    New Issue
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No issues logged for this deal</p>
                  <p className="text-sm mt-1">Track due diligence findings and concerns here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="research" className="mt-6">
            <BackgroundResearchTab dealId={id!} />
          </TabsContent>

          <TabsContent value="closing" className="mt-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="text-lg">Closing Management</CardTitle>
                  <CardDescription>Manage closing conditions and deliverables</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Closing checklist not yet created</p>
                  <p className="text-sm mt-1">Create a closing checklist from the Checklists tab</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <InvestmentMemoSection dealId={id!} dealTitle={deal.title} dealSettings={(deal.settings || {}) as Record<string, any>} onDealRefetch={refetchDeal} />
          </TabsContent>
        </Tabs>

        {/* Add Party/Entity/Advisor Dialog */}
        <Dialog open={!!addDialogType} onOpenChange={(open) => { if (!open) { setAddDialogType(null); setNewItemName(""); setNewItemRole(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add {addDialogType ? dialogLabels[addDialogType] : ""}</DialogTitle>
              <DialogDescription>
                Enter the name{addDialogType === "advisors" ? " and role" : ""} to add a new {addDialogType ? dialogLabels[addDialogType].toLowerCase() : ""}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`Enter ${addDialogType ? dialogLabels[addDialogType].toLowerCase() : ""} name`}
                  data-testid="input-new-item-name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItemName.trim()) {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                />
              </div>
              {addDialogType === "advisors" && (
                <div className="space-y-2">
                  <Label>Role (optional)</Label>
                  <Input
                    value={newItemRole}
                    onChange={(e) => setNewItemRole(e.target.value)}
                    placeholder="e.g., Legal Counsel, Investment Bank"
                    data-testid="input-new-item-role"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newItemName.trim()) {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAddDialogType(null); setNewItemName(""); setNewItemRole(""); }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={!newItemName.trim() || addItemMutation.isPending}
                data-testid="button-confirm-add-item"
              >
                {addItemMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  data-testid="input-edit-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  data-testid="input-edit-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deal Value</Label>
                  <Input
                    value={editForm.dealValue || ""}
                    onChange={(e) => setEditForm({ ...editForm, dealValue: e.target.value })}
                    placeholder="e.g., 500000"
                    data-testid="input-edit-value"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status || "active"}
                    onValueChange={(v) => setEditForm({ ...editForm, status: v as any })}
                  >
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={editForm.priority || "medium"}
                  onValueChange={(v) => setEditForm({ ...editForm, priority: v as any })}
                >
                  <SelectTrigger data-testid="select-edit-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => updateDealMutation.mutate(editForm)}
                disabled={updateDealMutation.isPending}
                data-testid="button-save-deal"
              >
                {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Data Room Dialog */}
        <Dialog open={isCreateDataRoomOpen} onOpenChange={setIsCreateDataRoomOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Data Room</DialogTitle>
              <DialogDescription>
                Create a new virtual data room for this deal.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createDataRoomMutation.mutate({
                name: formData.get("name") as string,
                description: formData.get("description") as string,
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Name *</Label>
                  <Input
                    id="room-name"
                    name="name"
                    placeholder="e.g., Project Alpha Data Room"
                    required
                    data-testid="input-dataroom-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-description">Description</Label>
                  <Textarea
                    id="room-description"
                    name="description"
                    placeholder="Optional description..."
                    rows={3}
                    data-testid="input-dataroom-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDataRoomOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDataRoomMutation.isPending} data-testid="button-create-dataroom-submit">
                  {createDataRoomMutation.isPending ? "Creating..." : "Create Data Room"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Milestone Dialog */}
        <Dialog open={milestoneDialogOpen} onOpenChange={(open) => { if (!open) closeMilestoneDialog(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMilestone ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
              <DialogDescription>
                {editingMilestone ? "Update the milestone details below." : "Create a new milestone for this deal."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  placeholder="e.g., Due Diligence Complete"
                  data-testid="input-milestone-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  placeholder="Optional details about this milestone"
                  rows={3}
                  data-testid="input-milestone-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={milestoneForm.milestoneType}
                    onValueChange={(v) => setMilestoneForm({ ...milestoneForm, milestoneType: v })}
                  >
                    <SelectTrigger data-testid="select-milestone-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="signing">Signing</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                      <SelectItem value="due_diligence">Due Diligence</SelectItem>
                      <SelectItem value="regulatory">Regulatory Approval</SelectItem>
                      <SelectItem value="financing">Financing</SelectItem>
                      <SelectItem value="custom">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={milestoneForm.status}
                    onValueChange={(v) => setMilestoneForm({ ...milestoneForm, status: v })}
                  >
                    <SelectTrigger data-testid="select-milestone-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={milestoneForm.targetDate}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
                  data-testid="input-milestone-target-date"
                />
                <p className="text-xs text-muted-foreground">
                  Set a date to enable Google Calendar and Outlook integration
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeMilestoneDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveMilestone}
                disabled={!milestoneForm.title.trim() || addMilestoneMutation.isPending || updateMilestoneMutation.isPending}
                data-testid="button-save-milestone"
              >
                {(addMilestoneMutation.isPending || updateMilestoneMutation.isPending) ? "Saving..." : (editingMilestone ? "Save Changes" : "Add Milestone")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}

// Document Search Tab Component
function DocumentSearchTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5" />
          AI Document Search
        </CardTitle>
        <CardDescription>
          Search across all documents in this deal's data rooms using AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1"
              data-testid="input-document-search"
            />
            <Button type="submit" disabled={searchMutation.isPending || !searchQuery.trim()} data-testid="button-search-documents">
              {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </form>

        {searchMutation.data && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Answer
              </h4>
              <p className="text-sm whitespace-pre-wrap">{searchMutation.data.answer}</p>
            </div>
            {searchMutation.data.documents?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Related Documents</h4>
                <div className="space-y-2">
                  {searchMutation.data.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 rounded border">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!searchMutation.data && !searchMutation.isPending && (
          <div className="text-center py-8 text-muted-foreground">
            <FileSearch className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Search across all documents in this deal</p>
            <p className="text-sm mt-1">Use natural language to find contracts, clauses, and key information</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Checklists Tab Component
function ChecklistsTab({ dealId, dealTitle }: { dealId: string; dealTitle: string }) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [, navigate] = useLocation();
  const [checklistType, setChecklistType] = useState("legal");

  const { data: checklists = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/deals", dealId, "checklists"],
    enabled: !!dealId,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/deal-templates"],
  });

  const createChecklistMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; checklistType?: string }) => {
      return apiRequest("POST", `/api/deals/${dealId}/checklists`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "checklists"] });
      setIsCreateOpen(false);
      toast({
        title: "Checklist created",
        description: "The due diligence checklist has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checklist",
        variant: "destructive",
      });
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("POST", `/api/deals/${dealId}/apply-template/${templateId}`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "checklists"] });
      setIsApplyTemplateOpen(false);
      setSelectedTemplateId("");
      toast({
        title: "Template applied",
        description: "The checklist has been created from the template.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply template",
        variant: "destructive",
      });
    },
  });

  const checklistTypes = [
    { value: "legal", label: "Legal Due Diligence" },
    { value: "financial", label: "Financial Due Diligence" },
    { value: "tax", label: "Tax Due Diligence" },
    { value: "operational", label: "Operational Due Diligence" },
    { value: "hr", label: "HR & Employment" },
    { value: "ip", label: "Intellectual Property" },
    { value: "environmental", label: "Environmental" },
    { value: "regulatory", label: "Regulatory Compliance" },
    { value: "technology", label: "Technology & IT" },
    { value: "closing", label: "Closing Checklist" },
  ];

  if (isLoading) {
    return <Skeleton className="h-[300px]" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Due Diligence Checklists</CardTitle>
              <CardDescription>Track tasks and progress for this deal</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsApplyTemplateOpen(true)} data-testid="button-apply-template">
                <FileStack className="h-4 w-4 mr-2" />
                Apply Template
              </Button>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} data-testid="button-new-checklist">
                <Plus className="h-4 w-4 mr-2" />
                New Checklist
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {checklists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No checklists for this deal</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Checklist
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {checklists.map((checklist: any) => (
                <div
                  key={checklist.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => navigate(`/transactions/deal-checklists/${checklist.id}`)}
                  data-testid={`checklist-card-${checklist.id}`}
                >
                  <div className="flex items-center gap-3">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{checklist.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {checklist.completedItems || 0} / {checklist.totalItems || 0} items complete
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={checklist.totalItems ? (checklist.completedItems / checklist.totalItems) * 100 : 0} className="w-24" />
                    <Badge variant="outline">{checklist.checklistType || "General"}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Checklist</DialogTitle>
            <DialogDescription>
              Create a new due diligence checklist for {dealTitle}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createChecklistMutation.mutate({
              name: formData.get("name") as string,
              description: formData.get("description") as string,
              checklistType: checklistType,
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="checklist-name">Name *</Label>
                <Input
                  id="checklist-name"
                  name="name"
                  placeholder="e.g., Legal Due Diligence"
                  required
                  data-testid="input-checklist-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checklist-type">Type</Label>
                <Select value={checklistType} onValueChange={setChecklistType}>
                  <SelectTrigger data-testid="select-checklist-type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {checklistTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checklist-description">Description</Label>
                <Textarea
                  id="checklist-description"
                  name="description"
                  placeholder="Optional description..."
                  rows={3}
                  data-testid="input-checklist-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createChecklistMutation.isPending} data-testid="button-create-checklist-submit">
                {createChecklistMutation.isPending ? "Creating..." : "Create Checklist"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isApplyTemplateOpen} onOpenChange={setIsApplyTemplateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>
              Create a checklist from a pre-built template with all items and categories
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Template</Label>
              {templates.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No templates available</p>
                  <Link href="/transactions/templates">
                    <Button variant="ghost" size="sm" className="mt-2 text-primary">
                      Browse Templates
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {templates.filter((t: any) => t.isActive).map((template: any) => (
                    <div
                      key={template.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplateId === template.id 
                          ? "border-primary bg-primary/5" 
                          : "hover-elevate"
                      }`}
                      onClick={() => setSelectedTemplateId(template.id)}
                      data-testid={`template-option-${template.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedTemplateId === template.id ? "border-primary" : "border-muted-foreground"
                        }`}>
                          {selectedTemplateId === template.id && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {template.description?.substring(0, 60)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {template.isSystemTemplate && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">v{template.version}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsApplyTemplateOpen(false);
              setSelectedTemplateId("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => applyTemplateMutation.mutate(selectedTemplateId)}
              disabled={!selectedTemplateId || applyTemplateMutation.isPending}
              data-testid="button-apply-template-submit"
            >
              {applyTemplateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Background Research Tab Component
function BackgroundResearchTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [, navigate] = useLocation();
  const [targetIndustry, setTargetIndustry] = useState("Technology");

  const { data: research = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/background-research"],
    select: (data) => data.filter((r: any) => r.dealId === dealId),
  });

  const createResearchMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/background-research", { ...data, dealId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/background-research"] });
      setIsCreateOpen(false);
      toast({
        title: "Research started",
        description: "Background research has been initiated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start research",
        variant: "destructive",
      });
    },
  });

  const statusIcons: Record<string, JSX.Element> = {
    draft: <FileSearch className="h-4 w-4 text-muted-foreground" />,
    processing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <AlertTriangle className="h-4 w-4 text-red-500" />,
  };

  if (isLoading) {
    return <Skeleton className="h-[300px]" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Background Research</CardTitle>
              <CardDescription>AI-powered preliminary due diligence</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} data-testid="button-new-research">
              <Plus className="h-4 w-4 mr-2" />
              New Research
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {research.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSearch className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No background research for this deal</p>
              <p className="text-sm mt-1">Run AI-powered research on target companies</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start Research
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {research.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => navigate(`/background-research/${item.id}`)}
                  data-testid={`research-card-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    {statusIcons[item.status] || statusIcons.draft}
                    <div>
                      <p className="font-medium">{item.targetName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.targetIndustry || "Industry not specified"} • {format(new Date(item.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.riskScore !== null && (
                      <Badge variant={item.riskScore > 70 ? "destructive" : item.riskScore > 40 ? "secondary" : "outline"}>
                        Risk: {item.riskScore}
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">{item.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Background Research</DialogTitle>
            <DialogDescription>
              Run AI-powered research on a target company
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createResearchMutation.mutate({
              targetName: formData.get("targetName") as string,
              targetWebsite: formData.get("targetWebsite") as string,
              targetIndustry: targetIndustry,
              researchType: "comprehensive",
              enabledModules: ["company_overview", "key_people", "risk_indicators", "financial_analysis"],
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="target-name">Target Company Name *</Label>
                <Input
                  id="target-name"
                  name="targetName"
                  placeholder="e.g., Acme Corporation"
                  required
                  data-testid="input-target-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-website">Website</Label>
                <Input
                  id="target-website"
                  name="targetWebsite"
                  placeholder="e.g., https://acme.com"
                  data-testid="input-target-website"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-industry">Industry</Label>
                <Select value={targetIndustry} onValueChange={setTargetIndustry}>
                  <SelectTrigger data-testid="select-target-industry">
                    <SelectValue placeholder="Select industry..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Financial Services">Financial Services</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Real Estate">Real Estate</SelectItem>
                    <SelectItem value="Energy">Energy</SelectItem>
                    <SelectItem value="Consumer Goods">Consumer Goods</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createResearchMutation.isPending} data-testid="button-start-research-submit">
                {createResearchMutation.isPending ? "Starting..." : "Start Research"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InvestmentMemoSection({ dealId, dealTitle, dealSettings, onDealRefetch }: { dealId: string; dealTitle: string; dealSettings: Record<string, any>; onDealRefetch: () => void }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [generationProgress, setGenerationProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: memos = [], isLoading: memosLoading } = useQuery<any[]>({
    queryKey: ["/api/deals", dealId, "memos"],
    enabled: !!dealId,
  });

  const { data: memoReadiness } = useQuery<{ documentCount: number; ready: boolean }>({
    queryKey: ["/api/deals", dealId, "memo-readiness"],
    enabled: !!dealId,
  });

  const memoStatus = dealSettings?.memoStatus as string | undefined;
  const latestMemo = memos.length > 0 ? memos[0] : null;
  const hasDocumentsReady = memoReadiness?.ready || memoStatus === "ready_to_generate";
  const documentCount = memoReadiness?.documentCount || 0;

  const isStuckGenerating = latestMemo?.status === "generating" && latestMemo?.createdAt &&
    (Date.now() - new Date(latestMemo.createdAt).getTime() > 10 * 60 * 1000);
  const isFailedMemo = latestMemo?.status === "failed";

  const handleRetryGeneration = async () => {
    if (latestMemo) {
      try {
        await fetch(`/api/memos/${latestMemo.id}`, { method: "DELETE" });
        queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "memos"] });
      } catch {}
    }
    setTimeout(() => handleAutoGenerate(), 500);
  };

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress({ stage: "starting", progress: 0, message: "Starting memo generation..." });

    try {
      const response = await fetch(`/api/deals/${dealId}/memos/auto-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              setGenerationProgress(data);

              if (data.stage === "complete") {
                toast({ title: "Memo Generated", description: "Investment memo has been created successfully." });
                queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "memos"] });
                onDealRefetch();
              } else if (data.stage === "error") {
                toast({ title: "Generation Failed", description: data.message, variant: "destructive" });
              }
            } catch {}
          }
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate memo", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(null), 3000);
    }
  };

  const memoStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      generating: "Generating",
      review: "Ready for Review",
      approved: "Approved",
      failed: "Failed",
    };
    return labels[status] || status;
  };

  const memoStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      generating: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      review: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[status] || "";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Investment Memo
              </CardTitle>
              <CardDescription>AI-generated investment memo from uploaded documents</CardDescription>
            </div>
            {latestMemo && !isGenerating && (
              <Button size="sm" onClick={handleAutoGenerate} data-testid="button-regenerate-memo">
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isGenerating && generationProgress && (
            <div className="space-y-4" data-testid="memo-generation-progress">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Generating Investment Memo</p>
                  <p className="text-sm text-muted-foreground">{generationProgress.message}</p>
                </div>
                <span className="text-sm font-medium">{generationProgress.progress}%</span>
              </div>
              <Progress value={generationProgress.progress} className="h-2" />
            </div>
          )}

          {!isGenerating && memoStatus === "update_available" && latestMemo && (
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 mb-4" data-testid="memo-update-banner">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">New documents available</p>
                    <p className="text-sm text-muted-foreground">
                      New documents have been uploaded since the last memo was generated. Regenerate to include them.
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={handleAutoGenerate} data-testid="button-update-memo">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Update Memo
                </Button>
              </div>
            </div>
          )}

          {!isGenerating && (isStuckGenerating || isFailedMemo) && (
            <div className="text-center py-8">
              <div className="space-y-4">
                <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{isStuckGenerating ? "Generation Timed Out" : "Generation Failed"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isStuckGenerating
                      ? "The previous generation was interrupted. You can retry to generate a fresh memo."
                      : "The memo generation encountered an error. Please try again."}
                  </p>
                </div>
                <Button onClick={handleRetryGeneration} data-testid="button-retry-stuck-memo">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Retry Generation
                </Button>
              </div>
            </div>
          )}

          {!isGenerating && !latestMemo && memoStatus !== "generating" && !memosLoading && (
            <div className="text-center py-8">
              {hasDocumentsReady ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Ready to Generate</p>
                    <p className="text-sm text-muted-foreground mt-1" data-testid="text-doc-count">
                      {documentCount} document{documentCount !== 1 ? "s" : ""} processed and ready for analysis.
                    </p>
                  </div>
                  <Button onClick={handleAutoGenerate} data-testid="button-generate-memo">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Investment Memo
                  </Button>
                </div>
              ) : memoStatus === "failed" ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Generation Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dealSettings?.memoError || "The memo generation encountered an error. Please try again."}
                    </p>
                  </div>
                  <Button onClick={handleAutoGenerate} data-testid="button-retry-memo">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Retry Generation
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-full bg-muted w-fit mx-auto">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground" data-testid="text-memo-pending">
                    An investment memo will be automatically generated when documents are uploaded and processed.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload documents to a data room linked to this deal to get started.
                  </p>
                </div>
              )}
            </div>
          )}

          {!isGenerating && latestMemo && (
            <div className="space-y-4" data-testid="memo-details">
              {memoStatus !== "update_available" && (
                <div className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer" onClick={() => navigate(`/investor-memo/${latestMemo.id}`)} data-testid="link-view-memo">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{latestMemo.dealName || dealTitle} - Investment Memo</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="outline" className={memoStatusColor(latestMemo.status)}>
                          {memoStatusLabel(latestMemo.status)}
                        </Badge>
                        {latestMemo.overallScore && (
                          <Badge variant="outline">
                            Score: {latestMemo.overallScore}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-medium">
                        {latestMemo.updatedAt ? format(new Date(latestMemo.updatedAt), "MMM d, yyyy h:mm a") : "—"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {memoStatus === "update_available" && (
                <div className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer" onClick={() => navigate(`/investor-memo/${latestMemo.id}`)} data-testid="link-view-memo">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{latestMemo.dealName || dealTitle} - Investment Memo</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="outline" className={memoStatusColor(latestMemo.status)}>
                          {memoStatusLabel(latestMemo.status)}
                        </Badge>
                        {latestMemo.overallScore && (
                          <Badge variant="outline">
                            Score: {latestMemo.overallScore}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-medium">
                        {latestMemo.updatedAt ? format(new Date(latestMemo.updatedAt), "MMM d, yyyy h:mm a") : "—"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {memos.length > 1 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Previous Versions</p>
                  <div className="space-y-2">
                    {memos.slice(1).map((memo: any) => (
                      <div key={memo.id} className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => navigate(`/investor-memo/${memo.id}`)} data-testid={`link-memo-${memo.id}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Version {memo.version || "—"}</span>
                          <Badge variant="outline" className={memoStatusColor(memo.status)}>
                            {memoStatusLabel(memo.status)}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {memo.createdAt ? format(new Date(memo.createdAt), "MMM d, yyyy") : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {memosLoading && (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
