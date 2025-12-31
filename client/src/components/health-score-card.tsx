import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Shield, 
  Eye, 
  GraduationCap, 
  FileText,
  AlertCircle,
  CheckCircle2 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type HealthScoreData = {
  overallScore: number;
  letterGrade: string;
  dimensions: {
    coverage: {
      score: number;
      metrics: any;
    };
    detection: {
      score: number;
      metrics: any;
    };
    prevention: {
      score: number;
      metrics: any;
    };
    policyCompliance: {
      score: number;
      metrics: any;
    };
  };
  industryBenchmarks: Record<string, number>;
  recommendations: Array<{
    dimension: string;
    priority: string;
    action: string;
    impact: string;
  }>;
};

function ScoreGauge({ score, label, icon: Icon, color }: { score: number; label: string; icon: any; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-bold">{score}</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const colorClass = 
    grade === "A" ? "bg-green-500 text-white" :
    grade === "B" ? "bg-blue-500 text-white" :
    grade === "C" ? "bg-yellow-500 text-white" :
    grade === "D" ? "bg-orange-500 text-white" :
    "bg-red-500 text-white";
  
  const status = 
    score >= 90 ? "Excellent" :
    score >= 80 ? "Good" :
    score >= 70 ? "Fair" :
    score >= 60 ? "Needs Improvement" :
    "Critical";

  return (
    <div className="flex items-center gap-3">
      <Badge className={`${colorClass} text-3xl font-bold px-6 py-3`} data-testid="badge-health-grade">
        {grade}
      </Badge>
      <div>
        <div className="text-3xl font-bold" data-testid="text-health-score">{score}</div>
        <div className="text-sm text-muted-foreground">{status}</div>
      </div>
    </div>
  );
}

export function HealthScoreCard() {
  const { data: healthScore, isLoading, error } = useQuery<HealthScoreData>({
    queryKey: ["/api/analytics/health-score"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-health-score">
        <CardHeader>
          <CardTitle>Compliance Health Score</CardTitle>
          <CardDescription>Real-time assessment of your compliance posture</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="card-health-score">
        <CardHeader>
          <CardTitle>Compliance Health Score</CardTitle>
          <CardDescription>Real-time assessment of your compliance posture</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load health score data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!healthScore) {
    return null;
  }

  const industryAvg = healthScore.industryBenchmarks.Average;
  const comparisonToAvg = healthScore.overallScore - industryAvg;
  
  const dimensions = [
    {
      key: "coverage",
      label: "Coverage",
      icon: Shield,
      color: "text-blue-500",
      score: healthScore.dimensions.coverage.score,
    },
    {
      key: "detection",
      label: "Detection",
      icon: Eye,
      color: "text-purple-500",
      score: healthScore.dimensions.detection.score,
    },
    {
      key: "prevention",
      label: "Prevention",
      icon: GraduationCap,
      color: "text-green-500",
      score: healthScore.dimensions.prevention.score,
    },
    {
      key: "policyCompliance",
      label: "Policy Compliance",
      icon: FileText,
      color: "text-orange-500",
      score: healthScore.dimensions.policyCompliance.score,
    },
  ];

  return (
    <Card data-testid="card-health-score">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Compliance Health Score</CardTitle>
            <CardDescription>Real-time assessment of your compliance posture</CardDescription>
          </div>
          <GradeBadge grade={healthScore.letterGrade} score={healthScore.overallScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Industry Comparison */}
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg" data-testid="section-industry-comparison">
          <div className="flex items-center gap-2 flex-1">
            {comparisonToAvg > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  <span className="font-semibold text-green-500">+{comparisonToAvg} points</span> above industry average ({industryAvg})
                </span>
              </>
            ) : comparisonToAvg < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  <span className="font-semibold text-orange-500">{comparisonToAvg} points</span> below industry average ({industryAvg})
                </span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  <span className="font-semibold">At</span> industry average ({industryAvg})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Dimension Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="section-dimension-scores">
          {dimensions.map((dim) => (
            <ScoreGauge
              key={dim.key}
              score={dim.score}
              label={dim.label}
              icon={dim.icon}
              color={dim.color}
            />
          ))}
        </div>

        {/* Recommendations */}
        {healthScore.recommendations.length > 0 && (
          <div className="space-y-3" data-testid="section-recommendations">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Recommendations
            </h3>
            {healthScore.recommendations.map((rec, idx) => (
              <Alert key={idx} className={rec.priority === "high" ? "border-orange-500" : ""} data-testid={`alert-recommendation-${idx}`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{rec.dimension}: {rec.action}</div>
                      <div className="text-sm text-muted-foreground mt-1">{rec.impact}</div>
                    </div>
                    <Badge variant={rec.priority === "high" ? "destructive" : "secondary"} className="text-xs">
                      {rec.priority}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* All Clear Message */}
        {healthScore.recommendations.length === 0 && healthScore.overallScore >= 70 && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950" data-testid="alert-all-clear">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Your compliance program is performing well across all dimensions. Continue monitoring to maintain this level.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
