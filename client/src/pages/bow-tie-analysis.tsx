import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  Network, 
  Plus, 
  Search, 
  Eye,
  ArrowLeft,
  ArrowRight,
  Shield,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { GrcBowTieAnalysis, GrcRisk } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function BowTieAnalysis() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formRiskId, setFormRiskId] = useState("");

  const { data: analyses = [], isLoading } = useQuery<GrcBowTieAnalysis[]>({
    queryKey: ["/api/grc/bow-tie"],
  });

  const { data: risks = [] } = useQuery<GrcRisk[]>({
    queryKey: ["/api/grc/risks"],
  });

  const createAnalysisMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/grc/bow-tie", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/bow-tie"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Bow-tie analysis created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create analysis", variant: "destructive" });
    },
  });

  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesSearch =
      analysis.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.analysisNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || analysis.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateAnalysis = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!formRiskId) {
      toast({ title: "Please select a risk", variant: "destructive" });
      return;
    }
    
    createAnalysisMutation.mutate({
      title: formData.get("title"),
      description: formData.get("description"),
      riskId: formRiskId,
    });
  };

  return (
    <>
      <Helmet>
        <title>Bow-Tie Analysis | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Bow-Tie Analysis</h1>
            <p className="text-muted-foreground">Visualize risk causes, consequences, and controls</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-analysis">
                <Plus className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Bow-Tie Analysis</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAnalysis} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Analysis Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Enter analysis title"
                    required
                    data-testid="input-analysis-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riskId">Central Risk (Hazard)</Label>
                  <Select value={formRiskId} onValueChange={setFormRiskId}>
                    <SelectTrigger data-testid="select-risk">
                      <SelectValue placeholder="Select the central risk" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {risks.map((risk) => (
                        <SelectItem key={risk.id} value={risk.id}>
                          {risk.riskTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the scope of this analysis..."
                    data-testid="input-description"
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
                    disabled={createAnalysisMutation.isPending}
                    data-testid="button-submit-analysis"
                  >
                    Create Analysis
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-analyses">{analyses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Eye className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-active">
                {analyses.filter((a) => a.status === "active").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Threats</CardTitle>
              <ArrowLeft className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-threats">
                {analyses.reduce((sum, a) => sum + (a.threatCount || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Controls</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-controls">
                {analyses.reduce((sum, a) => sum + (a.preventiveControlCount || 0) + (a.mitigatingControlCount || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Analysis Register</CardTitle>
                <CardDescription>
                  Bow-tie diagrams link threats to consequences through a central risk
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search analyses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-analyses"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
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
            ) : filteredAnalyses.length === 0 ? (
              <div className="text-center py-12">
                <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Analyses Found</h3>
                <p className="text-muted-foreground mb-4">
                  {analyses.length === 0
                    ? "Create your first bow-tie analysis"
                    : "No analyses match your current filters"}
                </p>
                {analyses.length === 0 && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Analysis
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Analysis ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Threats</TableHead>
                    <TableHead className="text-center">Consequences</TableHead>
                    <TableHead className="text-center">Preventive</TableHead>
                    <TableHead className="text-center">Mitigating</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalyses.map((analysis) => (
                    <TableRow
                      key={analysis.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/risk-management/bow-tie/${analysis.id}`)}
                      data-testid={`row-analysis-${analysis.id}`}
                    >
                      <TableCell className="font-mono text-sm">
                        {analysis.analysisNumber}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {analysis.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[analysis.status] || statusColors.draft}>
                          {analysis.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-600 font-medium">{analysis.threatCount || 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-orange-600 font-medium">{analysis.consequenceCount || 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-blue-600 font-medium">{analysis.preventiveControlCount || 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 font-medium">{analysis.mitigatingControlCount || 0}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {analysis.createdAt
                          ? format(new Date(analysis.createdAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How Bow-Tie Analysis Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-8">
              <div className="text-center">
                <div className="w-24 h-24 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
                  <ArrowLeft className="h-8 w-8 text-red-500" />
                </div>
                <span className="text-sm font-medium">Threats</span>
                <p className="text-xs text-muted-foreground">Causes</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-24 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-blue-500" />
                </div>
                <span className="text-xs text-muted-foreground">Preventive</span>
              </div>
              <div className="text-center">
                <div className="w-28 h-28 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-2 border-4 border-yellow-400">
                  <AlertTriangle className="h-10 w-10 text-yellow-600" />
                </div>
                <span className="text-sm font-medium">Hazard</span>
                <p className="text-xs text-muted-foreground">Central Risk</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-24 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <span className="text-xs text-muted-foreground">Mitigating</span>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-2">
                  <ArrowRight className="h-8 w-8 text-orange-500" />
                </div>
                <span className="text-sm font-medium">Consequences</span>
                <p className="text-xs text-muted-foreground">Effects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
