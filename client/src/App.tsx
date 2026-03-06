import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import StartPage from "@/pages/start";
import Dashboard from "@/pages/dashboard";
import Communications from "@/pages/communications";
import CommunicationDetail from "@/pages/communication-detail";
import CommunicationAnalytics from "@/pages/communication-analytics";
import Alerts from "@/pages/alerts";
import ClientsPage from "@/pages/clients";
import CalendarPage from "@/pages/calendar";
import AttorneyQueue from "@/pages/attorney-queue";
import Analytics from "@/pages/analytics";
import UserManagement from "@/pages/user-management";
import EmployeeDashboard from "@/pages/employee-dashboard";
import ExecutiveAnalytics from "@/pages/executive-analytics";
import ManagementAnalytics from "@/pages/management-analytics";
import EDiscoveryPage from "@/pages/ediscovery";
import DocumentReviewPage from "@/pages/document-review";
import CollectionsPage from "@/pages/collections";
import PrivilegeReviewQueue from "@/pages/privilege-review-queue";
import PrivilegeLog from "@/pages/privilege-log";
import AttorneyReviewQueue from "@/pages/attorney-review-queue";
import WhistleblowerReport from "@/pages/whistleblower-report";
import WhistleblowerConfirmation from "@/pages/whistleblower-confirmation";
import WhistleblowerLookup from "@/pages/whistleblower-lookup";
import TagManagement from "@/pages/tag-management";
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
import AmbientIntelligence from "@/pages/ambient-intelligence";
import VideoMeetingPage from "@/pages/video-meeting";
import AmbientSession from "@/pages/ambient-session";
import PrivilegedResearch from "@/pages/privileged-research";
import PEDealPipeline from "@/pages/pe-deal-pipeline";
import PEDealDetail from "@/pages/pe-deal-detail";
import PEDealIntelligence from "@/pages/pe-deal-intelligence";
import RelationshipIntelligence from "@/pages/relationship-intelligence";
import RelationshipContacts from "@/pages/relationship-contacts";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleSwitcher } from "@/components/role-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


function AuthenticatedApp() {
  const { signOut } = useAuth();
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
                    onClick={() => signOut()}
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
              <Route path="/clients" component={ClientsPage} />
              <Route path="/issue-heatmap" component={IssueHeatmapLanding} />
              <Route path="/my-queue" component={MyQueue} />
              <Route path="/ambient-intelligence" component={AmbientIntelligence} />
              <Route path="/ambient-intelligence/:sessionId" component={AmbientSession} />
              <Route path="/privileged-research" component={PrivilegedResearch} />
              <Route path="/privileged-research/:sessionId" component={PrivilegedResearch} />
              <Route path="/calendar" component={CalendarPage} />
              <Route path="/attorney-queue" component={AttorneyQueue} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/executive-analytics" component={ExecutiveAnalytics} />
              <Route path="/management-analytics" component={ManagementAnalytics} />
              <Route path="/users" component={UserManagement} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/employee/compliance" component={EmployeeDashboard} />
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
              <Route path="/pe/deals" component={PEDealPipeline} />
              <Route path="/pe/deals/:id" component={PEDealDetail} />
              <Route path="/pe/deal-intelligence" component={PEDealIntelligence} />
              <Route path="/background-research" component={BackgroundResearch} />
              <Route path="/background-research/:id" component={BackgroundResearchDetail} />
              <Route path="/ediscovery" component={EDiscoveryPage} />
              <Route path="/collections" component={CollectionsPage} />
              <Route path="/privilege-review" component={PrivilegeReviewQueue} />
              <Route path="/privilege-log" component={PrivilegeLog} />
              <Route path="/attorney-review" component={AttorneyReviewQueue} />
              <Route path="/report" component={WhistleblowerReport} />
              <Route path="/report/confirmation" component={WhistleblowerConfirmation} />
              <Route path="/report/lookup" component={WhistleblowerLookup} />
              <Route path="/tags" component={TagManagement} />
              <Route path="/monitoring/directory" component={MonitoringDirectory} />
              <Route path="/monitoring/profile/:type/:id" component={MonitoringProfile} />
              <Route path="/monitoring/communications/:type/:personId/:contactType/:contactId" component={PersonToPersonCommunications} />
              <Route path="/mailbox" component={MailboxPage} />
              <Route path="/email-integration" component={EmailIntegrationPage} />
              <Route path="/crisis-intake" component={CrisisIntake} />
              <Route path="/business-intelligence" component={BusinessIntelligence} />
              <Route path="/ingestion" component={DocumentIngestion} />
              <Route path="/reports-productions" component={ReportsProductions} />
              <Route path="/relationship-intelligence" component={RelationshipIntelligence} />
              <Route path="/relationship-contacts" component={RelationshipContacts} />
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
        {/* Video meeting room - accessible to guests without authentication */}
        <Route path="/video-meeting/:roomId" component={VideoMeetingPage} />
        {/* Start page - Emma-powered landing after login */}
        <Route path="/start">
          {() => isAuthenticated ? <StartPage /> : <Landing />}
        </Route>
        {/* Document Review has its own sidebar management */}
        <Route path="/document-review">
          {() => isAuthenticated ? <DocumentReviewPage /> : <Landing />}
        </Route>
        <Route>
          {() =>
            isAuthenticated ? (
              <AuthenticatedApp />
            ) : (
              <Switch>
                <Route path="/" component={Landing} />
                <Route path="/login" component={Login} />
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
