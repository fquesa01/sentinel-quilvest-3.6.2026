import { useState, useRef, useCallback, useEffect } from "react";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  FileStack, Upload, Search, Trash2, Star, FileText, Eye, Download, Share2,
  Loader2, ArrowLeft, Plus, FolderOpen, Files, X, ChevronDown, Check, AlertCircle, XCircle,
} from "lucide-react";
import { Link } from "wouter";
import type { FirmFormTemplate } from "@shared/schema";
import { ShareTemplateDialog } from "@/components/share-template-dialog";

type FirmFormTemplateWithMeta = Omit<FirmFormTemplate, "fileData"> & { hasFileData: boolean };

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

const SUPPORTED_EXTENSIONS = [".docx", ".doc", ".pdf", ".html", ".txt", ".rtf"];

interface BulkFileEntry {
  id: string;
  file: File;
  name: string;
  documentType: string;
}

function guessDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  const keywords: [string[], string][] = [
    [["closing disclosure", "closing_disclosure", "cd_"], "closing_disclosure"],
    [["deed"], "deed"],
    [["bill of sale", "bill_of_sale", "bos"], "bill_of_sale"],
    [["settlement", "hud"], "settlement_statement"],
    [["title affidavit", "title_affidavit"], "title_affidavit"],
    [["transfer tax", "transfer_tax"], "transfer_tax_declaration"],
    [["buyer", "buyers", "buyer's"], "buyers_closing_certificate"],
    [["seller", "sellers", "seller's"], "sellers_closing_certificate"],
    [["promissory", "note"], "promissory_note"],
    [["mortgage"], "mortgage"],
    [["security agreement", "security_agreement"], "security_agreement"],
    [["ucc", "financing statement"], "ucc_financing_statement"],
    [["loan agreement", "loan_agreement"], "loan_agreement"],
    [["guaranty"], "guaranty_agreement"],
    [["borrower"], "borrowers_certificate"],
    [["lender"], "lenders_closing_certificate"],
    [["purchase agreement", "purchase_agreement", "psa"], "purchase_agreement"],
    [["assignment"], "assignment_agreement"],
    [["operating agreement", "operating_agreement"], "operating_agreement"],
    [["escrow"], "escrow_agreement"],
    [["power of attorney", "power_of_attorney", "poa"], "power_of_attorney"],
    [["affidavit of title", "affidavit_of_title"], "affidavit_of_title"],
  ];

  for (const [keys, type] of keywords) {
    if (keys.some(k => lower.includes(k))) return type;
  }
  return "other";
}

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return true;
  return SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext));
}

