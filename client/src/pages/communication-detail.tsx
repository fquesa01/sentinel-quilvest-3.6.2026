import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Mail, User, MessageSquare, Forward, Languages, Type, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { DocumentCoding } from "@/components/document-coding";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Communication {
  id: string;
  sender: string;
  recipients: string[] | string;
  subject: string;
  body: string;
  communicationType: string;
  timestamp: string;
  alertIds?: string[];
  caseIds?: string[];
  isPrivileged?: boolean;
  legalHold?: string;
  originalLanguage?: string;
  translatedBody?: string;
  isTranslated?: string;
}

interface DocumentCoding {
  id: string;
  documentId: string;
  reviewerId: string;
  notes?: string;
  createdAt: string;
}

type FontSize = "small" | "medium" | "large" | "extra-large";

const fontSizeClasses: Record<FontSize, string> = {
  "small": "text-sm",
  "medium": "text-base",
  "large": "text-lg",
  "extra-large": "text-xl",
};

const fontSizeLabels: Record<FontSize, string> = {
  "small": "Small",
  "medium": "Medium",
  "large": "Large",
  "extra-large": "Extra Large",
};

export default function CommunicationDetail() {
  const [, params] = useRoute("/communications/:id");
  const commId = params?.id;
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [notes, setNotes] = useState("");
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardData, setForwardData] = useState({
    recipientType: "investigator" as "investigator" | "subject" | "external",
    recipientEmail: "",
    recipientName: "",
    notes: "",
  });
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{ subject: string; body: string } | null>(null);
  
  // Font size state with localStorage persistence
  const [fontSize, setFontSize] = useState<FontSize>("medium");

  // Load font size preference from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem("documentViewerFontSize");
        if (saved && (saved === "small" || saved === "medium" || saved === "large" || saved === "extra-large")) {
          setFontSize(saved as FontSize);
        }
      }
    } catch (error) {
      console.error("Failed to load font size preference:", error);
    }
  }, []);

  // Save font size preference to localStorage when it changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem("documentViewerFontSize", fontSize);
      }
    } catch (error) {
      console.error("Failed to save font size preference:", error);
    }
  }, [fontSize]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: communication, isLoading } = useQuery<Communication>({
    queryKey: ["/api/communications", commId],
    enabled: !!commId,
  });

  // Initialize translation from cached data if available
  useEffect(() => {
    if (communication?.isTranslated && communication?.translatedBody) {
      setTranslatedContent({
        subject: communication.translatedSubject || communication.subject,
        body: communication.translatedBody,
      });
      setShowTranslation(true);
    } else if (communication && !communication.isTranslated) {
      setTranslatedContent(null);
      setShowTranslation(false);
    }
  }, [communication]);

  const { data: coding } = useQuery<DocumentCoding>({
    queryKey: ["/api/document-codings", commId],
    enabled: !!commId,
  });

  const updateCodingMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!commId) return;
      return await apiRequest("POST", `/api/document-codings`, {
        documentId: commId,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-codings", commId] });
      toast({
        title: "Notes Saved",
        description: "Your annotations have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const forwardMutation = useMutation({
    mutationFn: async () => {
      if (!commId) return;
      return await apiRequest("POST", "/api/document-forwards", {
        communicationId: commId,
        recipientType: forwardData.recipientType,
        recipientEmail: forwardData.recipientEmail,
        recipientName: forwardData.recipientName || null,
        notes: forwardData.notes || null,
      });
    },
    onSuccess: () => {
      setForwardDialogOpen(false);
      setForwardData({
        recipientType: "investigator",
        recipientEmail: "",
        recipientName: "",
        notes: "",
      });
      toast({
        title: "Document Forwarded",
        description: "The document has been forwarded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to forward document",
        variant: "destructive",
      });
    },
  });

  const translateMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest("POST", `/api/communications/${docId}/translate`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      setTranslatedContent({
        subject: data.translatedSubject,
        body: data.translatedBody,
      });
      setShowTranslation(true);
      // Invalidate cache to refetch updated communication with translation
      queryClient.invalidateQueries({ queryKey: ["/api/communications", commId] });
      toast({
        title: "Translation Complete",
        description: `Translated from ${data.originalLanguage || "detected language"} to English`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Translation Error",
        description: error.message || "Failed to translate document",
        variant: "destructive",
      });
    },
  });

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    // Auto-save after 2 seconds of no typing
    const timer = setTimeout(() => {
      updateCodingMutation.mutate(newNotes);
    }, 2000);
    return () => clearTimeout(timer);
  };

  useEffect(() => {
    if (coding?.notes) {
      setNotes(coding.notes);
    }
  }, [coding]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!communication) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Communication not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/communications">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-communication-detail">
            {showTranslation && translatedContent ? translatedContent.subject : communication.subject}
          </h1>
          <p className="text-muted-foreground mt-1">
            {communication.sender} → {Array.isArray(communication.recipients) ? communication.recipients.join(", ") : communication.recipients}
          </p>
        </div>
        {communication.isPrivileged && (
          <Badge variant="destructive" data-testid="badge-privileged">
            Privileged
          </Badge>
        )}
        {communication.legalHold && communication.legalHold !== "none" && (
          <Badge variant="outline" data-testid="badge-legal-hold">
            Legal Hold
          </Badge>
        )}
        {communication.originalLanguage && (
          <Badge variant="outline" data-testid="badge-original-language">
            <Languages className="h-3 w-3 mr-1" />
            {communication.originalLanguage}
          </Badge>
        )}
        {showTranslation ? (
          <Button
            variant="outline"
            onClick={() => setShowTranslation(false)}
            data-testid="button-show-original"
          >
            <Languages className="h-4 w-4 mr-2" />
            Show Original
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              if (translatedContent) {
                setShowTranslation(true);
              } else {
                translateMutation.mutate(commId!);
              }
            }}
            disabled={translateMutation.isPending}
            data-testid="button-translate"
          >
            <Languages className="h-4 w-4 mr-2" />
            {translateMutation.isPending ? "Translating..." : "Translate to English"}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-font-size">
              <Type className="h-4 w-4 mr-2" />
              {fontSizeLabels[fontSize]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(fontSizeLabels) as FontSize[]).map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => setFontSize(size)}
                data-testid={`menuitem-font-${size}`}
              >
                {fontSize === size && <Check className="h-4 w-4 mr-2" />}
                {fontSize !== size && <span className="w-4 mr-2" />}
                {fontSizeLabels[size]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          onClick={() => setForwardDialogOpen(true)}
          data-testid="button-forward-document"
        >
          <Forward className="h-4 w-4 mr-2" />
          Forward Document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Message Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">From</p>
                    <p className="font-medium" data-testid="text-sender">{communication.sender}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">To</p>
                    <p className="font-medium" data-testid="text-recipient">
                      {Array.isArray(communication.recipients) ? communication.recipients.join(", ") : communication.recipients}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium" data-testid="text-channel">{communication.communicationType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Timestamp</p>
                    <p className="font-medium" data-testid="text-timestamp">
                      {format(new Date(communication.timestamp), "PPpp")}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-muted-foreground mb-2">Subject</p>
                  <p className={`font-medium mb-4 break-words ${fontSizeClasses[fontSize]}`} data-testid="text-subject">
                    {showTranslation && translatedContent ? translatedContent.subject : communication.subject}
                  </p>
                  {showTranslation && translatedContent && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
                        <Languages className="h-4 w-4" />
                        <span className="font-medium">English Translation</span>
                      </div>
                    </div>
                  )}
                  <p className="text-muted-foreground mb-2">Content</p>
                  <div 
                    className={`bg-muted p-4 rounded-md whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full ${fontSizeClasses[fontSize]}`}
                    style={{ wordWrap: 'break-word', overflowWrap: 'anywhere' }}
                    data-testid="text-content"
                  >
                    {showTranslation && translatedContent ? translatedContent.body : communication.body}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Coding Component */}
          <DocumentCoding
            entityType="communication"
            entityId={commId!}
            initialNotes={notes}
            onNotesChange={handleNotesChange}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Alerts</p>
                {communication.alertIds && communication.alertIds.length > 0 ? (
                  <div className="space-y-2">
                    {communication.alertIds.map((alertId) => (
                      <Link key={alertId} href={`/alerts/${alertId}`}>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          Alert {alertId.slice(0, 8)}
                        </Button>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No related alerts</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Cases</p>
                {communication.caseIds && communication.caseIds.length > 0 ? (
                  <div className="space-y-2">
                    {communication.caseIds.map((caseId) => (
                      <Link key={caseId} href={`/cases/${caseId}`}>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          Case {caseId.slice(0, 8)}
                        </Button>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No related cases</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Communication ID</span>
                <span className="font-mono text-xs" data-testid="text-id">{communication.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Privilege Status</span>
                <span data-testid="text-privilege-status">
                  {communication.isPrivileged ? "Privileged" : "Not Privileged"}
                </span>
              </div>
              {communication.legalHold && communication.legalHold !== "none" && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Legal Hold</span>
                  <span data-testid="text-legal-hold-status">{communication.legalHold}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forward Document Dialog */}
      <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
        <DialogContent data-testid="dialog-forward-document">
          <DialogHeader>
            <DialogTitle>Forward Document</DialogTitle>
            <DialogDescription>
              Forward this document to an investigator, subject, or external party
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientType">Recipient Type</Label>
              <Select
                value={forwardData.recipientType}
                onValueChange={(value) =>
                  setForwardData({ ...forwardData, recipientType: value as any })
                }
              >
                <SelectTrigger id="recipientType" data-testid="select-recipient-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investigator">Investigator</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="external">External Party</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="email@example.com"
                value={forwardData.recipientEmail}
                onChange={(e) =>
                  setForwardData({ ...forwardData, recipientEmail: e.target.value })
                }
                data-testid="input-recipient-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
              <Input
                id="recipientName"
                placeholder="John Doe"
                value={forwardData.recipientName}
                onChange={(e) =>
                  setForwardData({ ...forwardData, recipientName: e.target.value })
                }
                data-testid="input-recipient-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forwardNotes">Notes (Optional)</Label>
              <Textarea
                id="forwardNotes"
                placeholder="Add any notes or context for the recipient..."
                value={forwardData.notes}
                onChange={(e) =>
                  setForwardData({ ...forwardData, notes: e.target.value })
                }
                rows={3}
                data-testid="textarea-forward-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForwardDialogOpen(false)}
              disabled={forwardMutation.isPending}
              data-testid="button-cancel-forward"
            >
              Cancel
            </Button>
            <Button
              onClick={() => forwardMutation.mutate()}
              disabled={!forwardData.recipientEmail || forwardMutation.isPending}
              data-testid="button-confirm-forward"
            >
              <Forward className="h-4 w-4 mr-2" />
              {forwardMutation.isPending ? "Forwarding..." : "Forward Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
