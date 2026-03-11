import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getStatementTypeForm } from "@/components/closing/statement-type-forms";
import { ProrationCalculator } from "@/components/closing/proration-calculator";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  DollarSign,
  Users,
  Calculator,
  Landmark,
  CreditCard,
  Percent,
  ArrowRightLeft,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  Check,
  Ban,
  Download,
  Printer,
  FolderOpen,
} from "lucide-react";
import type {
  ClosingTransaction,
  ClosingLineItem,
  ClosingParty,
  ClosingProration,
  ClosingEscrow,
  ClosingPayoff,
  ClosingCommission,
  ClosingWire,
} from "@shared/schema";

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

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  executed: "Executed",
  voided: "Voided",
};

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    balanced?: boolean;
  };
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  executed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  voided: "bg-red-500/20 text-red-400 border-red-500/30",
};

const categoryLabels: Record<string, string> = {
  purchase_price: "Purchase Price",
  earnest_money: "Earnest Money",
  loan_amount: "Loan Amount",
  seller_credit: "Seller Credit",
  buyer_credit: "Buyer Credit",
  title_insurance: "Title Insurance",
  escrow_fee: "Escrow Fee",
  recording_fee: "Recording Fee",
  transfer_tax: "Transfer Tax",
  property_tax_proration: "Property Tax Proration",
  insurance_proration: "Insurance Proration",
  hoa_proration: "HOA Proration",
  rent_proration: "Rent Proration",
  commission: "Commission",
  attorney_fee: "Attorney Fee",
  inspection_fee: "Inspection Fee",
  appraisal_fee: "Appraisal Fee",
  survey_fee: "Survey Fee",
  loan_origination: "Loan Origination",
  loan_discount: "Loan Discount Points",
  prepaid_interest: "Prepaid Interest",
  mortgage_insurance: "Mortgage Insurance",
  payoff_first_mortgage: "Payoff - 1st Mortgage",
  payoff_second_mortgage: "Payoff - 2nd Mortgage",
  payoff_other_lien: "Payoff - Other Lien",
  construction_draw: "Construction Draw",
  holdback: "Holdback",
  reserve: "Reserve",
  adjustment: "Adjustment",
  other: "Other",
};

const sideLabels: Record<string, string> = {
  source: "Source",
  use: "Use",
  buyer_debit: "Buyer Debit",
  buyer_credit: "Buyer Credit",
  seller_debit: "Seller Debit",
  seller_credit: "Seller Credit",
};

const roleLabels: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  lender: "Lender",
  title_company: "Title Company",
  escrow_agent: "Escrow Agent",
  closing_attorney: "Closing Attorney",
  broker_buyer: "Buyer's Broker",
  broker_seller: "Seller's Broker",
  surveyor: "Surveyor",
  appraiser: "Appraiser",
  inspector: "Inspector",
  qi_intermediary: "QI / Intermediary",
  guarantor: "Guarantor",
  investor: "Investor",
  other: "Other",
};

const wireStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function formatCurrency(val: string | null | undefined): string {
  if (!val) return "$0.00";
  const n = parseFloat(val.replace(/[,$\s]/g, ""));
  if (isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type SummaryData = {
  closing: ClosingTransaction;
  balance: { totalSources: string; totalUses: string; difference: string; balanceValid: boolean };
  lineItems: ClosingLineItem[];
  parties: ClosingParty[];
  prorations: { items: ClosingProration[]; totalBuyerCredit: string; totalSellerCredit: string };
  escrows: ClosingEscrow[];
  payoffs: ClosingPayoff[];
  commissions: ClosingCommission[];
  wires: ClosingWire[];
};

function getStatementSections(type: string): { key: string; label: string; hudRange?: string }[] {
  if (type === "hud1" || type === "hud1a") {
    return [
      { key: "100", label: "100 - Gross Amount Due From Borrower", hudRange: "100" },
      { key: "200", label: "200 - Amounts Paid By/On Behalf Of Borrower", hudRange: "200" },
      { key: "300", label: "300 - Cash At Settlement From/To Borrower", hudRange: "300" },
      { key: "400", label: "400 - Gross Amount Due To Seller", hudRange: "400" },
      { key: "500", label: "500 - Reductions In Amount Due Seller", hudRange: "500" },
      { key: "600", label: "600 - Cash At Settlement To/From Seller", hudRange: "600" },
      { key: "700", label: "700 - Total Sales/Broker Commission", hudRange: "700" },
      { key: "800", label: "800 - Items Payable In Connection With Loan", hudRange: "800" },
      { key: "900", label: "900 - Items Required By Lender", hudRange: "900" },
      { key: "1000", label: "1000 - Reserves Deposited With Lender", hudRange: "1000" },
      { key: "1100", label: "1100 - Title Charges", hudRange: "1100" },
      { key: "1200", label: "1200 - Government Recording And Transfer Charges", hudRange: "1200" },
      { key: "1300", label: "1300 - Additional Settlement Charges", hudRange: "1300" },
    ];
  }
  if (type.startsWith("alta")) {
    return [
      { key: "financial", label: "Financial - Purchase Price & Adjustments" },
      { key: "prorations", label: "Prorations & Adjustments" },
      { key: "commissions", label: "Broker Commissions" },
      { key: "title", label: "Title & Escrow Charges" },
      { key: "taxes", label: "Transfer Taxes & Recording" },
      { key: "payoffs", label: "Payoffs & Liens" },
      { key: "escrows", label: "Escrow & Reserve Deposits" },
      { key: "other", label: "Other Charges" },
    ];
  }
  if (type === "closing_disclosure" || type === "seller_closing_disclosure") {
    return [
      { key: "loan_terms", label: "Loan Terms" },
      { key: "projected_payments", label: "Projected Payments" },
      { key: "closing_costs", label: "Closing Costs" },
      { key: "cash_to_close", label: "Cash to Close" },
      { key: "summaries", label: "Summaries of Transactions" },
    ];
  }
  if (type === "sources_and_uses" || type === "construction_sources_uses") {
    return [
      { key: "sources", label: "Sources of Funds" },
      { key: "uses", label: "Uses of Funds" },
    ];
  }
  if (type === "funds_flow") {
    return [
      { key: "incoming", label: "Incoming Wires" },
      { key: "outgoing", label: "Outgoing Wires" },
    ];
  }
  if (type === "1031_exchange" || type === "qi_statement") {
    return [
      { key: "relinquished", label: "Relinquished Property" },
      { key: "replacement", label: "Replacement Property" },
      { key: "exchange_funds", label: "Exchange Funds" },
    ];
  }
  if (type === "portfolio_settlement") {
    return [
      { key: "summary", label: "Portfolio Summary" },
      { key: "allocations", label: "Property Allocations" },
    ];
  }
  return [
    { key: "all", label: "All Line Items" },
  ];
}

export default function ClosingDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("line-items");

  const [lineItemDialog, setLineItemDialog] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<ClosingLineItem | null>(null);
  const [lineItemForm, setLineItemForm] = useState({
    category: "other",
    side: "use",
    description: "",
    amount: "",
    lineNumber: "",
    hudSection: "",
    altaCategory: "",
    cdSection: "",
    paidBy: "",
    paidTo: "",
  });

  const [partyDialog, setPartyDialog] = useState(false);
  const [editingParty, setEditingParty] = useState<ClosingParty | null>(null);
  const [partyForm, setPartyForm] = useState({
    role: "buyer",
    name: "",
    entityType: "",
    address: "",
    phone: "",
    email: "",
    taxId: "",
    signerName: "",
    signerTitle: "",
  });

  const [prorationDialog, setProrationDialog] = useState(false);
  const [editingProration, setEditingProration] = useState<ClosingProration | null>(null);
  const [prorationForm, setProrationForm] = useState({
    itemName: "",
    annualAmount: "",
    periodStartDate: "",
    periodEndDate: "",
    prorateDate: "",
    method: "calendar_day",
  });

  const [escrowDialog, setEscrowDialog] = useState(false);
  const [editingEscrow, setEditingEscrow] = useState<ClosingEscrow | null>(null);
  const [escrowForm, setEscrowForm] = useState({
    escrowType: "",
    holder: "",
    amount: "",
    depositDate: "",
    releaseCondition: "",
  });

  const [payoffDialog, setPayoffDialog] = useState(false);
  const [editingPayoff, setEditingPayoff] = useState<ClosingPayoff | null>(null);
  const [payoffForm, setPayoffForm] = useState({
    lienType: "",
    lender: "",
    accountNumber: "",
    currentBalance: "",
    perDiemInterest: "",
    payoffGoodThrough: "",
    totalPayoff: "",
  });

  const [commissionDialog, setCommissionDialog] = useState(false);
  const [editingCommission, setEditingCommission] = useState<ClosingCommission | null>(null);
  const [commissionForm, setCommissionForm] = useState({
    recipientName: "",
    recipientRole: "",
    basisAmount: "",
    rate: "",
    amount: "",
    paidBy: "",
  });

  const [wireDialog, setWireDialog] = useState(false);
  const [editingWire, setEditingWire] = useState<ClosingWire | null>(null);
  const [wireForm, setWireForm] = useState({
    direction: "outgoing",
    fromParty: "",
    toParty: "",
    amount: "",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    reference: "",
  });

  const [closingHeaderEdit, setClosingHeaderEdit] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [headerForm, setHeaderForm] = useState({
    title: "",
    fileNumber: "",
    closingDate: "",
    disbursementDate: "",
    propertyAddress: "",
    purchasePrice: "",
    loanAmount: "",
    earnestMoney: "",
    notes: "",
    status: "draft",
  });

  const { data: closing, isLoading } = useQuery<ClosingTransaction>({
    queryKey: ["/api/closings", id],
  });

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<SummaryData>({
    queryKey: ["/api/closings", id, "summary"],
    enabled: !!id,
  });

  const { data: lineItems = [], refetch: refetchLineItems } = useQuery<ClosingLineItem[]>({
    queryKey: ["/api/closings", id, "line-items"],
    enabled: !!id,
  });

  const { data: parties = [], refetch: refetchParties } = useQuery<ClosingParty[]>({
    queryKey: ["/api/closings", id, "parties"],
    enabled: !!id,
  });

  const { data: prorations = [], refetch: refetchProrations } = useQuery<ClosingProration[]>({
    queryKey: ["/api/closings", id, "prorations"],
    enabled: !!id,
  });

  const { data: escrows = [], refetch: refetchEscrows } = useQuery<ClosingEscrow[]>({
    queryKey: ["/api/closings", id, "escrows"],
    enabled: !!id,
  });

  const { data: payoffs = [], refetch: refetchPayoffs } = useQuery<ClosingPayoff[]>({
    queryKey: ["/api/closings", id, "payoffs"],
    enabled: !!id,
  });

  const { data: commissions = [], refetch: refetchCommissions } = useQuery<ClosingCommission[]>({
    queryKey: ["/api/closings", id, "commissions"],
    enabled: !!id,
  });

  const { data: wires = [], refetch: refetchWires } = useQuery<ClosingWire[]>({
    queryKey: ["/api/closings", id, "wires"],
    enabled: !!id,
  });

  const saveToDataRoomMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/closings/${id}/save-to-data-room`);
      return res.json();
    },
    onSuccess: (data: { message?: string }) => {
      toast({ title: "Saved to Data Room", description: data.message || "Closing statement saved to the data room." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err?.message || "Failed to save to data room.", variant: "destructive" });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (): Promise<ValidationResult> => {
      const res = await apiRequest("POST", `/api/closings/${id}/validate`);
      return res.json();
    },
    onSuccess: (data: ValidationResult) => {
      setValidationResult(data);
      if (data.valid) {
        toast({ title: "Validation Passed", description: "All checks passed successfully." });
      } else {
        toast({ title: "Validation Complete", description: `Found ${data.summary.errors} errors and ${data.summary.warnings} warnings.`, variant: data.summary.errors > 0 ? "destructive" : "default" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err?.message || "Validation failed.", variant: "destructive" });
    },
  });

  const updateClosingMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/closings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/closings", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/closings", id, "summary"] });
      toast({ title: "Updated", description: "Closing statement updated." });
      setClosingHeaderEdit(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    },
  });

  const createLineItemMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/closings/${id}/line-items`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchLineItems();
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ["/api/closings", id] });
      toast({ title: "Added", description: "Line item added." });
      setLineItemDialog(false);
      resetLineItemForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add line item.", variant: "destructive" });
    },
  });

  const updateLineItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/closing-line-items/${itemId}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchLineItems();
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ["/api/closings", id] });
      toast({ title: "Updated", description: "Line item updated." });
      setLineItemDialog(false);
      setEditingLineItem(null);
      resetLineItemForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update line item.", variant: "destructive" });
    },
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/closing-line-items/${itemId}`);
    },
    onSuccess: () => {
      refetchLineItems();
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ["/api/closings", id] });
      toast({ title: "Deleted", description: "Line item removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    },
  });

  const createPartyMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/closings/${id}/parties`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchParties();
      toast({ title: "Added", description: "Party added." });
      setPartyDialog(false);
      resetPartyForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add party.", variant: "destructive" });
    },
  });

  const updatePartyMutation = useMutation({
    mutationFn: async ({ partyId, data }: { partyId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/closing-parties/${partyId}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchParties();
      toast({ title: "Updated", description: "Party updated." });
      setPartyDialog(false);
      setEditingParty(null);
      resetPartyForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update party.", variant: "destructive" });
    },
  });

  const deletePartyMutation = useMutation({
    mutationFn: async (partyId: string) => {
      await apiRequest("DELETE", `/api/closing-parties/${partyId}`);
    },
    onSuccess: () => {
      refetchParties();
      toast({ title: "Deleted", description: "Party removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    },
  });

  const createProrationMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/closings/${id}/prorations`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchProrations();
      toast({ title: "Added", description: "Proration added." });
      setProrationDialog(false);
      resetProrationForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add proration.", variant: "destructive" });
    },
  });

  const updateProrationMutation = useMutation({
    mutationFn: async ({ prorationId, data }: { prorationId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/closing-prorations/${prorationId}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchProrations();
      toast({ title: "Updated", description: "Proration updated." });
      setProrationDialog(false);
      setEditingProration(null);
      resetProrationForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update proration.", variant: "destructive" });
    },
  });

  const deleteProrationMutation = useMutation({
    mutationFn: async (prorationId: string) => {
      await apiRequest("DELETE", `/api/closing-prorations/${prorationId}`);
    },
    onSuccess: () => {
      refetchProrations();
      toast({ title: "Deleted", description: "Proration removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    },
  });

  const createEscrowMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/closings/${id}/escrows`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchEscrows();
      toast({ title: "Added", description: "Escrow added." });
      setEscrowDialog(false);
      resetEscrowForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add escrow.", variant: "destructive" });
    },
  });

  const updateEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, data }: { escrowId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/closing-escrows/${escrowId}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchEscrows();
      toast({ title: "Updated", description: "Escrow updated." });
      setEscrowDialog(false);
      setEditingEscrow(null);
      resetEscrowForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update escrow.", variant: "destructive" });
    },
  });

  const deleteEscrowMutation = useMutation({
    mutationFn: async (escrowId: string) => {
      await apiRequest("DELETE", `/api/closing-escrows/${escrowId}`);
    },
    onSuccess: () => {
      refetchEscrows();
      toast({ title: "Deleted", description: "Escrow removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    },
  });

  const createPayoffMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/closings/${id}/payoffs`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchPayoffs();
      toast({ title: "Added", description: "Payoff added." });
      setPayoffDialog(false);
      resetPayoffForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add payoff.", variant: "destructive" });
    },
  });

  const updatePayoffMutation = useMutation({
    mutationFn: async ({ payoffId, data }: { payoffId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/closing-payoffs/${payoffId}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchPayoffs();
      toast({ title: "Updated", description: "Payoff updated." });
      setPayoffDialog(false);
      setEditingPayoff(null);
      resetPayoffForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update payoff.", variant: "destructive" });
    },
  });

  const deletePayoffMutation = useMutation({
    mutationFn: async (payoffId: string) => {
      await apiRequest("DELETE", `/api/closing-payoffs/${payoffId}`);
    },
    onSuccess: () => {
      refetchPayoffs();
      toast({ title: "Deleted", description: "Payoff removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    },
  });

  const createCommissionMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/closings/${id}/commissions`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchCommissions();
      toast({ title: "Added", description: "Commission added." });
      setCommissionDialog(false);
      resetCommissionForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add commission.", variant: "destructive" });
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ commissionId, data }: { commissionId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/closing-commissions/${commissionId}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchCommissions();
      toast({ title: "Updated", description: "Commission updated." });
      setCommissionDialog(false);
      setEditingCommission(null);
      resetCommissionForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update commission.", variant: "destructive" });
    },
  });

  const deleteCommissionMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      await apiRequest("DELETE", `/api/closing-commissions/${commissionId}`);
    },
    onSuccess: () => {
      refetchCommissions();
      toast({ title: "Deleted", description: "Commission removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    },
  });

  const createWireMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/closings/${id}/wires`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchWires();
      toast({ title: "Added", description: "Wire instruction added." });
      setWireDialog(false);
      resetWireForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add wire.", variant: "destructive" });
    },
  });

  const updateWireMutation = useMutation({
    mutationFn: async ({ wireId, data }: { wireId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/closing-wires/${wireId}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchWires();
      toast({ title: "Updated", description: "Wire updated." });
      setWireDialog(false);
      setEditingWire(null);
      resetWireForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update wire.", variant: "destructive" });
    },
  });

  const updateWireStatusMutation = useMutation({
    mutationFn: async ({ wireId, status }: { wireId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/closing-wires/${wireId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      refetchWires();
      toast({ title: "Updated", description: "Wire status updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const deleteWireMutation = useMutation({
    mutationFn: async (wireId: string) => {
      await apiRequest("DELETE", `/api/closing-wires/${wireId}`);
    },
    onSuccess: () => {
      refetchWires();
      toast({ title: "Deleted", description: "Wire removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    },
  });

  function resetLineItemForm() {
    setLineItemForm({ category: "other", side: "use", description: "", amount: "", lineNumber: "", hudSection: "", altaCategory: "", cdSection: "", paidBy: "", paidTo: "" });
    setEditingLineItem(null);
  }
  function resetPartyForm() {
    setPartyForm({ role: "buyer", name: "", entityType: "", address: "", phone: "", email: "", taxId: "", signerName: "", signerTitle: "" });
    setEditingParty(null);
  }
  function resetProrationForm() {
    setProrationForm({ itemName: "", annualAmount: "", periodStartDate: "", periodEndDate: "", prorateDate: "", method: "calendar_day" });
    setEditingProration(null);
  }
  function resetEscrowForm() {
    setEscrowForm({ escrowType: "", holder: "", amount: "", depositDate: "", releaseCondition: "" });
    setEditingEscrow(null);
  }
  function resetPayoffForm() {
    setPayoffForm({ lienType: "", lender: "", accountNumber: "", currentBalance: "", perDiemInterest: "", payoffGoodThrough: "", totalPayoff: "" });
    setEditingPayoff(null);
  }
  function resetCommissionForm() {
    setCommissionForm({ recipientName: "", recipientRole: "", basisAmount: "", rate: "", amount: "", paidBy: "" });
    setEditingCommission(null);
  }
  function resetWireForm() {
    setWireForm({ direction: "outgoing", fromParty: "", toParty: "", amount: "", bankName: "", routingNumber: "", accountNumber: "", reference: "" });
    setEditingWire(null);
  }

  function openEditLineItem(item: ClosingLineItem) {
    setEditingLineItem(item);
    setLineItemForm({
      category: item.category,
      side: item.side,
      description: item.description,
      amount: item.amount || "",
      lineNumber: item.lineNumber?.toString() || "",
      hudSection: item.hudSection || "",
      altaCategory: item.altaCategory || "",
      cdSection: item.cdSection || "",
      paidBy: item.paidBy || "",
      paidTo: item.paidTo || "",
    });
    setLineItemDialog(true);
  }

  function openEditParty(p: ClosingParty) {
    setEditingParty(p);
    setPartyForm({
      role: p.role,
      name: p.name,
      entityType: p.entityType || "",
      address: p.address || "",
      phone: p.phone || "",
      email: p.email || "",
      taxId: p.taxId || "",
      signerName: p.signerName || "",
      signerTitle: p.signerTitle || "",
    });
    setPartyDialog(true);
  }

  function openEditProration(p: ClosingProration) {
    setEditingProration(p);
    setProrationForm({
      itemName: p.itemName,
      annualAmount: p.annualAmount || "",
      periodStartDate: p.periodStartDate || "",
      periodEndDate: p.periodEndDate || "",
      prorateDate: p.prorateDate || "",
      method: p.method || "calendar_day",
    });
    setProrationDialog(true);
  }

  function openEditEscrow(e: ClosingEscrow) {
    setEditingEscrow(e);
    setEscrowForm({
      escrowType: e.escrowType,
      holder: e.holder || "",
      amount: e.amount || "",
      depositDate: e.depositDate || "",
      releaseCondition: e.releaseCondition || "",
    });
    setEscrowDialog(true);
  }

  function openEditPayoff(p: ClosingPayoff) {
    setEditingPayoff(p);
    setPayoffForm({
      lienType: p.lienType,
      lender: p.lender || "",
      accountNumber: p.accountNumber || "",
      currentBalance: p.currentBalance || "",
      perDiemInterest: p.perDiemInterest || "",
      payoffGoodThrough: p.payoffGoodThrough || "",
      totalPayoff: p.totalPayoff || "",
    });
    setPayoffDialog(true);
  }

  function openEditCommission(c: ClosingCommission) {
    setEditingCommission(c);
    setCommissionForm({
      recipientName: c.recipientName,
      recipientRole: c.recipientRole || "",
      basisAmount: c.basisAmount || "",
      rate: c.rate || "",
      amount: c.amount || "",
      paidBy: c.paidBy || "",
    });
    setCommissionDialog(true);
  }

  function openEditWire(w: ClosingWire) {
    setEditingWire(w);
    setWireForm({
      direction: w.direction,
      fromParty: w.fromParty || "",
      toParty: w.toParty || "",
      amount: w.amount || "",
      bankName: w.bankName || "",
      routingNumber: w.routingNumber || "",
      accountNumber: w.accountNumber || "",
      reference: w.reference || "",
    });
    setWireDialog(true);
  }

  function handleSaveLineItem() {
    if (!lineItemForm.description.trim()) return;
    const data = {
      ...lineItemForm,
      lineNumber: lineItemForm.lineNumber ? parseInt(lineItemForm.lineNumber) : null,
    };
    if (editingLineItem) {
      updateLineItemMutation.mutate({ itemId: editingLineItem.id, data });
    } else {
      createLineItemMutation.mutate(data);
    }
  }

  function handleSaveParty() {
    if (!partyForm.name.trim()) return;
    if (editingParty) {
      updatePartyMutation.mutate({ partyId: editingParty.id, data: partyForm });
    } else {
      createPartyMutation.mutate(partyForm);
    }
  }

  function handleSaveProration() {
    if (!prorationForm.itemName.trim()) return;
    if (editingProration) {
      updateProrationMutation.mutate({ prorationId: editingProration.id, data: prorationForm });
    } else {
      createProrationMutation.mutate(prorationForm);
    }
  }

  function handleSaveEscrow() {
    if (!escrowForm.escrowType.trim()) return;
    if (editingEscrow) {
      updateEscrowMutation.mutate({ escrowId: editingEscrow.id, data: escrowForm });
    } else {
      createEscrowMutation.mutate(escrowForm);
    }
  }

  function handleSavePayoff() {
    if (!payoffForm.lienType.trim()) return;
    if (editingPayoff) {
      updatePayoffMutation.mutate({ payoffId: editingPayoff.id, data: payoffForm });
    } else {
      createPayoffMutation.mutate(payoffForm);
    }
  }

  function handleSaveCommission() {
    if (!commissionForm.recipientName.trim()) return;
    if (editingCommission) {
      updateCommissionMutation.mutate({ commissionId: editingCommission.id, data: commissionForm });
    } else {
      createCommissionMutation.mutate(commissionForm);
    }
  }

  function handleSaveWire() {
    if (!wireForm.toParty.trim() && !wireForm.fromParty.trim()) return;
    if (editingWire) {
      updateWireMutation.mutate({ wireId: editingWire.id, data: wireForm });
    } else {
      createWireMutation.mutate(wireForm);
    }
  }

  function handleSaveHeader() {
    updateClosingMutation.mutate(headerForm);
  }

  function openHeaderEdit() {
    if (!closing) return;
    setHeaderForm({
      title: closing.title || "",
      fileNumber: closing.fileNumber || "",
      closingDate: closing.closingDate || "",
      disbursementDate: closing.disbursementDate || "",
      propertyAddress: closing.propertyAddress || "",
      purchasePrice: closing.purchasePrice || "",
      loanAmount: closing.loanAmount || "",
      earnestMoney: closing.earnestMoney || "",
      notes: closing.notes || "",
      status: closing.status || "draft",
    });
    setClosingHeaderEdit(true);
  }

  const sourcesTotal = lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit").reduce((s, li) => s + parseFloat(li.amount?.replace(/[,$\s]/g, "") || "0"), 0);
  const usesTotal = lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit").reduce((s, li) => s + parseFloat(li.amount?.replace(/[,$\s]/g, "") || "0"), 0);
  const balanceDiff = sourcesTotal - usesTotal;
  const isBalanced = Math.abs(balanceDiff) < 0.01;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!closing) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-not-found">Closing statement not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const txType = closing.transactionType;
  const sections = getStatementSections(txType);
  const isHud = txType === "hud1" || txType === "hud1a";
  const isAlta = txType.startsWith("alta");
  const isCd = txType === "closing_disclosure" || txType === "seller_closing_disclosure";
  const isSourcesUses = txType === "sources_and_uses" || txType === "construction_sources_uses";
  const isFundsFlow = txType === "funds_flow";

  function groupLineItemsBySection(items: ClosingLineItem[]) {
    if (isHud) {
      const grouped: Record<string, ClosingLineItem[]> = {};
      for (const s of sections) grouped[s.key] = [];
      for (const item of items) {
        const sec = item.hudSection || "1300";
        const matchedSection = sections.find(s => sec.startsWith(s.key));
        const key = matchedSection ? matchedSection.key : "1300";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }
      return grouped;
    }
    if (isAlta) {
      const grouped: Record<string, ClosingLineItem[]> = {};
      for (const s of sections) grouped[s.key] = [];
      for (const item of items) {
        const cat = item.altaCategory || mapCategoryToAltaSection(item.category);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      }
      return grouped;
    }
    if (isSourcesUses) {
      return {
        sources: items.filter(i => i.side === "source" || i.side === "buyer_credit" || i.side === "seller_credit"),
        uses: items.filter(i => i.side === "use" || i.side === "buyer_debit" || i.side === "seller_debit"),
      };
    }
    return { all: items };
  }

  function mapCategoryToAltaSection(cat: string): string {
    const map: Record<string, string> = {
      purchase_price: "financial", earnest_money: "financial", loan_amount: "financial",
      seller_credit: "financial", buyer_credit: "financial",
      property_tax_proration: "prorations", insurance_proration: "prorations",
      hoa_proration: "prorations", rent_proration: "prorations", adjustment: "prorations",
      commission: "commissions",
      title_insurance: "title", escrow_fee: "title", attorney_fee: "title",
      transfer_tax: "taxes", recording_fee: "taxes",
      payoff_first_mortgage: "payoffs", payoff_second_mortgage: "payoffs", payoff_other_lien: "payoffs",
      holdback: "escrows", reserve: "escrows",
    };
    return map[cat] || "other";
  }

  const grouped = groupLineItemsBySection(lineItems);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/transactions/deals/${closing.dealId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back-to-deal">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" data-testid="text-closing-title">{closing.title}</h1>
              <Badge className={statusColors[closing.status || "draft"]} data-testid="badge-closing-status">
                {statusLabels[closing.status || "draft"]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm" data-testid="text-closing-type">
              {closingTypeLabels[txType] || txType}
              {closing.fileNumber && <span> &middot; File #{closing.fileNumber}</span>}
              {closing.closingDate && <span> &middot; Closing: {closing.closingDate}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            {isBalanced ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-balance-status">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Balanced
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30" data-testid="badge-balance-status">
                <AlertTriangle className="h-3 w-3 mr-1" /> Unbalanced ({formatCurrency(balanceDiff.toFixed(2))})
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={openHeaderEdit} data-testid="button-edit-header">
              <Edit className="h-4 w-4 mr-1" /> Edit Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-download-pdf"
              onClick={() => {
                const link = document.createElement("a");
                link.href = `/api/closings/${id}/pdf`;
                link.download = "";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-print-pdf"
              onClick={() => {
                window.open(`/api/closings/${id}/pdf?inline=1`, "_blank");
              }}
            >
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-save-to-data-room"
              disabled={saveToDataRoomMutation.isPending}
              onClick={() => saveToDataRoomMutation.mutate()}
            >
              {saveToDataRoomMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4 mr-1" />
              )}
              Save to Data Room
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-validate-closing"
              disabled={validateMutation.isPending}
              onClick={() => validateMutation.mutate()}
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Validate
            </Button>
          </div>
        </div>
      </div>

      {validationResult && (
        <Card className={validationResult.valid ? "border-green-500/30" : "border-yellow-500/30"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {validationResult.valid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              Validation Results
              <Badge variant="outline" className="ml-2">
                {validationResult.summary.errors} errors, {validationResult.summary.warnings} warnings
              </Badge>
              {validationResult.summary.balanced && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-1">Balanced</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.issues.length === 0 ? (
              <p className="text-sm text-green-500" data-testid="text-validation-pass">All checks passed</p>
            ) : (
              <div className="space-y-2">
                {validationResult.issues.map((issue: ValidationIssue, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-sm" data-testid={`validation-issue-${idx}`}>
                    {issue.severity === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    ) : issue.severity === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span>{issue.message}</span>
                      {issue.suggestion && (
                        <p className="text-xs text-muted-foreground mt-0.5">{issue.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(closing.propertyAddress || closing.purchasePrice) && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {closing.propertyAddress && (
                <div>
                  <span className="text-muted-foreground">Property</span>
                  <p className="font-medium" data-testid="text-property-address">{closing.propertyAddress}</p>
                </div>
              )}
              {closing.purchasePrice && (
                <div>
                  <span className="text-muted-foreground">Purchase Price</span>
                  <p className="font-medium" data-testid="text-purchase-price">{formatCurrency(closing.purchasePrice)}</p>
                </div>
              )}
              {closing.loanAmount && (
                <div>
                  <span className="text-muted-foreground">Loan Amount</span>
                  <p className="font-medium" data-testid="text-loan-amount">{formatCurrency(closing.loanAmount)}</p>
                </div>
              )}
              {closing.earnestMoney && (
                <div>
                  <span className="text-muted-foreground">Earnest Money</span>
                  <p className="font-medium" data-testid="text-earnest-money">{formatCurrency(closing.earnestMoney)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-xs mb-1">Total Sources</p>
            <p className="text-xl font-bold text-green-500" data-testid="text-total-sources">{formatCurrency(sourcesTotal.toFixed(2))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-xs mb-1">Total Uses</p>
            <p className="text-xl font-bold text-red-500" data-testid="text-total-uses">{formatCurrency(usesTotal.toFixed(2))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-xs mb-1">Difference</p>
            <p className={`text-xl font-bold ${isBalanced ? "text-green-500" : "text-yellow-500"}`} data-testid="text-balance-diff">
              {formatCurrency(balanceDiff.toFixed(2))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="line-items" data-testid="tab-line-items">
            <DollarSign className="h-4 w-4 mr-1" /> Line Items
          </TabsTrigger>
          <TabsTrigger value="parties" data-testid="tab-parties">
            <Users className="h-4 w-4 mr-1" /> Parties
          </TabsTrigger>
          <TabsTrigger value="prorations" data-testid="tab-prorations">
            <Calculator className="h-4 w-4 mr-1" /> Prorations
          </TabsTrigger>
          <TabsTrigger value="escrows" data-testid="tab-escrows">
            <Landmark className="h-4 w-4 mr-1" /> Escrows
          </TabsTrigger>
          <TabsTrigger value="payoffs" data-testid="tab-payoffs">
            <CreditCard className="h-4 w-4 mr-1" /> Payoffs
          </TabsTrigger>
          <TabsTrigger value="commissions" data-testid="tab-commissions">
            <Percent className="h-4 w-4 mr-1" /> Commissions
          </TabsTrigger>
          <TabsTrigger value="wires" data-testid="tab-wires">
            <ArrowRightLeft className="h-4 w-4 mr-1" /> Wires
          </TabsTrigger>
          <TabsTrigger value="summary" data-testid="tab-summary">
            <FileText className="h-4 w-4 mr-1" /> Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="line-items" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-lg">Line Items</h3>
            <Button size="sm" onClick={() => { resetLineItemForm(); setLineItemDialog(true); }} data-testid="button-add-line-item">
              <Plus className="h-4 w-4 mr-1" /> Add Line Item
            </Button>
          </div>

          {(() => {
            const StatementForm = getStatementTypeForm(txType);
            if (StatementForm) {
              return (
                <StatementForm
                  closing={closing}
                  lineItems={lineItems}
                  onAddItem={(section, defaults) => {
                    resetLineItemForm();
                    if (defaults) {
                      Object.entries(defaults).forEach(([key, value]) => {
                        setLineItemForm(prev => ({ ...prev, [key]: value }));
                      });
                    }
                    setLineItemDialog(true);
                  }}
                  onUpdateItem={(itemId, updates) => {
                    updateLineItemMutation.mutate({ itemId, data: updates });
                  }}
                />
              );
            }
            return null;
          })()}

          {lineItems.length === 0 && !getStatementTypeForm(txType) ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No line items yet. Add your first line item to begin building the closing statement.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {!getStatementTypeForm(txType) && sections.map(section => {
                const sectionItems = grouped[section.key] || [];
                if (sectionItems.length === 0 && Object.keys(grouped).length > 1) return null;
                const sectionTotal = sectionItems.reduce((s, li) => s + parseFloat(li.amount?.replace(/[,$\s]/g, "") || "0"), 0);

                return (
                  <Card key={section.key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between gap-4">
                        <span>{section.label}</span>
                        <span className="text-muted-foreground font-normal">{formatCurrency(sectionTotal.toFixed(2))}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {sectionItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 hover-elevate" data-testid={`line-item-${item.id}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.lineNumber && <span className="text-xs text-muted-foreground font-mono">#{item.lineNumber}</span>}
                                <span className="font-medium text-sm">{item.description}</span>
                                <Badge variant="outline" className="text-xs">{sideLabels[item.side]}</Badge>
                                <Badge variant="secondary" className="text-xs">{categoryLabels[item.category] || item.category}</Badge>
                              </div>
                              {(item.paidBy || item.paidTo) && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.paidBy && `Paid by: ${item.paidBy}`}
                                  {item.paidBy && item.paidTo && " · "}
                                  {item.paidTo && `Paid to: ${item.paidTo}`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`font-mono font-medium ${item.side === "source" || item.side === "buyer_credit" || item.side === "seller_credit" ? "text-green-500" : "text-red-500"}`}>
                                {formatCurrency(item.amount)}
                              </span>
                              <Button variant="ghost" size="icon" onClick={() => openEditLineItem(item)} data-testid={`button-edit-line-item-${item.id}`}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteLineItemMutation.mutate(item.id)} data-testid={`button-delete-line-item-${item.id}`}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {sectionItems.length === 0 && (
                          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                            No items in this section
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="parties" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-lg">Parties</h3>
            <Button size="sm" onClick={() => { resetPartyForm(); setPartyDialog(true); }} data-testid="button-add-party">
              <Plus className="h-4 w-4 mr-1" /> Add Party
            </Button>
          </div>

          {parties.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No parties added yet. Add buyers, sellers, lenders, and other parties to this closing.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parties.map(party => (
                <Card key={party.id} data-testid={`party-${party.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{party.name}</span>
                          <Badge variant="outline" className="text-xs">{roleLabels[party.role]}</Badge>
                        </div>
                        {party.entityType && <p className="text-xs text-muted-foreground mt-1">{party.entityType}</p>}
                        {party.address && <p className="text-xs text-muted-foreground">{party.address}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          {party.email && <span>{party.email}</span>}
                          {party.phone && <span>{party.phone}</span>}
                        </div>
                        {party.signerName && (
                          <p className="text-xs mt-1">Signer: {party.signerName}{party.signerTitle && `, ${party.signerTitle}`}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditParty(party)} data-testid={`button-edit-party-${party.id}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletePartyMutation.mutate(party.id)} data-testid={`button-delete-party-${party.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prorations" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-lg">Prorations</h3>
            <Button size="sm" onClick={() => { resetProrationForm(); setProrationDialog(true); }} data-testid="button-add-proration">
              <Plus className="h-4 w-4 mr-1" /> Add Proration
            </Button>
          </div>

          <ProrationCalculator
            closingDate={closing.closingDate || undefined}
            onApply={(data) => {
              setProrationForm({
                itemName: data.itemName,
                annualAmount: data.annualAmount,
                periodStartDate: data.periodStartDate,
                periodEndDate: data.periodEndDate,
                prorateDate: data.prorateDate,
                method: data.method,
              });
              setProrationDialog(true);
            }}
          />

          {prorations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No prorations added. Add property taxes, HOA dues, rent, insurance, and other proration items.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {prorations.map(pror => (
                <Card key={pror.id} data-testid={`proration-${pror.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium">{pror.itemName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {pror.method === "calendar_day" ? "365-day" : "360-day"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Annual Amount</span>
                            <p className="font-mono">{formatCurrency(pror.annualAmount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Daily Rate</span>
                            <p className="font-mono">${pror.dailyRate || "0"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Seller ({pror.sellerDays || 0} days)</span>
                            <p className="font-mono text-red-500">{formatCurrency(pror.sellerCredit)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Buyer ({pror.buyerDays || 0} days)</span>
                            <p className="font-mono text-green-500">{formatCurrency(pror.buyerCredit)}</p>
                          </div>
                        </div>
                        {pror.periodStartDate && pror.periodEndDate && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Period: {pror.periodStartDate} to {pror.periodEndDate}
                            {pror.prorateDate && ` · Prorate date: ${pror.prorateDate}`}
                            {pror.daysInPeriod && ` · ${pror.daysInPeriod} days`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditProration(pror)} data-testid={`button-edit-proration-${pror.id}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteProrationMutation.mutate(pror.id)} data-testid={`button-delete-proration-${pror.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Buyer Credit</span>
                    <span className="text-green-500 font-mono">{formatCurrency(prorations.reduce((s, p) => s + parseFloat(p.buyerCredit?.replace(/[,$\s]/g, "") || "0"), 0).toFixed(2))}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium mt-1">
                    <span>Total Seller Credit</span>
                    <span className="text-red-500 font-mono">{formatCurrency(prorations.reduce((s, p) => s + parseFloat(p.sellerCredit?.replace(/[,$\s]/g, "") || "0"), 0).toFixed(2))}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="escrows" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-lg">Escrows & Reserves</h3>
            <Button size="sm" onClick={() => { resetEscrowForm(); setEscrowDialog(true); }} data-testid="button-add-escrow">
              <Plus className="h-4 w-4 mr-1" /> Add Escrow
            </Button>
          </div>

          {escrows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No escrows added. Add earnest money, tax escrows, insurance escrows, and other reserve deposits.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {escrows.map(esc => (
                <Card key={esc.id} data-testid={`escrow-${esc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{esc.escrowType}</span>
                          <Badge variant="outline" className="text-xs">{esc.status || "held"}</Badge>
                        </div>
                        {esc.holder && <p className="text-xs text-muted-foreground mt-1">Held by: {esc.holder}</p>}
                        {esc.depositDate && <p className="text-xs text-muted-foreground">Deposit: {esc.depositDate}</p>}
                        {esc.releaseCondition && <p className="text-xs text-muted-foreground">Release: {esc.releaseCondition}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{formatCurrency(esc.amount)}</span>
                        <Button variant="ghost" size="icon" onClick={() => openEditEscrow(esc)} data-testid={`button-edit-escrow-${esc.id}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteEscrowMutation.mutate(esc.id)} data-testid={`button-delete-escrow-${esc.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payoffs" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-lg">Payoffs & Liens</h3>
            <Button size="sm" onClick={() => { resetPayoffForm(); setPayoffDialog(true); }} data-testid="button-add-payoff">
              <Plus className="h-4 w-4 mr-1" /> Add Payoff
            </Button>
          </div>

          {payoffs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No payoffs added. Add existing mortgages, liens, and other obligations to be paid at closing.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {payoffs.map(po => (
                <Card key={po.id} data-testid={`payoff-${po.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{po.lienType}</span>
                          {po.lender && <span className="text-sm text-muted-foreground">({po.lender})</span>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Current Balance</span>
                            <p className="font-mono">{formatCurrency(po.currentBalance)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Per Diem Interest</span>
                            <p className="font-mono">{po.perDiemInterest ? `$${po.perDiemInterest}/day` : "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Total Payoff</span>
                            <p className="font-mono font-medium text-red-500">{formatCurrency(po.totalPayoff)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Good Through</span>
                            <p>{po.payoffGoodThrough || "N/A"}</p>
                          </div>
                        </div>
                        {po.accountNumber && <p className="text-xs text-muted-foreground mt-1">Account: {po.accountNumber}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditPayoff(po)} data-testid={`button-edit-payoff-${po.id}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletePayoffMutation.mutate(po.id)} data-testid={`button-delete-payoff-${po.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-lg">Commissions</h3>
            <Button size="sm" onClick={() => { resetCommissionForm(); setCommissionDialog(true); }} data-testid="button-add-commission">
              <Plus className="h-4 w-4 mr-1" /> Add Commission
            </Button>
          </div>

          {commissions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No commissions added. Add broker commissions, referral fees, and other transaction-based payments.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {commissions.map(comm => (
                <Card key={comm.id} data-testid={`commission-${comm.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{comm.recipientName}</span>
                          {comm.recipientRole && <Badge variant="outline" className="text-xs">{comm.recipientRole}</Badge>}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm">
                          {comm.basisAmount && (
                            <span className="text-muted-foreground">Basis: {formatCurrency(comm.basisAmount)}</span>
                          )}
                          {comm.rate && (
                            <span className="text-muted-foreground">Rate: {comm.rate}%</span>
                          )}
                          {comm.paidBy && (
                            <span className="text-muted-foreground">Paid by: {comm.paidBy}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-red-500">{formatCurrency(comm.amount)}</span>
                        <Button variant="ghost" size="icon" onClick={() => openEditCommission(comm)} data-testid={`button-edit-commission-${comm.id}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCommissionMutation.mutate(comm.id)} data-testid={`button-delete-commission-${comm.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between font-medium text-sm">
                    <span>Total Commissions</span>
                    <span className="font-mono text-red-500">{formatCurrency(commissions.reduce((s, c) => s + parseFloat(c.amount?.replace(/[,$\s]/g, "") || "0"), 0).toFixed(2))}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="wires" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-lg">Wire Instructions</h3>
            <Button size="sm" onClick={() => { resetWireForm(); setWireDialog(true); }} data-testid="button-add-wire">
              <Plus className="h-4 w-4 mr-1" /> Add Wire
            </Button>
          </div>

          {wires.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No wire instructions added. Add incoming and outgoing wire transfers for closing disbursement.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {wires.map(wire => (
                <Card key={wire.id} data-testid={`wire-${wire.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={wire.direction === "incoming" ? "default" : "outline"} className="text-xs">
                            {wire.direction === "incoming" ? "Incoming" : "Outgoing"}
                          </Badge>
                          <Badge className={wireStatusColors[wire.status || "pending"]} data-testid={`badge-wire-status-${wire.id}`}>
                            {wire.status || "pending"}
                          </Badge>
                        </div>
                        <div className="text-sm mt-1">
                          {wire.fromParty && <span>From: <span className="font-medium">{wire.fromParty}</span></span>}
                          {wire.fromParty && wire.toParty && <span className="mx-2 text-muted-foreground">&rarr;</span>}
                          {wire.toParty && <span>To: <span className="font-medium">{wire.toParty}</span></span>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                          {wire.bankName && <span>Bank: {wire.bankName}</span>}
                          {wire.routingNumber && <span>Routing: {wire.routingNumber}</span>}
                          {wire.accountNumber && <span>Account: ****{wire.accountNumber.slice(-4)}</span>}
                          {wire.reference && <span>Ref: {wire.reference}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-mono font-medium">{formatCurrency(wire.amount)}</span>
                        <div className="flex gap-1">
                          {wire.status === "pending" && (
                            <Button variant="ghost" size="icon" onClick={() => updateWireStatusMutation.mutate({ wireId: wire.id, status: "sent" })} data-testid={`button-send-wire-${wire.id}`}>
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          {wire.status === "sent" && (
                            <Button variant="ghost" size="icon" onClick={() => updateWireStatusMutation.mutate({ wireId: wire.id, status: "confirmed" })} data-testid={`button-confirm-wire-${wire.id}`}>
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEditWire(wire)} data-testid={`button-edit-wire-${wire.id}`}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteWireMutation.mutate(wire.id)} data-testid={`button-delete-wire-${wire.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between font-medium text-sm">
                    <span>Total Incoming</span>
                    <span className="font-mono text-green-500">{formatCurrency(wires.filter(w => w.direction === "incoming").reduce((s, w) => s + parseFloat(w.amount?.replace(/[,$\s]/g, "") || "0"), 0).toFixed(2))}</span>
                  </div>
                  <div className="flex justify-between font-medium text-sm mt-1">
                    <span>Total Outgoing</span>
                    <span className="font-mono text-red-500">{formatCurrency(wires.filter(w => w.direction === "outgoing").reduce((s, w) => s + parseFloat(w.amount?.replace(/[,$\s]/g, "") || "0"), 0).toFixed(2))}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <h3 className="font-semibold text-lg">Statement Summary</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sources of Funds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit").map(li => (
                    <div key={li.id} className="flex justify-between text-sm">
                      <span>{li.description}</span>
                      <span className="font-mono text-green-500">{formatCurrency(li.amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total Sources</span>
                    <span className="font-mono text-green-500">{formatCurrency(sourcesTotal.toFixed(2))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Uses of Funds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit").map(li => (
                    <div key={li.id} className="flex justify-between text-sm">
                      <span>{li.description}</span>
                      <span className="font-mono text-red-500">{formatCurrency(li.amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total Uses</span>
                    <span className="font-mono text-red-500">{formatCurrency(usesTotal.toFixed(2))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {prorations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Prorations Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {prorations.map(p => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span>{p.itemName}</span>
                      <span className="font-mono">
                        Seller: {formatCurrency(p.sellerCredit)} / Buyer: {formatCurrency(p.buyerCredit)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Balance</span>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-lg font-bold ${isBalanced ? "text-green-500" : "text-yellow-500"}`}>
                    {formatCurrency(balanceDiff.toFixed(2))}
                  </span>
                  {isBalanced ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={lineItemDialog} onOpenChange={(o) => { if (!o) { setLineItemDialog(false); resetLineItemForm(); } else setLineItemDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLineItem ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
            <DialogDescription>Enter the details for this line item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <Input value={lineItemForm.description} onChange={e => setLineItemForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Purchase Price" data-testid="input-li-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={lineItemForm.category} onValueChange={v => setLineItemForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-li-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Side</Label>
                <Select value={lineItemForm.side} onValueChange={v => setLineItemForm(f => ({ ...f, side: v }))}>
                  <SelectTrigger data-testid="select-li-side"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(sideLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input value={lineItemForm.amount} onChange={e => setLineItemForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" data-testid="input-li-amount" />
              </div>
              <div>
                <Label>Line Number</Label>
                <Input value={lineItemForm.lineNumber} onChange={e => setLineItemForm(f => ({ ...f, lineNumber: e.target.value }))} placeholder="e.g. 101" data-testid="input-li-line-number" />
              </div>
            </div>
            {isHud && (
              <div>
                <Label>HUD Section</Label>
                <Select value={lineItemForm.hudSection} onValueChange={v => setLineItemForm(f => ({ ...f, hudSection: v }))}>
                  <SelectTrigger data-testid="select-li-hud-section"><SelectValue placeholder="Select section" /></SelectTrigger>
                  <SelectContent>
                    {sections.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isAlta && (
              <div>
                <Label>ALTA Category</Label>
                <Select value={lineItemForm.altaCategory} onValueChange={v => setLineItemForm(f => ({ ...f, altaCategory: v }))}>
                  <SelectTrigger data-testid="select-li-alta-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {sections.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isCd && (
              <div>
                <Label>CD Section</Label>
                <Select value={lineItemForm.cdSection} onValueChange={v => setLineItemForm(f => ({ ...f, cdSection: v }))}>
                  <SelectTrigger data-testid="select-li-cd-section"><SelectValue placeholder="Select section" /></SelectTrigger>
                  <SelectContent>
                    {sections.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paid By</Label>
                <Input value={lineItemForm.paidBy} onChange={e => setLineItemForm(f => ({ ...f, paidBy: e.target.value }))} placeholder="e.g. Buyer" data-testid="input-li-paid-by" />
              </div>
              <div>
                <Label>Paid To</Label>
                <Input value={lineItemForm.paidTo} onChange={e => setLineItemForm(f => ({ ...f, paidTo: e.target.value }))} placeholder="e.g. Seller" data-testid="input-li-paid-to" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLineItemDialog(false); resetLineItemForm(); }}>Cancel</Button>
            <Button onClick={handleSaveLineItem} disabled={createLineItemMutation.isPending || updateLineItemMutation.isPending} data-testid="button-save-line-item">
              {(createLineItemMutation.isPending || updateLineItemMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingLineItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={partyDialog} onOpenChange={(o) => { if (!o) { setPartyDialog(false); resetPartyForm(); } else setPartyDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingParty ? "Edit Party" : "Add Party"}</DialogTitle>
            <DialogDescription>Enter the party details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select value={partyForm.role} onValueChange={v => setPartyForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger data-testid="select-party-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Entity Type</Label>
                <Input value={partyForm.entityType} onChange={e => setPartyForm(f => ({ ...f, entityType: e.target.value }))} placeholder="LLC, Corp, Individual" data-testid="input-party-entity-type" />
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={partyForm.name} onChange={e => setPartyForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name or entity name" data-testid="input-party-name" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={partyForm.address} onChange={e => setPartyForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" data-testid="input-party-address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={partyForm.phone} onChange={e => setPartyForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" data-testid="input-party-phone" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={partyForm.email} onChange={e => setPartyForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" data-testid="input-party-email" />
              </div>
            </div>
            <div>
              <Label>Tax ID</Label>
              <Input value={partyForm.taxId} onChange={e => setPartyForm(f => ({ ...f, taxId: e.target.value }))} placeholder="SSN or EIN" data-testid="input-party-tax-id" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Signer Name</Label>
                <Input value={partyForm.signerName} onChange={e => setPartyForm(f => ({ ...f, signerName: e.target.value }))} placeholder="Authorized signer" data-testid="input-party-signer-name" />
              </div>
              <div>
                <Label>Signer Title</Label>
                <Input value={partyForm.signerTitle} onChange={e => setPartyForm(f => ({ ...f, signerTitle: e.target.value }))} placeholder="Title/Position" data-testid="input-party-signer-title" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPartyDialog(false); resetPartyForm(); }}>Cancel</Button>
            <Button onClick={handleSaveParty} disabled={createPartyMutation.isPending || updatePartyMutation.isPending} data-testid="button-save-party">
              {(createPartyMutation.isPending || updatePartyMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingParty ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={prorationDialog} onOpenChange={(o) => { if (!o) { setProrationDialog(false); resetProrationForm(); } else setProrationDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProration ? "Edit Proration" : "Add Proration"}</DialogTitle>
            <DialogDescription>Configure the proration calculator. Daily rate, buyer and seller portions are calculated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input value={prorationForm.itemName} onChange={e => setProrationForm(f => ({ ...f, itemName: e.target.value }))} placeholder="e.g. Property Taxes" data-testid="input-proration-item-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Annual Amount</Label>
                <Input value={prorationForm.annualAmount} onChange={e => setProrationForm(f => ({ ...f, annualAmount: e.target.value }))} placeholder="0.00" data-testid="input-proration-annual-amount" />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={prorationForm.method} onValueChange={v => setProrationForm(f => ({ ...f, method: v }))}>
                  <SelectTrigger data-testid="select-proration-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calendar_day">365-Day (Calendar)</SelectItem>
                    <SelectItem value="banker_day">360-Day (Banker)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input type="date" value={prorationForm.periodStartDate} onChange={e => setProrationForm(f => ({ ...f, periodStartDate: e.target.value }))} data-testid="input-proration-start-date" />
              </div>
              <div>
                <Label>Period End</Label>
                <Input type="date" value={prorationForm.periodEndDate} onChange={e => setProrationForm(f => ({ ...f, periodEndDate: e.target.value }))} data-testid="input-proration-end-date" />
              </div>
              <div>
                <Label>Prorate Date</Label>
                <Input type="date" value={prorationForm.prorateDate} onChange={e => setProrationForm(f => ({ ...f, prorateDate: e.target.value }))} data-testid="input-proration-prorate-date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProrationDialog(false); resetProrationForm(); }}>Cancel</Button>
            <Button onClick={handleSaveProration} disabled={createProrationMutation.isPending || updateProrationMutation.isPending} data-testid="button-save-proration">
              {(createProrationMutation.isPending || updateProrationMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingProration ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={escrowDialog} onOpenChange={(o) => { if (!o) { setEscrowDialog(false); resetEscrowForm(); } else setEscrowDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEscrow ? "Edit Escrow" : "Add Escrow"}</DialogTitle>
            <DialogDescription>Enter escrow deposit details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Escrow Type</Label>
              <Input value={escrowForm.escrowType} onChange={e => setEscrowForm(f => ({ ...f, escrowType: e.target.value }))} placeholder="e.g. Earnest Money, Tax Escrow" data-testid="input-escrow-type" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Holder</Label>
                <Input value={escrowForm.holder} onChange={e => setEscrowForm(f => ({ ...f, holder: e.target.value }))} placeholder="Escrow holder name" data-testid="input-escrow-holder" />
              </div>
              <div>
                <Label>Amount</Label>
                <Input value={escrowForm.amount} onChange={e => setEscrowForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" data-testid="input-escrow-amount" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Deposit Date</Label>
                <Input type="date" value={escrowForm.depositDate} onChange={e => setEscrowForm(f => ({ ...f, depositDate: e.target.value }))} data-testid="input-escrow-deposit-date" />
              </div>
              <div>
                <Label>Release Condition</Label>
                <Input value={escrowForm.releaseCondition} onChange={e => setEscrowForm(f => ({ ...f, releaseCondition: e.target.value }))} placeholder="Condition for release" data-testid="input-escrow-release-condition" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEscrowDialog(false); resetEscrowForm(); }}>Cancel</Button>
            <Button onClick={handleSaveEscrow} disabled={createEscrowMutation.isPending || updateEscrowMutation.isPending} data-testid="button-save-escrow">
              {(createEscrowMutation.isPending || updateEscrowMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingEscrow ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payoffDialog} onOpenChange={(o) => { if (!o) { setPayoffDialog(false); resetPayoffForm(); } else setPayoffDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPayoff ? "Edit Payoff" : "Add Payoff"}</DialogTitle>
            <DialogDescription>Enter the payoff details for an existing lien or mortgage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lien Type</Label>
                <Input value={payoffForm.lienType} onChange={e => setPayoffForm(f => ({ ...f, lienType: e.target.value }))} placeholder="e.g. First Mortgage" data-testid="input-payoff-lien-type" />
              </div>
              <div>
                <Label>Lender</Label>
                <Input value={payoffForm.lender} onChange={e => setPayoffForm(f => ({ ...f, lender: e.target.value }))} placeholder="Lender name" data-testid="input-payoff-lender" />
              </div>
            </div>
            <div>
              <Label>Account Number</Label>
              <Input value={payoffForm.accountNumber} onChange={e => setPayoffForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="Loan account number" data-testid="input-payoff-account" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Balance</Label>
                <Input value={payoffForm.currentBalance} onChange={e => setPayoffForm(f => ({ ...f, currentBalance: e.target.value }))} placeholder="0.00" data-testid="input-payoff-balance" />
              </div>
              <div>
                <Label>Per Diem Interest</Label>
                <Input value={payoffForm.perDiemInterest} onChange={e => setPayoffForm(f => ({ ...f, perDiemInterest: e.target.value }))} placeholder="$/day" data-testid="input-payoff-per-diem" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Payoff</Label>
                <Input value={payoffForm.totalPayoff} onChange={e => setPayoffForm(f => ({ ...f, totalPayoff: e.target.value }))} placeholder="0.00" data-testid="input-payoff-total" />
              </div>
              <div>
                <Label>Good Through</Label>
                <Input type="date" value={payoffForm.payoffGoodThrough} onChange={e => setPayoffForm(f => ({ ...f, payoffGoodThrough: e.target.value }))} data-testid="input-payoff-good-through" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayoffDialog(false); resetPayoffForm(); }}>Cancel</Button>
            <Button onClick={handleSavePayoff} disabled={createPayoffMutation.isPending || updatePayoffMutation.isPending} data-testid="button-save-payoff">
              {(createPayoffMutation.isPending || updatePayoffMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingPayoff ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={commissionDialog} onOpenChange={(o) => { if (!o) { setCommissionDialog(false); resetCommissionForm(); } else setCommissionDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCommission ? "Edit Commission" : "Add Commission"}</DialogTitle>
            <DialogDescription>Enter commission details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Recipient Name</Label>
                <Input value={commissionForm.recipientName} onChange={e => setCommissionForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Broker or agent name" data-testid="input-commission-recipient" />
              </div>
              <div>
                <Label>Recipient Role</Label>
                <Input value={commissionForm.recipientRole} onChange={e => setCommissionForm(f => ({ ...f, recipientRole: e.target.value }))} placeholder="e.g. Listing Agent" data-testid="input-commission-role" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Basis Amount</Label>
                <Input value={commissionForm.basisAmount} onChange={e => setCommissionForm(f => ({ ...f, basisAmount: e.target.value }))} placeholder="e.g. Purchase Price" data-testid="input-commission-basis" />
              </div>
              <div>
                <Label>Rate (%)</Label>
                <Input value={commissionForm.rate} onChange={e => setCommissionForm(f => ({ ...f, rate: e.target.value }))} placeholder="e.g. 3.0" data-testid="input-commission-rate" />
              </div>
              <div>
                <Label>Amount</Label>
                <Input value={commissionForm.amount} onChange={e => setCommissionForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" data-testid="input-commission-amount" />
              </div>
            </div>
            <div>
              <Label>Paid By</Label>
              <Input value={commissionForm.paidBy} onChange={e => setCommissionForm(f => ({ ...f, paidBy: e.target.value }))} placeholder="e.g. Seller" data-testid="input-commission-paid-by" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCommissionDialog(false); resetCommissionForm(); }}>Cancel</Button>
            <Button onClick={handleSaveCommission} disabled={createCommissionMutation.isPending || updateCommissionMutation.isPending} data-testid="button-save-commission">
              {(createCommissionMutation.isPending || updateCommissionMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingCommission ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wireDialog} onOpenChange={(o) => { if (!o) { setWireDialog(false); resetWireForm(); } else setWireDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWire ? "Edit Wire" : "Add Wire Instruction"}</DialogTitle>
            <DialogDescription>Enter wire transfer details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Direction</Label>
              <Select value={wireForm.direction} onValueChange={v => setWireForm(f => ({ ...f, direction: v }))}>
                <SelectTrigger data-testid="select-wire-direction"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Party</Label>
                <Input value={wireForm.fromParty} onChange={e => setWireForm(f => ({ ...f, fromParty: e.target.value }))} placeholder="Sending party" data-testid="input-wire-from" />
              </div>
              <div>
                <Label>To Party</Label>
                <Input value={wireForm.toParty} onChange={e => setWireForm(f => ({ ...f, toParty: e.target.value }))} placeholder="Receiving party" data-testid="input-wire-to" />
              </div>
            </div>
            <div>
              <Label>Amount</Label>
              <Input value={wireForm.amount} onChange={e => setWireForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" data-testid="input-wire-amount" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input value={wireForm.bankName} onChange={e => setWireForm(f => ({ ...f, bankName: e.target.value }))} placeholder="Bank name" data-testid="input-wire-bank" />
              </div>
              <div>
                <Label>Routing Number</Label>
                <Input value={wireForm.routingNumber} onChange={e => setWireForm(f => ({ ...f, routingNumber: e.target.value }))} placeholder="ABA routing" data-testid="input-wire-routing" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Number</Label>
                <Input value={wireForm.accountNumber} onChange={e => setWireForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="Account number" data-testid="input-wire-account" />
              </div>
              <div>
                <Label>Reference</Label>
                <Input value={wireForm.reference} onChange={e => setWireForm(f => ({ ...f, reference: e.target.value }))} placeholder="Wire reference" data-testid="input-wire-reference" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWireDialog(false); resetWireForm(); }}>Cancel</Button>
            <Button onClick={handleSaveWire} disabled={createWireMutation.isPending || updateWireMutation.isPending} data-testid="button-save-wire">
              {(createWireMutation.isPending || updateWireMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingWire ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closingHeaderEdit} onOpenChange={(o) => { if (!o) setClosingHeaderEdit(false); else setClosingHeaderEdit(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Closing Details</DialogTitle>
            <DialogDescription>Update the closing statement header information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={headerForm.title} onChange={e => setHeaderForm(f => ({ ...f, title: e.target.value }))} data-testid="input-header-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>File Number</Label>
                <Input value={headerForm.fileNumber} onChange={e => setHeaderForm(f => ({ ...f, fileNumber: e.target.value }))} data-testid="input-header-file-number" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={headerForm.status} onValueChange={v => setHeaderForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-header-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Closing Date</Label>
                <Input type="date" value={headerForm.closingDate} onChange={e => setHeaderForm(f => ({ ...f, closingDate: e.target.value }))} data-testid="input-header-closing-date" />
              </div>
              <div>
                <Label>Disbursement Date</Label>
                <Input type="date" value={headerForm.disbursementDate} onChange={e => setHeaderForm(f => ({ ...f, disbursementDate: e.target.value }))} data-testid="input-header-disbursement-date" />
              </div>
            </div>
            <div>
              <Label>Property Address</Label>
              <Input value={headerForm.propertyAddress} onChange={e => setHeaderForm(f => ({ ...f, propertyAddress: e.target.value }))} data-testid="input-header-property-address" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Purchase Price</Label>
                <Input value={headerForm.purchasePrice} onChange={e => setHeaderForm(f => ({ ...f, purchasePrice: e.target.value }))} data-testid="input-header-purchase-price" />
              </div>
              <div>
                <Label>Loan Amount</Label>
                <Input value={headerForm.loanAmount} onChange={e => setHeaderForm(f => ({ ...f, loanAmount: e.target.value }))} data-testid="input-header-loan-amount" />
              </div>
              <div>
                <Label>Earnest Money</Label>
                <Input value={headerForm.earnestMoney} onChange={e => setHeaderForm(f => ({ ...f, earnestMoney: e.target.value }))} data-testid="input-header-earnest-money" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingHeaderEdit(false)}>Cancel</Button>
            <Button onClick={handleSaveHeader} disabled={updateClosingMutation.isPending} data-testid="button-save-header">
              {updateClosingMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
