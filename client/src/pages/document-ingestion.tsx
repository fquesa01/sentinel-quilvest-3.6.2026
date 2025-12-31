import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, File, CheckCircle2, AlertCircle, Clock, FileText, Mail, FileArchive, Zap } from "lucide-react";
import { FileUploadDialog } from "@/components/FileUploadDialog";
import { ChunkedUploader } from "@/components/ChunkedUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { IngestionJob, IngestionFile, Case } from "@shared/schema";

export default function DocumentIngestion() {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  // Fetch available cases
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  // Fetch ingestion jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<IngestionJob[]>({
    queryKey: ["/api/ingestion/jobs"],
  });

  // Fetch files for selected job
  const { data: files = [] } = useQuery<IngestionFile[]>({
    queryKey: ["/api/ingestion/jobs", selectedJobId, "files"],
    enabled: selectedJobId !== null,
  });

  // Process file mutation
  const processFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return await apiRequest("POST", `/api/ingestion/files/${fileId}/process`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
      if (selectedJobId) {
        queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs", selectedJobId, "files"] });
      }
      toast({
        title: "Processing Started",
        description: "File is being processed in the background.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to start file processing",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Clock, label: "Pending" },
      processing: { variant: "default" as const, icon: Clock, label: "Processing" },
      completed: { variant: "outline" as const, icon: CheckCircle2, label: "Completed" },
      failed: { variant: "destructive" as const, icon: AlertCircle, label: "Failed" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getFileTypeIcon = (fileType: string) => {
    const icons = {
      pst: FileArchive,
      eml: Mail,
      msg: Mail,
      pdf: FileText,
      docx: FileText,
      txt: File,
    };
    const Icon = icons[fileType as keyof typeof icons] || File;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Document Ingestion</h1>
          <p className="text-muted-foreground mt-1">
            Upload and process PST files, emails, and documents for compliance monitoring
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="jobs" data-testid="tab-jobs">
              <File className="h-4 w-4 mr-2" />
              Ingestion Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Advanced Upload
                </CardTitle>
                <CardDescription>
                  Upload large files with pause/resume capability, compression, and progress persistence.
                  Perfect for PST files, email archives, and large document sets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="case-select">Select Target Case</Label>
                  <Select
                    value={selectedCaseId}
                    onValueChange={setSelectedCaseId}
                    data-testid="select-case"
                  >
                    <SelectTrigger id="case-select" data-testid="select-case-trigger">
                      <SelectValue placeholder="Choose a case for ingested documents..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id} data-testid={`select-case-${c.id}`}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCaseId ? (
                  <ChunkedUploader
                    caseId={selectedCaseId}
                    uploadType="ingestion"
                    accept=".pst,.eml,.msg,.mbox,.pdf,.docx,.doc,.txt,.xlsx,.csv,.zip,.tar,.gz"
                    multiple={true}
                    onUploadComplete={(result) => {
                      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
                      toast({
                        title: "Upload Complete",
                        description: `${result.fileName} uploaded successfully. Processing will begin automatically.`,
                      });
                      
                      // Derive fileType from filename extension
                      const fileExtension = '.' + result.fileName.toLowerCase().split('.').pop();
                      
                      // Trigger ingestion processing
                      apiRequest("POST", "/api/ingestion/upload-complete", {
                        fileName: result.fileName,
                        fileSize: result.fileSize,
                        fileType: fileExtension,
                        objectKey: result.filePath,
                        caseId: selectedCaseId,
                      }).catch(console.error);
                    }}
                    onUploadError={(error) => {
                      toast({
                        title: "Upload Failed",
                        description: error.message,
                        variant: "destructive",
                      });
                    }}
                  />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Please select a case above to enable uploads</p>
                  </div>
                )}
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">Supported File Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileArchive className="h-4 w-4" />
                      PST Files (.pst)
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Files (.eml, .msg, .mbox)
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF Documents (.pdf)
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Word Documents (.docx)
                    </div>
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Text Files (.txt, .csv)
                    </div>
                    <div className="flex items-center gap-2">
                      <FileArchive className="h-4 w-4" />
                      Archives (.zip, .tar, .gz)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Upload (Legacy)</CardTitle>
                <CardDescription>
                  Standard file upload without pause/resume. Good for smaller files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowUploadDialog(true)} 
                  className="w-full"
                  variant="outline"
                  data-testid="button-select-files"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files to Upload
                </Button>
                
                <FileUploadDialog
                  open={showUploadDialog}
                  onOpenChange={setShowUploadDialog}
                  onUploadComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
                    toast({
                      title: "Upload Complete",
                      description: "Files have been uploaded successfully. Processing will begin automatically.",
                    });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ingestion Jobs</CardTitle>
                  <CardDescription>
                    View and manage document ingestion jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No ingestion jobs yet. Upload files to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {jobs.map((job) => (
                        <div
                          key={job.id}
                          className={`p-3 rounded-lg border cursor-pointer hover-elevate active-elevate-2 ${
                            selectedJobId === job.id ? "bg-accent" : ""
                          }`}
                          onClick={() => setSelectedJobId(job.id)}
                          data-testid={`job-item-${job.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">Job #{job.id}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                              </div>
                            </div>
                            {getStatusBadge(job.status)}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {job.totalFiles} files • {job.processedFiles} processed
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedJob ? `Job #${selectedJob.id} Files` : "Select a Job"}
                  </CardTitle>
                  <CardDescription>
                    {selectedJob 
                      ? `${selectedJob.processedFiles} of ${selectedJob.totalFiles} files processed`
                      : "Select a job from the left to view its files"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedJobId ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Select a job to view files
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No files found for this job
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 rounded-lg border"
                          data-testid={`file-item-${file.id}`}
                        >
                          <div className="flex items-start gap-3">
                            {getFileTypeIcon(file.fileType)}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{file.fileName}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                              </div>
                              {file.errorMessage && (
                                <div className="text-xs text-destructive mt-1">
                                  Error: {file.errorMessage}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(file.status)}
                              {file.status === "queued" && (
                                <Button
                                  size="sm"
                                  onClick={() => processFileMutation.mutate(file.id)}
                                  disabled={processFileMutation.isPending}
                                  data-testid={`button-process-${file.id}`}
                                >
                                  Process
                                </Button>
                              )}
                            </div>
                          </div>
                          {file.status === "completed" && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {file.communicationsExtracted} communications extracted
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {selectedJob && (
              <Card>
                <CardHeader>
                  <CardTitle>Job Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Total Files</TableCell>
                        <TableCell data-testid="text-total-files">{selectedJob.totalFiles}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Files Processed</TableCell>
                        <TableCell data-testid="text-files-processed">{selectedJob.processedFiles}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Communications Created</TableCell>
                        <TableCell data-testid="text-communications-created">{selectedJob.communicationsCreated}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Created</TableCell>
                        <TableCell>{new Date(selectedJob.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Last Updated</TableCell>
                        <TableCell>{new Date(selectedJob.updatedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
