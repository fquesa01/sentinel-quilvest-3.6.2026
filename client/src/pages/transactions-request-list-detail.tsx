import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  ArrowLeft,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Search,
  Download,
  Trash2,
} from "lucide-react";
import type { RequestList, RequestItem } from "@shared/schema";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  reviewed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  not_applicable: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  follow_up: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300",
};

type RequestListWithItems = RequestList & { items: RequestItem[] };

export default function TransactionsRequestListDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { data: requestList, isLoading } = useQuery<RequestListWithItems>({
    queryKey: ["/api/request-lists", params.id],
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/request-lists/${params.id}/items`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/request-lists", params.id] });
      setIsAddItemOpen(false);
      toast({
        title: "Item added",
        description: "The request item has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: any }) => {
      return apiRequest("PATCH", `/api/request-items/${itemId}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/request-lists", params.id] });
      toast({
        title: "Item updated",
        description: "The request item has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/request-items/${itemId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/request-lists", params.id] });
      toast({
        title: "Item deleted",
        description: "The request item has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ itemIds, updates }: { itemIds: string[]; updates: any }) => {
      return apiRequest("POST", "/api/request-items/bulk-update", { itemIds, updates });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/request-lists", params.id] });
      setSelectedItems(new Set());
      toast({
        title: "Items updated",
        description: "Selected items have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update items",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addItemMutation.mutate({
      itemNumber: formData.get("itemNumber"),
      category: formData.get("category"),
      description: formData.get("description"),
      priority: formData.get("priority") || "medium",
      dueDate: formData.get("dueDate") || undefined,
    });
  };

  const filteredItems = requestList?.items?.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const statusCounts = {
    pending: requestList?.items?.filter((i) => i.status === "pending").length || 0,
    in_progress: requestList?.items?.filter((i) => i.status === "in_progress").length || 0,
    received: requestList?.items?.filter((i) => i.status === "received").length || 0,
    reviewed: requestList?.items?.filter((i) => i.status === "reviewed").length || 0,
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!requestList) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Request List Not Found</h3>
            <Button onClick={() => navigate("/transactions/request-lists")}>
              Back to Request Lists
            </Button>
          </CardContent>
        </Card>
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
            onClick={() => navigate("/transactions/request-lists")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{requestList.name}</h1>
            <p className="text-muted-foreground">
              {requestList.requestingParty} → {requestList.respondingParty}
              {requestList.dueDate && ` • Due: ${format(new Date(requestList.dueDate), "MMM d, yyyy")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-item">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Request Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="itemNumber">Item #</Label>
                    <Input
                      id="itemNumber"
                      name="itemNumber"
                      placeholder="e.g., 1.1"
                      data-testid="input-item-number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      name="category"
                      placeholder="e.g., Corporate"
                      data-testid="input-category"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the document or information requested"
                    required
                    data-testid="input-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      data-testid="input-item-due-date"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddItemOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addItemMutation.isPending}
                    data-testid="button-submit-item"
                  >
                    {addItemMutation.isPending ? "Adding..." : "Add Item"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("pending")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("in_progress")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.in_progress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("received")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
              <FileCheck className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.received}</p>
              <p className="text-sm text-muted-foreground">Received</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("reviewed")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.reviewed}</p>
              <p className="text-sm text-muted-foreground">Reviewed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-items"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="not_applicable">Not Applicable</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
          </SelectContent>
        </Select>
        {selectedItems.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-actions">
                Bulk Actions ({selectedItems.size})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() =>
                  bulkUpdateMutation.mutate({
                    itemIds: Array.from(selectedItems),
                    updates: { status: "received" },
                  })
                }
              >
                Mark as Received
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  bulkUpdateMutation.mutate({
                    itemIds: Array.from(selectedItems),
                    updates: { status: "reviewed" },
                  })
                }
              >
                Mark as Reviewed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  bulkUpdateMutation.mutate({
                    itemIds: Array.from(selectedItems),
                    updates: { status: "not_applicable" },
                  })
                }
              >
                Mark as N/A
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="w-[80px]">Item #</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No items found. Add items to this request list.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleSelectItem(item.id)}
                      data-testid={`checkbox-item-${item.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.itemNumber || "—"}
                  </TableCell>
                  <TableCell>
                    {item.category ? (
                      <Badge variant="outline">{item.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2">{item.description}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        Note: {item.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[item.priority || "medium"]}>
                      {item.priority || "medium"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.status || "pending"}
                      onValueChange={(value) =>
                        updateItemMutation.mutate({ itemId: item.id, data: { status: value } })
                      }
                    >
                      <SelectTrigger
                        className={`w-full ${statusColors[item.status || "pending"]}`}
                        data-testid={`select-status-${item.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="not_applicable">N/A</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-item-menu-${item.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Add Note</DropdownMenuItem>
                        <DropdownMenuItem>Link Document</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
