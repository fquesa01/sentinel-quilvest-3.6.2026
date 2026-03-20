import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  FileText,
  Shield,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  User,
  Loader2,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  UserPlus,
  Clock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type { TitleCommitment, TitleException, TitleSearchVendor } from "@shared/schema";

interface TitleInsuranceTabProps {
  dealId: string;
}

interface CommitmentFormState {
  underwriter: string;
  effectiveDate: string;
  policyAmount: string;
  premium: string;
  commitmentType: string;
  legalDescription: string;
  propertyAddress: string;
  county: string;
  state: string;
}

const defaultCommitmentForm: CommitmentFormState = {
  underwriter: "",
  effectiveDate: "",
  policyAmount: "",
  premium: "",
  commitmentType: "owner",
  legalDescription: "",
  propertyAddress: "",
  county: "",
  state: "FL",
};

const commitmentStatusLabels: Record<string, string> = {
  ordered: "Ordered",
  received: "Received",
  under_review: "Under Review",
  exceptions_clearing: "Exceptions Clearing",
  ready_to_close: "Ready to Close",
  policy_issued: "Policy Issued",
  cancelled: "Cancelled",
};

const commitmentStatusColors: Record<string, string> = {
  ordered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  received: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  under_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  exceptions_clearing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ready_to_close: "bg-green-500/20 text-green-400 border-green-500/30",
  policy_issued: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const exceptionStatusLabels: Record<string, string> = {
  open: "Open",
  cleared: "Cleared",
  waived: "Waived",
  partially_cleared: "Partially Cleared",
};

const exceptionStatusColors: Record<string, string> = {
  open: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cleared: "bg-green-500/20 text-green-400 border-green-500/30",
  waived: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  partially_cleared: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const exceptionTypeLabels: Record<string, string> = {
  requirement: "Requirement",
  lien: "Lien",
  easement: "Easement",
  judgment: "Judgment",
  encumbrance: "Encumbrance",
  restriction: "Restriction",
  tax: "Tax",
  survey: "Survey",
  mortgage: "Mortgage",
  covenant: "Covenant",
  other: "Other",
};

const vendorTypeLabels: Record<string, string> = {
  abstract_company: "Abstract Company",
  title_agent: "Title Agent",
  tax_search: "Tax Search",
  surveyor: "Surveyor",
  municipal_search: "Municipal Search",
  judgment_search: "Judgment Search",
};

const vendorStatusColors: Record<string, string> = {
  ordered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  delayed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const vendorStatusLabels: Record<string, string> = {
  ordered: "Ordered",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

const underwriterOptions = [
  "Fidelity National Title",
  "First American",
  "Old Republic",
  "Stewart Title",
  "Chicago Title",
  "WFG National Title",
  "North American Title",
  "Other",
];

type SortField = "scheduleItem" | "exceptionType" | "priority" | "status" | "dueDate";
type SortDirection = "asc" | "desc";

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number> = { open: 0, partially_cleared: 1, waived: 2, cleared: 3 };

function parseNoteEntries(notes: string): Array<{ timestamp: string; text: string }> {
  if (!notes) return [];
  const entries: Array<{ timestamp: string; text: string }> = [];
  const parts = notes.split(/\n\n(?=\[)/);
  for (const part of parts) {
    const match = part.match(/^\[(.+?)\]\s*(.*)$/s);
    if (match) {
      entries.push({ timestamp: match[1], text: match[2] });
    } else if (part.trim()) {
      entries.push({ timestamp: "", text: part.trim() });
    }
  }
  return entries;
}

export function TitleInsuranceTab({ dealId }: TitleInsuranceTabProps) {
  const { toast } = useToast();
  const [createCommitmentOpen, setCreateCommitmentOpen] = useState(false);
  const [editCommitmentOpen, setEditCommitmentOpen] = useState(false);
  const [createExceptionOpen, setCreateExceptionOpen] = useState(false);
  const [createVendorOpen, setCreateVendorOpen] = useState(false);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [editVendorId, setEditVendorId] = useState<string | null>(null);
  const [editVendorForm, setEditVendorForm] = useState({
    vendorName: "",
    vendorType: "abstract_company" as string,
    taskDescription: "",
    orderedDate: "",
    cost: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
  });
  const [sortField, setSortField] = useState<SortField>("scheduleItem");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [commitmentForm, setCommitmentForm] = useState<CommitmentFormState>({ ...defaultCommitmentForm });

  const [exceptionForm, setExceptionForm] = useState({
    scheduleItem: "",
    scheduleSection: "b2_exceptions" as string,
    exceptionType: "other" as string,
    description: "",
    priority: "medium" as string,
    dueDate: "",
    notes: "",
  });

  const [vendorForm, setVendorForm] = useState({
    vendorName: "",
    vendorType: "abstract_company" as string,
    taskDescription: "",
    orderedDate: new Date().toISOString().split("T")[0],
    cost: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
  });

  const { data: commitments = [], isLoading: commitmentsLoading } = useQuery<TitleCommitment[]>({
    queryKey: ["/api/deals", dealId, "title", "commitments"],
  });

  const activeCommitment = commitments[0];

  const { data: exceptions = [], isLoading: exceptionsLoading } = useQuery<TitleException[]>({
    queryKey: ["/api/deals", dealId, "title", "commitments", activeCommitment?.id, "exceptions"],
    enabled: !!activeCommitment?.id,
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<TitleSearchVendor[]>({
    queryKey: ["/api/deals", dealId, "title", "commitments", activeCommitment?.id, "vendors"],
    enabled: !!activeCommitment?.id,
  });

  const selectedExceptionData = exceptions.find((e) => e.id === selectedExceptionId);

  const openCount = exceptions.filter((e) => e.status === "open").length;
  const clearedCount = exceptions.filter((e) => e.status === "cleared").length;
  const waivedCount = exceptions.filter((e) => e.status === "waived").length;
  const totalExceptions = exceptions.length;
  const resolvedCount = clearedCount + waivedCount;
  const clearancePercent = totalExceptions > 0 ? Math.round((resolvedCount / totalExceptions) * 100) : 0;

  const filteredExceptions = exceptions.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (typeFilter !== "all" && e.exceptionType !== typeFilter) return false;
    return true;
  });

  const sortedExceptions = [...filteredExceptions].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "scheduleItem":
        cmp = (a.scheduleItem || "").localeCompare(b.scheduleItem || "");
        break;
      case "exceptionType":
        cmp = (a.exceptionType || "").localeCompare(b.exceptionType || "");
        break;
      case "priority":
        cmp = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
        break;
      case "status":
        cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        break;
      case "dueDate":
        cmp = (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
        break;
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" />
    );
  };

  const invalidateTitle = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title"] });
  };

  const createCommitmentMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/title/commitments`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateTitle();
      setCreateCommitmentOpen(false);
      setCommitmentForm({ ...defaultCommitmentForm });
      toast({ title: "Commitment Created", description: "Title commitment has been created." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCommitmentMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/title/commitments/${activeCommitment?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateTitle();
      setEditCommitmentOpen(false);
      toast({ title: "Updated", description: "Title commitment has been updated." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createExceptionMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/title/commitments/${activeCommitment?.id}/exceptions`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateTitle();
      setCreateExceptionOpen(false);
      setExceptionForm({ scheduleItem: "", scheduleSection: "b2_exceptions", exceptionType: "other", description: "", priority: "medium", dueDate: "", notes: "" });
      toast({ title: "Exception Added", description: "Title exception has been added." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateExceptionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/title/exceptions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateTitle();
      toast({ title: "Updated", description: "Exception has been updated." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/title/commitments/${activeCommitment?.id}/vendors`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateTitle();
      setCreateVendorOpen(false);
      setVendorForm({ vendorName: "", vendorType: "abstract_company", taskDescription: "", orderedDate: new Date().toISOString().split("T")[0], cost: "", contactName: "", contactEmail: "", contactPhone: "", notes: "" });
      toast({ title: "Vendor Added", description: "Title search vendor has been added." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/title/vendors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateTitle();
      toast({ title: "Updated", description: "Vendor has been updated." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (commitmentsLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!activeCommitment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Shield className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No Title Commitment</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create a title commitment to begin tracking title insurance, schedule B exceptions, and vendor assignments for this transaction.
            </p>
            <Button onClick={() => setCreateCommitmentOpen(true)} data-testid="button-create-commitment">
              <Plus className="mr-2 h-4 w-4" />
              Create Title Commitment
            </Button>
          </CardContent>
        </Card>
        <CommitmentFormDialog
          open={createCommitmentOpen}
          onClose={() => setCreateCommitmentOpen(false)}
          form={commitmentForm}
          setForm={setCommitmentForm}
          onSubmit={() => {
            const payload: Record<string, unknown> = { ...commitmentForm };
            if (commitmentForm.policyAmount) payload.policyAmount = commitmentForm.policyAmount;
            if (commitmentForm.premium) payload.premium = commitmentForm.premium;
            if (!commitmentForm.effectiveDate) delete payload.effectiveDate;
            createCommitmentMutation.mutate(payload);
          }}
          isPending={createCommitmentMutation.isPending}
          title="Create Title Commitment"
        />
      </div>
    );
  }

  const noteEntries = selectedExceptionData ? parseNoteEntries(selectedExceptionData.notes || "") : [];

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {activeCommitment.commitmentNumber || "Title Commitment"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {activeCommitment.underwriter || "No underwriter"} &middot; {activeCommitment.propertyAddress || "No address"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={commitmentStatusColors[activeCommitment.status] || ""} data-testid="badge-commitment-status">
              {commitmentStatusLabels[activeCommitment.status] || activeCommitment.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => {
              setCommitmentForm({
                underwriter: activeCommitment.underwriter || "",
                effectiveDate: activeCommitment.effectiveDate || "",
                policyAmount: activeCommitment.policyAmount || "",
                premium: activeCommitment.premium || "",
                commitmentType: activeCommitment.commitmentType || "owner",
                legalDescription: activeCommitment.legalDescription || "",
                propertyAddress: activeCommitment.propertyAddress || "",
                county: activeCommitment.county || "",
                state: activeCommitment.state || "FL",
              });
              setEditCommitmentOpen(true);
            }} data-testid="button-edit-commitment">
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Policy Amount</p>
              <p className="text-sm font-medium">{activeCommitment.policyAmount ? `$${Number(activeCommitment.policyAmount).toLocaleString()}` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Premium</p>
              <p className="text-sm font-medium">{activeCommitment.premium ? `$${Number(activeCommitment.premium).toLocaleString()}` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Effective Date</p>
              <p className="text-sm font-medium">{activeCommitment.effectiveDate || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm font-medium capitalize">{activeCommitment.commitmentType || "—"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Exception Clearance</span>
              <span className="font-medium">{clearancePercent}%</span>
            </div>
            <Progress value={clearancePercent} className="h-2" data-testid="progress-clearance" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{openCount} open</span>
              <span>{clearedCount} cleared</span>
              <span>{waivedCount} waived</span>
              <span>{totalExceptions} total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">Vendor Tracking</h3>
          <Button size="sm" variant="outline" onClick={() => setCreateVendorOpen(true)} data-testid="button-add-vendor">
            <Plus className="mr-1 h-3 w-3" />
            Add Vendor
          </Button>
        </div>
        {vendorsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : vendors.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No vendors assigned yet. Add a vendor to track title search progress.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vendors.map((v) => (
              <Card key={v.id} data-testid={`card-vendor-${v.id}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{v.vendorName}</p>
                      <p className="text-xs text-muted-foreground">{vendorTypeLabels[v.vendorType || ""] || v.vendorType}</p>
                    </div>
                    <Badge className={vendorStatusColors[v.status] || ""} data-testid={`badge-vendor-status-${v.id}`}>
                      {vendorStatusLabels[v.status] || v.status}
                    </Badge>
                  </div>
                  {v.taskDescription && <p className="text-xs text-muted-foreground">{v.taskDescription}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {v.orderedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {v.orderedDate}
                      </span>
                    )}
                    {v.cost && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${Number(v.cost).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {v.contactName && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {v.contactName}
                      {v.contactEmail && <span className="ml-1">({v.contactEmail})</span>}
                    </div>
                  )}
                  <div className="flex gap-1 pt-1">
                    {v.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateVendorMutation.mutate({ id: v.id, data: { status: v.status === "ordered" ? "in_progress" : "completed" } })}
                        data-testid={`button-advance-vendor-${v.id}`}
                      >
                        {v.status === "ordered" ? "Start" : "Complete"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditVendorId(v.id);
                        setEditVendorForm({
                          vendorName: v.vendorName || "",
                          vendorType: v.vendorType || "abstract_company",
                          taskDescription: v.taskDescription || "",
                          orderedDate: v.orderedDate || "",
                          cost: v.cost || "",
                          contactName: v.contactName || "",
                          contactEmail: v.contactEmail || "",
                          contactPhone: v.contactPhone || "",
                          notes: v.notes || "",
                        });
                      }}
                      data-testid={`button-edit-vendor-${v.id}`}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-medium">Schedule B Exceptions</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
                <SelectItem value="partially_cleared">Partial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(exceptionTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setCreateExceptionOpen(true)} data-testid="button-add-exception">
              <Plus className="mr-1 h-3 w-3" />
              Add Exception
            </Button>
          </div>
        </div>

        {exceptionsLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : filteredExceptions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {exceptions.length === 0
                ? "No exceptions recorded. Add Schedule B exceptions from the title commitment."
                : "No exceptions match the current filters."}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-auto">
              <table className="w-full text-sm" data-testid="table-exceptions">
                <thead>
                  <tr className="border-b text-left">
                    <th
                      className="p-3 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("scheduleItem")}
                      data-testid="th-sort-item"
                    >
                      Item <SortIcon field="scheduleItem" />
                    </th>
                    <th
                      className="p-3 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("exceptionType")}
                      data-testid="th-sort-type"
                    >
                      Type <SortIcon field="exceptionType" />
                    </th>
                    <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">Description</th>
                    <th
                      className="p-3 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("priority")}
                      data-testid="th-sort-priority"
                    >
                      Priority <SortIcon field="priority" />
                    </th>
                    <th
                      className="p-3 font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={() => handleSort("status")}
                      data-testid="th-sort-status"
                    >
                      Status <SortIcon field="status" />
                    </th>
                    <th
                      className="p-3 font-medium text-muted-foreground hidden lg:table-cell cursor-pointer select-none"
                      onClick={() => handleSort("dueDate")}
                      data-testid="th-sort-due-date"
                    >
                      Due Date <SortIcon field="dueDate" />
                    </th>
                    <th className="p-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExceptions.map((exc) => (
                    <tr
                      key={exc.id}
                      className="border-b hover-elevate cursor-pointer"
                      onClick={() => setSelectedExceptionId(exc.id)}
                      data-testid={`row-exception-${exc.id}`}
                    >
                      <td className="p-3 font-medium">{exc.scheduleItem || "—"}</td>
                      <td className="p-3">{exceptionTypeLabels[exc.exceptionType || ""] || exc.exceptionType || "—"}</td>
                      <td className="p-3 hidden md:table-cell max-w-[300px] truncate text-muted-foreground">{exc.description || "—"}</td>
                      <td className="p-3">
                        <Badge className={priorityColors[exc.priority] || ""} data-testid={`badge-priority-${exc.id}`}>
                          {exc.priority}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={exceptionStatusColors[exc.status] || ""} data-testid={`badge-exception-status-${exc.id}`}>
                          {exceptionStatusLabels[exc.status] || exc.status}
                        </Badge>
                      </td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{exc.dueDate || "—"}</td>
                      <td className="p-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <CommitmentFormDialog
        open={createCommitmentOpen}
        onClose={() => setCreateCommitmentOpen(false)}
        form={commitmentForm}
        setForm={setCommitmentForm}
        onSubmit={() => {
          const payload: Record<string, unknown> = { ...commitmentForm };
          if (!commitmentForm.effectiveDate) delete payload.effectiveDate;
          createCommitmentMutation.mutate(payload);
        }}
        isPending={createCommitmentMutation.isPending}
        title="Create Title Commitment"
      />

      <CommitmentFormDialog
        open={editCommitmentOpen}
        onClose={() => setEditCommitmentOpen(false)}
        form={commitmentForm}
        setForm={setCommitmentForm}
        onSubmit={() => {
          const payload: Record<string, unknown> = { ...commitmentForm };
          if (!commitmentForm.effectiveDate) delete payload.effectiveDate;
          updateCommitmentMutation.mutate(payload);
        }}
        isPending={updateCommitmentMutation.isPending}
        title="Edit Title Commitment"
      />

      <Dialog open={createExceptionOpen} onOpenChange={setCreateExceptionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Exception</DialogTitle>
            <DialogDescription>Add a Schedule B exception to track.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Schedule Item</Label>
                <Input placeholder="e.g. B-1" value={exceptionForm.scheduleItem} onChange={(e) => setExceptionForm({ ...exceptionForm, scheduleItem: e.target.value })} data-testid="input-exception-item" />
              </div>
              <div>
                <Label>Section</Label>
                <Select value={exceptionForm.scheduleSection} onValueChange={(v) => setExceptionForm({ ...exceptionForm, scheduleSection: v })}>
                  <SelectTrigger data-testid="select-exception-section"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b1_requirements">B-1 Requirements</SelectItem>
                    <SelectItem value="b2_exceptions">B-2 Exceptions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={exceptionForm.exceptionType} onValueChange={(v) => setExceptionForm({ ...exceptionForm, exceptionType: v })}>
                  <SelectTrigger data-testid="select-exception-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(exceptionTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={exceptionForm.priority} onValueChange={(v) => setExceptionForm({ ...exceptionForm, priority: v })}>
                  <SelectTrigger data-testid="select-exception-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={exceptionForm.description} onChange={(e) => setExceptionForm({ ...exceptionForm, description: e.target.value })} rows={3} data-testid="input-exception-description" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={exceptionForm.dueDate} onChange={(e) => setExceptionForm({ ...exceptionForm, dueDate: e.target.value })} data-testid="input-exception-due-date" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={exceptionForm.notes} onChange={(e) => setExceptionForm({ ...exceptionForm, notes: e.target.value })} rows={2} data-testid="input-exception-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateExceptionOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const payload: Record<string, unknown> = { ...exceptionForm };
              if (!exceptionForm.dueDate) delete payload.dueDate;
              createExceptionMutation.mutate(payload);
            }} disabled={createExceptionMutation.isPending} data-testid="button-submit-exception">
              {createExceptionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createVendorOpen} onOpenChange={setCreateVendorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>Add a title search vendor to track.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vendor Name</Label>
                <Input value={vendorForm.vendorName} onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })} data-testid="input-vendor-name" />
              </div>
              <div>
                <Label>Vendor Type</Label>
                <Select value={vendorForm.vendorType} onValueChange={(v) => setVendorForm({ ...vendorForm, vendorType: v })}>
                  <SelectTrigger data-testid="select-vendor-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(vendorTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Task Description</Label>
              <Textarea value={vendorForm.taskDescription} onChange={(e) => setVendorForm({ ...vendorForm, taskDescription: e.target.value })} rows={2} data-testid="input-vendor-task" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date Ordered</Label>
                <Input type="date" value={vendorForm.orderedDate} onChange={(e) => setVendorForm({ ...vendorForm, orderedDate: e.target.value })} data-testid="input-vendor-date" />
              </div>
              <div>
                <Label>Cost</Label>
                <Input type="number" placeholder="0.00" value={vendorForm.cost} onChange={(e) => setVendorForm({ ...vendorForm, cost: e.target.value })} data-testid="input-vendor-cost" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input value={vendorForm.contactName} onChange={(e) => setVendorForm({ ...vendorForm, contactName: e.target.value })} data-testid="input-vendor-contact" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={vendorForm.contactEmail} onChange={(e) => setVendorForm({ ...vendorForm, contactEmail: e.target.value })} data-testid="input-vendor-email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={vendorForm.contactPhone} onChange={(e) => setVendorForm({ ...vendorForm, contactPhone: e.target.value })} data-testid="input-vendor-phone" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateVendorOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!vendorForm.vendorName.trim()) { toast({ title: "Error", description: "Vendor name is required.", variant: "destructive" }); return; }
              const payload: Record<string, unknown> = { ...vendorForm };
              if (!vendorForm.cost) delete payload.cost;
              if (!vendorForm.orderedDate) delete payload.orderedDate;
              createVendorMutation.mutate(payload);
            }} disabled={createVendorMutation.isPending} data-testid="button-submit-vendor">
              {createVendorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedExceptionId} onOpenChange={(open) => { if (!open) setSelectedExceptionId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="drawer-exception-detail">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Exception {selectedExceptionData?.scheduleItem || ""}
            </SheetTitle>
            <SheetDescription>
              {exceptionTypeLabels[selectedExceptionData?.exceptionType || ""] || "Exception"} Details
            </SheetDescription>
          </SheetHeader>
          {selectedExceptionData && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={exceptionStatusColors[selectedExceptionData.status] || ""}>
                  {exceptionStatusLabels[selectedExceptionData.status] || selectedExceptionData.status}
                </Badge>
                <Badge className={priorityColors[selectedExceptionData.priority] || ""}>
                  {selectedExceptionData.priority}
                </Badge>
                {selectedExceptionData.scheduleSection && (
                  <Badge variant="outline">
                    {selectedExceptionData.scheduleSection === "b1_requirements" ? "B-1 Requirements" : "B-2 Exceptions"}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedExceptionData.description || "No description provided."}</p>
                </div>
                {selectedExceptionData.assignedTo && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Assigned To</p>
                    <p className="text-sm flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedExceptionData.assignedTo}
                    </p>
                  </div>
                )}
                {selectedExceptionData.dueDate && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Due Date</p>
                    <p className="text-sm">{selectedExceptionData.dueDate}</p>
                  </div>
                )}
                {selectedExceptionData.waiverReason && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Waiver Reason</p>
                    <p className="text-sm">{selectedExceptionData.waiverReason}</p>
                  </div>
                )}
                {selectedExceptionData.clearedDate && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Cleared Date</p>
                    <p className="text-sm">{selectedExceptionData.clearedDate}</p>
                  </div>
                )}
              </div>

              {noteEntries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Activity History
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {noteEntries.map((entry, idx) => (
                      <div key={idx} className="flex gap-2 text-xs border-l-2 border-muted pl-3 py-1" data-testid={`note-entry-${idx}`}>
                        <div>
                          {entry.timestamp && (
                            <p className="text-muted-foreground mb-0.5">{entry.timestamp}</p>
                          )}
                          <p className="text-sm">{entry.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ExceptionAIAnalysis dealId={dealId} exceptionId={selectedExceptionData.id} />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Actions</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedExceptionData.status === "open" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateExceptionMutation.mutate({ id: selectedExceptionData.id, data: { status: "cleared" } });
                          setSelectedExceptionId(null);
                        }}
                        disabled={updateExceptionMutation.isPending}
                        data-testid="button-clear-exception"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Mark Cleared
                      </Button>
                      <WaiveExceptionButton
                        exceptionId={selectedExceptionData.id}
                        dealId={dealId}
                        onDone={() => {
                          invalidateTitle();
                          setSelectedExceptionId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAssignee(selectedExceptionData.assignedTo || "");
                          setAssignDialogOpen(true);
                        }}
                        data-testid="button-assign-exception"
                      >
                        <UserPlus className="mr-1 h-3 w-3" />
                        Assign
                      </Button>
                    </>
                  )}
                  {selectedExceptionData.status === "partially_cleared" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateExceptionMutation.mutate({ id: selectedExceptionData.id, data: { status: "cleared" } });
                          setSelectedExceptionId(null);
                        }}
                        disabled={updateExceptionMutation.isPending}
                        data-testid="button-fully-clear-exception"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Mark Fully Cleared
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAssignee(selectedExceptionData.assignedTo || "");
                          setAssignDialogOpen(true);
                        }}
                        data-testid="button-assign-exception-partial"
                      >
                        <UserPlus className="mr-1 h-3 w-3" />
                        Assign
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <AddNoteToException
                exceptionId={selectedExceptionData.id}
                currentNotes={selectedExceptionData.notes || ""}
                dealId={dealId}
                onDone={() => invalidateTitle()}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Exception</DialogTitle>
            <DialogDescription>Enter the name or ID of the person to assign this exception to.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Assignee</Label>
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Enter assignee name or ID"
              data-testid="input-assignee"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedExceptionId && assignee.trim()) {
                  updateExceptionMutation.mutate({
                    id: selectedExceptionId,
                    data: { assignedTo: assignee.trim() },
                  });
                  setAssignDialogOpen(false);
                }
              }}
              disabled={!assignee.trim() || updateExceptionMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {updateExceptionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVendorId} onOpenChange={(open) => { if (!open) setEditVendorId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vendor Name</Label>
                <Input value={editVendorForm.vendorName} onChange={(e) => setEditVendorForm({ ...editVendorForm, vendorName: e.target.value })} data-testid="input-edit-vendor-name" />
              </div>
              <div>
                <Label>Vendor Type</Label>
                <Select value={editVendorForm.vendorType} onValueChange={(v) => setEditVendorForm({ ...editVendorForm, vendorType: v })}>
                  <SelectTrigger data-testid="select-edit-vendor-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(vendorTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Task Description</Label>
              <Textarea value={editVendorForm.taskDescription} onChange={(e) => setEditVendorForm({ ...editVendorForm, taskDescription: e.target.value })} rows={2} data-testid="input-edit-vendor-task" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date Ordered</Label>
                <Input type="date" value={editVendorForm.orderedDate} onChange={(e) => setEditVendorForm({ ...editVendorForm, orderedDate: e.target.value })} data-testid="input-edit-vendor-date" />
              </div>
              <div>
                <Label>Cost</Label>
                <Input type="number" placeholder="0.00" value={editVendorForm.cost} onChange={(e) => setEditVendorForm({ ...editVendorForm, cost: e.target.value })} data-testid="input-edit-vendor-cost" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input value={editVendorForm.contactName} onChange={(e) => setEditVendorForm({ ...editVendorForm, contactName: e.target.value })} data-testid="input-edit-vendor-contact" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editVendorForm.contactEmail} onChange={(e) => setEditVendorForm({ ...editVendorForm, contactEmail: e.target.value })} data-testid="input-edit-vendor-email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editVendorForm.contactPhone} onChange={(e) => setEditVendorForm({ ...editVendorForm, contactPhone: e.target.value })} data-testid="input-edit-vendor-phone" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={editVendorForm.notes} onChange={(e) => setEditVendorForm({ ...editVendorForm, notes: e.target.value })} rows={2} data-testid="input-edit-vendor-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVendorId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editVendorId || !editVendorForm.vendorName.trim()) return;
                const payload: Record<string, unknown> = { ...editVendorForm };
                if (!editVendorForm.cost) delete payload.cost;
                if (!editVendorForm.orderedDate) delete payload.orderedDate;
                updateVendorMutation.mutate({ id: editVendorId, data: payload });
                setEditVendorId(null);
              }}
              disabled={updateVendorMutation.isPending}
              data-testid="button-submit-edit-vendor"
            >
              {updateVendorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommitmentFormDialog({
  open, onClose, form, setForm, onSubmit, isPending, title,
}: {
  open: boolean;
  onClose: () => void;
  form: CommitmentFormState;
  setForm: (f: CommitmentFormState) => void;
  onSubmit: () => void;
  isPending: boolean;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enter title commitment details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Underwriter</Label>
            <Select value={form.underwriter} onValueChange={(v) => setForm({ ...form, underwriter: v })}>
              <SelectTrigger data-testid="select-underwriter"><SelectValue placeholder="Select underwriter" /></SelectTrigger>
              <SelectContent>
                {underwriterOptions.map((uw) => (
                  <SelectItem key={uw} value={uw}>{uw}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Property Address</Label>
            <Input value={form.propertyAddress} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })} data-testid="input-commitment-address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commitment Type</Label>
              <Select value={form.commitmentType} onValueChange={(v) => setForm({ ...form, commitmentType: v })}>
                <SelectTrigger data-testid="select-commitment-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="simultaneous">Simultaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} data-testid="input-commitment-date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Policy Amount</Label>
              <Input type="number" placeholder="0.00" value={form.policyAmount} onChange={(e) => setForm({ ...form, policyAmount: e.target.value })} data-testid="input-policy-amount" />
            </div>
            <div>
              <Label>Premium</Label>
              <Input type="number" placeholder="0.00" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} data-testid="input-premium" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>County</Label>
              <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} data-testid="input-county" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} data-testid="input-state" />
            </div>
          </div>
          <div>
            <Label>Legal Description</Label>
            <Textarea value={form.legalDescription} onChange={(e) => setForm({ ...form, legalDescription: e.target.value })} rows={3} className="font-mono text-xs" data-testid="input-legal-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isPending} data-testid="button-submit-commitment">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WaiveExceptionButton({ exceptionId, dealId, onDone }: { exceptionId: string; dealId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const waiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/title/exceptions/${exceptionId}`, {
        status: "waived",
        waiverReason: reason,
      });
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      setReason("");
      onDone();
      toast({ title: "Exception Waived" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} data-testid="button-waive-exception">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Waive
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Waive Exception</DialogTitle>
            <DialogDescription>Provide a reason for waiving this exception.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Waiver reason..." rows={3} data-testid="input-waiver-reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => waiveMutation.mutate()} disabled={!reason.trim() || waiveMutation.isPending} data-testid="button-confirm-waive">
              {waiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Waive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddNoteToException({ exceptionId, currentNotes, dealId, onDone }: { exceptionId: string; currentNotes: string; dealId: string; onDone: () => void }) {
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const timestamp = new Date().toLocaleString();
      const updatedNotes = currentNotes
        ? `${currentNotes}\n\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/title/exceptions/${exceptionId}`, {
        notes: updatedNotes,
      });
      return res.json();
    },
    onSuccess: () => {
      setNote("");
      onDone();
      toast({ title: "Note Added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <MessageSquare className="h-3 w-3" />
        Add Note
      </p>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note..." rows={2} data-testid="input-add-note" />
      <Button
        size="sm"
        variant="outline"
        onClick={() => addNoteMutation.mutate()}
        disabled={!note.trim() || addNoteMutation.isPending}
        data-testid="button-add-note"
      >
        {addNoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add Note
      </Button>
    </div>
  );
}

interface AIAnalysisResult {
  riskLevel: string;
  riskAssessment: string;
  recommendedActions: string[];
  relatedConsiderations: string[];
  surveyFindings?: string;
}

function ExceptionAIAnalysis({ dealId, exceptionId }: { dealId: string; exceptionId: string }) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const riskColors: Record<string, string> = {
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", `/api/deals/${dealId}/title/exceptions/${exceptionId}/ai-analysis`);
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      toast({ title: "AI Analysis Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI Analysis
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={runAnalysis}
          disabled={loading}
          data-testid="button-ai-analyze-exception"
        >
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
          {loading ? "Analyzing..." : "Run AI Analysis"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 border rounded-md p-3 border-primary/30">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-medium flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          AI Risk Assessment
        </p>
        <Badge className={riskColors[analysis.riskLevel] || ""} data-testid="badge-risk-level">
          {analysis.riskLevel?.toUpperCase()}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed" data-testid="text-risk-assessment">{analysis.riskAssessment}</p>

      {analysis.recommendedActions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Actions</p>
          <ol className="list-decimal list-inside space-y-0.5">
            {analysis.recommendedActions.map((a, i) => (
              <li key={i} className="text-xs" data-testid={`text-action-${i}`}>{a}</li>
            ))}
          </ol>
        </div>
      )}

      {analysis.relatedConsiderations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Related Considerations</p>
          <ul className="list-disc list-inside space-y-0.5">
            {analysis.relatedConsiderations.map((c, i) => (
              <li key={i} className="text-xs" data-testid={`text-consideration-${i}`}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.surveyFindings && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Survey Cross-Reference</p>
          <p className="text-xs" data-testid="text-survey-findings">{analysis.surveyFindings}</p>
        </div>
      )}
    </div>
  );
}
