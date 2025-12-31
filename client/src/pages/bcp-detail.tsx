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
  Clock,
  DollarSign,
  Server,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ListChecks
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GrcBusinessContinuityPlan, GrcBcpRecoveryStep } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatHours(hours: number | null | undefined): string {
  if (!hours) return "-";
  if (hours < 24) return `${hours} hours`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) return `${days} day${days > 1 ? "s" : ""}`;
  return `${days} day${days > 1 ? "s" : ""} ${remainingHours}h`;
}

export default function BcpDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<GrcBusinessContinuityPlan>>({});
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDescription, setNewStepDescription] = useState("");
  const [newStepOrder, setNewStepOrder] = useState<number>(1);

  const { data: plan, isLoading } = useQuery<GrcBusinessContinuityPlan>({
    queryKey: ["/api/grc/bcp", params.id],
    enabled: !!params.id,
  });

  const { data: steps = [] } = useQuery<GrcBcpRecoveryStep[]>({
    queryKey: ["/api/grc/bcp", params.id, "steps"],
    enabled: !!params.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<GrcBusinessContinuityPlan>) => {
      return apiRequest("PATCH", `/api/grc/bcp/${params.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bcp"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bcp", params.id] });
      setIsEditing(false);
      toast({ title: "Plan updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update plan", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/grc/bcp/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bcp"] });
      toast({ title: "Plan deleted successfully" });
      navigate("/risk-management/bcp");
    },
    onError: () => {
      toast({ title: "Failed to delete plan", variant: "destructive" });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async (data: { stepTitle: string; stepDescription: string; stepOrder: number }) => {
      return apiRequest("POST", `/api/grc/bcp/${params.id}/steps`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bcp", params.id, "steps"] });
      setIsAddStepOpen(false);
      setNewStepTitle("");
      setNewStepDescription("");
      setNewStepOrder(steps.length + 1);
      toast({ title: "Recovery step added" });
    },
    onError: () => {
      toast({ title: "Failed to add step", variant: "destructive" });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, completed }: { stepId: string; completed: string }) => {
      return apiRequest("PATCH", `/api/grc/bcp/${params.id}/steps/${stepId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bcp", params.id, "steps"] });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      return apiRequest("DELETE", `/api/grc/bcp/${params.id}/steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bcp", params.id, "steps"] });
      toast({ title: "Step deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete step", variant: "destructive" });
    },
  });

  const handleEdit = () => {
    if (plan) {
      setFormData({ ...plan });
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

  const handleAddStep = () => {
    if (!newStepTitle.trim()) {
      toast({ title: "Please enter a step title", variant: "destructive" });
      return;
    }
    addStepMutation.mutate({
      stepTitle: newStepTitle,
      stepDescription: newStepDescription,
      stepOrder: newStepOrder,
    });
  };

  const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
  const completedSteps = steps.filter(s => s.completed === "yes").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Plan not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/risk-management/bcp")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Business Continuity Plans
        </Button>
      </div>
    );
  }

  const criticalSystems = Array.isArray(plan.criticalSystems) ? plan.criticalSystems : [];
  const criticalVendors = Array.isArray(plan.criticalVendors) ? plan.criticalVendors : [];
  const criticalStaff = Array.isArray(plan.criticalStaff) ? plan.criticalStaff : [];

  return (
    <>
      <Helmet>
        <title>{plan.planNumber} | Business Continuity | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/risk-management/bcp")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{plan.planNumber}</h1>
                <Badge className={statusColors[plan.status]}>
                  {plan.status.replace("_", " ")}
                </Badge>
                <Badge className={priorityColors[plan.priority]}>
                  {plan.priority}
                </Badge>
              </div>
              <p className="text-muted-foreground">{plan.planTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                  Edit Plan
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
                      <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this business continuity plan? All associated recovery steps will also be deleted.
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">RTO</p>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{formatHours(plan.recoveryTimeObjective)}</p>
              <p className="text-xs text-muted-foreground">Recovery Time Objective</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">RPO</p>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{formatHours(plan.recoveryPointObjective)}</p>
              <p className="text-xs text-muted-foreground">Recovery Point Objective</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Hourly Loss</p>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{formatCurrency(plan.hourlyLossEstimate)}</p>
              <p className="text-xs text-muted-foreground">Estimated per hour</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Recovery Steps</p>
                <ListChecks className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{completedSteps}/{steps.length}</p>
              <p className="text-xs text-muted-foreground">Steps completed</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5" />
                    Recovery Steps
                  </CardTitle>
                  <CardDescription>
                    Step-by-step recovery procedures
                  </CardDescription>
                </div>
                <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-step">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Recovery Step</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Step Order</Label>
                        <Input
                          type="number"
                          min={1}
                          value={newStepOrder}
                          onChange={(e) => setNewStepOrder(parseInt(e.target.value) || 1)}
                          data-testid="input-step-order"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Step Title</Label>
                        <Input
                          value={newStepTitle}
                          onChange={(e) => setNewStepTitle(e.target.value)}
                          placeholder="What needs to be done?"
                          data-testid="input-step-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Textarea
                          value={newStepDescription}
                          onChange={(e) => setNewStepDescription(e.target.value)}
                          placeholder="Detailed instructions..."
                          rows={3}
                          data-testid="textarea-step-description"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleAddStep}
                        disabled={addStepMutation.isPending}
                        data-testid="button-save-step"
                      >
                        Add Step
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {sortedSteps.length > 0 ? (
                  <div className="space-y-3">
                    {sortedSteps.map((step) => (
                      <div
                        key={step.id}
                        className={`p-4 rounded-lg border ${step.completed === "yes" ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={step.completed === "yes"}
                            onCheckedChange={(checked) => {
                              updateStepMutation.mutate({ stepId: step.id, completed: checked ? "yes" : "no" });
                            }}
                            data-testid={`checkbox-step-${step.id}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Step {step.stepNumber}
                                </Badge>
                                <p className={`font-medium ${step.completed === "yes" ? "line-through text-muted-foreground" : ""}`}>
                                  {step.stepTitle}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => deleteStepMutation.mutate(step.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            {step.stepDescription && (
                              <p className="text-sm text-muted-foreground mt-1">{step.stepDescription}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recovery steps defined yet. Add steps to create your recovery procedure.
                  </p>
                )}
              </CardContent>
            </Card>

            {isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Plan Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plan Title</Label>
                      <Input
                        value={formData.planTitle || ""}
                        onChange={(e) => setFormData({ ...formData, planTitle: e.target.value })}
                        data-testid="input-plan-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status || "draft"}
                        onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                      >
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={formData.priority || "medium"}
                        onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
                      >
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Criticality Level (1-5)</Label>
                      <Select
                        value={String(formData.criticalityLevel || 3)}
                        onValueChange={(v) => setFormData({ ...formData, criticalityLevel: parseInt(v) })}
                      >
                        <SelectTrigger data-testid="select-criticality">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Function</Label>
                    <Input
                      value={formData.businessFunction || ""}
                      onChange={(e) => setFormData({ ...formData, businessFunction: e.target.value })}
                      data-testid="input-business-function"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plan Description</Label>
                    <Textarea
                      value={formData.planDescription || ""}
                      onChange={(e) => setFormData({ ...formData, planDescription: e.target.value })}
                      rows={3}
                      data-testid="textarea-description"
                    />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>RTO (hours)</Label>
                      <Input
                        type="number"
                        value={formData.recoveryTimeObjective || ""}
                        onChange={(e) => setFormData({ ...formData, recoveryTimeObjective: e.target.value ? parseInt(e.target.value) : null })}
                        data-testid="input-rto"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>RPO (hours)</Label>
                      <Input
                        type="number"
                        value={formData.recoveryPointObjective || ""}
                        onChange={(e) => setFormData({ ...formData, recoveryPointObjective: e.target.value ? parseInt(e.target.value) : null })}
                        data-testid="input-rpo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Tolerable Downtime (hours)</Label>
                      <Input
                        type="number"
                        value={formData.maxTolerableDowntime || ""}
                        onChange={(e) => setFormData({ ...formData, maxTolerableDowntime: e.target.value ? parseInt(e.target.value) : null })}
                        data-testid="input-mtd"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hourly Loss Estimate ($)</Label>
                      <Input
                        type="number"
                        value={formData.hourlyLossEstimate || ""}
                        onChange={(e) => setFormData({ ...formData, hourlyLossEstimate: e.target.value ? parseInt(e.target.value) : null })}
                        data-testid="input-hourly-loss"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Daily Loss Estimate ($)</Label>
                      <Input
                        type="number"
                        value={formData.dailyLossEstimate || ""}
                        onChange={(e) => setFormData({ ...formData, dailyLossEstimate: e.target.value ? parseInt(e.target.value) : null })}
                        data-testid="input-daily-loss"
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Recovery Strategy</Label>
                    <Textarea
                      value={formData.recoveryStrategy || ""}
                      onChange={(e) => setFormData({ ...formData, recoveryStrategy: e.target.value })}
                      rows={3}
                      data-testid="textarea-recovery-strategy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alternate Worksite</Label>
                    <Input
                      value={formData.alternateWorksite || ""}
                      onChange={(e) => setFormData({ ...formData, alternateWorksite: e.target.value })}
                      data-testid="input-alternate-worksite"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Communication Plan</Label>
                    <Textarea
                      value={formData.communicationPlan || ""}
                      onChange={(e) => setFormData({ ...formData, communicationPlan: e.target.value })}
                      rows={3}
                      data-testid="textarea-communication-plan"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Plan Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Business Function</p>
                    <p className="font-medium">{plan.businessFunction}</p>
                  </div>
                  {plan.planDescription && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p>{plan.planDescription}</p>
                    </div>
                  )}
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Max Tolerable Downtime</p>
                      <p className="font-medium">{formatHours(plan.maxTolerableDowntime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Daily Loss Estimate</p>
                      <p className="font-medium">{formatCurrency(plan.dailyLossEstimate)}</p>
                    </div>
                  </div>
                  {plan.recoveryStrategy && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Recovery Strategy</p>
                        <p className="whitespace-pre-wrap">{plan.recoveryStrategy}</p>
                      </div>
                    </>
                  )}
                  {plan.alternateWorksite && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Alternate Worksite</p>
                      <p>{plan.alternateWorksite}</p>
                    </div>
                  )}
                  {plan.communicationPlan && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Communication Plan</p>
                      <p className="whitespace-pre-wrap">{plan.communicationPlan}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Critical Systems
                </CardTitle>
              </CardHeader>
              <CardContent>
                {criticalSystems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {criticalSystems.map((system, i) => (
                      <Badge key={i} variant="secondary">{String(system)}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No critical systems defined</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Critical Dependencies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Vendors</p>
                  {criticalVendors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {criticalVendors.map((vendor, i) => (
                        <Badge key={i} variant="outline">{String(vendor)}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">None defined</p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Staff Roles</p>
                  {criticalStaff.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {criticalStaff.map((staff, i) => (
                        <Badge key={i} variant="outline">{String(staff)}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">None defined</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Testing & Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.lastTestDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Test</span>
                    <span className="font-medium">
                      {format(new Date(plan.lastTestDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {plan.nextTestDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Test</span>
                    <span className="font-medium">
                      {format(new Date(plan.nextTestDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {plan.testScore !== null && plan.testScore !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Test Score</span>
                    <span className="font-medium">{plan.testScore}%</span>
                  </div>
                )}
                <Separator />
                {plan.effectiveDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Effective</span>
                    <span className="font-medium">
                      {format(new Date(plan.effectiveDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {plan.approvedDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved</span>
                    <span className="font-medium">
                      {format(new Date(plan.approvedDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {plan.reviewDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Review</span>
                    <span className="font-medium">
                      {format(new Date(plan.reviewDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {format(new Date(plan.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">
                    {format(new Date(plan.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
