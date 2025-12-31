import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Shield, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const lookupSchema = z.object({
  reportNumber: z.string().min(1, "Please enter a report number"),
});

type LookupFormData = z.infer<typeof lookupSchema>;

type ReportStatus = {
  reportNumber: string;
  status: string;
  incidentCategory: string;
  intakeDate: string;
  assignedTo?: string;
  lastUpdate?: string;
};

export default function WhistleblowerLookup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null);
  const [notFound, setNotFound] = useState(false);

  const form = useForm<LookupFormData>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      reportNumber: "",
    },
  });

  async function onSubmit(data: LookupFormData) {
    setIsSearching(true);
    setNotFound(false);
    setReportStatus(null);
    
    try {
      const response = await apiRequest("GET", `/api/whistleblower/lookup/${data.reportNumber}`, undefined);
      const result = await response.json() as ReportStatus;
      console.log("[Whistleblower Lookup] Received result:", result);
      setReportStatus(result);
    } catch (error: any) {
      if (error.message?.includes("not found") || error.message?.includes("404")) {
        setNotFound(true);
      } else {
        toast({
          variant: "destructive",
          title: "Lookup Failed",
          description: error.message || "Failed to look up report. Please try again.",
        });
      }
    } finally {
      setIsSearching(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      "intake": { variant: "secondary", label: "Intake" },
      "triage": { variant: "secondary", label: "Triage" },
      "assigned": { variant: "default", label: "Assigned" },
      "under_investigation": { variant: "default", label: "Under Investigation" },
      "resolved": { variant: "outline", label: "Resolved" },
      "closed": { variant: "outline", label: "Closed" },
    };
    
    const config = statusMap[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      "human_resources": "Human Resources / Employee Relations",
      "fraud": "Fraud / Financial Misconduct",
      "harassment": "Harassment / Discrimination",
      "safety": "Safety Violations",
      "ethics": "Ethics / Conflicts of Interest",
      "retaliation": "Retaliation",
      "data_breach": "Data Breach / Privacy",
      "environmental": "Environmental",
      "other": "Other",
    };
    return categoryMap[category] || category;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return format(date, "PPP");
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Case Status Lookup</h1>
              <p className="text-muted-foreground">Check the status of your whistleblower report</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Look Up Your Case</CardTitle>
            <CardDescription>
              Enter your case tracking number to view the current status of your report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="reportNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Case Tracking Number:</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="e.g., AUTO-HTL-2025-0001" 
                            {...field} 
                            data-testid="input-report-number"
                          />
                        </FormControl>
                        <Button type="submit" disabled={isSearching} data-testid="button-lookup">
                          {isSearching ? (
                            "Searching..."
                          ) : (
                            <>
                              <Search className="h-4 w-4 mr-2" />
                              Look Up
                            </>
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            {notFound && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="alert-not-found">
                  Case not found. Please check your tracking number and try again.
                </AlertDescription>
              </Alert>
            )}

            {reportStatus && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50" data-testid="div-report-status">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Case {reportStatus.reportNumber}</h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {formatDate(reportStatus.intakeDate)}
                    </p>
                  </div>
                  {getStatusBadge(reportStatus.status)}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <span className="text-sm font-medium">{getCategoryLabel(reportStatus.incidentCategory)}</span>
                  </div>

                  {reportStatus.assignedTo && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Assigned To:</span>
                      <span className="text-sm font-medium">Compliance Investigator</span>
                    </div>
                  )}

                  {reportStatus.lastUpdate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Update:</span>
                      <span className="text-sm font-medium">
                        {formatDate(reportStatus.lastUpdate)}
                      </span>
                    </div>
                  )}
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your case is being processed. Our team will continue to investigate this matter with strict confidentiality.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setLocation("/report")}
                data-testid="button-new-report"
              >
                Submit New Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
