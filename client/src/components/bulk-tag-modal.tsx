import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Tag, AlertTriangle, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DuplicateViewer } from "@/components/duplicate-viewer";

interface BulkTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchSnapshot: {
    query?: string;
    filters?: {
      caseId?: string;
      employeeIds?: string[];
      departmentIds?: string[];
      dateRange?: { start: string; end: string };
      documentSetId?: string;
      searchMode?: 'natural' | 'boolean';
    };
    resultCount?: number;
  };
  selectedDocumentIds: string[];
  onSuccess?: () => void;
}

interface BulkTagPreview {
  baseDocuments: number;
  familyMembers: number;
  duplicates: number;
  threadMembers: number;
  totalAffected: number;
  sampleDocuments: Array<{
    id: string;
    subject: string;
    sender: string;
    timestamp: Date;
    sourceType: 'communication' | 'chat';
  }>;
  duplicateInfo?: {
    hasDuplicates: boolean;
    duplicateCount: number;
    duplicateGroups: Array<{
      type: string;
      count: number;
      sample: string;
    }>;
  };
}

export function BulkTagModal({
  open,
  onOpenChange,
  searchSnapshot,
  selectedDocumentIds,
  onSuccess,
}: BulkTagModalProps) {
  const { toast } = useToast();
  
  // Form state
  const [scope, setScope] = useState<'selected' | 'all_results'>('selected');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [newTagName, setNewTagName] = useState('');
  const [includeFamilies, setIncludeFamilies] = useState(false);
  const [includeThreads, setIncludeThreads] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [showSampleDocs, setShowSampleDocs] = useState(false);
  const [showDuplicateViewer, setShowDuplicateViewer] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Fetch available tags
  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ['/api/tags'],
    enabled: open,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/bulk-tag/preview', data);
      return response.json();
    },
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (tagData: any) => {
      const response = await apiRequest('POST', '/api/tags', tagData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
    },
  });

  // Execute bulk tag mutation
  const bulkTagMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/bulk-tag', data);
      
      if (!response.ok) {
        const error = await response.json();
        if (error.requiresConfirmation) {
          throw new Error('REQUIRES_CONFIRMATION');
        }
        throw new Error(error.message || 'Failed to apply bulk tag');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bulk tag applied",
        description: `Successfully tagged ${preview?.totalAffected || 0} documents`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tags/entity'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      if (error.message === 'REQUIRES_CONFIRMATION') {
        setConfirmed(false);
        toast({
          title: "Confirmation required",
          description: "This operation affects more than 10,000 documents. Please review and confirm.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to apply bulk tag",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Auto-fetch preview when parameters change
  const preview = previewMutation.data as BulkTagPreview | undefined;
  
  useEffect(() => {
    if (open && (selectedTagId || newTagName)) {
      previewMutation.mutate({
        searchSnapshot,
        scope,
        selectedIds: scope === 'selected' ? selectedDocumentIds : undefined,
        tagId: selectedTagId || 'temp', // Use temp ID for preview
        options: {
          includeFamilies,
          includeDuplicates,
          includeThreads,
        },
      });
    }
  }, [open, scope, selectedTagId, newTagName, includeFamilies, includeDuplicates, includeThreads]);

  const handleApplyTag = async () => {
    let tagId = selectedTagId;

    // Create new tag if specified
    if (newTagName && !selectedTagId) {
      try {
        const newTag = await createTagMutation.mutateAsync({
          name: newTagName,
          category: 'classification',
          color: 'blue',
        });
        tagId = newTag.id;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: "Failed to create tag",
          description: errorMessage || "Please try again",
          variant: "destructive",
        });
        return;
      }
    }

    if (!tagId) {
      toast({
        title: "No tag selected",
        description: "Please select or create a tag",
        variant: "destructive",
      });
      return;
    }

    // Execute bulk tag
    bulkTagMutation.mutate({
      searchSnapshot,
      scope,
      selectedIds: scope === 'selected' ? selectedDocumentIds : undefined,
      tagId,
      options: {
        includeFamilies,
        includeDuplicates,
        includeThreads,
      },
      confirmed,
    });
  };

  const requiresConfirmation = (preview?.totalAffected || 0) > 10000;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Bulk Tag Documents
          </DialogTitle>
          <DialogDescription>
            Apply a tag to multiple documents at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Scope Selection */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="scope-selected"
                  checked={scope === 'selected'}
                  onChange={() => setScope('selected')}
                  className="h-4 w-4"
                  data-testid="radio-scope-selected"
                />
                <label htmlFor="scope-selected" className="text-sm">
                  Selected documents only ({selectedDocumentIds.length} items)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="scope-all"
                  checked={scope === 'all_results'}
                  onChange={() => setScope('all_results')}
                  className="h-4 w-4"
                  data-testid="radio-scope-all"
                />
                <label htmlFor="scope-all" className="text-sm">
                  All results in this search ({searchSnapshot.resultCount || 0} items)
                </label>
              </div>
            </div>
          </div>

          {/* Tag Selection */}
          <div className="space-y-2">
            <Label>Tag</Label>
            <div className="space-y-3">
              <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                <SelectTrigger data-testid="select-tag">
                  <SelectValue placeholder="Select existing tag..." />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">or</span>
              </div>

              <div className="space-y-1">
                <Input
                  placeholder="Create new tag..."
                  value={newTagName}
                  onChange={(e) => {
                    setNewTagName(e.target.value);
                    setSelectedTagId('');
                  }}
                  data-testid="input-new-tag"
                />
                {newTagName && (
                  <p className="text-xs text-muted-foreground">
                    Will create new tag: {newTagName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Propagation Options */}
          <div className="space-y-2">
            <Label>Advanced Options</Label>
            <div className="space-y-2 border rounded-md p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-families"
                  checked={includeFamilies}
                  onCheckedChange={(checked) => setIncludeFamilies(checked as boolean)}
                  data-testid="checkbox-include-families"
                />
                <label htmlFor="include-families" className="text-sm">
                  Include email families (entire email threads)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-threads"
                  checked={includeThreads}
                  onCheckedChange={(checked) => setIncludeThreads(checked as boolean)}
                  data-testid="checkbox-include-threads"
                />
                <label htmlFor="include-threads" className="text-sm">
                  Include message thread neighbors (chat conversations)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detect-duplicates"
                  checked={includeDuplicates}
                  onCheckedChange={(checked) => setIncludeDuplicates(checked as boolean)}
                  data-testid="checkbox-detect-duplicates"
                />
                <label htmlFor="detect-duplicates" className="text-sm">
                  Detect duplicate documents
                </label>
              </div>
            </div>
          </div>

          {/* Impact Preview */}
          {previewMutation.isSuccess && preview && (
            <div className="space-y-3">
              <Label>Impact Summary</Label>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Estimated affected documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Base documents:</div>
                    <div className="font-medium">{preview.baseDocuments.toLocaleString()}</div>
                    
                    {includeFamilies && preview.familyMembers > 0 && (
                      <>
                        <div>+ Family members:</div>
                        <div className="font-medium">{preview.familyMembers.toLocaleString()}</div>
                      </>
                    )}
                    
                    {includeThreads && preview.threadMembers > 0 && (
                      <>
                        <div>+ Thread members:</div>
                        <div className="font-medium">{preview.threadMembers.toLocaleString()}</div>
                      </>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total:</span>
                      <span className="text-lg">{preview.totalAffected.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {preview.sampleDocuments.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSampleDocs(!showSampleDocs)}
                        className="flex-1"
                        data-testid="button-toggle-samples"
                      >
                        {showSampleDocs ? 'Hide' : 'View'} sample ({preview.sampleDocuments.length} docs)
                      </Button>
                    )}
                    {preview.duplicateInfo?.hasDuplicates && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDuplicateViewer(true)}
                        className="flex-1"
                        data-testid="button-view-duplicates"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        View Duplicates ({preview.duplicateInfo.duplicateCount})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sample Documents */}
              {showSampleDocs && preview.sampleDocuments.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Sample Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {preview.sampleDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3 border rounded-md text-sm space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium line-clamp-1">{doc.subject}</div>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {doc.sourceType}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              From: {doc.sender} • {format(new Date(doc.timestamp), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Confirmation for large operations */}
              {requiresConfirmation && (
                <Card className="border-destructive">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium">Large Operation Detected</p>
                        <p className="text-sm text-muted-foreground">
                          This operation will affect more than 10,000 documents. Please review carefully and confirm.
                        </p>
                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id="confirm-large"
                            checked={confirmed}
                            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                            data-testid="checkbox-confirm-large"
                          />
                          <label htmlFor="confirm-large" className="text-sm font-medium">
                            I understand and want to proceed
                          </label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {previewMutation.isPending && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleApplyTag}
            disabled={
              (!selectedTagId && !newTagName) ||
              bulkTagMutation.isPending ||
              createTagMutation.isPending ||
              (requiresConfirmation && !confirmed && previewMutation.isSuccess)
            }
            data-testid="button-apply-bulk-tag"
          >
            {(bulkTagMutation.isPending || createTagMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {previewMutation.isPending ? 'Loading preview...' : requiresConfirmation && !confirmed ? 'Review & Confirm' : 'Apply Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Duplicate Viewer Dialog */}
    {showDuplicateViewer && (
      <DuplicateViewer
        open={showDuplicateViewer}
        onOpenChange={setShowDuplicateViewer}
        documentIds={{
          communicationIds: scope === 'selected' 
            ? selectedDocumentIds.filter(id => id.startsWith('comm_')).map(id => id.replace(/^comm_/, ''))
            : [], // We'd need to resolve search snapshot here, but we already have the preview info
          chatMessageIds: scope === 'selected'
            ? selectedDocumentIds.filter(id => id.startsWith('chat_')).map(id => id.replace(/^chat_/, ''))
            : [],
        }}
        options={{
          includeNearDuplicates: true,
          includeThreadDuplicates: true,
        }}
      />
    )}
    </>
  );
}
