import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  ChevronRight,
  Calendar,
  Users,
  ClipboardList,
  Filter,
  ArrowLeft,
} from "lucide-react";
import type { Deal, RequestList } from "@shared/schema";
import { format } from "date-fns";

export default function TransactionsRequestLists() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: requestLists, isLoading: listsLoading } = useQuery<RequestList[]>({
    queryKey: ["/api/deals", selectedDealId, "request-lists"],
    enabled: !!selectedDealId,
  });

  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; requestingParty?: string; respondingParty?: string; dueDate?: string }) => {
      return apiRequest("POST", `/api/deals/${selectedDealId}/request-lists`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", selectedDealId, "request-lists"] });
      setIsCreateOpen(false);
      toast({
        title: "Request list created",
        description: "The document request list has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create request list",
        variant: "destructive",
      });
    },
  });

  const activeDeals = deals?.filter((d) => d.status === "active" || d.status === "pipeline") || [];
  const selectedDeal = deals?.find((d) => d.id === selectedDealId);

  const filteredLists = requestLists?.filter((list) =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateList = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createListMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      requestingParty: formData.get("requestingParty") as string,
      respondingParty: formData.get("respondingParty") as string,
      dueDate: formData.get("dueDate") as string || undefined,
    });
  };

  if (dealsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/transactions/deals")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Request Lists (DRL)</h1>
            <p className="text-muted-foreground">
              Manage document request lists for due diligence
            </p>
          </div>
        </div>
      </div>

      {!selectedDealId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Select a Deal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Choose an active deal to view or create document request lists.
            </p>
            <div className="grid gap-3">
              {activeDeals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No active deals found. Create a deal first to add request lists.
                </p>
              ) : (
                activeDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedDealId(deal.id)}
                    data-testid={`card-deal-${deal.id}`}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {deal.dealNumber} • {deal.dealType?.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={deal.status === "active" ? "default" : "secondary"}>
                          {deal.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDealId(null)}
                    data-testid="button-change-deal"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Change Deal
                  </Button>
                  <div className="border-l pl-3">
                    <p className="font-medium">{selectedDeal?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDeal?.dealNumber}
                    </p>
                  </div>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-list">
                      <Plus className="h-4 w-4 mr-2" />
                      New Request List
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Request List</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateList} className="space-y-4">
                      <div>
                        <Label htmlFor="name">List Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="e.g., Initial Due Diligence Request"
                          required
                          data-testid="input-list-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Describe the purpose of this request list"
                          data-testid="input-list-description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="requestingParty">Requesting Party</Label>
                          <Input
                            id="requestingParty"
                            name="requestingParty"
                            placeholder="e.g., Buyer"
                            data-testid="input-requesting-party"
                          />
                        </div>
                        <div>
                          <Label htmlFor="respondingParty">Responding Party</Label>
                          <Input
                            id="respondingParty"
                            name="respondingParty"
                            placeholder="e.g., Target"
                            data-testid="input-responding-party"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                          id="dueDate"
                          name="dueDate"
                          type="date"
                          data-testid="input-due-date"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createListMutation.isPending}
                          data-testid="button-submit-list"
                        >
                          {createListMutation.isPending ? "Creating..." : "Create List"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search request lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-lists"
              />
            </div>
          </div>

          {listsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : filteredLists?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Request Lists</h3>
                <p className="text-muted-foreground mb-4">
                  Create a document request list to start tracking due diligence requests.
                </p>
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-list">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First List
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Parties</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLists?.map((list) => (
                    <TableRow
                      key={list.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/transactions/request-lists/${list.id}`)}
                      data-testid={`row-list-${list.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{list.name}</p>
                          {list.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {list.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3" />
                          {list.requestingParty || "—"} → {list.respondingParty || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {list.dueDate ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(list.dueDate), "MMM d, yyyy")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{list.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={list.isActive ? "default" : "secondary"}>
                          {list.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-${list.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/transactions/request-lists/${list.id}`);
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              Export
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
