import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Plus, 
  Loader2, 
  Check, 
  X,
  Pencil,
  Scale,
  Gavel,
  Eye,
  RefreshCw
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface CourtPleading {
  id: string;
  caseId: string;
  title: string;
  pleadingType: string;
  filingDate: string | null;
  filedBy: string | null;
  filingParty: string | null;
  filingStatus: string | null;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string | null;
  extractedText: string | null;
  isIndexed: boolean;
  indexedAt: string | null;
  createdAt: string;
}

interface CourtDocketTabProps {
  caseId: string;
}

interface PreviewMetadata {
  id: string;
  title: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  filingDate: string | null;
  filingParty: string | null;
  filingStatus: string | null;
  pleadingType: string;
  extractedText: string | null;
  isIndexed: boolean;
  createdAt: string;
  previewType: 'pdf' | 'image' | 'text' | 'unsupported';
  previewUrl: string;
}

const filingPartyOptions = [
  { value: "plaintiff", label: "Plaintiff" },
  { value: "defendant", label: "Defendant" },
  { value: "court", label: "Court" },
  { value: "third_party", label: "Third Party" },
];

const filingStatusOptions = [
  { value: "court_filing", label: "Court Filing" },
  { value: "draft", label: "Draft" },
];

const pleadingTypes = [
  { value: "complaint", label: "Complaint" },
  { value: "answer", label: "Answer" },
  { value: "motion", label: "Motion" },
  { value: "brief", label: "Brief" },
  { value: "court_order", label: "Court Order" },
  { value: "discovery", label: "Discovery" },
  { value: "subpoena", label: "Subpoena" },
  { value: "settlement", label: "Settlement" },
  { value: "judgment", label: "Judgment" },
  { value: "other", label: "Other" },
];

