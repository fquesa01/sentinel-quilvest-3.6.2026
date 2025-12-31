import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  FileText, 
  Mail, 
  MessageSquare, 
  Eye, 
  Download, 
  Tag, 
  Shield, 
  Flame, 
  CheckCircle2, 
  Search,
  X,
  Upload,
  Loader2,
  ChevronDown,
  Check,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  LayoutGrid,
  Target,
  Network,
  List
} from "lucide-react";
import { Fragment } from "react";
import { format } from "date-fns";
import { TagDocumentDialog } from "./tag-document-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ConnectedSourcesPanel } from "./connected-sources-panel";
import { SmartSearch } from "./smart-search";
import { CaseNetworkGraph } from "./case-network-graph";
import { EDiscoveryProcessingPanel } from "@/components/ediscovery/ediscovery-processing-panel";
import { CourtPleadingsPanel } from "./CourtPleadingsPanel";
import { Link, useLocation } from "wouter";

interface Document {
  id: string;
  subject: string;
  sender: string;
  body?: string;
  recipients?: string[];
  timestamp: string;
  sourceType: string;
  aiSnippet?: string;
  isPrivileged: boolean;
  isHot: boolean;
  isResponsive: boolean;
  tags: string[];
}

interface EvidenceTabProps {
  caseId: string;
  documents?: Document[];
  isLoading?: boolean;
  onViewDocument?: (id: string) => void;
  onDownloadDocument?: (id: string) => void;
  initialFilterPerson?: string;
  initialFilterKeyword?: string;
}

const getSourceIcon = (type: string) => {
  const icons: Record<string, typeof FileText> = {
    email_m365: Mail,
    email_google: Mail,
    chat_slack: MessageSquare,
    chat_teams: MessageSquare,
    file_share_drive: FileText,
    file_share_sharepoint: FileText,
  };
  const Icon = icons[type] || FileText;
  return <Icon className="h-4 w-4" />;
};

type ViewMode = "list" | "network";

