import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  FileText,
  Clock,
  CheckCircle2,
  Users,
  Plus,
  ArrowRight,
  Stamp,
  CalendarClock,
  Activity,
  Shield,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { RonTransaction, RonSession } from "@shared/schema";

interface DashboardStats {
  activeTransactions: number;
  completedThisMonth: number;
  pendingSessions: number;
  totalTransactions: number;
  activeNotaries?: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  pending_idv: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  ready: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_idv: "Pending IDV",
  ready: "Ready",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

export default function RonDashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<DashboardStats>({
    queryKey: ["/api/ron/dashboard/stats"],
  });

  const { data: transactions, isLoading: txnLoading, isError: txnError } = useQuery<RonTransaction[]>({
    queryKey: ["/api/ron/transactions"],
  });

  const recentTransactions = transactions
    ?.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  if (statsLoading || txnLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (statsError || txnError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive opacity-70" />
            <p className="font-medium text-destructive" data-testid="text-dashboard-error">Failed to load dashboard data</p>
            <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ron-dashboard-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-ron-title">
            <Stamp className="h-6 w-6" />
            Remote Online Notarization
          </h1>
          <p className="text-muted-foreground">
            Manage notarization transactions, sessions, and compliance
          </p>
        </div>
        <Link href="/ron/transactions/new">
          <Button data-testid="button-create-ron-transaction">
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Transactions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-transactions">
              {stats?.activeTransactions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalTransactions ?? 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Sessions</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-sessions">
              {stats?.pendingSessions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled & awaiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed (30 days)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed-month">
              {stats?.completedThisMonth ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        {stats?.activeNotaries !== undefined && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Notaries</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-notaries">
                {stats.activeNotaries}
              </div>
              <p className="text-xs text-muted-foreground">Commission active</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/ron/transactions">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((txn) => (
                  <Link key={txn.id} href={`/ron/transactions/${txn.id}`}>
                    <div
                      className="flex items-center justify-between p-3 rounded-md hover-elevate active-elevate-2 border border-border"
                      data-testid={`ron-txn-row-${txn.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Stamp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{txn.title || "Untitled Transaction"}</p>
                          <p className="text-xs text-muted-foreground">
                            {txn.jurisdiction || "No jurisdiction"} &middot; {txn.transactionType?.replace(/_/g, " ") || "General"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={statusColors[txn.status] || statusColors.draft}>
                          {statusLabels[txn.status] || txn.status}
                        </Badge>
                        {txn.createdAt && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {format(new Date(txn.createdAt), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Stamp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
                <Link href="/ron/transactions/new">
                  <Button variant="outline" size="sm" className="mt-2">
                    Create First Transaction
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/ron/transactions/new">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-new-txn">
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            </Link>
            <Link href="/ron/transactions">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-all-txns">
                <FileText className="h-4 w-4 mr-2" />
                All Transactions
              </Button>
            </Link>
            <Link href="/ron/notaries">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-notaries">
                <Users className="h-4 w-4 mr-2" />
                Notary Directory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
