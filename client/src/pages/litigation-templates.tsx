import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { 
  Upload, Search, FileText, FileSpreadsheet, File, Star, StarOff, 
  Download, Trash2, Edit, Clock, Filter, Grid, List, Plus, X, Tag
} from "lucide-react";
import type { LitigationTemplateWithDetails } from "@shared/schema";

const CATEGORIES = [
  { value: "pleadings", label: "Pleadings" },
  { value: "discovery", label: "Discovery" },
  { value: "motions", label: "Motions" },
  { value: "memoranda", label: "Memoranda" },
  { value: "correspondence", label: "Correspondence" },
  { value: "contracts", label: "Contracts" },
  { value: "other", label: "Other" },
];

const JURISDICTIONS = [
  { value: "federal", label: "Federal" },
  { value: "state_ca", label: "California" },
  { value: "state_ny", label: "New York" },
  { value: "state_tx", label: "Texas" },
  { value: "state_fl", label: "Florida" },
  { value: "state_il", label: "Illinois" },
  { value: "state_other", label: "Other State" },
];

const PLEADING_TYPES = [
  { value: "complaint", label: "Complaint" },
  { value: "answer", label: "Answer" },
  { value: "motion_to_dismiss", label: "Motion to Dismiss" },
  { value: "motion_for_summary_judgment", label: "Motion for Summary Judgment" },
  { value: "discovery_request", label: "Discovery Request" },
  { value: "discovery_response", label: "Discovery Response" },
  { value: "subpoena", label: "Subpoena" },
  { value: "brief", label: "Brief" },
  { value: "memorandum", label: "Memorandum" },
  { value: "other", label: "Other" },
];

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'docx':
    case 'doc':
      return <FileText className="h-8 w-8 text-blue-500" />;
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    case 'pdf':
      return <File className="h-8 w-8 text-red-500" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(date: Date | string | null) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric' 
  });
}

