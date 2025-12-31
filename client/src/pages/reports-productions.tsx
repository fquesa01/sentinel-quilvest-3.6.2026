import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Table, BarChart3, Package, Loader2, FileSpreadsheet, FileCheck } from "lucide-react";
import type { Case } from "@shared/schema";

export default function ReportsProductions() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("discovery");

  // Fetch all cases
  const { data: cases = [], isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  return (
    <div className="h-full overflow-auto p-6" data-testid="page-reports-productions">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              Reports & Productions
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-description">
              Generate discovery reports, create document productions, and export analytics
            </p>
          </div>
          
          {/* Case Selector */}
          <div className="w-72">
            <Select
              value={selectedCaseId}
              onValueChange={setSelectedCaseId}
              disabled={casesLoading}
            >
              <SelectTrigger data-testid="select-case">
                <SelectValue placeholder="Select a case..." />
              </SelectTrigger>
              <SelectContent>
                {cases.map((caseItem) => (
                  <SelectItem 
                    key={caseItem.id} 
                    value={caseItem.id}
                    data-testid={`select-case-${caseItem.id}`}
                  >
                    {caseItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {casesLoading && (
              <p className="text-xs text-muted-foreground mt-1">Loading cases...</p>
            )}
          </div>
        </div>

        {/* Main Content */}
        {!selectedCaseId ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Select a Case</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Choose a case from the dropdown above to generate reports and manage document productions
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4" data-testid="tabs-report-type">
              <TabsTrigger value="discovery" data-testid="tab-discovery">
                <FileCheck className="mr-2 h-4 w-4" />
                Discovery Reports
              </TabsTrigger>
              <TabsTrigger value="custom" data-testid="tab-custom">
                <FileText className="mr-2 h-4 w-4" />
                Custom Reports
              </TabsTrigger>
              <TabsTrigger value="communication" data-testid="tab-communication">
                <BarChart3 className="mr-2 h-4 w-4" />
                Communication Analytics
              </TabsTrigger>
              <TabsTrigger value="productions" data-testid="tab-productions">
                <Package className="mr-2 h-4 w-4" />
                Document Productions
              </TabsTrigger>
            </TabsList>

            {/* Discovery Reports Tab */}
            <TabsContent value="discovery" className="space-y-6">
              <DiscoveryReportView caseId={selectedCaseId} />
            </TabsContent>

            {/* Custom Reports Tab */}
            <TabsContent value="custom" className="space-y-6">
              <CustomReportsView caseId={selectedCaseId} />
            </TabsContent>

            {/* Communication Analytics Tab */}
            <TabsContent value="communication" className="space-y-6">
              <CommunicationReportsView caseId={selectedCaseId} />
            </TabsContent>

            {/* Document Productions Tab */}
            <TabsContent value="productions" className="space-y-6">
              <ProductionsView caseId={selectedCaseId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

// Discovery Report View Component
function DiscoveryReportView({ caseId }: { caseId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch discovery report data
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['/api/reports', caseId, 'discovery'],
    queryFn: async () => {
      const response = await fetch(`/api/reports/${caseId}/discovery`);
      if (!response.ok) throw new Error("Failed to fetch report");
      return response.json();
    },
    enabled: !!caseId,
  });

  const handleGenerate = async (format: "json" | "pdf" | "excel") => {
    if (!reportData) {
      alert("Report data not loaded yet");
      return;
    }

    setIsGenerating(true);
    try {
      if (format === "json") {
        // Download JSON using cached data
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `discovery-report-${caseId}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "pdf") {
        // TODO: Implement PDF generation
        alert("PDF export coming soon");
      } else if (format === "excel") {
        // TODO: Implement Excel generation
        alert("Excel export coming soon");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  if (reportLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Generating discovery report...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Export Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Discovery Report</CardTitle>
          <CardDescription>
            Comprehensive case overview including metadata, custodians, communications, privilege assertions, and production history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              onClick={() => handleGenerate("json")}
              disabled={isGenerating}
              data-testid="button-export-json"
              className="w-full"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export JSON
            </Button>
            <Button
              onClick={() => handleGenerate("pdf")}
              disabled={isGenerating}
              variant="outline"
              data-testid="button-export-pdf"
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={() => handleGenerate("excel")}
              disabled={isGenerating}
              variant="outline"
              data-testid="button-export-excel"
              className="w-full"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Metadata Section */}
          <Card>
            <CardHeader>
              <CardTitle>Case Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetadataItem label="Case Number" value={reportData.metadata.caseNumber} />
                <MetadataItem label="Case Title" value={reportData.metadata.caseTitle} />
                <MetadataItem label="Status" value={reportData.metadata.caseStatus} />
                <MetadataItem 
                  label="Date Range" 
                  value={
                    reportData.metadata.dateRangeStart && reportData.metadata.dateRangeEnd
                      ? `${new Date(reportData.metadata.dateRangeStart).toLocaleDateString()} to ${new Date(reportData.metadata.dateRangeEnd).toLocaleDateString()}`
                      : reportData.metadata.dateRangeStart
                        ? `Since ${new Date(reportData.metadata.dateRangeStart).toLocaleDateString()}`
                        : reportData.metadata.dateRangeEnd
                          ? `Through ${new Date(reportData.metadata.dateRangeEnd).toLocaleDateString()}`
                          : 'No data'
                  } 
                />
                <MetadataItem label="Total Documents" value={reportData.metadata.totalDocuments.toLocaleString()} />
                <MetadataItem label="Total Custodians" value={reportData.metadata.totalCustodians.toString()} />
              </div>
            </CardContent>
          </Card>

          {/* Custodians Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Custodian Summary</CardTitle>
              <CardDescription>Data sources and communication statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {(!reportData.custodians || reportData.custodians.length === 0) ? (
                <p className="text-muted-foreground text-sm">No custodians found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-custodians">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-right p-2 font-medium">Documents</th>
                        <th className="text-right p-2 font-medium">Emails Sent</th>
                        <th className="text-right p-2 font-medium">Emails Received</th>
                        <th className="text-right p-2 font-medium">Chats</th>
                        <th className="text-left p-2 font-medium">First Activity</th>
                        <th className="text-left p-2 font-medium">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.custodians.map((custodian: any, idx: number) => (
                        <tr key={custodian.custodianId} className="border-b hover:bg-muted/50" data-testid={`row-custodian-${idx}`}>
                          <td className="p-2">{custodian.name}</td>
                          <td className="p-2 text-muted-foreground">{custodian.email}</td>
                          <td className="p-2 text-right">{custodian.documentCount.toLocaleString()}</td>
                          <td className="p-2 text-right">{custodian.emailsSent.toLocaleString()}</td>
                          <td className="p-2 text-right">{custodian.emailsReceived.toLocaleString()}</td>
                          <td className="p-2 text-right">{custodian.chatMessageCount.toLocaleString()}</td>
                          <td className="p-2 text-xs text-muted-foreground">{custodian.firstActivityDate || '-'}</td>
                          <td className="p-2 text-xs text-muted-foreground">{custodian.lastActivityDate || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tag Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Tag Analysis</CardTitle>
              <CardDescription>Document coding distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {(!reportData.tags || reportData.tags.length === 0) ? (
                <p className="text-muted-foreground text-sm">No tags applied</p>
              ) : (
                <div className="space-y-2">
                  {reportData.tags.map((tag: any, idx: number) => (
                    <div key={tag.tagId} className="flex items-center justify-between p-2 rounded-md border" data-testid={`tag-${idx}`}>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full bg-${tag.color}-500`} />
                        <span className="font-medium">{tag.tagName}</span>
                        <span className="text-xs text-muted-foreground">({tag.category})</span>
                      </div>
                      <span className="text-sm font-semibold">{tag.documentCount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>File Type Breakdown</CardTitle>
              <CardDescription>Distribution of document types</CardDescription>
            </CardHeader>
            <CardContent>
              {(!reportData.fileTypes || reportData.fileTypes.length === 0) ? (
                <p className="text-muted-foreground text-sm">No files found</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {reportData.fileTypes.map((fileType: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-md border" data-testid={`filetype-${idx}`}>
                      <span className="font-medium text-sm uppercase">{fileType.extension}</span>
                      <span className="text-sm font-semibold">{fileType.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Privilege Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Privilege Assertions</CardTitle>
              <CardDescription>Attorney-client privilege and work product designations</CardDescription>
            </CardHeader>
            <CardContent>
              {(!reportData.privilege || !reportData.privilege.privilegeTypes || reportData.privilege.privilegeTypes.length === 0) ? (
                <p className="text-muted-foreground text-sm">No privilege assertions</p>
              ) : (
                <div className="space-y-2">
                  {reportData.privilege.privilegeTypes.map((priv: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-md border" data-testid={`privilege-${idx}`}>
                      <span className="font-medium">{priv.type}</span>
                      <span className="text-sm font-semibold">{priv.count.toLocaleString()} documents ({priv.percentage.toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication Graph Summary */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="title-communication-graph">Communication Graph</CardTitle>
              <CardDescription>Top communicators and network analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {!reportData.communications || !reportData.communications.summary ? (
                <p className="text-muted-foreground text-sm" data-testid="text-no-comm-data">No communication data available</p>
              ) : (
                <div className="space-y-4">
                  {/* Display communication summary statistics */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {reportData.communications.summary?.topParticipants?.slice(0, 6).map((participant: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-md border" data-testid={`comm-${idx}`}>
                        <span className="text-sm truncate" data-testid={`comm-name-${idx}`}>{participant.name || participant.email}</span>
                        <span className="text-sm font-semibold" data-testid={`comm-count-${idx}`}>{participant.messageCount?.toLocaleString() || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Production Batches */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="title-production-batches">Production Batches</CardTitle>
              <CardDescription>Document productions for litigation/investigations</CardDescription>
            </CardHeader>
            <CardContent>
              {!reportData.productions || reportData.productions.length === 0 ? (
                <p className="text-muted-foreground text-sm" data-testid="text-no-batches">No production batches created</p>
              ) : (
                <div className="space-y-2">
                  {reportData.productions.map((batch: any, idx: number) => (
                    <div key={batch.batchId} className="p-3 rounded-md border" data-testid={`batch-${idx}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium" data-testid={`batch-name-${idx}`}>{batch.batchName}</span>
                        <span className="text-xs text-muted-foreground" data-testid={`batch-date-${idx}`}>{batch.productionDate}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span data-testid={`batch-count-${idx}`}>{batch.documentCount?.toLocaleString() || 0} documents</span>
                        <span className="text-xs font-mono" data-testid={`batch-hash-${idx}`}>{batch.hash?.slice(0, 12)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
}

// Metadata Item Component
function MetadataItem({ label, value }: { label: string; value: string }) {
  const testId = `metadata-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1" data-testid={`container-${testId}`}>
      <p className="text-xs text-muted-foreground" data-testid={`label-${testId}`}>{label}</p>
      <p className="text-sm font-medium" data-testid={`value-${testId}`}>{value}</p>
    </div>
  );
}

// Custom Reports View Component
function CustomReportsView({ caseId }: { caseId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Report Builder</CardTitle>
        <CardDescription>
          Create custom reports by selecting sections, applying filters, and saving templates
        </CardDescription>
      </CardHeader>
      <CardContent className="py-12">
        <div className="text-center space-y-3">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Custom report builder with section selection, advanced filters, and template management
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Communication Reports View Component
function CommunicationReportsView({ caseId }: { caseId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Analytics Report</CardTitle>
        <CardDescription>
          Visualize communication patterns, top communicators, and timeline analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="py-12">
        <div className="text-center space-y-3">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Interactive communication graphs, heatmaps, and exportable analytics dashboards
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Document Productions View Component
function ProductionsView({ caseId }: { caseId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Productions</CardTitle>
        <CardDescription>
          Create production batches, generate chain-of-custody hashes, and track production history
        </CardDescription>
      </CardHeader>
      <CardContent className="py-12">
        <div className="text-center space-y-3">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Production batch management with document selection, hash generation, and metadata tracking
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Report Section Component
function ReportSection({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border bg-card hover-elevate">
      <Icon className="h-5 w-5 text-primary mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
