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
  Mic,
  Video,
  MessageSquare,
  Link2,
  Share2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ShareDealDialog } from "@/components/share-deal-dialog";
import type { Deal, DealMilestone, DealParticipant, DealIssue, DealMeetingNote, ClosingTransaction } from "@shared/schema";
import { format } from "date-fns";

type DealWithRelations = Deal & {
  participants?: DealParticipant[];
  milestones?: DealMilestone[];
};

interface ExtractionPreview {
  confidence: number;
  data?: {
    statementType?: string;
    propertyAddress?: string;
    purchasePrice?: string;
    loanAmount?: string;
    parties?: Array<{ name: string; role: string }>;
    lineItems?: Array<{ description: string; amount: string }>;
    prorations?: Array<{ itemName: string }>;
  };
  validation?: Array<{ severity: string; message: string }>;
}

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
  ma_asset: "M&A (Asset Purchase)",
  ma_stock: "M&A (Stock Purchase)",
  merger: "Merger",
  investment: "Investment",
  debt: "Debt Transaction",
  jv: "Joint Venture",
  franchise: "Franchise",
  residential_financed: "Residential Purchase (Financed)",
  residential_cash: "Residential Purchase (Cash)",
  refinance: "Residential Refinance",
  heloc: "HELOC",
  reverse_mortgage: "Reverse Mortgage (HECM)",
  new_construction: "New Construction Purchase",
  short_sale: "Short Sale",
  foreclosure_reo: "Foreclosure / REO",
  estate_probate: "Estate / Probate Sale",
  commercial_financed: "Commercial Purchase (Financed)",
  commercial_cash: "Commercial Purchase (Cash)",
  commercial_refinance: "Commercial Refinance",
  cmbs: "CMBS Loan",
  construction_loan: "Construction Loan",
  ground_lease: "Ground Lease",
  exchange_1031: "1031 Exchange",
  portfolio_bulk: "Portfolio / Bulk Acquisition",
  sale_leaseback: "Sale-Leaseback",
  distressed_asset: "Distressed Asset / Note Sale",
  co_op: "Co-op Transfer",
  mixed_use: "Mixed-Use Development",
  opportunity_zone: "Opportunity Zone (QOF)",
  loan_assumption: "Loan Assumption",
  deed_in_lieu: "Deed in Lieu of Foreclosure",
  capital_stack: "Multi-Layer Capital Stack",
  reit_contribution: "REIT / Fund Contribution",
  condo_subdivision: "Condo / Subdivision Creation",
  leasehold_financing: "Leasehold Financing",
};

const representationRoleLabels: Record<string, string> = {
  buyer: "Representing Buyer",
  seller: "Representing Seller",
  lender: "Representing Lender",
  borrower: "Representing Borrower",
  investor: "Representing Investor",
  investee: "Representing Investee",
};

