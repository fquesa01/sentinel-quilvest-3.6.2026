import { useEffect, useState, useMemo } from "react";
import { useRoute, Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield, CheckCircle2, Video, FileText, Calendar, User, Mail as MailIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { 
  Case, 
  CaseParty, 
  CaseTimelineEvent, 
  Interview,
  Alert,
  Communication
} from "@shared/schema";

type DocumentSet = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  caseId: string | null;
  color: string | null;
  documentCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// Import all tab components
import { CaseHeader } from "@/components/case-detail/case-header";
import { CaseSearchBar } from "@/components/case-detail/case-search-bar";
import { OverviewTab } from "@/components/case-detail/overview-tab";
import { CourtDocketTab } from "@/components/case-detail/court-docket-tab";
import { EvidenceTab } from "@/components/case-detail/evidence-tab";
import { PartiesTab } from "@/components/case-detail/parties-tab";
import { CaseInterviewsSection } from "@/components/case-detail/case-interviews-section";
import { TimelineTab } from "@/components/case-detail/timeline-tab";
import { AnalyticsTab } from "@/components/case-detail/analytics-tab";
import { FindingsTab } from "@/components/case-detail/findings-tab";
import { RecordingsTab } from "@/components/case-detail/recordings-tab";
import { ProductionCenter } from "@/components/ediscovery/production-center";
import { SendAIInterviewDialog } from "@/components/case-detail/send-ai-interview-dialog";
import { AddPartyDialog } from "@/components/case-detail/add-party-dialog";
import { ScheduleLiveInterviewDialog } from "@/components/case-detail/schedule-live-interview-dialog";
import CaseSearchTermsPage from "@/pages/case-search-terms";
import { CaseChecklistTab } from "@/components/case-checklist/CaseChecklistTab";

export default function CaseDetail() {
  const [, params] = useRoute("/cases/:id");
  const caseId = params?.id;
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchString = useSearch();
  
  // Parse URL query parameters for navigation with filters
  const urlParams = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return {
      filterPerson: params.get("filterPerson") || undefined,
      filterKeyword: params.get("filterKeyword") || undefined,
      tab: params.get("tab") || undefined,
    };
  }, [searchString]);
  
  // Determine initial tab from URL or default to overview
  const getInitialTab = () => {
    if (urlParams.tab === "communications" || urlParams.tab === "evidence") {
      return "evidence";
    }
    if (urlParams.tab === "documents") {
      return "evidence";
    }
    if (urlParams.tab) {
      return urlParams.tab;
    }
    // If filter params are present, default to evidence tab
    if (urlParams.filterPerson || urlParams.filterKeyword) {
      return "evidence";
    }
    return "overview";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  // React to URL parameter changes - update active tab when filters change
  useEffect(() => {
    const newTab = getInitialTab();
    if (urlParams.filterPerson || urlParams.filterKeyword || urlParams.tab) {
      setActiveTab(newTab);
    }
  }, [urlParams.filterPerson, urlParams.filterKeyword, urlParams.tab]);
  
  const [sendInterviewDialogOpen, setSendInterviewDialogOpen] = useState(false);
  const [scheduleLiveDialogOpen, setScheduleLiveDialogOpen] = useState(false);
  const [addPartyDialogOpen, setAddPartyDialogOpen] = useState(false);
  const [prefilledPartyData, setPrefilledPartyData] = useState<{
    name?: string;
    email?: string;
    company?: string;
  } | null>(null);
  const [interviewDetailOpen, setInterviewDetailOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch case data
  const { data: caseData, isLoading: isLoadingCase } = useQuery<Case>({
    queryKey: ["/api/cases", caseId],
    enabled: !!caseId,
  });

  // Fetch case stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<{
    documentSetsCount: number;
    documentsCount: number;
    custodians: number;
    interviewsCompleted: number;
    interviewsScheduled: number;
    alertsCount: number;
  }>({
    queryKey: ["/api/cases", caseId, "stats"],
    enabled: !!caseId,
  });

  // Fetch AI analysis
  const { data: aiAnalysis, isLoading: isLoadingAnalysis } = useQuery<{
    aiSummaryText: string;
    keyFacts: string[];
    keyIndividuals: Array<{ name: string; role: string }>;
    keyEntities: string[];
    lawMatrix: Array<{ law: string; analysis: string }>;
    riskAssessmentText: string;
    suggestedNextSteps: string[];
    regulatorPerspective?: string;
    remediationThemes?: string[];
    lastGeneratedAt?: string;
    matterType?: string;
    matterTypeConfidence?: number;
    detectedLegalIssues?: Array<{ issue: string; description: string; severity: string; sources: string[] }>;
    documentsAnalyzedCount?: number;
    lastIncrementalUpdate?: string;
  }>({
    queryKey: ["/api/cases", caseId, "ai-analysis"],
    enabled: !!caseId,
  });

  // Fetch document sets filtered by caseId
  const { data: documentSets = [], isLoading: isLoadingDocSets } = useQuery<DocumentSet[]>({
    queryKey: ["/api/document-sets", `?caseId=${caseId}`],
    enabled: !!caseId,
  });

  // Fetch parties for this case
  const { data: parties = [], isLoading: isLoadingParties } = useQuery<CaseParty[]>({
    queryKey: ["/api/cases", caseId, "parties"],
    enabled: !!caseId,
  });

  // Fetch discovered entities from case evidence
  const { data: discoveredEntities, isLoading: isLoadingEntities } = useQuery<{
    entities: {
      email: string;
      name: string | null;
      domain: string;
      sentCount: number;
      receivedCount: number;
      totalCount: number;
      firstSeen: string | null;
      lastSeen: string | null;
    }[];
    organizations: {
      domain: string;
      personCount: number;
      messageCount: number;
    }[];
    mentionedEntities?: {
      name: string;
      email: string | null;
      domain: string | null;
      sent: number;
      received: number;
      totalMentions: number;
      documentCount: number;
      confidence: number;
      sourceType: "metadata" | "body";
      contexts: string[];
    }[];
    totalUniqueEntities: number;
    totalOrganizations: number;
    totalMentionedEntities?: number;
  }>({
    queryKey: ["/api/cases", caseId, "discovered-entities"],
    enabled: !!caseId,
  });

  // Extraction progress state
  const [isPollingProgress, setIsPollingProgress] = useState(false);

  // Poll for extraction progress
  const { data: extractionProgress } = useQuery<{
    caseId: string;
    totalDocuments: number;
    processedDocuments: number;
    entitiesFound: number;
    status: "pending" | "processing" | "completed" | "error" | "not_started";
    error?: string;
  }>({
    queryKey: ["/api/cases", caseId, "extract-entities", "progress"],
    enabled: !!caseId && isPollingProgress,
    refetchInterval: isPollingProgress ? 2000 : false, // Poll every 2 seconds while extracting
  });

  // Auto-stop polling and refresh when extraction completes
  useEffect(() => {
    if (extractionProgress?.status === "completed" || extractionProgress?.status === "error") {
      setIsPollingProgress(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "discovered-entities"] });
      
      if (extractionProgress.status === "completed") {
        toast({
          title: "Extraction Complete",
          description: `Found ${extractionProgress.entitiesFound} person names in ${extractionProgress.totalDocuments} documents.`,
        });
      } else if (extractionProgress.status === "error") {
        toast({
          title: "Extraction Error",
          description: extractionProgress.error || "An error occurred during extraction.",
          variant: "destructive",
        });
      }
    }
  }, [extractionProgress?.status, extractionProgress?.entitiesFound, extractionProgress?.totalDocuments, caseId, toast]);

  // Entity extraction mutation
  const extractEntitiesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/cases/${caseId}/extract-entities`, {});
    },
    onSuccess: () => {
      toast({
        title: "Extraction Started",
        description: "AI is analyzing documents to extract person names. This may take several minutes.",
      });
      // Start polling for progress
      setIsPollingProgress(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start entity extraction",
        variant: "destructive",
      });
    },
  });

  // Fetch interviews for this specific case
  const { data: interviews = [], isLoading: isLoadingInterviews } = useQuery<Interview[]>({
    queryKey: [`/api/cases/${caseId}/interviews`],
    enabled: !!caseId,
  });

  // Fetch alerts (if there's an alertId)
  const { data: alerts = [], isLoading: isLoadingAlerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    enabled: !!caseId,
  });

  // Fetch timeline events
  const { data: timelineEvents = [], isLoading: isLoadingTimeline } = useQuery<CaseTimelineEvent[]>({
    queryKey: ["/api/cases", caseId, "timeline"],
    enabled: !!caseId,
  });

  // Fetch evidence/communications for this specific case
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<Communication[]>({
    queryKey: [`/api/cases/${caseId}/communications`],
    enabled: !!caseId,
  });

  // Add party mutation
  const addPartyMutation = useMutation({
    mutationFn: async (values: any) => {
      return await apiRequest("POST", `/api/cases/${caseId}/parties`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "parties"] });
      setAddPartyDialogOpen(false);
      toast({
        title: "Party Added",
        description: "The party has been added to the case successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add party",
        variant: "destructive",
      });
    },
  });

  // Generate AI analysis mutation
  const generateAnalysisMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/cases/${caseId}/generate-ai-analysis`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "ai-analysis"] });
      toast({
        title: "AI Analysis Generated",
        description: "The case analysis has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update case description mutation (saves and then triggers AI analysis)
  const updateDescriptionMutation = useMutation({
    mutationFn: async (description: string) => {
      return await apiRequest("PATCH", `/api/cases/${caseId}`, { description });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      toast({
        title: "Description Saved",
        description: "Now generating AI analysis based on your summary...",
      });
      // Automatically trigger AI analysis after saving
      generateAnalysisMutation.mutate();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to save description",
        variant: "destructive",
      });
    },
  });

  // Handler to save description (called from OverviewTab)
  const handleSaveDescription = async (description: string) => {
    await updateDescriptionMutation.mutateAsync(description);
  };

  // Update AI Analysis mutation (for user edits to AI-generated content)
  const updateAIAnalysisMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest("PATCH", `/api/cases/${caseId}/ai-analysis`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "ai-analysis"] });
      toast({
        title: "AI Analysis Updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update AI analysis",
        variant: "destructive",
      });
    },
  });

  // Handler to save AI analysis edits (called from OverviewTab)
  // IMPORTANT: Merge existing aiAnalysis with partial updates to prevent data loss
  const handleSaveAIAnalysis = async (updates: Partial<typeof aiAnalysis>) => {
    // Merge existing data with updates to ensure we don't overwrite unedited fields
    // Include all fields including backend-managed ones like lastGeneratedAt
    const mergedData = {
      aiSummaryText: updates.aiSummaryText ?? aiAnalysis?.aiSummaryText ?? "",
      keyFacts: updates.keyFacts ?? aiAnalysis?.keyFacts ?? [],
      keyIndividuals: updates.keyIndividuals ?? aiAnalysis?.keyIndividuals ?? [],
      keyEntities: updates.keyEntities ?? aiAnalysis?.keyEntities ?? [],
      lawMatrix: updates.lawMatrix ?? aiAnalysis?.lawMatrix ?? [],
      riskAssessmentText: updates.riskAssessmentText ?? aiAnalysis?.riskAssessmentText ?? "",
      suggestedNextSteps: updates.suggestedNextSteps ?? aiAnalysis?.suggestedNextSteps ?? [],
      regulatorPerspective: updates.regulatorPerspective ?? aiAnalysis?.regulatorPerspective ?? "",
      remediationThemes: updates.remediationThemes ?? aiAnalysis?.remediationThemes ?? [],
      lastGeneratedAt: aiAnalysis?.lastGeneratedAt, // Preserve backend-managed timestamp
    };
    await updateAIAnalysisMutation.mutateAsync(mergedData);
  };

  // Action handlers
  const handleAddDocumentSet = () => {
    toast({
      title: "Add Document Set",
      description: "This feature will be implemented soon.",
    });
  };

  const handleAddParty = () => {
    setAddPartyDialogOpen(true);
  };

  const handleSendInterview = () => {
    setSendInterviewDialogOpen(true);
  };

  const handleRunAnalysis = () => {
    generateAnalysisMutation.mutate();
  };

  const handleRegenerateAnalysis = () => {
    generateAnalysisMutation.mutate();
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    // Search implementation will be added
  };

  if (isLoadingCase || !caseData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-96" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Calculate interview metrics
  const interviewMetrics = {
    total: interviews.length,
    completed: interviews.filter((i: any) => i.status === "completed").length,
    scheduled: interviews.filter((i: any) => i.status === "scheduled").length,
    pending: interviews.filter((i: any) => i.status === "pending" || i.status === "draft").length,
  };

  // Analytics data (empty initially - can be populated via AI analysis generation)
  const applicableLaws: any[] = [];
  const riskMetrics: any[] = [];
  const narrativeAnalysis: string | undefined = undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Back Button */}
        <div className="stagger-1">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cases
            </Button>
          </Link>
        </div>

        {/* Case Header */}
        <div className="stagger-2">
          <CaseHeader
            caseNumber={caseData.caseNumber}
          title={caseData.title}
          violationType={caseData.violationType}
          priority={caseData.priority}
          status={caseData.status}
          riskScore={caseData.riskScore}
          updatedAt={typeof caseData.updatedAt === 'string' ? caseData.updatedAt : caseData.updatedAt.toISOString()}
          ownerName={caseData.assignedTo || undefined}
          ownerInitials={caseData.assignedTo?.charAt(0)}
          stats={stats}
          onAddDocumentSet={handleAddDocumentSet}
          onAddParty={handleAddParty}
          onSendInterview={handleSendInterview}
          onRunAnalysis={handleRunAnalysis}
          />
        </div>

        {/* Case Search Bar */}
        <div className="stagger-3">
          <CaseSearchBar
            caseId={caseId!}
            onSearch={handleSearch}
            searchResults={[]}
            isSearching={false}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full stagger-4">
          <TabsList className="w-full justify-start flex-wrap h-auto" data-testid="tabs-case-war-room">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="docket" data-testid="tab-docket">
              Court Docket
            </TabsTrigger>
            <TabsTrigger value="evidence" data-testid="tab-evidence">
              Evidence
            </TabsTrigger>
            <TabsTrigger value="parties" data-testid="tab-parties">
              Parties & Custodians
            </TabsTrigger>
            <TabsTrigger value="interviews" data-testid="tab-interviews">
              Interviews
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">
              Timeline & Correspondence
            </TabsTrigger>
            <TabsTrigger value="findings" data-testid="tab-findings">
              Findings
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Applicable Law</TabsTrigger>
            <TabsTrigger value="recordings" data-testid="tab-recordings">Recordings</TabsTrigger>
            <TabsTrigger value="production" data-testid="tab-production">Production</TabsTrigger>
            <TabsTrigger value="search-terms" data-testid="tab-search-terms">Search Terms</TabsTrigger>
            <TabsTrigger value="case-checklist" data-testid="tab-case-checklist">Case Checklist</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="mt-0">
              <OverviewTab
                caseData={caseData}
                aiAnalysis={aiAnalysis}
                documentSets={documentSets}
                parties={parties}
                interviews={interviews}
                alerts={alerts}
                isLoadingAnalysis={isLoadingAnalysis || generateAnalysisMutation.isPending}
                isLoadingDocSets={isLoadingDocSets}
                isLoadingParties={isLoadingParties}
                isLoadingInterviews={isLoadingInterviews}
                isLoadingAlerts={isLoadingAlerts}
                isSavingDescription={updateDescriptionMutation.isPending}
                isSavingAIAnalysis={updateAIAnalysisMutation.isPending}
                onRegenerateAnalysis={handleRegenerateAnalysis}
                onSaveDescription={handleSaveDescription}
                onSaveAIAnalysis={handleSaveAIAnalysis}
                onViewAllDocSets={() => setActiveTab("evidence")}
                onViewAllParties={() => setActiveTab("parties")}
                onViewAllInterviews={() => setActiveTab("interviews")}
                onViewAllAlerts={() => setActiveTab("overview")}
              />
            </TabsContent>

            <TabsContent value="docket" className="mt-0">
              <CourtDocketTab caseId={caseId!} />
            </TabsContent>

            <TabsContent value="evidence" className="mt-0">
              <EvidenceTab
                caseId={caseId || ""}
                documents={documents.map((doc: any) => ({
                  id: doc.id,
                  subject: doc.subject,
                  sender: doc.sender,
                  recipients: (doc.recipients || []).map((r: any) => 
                    typeof r === 'string' ? r : (r.email || r.name || String(r))
                  ),
                  body: doc.body ?? undefined,
                  timestamp: doc.timestamp,
                  sourceType: doc.sourceType || "email_m365",
                  aiSnippet: doc.aiComplianceAnalysis || undefined,
                  isPrivileged: doc.privilegeStatus !== "none",
                  isHot: doc.riskLevel === "high" || doc.riskLevel === "critical",
                  isResponsive: true,
                  tags: [],
                }))}
                isLoading={isLoadingDocuments}
                onViewDocument={(id) => console.log("View document:", id)}
                onDownloadDocument={(id) => console.log("Download document:", id)}
                initialFilterPerson={urlParams.filterPerson}
                initialFilterKeyword={urlParams.filterKeyword}
              />
            </TabsContent>

            <TabsContent value="parties" className="mt-0">
              <PartiesTab
                caseId={caseId || ""}
                parties={parties.map((party: any) => ({
                  id: party.id,
                  name: party.name,
                  roleType: party.roleType || "employee",
                  caseRole: party.caseRole || "witness",
                  department: party.department,
                  company: party.company,
                  legalHoldStatus: party.legalHoldStatus || "none",
                  dataSources: 0,
                  interviewStatus: party.interviewStatus || "not_scheduled",
                  riskLevel: party.riskLevel || "low",
                }))}
                isLoading={isLoadingParties}
                discoveredEntities={discoveredEntities}
                isLoadingEntities={isLoadingEntities}
                isExtractingEntities={extractEntitiesMutation.isPending || isPollingProgress}
                extractionProgress={extractionProgress}
                onAddParty={handleAddParty}
                onIssueLegalHold={(id) => console.log("Issue legal hold:", id)}
                onSendInterview={(id) => console.log("Send interview:", id)}
                onViewProfile={(id) => console.log("View profile:", id)}
                onPromoteToParty={(entity) => {
                  setPrefilledPartyData({
                    name: entity.name || entity.email.split('@')[0],
                    email: entity.email,
                    company: entity.domain,
                  });
                  setAddPartyDialogOpen(true);
                }}
                onExtractEntities={() => extractEntitiesMutation.mutate()}
                onPromoteMentionedToParty={(entity) => {
                  setPrefilledPartyData({
                    name: entity.name,
                    email: entity.email || undefined,
                    company: entity.domain || undefined,
                  });
                  setAddPartyDialogOpen(true);
                }}
              />
            </TabsContent>

            <TabsContent value="interviews" className="mt-0">
              {caseData && (
                <CaseInterviewsSection caseId={caseId!} caseData={caseData} />
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <TimelineTab caseId={caseId!} />
            </TabsContent>
            <TabsContent value="findings" className="mt-0">
              <FindingsTab caseId={caseId!} />
            </TabsContent>
            <TabsContent value="analytics" className="mt-0">
              <AnalyticsTab
                applicableLaws={applicableLaws}
                riskMetrics={riskMetrics}
                narrativeAnalysis={narrativeAnalysis}
                isLoadingLaws={false}
                isLoadingRisk={false}
                onExportBoardSummary={() =>
                  toast({ title: "Exporting", description: "Board summary PDF will be downloaded soon." })
                }
                onExportRegulatorBrief={() =>
                  toast({ title: "Exporting", description: "Regulator brief will be downloaded soon." })
                }
              />
            </TabsContent>
            <TabsContent value="recordings" className="mt-0">
              <RecordingsTab caseId={caseId!} />
            </TabsContent>
            <TabsContent value="production" className="mt-0">
              <ProductionCenter caseId={caseId!} />
            </TabsContent>
            <TabsContent value="search-terms" className="mt-0">
              <CaseSearchTermsPage />
            </TabsContent>
            <TabsContent value="case-checklist" className="mt-0">
              <CaseChecklistTab caseId={caseId!} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Send AI Interview Dialog */}
        <SendAIInterviewDialog
          open={sendInterviewDialogOpen}
          onOpenChange={setSendInterviewDialogOpen}
          caseId={caseId!}
          parties={parties.map((party) => ({
            id: party.id,
            name: party.name,
            email: party.email || undefined,
            phone: party.phone || undefined,
          }))}
        />

        {/* Add Party Dialog */}
        <AddPartyDialog
          open={addPartyDialogOpen}
          onOpenChange={(open) => {
            setAddPartyDialogOpen(open);
            if (!open) setPrefilledPartyData(null);
          }}
          onSubmit={(values) => addPartyMutation.mutate(values)}
          isPending={addPartyMutation.isPending}
          prefilledData={prefilledPartyData}
        />

        {/* Schedule Live Interview Dialog */}
        <ScheduleLiveInterviewDialog
          open={scheduleLiveDialogOpen}
          onOpenChange={setScheduleLiveDialogOpen}
          caseId={caseId!}
          parties={parties.map((party) => ({
            id: party.id,
            name: party.name,
            email: party.email || undefined,
            phone: party.phone || undefined,
          }))}
        />

        {/* Interview Detail Dialog */}
        <Dialog open={interviewDetailOpen} onOpenChange={setInterviewDetailOpen}>
          <DialogContent className="max-w-2xl" data-testid="dialog-interview-detail">
            {selectedInterviewId && (() => {
              const selectedInterview = interviews.find(i => i.id === selectedInterviewId);
              if (!selectedInterview) return <p className="text-muted-foreground">Interview not found</p>;
              
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {selectedInterview.intervieweeName}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedInterview.interviewType?.replace(/_/g, " ").toUpperCase()} Interview
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground text-xs">Email</Label>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <MailIcon className="h-3 w-3" />
                              {selectedInterview.intervieweeEmail || "Not provided"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Type</Label>
                            <Badge variant="outline">
                              {selectedInterview.interviewType?.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground text-xs">Scheduled For</Label>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {selectedInterview.scheduledFor 
                                ? format(new Date(selectedInterview.scheduledFor), "MMM d, yyyy h:mm a")
                                : "Not scheduled"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Status</Label>
                            <Badge 
                              variant="outline" 
                              className={
                                selectedInterview.status === "completed" 
                                  ? "bg-green-500/10 text-green-700" 
                                  : selectedInterview.status === "scheduled"
                                  ? "bg-blue-500/10 text-blue-700"
                                  : "bg-gray-500/10 text-gray-700"
                              }
                            >
                              {selectedInterview.status?.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Compliance Info */}
                    <Card>
                      <CardContent className="pt-4">
                        <Label className="text-muted-foreground text-xs mb-2 block">Compliance Status</Label>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {selectedInterview.upjohnWarningGiven === "true" ? (
                              <Shield className="h-4 w-4 text-purple-600" />
                            ) : (
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">
                              Upjohn Warning: {selectedInterview.upjohnWarningGiven === "true" ? "Given" : "Not Given"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedInterview.consentObtained === "true" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">
                              Consent: {selectedInterview.consentObtained === "true" ? "Obtained" : "Not Obtained"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recording/Media */}
                    {(selectedInterview.recordingUrl || selectedInterview.transcriptText) && (
                      <Card>
                        <CardContent className="pt-4 space-y-2">
                          <Label className="text-muted-foreground text-xs">Media & Transcript</Label>
                          <div className="flex gap-2">
                            {selectedInterview.recordingUrl && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={selectedInterview.recordingUrl} target="_blank" rel="noopener noreferrer">
                                  <Video className="h-4 w-4 mr-1" />
                                  View Recording
                                </a>
                              </Button>
                            )}
                            {selectedInterview.transcriptText && (
                              <Button size="sm" variant="outline">
                                <FileText className="h-4 w-4 mr-1" />
                                View Transcript
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Notes */}
                    {selectedInterview.notes && (
                      <Card>
                        <CardContent className="pt-4">
                          <Label className="text-muted-foreground text-xs">Notes</Label>
                          <p className="text-sm mt-1">{selectedInterview.notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
