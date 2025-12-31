import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, X, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TagDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  existingTags: string[];
}

interface TagData {
  id: string;
  name: string;
  category?: string;
  color?: string;
}

export function TagDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  existingTags,
}: TagDocumentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Fetch all available tags
  const { data: allTags = [], isLoading: isLoadingTags } = useQuery<TagData[]>({
    queryKey: ["/api/tags"],
  });

  // Create new tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const response = await apiRequest("POST", "/api/tags", {
        name: tagName,
        category: "custom",
      });
      return await response.json();
    },
    onSuccess: async (newTag: TagData) => {
      // Wait for tags query to refetch so new tag is available in allTags
      await queryClient.refetchQueries({ queryKey: ["/api/tags"] });
      setSelectedTagIds(prev => new Set([...prev, newTag.id]));
      setNewTagName("");
      toast({
        title: "Tag Created",
        description: `Tag "${newTag.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add tags to document mutation
  const addTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      const promises = tagIds.map(tagId =>
        apiRequest("POST", "/api/tags/entity", {
          entityType: "communication",
          entityId: documentId,
          tagId,
        })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate both communications and cases queries to refresh documents
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Tags Added",
        description: "Tags have been added to the document successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Tags",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "Tag Name Required",
        description: "Please enter a tag name",
        variant: "destructive",
      });
      return;
    }
    createTagMutation.mutate(newTagName.trim());
  };

  const handleSaveTags = () => {
    // Filter out tags that are already on the document
    const tagsToAdd = Array.from(selectedTagIds).filter(tagId => {
      const tag = allTags.find(t => t.id === tagId);
      // If tag not found in allTags (newly created), include it
      if (!tag) return true;
      // If tag name is in existingTags, exclude it (already tagged)
      return !existingTags.includes(tag.name);
    });
    
    if (tagsToAdd.length === 0) {
      toast({
        title: "No New Tags",
        description: "Please select at least one new tag to add.",
        variant: "destructive",
      });
      return;
    }

    addTagsMutation.mutate(tagsToAdd);
  };

  // Pre-select existing tags
  const existingTagIds = allTags
    .filter(tag => existingTags.includes(tag.name))
    .map(tag => tag.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-tag-document">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tag Document
          </DialogTitle>
          <DialogDescription>
            Add tags to "{documentTitle}". Select existing tags or create new ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Tag Section */}
          <div className="space-y-3">
            <Label htmlFor="new-tag-name">Create New Tag</Label>
            <div className="flex gap-2">
              <Input
                id="new-tag-name"
                placeholder="Enter tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                data-testid="input-new-tag-name"
              />
              <Button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTagMutation.isPending}
                size="default"
                data-testid="button-create-tag"
              >
                {createTagMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Select Existing Tags Section */}
          <div className="space-y-3">
            <Label>Select Existing Tags</Label>
            {isLoadingTags ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tags available. Create your first tag above.
              </p>
            ) : (
              <ScrollArea className="h-[250px] rounded-md border p-4">
                <div className="space-y-3">
                  {allTags.map((tag) => {
                    const isExisting = existingTagIds.includes(tag.id);
                    const isSelected = selectedTagIds.has(tag.id);
                    
                    return (
                      <div
                        key={tag.id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleToggleTag(tag.id)}
                          disabled={isExisting}
                          data-testid={`checkbox-tag-${tag.name}`}
                        />
                        <label
                          htmlFor={`tag-${tag.id}`}
                          className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                        >
                          <Badge variant="secondary" className="font-normal">
                            {tag.name}
                          </Badge>
                          {tag.category && (
                            <span className="text-xs text-muted-foreground">
                              ({tag.category})
                            </span>
                          )}
                          {isExisting && (
                            <span className="text-xs text-muted-foreground italic">
                              (Already tagged)
                            </span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected Tags Preview */}
          {selectedTagIds.size > 0 && (
            <div className="space-y-2">
              <Label>Tags to Add ({selectedTagIds.size})</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedTagIds).map((tagId) => {
                  const tag = allTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  
                  return (
                    <Badge
                      key={tagId}
                      variant="default"
                      className="gap-1 cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleToggleTag(tagId)}
                      data-testid={`badge-selected-tag-${tag.name}`}
                    >
                      {tag.name}
                      <X className="h-3 w-3" />
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addTagsMutation.isPending}
            data-testid="button-cancel-tag"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveTags}
            disabled={selectedTagIds.size === 0 || addTagsMutation.isPending}
            data-testid="button-save-tags"
          >
            {addTagsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding Tags...
              </>
            ) : (
              "Add Selected Tags"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}