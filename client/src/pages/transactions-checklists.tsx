import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  FileText,
  ChevronRight,
  ArrowLeft,
  CheckSquare,
  ListChecks,
} from "lucide-react";
import type { Deal, DDChecklist } from "@shared/schema";
import { format } from "date-fns";

const checklistTypes = [
  { value: "legal", label: "Legal Due Diligence" },
  { value: "financial", label: "Financial Due Diligence" },
  { value: "tax", label: "Tax Due Diligence" },
  { value: "operational", label: "Operational Due Diligence" },
  { value: "hr", label: "HR & Employment" },
  { value: "ip", label: "Intellectual Property" },
  { value: "environmental", label: "Environmental" },
  { value: "regulatory", label: "Regulatory Compliance" },
  { value: "technology", label: "Technology & IT" },
  { value: "closing", label: "Closing Checklist" },
];

export default function TransactionsChecklists() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: checklists, isLoading: checklistsLoading } = useQuery<DDChecklist[]>({
    queryKey: ["/api/deals", selectedDealId, "checklists"],
    enabled: !!selectedDealId,
  });

  const createChecklistMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; checklistType?: string }) => {
      return apiRequest("POST", `/api/deals/${selectedDealId}/checklists`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", selectedDealId, "checklists"] });
      setIsCreateOpen(false);
      toast({
        title: "Checklist created",
        description: "The due diligence checklist has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checklist",
        variant: "destructive",
      });
    },
  });

  const activeDeals = deals?.filter((d) => d.status === "active" || d.status === "pipeline") || [];
  const selectedDeal = deals?.find((d) => d.id === selectedDealId);

  const filteredChecklists = checklists?.filter((cl) =>
    cl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cl.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cl.checklistType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateChecklist = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createChecklistMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      checklistType: formData.get("checklistType") as string,
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
            onClick={() => navigate("/transactions")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Due Diligence Checklists</h1>
            <p className="text-muted-foreground">
              Track due diligence tasks and progress
            </p>
          </div>
        </div>
      </div>

      {!selectedDealId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Select a Deal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Choose an active deal to view or create due diligence checklists.
            </p>
            <div className="grid gap-3">
              {activeDeals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No active deals found. Create a deal first to add checklists.
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
                    <Button data-testid="button-create-checklist">
                      <Plus className="h-4 w-4 mr-2" />
                      New Checklist
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Checklist</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateChecklist} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Checklist Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="e.g., Legal Due Diligence - Corporate"
                          required
                          data-testid="input-checklist-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="checklistType">Checklist Type</Label>
                        <Select name="checklistType" defaultValue="legal">
                          <SelectTrigger data-testid="select-checklist-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {checklistTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Describe the scope of this checklist"
                          data-testid="input-checklist-description"
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
                          disabled={createChecklistMutation.isPending}
                          data-testid="button-submit-checklist"
                        >
                          {createChecklistMutation.isPending ? "Creating..." : "Create Checklist"}
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
                placeholder="Search checklists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-checklists"
              />
            </div>
          </div>

          {checklistsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : filteredChecklists?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Checklists</h3>
                <p className="text-muted-foreground mb-4">
                  Create a due diligence checklist to track tasks and progress.
                </p>
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-checklist">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Checklist
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredChecklists?.map((checklist) => (
                <Card
                  key={checklist.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(`/transactions/checklists/${checklist.id}`)}
                  data-testid={`card-checklist-${checklist.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded">
                          <CheckSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{checklist.name}</CardTitle>
                          {checklist.checklistType && (
                            <Badge variant="outline" className="mt-1">
                              {checklistTypes.find((t) => t.value === checklist.checklistType)?.label ||
                                checklist.checklistType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {checklist.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {checklist.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{checklist.completionPercentage || 0}%</span>
                      </div>
                      <Progress value={checklist.completionPercentage || 0} className="h-2" />
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Created {checklist.createdAt ? format(new Date(checklist.createdAt), "MMM d, yyyy") : "—"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
