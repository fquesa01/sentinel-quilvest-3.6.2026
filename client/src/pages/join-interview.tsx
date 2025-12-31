import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Video, ExternalLink, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface InterviewData {
  interview: {
    id: string;
    intervieweeName: string;
    intervieweeEmail: string;
    interviewType: string;
    scheduledFor: string;
    status: string;
    meetingLink?: string;
    consentRequired: string;
    upjohnWarningGiven: string;
    accessToken: string;
  };
  case: {
    id: string;
    title: string;
    caseNumber: string;
  } | null;
}

export default function JoinInterview() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<InterviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInterview() {
      try {
        const response = await fetch(`/api/join-interview/${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to load interview");
        }
        const interviewData = await response.json();
        setData(interviewData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchInterview();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Interview Not Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { interview } = data;
  const scheduledDate = new Date(interview.scheduledFor);
  const isUpcoming = scheduledDate > new Date();
  const formattedDate = format(scheduledDate, "EEEE, MMMM d, yyyy");
  const formattedTime = format(scheduledDate, "h:mm a");

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Interview Invitation</CardTitle>
          <CardDescription>
            You have been invited to participate in an interview
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Interviewee</p>
              <p className="font-medium text-lg">{interview.intervieweeName}</p>
              <p className="text-sm text-muted-foreground">{interview.intervieweeEmail}</p>
            </div>
            
            {data.case && (
              <div>
                <p className="text-sm text-muted-foreground">Case</p>
                <p className="font-medium">{data.case.title}</p>
                <p className="text-sm text-muted-foreground">#{data.case.caseNumber}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{formattedDate}</p>
                <p className="text-sm text-muted-foreground">{formattedTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {isUpcoming ? (
                  <span className="text-green-600">Upcoming</span>
                ) : (
                  <span className="text-muted-foreground">Scheduled</span>
                )}
              </span>
            </div>
          </div>

          {interview.status === "completed" ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Interview Completed</AlertTitle>
              <AlertDescription>
                This interview has already been completed. Thank you for your participation.
              </AlertDescription>
            </Alert>
          ) : interview.status === "cancelled" ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Interview Cancelled</AlertTitle>
              <AlertDescription>
                This interview has been cancelled. Please contact the organizer for more information.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {interview.meetingLink ? (
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => window.open(interview.meetingLink, '_blank')}
                  data-testid="button-join-meeting"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Join Video Meeting
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => window.location.href = `/witness-interview/${token}`}
                  data-testid="button-start-interview"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Start Interview
                </Button>
              )}
              
              <p className="text-center text-sm text-muted-foreground">
                Please ensure you have a stable internet connection and a quiet environment for the interview.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
