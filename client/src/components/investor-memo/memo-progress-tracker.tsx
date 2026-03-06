import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  FileSearch, Brain, Globe, Zap, TrendingUp, FileText,
  CheckCircle2, Loader2, Clock,
} from "lucide-react";

interface MemoProgressTrackerProps {
  memoId: string;
  dealName: string;
}

const STAGES = [
  { key: "classification", label: "Classifying Documents", icon: FileSearch, description: "AI is analyzing and categorizing your documents" },
  { key: "extraction", label: "Extracting Financials", icon: Brain, description: "Pulling structured financial data from statements and reports" },
  { key: "research", label: "Industry Research", icon: Globe, description: "Searching the web for market data, competitors, and trends" },
  { key: "tech_assessment", label: "Tech & Innovation Assessment", icon: Zap, description: "Evaluating technology and mapping Sentinel/Ticket Toro synergies" },
  { key: "modeling", label: "Building Financial Model", icon: TrendingUp, description: "Creating 3-scenario projections, DCF, and valuation" },
  { key: "writing", label: "Writing Investor Memo", icon: FileText, description: "Composing all 13 sections of the investor memo" },
];

export function MemoProgressTracker({ memoId, dealName }: MemoProgressTrackerProps) {
  const { data: run } = useQuery({
    queryKey: ["/api/memos", memoId, "progress"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 2000,
  });

  const stageDetails = (run?.stageDetails || {}) as Record<string, { status: string; startedAt?: string; completedAt?: string }>;
  const currentStage = run?.currentStage || "classification";
  const progress = run?.progress || 0;

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-8 pb-6 px-8">
          <div className="text-center mb-8">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                style={{ animationDuration: "2s" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">Generating Investor Memo</h2>
            <p className="text-sm text-muted-foreground mt-1">{dealName}</p>
          </div>

          <Progress value={progress} className="mb-6" />

          <div className="space-y-3">
            {STAGES.map((stage, index) => {
              const detail = stageDetails[stage.key];
              const isComplete = detail?.status === "complete";
              const isRunning = detail?.status === "running" || currentStage === stage.key;
              const isPending = !isComplete && !isRunning;
              const Icon = stage.icon;

              return (
                <div
                  key={stage.key}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isRunning ? "bg-primary/5 border border-primary/20" :
                    isComplete ? "bg-muted/30" : ""
                  }`}
                >
                  <div className={`shrink-0 ${
                    isComplete ? "text-green-500" :
                    isRunning ? "text-primary" :
                    "text-muted-foreground/40"
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isRunning ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isPending ? "text-muted-foreground/60" : ""}`}>
                      {stage.label}
                    </p>
                    {isRunning && (
                      <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
                    )}
                  </div>
                  {isComplete && (
                    <Badge variant="outline" className="text-xs text-green-600">Done</Badge>
                  )}
                  {isRunning && (
                    <Badge variant="secondary" className="text-xs">In progress</Badge>
                  )}
                </div>
              );
            })}
          </div>

          {run?.documentsTotal > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              Processing {run.documentsClassified || 0} of {run.documentsTotal} documents
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
