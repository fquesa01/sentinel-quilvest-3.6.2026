import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, FolderOpen, Trash2, Lock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AdvancedFilters } from "@/hooks/use-advanced-filters";

interface SavedSearch {
  id: string;
  searchName: string;
  description?: string;
  query?: string;
  conditions?: any;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
}

interface SavedSearchesManagerProps {
  caseId?: string;
  currentFilters: AdvancedFilters;
  onLoadSearch: (filters: AdvancedFilters) => void;
}

export function SavedSearchesManager({ caseId, currentFilters, onLoadSearch }: SavedSearchesManagerProps) {
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Fetch saved searches
  const { data: savedSearches = [], refetch } = useQuery<SavedSearch[]>({
    queryKey: ['/api/saved-searches', caseId],
    enabled: loadDialogOpen,
  });

  // Create saved search mutation
  const createSearchMutation = useMutation({
    mutationFn: async (data: { searchName: string; description?: string; isPublic: boolean }) => {
      // Serialize filters for safe JSON storage
      const serializedFilters = Object.entries(currentFilters).reduce((acc, [key, value]) => {
        if (value instanceof Date) {
          acc[key] = value.toISOString();
        } else if (value instanceof RegExp) {
          acc[key] = value.source;
        } else if (Array.isArray(value)) {
          acc[key] = value;
        } else if (value != null) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      return await apiRequest('POST', '/api/saved-searches', {
        caseId,
        searchName: data.searchName,
        description: data.description,
        query: currentFilters.query || '',
        conditions: serializedFilters,
        isPublic: data.isPublic ? 'true' : 'false', // Convert boolean to string
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast({
        title: "Search saved",
        description: "Your search filters have been saved successfully.",
      });
      setSaveDialogOpen(false);
      setSearchName("");
      setDescription("");
      setIsPublic(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save search",
      });
    },
  });

  // Delete saved search mutation
  const deleteSearchMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/saved-searches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast({
        title: "Search deleted",
        description: "Saved search has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete search",
      });
    },
  });

  const handleSave = () => {
    if (!searchName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter a name for this search.",
      });
      return;
    }
    createSearchMutation.mutate({
      searchName: searchName.trim(),
      description: description.trim() || undefined,
      isPublic,
    });
  };

  const handleLoad = (search: SavedSearch) => {
    if (search.conditions) {
      // Hydrate dates from ISO strings
      const hydratedFilters = Object.entries(search.conditions).reduce((acc, [key, value]) => {
        // Convert date strings back to Date objects
        if (key.includes('date') && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          acc[key] = value; // Keep as ISO string, useAdvancedFilters expects strings
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      onLoadSearch(hydratedFilters as AdvancedFilters);
      toast({
        title: "Search loaded",
        description: `Loaded filters from "${search.searchName}"`,
      });
      setLoadDialogOpen(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete saved search "${name}"?`)) {
      deleteSearchMutation.mutate(id);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Save Current Search */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="button-save-search">
            <Save className="w-4 h-4 mr-2" />
            Save Search
          </Button>
        </DialogTrigger>
        <DialogContent data-testid="dialog-save-search">
          <DialogHeader>
            <DialogTitle>Save Current Search</DialogTitle>
            <DialogDescription>
              Save your current filter settings to reuse later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name *</Label>
              <Input
                id="search-name"
                data-testid="input-search-name"
                placeholder="e.g., Executive Emails Q1 2024"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-description">Description (Optional)</Label>
              <Textarea
                id="search-description"
                data-testid="textarea-search-description"
                placeholder="Describe what this search is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public-search"
                data-testid="checkbox-public-search"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
              />
              <Label htmlFor="public-search" className="text-sm font-normal cursor-pointer">
                Make this search public (visible to all users)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              data-testid="button-cancel-save"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createSearchMutation.isPending}
              data-testid="button-confirm-save"
            >
              {createSearchMutation.isPending ? "Saving..." : "Save Search"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Saved Search */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="button-load-search">
            <FolderOpen className="w-4 h-4 mr-2" />
            Load Search
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl" data-testid="dialog-load-search">
          <DialogHeader>
            <DialogTitle>Load Saved Search</DialogTitle>
            <DialogDescription>
              Select a saved search to apply its filters.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            {savedSearches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-searches">
                No saved searches found. Save your current filters to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover-elevate active-elevate-2"
                    data-testid={`search-item-${search.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium" data-testid={`search-name-${search.id}`}>
                          {search.searchName}
                        </h4>
                        {search.isPublic ? (
                          <Globe className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      {search.description && (
                        <p className="text-sm text-muted-foreground mb-2" data-testid={`search-description-${search.id}`}>
                          {search.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(search.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleLoad(search)}
                        data-testid={`button-load-${search.id}`}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(search.id, search.searchName)}
                        disabled={deleteSearchMutation.isPending}
                        data-testid={`button-delete-${search.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