const filingPartyColors: Record<string, string> = {
  plaintiff: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  defendant: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  court: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  third_party: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const filingStatusColors: Record<string, string> = {
  court_filing: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export function CourtDocketTab({ caseId }: CourtDocketTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    title: string;
    filingDate: string;
    filingParty: string;
    filingStatus: string;
  }>({ title: "", filingDate: "", filingParty: "plaintiff", filingStatus: "court_filing" });
  
  const [uploadForm, setUploadForm] = useState({
    pleadingType: "other",
    filingDate: "",
    filingParty: "plaintiff",
    filingStatus: "court_filing",
    files: [] as File[],
  });
  
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string }>({ current: 0, total: 0, fileName: "" });
  
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const handlePreview = useCallback((pleading: CourtPleading) => {
    setPreviewId(pleading.id);
    setIsPreviewOpen(true);
  }, []);
  
  const { data: previewMetadata, isLoading: isPreviewLoading } = useQuery<PreviewMetadata>({
    queryKey: ["/api/court-pleadings", previewId, "preview"],
    queryFn: async () => {
      const res = await fetch(`/api/court-pleadings/${previewId}/preview`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load preview");
      return res.json();
    },
    enabled: !!previewId && isPreviewOpen,
  });

  const { data: pleadings = [], isLoading } = useQuery<CourtPleading[]>({
    queryKey: ["/api/cases", caseId, "court-pleadings"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/court-pleadings`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch court pleadings");
      return res.json();
    },
    enabled: !!caseId,
  });

  // Sort pleadings by filing date (newest first)
  const sortedPleadings = [...pleadings].sort((a, b) => {
    const dateA = a.filingDate ? new Date(a.filingDate).getTime() : 0;
    const dateB = b.filingDate ? new Date(b.filingDate).getTime() : 0;
    return dateB - dateA;
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/cases/${caseId}/court-pleadings`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload pleading");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "court-pleadings"] });
    },
    onError: () => {
      // Error handling done in batch handler, no individual toasts
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/court-pleadings/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "court-pleadings"] });
      setEditingId(null);
      toast({
        title: "Docket Entry Updated",
        description: "Changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/court-pleadings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "court-pleadings"] });
      setDeleteId(null);
      toast({
        title: "Entry Removed",
        description: "The docket entry has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reextractMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/court-pleadings/${id}/reextract`);
      return res.json() as Promise<{ success: boolean; extractedLength: number; message: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "court-pleadings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/court-pleadings", previewId, "preview"] });
      toast({
        title: "Text Re-extracted",
        description: data.message || "Document text has been re-extracted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Re-extraction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = async () => {
    if (uploadForm.files.length === 0) {
      toast({
        title: "Missing Files",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const total = uploadForm.files.length;
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (let i = 0; i < uploadForm.files.length; i++) {
        const file = uploadForm.files[i];
        setUploadProgress({ current: i + 1, total, fileName: file.name });
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("pleadingType", uploadForm.pleadingType);
        formData.append("filingParty", uploadForm.filingParty);
        formData.append("filingStatus", uploadForm.filingStatus);
        if (uploadForm.filingDate) formData.append("filingDate", uploadForm.filingDate);

        try {
          await uploadMutation.mutateAsync(formData);
          successCount++;
        } catch {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        // Only close dialog if at least one upload succeeded
        setIsUploadOpen(false);
        setUploadForm({ pleadingType: "other", filingDate: "", filingParty: "plaintiff", filingStatus: "court_filing", files: [] });
        
        if (failCount === 0) {
          toast({
            title: `${successCount} Document${successCount > 1 ? 's' : ''} Added`,
            description: "All filings have been added and indexed for AI search.",
          });
        } else {
          toast({
            title: "Upload Completed with Errors",
            description: `${successCount} succeeded, ${failCount} failed. You can retry the failed files.`,
            variant: "destructive",
          });
        }
      } else {
        // All files failed - keep dialog open for retry
        toast({
          title: "Upload Failed",
          description: "All files failed to upload. Please check the files and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0, fileName: "" });
    }
  };

  const handleDownload = (pleading: CourtPleading) => {
    window.open(`/api/court-pleadings/${pleading.id}/download`, "_blank");
  };

  const startEdit = useCallback((pleading: CourtPleading) => {
    setEditingId(pleading.id);
    setEditValues({
      title: pleading.title,
      filingDate: pleading.filingDate ? pleading.filingDate.split('T')[0] : "",
      filingParty: pleading.filingParty || "plaintiff",
      filingStatus: pleading.filingStatus || "court_filing",
    });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      updates: {
        title: editValues.title,
        filingDate: editValues.filingDate || null,
        filingParty: editValues.filingParty,
        filingStatus: editValues.filingStatus,
      },
    });
  }, [editingId, editValues, updateMutation]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValues({ title: "", filingDate: "", filingParty: "plaintiff", filingStatus: "court_filing" });
  }, []);

  return (
    <div className="space-y-4">
      {/* Docket Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Court Docket
            </h2>
            <p className="text-sm text-muted-foreground">
              Case filings and court documents
            </p>
          </div>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} data-testid="button-add-docket-entry">
          <Plus className="h-4 w-4 mr-2" />
          Add Filing
        </Button>
      </div>

      {/* Docket Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sortedPleadings.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Docket Entries</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Upload court filings and legal documents. The document title will be automatically extracted from the headline.
          </p>
          <Button onClick={() => setIsUploadOpen(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload First Filing
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[140px] font-semibold">Filing Date</TableHead>
                <TableHead className="font-semibold">Title of Document</TableHead>
                <TableHead className="w-[140px] font-semibold">Filing Party</TableHead>
                <TableHead className="w-[140px] font-semibold">Status</TableHead>
                <TableHead className="w-[100px] text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPleadings.map((pleading, index) => (
                <TableRow 
                  key={pleading.id} 
                  className="hover:bg-muted/30"
                  data-testid={`docket-row-${pleading.id}`}
                >
                  {/* Filing Date */}
                  <TableCell className="font-mono text-sm">
                    {editingId === pleading.id ? (
                      <Input
                        type="date"
                        value={editValues.filingDate}
                        onChange={(e) => setEditValues({ ...editValues, filingDate: e.target.value })}
                        className="h-8 w-[130px]"
                        data-testid={`input-edit-date-${pleading.id}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {pleading.filingDate 
                          ? format(new Date(pleading.filingDate), "MM/dd/yyyy")
                          : "—"
                        }
                      </span>
                    )}
                  </TableCell>

                  {/* Title */}
                  <TableCell>
                    {editingId === pleading.id ? (
                      <Input
                        value={editValues.title}
                        onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                        className="h-8"
                        data-testid={`input-edit-title-${pleading.id}`}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium line-clamp-2 cursor-help" data-testid={`text-title-${pleading.id}`}>
                              {pleading.title}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[400px] text-wrap">
                            <p>{pleading.title}</p>
                          </TooltipContent>
                        </Tooltip>
                        {pleading.isIndexed && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600 flex-shrink-0">
                            Indexed
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Filing Party */}
                  <TableCell>
                    {editingId === pleading.id ? (
                      <Select
                        value={editValues.filingParty}
                        onValueChange={(v) => setEditValues({ ...editValues, filingParty: v })}
                      >
                        <SelectTrigger className="h-8 w-[120px]" data-testid={`select-edit-party-${pleading.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filingPartyOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${filingPartyColors[pleading.filingParty || "plaintiff"] || filingPartyColors.plaintiff}`}
                      >
                        {filingPartyOptions.find(o => o.value === pleading.filingParty)?.label || "Plaintiff"}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Filing Status */}
                  <TableCell>
                    {editingId === pleading.id ? (
                      <Select
                        value={editValues.filingStatus}
                        onValueChange={(v) => setEditValues({ ...editValues, filingStatus: v })}
                      >
                        <SelectTrigger className="h-8 w-[120px]" data-testid={`select-edit-status-${pleading.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filingStatusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${filingStatusColors[pleading.filingStatus || "court_filing"] || filingStatusColors.court_filing}`}
                      >
                        {filingStatusOptions.find(o => o.value === pleading.filingStatus)?.label || "Court Filing"}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === pleading.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            data-testid={`button-save-edit-${pleading.id}`}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={cancelEdit}
                            data-testid={`button-cancel-edit-${pleading.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(pleading)}
                            title="View document"
                            data-testid={`button-view-${pleading.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(pleading)}
                            title="Edit entry"
                            data-testid={`button-edit-${pleading.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(pleading)}
                            title="Download document"
                            data-testid={`button-download-${pleading.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(pleading.id)}
                            title="Delete entry"
                            data-testid={`button-delete-${pleading.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      {sortedPleadings.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
          <span>{sortedPleadings.length} total entries</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{sortedPleadings.filter(p => p.filingStatus === "court_filing").length} court filings</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{sortedPleadings.filter(p => p.filingStatus === "draft").length} drafts</span>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-add-docket-entry">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Add Docket Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Files * (Select multiple)</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                onChange={(e) => setUploadForm({ ...uploadForm, files: e.target.files ? Array.from(e.target.files) : [] })}
                data-testid="input-docket-file"
              />
              {uploadForm.files.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded border p-2 space-y-1">
                  {uploadForm.files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 p-1"
                        onClick={() => setUploadForm({ ...uploadForm, files: uploadForm.files.filter((_, i) => i !== idx) })}
                        data-testid={`button-remove-file-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {uploadForm.files.length === 0 
                  ? "Select one or more files to upload. Document titles will be auto-extracted."
                  : `${uploadForm.files.length} file${uploadForm.files.length > 1 ? 's' : ''} selected`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Filing Date</label>
                <Input
                  type="date"
                  value={uploadForm.filingDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, filingDate: e.target.value })}
                  data-testid="input-docket-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <Select
                  value={uploadForm.pleadingType}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, pleadingType: v })}
                >
                  <SelectTrigger data-testid="select-docket-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pleadingTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Filing Party</label>
                <Select
                  value={uploadForm.filingParty}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, filingParty: v })}
                >
                  <SelectTrigger data-testid="select-docket-party">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filingPartyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Filing Status</label>
                <Select
                  value={uploadForm.filingStatus}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, filingStatus: v })}
                >
                  <SelectTrigger data-testid="select-docket-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filingStatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || uploadForm.files.length === 0}
              data-testid="button-submit-docket-entry"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress.total > 1 
                    ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                    : "Uploading..."}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadForm.files.length > 1 
                    ? `Add ${uploadForm.files.length} Files`
                    : "Add to Docket"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent data-testid="dialog-delete-docket-entry">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Docket Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this filing from the docket and delete its AI index. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
        setIsPreviewOpen(open);
        if (!open) setPreviewId(null);
      }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col" data-testid="dialog-document-preview">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewMetadata?.title || "Document Preview"}
            </DialogTitle>
            {previewMetadata && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>{previewMetadata.fileName}</span>
                {previewMetadata.fileSize && (
                  <span>{(previewMetadata.fileSize / 1024).toFixed(1)} KB</span>
                )}
                {previewMetadata.filingDate && (
                  <span>Filed: {format(new Date(previewMetadata.filingDate), "MMM d, yyyy")}</span>
                )}
                {previewMetadata.filingParty && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${filingPartyColors[previewMetadata.filingParty] || ""}`}
                  >
                    {filingPartyOptions.find(o => o.value === previewMetadata.filingParty)?.label}
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden border rounded-lg bg-muted/20">
            {isPreviewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Loading preview...</p>
              </div>
            ) : previewMetadata?.previewType === 'pdf' && previewMetadata.previewUrl ? (
              previewMetadata.extractedText ? (
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground border-b pb-2">
                      <FileText className="h-4 w-4" />
                      <span>Extracted text from PDF</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {previewMetadata.extractedText}
                    </pre>
                  </div>
                </ScrollArea>
              ) : (
                <object
                  data={previewMetadata.previewUrl}
                  type="application/pdf"
                  className="w-full h-full"
                  title={previewMetadata.fileName}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">PDF Preview Unavailable</h3>
                    <p className="text-sm text-muted-foreground mb-4">Your browser may not support inline PDF viewing.</p>
                    <Button onClick={() => previewMetadata && window.open(`/api/court-pleadings/${previewMetadata.id}/download`, "_blank")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </object>
              )
            ) : previewMetadata?.previewType === 'image' && previewMetadata.previewUrl ? (
              <div className="flex items-center justify-center h-full p-4">
                <img 
                  src={previewMetadata.previewUrl} 
                  alt={previewMetadata.fileName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : previewMetadata?.extractedText ? (
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground border-b pb-2">
                    <FileText className="h-4 w-4" />
                    <span>Document content</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {previewMetadata.extractedText}
                  </pre>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Preview Not Available</h3>
                <p className="text-sm text-muted-foreground mb-4">This document type cannot be previewed in the browser.</p>
                {previewMetadata && (
                  <Button onClick={() => window.open(`/api/court-pleadings/${previewMetadata.id}/download`, "_blank")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0 mt-4 gap-2">
            {previewMetadata && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => reextractMutation.mutate(previewMetadata.id)}
                  disabled={reextractMutation.isPending}
                  data-testid="button-reextract-from-preview"
                >
                  {reextractMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Re-extract Text
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`/api/court-pleadings/${previewMetadata.id}/download`, "_blank")}
                  data-testid="button-download-from-preview"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
            <Button onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
