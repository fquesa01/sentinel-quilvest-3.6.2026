import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle,
  File,
  FileArchive,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { Case } from "@shared/schema";

interface SelectedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
  maxFileSize?: number;
  maxFiles?: number;
  acceptedFileTypes?: string[];
}

export function FileUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  maxFileSize = 1073741824, // 1GB default
  maxFiles = 10,
  acceptedFileTypes = [".pst", ".eml", ".msg", ".mbox", ".pdf", ".docx", ".txt"]
}: FileUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available cases for selection
  const { data: cases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    enabled: open,
  });

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch(ext) {
      case 'pst':
      case 'zip':
      case 'tar':
        return <FileArchive className="h-4 w-4" />;
      case 'eml':
      case 'msg':
      case 'mbox':
        return <Mail className="h-4 w-4" />;
      case 'pdf':
      case 'docx':
      case 'doc':
      case 'txt':
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File ${file.name} exceeds maximum size of ${formatFileSize(maxFileSize)}`;
    }

    // Check file type
    const ext = '.' + file.name.toLowerCase().split('.').pop();
    if (acceptedFileTypes.length > 0 && !acceptedFileTypes.includes(ext)) {
      return `File type ${ext} is not supported. Supported types: ${acceptedFileTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: SelectedFile[] = [];
    const errors: string[] = [];

    // Check total file count
    if (selectedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      if (validationError) {
        errors.push(validationError);
      } else {
        // Check for duplicates
        const isDuplicate = selectedFiles.some(f => 
          f.file.name === file.name && f.file.size === file.size
        );
        
        if (!isDuplicate) {
          newFiles.push({
            file,
            id: Math.random().toString(36).substring(7),
            status: "pending",
            progress: 0,
          });
        }
      }
    }

    if (errors.length > 0) {
      setError(errors[0]); // Show first error
    } else {
      setError(null);
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (fileInfo: SelectedFile) => {
    return new Promise<void>((resolve, reject) => {
      (async () => {
        try {
          // Update status to uploading
          setSelectedFiles(prev => prev.map(f =>
            f.id === fileInfo.id ? { ...f, status: "uploading", progress: 0 } : f
          ));

          // Get presigned URL
          const response = await apiRequest("GET", "/api/ingestion/upload-url");
          const { url, method } = await response.json();

          // Upload file directly to S3 using XMLHttpRequest for progress tracking
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setSelectedFiles(prev => prev.map(f =>
                f.id === fileInfo.id ? { ...f, progress: percentComplete } : f
              ));
            }
          };

          // Handle successful upload
          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                // Register file with backend (pass full presigned URL for normalization)
                await apiRequest("POST", "/api/ingestion/upload-complete", {
                  fileName: fileInfo.file.name,
                  fileSize: fileInfo.file.size,
                  fileType: '.' + fileInfo.file.name.toLowerCase().split('.').pop(),
                  objectKey: url, // Pass full URL - backend will normalize it
                  caseId: selectedCaseId, // Include selected case
                });

                // Update status to success
                setSelectedFiles(prev => prev.map(f =>
                  f.id === fileInfo.id ? { ...f, status: "success", progress: 100 } : f
                ));
                resolve();
              } catch (error: any) {
                console.error("Registration error:", error);
                setSelectedFiles(prev => prev.map(f =>
                  f.id === fileInfo.id ? { 
                    ...f, 
                    status: "error", 
                    error: error.message || "Failed to register file" 
                  } : f
                ));
                reject(error);
              }
            } else {
              const error = new Error(`Upload failed: ${xhr.statusText}`);
              console.error("Upload error:", error);
              setSelectedFiles(prev => prev.map(f =>
                f.id === fileInfo.id ? { 
                  ...f, 
                  status: "error", 
                  error: error.message 
                } : f
              ));
              reject(error);
            }
          };

          // Handle upload error
          xhr.onerror = () => {
            const error = new Error("Upload failed due to network error");
            console.error("Upload error:", error);
            setSelectedFiles(prev => prev.map(f =>
              f.id === fileInfo.id ? { 
                ...f, 
                status: "error", 
                error: error.message 
              } : f
            ));
            reject(error);
          };

          // Start the upload
          xhr.open(method || "PUT", url);
          xhr.setRequestHeader("Content-Type", fileInfo.file.type || "application/octet-stream");
          xhr.send(fileInfo.file);
        } catch (error: any) {
          console.error("Upload error:", error);
          setSelectedFiles(prev => prev.map(f =>
            f.id === fileInfo.id ? { 
              ...f, 
              status: "error", 
              error: error.message || "Upload failed" 
            } : f
          ));
          reject(error);
        }
      })();
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      // Upload all pending files
      const pendingFiles = selectedFiles.filter(f => f.status === "pending");
      await Promise.all(pendingFiles.map(uploadFile));

      // Check if all files uploaded successfully
      const allSuccess = selectedFiles.every(f => 
        f.status === "success" || f.status === "uploading"
      );

      if (allSuccess) {
        setTimeout(() => {
          onUploadComplete?.();
          onOpenChange(false);
          setSelectedFiles([]);
          setError(null);
        }, 1000);
      }
    } catch (error: any) {
      setError(error.message || "Failed to start upload");
    }
  };

  const handleClose = () => {
    if (selectedFiles.some(f => f.status === "uploading")) {
      // Don't close if uploads are in progress
      return;
    }
    onOpenChange(false);
    setSelectedFiles([]);
    setError(null);
    setSelectedCaseId(null);
  };

  const isUploading = selectedFiles.some(f => f.status === "uploading");
  const hasFiles = selectedFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Documents for Ingestion</DialogTitle>
          <DialogDescription>
            Upload PST files, emails, or documents for automatic compliance analysis and monitoring.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="case-select">Link to Case (Optional)</Label>
            <Select 
              value={selectedCaseId || "none"} 
              onValueChange={(value) => setSelectedCaseId(value === "none" ? null : value)}
              disabled={isUploading}
            >
              <SelectTrigger id="case-select" data-testid="select-case">
                <SelectValue placeholder="Select a case (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" data-testid="case-option-none">No case (general ingestion)</SelectItem>
                {casesLoading && (
                  <SelectItem value="loading" disabled data-testid="case-option-loading">Loading cases...</SelectItem>
                )}
                {cases?.map((caseItem) => (
                  <SelectItem 
                    key={caseItem.id} 
                    value={caseItem.id}
                    data-testid={`case-option-${caseItem.id}`}
                  >
                    {caseItem.caseNumber} - {caseItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Linking documents to a case helps organize evidence and makes them accessible from the case page.
            </p>
          </div>

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover-elevate",
              isDragging && "border-primary bg-primary/10",
              isUploading && "cursor-not-allowed opacity-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            data-testid="dropzone-upload"
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {isDragging ? "Drop files here" : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground">
              PST, EML, MSG, MBOX, PDF, DOCX, TXT files up to {formatFileSize(maxFileSize)}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFileTypes.join(",")}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={isUploading}
            data-testid="file-input"
          />

          {hasFiles && (
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <div className="space-y-2">
                {selectedFiles.map((fileInfo) => (
                  <div
                    key={fileInfo.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                    data-testid={`file-item-${fileInfo.id}`}
                  >
                    {getFileIcon(fileInfo.file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileInfo.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileInfo.file.size)}
                      </p>
                      {fileInfo.status === "uploading" && (
                        <Progress value={fileInfo.progress} className="h-1 mt-1" />
                      )}
                      {fileInfo.error && (
                        <p className="text-xs text-destructive mt-1">{fileInfo.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {fileInfo.status === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {fileInfo.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      {fileInfo.status === "pending" && !isUploading && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFile(fileInfo.id)}
                          data-testid={`button-remove-${fileInfo.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!hasFiles || isUploading || selectedFiles.every(f => f.status === "success")}
            data-testid="button-start-upload"
          >
            {isUploading ? "Uploading..." : "Upload Files"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}