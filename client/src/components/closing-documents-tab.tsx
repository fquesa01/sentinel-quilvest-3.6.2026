import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  FileText, Download, Upload, Mic, MicOff, Sparkles, History,
  ChevronLeft, Loader2, RotateCcw, Send, Clock, Edit3, Check,
  AlertCircle, FileUp, Trash2, Eye
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ClosingDocumentsTabProps {
  dealId: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  review: "default",
  approved: "default",
  executed: "default",
  superseded: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
  executed: "Executed",
  superseded: "Superseded",
};

const SOURCE_LABELS: Record<string, string> = {
  ai_generated: "AI Generated",
  manual_edit: "Manual Edit",
  voice_edit: "Voice Edit",
  uploaded: "Uploaded",
  restored: "Restored",
};

export function ClosingDocumentsTab({ dealId }: ClosingDocumentsTabProps) {
  const { toast } = useToast();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadVersionType, setUploadVersionType] = useState<"draft" | "final">("draft");
  const [uploadForPlaceholder, setUploadForPlaceholder] = useState<string | null>(null);
  const [uploadPlaceholderDialogOpen, setUploadPlaceholderDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const placeholderFileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/deals", dealId, "closing-documents"],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/closing-documents`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: expectedData } = useQuery<{ expectedTypes: { documentType: string; title: string }[]; dealType: string; representationRole: string | null }>({
    queryKey: ["/api/deals", dealId, "closing-documents", "expected-types"],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/closing-documents/expected-types`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const expectedTypes = expectedData?.expectedTypes || [];
  const generatedTypeSet = new Set(documents.map((d: any) => d.documentType));
  const ungeneratedTypes = expectedTypes.filter(et => !generatedTypeSet.has(et.documentType));
  const hasAnyDocs = documents.length > 0;
  const allGenerated = ungeneratedTypes.length === 0 && expectedTypes.length > 0;

  const selectedDoc = documents.find((d: any) => d.id === selectedDocId);

  const { data: currentDoc } = useQuery<any>({
    queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/closing-documents/${selectedDocId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedDocId,
  });

  const { data: versions = [] } = useQuery<any[]>({
    queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId, "versions"],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/closing-documents/${selectedDocId}/versions`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedDocId && showVersions,
  });

  const autoGenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/closing-documents/auto-generate`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents"] });
      const created = data.documents?.length || 0;
      const errors = data.errors || [];
      if (errors.length > 0) {
        setGenerationErrors(errors);
        setShowErrors(true);
      } else {
        setGenerationErrors([]);
        setShowErrors(false);
      }
      toast({
        title: created > 0 ? "Documents Generated" : "Generation Issue",
        description: created > 0
          ? `${created} closing document${created !== 1 ? "s" : ""} created successfully.${errors.length > 0 ? ` ${errors.length} could not be generated — see details below.` : ""}`
          : errors.length > 0
            ? `No documents were generated. ${errors.length} error${errors.length !== 1 ? "s" : ""} occurred — see details below.`
            : "All documents already exist for this deal.",
        variant: errors.length > 0 && created === 0 ? "destructive" : undefined,
      });
    },
    onError: (err: any) => {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ content, status }: { content?: string; status?: string }) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/closing-documents/${selectedDocId}`, { content, status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId, "versions"] });
      setIsEditing(false);
      toast({ title: "Saved", description: "Document updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const aiEditMutation = useMutation({
    mutationFn: async ({ instruction, source }: { instruction: string; source?: string }) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/closing-documents/${selectedDocId}/ai-edit`, { instruction, source });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId, "versions"] });
      setAiInstruction("");
      toast({ title: "Document Updated", description: "AI has applied your changes." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/closing-documents/${selectedDocId}/restore/${versionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId, "versions"] });
      toast({ title: "Restored", description: "Document restored to selected version." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await apiRequest("DELETE", `/api/deals/${dealId}/closing-documents/${docId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents"] });
      setSelectedDocId(null);
      toast({ title: "Deleted", description: "Document removed." });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, versionType }: { file: File; versionType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("versionType", versionType);
      const res = await fetch(`/api/deals/${dealId}/closing-documents/${selectedDocId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents", selectedDocId, "versions"] });
      setUploadDialogOpen(false);
      toast({ title: "Uploaded", description: `Document uploaded as ${uploadVersionType === "final" ? "final" : "draft"} version.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uploadNewMutation = useMutation({
    mutationFn: async ({ file, documentType, versionType }: { file: File; documentType: string; versionType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      formData.append("versionType", versionType);
      const res = await fetch(`/api/deals/${dealId}/closing-documents/upload-new`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "closing-documents"] });
      setUploadPlaceholderDialogOpen(false);
      setUploadForPlaceholder(null);
      toast({ title: "Uploaded", description: "Document uploaded successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/closing-documents/${selectedDocId}/download`, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentDoc?.title || "document"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [dealId, selectedDocId, currentDoc]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not Supported", description: "Speech recognition is not supported in this browser.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (transcript.trim()) {
        aiEditMutation.mutate({ instruction: transcript, source: "voice_edit" });
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast({ title: "Error", description: "Speech recognition failed. Please try again.", variant: "destructive" });
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, aiEditMutation, toast]);

  const handleUploadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ file, versionType: uploadVersionType });
    }
    e.target.value = "";
  }, [uploadMutation, uploadVersionType]);

  const handlePlaceholderUploadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadForPlaceholder) {
      uploadNewMutation.mutate({ file, documentType: uploadForPlaceholder, versionType: uploadVersionType });
    }
    e.target.value = "";
  }, [uploadNewMutation, uploadForPlaceholder, uploadVersionType]);

  const startEditing = useCallback(() => {
    setEditContent(currentDoc?.content || "");
    setIsEditing(true);
  }, [currentDoc]);

  if (selectedDocId && currentDoc) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedDocId(null); setIsEditing(false); setShowVersions(false); }} data-testid="button-back-to-list">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{currentDoc.title}</h3>
          </div>
          <Badge variant={STATUS_COLORS[currentDoc.status] as any} data-testid="badge-doc-status">
            {STATUS_LABELS[currentDoc.status] || currentDoc.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={currentDoc.status}
            onValueChange={(val) => saveMutation.mutate({ status: val })}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-doc-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="executed">Executed</SelectItem>
            </SelectContent>
          </Select>

          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-doc">
              <Edit3 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => saveMutation.mutate({ content: editContent })} disabled={saveMutation.isPending} data-testid="button-save-doc">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
            </>
          )}

          <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download-doc">
            <Download className="h-4 w-4 mr-1" />
            Word
          </Button>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={uploadMutation.isPending} data-testid="button-upload-doc">
                {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileUp className="h-4 w-4 mr-1" />}
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document Version</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Version Type</Label>
                  <Select value={uploadVersionType} onValueChange={(v) => setUploadVersionType(v as "draft" | "final")}>
                    <SelectTrigger data-testid="select-upload-version-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="final">Final (marks document as Executed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select File (.docx)</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={handleUploadFile}
                    data-testid="input-upload-file"
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant={showVersions ? "default" : "outline"}
            size="sm"
            onClick={() => setShowVersions(!showVersions)}
            data-testid="button-toggle-versions"
          >
            <History className="h-4 w-4 mr-1" />
            v{currentDoc.currentVersion}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="Tell AI what to change... e.g. 'Change closing date to April 15'"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && aiInstruction.trim()) {
                      aiEditMutation.mutate({ instruction: aiInstruction });
                    }
                  }}
                  disabled={aiEditMutation.isPending}
                  data-testid="input-ai-instruction"
                />
              </div>
              <Button
                size="icon"
                onClick={() => {
                  if (aiInstruction.trim()) aiEditMutation.mutate({ instruction: aiInstruction });
                }}
                disabled={!aiInstruction.trim() || aiEditMutation.isPending}
                data-testid="button-send-ai-edit"
              >
                {aiEditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant={isRecording ? "destructive" : "outline"}
                onClick={toggleRecording}
                disabled={aiEditMutation.isPending}
                data-testid="button-voice-edit"
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            {isRecording && (
              <p className="text-sm text-muted-foreground mb-3">Listening... speak your edit instruction</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <div className={`flex-1 min-w-0 ${showVersions ? "max-w-[65%]" : ""}`}>
            {isEditing ? (
              <RichTextEditor
                content={editContent}
                onChange={(html) => setEditContent(html)}
                editable={true}
              />
            ) : (
              <RichTextEditor
                content={currentDoc.content || ""}
                editable={false}
              />
            )}
          </div>

          {showVersions && (
            <div className="w-[35%] min-w-[280px]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Version History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[550px] overflow-y-auto">
                  {versions.map((v: any) => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-md border ${v.versionNumber === currentDoc.currentVersion ? "border-primary/30 bg-primary/5" : ""}`}
                      data-testid={`version-entry-${v.versionNumber}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium">v{v.versionNumber}</span>
                        <Badge variant="secondary" className="text-xs">
                          {SOURCE_LABELS[v.source] || v.source}
                        </Badge>
                      </div>
                      {v.changeDescription && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.changeDescription}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                        {v.versionNumber !== currentDoc.currentVersion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreMutation.mutate(v.id)}
                            disabled={restoreMutation.isPending}
                            data-testid={`button-restore-version-${v.versionNumber}`}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {versions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No versions yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  const generatedCount = documents.length;
  const totalExpected = expectedTypes.length;
  const pendingCount = ungeneratedTypes.length;

  return (
    <div className="space-y-4">
      {showErrors && generationErrors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                {generationErrors.length} Document{generationErrors.length !== 1 ? "s" : ""} Could Not Be Generated
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowErrors(false)} data-testid="button-dismiss-errors">
                Dismiss
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {generationErrors.map((err, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-destructive flex-shrink-0" />
                  <span>{err}</span>
                </p>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => { setGenerationErrors([]); setShowErrors(false); autoGenMutation.mutate(); }}
              disabled={autoGenMutation.isPending}
              data-testid="button-retry-generation"
            >
              {autoGenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Retry Failed Documents
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Closing Documents
              </CardTitle>
              <CardDescription>
                {totalExpected > 0 ? (
                  <>
                    {generatedCount} of {totalExpected} documents generated
                    {expectedData?.dealType && (
                      <span className="ml-1">
                        for {expectedData.dealType.replace(/_/g, " ")} deal
                        {expectedData.representationRole ? ` (representing ${expectedData.representationRole})` : ""}
                      </span>
                    )}
                  </>
                ) : (
                  "Auto-generated legal documents for this deal, with AI editing and version tracking"
                )}
              </CardDescription>
            </div>
            {!allGenerated && (
              <Button
                onClick={() => autoGenMutation.mutate()}
                disabled={autoGenMutation.isPending}
                data-testid="button-auto-generate-docs"
              >
                {autoGenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {autoGenMutation.isPending ? "Generating..." : hasAnyDocs ? `Generate Remaining (${pendingCount})` : "Auto-Generate Documents"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">Loading documents...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-md border hover-elevate cursor-pointer"
                  onClick={() => { setSelectedDocId(doc.id); setShowVersions(false); setIsEditing(false); }}
                  data-testid={`closing-doc-${doc.id}`}
                >
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      v{doc.currentVersion} · Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={STATUS_COLORS[doc.status] as any} className="flex-shrink-0">
                    {STATUS_LABELS[doc.status] || doc.status}
                  </Badge>
                  {doc.versionCount > 1 && (
                    <Badge variant="secondary" className="flex-shrink-0">
                      <History className="h-3 w-3 mr-1" />
                      {doc.versionCount}
                    </Badge>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{doc.title}"? This action cannot be undone and all version history will be lost.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(doc.id)} data-testid="button-confirm-delete">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}

              {ungeneratedTypes.map((et) => (
                <div
                  key={`pending-${et.documentType}`}
                  className="flex items-center gap-3 p-3 rounded-md border border-dashed opacity-70"
                  data-testid={`closing-doc-pending-${et.documentType}`}
                >
                  <FileText className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-muted-foreground">{et.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Awaiting generation
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadForPlaceholder(et.documentType);
                      setUploadVersionType("draft");
                      setUploadPlaceholderDialogOpen(true);
                    }}
                    data-testid={`button-upload-placeholder-${et.documentType}`}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Upload
                  </Button>
                  <Badge variant="secondary" className="flex-shrink-0 text-muted-foreground">
                    Not Generated
                  </Badge>
                </div>
              ))}

              {expectedTypes.length === 0 && documents.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Loading expected document types...</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadPlaceholderDialogOpen} onOpenChange={setUploadPlaceholderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Version Type</Label>
              <Select value={uploadVersionType} onValueChange={(v) => setUploadVersionType(v as "draft" | "final")}>
                <SelectTrigger data-testid="select-placeholder-upload-version-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="final">Final (marks document as Executed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select File (.docx)</Label>
              <Input
                ref={placeholderFileInputRef}
                type="file"
                accept=".docx"
                onChange={handlePlaceholderUploadFile}
                data-testid="input-placeholder-upload-file"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
