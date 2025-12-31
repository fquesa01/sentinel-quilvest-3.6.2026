import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Calendar,
  Mail,
  MessageSquare,
  FileText,
  AlertTriangle,
  User,
  ChevronDown,
  ChevronRight,
  Star,
  EyeOff,
  Eye,
  Filter,
  X,
  Download,
  Columns,
  Send,
  Inbox,
  FileSignature,
  ClipboardList,
  Shield,
  Lock,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CaseTimelineEvent } from "@shared/schema";
import { ManageColumnsDialog } from "./manage-columns-dialog";

interface TimelineSectionProps {
  caseId: string;
}

const EVENT_TYPE_ICONS: Record<string, typeof Calendar> = {
  email_thread: Mail,
  chat_thread: MessageSquare,
  meeting: Calendar,
  interview_extract: User,
  alert: AlertTriangle,
  manual: FileText,
  system: FileText,
  payment: FileText,
  correspondence_received: Inbox,
  correspondence_sent: Send,
  written_statement: FileSignature,
  statement_request: ClipboardList,
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  email_thread: "Email",
  chat_thread: "Chat",
  meeting: "Meeting",
  interview_extract: "Interview",
  alert: "Alert",
  manual: "Manual",
  system: "System",
  payment: "Payment",
  correspondence_received: "Correspondence Received",
  correspondence_sent: "Correspondence Sent",
  written_statement: "Written Statement",
  statement_request: "Statement Request",
};

const CORRESPONDENCE_TYPES = [
  "correspondence_received",
  "correspondence_sent", 
  "written_statement",
  "statement_request",
];

const PRIVILEGE_STATUS_LABELS: Record<string, string> = {
  attorney_client: "Attorney-Client",
  work_product: "Work Product",
  confidential: "Confidential",
  none: "No Privilege",
};

const ACKNOWLEDGMENT_STATUS_ICONS: Record<string, typeof CheckCircle> = {
  acknowledged: CheckCircle,
  pending: Clock,
  declined: XCircle,
  not_required: CheckCircle,
};

type RiskLevel = "critical" | "medium" | "cleared" | "neutral";

type ColumnKey = "date" | "type" | "title" | "participants" | "tags" | "risk" | "importance" | "userNotes";

interface ColumnVisibility {
  date: boolean;
  type: boolean;
  title: boolean;
  participants: boolean;
  tags: boolean;
  risk: boolean;
  importance: boolean;
  userNotes: boolean;
}

interface ColumnMetadata {
  key: ColumnKey;
  label: string;
  mandatory: boolean;
  defaultVisible: boolean;
}

const DEFAULT_COLUMN_DEFINITIONS: ColumnMetadata[] = [
  { key: 'date', label: 'Date', mandatory: true, defaultVisible: true },
  { key: 'type', label: 'Type', mandatory: false, defaultVisible: true },
  { key: 'title', label: 'Title', mandatory: false, defaultVisible: true },
  { key: 'participants', label: 'Participants', mandatory: false, defaultVisible: true },
  { key: 'tags', label: 'Tags', mandatory: false, defaultVisible: true },
  { key: 'risk', label: 'Risk', mandatory: false, defaultVisible: true },
  { key: 'importance', label: 'Importance', mandatory: false, defaultVisible: true },
  { key: 'userNotes', label: 'User Notes', mandatory: false, defaultVisible: true },
];

const DEFAULT_COLUMNS: ColumnVisibility = DEFAULT_COLUMN_DEFINITIONS.reduce(
  (acc, col) => ({ ...acc, [col.key]: col.defaultVisible }),
  {} as ColumnVisibility
);

const DEFAULT_COLUMN_ORDER: ColumnKey[] = DEFAULT_COLUMN_DEFINITIONS.map(col => col.key);

