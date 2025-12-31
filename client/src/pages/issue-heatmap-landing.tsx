import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Folder, ChevronRight, AlertCircle } from "lucide-react";

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function IssueHeatmapLanding() {
  const [, setLocation] = useLocation();

  const { data: cases, isLoading, error } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const handleCaseClick = (caseId: string) => {
    setLocation(`/cases/${caseId}/issue-heatmap`);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "closed":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
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
            Select a case to view its compliance issue analysis
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Available Cases
          </CardTitle>
          <CardDescription>
            Click on a case to view its Issue Heatmap analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive p-4">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load cases. Please try again.</span>
            </div>
          ) : cases && cases.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="p-4 rounded-lg border hover-elevate cursor-pointer flex items-center justify-between"
                    onClick={() => handleCaseClick(caseItem.id)}
                    data-testid={`case-card-${caseItem.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{caseItem.caseNumber}</span>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(caseItem.status)}`}>
                          {caseItem.status}
                        </Badge>
                        {caseItem.priority && (
                          <Badge variant="outline" className={`text-xs ${getPriorityColor(caseItem.priority)}`}>
                            {caseItem.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {caseItem.title || "No title"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No cases available</p>
              <p className="text-sm">Create a case first to use the Issue Heatmap</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
