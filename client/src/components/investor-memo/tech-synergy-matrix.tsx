import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Brain, Shield, Zap, Building2, Code2, Lock, Globe, BarChart3 } from "lucide-react";

interface TechSynergyMatrixProps {
  assessment: any;
}

const EFFORT_COLORS: Record<string, string> = {
  low: "text-green-600 bg-green-50",
  medium: "text-yellow-600 bg-yellow-50",
  high: "text-red-600 bg-red-50",
};

export function TechSynergyMatrix({ assessment }: TechSynergyMatrixProps) {
  if (!assessment) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No technology assessment available. Generate a memo first.
        </CardContent>
      </Card>
    );
  }

  const profile = assessment.targetTechProfile || {};
  const sentinelSynergies = assessment.sentinelSynergies || [];
  const ticketToroSynergies = assessment.ticketToroSynergies || [];
  const valueCreation = assessment.valueCreationEstimate || {};
  const roadmap = assessment.implementationRoadmap || [];
  const risks = assessment.risks || [];

  return (
    <div className="space-y-6">
      {/* Innovation Score */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-lg font-semibold">Technology & Innovation Assessment</h2>
          <p className="text-sm text-muted-foreground">Target company tech profile and platform synergies</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{assessment.innovationScore || 0}</div>
            <div className="text-xs text-muted-foreground">Innovation Score</div>
          </div>
        </div>
      </div>

      {/* Target Tech Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Target Technology Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <ProfileMetric label="Architecture" value={profile.architectureType || "Unknown"} />
            <ProfileMetric label="Cloud" value={profile.cloudProvider || "Unknown"} />
            <ProfileMetric label="Data Maturity" value={profile.dataMaturity || "Unknown"} />
            <ProfileMetric label="API Capability" value={profile.apiCapability || "Unknown"} />
            <ProfileMetric label="Security" value={profile.securityPosture || "Unknown"} />
            <ProfileMetric label="Team Size" value={profile.teamSize || "Unknown"} />
          </div>

          {profile.currentStack?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Technology Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.currentStack.map((tech: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{tech}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {profile.strengths?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Strengths</p>
                <ul className="space-y-1">
                  {profile.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">+ {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile.weaknesses?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600 mb-2">Weaknesses</p>
                <ul className="space-y-1">
                  {profile.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">- {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sentinel Synergies */}
      {sentinelSynergies.length > 0 && (
        <SynergyTable
          title="Sentinel Counsel Synergies"
          icon={Shield}
          synergies={sentinelSynergies}
          color="text-blue-600"
        />
      )}

      {/* Ticket Toro Synergies */}
      {ticketToroSynergies.length > 0 && (
        <SynergyTable
          title="Ticket Toro Synergies"
          icon={Zap}
          synergies={ticketToroSynergies}
          color="text-purple-600"
        />
      )}

      {/* Value Creation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Value Creation Estimate ($000s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">${(valueCreation.year1 || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Year 1</p>
            </div>
            <div>
              <p className="text-2xl font-bold">${(valueCreation.year2 || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Year 2</p>
            </div>
            <div>
              <p className="text-2xl font-bold">${(valueCreation.year3 || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Year 3</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">${(valueCreation.total3Year || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">3-Year Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Roadmap */}
      {roadmap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Implementation Roadmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roadmap.map((phase: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                    {phase.phase}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{phase.name}</p>
                      <Badge variant="outline" className="text-xs">{phase.timeframe}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Synergies: {phase.synergies?.join(", ")}
                    </p>
                    {phase.estimatedValue > 0 && (
                      <p className="text-xs text-primary mt-0.5">
                        Est. value: ${phase.estimatedValue.toLocaleString()}K
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integration Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Mitigation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{r.risk}</TableCell>
                    <TableCell>
                      <Badge variant={r.severity === "high" ? "destructive" : r.severity === "medium" ? "secondary" : "outline"}>
                        {r.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.mitigation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

function SynergyTable({
  title, icon: Icon, synergies, color,
}: {
  title: string; icon: any; synergies: any[]; color: string;
}) {
  const sorted = [...synergies].sort((a, b) => b.applicabilityScore - a.applicabilityScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`text-base flex items-center gap-2 ${color}`}>
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capability</TableHead>
              <TableHead>Area</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Effort</TableHead>
              <TableHead>Revenue Impact</TableHead>
              <TableHead>Cost Savings</TableHead>
              <TableHead className="text-right">Timeline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{s.capability}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.capabilityArea}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center gap-2">
                    <Progress value={s.applicabilityScore * 10} className="w-16 h-2" />
                    <span className="text-sm tabular-nums">{s.applicabilityScore}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={EFFORT_COLORS[s.integrationEffort] || ""}>
                    {s.integrationEffort}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{s.estimatedRevenueImpact}</TableCell>
                <TableCell className="text-sm">{s.estimatedCostSavings}</TableCell>
                <TableCell className="text-right text-sm">{s.timelineMonths}mo</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
