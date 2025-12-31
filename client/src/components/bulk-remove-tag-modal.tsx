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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Tag, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BulkRemoveTagModalProps {
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

interface BulkTagRemovalPreview {
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
}

export function BulkRemoveTagModal({
  open,
  onOpenChange,
  searchSnapshot,
  selectedDocumentIds,
  onSuccess,
}: BulkRemoveTagModalProps) {
  const { toast } = useToast();
  
  // Form state
  const [scope, setScope] = useState<'selected' | 'all_results'>('selected');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [includeFamilies, setIncludeFamilies] = useState(false);
  const [includeThreads, setIncludeThreads] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [showSampleDocs, setShowSampleDocs] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [backendRequiresConfirmation, setBackendRequiresConfirmation] = useState(false);

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setBackendRequiresConfirmation(false);
      setShowSampleDocs(false);
    }
  }, [open]);

  // Fetch available tags
  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ['/api/tags'],
    enabled: open,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/bulk-tag/remove/preview', data);
      return response.json();
    },
  });

  // Execute bulk tag removal mutation
  const bulkRemoveTagMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/bulk-tag/remove', data);
      
      if (!response.ok) {
        const error = await response.json();
        if (error.requiresConfirmation) {
          throw new Error('REQUIRES_CONFIRMATION');
        }
        throw new Error(error.message || 'Failed to remove bulk tag');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk tag removed",
        description: `Successfully removed tag from ${data.documentsAffected || 0} documents`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tags/entity'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      if (error.message === 'REQUIRES_CONFIRMATION') {
        setBackendRequiresConfirmation(true);
        // Refetch preview to ensure counts are up-to-date
        previewMutation.mutate({
          searchSnapshot,
          scope,
          selectedIds: scope === 'selected' ? selectedDocumentIds : undefined,
          tagId: selectedTagId,
          options: {
            includeFamilies,
            includeDuplicates,
            includeThreads,
          },
        });
        toast({
          title: "Confirmation required",
          description: "This operation affects more than 10,000 documents. Please review and confirm below.",
        });
      } else {
        toast({
          title: "Failed to remove bulk tag",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Auto-fetch preview when parameters change
  const preview = previewMutation.data as BulkTagRemovalPreview | undefined;
  
  useEffect(() => {
    if (open && selectedTagId) {
      previewMutation.mutate({
        searchSnapshot,
        scope,
        selectedIds: scope === 'selected' ? selectedDocumentIds : undefined,
        tagId: selectedTagId,
        options: {
          includeFamilies,
          includeDuplicates,
          includeThreads,
        },
      });
    }
  }, [open, scope, selectedTagId, includeFamilies, includeDuplicates, includeThreads]);

  const handleRemoveTag = async () => {
    if (!selectedTagId) {
      toast({
        title: "No tag selected",
        description: "Please select a tag to remove",
        variant: "destructive",
      });
      return;
    }

    // Execute bulk tag removal
    bulkRemoveTagMutation.mutate({
      searchSnapshot,
      scope,
      selectedIds: scope === 'selected' ? selectedDocumentIds : undefined,
      tagId: selectedTagId,
      options: {
        includeFamilies,
        includeDuplicates,
        includeThreads,
      },
      confirmed,
    });
  };

  const requiresConfirmation = (preview?.totalAffected || 0) > 10000 || backendRequiresConfirmation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Bulk Remove Tag from Documents
          </DialogTitle>
          <DialogDescription>
            Remove an existing tag from multiple documents at once
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
                  id="remove-scope-selected"
                  checked={scope === 'selected'}
                  onChange={() => setScope('selected')}
                  className="h-4 w-4"
                  data-testid="radio-remove-scope-selected"
                />
                <label htmlFor="remove-scope-selected" className="text-sm">
                  Selected documents only ({selectedDocumentIds.length} items)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="remove-scope-all"
                  checked={scope === 'all_results'}
                  onChange={() => setScope('all_results')}
                  className="h-4 w-4"
                  data-testid="radio-remove-scope-all"
                />
                <label htmlFor="remove-scope-all" className="text-sm">
                  All results in this search ({searchSnapshot.resultCount || 0} items)
                </label>
              </div>
            </div>
          </div>

          {/* Tag Selection */}
          <div className="space-y-2">
            <Label htmlFor="remove-tag-select">Select Tag to Remove</Label>
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger id="remove-tag-select" data-testid="select-remove-tag">
                <SelectValue placeholder="Select tag to remove..." />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`bg-${tag.color}-100 dark:bg-${tag.color}-900`}
                      >
                        {tag.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({tag.category})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Options */}
          <div className="space-y-2">
            <Label>Advanced Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remove-include-families"
                  checked={includeFamilies}
                  onCheckedChange={(checked) => setIncludeFamilies(checked as boolean)}
                  data-testid="checkbox-remove-include-families"
                />
                <label htmlFor="remove-include-families" className="text-sm">
                  Include email families (entire email threads)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remove-include-threads"
                  checked={includeThreads}
                  onCheckedChange={(checked) => setIncludeThreads(checked as boolean)}
                  data-testid="checkbox-remove-include-threads"
                />
                <label htmlFor="remove-include-threads" className="text-sm">
                  Include message thread neighbors (chat conversations)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remove-include-duplicates"
                  checked={includeDuplicates}
                  onCheckedChange={(checked) => setIncludeDuplicates(checked as boolean)}
                  data-testid="checkbox-remove-include-duplicates"
                />
                <label htmlFor="remove-include-duplicates" className="text-sm">
                  Detect duplicate documents
                </label>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {previewMutation.isPending && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Calculating impact...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Preview: {preview.totalAffected} document(s) will be affected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold">Base Documents</div>
                    <div>{preview.baseDocuments}</div>
                  </div>
                  {includeFamilies && preview.familyMembers > 0 && (
                    <div>
                      <div className="font-semibold">+ Family Members</div>
                      <div>{preview.familyMembers}</div>
                    </div>
                  )}
                  {includeThreads && preview.threadMembers > 0 && (
                    <div>
                      <div className="font-semibold">+ Thread Members</div>
                      <div>{preview.threadMembers}</div>
                    </div>
                  )}
                  {includeDuplicates && preview.duplicates > 0 && (
                    <div>
                      <div className="font-semibold">+ Duplicates</div>
                      <div>{preview.duplicates}</div>
                    </div>
                  )}
                </div>

                {requiresConfirmation && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <div className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Large Operation
                      </div>
                      <div className="text-yellow-700 dark:text-yellow-300">
                        This will affect over 10,000 documents. Please review carefully.
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <Checkbox
                          id="remove-confirm-large-op"
                          checked={confirmed}
                          onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                          data-testid="checkbox-remove-confirm-large"
                        />
                        <label htmlFor="remove-confirm-large-op" className="text-sm font-medium">
                          I understand and want to proceed
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample Documents */}
                {preview.sampleDocuments && preview.sampleDocuments.length > 0 && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSampleDocs(!showSampleDocs)}
                      className="text-xs"
                      data-testid="button-toggle-sample-docs"
                    >
                      {showSampleDocs ? 'Hide' : 'Show'} Sample Documents ({preview.sampleDocuments.length})
                    </Button>
                    {showSampleDocs && (
                      <ScrollArea className="h-48 mt-2 border rounded-md">
                        <div className="p-3 space-y-2">
                          {preview.sampleDocuments.map((doc) => (
                            <div
                              key={doc.id}
                              className="text-xs p-2 bg-muted rounded-sm"
                            >
                              <div className="font-medium">{doc.subject || '(No subject)'}</div>
                              <div className="text-muted-foreground">
                                From: {doc.sender} | {format(new Date(doc.timestamp), 'MMM d, yyyy')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-remove-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRemoveTag}
            disabled={
              !selectedTagId ||
              previewMutation.isPending ||
              bulkRemoveTagMutation.isPending ||
              (requiresConfirmation && !confirmed)
            }
            data-testid="button-remove-tag"
          >
            {bulkRemoveTagMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Remove Tag
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
