import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, Download, FileText, CheckCircle2, XCircle, HelpCircle, TrendingUp } from "lucide-react";

interface ApplicableLaw {
  id: string;
  lawName: string;
  applies: boolean | null;
  aiRationale: string;
  evidenceRefs: string[];
  citationText?: string;
}

interface RiskMetric {
  category: string;
  score: number;
  trend: "up" | "down" | "stable";
}

interface AnalyticsTabProps {
  applicableLaws?: ApplicableLaw[];
  riskMetrics?: RiskMetric[];
  narrativeAnalysis?: string;
  isLoadingLaws?: boolean;
  isLoadingRisk?: boolean;
  onExportBoardSummary?: () => void;
  onExportRegulatorBrief?: () => void;
}

const getAppliesIcon = (applies: boolean | null) => {
  if (applies === true) return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (applies === false) return <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  return <HelpCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
};

const getAppliesText = (applies: boolean | null) => {
  if (applies === true) return { text: "Yes", color: "bg-green-500/10 text-green-700 dark:text-green-400" };
  if (applies === false) return { text: "No", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400" };
  return { text: "TBD", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" };
};

const getRiskColor = (score: number) => {
  if (score >= 75) return "bg-red-500";
  if (score >= 50) return "bg-orange-500";
  if (score >= 25) return "bg-yellow-500";
  return "bg-green-500";
};

export function AnalyticsTab({
  applicableLaws = [],
  riskMetrics = [],
  narrativeAnalysis,
  isLoadingLaws,
  isLoadingRisk,
  onExportBoardSummary,
  onExportRegulatorBrief,
}: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Export Tools */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics & Law Analysis</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onExportBoardSummary} data-testid="button-export-board-summary">
            <Download className="h-4 w-4 mr-2" />
            Board Summary PDF
          </Button>
          <Button variant="outline" onClick={onExportRegulatorBrief} data-testid="button-export-regulator-brief">
            <Download className="h-4 w-4 mr-2" />
            Regulator Brief
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applicable Law Matrix */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Applicable Law Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLaws ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : applicableLaws.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Law / Regulation</TableHead>
                      <TableHead>Applies?</TableHead>
                      <TableHead>AI Rationale</TableHead>
                      <TableHead>Evidence Refs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicableLaws.map((law) => {
                      const appliesInfo = getAppliesText(law.applies);
                      return (
                        <TableRow key={law.id} className="hover-elevate" data-testid={`law-row-${law.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{law.lawName}</p>
                              {law.citationText && (
                                <p className="text-xs text-muted-foreground mt-1">{law.citationText}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getAppliesIcon(law.applies)}
                              <Badge variant="outline" className={appliesInfo.color}>
                                {appliesInfo.text}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm text-muted-foreground line-clamp-3">{law.aiRationale}</p>
                          </TableCell>
                          <TableCell>
                            {law.evidenceRefs.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {law.evidenceRefs.slice(0, 3).map((ref, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {ref}
                                  </Badge>
                                ))}
                                {law.evidenceRefs.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{law.evidenceRefs.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No law analysis available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Risk Heatmap & Narrative */}
        <div className="space-y-6">
          {/* Risk Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Risk Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRisk ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : riskMetrics.length > 0 ? (
                <div className="space-y-3">
                  {riskMetrics.map((metric, idx) => (
                    <div key={idx} className="space-y-1" data-testid={`risk-metric-${idx}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{metric.category}</span>
                        <span className="text-muted-foreground">{metric.score}/100</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`${getRiskColor(metric.score)} h-2 rounded-full transition-all`}
                          style={{ width: `${metric.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No risk metrics available</p>
              )}
            </CardContent>
          </Card>

          {/* Narrative Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What Should We Be Thinking About?</CardTitle>
            </CardHeader>
            <CardContent>
              {narrativeAnalysis ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed" data-testid="text-narrative-analysis">
                    {narrativeAnalysis}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No strategic narrative available yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
