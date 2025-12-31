import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { FileDown, FileSpreadsheet, Loader2, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TagUsageStat {
  tagId: string;
  tagName: string;
  category: string;
  color: string;
  documentCount: number;
  communicationCount: number;
  chatMessageCount: number;
  uniqueApplicators: number;
  usagePercentage: number;
  isPreset: boolean;
}

interface TagUsageReportData {
  caseId: string;
  totalDocuments: number;
  totalCommunications: number;
  totalChatMessages: number;
  tagStats: TagUsageStat[];
  generatedAt: string;
}

interface TagUsageReportProps {
  caseId: string;
}

export function TagUsageReport({ caseId }: TagUsageReportProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: reportData, isLoading, error } = useQuery<TagUsageReportData>({
    queryKey: [`/api/cases/${caseId}/tags/usage-report`],
    enabled: isOpen && !!caseId,
  });

  const exportToCsv = () => {
    if (!reportData) return;

    // Create CSV headers
    const headers = [
      "Tag Name",
      "Category",
      "Total Documents",
      "Email/Communications",
      "Chat Messages",
      "Usage %",
      "Unique Applicators",
      "Preset Tag",
    ];

    // Create CSV rows (even if empty, we'll have headers)
    const rows = (reportData.tagStats || []).map((stat) => [
      stat.tagName,
      stat.category,
      stat.documentCount.toString(),
      stat.communicationCount.toString(),
      stat.chatMessageCount.toString(),
      stat.usagePercentage.toFixed(2) + "%",
      stat.uniqueApplicators.toString(),
      stat.isPreset ? "Yes" : "No",
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `tag-usage-report-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = async () => {
    if (!reportData) return;

    // For Excel export, we'll create a more detailed CSV that Excel can open
    // In a production app, you might use a library like exceljs
    const headers = [
      "Case Summary",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ];

    const summaryRows = [
      ["Total Documents:", (reportData.totalDocuments || 0).toString()],
      ["Total Communications:", (reportData.totalCommunications || 0).toString()],
      ["Total Chat Messages:", (reportData.totalChatMessages || 0).toString()],
      ["Total Tags Used:", (reportData.tagStats?.length || 0).toString()],
      ["Generated:", format(new Date(reportData.generatedAt || new Date()), "PPpp")],
      [""], // Empty row
      [
        "Tag Name",
        "Category",
        "Total Documents",
        "Email/Communications",
        "Chat Messages",
        "Usage %",
        "Unique Applicators",
        "Preset Tag",
      ],
    ];

    // Include data rows even if empty
    const dataRows = (reportData.tagStats || []).map((stat) => [
      stat.tagName,
      stat.category,
      stat.documentCount.toString(),
      stat.communicationCount.toString(),
      stat.chatMessageCount.toString(),
      stat.usagePercentage.toFixed(2) + "%",
      stat.uniqueApplicators.toString(),
      stat.isPreset ? "Yes" : "No",
    ]);

    const csvContent = [
      ...summaryRows.map((row) => row.map(cell => `"${cell}"`).join(",")),
      ...dataRows.map((row) => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `tag-usage-report-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate active-elevate-2" data-testid="button-tag-report-toggle">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tag Usage Report
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-collapse-tag-report"
              >
                {isOpen ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8" data-testid="loader-tag-report">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && error && (
              <div className="text-center py-8 text-destructive" data-testid="text-error">
                Failed to load tag usage report. Please try again.
              </div>
            )}

            {!isLoading && !error && reportData && (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Total Documents
                    </div>
                    <div className="text-2xl font-bold" data-testid="text-total-documents">
                      {(reportData?.totalDocuments || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Communications
                    </div>
                    <div className="text-2xl font-bold" data-testid="text-total-communications">
                      {(reportData?.totalCommunications || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Chat Messages
                    </div>
                    <div className="text-2xl font-bold" data-testid="text-total-chats">
                      {(reportData?.totalChatMessages || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Tags Used
                    </div>
                    <div className="text-2xl font-bold" data-testid="text-total-tags-used">
                      {(reportData?.tagStats?.length || 0)}
                    </div>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={exportToCsv}
                      variant="outline"
                      size="sm"
                      data-testid="button-export-csv"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={exportToExcel}
                      variant="outline"
                      size="sm"
                      data-testid="button-export-excel"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                  {(!reportData.tagStats || reportData.tagStats.length === 0) && (
                    <div className="text-sm text-muted-foreground italic">
                      Export will include headers only (no tag data available yet)
                    </div>
                  )}
                </div>

                {/* Tag Usage Table */}
                {reportData?.tagStats && reportData.tagStats.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tag Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Documents</TableHead>
                          <TableHead className="text-right">Emails</TableHead>
                          <TableHead className="text-right">Chats</TableHead>
                          <TableHead className="text-right">Usage %</TableHead>
                          <TableHead className="text-right">Applicators</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.tagStats.map((stat) => (
                          <TableRow key={stat.tagId} data-testid={`row-tag-${stat.tagId}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={`bg-${stat.color}-100 text-${stat.color}-800 dark:bg-${stat.color}-900 dark:text-${stat.color}-100`}
                                >
                                  {stat.tagName}
                                </Badge>
                                {stat.isPreset && (
                                  <Badge variant="outline" className="text-xs">
                                    Preset
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="capitalize text-muted-foreground">
                              {stat.category.replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="text-right font-semibold" data-testid={`text-doc-count-${stat.tagId}`}>
                              {stat.documentCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {stat.communicationCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {stat.chatMessageCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {stat.usagePercentage.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {stat.uniqueApplicators}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tags">
                    No tags have been applied to documents in this case yet.
                  </div>
                )}

                {/* Report Metadata */}
                {reportData?.generatedAt && (
                  <div className="text-xs text-muted-foreground text-right">
                    Generated on {format(new Date(reportData.generatedAt), "PPpp")}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
