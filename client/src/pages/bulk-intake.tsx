import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Upload,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  FolderOpen,
  X,
  GripVertical,
  RefreshCw,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface BulkIntakeDocument {
  id: string;
  sessionId: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  ocrStatus: string | null;
  extractedText: string | null;
  documentDate: string | null;
  aiSummary: string | null;
  assignedCluster: string | null;
}

interface ClusterGroup {
  clusterId: string;
  suggestedTitle: string;
  suggestedDealType: string;
  reasoning: string;
  address?: string;
  parties?: string[];
  dateRange?: { earliest: string; latest: string };
  documentIds: string[];
}

interface ClusteringResult {
  clusters: ClusterGroup[];
  unclustered: string[];
}

interface SessionData {
  id: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  clusteringResult: ClusteringResult | null;
  errorMessage: string | null;
  documents: BulkIntakeDocument[];
}

type Step = "upload" | "processing" | "review" | "confirm";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BulkIntake() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editableClusters, setEditableClusters] = useState<ClusteringResult | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: session, refetch: refetchSession } = useQuery<SessionData>({
    queryKey: ["/api/bulk-intake/sessions", sessionId],
    enabled: !!sessionId,
    refetchInterval: currentStep === "processing" ? 2000 : false,
  });

  useEffect(() => {
    if (!session) return;

    if (currentStep === "processing") {
      if (session.status === "failed") {
        toast({
          title: "Processing failed",
          description: session.errorMessage || "An error occurred during processing.",
          variant: "destructive",
        });
        setCurrentStep("upload");
        setSelectedFiles([]);
        setSessionId(null);
      } else if (session.status === "review" && session.clusteringResult) {
        setEditableClusters(session.clusteringResult);
        const allIds = new Set(session.clusteringResult.clusters.map((c: ClusterGroup) => c.clusterId));
        setExpandedClusters(allIds);
        setCurrentStep("review");
      }
    }
  }, [session, currentStep]);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bulk-intake/sessions");
      return res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.id);
    },
  });

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const supported = fileArray.filter((f) => {
      const ext = f.name.toLowerCase().split(".").pop() || "";
      return ["pdf", "doc", "docx", "xlsx", "xls", "csv", "png", "jpg", "jpeg", "gif", "webp", "tiff", "bmp", "txt"].includes(ext);
    });

    if (supported.length < fileArray.length) {
      toast({
        title: "Some files skipped",
        description: `${fileArray.length - supported.length} unsupported files were excluded.`,
      });
    }

    setSelectedFiles((prev) => [...prev, ...supported]);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndProcess = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let sid = sessionId;
      if (!sid) {
        const res = await apiRequest("POST", "/api/bulk-intake/sessions");
        const data = await res.json();
        sid = data.id;
        setSessionId(sid);
      }

      const BATCH_SIZE = 10;
      for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
        const batch = selectedFiles.slice(i, i + BATCH_SIZE);
        const formData = new FormData();
        batch.forEach((f) => formData.append("files", f));

        const uploadRes = await fetch(`/api/bulk-intake/sessions/${sid}/upload`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({ message: "Upload failed" }));
          throw new Error(errData.message || `Upload failed (${uploadRes.status})`);
        }

        setUploadProgress(Math.min(100, Math.round(((i + batch.length) / selectedFiles.length) * 100)));
      }

      await apiRequest("POST", `/api/bulk-intake/sessions/${sid}/process`);

      setCurrentStep("processing");
      setIsUploading(false);
      refetchSession();
    } catch (err: any) {
      setIsUploading(false);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const handleMoveDocument = (docId: string, fromClusterId: string | null, toClusterId: string | null) => {
    if (!editableClusters) return;

    const updated = { ...editableClusters };
    updated.clusters = updated.clusters.map((c) => ({
      ...c,
      documentIds: c.documentIds.filter((id) => id !== docId),
    }));
    updated.unclustered = (updated.unclustered || []).filter((id) => id !== docId);

    if (toClusterId) {
      const targetCluster = updated.clusters.find((c) => c.clusterId === toClusterId);
      if (targetCluster) {
        targetCluster.documentIds.push(docId);
      }
    } else {
      updated.unclustered.push(docId);
    }

    setEditableClusters(updated);
  };

  const handleRemoveCluster = (clusterId: string) => {
    if (!editableClusters) return;

    const cluster = editableClusters.clusters.find((c) => c.clusterId === clusterId);
    if (!cluster) return;

    const updated = {
      clusters: editableClusters.clusters.filter((c) => c.clusterId !== clusterId),
      unclustered: [...(editableClusters.unclustered || []), ...cluster.documentIds],
    };
    setEditableClusters(updated);
  };

  const handleUpdateTitle = (clusterId: string, newTitle: string) => {
    if (!editableClusters) return;
    setEditableClusters({
      ...editableClusters,
      clusters: editableClusters.clusters.map((c) =>
        c.clusterId === clusterId ? { ...c, suggestedTitle: newTitle } : c
      ),
    });
    setEditingTitle(null);
  };

  const saveClustering = useMutation({
    mutationFn: async () => {
      if (!sessionId || !editableClusters) return;
      await apiRequest("PUT", `/api/bulk-intake/sessions/${sessionId}/clusters`, editableClusters);
    },
    onSuccess: () => {
      toast({ title: "Clustering saved" });
      refetchSession();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;
      if (editableClusters) {
        await apiRequest("PUT", `/api/bulk-intake/sessions/${sessionId}/clusters`, editableClusters);
      }
      const res = await apiRequest("POST", `/api/bulk-intake/sessions/${sessionId}/confirm`);
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentStep("confirm");
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({
        title: "Deals created",
        description: `${data.deals.length} deals created from your documents.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create deals", description: err.message, variant: "destructive" });
    },
  });

  const getDocById = (docId: string): BulkIntakeDocument | undefined => {
    return session?.documents?.find((d) => d.id === docId);
  };

  const toggleClusterExpand = (clusterId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload Documents" },
    { key: "processing", label: "Processing" },
    { key: "review", label: "Review Grouping" },
    { key: "confirm", label: "Complete" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/transactions/deals")} data-testid="button-back-deals">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Bulk Deal Intake</h1>
          <p className="text-sm text-muted-foreground">Upload multiple documents and let AI organize them into deals</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${
              i < stepIndex ? "bg-primary/10 text-primary" :
              i === stepIndex ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`} data-testid={`step-indicator-${step.key}`}>
              {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              <span>{step.label}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {currentStep === "upload" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div
                className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-border"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                data-testid="dropzone-upload"
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-lg font-medium mb-1">Drop files here or click to browse</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports PDF, Word, Excel, images, and text files
                </p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-browse-files">
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp,.tiff,.bmp,.txt"
                  onChange={(e) => {
                    if (e.target.files) handleFileSelect(e.target.files);
                    e.target.value = "";
                  }}
                  data-testid="input-file-upload"
                />
              </div>
            </CardContent>
          </Card>

          {selectedFiles.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">{selectedFiles.length} files selected</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])} data-testid="button-clear-files">
                  Clear all
                </Button>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate" data-testid={`file-item-${i}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(i)} data-testid={`button-remove-file-${i}`}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {isUploading ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Uploading... {uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} data-testid="progress-upload" />
                  </div>
                ) : (
                  <Button className="mt-4 w-full" onClick={handleUploadAndProcess} data-testid="button-upload-process">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process {selectedFiles.length} Files
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {currentStep === "processing" && session && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <div>
              <h3 className="text-lg font-medium" data-testid="text-processing-title">
                {session.status === "clustering" ? "AI is grouping documents into deals..." : "Processing documents..."}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {session.status === "clustering"
                  ? "Analyzing content to identify related documents"
                  : `${session.processedFiles || 0} of ${session.totalFiles || 0} documents processed`}
              </p>
            </div>
            {session.status !== "clustering" && (
              <Progress
                value={session.totalFiles ? ((session.processedFiles || 0) / session.totalFiles) * 100 : 0}
                data-testid="progress-processing"
              />
            )}
            <div className="max-h-40 overflow-y-auto text-left space-y-1 mt-4">
              {session.documents?.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm py-1">
                  {doc.ocrStatus === "completed" ? (
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : doc.ocrStatus === "failed" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : doc.ocrStatus === "processing" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border shrink-0" />
                  )}
                  <span className="truncate">{doc.fileName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review" && editableClusters && session && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Sparkles className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    AI grouped {session.documents?.length || 0} documents into {editableClusters.clusters.length} deals
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag documents between groups or remove groups as needed. Click a deal title to rename it.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveClustering.mutate()}
                  disabled={saveClustering.isPending}
                  data-testid="button-save-clusters"
                >
                  {saveClustering.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {editableClusters.clusters.map((cluster) => (
            <Card key={cluster.clusterId}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                    {editingTitle === cluster.clusterId ? (
                      <Input
                        defaultValue={cluster.suggestedTitle}
                        autoFocus
                        className="max-w-sm"
                        onBlur={(e) => handleUpdateTitle(cluster.clusterId, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateTitle(cluster.clusterId, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setEditingTitle(null);
                        }}
                        data-testid={`input-cluster-title-${cluster.clusterId}`}
                      />
                    ) : (
                      <button
                        className="text-left font-semibold hover:underline cursor-pointer"
                        onClick={() => setEditingTitle(cluster.clusterId)}
                        data-testid={`button-edit-title-${cluster.clusterId}`}
                      >
                        {cluster.suggestedTitle}
                      </button>
                    )}
                    <Badge variant="secondary">{cluster.suggestedDealType}</Badge>
                    <Badge variant="outline">{cluster.documentIds.length} docs</Badge>
                  </div>
                  {cluster.address && (
                    <p className="text-xs text-muted-foreground mt-1">{cluster.address}</p>
                  )}
                  {cluster.reasoning && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">{cluster.reasoning}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleClusterExpand(cluster.clusterId)}
                    data-testid={`button-toggle-cluster-${cluster.clusterId}`}
                  >
                    {expandedClusters.has(cluster.clusterId) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCluster(cluster.clusterId)}
                    data-testid={`button-remove-cluster-${cluster.clusterId}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {expandedClusters.has(cluster.clusterId) && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {cluster.documentIds.map((docId) => {
                      const doc = getDocById(docId);
                      if (!doc) return null;
                      return (
                        <div
                          key={docId}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-md hover-elevate"
                          data-testid={`cluster-doc-${docId}`}
                        >
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{doc.fileName}</p>
                            {doc.aiSummary && (
                              <p className="text-xs text-muted-foreground truncate">{doc.aiSummary}</p>
                            )}
                          </div>
                          {doc.ocrStatus === "failed" && (
                            <Badge variant="destructive">OCR Failed</Badge>
                          )}
                          <select
                            className="text-xs border rounded px-1.5 py-0.5 bg-background"
                            value={cluster.clusterId}
                            onChange={(e) => {
                              const target = e.target.value === "__unclustered" ? null : e.target.value;
                              handleMoveDocument(docId, cluster.clusterId, target);
                            }}
                            data-testid={`select-move-doc-${docId}`}
                          >
                            {editableClusters.clusters.map((c) => (
                              <option key={c.clusterId} value={c.clusterId}>
                                {c.suggestedTitle}
                              </option>
                            ))}
                            <option value="__unclustered">Ungrouped</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {editableClusters.unclustered && editableClusters.unclustered.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  Ungrouped Documents ({editableClusters.unclustered.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {editableClusters.unclustered.map((docId) => {
                    const doc = getDocById(docId);
                    if (!doc) return null;
                    return (
                      <div
                        key={docId}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover-elevate"
                        data-testid={`unclustered-doc-${docId}`}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{doc.fileName}</p>
                          {doc.aiSummary && (
                            <p className="text-xs text-muted-foreground truncate">{doc.aiSummary}</p>
                          )}
                        </div>
                        <select
                          className="text-xs border rounded px-1.5 py-0.5 bg-background"
                          value="__unclustered"
                          onChange={(e) => {
                            if (e.target.value !== "__unclustered") {
                              handleMoveDocument(docId, null, e.target.value);
                            }
                          }}
                          data-testid={`select-move-unclustered-${docId}`}
                        >
                          <option value="__unclustered">Ungrouped</option>
                          {editableClusters.clusters.map((c) => (
                            <option key={c.clusterId} value={c.clusterId}>
                              {c.suggestedTitle}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button variant="outline" onClick={() => { setCurrentStep("upload"); setSelectedFiles([]); setSessionId(null); }} data-testid="button-start-over">
              Start Over
            </Button>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending || editableClusters.clusters.length === 0}
              data-testid="button-confirm-deals"
            >
              {confirmMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Create {editableClusters.clusters.length} Deals
            </Button>
          </div>
        </div>
      )}

      {currentStep === "confirm" && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium" data-testid="text-complete-title">Deals Created Successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your documents have been organized into deals with data rooms.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button variant="outline" onClick={() => { setCurrentStep("upload"); setSelectedFiles([]); setSessionId(null); setEditableClusters(null); }} data-testid="button-new-intake">
                <Upload className="h-4 w-4 mr-2" />
                New Bulk Upload
              </Button>
              <Button onClick={() => navigate("/transactions/deals")} data-testid="button-view-deals">
                View Deals
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
