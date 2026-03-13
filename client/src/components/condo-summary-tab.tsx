import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import {
  Building2,
  ChevronRight,
  ChevronDown,
  FileText,
  AlertTriangle,
  Info,
  Shield,
  RefreshCw,
  Loader2,
  DollarSign,
  Home,
  Wrench,
  Car,
  Scale,
  Users,
  Calendar,
  Flag,
  Lock,
  Handshake,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CondoIssueItem {
  title: string;
  description: string;
  sourceDocument: string;
  sourceSection: string;
  severity?: "info" | "warning" | "critical";
}

interface CondoCategory {
  name: string;
  slug: string;
  items: CondoIssueItem[];
}

interface CondoIssueSheetData {
  categories: CondoCategory[];
  summary: string;
  documentCount: number;
  generatedAt: string;
}

interface CondoIssueSheet {
  id: string;
  dealId: string;
  status: string;
  issueSheet: CondoIssueSheetData;
  sourceDocumentIds: string[];
  generatedAt: string | null;
  error: string | null;
}

const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  assessment_fees: DollarSign,
  use_restrictions: Lock,
  alteration_rules: Wrench,
  parking_storage: Car,
  insurance_requirements: Shield,
  governance: Users,
  maintenance_responsibilities: Home,
  dispute_resolution: Scale,
  transfer_restrictions: Handshake,
  key_dates: Calendar,
  flagged_concerns: Flag,
};

const SEVERITY_STYLES: Record<string, { badge: string; icon: typeof Info }> = {
  info: {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: Info,
  },
  warning: {
    badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    icon: AlertTriangle,
  },
  critical: {
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: AlertTriangle,
  },
};

export function CondoSummaryTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: issueSheet, isLoading } = useQuery<CondoIssueSheet | null>({
    queryKey: [`/api/deals/${dealId}/condo-issue-sheet`],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/condo-issue-sheet/generate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/condo-issue-sheet`] });
      toast({ title: "Condo issue sheet generated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate the condo issue sheet",
        variant: "destructive",
      });
    },
  });

  const toggleCategory = (slug: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (sheetData?.categories) {
      setExpandedCategories(new Set(sheetData.categories.map(c => c.slug)));
    }
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const sheetData = issueSheet?.issueSheet as CondoIssueSheetData | undefined;
  const isCompleted = issueSheet?.status === "completed" && sheetData?.categories;
  const isProcessing = issueSheet?.status === "processing";
  const isFailed = issueSheet?.status === "failed";

  if (!issueSheet || (!isCompleted && !isProcessing && !isFailed)) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-condo-empty-title">No Condo Issue Sheet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Upload condominium documents (declarations, bylaws, amendments, CC&Rs) to the data room and the system will automatically detect and analyze them. You can also manually trigger the analysis.
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-condo-sheet"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Condo Issue Sheet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isProcessing) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-condo-processing">Analyzing Condo Documents</h3>
            <p className="text-sm text-muted-foreground">
              The system is analyzing your condominium documents. This may take a minute.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isFailed) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-70" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-condo-failed">Analysis Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {issueSheet.error || "An error occurred while analyzing the condo documents."}
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-retry-condo-sheet"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalItems = sheetData!.categories.reduce((acc, cat) => acc + cat.items.length, 0);
  const criticalCount = sheetData!.categories.reduce(
    (acc, cat) => acc + cat.items.filter(i => i.severity === "critical").length, 0
  );
  const warningCount = sheetData!.categories.reduce(
    (acc, cat) => acc + cat.items.filter(i => i.severity === "warning").length, 0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2" data-testid="text-condo-sheet-title">
                <Building2 className="h-5 w-5" />
                Condo Issue Sheet
              </CardTitle>
              <CardDescription className="mt-1" data-testid="text-condo-summary">
                {sheetData!.summary}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-regenerate-condo-sheet"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" data-testid="badge-total-items">
              {totalItems} provision{totalItems !== 1 ? "s" : ""} found
            </Badge>
            <Badge variant="secondary" data-testid="badge-doc-count">
              {sheetData!.documentCount} document{sheetData!.documentCount !== 1 ? "s" : ""} analyzed
            </Badge>
            {criticalCount > 0 && (
              <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400" data-testid="badge-critical-count">
                {criticalCount} critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" data-testid="badge-warning-count">
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {sheetData!.generatedAt && (
              <span className="text-xs text-muted-foreground" data-testid="text-generated-at">
                Generated {new Date(sheetData!.generatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={expandAll} data-testid="button-expand-all">
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
          Collapse All
        </Button>
      </div>

      <div className="space-y-3">
        {sheetData!.categories.map((category) => {
          const isExpanded = expandedCategories.has(category.slug);
          const CategoryIcon = CATEGORY_ICONS[category.slug] || FileText;
          const catCritical = category.items.filter(i => i.severity === "critical").length;
          const catWarning = category.items.filter(i => i.severity === "warning").length;

          return (
            <Collapsible key={category.slug} open={isExpanded} onOpenChange={() => toggleCategory(category.slug)}>
              <Card data-testid={`card-category-${category.slug}`}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover-elevate py-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <CategoryIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="font-medium" data-testid={`text-category-name-${category.slug}`}>
                          {category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {catCritical > 0 && (
                          <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                            {catCritical} critical
                          </Badge>
                        )}
                        {catWarning > 0 && (
                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
                            {catWarning} warning{catWarning !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {category.items.length} item{category.items.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {category.items.map((item, idx) => {
                        const severity = item.severity || "info";
                        const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
                        const SeverityIcon = styles.icon;

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-muted/30 space-y-2"
                            data-testid={`item-${category.slug}-${idx}`}
                          >
                            <div className="flex items-start gap-2">
                              <SeverityIcon className={`h-4 w-4 mt-0.5 shrink-0 ${
                                severity === "critical" ? "text-red-500" :
                                severity === "warning" ? "text-yellow-500" :
                                "text-blue-500"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm" data-testid={`text-item-title-${category.slug}-${idx}`}>
                                    {item.title}
                                  </span>
                                  <Badge variant="secondary" className={`text-xs ${styles.badge}`}>
                                    {severity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1" data-testid={`text-item-desc-${category.slug}-${idx}`}>
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {item.sourceDocument}
                                  </span>
                                  {item.sourceSection && (
                                    <span data-testid={`text-item-section-${category.slug}-${idx}`}>
                                      {item.sourceSection}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
