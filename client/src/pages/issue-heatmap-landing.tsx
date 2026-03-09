import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Briefcase, Database, ChevronRight, AlertCircle, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Deal {
  id: string;
  dealNumber: string;
  title: string;
  status: string;
  priority: string;
  dealType: string;
  dealValue: string;
  closingTargetDate: string;
  createdAt: string;
}

interface DataLakeItem {
  id: string;
  title: string;
  sourceType: string;
  fileType: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  closing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  terminated: "bg-red-500/10 text-red-500 border-red-500/20",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function IssueHeatmapLanding() {
  const [, setLocation] = useLocation();

  const { data: deals, isLoading: dealsLoading, error: dealsError } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: dataLakeItems, isLoading: dataLakeLoading, error: dataLakeError } = useQuery<DataLakeItem[]>({
    queryKey: ["/api/data-lake/items"],
  });

  const handleDealClick = (dealId: string) => {
    setLocation(`/transactions/deals/${dealId}`);
  };

  const handleDataLakeClick = (itemId: string) => {
    setLocation(`/my-data-lake`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <Flame className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Issue Heatmap</h1>
          <p className="text-muted-foreground">
            Select a deal or document to view its issue analysis
          </p>
        </div>
      </div>

      <Tabs defaultValue="deals">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="deals" data-testid="tab-deals">
            <Briefcase className="h-4 w-4 mr-1.5" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="data-lake" data-testid="tab-data-lake">
            <Database className="h-4 w-4 mr-1.5" /> My Data Lake
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Active Deals
              </CardTitle>
              <CardDescription>
                Click on a deal to view its issue analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : dealsError ? (
                <div className="flex items-center gap-2 text-destructive p-4">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to load deals. Please try again.</span>
                </div>
              ) : deals && deals.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="p-4 rounded-lg border hover-elevate cursor-pointer flex items-center justify-between gap-3"
                        onClick={() => handleDealClick(deal.id)}
                        data-testid={`deal-card-${deal.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{deal.dealNumber || deal.title}</span>
                            {deal.status && (
                              <Badge variant="outline" className={`text-xs ${statusColors[deal.status] || ""}`}>
                                {deal.status}
                              </Badge>
                            )}
                            {deal.priority && (
                              <Badge variant="outline" className={`text-xs ${priorityColors[deal.priority] || ""}`}>
                                {deal.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {deal.title || "Untitled Deal"}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {deal.dealType && (
                              <span className="text-xs text-muted-foreground">{deal.dealType.replace(/_/g, " ")}</span>
                            )}
                            {deal.dealValue && deal.dealValue !== "0" && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <DollarSign className="h-3 w-3" />
                                {parseFloat(deal.dealValue).toLocaleString()}
                              </span>
                            )}
                            {deal.closingTargetDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(deal.closingTargetDate), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No deals available</p>
                  <p className="text-sm">Create a deal in the Transaction List to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-lake" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Lake Documents
              </CardTitle>
              <CardDescription>
                Click on a document to view its issue analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataLakeLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : dataLakeError ? (
                <div className="flex items-center gap-2 text-destructive p-4">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to load documents. Please try again.</span>
                </div>
              ) : dataLakeItems && dataLakeItems.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {dataLakeItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg border hover-elevate cursor-pointer flex items-center justify-between gap-3"
                        onClick={() => handleDataLakeClick(item.id)}
                        data-testid={`datalake-card-${item.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium truncate">{item.title || "Untitled Document"}</span>
                            {item.sourceType && (
                              <Badge variant="outline" className="text-xs">
                                {item.sourceType}
                              </Badge>
                            )}
                            {item.fileType && (
                              <Badge variant="secondary" className="text-xs">
                                {item.fileType}
                              </Badge>
                            )}
                          </div>
                          {item.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Added {format(new Date(item.createdAt), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No documents in your Data Lake</p>
                  <p className="text-sm">Upload documents to My Data Lake to analyze them here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
