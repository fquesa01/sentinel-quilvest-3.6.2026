import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Cloud,
  Database,
  MessageSquare,
  Mail,
  FolderOpen,
  FileText,
  Users,
  Settings,
  Unplug,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  Upload,
  Archive,
  FileArchive,
  Link,
  Zap,
} from "lucide-react";
import { SiSlack, SiGoogle, SiDropbox, SiBox } from "react-icons/si";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AddSourceWizard } from "./add-source-wizard";
import { ChunkedUploader } from "@/components/ChunkedUploader";

interface ConnectorConfig {
  id: string;
  connectorType: string;
  connectorName: string;
  isActive: string;
  syncFrequency: number | null;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  configurationData: any;
  createdAt: string;
}

interface IngestionJob {
  id: string;
  connectorId: string;
  status: string;
  filesProcessed: number;
  filesTotal: number;
  startedAt: string;
  completedAt: string | null;
}

interface UploadedFile {
  id: string;
  jobId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  itemsExtracted: number;
  uploadedBy: string;
  uploadedByName: string | null;
  uploadedAt: string;
  processingCompletedAt: string | null;
  errorMessage: string | null;
}

interface ConnectedSourcesPanelProps {
  caseId: string;
}

const providerIcons: Record<string, any> = {
  chat_slack: SiSlack,
  email_m365: Mail,
  email_google: SiGoogle,
  file_share_dropbox: SiDropbox,
  file_share_box: SiBox,
  file_share_drive: FolderOpen,
  file_share_clio: FileText,
  chat_teams: MessageSquare,
  chat_zoom: MessageSquare,
  chat_whatsapp: MessageSquare,
  file_share_s3: Cloud,
};

const providerLabels: Record<string, string> = {
  chat_slack: "Slack",
  email_m365: "Microsoft 365",
  email_google: "Google Workspace",
  file_share_dropbox: "Dropbox",
  file_share_box: "Box",
  file_share_drive: "Google Drive",
  file_share_clio: "Clio",
  chat_teams: "Microsoft Teams",
  chat_zoom: "Zoom Chat",
  chat_whatsapp: "WhatsApp",
  file_share_s3: "Custom S3/Azure",
};

