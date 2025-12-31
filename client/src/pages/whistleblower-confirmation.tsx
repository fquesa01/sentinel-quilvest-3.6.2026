import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function WhistleblowerConfirmation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get report number and access code from query string
  const params = new URLSearchParams(window.location.search);
  const reportNumber = params.get("id") || "UNKNOWN";
  const accessCode = params.get("accessCode");
  
  console.log("[Confirmation] URL params:", { reportNumber, accessCode });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportNumber);
    toast({
      title: "Copied!",
      description: "Report number copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="container max-w-2xl">
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Case Submitted</CardTitle>
            <CardDescription className="text-base">
              Your case has been successfully submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-6 rounded-lg text-center space-y-2">
              <p className="text-sm text-muted-foreground">Your case tracking number:</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-bold font-mono" data-testid="text-report-number">{reportNumber}</p>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={copyToClipboard}
                  data-testid="button-copy-number"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Please save this number to check your case status
              </p>
              {accessCode && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Anonymous Access Code:</p>
                  <p className="text-sm font-mono text-muted-foreground mt-1" data-testid="text-access-code">{accessCode}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Keep this code secure - it allows anonymous status checks
                  </p>
                </div>
              )}
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Thank you for bringing this issue to our attention. Your report will be reviewed by our compliance team
                within 7 business days. You can use your tracking number to check the status of your case at any time.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm font-medium">What happens next?</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Your report will be assigned to a compliance investigator</li>
                <li>Initial assessment will be completed within 7 days</li>
                <li>You will receive acknowledgment if you provided contact information</li>
                <li>The investigation will proceed with strict confidentiality</li>
                <li>You can check status updates using your tracking number</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/report/lookup")}
                className="flex-1"
                data-testid="button-check-status"
              >
                Check Case Status
              </Button>
              <Button
                onClick={() => setLocation("/")}
                className="flex-1"
                data-testid="button-return-home"
              >
                Return to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
