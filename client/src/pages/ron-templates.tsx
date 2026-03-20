import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  FileText,
  Trash2,
  Upload,
  Loader2,
  Copy,
  MapPin,
  Hash,
} from "lucide-react";
import { Link } from "wouter";

type RonDocumentTemplate = {
  id: string;
  name: string;
  description: string | null;
  documentType: string;
  jurisdiction: string | null;
  category: string | null;
  annotationPlacements: unknown[];
  sourceTemplateId: string | null;
  storageKey: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  pageCount: number | null;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

type FormTemplate = {
  id: string;
  name: string;
  description: string | null;
  documentType: string;
  dealType: string | null;
  fileName: string | null;
};

const docTypes = [
  { value: "general", label: "General" },
  { value: "deed", label: "Deed" },
  { value: "mortgage", label: "Mortgage" },
  { value: "power_of_attorney", label: "Power of Attorney" },
  { value: "affidavit", label: "Affidavit" },
  { value: "trust", label: "Trust Document" },
  { value: "closing_disclosure", label: "Closing Disclosure" },
  { value: "note", label: "Promissory Note" },
];

export default function RonTemplates() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    documentType: "general",
    jurisdiction: "",
    category: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: templates, isLoading } = useQuery<RonDocumentTemplate[]>({
    queryKey: ["/api/ron/ron-document-templates"],
  });

  const { data: formTemplates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: importOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", newTemplate.name);
      formData.append("documentType", newTemplate.documentType);
      if (newTemplate.description) formData.append("description", newTemplate.description);
      if (newTemplate.jurisdiction) formData.append("jurisdiction", newTemplate.jurisdiction);
      if (newTemplate.category) formData.append("category", newTemplate.category);
      if (uploadFile) formData.append("file", uploadFile);

      const res = await fetch("/api/ron/ron-document-templates", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create template" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/ron-document-templates"] });
      setCreateOpen(false);
      setNewTemplate({ name: "", description: "", documentType: "general", jurisdiction: "", category: "" });
      setUploadFile(null);
      toast({ title: "Template created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (sourceTemplateId: string) => {
      const res = await apiRequest("POST", "/api/ron/ron-document-templates/import-from-library", { sourceTemplateId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/ron-document-templates"] });
      setImportOpen(false);
      toast({ title: "Template imported from library" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ron/ron-document-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/ron-document-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const filtered = templates?.filter(t => filterType === "all" || t.documentType === filterType) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ron-templates-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/ron/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-templates-title">RON Document Templates</h1>
          <p className="text-muted-foreground text-sm">Reusable templates with pre-placed annotation fields</p>
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)} data-testid="button-import-template">
          <Copy className="h-4 w-4 mr-2" /> Import from Library
        </Button>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-type">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {docTypes.map(dt => (
              <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} template(s)</span>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => (
            <Card key={template.id} data-testid={`template-card-${template.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm truncate">{template.name}</CardTitle>
                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(template.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-template-${template.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {docTypes.find(dt => dt.value === template.documentType)?.label || template.documentType}
                  </Badge>
                  {template.jurisdiction && (
                    <Badge variant="outline" className="text-[10px]">
                      <MapPin className="h-2.5 w-2.5 mr-0.5" /> {template.jurisdiction}
                    </Badge>
                  )}
                  {template.category && (
                    <Badge variant="outline" className="text-[10px]">{template.category}</Badge>
                  )}
                  {!template.isActive && (
                    <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Used {template.usageCount} time(s)
                  </span>
                  {template.fileName && (
                    <span className="truncate max-w-[120px]">{template.fileName}</span>
                  )}
                </div>
                {template.sourceTemplateId && (
                  <p className="text-[10px] text-muted-foreground">Imported from library</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="font-medium text-muted-foreground">No templates yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a template or import from the form library</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Document Template</DialogTitle>
            <DialogDescription>
              Create a reusable template with pre-placed annotation fields for RON sessions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newTemplate.name}
                onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Template name"
                data-testid="input-template-name"
              />
            </div>
            <div>
              <Label>Document Type *</Label>
              <Select value={newTemplate.documentType} onValueChange={v => setNewTemplate({ ...newTemplate, documentType: v })}>
                <SelectTrigger data-testid="select-template-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jurisdiction</Label>
              <Input
                value={newTemplate.jurisdiction}
                onChange={e => setNewTemplate({ ...newTemplate, jurisdiction: e.target.value })}
                placeholder="e.g., FL, TX, CA"
                data-testid="input-template-jurisdiction"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={newTemplate.category}
                onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })}
                placeholder="e.g., Real Estate, Loan"
                data-testid="input-template-category"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Template description"
                data-testid="input-template-description"
              />
            </div>
            <div>
              <Label>Template File (PDF)</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                data-testid="input-template-file"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !newTemplate.name}
              data-testid="button-submit-template"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Form Template Library</DialogTitle>
            <DialogDescription>
              Select a form template to import as a RON document template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {formTemplates && formTemplates.length > 0 ? (
              formTemplates.map(ft => (
                <div
                  key={ft.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
                  data-testid={`import-template-${ft.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{ft.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ft.documentType} {ft.dealType && `- ${ft.dealType}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => importMutation.mutate(ft.id)}
                    disabled={importMutation.isPending}
                    data-testid={`button-import-${ft.id}`}
                  >
                    {importMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3 mr-1" />}
                    Import
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No form templates available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
