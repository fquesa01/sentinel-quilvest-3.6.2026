import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Tag as TagIcon, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tag {
  id: string;
  name: string;
  category: "investigation_type" | "classification" | "priority" | "evidence_type" | "custom";
  color: string;
  description?: string;
  isPreset: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

const TAG_COLORS = [
  "slate", "red", "orange", "amber", "yellow", "lime", "green", "emerald",
  "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"
];

const CATEGORY_LABELS = {
  investigation_type: "Investigation Type",
  classification: "Classification",
  priority: "Priority",
  evidence_type: "Evidence Type",
  custom: "Custom"
};

export default function TagManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newTag, setNewTag] = useState({
    name: "",
    category: "custom" as const,
    color: "blue" as const,
    description: "",
  });

  const { data: user } = useQuery<{ id: string; role: string }>({
    queryKey: ["/api/auth/user"],
  });

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const createTagMutation = useMutation({
    mutationFn: async (tag: typeof newTag) => {
      return await apiRequest("POST", "/api/tags", tag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: "Success", description: "Tag created successfully" });
      setIsCreateDialogOpen(false);
      setNewTag({ name: "", category: "custom", color: "blue", description: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create tag", variant: "destructive" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return await apiRequest("DELETE", `/api/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: "Success", description: "Tag deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tag. Preset tags cannot be deleted.", variant: "destructive" });
    },
  });

  const seedTagsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/tags/seed", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ 
        title: "Success", 
        description: `Successfully seeded ${data.count} preset tags covering all regulatory frameworks and investigation types` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to seed tags", variant: "destructive" });
    },
  });

  const filteredTags = tags.filter(tag => 
    selectedCategory === "all" || tag.category === selectedCategory
  );

  const tagsByCategory = filteredTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      slate: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600",
      red: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100 dark:border-red-600",
      orange: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-600",
      amber: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-600",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-600",
      lime: "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900 dark:text-lime-100 dark:border-lime-600",
      green: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100 dark:border-green-600",
      emerald: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-600",
      teal: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-100 dark:border-teal-600",
      cyan: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900 dark:text-cyan-100 dark:border-cyan-600",
      sky: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900 dark:text-sky-100 dark:border-sky-600",
      blue: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-600",
      indigo: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-100 dark:border-indigo-600",
      violet: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:border-violet-600",
      purple: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-600",
      fuchsia: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900 dark:text-fuchsia-100 dark:border-fuchsia-600",
      pink: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900 dark:text-pink-100 dark:border-pink-600",
      rose: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900 dark:text-rose-100 dark:border-rose-600",
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tag Management</h1>
          <p className="text-muted-foreground">Manage investigation tags and document coding labels</p>
        </div>
        <div className="flex gap-2">
          {tags.length === 0 && user?.role === "admin" && (
            <Button 
              variant="outline" 
              onClick={() => seedTagsMutation.mutate()}
              disabled={seedTagsMutation.isPending}
              data-testid="button-seed-tags"
            >
              <TagIcon className="w-4 h-4 mr-2" />
              {seedTagsMutation.isPending ? "Seeding..." : "Seed Preset Tags"}
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-tag">
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Tag
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Tag</DialogTitle>
              <DialogDescription>
                Create a new custom tag for document coding and categorization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tag Name</Label>
                <Input
                  id="name"
                  placeholder="Enter tag name"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  data-testid="input-tag-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTag.category}
                  onValueChange={(value) => setNewTag({ ...newTag, category: value as any })}
                >
                  <SelectTrigger data-testid="select-tag-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="investigation_type">Investigation Type</SelectItem>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="evidence_type">Evidence Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="grid grid-cols-6 gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTag({ ...newTag, color: color as any })}
                      className={`h-8 rounded border-2 ${
                        newTag.color === color ? "ring-2 ring-primary ring-offset-2" : ""
                      } ${getColorClass(color)}`}
                      data-testid={`button-color-${color}`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter tag description"
                  value={newTag.description}
                  onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                  data-testid="input-tag-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createTagMutation.mutate(newTag)}
                disabled={!newTag.name || createTagMutation.isPending}
                data-testid="button-submit-tag"
              >
                {createTagMutation.isPending ? "Creating..." : "Create Tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tag Library</CardTitle>
          <CardDescription>
            {tags.length} total tags ({tags.filter(t => t.isPreset).length} pre-set, {tags.filter(t => !t.isPreset).length} custom)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-tags">All Tags</TabsTrigger>
              <TabsTrigger value="investigation_type" data-testid="tab-investigation-type">Investigation Type</TabsTrigger>
              <TabsTrigger value="classification" data-testid="tab-classification">Classification</TabsTrigger>
              <TabsTrigger value="priority" data-testid="tab-priority">Priority</TabsTrigger>
              <TabsTrigger value="evidence_type" data-testid="tab-evidence-type">Evidence Type</TabsTrigger>
              <TabsTrigger value="custom" data-testid="tab-custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="space-y-6 mt-6">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading tags...</div>
              ) : filteredTags.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No tags found in this category
                </div>
              ) : selectedCategory === "all" ? (
                Object.entries(tagsByCategory).map(([category, categoryTags]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                      {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categoryTags.map((tag) => (
                        <div
                          key={tag.id}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${getColorClass(tag.color)}`}
                          data-testid={`tag-${tag.name.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          <TagIcon className="w-3 h-3" />
                          <span className="font-medium">{tag.name}</span>
                          {!tag.isPreset && (
                            <button
                              onClick={() => deleteTagMutation.mutate(tag.id)}
                              className="ml-1 hover-elevate active-elevate-2 p-1 rounded"
                              data-testid={`button-delete-${tag.name.replace(/\s+/g, "-").toLowerCase()}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tag) => (
                    <div
                      key={tag.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${getColorClass(tag.color)}`}
                      data-testid={`tag-${tag.name.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      <TagIcon className="w-3 h-3" />
                      <span className="font-medium">{tag.name}</span>
                      {tag.description && (
                        <span className="text-xs opacity-75">- {tag.description}</span>
                      )}
                      {!tag.isPreset && (
                        <button
                          onClick={() => deleteTagMutation.mutate(tag.id)}
                          className="ml-1 hover-elevate active-elevate-2 p-1 rounded"
                          data-testid={`button-delete-${tag.name.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