export default function FormTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<FirmFormTemplateWithMeta | null>(null);
  const [templateNotes, setTemplateNotes] = useState("");
  const [shareTemplate, setShareTemplate] = useState<FirmFormTemplate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    documentType: "",
    dealType: "",
    isDefault: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<BulkFileEntry[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number; total: number; failedFiles: { name: string; error: string }[] } | null>(null);

  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  const { data: templates = [], isLoading } = useQuery<FirmFormTemplateWithMeta[]>({
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
    mutationFn: async (template: { id: string; documentType: string; dealType?: string | null }) => {
      const res = await apiRequest("POST", `/api/form-templates/${template.id}/set-default`);
      return { result: await res.json(), documentType: template.documentType, dealType: template.dealType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      const scope = data.dealType
        ? `${data.documentType} / ${data.dealType}`
        : data.documentType;
      toast({ title: "Default updated", description: `This template is now the default for ${scope} documents.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/form-templates/${id}/remove-default`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Default removed", description: "This template is no longer the default for its document type." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/form-templates/${id}`, { notes });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      if (previewTemplate) {
        setPreviewTemplate({ ...previewTemplate, notes: data.notes });
      }
      toast({ title: "Notes saved", description: "Your notes have been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error saving notes", description: err.message, variant: "destructive" });
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

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const entries: BulkFileEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isSupportedFile(file)) continue;
      const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
      entries.push({
        id: `${Date.now()}-${i}`,
        file,
        name: baseName,
        documentType: guessDocumentType(file.name),
      });
    }

    if (entries.length === 0) {
      toast({
        title: "No supported files",
        description: "No supported document files were found. Accepted: .docx, .doc, .pdf, .html, .txt, .rtf, or files without extensions.",
        variant: "destructive",
      });
      return;
    }

    setBulkFiles(entries);
    setBulkResult(null);
    setBulkProgress({ current: 0, total: 0 });
    setIsBulkOpen(true);
  }, [toast]);

  const removeBulkFile = (id: string) => {
    setBulkFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateBulkFile = (id: string, field: "name" | "documentType", value: string) => {
    setBulkFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;

    setBulkUploading(true);
    setBulkResult(null);
    const total = bulkFiles.length;
    setBulkProgress({ current: 0, total });

    const BATCH_SIZE = 10;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let processed = 0;
    const allFailedFiles: { name: string; error: string }[] = [];

    for (let batchStart = 0; batchStart < bulkFiles.length; batchStart += BATCH_SIZE) {
      const batch = bulkFiles.slice(batchStart, batchStart + BATCH_SIZE);
      const formData = new FormData();

      const names: string[] = [];
      const documentTypes: string[] = [];

      for (const entry of batch) {
        formData.append("files", entry.file);
        names.push(entry.name);
        documentTypes.push(entry.documentType);
      }

      formData.append("names", JSON.stringify(names));
      formData.append("documentTypes", JSON.stringify(documentTypes));

      try {
        const res = await fetch("/api/form-templates/bulk", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          totalFailed += batch.length;
          for (const entry of batch) {
            allFailedFiles.push({ name: entry.file.name, error: "Server error" });
          }
        } else {
          const data = await res.json();
          totalSucceeded += data.succeeded || 0;
          totalFailed += data.failed || 0;
          if (data.results) {
            for (const r of data.results) {
              if (!r.success) {
                allFailedFiles.push({ name: r.name || `File ${r.index + 1}`, error: r.error || "Unknown error" });
              }
            }
          }
        }
      } catch {
        totalFailed += batch.length;
        for (const entry of batch) {
          allFailedFiles.push({ name: entry.file.name, error: "Network error" });
        }
      }

      processed += batch.length;
      setBulkProgress({ current: processed, total });
    }

    setBulkUploading(false);
    setBulkResult({ succeeded: totalSucceeded, failed: totalFailed, total, failedFiles: allFailedFiles });
    queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
  };

  const closeBulkDialog = () => {
    if (bulkUploading) return;
    setIsBulkOpen(false);
    setBulkFiles([]);
    setBulkResult(null);
    setBulkProgress({ current: 0, total: 0 });
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
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-testid="button-upload-template">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Template
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsUploadOpen(true)}
                  data-testid="menu-item-single-upload"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Single Upload
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => multiFileInputRef.current?.click()}
                  data-testid="menu-item-upload-files"
                >
                  <Files className="h-4 w-4 mr-2" />
                  Upload Files
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => folderInputRef.current?.click()}
                  data-testid="menu-item-upload-folder"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Upload Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <input
          ref={multiFileInputRef}
          type="file"
          multiple
          accept=".docx,.doc,.pdf,.html,.txt,.rtf"
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
          data-testid="input-multi-file-upload"
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
          data-testid="input-folder-upload"
        />

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
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button onClick={() => setIsUploadOpen(true)} data-testid="button-upload-first-template">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First Template
                  </Button>
                  <Button variant="outline" onClick={() => multiFileInputRef.current?.click()} data-testid="button-bulk-upload-first">
                    <Files className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                </div>
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
                      <Button
                        variant="default"
                        size="sm"
                        className="shrink-0"
                        onClick={() => removeDefaultMutation.mutate(template.id)}
                        disabled={removeDefaultMutation.isPending}
                        data-testid={`button-remove-default-${template.id}`}
                      >
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Default{template.dealType ? ` (${template.dealType})` : ""}
                        <X className="h-3 w-3 ml-1" />
                      </Button>
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
                        onClick={() => { setPreviewTemplate(template); setTemplateNotes(template.notes || ""); }}
                        data-testid={`button-preview-${template.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShareTemplate(template)}
                      data-testid={`button-share-${template.id}`}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                    {template.hasFileData && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(`/api/form-templates/${template.id}/download`, "_blank");
                        }}
                        data-testid={`button-download-${template.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                    {!template.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate({ id: template.id, documentType: template.documentType, dealType: template.dealType })}
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
                        Click to upload a document file (.docx, .doc, .pdf, .rtf, .html, .txt)
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.html,.txt,.doc,.rtf"
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

        <Dialog open={isBulkOpen} onOpenChange={(open) => { if (!open) closeBulkDialog(); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {bulkResult ? "Upload Complete" : `Bulk Upload - ${bulkFiles.length} file${bulkFiles.length !== 1 ? "s" : ""}`}
              </DialogTitle>
            </DialogHeader>

            {bulkResult ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center gap-3">
                  {bulkResult.failed === 0 ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="h-8 w-8" />
                      <div>
                        <p className="text-lg font-semibold" data-testid="text-bulk-success">
                          All {bulkResult.succeeded} templates uploaded successfully
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 w-full">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                        <p className="font-semibold" data-testid="text-bulk-partial">Upload completed with some issues</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bulkResult.succeeded} of {bulkResult.total} files uploaded successfully.
                        {bulkResult.failed} failed.
                      </p>
                      {bulkResult.failedFiles.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Failed files:</p>
                          {bulkResult.failedFiles.map((f, idx) => (
                            <div key={idx} className="text-xs flex items-start gap-2" data-testid={`text-failed-file-${idx}`}>
                              <XCircle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
                              <span className="break-all"><span className="font-medium">{f.name}</span> — {f.error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={closeBulkDialog} data-testid="button-bulk-done">Done</Button>
                </DialogFooter>
              </div>
            ) : bulkUploading ? (
              <div className="space-y-4 py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <p className="font-medium" data-testid="text-bulk-progress">
                    Uploading {bulkProgress.current} of {bulkProgress.total}...
                  </p>
                </div>
                <Progress
                  value={bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}
                  className="h-2"
                  data-testid="progress-bulk-upload"
                />
                <p className="text-xs text-center text-muted-foreground">
                  Please don't close this dialog while uploading
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto min-h-0 space-y-2 pr-1">
                  {bulkFiles.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 p-3 border rounded-md"
                      data-testid={`bulk-file-row-${index}`}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <Input
                          value={entry.name}
                          onChange={(e) => updateBulkFile(entry.id, "name", e.target.value)}
                          className="h-8 text-sm"
                          data-testid={`input-bulk-name-${index}`}
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            value={entry.documentType}
                            onValueChange={(v) => updateBulkFile(entry.id, "documentType", v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[180px]" data-testid={`select-bulk-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DOCUMENT_TYPES.map(dt => (
                                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-muted-foreground truncate" title={entry.file.name}>
                            {entry.file.name} ({formatFileSize(entry.file.size)})
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBulkFile(entry.id)}
                        data-testid={`button-remove-bulk-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={closeBulkDialog}>Cancel</Button>
                  <Button
                    onClick={handleBulkUpload}
                    disabled={bulkFiles.length === 0}
                    data-testid="button-bulk-upload-all"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload All ({bulkFiles.length})
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewTemplate} onOpenChange={(open) => {
          if (!open) setPreviewTemplate(null);
          else if (previewTemplate) setTemplateNotes(previewTemplate.notes || "");
        }}>
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
            {previewTemplate && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea
                  placeholder="Add notes about this template (usage instructions, revision reminders, context...)"
                  value={templateNotes}
                  onChange={(e) => setTemplateNotes(e.target.value)}
                  rows={3}
                  data-testid="textarea-template-notes"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => saveNotesMutation.mutate({ id: previewTemplate.id, notes: templateNotes })}
                    disabled={saveNotesMutation.isPending || templateNotes === (previewTemplate.notes || "")}
                    data-testid="button-save-template-notes"
                  >
                    {saveNotesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                    Save Notes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {shareTemplate && (
          <ShareTemplateDialog
            templateId={shareTemplate.id}
            templateName={shareTemplate.name}
            open={!!shareTemplate}
            onOpenChange={(open) => { if (!open) setShareTemplate(null); }}
          />
        )}
      </div>
    </div>
  );
}
