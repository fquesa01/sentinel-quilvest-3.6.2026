import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  PlayCircle, 
  CheckCircle, 
  AlertTriangle,
  Copy,
  Link2,
  Mail,
  FileStack,
  RefreshCw,
  Brain,
  Plus,
  Sparkles,
  Target,
  Package,
  Download,
  Stamp,
  Trash2,
  FileText,
  Shield,
  ChevronDown,
  Code,
  Folder,
  Image
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface EDiscoveryProcessingPanelProps {
  caseId: string;
}

interface ProcessingJob {
  id: string;
  jobName: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ProcessingSummary {
  totalDocuments: number;
  exactDuplicates?: number;
  nearDuplicateClusters?: number;
  threadsCreated?: number;
  inclusiveEmails?: number;
  familiesCreated?: number;
  attachmentsGrouped?: number;
  exceptionsCount: number;
}

interface ExceptionsSummary {
  total: number;
  byType: Record<string, number>;
  unresolved: number;
}

interface PredictionModel {
  id: string;
  name: string;
  description?: string;
  status: string;
  trainingSize: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  createdAt: string;
  trainedAt?: string;
}

export function EDiscoveryProcessingPanel({ caseId }: EDiscoveryProcessingPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: jobs, isLoading: jobsLoading } = useQuery<ProcessingJob[]>({
    queryKey: ["/api/cases", caseId, "ediscovery", "jobs"],
  });

  const { data: exceptionsSummary, isLoading: exceptionsLoading } = useQuery<ExceptionsSummary>({
    queryKey: ["/api/cases", caseId, "ediscovery", "exceptions-summary"],
  });

  const { data: duplicates } = useQuery({
    queryKey: ["/api/cases", caseId, "ediscovery", "duplicates"],
  });

  const { data: nearDuplicates } = useQuery({
    queryKey: ["/api/cases", caseId, "ediscovery", "near-duplicates"],
  });

  const { data: threads } = useQuery({
    queryKey: ["/api/cases", caseId, "ediscovery", "threads"],
  });

  const { data: families } = useQuery({
    queryKey: ["/api/cases", caseId, "ediscovery", "families"],
  });

  const { data: tarModels } = useQuery<PredictionModel[]>({
    queryKey: ["/api/cases", caseId, "tar", "models"],
  });

