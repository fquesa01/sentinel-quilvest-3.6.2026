import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, FileText, ArrowUpRight, ArrowDownLeft, Calendar, Edit2, Trash2, BookOpen, Upload, Download, File, X, FolderOpen, Image, FileArchive } from "lucide-react";
import type { ProductionRecord, ProductionRecordFile } from "@shared/schema";

interface ProductionRecordsLogProps {
  caseId: string;
}

const reasonTypeLabels: Record<string, string> = {
  discovery_request: "Discovery Request",
  rule_26: "Rule 26 Disclosures",
  subpoena: "Subpoena Response",
  voluntary: "Voluntary Production",
  other: "Other",
};

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'].includes(type)) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'pst', 'ost'].includes(type)) {
    return <FileArchive className="h-4 w-4 text-amber-500" />;
  }
  if (['pdf'].includes(type)) {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

export function ProductionRecordsLog({ caseId }: ProductionRecordsLogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"outgoing" | "incoming">("outgoing");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null);
  const [filesDialogRecord, setFilesDialogRecord] = useState<ProductionRecord | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    direction: "outgoing" as "outgoing" | "incoming",
    productionDate: new Date().toISOString().split("T")[0],
    productionNumber: "",
    partyName: "",
    summary: "",
    reasonType: "discovery_request",
    reasonDetails: "",
    documentCount: 0,
    pageCount: 0,
    batesRange: "",
    privilegeLogId: "",
    privilegeLogEntryCount: 0,
    notes: "",
  });

  const { data: records, isLoading: recordsLoading } = useQuery<ProductionRecord[]>({
    queryKey: ["/api/cases", caseId, "production-records"],
  });

  const { data: recordFiles, refetch: refetchFiles } = useQuery<ProductionRecordFile[]>({
    queryKey: ["/api/production-records", filesDialogRecord?.id, "files"],
    queryFn: async () => {
      if (!filesDialogRecord?.id) return [];
      const res = await fetch(`/api/production-records/${filesDialogRecord.id}/files`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
    enabled: !!filesDialogRecord?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", `/api/cases/${caseId}/production-records`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-records"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Production record created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating record", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await apiRequest("PATCH", `/api/cases/${caseId}/production-records/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-records"] });
      setEditingRecord(null);
      resetForm();
      toast({ title: "Production record updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating record", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/cases/${caseId}/production-records/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-records"] });
      toast({ title: "Production record deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting record", description: error.message, variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiRequest("DELETE", `/api/production-records/files/${fileId}`);
      return res.json();
    },
    onSuccess: () => {
      refetchFiles();
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-records"] });
      toast({ title: "File deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting file", description: error.message, variant: "destructive" });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async ({ recordId, files }: { recordId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      
      const res = await fetch(`/api/production-records/${recordId}/files`, {
        method: "POST",
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      refetchFiles();
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-records"] });
      setSelectedFiles([]);
      toast({ title: `${data.count} file(s) uploaded successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Error uploading files", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      direction: activeTab,
      productionDate: new Date().toISOString().split("T")[0],
      productionNumber: "",
      partyName: "",
      summary: "",
      reasonType: "discovery_request",
      reasonDetails: "",
      documentCount: 0,
      pageCount: 0,
      batesRange: "",
      privilegeLogId: "",
      privilegeLogEntryCount: 0,
      notes: "",
    });
    setSelectedFiles([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormData(prev => ({ ...prev, direction: activeTab }));
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (record: ProductionRecord) => {
    setEditingRecord(record);
    setFormData({
      direction: record.direction as "outgoing" | "incoming",
      productionDate: record.productionDate ? new Date(record.productionDate).toISOString().split("T")[0] : "",
      productionNumber: record.productionNumber || "",
      partyName: record.partyName || "",
      summary: record.summary || "",
      reasonType: record.reasonType || "discovery_request",
      reasonDetails: record.reasonDetails || "",
      documentCount: record.documentCount || 0,
      pageCount: record.pageCount || 0,
      batesRange: record.batesRange || "",
      privilegeLogId: record.privilegeLogId || "",
      privilegeLogEntryCount: record.privilegeLogEntryCount || 0,
      notes: record.notes || "",
    });
  };

  const handleOpenFilesDialog = (record: ProductionRecord) => {
    setFilesDialogRecord(record);
    setSelectedFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (!filesDialogRecord || selectedFiles.length === 0) return;
    setUploadingFiles(true);
    try {
      await uploadFilesMutation.mutateAsync({ 
        recordId: filesDialogRecord.id, 
        files: selectedFiles 
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDownloadFile = (fileId: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/api/production-records/files/${fileId}/download`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = () => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredRecords = records?.filter(r => r.direction === activeTab) || [];
  const outgoingCount = records?.filter(r => r.direction === "outgoing").length || 0;
  const incomingCount = records?.filter(r => r.direction === "incoming").length || 0;

  if (recordsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="production-records-log">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Production Records Log
              </CardTitle>
              <CardDescription>Track all document productions sent to and received from opposing parties</CardDescription>
            </div>
            <Button onClick={handleOpenCreate} data-testid="button-add-record">
              <Plus className="h-4 w-4 mr-2" />
              Add Production Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "outgoing" | "incoming")}>
            <TabsList className="mb-4">
              <TabsTrigger value="outgoing" className="gap-2" data-testid="tab-outgoing">
                <ArrowUpRight className="h-4 w-4" />
                Our Productions ({outgoingCount})
              </TabsTrigger>
              <TabsTrigger value="incoming" className="gap-2" data-testid="tab-incoming">
                <ArrowDownLeft className="h-4 w-4" />
                Received Productions ({incomingCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outgoing" className="mt-0">
              <ProductionRecordsTable 
                records={filteredRecords} 
                direction="outgoing"
                onEdit={handleOpenEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onManageFiles={handleOpenFilesDialog}
              />
            </TabsContent>

            <TabsContent value="incoming" className="mt-0">
              <ProductionRecordsTable 
                records={filteredRecords} 
                direction="incoming"
                onEdit={handleOpenEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onManageFiles={handleOpenFilesDialog}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Record Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingRecord} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingRecord(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit Production Record" : "Add Production Record"}</DialogTitle>
            <DialogDescription>
              {formData.direction === "outgoing" 
                ? "Record a document production sent to opposing party" 
                : "Record a document production received from opposing party"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select 
                  value={formData.direction} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, direction: v as "outgoing" | "incoming" }))}
                >
                  <SelectTrigger id="direction" data-testid="select-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outgoing">Outgoing (Our Production)</SelectItem>
                    <SelectItem value="incoming">Incoming (Received)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productionDate">Production Date</Label>
                <Input
                  id="productionDate"
                  type="date"
                  value={formData.productionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, productionDate: e.target.value }))}
                  data-testid="input-production-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productionNumber">Production Number</Label>
                <Input
                  id="productionNumber"
                  placeholder="e.g., PROD-001"
                  value={formData.productionNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, productionNumber: e.target.value }))}
                  data-testid="input-production-number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partyName">Party Name</Label>
                <Input
                  id="partyName"
                  placeholder="e.g., Defendant XYZ Corp"
                  value={formData.partyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, partyName: e.target.value }))}
                  data-testid="input-party-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                placeholder="Brief description of the production contents..."
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                data-testid="input-summary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reasonType">Reason for Production</Label>
                <Select 
                  value={formData.reasonType} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, reasonType: v }))}
                >
                  <SelectTrigger id="reasonType" data-testid="select-reason-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discovery_request">Discovery Request</SelectItem>
                    <SelectItem value="rule_26">Rule 26 Disclosures</SelectItem>
                    <SelectItem value="subpoena">Subpoena Response</SelectItem>
                    <SelectItem value="voluntary">Voluntary Production</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batesRange">Bates Range</Label>
                <Input
                  id="batesRange"
                  placeholder="e.g., XYZ-000001 to XYZ-001234"
                  value={formData.batesRange}
                  onChange={(e) => setFormData(prev => ({ ...prev, batesRange: e.target.value }))}
                  data-testid="input-bates-range"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentCount">Document Count</Label>
                <Input
                  id="documentCount"
                  type="number"
                  min="0"
                  value={formData.documentCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCount: parseInt(e.target.value) || 0 }))}
                  data-testid="input-document-count"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pageCount">Page Count</Label>
                <Input
                  id="pageCount"
                  type="number"
                  min="0"
                  value={formData.pageCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, pageCount: parseInt(e.target.value) || 0 }))}
                  data-testid="input-page-count"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privilegeLogEntryCount">Privilege Log Entries</Label>
                <Input
                  id="privilegeLogEntryCount"
                  type="number"
                  min="0"
                  value={formData.privilegeLogEntryCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, privilegeLogEntryCount: parseInt(e.target.value) || 0 }))}
                  data-testid="input-privilege-entry-count"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this production..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-notes"
              />
            </div>

            {formData.direction === "incoming" && !editingRecord && (
              <div className="border-t pt-4 mt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  After creating this record, you can upload the received documents using the "Manage Files" button.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setEditingRecord(null);
              resetForm();
            }} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-record"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingRecord ? "Update Record" : "Create Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Files Dialog */}
      <Dialog open={!!filesDialogRecord} onOpenChange={(open) => {
        if (!open) {
          setFilesDialogRecord(null);
          setSelectedFiles([]);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Manage Production Files
            </DialogTitle>
            <DialogDescription>
              Upload and manage documents for production: {filesDialogRecord?.productionNumber || filesDialogRecord?.partyName}
            </DialogDescription>
          </DialogHeader>

          {filesDialogRecord?.direction !== "incoming" && (
            <div className="bg-muted/50 border rounded-md p-4 text-center text-muted-foreground">
              <p>File upload is only available for received (incoming) productions.</p>
            </div>
          )}

          {filesDialogRecord?.direction === "incoming" && (
            <div className="space-y-4">
              {/* File Upload Section */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.pst,.ost,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.zip,.rar,.7z,.msg,.eml"
                  data-testid="input-file-upload"
                />
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drop files here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDFs, PSTs, Images, Office Documents, and Archives
                </p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-files"
                >
                  Select Files
                </Button>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Selected Files ({selectedFiles.length})</Label>
                    <Button 
                      onClick={handleUploadFiles}
                      disabled={uploadingFiles}
                      data-testid="button-upload-files"
                    >
                      {uploadingFiles && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Upload Files
                    </Button>
                  </div>
                  <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 text-sm">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.name.split('.').pop() || '')}
                          <span className="truncate max-w-[300px]">{file.name}</span>
                          <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleRemoveSelectedFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Files List */}
              <div className="space-y-2">
                <Label>Uploaded Files ({recordFiles?.length || 0})</Label>
                {recordFiles && recordFiles.length > 0 ? (
                  <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                    {recordFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 text-sm" data-testid={`file-${file.id}`}>
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.fileType)}
                          <span className="truncate max-w-[250px]">{file.originalFileName}</span>
                          <span className="text-muted-foreground">({formatFileSize(file.fileSize)})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleDownloadFile(file.id, file.originalFileName)}
                            data-testid={`button-download-${file.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => deleteFileMutation.mutate(file.id)}
                            data-testid={`button-delete-file-${file.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-md p-8 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No files uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setFilesDialogRecord(null);
              setSelectedFiles([]);
            }} data-testid="button-close-files-dialog">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProductionRecordsTableProps {
  records: ProductionRecord[];
  direction: "outgoing" | "incoming";
  onEdit: (record: ProductionRecord) => void;
  onDelete: (id: string) => void;
  onManageFiles: (record: ProductionRecord) => void;
}

function ProductionRecordsTable({ records, direction, onEdit, onDelete, onManageFiles }: ProductionRecordsTableProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-md">
        {direction === "outgoing" ? (
          <>
            <ArrowUpRight className="h-8 w-8 mb-2" />
            <p className="font-medium">No outgoing productions recorded</p>
            <p className="text-sm">Add a record when you send documents to the opposing party</p>
          </>
        ) : (
          <>
            <ArrowDownLeft className="h-8 w-8 mb-2" />
            <p className="font-medium">No incoming productions recorded</p>
            <p className="text-sm">Add a record when you receive documents from the opposing party</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead className="w-[100px]">Prod #</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Docs</TableHead>
            <TableHead className="text-right">Pages</TableHead>
            <TableHead>Bates Range</TableHead>
            <TableHead className="text-right">Priv. Entries</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(record => (
            <TableRow key={record.id} data-testid={`row-record-${record.id}`}>
              <TableCell className="font-mono text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {record.productionDate ? new Date(record.productionDate).toLocaleDateString() : "-"}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {record.productionNumber || "-"}
              </TableCell>
              <TableCell className="font-medium">
                {record.partyName || "-"}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <span className="line-clamp-2 text-sm">{record.summary || "-"}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {reasonTypeLabels[record.reasonType || ""] || record.reasonType || "-"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                <div className="flex items-center justify-end gap-1">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  {record.documentCount?.toLocaleString() || 0}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {record.pageCount?.toLocaleString() || 0}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {record.batesRange || "-"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {(record.privilegeLogEntryCount ?? 0) > 0 ? (
                  <Badge variant="secondary" className="text-xs">
                    {record.privilegeLogEntryCount?.toLocaleString()}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {direction === "incoming" && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => onManageFiles(record)}
                      data-testid={`button-manage-files-${record.id}`}
                      title="Manage uploaded files"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => onEdit(record)}
                    data-testid={`button-edit-record-${record.id}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => onDelete(record.id)}
                    data-testid={`button-delete-record-${record.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
