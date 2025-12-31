import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import StartPage from "@/pages/start";
import Dashboard from "@/pages/dashboard";
import Communications from "@/pages/communications";
import CommunicationDetail from "@/pages/communication-detail";
import CommunicationAnalytics from "@/pages/communication-analytics";
import Alerts from "@/pages/alerts";
import CasesPage from "@/pages/cases";
import CaseDetail from "@/pages/case-detail";
import AttorneyQueue from "@/pages/attorney-queue";
import KnowledgeBase from "@/pages/knowledge-base";
import Interviews from "@/pages/interviews";
import Analytics from "@/pages/analytics";
import UserManagement from "@/pages/user-management";
import EmployeeDashboard from "@/pages/employee-dashboard";
import RegulatoryChanges from "@/pages/regulatory-changes";
import GRCDashboard from "@/pages/grc-dashboard";
import GrcRisks from "@/pages/grc-risks";
import GrcControls from "@/pages/grc-controls";
import GrcIncidents from "@/pages/grc-incidents";
import RiskDashboard from "@/pages/risk-dashboard";
import RiskRegister from "@/pages/risk-register";
import RiskDetail from "@/pages/risk-detail";
import RiskAssessments from "@/pages/risk-assessments";
import RiskAssessmentDetail from "@/pages/risk-assessment-detail";
import KeyRiskIndicators from "@/pages/key-risk-indicators";
import KriDetail from "@/pages/kri-detail";
import RiskAppetitePage from "@/pages/risk-appetite";
import RiskAppetiteDetail from "@/pages/risk-appetite-detail";
import BowTieAnalysis from "@/pages/bow-tie-analysis";
import BowTieDetail from "@/pages/bow-tie-detail";
import BusinessContinuity from "@/pages/business-continuity";
import BcpDetail from "@/pages/bcp-detail";
import VendorRiskPage from "@/pages/vendor-risk";
import ExecutiveAnalytics from "@/pages/executive-analytics";
import ManagementAnalytics from "@/pages/management-analytics";
import EDiscoveryPage from "@/pages/ediscovery";
import DocumentReviewPage from "@/pages/document-review";
import CollectionsPage from "@/pages/collections";
import RulePacksPage from "@/pages/rule-packs";
import ComplianceWorkflowsPage from "@/pages/compliance-workflows";
import PrivilegeReviewQueue from "@/pages/privilege-review-queue";
import PrivilegeLog from "@/pages/privilege-log";
import AttorneyReviewQueue from "@/pages/attorney-review-queue";
import RemediationPlans from "@/pages/remediation-plans";
import RegulatoryStrategies from "@/pages/regulatory-strategies";
import DisclosurePlaybooks from "@/pages/disclosure-playbooks";
import BoardReports from "@/pages/board-reports";
import WhistleblowerReport from "@/pages/whistleblower-report";
import WhistleblowerConfirmation from "@/pages/whistleblower-confirmation";
import WhistleblowerLookup from "@/pages/whistleblower-lookup";
import RulesDashboard from "@/pages/rules-dashboard";
import RuleBuilder from "@/pages/rule-builder";
import PoliciesTraining from "@/pages/policies-training";
import TagManagement from "@/pages/tag-management";
import DocumentSets from "@/pages/document-sets";
import AdminDashboard from "@/pages/admin-dashboard";
import MonitoringDirectory from "@/pages/monitoring-directory";
import MonitoringProfile from "@/pages/monitoring-profile";
import PersonToPersonCommunications from "@/pages/person-to-person-communications";
import MailboxPage from "@/pages/mailbox";
import EmailIntegrationPage from "@/pages/email-integration";
import CrisisIntake from "@/pages/crisis-intake";
import BusinessIntelligence from "@/pages/business-intelligence";
import DocumentIngestion from "@/pages/document-ingestion";
import ReportsProductions from "@/pages/reports-productions";
import ChatReviewPage from "@/pages/chat-review";
import CommunicationsHeatmap from "@/pages/communications-heatmap";
import IssueHeatmap from "@/pages/issue-heatmap";
import IssueHeatmapLanding from "@/pages/issue-heatmap-landing";
import MyQueue from "@/pages/my-queue";
import TransactionsDashboard from "@/pages/transactions-dashboard";
import TransactionsDeals from "@/pages/transactions-deals";
import TransactionsDealDetail from "@/pages/transactions-deal-detail";
import TransactionsRequestLists from "@/pages/transactions-request-lists";
import TransactionsRequestListDetail from "@/pages/transactions-request-list-detail";
import TransactionsDataRooms from "@/pages/transactions-data-rooms";
import TransactionsDataRoomDetail from "@/pages/transactions-data-room-detail";
import TransactionsChecklists from "@/pages/transactions-checklists";
import TransactionsChecklistDetail from "@/pages/transactions-checklist-detail";
import TransactionsDealChecklistDetail from "@/pages/transactions-deal-checklist-detail";
import TransactionsDealTemplateDetail from "@/pages/transactions-deal-template-detail";
import TransactionsDealTerms from "@/pages/transactions-deal-terms";
import TransactionsDocumentSearch from "@/pages/transactions-document-search";
import TransactionsTemplates from "@/pages/transactions-templates";
import BackgroundResearch from "@/pages/background-research";
import BackgroundResearchDetail from "@/pages/background-research-detail";
import LiveInterviewPage from "@/pages/live-interview";
import AmbientIntelligence from "@/pages/ambient-intelligence";
import VideoMeetingPage from "@/pages/video-meeting";
import CreateVideoMeetingPage from "@/pages/create-video-meeting";
import AmbientSession from "@/pages/ambient-session";
import PrivilegedResearch from "@/pages/privileged-research";
import InterviewReviewPage from "@/pages/interview-review";
import JoinInterview from "@/pages/join-interview";
import WitnessInterview from "@/pages/witness-interview";
import StatementDetailPage from "@/pages/statement-detail";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleSwitcher } from "@/components/role-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const InterviewSession = lazy(() => import("@/pages/interview-session"));

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              <RoleSwitcher />
              <NotificationBell />
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.href = "/api/logout"}
                    data-testid="button-sign-out"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                {() => <Redirect to="/start" />}
              </Route>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/communications" component={Communications} />
              <Route path="/communications/:id" component={CommunicationDetail} />
              <Route path="/communication-analytics" component={CommunicationAnalytics} />
              <Route path="/alerts" component={Alerts} />
              <Route path="/cases" component={CasesPage} />
              <Route path="/cases/:id" component={CaseDetail} />
              <Route path="/cases/:caseId/communications-heatmap" component={CommunicationsHeatmap} />
              <Route path="/cases/:caseId/issue-heatmap" component={IssueHeatmap} />
              <Route path="/cases/:caseId/statements/:statementId" component={StatementDetailPage} />
              <Route path="/issue-heatmap" component={IssueHeatmapLanding} />
              <Route path="/my-queue" component={MyQueue} />
              <Route path="/ambient-intelligence" component={AmbientIntelligence} />
              <Route path="/ambient-intelligence/:sessionId" component={AmbientSession} />
              <Route path="/privileged-research" component={PrivilegedResearch} />
              <Route path="/privileged-research/:sessionId" component={PrivilegedResearch} />
              <Route path="/attorney-queue" component={AttorneyQueue} />
              <Route path="/knowledge-base" component={KnowledgeBase} />
              <Route path="/interviews" component={Interviews} />
              <Route path="/create-video-meeting" component={CreateVideoMeetingPage} />
              <Route path="/live-interview/:sessionId" component={LiveInterviewPage} />
              <Route path="/interviews/:sessionId/review" component={InterviewReviewPage} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/executive-analytics" component={ExecutiveAnalytics} />
              <Route path="/management-analytics" component={ManagementAnalytics} />
              <Route path="/users" component={UserManagement} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/regulatory-changes" component={RegulatoryChanges} />
              <Route path="/employee/compliance" component={EmployeeDashboard} />
              <Route path="/grc" component={GRCDashboard} />
              <Route path="/grc/risks" component={GrcRisks} />
              <Route path="/grc/controls" component={GrcControls} />
              <Route path="/grc/incidents" component={GrcIncidents} />
              <Route path="/risk-management" component={RiskDashboard} />
              <Route path="/risk-management/register" component={RiskRegister} />
              <Route path="/risk-management/risk/:id" component={RiskDetail} />
              <Route path="/risk-management/assessments" component={RiskAssessments} />
              <Route path="/risk-management/assessments/:id" component={RiskAssessmentDetail} />
              <Route path="/risk-management/kris" component={KeyRiskIndicators} />
              <Route path="/risk-management/kris/:id" component={KriDetail} />
              <Route path="/risk-management/risk-appetite" component={RiskAppetitePage} />
              <Route path="/risk-management/risk-appetite/:id" component={RiskAppetiteDetail} />
              <Route path="/risk-management/bow-tie" component={BowTieAnalysis} />
              <Route path="/risk-management/bow-tie/:id" component={BowTieDetail} />
              <Route path="/risk-management/bcp" component={BusinessContinuity} />
              <Route path="/risk-management/bcp/:id" component={BcpDetail} />
              <Route path="/risk-management/controls" component={GrcControls} />
              <Route path="/risk-management/incidents" component={GrcIncidents} />
              <Route path="/transactions/dashboard" component={TransactionsDashboard} />
              <Route path="/transactions/deals" component={TransactionsDeals} />
              <Route path="/transactions/deals/:id" component={TransactionsDealDetail} />
              <Route path="/transactions/deals/:id/terms" component={TransactionsDealTerms} />
              <Route path="/transactions/request-lists" component={TransactionsRequestLists} />
              <Route path="/transactions/request-lists/:id" component={TransactionsRequestListDetail} />
              <Route path="/transactions/data-rooms" component={TransactionsDataRooms} />
              <Route path="/transactions/data-rooms/:roomId" component={TransactionsDataRoomDetail} />
              <Route path="/transactions/checklists" component={TransactionsChecklists} />
              <Route path="/transactions/checklists/:id" component={TransactionsChecklistDetail} />
              <Route path="/transactions/deal-checklists/:id" component={TransactionsDealChecklistDetail} />
              <Route path="/transactions/search" component={TransactionsDocumentSearch} />
              <Route path="/transactions/templates" component={TransactionsTemplates} />
              <Route path="/transactions/deal-templates/:templateId" component={TransactionsDealTemplateDetail} />
              <Route path="/background-research" component={BackgroundResearch} />
              <Route path="/background-research/:id" component={BackgroundResearchDetail} />
              <Route path="/vendor-risk" component={VendorRiskPage} />
              <Route path="/ediscovery" component={EDiscoveryPage} />
              <Route path="/collections" component={CollectionsPage} />
              <Route path="/rule-packs" component={RulePacksPage} />
              <Route path="/workflows" component={ComplianceWorkflowsPage} />
              <Route path="/privilege-review" component={PrivilegeReviewQueue} />
              <Route path="/privilege-log" component={PrivilegeLog} />
              <Route path="/attorney-review" component={AttorneyReviewQueue} />
              <Route path="/remediation-plans" component={RemediationPlans} />
              <Route path="/regulatory-strategies" component={RegulatoryStrategies} />
              <Route path="/disclosure-playbooks" component={DisclosurePlaybooks} />
              <Route path="/board-reports" component={BoardReports} />
              <Route path="/report" component={WhistleblowerReport} />
              <Route path="/report/confirmation" component={WhistleblowerConfirmation} />
              <Route path="/report/lookup" component={WhistleblowerLookup} />
              <Route path="/rules" component={RulesDashboard} />
              <Route path="/rules/builder" component={RuleBuilder} />
              <Route path="/policies-training" component={PoliciesTraining} />
              <Route path="/tags" component={TagManagement} />
              <Route path="/document-sets" component={DocumentSets} />
              <Route path="/monitoring/directory" component={MonitoringDirectory} />
              <Route path="/monitoring/profile/:type/:id" component={MonitoringProfile} />
              <Route path="/monitoring/communications/:type/:personId/:contactType/:contactId" component={PersonToPersonCommunications} />
              <Route path="/mailbox" component={MailboxPage} />
              <Route path="/email-integration" component={EmailIntegrationPage} />
              <Route path="/crisis-intake" component={CrisisIntake} />
              <Route path="/business-intelligence" component={BusinessIntelligence} />
              <Route path="/ingestion" component={DocumentIngestion} />
              <Route path="/reports-productions" component={ReportsProductions} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Switch>
        {/* Short interview link redirects to full interview session (AI invites) */}
        <Route path="/interview/:token">
          {(params) => <Redirect to={`/interview-session/${params.token}`} />}
        </Route>
        {/* Join scheduled interview by access token */}
        <Route path="/join-interview/:token" component={JoinInterview} />
        {/* Witness video interview recording */}
        <Route path="/witness-interview/:token" component={WitnessInterview} />
        {/* Video meeting room - accessible to guests without authentication */}
        <Route path="/video-meeting/:roomId" component={VideoMeetingPage} />
        <Route path="/interview-session/:token">
          {() => (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-screen">
                  <div className="text-lg">Loading interview session...</div>
                </div>
              }
            >
              <InterviewSession />
            </Suspense>
          )}
        </Route>
        {/* Start page - Emma-powered landing after login */}
        <Route path="/start">
          {() => isAuthenticated ? <StartPage /> : <Landing />}
        </Route>
        {/* Document Review has its own sidebar management */}
        <Route path="/document-review">
          {() => isAuthenticated ? <DocumentReviewPage /> : <Landing />}
        </Route>
        {/* Case-scoped Document Review (from heatmap navigation) */}
        <Route path="/cases/:caseId/document-review">
          {(params) => isAuthenticated ? <DocumentReviewPage routeParams={params} /> : <Landing />}
        </Route>
        {/* Chat Review has its own sidebar management */}
        <Route path="/chat-review">
          {() => isAuthenticated ? <ChatReviewPage /> : <Landing />}
        </Route>
        {/* Case-scoped Chat Review */}
        <Route path="/cases/:caseId/chat-review">
          {() => isAuthenticated ? <ChatReviewPage /> : <Landing />}
        </Route>
        <Route>
          {() =>
            isAuthenticated ? (
              <AuthenticatedApp />
            ) : (
              <Switch>
                <Route path="/" component={Landing} />
                <Route path="/report" component={WhistleblowerReport} />
                <Route path="/report/confirmation" component={WhistleblowerConfirmation} />
                <Route path="/report/lookup" component={WhistleblowerLookup} />
                <Route component={Landing} />
              </Switch>
            )
          }
        </Route>
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
