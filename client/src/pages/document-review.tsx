import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentCoding } from "@/components/document-coding";
import { DocumentListView } from "@/components/document-list-view";
import { HighlightedText } from "@/components/highlighted-text";
import { DocumentHighlighter } from "@/components/document-highlighter";
import { ExhibitViewer } from "@/components/exhibit-viewer";
import { DocumentExportDialog } from "@/components/document-export-dialog";
import { ComplianceScoreCard } from "@/components/compliance-score-card";
import { DocumentAttachments } from "@/components/document-attachments";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DocumentToolsSidebar } from "@/components/document-tools-sidebar";
import { BulkTagModal } from "@/components/bulk-tag-modal";
import { BulkRemoveTagModal } from "@/components/bulk-remove-tag-modal";
import { TagUsageReport } from "@/components/tag-usage-report";
import { AdvancedSearchPanel } from "@/components/advanced-search-panel";
import { SearchWithAutocomplete } from "@/components/search-with-autocomplete";
import { DateRangeFilter } from "@/components/date-range-filter";
import { SavedSearchesManager } from "@/components/saved-searches-manager";
import { ShareDocumentDialog } from "@/components/share-document-dialog";
import { AddToTimelineDialog } from "@/components/add-to-timeline-dialog";
import { CaseAIAssistant } from "@/components/case-detail/case-ai-assistant";
import { NotificationBell } from "@/components/notification-bell";
import { useAdvancedFilters } from "@/hooks/use-advanced-filters";
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Tag, 
  MessageSquare,
  Eye,
  EyeOff,
  Users,
  Clock,
  Save,
  Shield,
  Filter,
  X,
  Menu,
  Search,
  FolderPlus,
  FolderMinus,
  Folder,
  List,
  FileDown,
  Maximize2,
  ChevronLeftCircle,
  ChevronRightCircle,
  Languages,
  Type,
  Check,
  MoreVertical,
  Printer,
  Share2,
  Download,
  Briefcase,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  CalendarPlus,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
// ToggleGroup removed - search mode is auto-detected
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

type Communication = {
  id: string;
  communicationType: string;
  subject: string;
  body: string;
  sender: string;
  recipients: string[];
  timestamp: string;
  legalHold: string | null;
  emailThreadId: string | null;
  custodianName?: string | null;
  custodianDepartment?: string | null;
  fileSize?: number | null;
  wordCount?: number | null;
  language?: string | null;
  fileExtension?: string | null;
  mimeType?: string | null;
  filePath?: string | null;
  metadata?: any;
  createdAt?: string | null;
  updatedAt?: string | null;
  isTranslated?: boolean;
  translatedBody?: string;
  translatedSubject?: string;
  originalLanguage?: string;
  attachmentIds?: string[];
  attachmentCount?: number;
};

type DataRoomDocument = {
  id: string;
  dataRoomId: string;
  folderId: string | null;
  fileName: string;
  fileSize: number | null;
  fileType: string | null;
  storagePath: string | null;
  documentNumber: string | null;
  description: string | null;
  tags: string[] | null;
  documentCategory: string | null;
  extractedText: string | null;
  aiSummary: string | null;
  comprehensiveSummary: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  name: string;
};

function dataRoomDocToCommunication(doc: DataRoomDocument): Communication {
  const ext = doc.fileName?.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };
  return {
    id: doc.id,
    communicationType: 'document',
    subject: doc.fileName || doc.name || 'Untitled Document',
    body: doc.extractedText || doc.comprehensiveSummary || doc.aiSummary || doc.description || '',
    sender: doc.documentCategory || 'Data Room',
    recipients: [],
    timestamp: doc.createdAt || new Date().toISOString(),
    legalHold: null,
    emailThreadId: null,
    fileSize: doc.fileSize,
    fileExtension: ext || null,
    mimeType: mimeMap[ext] || doc.fileType || null,
    filePath: doc.storagePath || null,
    metadata: {
      isDataRoomDocument: true,
      dataRoomId: doc.dataRoomId,
      folderId: doc.folderId,
      documentNumber: doc.documentNumber,
      documentCategory: doc.documentCategory,
      tags: doc.tags,
    },
  };
}

function dataLakeItemToCommunication(item: any): Communication {
  const meta = item.metadata || {};
  return {
    id: item.id,
    communicationType: 'email',
    subject: meta.subject || item.name || '(No Subject)',
    body: meta.bodyHtml || meta.bodyText || meta.bodyPreview || '',
    sender: meta.sender || 'Unknown',
    recipients: meta.recipients || [],
    timestamp: meta.date || item.indexedAt || new Date().toISOString(),
    legalHold: null,
    emailThreadId: null,
    fileSize: item.fileSize,
    fileExtension: null,
    mimeType: 'message/rfc822',
    filePath: null,
    metadata: {
      isDataLakeItem: true,
      dataLakeItemId: item.id,
      parentItemId: meta.parentItemId,
      parentFileName: meta.parentFileName,
      cc: meta.cc,
      senderAddress: meta.senderAddress,
      hasAttachments: meta.hasAttachments,
      attachments: meta.attachments,
      folderPath: meta.folderPath,
      messageId: meta.messageId,
      importance: meta.importance,
    },
  };
}

function isImageMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

function isVideoMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('video/');
}

function isMediaFile(doc: Communication): boolean {
  return isImageMimeType(doc.mimeType) || isVideoMimeType(doc.mimeType) || 
         doc.metadata?.isMediaFile === true;
}

function getMediaUrl(filePath: string): string {
  if (filePath.startsWith('/objects/') || filePath.startsWith('http')) {
    return filePath;
  }
  return `/objects/${filePath}`;
}

function MediaViewer({ doc }: { doc: Communication }) {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  if (!doc.filePath) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-16 w-16 mb-4" />
        <p className="text-sm">Media file path not available</p>
      </div>
    );
  }
  
  const mediaUrl = getMediaUrl(doc.filePath);
  
  if (isImageMimeType(doc.mimeType) || doc.metadata?.mediaType === 'image') {
    return (
      <div className="flex flex-col items-center p-4">
        {imageError ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mb-4" />
            <p className="text-sm">Unable to load image</p>
            <a 
              href={mediaUrl} 
              download 
              className="mt-2 text-primary hover:underline text-sm"
            >
              Download file
            </a>
          </div>
        ) : (
          <img 
            src={mediaUrl}
            alt={doc.subject || 'Image'}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
            onError={() => setImageError(true)}
            data-testid="media-image-viewer"
          />
        )}
      </div>
    );
  }
  
  if (isVideoMimeType(doc.mimeType) || doc.metadata?.mediaType === 'video') {
    return (
      <div className="flex flex-col items-center p-4">
        {videoError ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mb-4" />
            <p className="text-sm">Unable to load video</p>
            <a 
              href={mediaUrl} 
              download 
              className="mt-2 text-primary hover:underline text-sm"
            >
              Download file
            </a>
          </div>
        ) : (
          <video 
            src={mediaUrl}
            controls
            className="max-w-full max-h-[70vh] rounded-lg shadow-md"
            onError={() => setVideoError(true)}
            data-testid="media-video-viewer"
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    );
  }
  
  return null;
}

type FontSize = "small" | "medium" | "large" | "extra-large";

const fontSizeClasses: Record<FontSize, string> = {
  "small": "text-sm",
  "medium": "text-base",
  "large": "text-lg",
  "extra-large": "text-xl",
};

const fontSizeLabels: Record<FontSize, string> = {
  "small": "Small",
  "medium": "Medium",
  "large": "Large",
  "extra-large": "Extra Large",
};

// Common compliance keywords from regulations (matching HighlightedText component)
const DEFAULT_COMPLIANCE_KEYWORDS = [
  // FCPA keywords
  'bribe', 'bribery', 'kickback', 'payment', 'facilitation', 'foreign official',
  'corrupt', 'inducement', 'quid pro quo',
  // Antitrust keywords
  'price fixing', 'price-fixing', 'bid rigging', 'market allocation', 'collusion',
  'cartel', 'competitor', 'boycott', 'exclusive dealing',
  // SOX keywords
  'revenue recognition', 'financial statements', 'internal controls', 'audit',
  'material misstatement', 'earnings', 'accounting', 'SEC filing',
  // Insider trading
  'material non-public', 'MNPI', 'insider', 'trading', 'stock price',
  'confidential', 'acquisition', 'merger',
  // General compliance
  'violation', 'illegal', 'sanction', 'prohibited', 'restricted',
  'compliance', 'regulatory', 'unauthorized',
];

// Utility function to highlight search terms and compliance keywords in HTML content
function highlightHtmlContent(html: string, searchTerms: string[]): string {
  if (!html) return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Combine search terms and compliance keywords
    const allKeywords = [...searchTerms, ...DEFAULT_COMPLIANCE_KEYWORDS];
    
    if (allKeywords.length === 0) return html;
    
    // Create regex pattern for all keywords (case-insensitive word boundaries)
    const pattern = allKeywords
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special chars
      .join('|');
    
    const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
    
    // Walk through all text nodes and highlight matches (use doc.createTreeWalker, not document)
    const walker = doc.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }
    
    // Process text nodes in reverse to avoid DOM position issues
    textNodes.reverse().forEach((textNode) => {
      const text = textNode.textContent || '';
      const matches: Array<{ index: number; length: number; text: string; isSearch: boolean }> = [];
      let match;
      
      // Reset regex lastIndex
      regex.lastIndex = 0;
      
      // Find all matches
      while ((match = regex.exec(text)) !== null) {
        const matchedText = match[0];
        const isSearchTerm = searchTerms.some(
          term => matchedText.toLowerCase() === term.toLowerCase()
        );
        
        matches.push({
          index: match.index,
          length: matchedText.length,
          text: matchedText,
          isSearch: isSearchTerm,
        });
      }
      
      if (matches.length === 0) return;
      
      // Create document fragment with highlighted text (use doc, not document)
      const fragment = doc.createDocumentFragment();
      let lastIndex = 0;
      
      matches.forEach((m) => {
        // Add text before match
        if (m.index > lastIndex) {
          fragment.appendChild(
            doc.createTextNode(text.slice(lastIndex, m.index))
          );
        }
        
        // Add highlighted match with different colors for search vs compliance
        const mark = doc.createElement('mark');
        mark.className = m.isSearch
          ? 'bg-yellow-200 dark:bg-yellow-700/50 text-yellow-900 dark:text-yellow-100 font-medium px-0.5 rounded'
          : 'bg-orange-100 dark:bg-orange-800/40 text-orange-900 dark:text-orange-200 px-0.5 rounded';
        mark.textContent = m.text;
        fragment.appendChild(mark);
        
        lastIndex = m.index + m.length;
      });
      
      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(doc.createTextNode(text.slice(lastIndex)));
      }
      
      // Replace text node with fragment
      textNode.parentNode?.replaceChild(fragment, textNode);
    });
    
    return doc.body.innerHTML;
  } catch (error) {
    console.error('Error highlighting HTML content:', error);
    // Return original HTML if highlighting fails
    return html;
  }
}

