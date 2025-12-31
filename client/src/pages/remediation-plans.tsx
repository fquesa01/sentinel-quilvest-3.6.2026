import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, ClipboardList, CheckCircle2, Clock, Target, Trash2, Edit, X } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRemediationPlanSchema, type RemediationPlan } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RemediationPlans() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RemediationPlan | null>(null);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState("");
  const [newMilestone, setNewMilestone] = useState("");

  const { data: plans, isLoading } = useQuery<RemediationPlan[]>({
    queryKey: ["/api/remediation-plans"],
  });

  const { data: cases } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/remediation-plans", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/remediation-plans"] });
      setIsCreateOpen(false);
      toast({ title: "Success", description: "Remediation plan created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/remediation-plans/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/remediation-plans"] });
      setIsEditOpen(false);
      setSelectedPlan(null);
      toast({ title: "Success", description: "Remediation plan updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/remediation-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/remediation-plans"] });
      toast({ title: "Success", description: "Remediation plan deleted" });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertRemediationPlanSchema.extend({
      caseId: insertRemediationPlanSchema.shape.caseId,
      planName: insertRemediationPlanSchema.shape.planName,
      violationType: insertRemediationPlanSchema.shape.violationType,
    })),
    defaultValues: {
      caseId: "",
      planName: "",
      violationType: "fcpa_violation",
      actionItems: [],
      milestones: [],
      overallStatus: "draft",
      progressPercentage: 0,
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "cancelled":
        return "outline";
      default:
        return "outline";
    }
  };

  const handleEdit = (plan: RemediationPlan) => {
    setSelectedPlan(plan);
    const items = Array.isArray(plan.actionItems) ? (plan.actionItems as string[]) : [];
    const stones = Array.isArray(plan.milestones) ? (plan.milestones as string[]) : [];
    setActionItems(items);
    setMilestones(stones);
    form.reset({
      caseId: plan.caseId,
      planName: plan.planName,
      violationType: plan.violationType,
      actionItems: items,
      milestones: stones,
      overallStatus: plan.overallStatus,
      progressPercentage: plan.progressPercentage,
    });
    setIsEditOpen(true);
  };

  const addActionItem = () => {
    if (newActionItem.trim()) {
      setActionItems([...actionItems, newActionItem.trim()]);
      setNewActionItem("");
    }
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const addMilestone = () => {
    if (newMilestone.trim()) {
      setMilestones([...milestones, newMilestone.trim()]);
      setNewMilestone("");
    }
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading remediation plans...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-semibold">Remediation Plans</h1>
              <p className="text-sm text-muted-foreground">
                Track corrective actions and compliance improvements
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-plan">
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Remediation Plan</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="caseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-case">
                              <SelectValue placeholder="Select case" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cases?.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="planName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., FCPA Remediation - Q1 2024" data-testid="input-plan-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="violationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Violation Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-violation-type">
                              <SelectValue placeholder="Select violation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fcpa_violation">FCPA Violation</SelectItem>
                            <SelectItem value="antitrust">Antitrust</SelectItem>
                            <SelectItem value="off_channel_communication">Off-Channel Communication</SelectItem>
                            <SelectItem value="insider_trading">Insider Trading</SelectItem>
                            <SelectItem value="aml_banking">AML/Banking</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-plan">
                      {createMutation.isPending ? "Creating..." : "Create Plan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Remediation Plan</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                if (selectedPlan) {
                  updateMutation.mutate({
                    id: selectedPlan.id,
                    data: { ...data, actionItems, milestones },
                  });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="planName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Plan name" data-testid="input-plan-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="overallStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="progressPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-progress"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-3">
                <FormLabel>Action Items</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add action item..."
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addActionItem())}
                    data-testid="input-new-action-item"
                  />
                  <Button type="button" onClick={addActionItem} size="sm" data-testid="button-add-action">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {actionItems.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {actionItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeActionItem(index)}
                          data-testid={`button-remove-action-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <FormLabel>Milestones</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add milestone..."
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMilestone())}
                    data-testid="input-new-milestone"
                  />
                  <Button type="button" onClick={addMilestone} size="sm" data-testid="button-add-milestone">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {milestones.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {milestones.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMilestone(index)}
                          data-testid={`button-remove-milestone-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-update">
                  {updateMutation.isPending ? "Updating..." : "Update Plan"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto p-6">
        {plans && plans.length > 0 ? (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="hover-elevate" data-testid={`card-plan-${plan.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{plan.planName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.violationType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusBadgeVariant(plan.overallStatus)}>
                        {plan.overallStatus.replace(/_/g, " ")}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(plan)}
                        data-testid={`button-edit-${plan.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(plan.id)}
                        data-testid={`button-delete-${plan.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">{plan.progressPercentage}%</span>
                    </div>
                    <Progress value={plan.progressPercentage} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="text-muted-foreground">Action Items</div>
                        <div className="font-medium">
                          {Array.isArray(plan.actionItems) ? plan.actionItems.length : 0}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="text-muted-foreground">Milestones</div>
                        <div className="font-medium">
                          {Array.isArray(plan.milestones) ? plan.milestones.length : 0}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="text-muted-foreground">Created</div>
                        <div className="font-medium">
                          {format(new Date(plan.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {plan.targetCompletionDate && (
                    <div className="text-sm text-muted-foreground">
                      Target completion: {format(new Date(plan.targetCompletionDate), "MMM d, yyyy")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Remediation Plans</h3>
              <p className="text-muted-foreground mb-4">
                Create a plan to track corrective actions for compliance violations.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
