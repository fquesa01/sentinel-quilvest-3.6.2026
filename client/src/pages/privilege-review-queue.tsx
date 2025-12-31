import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Mail,
  Calendar,
  User,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PrivilegeItem = {
  id: string;
  itemType: "communication" | "interview" | "case";
  itemId: string;
  privilegeStatus: string;
  privilegeBasis: string;
  privilegeAssertedBy: string;
  privilegeAssertedAt: string;
  privilegeReviewStatus: string;
  privilegeNotes?: string;
  // Communication specific
  subject?: string;
  sender?: string;
  channel?: string;
  // Interview specific
  interviewType?: string;
  intervieweeEmail?: string;
  intervieweeName?: string;
  // Case specific
  caseName?: string;
  caseDescription?: string;
  violationType?: string;
};

const privilegeStatusLabels: Record<string, string> = {
  none: "None",
  attorney_client_privileged: "Attorney-Client Privileged",
  work_product: "Work Product",
  both: "Both Protections",
};

const privilegeBasisLabels: Record<string, string> = {
  upjohn_warning: "Upjohn Warning",
  in_re_kbr: "In re KBR Doctrine",
  attorney_work_product: "Attorney Work Product",
  counsel_directed_investigation: "Counsel-Directed Investigation",
  legal_advice_sought: "Legal Advice Sought",
  litigation_preparation: "Litigation Preparation",
};

const itemTypeIcons = {
  communication: Mail,
  interview: Calendar,
  case: FileText,
};

