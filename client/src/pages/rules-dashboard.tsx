import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, AlertTriangle, CheckCircle, Settings, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";

interface Rule {
  id: string;
  ruleName: string;
  ruleDescription: string;
  violationType: string;
  severity: "critical" | "high" | "medium" | "low";
  riskScore: number;
  isCustom: boolean;
  isActive: boolean;
  keywords: string[];
  conditionGroups: any;
  numericThresholds: any;
  ruleVersion: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function RulesDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCustom, setFilterCustom] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterViolation, setFilterViolation] = useState<string>("all");
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("POST", `/api/rules/${id}/toggle`, {
        isActive,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Rule Updated",
        description: "Rule activation status changed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rule",
        variant: "destructive",
      });
    },
  });

  const seedFcpaTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-fcpa-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "FCPA Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} FCPA template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed FCPA templates",
        variant: "destructive",
      });
    },
  });

  const seedAntitrustTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-antitrust-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Antitrust Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} Federal Antitrust template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed antitrust templates",
        variant: "destructive",
      });
    },
  });

  const seedSoxTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-sox-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "SOX Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} SOX (Sarbanes-Oxley) template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed SOX templates",
        variant: "destructive",
      });
    },
  });

  const seedCtaTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-cta-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "CTA Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} CTA (Corporate Transparency Act) template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed CTA templates",
        variant: "destructive",
      });
    },
  });

  const seedEarItarTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-ear-itar-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "EAR/ITAR Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} Export Controls template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed EAR/ITAR templates",
        variant: "destructive",
      });
    },
  });

  const seedFarDfarsTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-far-dfars-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "FAR/DFARS Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} Government Contracting template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed FAR/DFARS templates",
        variant: "destructive",
      });
    },
  });

  const seedDoddFrankTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-dodd-frank-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Dodd-Frank Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} Financial Integrity template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed Dodd-Frank templates",
        variant: "destructive",
      });
    },
  });

  const seedGlbaTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-glba-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "GLBA Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} Data Privacy template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed GLBA templates",
        variant: "destructive",
      });
    },
  });

  const seedOfacTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-ofac-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "OFAC Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} Sanctions Screening template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed OFAC templates",
        variant: "destructive",
      });
    },
  });

  const seedPatriotActTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-patriot-act-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "PATRIOT Act Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} KYC & AML template detection rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed PATRIOT Act templates",
        variant: "destructive",
      });
    },
  });

  const seedBsaAmlTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rules/seed-bsa-aml-templates", {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "BSA/AML Templates Seeded",
        description: `Successfully added ${data.rules?.length || 0} Money Laundering Detection template rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed BSA/AML templates",
        variant: "destructive",
      });
    },
  });

  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      rule.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.ruleDescription?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustom =
      filterCustom === "all" ||
      (filterCustom === "custom" && rule.isCustom === true) ||
      (filterCustom === "builtin" && rule.isCustom === false);
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && rule.isActive === true) ||
      (filterActive === "inactive" && rule.isActive === false);
    const matchesSeverity =
      filterSeverity === "all" || rule.severity === filterSeverity;
    const matchesViolation =
      filterViolation === "all" || rule.violationType === filterViolation;

    return (
      matchesSearch &&
      matchesCustom &&
      matchesActive &&
      matchesSeverity &&
      matchesViolation
    );
  });

  const stats = {
    total: rules.length,
    active: rules.filter((r) => r.isActive === true).length,
    custom: rules.filter((r) => r.isCustom === true).length,
    highRisk: rules.filter(
      (r) => r.severity === "critical" || r.severity === "high"
    ).length,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "high":
        return "text-orange-600 dark:text-orange-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      case "low":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
                Investigation Logic
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                data-testid="button-toggle-header"
                className="h-8 w-8"
              >
                {isHeaderCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!isHeaderCollapsed && (
              <p className="text-sm text-muted-foreground mt-1">
                Build and manage custom detection rules for compliance monitoring. Test, implement, modify, deploy and remove rules and inquiries based corporate practices, policies, laws, investigations and regulations. Prior to deployment, test whether a rule will identify what you are looking for or whether it will generate miss-hits.
              </p>
            )}
          </div>
        </div>
        
        {/* Template Loading Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => seedFcpaTemplatesMutation.mutate()}
            disabled={seedFcpaTemplatesMutation.isPending}
            data-testid="button-seed-fcpa-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedFcpaTemplatesMutation.isPending ? "Seeding..." : "Load FCPA"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedAntitrustTemplatesMutation.mutate()}
            disabled={seedAntitrustTemplatesMutation.isPending}
            data-testid="button-seed-antitrust-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedAntitrustTemplatesMutation.isPending ? "Seeding..." : "Load Antitrust"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedSoxTemplatesMutation.mutate()}
            disabled={seedSoxTemplatesMutation.isPending}
            data-testid="button-seed-sox-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedSoxTemplatesMutation.isPending ? "Seeding..." : "Load SOX"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedCtaTemplatesMutation.mutate()}
            disabled={seedCtaTemplatesMutation.isPending}
            data-testid="button-seed-cta-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedCtaTemplatesMutation.isPending ? "Seeding..." : "Load CTA"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedEarItarTemplatesMutation.mutate()}
            disabled={seedEarItarTemplatesMutation.isPending}
            data-testid="button-seed-ear-itar-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedEarItarTemplatesMutation.isPending ? "Seeding..." : "Load EAR/ITAR"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedFarDfarsTemplatesMutation.mutate()}
            disabled={seedFarDfarsTemplatesMutation.isPending}
            data-testid="button-seed-far-dfars-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedFarDfarsTemplatesMutation.isPending ? "Seeding..." : "Load FAR/DFARS"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedDoddFrankTemplatesMutation.mutate()}
            disabled={seedDoddFrankTemplatesMutation.isPending}
            data-testid="button-seed-dodd-frank-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedDoddFrankTemplatesMutation.isPending ? "Seeding..." : "Load Dodd-Frank"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedGlbaTemplatesMutation.mutate()}
            disabled={seedGlbaTemplatesMutation.isPending}
            data-testid="button-seed-glba-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedGlbaTemplatesMutation.isPending ? "Seeding..." : "Load GLBA"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedOfacTemplatesMutation.mutate()}
            disabled={seedOfacTemplatesMutation.isPending}
            data-testid="button-seed-ofac-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedOfacTemplatesMutation.isPending ? "Seeding..." : "Load OFAC"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedPatriotActTemplatesMutation.mutate()}
            disabled={seedPatriotActTemplatesMutation.isPending}
            data-testid="button-seed-patriot-act-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedPatriotActTemplatesMutation.isPending ? "Seeding..." : "Load PATRIOT Act"}
          </Button>
          <Button
            variant="outline"
            onClick={() => seedBsaAmlTemplatesMutation.mutate()}
            disabled={seedBsaAmlTemplatesMutation.isPending}
            data-testid="button-seed-bsa-aml-templates"
          >
            <Settings className="mr-2 h-4 w-4" />
            {seedBsaAmlTemplatesMutation.isPending ? "Seeding..." : "Load BSA/AML"}
          </Button>
          <Button
            onClick={() => navigate("/rules/builder")}
            data-testid="button-create-rule"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {!isHeaderCollapsed && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Rules</h3>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-rules">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Active Rules</h3>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-rules">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.active / stats.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Custom Rules</h3>
            <Plus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-custom-rules">{stats.custom}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">High Risk</h3>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-highrisk-rules">{stats.highRisk}</div>
            <p className="text-xs text-muted-foreground">Critical & High severity</p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-rules"
              />
            </div>

            <Select value={filterCustom} onValueChange={setFilterCustom}>
              <SelectTrigger data-testid="select-filter-custom">
                <SelectValue placeholder="Rule Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-custom-all">All Types</SelectItem>
                <SelectItem value="custom" data-testid="option-custom-custom">Custom</SelectItem>
                <SelectItem value="builtin" data-testid="option-custom-builtin">Built-in</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger data-testid="select-filter-active">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-active-all">All Status</SelectItem>
                <SelectItem value="active" data-testid="option-active-active">Active</SelectItem>
                <SelectItem value="inactive" data-testid="option-active-inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger data-testid="select-filter-severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-severity-all">All Severity</SelectItem>
                <SelectItem value="critical" data-testid="option-severity-critical">Critical</SelectItem>
                <SelectItem value="high" data-testid="option-severity-high">High</SelectItem>
                <SelectItem value="medium" data-testid="option-severity-medium">Medium</SelectItem>
                <SelectItem value="low" data-testid="option-severity-low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterViolation} onValueChange={setFilterViolation}>
              <SelectTrigger data-testid="select-filter-violation">
                <SelectValue placeholder="Violation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-violation-all">All Violations</SelectItem>
                <SelectItem value="fcpa" data-testid="option-violation-fcpa">FCPA</SelectItem>
                <SelectItem value="banking" data-testid="option-violation-banking">Banking</SelectItem>
                <SelectItem value="antitrust" data-testid="option-violation-antitrust">Antitrust</SelectItem>
                <SelectItem value="sec" data-testid="option-violation-sec">SEC</SelectItem>
                <SelectItem value="sox" data-testid="option-violation-sox">SOX</SelectItem>
                <SelectItem value="other" data-testid="option-violation-other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Detection Rules</h2>
            <div className="text-sm text-muted-foreground">
              {filteredRules.length} of {rules.length} rules
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Violation</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No rules found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRules.map((rule) => (
                    <TableRow 
                      key={rule.id} 
                      data-testid={`row-rule-${rule.id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedRule(rule)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-rule-name-${rule.id}`}>{rule.ruleName}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1" data-testid={`text-rule-description-${rule.id}`}>
                            {rule.ruleDescription}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {rule.isCustom === true ? (
                          <Badge variant="outline" data-testid={`badge-custom-${rule.id}`}>
                            Custom
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-builtin-${rule.id}`}>
                            Built-in
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-sm" data-testid={`text-violation-type-${rule.id}`}>
                          {rule.violationType.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium capitalize ${getSeverityColor(
                            rule.severity
                          )}`}
                          data-testid={`text-severity-${rule.id}`}
                        >
                          {rule.severity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.riskScore >= 70 ? "destructive" : "secondary"}
                          data-testid={`badge-risk-score-${rule.id}`}
                        >
                          {rule.riskScore}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" data-testid={`text-version-${rule.id}`}>
                          v{rule.ruleVersion || 1}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={rule.isActive === true}
                          onCheckedChange={(checked) =>
                            toggleRuleMutation.mutate({
                              id: rule.id,
                              isActive: checked,
                            })
                          }
                          disabled={toggleRuleMutation.isPending}
                          data-testid={`switch-toggle-${rule.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rule Details Dialog */}
      <Dialog open={selectedRule !== null} onOpenChange={() => setSelectedRule(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-rule-details">
          {selectedRule && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-xl" data-testid="text-dialog-rule-name">
                      {selectedRule.ruleName}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {selectedRule.isCustom ? (
                        <Badge variant="outline">Custom</Badge>
                      ) : (
                        <Badge variant="secondary">Built-in</Badge>
                      )}
                      <Badge
                        variant={selectedRule.isActive ? "default" : "secondary"}
                        data-testid="badge-dialog-rule-status"
                      >
                        {selectedRule.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className={`font-medium capitalize text-sm ${getSeverityColor(selectedRule.severity)}`}>
                        {selectedRule.severity}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={selectedRule.riskScore >= 70 ? "destructive" : "secondary"}
                    className="text-lg px-3 py-1"
                  >
                    Risk: {selectedRule.riskScore}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Full Description */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
                  <p className="text-sm leading-relaxed" data-testid="text-dialog-full-description">
                    {selectedRule.ruleDescription}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Violation Type</h3>
                    <p className="text-sm capitalize">{selectedRule.violationType.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Version</h3>
                    <p className="text-sm">v{selectedRule.ruleVersion || 1}</p>
                  </div>
                </div>

                {/* Keywords */}
                {selectedRule.keywords && selectedRule.keywords.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Detection Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRule.keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Condition Groups */}
                {selectedRule.conditionGroups && Array.isArray(selectedRule.conditionGroups) && selectedRule.conditionGroups.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Conditions</h3>
                    <div className="space-y-2">
                      {selectedRule.conditionGroups.map((group: any, groupIndex: number) => (
                        <div key={groupIndex} className="border rounded-md p-3 bg-muted/30">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Group {groupIndex + 1} ({group.operator || "AND"})
                          </div>
                          <div className="space-y-1">
                            {group.conditions?.map((condition: any, condIndex: number) => (
                              <div key={condIndex} className="text-sm flex items-center gap-2">
                                <span className="font-medium">{condition.field}</span>
                                <span className="text-muted-foreground">{condition.operator}</span>
                                <span>{condition.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Numeric Thresholds */}
                {selectedRule.numericThresholds && Array.isArray(selectedRule.numericThresholds) && selectedRule.numericThresholds.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Numeric Thresholds</h3>
                    <div className="space-y-1">
                      {selectedRule.numericThresholds.map((threshold: any, index: number) => (
                        <div key={index} className="text-sm flex items-center gap-2 border-l-2 border-primary pl-3 py-1">
                          <span className="font-medium capitalize">{threshold.field}</span>
                          <span className="text-muted-foreground">{threshold.operator}</span>
                          <span className="font-semibold">{threshold.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {new Date(selectedRule.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>{" "}
                    {new Date(selectedRule.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
