import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Pause, 
  Play, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileArchive,
  Zap
} from 'lucide-react';
import { 
  uploadManager, 
  uploadDb, 
  generateFileFingerprint,
  shouldCompress,
  type UploadSession, 
  type UploadProgress 
} from '@/lib/chunked-upload';

interface ChunkedUploaderProps {
  caseId: string;
  uploadType: 'document' | 'evidence' | 'ingestion';
  onUploadComplete: (result: { 
    fileName: string; 
    filePath: string; 
    fileSize: number;
    sessionId: string;
  }) => void;
  onUploadError?: (error: Error) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
}

interface UploadItem {
  file: File;
  session: UploadSession | null;
  progress: UploadProgress | null;
  error: string | null;
}

export function ChunkedUploader({
  caseId,
  uploadType,
  onUploadComplete,
  onUploadError,
  accept,
  multiple = false,
  className = '',
  disabled = false
}: ChunkedUploaderProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [enableCompression, setEnableCompression] = useState(true);
  const [pendingUploads, setPendingUploads] = useState<UploadSession[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for pending uploads on mount
  useEffect(() => {
    async function checkPendingUploads() {
      try {
        const pending = await uploadManager.getPendingUploads();
        const relevantPending = pending.filter(
          s => s.caseId === caseId && s.uploadType === uploadType
        );
        setPendingUploads(relevantPending);
      } catch (error) {
        console.error('[ChunkedUploader] Error checking pending uploads:', error);
      }
    }
    checkPendingUploads();
  }, [caseId, uploadType]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const willCompress = enableCompression && shouldCompress(file);
      
      try {
        const session = await uploadManager.createSession(
          file,
          caseId,
          uploadType,
          enableCompression
        );
        
        const newUpload: UploadItem = {
          file,
          session,
          progress: null,
          error: null
        };
        
        setUploads(prev => [...prev, newUpload]);
        
        // Start the upload
        uploadManager.startUpload(
          session.id,
          file,
          (progress) => {
            setUploads(prev => prev.map(u => 
              u.session?.id === session.id 
                ? { ...u, progress } 
                : u
            ));
            
            if (progress.status === 'completed' && progress.finalResult) {
              // Use the finalize response directly (no separate API call needed)
              onUploadComplete({
                fileName: progress.finalResult.fileName,
                filePath: progress.finalResult.objectStoragePath || progress.finalResult.filePath,
                fileSize: progress.finalResult.fileSize,
                sessionId: session.id
              });
            }
          }
        ).catch(error => {
          if (error.name !== 'AbortError') {
            setUploads(prev => prev.map(u =>
              u.session?.id === session.id
                ? { ...u, error: error.message }
                : u
            ));
            onUploadError?.(error);
          }
        });
        
      } catch (error: any) {
        console.error('[ChunkedUploader] Failed to start upload:', error);
        onUploadError?.(error);
      }
    }
  }, [caseId, uploadType, enableCompression, onUploadComplete, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(multiple ? files : [files[0]]);
    }
  }, [disabled, multiple, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFiles]);

  const pauseUpload = useCallback((sessionId: string) => {
    uploadManager.pauseUpload(sessionId);
    setUploads(prev => prev.map(u =>
      u.session?.id === sessionId
        ? { ...u, progress: u.progress ? { ...u.progress, status: 'paused' } : null }
        : u
    ));
  }, []);

  const resumeUpload = useCallback(async (sessionId: string) => {
    const upload = uploads.find(u => u.session?.id === sessionId);
    if (!upload) return;
    
    try {
      await uploadManager.resumeUpload(sessionId, upload.file);
    } catch (error: any) {
      setUploads(prev => prev.map(u =>
        u.session?.id === sessionId
          ? { ...u, error: error.message }
          : u
      ));
    }
  }, [uploads]);

  const cancelUpload = useCallback(async (sessionId: string) => {
    await uploadManager.cancelUpload(sessionId);
    setUploads(prev => prev.filter(u => u.session?.id !== sessionId));
  }, []);

  const resumePendingUpload = useCallback(async (session: UploadSession) => {
    // User needs to re-select the file to resume
    // We'll prompt them to do so
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || '*/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // Verify file matches
      const fingerprint = await generateFileFingerprint(file);
      if (fingerprint !== session.fileFingerprint) {
        alert('The selected file does not match the original upload. Please select the correct file.');
        return;
      }
      
      // Add to uploads and resume
      const newUpload: UploadItem = {
        file,
        session,
        progress: {
          sessionId: session.id,
          fileName: session.fileName,
          totalBytes: session.fileSize,
          uploadedBytes: 0,
          percentage: Math.round((session.uploadedChunks.length / session.totalChunks) * 100),
          speed: 0,
          estimatedTimeRemaining: 0,
          status: 'uploading',
          compressed: session.compressed,
          currentChunk: session.uploadedChunks.length,
          totalChunks: session.totalChunks
        },
        error: null
      };
      
      setUploads(prev => [...prev, newUpload]);
      setPendingUploads(prev => prev.filter(s => s.id !== session.id));
      
      try {
        await uploadManager.resumeUpload(session.id, file);
      } catch (error: any) {
        setUploads(prev => prev.map(u =>
          u.session?.id === session.id
            ? { ...u, error: error.message }
            : u
        ));
      }
    };
    
    input.click();
  }, [accept]);

  const dismissPendingUpload = useCallback(async (sessionId: string) => {
    await uploadManager.cancelUpload(sessionId);
    setPendingUploads(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const activeUploads = uploads.filter(u => 
    u.progress?.status === 'uploading' || 
    u.progress?.status === 'pending' ||
    u.progress?.status === 'paused'
  );

  const completedUploads = uploads.filter(u => u.progress?.status === 'completed');
  const failedUploads = uploads.filter(u => u.progress?.status === 'failed' || u.error);

  return (
    <div className={className}>
      {/* Pending uploads notice */}
      {pendingUploads.length > 0 && (
        <Card className="mb-4 border-amber-500/50 bg-amber-500/5" data-testid="pending-uploads-notice">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Incomplete uploads found
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              You have uploads that were interrupted. Would you like to resume them?
            </p>
            <div className="space-y-2">
              {pendingUploads.map(session => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-2 bg-background rounded border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.uploadedChunks.length}/{session.totalChunks} chunks uploaded
                      ({Math.round((session.uploadedChunks.length / session.totalChunks) * 100)}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resumePendingUpload(session)}
                      data-testid={`button-resume-pending-${session.id}`}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissPendingUpload(session.id)}
                      data-testid={`button-dismiss-pending-${session.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compression toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Switch
          id="compression-toggle"
          checked={enableCompression}
          onCheckedChange={setEnableCompression}
          disabled={disabled || activeUploads.length > 0}
          data-testid="switch-compression"
        />
        <Label htmlFor="compression-toggle" className="flex items-center gap-1.5 text-sm cursor-pointer">
          <FileArchive className="h-4 w-4" />
          Enable compression
          <span className="text-muted-foreground">(faster uploads for text files)</span>
        </Label>
      </div>

      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        data-testid="dropzone-chunked-upload"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
          data-testid="input-file-chunked"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-full bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">
              {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse • Supports large files with resume capability
            </p>
          </div>
          {enableCompression && (
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              Compression enabled
            </Badge>
          )}
        </div>
      </div>

      {/* Active uploads */}
      {activeUploads.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-medium">Uploading</h4>
          {activeUploads.map(upload => (
            <Card key={upload.session?.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate" data-testid={`text-filename-${upload.session?.id}`}>
                        {upload.file.name}
                      </p>
                      {upload.session?.compressed && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <FileArchive className="h-3 w-3" />
                          Compressed
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{formatBytes(upload.file.size)}</span>
                      {upload.progress?.compressionRatio && (
                        <span className="text-green-600 dark:text-green-400">
                          {upload.progress.compressionRatio.toFixed(0)}% smaller
                        </span>
                      )}
                      {upload.progress?.speed ? (
                        <span>{formatBytes(upload.progress.speed)}/s</span>
                      ) : null}
                      {upload.progress?.estimatedTimeRemaining ? (
                        <span>~{formatTime(upload.progress.estimatedTimeRemaining)} remaining</span>
                      ) : null}
                    </div>

                    <div className="mt-3">
                      <Progress 
                        value={upload.progress?.percentage || 0} 
                        className="h-2"
                        data-testid={`progress-upload-${upload.session?.id}`}
                      />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>
                          Chunk {upload.progress?.currentChunk || 0} of {upload.progress?.totalChunks || upload.session?.totalChunks || 0}
                        </span>
                        <span data-testid={`text-percentage-${upload.session?.id}`}>
                          {upload.progress?.percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {upload.progress?.status === 'uploading' ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          pauseUpload(upload.session!.id);
                        }}
                        data-testid={`button-pause-${upload.session?.id}`}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : upload.progress?.status === 'paused' ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          resumeUpload(upload.session!.id);
                        }}
                        data-testid={`button-resume-${upload.session?.id}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelUpload(upload.session!.id);
                      }}
                      data-testid={`button-cancel-${upload.session?.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {upload.error && (
                  <div className="mt-3 p-2 bg-destructive/10 text-destructive rounded text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{upload.error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed uploads */}
      {completedUploads.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-green-600 dark:text-green-400">Completed</h4>
          {completedUploads.map(upload => (
            <div 
              key={upload.session?.id}
              className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
            >
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{upload.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(upload.file.size)}
                  {upload.progress?.compressionRatio && (
                    <span className="text-green-600 dark:text-green-400 ml-2">
                      ({upload.progress.compressionRatio.toFixed(0)}% compression)
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Failed uploads */}
      {failedUploads.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-destructive">Failed</h4>
          {failedUploads.map(upload => (
            <div 
              key={upload.session?.id}
              className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
            >
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{upload.file.name}</p>
                <p className="text-sm text-destructive">{upload.error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setUploads(prev => prev.filter(u => u.session?.id !== upload.session?.id));
                  handleFiles([upload.file]);
                }}
                data-testid={`button-retry-${upload.session?.id}`}
              >
                Retry
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChunkedUploader;