  const processDocumentsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/ediscovery/process`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "ediscovery"] });
    },
  });

  const latestJob = jobs?.[0];
  const isProcessing = latestJob?.status === "processing" || processDocumentsMutation.isPending;

  const stats = [
    {
      label: "Exact Duplicates",
      value: (duplicates as any[])?.reduce((sum, d) => sum + d.duplicates.length, 0) || 0,
      icon: Copy,
      color: "text-amber-500",
    },
    {
      label: "Near-Duplicate Clusters",
      value: (nearDuplicates as any[])?.length || 0,
      icon: Link2,
      color: "text-orange-500",
    },
    {
      label: "Email Threads",
      value: (threads as any[])?.length || 0,
      icon: Mail,
      color: "text-blue-500",
    },
    {
      label: "Document Families",
      value: (families as any[])?.length || 0,
      icon: FileStack,
      color: "text-green-500",
    },
    {
      label: "TAR Models",
      value: tarModels?.length || 0,
      icon: Brain,
      color: "text-purple-500",
    },
  ];

  return (
    <Card data-testid="ediscovery-processing-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-lg">E-Discovery Processing</CardTitle>
            <CardDescription>
              Document deduplication, email threading, and family grouping
            </CardDescription>
          </div>
          <Button
            onClick={() => processDocumentsMutation.mutate()}
            disabled={isProcessing}
            data-testid="button-run-ediscovery"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Run Processing
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" data-testid="tab-ediscovery-overview">Overview</TabsTrigger>
            <TabsTrigger value="duplicates" data-testid="tab-ediscovery-duplicates">Duplicates</TabsTrigger>
            <TabsTrigger value="threads" data-testid="tab-ediscovery-threads">Threads</TabsTrigger>
            <TabsTrigger value="families" data-testid="tab-ediscovery-families">Families</TabsTrigger>
            <TabsTrigger value="tar" data-testid="tab-ediscovery-tar">TAR</TabsTrigger>
            <TabsTrigger value="productions" data-testid="tab-ediscovery-productions">Productions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      <span className="text-2xl font-bold">{stat.value}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {latestJob && (
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">Latest Processing Job</CardTitle>
                    <Badge 
                      variant={
                        latestJob.status === "completed" ? "default" :
                        latestJob.status === "failed" ? "destructive" :
                        latestJob.status === "processing" ? "secondary" : "outline"
                      }
                    >
                      {latestJob.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {latestJob.status === "processing" && (
                    <Progress 
                      value={(latestJob.processedFiles / latestJob.totalFiles) * 100} 
                      className="mb-2"
                    />
                  )}
                  <div className="text-sm text-muted-foreground">
                    <p>Processed: {latestJob.processedFiles} / {latestJob.totalFiles} files</p>
                    {latestJob.failedFiles > 0 && (
                      <p className="text-destructive">Failed: {latestJob.failedFiles}</p>
                    )}
                    <p>Started: {new Date(latestJob.createdAt).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {exceptionsSummary && exceptionsSummary.unresolved > 0 && (
              <Card className="mt-4 border-amber-500/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="font-medium">{exceptionsSummary.unresolved} Unresolved Exceptions</span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {Object.entries(exceptionsSummary.byType).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="duplicates" className="mt-4">
            <DuplicatesView caseId={caseId} />
          </TabsContent>

          <TabsContent value="threads" className="mt-4">
            <ThreadsView caseId={caseId} />
          </TabsContent>

          <TabsContent value="families" className="mt-4">
            <FamiliesView caseId={caseId} />
          </TabsContent>

          <TabsContent value="tar" className="mt-4">
            <TARView caseId={caseId} />
          </TabsContent>

          <TabsContent value="productions" className="mt-4">
            <ProductionsView caseId={caseId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DuplicatesView({ caseId }: { caseId: string }) {
  const { data: duplicates, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cases", caseId, "ediscovery", "duplicates"],
  });

  const { data: nearDuplicates } = useQuery<any[]>({
    queryKey: ["/api/cases", caseId, "ediscovery", "near-duplicates"],
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const exactCount = duplicates?.reduce((sum, d) => sum + d.duplicates.length, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{exactCount}</span>
            </div>
            <p className="text-sm text-muted-foreground">Exact Duplicates</p>
            <p className="text-xs text-muted-foreground mt-1">
              {duplicates?.length || 0} master documents with duplicates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{nearDuplicates?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Near-Duplicate Clusters</p>
            <p className="text-xs text-muted-foreground mt-1">
              Documents with similar content (85%+ similarity)
            </p>
          </CardContent>
        </Card>
      </div>

      {nearDuplicates && nearDuplicates.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Near-Duplicate Clusters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {nearDuplicates.slice(0, 10).map((cluster: any) => (
                  <div 
                    key={cluster.id} 
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{cluster.clusterName}</p>
                      <p className="text-xs text-muted-foreground">
                        {cluster.documentCount} documents | Threshold: {cluster.similarityThreshold}%
                      </p>
                    </div>
                    <Badge variant="secondary">{cluster.documentCount}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ThreadsView({ caseId }: { caseId: string }) {
  const { data: threads, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cases", caseId, "ediscovery", "threads"],
  });

  const { data: inclusiveEmails } = useQuery<{ count: number }>({
    queryKey: ["/api/cases", caseId, "ediscovery", "inclusive-emails"],
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{threads?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Email Threads</p>
            <p className="text-xs text-muted-foreground mt-1">
              Grouped email conversations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{inclusiveEmails?.count || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Inclusive Emails</p>
            <p className="text-xs text-muted-foreground mt-1">
              Final emails containing all prior content
            </p>
          </CardContent>
        </Card>
      </div>

      {threads && threads.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Email Threads</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {threads.slice(0, 10).map((thread: any) => (
                  <div 
                    key={thread.id} 
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {thread.normalizedSubject || "No subject"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {thread.messageCount} messages | {thread.participantCount} participants
                      </p>
                    </div>
                    <Badge variant="secondary">{thread.messageCount}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FamiliesView({ caseId }: { caseId: string }) {
  const { data: families, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cases", caseId, "ediscovery", "families"],
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const totalAttachments = families?.reduce((sum, f) => sum + (f.attachmentCount || 0), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileStack className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{families?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Document Families</p>
            <p className="text-xs text-muted-foreground mt-1">
              Parent emails with attachments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileStack className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{totalAttachments}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Attachments</p>
            <p className="text-xs text-muted-foreground mt-1">
              Files grouped with parent emails
            </p>
          </CardContent>
        </Card>
      </div>

      {families && families.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Document Families</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {families.slice(0, 10).map((family: any) => (
                  <div 
                    key={family.id} 
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">Family {family.id.substring(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {family.familyType} | {family.attachmentCount} attachments
                      </p>
                    </div>
                    <Badge variant="secondary">{family.attachmentCount + 1}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TARView({ caseId }: { caseId: string }) {
  const [newModelName, setNewModelName] = useState("");
  const [newModelDescription, setNewModelDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: models, isLoading } = useQuery<PredictionModel[]>({
    queryKey: ["/api/cases", caseId, "tar", "models"],
  });

  const createModelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/tar/models`, {
        name: newModelName,
        description: newModelDescription,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "tar", "models"] });
      setNewModelName("");
      setNewModelDescription("");
      setShowCreateForm(false);
    },
  });

  const trainModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const response = await apiRequest("POST", `/api/tar/models/${modelId}/train`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "tar", "models"] });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const trainedModels = models?.filter(m => m.status === "ready").length || 0;
  const totalSamples = models?.reduce((sum, m) => sum + m.trainingSize, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{models?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Prediction Models</p>
            <p className="text-xs text-muted-foreground mt-1">
              {trainedModels} trained, {(models?.length || 0) - trainedModels} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalSamples}</span>
            </div>
            <p className="text-sm text-muted-foreground">Training Samples</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reviewer-coded documents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">
                {models?.find(m => m.accuracy)?.accuracy 
                  ? `${(models.find(m => m.accuracy)!.accuracy! * 100).toFixed(0)}%`
                  : "N/A"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Best Accuracy</p>
            <p className="text-xs text-muted-foreground mt-1">
              Highest performing model
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-medium">Prediction Models</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowCreateForm(!showCreateForm)}
          data-testid="button-create-tar-model"
        >
          <Plus className="mr-1 h-4 w-4" />
          Create Model
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g., Privilege Classification"
                  data-testid="input-tar-model-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-desc">Description (optional)</Label>
                <Input
                  id="model-desc"
                  value={newModelDescription}
                  onChange={(e) => setNewModelDescription(e.target.value)}
                  placeholder="Describe the model's purpose..."
                  data-testid="input-tar-model-description"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => createModelMutation.mutate()}
                  disabled={!newModelName || createModelMutation.isPending}
                  data-testid="button-save-tar-model"
                >
                  {createModelMutation.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Model
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {models && models.length > 0 ? (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {models.map((model) => (
              <Card key={model.id} data-testid={`card-tar-model-${model.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Brain className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{model.name}</span>
                        <Badge 
                          variant={
                            model.status === "ready" ? "default" :
                            model.status === "training" ? "secondary" : "outline"
                          }
                        >
                          {model.status}
                        </Badge>
                      </div>
                      {model.description && (
                        <p className="text-xs text-muted-foreground mb-2">{model.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{model.trainingSize} samples</span>
                        {model.accuracy && (
                          <span className="text-green-600">
                            Accuracy: {(model.accuracy * 100).toFixed(1)}%
                          </span>
                        )}
                        {model.precision && (
                          <span>Precision: {(model.precision * 100).toFixed(1)}%</span>
                        )}
                        {model.recall && (
                          <span>Recall: {(model.recall * 100).toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {model.status === "pending" && model.trainingSize >= 10 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => trainModelMutation.mutate(model.id)}
                          disabled={trainModelMutation.isPending}
                          data-testid={`button-train-model-${model.id}`}
                        >
                          {trainModelMutation.isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <PlayCircle className="mr-1 h-4 w-4" />
                          )}
                          Train
                        </Button>
                      )}
                      {model.status === "ready" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-predict-model-${model.id}`}
                        >
                          <Sparkles className="mr-1 h-4 w-4" />
                          Run Predictions
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">No Prediction Models</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create a model to start classifying documents with AI-assisted predictions.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateForm(true)}
              data-testid="button-create-first-model"
            >
              <Plus className="mr-1 h-4 w-4" />
              Create Your First Model
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Active Learning Tips</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>Code at least 10 documents as training samples before training the model</li>
            <li>Include a mix of relevant and non-relevant documents for better accuracy</li>
            <li>Review uncertain predictions to improve model performance over time</li>
            <li>Use document tags in Document Review to automatically add training samples</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

interface ProductionSet {
  id: string;
  productionName: string;
  productionNumber: string;
  notes?: string | null;
  status: string;
  batesPrefix: string;
  batesStartNumber: number;
  batesPadding: number;
  documentCount: number;
  pageCount: number;
  createdAt: string;
  transmittedAt?: string;
}

interface PrivilegeLog {
  id: string;
  batesNumber?: string;
  documentType: string;
  documentDate: string;
  documentDescription: string;
  author: string;
  recipients: string[];
  privilegeType: string;
  privilegeBasis: string;
}

function ProductionsView({ caseId }: { caseId: string }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProductionName, setNewProductionName] = useState("");
  const [batesPrefix, setBatesPrefix] = useState("PROD");
  const [batesStart, setBatesStart] = useState(1);

  const { data: productionSets, isLoading } = useQuery<ProductionSet[]>({
    queryKey: ["/api/cases", caseId, "production-sets"],
  });

  const { data: privilegeLogs } = useQuery<PrivilegeLog[]>({
    queryKey: ["/api/cases", caseId, "privilege-logs"],
  });

  const createProductionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/production-sets`, {
        productionName: newProductionName,
        batesPrefix,
        batesStartNumber: batesStart,
        batesPadding: 6,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "production-sets"] });
      setShowCreateForm(false);
      setNewProductionName("");
      setBatesPrefix("PROD");
      setBatesStart(1);
    },
  });

  const [exportingId, setExportingId] = useState<string | null>(null);

  const downloadFile = (content: string, filename: string, mimeType: string = "text/plain") => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportLoadFileMutation = useMutation({
    mutationFn: async ({ productionSetId, format }: { productionSetId: string; format: string }) => {
      setExportingId(productionSetId);
      
      switch (format) {
        case "concordance": {
          const response = await apiRequest("GET", `/api/cases/${caseId}/production-sets/${productionSetId}/export/concordance`);
          const data = await response.json();
          if (data.content) downloadFile(data.content, data.filename, "text/plain");
          return data;
        }
        case "ringtail": {
          const response = await apiRequest("GET", `/api/cases/${caseId}/production-sets/${productionSetId}/export/ringtail`);
          const data = await response.json();
          if (data.content) downloadFile(data.content, data.filename, "text/tab-separated-values");
          return data;
        }
        case "relativity": {
          const response = await apiRequest("GET", `/api/cases/${caseId}/production-sets/${productionSetId}/export/relativity`);
          const data = await response.json();
          if (data.datContent) downloadFile(data.datContent, data.datFilename, "text/plain");
          if (data.optContent) downloadFile(data.optContent, data.optFilename, "text/plain");
          return data;
        }
        case "edrm": {
          const response = await apiRequest("GET", `/api/cases/${caseId}/production-sets/${productionSetId}/export/edrm`);
          const data = await response.json();
          if (data.content) downloadFile(data.content, data.filename, "application/xml");
          return data;
        }
        case "native": {
          const response = await apiRequest("GET", `/api/cases/${caseId}/production-sets/${productionSetId}/export/native`);
          const data = await response.json();
          if (data.manifestJson) downloadFile(data.manifestJson, `${data.filename}_manifest.json`, "application/json");
          if (data.metadataCsv) downloadFile(data.metadataCsv, `${data.filename}_metadata.csv`, "text/csv");
          return data;
        }
        case "pdf": {
          const response = await apiRequest("GET", `/api/cases/${caseId}/production-sets/${productionSetId}/export/images?format=pdf`);
          const data = await response.json();
          if (data.optContent) downloadFile(data.optContent, `${data.filename}.opt`, "text/plain");
          return data;
        }
        case "tiff": {
          const response = await apiRequest("GET", `/api/cases/${caseId}/production-sets/${productionSetId}/export/images?format=tiff`);
          const data = await response.json();
          if (data.optContent) downloadFile(data.optContent, `${data.filename}.opt`, "text/plain");
          if (data.lfpContent) downloadFile(data.lfpContent, `${data.filename}.lfp`, "text/plain");
          return data;
        }
        default:
          throw new Error(`Unknown format: ${format}`);
      }
    },
    onSettled: () => setExportingId(null),
  });

  const exportPrivilegeLogMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/cases/${caseId}/privilege-logs/export`);
      const data = await response.json();
      
      if (data.content) {
        const blob = new Blob([data.content], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || "privilege_log.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "transmitted": return "default";
      case "validated": return "secondary";
      case "in_progress": return "secondary";
      case "draft": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{productionSets?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Production Sets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Stamp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {productionSets?.reduce((sum, p) => sum + (p.documentCount || 0), 0) || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Documents in Productions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{privilegeLogs?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Privilege Log Entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">Production Sets</h3>
        <div className="flex gap-2">
          {privilegeLogs && privilegeLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPrivilegeLogMutation.mutate()}
              disabled={exportPrivilegeLogMutation.isPending}
              data-testid="button-export-privilege-log"
            >
              {exportPrivilegeLogMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1 h-4 w-4" />
              )}
              Export Privilege Log
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
            data-testid="button-create-production-set"
          >
            <Plus className="mr-1 h-4 w-4" />
            New Production Set
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card className="border-primary/50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="production-name">Production Name</Label>
                <Input
                  id="production-name"
                  placeholder="e.g., First Response Production"
                  value={newProductionName}
                  onChange={(e) => setNewProductionName(e.target.value)}
                  data-testid="input-production-name"
                />
              </div>
              <div>
                <Label htmlFor="bates-prefix">Bates Prefix</Label>
                <Input
                  id="bates-prefix"
                  placeholder="PROD"
                  value={batesPrefix}
                  onChange={(e) => setBatesPrefix(e.target.value)}
                  data-testid="input-bates-prefix"
                />
              </div>
              <div>
                <Label htmlFor="bates-start">Start Number</Label>
                <Input
                  id="bates-start"
                  type="number"
                  min={1}
                  value={batesStart}
                  onChange={(e) => setBatesStart(parseInt(e.target.value) || 1)}
                  data-testid="input-bates-start"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => createProductionMutation.mutate()}
                disabled={!newProductionName || createProductionMutation.isPending}
                data-testid="button-save-production-set"
              >
                {createProductionMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-1 h-4 w-4" />
                )}
                Create Production Set
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                data-testid="button-cancel-production"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {productionSets && productionSets.length > 0 ? (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {productionSets.map((production) => (
              <Card key={production.id} data-testid={`card-production-${production.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{production.productionName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{production.productionNumber}</span>
                        <Badge variant={getStatusColor(production.status)}>
                          {production.status}
                        </Badge>
                      </div>
                      {production.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{production.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Prefix: {production.batesPrefix}</span>
                        <span>Start: {production.batesStartNumber}</span>
                        <span>{production.documentCount || 0} documents</span>
                        {production.pageCount > 0 && <span>{production.pageCount} pages</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={exportingId === production.id}
                            data-testid={`button-export-loadfile-${production.id}`}
                          >
                            {exportingId === production.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-1 h-4 w-4" />
                            )}
                            Export
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Load File Formats</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => exportLoadFileMutation.mutate({ productionSetId: production.id, format: "concordance" })}
                            data-testid={`button-export-concordance-${production.id}`}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Concordance DAT
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportLoadFileMutation.mutate({ productionSetId: production.id, format: "ringtail" })}
                            data-testid={`button-export-ringtail-${production.id}`}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Ringtail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportLoadFileMutation.mutate({ productionSetId: production.id, format: "relativity" })}
                            data-testid={`button-export-relativity-${production.id}`}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Relativity RDC
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>XML Formats</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => exportLoadFileMutation.mutate({ productionSetId: production.id, format: "edrm" })}
                            data-testid={`button-export-edrm-${production.id}`}
                          >
                            <Code className="mr-2 h-4 w-4" />
                            EDRM XML
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Package Formats</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => exportLoadFileMutation.mutate({ productionSetId: production.id, format: "native" })}
                            data-testid={`button-export-native-${production.id}`}
                          >
                            <Folder className="mr-2 h-4 w-4" />
                            Native Package
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Image Formats</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => exportLoadFileMutation.mutate({ productionSetId: production.id, format: "pdf" })}
                            data-testid={`button-export-pdf-${production.id}`}
                          >
                            <Image className="mr-2 h-4 w-4" />
                            PDF Images
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportLoadFileMutation.mutate({ productionSetId: production.id, format: "tiff" })}
                            data-testid={`button-export-tiff-${production.id}`}
                          >
                            <Image className="mr-2 h-4 w-4" />
                            TIFF Images
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">No Production Sets</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create a production set to organize documents for delivery with Bates numbering.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowCreateForm(true)}
              data-testid="button-create-first-production"
            >
              <Plus className="mr-1 h-4 w-4" />
              Create Your First Production Set
            </Button>
          </CardContent>
        </Card>
      )}

      {privilegeLogs && privilegeLogs.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Privilege Log Preview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Bates</th>
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Author</th>
                    <th className="text-left p-2 font-medium">Privilege</th>
                    <th className="text-left p-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {privilegeLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="border-b" data-testid={`row-privilege-log-${log.id}`}>
                      <td className="p-2 font-mono text-xs">{log.batesNumber || "-"}</td>
                      <td className="p-2">{new Date(log.documentDate).toLocaleDateString()}</td>
                      <td className="p-2">{log.author}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {log.privilegeType.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-2 max-w-[200px] truncate">{log.documentDescription}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {privilegeLogs.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing 10 of {privilegeLogs.length} entries
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default EDiscoveryProcessingPanel;
