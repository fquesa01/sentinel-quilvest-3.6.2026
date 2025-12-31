import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Settings,
  Clock
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import type { GrcKeyRiskIndicator, GrcKriMeasurement } from "@shared/schema";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

const alertColors: Record<string, string> = {
  normal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const trendIcons: Record<string, typeof TrendingUp> = {
  improving: TrendingUp,
  stable: Minus,
  deteriorating: TrendingDown,
  unknown: Activity,
};

const categoryLabels: Record<string, string> = {
  financial: "Financial",
  operational: "Operational",
  compliance: "Compliance",
  strategic: "Strategic",
  reputational: "Reputational",
  technology: "Technology",
  legal: "Legal",
  environmental: "Environmental",
};

export default function KriDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<GrcKeyRiskIndicator>>({});
  const [newMeasurement, setNewMeasurement] = useState<number | "">("");

  const { data: kri, isLoading } = useQuery<GrcKeyRiskIndicator>({
    queryKey: ["/api/grc/kris", params.id],
    enabled: !!params.id,
  });

  const { data: measurements = [] } = useQuery<GrcKriMeasurement[]>({
    queryKey: ["/api/grc/kris", params.id, "measurements"],
    enabled: !!params.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<GrcKeyRiskIndicator>) => {
      return apiRequest("PATCH", `/api/grc/kris/${params.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/kris"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/kris", params.id] });
      setIsEditing(false);
      toast({ title: "KRI updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update KRI", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/grc/kris/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/kris"] });
      toast({ title: "KRI deleted successfully" });
      navigate("/risk-management/kris");
    },
    onError: () => {
      toast({ title: "Failed to delete KRI", variant: "destructive" });
    },
  });

  const addMeasurementMutation = useMutation({
    mutationFn: async (value: number) => {
      return apiRequest("POST", `/api/grc/kris/${params.id}/measurements`, {
        value,
        measuredAt: new Date().toISOString(),
        notes: "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/kris", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/kris", params.id, "measurements"] });
      setNewMeasurement("");
      toast({ title: "Measurement recorded" });
    },
    onError: () => {
      toast({ title: "Failed to record measurement", variant: "destructive" });
    },
  });

  const handleEdit = () => {
    if (kri) {
      setFormData({ ...kri });
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

  const handleAddMeasurement = () => {
    if (newMeasurement !== "" && typeof newMeasurement === "number") {
      addMeasurementMutation.mutate(newMeasurement);
    }
  };

  const TrendIcon = kri ? trendIcons[kri.trend || "unknown"] : Activity;

  const chartData = measurements
    .slice()
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .map((m) => ({
      date: format(new Date(m.measuredAt), "MMM d"),
      value: m.value,
      fullDate: format(new Date(m.measuredAt), "MMM d, yyyy HH:mm"),
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!kri) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">KRI not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/risk-management/kris")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to KRIs
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{kri.kriCode} | Key Risk Indicators | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/risk-management/kris")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{kri.kriCode}</h1>
                <Badge className={statusColors[kri.status]}>
                  {kri.status.replace("_", " ")}
                </Badge>
                <Badge className={alertColors[kri.alertLevel || "normal"]}>
                  {kri.alertLevel || "normal"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{kri.kriName}</p>
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
                  Edit KRI
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
                      <AlertDialogTitle>Delete KRI</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this KRI? This will also delete all historical measurements.
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
                <p className="text-sm text-muted-foreground">Current Value</p>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold mt-2">
                {kri.currentValue ?? "-"} {kri.measurementUnit}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Trend</p>
                <TrendIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold mt-2 capitalize">
                {kri.trend || "Unknown"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Measurements</p>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold mt-2">{measurements.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Category</p>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold mt-2">{categoryLabels[kri.category] || kri.category}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Trend Chart
                </CardTitle>
                <CardDescription>Historical measurements over time</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-popover border rounded-md shadow-md p-3">
                                  <p className="text-sm font-medium">{payload[0].payload.fullDate}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Value: <span className="font-medium">{payload[0].value} {kri.measurementUnit}</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {kri.greenThreshold && (
                          <ReferenceLine y={kri.greenThreshold} stroke="green" strokeDasharray="5 5" label="Green" />
                        )}
                        {kri.yellowThreshold && (
                          <ReferenceLine y={kri.yellowThreshold} stroke="orange" strokeDasharray="5 5" label="Yellow" />
                        )}
                        {kri.redThreshold && (
                          <ReferenceLine y={kri.redThreshold} stroke="red" strokeDasharray="5 5" label="Red" />
                        )}
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No measurements recorded yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  KRI Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>KRI Name</Label>
                        <Input
                          value={formData.kriName || ""}
                          onChange={(e) => setFormData({ ...formData, kriName: e.target.value })}
                          data-testid="input-kri-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={formData.category || "operational"}
                          onValueChange={(v) => setFormData({ ...formData, category: v as any })}
                        >
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
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.kriDescription || ""}
                        onChange={(e) => setFormData({ ...formData, kriDescription: e.target.value })}
                        rows={3}
                        data-testid="textarea-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status || "active"}
                          onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                        >
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Measurement Unit</Label>
                        <Input
                          value={formData.measurementUnit || ""}
                          onChange={(e) => setFormData({ ...formData, measurementUnit: e.target.value })}
                          placeholder="%, count, $, days"
                          data-testid="input-unit"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Data Source</Label>
                      <Input
                        value={formData.dataSource || ""}
                        onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                        placeholder="Where does this data come from?"
                        data-testid="input-data-source"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Calculation Method</Label>
                      <Textarea
                        value={formData.calculationMethod || ""}
                        onChange={(e) => setFormData({ ...formData, calculationMethod: e.target.value })}
                        rows={2}
                        placeholder="How is this KRI calculated?"
                        data-testid="textarea-calculation"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{kri.kriDescription}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Measurement Frequency</p>
                        <p className="font-medium capitalize">{kri.measurementFrequency}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Measurement Unit</p>
                        <p className="font-medium">{kri.measurementUnit}</p>
                      </div>
                      {kri.dataSource && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Data Source</p>
                          <p className="font-medium">{kri.dataSource}</p>
                        </div>
                      )}
                      {kri.calculationMethod && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Calculation Method</p>
                          <p className="font-medium">{kri.calculationMethod}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Record Measurement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>New Value ({kri.measurementUnit})</Label>
                  <Input
                    type="number"
                    value={newMeasurement}
                    onChange={(e) => setNewMeasurement(e.target.value ? parseFloat(e.target.value) : "")}
                    placeholder="Enter value"
                    data-testid="input-new-measurement"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddMeasurement}
                  disabled={newMeasurement === "" || addMeasurementMutation.isPending}
                  data-testid="button-add-measurement"
                >
                  Record Measurement
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Green Threshold
                      </Label>
                      <Input
                        type="number"
                        value={formData.greenThreshold || ""}
                        onChange={(e) => setFormData({ ...formData, greenThreshold: e.target.value ? parseInt(e.target.value) : null })}
                        data-testid="input-green-threshold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        Yellow Threshold
                      </Label>
                      <Input
                        type="number"
                        value={formData.yellowThreshold || ""}
                        onChange={(e) => setFormData({ ...formData, yellowThreshold: e.target.value ? parseInt(e.target.value) : null })}
                        data-testid="input-yellow-threshold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Red Threshold
                      </Label>
                      <Input
                        type="number"
                        value={formData.redThreshold || ""}
                        onChange={(e) => setFormData({ ...formData, redThreshold: e.target.value ? parseInt(e.target.value) : null })}
                        data-testid="input-red-threshold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Threshold Direction</Label>
                      <Select
                        value={formData.thresholdDirection || "higher_is_worse"}
                        onValueChange={(v) => setFormData({ ...formData, thresholdDirection: v })}
                      >
                        <SelectTrigger data-testid="select-direction">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          <SelectItem value="higher_is_worse">Higher is Worse</SelectItem>
                          <SelectItem value="lower_is_worse">Lower is Worse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">Green</span>
                      </div>
                      <span className="font-medium">{kri.greenThreshold ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-muted-foreground">Yellow</span>
                      </div>
                      <span className="font-medium">{kri.yellowThreshold ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-muted-foreground">Red</span>
                      </div>
                      <span className="font-medium">{kri.redThreshold ?? "-"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Direction</span>
                      <span className="font-medium capitalize">
                        {kri.thresholdDirection?.replace("_", " ") || "Higher is worse"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {format(new Date(kri.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">
                    {format(new Date(kri.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
                {kri.lastMeasuredAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Measured</span>
                    <span className="font-medium">
                      {format(new Date(kri.lastMeasuredAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
