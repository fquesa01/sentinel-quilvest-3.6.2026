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
import { Loader2, FileText, Download, Sparkles, BarChart3, Briefcase, Clock, User, Trash2, History, FileDown, Brain, Globe, TrendingUp, Building2, CheckCircle2, AlertTriangle, Scale, DollarSign, Users, Shield, FileCheck } from "lucide-react";

interface PEDeal {
  id: string;
  name: string;
  codeName: string | null;
  status: string;
  dealType: string;
  sector: string;
  enterpriseValue: string | null;
}

interface SavedReport {
  id: string;
  dealName: string;
  generatedBy: string;
  generatedByName: string;
  fileName: string;
  fileSize: number | null;
  sectionsCompleted: number | null;
  overallScore: number | null;
  createdAt: string;
}

const diligenceSections = [
  { num: 1, title: "Corporate Structure & Organization", category: "legal" },
  { num: 2, title: "Capitalization & Ownership", category: "legal" },
  { num: 3, title: "Subsidiaries & Joint Ventures", category: "legal" },
  { num: 4, title: "Financial Due Diligence", category: "financial" },
  { num: 5, title: "Quality of Earnings Analysis", category: "financial" },
  { num: 6, title: "Working Capital Analysis", category: "financial" },
  { num: 7, title: "Debt & Capital Structure", category: "financial" },
  { num: 8, title: "Tax Matters & Compliance", category: "tax" },
  { num: 9, title: "Legal & Litigation Review", category: "legal" },
  { num: 10, title: "Material Contracts Analysis", category: "commercial" },
  { num: 11, title: "Intellectual Property Assessment", category: "ip" },
  { num: 12, title: "Real Property & Leases", category: "real_estate" },
  { num: 13, title: "Environmental Compliance", category: "environmental" },
  { num: 14, title: "Human Resources & Labor", category: "hr" },
  { num: 15, title: "Insurance Coverage Review", category: "insurance" },
  { num: 16, title: "IT & Cybersecurity", category: "technology" },
  { num: 17, title: "Regulatory & Compliance", category: "regulatory" },
  { num: 18, title: "Customer & Vendor Analysis", category: "commercial" },
  { num: 19, title: "Integration Considerations", category: "integration" },
  { num: 20, title: "Risk Summary & Red Flags", category: "risk" },
];

const webSearchSections = [
  { num: 21, title: "Media Coverage Analysis (Live Web Search)", category: "web" },
  { num: 22, title: "External Litigation Research (Live Web Search)", category: "web" },
  { num: 23, title: "Regulatory Actions & Enforcement (Live Web Search)", category: "web" },
];

