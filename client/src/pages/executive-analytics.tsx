import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import ForceGraph2D from "react-force-graph-2d";
import { TrendingUp, TrendingDown, DollarSign, Network, AlertTriangle, Clock, Users, FileText } from "lucide-react";
import { useRef, useCallback } from "react";

export default function ExecutiveAnalyticsPage() {
  const { data: networkData } = useQuery({
    queryKey: ["/api/analytics/network"],
  });

  const { data: trendingRisks } = useQuery({
    queryKey: ["/api/analytics/trending-risks"],
  });

  const { data: costSavings } = useQuery({
    queryKey: ["/api/analytics/cost-savings"],
  });

  const fgRef = useRef<any>();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getNodeColor = useCallback((node: any) => {
    if (node.riskScore >= 90) return '#dc2626'; // Critical
    if (node.riskScore >= 75) return '#ea580c'; // High
    if (node.riskScore >= 50) return '#eab308'; // Medium
    return '#22c55e'; // Low
  }, []);

  const getNodeSize = useCallback((node: any) => {
    return Math.max(5, Math.min(node.commCount * 2, 15));
  }, []);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-executive-analytics">
            Executive Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Network analysis, risk trending, and cost savings modeling for executive decision-making
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="cost-savings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cost-savings" data-testid="tab-cost-savings">
              <DollarSign className="h-4 w-4 mr-2" />
              Cost Savings & ROI
            </TabsTrigger>
            <TabsTrigger value="network" data-testid="tab-network">
              <Network className="h-4 w-4 mr-2" />
              Communication Networks
            </TabsTrigger>
            <TabsTrigger value="trending-risks" data-testid="tab-trending-risks">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending Risks
            </TabsTrigger>
          </TabsList>

          {/* Cost Savings Tab */}
          <TabsContent value="cost-savings" className="space-y-6">
            {costSavings && costSavings.summary && (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-total-savings">
                        {formatCurrency(costSavings.summary.totalSavings)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Annualized cost savings
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">ROI</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600" data-testid="text-roi">
                        {costSavings.summary.roi}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Return on investment
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-net-savings">
                        {formatCurrency(costSavings.summary.netSavings)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        After platform costs
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Break-Even</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-break-even">
                        {costSavings.projectedAnnual.breakEvenMonth} mo
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Months to break even
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Breakdowns */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Review Efficiency Savings</CardTitle>
                      <CardDescription>
                        Time and cost savings from AI-powered automated review
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Alerts Processed</span>
                        <span className="text-lg font-semibold">{formatNumber(costSavings.reviewEfficiency.totalAlerts)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Hours Saved</span>
                        <span className="text-lg font-semibold">{formatNumber(costSavings.reviewEfficiency.hoursSaved)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cost Saved</span>
                        <span className="text-lg font-semibold text-green-600">{formatCurrency(costSavings.reviewEfficiency.costSaved)}</span>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Manual Review Time</span>
                          <span>{costSavings.reviewEfficiency.manualTimePerAlert}h per alert</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-muted-foreground">AI-Assisted Review Time</span>
                          <span className="text-green-600">{costSavings.reviewEfficiency.avgTimePerAlert}h per alert</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Mitigation Impact</CardTitle>
                      <CardDescription>
                        Potential fines and penalties avoided through early detection
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Critical Alerts Caught</span>
                        <span className="text-lg font-semibold">{costSavings.riskMitigation.criticalAlertsCaught}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Potential Fines Avoided</span>
                        <span className="text-lg font-semibold text-green-600">{formatCurrency(costSavings.riskMitigation.potentialFinesAvoided)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Prevention Rate</span>
                        <span className="text-lg font-semibold">{costSavings.riskMitigation.preventionRate}%</span>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg Fine Per Violation</span>
                          <span>{formatCurrency(costSavings.riskMitigation.avgFinePerViolation)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Investigation Efficiency</CardTitle>
                      <CardDescription>
                        Cost reduction through streamlined investigation workflows
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Investigations</span>
                        <span className="text-lg font-semibold">{costSavings.investigationEfficiency.totalInvestigations}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Closed Investigations</span>
                        <span className="text-lg font-semibold">{costSavings.investigationEfficiency.closedInvestigations}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cost Savings</span>
                        <span className="text-lg font-semibold text-green-600">{formatCurrency(costSavings.investigationEfficiency.costSavings)}</span>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg Cost Reduction</span>
                          <span className="text-green-600">{costSavings.investigationEfficiency.avgCostReduction}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Projected Annual Impact</CardTitle>
                      <CardDescription>
                        Projected savings based on current performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Month Savings</span>
                        <span className="text-lg font-semibold">{formatCurrency(costSavings.projectedAnnual.currentMonthSavings)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Projected Yearly</span>
                        <span className="text-lg font-semibold text-green-600">{formatCurrency(costSavings.projectedAnnual.projectedYearlySavings)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Platform Cost</span>
                        <span className="text-lg font-semibold">{formatCurrency(costSavings.summary.platformCost)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Network Analysis Tab */}
          <TabsContent value="network" className="space-y-6">
            {networkData && networkData.nodes && networkData.edges && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Flagged Communications</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-flagged-comms">
                        {networkData.totalFlaggedComms}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Under legal hold or review
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unique Participants</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-participants">
                        {networkData.uniqueParticipants}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Individuals involved in flagged comms
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Network Connections</CardTitle>
                      <Network className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-connections">
                        {networkData.edges.length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Communication pathways
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Legend</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-red-600"></div>
                        <span>Critical (90+)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                        <span>High (75-89)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Medium (50-74)</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Flagged Communication Network</CardTitle>
                    <CardDescription>
                      Interactive network graph showing communication patterns between individuals involved in flagged communications. Node size represents communication volume, color indicates risk level.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[600px] border border-border rounded-md overflow-hidden">
                      <ForceGraph2D
                        ref={fgRef}
                        graphData={{
                          nodes: networkData.nodes,
                          links: networkData.edges.map((e: any) => ({
                            source: e.source,
                            target: e.target,
                            value: e.weight,
                          })),
                        }}
                        nodeLabel="label"
                        nodeColor={getNodeColor}
                        nodeVal={getNodeSize}
                        linkWidth={(link: any) => Math.sqrt(link.value)}
                        linkDirectionalParticles={2}
                        linkDirectionalParticleWidth={(link: any) => Math.sqrt(link.value)}
                        backgroundColor="#ffffff"
                        data-testid="network-graph"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Trending Risks Tab */}
          <TabsContent value="trending-risks" className="space-y-6">
            {trendingRisks && trendingRisks.timeSeriesData && trendingRisks.channelBreakdown && trendingRisks.hotSpots && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Trends Over Time</CardTitle>
                    <CardDescription>
                      30-day trend of average risk scores across all communications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendingRisks.timeSeriesData}>
                        <defs>
                          <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="avgRisk" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRisk)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk by Communication Channel</CardTitle>
                      <CardDescription>
                        Average risk scores and flagging rates by channel type
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={trendingRisks.channelBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="channel" />
                          <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                          <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="avgRisk" fill="#3b82f6" name="Avg Risk Score" />
                          <Bar yAxisId="right" dataKey="flaggedRate" fill="#8b5cf6" name="Flagged Rate %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Hot Spots by Violation Type</CardTitle>
                      <CardDescription>
                        Top violation types ranked by average risk score
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {trendingRisks.hotSpots.map((hotspot: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-md border border-border">
                            <div className="flex-1">
                              <div className="font-medium">{hotspot.type}</div>
                              <div className="text-sm text-muted-foreground">
                                {hotspot.count} alerts • {hotspot.criticalCount} critical
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={hotspot.avgRisk >= 90 ? "destructive" : hotspot.avgRisk >= 75 ? "default" : "secondary"}>
                                Risk: {hotspot.avgRisk}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Channel Statistics</CardTitle>
                    <CardDescription>
                      Detailed breakdown of communications and flagging rates by channel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {trendingRisks.channelBreakdown.map((channel: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-md border border-border">
                          <div className="flex-1">
                            <div className="font-medium capitalize">{channel.channel}</div>
                            <div className="text-sm text-muted-foreground">
                              {channel.flagged} flagged out of {channel.total} total
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium">Avg Risk: {channel.avgRisk}</div>
                              <div className="text-xs text-muted-foreground">Flagged: {channel.flaggedRate}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
