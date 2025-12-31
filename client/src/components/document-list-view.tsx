import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  Circle,
  FileText,
  Paperclip,
  Shield,
  AlertTriangle,
  Clock,
  User,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquare,
  FolderTree,
  Mail,
  Brain,
} from "lucide-react";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Communication = {
  id: string;
  communicationType: string;
  subject: string;
  body: string;
  sender: string;
  recipients: string[];
  timestamp: string;
  legalHold: string | null;
  complianceScore?: number | null;
  riskLevel?: string | null;
  containsAttachments?: string;
  attachmentCount?: number;
  isDuplicate?: boolean;
  duplicateCount?: number;
  isNearDuplicate?: boolean;
  nearDuplicateClusterId?: string;
  threadId?: string;
  threadPosition?: number;
  isInclusiveEmail?: boolean;
  familyId?: string;
  isParentDocument?: boolean;
  familyMemberCount?: number;
  tarPrediction?: {
    category: string;
    confidence: number;
    isReviewed?: boolean;
  };
};

type DocumentCoding = {
  id: string;
  documentId: string;
  reviewedAt: string;
  reviewerId: string;
  responsiveness?: string;
  isPrivileged?: string;
  isHot?: string;
  reviewNotes?: string;
};

type DocumentListViewProps = {
  documents: Communication[];
  documentCodings: Record<string, DocumentCoding>;
  selectedDocumentId?: string;
  onSelectDocument: (docId: string) => void;
  onSelectMultiple?: (docIds: string[]) => void;
  sortOrder?: 'asc' | 'desc';
};

