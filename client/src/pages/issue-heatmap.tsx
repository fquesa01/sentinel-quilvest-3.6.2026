import { useState, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  BarChart3, 
  Users, 
  Building2, 
  AlertTriangle,
  Calendar,
  RefreshCw,
  TrendingUp,
  FileSearch,
  Shield,
  Scale,
  Briefcase,
  DollarSign,
  HardHat,
  AlertCircle,
  MessageSquare,
  Settings,
  ChevronRight,
  ChevronDown,
  Zap,
  Target,
  Filter,
  X,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Helmet } from "react-helmet";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
  ComposedChart,
  Area,
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface CaseDetails {
  id: string;
  name: string;
  caseNumber: string;
}

interface Issue {
  id: string;
  caseId: string;
  topic: string;
  subtopics: string[];
  issueSummary: string;
  urgencyScore: number;
  sentimentScore: number;
  riskLevel: string;
  peopleInvolved: string[];
  organizationsInvolved: string[];
  messageVolume: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  keywords: string[];
  riskTags: string[];
  contractReferences: string[];
  locationReferences: string[];
  projectReferences: string[];
  deadlineReferences: string[];
  escalationPhrases: string[];
  hasEscalationLanguage: boolean;
  isAnomaly: boolean;
  anomalyType: string | null;
  anomalyScore: number | null;
  sourceCommunicationIds: string[];
  lastAnalyzedAt: string | null;
  analysisVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PersonIssueData {
  email: string;
  name: string;
  issues: { topic: string; count: number; urgency: number }[];
  totalMessages: number;
  avgUrgency: number;
}

interface DomainIssueData {
  domain: string;
  issues: { topic: string; count: number; urgency: number }[];
  totalMessages: number;
  avgUrgency: number;
}

interface TimelinePoint {
  date: string;
  topic: string;
  count: number;
  avgUrgency: number;
  sentiment: string;
}

interface IssueInsights {
  topIssues: { topic: string; count: number; avgUrgency: number }[];
  emergingTopics: string[];
  urgencySpikes: { topic: string; date: string; urgency: number }[];
  highRiskPeople: { email: string; riskScore: number }[];
  anomalies: string[];
}

interface ExtractionProgress {
  status: string;
  processedDocuments: number;
  totalDocuments: number;
  currentTopic?: string;
}

const TOPIC_ICONS: Record<string, JSX.Element> = {
  legal: <Scale className="h-4 w-4" />,
  hr: <Users className="h-4 w-4" />,
  contracts: <Briefcase className="h-4 w-4" />,
  finance: <DollarSign className="h-4 w-4" />,
  safety: <HardHat className="h-4 w-4" />,
  sensitive: <AlertTriangle className="h-4 w-4" />,
  compliance: <Shield className="h-4 w-4" />,
  communications: <MessageSquare className="h-4 w-4" />,
  operations: <Settings className="h-4 w-4" />,
  other: <FileSearch className="h-4 w-4" />,
};

const TOPIC_COLORS: Record<string, string> = {
  legal: "#6366f1",
  hr: "#22c55e",
  contracts: "#f59e0b",
  finance: "#ef4444",
  safety: "#f97316",
  sensitive: "#dc2626",
  compliance: "#8b5cf6",
  communications: "#06b6d4",
  operations: "#64748b",
  other: "#9ca3af",
};

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function getUrgencyColor(urgency: number): string {
  if (urgency >= 80) return "#dc2626";
  if (urgency >= 60) return "#ef4444";
  if (urgency >= 40) return "#f59e0b";
  if (urgency >= 20) return "#eab308";
  return "#22c55e";
}

function formatEmailName(email: string | null | undefined): string {
  if (!email) return "Unknown";
  const atIndex = email.indexOf("@");
  if (atIndex > 0) {
    return email.slice(0, atIndex)
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return email;
}

interface IssueFilters {
  selectedTopics: string[];
  minUrgency: number;
  riskLevels: string[];
  showEscalationsOnly: boolean;
}

const AVAILABLE_TOPICS = [
  "legal", "hr", "contracts", "finance", "safety", 
  "sensitive", "compliance", "communications", "operations", "other"
];

export default function IssueHeatmapPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<IssueFilters>({
    selectedTopics: [],
    minUrgency: 0,
    riskLevels: [],
    showEscalationsOnly: false,
  });

  const { data: caseDetails } = useQuery<CaseDetails>({
    queryKey: ["/api/cases", caseId],
    enabled: !!caseId,
  });

  const { data: issues, isLoading: issuesLoading, isFetched: issuesFetched } = useQuery<Issue[]>({
    queryKey: ["/api/cases", caseId, "issues"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/issues`);
      if (!res.ok) throw new Error("Failed to fetch issues");
      return res.json();
    },
    enabled: !!caseId,
  });

  const { data: extractionProgress } = useQuery<ExtractionProgress>({
    queryKey: ["/api/cases", caseId, "issues/extract/progress"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/issues/extract/progress`);
      if (!res.ok) throw new Error("Failed to fetch progress");
      return res.json();
    },
    enabled: !!caseId,
    refetchInterval: (query) => {
      if (query.state.data?.status === "processing") return 2000;
      return false;
    },
  });

