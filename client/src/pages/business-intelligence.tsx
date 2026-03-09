import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Download, Sparkles, BarChart3, Briefcase, Clock, User, Trash2, History, FileDown, Brain, AlertTriangle, Globe } from "lucide-react";

interface Deal {
  id: string;
  dealNumber: string;
  title: string;
  status: string;
  dealType: string;
  caseId?: string | null;
}

interface SavedReport {
  id: string;
  companyName: string;
  generatedBy: string;
  generatedByName: string;
  fileName: string;
  fileSize: number | null;
  communicationsCount: number | null;
  overallConfidence: number | null;
  createdAt: string;
}

export default function BusinessIntelligence() {
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [enableAIKnowledgeResearch, setEnableAIKnowledgeResearch] = useState(true);
  const [useDataLake, setUseDataLake] = useState(false);
  const { toast } = useToast();

  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const linkedCaseId = deals.find(d => d.id === selectedDealId)?.caseId;

  const { data: savedReports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery<SavedReport[]>({
    queryKey: ["/api/business-reports", linkedCaseId || selectedDealId],
    enabled: !!selectedDealId && !!(linkedCaseId || selectedDealId),
  });

  useEffect(() => {
    if (selectedDealId) {
      const selectedDeal = deals.find(d => d.id === selectedDealId);
      if (selectedDeal) {
        setCompanyName(selectedDeal.title);
      }
    }
  }, [selectedDealId, deals]);

  const generateSummary = useMutation({
    mutationFn: async ({ name, dealId, linkedCaseId, enableWebResearch }: { name: string; dealId: string; linkedCaseId?: string | null; enableWebResearch: boolean }) => {
      const response = await fetch("/api/business-summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: name, caseId: linkedCaseId || dealId, enableWebResearch }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate summary");
      }

      // Get PDF blob and report ID from header
      const blob = await response.blob();
      const reportId = response.headers.get('X-Report-Id');
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || `business-summary-${name.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return { reportId, fileName };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Business summary PDF generated and saved successfully",
      });
      // Refresh the saved reports list
      queryClient.invalidateQueries({ queryKey: ["/api/business-reports", linkedCaseId || selectedDealId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Download saved report
  const downloadReport = async (reportId: string, fileName: string) => {
    try {
      const reportCaseId = linkedCaseId || selectedDealId;
      const response = await fetch(`/api/business-reports/${reportCaseId}/${reportId}/download`);
      if (!response.ok) {
        throw new Error("Failed to download report");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete report mutation
  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const reportCaseId = linkedCaseId || selectedDealId;
      const response = await fetch(`/api/business-reports/${reportCaseId}/${reportId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete report");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Report Deleted",
        description: "The report has been removed from the database",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business-reports", linkedCaseId || selectedDealId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleGenerate = () => {
    if (!selectedDealId) {
      toast({
        title: "Validation Error",
        description: "Please select a transaction to analyze",
        variant: "destructive",
      });
      return;
    }
    if (!companyName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }
    generateSummary.mutate({ name: companyName, dealId: selectedDealId, linkedCaseId, enableWebResearch: enableAIKnowledgeResearch });
  };

  const selectedDeal = deals.find(d => d.id === selectedDealId);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Business Intelligence</h1>
            <p className="text-muted-foreground mt-2">Generate comprehensive AI-powered business summaries.</p>
          </div>

          <Card data-testid="card-generator">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Business Summary Generator
              </CardTitle>
              <CardDescription>
                Analyzes communications and documents to produce a detailed 
                business intelligence report with evidence-backed insights. Optionally includes live web search for current media coverage, litigation history, and regulatory actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="deal-select">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Select Transaction to Analyze
                  </span>
                </Label>
                <Select
                  value={selectedDealId}
                  onValueChange={setSelectedDealId}
                  disabled={generateSummary.isPending || dealsLoading}
                >
                  <SelectTrigger 
                    id="deal-select"
                    data-testid="select-deal"
                    className="w-full"
                  >
                    <SelectValue placeholder={dealsLoading ? "Loading transactions..." : "Select a transaction..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id} data-testid={`deal-option-${d.id}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{d.dealNumber}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{d.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDeal && (
                  <p className="text-xs text-muted-foreground">
                    Status: {selectedDeal.status} · Type: {selectedDeal.dealType.replace(/_/g, ' ')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  data-testid="input-company-name"
                  placeholder="Enter company or client name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={generateSummary.isPending || !selectedDealId}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-populated from transaction title. You can customize if needed.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-green-700 dark:text-emerald-400" />
                    <Label htmlFor="ai-research-toggle" className="font-medium text-green-900 dark:text-green-100">
                      Include Live Web Search
                    </Label>
                  </div>
                  <p className="text-xs text-green-800 dark:text-green-200 max-w-md">
                    Adds sections 14-15 with real-time web search for media coverage and litigation history. 
                    Uses OpenAI's web search to find current information with source citations.
                  </p>
                </div>
                <Switch
                  id="ai-research-toggle"
                  data-testid="toggle-ai-research"
                  checked={enableAIKnowledgeResearch}
                  onCheckedChange={setEnableAIKnowledgeResearch}
                  disabled={generateSummary.isPending}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <Label htmlFor="data-lake-toggle" className="font-medium cursor-pointer">
                      My Data Lake
                    </Label>
                  </div>
                  <p className="text-xs text-violet-800 dark:text-violet-200 max-w-md">
                    Cross-reference analysis with your uploaded documents in My Data Lake for deeper insights.
                  </p>
                </div>
                <Switch
                  id="data-lake-toggle"
                  data-testid="toggle-data-lake"
                  checked={useDataLake}
                  onCheckedChange={setUseDataLake}
                  disabled={generateSummary.isPending}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Report Sections ({enableAIKnowledgeResearch ? '15' : '13'} Total)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-primary">1.</span>
                    <span>Executive Summary</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">2.</span>
                    <span>Business Lines</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">3.</span>
                    <span>Corporate History & Structure</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">4.</span>
                    <span>Transactions</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">5.</span>
                    <span>Major Clients</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">6.</span>
                    <span>Partners / Vendors / Investors</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">7.</span>
                    <span>Technology Stack</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">8.</span>
                    <span>Personnel & Organization</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">9.</span>
                    <span>Litigation & Regulatory Facts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">10.</span>
                    <span>Financials</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">11.</span>
                    <span>Exhibits & Supporting Evidence</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-600 dark:text-sky-300">12.</span>
                    <span className="text-sky-600 dark:text-sky-300">Entity Involvement (Employees, Third Parties, Vendors)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">13.</span>
                    <span>Appendix (Glossary & Source Index)</span>
                  </div>
                  {enableAIKnowledgeResearch && (
                    <>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-600 dark:text-emerald-300">14.</span>
                        <span className="text-emerald-600 dark:text-emerald-300">Media Coverage Analysis (Live Web Search)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-600 dark:text-emerald-300">15.</span>
                        <span className="text-emerald-600 dark:text-emerald-300">External Litigation Research (Live Web Search)</span>
                      </div>
                    </>
                  )}
                </div>
                {enableAIKnowledgeResearch && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-800 dark:text-green-200 flex items-start gap-2">
                    <Globe className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Live Web Search:</strong> Sections 14-15 use OpenAI's real-time web search to find current 
                      media coverage, litigation, and regulatory actions. Results include source citations. 
                      For critical due diligence, always verify findings through original sources.
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Data Sources {selectedDeal && <span className="font-normal text-muted-foreground">for {selectedDeal.dealNumber}</span>}
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {selectedDeal ? (
                    <>
                      <li>• Transaction data: <strong>{selectedDeal.title}</strong></li>
                      <li>• Documents and attachments linked to transaction</li>
                      <li>• AI-powered analysis with evidence citations</li>
                      <li>• Confidence scoring for all assertions</li>
                      <li className="text-sky-600 dark:text-sky-300">• Entity extraction: counterparties, advisors, vendors</li>
                      {useDataLake && (
                        <li className="text-violet-600 dark:text-violet-300">• My Data Lake: cross-referencing your uploaded documents</li>
                      )}
                      {enableAIKnowledgeResearch && (
                        <li className="text-emerald-600 dark:text-emerald-300">• Live web search: media coverage, litigation history, regulatory actions</li>
                      )}
                    </>
                  ) : (
                    <>
                      <li>• Select a transaction to analyze</li>
                      <li>• Documents and attachments will be included</li>
                      <li>• AI-powered analysis with evidence citations</li>
                      <li>• Confidence scoring for all assertions</li>
                      <li className="text-sky-600 dark:text-sky-300">• Entity extraction: counterparties, advisors, vendors</li>
                      {enableAIKnowledgeResearch && (
                        <li className="text-emerald-600 dark:text-emerald-300">• Live web search: media coverage, litigation history, regulatory actions</li>
                      )}
                    </>
                  )}
                </ul>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={generateSummary.isPending || !selectedDealId}
                size="lg"
                className="w-full"
                data-testid="button-generate-summary"
              >
                {generateSummary.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Comprehensive Summary (may take 30+ minutes)...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Generate Business Summary PDF
                  </>
                )}
              </Button>

              {generateSummary.isPending && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Please wait:</strong> The AI is comprehensively analyzing ALL data in your transaction{enableAIKnowledgeResearch ? ', researching media coverage and litigation history,' : ''}, 
                    and generating a thorough {enableAIKnowledgeResearch ? '14' : '12'}-section business intelligence report. For large transactions with thousands of documents, this can take 30 minutes or more. Quality over speed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Reports Section */}
          {selectedDealId && (
            <Card data-testid="card-saved-reports">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Saved Reports
                  {savedReports.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{savedReports.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Previously generated business intelligence reports for this transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : savedReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No saved reports for this transaction yet</p>
                    <p className="text-sm">Generate a report above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedReports.map((report) => (
                      <div 
                        key={report.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                        data-testid={`saved-report-${report.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="font-medium truncate">{report.companyName}</span>
                            {report.overallConfidence !== null && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {report.overallConfidence}% confidence
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1 pl-6">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(report.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {report.generatedByName}
                              </span>
                              {report.communicationsCount !== null && (
                                <span>{report.communicationsCount} communications</span>
                              )}
                              <span>{formatFileSize(report.fileSize)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => downloadReport(report.id, report.fileName)}
                            title="Download PDF"
                            data-testid={`button-download-${report.id}`}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this report?")) {
                                deleteReport.mutate(report.id);
                              }
                            }}
                            disabled={deleteReport.isPending}
                            title="Delete report"
                            data-testid={`button-delete-${report.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          </div>
      </div>
    </div>
  );
}
