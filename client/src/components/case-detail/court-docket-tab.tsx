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
  Gavel
} from "lucide-react";
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
    file: null as File | null,
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
      setIsUploadOpen(false);
      setUploadForm({ pleadingType: "other", filingDate: "", filingParty: "plaintiff", filingStatus: "court_filing", file: null });
      toast({
        title: "Document Added to Docket",
        description: "The filing has been added and indexed for AI search.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
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

  const handleUpload = async () => {
    if (!uploadForm.file) {
      toast({
        title: "Missing File",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("pleadingType", uploadForm.pleadingType);
      formData.append("filingParty", uploadForm.filingParty);
      formData.append("filingStatus", uploadForm.filingStatus);
      if (uploadForm.filingDate) formData.append("filingDate", uploadForm.filingDate);

      await uploadMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
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
                        <span className="font-medium truncate max-w-[400px]" title={pleading.title}>
                          {pleading.title}
                        </span>
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
              <label className="text-sm font-medium">Document File *</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                data-testid="input-docket-file"
              />
              <p className="text-xs text-muted-foreground">
                The document headline will be automatically extracted as the title
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
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadForm.file}
              data-testid="button-submit-docket-entry"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Add to Docket
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
    </div>
  );
}