export default function LitigationTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState("all");
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LitigationTemplateWithDetails | null>(null);
  
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    category: "pleadings",
    pleadingType: "",
    jurisdiction: "federal",
    tags: [] as string[],
    tagInput: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: templates = [], isLoading } = useQuery<LitigationTemplateWithDetails[]>({
    queryKey: ['/api/litigation-templates', { search: searchQuery, category: categoryFilter, jurisdiction: jurisdictionFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);
      if (jurisdictionFilter) params.append('jurisdiction', jurisdictionFilter);
      const res = await fetch(`/api/litigation-templates?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  const { data: recentTemplates = [] } = useQuery<LitigationTemplateWithDetails[]>({
    queryKey: ['/api/litigation-templates-recent'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch('/api/litigation-templates', {
        method: 'POST',
        body: formData,
        headers: authHeaders,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/litigation-templates'] });
      setUploadDialogOpen(false);
      resetUploadForm();
      toast({ title: "Template uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest('PATCH', `/api/litigation-templates/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/litigation-templates'] });
      setEditDialogOpen(false);
      setSelectedTemplate(null);
      toast({ title: "Template updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/litigation-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/litigation-templates'] });
      toast({ title: "Template deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      if (isFavorite) {
        return apiRequest('DELETE', `/api/litigation-templates/${id}/favorite`);
      } else {
        return apiRequest('POST', `/api/litigation-templates/${id}/favorite`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/litigation-templates'] });
    },
  });

  const resetUploadForm = () => {
    setUploadForm({
      name: "",
      description: "",
      category: "pleadings",
      pleadingType: "",
      jurisdiction: "federal",
      tags: [],
      tagInput: "",
    });
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.name) {
        setUploadForm(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', uploadForm.name);
    formData.append('description', uploadForm.description);
    formData.append('category', uploadForm.category);
    if (uploadForm.pleadingType) formData.append('pleadingType', uploadForm.pleadingType);
    formData.append('jurisdiction', uploadForm.jurisdiction);
    if (uploadForm.tags.length > 0) formData.append('tags', JSON.stringify(uploadForm.tags));

    uploadMutation.mutate(formData);
  };

  const handleAddTag = () => {
    const tag = uploadForm.tagInput.trim();
    if (tag && !uploadForm.tags.includes(tag)) {
      setUploadForm(prev => ({ ...prev, tags: [...prev.tags, tag], tagInput: "" }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setUploadForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleDownload = async (template: LitigationTemplateWithDetails) => {
    window.open(`/api/litigation-templates/${template.id}/download`, '_blank');
  };

  const filteredTemplates = templates.filter(t => {
    if (activeTab === "favorites" && !t.isFavorite) return false;
    if (activeTab === "recent" && !t.recentlyUsed) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4 border-b">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Forms & Templates</h1>
            <p className="text-muted-foreground">Litigation document templates library</p>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-template">
            <Upload className="h-4 w-4 mr-2" />
            Upload Template
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-templates"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-jurisdiction-filter">
              <SelectValue placeholder="Jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jurisdictions</SelectItem>
              {JURISDICTIONS.map(j => (
                <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 ml-auto">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all" data-testid="tab-all-templates">All Templates</TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites">
              <Star className="h-4 w-4 mr-1" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent">
              <Clock className="h-4 w-4 mr-1" />
              Recently Used
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No templates found</h3>
                  <p className="text-muted-foreground mb-4">Upload your first template to get started</p>
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Template
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <TemplateGrid 
                templates={filteredTemplates} 
                onDownload={handleDownload}
                onEdit={(t) => { setSelectedTemplate(t); setEditDialogOpen(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggleFavorite={(id, isFav) => favoriteMutation.mutate({ id, isFavorite: isFav })}
              />
            ) : (
              <TemplateList 
                templates={filteredTemplates} 
                onDownload={handleDownload}
                onEdit={(t) => { setSelectedTemplate(t); setEditDialogOpen(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggleFavorite={(id, isFav) => favoriteMutation.mutate({ id, isFavorite: isFav })}
              />
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            {filteredTemplates.filter(t => t.isFavorite).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Star className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No favorite templates</h3>
                  <p className="text-muted-foreground">Star templates to add them to your favorites</p>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <TemplateGrid 
                templates={filteredTemplates.filter(t => t.isFavorite)} 
                onDownload={handleDownload}
                onEdit={(t) => { setSelectedTemplate(t); setEditDialogOpen(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggleFavorite={(id, isFav) => favoriteMutation.mutate({ id, isFavorite: isFav })}
              />
            ) : (
              <TemplateList 
                templates={filteredTemplates.filter(t => t.isFavorite)} 
                onDownload={handleDownload}
                onEdit={(t) => { setSelectedTemplate(t); setEditDialogOpen(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggleFavorite={(id, isFav) => favoriteMutation.mutate({ id, isFavorite: isFav })}
              />
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            {filteredTemplates.filter(t => t.recentlyUsed).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No recent templates</h3>
                  <p className="text-muted-foreground">Templates you download will appear here</p>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <TemplateGrid 
                templates={filteredTemplates.filter(t => t.recentlyUsed)} 
                onDownload={handleDownload}
                onEdit={(t) => { setSelectedTemplate(t); setEditDialogOpen(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggleFavorite={(id, isFav) => favoriteMutation.mutate({ id, isFavorite: isFav })}
              />
            ) : (
              <TemplateList 
                templates={filteredTemplates.filter(t => t.recentlyUsed)} 
                onDownload={handleDownload}
                onEdit={(t) => { setSelectedTemplate(t); setEditDialogOpen(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggleFavorite={(id, isFav) => favoriteMutation.mutate({ id, isFavorite: isFav })}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Template</DialogTitle>
            <DialogDescription>Add a new document template to the library</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover-elevate"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".docx,.doc,.xlsx,.xls,.pdf"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  {getFileIcon(selectedFile.name.split('.').pop() || '')}
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Click to select a file</p>
                  <p className="text-xs text-muted-foreground">Word, Excel, or PDF files</p>
                </>
              )}
            </div>

            <div>
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                value={uploadForm.name}
                onChange={e => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Template name"
                data-testid="input-template-name"
              />
            </div>

            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={uploadForm.description}
                onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this template"
                rows={2}
                data-testid="input-template-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select 
                  value={uploadForm.category} 
                  onValueChange={v => setUploadForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Jurisdiction</Label>
                <Select 
                  value={uploadForm.jurisdiction} 
                  onValueChange={v => setUploadForm(prev => ({ ...prev, jurisdiction: v }))}
                >
                  <SelectTrigger data-testid="select-template-jurisdiction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JURISDICTIONS.map(j => (
                      <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {uploadForm.category === 'pleadings' && (
              <div>
                <Label>Pleading Type</Label>
                <Select 
                  value={uploadForm.pleadingType} 
                  onValueChange={v => setUploadForm(prev => ({ ...prev, pleadingType: v }))}
                >
                  <SelectTrigger data-testid="select-pleading-type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PLEADING_TYPES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {uploadForm.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={uploadForm.tagInput}
                  onChange={e => setUploadForm(prev => ({ ...prev, tagInput: e.target.value }))}
                  placeholder="Add a tag..."
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  data-testid="input-template-tag"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogOpen(false); resetUploadForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending} data-testid="button-confirm-upload">
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-template-name">Name</Label>
                <Input
                  id="edit-template-name"
                  value={selectedTemplate.name}
                  onChange={e => setSelectedTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                  data-testid="input-edit-template-name"
                />
              </div>

              <div>
                <Label htmlFor="edit-template-description">Description</Label>
                <Textarea
                  id="edit-template-description"
                  value={selectedTemplate.description || ''}
                  onChange={e => setSelectedTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                  data-testid="input-edit-template-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={selectedTemplate.category} 
                    onValueChange={v => setSelectedTemplate(prev => prev ? { ...prev, category: v as any } : null)}
                  >
                    <SelectTrigger data-testid="select-edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Jurisdiction</Label>
                  <Select 
                    value={selectedTemplate.jurisdiction || 'federal'} 
                    onValueChange={v => setSelectedTemplate(prev => prev ? { ...prev, jurisdiction: v as any } : null)}
                  >
                    <SelectTrigger data-testid="select-edit-jurisdiction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JURISDICTIONS.map(j => (
                        <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedTemplate(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedTemplate) {
                  updateMutation.mutate({
                    id: selectedTemplate.id,
                    updates: {
                      name: selectedTemplate.name,
                      description: selectedTemplate.description,
                      category: selectedTemplate.category,
                      jurisdiction: selectedTemplate.jurisdiction,
                    }
                  });
                }
              }} 
              disabled={updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateGrid({ 
  templates, 
  onDownload, 
  onEdit, 
  onDelete, 
  onToggleFavorite 
}: {
  templates: LitigationTemplateWithDetails[];
  onDownload: (t: LitigationTemplateWithDetails) => void;
  onEdit: (t: LitigationTemplateWithDetails) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {templates.map(template => (
        <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              {getFileIcon(template.fileType)}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(template.id, template.isFavorite || false)}
                data-testid={`button-favorite-${template.id}`}
              >
                {template.isFavorite ? (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <h3 className="font-medium truncate mb-1" title={template.name}>{template.name}</h3>
            {template.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{template.description}</p>
            )}
            
            <div className="flex flex-wrap gap-1 mb-3">
              <Badge variant="outline" className="text-xs">
                {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {JURISDICTIONS.find(j => j.value === template.jurisdiction)?.label || template.jurisdiction}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>{formatFileSize(template.fileSize)}</span>
              <span>{formatDate(template.createdAt)}</span>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => onDownload(template)} data-testid={`button-download-${template.id}`}>
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(template)} data-testid={`button-edit-${template.id}`}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(template.id)} data-testid={`button-delete-${template.id}`}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TemplateList({ 
  templates, 
  onDownload, 
  onEdit, 
  onDelete, 
  onToggleFavorite 
}: {
  templates: LitigationTemplateWithDetails[];
  onDownload: (t: LitigationTemplateWithDetails) => void;
  onEdit: (t: LitigationTemplateWithDetails) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      {templates.map(template => (
        <Card key={template.id} className="hover-elevate" data-testid={`row-template-${template.id}`}>
          <CardContent className="p-4 flex items-center gap-4">
            {getFileIcon(template.fileType)}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{template.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{CATEGORIES.find(c => c.value === template.category)?.label}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{JURISDICTIONS.find(j => j.value === template.jurisdiction)?.label}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{formatFileSize(template.fileSize)}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{formatDate(template.createdAt)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(template.id, template.isFavorite || false)}
                data-testid={`button-favorite-list-${template.id}`}
              >
                {template.isFavorite ? (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </Button>
              <Button size="sm" onClick={() => onDownload(template)} data-testid={`button-download-list-${template.id}`}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(template)} data-testid={`button-edit-list-${template.id}`}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(template.id)} data-testid={`button-delete-list-${template.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