// Storage helpers with validation
function readCaseColumns(caseId: string): ColumnVisibility {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;
  
  try {
    const stored = localStorage.getItem(`timelineColumns:${caseId}`);
    if (!stored) return DEFAULT_COLUMNS;
    
    const parsed = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('Invalid column preferences format, using defaults');
      return DEFAULT_COLUMNS;
    }
    
    // Validate and merge with defaults
    const validated: ColumnVisibility = { ...DEFAULT_COLUMNS };
    for (const col of DEFAULT_COLUMN_DEFINITIONS) {
      if (col.key in parsed && typeof parsed[col.key] === 'boolean') {
        // Enforce mandatory columns
        validated[col.key] = col.mandatory ? true : parsed[col.key];
      }
    }
    
    return validated;
  } catch (e) {
    console.error('Failed to load column preferences:', e);
    return DEFAULT_COLUMNS;
  }
}

function writeCaseColumns(caseId: string, columns: ColumnVisibility): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Enforce mandatory columns before saving
    const validated = { ...columns };
    for (const col of DEFAULT_COLUMN_DEFINITIONS) {
      if (col.mandatory) {
        validated[col.key] = true;
      }
    }
    
    localStorage.setItem(`timelineColumns:${caseId}`, JSON.stringify(validated));
  } catch (e) {
    console.error('Failed to save column preferences:', e);
  }
}

function getRiskColor(riskLevel: RiskLevel | null | undefined) {
  switch (riskLevel) {
    case "critical":
      return { borderClass: "border-l-red-600", bgClass: "bg-red-600", label: "Critical" };
    case "medium":
      return { borderClass: "border-l-yellow-400", bgClass: "bg-yellow-400", label: "Medium Risk" };
    case "cleared":
      return { borderClass: "border-l-green-500", bgClass: "bg-green-500", label: "Cleared" };
    default:
      return { borderClass: "border-l-gray-400", bgClass: "bg-gray-400", label: "Neutral" };
  }
}

interface NewEventForm {
  eventType: string;
  title: string;
  summary: string;
  eventDate: string;
  isCorrespondence: boolean;
  partyId: string;
  correspondenceDirection: string;
  correspondenceType: string;
  privilegeStatus: string;
  transmissionMethod: string;
  acknowledgmentStatus: string;
  importanceScore: number;
  riskLevel: RiskLevel;
}

const INITIAL_EVENT_FORM: NewEventForm = {
  eventType: "manual",
  title: "",
  summary: "",
  eventDate: new Date().toISOString().split("T")[0],
  isCorrespondence: false,
  partyId: "",
  correspondenceDirection: "",
  correspondenceType: "",
  privilegeStatus: "none",
  transmissionMethod: "",
  acknowledgmentStatus: "not_required",
  importanceScore: 50,
  riskLevel: "neutral",
};

