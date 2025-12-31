import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  Activity, 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
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
import type { GrcKeyRiskIndicator } from "@shared/schema";

type KriStatus = "active" | "inactive" | "under_review";
type KriTrend = "improving" | "stable" | "deteriorating" | "unknown";
type KriAlertLevel = "normal" | "warning" | "critical";

const alertColors: Record<KriAlertLevel, string> = {
  normal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const trendIcons: Record<KriTrend, JSX.Element> = {
  improving: <TrendingUp className="h-4 w-4 text-green-500" />,
  stable: <Minus className="h-4 w-4 text-blue-500" />,
  deteriorating: <TrendingDown className="h-4 w-4 text-red-500" />,
  unknown: <Activity className="h-4 w-4 text-gray-400" />,
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

export default function KeyRiskIndicators() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formCategory, setFormCategory] = useState("operational");
  const [formFrequency, setFormFrequency] = useState("monthly");
  const [formDirection, setFormDirection] = useState("higher_is_worse");

  const { data: kris = [], isLoading } = useQuery<GrcKeyRiskIndicator[]>({
    queryKey: ["/api/grc/kris"],
  });

  const createKriMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/grc/kris", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/kris"] });
      setIsCreateDialogOpen(false);
      toast({ title: "KRI created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create KRI", variant: "destructive" });
    },
  });

  const filteredKris = kris.filter((kri) => {
    const matchesSearch =
      kri.kriName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kri.kriCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || kri.status === statusFilter;
    const matchesAlert = alertFilter === "all" || kri.alertLevel === alertFilter;
    return matchesSearch && matchesStatus && matchesAlert;
  });

  const stats = {
    total: kris.length,
    normal: kris.filter((k) => k.alertLevel === "normal").length,
    warning: kris.filter((k) => k.alertLevel === "warning").length,
    critical: kris.filter((k) => k.alertLevel === "critical").length,
  };

  const handleCreateKri = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createKriMutation.mutate({
      kriName: formData.get("kriName"),
      kriDescription: formData.get("kriDescription"),
      category: formCategory,
      measurementUnit: formData.get("measurementUnit"),
      measurementFrequency: formFrequency,
      greenThreshold: parseInt(formData.get("greenThreshold") as string) || null,
      yellowThreshold: parseInt(formData.get("yellowThreshold") as string) || null,
      redThreshold: parseInt(formData.get("redThreshold") as string) || null,
      thresholdDirection: formDirection,
    });
  };

  return (
    <>
      <Helmet>
        <title>Key Risk Indicators | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Key Risk Indicators</h1>
            <p className="text-muted-foreground">Monitor and track risk metrics</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-kri">
                <Plus className="h-4 w-4 mr-2" />
                New KRI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Key Risk Indicator</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateKri} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kriName">KRI Name</Label>
                  <Input
                    id="kriName"
                    name="kriName"
                    placeholder="Enter KRI name"
                    required
                    data-testid="input-kri-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kriDescription">Description</Label>
                  <Textarea
                    id="kriDescription"
                    name="kriDescription"
                    placeholder="Describe what this KRI measures"
                    required
                    data-testid="input-kri-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="measurementFrequency">Frequency</Label>
                    <Select value={formFrequency} onValueChange={setFormFrequency}>
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="measurementUnit">Unit</Label>
                    <Input
                      id="measurementUnit"
                      name="measurementUnit"
                      placeholder="%, count, $, days"
                      required
                      data-testid="input-unit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thresholdDirection">Direction</Label>
                    <Select value={formDirection} onValueChange={setFormDirection}>
                      <SelectTrigger data-testid="select-direction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="higher_is_worse">Higher is Worse</SelectItem>
                        <SelectItem value="lower_is_worse">Lower is Worse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="greenThreshold">Green Threshold</Label>
                    <Input
                      id="greenThreshold"
                      name="greenThreshold"
                      type="number"
                      placeholder="Normal"
                      data-testid="input-green"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yellowThreshold">Yellow Threshold</Label>
                    <Input
                      id="yellowThreshold"
                      name="yellowThreshold"
                      type="number"
                      placeholder="Warning"
                      data-testid="input-yellow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redThreshold">Red Threshold</Label>
                    <Input
                      id="redThreshold"
                      name="redThreshold"
                      type="number"
                      placeholder="Critical"
                      data-testid="input-red"
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
                    disabled={createKriMutation.isPending}
                    data-testid="button-submit-kri"
                  >
                    Create KRI
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total KRIs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-kris">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Normal</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-normal">{stats.normal}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warning</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-warning">{stats.warning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-critical">{stats.critical}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>KRI Dashboard</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search KRIs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-kris"
                  />
                </div>
                <Select value={alertFilter} onValueChange={setAlertFilter}>
                  <SelectTrigger className="w-32" data-testid="select-alert-filter">
                    <SelectValue placeholder="Alert" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
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
            ) : filteredKris.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No KRIs Found</h3>
                <p className="text-muted-foreground mb-4">
                  {kris.length === 0
                    ? "Start by creating your first Key Risk Indicator"
                    : "No KRIs match your current filters"}
                </p>
                {kris.length === 0 && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create KRI
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KRI Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Current Value</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead>Alert Level</TableHead>
                    <TableHead>Last Measured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKris.map((kri) => (
                    <TableRow
                      key={kri.id}
                      className="cursor-pointer hover-elevate"
                      data-testid={`row-kri-${kri.id}`}
                    >
                      <TableCell className="font-mono text-sm">
                        {kri.kriCode}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {kri.kriName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoryLabels[kri.category] || kri.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {kri.currentValue !== null ? `${kri.currentValue}${kri.measurementUnit}` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {trendIcons[kri.trend as KriTrend] || trendIcons.unknown}
                      </TableCell>
                      <TableCell>
                        <Badge className={alertColors[kri.alertLevel as KriAlertLevel]}>
                          {kri.alertLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {kri.lastMeasuredAt
                          ? format(new Date(kri.lastMeasuredAt), "MMM d, yyyy")
                          : "Never"}
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
