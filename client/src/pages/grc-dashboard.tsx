import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface GRCDashboardMetrics {
  risks: {
    total: number;
    highRisk: number;
    mitigated: number;
  };
  controls: {
    total: number;
    effective: number;
    failed: number;
  };
  incidents: {
    total: number;
    open: number;
    critical: number;
  };
  policies: {
    total: number;
  };
}

export default function GRCDashboard() {
  const { data: metrics, isLoading } = useQuery<GRCDashboardMetrics>({
    queryKey: ["/api/grc/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-grc-dashboard">
            GRC Repository
          </h1>
          <p className="text-muted-foreground mt-1">
            Governance, Risk & Compliance management center
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-total-risks">
              {metrics?.risks.total || 0}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <Badge variant="destructive" className="text-xs">
                  {metrics?.risks.highRisk || 0}
                </Badge>
                <span className="text-muted-foreground">High</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="default" className="text-xs bg-green-600">
                  {metrics?.risks.mitigated || 0}
                </Badge>
                <span className="text-muted-foreground">Mitigated</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Controls</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-total-controls">
              {metrics?.controls.total || 0}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <Badge variant="default" className="text-xs bg-green-600">
                  {metrics?.controls.effective || 0}
                </Badge>
                <span className="text-muted-foreground">Effective</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="destructive" className="text-xs">
                  {metrics?.controls.failed || 0}
                </Badge>
                <span className="text-muted-foreground">Failed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-total-incidents">
              {metrics?.incidents.total || 0}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <Badge variant="destructive" className="text-xs">
                  {metrics?.incidents.critical || 0}
                </Badge>
                <span className="text-muted-foreground">Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {metrics?.incidents.open || 0}
                </Badge>
                <span className="text-muted-foreground">Open</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-total-policies">
              {metrics?.policies.total || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Current active policies
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Identify, assess, and mitigate organizational risks with comprehensive tracking
            </p>
            <Link href="/grc/risks">
              <Button className="w-full" data-testid="button-manage-risks">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Manage Risks
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controls Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Define and monitor controls, track effectiveness testing and remediation
            </p>
            <Link href="/grc/controls">
              <Button className="w-full" data-testid="button-manage-controls">
                <CheckCircle className="h-4 w-4 mr-2" />
                Manage Controls
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Report and investigate incidents, track root cause analysis and remediation
            </p>
            <Link href="/grc/incidents">
              <Button className="w-full" data-testid="button-manage-incidents">
                <Activity className="h-4 w-4 mr-2" />
                Manage Incidents
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/grc/risks">
              <Button variant="outline" className="w-full justify-start" data-testid="button-new-risk">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Add New Risk
              </Button>
            </Link>
            <Link href="/grc/controls">
              <Button variant="outline" className="w-full justify-start" data-testid="button-new-control">
                <CheckCircle className="h-4 w-4 mr-2" />
                Add New Control
              </Button>
            </Link>
            <Link href="/grc/incidents">
              <Button variant="outline" className="w-full justify-start" data-testid="button-new-incident">
                <Activity className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </Link>
            <Link href="/knowledge-base">
              <Button variant="outline" className="w-full justify-start" data-testid="button-view-policies">
                <FileText className="h-4 w-4 mr-2" />
                View Policies
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