export function EvidenceTab({ caseId, documents = [], isLoading, onViewDocument, onDownloadDocument, initialFilterPerson, initialFilterKeyword }: EvidenceTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  
  // Build initial search query from URL filter parameters
  const buildInitialSearchQuery = () => {
    const parts: string[] = [];
    if (initialFilterPerson) {
      parts.push(initialFilterPerson);
    }
    if (initialFilterKeyword) {
      parts.push(initialFilterKeyword);
    }
    return parts.join(" ");
  };
  
  const [searchQuery, setSearchQuery] = useState<string>(buildInitialSearchQuery);
  
  // React to prop changes - update search query when filter props change
  useEffect(() => {
    const newQuery = buildInitialSearchQuery();
    if (newQuery && newQuery !== searchQuery) {
      setSearchQuery(newQuery);
    }
  }, [initialFilterPerson, initialFilterKeyword]);
  
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [documentSetFilter, setDocumentSetFilter] = useState<string>("all");
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");
  const [showPrivilegedOnly, setShowPrivilegedOnly] = useState(false);
  const [showHotOnly, setShowHotOnly] = useState(false);
  const [showResponsiveOnly, setShowResponsiveOnly] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Reset preview state when navigating away from evidence tab
  useEffect(() => {
    if (!location.includes('/cases/')) {
      setPreviewDialogOpen(false);
      setPreviewDocument(null);
    }
  }, [location]);
  
  const toggleRowExpansion = (docId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  // Fetch all available tags for filtering
  interface Tag {
    id: string;
    name: string;
    category?: string;
  }
  
  const { data: tagsData = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });
  
  // Extract unique tag names for filtering
  const allTags = Array.from(new Set(tagsData.map(t => t.name)));
  
  // Filter tags based on search query
  const filteredTags = tagSearchQuery 
    ? allTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
    : allTags;
  
  // Upload evidence file
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Step 1: Get presigned upload URL
      const uploadUrlResponse = await apiRequest("POST", `/api/cases/${caseId}/evidence/upload-url`);
      const { uploadURL } = await uploadUrlResponse.json();
      
      // Step 2: Upload file directly to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }
      
      // Step 3: Notify backend to process the file
      const processResponse = await apiRequest("POST", `/api/cases/${caseId}/evidence/process`, {
        uploadURL,
        fileName: file.name,
      });
      
      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.message || `Server error: ${processResponse.status}`);
      }
      
      const result = await processResponse.json();
      
      const parts = [];
      if (result.communicationsCreated > 0) {
        parts.push(`${result.communicationsCreated} email(s)`);
      }
      if (result.chatMessagesCreated > 0) {
        parts.push(`${result.chatMessagesCreated} chat message(s)`);
      }
      
      // Check if nothing was extracted
      if (result.communicationsCreated === 0 && result.chatMessagesCreated === 0) {
        // Complete failure - nothing was extracted
        if (result.errors && result.errors.length > 0) {
          throw new Error(`Processing failed: ${result.errors.join('; ')}`);
        } else {
          throw new Error(`No content could be extracted from ${file.name}`);
        }
      }
      
      // Success (with possible warnings)
      let description = `Extracted: ${parts.join(', ')}`;
      
      // Add format info if detected
      if (result.detectedChatFormat) {
        description += ` (${result.detectedChatFormat} format)`;
      }
      
      // Show warnings if some items failed to process
      if (result.errors && result.errors.length > 0) {
        console.warn("File processing warnings:", result.errors);
        description += `\n⚠️ ${result.errors.length} item(s) had warnings`;
      }
      
      toast({
        title: "Evidence uploaded successfully",
        description,
      });
      
      // Invalidate queries to refresh the documents list
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/communications`] });
      
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error?.message || error?.toString() || "Failed to upload evidence file. Please check the file format and try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Reprocess files that weren't properly processed (fixes for schema issues)
  const handleReprocessFiles = async () => {
    setIsReprocessing(true);
    try {
      const response = await apiRequest("POST", `/api/cases/${caseId}/reprocess-files`);
      const result = await response.json();
      
      if (result.communicationsCreated > 0) {
        toast({
          title: "Files reprocessed successfully",
          description: `Created ${result.communicationsCreated} documents. ${result.errors > 0 ? `(${result.errors} errors)` : ''}`,
        });
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/uploaded-files`] });
      } else {
        toast({
          title: "Reprocessing complete",
          description: result.errors > 0 ? `${result.errors} errors occurred` : "No files needed reprocessing",
        });
      }
    } catch (error: any) {
      console.error("Reprocess error:", error);
      toast({
        title: "Reprocessing failed",
        description: error?.message || "Failed to reprocess files",
        variant: "destructive",
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  // Boolean and natural language search helper
  const matchesSearch = (doc: Document, query: string): boolean => {
    if (!query.trim()) return true;

    const searchText = query.toLowerCase();
    const docText = `${doc.subject} ${doc.sender} ${doc.aiSnippet || ""} ${doc.tags.join(" ")}`.toLowerCase();

    // Check for boolean operators
    if (searchText.includes(" and ")) {
      const terms = searchText.split(" and ").map(t => t.trim());
      return terms.every(term => docText.includes(term));
    }
    
    if (searchText.includes(" or ")) {
      const terms = searchText.split(" or ").map(t => t.trim());
      return terms.some(term => docText.includes(term));
    }
    
    if (searchText.includes(" not ")) {
      const parts = searchText.split(" not ");
      const includeTerm = parts[0].trim();
      const excludeTerm = parts[1].trim();
      return docText.includes(includeTerm) && !docText.includes(excludeTerm);
    }

    // Natural language search - check if any word matches
    return docText.includes(searchText);
  };

  const filteredDocuments = documents.filter((doc) => {
    // Search query filter (natural language or boolean)
    if (!matchesSearch(doc, searchQuery)) return false;
    
    // Tag filter - document must have ALL selected tags
    if (selectedTags.length > 0) {
      const hasAllTags = selectedTags.every(tag => doc.tags.includes(tag));
      if (!hasAllTags) return false;
    }
    
    if (sourceTypeFilter !== "all" && doc.sourceType !== sourceTypeFilter) return false;
    if (showPrivilegedOnly && !doc.isPrivileged) return false;
    if (showHotOnly && !doc.isHot) return false;
    if (showResponsiveOnly && !doc.isResponsive) return false;
    if (dateRangeStart && new Date(doc.timestamp) < new Date(dateRangeStart)) return false;
    if (dateRangeEnd && new Date(doc.timestamp) > new Date(dateRangeEnd)) return false;
    return true;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSourceTypeFilter("all");
    setDocumentSetFilter("all");
    setDateRangeStart("");
    setDateRangeEnd("");
    setShowPrivilegedOnly(false);
    setShowHotOnly(false);
    setShowResponsiveOnly(false);
  };

  return (
    <div className="space-y-4">
      {/* Connected Data Sources */}
      <ConnectedSourcesPanel caseId={caseId} />
      
      {/* Smart Search with AI */}
      <SmartSearch caseId={caseId} />
      
      {/* E-Discovery Processing Panel */}
      <EDiscoveryProcessingPanel caseId={caseId} />
      
      {/* Court Pleadings for AI Search */}
      <CourtPleadingsPanel caseId={caseId} />
      
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/cases/${caseId}/chat-review`}>
            <Button 
              variant="outline" 
              className="gap-2"
              data-testid="button-chat-review"
            >
              <MessageSquare className="h-4 w-4" />
              Chat Review
            </Button>
          </Link>
          <Link href={`/cases/${caseId}/document-review`}>
            <Button 
              variant="outline" 
              className="gap-2"
              data-testid="button-document-review"
            >
              <FileText className="h-4 w-4" />
              Document Review
            </Button>
          </Link>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">View:</span>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="border rounded-md"
          >
            <ToggleGroupItem
              value="list"
              aria-label="List view"
              className="gap-1.5 px-3"
              data-testid="toggle-view-list"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="network"
              aria-label="Network graph view"
              className="gap-1.5 px-3"
              data-testid="toggle-view-network"
            >
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Network</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      
      {/* Conditional rendering based on view mode */}
      {viewMode === "network" ? (
        <div className="h-[calc(100vh-20rem)]">
          <CaseNetworkGraph caseId={caseId} />
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search documents (use 'and', 'or', 'not' for boolean search)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                  data-testid="input-search-query"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-muted-foreground mt-2">
                  {searchQuery.toLowerCase().includes(" and ") && "Boolean AND search: All terms must match"}
                  {searchQuery.toLowerCase().includes(" or ") && "Boolean OR search: Any term can match"}
                  {searchQuery.toLowerCase().includes(" not ") && "Boolean NOT search: Exclude specific terms"}
                  {!searchQuery.toLowerCase().includes(" and ") && 
                   !searchQuery.toLowerCase().includes(" or ") && 
                   !searchQuery.toLowerCase().includes(" not ") && 
                   "Natural language search across subject, sender, content, and tags"}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tag Filter - Searchable Dropdown */}
              {allTags.length > 0 && (
                <div>
                  <Label className="text-sm mb-2 block">Filter by Tags</Label>
                  <Popover open={tagDropdownOpen} onOpenChange={setTagDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between hover-elevate"
                        data-testid="button-tag-filter"
                      >
                        <span className="text-sm">
                          {selectedTags.length > 0 
                            ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                            : "Select tags..."}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search tags..."
                            value={tagSearchQuery}
                            onChange={(e) => setTagSearchQuery(e.target.value)}
                            className="pl-8 h-9"
                            data-testid="input-tag-search"
                          />
                        </div>
                      </div>
                      <ScrollArea className="max-h-[300px]">
                        <div className="p-2">
                          {filteredTags.length > 0 ? (
                            <div className="space-y-1">
                              {filteredTags.map((tag) => (
                                <div
                                  key={tag}
                                  className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover-elevate cursor-pointer"
                                  onClick={() => toggleTag(tag)}
                                  data-testid={`tag-option-${tag}`}
                                >
                                  <div className="flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                                    {selectedTags.includes(tag) && (
                                      <Check className="h-3 w-3 text-primary" />
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs flex-1">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No tags found
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      {selectedTags.length > 0 && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8"
                            onClick={() => setSelectedTags([])}
                            data-testid="button-clear-tags"
                          >
                            Clear all ({selectedTags.length})
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs cursor-pointer hover-elevate"
                          onClick={() => toggleTag(tag)}
                          data-testid={`badge-selected-tag-${tag}`}
                        >
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            <div>
              <Label htmlFor="source-type" className="text-sm">Source Type</Label>
              <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                <SelectTrigger id="source-type" data-testid="select-source-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="email_m365">Email (M365)</SelectItem>
                  <SelectItem value="email_google">Email (Google)</SelectItem>
                  <SelectItem value="chat_slack">Slack</SelectItem>
                  <SelectItem value="chat_teams">Teams</SelectItem>
                  <SelectItem value="file_share_drive">Google Drive</SelectItem>
                  <SelectItem value="file_share_sharepoint">SharePoint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="document-set" className="text-sm">Document Set</Label>
              <Select value={documentSetFilter} onValueChange={setDocumentSetFilter}>
                <SelectTrigger id="document-set" data-testid="select-document-set">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sets</SelectItem>
                  <SelectItem value="set-1">Initial Collection</SelectItem>
                  <SelectItem value="set-2">Follow-up Documents</SelectItem>
                  <SelectItem value="set-3">Third Party Correspondence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-start" className="text-sm">Date Range Start</Label>
              <Input
                id="date-start"
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                data-testid="input-date-start"
              />
            </div>

            <div>
              <Label htmlFor="date-end" className="text-sm">Date Range End</Label>
              <Input
                id="date-end"
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                data-testid="input-date-end"
              />
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privileged"
                  checked={showPrivilegedOnly}
                  onCheckedChange={(checked) => setShowPrivilegedOnly(checked === true)}
                  data-testid="checkbox-privileged"
                />
                <Label htmlFor="privileged" className="text-sm font-normal cursor-pointer">
                  Privileged Only
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hot"
                  checked={showHotOnly}
                  onCheckedChange={(checked) => setShowHotOnly(checked === true)}
                  data-testid="checkbox-hot"
                />
                <Label htmlFor="hot" className="text-sm font-normal cursor-pointer">
                  Hot Documents Only
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="responsive"
                  checked={showResponsiveOnly}
                  onCheckedChange={(checked) => setShowResponsiveOnly(checked === true)}
                  data-testid="checkbox-responsive"
                />
                <Label htmlFor="responsive" className="text-sm font-normal cursor-pointer">
                  Responsive Only
                </Label>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={clearAllFilters}
              data-testid="button-clear-filters"
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Evidence Documents</CardTitle>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground" data-testid="text-document-count">
                  {filteredDocuments.length} documents
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.doc,.txt,.eml,.msg,.pst,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.mp4,.mov,.avi,.wmv,.mkv"
                  data-testid="input-file-upload"
                />
                <Button
                  variant="default"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-evidence"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Evidence
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReprocessFiles}
                  disabled={isReprocessing}
                  data-testid="button-reprocess-files"
                >
                  {isReprocessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reprocessing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reprocess Files
                    </>
                  )}
                </Button>
                <Link href={`/cases/${caseId}/communications-heatmap`}>
                  <Button
                    variant="outline"
                    data-testid="button-open-heatmap"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Comm Heatmap
                  </Button>
                </Link>
                <Link href={`/cases/${caseId}/issue-heatmap`}>
                  <Button
                    variant="outline"
                    data-testid="button-open-issue-heatmap"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Issue Intel
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : filteredDocuments.length > 0 ? (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => {
                      const isExpanded = expandedRows.has(doc.id);
                      return (
                        <Fragment key={doc.id}>
                          <TableRow className="hover-elevate" data-testid={`document-row-${doc.id}`}>
                            <TableCell className="max-w-md">
                              <div className="flex items-start gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 flex-shrink-0 mt-0.5"
                                  onClick={() => toggleRowExpansion(doc.id)}
                                  data-testid={`button-expand-${doc.id}`}
                                >
                                  <ChevronRight 
                                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                                  />
                                </Button>
                                <div className="flex-1">
                                  <p className="font-medium text-sm mb-1">{doc.subject}</p>
                                  <p className="text-xs text-muted-foreground mb-1">From: {doc.sender}</p>
                                  {doc.aiSnippet && (
                                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                                      AI: {doc.aiSnippet}
                                    </p>
                                  )}
                                  {doc.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {doc.tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          <Tag className="h-3 w-3 mr-1" />
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getSourceIcon(doc.sourceType)}
                                <span className="text-sm capitalize">
                                  {doc.sourceType.replace(/_/g, " ")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {format(new Date(doc.timestamp), "MMM d, yyyy")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {doc.isPrivileged && (
                                  <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Privileged
                                  </Badge>
                                )}
                                {doc.isHot && (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
                                    <Flame className="h-3 w-3 mr-1" />
                                    Hot
                                  </Badge>
                                )}
                                {doc.isResponsive && (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Responsive
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setTagDialogOpen(true);
                                  }}
                                  data-testid={`button-tag-${doc.id}`}
                                >
                                  <Tag className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewDocument(doc);
                                    setPreviewDialogOpen(true);
                                  }}
                                  data-testid={`button-view-${doc.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDownloadDocument?.(doc.id)}
                                  data-testid={`button-download-${doc.id}`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && doc.body && (
                            <TableRow data-testid={`expanded-content-${doc.id}`}>
                              <TableCell colSpan={5} className="bg-muted/30">
                                <div className="pl-8 pr-4 py-4">
                                  <div className="space-y-3">
                                    {doc.recipients && doc.recipients.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">To:</p>
                                        <p className="text-sm">{doc.recipients.join(', ')}</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Email Body:</p>
                                      <div className="bg-background rounded-md p-4 border border-border">
                                        <div className="text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                                          {doc.body}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                      <Link href={`/document-review?caseId=${caseId}&id=${doc.id}`}>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          data-testid={`button-open-review-${doc.id}`}
                                        >
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          Open in Document Review
                                        </Button>
                                      </Link>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleRowExpansion(doc.id)}
                                        data-testid={`button-collapse-${doc.id}`}
                                      >
                                        Collapse
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No documents match the current filters</p>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
        </>
      )}
    
      {/* Tag Document Dialog */}
      {selectedDocument && (
      <TagDocumentDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        documentId={selectedDocument.id}
        documentTitle={selectedDocument.subject}
        existingTags={selectedDocument.tags}
      />
    )}
    
    {/* Email Preview Dialog */}
    <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="pr-8 text-lg">
            {previewDocument?.subject || "Document Preview"}
          </DialogTitle>
        </DialogHeader>
        
        {previewDocument && (
          <div className="flex-shrink-0 border-b pb-4 space-y-2">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground font-medium">From:</span>
              <span className="text-foreground">{previewDocument.sender}</span>
              
              {previewDocument.recipients && previewDocument.recipients.length > 0 && (
                <>
                  <span className="text-muted-foreground font-medium">To:</span>
                  <span className="text-foreground">{previewDocument.recipients.join(', ')}</span>
                </>
              )}
              
              <span className="text-muted-foreground font-medium">Date:</span>
              <span className="text-foreground">
                {format(new Date(previewDocument.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </div>
        )}
        
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="py-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap leading-relaxed text-sm">
                {previewDocument?.body || previewDocument?.aiSnippet || "No content available"}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <div className="flex items-center justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setPreviewDialogOpen(false)}
            data-testid="button-preview-close"
          >
            Close
          </Button>
          {previewDocument && (
            <Button
              variant="default"
              onClick={async () => {
                const docId = previewDocument.id;
                flushSync(() => {
                  setPreviewDialogOpen(false);
                  setPreviewDocument(null);
                });
                await Promise.resolve();
                navigate(`/document-review?caseId=${caseId}&id=${docId}`);
              }}
              data-testid="button-preview-open-review"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Document Review
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}
