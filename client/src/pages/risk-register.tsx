import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { GrcRisk } from "@shared/schema";
import { Helmet } from "react-helmet";

const riskFormSchema = z.object({
  riskTitle: z.string().min(5, "Title must be at least 5 characters"),
  riskDescription: z.string().min(20, "Description must be at least 20 characters"),
  category: z.enum(["operational", "financial", "compliance", "strategic", "reputational", "cybersecurity", "third_party", "legal"]),
  likelihood: z.enum(["rare", "unlikely", "possible", "likely", "almost_certain"]),
  impact: z.enum(["minimal", "minor", "moderate", "major", "catastrophic"]),
  mitigationStrategy: z.string().optional(),
  riskAppetite: z.string().optional(),
  riskTolerance: z.string().optional(),
});

type RiskFormValues = z.infer<typeof riskFormSchema>;

export default function RiskRegister() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<GrcRisk | null>(null);

  const { data: risks, isLoading } = useQuery<GrcRisk[]>({
    queryKey: ["/api/grc/risks"],
  });

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: {
      riskTitle: "",
      riskDescription: "",
      category: "operational",
      likelihood: "possible",
      impact: "moderate",
      mitigationStrategy: "",
      riskAppetite: "",
      riskTolerance: "",
    },
  });

  const createRiskMutation = useMutation({
    mutationFn: async (data: RiskFormValues) => {
      const likelihoodScore = { rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5 }[data.likelihood];
      const impactScore = { minimal: 1, minor: 2, moderate: 3, major: 4, catastrophic: 5 }[data.impact];
      const inherentRiskScore = likelihoodScore * impactScore;

      return apiRequest("POST", "/api/grc/risks", {
        ...data,
        inherentRiskScore,
        status: "identified",
        identifiedDate: new Date().toISOString(),
        riskOwner: user?.id || "system",
        createdBy: user?.id || "system",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risks"], refetchType: "all" });
      toast({ title: "Risk created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error creating risk", description: error.message, variant: "destructive" });
    },
  });

  const deleteRiskMutation = useMutation({
    mutationFn: async (riskId: string) => {
      return apiRequest("DELETE", `/api/grc/risks/${riskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risks"], refetchType: "all" });
      toast({ title: "Risk deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting risk", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: RiskFormValues) => {
    createRiskMutation.mutate(data);
  };

  const getRiskRating = (score: number) => {
    if (score >= 20) return { label: "Critical", color: "bg-red-500 text-white" };
    if (score >= 15) return { label: "High", color: "bg-orange-500 text-white" };
    if (score >= 10) return { label: "Medium", color: "bg-yellow-500 text-black" };
    if (score >= 5) return { label: "Low", color: "bg-blue-500 text-white" };
    return { label: "Minimal", color: "bg-green-500 text-white" };
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      identified: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      assessed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      mitigating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      mitigated: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      accepted: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      transferred: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      closed: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const filteredRisks = risks?.filter(risk => {
    const matchesSearch = 
      risk.riskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.riskDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || risk.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || risk.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  return (
    <>
      <Helmet>
        <title>Risk Register | Sentinel Counsel</title>
        <meta name="description" content="Manage enterprise risks with comprehensive risk register including risk assessment, categorization, and mitigation tracking." />
      </Helmet>

      <div className="flex flex-col gap-6 p-6 stagger-1 fadeSlideUp">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-risk-register-title">Risk Register</h1>
            <p className="text-muted-foreground mt-1">Manage and monitor enterprise risks</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" data-testid="button-export-risks">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-risk">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Risk
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Risk</DialogTitle>
                  <DialogDescription>
                    Create a new risk entry in the register
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="riskTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risk Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter risk title..." {...field} data-testid="input-risk-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="riskDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the risk in detail..." 
                              className="min-h-[100px]"
                              {...field} 
                              data-testid="textarea-risk-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="operational">Operational</SelectItem>
                                <SelectItem value="financial">Financial</SelectItem>
                                <SelectItem value="compliance">Compliance</SelectItem>
                                <SelectItem value="strategic">Strategic</SelectItem>
                                <SelectItem value="reputational">Reputational</SelectItem>
                                <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                                <SelectItem value="third_party">Third Party</SelectItem>
                                <SelectItem value="legal">Legal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="likelihood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Likelihood</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-likelihood">
                                  <SelectValue placeholder="Select likelihood" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="rare">Rare (1)</SelectItem>
                                <SelectItem value="unlikely">Unlikely (2)</SelectItem>
                                <SelectItem value="possible">Possible (3)</SelectItem>
                                <SelectItem value="likely">Likely (4)</SelectItem>
                                <SelectItem value="almost_certain">Almost Certain (5)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="impact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Impact</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-impact">
                                  <SelectValue placeholder="Select impact" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="minimal">Minimal (1)</SelectItem>
                                <SelectItem value="minor">Minor (2)</SelectItem>
                                <SelectItem value="moderate">Moderate (3)</SelectItem>
                                <SelectItem value="major">Major (4)</SelectItem>
                                <SelectItem value="catastrophic">Catastrophic (5)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="mitigationStrategy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mitigation Strategy (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the mitigation strategy..." 
                              {...field} 
                              data-testid="textarea-mitigation"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createRiskMutation.isPending} data-testid="button-submit-risk">
                        {createRiskMutation.isPending ? "Creating..." : "Create Risk"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="stagger-2 fadeSlideUp">
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search risks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-risks"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-category">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="strategic">Strategic</SelectItem>
                  <SelectItem value="reputational">Reputational</SelectItem>
                  <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="identified">Identified</SelectItem>
                  <SelectItem value="assessed">Assessed</SelectItem>
                  <SelectItem value="mitigating">Mitigating</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredRisks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <Button variant="ghost" size="sm" className="h-8 -ml-3">
                        Risk Title
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Identified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.map((risk, index) => {
                    const rating = getRiskRating(risk.inherentRiskScore);
                    return (
                      <TableRow key={risk.id} data-testid={`risk-row-${index}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{risk.riskTitle}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {risk.riskDescription}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {risk.category.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={rating.color}>
                            {risk.inherentRiskScore} - {rating.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(risk.status)}>
                            {risk.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(risk.identifiedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/risk-management/risk/${risk.id}`}>
                              <Button variant="ghost" size="icon" data-testid={`button-view-risk-${index}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/risk-management/risk/${risk.id}`}>
                              <Button variant="ghost" size="icon" data-testid={`button-edit-risk-${index}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteRiskMutation.mutate(risk.id)}
                              data-testid={`button-delete-risk-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No risks found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by adding your first risk"}
                </p>
                {!searchQuery && categoryFilter === "all" && statusFilter === "all" && (
                  <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-risk">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Risk
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground stagger-3 fadeSlideUp">
          Showing {filteredRisks.length} of {risks?.length || 0} risks
        </div>
      </div>
    </>
  );
}
