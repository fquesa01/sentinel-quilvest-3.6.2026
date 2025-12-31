import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Video, Mail, Eye, Calendar, Shield, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Interview {
  id: string;
  intervieweeName: string;
  role: string;
  interviewType: string;
  scheduledFor: string | null;
  completedAt: string | null;
  status: string;
  hasUpjohnWarning: boolean;
  hasConsent: boolean;
  aiSummary?: string;
  riskLevel: string;
}

interface InterviewsTabProps {
  interviews?: Interview[];
  metrics?: {
    total: number;
    completed: number;
    scheduled: number;
    pending: number;
  };
  isLoading?: boolean;
  onScheduleLive?: () => void;
  onSendAIInterview?: () => void;
  onViewInterview?: (id: string) => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    in_progress: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    pending: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  return colors[status] || colors.pending;
};

const getRiskColor = (level: string) => {
  const colors: Record<string, string> = {
    high: "bg-red-500/10 text-red-700 dark:text-red-400",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    low: "bg-green-500/10 text-green-700 dark:text-green-400",
  };
  return colors[level] || colors.low;
};

export function InterviewsTab({
  interviews = [],
  metrics,
  isLoading,
  onScheduleLive,
  onSendAIInterview,
  onViewInterview,
}: InterviewsTabProps) {
  return (
    <div className="space-y-6">
      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" data-testid="metric-total-interviews">{metrics.total}</p>
                  <p className="text-sm text-muted-foreground">Total Interviews</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="metric-completed-interviews">
                    {metrics.completed}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="metric-scheduled-interviews">
                    {metrics.scheduled}
                  </p>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400" data-testid="metric-pending-interviews">
                    {metrics.pending}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <MessageSquare className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Interviews List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Interviews</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onScheduleLive} data-testid="button-schedule-live">
                <Video className="h-4 w-4 mr-2" />
                Schedule Live
              </Button>
              <Button variant="default" onClick={onSendAIInterview} data-testid="button-send-ai-interview">
                <Mail className="h-4 w-4 mr-2" />
                Send AI Interview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : interviews.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interviewee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>AI Summary</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((interview) => (
                  <TableRow key={interview.id} className="hover-elevate" data-testid={`interview-row-${interview.id}`}>
                    <TableCell>
                      <span className="font-medium">{interview.intervieweeName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{interview.role.replace(/_/g, " ")}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {interview.interviewType.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {interview.completedAt
                          ? format(new Date(interview.completedAt), "MMM d, yyyy")
                          : interview.scheduledFor
                          ? format(new Date(interview.scheduledFor), "MMM d, yyyy")
                          : "Not scheduled"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(interview.status)}>
                        {interview.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {interview.hasUpjohnWarning && (
                          <div className="flex items-center gap-1" title="Upjohn Warning Given">
                            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                        )}
                        {interview.hasConsent && (
                          <div className="flex items-center gap-1" title="Consent Obtained">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        )}
                        {!interview.hasUpjohnWarning && !interview.hasConsent && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {interview.aiSummary ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {interview.aiSummary}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRiskColor(interview.riskLevel)}>
                        {interview.riskLevel.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewInterview?.(interview.id)}
                        data-testid={`button-view-interview-${interview.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No interviews scheduled or completed</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={onScheduleLive} data-testid="button-schedule-live-empty">
                  <Video className="h-4 w-4 mr-2" />
                  Schedule Live Interview
                </Button>
                <Button variant="default" onClick={onSendAIInterview} data-testid="button-send-ai-interview-empty">
                  <Mail className="h-4 w-4 mr-2" />
                  Send AI Interview
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
