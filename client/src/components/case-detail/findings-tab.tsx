import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Search, 
  Pin, 
  PinOff, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Link2,
  FileText,
  MessageSquare,
  Users,
  Clock,
  Sparkles,
  History,
  Tag,
  AlertTriangle,
  Scale,
  Eye,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Brain,
  BookOpen,
  Gavel,
  Lightbulb,
  FileSearch,
  ClipboardList,
  ListChecks,
  CircleDot,
  ScrollText,
  FileCheck,
  Award,
  Layers,
  Download,
  ExternalLink,
  RefreshCw,
  Zap,
  ArrowRight,
  Menu,
  ChevronLeft,
  X
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CaseAIAssistant } from "./case-ai-assistant";
import type { CaseEvidenceItem } from "@shared/schema";

interface Finding {
  id: string;
  caseId: string;
  authorId: string;
  entryType: string;
  title: string;
  content: string;
  summary?: string | null;
  isPinned: boolean;
  versionCount: number;
  aiGenerated: boolean;
  legalDomain?: string | null;
  citations?: string[] | null;
  createdAt: string;
  updatedAt: string;
  tags: FindingTag[];
  evidenceLinkCount: number;
}

interface FindingTag {
  id: string;
  findingId: string;
  category: string;
  createdAt: string;
}

interface FindingEvidenceLink {
  id: string;
  findingId: string;
  targetType: string;
  targetId: string;
  targetTitle?: string | null;
  targetExcerpt?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
}

interface FindingVersion {
  id: string;
  findingId: string;
  versionNumber: number;
  versionType: string;
  title: string;
  content: string;
  summary?: string | null;
  aiTaskId?: string | null;
  createdBy: string;
  createdAt: string;
}

