import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileText, 
  Users, 
  MessageSquare, 
  AlertTriangle,
  Plus,
  UserPlus,
  Mail,
  Brain,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";

interface CaseStats {
  documentSetsCount: number;
  documentsCount: number;
  custodians: number;
  interviewsCompleted: number;
  interviewsScheduled: number;
  alertsCount: number;
}

interface CaseHeaderProps {
  caseNumber: string;
  title: string;
  violationType: string;
  priority: string;
  status: string;
  riskScore?: number | null;
  updatedAt: string;
  ownerName?: string;
  ownerInitials?: string;
  stats?: CaseStats;
  onAddDocumentSet?: () => void;
  onAddParty?: () => void;
  onSendInterview?: () => void;
  onRunAnalysis?: () => void;
}

const getViolationLabel = (type: string) => {
  const labels: Record<string, string> = {
    fcpa: "FCPA",
    antitrust: "Antitrust",
    sox: "SOX",
    sec: "SEC",
    aml: "AML",
    insider_trading: "Insider Trading",
    off_channel: "Off-Channel",
    privacy: "Privacy",
  };
  return labels[type] || type.replace(/_/g, " ").toUpperCase();
};

const getPriorityVariant = (priority: string): "default" | "destructive" | "secondary" | "outline" => {
  const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
    critical: "destructive",
    high: "default",
    medium: "secondary",
    low: "outline",
  };
  return variants[priority] || "outline";
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    alert: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    investigation: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    review: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    resolution: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    closed: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  };
  return colors[status] || colors.investigation;
};

const getRiskColor = (score: number) => {
  if (score >= 75) return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
  if (score >= 50) return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
  if (score >= 25) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
  return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
};

export function CaseHeader({
  caseNumber,
  title,
  violationType,
  priority,
  status,
  riskScore,
  updatedAt,
  ownerName,
  ownerInitials,
  stats,
  onAddDocumentSet,
  onAddParty,
  onSendInterview,
  onRunAnalysis,
}: CaseHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="sticky top-0 z-30 bg-background border-b pb-2 space-y-2">
      {/* Collapsed: Only case number + title in a compact row */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight" data-testid="heading-case-number">
          {caseNumber}
        </h1>
        <span className="text-muted-foreground">—</span>
        <span className="text-lg text-muted-foreground truncate" data-testid="text-case-title">
          {title}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto shrink-0"
          data-testid="button-toggle-header"
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded: All details, badges, actions, and stats */}
      {!isCollapsed && (
        <div className="space-y-3 pt-2">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" data-testid="badge-violation-type">
              {getViolationLabel(violationType)}
            </Badge>
            <Badge variant={getPriorityVariant(priority)} data-testid="badge-priority">
              {priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={getStatusColor(status)} data-testid="badge-status">
              {status.replace(/_/g, " ").toUpperCase()}
            </Badge>
            {riskScore !== null && riskScore !== undefined && (
              <Badge variant="outline" className={getRiskColor(riskScore)} data-testid="badge-risk-score">
                Risk: {riskScore}/100
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground" data-testid="text-last-updated">
            Last updated {format(new Date(updatedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 flex-wrap">
            {ownerName && (
              <div className="flex items-center gap-2 mr-4">
                <Avatar className="h-8 w-8" data-testid="avatar-case-owner">
                  <AvatarFallback>{ownerInitials || ownerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium" data-testid="text-owner-name">{ownerName}</p>
                  <p className="text-muted-foreground text-xs">Lead Attorney</p>
                </div>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAddDocumentSet}
              data-testid="button-add-document-set"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document Set
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAddParty}
              data-testid="button-add-party"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSendInterview}
              data-testid="button-send-interview"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send AI Interview
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={onRunAnalysis}
              data-testid="button-run-analysis"
            >
              <Brain className="h-4 w-4 mr-2" />
              Run AI Analysis
            </Button>
          </div>

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-documents">{stats.documentsCount}</p>
                    <p className="text-xs text-muted-foreground">Documents</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-custodians">{stats.custodians}</p>
                    <p className="text-xs text-muted-foreground">Custodians</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-interviews">
                      {stats.interviewsCompleted}/{stats.interviewsCompleted + stats.interviewsScheduled}
                    </p>
                    <p className="text-xs text-muted-foreground">Interviews</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-alerts">{stats.alertsCount}</p>
                    <p className="text-xs text-muted-foreground">Alerts</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-document-sets">{stats.documentSetsCount}</p>
                    <p className="text-xs text-muted-foreground">Document Sets</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-interviews-scheduled">{stats.interviewsScheduled}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
