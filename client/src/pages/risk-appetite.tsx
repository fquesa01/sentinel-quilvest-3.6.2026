import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  Target, 
  Plus, 
  Edit,
  DollarSign,
  Shield,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GrcRiskAppetite } from "@shared/schema";

type RiskAppetiteLevel = "averse" | "minimal" | "cautious" | "moderate" | "open" | "seeking";

const appetiteLevelColors: Record<RiskAppetiteLevel, string> = {
  averse: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  minimal: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  cautious: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  moderate: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  seeking: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const appetiteLevelLabels: Record<RiskAppetiteLevel, string> = {
  averse: "Risk Averse",
  minimal: "Minimal Risk",
  cautious: "Cautious",
  moderate: "Moderate",
  open: "Open to Risk",
  seeking: "Risk Seeking",
};

const categoryLabels: Record<string, string> = {
  strategic: "Strategic",
  operational: "Operational",
  financial: "Financial",
  compliance: "Compliance",
  technology: "Technology",
  reputational: "Reputational",
  legal: "Legal",
  environmental: "Environmental",
  human_resources: "Human Resources",
  third_party: "Third Party",
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function RiskAppetite() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formCategory, setFormCategory] = useState("");
  const [formAppetiteLevel, setFormAppetiteLevel] = useState("moderate");

  const { data: appetites = [], isLoading } = useQuery<GrcRiskAppetite[]>({
    queryKey: ["/api/grc/risk-appetite"],
  });

  const createAppetiteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/grc/risk-appetite", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risk-appetite"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Risk appetite defined successfully" });
    },
    onError: () => {
      toast({ title: "Failed to define risk appetite", variant: "destructive" });
    },
  });

  const handleCreateAppetite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!formCategory) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }
    
    createAppetiteMutation.mutate({
      category: formCategory,
      appetiteLevel: formAppetiteLevel,
      appetiteStatement: formData.get("appetiteStatement"),
      toleranceMin: parseInt(formData.get("toleranceMin") as string) || null,
      toleranceMax: parseInt(formData.get("toleranceMax") as string) || null,
      toleranceDescription: formData.get("toleranceDescription"),
      maxAcceptableLoss: parseInt(formData.get("maxAcceptableLoss") as string) || null,
      maxAnnualLoss: parseInt(formData.get("maxAnnualLoss") as string) || null,
    });
  };

  return (
    <>
      <Helmet>
        <title>Risk Appetite | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Risk Appetite Framework</h1>
            <p className="text-muted-foreground">Define organizational risk tolerance levels by category</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-define-appetite">
                <Plus className="h-4 w-4 mr-2" />
                Define Appetite
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Define Risk Appetite</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAppetite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Risk Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appetiteLevel">Appetite Level</Label>
                  <Select value={formAppetiteLevel} onValueChange={setFormAppetiteLevel}>
                    <SelectTrigger data-testid="select-appetite-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="averse">Risk Averse - Avoid risk at all costs</SelectItem>
                      <SelectItem value="minimal">Minimal - Prefer safe options</SelectItem>
                      <SelectItem value="cautious">Cautious - Limited tolerance</SelectItem>
                      <SelectItem value="moderate">Moderate - Balanced approach</SelectItem>
                      <SelectItem value="open">Open - Consider higher risk</SelectItem>
                      <SelectItem value="seeking">Seeking - Pursue high risk/reward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appetiteStatement">Appetite Statement</Label>
                  <Textarea
                    id="appetiteStatement"
                    name="appetiteStatement"
                    placeholder="Board-approved risk appetite statement..."
                    required
                    data-testid="input-appetite-statement"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="toleranceMin">Min Risk Score</Label>
                    <Input
                      id="toleranceMin"
                      name="toleranceMin"
                      type="number"
                      placeholder="1"
                      data-testid="input-tolerance-min"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toleranceMax">Max Risk Score</Label>
                    <Input
                      id="toleranceMax"
                      name="toleranceMax"
                      type="number"
                      placeholder="25"
                      data-testid="input-tolerance-max"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toleranceDescription">Tolerance Description</Label>
                  <Textarea
                    id="toleranceDescription"
                    name="toleranceDescription"
                    placeholder="Describe acceptable risk tolerance..."
                    data-testid="input-tolerance-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxAcceptableLoss">Max Loss per Incident ($)</Label>
                    <Input
                      id="maxAcceptableLoss"
                      name="maxAcceptableLoss"
                      type="number"
                      placeholder="100000"
                      data-testid="input-max-loss"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAnnualLoss">Max Annual Loss ($)</Label>
                    <Input
                      id="maxAnnualLoss"
                      name="maxAnnualLoss"
                      type="number"
                      placeholder="500000"
                      data-testid="input-max-annual"
                    />
                  </div>
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
                    disabled={createAppetiteMutation.isPending}
                    data-testid="button-submit-appetite"
                  >
                    Define Appetite
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories Defined</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-defined">{appetites.length}</div>
              <p className="text-xs text-muted-foreground">of 10 risk categories</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-approved">
                {appetites.filter((a) => a.approvedBy).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Annual Limit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-limit">
                {formatCurrency(appetites.reduce((sum, a) => sum + (a.maxAnnualLoss || 0), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : appetites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Risk Appetite Defined</h3>
              <p className="text-muted-foreground mb-4">
                Define your organization's risk appetite for each category
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Define Appetite
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appetites.map((appetite) => (
              <Card key={appetite.id} data-testid={`card-appetite-${appetite.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {categoryLabels[appetite.category] || appetite.category}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <Badge className={appetiteLevelColors[appetite.appetiteLevel as RiskAppetiteLevel]}>
                          {appetiteLevelLabels[appetite.appetiteLevel as RiskAppetiteLevel]}
                        </Badge>
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Appetite Statement</h4>
                    <p className="text-sm text-muted-foreground">{appetite.appetiteStatement}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Risk Score Range: </span>
                      <span className="font-medium">
                        {appetite.toleranceMin || 1} - {appetite.toleranceMax || 25}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Loss/Incident: </span>
                      <span className="font-medium">{formatCurrency(appetite.maxAcceptableLoss)}</span>
                    </div>
                  </div>
                  {appetite.toleranceDescription && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Tolerance: </span>
                      <span>{appetite.toleranceDescription}</span>
                    </div>
                  )}
                  {appetite.approvedBy && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Approved {appetite.approvedDate ? format(new Date(appetite.approvedDate), "MMM d, yyyy") : ""}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
