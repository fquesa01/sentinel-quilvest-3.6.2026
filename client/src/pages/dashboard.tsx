import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, FileText, Clock, CheckCircle2, TrendingUp, TrendingDown, PlayCircle, Gauge, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface DashboardMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  activeCases: number;
  closedCases: number;
  pendingReviews: number;
  alertsTrend: number;
  violationByType: Array<{ type: string; count: number }>;
  recentAlerts: Array<{
    id: string;
    severity: string;
    violationType: string;
    sender: string;
    createdAt: string;
  }>;
}

interface CaseEfficiency {
  totalCases: number;
  openCases: number;
  closedCases: number;
  avgTimeToClose: number;
  ageDistribution: {
    lessThan7Days: number;
    days8to30: number;
    days31to90: number;
    moreThan90Days: number;
  };
  quarterlyData: Array<{
    quarter: string;
    openAtStart: number;
    openAtEnd: number;
    closedInQuarter: number;
    efficiencyFactor: number;
  }>;
}

export default function Dashboard() {
  const [showDemoPrompt, setShowDemoPrompt] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/analytics/dashboard"],
  });

  const { data: efficiency, isLoading: efficiencyLoading } = useQuery<CaseEfficiency>({
    queryKey: ["/api/analytics/case-efficiency"],
  });

  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/seed-demo", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to seed demo data");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      toast({
        title: "Demo Data Loaded",
        description: `Successfully loaded ${data.communications} communications, ${data.alerts} alerts, ${data.cases} cases, and ${data.interviews} interviews.`,
      });
      setShowDemoPrompt(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to load demo data",
        variant: "destructive",
      });
    },
  });

  const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between stagger-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-['IBM_Plex_Sans']" data-testid="heading-dashboard">
            Compliance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring and analytics
          </p>
        </div>
      </div>

      {/* Demo Data Prompt */}
      {user?.role === "admin" && showDemoPrompt && (metrics?.totalAlerts === 0 || !metrics) && (
        <Alert data-testid="alert-demo-prompt" className="stagger-2">
          <PlayCircle className="h-4 w-4" />
          <AlertTitle>Get Started with Demo Data</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              Load realistic demo data to explore the platform's features. This creates 5 investigation scenarios (FCPA, Antitrust, Insider Trading, AML, Off-Channel) with communications, alerts, and cases.
            </span>
            <div className="flex gap-2 flex-none">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDemoPrompt(false)}
                data-testid="button-dismiss-demo"
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={() => seedDemoMutation.mutate()}
                disabled={seedDemoMutation.isPending}
                data-testid="button-load-demo"
              >
                {seedDemoMutation.isPending ? "Loading..." : "Load Demo Data"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-2">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-total-alerts">
              {metrics?.totalAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {(metrics?.alertsTrend || 0) > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">+{metrics?.alertsTrend}% from last week</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">{metrics?.alertsTrend}% from last week</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive" data-testid="metric-critical-alerts">
              {metrics?.criticalAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-active-cases">
              {metrics?.activeCases || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Under investigation
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-pending-reviews">
              {metrics?.pendingReviews || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting attorney review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-3">
        <Card>
          <CardHeader>
            <CardTitle>Violations by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics?.violationByType || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="type"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!metrics?.recentAlerts || metrics.recentAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent alerts</p>
              </div>
            ) : (
              metrics.recentAlerts.map((alert) => (
                <Link key={alert.id} href={`/alerts`}>
                  <div className="flex items-start gap-4 p-3 rounded-md border border-border hover-elevate cursor-pointer" data-testid={`alert-item-${alert.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={alert.severity as any} showIcon={false} />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                          {alert.violationType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">From: {alert.sender}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Case Efficiency Tracker */}
      <div className="space-y-6 stagger-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Case Efficiency Tracker</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span>Process efficiency and case aging metrics</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="metric-avg-resolution">
                {efficiency?.avgTimeToClose || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Days to close cases
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cases 0-7 Days</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600" data-testid="metric-cases-0-7">
                {efficiency?.ageDistribution.lessThan7Days || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recent cases
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cases 8-30 Days</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600" data-testid="metric-cases-8-30">
                {efficiency?.ageDistribution.days8to30 || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Moderate age
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cases 90+ Days</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600" data-testid="metric-cases-90-plus">
                {(efficiency?.ageDistribution.days31to90 || 0) + (efficiency?.ageDistribution.moreThan90Days || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Overdue cases
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Process Efficiency</CardTitle>
              <CardDescription>
                Efficiency factor by quarter - values above 1.0 indicate improving case closure rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {efficiencyLoading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={efficiency?.quarterlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="quarter"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="openAtStart" fill="#3b82f6" name="Open at Start" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="openAtEnd" fill="#ef4444" name="Open at End" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="efficiencyFactor" fill="#fbbf24" name="Efficiency Factor" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Case Aging Distribution</CardTitle>
              <CardDescription>
                Breakdown of open cases by age bracket
              </CardDescription>
            </CardHeader>
            <CardContent>
              {efficiencyLoading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "0-7 Days", value: efficiency?.ageDistribution.lessThan7Days || 0 },
                        { name: "8-30 Days", value: efficiency?.ageDistribution.days8to30 || 0 },
                        { name: "31-90 Days", value: efficiency?.ageDistribution.days31to90 || 0 },
                        { name: "90+ Days", value: efficiency?.ageDistribution.moreThan90Days || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
