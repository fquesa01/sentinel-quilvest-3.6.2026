import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Target,
  DollarSign,
  Calendar,
  FileText,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { GrcRiskAppetite } from "@shared/schema";

const appetiteLevelColors: Record<string, string> = {
  averse: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  minimal: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  cautious: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  hungry: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
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

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function RiskAppetiteDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<GrcRiskAppetite>>({});

  const { data: appetite, isLoading } = useQuery<GrcRiskAppetite>({
    queryKey: ["/api/grc/risk-appetite", params.id],
    enabled: !!params.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<GrcRiskAppetite>) => {
      return apiRequest("PATCH", `/api/grc/risk-appetite/${params.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risk-appetite"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risk-appetite", params.id] });
      setIsEditing(false);
      toast({ title: "Risk appetite updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update risk appetite", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/grc/risk-appetite/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/risk-appetite"] });
      toast({ title: "Risk appetite deleted successfully" });
      navigate("/risk-management/risk-appetite");
    },
    onError: () => {
      toast({ title: "Failed to delete risk appetite", variant: "destructive" });
    },
  });

  const handleEdit = () => {
    if (appetite) {
      setFormData({ ...appetite });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!appetite) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Risk appetite not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/risk-management/risk-appetite")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Risk Appetite
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{categoryLabels[appetite.category]} Risk Appetite | Sentinel Counsel</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/risk-management/risk-appetite")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{categoryLabels[appetite.category]} Risk Appetite</h1>
                <Badge className={appetiteLevelColors[appetite.appetiteLevel]}>
                  {appetite.appetiteLevel}
                </Badge>
              </div>
              <p className="text-muted-foreground">Board-approved risk appetite framework</p>
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
                  Edit Appetite
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
                      <AlertDialogTitle>Delete Risk Appetite</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this risk appetite definition? This action cannot be undone.
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Appetite Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
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
                      <div className="space-y-2">
                        <Label>Appetite Level</Label>
                        <Select
                          value={formData.appetiteLevel || "cautious"}
                          onValueChange={(v) => setFormData({ ...formData, appetiteLevel: v as any })}
                        >
                          <SelectTrigger data-testid="select-appetite-level">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="averse">Averse</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="cautious">Cautious</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="hungry">Hungry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Appetite Statement</Label>
                      <Textarea
                        value={formData.appetiteStatement || ""}
                        onChange={(e) => setFormData({ ...formData, appetiteStatement: e.target.value })}
                        rows={4}
                        placeholder="Board-approved risk appetite statement..."
                        data-testid="textarea-statement"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {appetite.appetiteStatement}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Tolerance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Minimum Tolerance (Risk Score)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={25}
                          value={formData.toleranceMin || ""}
                          onChange={(e) => setFormData({ ...formData, toleranceMin: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="1-25"
                          data-testid="input-tolerance-min"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum Tolerance (Risk Score)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={25}
                          value={formData.toleranceMax || ""}
                          onChange={(e) => setFormData({ ...formData, toleranceMax: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="1-25"
                          data-testid="input-tolerance-max"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tolerance Description</Label>
                      <Textarea
                        value={formData.toleranceDescription || ""}
                        onChange={(e) => setFormData({ ...formData, toleranceDescription: e.target.value })}
                        rows={3}
                        placeholder="Describe acceptable risk tolerance..."
                        data-testid="textarea-tolerance-desc"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Minimum Tolerance</p>
                        <p className="text-2xl font-bold">{appetite.toleranceMin ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Maximum Tolerance</p>
                        <p className="text-2xl font-bold">{appetite.toleranceMax ?? "-"}</p>
                      </div>
                    </div>
                    {appetite.toleranceDescription && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Description</p>
                          <p className="text-muted-foreground">{appetite.toleranceDescription}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Quantitative Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Max Acceptable Loss Per Incident ($)</Label>
                      <Input
                        type="number"
                        value={formData.maxAcceptableLoss || ""}
                        onChange={(e) => setFormData({ ...formData, maxAcceptableLoss: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Maximum single-incident loss"
                        data-testid="input-max-loss"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Annual Loss ($)</Label>
                      <Input
                        type="number"
                        value={formData.maxAnnualLoss || ""}
                        onChange={(e) => setFormData({ ...formData, maxAnnualLoss: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Maximum annual loss"
                        data-testid="input-max-annual"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Risk Exposure ($)</Label>
                      <Input
                        type="number"
                        value={formData.maxRiskExposure || ""}
                        onChange={(e) => setFormData({ ...formData, maxRiskExposure: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Total risk exposure limit"
                        data-testid="input-max-exposure"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Loss Per Incident</span>
                      <span className="font-medium">{formatCurrency(appetite.maxAcceptableLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Annual Loss</span>
                      <span className="font-medium">{formatCurrency(appetite.maxAnnualLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Risk Exposure</span>
                      <span className="font-medium">{formatCurrency(appetite.maxRiskExposure)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {appetite.effectiveDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Effective</span>
                    <span className="font-medium">
                      {format(new Date(appetite.effectiveDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {appetite.approvedDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved</span>
                    <span className="font-medium">
                      {format(new Date(appetite.approvedDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {appetite.reviewDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Review</span>
                    <span className="font-medium">
                      {format(new Date(appetite.reviewDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {format(new Date(appetite.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">
                    {format(new Date(appetite.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appetite Level Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={appetiteLevelColors.averse}>Averse</Badge>
                  <span className="text-sm text-muted-foreground">Avoid risk entirely</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={appetiteLevelColors.minimal}>Minimal</Badge>
                  <span className="text-sm text-muted-foreground">Only essential risks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={appetiteLevelColors.cautious}>Cautious</Badge>
                  <span className="text-sm text-muted-foreground">Safe, low-risk options</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={appetiteLevelColors.open}>Open</Badge>
                  <span className="text-sm text-muted-foreground">Balanced approach</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={appetiteLevelColors.hungry}>Hungry</Badge>
                  <span className="text-sm text-muted-foreground">Eager to take risks</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
