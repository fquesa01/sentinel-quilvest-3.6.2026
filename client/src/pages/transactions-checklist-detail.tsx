import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  ArrowLeft,
  CheckSquare,
  Trash2,
  AlertTriangle,
  Info,
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import type { DDChecklist, DDChecklistItem } from "@shared/schema";
import { format } from "date-fns";

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 border-red-500/30",
  high: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  medium: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  low: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

const statusIcons: Record<string, typeof Circle> = {
  not_started: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  not_applicable: XCircle,
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  not_applicable: "N/A",
};

const statusColors: Record<string, string> = {
  not_started: "text-muted-foreground",
  in_progress: "text-amber-500",
  completed: "text-green-500",
  not_applicable: "text-slate-400",
};

const categories = [
  "Corporate Organization & Structure",
  "Material Contracts",
  "Intellectual Property",
  "Real Property",
  "Employment & Labor",
  "Litigation & Legal Proceedings",
  "Regulatory & Compliance",
  "Environmental",
  "Insurance",
  "Tax",
  "Quality of Earnings",
  "Balance Sheet",
  "Working Capital",
  "Debt & Capital Structure",
  "Forecasts & Projections",
  "Other",
];

interface ChecklistWithItems extends DDChecklist {
  items: DDChecklistItem[];
}

export default function TransactionsChecklistDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const { data: checklist, isLoading } = useQuery<ChecklistWithItems>({
    queryKey: ["/api/checklists", id],
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<DDChecklistItem> }) => {
      return apiRequest("PATCH", `/api/checklist-items/${itemId}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/checklists", id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: { title: string; category?: string; description?: string; priority?: string }) => {
      return apiRequest("POST", `/api/checklists/${id}/items`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/checklists", id] });
      setIsAddItemOpen(false);
      toast({
        title: "Item added",
        description: "The checklist item has been added successfully.",
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

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/checklist-items/${itemId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/checklists", id] });
      toast({
        title: "Item removed",
        description: "The checklist item has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createItemMutation.mutate({
      title: formData.get("title") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as string,
    });
  };

  const handleStatusChange = (itemId: string, status: string) => {
    updateItemMutation.mutate({
      itemId,
      data: {
        status: status as DDChecklistItem["status"],
        completedDate: status === "completed" ? new Date() : null,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Checklist Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The checklist you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => navigate("/transactions/checklists")} data-testid="button-back-to-checklists">
              Back to Checklists
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = checklist.items || [];
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, DDChecklistItem[]>);

  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    const aIndex = categories.indexOf(a);
    const bIndex = categories.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const totalItems = items.filter((i) => i.status !== "not_applicable").length;
  const completedItems = items.filter((i) => i.status === "completed").length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const criticalCount = items.filter((i) => (i as any).priority === "critical" && i.status !== "completed" && i.status !== "not_applicable").length;
  const highCount = items.filter((i) => (i as any).priority === "high" && i.status !== "completed" && i.status !== "not_applicable").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/transactions/checklists")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CheckSquare className="h-6 w-6" />
              {checklist.name}
            </h1>
            <p className="text-muted-foreground">
              {checklist.description || "Due diligence checklist"}
            </p>
          </div>
        </div>
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Checklist Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <Label htmlFor="title">Item Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Certificate of Good Standing"
                  required
                  data-testid="input-item-title"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue="Other">
                  <SelectTrigger data-testid="select-item-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger data-testid="select-item-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Guidance / Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Add review guidance or notes for this item"
                  data-testid="input-item-description"
                />
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
                  disabled={createItemMutation.isPending}
                  data-testid="button-submit-item"
                >
                  {createItemMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Progress</div>
            <div className="text-2xl font-bold">{completionPercentage}%</div>
            <Progress value={completionPercentage} className="h-2 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {completedItems} of {totalItems} items completed
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Items</div>
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Across {sortedCategories.length} categories
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Critical Pending</div>
            <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Items requiring immediate attention
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">High Priority</div>
            <div className="text-2xl font-bold text-amber-500">{highCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Items pending review
            </div>
          </CardContent>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Items Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add items to track your due diligence progress.
            </p>
            <Button onClick={() => setIsAddItemOpen(true)} data-testid="button-add-first-item">
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          value={expandedCategories}
          onValueChange={setExpandedCategories}
          className="space-y-2"
        >
          {sortedCategories.map((category) => {
            const categoryItems = itemsByCategory[category];
            const categoryCompleted = categoryItems.filter((i) => i.status === "completed").length;
            const categoryTotal = categoryItems.filter((i) => i.status !== "not_applicable").length;
            const categoryPercentage = categoryTotal > 0 ? Math.round((categoryCompleted / categoryTotal) * 100) : 0;

            return (
              <AccordionItem
                key={category}
                value={category}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline py-4" data-testid={`accordion-${category.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{category}</span>
                      <Badge variant="outline" className="text-xs">
                        {categoryItems.length} items
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 hidden sm:block">
                        <Progress value={categoryPercentage} className="h-2" />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {categoryPercentage}%
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-2">
                    {categoryItems.map((item) => {
                      const StatusIcon = statusIcons[item.status || "not_started"];
                      const priority = (item as any).priority || "medium";
                      
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate"
                          data-testid={`item-${item.id}`}
                        >
                          <Checkbox
                            checked={item.status === "completed"}
                            onCheckedChange={(checked) =>
                              handleStatusChange(item.id, checked ? "completed" : "not_started")
                            }
                            className="mt-1"
                            data-testid={`checkbox-${item.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.itemNumber && (
                                    <span className="text-sm text-muted-foreground font-mono">
                                      {item.itemNumber}
                                    </span>
                                  )}
                                  <span
                                    className={`font-medium ${
                                      item.status === "completed" ? "line-through text-muted-foreground" : ""
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {priority && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs capitalize ${priorityColors[priority] || ""}`}
                                  >
                                    {priority}
                                  </Badge>
                                )}
                                <Select
                                  value={item.status || "not_started"}
                                  onValueChange={(value) => handleStatusChange(item.id, value)}
                                >
                                  <SelectTrigger className="w-32 h-8" data-testid={`status-${item.id}`}>
                                    <div className="flex items-center gap-1">
                                      <StatusIcon className={`h-3 w-3 ${statusColors[item.status || "not_started"]}`} />
                                      <span className="text-xs">{statusLabels[item.status || "not_started"]}</span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_started">
                                      <div className="flex items-center gap-2">
                                        <Circle className="h-3 w-3" />
                                        Not Started
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="in_progress">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-amber-500" />
                                        In Progress
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="completed">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        Completed
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="not_applicable">
                                      <div className="flex items-center gap-2">
                                        <XCircle className="h-3 w-3 text-slate-400" />
                                        N/A
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      data-testid={`delete-${item.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Item</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove "{item.title}" from this checklist?
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteItemMutation.mutate(item.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            {item.notes && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                  <Info className="h-3 w-3" />
                                  Notes
                                </div>
                                {item.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
