import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Plus, Search, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import type { GrcRisk } from "@shared/schema";

const riskCategories = [
  "operational",
  "financial",
  "compliance",
  "strategic",
  "reputational",
  "technology",
  "legal",
  "third_party",
];

const riskStatuses = ["identified", "assessed", "mitigating", "mitigated", "accepted", "closed"];

const likelihoodLabels: Record<string, string> = {
  rare: "Rare",
  unlikely: "Unlikely",
  possible: "Possible",
  likely: "Likely",
  almost_certain: "Almost Certain",
};

const impactLabels: Record<string, string> = {
  negligible: "Negligible",
  minor: "Minor",
  moderate: "Moderate",
  major: "Major",
  severe: "Severe",
};

export default function GrcRisks() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRisk, setNewRisk] = useState({
    riskTitle: "",
    riskDescription: "",
    category: "operational",
    likelihood: "possible",
    impact: "moderate",
    riskOwner: "",
    mitigationStrategy: "",
    identifiedDate: new Date().toISOString().split("T")[0],
  });

  const { data: risks, isLoading } = useQuery<GrcRisk[]>({
    queryKey: ["/api/grc/risks"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/grc/risks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/dashboard"] });
      setIsCreateDialogOpen(false);
      setNewRisk({
        riskTitle: "",
        riskDescription: "",
        category: "operational",
        likelihood: "possible",
        impact: "moderate",
        riskOwner: "",
        mitigationStrategy: "",
        identifiedDate: new Date().toISOString().split("T")[0],
      });
      toast({ title: "Risk created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create risk", variant: "destructive" });
    },
  });

  const filteredRisks = risks?.filter((risk) => {
    const matchesSearch =
      risk.riskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.riskDescription?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || risk.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || risk.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getRiskScoreColor = (score: number) => {
    if (score >= 20) return "destructive";
    if (score >= 12) return "default";
    if (score >= 6) return "secondary";
    return "outline";
  };

  const handleCreateRisk = () => {
    const likelihoodScores: Record<string, number> = { rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5 };
    const impactScores: Record<string, number> = { negligible: 1, minor: 2, moderate: 3, major: 4, severe: 5 };
    const inherentRiskScore = (likelihoodScores[newRisk.likelihood] || 3) * (impactScores[newRisk.impact] || 3);
    createMutation.mutate({
      ...newRisk,
      inherentRiskScore,
      identifiedDate: new Date(newRisk.identifiedDate),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/grc">
              <Button variant="ghost" size="icon" data-testid="button-back-grc">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold" data-testid="heading-risks">Risk Management</h1>
              <p className="text-muted-foreground text-sm">
                Identify, assess, and mitigate organizational risks
              </p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-risk">
                <Plus className="h-4 w-4 mr-2" />
                Add Risk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Risk</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Risk Name</Label>
                  <Input
                    value={newRisk.riskTitle}
                    onChange={(e) => setNewRisk({ ...newRisk, riskTitle: e.target.value })}
                    placeholder="Enter risk name"
                    data-testid="input-risk-name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newRisk.riskDescription}
                    onChange={(e) => setNewRisk({ ...newRisk, riskDescription: e.target.value })}
                    placeholder="Describe the risk"
                    data-testid="input-risk-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={newRisk.category}
                      onValueChange={(v) => setNewRisk({ ...newRisk, category: v })}
                    >
                      <SelectTrigger data-testid="select-risk-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {riskCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Owner</Label>
                    <Input
                      value={newRisk.riskOwner}
                      onChange={(e) => setNewRisk({ ...newRisk, riskOwner: e.target.value })}
                      placeholder="Risk owner"
                      data-testid="input-risk-owner"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Likelihood</Label>
                    <Select
                      value={newRisk.likelihood}
                      onValueChange={(v) => setNewRisk({ ...newRisk, likelihood: v })}
                    >
                      <SelectTrigger data-testid="select-risk-likelihood">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(likelihoodLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Impact</Label>
                    <Select
                      value={newRisk.impact}
                      onValueChange={(v) => setNewRisk({ ...newRisk, impact: v })}
                    >
                      <SelectTrigger data-testid="select-risk-impact">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(impactLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Mitigation Strategy</Label>
                  <Textarea
                    value={newRisk.mitigationStrategy}
                    onChange={(e) => setNewRisk({ ...newRisk, mitigationStrategy: e.target.value })}
                    placeholder="How will this risk be mitigated?"
                    data-testid="input-risk-mitigation"
                  />
                </div>
                <Button
                  onClick={handleCreateRisk}
                  disabled={!newRisk.riskTitle || createMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-risk"
                >
                  Create Risk
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search risks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-risks"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {riskStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40" data-testid="select-category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {riskCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {filteredRisks?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Risks Found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Click 'Add Risk' to create your first risk entry"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRisks?.map((risk) => (
              <Card key={risk.id} className="hover-elevate" data-testid={`card-risk-${risk.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{risk.riskTitle}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {risk.riskDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={getRiskScoreColor(risk.inherentRiskScore)}>
                        Score: {risk.inherentRiskScore}
                      </Badge>
                      <Badge variant="outline">
                        {risk.status.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm flex-wrap">
                    <div>
                      <span className="text-muted-foreground">Category:</span>{" "}
                      <span className="font-medium">
                        {risk.category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Likelihood:</span>{" "}
                      <span className="font-medium">
                        {likelihoodLabels[risk.likelihood] || risk.likelihood}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Impact:</span>{" "}
                      <span className="font-medium">
                        {impactLabels[risk.impact] || risk.impact}
                      </span>
                    </div>
                    {risk.riskOwner && (
                      <div>
                        <span className="text-muted-foreground">Owner:</span>{" "}
                        <span className="font-medium">{risk.riskOwner}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
