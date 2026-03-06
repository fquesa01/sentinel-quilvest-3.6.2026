import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Trash2, Calendar, User, Search, CheckCircle, Clock, Plus, Loader2, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface CourtPleading {
  id: string;
  caseId: string;
  title: string;
  pleadingType: string;
  filingDate: string | null;
  filedBy: string | null;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string | null;
  extractedText: string | null;
  isIndexed: boolean;
  indexedAt: string | null;
  createdAt: string;
}

interface CourtPleadingsPanelProps {
  caseId: string;
}

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

const pleadingTypeColors: Record<string, string> = {
  complaint: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  answer: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  motion: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  brief: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  court_order: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  discovery: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  subpoena: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  settlement: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  judgment: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export function CourtPleadingsPanel({ caseId }: CourtPleadingsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    pleadingType: "other",
    filingDate: "",
    filedBy: "",
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

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/cases/${caseId}/court-pleadings`, {
        method: "POST",
        body: formData,
        headers: authHeaders,
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
      setUploadForm({ title: "", pleadingType: "other", filingDate: "", filedBy: "", file: null });
      toast({
        title: "Pleading Uploaded",
        description: "The court pleading has been uploaded and indexed for AI search.",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/court-pleadings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "court-pleadings"] });
      setDeleteId(null);
      toast({
        title: "Pleading Deleted",
        description: "The court pleading has been removed.",
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
    if (!uploadForm.file || !uploadForm.title) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and select a file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("title", uploadForm.title);
      formData.append("pleadingType", uploadForm.pleadingType);
      if (uploadForm.filingDate) formData.append("filingDate", uploadForm.filingDate);
      if (uploadForm.filedBy) formData.append("filedBy", uploadForm.filedBy);

      await uploadMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (pleading: CourtPleading) => {
    window.open(`/api/court-pleadings/${pleading.id}/download`, "_blank");
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Court Pleadings
            </CardTitle>
            <CardDescription className="mt-1">
              Upload legal documents for AI-powered discovery and search
            </CardDescription>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-pleading" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Upload Pleading
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Court Pleading</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    data-testid="input-pleading-title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., Plaintiff's Complaint"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pleadingType">Pleading Type</Label>
                  <Select
                    value={uploadForm.pleadingType}
                    onValueChange={(value) => setUploadForm({ ...uploadForm, pleadingType: value })}
                  >
                    <SelectTrigger data-testid="select-pleading-type">
                      <SelectValue placeholder="Select type" />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filingDate">Filing Date</Label>
                    <Input
                      id="filingDate"
                      type="date"
                      data-testid="input-filing-date"
                      value={uploadForm.filingDate}
                      onChange={(e) => setUploadForm({ ...uploadForm, filingDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filedBy">Filed By</Label>
                    <Input
                      id="filedBy"
                      data-testid="input-filed-by"
                      value={uploadForm.filedBy}
                      onChange={(e) => setUploadForm({ ...uploadForm, filedBy: e.target.value })}
                      placeholder="Plaintiff, Defendant..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Document File *</Label>
                  <Input
                    id="file"
                    type="file"
                    data-testid="input-pleading-file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports PDF, Word (.doc, .docx), and text files
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button
                  data-testid="button-submit-pleading"
                  onClick={handleUpload}
                  disabled={uploading || !uploadForm.file || !uploadForm.title}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Index
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pleadings.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No Court Pleadings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload legal documents to enable AI-powered search and discovery
            </p>
            <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Pleading
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {pleadings.map((pleading) => (
              <div
                key={pleading.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate transition-colors"
                data-testid={`pleading-row-${pleading.id}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{pleading.title}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${pleadingTypeColors[pleading.pleadingType] || pleadingTypeColors.other}`}
                      >
                        {pleadingTypes.find((t) => t.value === pleading.pleadingType)?.label || "Other"}
                      </Badge>
                      {pleading.isIndexed ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Indexed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {pleading.fileName}
                      </span>
                      <span>{formatFileSize(pleading.fileSize)}</span>
                      {pleading.filingDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(pleading.filingDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {pleading.filedBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {pleading.filedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-download-pleading-${pleading.id}`}
                    onClick={() => handleDownload(pleading)}
                    title="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-delete-pleading-${pleading.id}`}
                    onClick={() => setDeleteId(pleading.id)}
                    title="Delete pleading"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Court Pleading?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the pleading and its indexed content from the AI search system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