export default function TransactionsDealDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Deal>>({});
  
  // Party/Entity/Advisor add dialog states
  const [addDialogType, setAddDialogType] = useState<"buyerParties" | "sellerParties" | "targetEntities" | "advisors" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemRole, setNewItemRole] = useState("");
  
  // Issue dialog states
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<DealIssue | null>(null);
  const [issueForm, setIssueForm] = useState({
    title: "",
    description: "",
    severity: "medium" as string,
    category: "other" as string,
    status: "open" as string,
    resolution: "",
  });

  // Meeting note dialog states
  const [meetingNoteDialogOpen, setMeetingNoteDialogOpen] = useState(false);
  const [editingMeetingNote, setEditingMeetingNote] = useState<DealMeetingNote | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [meetingNoteForm, setMeetingNoteForm] = useState({
    title: "",
    meetingDate: "",
    source: "manual_entry" as string,
    sourceUrl: "",
    transcript: "",
    summary: "",
    attendees: [] as { name: string; role?: string }[],
    duration: "",
  });
  const [attendeeInput, setAttendeeInput] = useState({ name: "", role: "" });

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

  const { data: dealIssues = [] } = useQuery<DealIssue[]>({
    queryKey: ["/api/deals", id, "issues"],
    enabled: !!id,
  });

  const { data: meetingNotes = [] } = useQuery<DealMeetingNote[]>({
    queryKey: ["/api/deals", id, "meeting-notes"],
    enabled: !!id,
  });

  const { data: termsData } = useQuery<any>({
    queryKey: ["/api/deals", id, "terms"],
    enabled: !!id,
  });

  const { data: dataRooms = [] } = useQuery<any[]>({
    queryKey: ["/api/data-rooms"],
    select: (rooms) => rooms.filter((r: any) => r.dealId === id),
  });

  const { data: closings = [], isLoading: closingsLoading } = useQuery<ClosingTransaction[]>({
    queryKey: ["/api/deals", id, "closings"],
    enabled: !!id,
  });

  const [isCreateClosingOpen, setIsCreateClosingOpen] = useState(false);
  const [newClosingType, setNewClosingType] = useState("");
  const [newClosingTitle, setNewClosingTitle] = useState("");
  const [autoPopulateClosing, setAutoPopulateClosing] = useState(true);
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const [extractDocId, setExtractDocId] = useState("");
  const [extractPreview, setExtractPreview] = useState<ExtractionPreview | null>(null);
  const [extracting, setExtracting] = useState(false);

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

  const populateOverviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${id}/populate-overview`);
      return res.json();
    },
    onSuccess: async (data: any) => {
      await refetchDeal();
      const count = data.totalUpdated || 0;
      const fields = (data.fieldsUpdated || []) as string[];
      const fieldLabels: Record<string, string> = {
        dealValue: "Deal Value", closingTargetDate: "Closing Target", loiDate: "LOI Date",
        signingTargetDate: "Signing Target", exclusivityExpiration: "Exclusivity Expiration",
        description: "Description", dealStructure: "Structure", subType: "Sub-Type",
      };
      const names = fields.map((f: string) => fieldLabels[f] || f).join(", ");
      toast({
        title: "Overview Populated",
        description: count > 0 ? `Updated ${count} field${count > 1 ? "s" : ""}: ${names}` : "All available fields are already populated.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Population Failed", description: error.message || "Could not populate overview.", variant: "destructive" });
    },
  });

  const extractTermsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${id}/terms/extract-all`);
      return res.json();
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "terms"] });
      const pct = data.completion?.percentage ?? 0;
      toast({
        title: "Terms Extracted",
        description: `Deal terms extracted from data room documents. ${pct}% of required fields populated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "Could not extract terms from documents.",
        variant: "destructive",
      });
    },
  });

  const closingTypeLabels: Record<string, string> = {
    closing_disclosure: "Closing Disclosure",
    seller_closing_disclosure: "Seller Closing Disclosure",
    hud1: "HUD-1",
    hud1a: "HUD-1A",
    cash_settlement: "Cash Settlement Statement",
    alta_combined: "ALTA Combined",
    alta_buyer: "ALTA Buyer Statement",
    alta_seller: "ALTA Seller Statement",
    sources_and_uses: "Sources & Uses",
    lender_funding: "Lender Funding Sheet",
    funds_flow: "Funds Flow",
    construction_sources_uses: "Construction Sources & Uses",
    construction_draw: "Construction Draw Schedule",
    cmbs_funding_memo: "CMBS Funding Memo",
    capital_stack: "Capital Stack",
    investor_waterfall: "Investor Waterfall",
    "1031_exchange": "1031 Exchange",
    qi_statement: "QI Statement",
    portfolio_settlement: "Portfolio Settlement",
    ground_lease_closing: "Ground Lease Closing",
    master_closing: "Master Closing Statement",
    reit_contribution: "REIT Contribution Statement",
  };

  const closingStatusLabels: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    executed: "Executed",
    voided: "Voided",
  };

  const closingStatusColors: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    pending_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    executed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    voided: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const createClosingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/deals/${id}/closings`, data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "closings"] });
      toast({ title: "Closing Created", description: "New closing transaction has been created." });
      setIsCreateClosingOpen(false);
      setNewClosingType("");
      setNewClosingTitle("");
      setAutoPopulateClosing(true);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create closing.", variant: "destructive" });
    },
  });

  const deleteClosingMutation = useMutation({
    mutationFn: async (closingId: string) => {
      await apiRequest("DELETE", `/api/closings/${closingId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "closings"] });
      toast({ title: "Deleted", description: "Closing transaction removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete closing.", variant: "destructive" });
    },
  });

  const handleCreateClosing = () => {
    if (!newClosingType) return;
    createClosingMutation.mutate({
      transactionType: newClosingType,
      title: newClosingTitle || closingTypeLabels[newClosingType] || "New Closing",
      autoPopulate: autoPopulateClosing,
    });
  };

  const extractClosingMutation = useMutation({
    mutationFn: async (data: { documentId: string; dealId: string }) => {
      const res = await apiRequest("POST", `/api/closings/extract-from-document`, data);
      return res.json();
    },
    onSuccess: async (data: { closingId?: string; confidence?: number; data?: { lineItems?: unknown[] } }) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "closings"] });
      toast({
        title: "Closing Extracted",
        description: `Extracted ${data.data?.lineItems?.length || 0} line items with ${data.confidence}% confidence.`,
      });
      setIsExtractDialogOpen(false);
      setExtractDocId("");
      setExtractPreview(null);
      if (data.closingId) {
        setLocation(`/transactions/closings/${data.closingId}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Extraction Failed", description: error.message || "Could not extract closing data.", variant: "destructive" });
    },
  });

  const handleExtractPreview = async () => {
    if (!extractDocId) return;
    setExtracting(true);
    try {
      const res = await apiRequest("POST", `/api/closings/extract-preview`, { documentId: extractDocId, dealId: id });
      const data: ExtractionPreview = await res.json();
      setExtractPreview(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Preview failed.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setExtracting(false);
  };

  const handleExtractConfirm = () => {
    if (!extractDocId || !id) return;
    extractClosingMutation.mutate({ documentId: extractDocId, dealId: id });
  };

  const createIssueMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/deals/${id}/issues`, data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "issues"] });
      toast({ title: "Issue Created", description: "The issue has been logged." });
      setIssueDialogOpen(false);
      setIssueForm({ title: "", description: "", severity: "medium", category: "other", status: "open", resolution: "" });
      setEditingIssue(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create issue.", variant: "destructive" });
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async ({ issueId, data }: { issueId: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/deals/${id}/issues/${issueId}`, data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "issues"] });
      toast({ title: "Issue Updated", description: "Changes saved." });
      setIssueDialogOpen(false);
      setIssueForm({ title: "", description: "", severity: "medium", category: "other", status: "open", resolution: "" });
      setEditingIssue(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update issue.", variant: "destructive" });
    },
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      await apiRequest("DELETE", `/api/deals/${id}/issues/${issueId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "issues"] });
      toast({ title: "Deleted", description: "Issue removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete issue.", variant: "destructive" });
    },
  });

  const handleSaveIssue = () => {
    if (!issueForm.title.trim()) return;
    if (editingIssue) {
      updateIssueMutation.mutate({ issueId: editingIssue.id, data: issueForm });
    } else {
      createIssueMutation.mutate(issueForm);
    }
  };

  const openEditIssue = (issue: DealIssue) => {
    setEditingIssue(issue);
    setIssueForm({
      title: issue.title,
      description: issue.description || "",
      severity: issue.severity || "medium",
      category: issue.category || "other",
      status: issue.status || "open",
      resolution: issue.resolution || "",
    });
    setIssueDialogOpen(true);
  };

  const openNewIssue = () => {
    setEditingIssue(null);
    setIssueForm({ title: "", description: "", severity: "medium", category: "other", status: "open", resolution: "" });
    setIssueDialogOpen(true);
  };

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

  const autoPopulateMilestonesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${id}/milestones/auto-populate`);
      return res.json();
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "milestones"] });
      const count = data.milestonesAdded || 0;
      toast({
        title: "Milestones Populated",
        description: count > 0
          ? `Added ${count} milestone${count > 1 ? "s" : ""} from documents and reports.`
          : "No new milestones found in documents.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Auto-Populate Failed", description: error.message || "Could not extract milestones.", variant: "destructive" });
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

  // Meeting note mutations
  const addMeetingNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/deals/${id}/meeting-notes`, data);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Meeting note added", description: "The meeting note has been saved." });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "meeting-notes"] });
      closeMeetingNoteDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add meeting note.", variant: "destructive" });
    },
  });

  const updateMeetingNoteMutation = useMutation({
    mutationFn: async ({ noteId, data }: { noteId: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/deals/${id}/meeting-notes/${noteId}`, data);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Meeting note updated", description: "Changes have been saved." });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "meeting-notes"] });
      closeMeetingNoteDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update meeting note.", variant: "destructive" });
    },
  });

  const deleteMeetingNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await apiRequest("DELETE", `/api/deals/${id}/meeting-notes/${noteId}`);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Meeting note deleted", description: "The meeting note has been removed." });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "meeting-notes"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete meeting note.", variant: "destructive" });
    },
  });

  const summarizeMeetingNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await apiRequest("POST", `/api/deals/${id}/meeting-notes/${noteId}/summarize`);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Summary generated", description: "AI summary has been added to the meeting note." });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "meeting-notes"] });
    },
    onError: (error: any) => {
      toast({ title: "Summarization failed", description: error.message || "Could not generate summary.", variant: "destructive" });
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

  // Meeting note helper functions
  const openAddMeetingNoteDialog = () => {
    setEditingMeetingNote(null);
    setMeetingNoteForm({
      title: "", meetingDate: "", source: "manual_entry", sourceUrl: "",
      transcript: "", summary: "", attendees: [], duration: "",
    });
    setAttendeeInput({ name: "", role: "" });
    setMeetingNoteDialogOpen(true);
  };

  const openEditMeetingNoteDialog = (note: DealMeetingNote) => {
    setEditingMeetingNote(note);
    setMeetingNoteForm({
      title: note.title,
      meetingDate: note.meetingDate ? format(new Date(note.meetingDate), "yyyy-MM-dd'T'HH:mm") : "",
      source: note.source || "manual_entry",
      sourceUrl: note.sourceUrl || "",
      transcript: note.transcript || "",
      summary: note.summary || "",
      attendees: (note.attendees as any[]) || [],
      duration: note.duration ? String(note.duration) : "",
    });
    setAttendeeInput({ name: "", role: "" });
    setMeetingNoteDialogOpen(true);
  };

  const closeMeetingNoteDialog = () => {
    setMeetingNoteDialogOpen(false);
    setEditingMeetingNote(null);
    setMeetingNoteForm({
      title: "", meetingDate: "", source: "manual_entry", sourceUrl: "",
      transcript: "", summary: "", attendees: [], duration: "",
    });
  };

  const handleSaveMeetingNote = () => {
    if (!meetingNoteForm.title.trim()) return;
    const data: any = {
      title: meetingNoteForm.title.trim(),
      meetingDate: meetingNoteForm.meetingDate ? new Date(meetingNoteForm.meetingDate).toISOString() : null,
      source: meetingNoteForm.source,
      sourceUrl: meetingNoteForm.sourceUrl.trim() || null,
      transcript: meetingNoteForm.transcript.trim() || null,
      summary: meetingNoteForm.summary.trim() || null,
      attendees: meetingNoteForm.attendees,
      duration: meetingNoteForm.duration ? parseInt(meetingNoteForm.duration) : null,
    };
    if (editingMeetingNote) {
      updateMeetingNoteMutation.mutate({ noteId: editingMeetingNote.id, data });
    } else {
      addMeetingNoteMutation.mutate(data);
    }
  };

  const addAttendee = () => {
    if (!attendeeInput.name.trim()) return;
    setMeetingNoteForm(prev => ({
      ...prev,
      attendees: [...prev.attendees, { name: attendeeInput.name.trim(), role: attendeeInput.role.trim() || undefined }],
    }));
    setAttendeeInput({ name: "", role: "" });
  };

  const removeAttendee = (idx: number) => {
    setMeetingNoteForm(prev => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== idx),
    }));
  };

  const sourceLabels: Record<string, string> = {
    ambient_intelligence: "Sentinel AI",
    manual_upload: "Uploaded",
    manual_entry: "Manual Entry",
    motion: "Motion",
    notion: "Notion",
    monday: "Monday.com",
    slack: "Slack",
    teams: "Microsoft Teams",
    zoom: "Zoom",
    other: "Other",
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
      dealType: deal.dealType,
      representationRole: deal.representationRole,
      status: deal.status,
      priority: deal.priority,
    });
    setIsEditOpen(true);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6 min-w-0">
        <div className="flex items-start justify-between gap-4 flex-wrap stagger-1">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/transactions/deals")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold" data-testid="text-deal-title">{deal.title}</h1>
                <Badge variant="outline" className={statusColors[deal.status || "active"]}>
                  {deal.status?.replace("_", " ") || "Active"}
                </Badge>
                <Badge variant="outline" className={priorityColors[deal.priority || "medium"]}>
                  {deal.priority || "Medium"} Priority
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {deal.dealNumber} • {dealTypeLabels[deal.dealType] || deal.dealType}
                </p>
                {deal.representationRole && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20" data-testid="badge-representation-role">
                    <Scale className="h-3 w-3 mr-1" />
                    {representationRoleLabels[deal.representationRole] || deal.representationRole}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button variant="outline" onClick={() => setIsShareOpen(true)} data-testid="button-share-deal">
              <Share2 className="h-4 w-4 mr-2" />
              Share Deal
            </Button>
            <Button onClick={openEditDialog} data-testid="button-edit-deal">
              <Edit className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
          </div>
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
                <SelectItem value="meetings">Meetings</SelectItem>
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
            <TabsTrigger value="meetings" className="flex-shrink-0" data-testid="tab-meetings">Meetings</TabsTrigger>
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
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                onClick={() => populateOverviewMutation.mutate()}
                disabled={populateOverviewMutation.isPending}
                data-testid="button-populate-overview"
              >
                {populateOverviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {populateOverviewMutation.isPending ? "Populating..." : "Auto-Populate from Documents"}
              </Button>
            </div>
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
                      <Label className="text-muted-foreground">Your Firm Represents</Label>
                      <p className="font-medium" data-testid="text-representation-role">
                        {representationRoleLabels[deal.representationRole || ""] ? representationRoleLabels[deal.representationRole!].replace("Representing ", "") : "—"}
                      </p>
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

          <TabsContent value="terms" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      Deal Terms
                    </CardTitle>
                    <CardDescription>
                      Manage extracted or manually entered deal terms for document generation
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => extractTermsMutation.mutate()}
                      disabled={extractTermsMutation.isPending}
                      data-testid="button-extract-terms"
                    >
                      {extractTermsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {extractTermsMutation.isPending ? "Extracting..." : "Extract from Documents"}
                    </Button>
                    <Link href={`/transactions/deals/${id}/terms`}>
                      <Button data-testid="button-manage-terms">
                        <FileText className="h-4 w-4 mr-2" />
                        Manage Terms
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {termsData ? (
                  <div className="space-y-4">
                    {termsData.completion && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">Completion</span>
                          <span className="font-medium">{termsData.completion.complete}/{termsData.completion.total} required fields</span>
                        </div>
                        <Progress value={termsData.completion.percentage} className="h-2" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {termsData.purchasePrice && (
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Purchase Price</p>
                          <p className="font-medium" data-testid="text-purchase-price">${termsData.purchasePrice}</p>
                        </div>
                      )}
                      {termsData.buyerName && (
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Buyer</p>
                          <p className="font-medium" data-testid="text-buyer-name">{termsData.buyerName}</p>
                        </div>
                      )}
                      {termsData.sellerName && (
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Seller</p>
                          <p className="font-medium" data-testid="text-seller-name">{termsData.sellerName}</p>
                        </div>
                      )}
                      {termsData.propertyAddress && (
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Property</p>
                          <p className="font-medium" data-testid="text-property-address">{termsData.propertyAddress}</p>
                        </div>
                      )}
                      {termsData.closingDate && (
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Closing Date</p>
                          <p className="font-medium" data-testid="text-closing-date">{termsData.closingDate}</p>
                        </div>
                      )}
                      {termsData.initialDeposit && (
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Initial Deposit</p>
                          <p className="font-medium" data-testid="text-initial-deposit">${termsData.initialDeposit}</p>
                        </div>
                      )}
                    </div>
                    {!termsData.purchasePrice && !termsData.buyerName && !termsData.sellerName && !termsData.propertyAddress && !termsData.closingDate && !termsData.initialDeposit && (
                      <p className="text-muted-foreground text-sm">
                        No terms have been filled in yet. Use "Extract from Documents" to auto-populate from your data room, or click "Manage Terms" to enter them manually.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Deal terms can be extracted from uploaded documents using AI, or entered manually.
                    Use "Extract from Documents" to auto-populate from your data room, or click "Manage Terms" to enter them manually.
                  </p>
                )}
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-lg">Deal Milestones</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => autoPopulateMilestonesMutation.mutate()}
                      disabled={autoPopulateMilestonesMutation.isPending}
                      data-testid="button-auto-populate-milestones"
                    >
                      {autoPopulateMilestonesMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {autoPopulateMilestonesMutation.isPending ? "Extracting..." : "Auto-Populate"}
                    </Button>
                    <Button size="sm" onClick={openAddMilestoneDialog} data-testid="button-add-milestone">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </div>
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

          <TabsContent value="meetings" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-lg">Meeting Transcripts & Summaries</CardTitle>
                  <Button size="sm" onClick={openAddMeetingNoteDialog} data-testid="button-add-meeting-note">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Meeting Note
                  </Button>
                </div>
                <CardDescription>
                  Transcripts and summaries from Sentinel AI meetings, manual uploads, or third-party integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {meetingNotes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mic className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No meeting notes for this deal</p>
                    <p className="text-sm mt-1">Add transcripts from meetings, upload recordings, or connect third-party tools</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={openAddMeetingNoteDialog} data-testid="button-add-first-meeting-note">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Meeting Note
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetingNotes.map((note: DealMeetingNote) => {
                      const isExpanded = expandedNoteId === note.id;
                      const attendeesList = (note.attendees as any[]) || [];
                      const keyPointsList = (note.keyPoints as string[]) || [];
                      const actionItemsList = (note.actionItems as any[]) || [];
                      const decisionsList = (note.decisions as string[]) || [];
                      return (
                        <div key={note.id} className="group border rounded-lg" data-testid={`meeting-note-item-${note.id}`}>
                          <div
                            className="flex items-start gap-3 p-4 cursor-pointer hover-elevate rounded-lg"
                            onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                          >
                            <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                              {note.source === "ambient_intelligence" ? (
                                <Video className="h-4 w-4 text-primary" />
                              ) : note.source === "slack" || note.source === "teams" ? (
                                <MessageSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Mic className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">{note.title}</span>
                                <Badge variant="secondary">{sourceLabels[note.source] || note.source}</Badge>
                                {note.duration && (
                                  <Badge variant="outline">{note.duration} min</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                {note.meetingDate && (
                                  <span>{format(new Date(note.meetingDate), "MMM d, yyyy 'at' h:mm a")}</span>
                                )}
                                {attendeesList.length > 0 && (
                                  <span>{attendeesList.length} attendee{attendeesList.length !== 1 ? "s" : ""}</span>
                                )}
                                {note.summary && <span>Summary available</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {note.sourceUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); window.open(note.sourceUrl!, "_blank"); }}
                                  data-testid={`button-open-source-${note.id}`}
                                >
                                  <Link2 className="h-4 w-4" />
                                </Button>
                              )}
                              {note.transcript && !note.summary && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); summarizeMeetingNoteMutation.mutate(note.id); }}
                                  disabled={summarizeMeetingNoteMutation.isPending}
                                  data-testid={`button-summarize-${note.id}`}
                                >
                                  {summarizeMeetingNoteMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="invisible group-hover:visible"
                                onClick={(e) => { e.stopPropagation(); openEditMeetingNoteDialog(note); }}
                                data-testid={`button-edit-meeting-note-${note.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="invisible group-hover:visible"
                                onClick={(e) => { e.stopPropagation(); deleteMeetingNoteMutation.mutate(note.id); }}
                                data-testid={`button-delete-meeting-note-${note.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-4 border-t pt-4">
                              {attendeesList.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Attendees</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {attendeesList.map((a: any, i: number) => (
                                      <Badge key={i} variant="outline">
                                        {a.name}{a.role ? ` (${a.role})` : ""}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {note.summary && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.summary}</p>
                                </div>
                              )}
                              {keyPointsList.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Key Points</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {keyPointsList.map((point: string, i: number) => (
                                      <li key={i} className="text-sm text-muted-foreground">{point}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {actionItemsList.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Action Items</h4>
                                  <div className="space-y-2">
                                    {actionItemsList.map((item: any, i: number) => (
                                      <div key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${item.completed ? "text-green-500" : "text-muted-foreground"}`} />
                                        <div>
                                          <span className={item.completed ? "line-through text-muted-foreground" : ""}>{item.description}</span>
                                          {item.assignee && <span className="text-muted-foreground ml-2">({item.assignee})</span>}
                                          {item.dueDate && <span className="text-muted-foreground ml-2">Due: {item.dueDate}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {decisionsList.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Decisions</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {decisionsList.map((d: string, i: number) => (
                                      <li key={i} className="text-sm text-muted-foreground">{d}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {note.transcript && (
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <h4 className="text-sm font-medium">Transcript</h4>
                                    {!note.summary && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => summarizeMeetingNoteMutation.mutate(note.id)}
                                        disabled={summarizeMeetingNoteMutation.isPending}
                                        data-testid={`button-summarize-expanded-${note.id}`}
                                      >
                                        {summarizeMeetingNoteMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-4 w-4 mr-2" />
                                        )}
                                        AI Summarize
                                      </Button>
                                    )}
                                  </div>
                                  <ScrollArea className="h-48 rounded-md border p-3">
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.transcript}</p>
                                  </ScrollArea>
                                </div>
                              )}
                            </div>
                          )}
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
            <ChecklistsTab dealId={id!} dealTitle={deal.title} dealSettings={(deal.settings || {}) as Record<string, any>} />
          </TabsContent>

          <TabsContent value="issues" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">Issue Tracker</CardTitle>
                    <CardDescription>Track and manage deal-related issues</CardDescription>
                  </div>
                  <Button size="sm" onClick={openNewIssue} data-testid="button-new-issue">
                    <Plus className="h-4 w-4 mr-2" />
                    New Issue
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dealIssues.length > 0 ? (
                  <div className="space-y-3">
                    {dealIssues.map((issue) => {
                      const severityColors: Record<string, string> = {
                        low: "bg-muted text-muted-foreground",
                        medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                        high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                        critical: "bg-red-500/10 text-red-600 dark:text-red-400",
                      };
                      const statusColors: Record<string, string> = {
                        open: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        in_progress: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                        resolved: "bg-green-500/10 text-green-600 dark:text-green-400",
                        closed: "bg-muted text-muted-foreground",
                      };
                      const categoryLabels: Record<string, string> = {
                        legal: "Legal", financial: "Financial", regulatory: "Regulatory",
                        operational: "Operational", environmental: "Environmental",
                        tax: "Tax", ip: "IP", hr: "HR", other: "Other",
                      };
                      return (
                        <div
                          key={issue.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 group hover-elevate cursor-pointer"
                          onClick={() => openEditIssue(issue)}
                          data-testid={`issue-row-${issue.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate" data-testid={`text-issue-title-${issue.id}`}>{issue.title}</span>
                              <Badge variant="secondary" className={`text-xs ${severityColors[issue.severity || "medium"]}`} data-testid={`badge-severity-${issue.id}`}>
                                {(issue.severity || "medium").charAt(0).toUpperCase() + (issue.severity || "medium").slice(1)}
                              </Badge>
                              <Badge variant="secondary" className={`text-xs ${statusColors[issue.status || "open"]}`} data-testid={`badge-status-${issue.id}`}>
                                {(issue.status || "open").replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            </div>
                            {issue.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{issue.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span>{categoryLabels[issue.category || "other"]}</span>
                              {issue.createdAt && (
                                <span>{format(new Date(issue.createdAt), "MMM d, yyyy")}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 invisible group-hover:visible"
                            onClick={(e) => { e.stopPropagation(); deleteIssueMutation.mutate(issue.id); }}
                            data-testid={`button-delete-issue-${issue.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No issues logged for this deal</p>
                    <p className="text-sm mt-1">Track due diligence findings and concerns here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingIssue ? "Edit Issue" : "New Issue"}</DialogTitle>
                  <DialogDescription>
                    {editingIssue ? "Update the issue details below." : "Log a new deal-related issue."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={issueForm.title}
                      onChange={(e) => setIssueForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Brief description of the issue"
                      data-testid="input-issue-title"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={issueForm.description}
                      onChange={(e) => setIssueForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Detailed description..."
                      data-testid="input-issue-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Severity</Label>
                      <Select value={issueForm.severity} onValueChange={(v) => setIssueForm(f => ({ ...f, severity: v }))}>
                        <SelectTrigger data-testid="select-issue-severity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={issueForm.category} onValueChange={(v) => setIssueForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger data-testid="select-issue-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="legal">Legal</SelectItem>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="regulatory">Regulatory</SelectItem>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="environmental">Environmental</SelectItem>
                          <SelectItem value="tax">Tax</SelectItem>
                          <SelectItem value="ip">IP</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {editingIssue && (
                    <>
                      <div>
                        <Label>Status</Label>
                        <Select value={issueForm.status} onValueChange={(v) => setIssueForm(f => ({ ...f, status: v }))}>
                          <SelectTrigger data-testid="select-issue-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(issueForm.status === "resolved" || issueForm.status === "closed") && (
                        <div>
                          <Label>Resolution</Label>
                          <Textarea
                            value={issueForm.resolution}
                            onChange={(e) => setIssueForm(f => ({ ...f, resolution: e.target.value }))}
                            placeholder="How was this issue resolved?"
                            data-testid="input-issue-resolution"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIssueDialogOpen(false)} data-testid="button-cancel-issue">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveIssue}
                    disabled={!issueForm.title.trim() || createIssueMutation.isPending || updateIssueMutation.isPending}
                    data-testid="button-save-issue"
                  >
                    {(createIssueMutation.isPending || updateIssueMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingIssue ? "Save Changes" : "Create Issue"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="research" className="mt-6">
            <BackgroundResearchTab dealId={id!} />
          </TabsContent>

          <TabsContent value="closing" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="h-5 w-5" />
                      Closing Statements
                    </CardTitle>
                    <CardDescription>Manage closing transactions, line items, and funds flow</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setIsExtractDialogOpen(true)}
                      data-testid="button-extract-closing"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Extract from PDF
                    </Button>
                    <Button
                      onClick={() => setIsCreateClosingOpen(true)}
                      data-testid="button-create-closing"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Closing
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {closingsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : closings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No closing statements yet</p>
                    <p className="text-sm mt-1">Create a closing statement to manage funds flow, line items, and settlement details</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {closings.map((closing) => (
                      <div
                        key={closing.id}
                        className="flex items-center justify-between gap-4 p-4 border rounded-md hover-elevate cursor-pointer"
                        onClick={() => setLocation(`/transactions/closings/${closing.id}`)}
                        data-testid={`card-closing-${closing.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate" data-testid={`text-closing-title-${closing.id}`}>{closing.title}</span>
                            <Badge variant="outline" className={closingStatusColors[closing.status || "draft"]}>
                              {closingStatusLabels[closing.status || "draft"]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span data-testid={`text-closing-type-${closing.id}`}>{closingTypeLabels[closing.transactionType] || closing.transactionType}</span>
                            {closing.fileNumber && <span>File: {closing.fileNumber}</span>}
                            {closing.closingDate && <span>Date: {format(new Date(closing.closingDate), "MMM d, yyyy")}</span>}
                            {closing.purchasePrice && <span>Price: ${parseFloat(closing.purchasePrice).toLocaleString()}</span>}
                          </div>
                          {closing.balanceValid !== null && (
                            <div className="flex items-center gap-2 mt-1">
                              {closing.balanceValid ? (
                                <span className="text-xs text-green-500 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Balanced
                                </span>
                              ) : (
                                <span className="text-xs text-yellow-500 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Unbalanced (Sources: ${parseFloat(closing.totalSources || "0").toLocaleString()}, Uses: ${parseFloat(closing.totalUses || "0").toLocaleString()})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this closing statement?")) {
                                deleteClosingMutation.mutate(closing.id);
                              }
                            }}
                            data-testid={`button-delete-closing-${closing.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={isCreateClosingOpen} onOpenChange={setIsCreateClosingOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Closing Statement</DialogTitle>
                  <DialogDescription>
                    Select a closing statement type. Data from deal terms will be auto-populated if available.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="closingType">Statement Type</Label>
                    <Select value={newClosingType} onValueChange={setNewClosingType}>
                      <SelectTrigger data-testid="select-closing-type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(closingTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="closingTitle">Title (optional)</Label>
                    <Input
                      id="closingTitle"
                      value={newClosingTitle}
                      onChange={(e) => setNewClosingTitle(e.target.value)}
                      placeholder={newClosingType ? closingTypeLabels[newClosingType] : "Auto-generated from type"}
                      data-testid="input-closing-title"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoPopulate"
                      checked={autoPopulateClosing}
                      onChange={(e) => setAutoPopulateClosing(e.target.checked)}
                      className="rounded border-input"
                      data-testid="checkbox-auto-populate"
                    />
                    <Label htmlFor="autoPopulate" className="text-sm cursor-pointer">
                      Auto-populate from deal terms (buyer, seller, property, purchase price)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateClosingOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreateClosing}
                    disabled={!newClosingType || createClosingMutation.isPending}
                    data-testid="button-submit-closing"
                  >
                    {createClosingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isExtractDialogOpen} onOpenChange={(open) => { setIsExtractDialogOpen(open); if (!open) { setExtractDocId(""); setExtractPreview(null); } }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Extract Closing from Document</DialogTitle>
                  <DialogDescription>
                    Upload a closing statement PDF and AI will extract parties, line items, amounts, and prorations automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Document from Data Room</Label>
                    <Input
                      value={extractDocId}
                      onChange={(e) => setExtractDocId(e.target.value)}
                      placeholder="Enter document ID from data room"
                      data-testid="input-extract-doc-id"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Navigate to the data room, find the PDF you want to extract, and copy its document ID.
                    </p>
                  </div>

                  {!extractPreview && (
                    <Button
                      variant="outline"
                      onClick={handleExtractPreview}
                      disabled={!extractDocId || extracting}
                      data-testid="button-preview-extract"
                    >
                      {extracting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Preview Extraction
                    </Button>
                  )}

                  {extractPreview && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{extractPreview.confidence}% confidence</Badge>
                        {extractPreview.data?.statementType && (
                          <Badge>{closingTypeLabels[extractPreview.data.statementType] || extractPreview.data.statementType}</Badge>
                        )}
                      </div>

                      {extractPreview.data && (
                        <div className="text-sm space-y-1 p-3 bg-muted/30 rounded-md">
                          {extractPreview.data.propertyAddress && <p><span className="text-muted-foreground">Property:</span> {extractPreview.data.propertyAddress}</p>}
                          {extractPreview.data.purchasePrice && <p><span className="text-muted-foreground">Purchase Price:</span> ${parseFloat(extractPreview.data.purchasePrice).toLocaleString()}</p>}
                          {extractPreview.data.loanAmount && <p><span className="text-muted-foreground">Loan Amount:</span> ${parseFloat(extractPreview.data.loanAmount).toLocaleString()}</p>}
                          <p><span className="text-muted-foreground">Parties:</span> {extractPreview.data.parties?.length || 0}</p>
                          <p><span className="text-muted-foreground">Line Items:</span> {extractPreview.data.lineItems?.length || 0}</p>
                          <p><span className="text-muted-foreground">Prorations:</span> {extractPreview.data.prorations?.length || 0}</p>
                        </div>
                      )}

                      {extractPreview.validation && extractPreview.validation.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Validation Notes:</p>
                          {extractPreview.validation.slice(0, 5).map((v: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-1 text-xs">
                              {v.severity === "error" ? (
                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                              ) : v.severity === "warning" ? (
                                <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                              )}
                              <span>{v.message}</span>
                            </div>
                          ))}
                          {extractPreview.validation.length > 5 && (
                            <p className="text-xs text-muted-foreground">...and {extractPreview.validation.length - 5} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsExtractDialogOpen(false); setExtractDocId(""); setExtractPreview(null); }}>
                    Cancel
                  </Button>
                  {extractPreview && (
                    <Button
                      onClick={handleExtractConfirm}
                      disabled={extractClosingMutation.isPending}
                      data-testid="button-confirm-extract"
                    >
                      {extractClosingMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create Closing from Extraction
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

        {deal && (
          <ShareDealDialog
            dealId={deal.id}
            dealTitle={deal.title}
            open={isShareOpen}
            onOpenChange={setIsShareOpen}
          />
        )}

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
                  <Label>Deal Type</Label>
                  <Select
                    value={editForm.dealType || "other"}
                    onValueChange={(v) => {
                      const lendingTypes = ["debt", "cmbs", "construction_loan", "loan_assumption", "heloc", "refinance", "commercial_refinance", "reverse_mortgage", "leasehold_financing"];
                      const investmentTypes = ["investment", "capital_stack", "reit_contribution", "opportunity_zone"];
                      let opts: { value: string }[];
                      if (lendingTypes.includes(v)) opts = [{ value: "lender" }, { value: "borrower" }];
                      else if (investmentTypes.includes(v)) opts = [{ value: "investor" }, { value: "investee" }];
                      else opts = [{ value: "buyer" }, { value: "seller" }];
                      const currentValid = opts.some(o => o.value === editForm.representationRole);
                      setEditForm({ ...editForm, dealType: v as any, representationRole: currentValid ? editForm.representationRole : undefined });
                    }}
                  >
                    <SelectTrigger data-testid="select-edit-deal-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(dealTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Your Firm Represents</Label>
                  <Select
                    value={editForm.representationRole || ""}
                    onValueChange={(v) => setEditForm({ ...editForm, representationRole: v as any })}
                  >
                    <SelectTrigger data-testid="select-edit-representation-role">
                      <SelectValue placeholder="Select side..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const dt = editForm.dealType || "other";
                        const lendingTypes = ["debt", "cmbs", "construction_loan", "loan_assumption", "heloc", "refinance", "commercial_refinance", "reverse_mortgage", "leasehold_financing"];
                        const investmentTypes = ["investment", "capital_stack", "reit_contribution", "opportunity_zone"];
                        if (lendingTypes.includes(dt)) return [{ value: "lender", label: "Lender" }, { value: "borrower", label: "Borrower" }];
                        if (investmentTypes.includes(dt)) return [{ value: "investor", label: "Investor" }, { value: "investee", label: "Investee" }];
                        return [{ value: "buyer", label: "Buyer" }, { value: "seller", label: "Seller" }];
                      })().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

        <Dialog open={meetingNoteDialogOpen} onOpenChange={(open) => { if (!open) closeMeetingNoteDialog(); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMeetingNote ? "Edit Meeting Note" : "Add Meeting Note"}</DialogTitle>
              <DialogDescription>
                Add a meeting transcript, summary, or notes from any source
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Due Diligence Review Call"
                  value={meetingNoteForm.title}
                  onChange={(e) => setMeetingNoteForm({ ...meetingNoteForm, title: e.target.value })}
                  data-testid="input-meeting-note-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meeting Date</Label>
                  <Input
                    type="datetime-local"
                    value={meetingNoteForm.meetingDate}
                    onChange={(e) => setMeetingNoteForm({ ...meetingNoteForm, meetingDate: e.target.value })}
                    data-testid="input-meeting-note-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    placeholder="60"
                    value={meetingNoteForm.duration}
                    onChange={(e) => setMeetingNoteForm({ ...meetingNoteForm, duration: e.target.value })}
                    data-testid="input-meeting-note-duration"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={meetingNoteForm.source} onValueChange={(v) => setMeetingNoteForm({ ...meetingNoteForm, source: v })}>
                    <SelectTrigger data-testid="select-meeting-note-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_entry">Manual Entry</SelectItem>
                      <SelectItem value="manual_upload">Uploaded File</SelectItem>
                      <SelectItem value="ambient_intelligence">Sentinel AI Meeting</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="notion">Notion</SelectItem>
                      <SelectItem value="monday">Monday.com</SelectItem>
                      <SelectItem value="motion">Motion</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source URL (optional)</Label>
                  <Input
                    placeholder="https://..."
                    value={meetingNoteForm.sourceUrl}
                    onChange={(e) => setMeetingNoteForm({ ...meetingNoteForm, sourceUrl: e.target.value })}
                    data-testid="input-meeting-note-source-url"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Attendees</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Name"
                    value={attendeeInput.name}
                    onChange={(e) => setAttendeeInput({ ...attendeeInput, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttendee(); } }}
                    className="flex-1"
                    data-testid="input-attendee-name"
                  />
                  <Input
                    placeholder="Role (optional)"
                    value={attendeeInput.role}
                    onChange={(e) => setAttendeeInput({ ...attendeeInput, role: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttendee(); } }}
                    className="flex-1"
                    data-testid="input-attendee-role"
                  />
                  <Button variant="outline" size="sm" onClick={addAttendee} data-testid="button-add-attendee">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {meetingNoteForm.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {meetingNoteForm.attendees.map((a, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {a.name}{a.role ? ` (${a.role})` : ""}
                        <button onClick={() => removeAttendee(i)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea
                  placeholder="Meeting summary or key takeaways..."
                  value={meetingNoteForm.summary}
                  onChange={(e) => setMeetingNoteForm({ ...meetingNoteForm, summary: e.target.value })}
                  rows={3}
                  data-testid="input-meeting-note-summary"
                />
              </div>
              <div className="space-y-2">
                <Label>Transcript</Label>
                <Textarea
                  placeholder="Paste the full meeting transcript here..."
                  value={meetingNoteForm.transcript}
                  onChange={(e) => setMeetingNoteForm({ ...meetingNoteForm, transcript: e.target.value })}
                  rows={6}
                  data-testid="input-meeting-note-transcript"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a transcript and use AI Summarize to automatically extract key points, action items, and decisions
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeMeetingNoteDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveMeetingNote}
                disabled={!meetingNoteForm.title.trim() || addMeetingNoteMutation.isPending || updateMeetingNoteMutation.isPending}
                data-testid="button-save-meeting-note"
              >
                {(addMeetingNoteMutation.isPending || updateMeetingNoteMutation.isPending) ? "Saving..." : (editingMeetingNote ? "Save Changes" : "Add Meeting Note")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
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
function ChecklistsTab({ dealId, dealTitle, dealSettings }: { dealId: string; dealTitle: string; dealSettings?: Record<string, any> }) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [, navigate] = useLocation();
  const [checklistType, setChecklistType] = useState("legal");
  const [isSuggestionDismissed, setIsSuggestionDismissed] = useState(false);

  const { data: checklists = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/deals", dealId, "checklists"],
    enabled: !!dealId,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/deal-templates"],
  });

  const suggestion = dealSettings?.checklistSuggestion as {
    templateId: string;
    templateName: string;
    confidence: number;
    reasoning: string;
    documentMatches?: Array<{ documentName: string; matchedItems: string[] }>;
  } | undefined;

  const suggestChecklistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/suggest-checklist`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId] });
      if (data.suggestion) {
        toast({ title: "Suggestion Ready", description: `Recommended: ${data.suggestion.templateName}` });
      } else {
        toast({ title: "No Match", description: "Could not find a suitable template for this deal's documents." });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to analyze documents", variant: "destructive" });
    },
  });

  const dismissSuggestionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/dismiss-checklist-suggestion`, {});
      return res.json();
    },
    onSuccess: () => {
      setIsSuggestionDismissed(true);
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId] });
    },
  });

  const applySuggestedTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("POST", `/api/deals/${dealId}/apply-template/${templateId}`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "checklists"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId] });
      toast({ title: "Template Applied", description: "The suggested checklist has been created from the template." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to apply template", variant: "destructive" });
    },
  });

  const showSuggestion = suggestion && !isSuggestionDismissed && checklists.length === 0;

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
          {showSuggestion && (
            <div className="mb-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">AI Recommendation: {suggestion.templateName}</p>
                      <Badge variant={suggestion.confidence >= 0.8 ? "default" : "secondary"} className="text-xs">
                        {Math.round(suggestion.confidence * 100)}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{suggestion.reasoning}</p>
                    {suggestion.documentMatches && suggestion.documentMatches.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Matching documents:</p>
                        {suggestion.documentMatches.slice(0, 3).map((match, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>
                              <span className="font-medium">{match.documentName}</span>
                              {match.matchedItems.length > 0 && (
                                <span className="ml-1">
                                  ({match.matchedItems.slice(0, 2).join(", ")}{match.matchedItems.length > 2 ? ` +${match.matchedItems.length - 2} more` : ""})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => applySuggestedTemplateMutation.mutate(suggestion.templateId)}
                        disabled={applySuggestedTemplateMutation.isPending}
                        data-testid="button-apply-suggested-template"
                      >
                        {applySuggestedTemplateMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Applying...</>
                        ) : (
                          <><CheckCircle2 className="h-4 w-4 mr-2" />Apply This Checklist</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismissSuggestionMutation.mutate()}
                        disabled={dismissSuggestionMutation.isPending}
                        data-testid="button-dismiss-suggestion"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {checklists.length === 0 && !showSuggestion ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No checklists for this deal</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Checklist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => suggestChecklistMutation.mutate()}
                  disabled={suggestChecklistMutation.isPending}
                  data-testid="button-suggest-checklist"
                >
                  {suggestChecklistMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Suggest from Documents</>
                  )}
                </Button>
              </div>
            </div>
          ) : checklists.length === 0 ? null : (
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
