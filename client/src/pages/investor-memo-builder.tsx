import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, FileText, TrendingUp, Brain, MessageSquare,
  Download, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  Sparkles, BarChart3, Shield, Zap, Globe, Building2,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { MemoSectionEditor } from "@/components/investor-memo/memo-section-editor";
import { FinancialModelPanel } from "@/components/investor-memo/financial-model-panel";
import { MemoChatPanel } from "@/components/investor-memo/memo-chat-panel";
import { MemoProgressTracker } from "@/components/investor-memo/memo-progress-tracker";
import { TechSynergyMatrix } from "@/components/investor-memo/tech-synergy-matrix";

const SECTION_ICONS: Record<string, any> = {
  executive_summary: Sparkles,
  company_overview: Building2,
  industry_market_analysis: Globe,
  competitive_intelligence: Shield,
  financial_performance: BarChart3,
  financial_projections: TrendingUp,
  valuation: TrendingUp,
  technology_innovation: Brain,
  value_creation_plan: Zap,
  management_organization: Building2,
  risk_factors: AlertTriangle,
  investment_merits: CheckCircle2,
  appendix: FileText,
};

export default function InvestorMemoBuilder() {
  const { memoId } = useParams<{ memoId: string }>();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("executive_summary");
  const [activeTab, setActiveTab] = useState("memo");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: memo, isLoading } = useQuery({
    queryKey: ["/api/memos", memoId],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: (data: any) => data?.status === "generating" ? 3000 : false,
  });

  const { data: model } = useQuery({
    queryKey: ["/api/memos", memoId, "model"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!memo && memo.status !== "generating",
  });

  const updateSection = useMutation({
    mutationFn: async ({ section, content }: { section: string; content: string }) => {
      await apiRequest("PATCH", `/api/memos/${memoId}/sections/${section}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos", memoId] });
      toast({ title: "Section updated" });
    },
  });

  const regenerateSection = useMutation({
    mutationFn: async ({ section, prompt }: { section: string; prompt?: string }) => {
      const res = await apiRequest("POST", `/api/memos/${memoId}/regenerate/${section}`, { prompt });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos", memoId] });
      toast({ title: "Section regenerated" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="space-y-4 w-96">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!memo) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Memo not found</p>
      </div>
    );
  }

  if (memo.status === "generating" || memo.status === "extracting" || memo.status === "researching" || memo.status === "modeling" || memo.status === "writing") {
    return <MemoProgressTracker memoId={memoId!} dealName={memo.dealName} />;
  }

  const sections = (memo.sections || {}) as Record<string, { title: string; content: string; isEdited: boolean; generatedAt: string }>;

  const SECTION_ORDER = [
    "executive_summary",
    "company_overview",
    "industry_market_analysis",
    "competitive_intelligence",
    "financial_performance",
    "financial_projections",
    "valuation",
    "technology_innovation",
    "value_creation_plan",
    "management_organization",
    "investment_merits",
    "risk_factors",
    "appendix",
  ];

  const sectionKeys = [
    ...SECTION_ORDER.filter((k) => k in sections),
    ...Object.keys(sections).filter((k) => !SECTION_ORDER.includes(k)),
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Link href={memo.sourceType === "transaction" || memo.sourceType === "data_room" ? `/transactions/deals/${memo.dealId}` : `/pe/deals/${memo.dealId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{memo.dealName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={memo.status === "review" ? "default" : memo.status === "final" ? "outline" : "secondary"}>
                {memo.status}
              </Badge>
              {memo.innovationScore && (
                <Badge variant="outline" className="gap-1">
                  <Brain className="h-3 w-3" />
                  Innovation: {memo.innovationScore}/100
                </Badge>
              )}
              {memo.overallScore && (
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Score: {memo.overallScore}/100
                </Badge>
              )}
              {memo.metadata?.researchSourcesCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {memo.metadata.researchSourcesCount} sources
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/memos/${memoId}/export/pdf`)}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/memos/${memoId}/export/word`)}>
            <FileText className="h-4 w-4 mr-2" />
            Export Word
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/memos/${memoId}/export/excel`)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Section navigation - collapsible */}
        {sidebarOpen && (
          <div className="w-64 border-r bg-muted/30 overflow-y-auto shrink-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Memo Sections</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  data-testid="button-collapse-memo-sections"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
              <nav className="space-y-1">
                {sectionKeys.map((key) => {
                  const section = sections[key];
                  const Icon = SECTION_ICONS[key] || FileText;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveSection(key);
                        setActiveTab("memo");
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        activeSection === key && activeTab === "memo"
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                      data-testid={`button-memo-section-${key}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{section.title}</span>
                      {section.isEdited && (
                        <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0">edited</Badge>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b px-6 flex items-center gap-2">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  data-testid="button-expand-memo-sections"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              )}
              <TabsList className="h-10">
                <TabsTrigger value="memo" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Memo
                </TabsTrigger>
                <TabsTrigger value="model" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Financial Model
                </TabsTrigger>
                <TabsTrigger value="tech" className="gap-2">
                  <Brain className="h-4 w-4" />
                  Tech & Innovation
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Refine with AI
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="memo" className="flex-1 overflow-y-auto p-6 mt-0">
              {sections[activeSection] && (
                <MemoSectionEditor
                  sectionKey={activeSection}
                  section={sections[activeSection]}
                  onSave={(content) => updateSection.mutate({ section: activeSection, content })}
                  onRegenerate={(prompt) => regenerateSection.mutate({ section: activeSection, prompt })}
                  isSaving={updateSection.isPending}
                  isRegenerating={regenerateSection.isPending}
                />
              )}
            </TabsContent>

            <TabsContent value="model" className="flex-1 overflow-y-auto p-6 mt-0">
              <FinancialModelPanel model={model} />
            </TabsContent>

            <TabsContent value="tech" className="flex-1 overflow-y-auto p-6 mt-0">
              <TechSynergyMatrix assessment={memo.techAssessment} />
            </TabsContent>

            <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
              <MemoChatPanel memoId={memoId!} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