  const hasIssues = issues && issues.length > 0;

  const { data: personData, isLoading: personLoading } = useQuery<PersonIssueData[]>({
    queryKey: ["/api/cases", caseId, "issues/by-person"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/issues/by-person?limit=20`);
      if (!res.ok) throw new Error("Failed to fetch person data");
      return res.json();
    },
    enabled: !!caseId && hasIssues && activeTab === "people",
  });

  const { data: domainData, isLoading: domainLoading } = useQuery<DomainIssueData[]>({
    queryKey: ["/api/cases", caseId, "issues/by-domain"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/issues/by-domain?limit=20`);
      if (!res.ok) throw new Error("Failed to fetch domain data");
      return res.json();
    },
    enabled: !!caseId && hasIssues && activeTab === "orgs",
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery<TimelinePoint[]>({
    queryKey: ["/api/cases", caseId, "issues/timeline"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/issues/timeline`);
      if (!res.ok) throw new Error("Failed to fetch timeline");
      return res.json();
    },
    enabled: !!caseId && hasIssues && activeTab === "timeline",
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<IssueInsights>({
    queryKey: ["/api/cases", caseId, "issues/insights"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/issues/insights`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
    enabled: !!caseId && hasIssues,
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cases/${caseId}/issues/extract`);
      if (!res.ok) throw new Error("Failed to start extraction");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "issues/extract/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "issues"] });
    },
  });

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter((issue) => {
      if (filters.selectedTopics.length > 0 && !filters.selectedTopics.includes(issue.topic)) {
        return false;
      }
      if (issue.urgencyScore < filters.minUrgency) {
        return false;
      }
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(issue.riskLevel)) {
        return false;
      }
      if (filters.showEscalationsOnly && !issue.hasEscalationLanguage) {
        return false;
      }
      return true;
    });
  }, [issues, filters]);

  const hasActiveFilters = filters.selectedTopics.length > 0 || 
    filters.minUrgency > 0 || 
    filters.riskLevels.length > 0 || 
    filters.showEscalationsOnly;

  const clearFilters = useCallback(() => {
    setFilters({
      selectedTopics: [],
      minUrgency: 0,
      riskLevels: [],
      showEscalationsOnly: false,
    });
  }, []);

  const toggleTopic = useCallback((topic: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topic)
        ? prev.selectedTopics.filter(t => t !== topic)
        : [...prev.selectedTopics, topic]
    }));
  }, []);

  const toggleRiskLevel = useCallback((level: string) => {
    setFilters(prev => ({
      ...prev,
      riskLevels: prev.riskLevels.includes(level)
        ? prev.riskLevels.filter(l => l !== level)
        : [...prev.riskLevels, level]
    }));
  }, []);

  const handleStartExtraction = useCallback(() => {
    extractMutation.mutate();
  }, [extractMutation]);

  const handleNavigateToDocReview = useCallback((docFilters: Record<string, string>) => {
    const params = new URLSearchParams(docFilters);
    setLocation(`/cases/${caseId}/document-review?${params.toString()}`);
  }, [caseId, setLocation]);

  const topicFrequencyData = useMemo(() => {
    if (!filteredIssues) return [];
    const counts: Record<string, { topic: string; count: number; avgUrgency: number; totalUrgency: number }> = {};
    for (const issue of filteredIssues) {
      if (!counts[issue.topic]) {
        counts[issue.topic] = { topic: issue.topic, count: 0, avgUrgency: 0, totalUrgency: 0 };
      }
      counts[issue.topic].count += issue.messageVolume;
      counts[issue.topic].totalUrgency += issue.urgencyScore * issue.messageVolume;
    }
    return Object.values(counts)
      .map(d => ({ ...d, avgUrgency: d.count > 0 ? Math.round(d.totalUrgency / d.count * 10) / 10 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [filteredIssues]);

  const urgencyDistribution = useMemo(() => {
    if (!filteredIssues) return [];
    const bins = [
      { range: "0-20", count: 0, label: "Low" },
      { range: "21-40", count: 0, label: "Moderate" },
      { range: "41-60", count: 0, label: "Elevated" },
      { range: "61-80", count: 0, label: "High" },
      { range: "81-100", count: 0, label: "Critical" },
    ];
    for (const issue of filteredIssues) {
      const score = issue.urgencyScore;
      if (score <= 20) bins[0].count += issue.messageVolume;
      else if (score <= 40) bins[1].count += issue.messageVolume;
      else if (score <= 60) bins[2].count += issue.messageVolume;
      else if (score <= 80) bins[3].count += issue.messageVolume;
      else bins[4].count += issue.messageVolume;
    }
    return bins;
  }, [filteredIssues]);

  const isProcessing = extractionProgress?.status === "processing";
  const hasData = hasIssues;
  const noData = issuesFetched && !issuesLoading && (!issues || issues.length === 0) && !isProcessing;

  return (
    <>
      <Helmet>
        <title>Issue Intelligence - {caseDetails?.name || "Case"} | Sentinel Counsel</title>
        <meta name="description" content="AI-powered issue extraction and analysis for compliance monitoring" />
      </Helmet>

      <div className="h-full flex flex-col">
        <div className="p-4 border-b bg-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation(`/cases/${caseId}`)}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-semibold">Issue Intelligence</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {caseDetails?.name || "Loading..."} - {caseDetails?.caseNumber || ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasData && (
                <Button
                  variant={hasActiveFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {filters.selectedTopics.length + filters.riskLevels.length + (filters.minUrgency > 0 ? 1 : 0) + (filters.showEscalationsOnly ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              )}
              {extractionProgress?.status !== "processing" && (
                <Button
                  variant="outline"
                  onClick={handleStartExtraction}
                  disabled={extractMutation.isPending}
                  data-testid="button-extract-issues"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {hasData ? "Re-Extract Issues" : "Extract Issues"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] })}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {hasData && showFilters && (
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex flex-wrap items-start gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Topics</Label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_TOPICS.map((topic) => (
                    <Badge
                      key={topic}
                      variant={filters.selectedTopics.includes(topic) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleTopic(topic)}
                      data-testid={`filter-topic-${topic}`}
                    >
                      {TOPIC_ICONS[topic]}
                      <span className="ml-1">{topic}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2 min-w-[180px]">
                <Label className="text-sm font-medium">Min Urgency: {filters.minUrgency}</Label>
                <Slider
                  value={[filters.minUrgency]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([value]) => setFilters(prev => ({ ...prev, minUrgency: value }))}
                  data-testid="slider-min-urgency"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Risk Level</Label>
                <div className="flex flex-wrap gap-1">
                  {["low", "medium", "high", "critical"].map((level) => (
                    <Badge
                      key={level}
                      variant={filters.riskLevels.includes(level) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer capitalize",
                        filters.riskLevels.includes(level) && level === "critical" && "bg-destructive",
                        filters.riskLevels.includes(level) && level === "high" && "bg-red-500"
                      )}
                      onClick={() => toggleRiskLevel(level)}
                      data-testid={`filter-risk-${level}`}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="escalations-only"
                  checked={filters.showEscalationsOnly}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showEscalationsOnly: checked }))}
                  data-testid="switch-escalations-only"
                />
                <Label htmlFor="escalations-only" className="text-sm">Escalations Only</Label>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground mt-2">
                Showing {filteredIssues.length} of {issues?.length || 0} issues
              </p>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Extracting Issues...
                </CardTitle>
                <CardDescription>
                  Analyzing communications for compliance issues and risk patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress 
                  value={extractionProgress.totalDocuments > 0 
                    ? (extractionProgress.processedDocuments / extractionProgress.totalDocuments) * 100 
                    : 0
                  } 
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Processed: {extractionProgress.processedDocuments} / {extractionProgress.totalDocuments} documents
                  </span>
                  {extractionProgress.currentTopic && (
                    <span>Current topic: {extractionProgress.currentTopic}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {issuesLoading && !isProcessing && (
          <div className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {noData && (
          <div className="flex-1 flex items-center justify-center p-6">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <CardTitle>Issue Intelligence</CardTitle>
                <CardDescription>
                  Extract and analyze compliance issues from case communications using AI-powered analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button 
                  onClick={handleStartExtraction}
                  disabled={extractMutation.isPending}
                  data-testid="button-start-extraction"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Issue Extraction
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {hasData && (
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-auto p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview" data-testid="tab-overview">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="people" data-testid="tab-people">
                    <Users className="h-4 w-4 mr-2" />
                    By Person
                  </TabsTrigger>
                  <TabsTrigger value="orgs" data-testid="tab-orgs">
                    <Building2 className="h-4 w-4 mr-2" />
                    By Organization
                  </TabsTrigger>
                  <TabsTrigger value="timeline" data-testid="tab-timeline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="urgency" data-testid="tab-urgency">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Urgency
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Issues
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{filteredIssues.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Messages Analyzed
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {filteredIssues.reduce((sum, i) => sum + i.messageVolume, 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          High Risk Issues
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                          {filteredIssues.filter(i => i.riskLevel === "critical" || i.riskLevel === "high").length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Escalations Detected
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-warning">
                          {filteredIssues.filter(i => i.hasEscalationLanguage).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Issue Frequency by Topic</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topicFrequencyData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis type="number" />
                              <YAxis dataKey="topic" type="category" width={100} tick={{ fontSize: 12 }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                }}
                              />
                              <Bar dataKey="count" name="Messages">
                                {topicFrequencyData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={TOPIC_COLORS[entry.topic] || TOPIC_COLORS.other} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Urgency Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={urgencyDistribution}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                              <YAxis />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                }}
                              />
                              <Bar dataKey="count" name="Messages">
                                {urgencyDistribution.map((entry, index) => {
                                  const colors = ["#22c55e", "#84cc16", "#eab308", "#f59e0b", "#ef4444"];
                                  return <Cell key={`cell-${index}`} fill={colors[index]} />;
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Issue Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {filteredIssues.sort((a, b) => b.urgencyScore - a.urgencyScore).map((issue) => (
                            <div 
                              key={issue.id}
                              className="p-3 rounded-lg border hover-elevate cursor-pointer"
                              onClick={() => handleNavigateToDocReview({ topic: issue.topic })}
                              data-testid={`issue-card-${issue.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {TOPIC_ICONS[issue.topic] || TOPIC_ICONS.other}
                                  <span className="font-medium capitalize">{issue.topic}</span>
                                  <Badge 
                                    variant={issue.riskLevel === "critical" || issue.riskLevel === "high" ? "destructive" : "secondary"}
                                    className="text-xs"
                                  >
                                    {issue.riskLevel}
                                  </Badge>
                                  {issue.hasEscalationLanguage && (
                                    <Badge variant="outline" className="text-xs text-warning border-warning">
                                      Escalation
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{issue.messageVolume} msgs</span>
                                  <span 
                                    className="font-medium"
                                    style={{ color: getUrgencyColor(issue.urgencyScore) }}
                                  >
                                    Urgency: {issue.urgencyScore}
                                  </span>
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                {issue.issueSummary}
                              </p>
                              {issue.keywords && issue.keywords.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {issue.keywords.slice(0, 5).map((kw, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {kw}
                                    </Badge>
                                  ))}
                                  {issue.keywords.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{issue.keywords.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="people" className="space-y-4">
                  {personLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : personData && personData.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Issues by Person</CardTitle>
                        <CardDescription>
                          People associated with compliance issues, sorted by risk
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[600px]">
                          <div className="space-y-3">
                            {personData.map((person) => (
                              <div 
                                key={person.email}
                                className="p-3 rounded-lg border hover-elevate cursor-pointer"
                                onClick={() => handleNavigateToDocReview({ participants: person.email })}
                                data-testid={`person-card-${person.email}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{person.name || formatEmailName(person.email)}</span>
                                    <span className="text-sm text-muted-foreground">{person.email}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <span>{person.totalMessages || 0} msgs</span>
                                    <span 
                                      className="font-medium"
                                      style={{ color: getUrgencyColor(person.avgUrgency || 0) }}
                                    >
                                      Avg Urgency: {(person.avgUrgency || 0).toFixed(1)}
                                    </span>
                                    <ChevronRight className="h-4 w-4" />
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {person.issues.map((issue, i) => (
                                    <Badge 
                                      key={i} 
                                      variant="outline" 
                                      className="text-xs"
                                      style={{ borderColor: TOPIC_COLORS[issue.topic] || TOPIC_COLORS.other }}
                                    >
                                      {TOPIC_ICONS[issue.topic]}
                                      <span className="ml-1 capitalize">{issue.topic}</span>
                                      <span className="ml-1">({issue.count})</span>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No person data available
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="orgs" className="space-y-4">
                  {domainLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : domainData && domainData.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Issues by Organization</CardTitle>
                        <CardDescription>
                          Organizations (by email domain) associated with compliance issues
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[600px]">
                          <div className="space-y-3">
                            {domainData.map((org) => (
                              <div 
                                key={org.domain}
                                className="p-3 rounded-lg border hover-elevate cursor-pointer"
                                onClick={() => handleNavigateToDocReview({ domain: org.domain })}
                                data-testid={`org-card-${org.domain}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{org.domain}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <span>{org.totalMessages || 0} msgs</span>
                                    <span 
                                      className="font-medium"
                                      style={{ color: getUrgencyColor(org.avgUrgency || 0) }}
                                    >
                                      Avg Urgency: {(org.avgUrgency || 0).toFixed(1)}
                                    </span>
                                    <ChevronRight className="h-4 w-4" />
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {org.issues.map((issue, i) => (
                                    <Badge 
                                      key={i} 
                                      variant="outline" 
                                      className="text-xs"
                                      style={{ borderColor: TOPIC_COLORS[issue.topic] || TOPIC_COLORS.other }}
                                    >
                                      {TOPIC_ICONS[issue.topic]}
                                      <span className="ml-1 capitalize">{issue.topic}</span>
                                      <span className="ml-1">({issue.count})</span>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No organization data available
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  {timelineLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : timelineData && timelineData.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Issue Timeline</CardTitle>
                        <CardDescription>
                          Issue volume and urgency trends over time
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={timelineData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 11 }}
                                tickFormatter={(val) => {
                                  const d = new Date(val);
                                  return `${d.getMonth() + 1}/${d.getDate()}`;
                                }}
                              />
                              <YAxis yAxisId="left" />
                              <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                }}
                                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                              />
                              <Legend />
                              <Area 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="count" 
                                name="Message Volume"
                                fill="hsl(var(--primary) / 0.2)"
                                stroke="hsl(var(--primary))"
                              />
                              <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="avgUrgency" 
                                name="Avg Urgency"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={false}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No timeline data available
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="urgency" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          High Urgency Issues
                        </CardTitle>
                        <CardDescription>
                          Issues with urgency score 70 or higher
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2">
                            {filteredIssues
                              .filter(i => i.urgencyScore >= 70)
                              .sort((a, b) => b.urgencyScore - a.urgencyScore)
                              .map((issue) => (
                                <div 
                                  key={issue.id}
                                  className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover-elevate cursor-pointer"
                                  onClick={() => handleNavigateToDocReview({ topic: issue.topic })}
                                  data-testid={`urgency-card-${issue.id}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {TOPIC_ICONS[issue.topic]}
                                      <span className="font-medium capitalize">{issue.topic}</span>
                                    </div>
                                    <Badge variant="destructive">{issue.urgencyScore}</Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                                    {issue.issueSummary}
                                  </p>
                                </div>
                              ))}
                            {filteredIssues.filter(i => i.urgencyScore >= 70).length === 0 && (
                              <p className="text-center text-muted-foreground py-4">
                                No high urgency issues found
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-warning" />
                          Escalation Patterns
                        </CardTitle>
                        <CardDescription>
                          Issues with detected escalation language
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2">
                            {filteredIssues
                              .filter(i => i.hasEscalationLanguage)
                              .sort((a, b) => b.urgencyScore - a.urgencyScore)
                              .map((issue) => (
                                <div 
                                  key={issue.id}
                                  className="p-3 rounded-lg border border-warning/30 bg-warning/5 hover-elevate cursor-pointer"
                                  onClick={() => handleNavigateToDocReview({ topic: issue.topic })}
                                  data-testid={`escalation-card-${issue.id}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {TOPIC_ICONS[issue.topic]}
                                      <span className="font-medium capitalize">{issue.topic}</span>
                                    </div>
                                    <Badge variant="outline" className="border-warning text-warning">
                                      Escalation
                                    </Badge>
                                  </div>
                                  {issue.escalationPhrases.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {issue.escalationPhrases.slice(0, 3).map((phrase, i) => (
                                        <span key={i} className="text-xs text-warning italic">
                                          "{phrase}"
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            {filteredIssues.filter(i => i.hasEscalationLanguage).length === 0 && (
                              <p className="text-center text-muted-foreground py-4">
                                No escalation patterns detected
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="w-80 border-l bg-card p-4 hidden lg:block">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Insights
              </h3>
              {insightsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : insights ? (
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-4">
                    {insights.topIssues && insights.topIssues.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Top Issues</h4>
                        <div className="space-y-1">
                          {insights.topIssues.slice(0, 5).map((item, i) => (
                            <div 
                              key={i}
                              className="flex items-center justify-between text-sm p-2 rounded hover-elevate cursor-pointer"
                              onClick={() => handleNavigateToDocReview({ topic: item.topic })}
                            >
                              <span className="capitalize">{item.topic}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.highRiskPeople && insights.highRiskPeople.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-destructive" />
                          High Risk Individuals
                        </h4>
                        <div className="space-y-1">
                          {insights.highRiskPeople.slice(0, 5).map((person, i) => (
                            <div 
                              key={i}
                              className="flex items-center justify-between text-sm p-2 rounded hover-elevate cursor-pointer"
                              onClick={() => handleNavigateToDocReview({ participants: person.email })}
                            >
                              <span className="truncate">{formatEmailName(person.email)}</span>
                              <Badge variant="destructive" className="text-xs">
                                {person.riskScore.toFixed(1)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.emergingTopics && insights.emergingTopics.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Emerging Topics</h4>
                        <div className="flex flex-wrap gap-1">
                          {insights.emergingTopics.map((topic, i) => (
                            <Badge key={i} variant="outline" className="text-xs capitalize">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.anomalies && insights.anomalies.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Anomalies Detected</h4>
                        <div className="space-y-1">
                          {insights.anomalies.map((anomaly, i) => (
                            <p key={i} className="text-xs text-muted-foreground">
                              {anomaly}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">No insights available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