interface FindingAiTask {
  id: string;
  findingId?: string | null;
  caseId: string;
  actionType: string;
  status: string;
  payload: any;
  result?: string | null;
  resultSummary?: string | null;
  error?: string | null;
  createdBy: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

interface EntryTypeCount {
  entryType: string;
  count: number;
}

// Entry types for the left sidebar
const ENTRY_TYPES = [
  { value: "note", label: "Notes", icon: FileText, color: "text-slate-600 dark:text-slate-400" },
  { value: "theory", label: "Theories", icon: Lightbulb, color: "text-blue-600 dark:text-blue-400" },
  { value: "legal_issue", label: "Legal Issues", icon: Scale, color: "text-red-600 dark:text-red-400" },
  { value: "contradiction", label: "Contradictions", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400" },
  { value: "credibility", label: "Credibility", icon: Users, color: "text-purple-600 dark:text-purple-400" },
  { value: "research", label: "Research", icon: FileSearch, color: "text-cyan-600 dark:text-cyan-400" },
  { value: "article", label: "Articles", icon: ScrollText, color: "text-green-600 dark:text-green-400" },
  { value: "to_do", label: "To-Do", icon: ListChecks, color: "text-orange-600 dark:text-orange-400" },
  { value: "timeline_event", label: "Timeline", icon: Clock, color: "text-indigo-600 dark:text-indigo-400" },
  { value: "recommendation", label: "Recommendations", icon: Award, color: "text-emerald-600 dark:text-emerald-400" },
];

// Finding categories/tags
const FINDING_CATEGORIES = [
  { value: "theory", label: "Theory", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { value: "concern", label: "Concern", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { value: "legal_issue", label: "Legal Issue", color: "bg-red-500/10 text-red-700 dark:text-red-400" },
  { value: "credibility_note", label: "Credibility Note", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  { value: "contradiction", label: "Contradiction", color: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  { value: "supporting_evidence", label: "Supporting Evidence", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  { value: "todo", label: "To-Do", color: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  { value: "legal_research", label: "Legal Research", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400" },
  { value: "external_article", label: "External Article", color: "bg-teal-500/10 text-teal-700 dark:text-teal-400" },
  { value: "fact_pattern", label: "Fact Pattern", color: "bg-slate-500/10 text-slate-700 dark:text-slate-400" },
  { value: "argument", label: "Argument", color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" },
  { value: "draft_conclusion", label: "Draft Conclusion", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
];

// Legal domains for Apply Law feature
const LEGAL_DOMAINS = [
  { value: "title_vii_retaliation", label: "Title VII - Retaliation" },
  { value: "title_vii_discrimination", label: "Title VII - Discrimination" },
  { value: "antitrust_anticompetitive", label: "Antitrust - Anticompetitive Conduct" },
  { value: "whistleblower_interference", label: "Whistleblower Interference" },
  { value: "fiduciary_duty_breach", label: "Fiduciary Duty Breach" },
  { value: "harassment_policy", label: "Harassment Policy" },
  { value: "fraud", label: "Fraud" },
  { value: "contract_breach", label: "Contract Breach" },
  { value: "fcpa", label: "FCPA" },
  { value: "sox", label: "SOX Compliance" },
  { value: "bsa_aml", label: "BSA/AML" },
  { value: "insider_trading", label: "Insider Trading" },
  { value: "data_privacy", label: "Data Privacy" },
  { value: "state_law_fl_448_102", label: "FL §448.102 Retaliation" },
  { value: "state_law_ca_lab_1102_5", label: "CA Lab §1102.5 Retaliation" },
  { value: "other", label: "Other" },
];

// AI Actions
const AI_ACTIONS = [
  { 
    id: "summarize_interview", 
    label: "Summarize Interview", 
    description: "Generate a summary of interview transcripts",
    icon: MessageSquare,
    requiresInterviewId: true,
  },
  { 
    id: "compare_witnesses", 
    label: "Compare Witnesses", 
    description: "Analyze and compare multiple witness testimonies",
    icon: Users,
    requiresMultipleInterviews: true,
  },
  { 
    id: "compare_documents", 
    label: "Compare Documents", 
    description: "Analyze differences between documents",
    icon: FileSearch,
  },
  { 
    id: "extract_legal_issues", 
    label: "Extract Legal Issues", 
    description: "Identify potential legal issues from case materials",
    icon: Scale,
  },
  { 
    id: "draft_liability_analysis", 
    label: "Draft Liability Analysis", 
    description: "Generate a liability analysis based on findings and evidence",
    icon: Gavel,
  },
  { 
    id: "identify_contradictions", 
    label: "Identify Contradictions", 
    description: "Find contradictions across witness statements",
    icon: AlertTriangle,
  },
  { 
    id: "credibility_analysis", 
    label: "Credibility Analysis", 
    description: "Assess witness credibility based on statements",
    icon: Users,
    requiresMultipleInterviews: true,
  },
  { 
    id: "timeline_reconciliation", 
    label: "Timeline Reconciliation", 
    description: "Build timeline and identify inconsistencies",
    icon: Clock,
  },
  { 
    id: "apply_law", 
    label: "Apply Law to Facts", 
    description: "Element-by-element legal analysis",
    icon: Scale,
    requiresLegalDomain: true,
  },
  { 
    id: "build_theory", 
    label: "Build Theory of Case", 
    description: "Generate case theories from all evidence",
    icon: Lightbulb,
  },
  { 
    id: "draft_final_report", 
    label: "Draft Final Report", 
    description: "Generate investigative conclusion report",
    icon: FileCheck,
  },
];

interface FindingsTabProps {
  caseId: string;
}

export function FindingsTab({ caseId }: FindingsTabProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntryType, setSelectedEntryType] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [applyLawDialogOpen, setApplyLawDialogOpen] = useState(false);
  const [selectedLegalDomain, setSelectedLegalDomain] = useState<string>("");
  
  const [aiActionDialogOpen, setAiActionDialogOpen] = useState(false);
  const [selectedAiAction, setSelectedAiAction] = useState<typeof AI_ACTIONS[0] | null>(null);
  const [selectedInterviewIds, setSelectedInterviewIds] = useState<string[]>([]);
  const [evidenceLinkDialogOpen, setEvidenceLinkDialogOpen] = useState(false);
  const [newEvidenceLink, setNewEvidenceLink] = useState({ targetType: "", targetId: "", notes: "" });

  const [newFindingTitle, setNewFindingTitle] = useState("");
  const [newFindingContent, setNewFindingContent] = useState("");
  const [newFindingEntryType, setNewFindingEntryType] = useState("note");
  const [newFindingCategories, setNewFindingCategories] = useState<string[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSummary, setEditSummary] = useState("");
  
  // Mobile responsive states
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  
  // AI Assistant state
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // Build URL with filters
  const buildFindingsUrl = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (categoryFilter !== "all") params.append("category", categoryFilter);
    if (selectedEntryType) params.append("entryType", selectedEntryType);
    const queryString = params.toString();
    return `/api/cases/${caseId}/findings${queryString ? `?${queryString}` : ""}`;
  };

  // Fetch findings
  const { data: findings = [], isLoading: isLoadingFindings } = useQuery<Finding[]>({
    queryKey: ["/api/cases", caseId, "findings", searchQuery, categoryFilter, selectedEntryType],
    queryFn: async () => {
      const response = await fetch(buildFindingsUrl(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch findings");
      return response.json();
    },
    enabled: !!caseId,
  });

  // Fetch entry type counts for sidebar
  const { data: entryTypeCounts = [] } = useQuery<EntryTypeCount[]>({
    queryKey: ["/api/cases", caseId, "findings", "counts"],
    queryFn: async () => {
      const response = await fetch(`/api/cases/${caseId}/findings/counts`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch counts");
      return response.json();
    },
    enabled: !!caseId,
  });

  // Fetch interviews for AI actions
  const { data: interviews = [] } = useQuery<any[]>({
    queryKey: ["/api/cases", caseId, "interviews"],
    enabled: !!caseId && (aiDrawerOpen || aiActionDialogOpen),
  });

  // Fetch selected finding details
  const { data: selectedFindingFull, isLoading: isLoadingSelectedFinding } = useQuery<Finding & { evidenceLinks: FindingEvidenceLink[] }>({
    queryKey: ["/api/findings", selectedFinding?.id],
    enabled: !!selectedFinding?.id,
  });

  // Fetch versions
  const { data: findingVersions = [], isLoading: isLoadingVersions } = useQuery<FindingVersion[]>({
    queryKey: ["/api/findings", selectedFinding?.id, "versions"],
    enabled: !!selectedFinding?.id && versionHistoryOpen,
  });

  // AI tasks polling
  const [shouldPollAiTasks, setShouldPollAiTasks] = useState(false);

  const { data: aiTasks = [] } = useQuery<FindingAiTask[]>({
    queryKey: ["/api/cases", caseId, "finding-ai-tasks"],
    enabled: !!caseId && aiDrawerOpen,
    refetchInterval: shouldPollAiTasks ? 3000 : false,
  });

  useEffect(() => {
    const hasPendingTasks = aiTasks.some((t) => t.status === "pending" || t.status === "running");
    setShouldPollAiTasks(hasPendingTasks);
  }, [aiTasks]);

  // Mutations
  const createFindingMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; entryType: string; categories: string[] }) => {
      return await apiRequest("POST", `/api/cases/${caseId}/findings`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Finding created successfully" });
      setCreateDialogOpen(false);
      setNewFindingTitle("");
      setNewFindingContent("");
      setNewFindingEntryType("note");
      setNewFindingCategories([]);
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateFindingMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: string; summary?: string; isPinned?: boolean; createVersion?: boolean; versionType?: string }) => {
      return await apiRequest("PATCH", `/api/findings/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Finding updated successfully" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
      if (selectedFinding) {
        queryClient.invalidateQueries({ queryKey: ["/api/findings", selectedFinding.id] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFindingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/findings/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Finding deleted successfully" });
      setSelectedFinding(null);
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return await apiRequest("PATCH", `/api/findings/${id}`, { isPinned, createVersion: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async ({ findingId, category }: { findingId: string; category: string }) => {
      return await apiRequest("POST", `/api/findings/${findingId}/tags`, { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
      if (selectedFinding) {
        queryClient.invalidateQueries({ queryKey: ["/api/findings", selectedFinding.id] });
      }
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async ({ findingId, category }: { findingId: string; category: string }) => {
      return await apiRequest("DELETE", `/api/findings/${findingId}/tags/${category}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
      if (selectedFinding) {
        queryClient.invalidateQueries({ queryKey: ["/api/findings", selectedFinding.id] });
      }
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async ({ findingId, versionId }: { findingId: string; versionId: string }) => {
      return await apiRequest("POST", `/api/findings/${findingId}/versions/${versionId}/restore`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Version restored successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
      if (selectedFinding) {
        queryClient.invalidateQueries({ queryKey: ["/api/findings", selectedFinding.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/findings", selectedFinding.id, "versions"] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const runAiActionMutation = useMutation({
    mutationFn: async ({ actionType, payload, createFinding }: { actionType: string; payload?: any; createFinding?: boolean }) => {
      return await apiRequest("POST", `/api/cases/${caseId}/finding-ai-actions`, { 
        actionType, 
        payload: payload || {}, 
        createFinding 
      });
    },
    onSuccess: () => {
      toast({ title: "AI Task Started", description: "The AI analysis is being processed..." });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "finding-ai-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
      setAiActionDialogOpen(false);
      setApplyLawDialogOpen(false);
      setSelectedInterviewIds([]);
      setSelectedLegalDomain("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addEvidenceLinkMutation = useMutation({
    mutationFn: async ({ findingId, targetType, targetId, notes }: { findingId: string; targetType: string; targetId: string; notes?: string }) => {
      return await apiRequest("POST", `/api/findings/${findingId}/evidence-links`, { targetType, targetId, notes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Evidence linked successfully" });
      if (selectedFinding) {
        queryClient.invalidateQueries({ queryKey: ["/api/findings", selectedFinding.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
      }
      setEvidenceLinkDialogOpen(false);
      setNewEvidenceLink({ targetType: "", targetId: "", notes: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeEvidenceLinkMutation = useMutation({
    mutationFn: async ({ findingId, linkId }: { findingId: string; linkId: string }) => {
      return await apiRequest("DELETE", `/api/findings/${findingId}/evidence-links/${linkId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Evidence link removed" });
      if (selectedFinding) {
        queryClient.invalidateQueries({ queryKey: ["/api/findings", selectedFinding.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handlers
  const handleCreateFinding = () => {
    if (!newFindingTitle.trim() || !newFindingContent.trim()) {
      toast({ title: "Error", description: "Title and content are required", variant: "destructive" });
      return;
    }
    createFindingMutation.mutate({
      title: newFindingTitle,
      content: newFindingContent,
      entryType: newFindingEntryType,
      categories: newFindingCategories,
    });
  };

  const handleSaveEdit = () => {
    if (!selectedFinding) return;
    updateFindingMutation.mutate({
      id: selectedFinding.id,
      title: editTitle,
      content: editContent,
      summary: editSummary || undefined,
      versionType: "manual",
    });
  };

  const handleSelectFinding = (finding: Finding) => {
    setSelectedFinding(finding);
    setIsEditing(false);
    setEditTitle(finding.title);
    setEditContent(finding.content);
    setEditSummary(finding.summary || "");
  };

  const handleRunAiAction = (action: typeof AI_ACTIONS[0]) => {
    if (action.requiresInterviewId || action.requiresMultipleInterviews) {
      setSelectedAiAction(action);
      setAiActionDialogOpen(true);
    } else if (action.requiresLegalDomain) {
      setSelectedAiAction(action);
      setApplyLawDialogOpen(true);
    } else {
      runAiActionMutation.mutate({ actionType: action.id, createFinding: true });
    }
  };

  const handleConfirmAiAction = () => {
    if (!selectedAiAction) return;
    
    if (selectedAiAction.requiresLegalDomain && selectedLegalDomain) {
      runAiActionMutation.mutate({
        actionType: selectedAiAction.id,
        payload: { legalDomain: selectedLegalDomain },
        createFinding: true,
      });
    } else if (selectedInterviewIds.length > 0) {
      runAiActionMutation.mutate({
        actionType: selectedAiAction.id,
        payload: { interviewIds: selectedInterviewIds },
        createFinding: true,
      });
    }
  };

  const handleAddEvidenceLink = () => {
    if (!selectedFinding || !newEvidenceLink.targetType || !newEvidenceLink.targetId) return;
    addEvidenceLinkMutation.mutate({
      findingId: selectedFinding.id,
      targetType: newEvidenceLink.targetType,
      targetId: newEvidenceLink.targetId,
      notes: newEvidenceLink.notes || undefined,
    });
  };

  // Helpers
  const getCategoryStyle = (category: string) => {
    const cat = FINDING_CATEGORIES.find(c => c.value === category);
    return cat?.color || "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  };

  const getCategoryLabel = (category: string) => {
    const cat = FINDING_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const getEntryTypeInfo = (type: string) => {
    return ENTRY_TYPES.find(t => t.value === type) || ENTRY_TYPES[0];
  };

  const getEntryTypeCount = (type: string) => {
    const entry = entryTypeCounts.find(e => e.entryType === type);
    return entry?.count || 0;
  };

  const totalCount = findings.length;
  const pinnedFindings = findings.filter(f => f.isPinned);
  const unpinnedFindings = findings.filter(f => !f.isPinned);

  // Categories sidebar content (reusable for both desktop and mobile)
  const CategoriesSidebar = () => (
    <div className="p-2">
      <button
        onClick={() => {
          setSelectedEntryType(null);
          setMobileCategoriesOpen(false);
        }}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
          !selectedEntryType ? "bg-accent font-medium" : "hover:bg-accent/50"
        )}
        data-testid="button-filter-all"
      >
        <span className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          All Entries
        </span>
        <Badge variant="secondary" className="text-xs h-5 px-1.5">
          {totalCount}
        </Badge>
      </button>
      
      <Separator className="my-2" />
      
      {ENTRY_TYPES.map((type) => {
        const count = getEntryTypeCount(type.value);
        const Icon = type.icon;
        return (
          <button
            key={type.value}
            onClick={() => {
              setSelectedEntryType(type.value);
              setMobileCategoriesOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
              selectedEntryType === type.value ? "bg-accent font-medium" : "hover:bg-accent/50"
            )}
            data-testid={`button-filter-${type.value}`}
          >
            <span className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", type.color)} />
              {type.label}
            </span>
            {count > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-220px)] gap-2 lg:gap-4 overflow-hidden">
      {/* Mobile Categories Sheet */}
      <Sheet open={mobileCategoriesOpen} onOpenChange={setMobileCategoriesOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="p-3 border-b">
            <SheetTitle className="text-sm">Categories</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-49px)]">
            <CategoriesSidebar />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop Left Sidebar - Entry Type Navigation (hidden on mobile) */}
      <div className="hidden lg:block w-[200px] flex-shrink-0 border rounded-lg bg-card">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Categories</h3>
        </div>
        <ScrollArea className="h-[calc(100%-49px)]">
          <CategoriesSidebar />
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-2 lg:gap-4 min-w-0">
        {/* Top Action Bar */}
        <Card className="p-2 lg:p-3 flex-shrink-0">
          <div className="flex flex-col gap-2">
            {/* First Row: Menu + Search + Filter */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile Categories Toggle */}
              <Button 
                size="icon" 
                variant="outline" 
                className="lg:hidden flex-shrink-0"
                onClick={() => setMobileCategoriesOpen(true)}
                data-testid="button-mobile-categories"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search findings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-findings"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[100px] md:w-[140px] flex-shrink-0" data-testid="select-category-filter">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {FINDING_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Second Row: Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-finding">
                    <Plus className="h-4 w-4 mr-1" />
                    New Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Finding</DialogTitle>
                    <DialogDescription>
                      Add a new investigative finding, theory, or note
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Entry Type</label>
                      <Select value={newFindingEntryType} onValueChange={setNewFindingEntryType}>
                        <SelectTrigger data-testid="select-entry-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTRY_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <span className="flex items-center gap-2">
                                  <Icon className={cn("h-4 w-4", type.color)} />
                                  {type.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Title</label>
                      <Input
                        placeholder="Finding title..."
                        value={newFindingTitle}
                        onChange={(e) => setNewFindingTitle(e.target.value)}
                        data-testid="input-finding-title"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Content</label>
                      <Textarea
                        placeholder="Content..."
                        value={newFindingContent}
                        onChange={(e) => setNewFindingContent(e.target.value)}
                        className="min-h-[150px]"
                        data-testid="input-finding-content"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {FINDING_CATEGORIES.map((cat) => (
                          <Badge
                            key={cat.value}
                            variant="outline"
                            className={cn(
                              "cursor-pointer transition-colors",
                              newFindingCategories.includes(cat.value)
                                ? cat.color
                                : "hover:bg-accent"
                            )}
                            onClick={() => {
                              setNewFindingCategories(prev =>
                                prev.includes(cat.value)
                                  ? prev.filter(c => c !== cat.value)
                                  : [...prev, cat.value]
                              );
                            }}
                            data-testid={`badge-category-${cat.value}`}
                          >
                            {cat.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateFinding}
                      disabled={createFindingMutation.isPending}
                      data-testid="button-submit-finding"
                    >
                      {createFindingMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Finding"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Separator orientation="vertical" className="h-6 hidden sm:block" />

              {/* AI Action Buttons - hidden on mobile, show full text on larger screens */}
              <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => handleRunAiAction(AI_ACTIONS.find(a => a.id === "compare_witnesses")!)}>
                <Users className="h-4 w-4 md:mr-1" />
                <span className="hidden lg:inline">AI Compare</span>
              </Button>
              
              <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => {
                setSelectedAiAction(AI_ACTIONS.find(a => a.id === "apply_law")!);
                setApplyLawDialogOpen(true);
              }}>
                <Scale className="h-4 w-4 md:mr-1" />
                <span className="hidden lg:inline">Apply Law</span>
              </Button>
              
              <Button variant="outline" size="sm" className="hidden lg:flex" onClick={() => handleRunAiAction(AI_ACTIONS.find(a => a.id === "build_theory")!)}>
                <Lightbulb className="h-4 w-4 mr-1" />
                Build Theory
              </Button>
              
              <Button variant="outline" size="sm" className="hidden xl:flex" onClick={() => handleRunAiAction(AI_ACTIONS.find(a => a.id === "draft_final_report")!)}>
                <FileCheck className="h-4 w-4 mr-1" />
                Draft Report
              </Button>

              {/* Ask About Case - AI Investigation Assistant */}
              <Button 
                variant="default"
                size="sm"
                onClick={() => setAiAssistantOpen(true)}
                data-testid="button-ask-about-case"
                className="gap-1"
              >
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Ask About Case</span>
              </Button>
              
              {/* AI Drawer Button - always visible for access to all AI actions */}
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => setAiDrawerOpen(true)}
                data-testid="button-ai-drawer"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Findings List and Detail View */}
        <div className="flex gap-2 lg:gap-4 flex-1 min-h-0 min-w-0">
          {/* Findings List - hidden on mobile when finding selected, flexible width otherwise */}
          <Card className={cn(
            "flex flex-col",
            selectedFinding 
              ? "hidden md:flex md:w-[320px] lg:w-[400px] xl:w-[480px] flex-shrink-0" 
              : "flex-1 min-w-0"
          )}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {selectedEntryType ? getEntryTypeInfo(selectedEntryType).label : "All Findings"}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {findings.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {isLoadingFindings ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : findings.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No findings yet</p>
                    <p className="text-sm mt-1">Create your first finding to start documenting your analysis</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {pinnedFindings.length > 0 && (
                      <div className="mb-3">
                        <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </div>
                        <div className="space-y-1">
                          {pinnedFindings.map((finding) => (
                            <FindingListItem
                              key={finding.id}
                              finding={finding}
                              isSelected={selectedFinding?.id === finding.id}
                              onSelect={() => handleSelectFinding(finding)}
                              onTogglePin={() => togglePinMutation.mutate({ id: finding.id, isPinned: false })}
                              onDelete={() => deleteFindingMutation.mutate(finding.id)}
                              getCategoryStyle={getCategoryStyle}
                              getCategoryLabel={getCategoryLabel}
                              getEntryTypeInfo={getEntryTypeInfo}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {unpinnedFindings.length > 0 && (
                      <div>
                        {pinnedFindings.length > 0 && (
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Other Findings
                          </div>
                        )}
                        <div className="space-y-1">
                          {unpinnedFindings.map((finding) => (
                            <FindingListItem
                              key={finding.id}
                              finding={finding}
                              isSelected={selectedFinding?.id === finding.id}
                              onSelect={() => handleSelectFinding(finding)}
                              onTogglePin={() => togglePinMutation.mutate({ id: finding.id, isPinned: true })}
                              onDelete={() => deleteFindingMutation.mutate(finding.id)}
                              getCategoryStyle={getCategoryStyle}
                              getCategoryLabel={getCategoryLabel}
                              getEntryTypeInfo={getEntryTypeInfo}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Finding Detail View - full width on mobile when selected */}
          <Card className={cn(
            "flex flex-col min-w-0",
            selectedFinding ? "flex-1" : "hidden md:flex flex-1"
          )}>
            {selectedFinding ? (
              <>
                <CardHeader className="py-2 px-3 lg:py-3 lg:px-4 border-b">
                  <div className="flex items-center justify-between gap-2">
                    {/* Mobile back button */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="md:hidden flex-shrink-0"
                      onClick={() => setSelectedFinding(null)}
                      data-testid="button-back-to-list"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-lg font-semibold"
                          data-testid="input-edit-title"
                        />
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedFinding.isPinned && <Pin className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                          {(() => {
                            const typeInfo = getEntryTypeInfo(selectedFinding.entryType);
                            const Icon = typeInfo.icon;
                            return <Icon className={cn("h-4 w-4 flex-shrink-0", typeInfo.color)} />;
                          })()}
                          <CardTitle className="text-base lg:text-lg truncate">{selectedFinding.title}</CardTitle>
                          {selectedFinding.aiGenerated && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              <Sparkles className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">AI Generated</span>
                              <span className="sm:hidden">AI</span>
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 lg:gap-3 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {getEntryTypeInfo(selectedFinding.entryType).label}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          Updated {formatDistanceToNow(new Date(selectedFinding.updatedAt), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          v{selectedFinding.versionCount}
                        </span>
                        {selectedFinding.evidenceLinkCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Link2 className="h-3 w-3 mr-1" />
                            {selectedFinding.evidenceLinkCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 lg:gap-2 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setVersionHistoryOpen(true)}
                        data-testid="button-version-history"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      {isEditing ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                            <span className="hidden sm:inline">Cancel</span>
                            <X className="h-4 w-4 sm:hidden" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={updateFindingMutation.isPending}
                            data-testid="button-save-edit"
                          >
                            {updateFindingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="button-edit-finding">
                          <Edit className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <div className="flex h-full">
                    {/* Main Content */}
                    <div className="flex-1 p-4 overflow-auto">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Summary (optional)</label>
                            <Input
                              value={editSummary}
                              onChange={(e) => setEditSummary(e.target.value)}
                              placeholder="Brief summary..."
                              data-testid="input-edit-summary"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Content</label>
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[300px]"
                              data-testid="input-edit-content"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {selectedFinding.summary && (
                            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm font-medium text-muted-foreground mb-1">Summary</p>
                              <p>{selectedFinding.summary}</p>
                            </div>
                          )}
                          <div className="whitespace-pre-wrap">{selectedFinding.content}</div>
                        </div>
                      )}

                      {/* Tags */}
                      {!isEditing && selectedFinding.tags.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedFinding.tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className={cn(getCategoryStyle(tag.category), "text-xs")}
                              >
                                {getCategoryLabel(tag.category)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evidence Links */}
                      {!isEditing && selectedFindingFull?.evidenceLinks && selectedFindingFull.evidenceLinks.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">Linked Evidence</p>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setEvidenceLinkDialogOpen(true)}
                              data-testid="button-add-evidence"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {selectedFindingFull.evidenceLinks.map((link) => (
                              <div key={link.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {link.targetType.replace("_", " ")}
                                  </Badge>
                                  <span className="text-sm">{link.targetTitle || link.targetId}</span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => removeEvidenceLinkMutation.mutate({ 
                                    findingId: selectedFinding.id, 
                                    linkId: link.id 
                                  })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isEditing && (!selectedFindingFull?.evidenceLinks || selectedFindingFull.evidenceLinks.length === 0) && (
                        <div className="mt-6 pt-4 border-t">
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => setEvidenceLinkDialogOpen(true)}
                            data-testid="button-add-evidence"
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Link Evidence
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium text-lg">Select a finding to view</p>
                  <p className="text-sm mt-1">Or create a new one to get started</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* AI Tool Drawer */}
      <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Analysis Tools
            </SheetTitle>
            <SheetDescription>
              Use AI to analyze evidence, compare witnesses, and generate insights
            </SheetDescription>
          </SheetHeader>
          
          <Tabs defaultValue="actions" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="actions" className="mt-4">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-3 pr-4">
                  {AI_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Card 
                        key={action.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleRunAiAction(action)}
                        data-testid={`button-ai-action-${action.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{action.label}</h4>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {action.description}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-3 pr-4">
                  {aiTasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No AI tasks yet</p>
                    </div>
                  ) : (
                    aiTasks.map((task) => (
                      <Card key={task.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium capitalize">
                                {task.actionType.replace(/_/g, " ")}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(task.createdAt), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                task.status === "completed" ? "default" : 
                                task.status === "failed" ? "destructive" : 
                                "secondary"
                              }
                            >
                              {task.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              {task.status}
                            </Badge>
                          </div>
                          {task.resultSummary && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {task.resultSummary}
                            </p>
                          )}
                          {task.error && (
                            <p className="text-sm text-destructive mt-2">
                              {task.error}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Version History Sheet */}
      <Sheet open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
            <SheetDescription>
              View and restore previous versions of this finding
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-180px)] mt-6">
            <div className="space-y-3 pr-4">
              {isLoadingVersions ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : findingVersions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No version history</p>
                </div>
              ) : (
                findingVersions.map((version) => (
                  <Card key={version.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">Version {version.versionNumber}</h4>
                            <Badge variant="outline" className="text-xs capitalize">
                              {version.versionType.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(version.createdAt), "MMM d, yyyy h:mm a")}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {version.title}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectedFinding && restoreVersionMutation.mutate({
                            findingId: selectedFinding.id,
                            versionId: version.id,
                          })}
                          disabled={restoreVersionMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* AI Action Dialog (for interview selection) */}
      <Dialog open={aiActionDialogOpen} onOpenChange={setAiActionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAiAction?.label}</DialogTitle>
            <DialogDescription>
              {selectedAiAction?.requiresMultipleInterviews 
                ? "Select two or more interviews to compare"
                : "Select an interview to analyze"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {interviews.map((interview: any) => (
                <div 
                  key={interview.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                  onClick={() => {
                    if (selectedInterviewIds.includes(interview.id)) {
                      setSelectedInterviewIds(prev => prev.filter(id => id !== interview.id));
                    } else {
                      setSelectedInterviewIds(prev => [...prev, interview.id]);
                    }
                  }}
                >
                  <Checkbox 
                    checked={selectedInterviewIds.includes(interview.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedInterviewIds(prev => [...prev, interview.id]);
                      } else {
                        setSelectedInterviewIds(prev => prev.filter(id => id !== interview.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{interview.intervieweeName || "Unknown Witness"}</p>
                    <p className="text-sm text-muted-foreground">
                      {interview.scheduledAt 
                        ? format(new Date(interview.scheduledAt), "MMM d, yyyy")
                        : "Not scheduled"}
                    </p>
                  </div>
                </div>
              ))}
              {interviews.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No interviews available</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAiAction}
              disabled={
                runAiActionMutation.isPending || 
                (selectedAiAction?.requiresMultipleInterviews && selectedInterviewIds.length < 2) ||
                (selectedAiAction?.requiresInterviewId && selectedInterviewIds.length === 0)
              }
            >
              {runAiActionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Run Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Law Dialog */}
      <Dialog open={applyLawDialogOpen} onOpenChange={setApplyLawDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Law to Facts</DialogTitle>
            <DialogDescription>
              Select a legal domain for element-by-element analysis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Legal Domain</label>
              <Select value={selectedLegalDomain} onValueChange={setSelectedLegalDomain}>
                <SelectTrigger data-testid="select-legal-domain">
                  <SelectValue placeholder="Select a legal domain..." />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_DOMAINS.map((domain) => (
                    <SelectItem key={domain.value} value={domain.value}>
                      {domain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                The AI will analyze your case materials against the selected legal framework, 
                producing an element-by-element analysis with evidence mapping, missing proof 
                identification, and exposure assessment.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyLawDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAiAction}
              disabled={runAiActionMutation.isPending || !selectedLegalDomain}
            >
              {runAiActionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence Link Dialog */}
      <Dialog open={evidenceLinkDialogOpen} onOpenChange={setEvidenceLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Evidence</DialogTitle>
            <DialogDescription>
              Connect this finding to related evidence in the case
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Evidence Type</label>
              <Select 
                value={newEvidenceLink.targetType} 
                onValueChange={(v) => setNewEvidenceLink(prev => ({ ...prev, targetType: v, targetId: "" }))}
              >
                <SelectTrigger data-testid="select-evidence-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="communication">Email/Communication</SelectItem>
                  <SelectItem value="chat_message">Chat Message</SelectItem>
                  <SelectItem value="custodian">Custodian</SelectItem>
                  <SelectItem value="timeline_event">Timeline Event</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newEvidenceLink.targetType === "interview" && (
              <div className="space-y-2 max-h-[200px] overflow-auto">
                <label className="text-sm font-medium mb-1.5 block">Select Interview</label>
                {interviews.map((interview: any) => (
                  <div 
                    key={interview.id}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                      newEvidenceLink.targetId === interview.id ? "bg-accent border-primary" : "hover:bg-accent/50"
                    )}
                    onClick={() => setNewEvidenceLink(prev => ({ ...prev, targetId: interview.id }))}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{interview.intervieweeName || "Unknown Witness"}</p>
                      <p className="text-sm text-muted-foreground">
                        {interview.scheduledAt 
                          ? format(new Date(interview.scheduledAt), "MMM d, yyyy")
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {newEvidenceLink.targetType && newEvidenceLink.targetType !== "interview" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Reference ID</label>
                <Input
                  placeholder="Enter the ID of the evidence"
                  value={newEvidenceLink.targetId}
                  onChange={(e) => setNewEvidenceLink(prev => ({ ...prev, targetId: e.target.value }))}
                  data-testid="input-evidence-id"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copy the ID from the relevant document, email, or other evidence
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes (Optional)</label>
              <Textarea
                placeholder="Add context about why this evidence is relevant..."
                value={newEvidenceLink.notes}
                onChange={(e) => setNewEvidenceLink(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                data-testid="input-evidence-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddEvidenceLink}
              disabled={addEvidenceLinkMutation.isPending || !newEvidenceLink.targetType || !newEvidenceLink.targetId}
              data-testid="button-add-evidence-link"
            >
              {addEvidenceLinkMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Link Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Investigation Assistant */}
      <CaseAIAssistant
        caseId={caseId}
        isOpen={aiAssistantOpen}
        onOpenChange={setAiAssistantOpen}
        onNavigateToEvidence={(evidence) => {
          setAiAssistantOpen(false);
          
          switch (evidence.sourceType) {
            case "document":
              setLocation(`/document-review?caseId=${caseId}&id=${evidence.sourceId}`);
              break;
            case "interview":
              setLocation(`/cases/${caseId}/interviews?id=${evidence.sourceId}`);
              break;
            case "chat_message":
              setLocation(`/chat-review?caseId=${caseId}&id=${evidence.sourceId}`);
              break;
            case "transcript_segment":
              if (evidence.metadata?.interviewId) {
                setLocation(`/cases/${caseId}/interviews?id=${evidence.metadata.interviewId}&segment=${evidence.sourceId}`);
              } else {
                toast({
                  title: "Navigation",
                  description: "Opening transcript segment...",
                });
              }
              break;
            case "finding":
              const targetFinding = findings?.find((f: Finding) => f.id === evidence.sourceId);
              if (targetFinding) {
                setSelectedFinding(targetFinding);
                toast({
                  title: "Finding Selected",
                  description: `Showing: ${targetFinding.title || "Finding"}`,
                });
              }
              break;
            default:
              toast({
                title: "View Evidence",
                description: `Source type: ${evidence.sourceType}`,
              });
          }
        }}
      />
    </div>
  );
}

// Finding List Item Component
interface FindingListItemProps {
  finding: Finding;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  getCategoryStyle: (category: string) => string;
  getCategoryLabel: (category: string) => string;
  getEntryTypeInfo: (type: string) => typeof ENTRY_TYPES[0];
}

function FindingListItem({
  finding,
  isSelected,
  onSelect,
  onTogglePin,
  onDelete,
  getCategoryStyle,
  getCategoryLabel,
  getEntryTypeInfo,
}: FindingListItemProps) {
  const typeInfo = getEntryTypeInfo(finding.entryType);
  const Icon = typeInfo.icon;
  
  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-colors",
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      )}
      onClick={onSelect}
      data-testid={`finding-item-${finding.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {finding.isPinned && <Pin className="h-3 w-3 text-amber-500 flex-shrink-0" />}
            <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", typeInfo.color)} />
            <span className="font-medium truncate text-sm">{finding.title}</span>
            {finding.aiGenerated && (
              <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {finding.summary || finding.content}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {finding.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className={cn(getCategoryStyle(tag.category), "text-[10px] h-5")}
              >
                {getCategoryLabel(tag.category)}
              </Badge>
            ))}
            {finding.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px] h-5">
                +{finding.tags.length - 3}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(); }}>
              {finding.isPinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2">
        <span>{formatDistanceToNow(new Date(finding.updatedAt), { addSuffix: true })}</span>
        {finding.evidenceLinkCount > 0 && (
          <>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {finding.evidenceLinkCount}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