export default function PrivilegeReviewQueue() {
  const [selectedItem, setSelectedItem] = useState<PrivilegeItem | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const { toast } = useToast();

  const { data: queue, isLoading } = useQuery<PrivilegeItem[]>({
    queryKey: ["/api/privilege-review-queue"],
  });

  const reviewMutation = useMutation({
    mutationFn: async (item: PrivilegeItem) => {
      const endpoint =
        item.itemType === "communication"
          ? `/api/communications/${item.itemId}/privilege`
          : item.itemType === "interview"
          ? `/api/interviews/${item.itemId}/privilege`
          : `/api/cases/${item.itemId}/privilege`;

      const response = await apiRequest("PATCH", endpoint, {
        privilegeReviewStatus: reviewStatus,
        privilegeNotes: reviewNotes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/privilege-review-queue"] });
      toast({
        title: "Privilege Review Completed",
        description: `The privilege assertion has been ${reviewStatus}.`,
      });
      setReviewDialogOpen(false);
      setSelectedItem(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to review privilege assertion",
        variant: "destructive",
      });
    },
  });

  const handleReviewClick = (item: PrivilegeItem) => {
    setSelectedItem(item);
    setReviewDialogOpen(true);
    setReviewStatus("approved");
    setReviewNotes(item.privilegeNotes || "");
  };

  const handleSubmitReview = () => {
    if (selectedItem) {
      reviewMutation.mutate(selectedItem);
    }
  };

  const renderItemDetails = (item: PrivilegeItem) => {
    if (item.itemType === "communication") {
      return (
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium">Subject:</span> {item.subject || "N/A"}
          </div>
          <div>
            <span className="font-medium">From:</span> {item.sender || "N/A"}
          </div>
          <div>
            <span className="font-medium">Channel:</span> {item.channel || "N/A"}
          </div>
        </div>
      );
    } else if (item.itemType === "interview") {
      return (
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium">Interviewee:</span> {item.intervieweeName || "N/A"}
          </div>
          <div>
            <span className="font-medium">Email:</span> {item.intervieweeEmail || "N/A"}
          </div>
          <div>
            <span className="font-medium">Type:</span> {item.interviewType || "N/A"}
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium">Case:</span> {item.caseName || "N/A"}
          </div>
          <div>
            <span className="font-medium">Violation Type:</span> {item.violationType || "N/A"}
          </div>
          {item.caseDescription && (
            <div>
              <span className="font-medium">Description:</span> {item.caseDescription}
            </div>
          )}
        </div>
      );
    }
  };

  const groupedQueue = queue?.reduce((acc, item) => {
    if (!acc[item.itemType]) {
      acc[item.itemType] = [];
    }
    acc[item.itemType].push(item);
    return acc;
  }, {} as Record<string, PrivilegeItem[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Privilege Review Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and approve attorney-client privilege assertions
          </p>
        </div>
        <Badge variant="outline" className="text-base">
          {queue?.length || 0} Pending
        </Badge>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="border-b px-6">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({queue?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="communication" data-testid="tab-communications">
              Communications ({groupedQueue?.communication?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="interview" data-testid="tab-interviews">
              Interviews ({groupedQueue?.interview?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="case" data-testid="tab-cases">
              Cases ({groupedQueue?.case?.length || 0})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!queue || queue.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Reviews</h3>
                  <p className="text-muted-foreground">
                    All privilege assertions have been reviewed.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <TabsContent value="all" className="mt-0 space-y-4">
                {queue.map((item) => {
                  const Icon = itemTypeIcons[item.itemType];
                  return (
                    <Card key={item.id} className="hover-elevate" data-testid={`card-item-${item.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base capitalize">
                                {item.itemType}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {renderItemDetails(item)}
                              </CardDescription>
                              <div className="flex items-center gap-2 mt-3">
                                <Badge variant="secondary">
                                  {privilegeStatusLabels[item.privilegeStatus] || item.privilegeStatus}
                                </Badge>
                                <Badge variant="outline">
                                  {privilegeBasisLabels[item.privilegeBasis] || item.privilegeBasis}
                                </Badge>
                                {item.privilegeAssertedAt && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(item.privilegeAssertedAt), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleReviewClick(item)}
                            data-testid={`button-review-${item.id}`}
                          >
                            Review
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </TabsContent>

              {Object.entries(groupedQueue || {}).map(([type, items]) => (
                <TabsContent key={type} value={type} className="mt-0 space-y-4">
                  {items.map((item) => {
                    const Icon = itemTypeIcons[item.itemType];
                    return (
                      <Card key={item.id} className="hover-elevate">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-md bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base capitalize">
                                  {item.itemType}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {renderItemDetails(item)}
                                </CardDescription>
                                <div className="flex items-center gap-2 mt-3">
                                  <Badge variant="secondary">
                                    {privilegeStatusLabels[item.privilegeStatus] || item.privilegeStatus}
                                  </Badge>
                                  <Badge variant="outline">
                                    {privilegeBasisLabels[item.privilegeBasis] || item.privilegeBasis}
                                  </Badge>
                                  {item.privilegeAssertedAt && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDistanceToNow(new Date(item.privilegeAssertedAt), {
                                        addSuffix: true,
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button onClick={() => handleReviewClick(item)}>Review</Button>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </TabsContent>
              ))}
            </>
          )}
        </div>
      </Tabs>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-privilege-review">
          <DialogHeader>
            <DialogTitle>Review Privilege Assertion</DialogTitle>
            <DialogDescription>
              Review and approve or reject this privilege assertion
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold capitalize">{selectedItem.itemType}</span>
                </div>
                {renderItemDetails(selectedItem)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Privilege Status</Label>
                  <p className="font-medium">
                    {privilegeStatusLabels[selectedItem.privilegeStatus] ||
                      selectedItem.privilegeStatus}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Basis</Label>
                  <p className="font-medium">
                    {privilegeBasisLabels[selectedItem.privilegeBasis] ||
                      selectedItem.privilegeBasis}
                  </p>
                </div>
              </div>

              {selectedItem.privilegeNotes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Existing Notes</Label>
                  <p className="text-sm mt-1 p-3 rounded-md bg-muted">
                    {selectedItem.privilegeNotes}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="review-status">Review Decision</Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger id="review-status" data-testid="select-review-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved" data-testid="option-approved">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Approve Privilege
                      </div>
                    </SelectItem>
                    <SelectItem value="waived" data-testid="option-waived">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        Waive Privilege
                      </div>
                    </SelectItem>
                    <SelectItem value="pending" data-testid="option-pending">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Needs More Review
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add notes about your review decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  data-testid="textarea-review-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={reviewMutation.isPending}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
