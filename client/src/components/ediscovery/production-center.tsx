import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, FileOutput, Download, Eye, CheckCircle, XCircle, AlertTriangle, Plus, Tag, ShieldAlert, Calendar } from "lucide-react";
import type { Tag as TagType, ProductionBatch, ProductionBatchDocument, ProductionBatchEvent } from "@shared/schema";

interface ProductionCenterProps {
  caseId: string;
}

interface PreviewResult {
  included: Array<{ documentId: string; documentType: string; tagId: string; tagName: string }>;
  excluded: Array<{ documentId: string; documentType: string; reason: string; exclusionTagId?: string }>;
}

interface BatchWithDetails {
  batch: ProductionBatch;
  documents: ProductionBatchDocument[];
  events: ProductionBatchEvent[];
}

export function ProductionCenter({ caseId }: ProductionCenterProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [newBatch, setNewBatch] = useState({
    name: "",
    description: "",
    selectedTagIds: [] as string[],
    exclusionTagIds: [] as string[],
    exportFormat: "pdf" as "pdf" | "native" | "tiff" | "load_file",
    batesPrefix: "PROD",
    batesPadding: 6,
  });

  const { data: tags, isLoading: tagsLoading } = useQuery<TagType[]>({
    queryKey: ["/api/cases", caseId, "tags"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/tags`);
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });

  const { data: batches, isLoading: batchesLoading } = useQuery<ProductionBatch[]>({
    queryKey: ["/api/cases", caseId, "production-batches"],
  });

  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = useQuery<PreviewResult>({
    queryKey: ["/api/cases", caseId, "production-batches", "preview", newBatch.selectedTagIds, newBatch.exclusionTagIds],
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/cases/${caseId}/production-batches/preview-documents`, {
        selectedTagIds: newBatch.selectedTagIds,
        exclusionTagIds: newBatch.exclusionTagIds,
      });
      return res.json();
    },
    enabled: newBatch.selectedTagIds.length > 0,
  });

  const { data: batchDetails, isLoading: batchDetailsLoading } = useQuery<BatchWithDetails>({
    queryKey: ["/api/cases", caseId, "production-batches", selectedBatchId],
    enabled: !!selectedBatchId,
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cases/${caseId}/production-batches`, newBatch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-batches"] });
      setIsCreateDialogOpen(false);
      setNewBatch({
        name: "",
        description: "",
        selectedTagIds: [],
        exclusionTagIds: [],
        exportFormat: "pdf",
        batesPrefix: "PROD",
        batesPadding: 6,
      });
      toast({ title: "Production batch created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating batch", description: error.message, variant: "destructive" });
    },
  });

  const confirmBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await apiRequest("POST", `/api/cases/${caseId}/production-batches/${batchId}/confirm`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-batches"] });
      toast({ title: "Production completed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error processing production", description: error.message, variant: "destructive" });
    },
  });

  const cancelBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await apiRequest("POST", `/api/cases/${caseId}/production-batches/${batchId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-batches"] });
      toast({ title: "Production batch cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error cancelling batch", description: error.message, variant: "destructive" });
    },
  });

  const handleTagToggle = (tagId: string, type: "include" | "exclude") => {
    if (type === "include") {
      setNewBatch(prev => ({
        ...prev,
        selectedTagIds: prev.selectedTagIds.includes(tagId)
          ? prev.selectedTagIds.filter(id => id !== tagId)
          : [...prev.selectedTagIds, tagId],
      }));
    } else {
      setNewBatch(prev => ({
        ...prev,
        exclusionTagIds: prev.exclusionTagIds.includes(tagId)
          ? prev.exclusionTagIds.filter(id => id !== tagId)
          : [...prev.exclusionTagIds, tagId],
      }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "processing":
        return <Badge className="bg-blue-500 text-white">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const privilegeTags = tags?.filter(t => 
    t.name.toLowerCase().includes("privilege") || 
    t.name.toLowerCase().includes("attorney") ||
    t.name.toLowerCase().includes("work product")
  ) || [];

  const confidentialTags = tags?.filter(t => 
    t.name.toLowerCase().includes("confidential") || 
    t.name.toLowerCase().includes("protected") ||
    t.name.toLowerCase().includes("sensitive")
  ) || [];

  const productionTags = tags?.filter(t => 
    !privilegeTags.includes(t) && !confidentialTags.includes(t)
  ) || [];

  if (batchesLoading || tagsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="production-center">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Production</h2>
          <p className="text-muted-foreground">Create and manage document productions with tag-based selection</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-production">
              <Plus className="h-4 w-4 mr-2" />
              New Production
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Production</DialogTitle>
              <DialogDescription>
                Select tags to include documents and configure exclusion rules for privilege and confidentiality
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Production Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Initial Production to DOJ"
                    value={newBatch.name}
                    onChange={(e) => setNewBatch(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-production-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batesPrefix">Bates Prefix</Label>
                  <Input
                    id="batesPrefix"
                    placeholder="e.g., PROD, DEF, PLT"
                    value={newBatch.batesPrefix}
                    onChange={(e) => setNewBatch(prev => ({ ...prev, batesPrefix: e.target.value.toUpperCase() }))}
                    data-testid="input-bates-prefix"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Notes about this production..."
                  value={newBatch.description}
                  onChange={(e) => setNewBatch(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="input-production-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exportFormat">Export Format</Label>
                  <Select
                    value={newBatch.exportFormat}
                    onValueChange={(value: "pdf" | "native" | "tiff" | "load_file") => 
                      setNewBatch(prev => ({ ...prev, exportFormat: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-export-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Images</SelectItem>
                      <SelectItem value="native">Native Files</SelectItem>
                      <SelectItem value="tiff">TIFF Images</SelectItem>
                      <SelectItem value="load_file">Load File Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batesPadding">Bates Number Padding</Label>
                  <Select
                    value={String(newBatch.batesPadding)}
                    onValueChange={(value) => setNewBatch(prev => ({ ...prev, batesPadding: parseInt(value) }))}
                  >
                    <SelectTrigger data-testid="select-bates-padding">
                      <SelectValue placeholder="Select padding" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 digits (0001)</SelectItem>
                      <SelectItem value="5">5 digits (00001)</SelectItem>
                      <SelectItem value="6">6 digits (000001)</SelectItem>
                      <SelectItem value="7">7 digits (0000001)</SelectItem>
                      <SelectItem value="8">8 digits (00000001)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-500" />
                      Include Tags
                    </CardTitle>
                    <CardDescription>Documents with these tags will be included</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                    {productionTags.map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`include-${tag.id}`}
                          checked={newBatch.selectedTagIds.includes(tag.id)}
                          onCheckedChange={() => handleTagToggle(tag.id, "include")}
                        />
                        <label htmlFor={`include-${tag.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color || "#gray" }}
                          />
                          {tag.name}
                        </label>
                      </div>
                    ))}
                    {productionTags.length === 0 && (
                      <p className="text-sm text-muted-foreground">No production tags available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      Exclude Tags
                    </CardTitle>
                    <CardDescription>Documents with these tags will be excluded</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                    {[...privilegeTags, ...confidentialTags].map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`exclude-${tag.id}`}
                          checked={newBatch.exclusionTagIds.includes(tag.id)}
                          onCheckedChange={() => handleTagToggle(tag.id, "exclude")}
                        />
                        <label htmlFor={`exclude-${tag.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color || "#gray" }}
                          />
                          {tag.name}
                        </label>
                      </div>
                    ))}
                    {privilegeTags.length === 0 && confidentialTags.length === 0 && (
                      <p className="text-sm text-muted-foreground">No privilege/confidential tags available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {newBatch.selectedTagIds.length > 0 && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                      {previewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previewData && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="text-2xl font-bold">{previewData.included.length}</div>
                            <div className="text-sm text-muted-foreground">Documents to Produce</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <div>
                            <div className="text-2xl font-bold">{previewData.excluded.length}</div>
                            <div className="text-sm text-muted-foreground">Documents Excluded</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {!previewData && !previewLoading && (
                      <p className="text-sm text-muted-foreground">Select tags to preview documents</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createBatchMutation.mutate()}
                disabled={!newBatch.name || newBatch.selectedTagIds.length === 0 || createBatchMutation.isPending}
                data-testid="button-create-batch"
              >
                {createBatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                Create Production Batch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches" data-testid="tab-batches">Production Batches</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Production History</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-6">
          {(!batches || batches.length === 0) ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Production Batches</h3>
                <p className="text-muted-foreground mb-4">Create your first production batch to get started</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-production">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Production
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {batches.filter(b => b.status === "draft").map(batch => (
                <Card key={batch.id} data-testid={`card-batch-${batch.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{batch.name}</CardTitle>
                        <CardDescription>{batch.description || "No description"}</CardDescription>
                      </div>
                      {getStatusBadge(batch.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Bates Prefix:</span>
                        <span className="ml-2 font-medium">{batch.batesPrefix}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Format:</span>
                        <span className="ml-2 font-medium uppercase">{batch.exportFormat}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tags Selected:</span>
                        <span className="ml-2 font-medium">{(batch.selectedTagIds as string[])?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Exclusion Tags:</span>
                        <span className="ml-2 font-medium">{(batch.exclusionTagIds as string[])?.length || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedBatchId(batch.id)}
                      data-testid={`button-view-batch-${batch.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => cancelBatchMutation.mutate(batch.id)}
                        disabled={cancelBatchMutation.isPending}
                        data-testid={`button-cancel-batch-${batch.id}`}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => confirmBatchMutation.mutate(batch.id)}
                        disabled={confirmBatchMutation.isPending}
                        data-testid={`button-confirm-batch-${batch.id}`}
                      >
                        {confirmBatchMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <FileOutput className="h-4 w-4 mr-2" />
                        )}
                        Confirm & Process
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Productions</CardTitle>
              <CardDescription>View and download previous production batches</CardDescription>
            </CardHeader>
            <CardContent>
              {batches && batches.filter(b => b.status !== "draft").length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bates Range</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.filter(b => b.status !== "draft").map(batch => (
                      <TableRow key={batch.id} data-testid={`row-batch-${batch.id}`}>
                        <TableCell className="font-medium">{batch.name}</TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell>
                          {batch.batesStartNumber && batch.batesEndNumber ? (
                            <span className="font-mono text-sm">
                              {batch.batesPrefix}-{String(batch.batesStartNumber).padStart(batch.batesPadding, "0")}
                              {" - "}
                              {batch.batesPrefix}-{String(batch.batesEndNumber).padStart(batch.batesPadding, "0")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{batch.producedDocuments}</span>
                            {batch.excludedDocuments > 0 && (
                              <>
                                <XCircle className="h-4 w-4 text-red-500 ml-2" />
                                <span className="text-muted-foreground">{batch.excludedDocuments} excluded</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {batch.completedAt ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(batch.completedAt).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedBatchId(batch.id)}
                              data-testid={`button-view-history-${batch.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              data-testid={`button-download-log-${batch.id}`}
                            >
                              <a href={`/api/cases/${caseId}/production-batches/${batch.id}/log`} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-8 w-8 mb-2" />
                  <p>No completed productions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedBatchId} onOpenChange={(open) => !open && setSelectedBatchId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Production Batch Details</DialogTitle>
          </DialogHeader>
          
          {batchDetailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : batchDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Name</h4>
                  <p>{batchDetails.batch.name}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Status</h4>
                  {getStatusBadge(batchDetails.batch.status)}
                </div>
                <div>
                  <h4 className="font-medium mb-1">Bates Range</h4>
                  {batchDetails.batch.batesStartNumber ? (
                    <span className="font-mono">
                      {batchDetails.batch.batesPrefix}-{String(batchDetails.batch.batesStartNumber).padStart(batchDetails.batch.batesPadding, "0")}
                      {batchDetails.batch.batesEndNumber && ` - ${batchDetails.batch.batesPrefix}-${String(batchDetails.batch.batesEndNumber).padStart(batchDetails.batch.batesPadding, "0")}`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not assigned yet</span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-1">Documents</h4>
                  <p>{batchDetails.batch.producedDocuments} produced, {batchDetails.batch.excludedDocuments} excluded</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Audit Log</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {batchDetails.events.map((event, index) => (
                    <div key={event.id || index} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="shrink-0">{event.eventType}</Badge>
                      <span>{event.message}</span>
                    </div>
                  ))}
                  {batchDetails.events.length === 0 && (
                    <p className="text-muted-foreground">No events recorded</p>
                  )}
                </div>
              </div>

              {batchDetails.documents.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Documents ({batchDetails.documents.length})</h4>
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bates #</TableHead>
                          <TableHead>Document ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchDetails.documents.slice(0, 50).map(doc => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-mono">{doc.batesStart || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{doc.documentId.slice(0, 8)}...</TableCell>
                            <TableCell>{doc.documentType}</TableCell>
                            <TableCell>
                              {doc.excluded ? (
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-sm">{doc.exclusionReason}</span>
                                </div>
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {batchDetails.documents.length > 50 && (
                      <p className="text-center py-2 text-sm text-muted-foreground">
                        Showing 50 of {batchDetails.documents.length} documents
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Batch not found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
