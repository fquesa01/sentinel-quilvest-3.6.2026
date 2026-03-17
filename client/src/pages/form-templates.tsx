import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  FileStack, Upload, Search, Trash2, Star, FileText, Eye,
  Loader2, ArrowLeft, Plus,
} from "lucide-react";
import { Link } from "wouter";
import type { FirmFormTemplate } from "@shared/schema";

const DOCUMENT_TYPES = [
  { value: "closing_disclosure", label: "Closing Disclosure" },
  { value: "deed", label: "Deed" },
  { value: "bill_of_sale", label: "Bill of Sale" },
  { value: "settlement_statement", label: "Settlement Statement" },
  { value: "title_affidavit", label: "Title Affidavit" },
  { value: "transfer_tax_declaration", label: "Transfer Tax Declaration" },
  { value: "buyers_closing_certificate", label: "Buyer's Closing Certificate" },
  { value: "sellers_closing_certificate", label: "Seller's Closing Certificate" },
  { value: "sellers_affidavit", label: "Seller's Affidavit" },
  { value: "promissory_note", label: "Promissory Note" },
  { value: "mortgage", label: "Mortgage" },
  { value: "security_agreement", label: "Security Agreement" },
  { value: "ucc_financing_statement", label: "UCC Financing Statement" },
  { value: "loan_agreement", label: "Loan Agreement" },
  { value: "guaranty_agreement", label: "Guaranty Agreement" },
  { value: "borrowers_certificate", label: "Borrower's Certificate" },
  { value: "lenders_closing_certificate", label: "Lender's Closing Certificate" },
  { value: "purchase_agreement", label: "Purchase Agreement" },
  { value: "assignment_agreement", label: "Assignment Agreement" },
  { value: "operating_agreement", label: "Operating Agreement" },
  { value: "escrow_agreement", label: "Escrow Agreement" },
  { value: "power_of_attorney", label: "Power of Attorney" },
  { value: "affidavit_of_title", label: "Affidavit of Title" },
  { value: "other", label: "Other" },
];

const DEAL_TYPES = [
  { value: "", label: "All Deal Types" },
  { value: "real_estate", label: "Real Estate (General)" },
  { value: "residential_financed", label: "Residential (Financed)" },
  { value: "residential_cash", label: "Residential (Cash)" },
  { value: "commercial_financed", label: "Commercial (Financed)" },
  { value: "commercial_cash", label: "Commercial (Cash)" },
  { value: "debt", label: "Debt / Lending" },
  { value: "equity", label: "PE Equity" },
  { value: "ma_asset", label: "M&A (Asset)" },
  { value: "ma_stock", label: "M&A (Stock)" },
  { value: "merger", label: "Merger" },
];

export default function FormTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<FirmFormTemplate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    documentType: "",
    dealType: "",
    isDefault: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: templates = [], isLoading } = useQuery<FirmFormTemplate[]>({
    queryKey: ["/api/form-templates"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/form-templates", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template uploaded", description: "Your preferred form template has been saved." });
      resetUploadForm();
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/form-templates/${id}/set-default`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Default updated", description: "This template will now be used when generating closing documents." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/form-templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetUploadForm = () => {
    setIsUploadOpen(false);
    setUploadForm({ name: "", description: "", documentType: "", dealType: "", isDefault: false });
    setSelectedFile(null);
  };

  const handleUpload = () => {
    if (!uploadForm.name || !uploadForm.documentType) {
      toast({ title: "Missing fields", description: "Name and document type are required.", variant: "destructive" });
      return;
    }
    if (!selectedFile) {
      toast({ title: "No file", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", uploadForm.name);
    formData.append("description", uploadForm.description);
    formData.append("documentType", uploadForm.documentType);
    formData.append("dealType", uploadForm.dealType);
    formData.append("isDefault", uploadForm.isDefault ? "true" : "false");
    uploadMutation.mutate(formData);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || t.documentType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getDocTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(d => d.value === type)?.label || type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDealTypeLabel = (type: string | null) => {
    if (!type) return null;
    return DEAL_TYPES.find(d => d.value === type)?.label || type.replace(/_/g, " ");
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/transactions/deals">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
                <FileStack className="h-6 w-6" />
                Forms & Templates
              </h1>
              <p className="text-muted-foreground mt-1">
                Upload your preferred forms and templates. These will be used as the basis when generating closing documents for deals.
              </p>
            </div>
          </div>
          <Button onClick={() => setIsUploadOpen(true)} data-testid="button-upload-template">
            <Plus className="h-4 w-4 mr-2" />
            Upload Template
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-templates"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[220px]" data-testid="select-type-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Document Types</SelectItem>
              {DOCUMENT_TYPES.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileStack className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">
                {templates.length === 0 ? "No templates uploaded yet" : "No templates match your filter"}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {templates.length === 0
                  ? "Upload your preferred legal forms and templates. When closing documents are generated for a deal, they'll follow the same format and structure."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {templates.length === 0 && (
                <Button onClick={() => setIsUploadOpen(true)} data-testid="button-upload-first-template">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="flex flex-col" data-testid={`template-card-${template.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base break-words">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
                      )}
                    </div>
                    {template.isDefault && (
                      <Badge variant="default" className="shrink-0">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{getDocTypeLabel(template.documentType)}</Badge>
                      {template.dealType && (
                        <Badge variant="outline">{getDealTypeLabel(template.dealType)}</Badge>
                      )}
                    </div>
                    {template.fileName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {template.fileName}
                        {template.fileSize ? ` (${formatFileSize(template.fileSize)})` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {template.content && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewTemplate(template)}
                        data-testid={`button-preview-${template.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    )}
                    {!template.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(template.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${template.id}`}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-${template.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{template.name}"? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(template.id)}
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isUploadOpen} onOpenChange={(open) => { if (!open) resetUploadForm(); else setIsUploadOpen(true); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Form Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g., Firm Standard Deed"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <Label>Document Type</Label>
                <Select
                  value={uploadForm.documentType}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, documentType: v })}
                >
                  <SelectTrigger data-testid="select-document-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(dt => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deal Type (optional)</Label>
                <Select
                  value={uploadForm.dealType || "any"}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, dealType: v === "any" ? "" : v })}
                >
                  <SelectTrigger data-testid="select-deal-type">
                    <SelectValue placeholder="Any deal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Deal Type</SelectItem>
                    {DEAL_TYPES.filter(d => d.value).map(dt => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Brief description of this template..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={2}
                  data-testid="input-template-description"
                />
              </div>
              <div>
                <Label>Template File</Label>
                <div
                  className="mt-1 border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover-elevate"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-file-upload"
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">({formatFileSize(selectedFile.size)})</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload a .docx, .pdf, .html, or .txt file
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.html,.txt,.doc"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      if (!uploadForm.name) {
                        setUploadForm(prev => ({ ...prev, name: file.name.replace(/\.[^.]+$/, "") }));
                      }
                    }
                  }}
                  data-testid="input-file-upload"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={uploadForm.isDefault}
                  onChange={(e) => setUploadForm({ ...uploadForm, isDefault: e.target.checked })}
                  className="rounded"
                  data-testid="checkbox-is-default"
                />
                <Label htmlFor="isDefault" className="text-sm cursor-pointer">
                  Set as default template for this document type
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetUploadForm}>Cancel</Button>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !uploadForm.name || !uploadForm.documentType || !selectedFile}
                data-testid="button-submit-upload"
              >
                {uploadMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {uploadMutation.isPending ? "Uploading..." : "Upload Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewTemplate} onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            {previewTemplate?.content && (
              <div
                className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-4"
                dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