export default function PEDealIntelligence() {
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [targetCompanyName, setTargetCompanyName] = useState("");
  const [enableLiveWebSearch, setEnableLiveWebSearch] = useState(true);
  const { toast } = useToast();

  const { data: deals = [], isLoading: dealsLoading } = useQuery<PEDeal[]>({
    queryKey: ["/api/pe-deals"],
  });

  const { data: savedReports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery<SavedReport[]>({
    queryKey: ["/api/pe-deal-intelligence/reports", selectedDealId],
    enabled: !!selectedDealId,
  });

  useEffect(() => {
    if (selectedDealId) {
      const selectedDeal = deals.find(d => d.id === selectedDealId);
      if (selectedDeal) {
        setTargetCompanyName(selectedDeal.name);
      }
    }
  }, [selectedDealId, deals]);

  const generateReport = useMutation({
    mutationFn: async ({ dealId, targetName, enableWebResearch }: { dealId: string; targetName: string; enableWebResearch: boolean }) => {
      const response = await fetch("/api/pe-deal-intelligence/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, target_company: targetName, enableWebResearch }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate report");
      }

      const blob = await response.blob();
      const reportId = response.headers.get('X-Report-Id');
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || `pe-due-diligence-${targetName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      
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
        description: "PE Due Diligence Report generated and saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pe-deal-intelligence/reports", selectedDealId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadReport = async (reportId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/pe-deal-intelligence/reports/${selectedDealId}/${reportId}/download`);
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

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(`/api/pe-deal-intelligence/reports/${selectedDealId}/${reportId}`, {
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
        description: "The report has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pe-deal-intelligence/reports", selectedDealId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleGenerate = () => {
    if (!selectedDealId) {
      toast({
        title: "Validation Error",
        description: "Please select a deal to analyze",
        variant: "destructive",
      });
      return;
    }
    if (!targetCompanyName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a target company name",
        variant: "destructive",
      });
      return;
    }
    generateReport.mutate({ dealId: selectedDealId, targetName: targetCompanyName, enableWebResearch: enableLiveWebSearch });
  };

  const selectedDeal = deals.find(d => d.id === selectedDealId);
  const totalSections = enableLiveWebSearch ? diligenceSections.length + webSearchSections.length : diligenceSections.length;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">PE Deal Intelligence</h1>
            <p className="text-muted-foreground mt-2">
              Generate comprehensive AI-powered M&A due diligence reports for private equity transactions
            </p>
          </div>

          <Card data-testid="card-generator">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Due Diligence Report Generator
              </CardTitle>
              <CardDescription>
                Automatically analyzes deal data room documents and generates a comprehensive due diligence 
                checklist report with findings, risk flags, and recommended next steps. Optionally includes 
                live web search for media coverage, litigation history, and regulatory actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="deal-select">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Select Deal to Analyze
                  </span>
                </Label>
                <Select
                  value={selectedDealId}
                  onValueChange={setSelectedDealId}
                  disabled={generateReport.isPending || dealsLoading}
                >
                  <SelectTrigger 
                    id="deal-select"
                    data-testid="select-deal"
                    className="w-full"
                  >
                    <SelectValue placeholder={dealsLoading ? "Loading deals..." : "Select a deal..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id} data-testid={`deal-option-${d.id}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{d.name}</span>
                          {d.codeName && (
                            <>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-muted-foreground">{d.codeName}</span>
                            </>
                          )}
                          <Badge variant="outline" className="text-xs">{d.dealType}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDeal && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Stage: {selectedDeal.status}</span>
                    <span>|</span>
                    <span>Sector: {selectedDeal.sector}</span>
                    {selectedDeal.enterpriseValue && (
                      <>
                        <span>|</span>
                        <span>EV: {selectedDeal.enterpriseValue}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-name">Target Company Name</Label>
                <Input
                  id="target-name"
                  data-testid="input-target-name"
                  placeholder="Enter target company name"
                  value={targetCompanyName}
                  onChange={(e) => setTargetCompanyName(e.target.value)}
                  disabled={generateReport.isPending || !selectedDealId}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-populated from deal name. Customize if needed for report headers.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-green-700 dark:text-emerald-400" />
                    <Label htmlFor="web-search-toggle" className="font-medium text-green-900 dark:text-green-100">
                      Include Live Web Search
                    </Label>
                  </div>
                  <p className="text-xs text-green-800 dark:text-green-200 max-w-md">
                    Adds sections 21-23 with real-time web search for media coverage, litigation history, 
                    and regulatory enforcement actions. Uses OpenAI's web search for current information with source citations.
                  </p>
                </div>
                <Switch
                  id="web-search-toggle"
                  data-testid="toggle-web-search"
                  checked={enableLiveWebSearch}
                  onCheckedChange={setEnableLiveWebSearch}
                  disabled={generateReport.isPending}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Due Diligence Sections ({totalSections} Total)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {diligenceSections.map((section) => (
                    <div key={section.num} className="flex items-start gap-2">
                      <span className="text-primary">{section.num}.</span>
                      <span>{section.title}</span>
                    </div>
                  ))}
                  {enableLiveWebSearch && webSearchSections.map((section) => (
                    <div key={section.num} className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-300">{section.num}.</span>
                      <span className="text-emerald-600 dark:text-emerald-300">{section.title}</span>
                    </div>
                  ))}
                </div>
                {enableLiveWebSearch && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-800 dark:text-green-200 flex items-start gap-2">
                    <Globe className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Live Web Search:</strong> Sections 21-23 use OpenAI's real-time web search to find current 
                      media coverage, litigation, and regulatory actions. Results include source citations. 
                      For critical due diligence, always verify findings through original sources.
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Data Sources {selectedDeal && <span className="font-normal text-muted-foreground">for {selectedDeal.name}</span>}
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {selectedDeal ? (
                    <>
                      <li className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Deal data room documents and files</li>
                      <li className="flex items-center gap-2"><DollarSign className="h-3 w-3" /> Financial statements and projections</li>
                      <li className="flex items-center gap-2"><Scale className="h-3 w-3" /> Legal documents and contracts</li>
                      <li className="flex items-center gap-2"><Users className="h-3 w-3" /> Management presentations and org charts</li>
                      <li className="flex items-center gap-2"><Shield className="h-3 w-3" /> Diligence questions and responses</li>
                      <li className="flex items-center gap-2"><Brain className="h-3 w-3" /> AI-powered risk analysis with confidence scoring</li>
                      {enableLiveWebSearch && (
                        <li className="text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                          <Globe className="h-3 w-3" /> Live web search: media, litigation, regulatory actions
                        </li>
                      )}
                    </>
                  ) : (
                    <>
                      <li>Select a deal to analyze its data room documents</li>
                      <li>Financial statements and projections will be included</li>
                      <li>Legal documents and contracts analysis</li>
                      <li>AI-powered risk flagging and scoring</li>
                    </>
                  )}
                </ul>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={generateReport.isPending || !selectedDealId}
                size="lg"
                className="w-full"
                data-testid="button-generate-report"
              >
                {generateReport.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Due Diligence Report (may take 20+ minutes)...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Generate Due Diligence Report PDF
                  </>
                )}
              </Button>

              {generateReport.isPending && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Please wait:</strong> The AI is comprehensively analyzing ALL data room documents
                    {enableLiveWebSearch ? ', researching media coverage, litigation history, and regulatory actions,' : ''} 
                    and generating a thorough {totalSections}-section due diligence report. For deals with extensive documentation, 
                    this can take 20 minutes or more. Quality over speed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
                  Previously generated due diligence reports for this deal
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
                    <p>No saved reports for this deal yet</p>
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
                            <span className="font-medium truncate">{report.dealName}</span>
                            {report.overallScore !== null && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs flex-shrink-0 ${
                                  report.overallScore >= 80 ? 'text-green-600 border-green-300' :
                                  report.overallScore >= 60 ? 'text-amber-600 border-amber-300' :
                                  'text-red-600 border-red-300'
                                }`}
                              >
                                {report.overallScore}% score
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
                              {report.sectionsCompleted !== null && (
                                <span>{report.sectionsCompleted} sections</span>
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
                            onClick={() => deleteReport.mutate(report.id)}
                            disabled={deleteReport.isPending}
                            title="Delete report"
                            data-testid={`button-delete-${report.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                About PE Due Diligence Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This AI-powered tool analyzes your deal's data room documents and diligence materials to generate 
                comprehensive due diligence reports suitable for investment committees, deal teams, and external advisors.
              </p>
              <p className="text-sm text-muted-foreground">
                Each report includes AI-identified risk flags across 20 key diligence areas, with severity ratings 
                and recommended follow-up actions. The report structure follows industry-standard PE due diligence 
                checklists covering corporate, financial, tax, legal, IP, HR, environmental, and technology matters.
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  <strong>Confidentiality Notice:</strong> Generated reports are marked as attorney work product 
                  and should be treated as confidential material. The AI analysis supplements but does not 
                  replace professional due diligence by qualified advisors.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
