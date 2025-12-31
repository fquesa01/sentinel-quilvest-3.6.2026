import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, Users, MessageSquare, Clock, Loader2, BarChart3, Brain, Mail } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface TopicCluster {
  topic: string;
  score: number;
  exemplars: string[];
  relatedCommunicationIds: string[];
  keyPhrases: string[];
}

interface Collaborator {
  name: string;
  email: string;
  messageCount: number;
}

interface AnalyticsResult {
  id: string;
  employeeId: string;
  topics: TopicCluster[];
  patterns: {
    topCollaborators: Collaborator[];
    peakHours: number[];
    communicationBreakdown: Record<string, number>;
  };
  metrics: {
    totalCommunications: number;
    sentMessages: number;
    receivedMessages: number;
    avgDailyMessages: number;
    busyDays: string[];
    communicationVelocity: number;
  };
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    stressIndicators: string[];
  };
  dateRangeStart: string;
  dateRangeEnd: string;
  status: string;
}

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#eab308",
  negative: "#ef4444",
};

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f97316"];

export default function ManagementAnalyticsPage() {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 90),
    end: new Date(),
  });
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);

  // Fetch employees list
  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/management/employees"],
  });

  // Fetch analytics results
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsResult>({
    queryKey: ["/api/management/employee-analytics", analyticsId],
    enabled: !!analyticsId,
  });

  // Generate analytics mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) {
        throw new Error("Please select an employee");
      }

      const response = await apiRequest("POST", "/api/management/employee-analytics", {
        employeeId: selectedEmployee,
        dateRangeStart: dateRange.start.toISOString(),
        dateRangeEnd: dateRange.end.toISOString(),
      });

      return response;
    },
    onSuccess: (data) => {
      setAnalyticsId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/management/employee-analytics", data.id] });
      toast({
        title: "Analysis Complete",
        description: "Employee communication analytics have been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "Failed to generate analytics. Please try again.",
      });
    },
  });

  const selectedEmployeeData = employees?.find((e) => e.id === selectedEmployee);

  // Prepare chart data
  const topicsChartData = analytics?.topics.slice(0, 10).map((t) => ({
    name: t.topic,
    score: t.score,
  })) || [];

  const collaboratorsChartData = analytics?.patterns.topCollaborators.slice(0, 10).map((c) => ({
    name: c.name,
    messages: c.messageCount,
  })) || [];

  const sentimentChartData = analytics ? [
    { name: "Positive", value: analytics.sentiment.positiveCount, color: SENTIMENT_COLORS.positive },
    { name: "Neutral", value: analytics.sentiment.neutralCount, color: SENTIMENT_COLORS.neutral },
    { name: "Negative", value: analytics.sentiment.negativeCount, color: SENTIMENT_COLORS.negative },
  ] : [];

  const communicationTypeData = analytics ? Object.entries(analytics.patterns.communicationBreakdown).map(([type, count], idx) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    count,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  })) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-management-analytics">
            Management Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered employee communication insights for business efficiency and management
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Analytics Report</CardTitle>
              <CardDescription>
                Select an employee and date range to analyze communication patterns using AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Employee Selector */}
                <div className="col-span-1 md:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Employee</label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                    disabled={loadingEmployees || generateMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-employee">
                      <SelectValue placeholder="Select an employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.start && "text-muted-foreground"
                        )}
                        disabled={generateMutation.isPending}
                        data-testid="button-date-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.start ? format(dateRange.start, "PP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" data-testid="popover-date-start">
                      <Calendar
                        mode="single"
                        selected={dateRange.start}
                        onSelect={(date) => date && setDateRange({ ...dateRange, start: date })}
                        initialFocus
                        data-testid="calendar-date-start"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.end && "text-muted-foreground"
                        )}
                        disabled={generateMutation.isPending}
                        data-testid="button-date-end"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.end ? format(dateRange.end, "PP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" data-testid="popover-date-end">
                      <Calendar
                        mode="single"
                        selected={dateRange.end}
                        onSelect={(date) => date && setDateRange({ ...dateRange, end: date })}
                        initialFocus
                        data-testid="calendar-date-end"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!selectedEmployee || generateMutation.isPending}
                className="mt-4"
                data-testid="button-generate-analytics"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Communications...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate Analytics
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loadingAnalytics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {/* Analytics Results */}
          {analytics && selectedEmployeeData && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedEmployeeData.firstName} {selectedEmployeeData.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(analytics.dateRangeStart), "PP")} -{" "}
                    {format(new Date(analytics.dateRangeEnd), "PP")}
                  </p>
                </div>
                <Badge
                  variant={
                    analytics.sentiment.overall === "positive"
                      ? "default"
                      : analytics.sentiment.overall === "negative"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-sm"
                  data-testid="badge-overall-sentiment"
                >
                  {analytics.sentiment.overall.charAt(0).toUpperCase() +
                    analytics.sentiment.overall.slice(1)}{" "}
                  Sentiment
                </Badge>
              </div>

              {/* Metrics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Communications</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-communications">
                      {analytics.metrics.totalCommunications.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.metrics.sentMessages} sent, {analytics.metrics.receivedMessages} received
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-daily-average">
                      {analytics.metrics.avgDailyMessages}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Messages per day</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Communication Velocity</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-velocity">
                      {analytics.metrics.communicationVelocity}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Messages per working hour</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Busiest Days</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">
                      {analytics.metrics.busyDays.slice(0, 2).join(", ")}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Peak activity days</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Top 10 Topics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Top 10 Discussion Topics
                    </CardTitle>
                    <CardDescription>AI-identified topics from communication content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={topicsChartData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Collaborators */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Top Collaborators
                    </CardTitle>
                    <CardDescription>Most frequent communication partners</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={collaboratorsChartData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip />
                        <Bar dataKey="messages" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Sentiment Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Sentiment Analysis
                    </CardTitle>
                    <CardDescription>Overall communication tone</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={sentimentChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {sentimentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    {analytics.sentiment.stressIndicators.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Stress Indicators:</p>
                        <div className="flex flex-wrap gap-2">
                          {analytics.sentiment.stressIndicators.slice(0, 5).map((indicator, idx) => (
                            <Badge key={idx} variant="outline">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Communication Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Communication Channels
                    </CardTitle>
                    <CardDescription>Distribution across communication types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={communicationTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.count}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {communicationTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Topic Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Topic Details & Key Phrases</CardTitle>
                  <CardDescription>Detailed breakdown of identified topics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topics.slice(0, 10).map((topic, idx) => (
                      <div key={idx} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{topic.topic}</h4>
                          <Badge variant="secondary">{topic.score}% relevance</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topic.keyPhrases.map((phrase, pidx) => (
                            <Badge key={pidx} variant="outline" className="text-xs">
                              {phrase}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
