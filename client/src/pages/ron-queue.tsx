import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  ArrowLeft,
  ListTodo,
  Users,
  UserCheck,
  Zap,
  Hand,
  ArrowUpRight,
  MapPin,
  Clock,
  AlertCircle,
  Loader2,
  CircleDot,
  Wifi,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RonTransaction, RonNotary } from "@shared/schema";

type EnrichedQueueTransaction = RonTransaction & { signerCount: number };

interface QueueStats {
  unassigned: number;
  queued: number;
  claimed: number;
  assigned: number;
  inProgress: number;
}

const queueStatusColors: Record<string, string> = {
  unassigned: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  queued: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  claimed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  assigned: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const queueStatusLabels: Record<string, string> = {
  unassigned: "Unassigned",
  queued: "In Queue",
  claimed: "Claimed",
  assigned: "Assigned",
};

const availabilityColors: Record<string, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  busy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  offline: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function RonQueue() {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<EnrichedQueueTransaction | null>(null);
  const [selectedNotaryId, setSelectedNotaryId] = useState("");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<QueueStats>({
    queryKey: ["/api/ron/queue/stats"],
  });

  const { data: queuedTransactions, isLoading: queueLoading } = useQuery<EnrichedQueueTransaction[]>({
    queryKey: ["/api/ron/queue/transactions"],
  });

  const { data: notaries } = useQuery<RonNotary[]>({
    queryKey: ["/api/ron/notaries"],
  });

  const pushToQueueMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await apiRequest("POST", `/api/ron/queue/push/${transactionId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue/transactions"] });
      toast({ title: "Pushed to Queue", description: "Transaction added to the notary queue." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const forceAssignMutation = useMutation({
    mutationFn: async ({ transactionId, notaryId }: { transactionId: string; notaryId: string }) => {
      const res = await apiRequest("POST", `/api/ron/queue/assign/${transactionId}`, { notaryId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue/transactions"] });
      setAssignDialogOpen(false);
      setSelectedTransaction(null);
      setSelectedNotaryId("");
      toast({ title: "Assigned", description: "Transaction assigned to notary." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await apiRequest("POST", `/api/ron/queue/auto-assign/${transactionId}`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/queue/transactions"] });
      toast({
        title: "Auto-Assigned",
        description: `Assigned to ${data.notary?.firstName} ${data.notary?.lastName}.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async ({ notaryId, status }: { notaryId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/ron/notaries/${notaryId}/availability`, { availabilityStatus: status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/notaries"] });
      toast({ title: "Updated", description: "Notary availability updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activeNotaries = notaries?.filter(n => n.status === "active") || [];
  const availableNotaries = activeNotaries.filter(n => (n as any).availabilityStatus === "available");

  const eligibleForAssign = selectedTransaction
    ? activeNotaries.filter(n => {
        if (!selectedTransaction.jurisdiction) return true;
        return n.commissionState.toUpperCase() === selectedTransaction.jurisdiction?.toUpperCase();
      })
    : [];

  if (statsLoading || queueLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ron-queue-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/ron/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-queue-title">
              <ListTodo className="h-6 w-6" />
              Notary Queue
            </h1>
            <p className="text-muted-foreground">
              Manage transaction routing and notary assignments
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-queue-unassigned">
              {stats?.unassigned ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Queue</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-queue-queued">
              {stats?.queued ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimed</CardTitle>
            <Hand className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-queue-claimed">
              {stats?.claimed ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-queue-assigned">
              {stats?.assigned ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <CircleDot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-queue-in-progress">
              {stats?.inProgress ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Queue Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {queuedTransactions && queuedTransactions.length > 0 ? (
              <div className="space-y-3">
                {queuedTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border gap-3"
                    data-testid={`queue-txn-${txn.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <Link href={`/ron/transactions/${txn.id}`}>
                        <p className="font-medium truncate hover:underline cursor-pointer">
                          {txn.title || "Untitled"}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                        {txn.jurisdiction && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {txn.jurisdiction}
                          </span>
                        )}
                        {txn.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {format(new Date(txn.scheduledDate), "MMM d, h:mm a")}
                          </span>
                        )}
                        <span>{txn.signerCount} signer{txn.signerCount !== 1 ? "s" : ""}</span>
                        {(txn.queuePriority ?? 0) > 0 && (
                          <Badge variant="outline" className="text-xs">Priority {txn.queuePriority}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <Badge className={queueStatusColors[txn.queueStatus || "unassigned"]}>
                        {queueStatusLabels[txn.queueStatus || "unassigned"]}
                      </Badge>
                      {(txn.queueStatus === "unassigned" || !txn.queueStatus) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pushToQueueMutation.mutate(txn.id)}
                          disabled={pushToQueueMutation.isPending}
                          data-testid={`button-push-queue-${txn.id}`}
                        >
                          {pushToQueueMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                          )}
                          Queue
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTransaction(txn);
                          setAssignDialogOpen(true);
                        }}
                        data-testid={`button-assign-txn-${txn.id}`}
                      >
                        <UserCheck className="h-3 w-3 mr-1" /> Assign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => autoAssignMutation.mutate(txn.id)}
                        disabled={autoAssignMutation.isPending}
                        data-testid={`button-auto-assign-${txn.id}`}
                      >
                        {autoAssignMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3 mr-1" />
                        )}
                        Auto
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No transactions in the queue</p>
                <p className="text-sm mt-1">Transactions without a notary assigned will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Notary Availability ({availableNotaries.length}/{activeNotaries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeNotaries.length > 0 ? (
                <div className="space-y-3">
                  {activeNotaries.map((notary) => {
                    const avail = (notary as any).availabilityStatus || "offline";
                    return (
                      <div
                        key={notary.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-md border border-border"
                        data-testid={`notary-avail-${notary.id}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notary.firstName} {notary.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{notary.commissionState}</p>
                        </div>
                        <Select
                          value={avail}
                          onValueChange={(val) => updateAvailabilityMutation.mutate({ notaryId: notary.id, status: val })}
                        >
                          <SelectTrigger className="w-[120px]" data-testid={`select-avail-${notary.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">
                              <span className="flex items-center gap-1"><Wifi className="h-3 w-3 text-green-500" /> Available</span>
                            </SelectItem>
                            <SelectItem value="busy">
                              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-yellow-500" /> Busy</span>
                            </SelectItem>
                            <SelectItem value="offline">
                              <span className="flex items-center gap-1"><WifiOff className="h-3 w-3 text-gray-500" /> Offline</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No active notaries</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Transaction to Notary</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm text-muted-foreground">Transaction</p>
                <p className="font-medium">{selectedTransaction.title}</p>
                {selectedTransaction.jurisdiction && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {selectedTransaction.jurisdiction}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Select Notary</p>
                <Select value={selectedNotaryId} onValueChange={setSelectedNotaryId}>
                  <SelectTrigger data-testid="select-assign-notary">
                    <SelectValue placeholder="Choose a notary..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleForAssign.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.firstName} {n.lastName} ({n.commissionState})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {eligibleForAssign.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No eligible notaries found for this jurisdiction.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTransaction && selectedNotaryId) {
                  forceAssignMutation.mutate({
                    transactionId: selectedTransaction.id,
                    notaryId: selectedNotaryId,
                  });
                }
              }}
              disabled={!selectedNotaryId || forceAssignMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {forceAssignMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