export function DocumentListView({
  documents,
  documentCodings,
  selectedDocumentId,
  onSelectDocument,
  onSelectMultiple,
  sortOrder = 'desc',
}: DocumentListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewFilter, setReviewFilter] = useState<'all' | 'reviewed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'sender' | 'status'>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFilters, setExpandedFilters] = useState(false);

  // Filter documents based on review status and search
  const filteredDocuments = documents.filter(doc => {
    const coding = documentCodings[doc.id];
    const isReviewed = !!coding?.reviewedAt;
    
    // Review status filter
    if (reviewFilter === 'reviewed' && !isReviewed) return false;
    if (reviewFilter === 'pending' && isReviewed) return false;
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        doc.subject.toLowerCase().includes(search) ||
        doc.sender.toLowerCase().includes(search) ||
        doc.body.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  // Sort documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      case 'subject':
        return a.subject.localeCompare(b.subject);
      case 'sender':
        return a.sender.localeCompare(b.sender);
      case 'status':
        const aReviewed = !!documentCodings[a.id]?.reviewedAt;
        const bReviewed = !!documentCodings[b.id]?.reviewedAt;
        return aReviewed === bReviewed ? 0 : aReviewed ? 1 : -1;
      default:
        return 0;
    }
  });

  const handleSelectDocument = (docId: string) => {
    const newSelected = new Set(selectedIds);
    if (selectedIds.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedIds(newSelected);
    onSelectMultiple?.(Array.from(newSelected));
  };

  const handleSelectAll = (checked: boolean) => {
    const newSet = checked 
      ? new Set<string>(sortedDocuments.map(d => d.id))
      : new Set<string>();
    setSelectedIds(newSet);
    onSelectMultiple?.(Array.from(newSet));
  };

  const reviewedCount = documents.filter(d => documentCodings[d.id]?.reviewedAt).length;
  const pendingCount = documents.length - reviewedCount;

  return (
    <div className="flex flex-col h-full">
      {/* Filters and Controls */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === sortedDocuments.length && sortedDocuments.length > 0}
              onCheckedChange={handleSelectAll}
              data-testid="checkbox-select-all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" data-testid="badge-reviewed-count">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
              {reviewedCount} Reviewed
            </Badge>
            <Badge variant="outline" data-testid="badge-pending-count">
              <Circle className="h-3 w-3 mr-1 text-orange-500" />
              {pendingCount} Pending
            </Badge>
          </div>
        </div>

        <Collapsible open={expandedFilters} onOpenChange={setExpandedFilters}>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              data-testid="input-search-documents"
            />
            <Select value={reviewFilter} onValueChange={(v: any) => setReviewFilter(v)}>
              <SelectTrigger className="w-40" data-testid="select-review-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-32" data-testid="select-sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="subject">Subject</SelectItem>
                <SelectItem value="sender">Sender</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-toggle-filters">
                <Filter className="h-4 w-4 mr-2" />
                {expandedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="pt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Additional filters: Legal Hold, Privilege Status, Compliance Risk, etc.</span>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Document List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No documents match your filters</p>
            </div>
          ) : (
            sortedDocuments.map((doc) => {
              const coding = documentCodings[doc.id];
              const isReviewed = !!coding?.reviewedAt;
              const isSelected = doc.id === selectedDocumentId;
              const isMultiSelected = selectedIds.has(doc.id);

              return (
                <Card
                  key={doc.id}
                  className={`hover-elevate cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-accent/50' : ''
                  }`}
                  onClick={() => onSelectDocument(doc.id)}
                  data-testid={`doc-item-${doc.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox */}
                      <Checkbox
                        checked={isMultiSelected}
                        onCheckedChange={() => handleSelectDocument(doc.id)}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`checkbox-doc-${doc.id}`}
                      />

                      {/* Review Status Icon */}
                      <div className="mt-1">
                        {isReviewed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" data-testid={`icon-reviewed-${doc.id}`} />
                        ) : (
                          <Circle className="h-5 w-5 text-orange-500" data-testid={`icon-pending-${doc.id}`} />
                        )}
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0 overflow-hidden space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm line-clamp-1 flex-1 min-w-0" data-testid={`text-subject-${doc.id}`}>
                            {doc.subject}
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0" data-testid={`text-date-${doc.id}`}>
                            {format(new Date(doc.timestamp), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate" data-testid={`text-sender-${doc.id}`}>{doc.sender}</span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 break-all whitespace-normal overflow-hidden" data-testid={`text-preview-${doc.id}`}>
                          {doc.body}
                        </p>

                        {/* Document Badges */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {doc.legalHold === 'active' && (
                            <Badge variant="destructive" className="text-xs" data-testid={`badge-legal-hold-${doc.id}`}>
                              Legal Hold
                            </Badge>
                          )}
                          {coding?.isPrivileged === 'true' && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-privileged-${doc.id}`}>
                              <Shield className="h-3 w-3 mr-1" />
                              Privileged
                            </Badge>
                          )}
                          {coding?.isHot === 'true' && (
                            <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20" data-testid={`badge-hot-${doc.id}`}>
                              <AlertTriangle className="h-3 w-3 mr-1 text-orange-600" />
                              Hot Doc
                            </Badge>
                          )}
                          {doc.containsAttachments === 'true' && doc.attachmentCount && doc.attachmentCount > 0 && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-attachments-${doc.id}`}>
                              <Paperclip className="h-3 w-3 mr-1" />
                              {doc.attachmentCount}
                            </Badge>
                          )}
                          {/* E-Discovery Indicators */}
                          {doc.isDuplicate && (
                            <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20" data-testid={`badge-duplicate-${doc.id}`}>
                              <Copy className="h-3 w-3 mr-1 text-purple-600" />
                              Duplicate{doc.duplicateCount && doc.duplicateCount > 1 ? ` (${doc.duplicateCount})` : ''}
                            </Badge>
                          )}
                          {doc.isNearDuplicate && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-900/20" data-testid={`badge-near-duplicate-${doc.id}`}>
                              <Copy className="h-3 w-3 mr-1 text-indigo-600" />
                              Near-Dup
                            </Badge>
                          )}
                          {doc.threadId && (
                            <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20" data-testid={`badge-thread-${doc.id}`}>
                              <MessageSquare className="h-3 w-3 mr-1 text-blue-600" />
                              Thread{doc.threadPosition ? ` #${doc.threadPosition}` : ''}
                              {doc.isInclusiveEmail && ' (Inc)'}
                            </Badge>
                          )}
                          {doc.familyId && (
                            <Badge variant="outline" className="text-xs bg-teal-50 dark:bg-teal-900/20" data-testid={`badge-family-${doc.id}`}>
                              {doc.isParentDocument ? (
                                <Mail className="h-3 w-3 mr-1 text-teal-600" />
                              ) : (
                                <FolderTree className="h-3 w-3 mr-1 text-teal-600" />
                              )}
                              {doc.isParentDocument ? 'Parent' : 'Attachment'}
                              {doc.familyMemberCount && doc.familyMemberCount > 1 ? ` (${doc.familyMemberCount})` : ''}
                            </Badge>
                          )}
                          {/* TAR Prediction Badge */}
                          {doc.tarPrediction && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                doc.tarPrediction.category === 'responsive' ? 'bg-green-50 dark:bg-green-900/20' :
                                doc.tarPrediction.category === 'non_responsive' ? 'bg-gray-50 dark:bg-gray-900/20' :
                                doc.tarPrediction.category === 'privileged' ? 'bg-amber-50 dark:bg-amber-900/20' :
                                doc.tarPrediction.category === 'hot' ? 'bg-red-50 dark:bg-red-900/20' :
                                'bg-blue-50 dark:bg-blue-900/20'
                              }`}
                              data-testid={`badge-tar-prediction-${doc.id}`}
                            >
                              <Brain className={`h-3 w-3 mr-1 ${
                                doc.tarPrediction.category === 'responsive' ? 'text-green-600' :
                                doc.tarPrediction.category === 'non_responsive' ? 'text-gray-600' :
                                doc.tarPrediction.category === 'privileged' ? 'text-amber-600' :
                                doc.tarPrediction.category === 'hot' ? 'text-red-600' :
                                'text-blue-600'
                              }`} />
                              AI: {doc.tarPrediction.category.replace('_', '-')} ({Math.round(doc.tarPrediction.confidence * 100)}%)
                            </Badge>
                          )}
                          {doc.complianceScore !== null && doc.complianceScore !== undefined && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                doc.riskLevel === 'Critical' ? 'bg-red-50 dark:bg-red-900/20' :
                                doc.riskLevel === 'High' ? 'bg-orange-50 dark:bg-orange-900/20' :
                                doc.riskLevel === 'Medium' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                                'bg-green-50 dark:bg-green-900/20'
                              }`}
                              data-testid={`badge-compliance-${doc.id}`}
                            >
                              Risk: {doc.riskLevel}
                            </Badge>
                          )}
                          {isReviewed && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-review-date-${doc.id}`}>
                              <Clock className="h-3 w-3 mr-1" />
                              Reviewed {format(new Date(coding.reviewedAt), 'MMM d')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Bulk Actions Footer (shown when documents are selected) */}
      {selectedIds.size > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedIds.size} document{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                data-testid="button-clear-selection"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectMultiple?.(Array.from(selectedIds))}
                data-testid="button-bulk-action"
              >
                Bulk Actions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
