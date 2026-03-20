import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Loader2,
  DollarSign,
  Clock,
  BarChart3,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { TitleClaim, ClaimActivityLog, TitleCommitment } from "@shared/schema";
import { format } from "date-fns";

const claimStatuses = [
  "filed",
  "acknowledged",
  "investigating",
  "negotiating",
  "litigating",
  "resolved",
  "closed",
] as const;

const claimStatusLabels: Record<string, string> = {
  filed: "Filed",
  acknowledged: "Acknowledged",
  investigating: "Investigating",
  negotiating: "Negotiating",
  litigating: "Litigating",
  resolved: "Resolved",
  closed: "Closed",
};

const claimStatusColors: Record<string, string> = {
  filed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  acknowledged: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  investigating: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  negotiating: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  litigating: "bg-red-500/20 text-red-400 border-red-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
  closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const claimTypeLabels: Record<string, string> = {
  lien_priority: "Lien Priority",
  boundary_dispute: "Boundary Dispute",
  easement_encroachment: "Easement/Encroachment",
  forgery_fraud: "Forgery/Fraud",
  missing_heir: "Missing Heir",
  mechanics_lien: "Mechanics Lien",
  tax_lien: "Tax Lien",
  judgment_lien: "Judgment Lien",
  survey_defect: "Survey Defect",
  recording_error: "Recording Error",
};

const validClaimTransitions: Record<string, string[]> = {
  filed: ["acknowledged"],
  acknowledged: ["investigating"],
  investigating: ["negotiating", "litigating"],
  negotiating: ["resolved", "litigating"],
  litigating: ["resolved"],
  resolved: ["closed"],
  closed: [],
};

interface ClaimFormState {
  commitmentId: string;
  policyNumber: string;
  claimType: string;
  propertyAddress: string;
  insuredName: string;
  claimantName: string;
  claimAmount: string;
  reserveAmount: string;
  description: string;
}

const emptyClaimForm: ClaimFormState = {
  commitmentId: "",
  policyNumber: "",
  claimType: "lien_priority",
  propertyAddress: "",
  insuredName: "",
  claimantName: "",
  claimAmount: "",
  reserveAmount: "",
  description: "",
};

export function TitleClaimsTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailClaim, setDetailClaim] = useState<TitleClaim | null>(null);
  const [claimForm, setClaimForm] = useState<ClaimFormState>(emptyClaimForm);
  const [noteText, setNoteText] = useState("");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [resolutionNotesInput, setResolutionNotesInput] = useState("");

  const { data: claims = [], isLoading } = useQuery<TitleClaim[]>({
    queryKey: ["/api/deals", dealId, "title", "claims"],
  });

  const { data: commitments = [] } = useQuery<TitleCommitment[]>({
    queryKey: ["/api/deals", dealId, "title", "commitments"],
  });

  const { data: claimActivity = [] } = useQuery<ClaimActivityLog[]>({
    queryKey: ["/api/deals", dealId, "title", "claims", detailClaim?.id, "activity"],
    enabled: !!detailClaim,
  });

  const createClaimMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/title/claims`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "claims"] });
      toast({ title: "Claim created" });
      setCreateDialogOpen(false);
      setClaimForm(emptyClaimForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateClaimMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/title/claims/${id}`, data);
      return res.json();
    },
    onSuccess: (updated: TitleClaim) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "claims"] });
      if (detailClaim) {
        queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "claims", detailClaim.id, "activity"] });
      }
      setDetailClaim(updated);
      toast({ title: "Claim updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ claimId, note }: { claimId: string; note: string }) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/title/claims/${claimId}/activity`, {
        action: "Note added",
        details: note,
      });
      return res.json();
    },
    onSuccess: () => {
      if (detailClaim) {
        queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "claims", detailClaim.id, "activity"] });
      }
      setNoteText("");
      toast({ title: "Note added" });
    },
  });

  const deleteClaimMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/deals/${dealId}/title/claims/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "title", "claims"] });
      setDetailClaim(null);
      toast({ title: "Claim deleted" });
    },
  });

  const statusCounts = claimStatuses.reduce((acc, s) => {
    acc[s] = claims.filter((c) => c.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const totalExposure = claims.reduce((s, c) => s + (c.claimAmount ? parseFloat(String(c.claimAmount)) : 0), 0);
  const totalPaid = claims.reduce((s, c) => s + (c.paidAmount ? parseFloat(String(c.paidAmount)) : 0), 0);
  const claimTypeCount = new Set(claims.map((c) => c.claimType).filter(Boolean)).size;
  const resolvedClaims = claims.filter((c) => c.resolvedDate);
  const avgResolutionDays = resolvedClaims.length > 0
    ? Math.round(
        resolvedClaims.reduce((sum, c) => {
          const filed = c.filedDate ? new Date(c.filedDate).getTime() : c.createdAt ? new Date(c.createdAt).getTime() : Date.now();
          const resolved = new Date(c.resolvedDate!).getTime();
          return sum + (resolved - filed) / (1000 * 60 * 60 * 24);
        }, 0) / resolvedClaims.length
      )
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">Claims Management</h3>
        <Button onClick={() => { setClaimForm(emptyClaimForm); setCreateDialogOpen(true); }} data-testid="button-create-claim">
          <Plus className="mr-2 h-4 w-4" /> File Claim
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {claimStatuses.map((status, idx) => (
              <div key={status} className="flex items-center">
                <div
                  className={`flex flex-col items-center px-3 py-2 rounded-md min-w-[100px] cursor-pointer hover-elevate ${
                    statusCounts[status] > 0 ? "bg-muted" : "bg-muted/40"
                  }`}
                  data-testid={`pipeline-stage-${status}`}
                >
                  <span className="text-xl font-bold">{statusCounts[status]}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {claimStatusLabels[status]}
                  </span>
                </div>
                {idx < claimStatuses.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Exposure</span>
            </div>
            <span className="text-xl font-bold" data-testid="text-total-exposure">
              ${totalExposure.toLocaleString()}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Paid to Date</span>
            </div>
            <span className="text-xl font-bold" data-testid="text-total-paid">
              ${totalPaid.toLocaleString()}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Resolution</span>
            </div>
            <span className="text-xl font-bold" data-testid="text-avg-resolution">
              {avgResolutionDays} days
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Claim Types</span>
            </div>
            <span className="text-xl font-bold" data-testid="text-claim-type-count">
              {claimTypeCount}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Claims ({claims.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No claims filed yet. Click "File Claim" to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Claim #</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Type</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Claimant</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Amount</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Filed</th>
                    <th className="pb-2 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="border-b last:border-0 hover-elevate cursor-pointer"
                      onClick={() => setDetailClaim(claim)}
                      data-testid={`row-claim-${claim.id}`}
                    >
                      <td className="py-2 pr-3 font-mono text-xs">{claim.claimNumber}</td>
                      <td className="py-2 pr-3">{claimTypeLabels[claim.claimType || ""] || claim.claimType}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={claimStatusColors[claim.status] || ""}>
                          {claimStatusLabels[claim.status]}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{claim.claimantName || "---"}</td>
                      <td className="py-2 pr-3 text-right">
                        {claim.claimAmount ? `$${parseFloat(String(claim.claimAmount)).toLocaleString()}` : "---"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {claim.filedDate ? format(new Date(claim.filedDate), "MMM d, yyyy") : "---"}
                      </td>
                      <td className="py-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>File New Claim</DialogTitle>
            <DialogDescription>Create a new title insurance claim.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Claim Type</Label>
                <Select value={claimForm.claimType} onValueChange={(v) => setClaimForm({ ...claimForm, claimType: v })}>
                  <SelectTrigger data-testid="select-claim-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(claimTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Commitment</Label>
                <Select value={claimForm.commitmentId} onValueChange={(v) => setClaimForm({ ...claimForm, commitmentId: v })}>
                  <SelectTrigger data-testid="select-claim-commitment"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {commitments.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.commitmentNumber || c.id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Policy Number</Label>
              <Input value={claimForm.policyNumber} onChange={(e) => setClaimForm({ ...claimForm, policyNumber: e.target.value })} data-testid="input-claim-policy" />
            </div>
            <div>
              <Label>Property Address</Label>
              <Input value={claimForm.propertyAddress} onChange={(e) => setClaimForm({ ...claimForm, propertyAddress: e.target.value })} data-testid="input-claim-address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Insured Name</Label>
                <Input value={claimForm.insuredName} onChange={(e) => setClaimForm({ ...claimForm, insuredName: e.target.value })} data-testid="input-claim-insured" />
              </div>
              <div>
                <Label>Claimant Name</Label>
                <Input value={claimForm.claimantName} onChange={(e) => setClaimForm({ ...claimForm, claimantName: e.target.value })} data-testid="input-claim-claimant" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Claim Amount</Label>
                <Input type="number" value={claimForm.claimAmount} onChange={(e) => setClaimForm({ ...claimForm, claimAmount: e.target.value })} data-testid="input-claim-amount" />
              </div>
              <div>
                <Label>Reserve Amount</Label>
                <Input type="number" value={claimForm.reserveAmount} onChange={(e) => setClaimForm({ ...claimForm, reserveAmount: e.target.value })} data-testid="input-claim-reserve" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={claimForm.description} onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })} rows={3} data-testid="input-claim-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!claimForm.commitmentId) return;
                const payload: Record<string, unknown> = {
                  commitmentId: claimForm.commitmentId,
                  claimType: claimForm.claimType,
                  filedDate: new Date().toISOString().split("T")[0],
                };
                if (claimForm.policyNumber) payload.policyNumber = claimForm.policyNumber;
                if (claimForm.propertyAddress) payload.propertyAddress = claimForm.propertyAddress;
                if (claimForm.insuredName) payload.insuredName = claimForm.insuredName;
                if (claimForm.claimantName) payload.claimantName = claimForm.claimantName;
                if (claimForm.claimAmount) payload.claimAmount = claimForm.claimAmount;
                if (claimForm.reserveAmount) payload.reserveAmount = claimForm.reserveAmount;
                if (claimForm.description) payload.description = claimForm.description;
                createClaimMutation.mutate(payload);
              }}
              disabled={createClaimMutation.isPending || !claimForm.commitmentId}
              data-testid="button-submit-claim"
            >
              {createClaimMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              File Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailClaim} onOpenChange={(open) => { if (!open) setDetailClaim(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {detailClaim?.claimNumber || "Claim Details"}
            </DialogTitle>
            <DialogDescription>
              {detailClaim?.claimType ? claimTypeLabels[detailClaim.claimType] || detailClaim.claimType : "Claim details and activity"}
            </DialogDescription>
          </DialogHeader>

          {detailClaim && (
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={claimStatusColors[detailClaim.status] || ""}>
                    {claimStatusLabels[detailClaim.status]}
                  </Badge>
                  {(validClaimTransitions[detailClaim.status] || []).map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      size="sm"
                      variant="outline"
                      onClick={() => updateClaimMutation.mutate({ id: detailClaim.id, data: { status: nextStatus } })}
                      disabled={updateClaimMutation.isPending}
                      data-testid={`button-transition-${nextStatus}`}
                    >
                      {updateClaimMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {claimStatusLabels[nextStatus]}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Claimant</span>
                    <p className="text-sm font-medium">{detailClaim.claimantName || "---"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Insured</span>
                    <p className="text-sm font-medium">{detailClaim.insuredName || "---"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Property</span>
                    <p className="text-sm font-medium">{detailClaim.propertyAddress || "---"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Policy #</span>
                    <p className="text-sm font-medium">{detailClaim.policyNumber || "---"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-3 pb-2">
                      <span className="text-xs text-muted-foreground">Claim Amount</span>
                      <p className="font-bold" data-testid="text-detail-claim-amount">
                        {detailClaim.claimAmount ? `$${parseFloat(String(detailClaim.claimAmount)).toLocaleString()}` : "---"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-2">
                      <span className="text-xs text-muted-foreground">Reserve</span>
                      <p className="font-bold" data-testid="text-detail-reserve">
                        {detailClaim.reserveAmount ? `$${parseFloat(String(detailClaim.reserveAmount)).toLocaleString()}` : "---"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-2">
                      <span className="text-xs text-muted-foreground">Paid</span>
                      <p className="font-bold" data-testid="text-detail-paid">
                        {detailClaim.paidAmount ? `$${parseFloat(String(detailClaim.paidAmount)).toLocaleString()}` : "$0"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {detailClaim.status !== "closed" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Update Paid Amount</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={paidAmountInput}
                          onChange={(e) => setPaidAmountInput(e.target.value)}
                          data-testid="input-update-paid"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (paidAmountInput) {
                              updateClaimMutation.mutate({ id: detailClaim.id, data: { paidAmount: paidAmountInput } });
                              setPaidAmountInput("");
                            }
                          }}
                          data-testid="button-update-paid"
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Resolution Notes</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Notes..."
                          value={resolutionNotesInput}
                          onChange={(e) => setResolutionNotesInput(e.target.value)}
                          data-testid="input-resolution-notes"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (resolutionNotesInput) {
                              updateClaimMutation.mutate({ id: detailClaim.id, data: { resolutionNotes: resolutionNotesInput } });
                              setResolutionNotesInput("");
                            }
                          }}
                          data-testid="button-update-notes"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {detailClaim.description && (
                  <div>
                    <span className="text-xs text-muted-foreground">Description</span>
                    <p className="text-sm mt-1">{detailClaim.description}</p>
                  </div>
                )}
                {detailClaim.resolutionNotes && (
                  <div>
                    <span className="text-xs text-muted-foreground">Resolution Notes</span>
                    <p className="text-sm mt-1">{detailClaim.resolutionNotes}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">Activity Log</h4>
                  <div className="space-y-2 mb-3">
                    {claimActivity.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No activity yet.</p>
                    ) : (
                      claimActivity.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 text-xs border-l-2 border-muted pl-3 py-1">
                          <div className="flex-1">
                            <span className="font-medium">{entry.action}</span>
                            {entry.details && (
                              <span className="text-muted-foreground ml-1">- {entry.details}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && noteText.trim()) {
                          addNoteMutation.mutate({ claimId: detailClaim.id, note: noteText.trim() });
                        }
                      }}
                      data-testid="input-claim-note"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (noteText.trim()) {
                          addNoteMutation.mutate({ claimId: detailClaim.id, note: noteText.trim() });
                        }
                      }}
                      disabled={addNoteMutation.isPending || !noteText.trim()}
                      data-testid="button-add-note"
                    >
                      {addNoteMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => { if (detailClaim) deleteClaimMutation.mutate(detailClaim.id); }}
              disabled={deleteClaimMutation.isPending}
              data-testid="button-delete-claim"
            >
              Delete Claim
            </Button>
            <Button variant="outline" onClick={() => setDetailClaim(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
