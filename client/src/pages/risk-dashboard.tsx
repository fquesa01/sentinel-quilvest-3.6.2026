import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Activity,
  RefreshCw,
  Plus,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { Link } from "wouter";
import type { GrcRisk, GrcControl, GrcIncident } from "@shared/schema";
import { Helmet } from "react-helmet";

export default function RiskDashboard() {
  const [timeRange, setTimeRange] = useState("30d");

  const { data: risks, isLoading: risksLoading } = useQuery<GrcRisk[]>({
    queryKey: ["/api/grc/risks"],
  });

  const { data: controls, isLoading: controlsLoading } = useQuery<GrcControl[]>({
    queryKey: ["/api/grc/controls"],
  });

  const { data: incidents, isLoading: incidentsLoading } = useQuery<GrcIncident[]>({
    queryKey: ["/api/grc/incidents"],
  });

  const isLoading = risksLoading || controlsLoading || incidentsLoading;

  const getRiskRating = (score: number) => {
    if (score >= 20) return { label: "Critical", color: "bg-red-500" };
    if (score >= 15) return { label: "High", color: "bg-orange-500" };
    if (score >= 10) return { label: "Medium", color: "bg-yellow-500" };
    if (score >= 5) return { label: "Low", color: "bg-blue-500" };
    return { label: "Minimal", color: "bg-green-500" };
  };

  const risksByRating = {
    critical: risks?.filter(r => r.inherentRiskScore >= 20) || [],
    high: risks?.filter(r => r.inherentRiskScore >= 15 && r.inherentRiskScore < 20) || [],
    medium: risks?.filter(r => r.inherentRiskScore >= 10 && r.inherentRiskScore < 15) || [],
    low: risks?.filter(r => r.inherentRiskScore >= 5 && r.inherentRiskScore < 10) || [],
    minimal: risks?.filter(r => r.inherentRiskScore < 5) || [],
  };

  const openIncidents = incidents?.filter(i => i.status !== "closed" && i.status !== "resolved") || [];
  const criticalIncidents = incidents?.filter(i => i.severity === "critical" && i.status !== "closed") || [];

  const controlsByEffectiveness = {
    effective: controls?.filter(c => c.effectiveness === "fully_effective" || c.effectiveness === "largely_effective") || [],
    partial: controls?.filter(c => c.effectiveness === "partially_effective") || [],
    ineffective: controls?.filter(c => c.effectiveness === "ineffective" || c.effectiveness === "not_tested") || [],
  };

  const riskMatrix = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];

  risks?.forEach(risk => {
    const likelihood = Math.min(Math.max((risk.likelihood === "rare" ? 1 : risk.likelihood === "unlikely" ? 2 : risk.likelihood === "possible" ? 3 : risk.likelihood === "likely" ? 4 : 5), 1), 5);
    const impact = Math.min(Math.max((risk.impact === "insignificant" ? 1 : risk.impact === "minor" ? 2 : risk.impact === "moderate" ? 3 : risk.impact === "major" ? 4 : 5), 1), 5);
    riskMatrix[5 - likelihood][impact - 1]++;
  });

  return (
    <>
      <Helmet>
        <title>Risk Dashboard | Sentinel Counsel</title>
        <meta name="description" content="Enterprise risk management dashboard with real-time risk monitoring, control effectiveness, and incident tracking." />
      </Helmet>

      <div className="flex flex-col gap-6 p-6 stagger-1 fadeSlideUp">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-risk-dashboard-title">Risk Dashboard</h1>
            <p className="text-muted-foreground mt-1">Enterprise risk management overview and monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/risk-management/register">
              <Button data-testid="button-add-risk">
                <Plus className="h-4 w-4 mr-2" />
                Add Risk
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-2 fadeSlideUp">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Risks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-total-risks">{risks?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {risksByRating.critical.length + risksByRating.high.length} high priority
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Controls</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-total-controls">{controls?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {controlsByEffectiveness.effective.length} fully effective
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-open-incidents">{openIncidents.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {criticalIncidents.length} critical
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Score Trend</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-risk-trend">-12%</div>
                  <p className="text-xs text-muted-foreground">vs previous period</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-3 fadeSlideUp">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Risk Heat Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-1">
                <div className="col-span-1"></div>
                {["Minimal", "Minor", "Moderate", "Major", "Catastrophic"].map((label, i) => (
                  <div key={i} className="text-xs text-center text-muted-foreground">{label}</div>
                ))}
                
                {["Almost Certain", "Likely", "Possible", "Unlikely", "Rare"].map((likelihood, li) => (
                  <>
                    <div key={`label-${li}`} className="text-xs text-right pr-2 flex items-center justify-end text-muted-foreground">
                      {likelihood}
                    </div>
                    {[1, 2, 3, 4, 5].map((impact, ii) => {
                      const count = riskMatrix[li][ii];
                      const score = (5 - li) * impact;
                      const color = score >= 20 ? "bg-red-500" : score >= 15 ? "bg-orange-500" : score >= 10 ? "bg-yellow-500" : score >= 5 ? "bg-blue-500" : "bg-green-500";
                      return (
                        <div 
                          key={`${li}-${ii}`} 
                          className={`h-12 rounded flex items-center justify-center text-white font-medium ${color} ${count > 0 ? 'opacity-100' : 'opacity-40'}`}
                          data-testid={`heatmap-cell-${li}-${ii}`}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500"></div> Minimal</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500"></div> Low</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500"></div> Medium</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500"></div> High</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500"></div> Critical</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Risks by Rating
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">Critical</span>
                    </div>
                    <Badge variant="destructive" data-testid="badge-critical-risks">{risksByRating.critical.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm">High</span>
                    </div>
                    <Badge className="bg-orange-500" data-testid="badge-high-risks">{risksByRating.high.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm">Medium</span>
                    </div>
                    <Badge className="bg-yellow-500 text-black" data-testid="badge-medium-risks">{risksByRating.medium.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Low</span>
                    </div>
                    <Badge className="bg-blue-500" data-testid="badge-low-risks">{risksByRating.low.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Minimal</span>
                    </div>
                    <Badge className="bg-green-500" data-testid="badge-minimal-risks">{risksByRating.minimal.length}</Badge>
                  </div>
                </>
              )}
              <Link href="/risk-management/register">
                <Button variant="outline" className="w-full mt-4" data-testid="button-view-all-risks">
                  View All Risks
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-4 fadeSlideUp">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Top Risks</CardTitle>
              <Link href="/risk-management/register">
                <Button variant="ghost" size="sm" data-testid="button-view-register">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
              ) : risks && risks.length > 0 ? (
                <div className="space-y-3">
                  {risks
                    .sort((a, b) => b.inherentRiskScore - a.inherentRiskScore)
                    .slice(0, 5)
                    .map((risk, index) => {
                      const rating = getRiskRating(risk.inherentRiskScore);
                      return (
                        <div key={risk.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`risk-item-${index}`}>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{risk.riskTitle}</div>
                            <div className="text-xs text-muted-foreground capitalize">{risk.category}</div>
                          </div>
                          <Badge className={`${rating.color} text-white`}>{rating.label}</Badge>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No risks registered yet</p>
                  <Link href="/risk-management/register">
                    <Button variant="outline" className="mt-4" data-testid="button-add-first-risk">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Risk
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Recent Incidents</CardTitle>
              <Link href="/risk-management/incidents">
                <Button variant="ghost" size="sm" data-testid="button-view-incidents">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
              ) : incidents && incidents.length > 0 ? (
                <div className="space-y-3">
                  {incidents
                    .sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime())
                    .slice(0, 5)
                    .map((incident, index) => (
                      <div key={incident.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`incident-item-${index}`}>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{incident.incidentTitle}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(incident.reportedDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={incident.severity === "critical" ? "destructive" : "secondary"}
                            className={incident.severity === "high" ? "bg-orange-500 text-white" : ""}
                          >
                            {incident.severity}
                          </Badge>
                          <Badge variant="outline">{incident.status}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No incidents reported</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="stagger-5 fadeSlideUp">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Control Effectiveness</CardTitle>
            <Link href="/risk-management/controls">
              <Button variant="ghost" size="sm" data-testid="button-view-controls">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-3xl font-bold text-green-600" data-testid="text-effective-controls">
                  {controlsByEffectiveness.effective.length}
                </div>
                <div className="text-sm text-muted-foreground">Effective</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="text-3xl font-bold text-yellow-600" data-testid="text-partial-controls">
                  {controlsByEffectiveness.partial.length}
                </div>
                <div className="text-sm text-muted-foreground">Partially Effective</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-3xl font-bold text-red-600" data-testid="text-ineffective-controls">
                  {controlsByEffectiveness.ineffective.length}
                </div>
                <div className="text-sm text-muted-foreground">Ineffective / Not Tested</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