type ActiveSidebar = 'none' | 'nav' | 'tools';

interface DocumentReviewPageProps {
  routeParams?: { caseId?: string };
}

export default function DocumentReviewPage({ routeParams }: DocumentReviewPageProps) {
  const params = useParams<{ id?: string; caseId?: string }>();
  const commId = params.id || "";
  // Get caseId from either routeParams (passed from wouter Route) or useParams (for legacy routes)
  const pathCaseId = routeParams?.caseId || params.caseId; // caseId from URL path /cases/:caseId/document-review
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Sidebar state
  const [activeSidebar, setActiveSidebar] = useState<ActiveSidebar>('none');
  
  // Ensure sidebar is collapsed on mount
  useEffect(() => {
    setActiveSidebar('none');
  }, []);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [annotation, setAnnotation] = useState("");
  const [showMetadata, setShowMetadata] = useState(true);
  const [privilegeDialogOpen, setPrivilegeDialogOpen] = useState(false);
  const [privilegeData, setPrivilegeData] = useState({
    privilegeStatus: "attorney_client_privileged",
    privilegeBasis: "counsel_directed_investigation",
    privilegeNotes: "",
  });
  
  // Filter state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  
  // Quick filter state - initialize from URL params if present
  const [quickFilterSender, setQuickFilterSender] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('sender');
    }
    return null;
  });
  const [quickFilterRecipient, setQuickFilterRecipient] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('recipient');
    }
    return null;
  });
  const [quickFilterDate, setQuickFilterDate] = useState<string | null>(null);
  
  // Participants filter from URL (for click-through from Parties & Custodians)
  const [urlParticipants, setUrlParticipants] = useState<string[]>([]);
  
  // Domain filter from URL (for click-through from Organizations section)
  const [urlDomain, setUrlDomain] = useState<string[]>([]);
  
  // Search query filter from URL (for click-through from Mentioned in Documents)
  const [urlQuery, setUrlQuery] = useState<string>('');
  
  // Sync URL-based filters when location changes (for navigation and browser back/forward)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      // Parse participants filter
      const participants = params.get('participants');
      setUrlParticipants(participants ? participants.split(',').filter(p => p.trim()) : []);
      
      // Parse domain filter
      const domain = params.get('domain');
      setUrlDomain(domain ? domain.split(',').filter(d => d.trim()) : []);
      
      // Parse query filter
      setUrlQuery(params.get('query') || '');
      
      // Reset current index when filters change
      setCurrentIndex(0);
    }
  }, [location]); // Re-run when location changes
  
  // Advanced filters hook
  const advancedFilters = useAdvancedFilters();
  
  // Document set management
  const [addToSetDialogOpen, setAddToSetDialogOpen] = useState(false);
  const [removeFromSetDialogOpen, setRemoveFromSetDialogOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Communication[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Auto-detect search mode based on query content
  const detectSearchMode = (query: string): 'boolean' | 'natural' => {
    const trimmed = query.trim();
    // Check for boolean operators (as whole words, case-insensitive)
    const booleanPattern = /\b(AND|OR|NOT)\b/i;
    // Check for quotes (exact phrase)
    const quotesPattern = /"[^"]+"/;
    // Check for parentheses (grouping)
    const parensPattern = /\(.*\)/;
    // Check for wildcards (* or ?)
    const wildcardPattern = /[*?]/;
    
    if (booleanPattern.test(trimmed) || 
        quotesPattern.test(trimmed) || 
        parensPattern.test(trimmed) || 
        wildcardPattern.test(trimmed)) {
      return 'boolean';
    }
    return 'natural';
  };
  
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'document'>('document');
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sentinel_advanced_search_expanded');
      return stored === 'true';
    }
    return false;
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedExportDocs, setSelectedExportDocs] = useState<string[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [emmaOpen, setEmmaOpen] = useState(false);
  
  // Bulk tagging state
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [bulkRemoveTagModalOpen, setBulkRemoveTagModalOpen] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  
  // Document Coding panel state
  const [codingPanelCollapsed, setCodingPanelCollapsed] = useState(false);
  
  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{ subject: string; body: string } | null>(null);
  
  // Font size state with localStorage persistence
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  
  // Sort order state for date sorting (newest first = desc, oldest first = asc)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Ref for content scroll area to reset scroll position
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Clear bad persisted layouts and load font size preference on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        console.log('[Document Review] Initializing viewer, clearing bad persisted state...');
        
        // Clear ALL ResizablePanel related state to force fresh layout
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('react-resizable-panels') || key.includes('radix-ui:tabs'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          console.log(`[Document Review] Removing persisted state: ${key}`);
          localStorage.removeItem(key);
        });
        
        // Load font size preference
        const saved = localStorage.getItem("documentViewerFontSize");
        if (saved && (saved === "small" || saved === "medium" || saved === "large" || saved === "extra-large")) {
          setFontSize(saved as FontSize);
        }
      }
    } catch (error) {
      console.error("[Document Review] Failed to initialize viewer preferences:", error);
    }
  }, []);

  // Save font size preference to localStorage when it changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem("documentViewerFontSize", fontSize);
      }
    } catch (error) {
      console.error("Failed to save font size preference:", error);
    }
  }, [fontSize]);
  
  // Parse setId and caseId from URL query params - must use window.location.search, not wouter's location
  // Wouter's location only returns the pathname, not the query string
  const urlSearchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const queryCaseId = urlSearchParams.get('caseId');
  const urlDocId = urlSearchParams.get('id');
  
  // Resolve caseId: prefer path param (/cases/:caseId/document-review) over query param (?caseId=xxx)
  const effectiveCaseId = pathCaseId || queryCaseId;
  
  useEffect(() => {
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const setId = searchParams.get('setId');
    if (setId) {
      setSelectedSetId(setId);
    }
  }, [location]); // Still depend on location to re-run when navigation happens
  
  // Build comprehensive query params from all filters
  const queryParams = new URLSearchParams();
  
  // Legacy filters (for compatibility)
  selectedEmployees.forEach(emp => queryParams.append("employees", emp));
  selectedDepartments.forEach(dept => queryParams.append("departments", dept));
  
  // Quick filters (take precedence if set)
  if (quickFilterSender) {
    queryParams.append("sender", quickFilterSender);
  }
  if (quickFilterRecipient) {
    queryParams.append("recipient", quickFilterRecipient);
  }
  if (quickFilterDate) {
    queryParams.append("date", quickFilterDate);
  }

  // Advanced date range filters with normalization
  if (advancedFilters.filters.dateSentFrom) {
    const fromDate = new Date(advancedFilters.filters.dateSentFrom);
    fromDate.setHours(0, 0, 0, 0);
    queryParams.append("dateFrom", fromDate.toISOString());
  }
  if (advancedFilters.filters.dateSentTo) {
    const toDate = new Date(advancedFilters.filters.dateSentTo);
    toDate.setHours(23, 59, 59, 999);
    queryParams.append("dateTo", toDate.toISOString());
  }
  
  // People filters (from advanced filters)
  advancedFilters.filters.from?.forEach(sender => queryParams.append("from", sender));
  advancedFilters.filters.to?.forEach(recipient => queryParams.append("to", recipient));
  advancedFilters.filters.participants?.forEach(p => queryParams.append("participants", p));
  advancedFilters.filters.excludePeople?.forEach(p => queryParams.append("excludePeople", p));
  
  // URL-based participants filter (from Parties & Custodians click-through)
  if (urlParticipants.length > 0) {
    urlParticipants.forEach(p => queryParams.append("participants", p));
  }
  
  // URL-based domain filter (from Organizations click-through)
  if (urlDomain.length > 0) {
    urlDomain.forEach(d => queryParams.append("domain", d));
  }
  
  // Content filters - check URL query first, then advanced filters
  const effectiveQuery = urlQuery || advancedFilters.filters.query;
  if (effectiveQuery) {
    queryParams.append("query", effectiveQuery);
  }
  if (advancedFilters.filters.queryMode) {
    queryParams.append("queryMode", advancedFilters.filters.queryMode);
  }
  
  // Communication type filter
  advancedFilters.filters.communicationType?.forEach(type => queryParams.append("communicationType", type));
  
  // Attachment filters
  if (advancedFilters.filters.hasAttachments !== undefined) {
    queryParams.append("hasAttachments", String(advancedFilters.filters.hasAttachments));
  }
  advancedFilters.filters.attachmentTypes?.forEach(type => queryParams.append("attachmentTypes", type));
  
  // Classification filters
  advancedFilters.filters.tags?.forEach(tag => queryParams.append("tags", tag));
  
  // Review workflow filters
  advancedFilters.filters.reviewStatus?.forEach(status => queryParams.append("reviewStatus", status));
  advancedFilters.filters.assignedReviewer?.forEach(reviewer => queryParams.append("assignedReviewer", reviewer));
  
  // Case-scoped filtering - CRITICAL: Filter documents by selected case
  if (effectiveCaseId) {
    queryParams.append("caseId", effectiveCaseId);
  }
  
  const queryString = queryParams.toString();

  // Fetch documents from a specific set if selectedSetId is provided
  const { data: setDocuments, isLoading: isLoadingSetDocuments } = useQuery<Communication[]>({
    queryKey: [`/api/document-sets/${selectedSetId}/documents`],
    enabled: !!selectedSetId && !searchResults,
  });

  const { data: communications, isLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications", queryString],
    queryFn: async () => {
      const url = queryString ? `/api/communications?${queryString}` : "/api/communications";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communications");
      return response.json();
    },
    enabled: !searchResults && !selectedSetId, // Only fetch if not showing search results and not filtering by set
  });

  const { data: dataRoomDocs, isLoading: isLoadingDataRoomDocs } = useQuery<DataRoomDocument[]>({
    queryKey: ["/api/deals", effectiveCaseId, "documents"],
    queryFn: async () => {
      const response = await fetch(`/api/deals/${effectiveCaseId}/documents`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!effectiveCaseId && !searchResults && !selectedSetId,
  });

  const { data: dataLakeParentItem } = useQuery<any>({
    queryKey: ["/api/data-lake/items", effectiveCaseId],
    queryFn: async () => {
      const response = await fetch(`/api/data-lake/items/${effectiveCaseId}`, { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!effectiveCaseId && !searchResults && !selectedSetId,
  });

  const isDataLakeSource = !!dataLakeParentItem && (dataLakeParentItem.itemType === 'email_archive' || dataLakeParentItem.itemType === 'email');

  const { data: dataLakeChildren, isLoading: isLoadingDataLakeChildren } = useQuery<any[]>({
    queryKey: ["/api/data-lake/items", effectiveCaseId, "children"],
    queryFn: async () => {
      const response = await fetch(`/api/data-lake/items/${effectiveCaseId}/children`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isDataLakeSource && dataLakeParentItem?.itemType === 'email_archive',
  });

  const dataLakeAsCommunications = useMemo(() => {
    if (isDataLakeSource && dataLakeParentItem?.itemType === 'email') {
      return [dataLakeItemToCommunication(dataLakeParentItem)];
    }
    if (!dataLakeChildren || dataLakeChildren.length === 0) return [];
    return dataLakeChildren.map(dataLakeItemToCommunication);
  }, [dataLakeChildren, dataLakeParentItem, isDataLakeSource]);

  // Fetch available document sets
  const { data: documentSets = [] } = useQuery<any[]>({
    queryKey: ["/api/document-sets"],
  });
  
  // Fetch all document codings for review status
  const { data: allDocumentCodings = [] } = useQuery<any[]>({
    queryKey: ["/api/document-codings"],
  });
  
  // Create a map of document ID to coding for quick lookup
  const documentCodingsMap = allDocumentCodings.reduce((acc: Record<string, any>, coding: any) => {
    acc[coding.documentId] = coding;
    return acc;
  }, {});
  
  const dataRoomAsCommunications = useMemo(() => {
    if (!dataRoomDocs || dataRoomDocs.length === 0) return [];
    return dataRoomDocs.map(dataRoomDocToCommunication);
  }, [dataRoomDocs]);

  const mergedCommunications = useMemo(() => {
    if (communications === undefined && dataRoomAsCommunications.length === 0 && dataLakeAsCommunications.length === 0) return undefined;
    const comms = communications || [];
    const allExtras = [...dataRoomAsCommunications, ...dataLakeAsCommunications];
    if (allExtras.length === 0) return comms;
    const existingIds = new Set(comms.map(c => c.id));
    const unique = allExtras.filter(d => !existingIds.has(d.id));
    return [...unique, ...comms];
  }, [communications, dataRoomAsCommunications, dataLakeAsCommunications]);

  // Use search results if available, otherwise use set documents or merged data
  const unsortedCommunications = searchResults ?? setDocuments ?? mergedCommunications;
  
  // Apply sort order to displayed communications
  const displayedCommunications = useMemo(() => {
    if (!unsortedCommunications) return undefined;
    return [...unsortedCommunications].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [unsortedCommunications, sortOrder]);

  const currentDoc = displayedCommunications?.[currentIndex];
  
  // Build attachments map for inline media rendering in chat transcripts
  const attachmentsMap = useMemo(() => {
    if (!displayedCommunications) return new Map<string, { filePath: string; mimeType: string }>();
    
    const map = new Map<string, { filePath: string; mimeType: string }>();
    
    displayedCommunications.forEach(doc => {
      const mimeType = doc.mimeType || doc.metadata?.mimeType;
      const filePath = doc.filePath || doc.metadata?.filePath;
      
      if (filePath && mimeType && (mimeType.startsWith('image/') || mimeType.startsWith('video/'))) {
        // Subject format is "Image: filename.jpg" or "Video: filename.mp4"
        // Extract just the filename after the prefix
        const subject = doc.subject || '';
        let fileName = subject;
        
        // Remove "Image: " or "Video: " prefix if present
        if (subject.startsWith('Image: ')) {
          fileName = subject.substring(7);
        } else if (subject.startsWith('Video: ')) {
          fileName = subject.substring(7);
        }
        
        if (fileName) {
          const normalizedPath = filePath.startsWith('/objects/') ? filePath : `/objects/${filePath}`;
          map.set(fileName, { filePath: normalizedPath, mimeType });
        }
      }
    });
    
    return map;
  }, [displayedCommunications]);
  
  // Reset scroll position and log diagnostics when currentDoc changes
  useEffect(() => {
    if (currentDoc) {
      console.log('[Document Review] Current document:', {
        id: currentDoc.id,
        subject: currentDoc.subject?.substring(0, 50),
        hasBody: !!currentDoc.body,
        bodyLength: currentDoc.body?.length
      });
      
      // Log viewer dimensions for debugging
      setTimeout(() => {
        const viewer = document.querySelector('[data-testid="text-doc-body"]');
        const container = document.querySelector('[data-state="active"][data-orientation="horizontal"]');
        
        if (viewer) {
          const rect = viewer.getBoundingClientRect();
          console.log('[Document Review] Viewer dimensions:', {
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0,
            parent: viewer.parentElement?.getBoundingClientRect()
          });
        } else {
          console.warn('[Document Review] Document body element not found in DOM');
        }
        
        if (container) {
          const containerRect = container.getBoundingClientRect();
          console.log('[Document Review] TabsContent container:', {
            width: containerRect.width,
            height: containerRect.height,
            display: window.getComputedStyle(container).display,
            visibility: window.getComputedStyle(container).visibility
          });
        }
      }, 100);
      
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTop = 0;
        // Force a layout recalculation to ensure the scroll reset takes effect
        contentScrollRef.current.offsetHeight;
      }
    }
  }, [currentDoc?.id]); // Use currentDoc?.id as dependency to trigger on document change
  
  // Handle document ID from URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const docId = searchParams.get('id');
    if (docId && displayedCommunications && displayedCommunications.length > 0) {
      const docIndex = displayedCommunications.findIndex(doc => doc.id === docId);
      if (docIndex !== -1) {
        setCurrentIndex(docIndex);
        setViewMode('document');
      }
    }
  }, [location, displayedCommunications]);
  
  // Initialize translation from cached data if available
  useEffect(() => {
    if (currentDoc?.isTranslated && currentDoc?.translatedBody) {
      setTranslatedContent({
        subject: currentDoc.translatedSubject || currentDoc.subject,
        body: currentDoc.translatedBody,
      });
      setShowTranslation(true);
    } else if (currentDoc && !currentDoc.isTranslated) {
      setTranslatedContent(null);
      setShowTranslation(false);
    }
  }, [currentDoc]);
  
  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest("POST", `/api/communications/${docId}/translate`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      setTranslatedContent({
        subject: data.translatedSubject,
        body: data.translatedBody,
      });
      setShowTranslation(true);
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      toast({
        title: "Translation Complete",
        description: `Translated from ${data.originalLanguage} to English`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Translation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async ({ query, mode }: { query: string; mode: 'boolean' | 'natural' }) => {
      const response = await apiRequest("POST", "/api/communications/search", { query, mode });
      return response.json();
    },
    onSuccess: (data) => {
      // Only set search results if we have actual results
      if (data && data.length > 0) {
        setSearchResults(data);
        setCurrentIndex(0); // Reset to first result
        // Reset scroll to top for the new search results
        if (contentScrollRef.current) {
          contentScrollRef.current.scrollTop = 0;
        }
      } else {
        // No results - clear search and go back to regular view
        setSearchResults(null);
        setCurrentIndex(0);
      }
      setIsSearching(false);
      toast({
        title: "Search Complete",
        description: `Found ${data?.length || 0} result(s)`,
      });
    },
    onError: (error: any) => {
      setIsSearching(false);
      toast({
        title: "Search Error",
        description: error.message || "Failed to search communications",
        variant: "destructive",
      });
    },
  });
  
  // Add document to set mutation
  const addToSetMutation = useMutation({
    mutationFn: async ({ setId, communicationId }: { setId: string; communicationId: string }) => {
      return apiRequest("POST", `/api/document-sets/${setId}/documents`, { communicationId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-sets"] });
      // Invalidate the set-specific documents query if filtering by that set
      queryClient.invalidateQueries({ queryKey: [`/api/document-sets/${variables.setId}/documents`] });
      setAddToSetDialogOpen(false);
      toast({
        title: "Document added to set",
        description: "The document has been added to the set successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add document to set",
      });
    },
  });
  
  // Remove document from set mutation
  const removeFromSetMutation = useMutation({
    mutationFn: async ({ setId, communicationId }: { setId: string; communicationId: string }) => {
      return apiRequest("DELETE", `/api/document-sets/${setId}/documents/${communicationId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-sets"] });
      // Invalidate the set-specific documents query if filtering by that set
      queryClient.invalidateQueries({ queryKey: [`/api/document-sets/${variables.setId}/documents`] });
      setRemoveFromSetDialogOpen(false);
      toast({
        title: "Document removed from set",
        description: "The document has been removed from the set successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove document from set",
      });
    },
  });
  
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    const detectedMode = detectSearchMode(searchQuery);
    searchMutation.mutate({ query: searchQuery, mode: detectedMode });
  };
  
  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setCurrentIndex(0);
  };

  // Quick filter handlers
  const handleFilterBySender = (sender: string) => {
    setQuickFilterSender(sender);
    setCurrentIndex(0);
    toast({
      title: "Filter Applied",
      description: `Filtering by sender: ${sender}`,
    });
  };

  const handleFilterByRecipient = (recipient: string) => {
    setQuickFilterRecipient(recipient);
    setCurrentIndex(0);
    toast({
      title: "Filter Applied",
      description: `Filtering by recipient: ${recipient}`,
    });
  };

  const handleFilterByDate = (date: Date) => {
    // Format date as YYYY-MM-DD for API
    const dateStr = format(date, "yyyy-MM-dd");
    setQuickFilterDate(dateStr);
    setCurrentIndex(0);
    toast({
      title: "Filter Applied",
      description: `Filtering by date: ${format(date, "MMM d, yyyy")}`,
    });
  };

  const handleClearQuickFilters = () => {
    setQuickFilterSender(null);
    setQuickFilterRecipient(null);
    setQuickFilterDate(null);
    setUrlParticipants([]);
    setUrlDomain([]);
    setUrlQuery('');
    setCurrentIndex(0);
    
    // Update the browser URL to remove URL-based filters
    const currentPath = window.location.pathname;
    const newParams = new URLSearchParams();
    if (effectiveCaseId) {
      newParams.set('caseId', effectiveCaseId);
    }
    const newUrl = newParams.toString() ? `${currentPath}?${newParams.toString()}` : currentPath;
    window.history.replaceState({}, '', newUrl);
    
    toast({
      title: "Filters Cleared",
      description: "All filters have been removed",
    });
  };
  
  // Helper to update URL when individual URL-based filters are cleared
  const updateUrlWithFilters = (participants: string[], domains: string[], query: string) => {
    const currentPath = window.location.pathname;
    const newParams = new URLSearchParams();
    if (effectiveCaseId) {
      newParams.set('caseId', effectiveCaseId);
    }
    if (participants.length > 0) {
      newParams.set('participants', participants.join(','));
    }
    if (domains.length > 0) {
      newParams.set('domain', domains.join(','));
    }
    if (query) {
      newParams.set('query', query);
    }
    const newUrl = newParams.toString() ? `${currentPath}?${newParams.toString()}` : currentPath;
    window.history.replaceState({}, '', newUrl);
  };
  
  // Handler to clear a specific participant filter
  const handleClearParticipantFilter = (participant: string) => {
    const newParticipants = urlParticipants.filter(p => p !== participant);
    setUrlParticipants(newParticipants);
    updateUrlWithFilters(newParticipants, urlDomain, urlQuery);
  };
  
  // Handler to clear a specific domain filter
  const handleClearDomainFilter = (domain: string) => {
    const newDomains = urlDomain.filter(d => d !== domain);
    setUrlDomain(newDomains);
    updateUrlWithFilters(urlParticipants, newDomains, urlQuery);
  };
  
  // Handler to clear the query filter
  const handleClearQueryFilter = () => {
    setUrlQuery('');
    updateUrlWithFilters(urlParticipants, urlDomain, '');
  };
  
  // Fetch all communications to get unique employees and departments for filter
  const { data: allCommunications } = useQuery<Communication[]>({
    queryKey: ["/api/communications"],
    queryFn: async () => {
      const response = await fetch("/api/communications", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communications");
      return response.json();
    },
  });
  
  // Extract unique employees and departments
  const uniqueEmployees = Array.from(
    new Set(allCommunications?.map(c => c.custodianName).filter((name): name is string => !!name))
  ).sort();
  
  const uniqueDepartments = Array.from(
    new Set(allCommunications?.map((c: any) => c.custodianDepartment).filter((dept): dept is string => !!dept))
  ).sort();

  // Load existing coding for current document
  const { data: existingCoding } = useQuery<{ notes?: string }>({
    queryKey: [`/api/document-codings/${currentDoc?.id}`],
    enabled: !!currentDoc?.id,
  });

  // Update local state when document changes or coding loads
  useEffect(() => {
    if (existingCoding) {
      setAnnotation(existingCoding.notes || "");
    } else {
      setAnnotation("");
    }
  }, [existingCoding, currentDoc?.id]);

  // Save coding mutation
  const saveCodingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/document-codings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/document-codings/${currentDoc?.id}`] });
      toast({
        title: "Saved",
        description: "Document coding saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save coding",
        variant: "destructive",
      });
    },
  });

  const handleSaveCoding = () => {
    if (!currentDoc) return;

    saveCodingMutation.mutate({
      documentId: currentDoc.id,
      notes: annotation,
    });
  };

  // Assert privilege mutation
  const assertPrivilegeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/communications/${currentDoc?.id}/assert-privilege`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/privilege-review-queue"] });
      toast({
        title: "Privilege Asserted",
        description: "Privilege has been successfully asserted on this communication.",
      });
      setPrivilegeDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assert privilege",
        variant: "destructive",
      });
    },
  });

  const handleAssertPrivilege = () => {
    assertPrivilegeMutation.mutate(privilegeData);
  };

  // Bulk review status mutation
  const bulkReviewStatusMutation = useMutation({
    mutationFn: async (data: { documentIds: string[]; reviewStatus: string }) => {
      const response = await apiRequest("PATCH", "/api/communications/bulk-review-status", data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate all document codings queries to refresh documentCodingsMap
      queryClient.invalidateQueries({ queryKey: ["/api/document-codings"] });
      
      // Also invalidate individual coding queries for updated documents
      variables.documentIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: [`/api/document-codings/${id}`] });
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      
      toast({
        title: "Review Status Updated",
        description: `Successfully updated review status for ${selectedDocumentIds.length} documents.`,
      });
      setSelectedDocumentIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update review status",
        variant: "destructive",
      });
    },
  });

  const handleBulkReviewStatus = (reviewStatus: 'reviewed' | 'in_progress' | 'unreviewed') => {
    if (selectedDocumentIds.length === 0) return;
    
    // Extract communication IDs (remove 'comm_' prefix)
    const commIds = selectedDocumentIds
      .filter(id => id.startsWith('comm_'))
      .map(id => id.replace('comm_', ''));
    
    if (commIds.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select documents to update review status.",
        variant: "destructive",
      });
      return;
    }

    bulkReviewStatusMutation.mutate({
      documentIds: commIds,
      reviewStatus, // Already in correct format from handler
    });
  };

  // Group by thread if available
  const threadedDocs = displayedCommunications?.filter(
    c => c.emailThreadId === currentDoc?.emailThreadId && currentDoc?.emailThreadId
  ) || [];

  const navigateDoc = (direction: 'prev' | 'next') => {
    if (!displayedCommunications) return;
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < displayedCommunications.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const navigateToNextUnreviewed = () => {
    if (!displayedCommunications) return;
    
    // Find next unreviewed document starting from current position
    for (let i = currentIndex + 1; i < displayedCommunications.length; i++) {
      const doc = displayedCommunications[i];
      const coding = documentCodingsMap[doc.id];
      if (!coding || coding.reviewStatus === 'unreviewed') {
        setCurrentIndex(i);
        toast({
          title: "Navigated to next unreviewed document",
          description: `Document ${i + 1} of ${displayedCommunications.length}`,
        });
        return;
      }
    }
    
    // If no unreviewed found after current, wrap around
    for (let i = 0; i <= currentIndex; i++) {
      const doc = displayedCommunications[i];
      const coding = documentCodingsMap[doc.id];
      if (!coding || coding.reviewStatus === 'unreviewed') {
        setCurrentIndex(i);
        toast({
          title: "Navigated to next unreviewed document",
          description: `Document ${i + 1} of ${displayedCommunications.length}`,
        });
        return;
      }
    }
    
    toast({
      title: "No unreviewed documents found",
      description: "All documents have been reviewed.",
    });
  };

  // Keyboard navigation with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when not typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        !displayedCommunications
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateDoc('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateDoc('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, displayedCommunications]);

  // Persist advanced search panel state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sentinel_advanced_search_expanded', String(advancedSearchOpen));
    }
  }, [advancedSearchOpen]);

  // Keyboard shortcut for advanced search panel (Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setAdvancedSearchOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Sidebar style for loading state
  const loadingSidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Fetch current case details if we have a caseId
  const { data: currentCase } = useQuery<{ id: string; caseNumber: string; title: string; status: string }>({
    queryKey: ['/api/cases', effectiveCaseId],
    enabled: !!effectiveCaseId,
  });

  // Fetch deals for the selection picker
  const { data: allDeals = [], isLoading: dealsLoading } = useQuery<Array<{ id: string; dealNumber: string; title: string; status: string; dealType: string }>>({
    queryKey: ['/api/deals'],
    enabled: !effectiveCaseId,
  });

  const { data: rawDataLakeItems = [], isLoading: dataLakeLoading } = useQuery<any[]>({
    queryKey: ['/api/data-lake/items'],
    enabled: !effectiveCaseId,
  });
  const dataLakeItems = useMemo(() => {
    return rawDataLakeItems
      .filter((item: any) => item.itemType !== 'email')
      .map((item: any) => {
        const meta = item.metadata || {};
        const status = meta.processingStatus === 'processing' ? 'Processing...'
          : meta.processingStatus === 'completed' ? `${meta.childCount || 0} emails`
          : meta.processingStatus === 'failed' ? 'Failed' : undefined;
        return { id: item.id, title: item.name, sourceType: item.source, fileType: item.itemType, status };
      });
  }, [rawDataLakeItems]);

  // Bookmark functionality for the current document
  const { data: userBookmarks = [], refetch: refetchBookmarks } = useQuery<Array<{ id: string; communicationId: string; bookmarkType: string }>>({
    queryKey: ['/api/bookmarks'],
    enabled: !!user,
  });

  // Check if current document is bookmarked
  const currentDocBookmark = useMemo(() => {
    if (!currentDoc || !userBookmarks.length) return null;
    return userBookmarks.find(b => b.communicationId === currentDoc.id && b.bookmarkType === 'document');
  }, [currentDoc, userBookmarks]);

  // Create bookmark mutation
  const createBookmarkMutation = useMutation({
    mutationFn: async (data: { bookmarkType: string; communicationId: string; caseId?: string; title: string; excerpt?: string }) => {
      return apiRequest("POST", '/api/bookmarks', data);
    },
    onSuccess: async () => {
      // Directly refetch bookmarks to update UI immediately
      await refetchBookmarks();
      // Also invalidate other bookmark queries in the app
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'], refetchType: 'all' });
      toast({
        title: "Bookmark created",
        description: "Document has been bookmarked",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bookmark",
        variant: "destructive",
      });
    },
  });

  // Delete bookmark mutation
  const deleteBookmarkMutation = useMutation({
    mutationFn: async (bookmarkId: string) => {
      return apiRequest("DELETE", `/api/bookmarks/${bookmarkId}`);
    },
    onSuccess: async () => {
      // Directly refetch bookmarks to update UI immediately
      await refetchBookmarks();
      // Also invalidate other bookmark queries in the app
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'], refetchType: 'all' });
      toast({
        title: "Bookmark removed",
        description: "Document bookmark has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove bookmark",
        variant: "destructive",
      });
    },
  });

  // Handle bookmark toggle
  const handleToggleBookmark = () => {
    if (!currentDoc) return;
    
    if (currentDocBookmark) {
      deleteBookmarkMutation.mutate(currentDocBookmark.id);
    } else {
      createBookmarkMutation.mutate({
        bookmarkType: 'document',
        communicationId: currentDoc.id,
        caseId: effectiveCaseId || undefined,
        title: currentDoc.subject || 'Untitled Document',
        excerpt: currentDoc.body?.substring(0, 200) || undefined,
      });
    }
  };

  // Activity tracking mutation - track when user views a document
  const trackActivityMutation = useMutation({
    mutationFn: async (data: { activityType: string; referenceId: string; referenceType: string; caseId?: string; title: string; subtitle?: string; url: string }) => {
      return apiRequest("POST", '/api/user-activity', data);
    },
    onError: (error: any) => {
      console.error('Failed to track activity:', error);
    },
  });

  // Track last logged document to prevent duplicate activity tracking
  const lastTrackedDocRef = useRef<string | null>(null);

  // Track document view when currentDoc changes - with replay protection
  useEffect(() => {
    const docId = currentDoc?.id;
    const userId = user?.id;
    
    // Only track if we have all required data and haven't already tracked this doc
    if (docId && userId && effectiveCaseId && lastTrackedDocRef.current !== docId) {
      lastTrackedDocRef.current = docId;
      trackActivityMutation.mutate({
        activityType: 'document_view',
        referenceId: docId,
        referenceType: 'communication',
        caseId: effectiveCaseId,
        title: currentDoc?.subject || 'Untitled Document',
        subtitle: `From: ${currentDoc?.sender || 'Unknown'}`,
        url: `/cases/${effectiveCaseId}/document-review?documentId=${docId}`,
      });
    }
  }, [currentDoc?.id, user?.id, effectiveCaseId]);

  // Show case selection requirement when no case is selected
  if (!effectiveCaseId) {
    return (
      <SidebarProvider 
        key="document-review-sidebar-no-case"
        defaultOpen={false}
        open={activeSidebar !== 'none'} 
        onOpenChange={(open) => {
          if (!open) {
            setActiveSidebar('none');
          }
        }}
        style={loadingSidebarStyle as React.CSSProperties}
      >
        <div className="flex h-screen w-full">
          {activeSidebar === 'nav' && <AppSidebar />}
          
          <SidebarInset>
            <div className="flex flex-col h-full">
              {/* Header with navigation toggle */}
              <div className="flex items-center gap-4 px-4 py-3 border-b bg-background">
                {activeSidebar === 'none' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" data-testid="button-sidebar-toggle">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setActiveSidebar('nav')}>
                        Main Navigation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => setActiveSidebar('none')}
                    data-testid="button-sidebar-toggle"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <h1 className="text-lg font-semibold">Document Review</h1>
              </div>
              
              {/* Deal / Data Lake selection prompt */}
              <div className="flex items-center justify-center flex-1 p-8">
                <Card className="max-w-2xl w-full">
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">Select a Source</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      Select a deal or data lake document to begin your review.
                    </p>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Transactions
                      </h3>
                      {dealsLoading ? (
                        <div className="text-center py-4 text-muted-foreground">Loading deals...</div>
                      ) : allDeals.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {allDeals.map((deal) => (
                            <div
                              key={deal.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                              onClick={() => setLocation(`/document-review?caseId=${deal.id}`)}
                              data-testid={`deal-select-${deal.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <Briefcase className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{deal.title}</div>
                                  <div className="text-sm text-muted-foreground">{deal.dealNumber} &middot; {deal.dealType?.replace(/_/g, " ")}</div>
                                </div>
                              </div>
                              <Badge variant="outline">{deal.status}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No deals available.
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" /> My Data Lake
                      </h3>
                      {dataLakeLoading ? (
                        <div className="text-center py-4 text-muted-foreground">Loading documents...</div>
                      ) : dataLakeItems.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {dataLakeItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                              onClick={() => setLocation(`/document-review?caseId=${item.id}`)}
                              data-testid={`datalake-select-${item.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{item.title || "Untitled Document"}</div>
                                  <div className="text-sm text-muted-foreground">{item.sourceType} {item.fileType ? `\u00b7 ${item.fileType}` : ""}</div>
                                </div>
                              </div>
                              {item.status && <Badge variant="outline">{item.status}</Badge>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No documents in your Data Lake.
                        </div>
                      )}
                    </div>

                    <div className="flex justify-center gap-3 pt-4 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => setLocation('/transactions/deals')}
                        data-testid="button-go-to-deals"
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Go to Transactions
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setLocation('/my-data-lake')}
                        data-testid="button-go-to-data-lake"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Go to Data Lake
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Show loading only when fetching and no search results present
  if ((isLoading || isLoadingDataRoomDocs) && !searchResults) {
    return (
      <SidebarProvider 
        key="document-review-sidebar-loading"
        defaultOpen={false}
        open={activeSidebar !== 'none'} 
        onOpenChange={(open) => {
          if (!open) {
            setActiveSidebar('none');
          }
        }}
        style={loadingSidebarStyle as React.CSSProperties}
      >
        <div className="flex h-screen w-full">
          {activeSidebar === 'nav' && <AppSidebar />}
          
          <SidebarInset>
            <div className="flex flex-col h-full">
              {/* Header with navigation toggle */}
              <div className="flex items-center gap-4 px-4 py-3 border-b bg-background">
                {activeSidebar === 'none' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" data-testid="button-sidebar-toggle">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setActiveSidebar('nav')}>
                        Main Navigation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => setActiveSidebar('none')}
                    data-testid="button-sidebar-toggle"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <h1 className="text-lg font-semibold">Document Review</h1>
              </div>
              
              {/* Loading content */}
              <div className="flex items-center justify-center flex-1">
                <div className="text-lg text-muted-foreground">Loading documents...</div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }
  
  // Show empty state when search returns no results
  if (searchResults && searchResults.length === 0) {
    return (
      <SidebarProvider 
        key="document-review-sidebar-search-empty"
        defaultOpen={false}
        open={activeSidebar !== 'none'} 
        onOpenChange={(open) => {
          if (!open) {
            setActiveSidebar('none');
          }
        }}
        style={loadingSidebarStyle as React.CSSProperties}
      >
        <div className="flex h-screen w-full">
          {activeSidebar === 'nav' && <AppSidebar />}
          
          <SidebarInset>
            <div className="flex flex-col h-full">
              {/* Header with navigation toggle and search */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-card gap-4">
                <div className="flex items-center gap-4">
                  {activeSidebar === 'none' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline" data-testid="button-sidebar-toggle">
                          <Menu className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setActiveSidebar('nav')}>
                          Main Navigation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => setActiveSidebar('none')}
                      data-testid="button-sidebar-toggle"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <span className="text-sm font-medium">No results found</span>
                </div>
                
                <div className="flex items-center gap-2 flex-1 max-w-2xl">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder='Search communications (use AND, OR, NOT, "quotes" for boolean)'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                      data-testid="input-search-query"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || searchMutation.isPending}
                    data-testid="button-execute-search"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-center flex-1">
                <Card className="max-w-md">
                  <CardContent className="p-6 text-center space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No communications found</h3>
                    <p className="text-sm text-muted-foreground">
                      Your search for "{searchQuery}" didn't match any communications.
                    </p>
                    <Button
                      onClick={handleClearSearch}
                      variant="outline"
                      className="mt-4"
                      data-testid="button-clear-search-empty"
                    >
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }
  
  // Sidebar style configuration
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show empty state with navigation when no documents are available
  if (!currentDoc) {
    return (
      <SidebarProvider 
        key="document-review-sidebar-empty"
        defaultOpen={false}
        open={activeSidebar !== 'none'} 
        onOpenChange={(open) => {
          if (!open) {
            setActiveSidebar('none');
          }
        }}
        style={sidebarStyle as React.CSSProperties}
      >
        <div className="flex h-screen w-full">
          {activeSidebar === 'nav' && <AppSidebar />}
          
          <SidebarInset>
            <div className="flex flex-col h-full">
              {/* Header with navigation toggle */}
              <div className="flex items-center gap-4 px-4 py-3 border-b bg-background">
                {activeSidebar === 'none' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" data-testid="button-sidebar-toggle">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setActiveSidebar('nav')}>
                        Main Navigation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => setActiveSidebar('none')}
                    data-testid="button-sidebar-toggle"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <h1 className="text-lg font-semibold">Document Review</h1>
              </div>
              
              {/* Empty state content */}
              <div className="flex items-center justify-center flex-1">
                <Card className="max-w-md">
                  <CardContent className="p-8 text-center space-y-4">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                    <h3 className="text-xl font-semibold">No documents available</h3>
                    <p className="text-sm text-muted-foreground">
                      There are no communications or documents linked to this case yet. 
                      Upload evidence or ingest communications to get started.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider 
      key="document-review-sidebar"
      defaultOpen={false}
      open={activeSidebar !== 'none'} 
      onOpenChange={(open) => {
        if (!open) {
          setActiveSidebar('none');
        }
      }}
      style={sidebarStyle as React.CSSProperties}
    >
      <div className="flex h-screen w-full">
        {/* Conditionally render active sidebar */}
        {activeSidebar === 'nav' && <AppSidebar />}
        {activeSidebar === 'tools' && (
          <DocumentToolsSidebar
            viewMode={viewMode}
            setViewMode={setViewMode}
            currentIndex={currentIndex}
            totalDocs={displayedCommunications?.length || 0}
            navigateDoc={navigateDoc}
            navigateToIndex={(index: number) => {
              if (displayedCommunications && index >= 0 && index < displayedCommunications.length) {
                setCurrentIndex(index);
              }
            }}
            uniqueEmployees={uniqueEmployees}
            selectedEmployees={selectedEmployees}
            setSelectedEmployees={setSelectedEmployees}
            uniqueDepartments={uniqueDepartments}
            selectedDepartments={selectedDepartments}
            setSelectedDepartments={setSelectedDepartments}
            documentSets={documentSets}
            selectedSetId={selectedSetId}
            setSelectedSetId={setSelectedSetId}
            onExport={() => {
              setSelectedExportDocs(currentDoc ? [currentDoc.id] : []);
              setExportDialogOpen(true);
            }}
            onAddToSet={() => setAddToSetDialogOpen(true)}
            onRemoveFromSet={() => setRemoveFromSetDialogOpen(true)}
            onAssertPrivilege={() => setPrivilegeDialogOpen(true)}
            currentDoc={currentDoc}
            showTranslation={showTranslation}
            setShowTranslation={setShowTranslation}
            translatedContent={translatedContent}
            translateMutation={translateMutation}
            fontSize={fontSize}
            setFontSize={(size: string) => setFontSize(size as FontSize)}
            fontSizeLabels={fontSizeLabels}
            showMetadata={showMetadata}
            setShowMetadata={setShowMetadata}
            threadCount={threadedDocs.length}
            legalHold={currentDoc.legalHold === 'active'}
            originalLanguage={currentDoc?.originalLanguage}
          />
        )}
        
        {/* Document viewer and header wrapped in SidebarInset */}
        <SidebarInset>
          <div className="flex flex-col">
            {/* Top Header with Search Controls - max height to ensure document viewer is always visible */}
            <div className="flex-shrink-0 border-b bg-background overflow-y-auto" style={{ maxHeight: '40vh' }}>
          {/* Main Search Bar Row */}
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            {/* Sidebar Toggle */}
            {activeSidebar === 'none' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" data-testid="button-sidebar-toggle">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setActiveSidebar('nav')}>
                    Main Navigation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveSidebar('tools')}>
                    Document Tools
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => setActiveSidebar('none')}
                data-testid="button-sidebar-toggle"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {/* Case Context Indicator - Always visible when viewing a case */}
            <div 
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md cursor-pointer hover-elevate"
              onClick={() => setLocation(`/cases/${effectiveCaseId}`)}
              data-testid="case-context-indicator"
            >
              <Briefcase className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-primary leading-tight">
                  {currentCase?.title || 'Loading...'}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {currentCase?.caseNumber || ''}
                </span>
              </div>
            </div>
            
            <Separator orientation="vertical" className="h-6" />

            {/* Search bar with autocomplete */}
            <div className="flex items-center gap-2 flex-1">
              <SearchWithAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder='Search communications...'
              />
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || searchMutation.isPending}
                data-testid="button-execute-search"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Advanced Search Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdvancedSearchOpen(!advancedSearchOpen)}
              data-testid="button-toggle-advanced-search"
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {advancedFilters.activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {advancedFilters.activeFilterCount}
                </Badge>
              )}
              {advancedSearchOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {/* Notification Bell */}
            <NotificationBell />
          </div>

          {/* Saved Searches & Status Row */}
          <div className="flex items-center gap-2 px-4 py-2 border-b flex-wrap">
            <SavedSearchesManager
                    caseId={effectiveCaseId || undefined}
                    currentFilters={advancedFilters.filters}
                    onLoadSearch={(filters) => {
                      Object.entries(filters).forEach(([key, value]) => {
                        advancedFilters.updateFilter(key as any, value);
                      });
                    }}
                  />
                  
                  {/* Review Status Counts */}
                  {displayedCommunications && displayedCommunications.length > 0 && (
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-muted-foreground">Review Status:</span>
                      <Badge variant="secondary" data-testid="badge-unreviewed-count">
                        <Eye className="w-3 h-3 mr-1" />
                        {displayedCommunications.filter(d => {
                          const coding = documentCodingsMap[d.id];
                          return !coding || coding.reviewStatus === 'unreviewed';
                        }).length} Unreviewed
                      </Badge>
                      <Badge variant="secondary" data-testid="badge-in-progress-count">
                        <Clock className="w-3 h-3 mr-1" />
                        {displayedCommunications.filter(d => {
                          const coding = documentCodingsMap[d.id];
                          return coding?.reviewStatus === 'in_progress';
                        }).length} In Progress
                      </Badge>
                      <Badge variant="secondary" data-testid="badge-reviewed-count">
                        <Check className="w-3 h-3 mr-1" />
                        {displayedCommunications.filter(d => {
                          const coding = documentCodingsMap[d.id];
                          return coding?.reviewStatus === 'reviewed';
                        }).length} Reviewed
                      </Badge>
                    </div>
                  )}
          </div>

          {/* Advanced Search Panel - Collapsible Filters */}
          <Collapsible open={advancedSearchOpen} onOpenChange={setAdvancedSearchOpen}>
            <CollapsibleContent className="border-b bg-card">
              <div className="p-4 space-y-4" data-testid="advanced-search-content">
                {/* Clear All Filters Button */}
                {advancedFilters.activeFilterCount > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {advancedFilters.activeFilterCount} active filter{advancedFilters.activeFilterCount !== 1 ? 's' : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={advancedFilters.clearAllFilters}
                      className="gap-1"
                      data-testid="button-clear-all-advanced-filters"
                    >
                      <X className="h-3 w-3" />
                      Clear All
                    </Button>
                  </div>
                )}

                {/* Search results badge */}
                {searchResults && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" data-testid="badge-search-results">
                      {searchResults.length} result(s)
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allIds = searchResults.map(doc => `comm_${doc.id}`);
                        setSelectedDocumentIds(allIds);
                      }}
                      data-testid="button-select-all-results"
                    >
                      Select All {searchResults.length}
                    </Button>
                  </div>
                )}

                {/* Date Range Filter - Phase 2 */}
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-3">Date Range</h3>
                  <DateRangeFilter
                    dateFrom={advancedFilters.filters.dateSentFrom ? new Date(advancedFilters.filters.dateSentFrom) : undefined}
                    dateTo={advancedFilters.filters.dateSentTo ? new Date(advancedFilters.filters.dateSentTo) : undefined}
                    onDateFromChange={(date) => advancedFilters.updateFilter('dateSentFrom', date?.toISOString())}
                    onDateToChange={(date) => advancedFilters.updateFilter('dateSentTo', date?.toISOString())}
                    onClear={() => {
                      advancedFilters.updateFilter('dateSentFrom', undefined);
                      advancedFilters.updateFilter('dateSentTo', undefined);
                    }}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Quick Filters Bar */}
          <div className="border-b bg-card p-4">
            <div className="max-w-4xl">
              <div className="space-y-3">

                {/* Active Quick Filters */}
                {(quickFilterSender || quickFilterRecipient || quickFilterDate || urlParticipants.length > 0 || urlDomain.length > 0 || urlQuery) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Active Filters:</span>
                    {quickFilterSender && (
                      <Badge variant="secondary" className="gap-1" data-testid="badge-filter-sender">
                        <Users className="h-3 w-3" />
                        Sender: {quickFilterSender}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={() => setQuickFilterSender(null)}
                          data-testid="button-clear-filter-sender"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    {quickFilterRecipient && (
                      <Badge variant="secondary" className="gap-1" data-testid="badge-filter-recipient">
                        <Users className="h-3 w-3" />
                        Recipient: {quickFilterRecipient}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={() => setQuickFilterRecipient(null)}
                          data-testid="button-clear-filter-recipient"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    {quickFilterDate && (
                      <Badge variant="secondary" className="gap-1" data-testid="badge-filter-date">
                        <Clock className="h-3 w-3" />
                        Date: {format(new Date(quickFilterDate), "MMM d, yyyy")}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={() => setQuickFilterDate(null)}
                          data-testid="button-clear-filter-date"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    {/* URL-based participants filter (from Parties & Custodians) */}
                    {urlParticipants.map((participant, idx) => (
                      <Badge key={`participant-${idx}`} variant="secondary" className="gap-1" data-testid={`badge-filter-participant-${idx}`}>
                        <Users className="h-3 w-3" />
                        Participant: {participant}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={() => handleClearParticipantFilter(participant)}
                          data-testid={`button-clear-filter-participant-${idx}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {/* URL-based domain filter (from Organizations) */}
                    {urlDomain.map((domain, idx) => (
                      <Badge key={`domain-${idx}`} variant="secondary" className="gap-1" data-testid={`badge-filter-domain-${idx}`}>
                        <Filter className="h-3 w-3" />
                        Domain: {domain}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={() => handleClearDomainFilter(domain)}
                          data-testid={`button-clear-filter-domain-${idx}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {/* URL-based search query (from Mentioned in Documents) */}
                    {urlQuery && (
                      <Badge variant="secondary" className="gap-1" data-testid="badge-filter-query">
                        <Search className="h-3 w-3" />
                        Search: "{urlQuery}"
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={handleClearQueryFilter}
                          data-testid="button-clear-filter-query"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearQuickFilters}
                      data-testid="button-clear-all-filters"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
                  
                  {/* Bulk Actions Dropdown */}
                  {selectedDocumentIds.length > 0 && (
                    <>
                      <Badge variant="outline" data-testid="badge-selected-count">
                        {selectedDocumentIds.length} selected
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDocumentIds([])}
                        data-testid="button-clear-selection"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-bulk-actions">
                            <MoreVertical className="h-4 w-4 mr-2" />
                            Bulk Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setBulkTagModalOpen(true)} data-testid="menu-bulk-tag">
                            <Tag className="h-4 w-4 mr-2" />
                            Apply Tag
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setBulkRemoveTagModalOpen(true)} data-testid="menu-bulk-remove-tag">
                            <Tag className="h-4 w-4 mr-2" />
                            Remove Tag
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkReviewStatus('reviewed')} data-testid="menu-bulk-reviewed">
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Reviewed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkReviewStatus('in_progress')} data-testid="menu-bulk-in-progress">
                            <Clock className="h-4 w-4 mr-2" />
                            Mark as In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkReviewStatus('unreviewed')} data-testid="menu-bulk-unreviewed">
                            <Eye className="h-4 w-4 mr-2" />
                            Mark as Unreviewed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedExportDocs(selectedDocumentIds);
                            setExportDialogOpen(true);
                          }} data-testid="menu-bulk-export">
                            <FileDown className="h-4 w-4 mr-2" />
                            Export Selected
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

            {/* Document viewer content */}
            <div className="flex flex-col">
        {viewMode === 'list' ? (
          /* List View */
          (<div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <DocumentListView
                documents={displayedCommunications || []}
                documentCodings={documentCodingsMap}
                selectedDocumentId={currentDoc?.id}
                onSelectDocument={(docId) => {
                  const index = displayedCommunications?.findIndex(d => d.id === docId) ?? -1;
                  if (index >= 0) {
                    setCurrentIndex(index);
                    setViewMode('document');
                  }
                }}
                onSelectMultiple={(docIds) => {
                  setSelectedDocumentIds(docIds);
                }}
                sortOrder={sortOrder}
              />
            </div>
            {/* Tag Usage Report Section */}
            <div className="border-t p-4 overflow-auto" style={{ maxHeight: '40vh' }}>
              {effectiveCaseId && <TagUsageReport caseId={effectiveCaseId} />}
            </div>
          </div>)
        ) : (
          /* Document View - Using simple flex layout for reliability */
          (<div className="flex">
            {/* Document Viewer - Main Content Area */}
            <div className={codingPanelCollapsed ? "flex-1" : "flex-1 max-w-[75%]"}>
              <div className="flex flex-col h-full">
                <Tabs defaultValue="content" className="flex-1 flex flex-col h-full overflow-hidden">
                  <TabsList className="w-full justify-start rounded-none border-b flex-shrink-0">
                    <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
                    <TabsTrigger value="metadata" data-testid="tab-metadata">Metadata</TabsTrigger>
                    {threadedDocs.length > 1 && (
                      <TabsTrigger value="thread" data-testid="tab-thread">
                        Thread ({threadedDocs.length})
                      </TabsTrigger>
                    )}
                  </TabsList>

                <TabsContent 
                  value="content" 
                  className="flex-1 overflow-auto p-0 m-0"
                  style={{ 
                    display: 'block',
                    visibility: 'visible' as any,
                    opacity: 1
                  }}
                  ref={contentScrollRef}
                >
                  <div className="h-full">
                    {currentDoc ? (
                      <div className="p-4 space-y-3">
                        {/* Email Header */}
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-4">
                            <h2 className={`font-bold break-words flex-1 ${fontSize === 'small' ? 'text-lg' : fontSize === 'medium' ? 'text-xl' : fontSize === 'large' ? 'text-2xl' : 'text-3xl'}`} data-testid="text-doc-subject">
                              {showTranslation && translatedContent ? translatedContent.subject : currentDoc.subject}
                            </h2>
                            
                            {/* Document Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" data-testid="button-print-menu">
                                    <Printer className="h-4 w-4 mr-1" />
                                    Print/PDF
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => window.print()}
                                    data-testid="button-print"
                                  >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print Document
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedExportDocs([currentDoc.id]);
                                      setExportDialogOpen(true);
                                    }}
                                    data-testid="button-save-pdf"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Save as PDF
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setShareDialogOpen(true)}
                                    data-testid="button-share-document"
                                  >
                                    <Share2 className="h-4 w-4 mr-1" />
                                    Share
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Share this document with team members
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant={currentDocBookmark ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleToggleBookmark}
                                    disabled={createBookmarkMutation.isPending || deleteBookmarkMutation.isPending}
                                    data-testid="button-bookmark-document"
                                  >
                                    {currentDocBookmark ? (
                                      <BookmarkCheck className="h-4 w-4 mr-1" />
                                    ) : (
                                      <Bookmark className="h-4 w-4 mr-1" />
                                    )}
                                    {currentDocBookmark ? "Bookmarked" : "Bookmark"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {currentDocBookmark ? "Remove bookmark" : "Bookmark this document for quick access"}
                                </TooltipContent>
                              </Tooltip>
                              
                              {pathCaseId && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setTimelineDialogOpen(true)}
                                        data-testid="button-add-to-timeline"
                                      >
                                        <CalendarPlus className="h-4 w-4 mr-1" />
                                        Add to Timeline
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Add this document to the case timeline
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEmmaOpen(true)}
                                        data-testid="button-emma-assistant"
                                      >
                                        <Sparkles className="h-4 w-4 mr-1" />
                                        Emma
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Ask Emma AI about this case
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <button
                              className="h-auto p-0 text-sm text-muted-foreground hover:text-primary underline underline-offset-4 cursor-pointer bg-transparent border-none"
                              onClick={() => handleFilterBySender(currentDoc.sender)}
                              data-testid="button-filter-sender"
                              title={`Click to filter by sender: ${currentDoc.sender}`}
                            >
                              {currentDoc.sender}
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <button
                              className="h-auto p-0 text-sm text-muted-foreground hover:text-primary underline underline-offset-4 cursor-pointer bg-transparent border-none"
                              onClick={() => handleFilterByDate(new Date(currentDoc.timestamp))}
                              data-testid="button-filter-date"
                              title={`Click to filter by date: ${format(new Date(currentDoc.timestamp), "MMM d, yyyy")}`}
                            >
                              {format(new Date(currentDoc.timestamp), "MMM d, yyyy h:mm a")}
                            </button>
                          </div>
                        </div>

                        {currentDoc.recipients && currentDoc.recipients.length > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">To: </span>
                            {currentDoc.recipients.map((recipient, idx) => {
                              const recipientDisplay = typeof recipient === 'object' && recipient !== null
                                ? (recipient as any).name || (recipient as any).address || JSON.stringify(recipient)
                                : String(recipient);
                              return (
                                <span key={idx}>
                                  <button
                                    className="h-auto p-0 text-sm text-foreground hover:text-primary underline underline-offset-4 cursor-pointer bg-transparent border-none"
                                    onClick={() => handleFilterByRecipient(recipientDisplay)}
                                    data-testid={`button-filter-recipient-${idx}`}
                                    title={`Click to filter by recipient: ${recipientDisplay}`}
                                  >
                                    {recipientDisplay}
                                  </button>
                                  {idx < currentDoc.recipients.length - 1 && <span className="text-muted-foreground">, </span>}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Translation Banner */}
                      {showTranslation && translatedContent && (
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                          <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
                            <Languages className="h-4 w-4" />
                            <span className="font-medium">English Translation</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Document Body */}
                      <div className="prose prose-sm max-w-none dark:prose-invert relative">
                        {isMediaFile(currentDoc) ? (
                          /* Render image or video content inline */
                          (<MediaViewer doc={currentDoc} />)
                        ) : currentDoc.metadata?.hasFormattedContent && currentDoc.metadata?.bodyHtml ? (
                          /* Render formatted HTML content (for DOCX files) with search highlighting */
                          (<div 
                            className={`formatted-document-content ${fontSizeClasses[fontSize]}`}
                            data-testid="text-doc-body"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightHtmlContent(
                                showTranslation && translatedContent ? translatedContent.body : currentDoc.metadata.bodyHtml,
                                searchQuery ? [searchQuery] : []
                              )
                            }}
                          />)
                        ) : (
                          /* Render plain text content with highlighting support */
                          (<pre 
                            className={`whitespace-pre-wrap font-sans break-words overflow-wrap-anywhere max-w-full ${fontSizeClasses[fontSize]}`}
                            style={{ wordWrap: 'break-word', overflowWrap: 'anywhere' }}
                            data-testid="text-doc-body"
                          >
                            <DocumentHighlighter
                              communicationId={currentDoc.id}
                              documentBody={showTranslation && translatedContent ? translatedContent.body : currentDoc.body}
                              currentUserId={user?.id}
                              isReadOnly={false}
                              attachmentsMap={attachmentsMap}
                              caseId={effectiveCaseId}
                              documentTitle={currentDoc.subject || 'Document'}
                            />
                          </pre>)
                        )}
                      </div>
                    </div>
                    ) : (
                      /* Show message when no document is selected */
                      (<div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium text-muted-foreground">No document selected</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              {searchResults !== null && searchResults.length === 0 
                                ? "No documents found matching your search" 
                                : displayedCommunications?.length > 0 
                                  ? "Select a document from the list to view its content" 
                                  : "No documents available"}
                            </p>
                          </div>
                        </div>
                      </div>)
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="metadata" className="flex-1 overflow-auto p-0 m-0">
                  <div className="h-full">
                    {currentDoc ? (
                      <div className="p-6 space-y-6 pb-12">
                        {/* Properties Section */}
                        <div>
                          <h3 className="font-semibold mb-3">Properties</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {currentDoc.fileSize && (
                            <div>
                              <div className="font-semibold text-muted-foreground">Size</div>
                              <div>
                                {currentDoc.fileSize < 1024
                                  ? `${currentDoc.fileSize} bytes`
                                  : currentDoc.fileSize < 1024 * 1024
                                  ? `${(currentDoc.fileSize / 1024).toFixed(2)} KB`
                                  : `${(currentDoc.fileSize / (1024 * 1024)).toFixed(2)} MB`}
                              </div>
                            </div>
                          )}
                          {currentDoc.wordCount && (
                            <div>
                              <div className="font-semibold text-muted-foreground">Words</div>
                              <div>{currentDoc.wordCount.toLocaleString()}</div>
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-muted-foreground">Type</div>
                            <div className="capitalize">{currentDoc.communicationType}</div>
                          </div>
                          {currentDoc.fileExtension && (
                            <div>
                              <div className="font-semibold text-muted-foreground">Format</div>
                              <div className="uppercase">{currentDoc.fileExtension.replace('.', '')}</div>
                            </div>
                          )}
                          {currentDoc.mimeType && (
                            <div className="col-span-2">
                              <div className="font-semibold text-muted-foreground">MIME Type</div>
                              <div className="font-mono text-xs">{currentDoc.mimeType}</div>
                            </div>
                          )}
                          {currentDoc.language && (
                            <div>
                              <div className="font-semibold text-muted-foreground">Language</div>
                              <div className="capitalize">{currentDoc.language}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Related Dates Section */}
                      <div>
                        <h3 className="font-semibold mb-3">Related Dates</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-semibold text-muted-foreground">Created</div>
                            <div>{format(new Date(currentDoc.timestamp), "M/d/yyyy h:mm a")}</div>
                          </div>
                          {currentDoc.metadata?.lastModified && (
                            <div>
                              <div className="font-semibold text-muted-foreground">Last Modified</div>
                              <div>{format(new Date(currentDoc.metadata.lastModified), "M/d/yyyy h:mm a")}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Related People Section */}
                      <div>
                        <h3 className="font-semibold mb-3">Related People</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-semibold text-muted-foreground">Author</div>
                            <div>{currentDoc.custodianName || currentDoc.sender}</div>
                          </div>
                          {currentDoc.metadata?.lastModifiedBy && (
                            <div>
                              <div className="font-semibold text-muted-foreground">Last Modified By</div>
                              <div>{currentDoc.metadata.lastModifiedBy}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Document Information Section */}
                      <div>
                        <h3 className="font-semibold mb-3">Document Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="col-span-2">
                            <div className="font-semibold text-muted-foreground">Document ID</div>
                            <div className="font-mono text-xs break-all">{currentDoc.id}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-muted-foreground">Legal Hold</div>
                            <div className="capitalize">{currentDoc.legalHold || "None"}</div>
                          </div>
                          {currentDoc.custodianDepartment && (
                            <div>
                              <div className="font-semibold text-muted-foreground">Department</div>
                              <div>{currentDoc.custodianDepartment}</div>
                            </div>
                          )}
                          {currentDoc.emailThreadId && (
                            <div className="col-span-2">
                              <div className="font-semibold text-muted-foreground">Thread ID</div>
                              <div className="font-mono text-xs break-all">{currentDoc.emailThreadId}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    ) : (
                      /* Show message when no document is selected */
                      (<div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium text-muted-foreground">No document selected</p>
                            <p className="text-sm text-muted-foreground mt-2">Select a document to view its metadata</p>
                          </div>
                        </div>
                      </div>)
                    )}
                  </div>
                </TabsContent>

                {threadedDocs.length > 1 && (
                  <TabsContent value="thread" className="flex-1 overflow-auto p-0 m-0">
                    <div className="h-full">
                      <div className="p-6 space-y-4 pb-12">
                        <div className="text-sm text-muted-foreground mb-4">
                          {threadedDocs.length} messages in this conversation
                        </div>
                        {threadedDocs.map((doc, idx) => (
                          <Card 
                            key={doc.id} 
                            className={`${doc.id === currentDoc.id ? 'border-primary' : ''}`}
                            data-testid={`thread-message-${idx}`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">{doc.sender}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(doc.timestamp), "MMM d, h:mm a")}
                                </div>
                              </div>
                              <div className="text-sm font-semibold">{doc.subject}</div>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm line-clamp-3">{doc.body}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                )}
                </Tabs>
              </div>
            </div>
            {/* Coding Panel - Right Sidebar */}
            {!codingPanelCollapsed && (
              <div className="w-[25%] min-w-[250px] max-w-[400px] flex flex-col bg-muted/30 border-l border-border">
                  <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Document Coding
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCodingPanelCollapsed(true)}
                      data-testid="button-collapse-coding-panel"
                      className="h-8 w-8"
                    >
                      <ChevronRightCircle className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <div className="px-4 pb-4 space-y-4">
                      {currentDoc && (
                        <>
                          <DocumentCoding 
                            entityType="communication" 
                            entityId={currentDoc.id}
                            caseId={effectiveCaseId || undefined}
                            currentIndex={currentIndex}
                            totalCount={displayedCommunications?.length || 0}
                            onNavigate={navigateDoc}
                            onNavigateToIndex={(index: number) => {
                              if (displayedCommunications && index >= 0 && index < displayedCommunications.length) {
                                setCurrentIndex(index);
                              }
                            }}
                            onNextUnreviewed={navigateToNextUnreviewed}
                          />
                          
                          <DocumentAttachments
                            documentId={currentDoc.id}
                            attachmentIds={currentDoc.attachmentIds as string[] || []}
                            attachmentCount={currentDoc.attachmentCount || 0}
                          />
                        </>
                      )}
                    </div>
                  </div>
              </div>
            )}
            {/* Collapsed Panel Button */}
            {codingPanelCollapsed && (
              <div className="flex items-start border-l border-border bg-muted/30 p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCodingPanelCollapsed(false)}
                  data-testid="button-expand-coding-panel"
                  className="h-8 w-8"
                >
                  <ChevronLeftCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>)
        )}
        </div>

      {/* Export Dialog */}
      <DocumentExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        documentIds={selectedExportDocs}
        documentTitles={selectedExportDocs.map(id => {
          const doc = displayedCommunications?.find(d => d.id === id);
          return doc?.subject || 'Untitled Document';
        })}
      />

      {/* Share Document Dialog */}
      {currentDoc && (
        <ShareDocumentDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          documentId={currentDoc.id}
          documentSubject={currentDoc.subject || 'Untitled Document'}
        />
      )}

      {/* Add to Timeline Dialog */}
      {currentDoc && pathCaseId && (
        <AddToTimelineDialog
          open={timelineDialogOpen}
          onOpenChange={setTimelineDialogOpen}
          caseId={pathCaseId}
          documentId={currentDoc.id}
          documentSubject={currentDoc.subject || 'Untitled Document'}
          documentType={currentDoc.communicationType || 'document'}
          documentTimestamp={currentDoc.timestamp}
          sender={currentDoc.sender}
        />
      )}

      {/* Emma AI Assistant */}
      {pathCaseId && (
        <CaseAIAssistant
          caseId={pathCaseId}
          isOpen={emmaOpen}
          onOpenChange={setEmmaOpen}
        />
      )}

      {/* Bulk Tag Modal */}
      <BulkTagModal
        open={bulkTagModalOpen}
        onOpenChange={setBulkTagModalOpen}
        searchSnapshot={{
          query: searchQuery,
          filters: {
            caseId: undefined, // Document review page is not case-specific
            employeeIds: selectedEmployees,
            departmentIds: selectedDepartments,
            documentSetId: selectedSetId || undefined,
            searchMode: detectSearchMode(searchQuery),
          },
          resultCount: displayedCommunications?.length || 0,
        }}
        selectedDocumentIds={selectedDocumentIds}
        onSuccess={() => {
          setSelectedDocumentIds([]);
          queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
        }}
      />

      {/* Bulk Remove Tag Modal */}
      <BulkRemoveTagModal
        open={bulkRemoveTagModalOpen}
        onOpenChange={setBulkRemoveTagModalOpen}
        searchSnapshot={{
          query: searchQuery,
          filters: {
            caseId: undefined, // Document review page is not case-specific
            employeeIds: selectedEmployees,
            departmentIds: selectedDepartments,
            documentSetId: selectedSetId || undefined,
            searchMode: detectSearchMode(searchQuery),
          },
          resultCount: displayedCommunications?.length || 0,
        }}
        selectedDocumentIds={selectedDocumentIds}
        onSuccess={() => {
          setSelectedDocumentIds([]);
          queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
        }}
      />

      {/* Privilege Assertion Dialog */}
      <Dialog open={privilegeDialogOpen} onOpenChange={setPrivilegeDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-assert-privilege">
          <DialogHeader>
            <DialogTitle>Assert Attorney-Client Privilege</DialogTitle>
            <DialogDescription>
              Assert attorney-client privilege or work product protection on this communication
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-md bg-muted">
              <div className="text-sm font-medium mb-2">Document Information</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  <span className="font-medium">Subject:</span> {currentDoc.subject}
                </div>
                <div>
                  <span className="font-medium">From:</span> {currentDoc.sender}
                </div>
                <div>
                  <span className="font-medium">Date:</span>{" "}
                  {format(new Date(currentDoc.timestamp), "MMM d, yyyy h:mm a")}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="privilegeStatus">Privilege Status</Label>
              <Select
                value={privilegeData.privilegeStatus}
                onValueChange={(value) =>
                  setPrivilegeData({ ...privilegeData, privilegeStatus: value })
                }
              >
                <SelectTrigger id="privilegeStatus" data-testid="select-privilege-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attorney_client_privileged">
                    Attorney-Client Privileged
                  </SelectItem>
                  <SelectItem value="work_product">Work Product</SelectItem>
                  <SelectItem value="both">Both Protections</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="privilegeBasis">Privilege Basis</Label>
              <Select
                value={privilegeData.privilegeBasis}
                onValueChange={(value) =>
                  setPrivilegeData({ ...privilegeData, privilegeBasis: value })
                }
              >
                <SelectTrigger id="privilegeBasis" data-testid="select-privilege-basis">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="counsel_directed_investigation">
                    Counsel-Directed Investigation
                  </SelectItem>
                  <SelectItem value="upjohn_warning">Upjohn Warning</SelectItem>
                  <SelectItem value="attorney_work_product">Attorney Work Product</SelectItem>
                  <SelectItem value="legal_advice_sought">Legal Advice Sought</SelectItem>
                  <SelectItem value="litigation_preparation">Litigation Preparation</SelectItem>
                  <SelectItem value="in_re_kbr">In re KBR Doctrine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="privilegeNotes">Privilege Notes</Label>
              <Textarea
                id="privilegeNotes"
                placeholder="Add notes explaining the basis for this privilege assertion..."
                value={privilegeData.privilegeNotes}
                onChange={(e) =>
                  setPrivilegeData({ ...privilegeData, privilegeNotes: e.target.value })
                }
                rows={4}
                data-testid="textarea-privilege-notes"
              />
            </div>

            <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <div className="font-medium">Important:</div>
                  <div className="text-xs mt-1">
                    This assertion will place the communication in the privilege review queue for
                    attorney approval before final privilege designation.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPrivilegeDialogOpen(false)}
              disabled={assertPrivilegeMutation.isPending}
              data-testid="button-cancel-privilege"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssertPrivilege}
              disabled={assertPrivilegeMutation.isPending}
              data-testid="button-submit-privilege"
            >
              <Shield className="h-4 w-4 mr-2" />
              {assertPrivilegeMutation.isPending ? "Asserting..." : "Assert Privilege"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Set Dialog */}
      <Dialog open={addToSetDialogOpen} onOpenChange={setAddToSetDialogOpen}>
        <DialogContent data-testid="dialog-add-to-set">
          <DialogHeader>
            <DialogTitle>Add Document to Set</DialogTitle>
            <DialogDescription>
              Select a document set to add this communication to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-muted">
              <div className="text-sm font-medium mb-2">Document Information</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  <span className="font-medium">Subject:</span> {currentDoc.subject}
                </div>
                <div>
                  <span className="font-medium">From:</span> {currentDoc.sender}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setSelect">Select Document Set</Label>
              <Select
                onValueChange={(value) => {
                  addToSetMutation.mutate({ setId: value, communicationId: currentDoc.id });
                }}
              >
                <SelectTrigger id="setSelect" data-testid="select-add-to-set">
                  <SelectValue placeholder="Choose a set..." />
                </SelectTrigger>
                <SelectContent>
                  {documentSets.map((set: any) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name} ({set.documentCount} documents)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddToSetDialogOpen(false)}
              data-testid="button-cancel-add-to-set"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Set Dialog */}
      {selectedSetId && (
        <Dialog open={removeFromSetDialogOpen} onOpenChange={setRemoveFromSetDialogOpen}>
          <DialogContent data-testid="dialog-remove-from-set">
            <DialogHeader>
              <DialogTitle>Remove Document from Set</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this document from the current set?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-muted">
                <div className="text-sm font-medium mb-2">Document Information</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Subject:</span> {currentDoc.subject}
                  </div>
                  <div>
                    <span className="font-medium">From:</span> {currentDoc.sender}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRemoveFromSetDialogOpen(false)}
                data-testid="button-cancel-remove-from-set"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  removeFromSetMutation.mutate({ setId: selectedSetId, communicationId: currentDoc.id });
                }}
                disabled={removeFromSetMutation.isPending}
                data-testid="button-confirm-remove-from-set"
              >
                {removeFromSetMutation.isPending ? "Removing..." : "Remove from Set"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