export function TimelineSection({ caseId }: TimelineSectionProps) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventForm>(INITIAL_EVENT_FORM);
  
  // Column visibility state with lazy initialization from localStorage
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>(() => readCaseColumns(caseId));

  // Reload column preferences when caseId changes
  useEffect(() => {
    setVisibleColumns(readCaseColumns(caseId));
  }, [caseId]);

  // Persist column visibility to localStorage with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      writeCaseColumns(caseId, visibleColumns);
    }, 500);
    return () => clearTimeout(timer);
  }, [visibleColumns, caseId]);
  
  // Parse filters from URL on mount using wouter's location
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const [showHidden, setShowHidden] = useState(searchParams.get("showHidden") === "true");
  const [viewMode, setViewMode] = useState<"all" | "timeline" | "correspondence">(
    (searchParams.get("viewMode") as "all" | "timeline" | "correspondence") || "all"
  );
  
  // Parse minImportance with fallback to default on invalid values
  const parseMinImportance = (value: string | null): number => {
    if (!value) return 20;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  };
  
  const [filters, setFilters] = useState({
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    eventTypes: searchParams.get("eventTypes")?.split(",").filter(Boolean) || [],
    minImportance: parseMinImportance(searchParams.get("minImportance")),
  });

  // Sync filters to URL whenever they change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (showHidden) params.set("showHidden", "true");
    if (viewMode !== "all") params.set("viewMode", viewMode);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.eventTypes.length > 0) params.set("eventTypes", filters.eventTypes.join(","));
    if (filters.minImportance !== 20) params.set("minImportance", filters.minImportance.toString());
    
    const newSearch = params.toString();
    const basePath = location.split('?')[0];
    // Use window.location.search for accurate current state to avoid stale closure
    const currentSearch = (typeof window !== 'undefined' ? window.location.search.slice(1) : location.split('?')[1]) || "";
    
    // Only update if search params actually changed
    if (newSearch !== currentSearch) {
      const newPath = basePath + (newSearch ? `?${newSearch}` : "");
      setLocation(newPath, { replace: true });
    }
  }, [showHidden, viewMode, filters, location, setLocation]);

  // Build query key with filters for proper caching
  const queryKey = [
    "/api/cases",
    caseId,
    "timeline",
    showHidden,
    filters.dateFrom,
    filters.dateTo,
    filters.eventTypes.join(","),
    filters.minImportance,
  ];

  const { data: events = [], isLoading } = useQuery<CaseTimelineEvent[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showHidden) params.append("showHidden", "true");
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.minImportance !== undefined && filters.minImportance !== 20) {
        params.append("minImportance", filters.minImportance.toString());
      }
      filters.eventTypes.forEach(type => params.append("eventTypes", type));
      
      const response = await fetch(`/api/cases/${caseId}/timeline?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch timeline events");
      return response.json();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<CaseTimelineEvent> }) => {
      return await apiRequest("PATCH", `/api/cases/${caseId}/timeline/${eventId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "timeline"] });
      toast({ title: "Event updated successfully" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest("DELETE", `/api/cases/${caseId}/timeline/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "timeline"] });
      toast({ title: "Event deleted successfully" });
    },
  });

  // Fetch parties for the party selector in correspondence entries
  const { data: parties = [] } = useQuery<{ id: string; name: string; roleType: string; caseRole: string }[]>({
    queryKey: ["/api/cases", caseId, "parties"],
    queryFn: async () => {
      const response = await fetch(`/api/cases/${caseId}/parties`);
      if (!response.ok) throw new Error("Failed to fetch parties");
      return response.json();
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: Partial<CaseTimelineEvent>) => {
      return await apiRequest("POST", `/api/cases/${caseId}/timeline`, eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "timeline"] });
      toast({ title: "Event created successfully" });
      setAddEventOpen(false);
      setNewEvent(INITIAL_EVENT_FORM);
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const handleEventTypeChange = (type: string) => {
    const isCorr = CORRESPONDENCE_TYPES.includes(type);
    setNewEvent(prev => ({
      ...prev,
      eventType: type,
      isCorrespondence: isCorr,
      correspondenceDirection: isCorr ? (type === "correspondence_received" ? "inbound" : "outbound") : "",
    }));
  };

  const handleCreateEvent = () => {
    if (!newEvent.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    const eventData: Partial<CaseTimelineEvent> = {
      eventType: newEvent.eventType,
      title: newEvent.title,
      summary: newEvent.summary,
      eventDate: new Date(newEvent.eventDate),
      importanceScore: newEvent.importanceScore,
      riskLevel: newEvent.riskLevel,
      isCorrespondence: newEvent.isCorrespondence,
    };

    if (newEvent.isCorrespondence) {
      if (newEvent.partyId) eventData.partyId = newEvent.partyId;
      if (newEvent.correspondenceDirection) eventData.correspondenceDirection = newEvent.correspondenceDirection;
      if (newEvent.correspondenceType) eventData.correspondenceType = newEvent.correspondenceType;
      if (newEvent.privilegeStatus) eventData.privilegeStatus = newEvent.privilegeStatus;
      if (newEvent.transmissionMethod) eventData.transmissionMethod = newEvent.transmissionMethod;
      if (newEvent.acknowledgmentStatus) eventData.acknowledgmentStatus = newEvent.acknowledgmentStatus;
    }

    createEventMutation.mutate(eventData);
  };

  const toggleExpanded = (eventId: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(eventId)) {
      newSet.delete(eventId);
    } else {
      newSet.add(eventId);
    }
    setExpandedRows(newSet);
  };

  const toggleKeyEvent = (event: CaseTimelineEvent) => {
    updateEventMutation.mutate({
      eventId: event.id,
      updates: { isKeyEvent: !event.isKeyEvent },
    });
  };

  const toggleHidden = (event: CaseTimelineEvent) => {
    updateEventMutation.mutate({
      eventId: event.id,
      updates: { isHidden: !event.isHidden },
    });
  };

  const toggleColumn = (column: ColumnKey) => {
    // Enforce mandatory columns (date, type, title)
    if (column === 'date' || column === 'type' || column === 'title') {
      toast({
        title: "Column Required",
        description: "This column cannot be hidden as it's essential for timeline context.",
        variant: "destructive",
      });
      return;
    }
    
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const selectAllColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
  };

  const resetColumnsToDefaults = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    toast({
      title: "Columns Reset",
      description: "Column visibility reset to default settings.",
    });
  };

  const handleExport = (format: 'csv' | 'pdf' | 'word') => {
    const params = new URLSearchParams();
    
    if (showHidden) {
      params.append('showHidden', 'true');
    }
    
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    
    if (filters.minImportance !== undefined && filters.minImportance !== 20) {
      params.append('minImportance', filters.minImportance.toString());
    }
    
    filters.eventTypes.forEach(type => params.append('eventTypes', type));
    
    // Include visible columns in export
    const visibleCols = Object.keys(visibleColumns)
      .filter(key => visibleColumns[key as ColumnKey])
      .join(',');
    if (visibleCols) {
      params.append('columns', visibleCols);
    }
    
    const url = `/api/cases/${caseId}/timeline/export/${format}?${params.toString()}`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `timeline-export-${Date.now()}.${format === 'word' ? 'docx' : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export started",
      description: `Downloading timeline as ${format.toUpperCase()}...`,
    });
  };

  const getImportanceBadgeVariant = (score: number): "default" | "destructive" | "secondary" | "outline" => {
    if (score >= 80) return "destructive";
    if (score >= 60) return "default";
    if (score >= 40) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline & Correspondence
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHidden(!showHidden)}
                data-testid="button-toggle-hidden"
              >
                {showHidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                {showHidden ? "Hide Hidden" : "Show Hidden"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-columns">
                    <Columns className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2 space-y-2">
                    <div className="flex items-center justify-between px-2 pb-2 border-b">
                      <span className="text-sm font-medium">Show Columns</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetColumnsToDefaults}
                        className="h-auto p-1 text-xs"
                        data-testid="button-reset-columns"
                      >
                        Reset
                      </Button>
                    </div>
                    {DEFAULT_COLUMN_DEFINITIONS.map((col) => (
                      <div key={col.key} className="flex items-center gap-2 px-2">
                        <Checkbox
                          id={`column-${col.key}`}
                          checked={visibleColumns[col.key]}
                          onCheckedChange={() => toggleColumn(col.key)}
                          disabled={col.mandatory}
                          data-testid={`checkbox-column-${col.key}`}
                        />
                        <Label
                          htmlFor={`column-${col.key}`}
                          className={`text-sm cursor-pointer ${col.mandatory ? 'text-muted-foreground' : ''}`}
                        >
                          {col.label}
                          {col.mandatory && <span className="text-xs ml-1">(required)</span>}
                        </Label>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllColumns}
                        className="w-full justify-start text-xs"
                        data-testid="button-select-all-columns"
                      >
                        Select All
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManageColumnsOpen(true)}
                data-testid="button-manage-columns"
              >
                <Columns className="h-4 w-4 mr-2" />
                Manage Columns
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-export">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleExport('csv')}
                    data-testid="export-csv"
                  >
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleExport('pdf')}
                    data-testid="export-pdf"
                  >
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleExport('word')}
                    data-testid="export-word"
                  >
                    Export as Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setAddEventOpen(true)} data-testid="button-add-event">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 p-4 border rounded-md space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="view-mode" className="text-xs">View</Label>
                <Select 
                  value={viewMode} 
                  onValueChange={(val: "all" | "timeline" | "correspondence") => setViewMode(val)}
                >
                  <SelectTrigger id="view-mode" data-testid="select-view-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entries</SelectItem>
                    <SelectItem value="timeline">Timeline Only</SelectItem>
                    <SelectItem value="correspondence">Correspondence Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date-from" className="text-xs">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  data-testid="input-date-from"
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="text-xs">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  data-testid="input-date-to"
                />
              </div>
              <div>
                <Label htmlFor="event-type" className="text-xs">Event Type</Label>
                <Select
                  value={filters.eventTypes[0] || "all"}
                  onValueChange={(value) => {
                    setFilters({ ...filters, eventTypes: value === "all" ? [] : [value] });
                  }}
                >
                  <SelectTrigger id="event-type" data-testid="select-event-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="email_thread">Email</SelectItem>
                    <SelectItem value="chat_thread">Chat</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="interview_extract">Interview</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="correspondence_received">Correspondence Received</SelectItem>
                    <SelectItem value="correspondence_sent">Correspondence Sent</SelectItem>
                    <SelectItem value="written_statement">Written Statement</SelectItem>
                    <SelectItem value="statement_request">Statement Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="min-importance" className="text-xs">Min Importance</Label>
                <Select
                  value={filters.minImportance.toString()}
                  onValueChange={(value) => setFilters({ ...filters, minImportance: parseInt(value) })}
                >
                  <SelectTrigger id="min-importance" data-testid="select-min-importance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All Events</SelectItem>
                    <SelectItem value="20">Normal (20+)</SelectItem>
                    <SelectItem value="50">Important (50+)</SelectItem>
                    <SelectItem value="80">Key Milestones (80+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({ dateFrom: "", dateTo: "", eventTypes: [], minImportance: 20 });
                    setViewMode("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Timeline Table */}
          {(() => {
            // Apply client-side filtering based on viewMode
            const filteredEvents = events.filter(event => {
              if (viewMode === "all") return true;
              if (viewMode === "correspondence") return event.isCorrespondence === true;
              if (viewMode === "timeline") return event.isCorrespondence !== true;
              return true;
            });

            if (isLoading) {
              return (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">Loading timeline...</p>
                </div>
              );
            }
            
            if (filteredEvents.length === 0) {
              return (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {viewMode === "correspondence" 
                      ? "No correspondence entries yet" 
                      : viewMode === "timeline" 
                        ? "No timeline events yet" 
                        : "No timeline events yet"}
                  </p>
                  <Button variant="outline" onClick={() => setAddEventOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {viewMode === "correspondence" ? "Add First Correspondence" : "Add First Event"}
                  </Button>
                </div>
              );
            }

            return (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1"></TableHead>
                    <TableHead className="w-12"></TableHead>
                    {DEFAULT_COLUMN_DEFINITIONS.map((col) =>
                      visibleColumns[col.key] ? (
                        <TableHead 
                          key={col.key}
                          className={col.key === 'risk' || col.key === 'importance' ? 'text-center' : ''}
                        >
                          {col.label}
                        </TableHead>
                      ) : null
                    )}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const isExpanded = expandedRows.has(event.id);
                    const EventIcon = EVENT_TYPE_ICONS[event.eventType] || FileText;
                    const riskColor = getRiskColor(event.riskLevel);
                    
                    return (
                      <>
                        <TableRow
                          key={event.id}
                          className="cursor-pointer hover-elevate"
                          onClick={() => toggleExpanded(event.id)}
                          data-testid={`timeline-event-${event.id}`}
                        >
                          <TableCell className="p-0 w-1">
                            <div className={`h-full w-1 ${riskColor.bgClass}`}></div>
                          </TableCell>
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          {visibleColumns.date && (
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(new Date(event.eventDate), "MMM d, yyyy")}
                            </TableCell>
                          )}
                          {visibleColumns.type && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <EventIcon className="h-4 w-4" />
                                <span className="text-sm">{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</span>
                                {event.isCorrespondence && event.privilegeStatus && event.privilegeStatus !== "none" && (
                                  <Badge variant="outline" className="text-xs">
                                    <Lock className="h-3 w-3 mr-1" />
                                    {PRIVILEGE_STATUS_LABELS[event.privilegeStatus]}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.title && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {event.isKeyEvent && <Star className="h-4 w-4 text-yellow-500" />}
                                <span className="font-medium text-sm">{event.title}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.participants && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {event.participants?.slice(0, 2).map((p, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {p}
                                  </Badge>
                                ))}
                                {event.participants && event.participants.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{event.participants.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.tags && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {event.lawTags?.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {event.lawTags && event.lawTags.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{event.lawTags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.risk && (
                            <TableCell className="text-center">
                              <span className="text-xs font-medium text-muted-foreground">
                                {riskColor.label}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.importance && (
                            <TableCell className="text-center">
                              <Badge variant={getImportanceBadgeVariant(event.importanceScore || 50)} className="text-xs">
                                {event.importanceScore || 50}
                              </Badge>
                            </TableCell>
                          )}
                          {visibleColumns.userNotes && (
                            <TableCell className="min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={event.notes || ""}
                                onChange={(e) => {
                                  updateEventMutation.mutate({
                                    eventId: event.id,
                                    updates: { notes: e.target.value },
                                  });
                                }}
                                placeholder="Add notes..."
                                className="h-8 text-xs"
                                data-testid={`input-notes-${event.id}`}
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleKeyEvent(event)}
                                data-testid={`button-star-${event.id}`}
                                aria-label={event.isKeyEvent ? "Unmark as key event" : "Mark as key event"}
                              >
                                <Star className={`h-4 w-4 ${event.isKeyEvent ? "fill-yellow-500 text-yellow-500" : ""}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleHidden(event)}
                                data-testid={`button-hide-${event.id}`}
                                aria-label={event.isHidden ? "Unhide event" : "Hide event"}
                              >
                                {event.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={2 + Object.values(visibleColumns).filter(Boolean).length} className="bg-muted/30">
                              <div className="p-4 space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Summary</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {event.summary || event.description || "No summary available"}
                                  </p>
                                </div>
                                
                                {/* Risk Level Editor */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor={`risk-level-${event.id}`} className="text-sm font-semibold mb-2">
                                      Risk Level
                                    </Label>
                                    <Select
                                      value={event.riskLevel || "neutral"}
                                      onValueChange={(value: RiskLevel) => {
                                        updateEventMutation.mutate({
                                          eventId: event.id,
                                          updates: { riskLevel: value },
                                        });
                                      }}
                                    >
                                      <SelectTrigger id={`risk-level-${event.id}`} className="mt-1" data-testid={`select-risk-level-${event.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent position="popper">
                                        <SelectItem value="neutral">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                            <span>Neutral</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="cleared">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span>Cleared</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="medium">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                            <span>Medium Risk</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="critical">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                            <span>Critical</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`risk-reason-${event.id}`} className="text-sm font-semibold mb-2">
                                      Risk Reason
                                    </Label>
                                    <Textarea
                                      id={`risk-reason-${event.id}`}
                                      value={event.riskReason || ""}
                                      onChange={(e) => {
                                        updateEventMutation.mutate({
                                          eventId: event.id,
                                          updates: { riskReason: e.target.value },
                                        });
                                      }}
                                      placeholder="Explain the risk assessment..."
                                      className="mt-1 text-sm"
                                      rows={3}
                                      data-testid={`input-risk-reason-${event.id}`}
                                    />
                                  </div>
                                </div>
                                
                                {/* Correspondence-specific details */}
                                {event.isCorrespondence && (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded-md">
                                    {event.privilegeStatus && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Privilege Status</Label>
                                        <div className="flex items-center gap-1 mt-1">
                                          {event.privilegeStatus !== "none" && <Lock className="h-3 w-3" />}
                                          <Badge variant={event.privilegeStatus !== "none" ? "default" : "outline"} className="text-xs">
                                            {PRIVILEGE_STATUS_LABELS[event.privilegeStatus] || event.privilegeStatus}
                                          </Badge>
                                        </div>
                                      </div>
                                    )}
                                    {event.correspondenceType && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Type</Label>
                                        <p className="text-sm mt-1 capitalize">{event.correspondenceType.replace(/_/g, " ")}</p>
                                      </div>
                                    )}
                                    {event.transmissionMethod && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Transmission Method</Label>
                                        <p className="text-sm mt-1 capitalize">{event.transmissionMethod.replace(/_/g, " ")}</p>
                                      </div>
                                    )}
                                    {event.acknowledgmentStatus && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Acknowledgment</Label>
                                        <div className="flex items-center gap-1 mt-1">
                                          {(() => {
                                            const AckIcon = ACKNOWLEDGMENT_STATUS_ICONS[event.acknowledgmentStatus] || Clock;
                                            return <AckIcon className={`h-3 w-3 ${event.acknowledgmentStatus === "acknowledged" ? "text-green-500" : event.acknowledgmentStatus === "declined" ? "text-red-500" : "text-yellow-500"}`} />;
                                          })()}
                                          <span className="text-sm capitalize">{event.acknowledgmentStatus.replace(/_/g, " ")}</span>
                                          {event.acknowledgmentDate && (
                                            <span className="text-xs text-muted-foreground ml-1">
                                              ({format(new Date(event.acknowledgmentDate), "MMM d, yyyy")})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(event.sourceDocumentIds && event.sourceDocumentIds.length > 0) && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">Source Documents</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {event.sourceDocumentIds.map((docId, idx) => (
                                        <Badge key={idx} variant="outline">
                                          Doc: {docId.slice(0, 8)}...
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {(event.attachmentIds && event.attachmentIds.length > 0) && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">Attachments</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {event.attachmentIds.map((attachId, idx) => (
                                        <Badge key={idx} variant="secondary">
                                          <FileText className="h-3 w-3 mr-1" />
                                          Attachment {idx + 1}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" data-testid={`button-edit-${event.id}`}>
                                    Edit Event
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm("Delete this event?")) {
                                        deleteEventMutation.mutate(event.id);
                                      }
                                    }}
                                    data-testid={`button-delete-${event.id}`}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Add Event / Correspondence Dialog */}
      <Dialog open={addEventOpen} onOpenChange={(open) => {
        setAddEventOpen(open);
        if (!open) setNewEvent(INITIAL_EVENT_FORM);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {newEvent.isCorrespondence ? "Add Correspondence" : "Add Timeline Event"}
            </DialogTitle>
            <DialogDescription>
              {newEvent.isCorrespondence 
                ? "Record investigation correspondence such as document transmissions, requests, or written statements"
                : "Create a new event in the case timeline"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Event Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-type-select">Type</Label>
                <Select value={newEvent.eventType} onValueChange={handleEventTypeChange}>
                  <SelectTrigger id="event-type-select" data-testid="select-new-event-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Event</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="correspondence_received">Correspondence Received</SelectItem>
                    <SelectItem value="correspondence_sent">Correspondence Sent</SelectItem>
                    <SelectItem value="written_statement">Written Statement</SelectItem>
                    <SelectItem value="statement_request">Statement Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={newEvent.eventDate}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, eventDate: e.target.value }))}
                  data-testid="input-new-event-date"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title..."
                data-testid="input-new-event-title"
              />
            </div>

            {/* Summary */}
            <div>
              <Label htmlFor="event-summary">Summary</Label>
              <Textarea
                id="event-summary"
                value={newEvent.summary}
                onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Describe the event..."
                rows={3}
                data-testid="textarea-new-event-summary"
              />
            </div>

            {/* Correspondence-specific fields */}
            {newEvent.isCorrespondence && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">Correspondence Details</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Party Selector */}
                  <div>
                    <Label htmlFor="party-select">Related Party</Label>
                    <Select 
                      value={newEvent.partyId} 
                      onValueChange={(val) => setNewEvent(prev => ({ ...prev, partyId: val }))}
                    >
                      <SelectTrigger id="party-select" data-testid="select-correspondence-party">
                        <SelectValue placeholder="Select party..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No party selected</SelectItem>
                        {parties.map(party => (
                          <SelectItem key={party.id} value={party.id}>
                            {party.name} ({party.caseRole})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Correspondence Type */}
                  <div>
                    <Label htmlFor="corr-type">Correspondence Type</Label>
                    <Select 
                      value={newEvent.correspondenceType} 
                      onValueChange={(val) => setNewEvent(prev => ({ ...prev, correspondenceType: val }))}
                    >
                      <SelectTrigger id="corr-type" data-testid="select-correspondence-type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document_request">Document Request</SelectItem>
                        <SelectItem value="document_submission">Document Submission</SelectItem>
                        <SelectItem value="written_statement">Written Statement</SelectItem>
                        <SelectItem value="statement_request">Statement Request</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Privilege Status */}
                  <div>
                    <Label htmlFor="privilege-status">Privilege Status</Label>
                    <Select 
                      value={newEvent.privilegeStatus} 
                      onValueChange={(val) => setNewEvent(prev => ({ ...prev, privilegeStatus: val }))}
                    >
                      <SelectTrigger id="privilege-status" data-testid="select-privilege-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Privilege</SelectItem>
                        <SelectItem value="attorney_client">Attorney-Client</SelectItem>
                        <SelectItem value="work_product">Work Product</SelectItem>
                        <SelectItem value="confidential">Confidential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Transmission Method */}
                  <div>
                    <Label htmlFor="transmission-method">Transmission Method</Label>
                    <Select 
                      value={newEvent.transmissionMethod} 
                      onValueChange={(val) => setNewEvent(prev => ({ ...prev, transmissionMethod: val }))}
                    >
                      <SelectTrigger id="transmission-method" data-testid="select-transmission-method">
                        <SelectValue placeholder="Select method..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="mail">Mail</SelectItem>
                        <SelectItem value="hand_delivery">Hand Delivery</SelectItem>
                        <SelectItem value="secure_portal">Secure Portal</SelectItem>
                        <SelectItem value="in_person">In Person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Acknowledgment Status */}
                  <div>
                    <Label htmlFor="ack-status">Acknowledgment Status</Label>
                    <Select 
                      value={newEvent.acknowledgmentStatus} 
                      onValueChange={(val) => setNewEvent(prev => ({ ...prev, acknowledgmentStatus: val }))}
                    >
                      <SelectTrigger id="ack-status" data-testid="select-acknowledgment-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_required">Not Required</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Importance and Risk */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="importance-score">Importance (0-100)</Label>
                <Input
                  id="importance-score"
                  type="number"
                  min={0}
                  max={100}
                  value={newEvent.importanceScore}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, importanceScore: parseInt(e.target.value) || 50 }))}
                  data-testid="input-importance-score"
                />
              </div>
              <div>
                <Label htmlFor="risk-level">Risk Level</Label>
                <Select 
                  value={newEvent.riskLevel} 
                  onValueChange={(val: RiskLevel) => setNewEvent(prev => ({ ...prev, riskLevel: val }))}
                >
                  <SelectTrigger id="risk-level" data-testid="select-risk-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEventOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateEvent} 
              disabled={createEventMutation.isPending}
              data-testid="button-create-event"
            >
              {createEventMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageColumnsDialog
        caseId={caseId}
        open={manageColumnsOpen}
        onOpenChange={setManageColumnsOpen}
      />
    </div>
  );
}
