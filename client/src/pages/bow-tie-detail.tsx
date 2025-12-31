import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Plus,
  Shield,
  AlertTriangle,
  Target,
  ArrowRight,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GrcBowTieAnalysis, GrcBowTieNode, GrcRisk } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  archived: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

const nodeTypeColors: Record<string, string> = {
  threat: "bg-red-500",
  consequence: "bg-orange-500",
  preventive_control: "bg-blue-500",
  mitigating_control: "bg-green-500",
};

const nodeTypeBg: Record<string, string> = {
  threat: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
  consequence: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
  preventive_control: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  mitigating_control: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
};

interface BowTieNodeCardProps {
  node: GrcBowTieNode;
  onDelete: (id: string) => void;
}

function BowTieNodeCard({ node, onDelete }: BowTieNodeCardProps) {
  return (
    <div className={`p-3 rounded-lg border ${nodeTypeBg[node.nodeType]} relative group`} data-testid={`node-${node.nodeType}-${node.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-sm" data-testid={`text-node-title-${node.id}`}>{node.title}</p>
          {node.description && (
            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-node-description-${node.id}`}>{node.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(node.id)}
          data-testid={`button-delete-node-${node.id}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function BowTieDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<GrcBowTieAnalysis>>({});
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [newNodeType, setNewNodeType] = useState<string>("threat");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeDescription, setNewNodeDescription] = useState("");

  const { data: analysis, isLoading } = useQuery<GrcBowTieAnalysis>({
    queryKey: ["/api/grc/bow-tie", params.id],
    enabled: !!params.id,
  });

  const { data: nodes = [] } = useQuery<GrcBowTieNode[]>({
    queryKey: ["/api/grc/bow-tie", params.id, "nodes"],
    enabled: !!params.id,
  });

  const { data: risks = [] } = useQuery<GrcRisk[]>({
    queryKey: ["/api/grc/risks"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<GrcBowTieAnalysis>) => {
      return apiRequest("PATCH", `/api/grc/bow-tie/${params.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bow-tie"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bow-tie", params.id] });
      setIsEditing(false);
      toast({ title: "Analysis updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update analysis", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/grc/bow-tie/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bow-tie"] });
      toast({ title: "Analysis deleted successfully" });
      navigate("/risk-management/bow-tie");
    },
    onError: () => {
      toast({ title: "Failed to delete analysis", variant: "destructive" });
    },
  });

  const addNodeMutation = useMutation({
    mutationFn: async (data: { nodeType: string; title: string; description: string }) => {
      return apiRequest("POST", `/api/grc/bow-tie/${params.id}/nodes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bow-tie", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bow-tie", params.id, "nodes"] });
      setIsAddNodeOpen(false);
      setNewNodeTitle("");
      setNewNodeDescription("");
      toast({ title: "Node added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add node", variant: "destructive" });
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      return apiRequest("DELETE", `/api/grc/bow-tie/${params.id}/nodes/${nodeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bow-tie", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bow-tie", params.id, "nodes"] });
      toast({ title: "Node deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete node", variant: "destructive" });
    },
  });

  const handleEdit = () => {
    if (analysis) {
      setFormData({ ...analysis });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({});
    setIsEditing(false);
  };

  const handleAddNode = () => {
    if (!newNodeTitle.trim()) {
      toast({ title: "Please enter a title", variant: "destructive" });
      return;
    }
    addNodeMutation.mutate({
      nodeType: newNodeType,
      title: newNodeTitle,
      description: newNodeDescription,
    });
  };

  const threats = nodes.filter(n => n.nodeType === "threat");
  const consequences = nodes.filter(n => n.nodeType === "consequence");
  const preventiveControls = nodes.filter(n => n.nodeType === "preventive_control");
  const mitigatingControls = nodes.filter(n => n.nodeType === "mitigating_control");

  const risk = risks.find(r => r.id === analysis?.riskId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Analysis not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/risk-management/bow-tie")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bow-Tie Analyses
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{analysis.analysisNumber} | Bow-Tie Analysis | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/risk-management/bow-tie")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{analysis.analysisNumber}</h1>
                <Badge className={statusColors[analysis.status]}>
                  {analysis.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">{analysis.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAddNodeOpen} onOpenChange={setIsAddNodeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-node">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Node
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Bow-Tie Node</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Node Type</Label>
                    <Select value={newNodeType} onValueChange={setNewNodeType}>
                      <SelectTrigger data-testid="select-node-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="threat">Threat (Cause)</SelectItem>
                        <SelectItem value="preventive_control">Preventive Control</SelectItem>
                        <SelectItem value="mitigating_control">Mitigating Control</SelectItem>
                        <SelectItem value="consequence">Consequence (Effect)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newNodeTitle}
                      onChange={(e) => setNewNodeTitle(e.target.value)}
                      placeholder="Node title"
                      data-testid="input-node-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={newNodeDescription}
                      onChange={(e) => setNewNodeDescription(e.target.value)}
                      placeholder="Additional details..."
                      rows={3}
                      data-testid="textarea-node-description"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddNode}
                    disabled={addNodeMutation.isPending}
                    data-testid="button-save-node"
                  >
                    Add Node
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit} data-testid="button-edit">
                  Edit Analysis
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" data-testid="button-delete">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this bow-tie analysis? All associated nodes will also be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Analysis Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status || "draft"}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Bow-Tie Diagram
                </CardTitle>
                <CardDescription>
                  Visual representation of threats, controls, hazard, and consequences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-stretch gap-4 min-h-[400px] overflow-x-auto pb-4">
                  <div className="flex-1 min-w-[180px] space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-3 h-3 rounded-full ${nodeTypeColors.threat}`} />
                      <h4 className="font-medium">Threats ({threats.length})</h4>
                    </div>
                    {threats.length > 0 ? (
                      threats.map((node) => (
                        <BowTieNodeCard
                          key={node.id}
                          node={node}
                          onDelete={(id) => deleteNodeMutation.mutate(id)}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No threats defined</p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-[180px] space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-3 h-3 rounded-full ${nodeTypeColors.preventive_control}`} />
                      <h4 className="font-medium">Preventive Controls ({preventiveControls.length})</h4>
                    </div>
                    {preventiveControls.length > 0 ? (
                      preventiveControls.map((node) => (
                        <BowTieNodeCard
                          key={node.id}
                          node={node}
                          onDelete={(id) => deleteNodeMutation.mutate(id)}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No preventive controls</p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="flex items-center justify-center min-w-[200px]">
                    <div className="p-6 rounded-xl bg-amber-100 dark:bg-amber-950 border-2 border-amber-400 dark:border-amber-700 text-center">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
                      <p className="font-bold text-lg">HAZARD</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {risk?.riskTitle || "Central Risk Event"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-[180px] space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-3 h-3 rounded-full ${nodeTypeColors.mitigating_control}`} />
                      <h4 className="font-medium">Mitigating Controls ({mitigatingControls.length})</h4>
                    </div>
                    {mitigatingControls.length > 0 ? (
                      mitigatingControls.map((node) => (
                        <BowTieNodeCard
                          key={node.id}
                          node={node}
                          onDelete={(id) => deleteNodeMutation.mutate(id)}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No mitigating controls</p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-[180px] space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-3 h-3 rounded-full ${nodeTypeColors.consequence}`} />
                      <h4 className="font-medium">Consequences ({consequences.length})</h4>
                    </div>
                    {consequences.length > 0 ? (
                      consequences.map((node) => (
                        <BowTieNodeCard
                          key={node.id}
                          node={node}
                          onDelete={(id) => deleteNodeMutation.mutate(id)}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No consequences defined</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Analysis Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p>{analysis.description}</p>
                    </div>
                  )}
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Linked Risk</p>
                      <p className="font-medium">{risk?.riskTitle || analysis.riskId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={statusColors[analysis.status]}>
                        {analysis.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">{threats.length}</p>
                      <p className="text-sm text-muted-foreground">Threats</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{preventiveControls.length}</p>
                      <p className="text-sm text-muted-foreground">Preventive Controls</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{mitigatingControls.length}</p>
                      <p className="text-sm text-muted-foreground">Mitigating Controls</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{consequences.length}</p>
                      <p className="text-sm text-muted-foreground">Consequences</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{format(new Date(analysis.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span>{format(new Date(analysis.updatedAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
