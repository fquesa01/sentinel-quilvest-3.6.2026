import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X, FileText, Check, Loader2, Plus, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Deal = {
  id: string;
  title: string;
  dealNumber: string;
  dealType: string;
  status: string | null;
};

type DataRoom = {
  id: string;
  name: string;
  dealId: string | null;
};

const DEAL_TYPES = [
  { value: "ma_asset", label: "M&A (Asset)" },
  { value: "ma_stock", label: "M&A (Stock)" },
  { value: "merger", label: "Merger" },
  { value: "investment", label: "Investment" },
  { value: "debt", label: "Debt" },
  { value: "jv", label: "Joint Venture" },
  { value: "real_estate", label: "Real Estate" },
  { value: "franchise", label: "Franchise" },
  { value: "other", label: "Other" },
];

export default function UploadDocuments() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [dealSearch, setDealSearch] = useState("");
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealType, setNewDealType] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedRoomId, setUploadedRoomId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const filteredDeals = deals.filter((deal) => {
    if (!dealSearch.trim()) return true;
    const s = dealSearch.toLowerCase();
    return (
      deal.title.toLowerCase().includes(s) ||
      deal.dealNumber.toLowerCase().includes(s)
    );
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ roomId, dealId }: { roomId: string; dealId: string }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const res = await fetch(`/api/data-rooms/${roomId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return { data: await res.json(), roomId, dealId };
    },
    onSuccess: ({ roomId, dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "data-rooms"] });
      setUploadedRoomId(roomId);
      setUploadComplete(true);
      toast({ title: "Upload complete", description: `${files.length} file(s) uploaded successfully.` });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const handleUpload = async () => {
    if (files.length === 0) return;

    let targetDealId = selectedDealId;

    if (mode === "create") {
      if (!newDealTitle.trim() || !newDealType) return;
      try {
        const res = await apiRequest("POST", "/api/deals", {
          title: newDealTitle,
          dealType: newDealType,
        });
        const deal: Deal = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
        targetDealId = deal.id;
        setSelectedDealId(deal.id);
        setMode("select");
        toast({ title: "Deal created", description: `"${deal.title}" has been created.` });
      } catch (err: any) {
        toast({ title: "Error creating deal", description: err.message, variant: "destructive" });
        return;
      }
    }

    if (!targetDealId) return;

    const roomsRes = await fetch(`/api/deals/${targetDealId}/data-rooms`, { credentials: "include" });
    if (!roomsRes.ok) {
      toast({ title: "Error", description: "Could not fetch data rooms.", variant: "destructive" });
      return;
    }
    const rooms: DataRoom[] = await roomsRes.json();
    if (rooms.length === 0) {
      toast({ title: "Error", description: "No data room found for this deal.", variant: "destructive" });
      return;
    }
    uploadMutation.mutate({ roomId: rooms[0].id, dealId: targetDealId });
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFiles([]);
    setUploadComplete(false);
    setUploadedRoomId("");
  };

  const isUploading = uploadMutation.isPending;
  const canUpload =
    files.length > 0 &&
    !isUploading &&
    ((mode === "select" && selectedDealId) ||
      (mode === "create" && newDealTitle.trim() && newDealType));

  if (uploadComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-6 py-5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/start")}
            data-testid="button-back-to-start"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-xl font-semibold text-foreground">Upload Documents</h1>
        </header>
        <main className="flex-1 px-6 flex flex-col items-center pt-16">
          <div className="w-full max-w-lg text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2" data-testid="text-upload-success">
              Upload Complete
            </h2>
            <p className="text-muted-foreground mb-8" data-testid="text-upload-success-description">
              {files.length} file(s) have been uploaded to the data room.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate(`/transactions/data-rooms/${uploadedRoomId}`)}
                data-testid="button-go-to-data-room"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Go to Data Room
              </Button>
              <Button variant="outline" onClick={resetForm} data-testid="button-upload-more">
                Upload More Documents
              </Button>
              <Button variant="ghost" onClick={() => navigate("/start")} data-testid="button-back-home">
                Back to Home
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/start")}
          data-testid="button-back-to-start"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-serif text-xl font-semibold text-foreground">Upload Documents</h1>
      </header>

      <main className="flex-1 px-6 flex flex-col items-center">
        <div className="w-full max-w-lg space-y-6 pb-12">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" data-testid="text-section-deal">
              Select or Create a Deal
            </h2>

            <div className="flex gap-2 mb-4">
              <Button
                variant={mode === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("select")}
                data-testid="button-mode-select"
              >
                Existing Deal
              </Button>
              <Button
                variant={mode === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("create")}
                data-testid="button-mode-create"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Deal
              </Button>
            </div>

            {mode === "select" && (
              <div className="space-y-3">
                <Input
                  placeholder="Search deals by name or number..."
                  value={dealSearch}
                  onChange={(e) => setDealSearch(e.target.value)}
                  data-testid="input-deal-search"
                />
                <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-2">
                  {dealsLoading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading deals...
                    </div>
                  ) : filteredDeals.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3 text-center" data-testid="text-no-deals">
                      {dealSearch ? "No matching deals found." : "No deals available."}
                    </p>
                  ) : (
                    filteredDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDealId(deal.id)}
                        className={cn(
                          "px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                          selectedDealId === deal.id
                            ? "bg-primary/10 border border-primary/30 text-foreground"
                            : "hover-elevate text-foreground"
                        )}
                        data-testid={`card-deal-${deal.id}`}
                      >
                        <div className="font-medium">{deal.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {deal.dealNumber} · {deal.dealType?.replace(/_/g, " ")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {mode === "create" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deal-title">Deal Title</Label>
                  <Input
                    id="deal-title"
                    placeholder="Enter deal title..."
                    value={newDealTitle}
                    onChange={(e) => setNewDealTitle(e.target.value)}
                    data-testid="input-new-deal-title"
                  />
                </div>
                <div>
                  <Label htmlFor="deal-type">Deal Type</Label>
                  <Select value={newDealType} onValueChange={setNewDealType}>
                    <SelectTrigger data-testid="select-deal-type">
                      <SelectValue placeholder="Select deal type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} data-testid={`option-deal-type-${t.value}`}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" data-testid="text-section-files">
              Upload Files
            </h2>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              data-testid="dropzone-files"
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports all document types including ZIP files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2" data-testid="list-selected-files">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 px-3 py-2 bg-card border border-border rounded-md"
                    data-testid={`file-item-${index}`}
                  >
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Button
            className="w-full"
            disabled={!canUpload}
            onClick={handleUpload}
            data-testid="button-upload"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {files.length > 0 ? `${files.length} File(s)` : "Files"}
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
