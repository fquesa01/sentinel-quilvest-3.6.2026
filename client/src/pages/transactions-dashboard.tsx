import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Handshake, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  DollarSign,
  ArrowRight,
  Plus,
  Clock,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import type { Deal } from "@shared/schema";

interface DashboardData {
  deals: {
    total: number;
    active: number;
    pipeline: number;
    closed: number;
    critical: number;
  };
  totalValue: number;
  upcomingMilestones: number;
  recentDeals: Deal[];
}

const statusColors: Record<string, string> = {
  pipeline: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  terminated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const dealTypeLabels: Record<string, string> = {
  ma_asset: "M&A (Asset)",
  ma_stock: "M&A (Stock)",
  merger: "Merger",
  investment: "Investment",
  debt: "Debt",
  jv: "Joint Venture",
  real_estate: "Real Estate",
  franchise: "Franchise",
  other: "Other",
};

export default function TransactionsDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/transactions/dashboard"],
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="transactions-dashboard">
      <div className="flex items-center justify-between stagger-1">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Transaction Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of business transactions and due diligence activities
          </p>
        </div>
        <Link href="/transactions/deals">
          <Button data-testid="button-new-deal">
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-2">
        <Card data-testid="card-active-deals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.deals.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.deals.pipeline || 0} in pipeline
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-deal-value">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deal Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totalValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active & pipeline deals
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-deals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data?.deals.critical || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-upcoming-milestones">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Milestones</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.upcomingMilestones || 0}</div>
            <p className="text-xs text-muted-foreground">
              Due within 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-3">
        <Card data-testid="card-recent-deals">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Deals</CardTitle>
              <Link href="/transactions/deals">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>Latest transaction activity</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentDeals && data.recentDeals.length > 0 ? (
              <div className="space-y-4">
                {data.recentDeals.map((deal) => (
                  <Link 
                    key={deal.id} 
                    href={`/transactions/deals/${deal.id}`}
                    className="block"
                  >
                    <div 
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                      data-testid={`deal-item-${deal.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{deal.title}</span>
                          <Badge className={priorityColors[deal.priority || "medium"]}>
                            {deal.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{deal.dealNumber}</span>
                          <span>•</span>
                          <span>{dealTypeLabels[deal.dealType]}</span>
                        </div>
                      </div>
                      <Badge className={statusColors[deal.status || "active"]}>
                        {deal.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No deals yet</p>
                <Link href="/transactions/deals">
                  <Button variant="outline" size="sm" className="mt-2">
                    Create your first deal
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-deal-summary">
          <CardHeader>
            <CardTitle>Deal Summary</CardTitle>
            <CardDescription>Status breakdown of all deals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Active</span>
                </div>
                <span className="font-medium">{data?.deals.active || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Pipeline</span>
                </div>
                <span className="font-medium">{data?.deals.pipeline || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span>Closed</span>
                </div>
                <span className="font-medium">{data?.deals.closed || 0}</span>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between font-medium">
                  <span>Total Deals</span>
                  <span>{data?.deals.total || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-4">
        <Link href="/transactions/request-lists">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Request Lists</h3>
                  <p className="text-sm text-muted-foreground">Manage due diligence requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions/data-rooms">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Data Rooms</h3>
                  <p className="text-sm text-muted-foreground">Secure document sharing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions/issues">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Issue Tracker</h3>
                  <p className="text-sm text-muted-foreground">Track and resolve deal issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