export function ConnectedSourcesPanel({ caseId }: ConnectedSourcesPanelProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploadedFilesOpen, setIsUploadedFilesOpen] = useState(true);
  const { toast } = useToast();

  // Handle chunked upload completion - registers file with ingestion system
  const handleUploadComplete = async (result: {
    fileName: string;
    filePath: string;
    fileSize: number;
    sessionId: string;
  }) => {
    try {
      // Get file extension for type
      const fileExtension = '.' + result.fileName.toLowerCase().split('.').pop();
      
      // Register file with ingestion system to track in database
      await apiRequest("POST", "/api/ingestion/upload-complete", {
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: fileExtension,
        objectKey: result.filePath,
        caseId: caseId,
      });
      
      toast({
        title: "File uploaded successfully",
        description: `${result.fileName} has been uploaded and will be processed automatically.`,
      });
      
      // Refresh uploaded files list
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/uploaded-files`] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
      
    } catch (error: any) {
      console.error("Error registering upload:", error);
      toast({
        title: "Upload registration failed",
        description: error?.message || "File was uploaded but couldn't be registered for processing",
        variant: "destructive",
      });
    }
  };

  // Fetch connectors for this case
  const { data: connectors = [], isLoading } = useQuery<ConnectorConfig[]>({
    queryKey: ["/api/connector-configs"],
  });

  // Fetch ingestion jobs for progress tracking with real-time updates
  const { data: ingestionJobs = [] } = useQuery<IngestionJob[]>({
    queryKey: ["/api/ingestion/jobs"],
    refetchInterval: 3000, // Poll every 3 seconds for real-time progress
  });

  // Fetch uploaded files for this case
  const { data: uploadedFiles = [], isLoading: isLoadingFiles } = useQuery<UploadedFile[]>({
    queryKey: [`/api/cases/${caseId}/uploaded-files`],
    refetchInterval: 5000, // Poll every 5 seconds for processing updates
  });

  // Filter connectors for this case
  const caseConnectors = connectors.filter((c) => {
    const config = c.configurationData as any;
    return config?.caseId === caseId;
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (connectorId: string) => {
      const res = await apiRequest("POST", `/api/connectors/${connectorId}/sync`);
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync completed",
        description: `Processed ${data.stats?.filesIngested || 0} items`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connector-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync connector",
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectorId: string) => {
      const res = await apiRequest("DELETE", `/api/connector-configs/${connectorId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Connector disconnected",
        description: "The data source has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connector-configs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect failed",
        description: error.message || "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  const getProviderIcon = (type: string) => {
    const Icon = providerIcons[type] || Cloud;
    return <Icon className="h-5 w-5" />;
  };

  const getProviderLabel = (type: string) => {
    return providerLabels[type] || type;
  };

  const getStatusBadge = (connector: ConnectorConfig) => {
    if (connector.isActive !== "true") {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Inactive
        </Badge>
      );
    }

    if (!connector.lastSyncAt) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending First Sync
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Connected
      </Badge>
    );
  };

  const getLastSyncText = (connector: ConnectorConfig) => {
    if (!connector.lastSyncAt) return "Never synced";
    
    const syncDate = new Date(connector.lastSyncAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - syncDate.getTime()) / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return format(syncDate, "MMM d, yyyy");
  };

  const getLatestJob = (connectorId: string): IngestionJob | null => {
    const jobs = ingestionJobs
      .filter((job) => job.connectorId === connectorId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return jobs[0] || null;
  };

  const getJobStatusBadge = (job: IngestionJob | null) => {
    if (!job) return null;

    if (job.status === "processing") {
      return (
        <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing {job.filesProcessed}/{job.filesTotal}
        </Badge>
      );
    }

    if (job.status === "completed") {
      return (
        <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          {job.filesProcessed} items ingested
        </Badge>
      );
    }

    if (job.status === "failed") {
      return (
        <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-700 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }

    return null;
  };

  // Format file size in human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get file type icon
  const getFileTypeIcon = (fileType: string) => {
    const emailTypes = ['pst', 'ost', 'msg', 'eml', 'mbox', 'mht', 'mhtml', 'olm'];
    const archiveTypes = ['zip', 'tar', 'gz', '7z'];
    
    if (emailTypes.includes(fileType?.toLowerCase())) {
      return <Mail className="h-4 w-4 text-blue-500" />;
    }
    if (archiveTypes.includes(fileType?.toLowerCase())) {
      return <FileArchive className="h-4 w-4 text-amber-500" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  // Get upload status badge
  const getUploadStatusBadge = (file: UploadedFile) => {
    if (file.status === 'processing') {
      return (
        <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    }
    if (file.status === 'completed' || file.status === 'complete') {
      return (
        <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          {file.itemsExtracted} items
        </Badge>
      );
    }
    if (file.status === 'failed' || file.errorMessage) {
      return (
        <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-700 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Queued
      </Badge>
    );
  };

  return (
    <>
      {/* Uploaded Files Section */}
      <Collapsible open={isUploadedFilesOpen} onOpenChange={setIsUploadedFilesOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-2 hover-elevate rounded-md p-1 -ml-1"
                data-testid="trigger-uploaded-files"
              >
                <Upload className="h-5 w-5" />
                <CardTitle className="flex items-center gap-2">
                  Uploaded Files
                  {uploadedFiles.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {uploadedFiles.length}
                    </Badge>
                  )}
                </CardTitle>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isUploadedFilesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : uploadedFiles.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No files uploaded to this case yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the "Upload Evidence" button to add email archives and documents
                  </p>
                </div>
              ) : (
                <Table data-testid="table-uploaded-files">
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedFiles.map((file) => (
                      <TableRow key={file.id} data-testid={`row-uploaded-file-${file.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getFileTypeIcon(file.fileType)}
                            <span 
                              className="max-w-[200px] truncate" 
                              title={file.fileName}
                              data-testid={`text-filename-${file.id}`}
                            >
                              {file.fileName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-filetype-${file.id}`}>
                          <Badge variant="outline" className="uppercase text-xs">
                            {file.fileType}
                          </Badge>
                        </TableCell>
                        <TableCell 
                          className="text-muted-foreground"
                          data-testid={`text-filesize-${file.id}`}
                        >
                          {formatFileSize(file.fileSize)}
                        </TableCell>
                        <TableCell data-testid={`status-file-${file.id}`}>
                          {getUploadStatusBadge(file)}
                        </TableCell>
                        <TableCell 
                          className="text-muted-foreground text-sm"
                          data-testid={`text-uploaded-by-${file.id}`}
                        >
                          {file.uploadedByName || "Unknown"}
                        </TableCell>
                        <TableCell 
                          className="text-muted-foreground text-sm"
                          data-testid={`text-uploaded-date-${file.id}`}
                        >
                          {file.uploadedAt ? format(new Date(file.uploadedAt), "MMM d, yyyy h:mm a") : "Unknown"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Connected Data Sources Section */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-2 hover-elevate rounded-md p-1 -ml-1"
                data-testid="trigger-connected-data-sources"
              >
                <Database className="h-5 w-5" />
                <CardTitle className="flex items-center gap-2">
                  Connected Data Sources
                </CardTitle>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="gap-2"
                  data-testid="button-add-source"
                >
                  <Plus className="h-4 w-4" />
                  Add Source
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setUploadDialogOpen(true)}
                  data-testid="menu-item-upload-files"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWizardOpen(true)}
                  data-testid="menu-item-connect-source"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Connect External Source
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : caseConnectors.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No data sources connected yet
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="default"
                      onClick={() => setUploadDialogOpen(true)}
                      className="gap-2"
                      data-testid="button-upload-first-file"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Files
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setWizardOpen(true)}
                      className="gap-2"
                      data-testid="button-add-first-source"
                    >
                      <Link className="h-4 w-4" />
                      Connect Source
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
              {caseConnectors.map((connector) => {
                const config = connector.configurationData as any;
                const latestJob = getLatestJob(connector.id);
                return (
                  <Card key={connector.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {getProviderIcon(connector.connectorType)}
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {connector.connectorName}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {getProviderLabel(connector.connectorType)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(connector)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Show ingestion job status */}
                      {latestJob && getJobStatusBadge(latestJob)}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Last Sync</p>
                          <p className="font-medium">{getLastSyncText(connector)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Frequency</p>
                          <p className="font-medium">
                            {connector.syncFrequency
                              ? `Every ${Math.floor(connector.syncFrequency / 60)} min`
                              : "Manual"}
                          </p>
                        </div>
                      </div>

                      {config?.scope && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Monitored Scope</p>
                          <div className="flex flex-wrap gap-1">
                            {config.scope.slice(0, 3).map((item: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                            {config.scope.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{config.scope.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {config?.custodianCount > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {config.custodianCount} custodian{config.custodianCount !== 1 ? "s" : ""} mapped
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncMutation.mutate(connector.id)}
                          disabled={syncMutation.isPending}
                          className="flex-1 gap-2"
                          data-testid={`button-sync-${connector.id}`}
                        >
                          {syncMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Sync Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`button-settings-${connector.id}`}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Disconnect this source? Existing data will remain.")) {
                              disconnectMutation.mutate(connector.id);
                            }
                          }}
                          disabled={disconnectMutation.isPending}
                          data-testid={`button-disconnect-${connector.id}`}
                        >
                          <Unplug className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
                })}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Add Source Wizard */}
      <AddSourceWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        caseId={caseId}
      />

      {/* Upload Files Dialog with ChunkedUploader */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Upload Evidence Files
            </DialogTitle>
            <DialogDescription>
              Upload files with pause/resume capability, compression, and progress tracking.
              Perfect for large email archives (PST, MBOX) and document sets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ChunkedUploader
              caseId={caseId}
              uploadType="evidence"
              accept=".pst,.eml,.msg,.mbox,.pdf,.docx,.doc,.txt,.xlsx,.csv,.zip,.tar,.gz,.ics,.vcf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.mp4,.mov,.avi,.wmv,.mkv"
              multiple={true}
              onUploadComplete={handleUploadComplete}
              onUploadError={(error) => {
                toast({
                  title: "Upload Error",
                  description: error.message,
                  variant: "destructive",
                });
              }}
            />
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Supported File Types</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileArchive className="h-3 w-3" />
                  PST, MBOX, ZIP, TAR
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  EML, MSG
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  PDF, DOCX, TXT
                </div>
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  XLSX, CSV, ICS, VCF
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
