import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  Briefcase, 
  Plus, 
  Search, 
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Building2,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GrcBusinessContinuityPlan } from "@shared/schema";

type BcpStatus = "draft" | "pending_approval" | "approved" | "active" | "under_review" | "archived";
type BcpPriority = "critical" | "high" | "medium" | "low";

const statusColors: Record<BcpStatus, string> = {
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  pending_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  under_review: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const priorityColors: Record<BcpPriority, string> = {
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
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default function BusinessContinuity() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formPriority, setFormPriority] = useState("medium");
  const [formCriticality, setFormCriticality] = useState("3");

  const { data: plans = [], isLoading } = useQuery<GrcBusinessContinuityPlan[]>({
    queryKey: ["/api/grc/bcp"],
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/grc/bcp", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bcp"] });
      setIsCreateDialogOpen(false);
      toast({ title: "BCP created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create BCP", variant: "destructive" });
    },
  });

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.planTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.planNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.businessFunction.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || plan.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: plans.length,
    active: plans.filter((p) => p.status === "active").length,
    critical: plans.filter((p) => p.priority === "critical").length,
    needsReview: plans.filter((p) => p.status === "under_review").length,
  };

  const handleCreatePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createPlanMutation.mutate({
      planTitle: formData.get("planTitle"),
      planDescription: formData.get("planDescription"),
      priority: formPriority,
      businessFunction: formData.get("businessFunction"),
      department: formData.get("department"),
      criticalityLevel: parseInt(formCriticality),
      recoveryTimeObjective: parseInt(formData.get("rto") as string) || null,
      recoveryPointObjective: parseInt(formData.get("rpo") as string) || null,
      hourlyLossEstimate: parseInt(formData.get("hourlyLoss") as string) || null,
    });
  };

  return (
    <>
      <Helmet>
        <title>Business Continuity | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Business Continuity Planning</h1>
            <p className="text-muted-foreground">Manage recovery plans for critical business functions</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-bcp">
                <Plus className="h-4 w-4 mr-2" />
                New BCP
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Business Continuity Plan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="planTitle">Plan Title</Label>
                  <Input
                    id="planTitle"
                    name="planTitle"
                    placeholder="Enter plan title"
                    required
                    data-testid="input-plan-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessFunction">Business Function</Label>
                    <Input
                      id="businessFunction"
                      name="businessFunction"
                      placeholder="e.g., Order Processing"
                      required
                      data-testid="input-business-function"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      name="department"
                      placeholder="e.g., Operations"
                      data-testid="input-department"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formPriority} onValueChange={setFormPriority}>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="critical">Critical - Restore within hours</SelectItem>
                        <SelectItem value="high">High - Restore within 24h</SelectItem>
                        <SelectItem value="medium">Medium - Restore within 72h</SelectItem>
                        <SelectItem value="low">Low - Can wait up to a week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="criticalityLevel">Criticality (1-5)</Label>
                    <Select value={formCriticality} onValueChange={setFormCriticality}>
                      <SelectTrigger data-testid="select-criticality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="5">5 - Mission Critical</SelectItem>
                        <SelectItem value="4">4 - High Priority</SelectItem>
                        <SelectItem value="3">3 - Important</SelectItem>
                        <SelectItem value="2">2 - Moderate</SelectItem>
                        <SelectItem value="1">1 - Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rto">RTO (hours)</Label>
                    <Input
                      id="rto"
                      name="rto"
                      type="number"
                      placeholder="4"
                      data-testid="input-rto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rpo">RPO (hours)</Label>
                    <Input
                      id="rpo"
                      name="rpo"
                      type="number"
                      placeholder="1"
                      data-testid="input-rpo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyLoss">Hourly Loss ($)</Label>
                    <Input
                      id="hourlyLoss"
                      name="hourlyLoss"
                      type="number"
                      placeholder="5000"
                      data-testid="input-hourly-loss"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planDescription">Description</Label>
                  <Textarea
                    id="planDescription"
                    name="planDescription"
                    placeholder="Describe the recovery plan..."
                    data-testid="input-plan-description"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPlanMutation.isPending}
                    data-testid="button-submit-bcp"
                  >
                    Create Plan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-plans">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-active">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-critical">{stats.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-review">{stats.needsReview}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>BCP Register</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search plans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-plans"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-32" data-testid="select-priority-filter">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No BCPs Found</h3>
                <p className="text-muted-foreground mb-4">
                  {plans.length === 0
                    ? "Create your first business continuity plan"
                    : "No plans match your current filters"}
                </p>
                {plans.length === 0 && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create BCP
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Business Function</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">RTO</TableHead>
                    <TableHead className="text-right">Hourly Loss</TableHead>
                    <TableHead>Test Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan) => (
                    <TableRow
                      key={plan.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/risk-management/bcp/${plan.id}`)}
                      data-testid={`row-bcp-${plan.id}`}
                    >
                      <TableCell className="font-mono text-sm">
                        {plan.planNumber}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {plan.planTitle}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {plan.businessFunction}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[plan.priority as BcpPriority]}>
                          {plan.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[plan.status as BcpStatus]}>
                          {plan.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          {formatHours(plan.recoveryTimeObjective)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          {formatCurrency(plan.hourlyLossEstimate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.testScore !== null ? (
                          <span className={plan.testScore >= 80 ? "text-green-600" : plan.testScore >= 50 ? "text-yellow-600" : "text-red-600"}>
                            {plan.testScore}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not tested</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
