import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertDocumentSetSchema, type DocumentSet, type Tag, type Communication } from "@shared/schema";
import { z } from "zod";
import { Plus, FolderOpen, FileText, Trash2, Edit, Tags, ArrowLeft, ExternalLink, Hash, FileCheck2, Briefcase, List, LayoutGrid, Grid3X3, Folder, Download, Calendar, Users, File } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = insertDocumentSetSchema.omit({
  createdBy: true,  // Backend will populate this from req.user.id
}).extend({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
});

type FormData = z.infer<typeof formSchema>;

// View mode types
type ViewMode = "list" | "detailed" | "small-folder" | "large-folder";

// Type for tag with document counts and stats
type TagWithCounts = Tag & {
  documentCount: number;
  textSelectionCount: number;
  totalCount: number;
  custodianCount?: number;
  earliestDate?: string;
  latestDate?: string;
  fileTypeCounts?: {
    emails: number;
    pdfs: number;
    word: number;
    excel: number;
    other: number;
  };
};

// Type for tagged document
type TaggedDocument = Communication & {
  tagType: 'document' | 'textSelection';
  textSelectionCount?: number;
};

export default function DocumentSetsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<DocumentSet | null>(null);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [selectedTag, setSelectedTag] = useState<TagWithCounts | null>(null);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("detailed");

  const { data: documentSets = [], isLoading } = useQuery<DocumentSet[]>({
    queryKey: ["/api/document-sets"],
  });

  const { data: cases = [] } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  // Query for tags with document counts
  const tagsQueryKey = selectedCaseFilter 
    ? `/api/tags/document-counts?caseId=${selectedCaseFilter}` 
    : "/api/tags/document-counts";
  
  const { data: tagsWithCounts = [], isLoading: tagsLoading } = useQuery<TagWithCounts[]>({
    queryKey: ["/api/tags/document-counts", selectedCaseFilter],
    queryFn: async () => {
      const response = await fetch(tagsQueryKey);
      if (!response.ok) throw new Error("Failed to fetch tags");
      return response.json();
    },
    enabled: activeTab === "tagged",
  });

  // Query for documents with selected tag
  const { data: tagDocuments = [], isLoading: tagDocsLoading } = useQuery<TaggedDocument[]>({
    queryKey: ["/api/tags", selectedTag?.id, "documents", selectedCaseFilter],
    queryFn: async () => {
      if (!selectedTag) return [];
      const url = selectedCaseFilter 
        ? `/api/tags/${selectedTag.id}/documents?caseId=${selectedCaseFilter}`
        : `/api/tags/${selectedTag.id}/documents`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    enabled: !!selectedTag && activeTab === "tagged",
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      caseId: "",
      category: "investigation",
      color: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/document-sets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-sets"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Document set created",
        description: "The document set has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create document set",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DocumentSet> }) => {
      return apiRequest("PATCH", `/api/document-sets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-sets"] });
      setEditingSet(null);
      toast({
        title: "Document set updated",
        description: "The document set has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update document set",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/document-sets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-sets"] });
      toast({
        title: "Document set deleted",
        description: "The document set has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete document set",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Convert "none" or empty string to undefined for caseId
    const submitData = {
      ...data,
      caseId: (!data.caseId || data.caseId === "none") ? undefined : data.caseId,
    };
    
    if (editingSet) {
      updateMutation.mutate({ id: editingSet.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (set: DocumentSet) => {
    setEditingSet(set);
    form.reset({
      name: set.name,
      description: set.description || "",
      caseId: set.caseId || "",
      category: set.category,
      color: set.color || "",
    });
    setCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this document set? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDocuments = (setId: string, caseId?: string | null) => {
    if (caseId) {
      setLocation(`/cases/${caseId}/document-review?setId=${setId}`);
    } else {
      setLocation(`/document-review?setId=${setId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Document Sets</h1>
          <p className="text-sm text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Group tags by category for display
  const tagsByCategory = tagsWithCounts.reduce((acc, tag) => {
    const category = tag.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, TagWithCounts[]>);

  const handleViewDocument = (docId: string, caseId?: string | null) => {
    if (caseId) {
      setLocation(`/cases/${caseId}/document-review?id=${docId}`);
    } else {
      setLocation(`/document-review?id=${docId}`);
    }
  };

  const handleDownloadExcelReport = async (tag: TagWithCounts) => {
    try {
      const response = await fetch(`/api/tags/${tag.id}/export-excel?caseId=${selectedCaseFilter}`);
      if (!response.ok) throw new Error("Failed to generate report");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tag.name.replace(/[^a-z0-9]/gi, '_')}_report.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Report downloaded",
        description: `Excel report for "${tag.name}" has been downloaded.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not generate the Excel report. Please try again.",
      });
    }
  };

  const renderViewToggle = () => (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setViewMode("list")}
        data-testid="button-view-list"
        className="h-8 px-2"
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        variant={viewMode === "detailed" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setViewMode("detailed")}
        data-testid="button-view-detailed"
        className="h-8 px-2"
      >
        <LayoutGrid className="w-4 h-4" />
      </Button>
      <Button
        variant={viewMode === "small-folder" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setViewMode("small-folder")}
        data-testid="button-view-small-folder"
        className="h-8 px-2"
      >
        <Grid3X3 className="w-4 h-4" />
      </Button>
      <Button
        variant={viewMode === "large-folder" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setViewMode("large-folder")}
        data-testid="button-view-large-folder"
        className="h-8 px-2"
      >
        <Folder className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderFolderListView = (tags: TagWithCounts[]) => (
    <div className="space-y-1">
      {tags.map((tag) => (
        <div 
          key={tag.id}
          className="flex items-center justify-between gap-4 p-3 rounded-lg hover-elevate cursor-pointer bg-card border"
          onClick={() => setSelectedTag(tag)}
          data-testid={`folder-list-${tag.id}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Folder className="w-5 h-5 text-primary shrink-0" style={{ color: tag.color || undefined }} />
            <span className="font-medium truncate">{tag.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary">{tag.totalCount} files</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleDownloadExcelReport(tag); }}
              data-testid={`button-download-${tag.id}`}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFolderDetailedView = (tags: TagWithCounts[]) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {tags.map((tag) => (
        <Card 
          key={tag.id}
          className="hover-elevate cursor-pointer"
          onClick={() => setSelectedTag(tag)}
          data-testid={`folder-detailed-${tag.id}`}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Folder className="w-6 h-6 text-primary" style={{ color: tag.color || undefined }} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{tag.name}</h3>
                  <p className="text-sm text-secondary">{tag.category || 'Uncategorized'}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleDownloadExcelReport(tag); }}
                data-testid={`button-download-${tag.id}`}
              >
                <Download className="w-4 h-4 mr-2" />
                Report
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-tertiary" />
                <span><strong>{tag.totalCount}</strong> files</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-tertiary" />
                <span><strong>{tag.custodianCount ?? '—'}</strong> custodians</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-tertiary" />
                <span>{tag.earliestDate ? format(new Date(tag.earliestDate), "MMM d, yyyy") : '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-tertiary" />
                <span>{tag.latestDate ? format(new Date(tag.latestDate), "MMM d, yyyy") : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderFolderSmallView = (tags: TagWithCounts[]) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="flex flex-col items-center gap-2 p-3 rounded-lg hover-elevate cursor-pointer"
          onClick={() => setSelectedTag(tag)}
          data-testid={`folder-small-${tag.id}`}
        >
          <div className="relative">
            <Folder className="w-12 h-12" style={{ color: tag.color || '#3b82f6' }} />
            <Badge variant="secondary" className="absolute -bottom-1 -right-2 text-xs px-1.5">
              {tag.totalCount}
            </Badge>
          </div>
          <span className="text-xs font-medium text-center truncate w-full">{tag.name}</span>
        </div>
      ))}
    </div>
  );

  const renderFolderLargeView = (tags: TagWithCounts[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="flex flex-col items-center gap-3 p-4 rounded-xl border bg-card hover-elevate cursor-pointer"
          onClick={() => setSelectedTag(tag)}
          data-testid={`folder-large-${tag.id}`}
        >
          <div className="relative">
            <Folder className="w-20 h-20" style={{ color: tag.color || '#3b82f6' }} />
            <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm px-2">
              {tag.totalCount}
            </Badge>
          </div>
          <div className="text-center w-full">
            <h4 className="font-medium truncate">{tag.name}</h4>
            <p className="text-xs text-secondary mt-1">{tag.category || 'Uncategorized'}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-1"
            onClick={(e) => { e.stopPropagation(); handleDownloadExcelReport(tag); }}
            data-testid={`button-download-${tag.id}`}
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      ))}
    </div>
  );

  const renderFoldersByView = (tags: TagWithCounts[]) => {
    switch (viewMode) {
      case "list":
        return renderFolderListView(tags);
      case "detailed":
        return renderFolderDetailedView(tags);
      case "small-folder":
        return renderFolderSmallView(tags);
      case "large-folder":
        return renderFolderLargeView(tags);
      default:
        return renderFolderDetailedView(tags);
    }
  };

  // Tagged Material content - either tag list or document drill-down
  const renderTaggedMaterialContent = () => {
    if (selectedTag) {
      // Show documents for selected tag
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedTag(null)}
              data-testid="button-back-to-tags"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tags
            </Button>
            <div className="flex items-center gap-2">
              <Badge 
                style={{ 
                  backgroundColor: selectedTag.color || undefined,
                  color: selectedTag.color ? '#fff' : undefined 
                }}
              >
                <Hash className="w-3 h-3 mr-1" />
                {selectedTag.name}
              </Badge>
              <span className="text-sm text-secondary">
                {tagDocuments.length} document{tagDocuments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {tagDocsLoading ? (
            <div className="p-8 text-center text-secondary">Loading documents...</div>
          ) : tagDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-tertiary" />
                <h3 className="text-lg font-medium mb-2">No documents found</h3>
                <p className="text-sm text-secondary">
                  No documents are tagged with "{selectedTag.name}"
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tagDocuments.map((doc) => (
                <Card key={doc.id} className="hover-elevate" data-testid={`card-tagged-doc-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.subject || 'Untitled Document'}</div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-secondary">
                          <span>{doc.documentType || 'Document'}</span>
                          {doc.date && (
                            <>
                              <span className="text-tertiary">|</span>
                              <span>{format(new Date(doc.date), "MMM d, yyyy")}</span>
                            </>
                          )}
                          {doc.tagType === 'textSelection' && doc.textSelectionCount && (
                            <>
                              <span className="text-tertiary">|</span>
                              <Badge variant="outline" className="text-xs">
                                {doc.textSelectionCount} selection{doc.textSelectionCount !== 1 ? 's' : ''}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(doc.id, doc.caseId)}
                        data-testid={`button-view-doc-${doc.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Show tag list with counts - require case selection first
    return (
      <div className="space-y-6">
        {/* Case selector and view toggle */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">Select case:</span>
              <Select value={selectedCaseFilter} onValueChange={setSelectedCaseFilter}>
                <SelectTrigger className="w-[250px]" data-testid="select-case-filter">
                  <SelectValue placeholder="Choose a case..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCaseFilter && (
              <div className="text-sm text-secondary">
                {tagsWithCounts.length} folder{tagsWithCounts.length !== 1 ? 's' : ''} with tagged documents
              </div>
            )}
          </div>
          {selectedCaseFilter && tagsWithCounts.length > 0 && renderViewToggle()}
        </div>

        {/* Show prompt to select case if none selected */}
        {!selectedCaseFilter ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-tertiary" />
              <h3 className="text-lg font-medium mb-2">Select a case to view tagged material</h3>
              <p className="text-sm text-secondary mb-4">
                Choose a case from the dropdown above to see all tags and tagged documents for that investigation
              </p>
            </CardContent>
          </Card>
        ) : tagsLoading ? (
          <div className="p-8 text-center text-secondary">Loading folders...</div>
        ) : tagsWithCounts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Tags className="w-12 h-12 mx-auto mb-4 text-tertiary" />
              <h3 className="text-lg font-medium mb-2">No tagged documents in this case</h3>
              <p className="text-sm text-secondary mb-4">
                Start tagging documents in Document Review to see them organized here
              </p>
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/cases/${selectedCaseFilter}/document-review`)}
                data-testid="button-go-to-review"
              >
                <FileText className="w-4 h-4 mr-2" />
                Go to Document Review
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-secondary mb-4 uppercase tracking-wide">
                  {category}
                </h3>
                {renderFoldersByView(categoryTags)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Document Sets</h1>
          <p className="text-sm text-secondary">Organize documents into collections for review and production</p>
        </div>
        {activeTab === "manual" && (
          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setEditingSet(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-set">
                <Plus className="w-4 h-4 mr-2" />
                Create Set
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingSet ? "Edit Document Set" : "Create Document Set"}</DialogTitle>
                <DialogDescription>
                  {editingSet ? "Update the document set details" : "Create a new document set to organize communications"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Key Evidence - FCPA Investigation" {...field} data-testid="input-set-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Optional description" {...field} value={field.value || ""} data-testid="input-set-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="caseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated Case (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-case">
                              <SelectValue placeholder="Select a case" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No case</SelectItem>
                            {cases.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="investigation">Investigation</SelectItem>
                            <SelectItem value="evidence">Evidence</SelectItem>
                            <SelectItem value="privilege">Privilege</SelectItem>
                            <SelectItem value="review_batch">Review Batch</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="#FF5733" {...field} value={field.value || ""} data-testid="input-color" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-set">
                      {editingSet ? "Update Set" : "Create Set"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="manual" data-testid="tab-manual-sets">
            <FolderOpen className="w-4 h-4 mr-2" />
            Manual Sets
          </TabsTrigger>
          <TabsTrigger value="tagged" data-testid="tab-tagged-material">
            <Tags className="w-4 h-4 mr-2" />
            Tagged Material
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          {documentSets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-tertiary" />
                <h3 className="text-lg font-medium mb-2">No document sets yet</h3>
                <p className="text-sm text-secondary mb-4">
                  Create your first document set to organize communications for review or production
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-set">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Set
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentSets.map((set) => (
                <Card key={set.id} className="hover-elevate" data-testid={`card-set-${set.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{set.name}</CardTitle>
                        {set.description && (
                          <CardDescription className="mt-1">{set.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(set)}
                          data-testid={`button-edit-set-${set.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(set.id)}
                          data-testid={`button-delete-set-${set.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">Documents</span>
                        <Badge variant="secondary" data-testid={`badge-count-${set.id}`}>
                          <FileText className="w-3 h-3 mr-1" />
                          {set.documentCount}
                        </Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" data-testid={`badge-category-${set.id}`}>{set.category}</Badge>
                        {set.color && (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: set.color }} />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-tertiary">
                        Created {format(new Date(set.createdAt), "MMM d, yyyy")}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewDocuments(set.id, set.caseId)}
                        data-testid={`button-view-documents-${set.id}`}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Documents
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tagged">
          {renderTaggedMaterialContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
