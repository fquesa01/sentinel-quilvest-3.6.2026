import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";

interface ComplianceScoreCardProps {
  complianceScore: number | null;
  riskLevel: string | null;
  aiComplianceAnalysis: string | null;
  analyzedAt: string | null;
  violatedRegulations?: string[];
  policyViolations?: string[];
  relatedDocuments?: Array<{
    id: string;
    subject: string;
    sender: string;
    timestamp: string;
    relationshipType: string;
    confidenceScore: number;
    explanation: string;
  }>;
  isLoading?: boolean;
}

export function ComplianceScoreCard({
  complianceScore,
  riskLevel,
  aiComplianceAnalysis,
  analyzedAt,
  violatedRegulations = [],
  policyViolations = [],
  relatedDocuments = [],
  isLoading = false,
}: ComplianceScoreCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-compliance-score">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Analyzing...</div>
        </CardContent>
      </Card>
    );
  }

  if (!complianceScore && !riskLevel) {
    return (
      <Card data-testid="card-compliance-score">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No analysis available</div>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (level: string | null) => {
    switch (level) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "high":
        return "text-orange-600 dark:text-orange-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      case "low":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskBadgeVariant = (level: string | null) => {
    switch (level) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRiskIcon = (level: string | null) => {
    switch (level) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      case "medium":
        return <Shield className="h-4 w-4" />;
      case "low":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getProgressColor = (score: number | null) => {
    if (!score) return "";
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card data-testid="card-compliance-score">
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Compliance Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getRiskColor(riskLevel)}`} data-testid="text-compliance-score">
                {complianceScore ?? 0}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <Badge variant={getRiskBadgeVariant(riskLevel)} className="flex items-center gap-1" data-testid="badge-risk-level">
              {getRiskIcon(riskLevel)}
              {riskLevel?.toUpperCase() || "UNKNOWN"}
            </Badge>
          </div>
          <Progress 
            value={complianceScore ?? 0} 
            className={`h-2 ${getProgressColor(complianceScore)}`}
            data-testid="progress-compliance-score"
          />
        </div>

        {/* AI Analysis */}
        {aiComplianceAnalysis && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">AI Analysis</h4>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ai-analysis">
              {aiComplianceAnalysis}
            </p>
          </div>
        )}

        {/* Violated Regulations */}
        {violatedRegulations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Potential Regulatory Violations</h4>
            <div className="flex flex-wrap gap-1">
              {violatedRegulations.map((reg, idx) => (
                <Badge key={idx} variant="destructive" data-testid={`badge-regulation-${idx}`}>
                  {reg}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Policy Violations */}
        {policyViolations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Potential Policy Violations</h4>
            <div className="flex flex-wrap gap-1">
              {policyViolations.map((policy, idx) => (
                <Badge key={idx} variant="outline" data-testid={`badge-policy-${idx}`}>
                  {policy}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Related Documents */}
        {relatedDocuments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Related Documents ({relatedDocuments.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {relatedDocuments.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="p-2 rounded-md border bg-card hover-elevate text-sm"
                  data-testid={`card-related-doc-${idx}`}
                >
                  <div className="font-medium truncate">{doc.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    From: {doc.sender} • {format(new Date(doc.timestamp), "MMM d, yyyy")}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {doc.relationshipType.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {doc.confidenceScore}% confidence
                    </span>
                  </div>
                  {doc.explanation && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      {doc.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Timestamp */}
        {analyzedAt && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Last analyzed: {format(new Date(analyzedAt), "MMM d, yyyy h:mm a")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
