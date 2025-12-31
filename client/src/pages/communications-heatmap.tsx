import { useState, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Building2, 
  Tag, 
  AlertTriangle,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { 
  HeatmapFiltersBar, 
  type HeatmapFilters,
  type HeatmapView,
  type PersonOption,
} from "@/components/communications/HeatmapFiltersBar";
import {
  TimeOfDayHeatmap,
  PersonMatrixHeatmap,
  OrgMatrixHeatmap,
  TopicPersonHeatmap,
  AnomalyHeatmap,
} from "@/components/communications/HeatmapGrid";
import { InsightsPanel } from "@/components/communications/InsightsPanel";

interface CaseDetails {
  id: string;
  name: string;
  caseNumber: string;
}

export default function CommunicationsHeatmapPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [, setLocation] = useLocation();
  
  const [filters, setFilters] = useState<HeatmapFilters>({
    view: "time",
    topN: 20,
  });
  
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);

  const buildQueryParams = useCallback((baseFilters: HeatmapFilters) => {
    const params: Record<string, string> = {};
    if (baseFilters.dateFrom) params.dateFrom = baseFilters.dateFrom.toISOString();
    if (baseFilters.dateTo) params.dateTo = baseFilters.dateTo.toISOString();
    if (baseFilters.topN) params.topN = baseFilters.topN.toString();
    if (baseFilters.selectedPerson) params.selectedPerson = baseFilters.selectedPerson.toLowerCase();
    return new URLSearchParams(params).toString();
  }, []);

  const { data: caseDetails } = useQuery<CaseDetails>({
    queryKey: ["/api/cases", caseId],
    enabled: !!caseId,
  });

  const { data: timeData, isLoading: timeLoading } = useQuery({
    queryKey: ["/api/cases", caseId, "communications/heatmap/time", buildQueryParams(filters)],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/communications/heatmap/time?${buildQueryParams(filters)}`);
      if (!res.ok) throw new Error("Failed to fetch time heatmap");
      return res.json();
    },
    enabled: !!caseId && filters.view === "time",
  });

  const { data: personData, isLoading: personLoading } = useQuery({
    queryKey: ["/api/cases", caseId, "communications/heatmap/person-matrix", buildQueryParams(filters)],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/communications/heatmap/person-matrix?${buildQueryParams(filters)}`);
      if (!res.ok) throw new Error("Failed to fetch person matrix");
      return res.json();
    },
    enabled: !!caseId && filters.view === "people",
  });

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ["/api/cases", caseId, "communications/heatmap/org-matrix", buildQueryParams(filters)],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/communications/heatmap/org-matrix?${buildQueryParams(filters)}`);
      if (!res.ok) throw new Error("Failed to fetch org matrix");
      return res.json();
    },
    enabled: !!caseId && filters.view === "orgs",
  });

  const { data: topicData, isLoading: topicLoading } = useQuery({
    queryKey: ["/api/cases", caseId, "communications/heatmap/topic", buildQueryParams(filters)],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/communications/heatmap/topic?${buildQueryParams(filters)}`);
      if (!res.ok) throw new Error("Failed to fetch topic heatmap");
      return res.json();
    },
    enabled: !!caseId && filters.view === "topics",
  });

  const { data: anomalyData, isLoading: anomalyLoading } = useQuery({
    queryKey: ["/api/cases", caseId, "communications/heatmap/anomalies", buildQueryParams(filters)],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/communications/heatmap/anomalies?${buildQueryParams(filters)}`);
      if (!res.ok) throw new Error("Failed to fetch anomaly data");
      return res.json();
    },
    enabled: !!caseId && filters.view === "anomalies",
  });

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/cases", caseId, "communications/heatmap/insights", buildQueryParams(filters)],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/communications/heatmap/insights?${buildQueryParams(filters)}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
    enabled: !!caseId,
  });

  const handlePersonPairClick = useCallback((personA: string, personB: string) => {
    const params = new URLSearchParams();
    params.set("sender", personA);
    params.set("recipient", personB);
    setLocation(`/cases/${caseId}/document-review?${params.toString()}`);
  }, [caseId, setLocation]);

  const getViewIcon = (view: HeatmapView) => {
    switch (view) {
      case "time": return <Clock className="h-5 w-5" />;
      case "people": return <Users className="h-5 w-5" />;
      case "orgs": return <Building2 className="h-5 w-5" />;
      case "topics": return <Tag className="h-5 w-5" />;
      case "anomalies": return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getViewTitle = (view: HeatmapView) => {
    switch (view) {
      case "time": return "Time-Based Activity";
      case "people": return "Person-to-Person Matrix";
      case "orgs": return "Organization Matrix";
      case "topics": return "Topic Analysis";
      case "anomalies": return "Anomaly Detection";
    }
  };

  const isLoading = useMemo(() => {
    switch (filters.view) {
      case "time": return timeLoading;
      case "people": return personLoading;
      case "orgs": return orgLoading;
      case "topics": return topicLoading;
      case "anomalies": return anomalyLoading;
      default: return false;
    }
  }, [filters.view, timeLoading, personLoading, orgLoading, topicLoading, anomalyLoading]);

  const personOptions: PersonOption[] = useMemo(() => {
    if (!insightsData?.topCommunicators) return [];
    return insightsData.topCommunicators.map((person: any) => ({
      email: person.email.toLowerCase(),
      name: person.name,
      totalMessages: person.totalMessages,
    }));
  }, [insightsData?.topCommunicators]);

  const toggleInsightsCollapse = useCallback(() => {
    setInsightsCollapsed((prev) => !prev);
  }, []);

  return (
    <>
      <Helmet>
        <title>Communications Heatmap - {caseDetails?.name || "Case"} | Sentinel Counsel</title>
      </Helmet>

      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/cases/${caseId}`)}
              data-testid="button-back-to-case"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Case
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {getViewIcon(filters.view)}
                Communications Heatmap
              </h1>
              {caseDetails && (
                <p className="text-sm text-muted-foreground">
                  {caseDetails.name} ({caseDetails.caseNumber})
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {getViewTitle(filters.view)}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <HeatmapFiltersBar
            filters={filters}
            onFiltersChange={setFilters}
            loading={isLoading}
            personOptions={personOptions}
          />
        </div>

        <div className="flex-1 p-4 pt-0 min-h-0">
          <div className="flex gap-4 h-full">
            <div className="flex-1 min-w-0 overflow-auto">
              {filters.view === "time" && (
                <TimeOfDayHeatmap
                  data={timeData?.data || []}
                  loading={timeLoading}
                  onCellClick={(dayOfWeek, hour) => {
                    console.log(`Clicked: Day ${dayOfWeek}, Hour ${hour}`);
                  }}
                />
              )}

              {filters.view === "people" && (
                <PersonMatrixHeatmap
                  people={personData?.people || []}
                  matrix={personData?.matrix || []}
                  loading={personLoading}
                  onCellClick={handlePersonPairClick}
                />
              )}

              {filters.view === "orgs" && (
                <OrgMatrixHeatmap
                  domains={orgData?.domains || []}
                  matrix={orgData?.matrix || []}
                  loading={orgLoading}
                  onCellClick={(domainA, domainB) => {
                    console.log(`Clicked: ${domainA} <-> ${domainB}`);
                  }}
                />
              )}

              {filters.view === "topics" && (
                <TopicPersonHeatmap
                  topics={topicData?.topics || []}
                  people={topicData?.people || []}
                  matrix={topicData?.matrix || []}
                  loading={topicLoading}
                  onCellClick={(topic, person) => {
                    console.log(`Clicked: Topic "${topic}" by ${person}`);
                  }}
                />
              )}

              {filters.view === "anomalies" && (
                <AnomalyHeatmap
                  data={anomalyData?.entities || []}
                  loading={anomalyLoading}
                  onCellClick={(entity, month) => {
                    console.log(`Clicked: ${entity} in ${month}`);
                  }}
                />
              )}
            </div>

            <div 
              className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
                insightsCollapsed ? "w-14" : "w-80"
              }`}
            >
              <InsightsPanel
                insights={insightsData}
                loading={insightsLoading}
                onPersonClick={(email) => {
                  setFilters((f) => ({ ...f, view: "people" }));
                }}
                onDomainClick={(domain) => {
                  setFilters((f) => ({ ...f, view: "orgs" }));
                }}
                collapsed={insightsCollapsed}
                onToggleCollapse={toggleInsightsCollapse}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
