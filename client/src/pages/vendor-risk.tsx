import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Plus,
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface Vendor {
  id: string;
  vendorName: string;
  vendorNumber: string;
  tier: string;
  status: string;
  country: string;
  industry?: string;
  overallRiskScore: number;
  lastRiskAssessmentDate?: Date;
  annualSpend?: number;
}

interface VendorRiskAlert {
  id: string;
  vendorId: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  triggeredAt: Date;
  status: string;
  previousRiskScore?: number;
  currentRiskScore?: number;
  riskScoreChange?: number;
}

interface DashboardMetrics {
  vendors: {
    total: number;
    active: number;
    critical: number;
    highRisk: number;
    byTier: {
      critical: number;
      strategic: number;
      tactical: number;
      low_risk: number;
    };
  };
  assessments: {
    total: number;
    recent: number;
  };
  alerts: {
    total: number;
    open: number;
    critical: number;
  };
  onboarding: {
    active: number;
  };
}

const vendorFormSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  legalName: z.string().min(1, "Legal name is required"),
  tier: z.enum(["critical", "strategic", "tactical", "low_risk"]),
  country: z.string().min(1, "Country is required"),
  industry: z.string().optional(),
  businessDescription: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  primaryContactPhone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

export default function VendorRiskPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addVendorOpen, setAddVendorOpen] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/vendors/dashboard/metrics"],
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: tierFilter !== "all" ? ["/api/vendors", { tier: tierFilter }] : ["/api/vendors"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tierFilter !== "all") {
        params.append("tier", tierFilter);
      }
      const url = tierFilter !== "all" ? `/api/vendors?${params}` : "/api/vendors";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<VendorRiskAlert[]>({
    queryKey: ["/api/vendor-risk-alerts"],
  });

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      vendorName: "",
      legalName: "",
      tier: "tactical",
      country: "",
      industry: "",
      businessDescription: "",
      primaryContactName: "",
      primaryContactEmail: "",
      primaryContactPhone: "",
      website: "",
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      return apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: async () => {
      setTierFilter("all");
      setStatusFilter("all");
      setSearchQuery("");
      setSelectedTab("vendors");
      setAddVendorOpen(false);
      form.reset();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/vendors"
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/vendors/dashboard/metrics"] });
      
      toast({
        title: "Success",
        description: "Vendor added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: VendorFormValues) => {
    createVendorMutation.mutate(data);
  };

  const filteredVendors = vendors?.filter((vendor) => {
    const matchesSearch = vendor.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.vendorNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getRiskBadgeVariant = (score: number) => {
    if (score >= 70) return "destructive";
    if (score >= 50) return "default";
    return "secondary";
  };

  const getTierBadgeVariant = (tier: string) => {
    if (tier === "critical") return "destructive";
    if (tier === "strategic") return "default";
    return "secondary";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "pending_onboarding":
      case "onboarding_in_progress":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "suspended":
      case "terminated":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-vendor-risk">
              Vendor Risk Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage third-party vendor risks across 58 assessment categories
            </p>
          </div>
          <Dialog open={addVendorOpen} onOpenChange={setAddVendorOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-vendor">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
                <DialogDescription>
                  Enter vendor information to begin the onboarding process
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-vendor-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="legalName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-legal-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Tier</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tier">
                                <SelectValue placeholder="Select tier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="strategic">Strategic</SelectItem>
                              <SelectItem value="tactical">Tactical</SelectItem>
                              <SelectItem value="low_risk">Low Risk</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-industry" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-business-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primaryContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input type="url" {...field} data-testid="input-website" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddVendorOpen(false)}
                      data-testid="button-cancel-vendor"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createVendorMutation.isPending}
                      data-testid="button-submit-vendor"
                    >
                      {createVendorMutation.isPending ? "Adding..." : "Add Vendor"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-vendors">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-vendors">
                {metricsLoading ? "..." : metrics?.vendors.total || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.vendors.active || 0} active
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-high-risk-vendors">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Vendors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-high-risk-vendors">
                {metricsLoading ? "..." : metrics?.vendors.highRisk || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Risk score ≥ 70
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-open-alerts">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-open-alerts">
                {metricsLoading ? "..." : metrics?.alerts.open || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.alerts.critical || 0} critical
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-active-onboarding">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Onboarding</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-onboarding">
                {metricsLoading ? "..." : metrics?.onboarding.active || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In progress
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList data-testid="tabs-vendor-sections">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="vendors" data-testid="tab-vendors">Vendors</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Vendors by Tier</CardTitle>
                  <CardDescription>Distribution across risk tiers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                    <span className="font-medium" data-testid="text-critical-tier-count">
                      {metrics?.vendors.byTier.critical || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Strategic</Badge>
                    </div>
                    <span className="font-medium" data-testid="text-strategic-tier-count">
                      {metrics?.vendors.byTier.strategic || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Tactical</Badge>
                    </div>
                    <span className="font-medium" data-testid="text-tactical-tier-count">
                      {metrics?.vendors.byTier.tactical || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Low Risk</Badge>
                    </div>
                    <span className="font-medium" data-testid="text-low-risk-tier-count">
                      {metrics?.vendors.byTier.low_risk || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">New Assessments</span>
                    <span className="font-medium" data-testid="text-recent-assessments">
                      {metrics?.assessments.recent || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Assessments</span>
                    <span className="font-medium" data-testid="text-total-assessments">
                      {metrics?.assessments.total || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Alerts</span>
                    <span className="font-medium" data-testid="text-total-alerts">
                      {metrics?.alerts.total || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="flex-1">
                    <CardTitle>Vendor Directory</CardTitle>
                    <CardDescription>All registered vendors</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search vendors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                        data-testid="input-search-vendors"
                      />
                    </div>
                    <Select value={tierFilter} onValueChange={setTierFilter}>
                      <SelectTrigger className="w-full sm:w-36" data-testid="select-tier-filter">
                        <SelectValue placeholder="Filter by tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="strategic">Strategic</SelectItem>
                        <SelectItem value="tactical">Tactical</SelectItem>
                        <SelectItem value="low_risk">Low Risk</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-36" data-testid="select-status-filter">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending_onboarding">Pending</SelectItem>
                        <SelectItem value="onboarding_in_progress">Onboarding</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {vendorsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading vendors...</div>
                ) : filteredVendors && filteredVendors.length > 0 ? (
                  <div className="space-y-3">
                    {filteredVendors.map((vendor) => (
                      <Card key={vendor.id} className="hover-elevate" data-testid={`card-vendor-${vendor.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusIcon(vendor.status)}
                                <h4 className="font-semibold truncate" data-testid={`text-vendor-name-${vendor.id}`}>
                                  {vendor.vendorName}
                                </h4>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2" data-testid={`text-vendor-number-${vendor.id}`}>
                                {vendor.vendorNumber} • {vendor.country}
                                {vendor.industry && ` • ${vendor.industry}`}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant={getTierBadgeVariant(vendor.tier)} data-testid={`badge-tier-${vendor.id}`}>
                                  {vendor.tier.replace(/_/g, " ").toUpperCase()}
                                </Badge>
                                <Badge variant="outline" data-testid={`badge-status-${vendor.id}`}>
                                  {vendor.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-muted-foreground">Risk Score:</span>
                                <Badge variant={getRiskBadgeVariant(vendor.overallRiskScore)} data-testid={`badge-risk-score-${vendor.id}`}>
                                  {vendor.overallRiskScore}
                                </Badge>
                              </div>
                              {vendor.lastRiskAssessmentDate && (
                                <p className="text-xs text-muted-foreground">
                                  Assessed {format(new Date(vendor.lastRiskAssessmentDate), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No vendors found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Risk Alerts</CardTitle>
                <CardDescription>Active and recent risk alerts</CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
                ) : alerts && alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <Card key={alert.id} className="hover-elevate" data-testid={`card-alert-${alert.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className={`h-4 w-4 ${
                                  alert.severity === "critical" ? "text-destructive" :
                                  alert.severity === "high" ? "text-orange-600" :
                                  alert.severity === "medium" ? "text-yellow-600" :
                                  "text-muted-foreground"
                                }`} />
                                <h4 className="font-semibold" data-testid={`text-alert-title-${alert.id}`}>
                                  {alert.title}
                                </h4>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2" data-testid={`text-alert-description-${alert.id}`}>
                                {alert.description}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    alert.severity === "critical" ? "destructive" :
                                    alert.severity === "high" ? "default" :
                                    "secondary"
                                  }
                                  data-testid={`badge-alert-severity-${alert.id}`}
                                >
                                  {alert.severity}
                                </Badge>
                                <Badge variant="outline" data-testid={`badge-alert-status-${alert.id}`}>
                                  {alert.status}
                                </Badge>
                                {alert.riskScoreChange !== undefined && alert.riskScoreChange > 0 && (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    +{alert.riskScoreChange} points
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              {format(new Date(alert.triggeredAt), "MMM d, yyyy")}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No alerts found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
