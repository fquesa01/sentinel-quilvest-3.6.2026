import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";

const claimStatusLabels: Record<string, string> = {
  filed: "Filed",
  acknowledged: "Acknowledged",
  investigating: "Investigating",
  negotiating: "Negotiating",
  litigating: "Litigating",
  resolved: "Resolved",
  closed: "Closed",
};

const claimTypeLabels: Record<string, string> = {
  lien_priority: "Lien Priority",
  boundary_dispute: "Boundary Dispute",
  easement_encroachment: "Easement/Encroachment",
  forgery_fraud: "Forgery/Fraud",
  missing_heir: "Missing Heir",
  mechanics_lien: "Mechanics Lien",
  tax_lien: "Tax Lien",
  judgment_lien: "Judgment Lien",
  survey_defect: "Survey Defect",
  recording_error: "Recording Error",
};

const commitmentStatusLabels: Record<string, string> = {
  ordered: "Ordered",
  received: "Received",
  under_review: "Under Review",
  approved: "Approved",
  issued: "Issued",
  final: "Final",
  cancelled: "Cancelled",
};

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(195, 74%, 51%)",
  "hsl(339, 82%, 52%)",
  "hsl(142, 64%, 35%)",
  "hsl(25, 95%, 53%)",
  "hsl(210, 40%, 50%)",
];

const severityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

interface DashboardData {
  metrics: {
    activePolicies: number;
    premiumVolumeYTD: number;
    openClaims: number;
    lossRatio: number;
    totalClaims: number;
    totalCommitments: number;
  };
  pipelineCounts: Record<string, number>;
  claimsByStatus: Record<string, number>;
  claimsByType: Record<string, number>;
  exceptionsByStatus: Record<string, number>;
  premiumByUnderwriter: Record<string, number>;
  monthlyPolicyVolume: Record<string, number>;
  recentClaims: Array<{
    id: string;
    claimNumber: string | null;
    claimType: string | null;
    status: string;
    claimAmount: string | null;
    claimantName: string | null;
    filedDate: string | null;
    createdAt: string;
  }>;
  exceptionClearanceRate: number;
  complianceAlerts: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
}

export function TitleUnderwriterDashboard() {
  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/title/dashboard"],
  });

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { metrics, pipelineCounts, claimsByType, premiumByUnderwriter, monthlyPolicyVolume, recentClaims, exceptionClearanceRate, complianceAlerts, exceptionsByStatus } = dashboard;

  const policyVolumeData = Object.entries(monthlyPolicyVolume)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const claimTypeData = Object.entries(claimsByType).map(([type, count]) => ({
    name: claimTypeLabels[type] || type,
    value: count,
  }));

  const exceptionBarData = Object.entries(exceptionsByStatus).map(([status, count]) => ({
    name: status === "partially_cleared" ? "Partial" : status.charAt(0).toUpperCase() + status.slice(1),
    count,
  }));

  const premiumBarData = Object.entries(premiumByUnderwriter)
    .sort(([, a], [, b]) => b - a)
    .map(([name, premium]) => ({
      name: name.length > 20 ? name.slice(0, 18) + "..." : name,
      premium,
    }));

  const pipelineStages = ["ordered", "received", "under_review", "approved", "issued", "final", "cancelled"];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Underwriter Dashboard</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Active Policies</span>
            </div>
            <span className="text-2xl font-bold" data-testid="text-active-policies">
              {metrics.activePolicies}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Premium Volume YTD</span>
            </div>
            <span className="text-2xl font-bold" data-testid="text-premium-volume">
              ${metrics.premiumVolumeYTD.toLocaleString()}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Open Claims</span>
            </div>
            <span className="text-2xl font-bold" data-testid="text-open-claims">
              {metrics.openClaims}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loss Ratio</span>
            </div>
            <span className="text-2xl font-bold" data-testid="text-loss-ratio">
              {metrics.lossRatio}%
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Transaction Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto">
            {pipelineStages.map((stage, idx) => (
              <div key={stage} className="flex items-center">
                <div
                  className={`flex flex-col items-center px-3 py-2 rounded-md min-w-[90px] ${
                    (pipelineCounts[stage] || 0) > 0 ? "bg-muted" : "bg-muted/40"
                  }`}
                  data-testid={`pipeline-commitment-${stage}`}
                >
                  <span className="text-lg font-bold">{pipelineCounts[stage] || 0}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {commitmentStatusLabels[stage] || stage}
                  </span>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {complianceAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Compliance Alerts ({complianceAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {complianceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`alert-${alert.id}`}
                >
                  <Badge variant="outline" className={severityColors[alert.severity] || ""}>
                    {alert.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {recentClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No claims yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Claim #</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Type</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Claimant</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Amount</th>
                    <th className="pb-2 font-medium text-muted-foreground">Filed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClaims.map((claim) => (
                    <tr key={claim.id} className="border-b last:border-0" data-testid={`dashboard-claim-${claim.id}`}>
                      <td className="py-2 pr-3 font-mono text-xs">{claim.claimNumber}</td>
                      <td className="py-2 pr-3">{claimTypeLabels[claim.claimType || ""] || claim.claimType || "---"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-xs">
                          {claimStatusLabels[claim.status] || claim.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{claim.claimantName || "---"}</td>
                      <td className="py-2 pr-3 text-right">
                        {claim.claimAmount ? `$${parseFloat(String(claim.claimAmount)).toLocaleString()}` : "---"}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {claim.filedDate ? format(new Date(claim.filedDate), "MMM d, yyyy") : "---"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Policy Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {policyVolumeData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={policyVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Claims by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {claimTypeData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No claims data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={claimTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {claimTypeData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Exception Clearance Rate: {exceptionClearanceRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exceptionBarData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No exception data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={exceptionBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Premium by Underwriter</CardTitle>
          </CardHeader>
          <CardContent>
            {premiumBarData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No premium data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={premiumBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Premium"]}
                  />
                  <Bar dataKey="premium" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
