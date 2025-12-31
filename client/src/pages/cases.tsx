import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Folder, ExternalLink, Plus, ArrowUpDown, ArrowUp, ArrowDown, X, Archive, ArchiveRestore, Lock, Unlock, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type Case = {
  id: string;
  caseNumber: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  violationType: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  closedBy?: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
};

const createCaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  violationType: z.string().min(1, "Case type is required"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  employeeName: z.string().optional(),
});

const editCaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

type CreateCaseFormData = z.infer<typeof createCaseSchema>;
type EditCaseFormData = z.infer<typeof editCaseSchema>;

export default function CasesPage() {
  const [caseNumberFilter, setCaseNumberFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [violationTypeFilter, setViolationTypeFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("desc");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [showArchivedCases, setShowArchivedCases] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const form = useForm<CreateCaseFormData>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: {
      title: "",
      description: "",
      violationType: "",
      priority: "medium",
      employeeName: "",
    },
  });
  
  const editForm = useForm<EditCaseFormData>({
    resolver: zodResolver(editCaseSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });
  
  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  // Admin query to fetch closed/archived cases
  const { data: archivedCases, isLoading: archivedLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases", "includeClosedArchived"],
    queryFn: async () => {
      const response = await fetch("/api/cases?includeClosedArchived=true");
      if (!response.ok) throw new Error("Failed to fetch cases");
      const allCases = await response.json();
      // Filter to only closed/archived cases for the admin section
      return allCases.filter((c: Case) => c.status === "closed" || c.archivedAt);
    },
    enabled: isAdmin && showArchivedCases,
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: CreateCaseFormData) => {
      const response = await apiRequest("POST", "/api/cases", data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.refetchQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Case Created",
        description: `Case ${data.caseNumber} has been created successfully`,
      });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create case",
        variant: "destructive",
      });
    },
  });

  // Admin case action mutations
  const closeCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/close`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", "includeClosedArchived"] });
      toast({
        title: "Case Closed",
        description: "The case has been closed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close case",
        variant: "destructive",
      });
    },
  });

  const archiveCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/archive`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", "includeClosedArchived"] });
      toast({
        title: "Case Archived",
        description: "The case has been archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive case",
        variant: "destructive",
      });
    },
  });

  const reopenCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/reopen`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", "includeClosedArchived"] });
      toast({
        title: "Case Reopened",
        description: "The case has been reopened for investigation",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reopen case",
        variant: "destructive",
      });
    },
  });

  const editCaseMutation = useMutation({
    mutationFn: async ({ caseId, data }: { caseId: string; data: EditCaseFormData }) => {
      const response = await apiRequest("PATCH", `/api/cases/${caseId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Case Updated",
        description: "The case has been updated successfully",
      });
      setEditDialogOpen(false);
      setEditingCase(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update case",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateCaseFormData) => {
    createCaseMutation.mutate(data);
  };

  const onEditSubmit = (data: EditCaseFormData) => {
    if (editingCase) {
      editCaseMutation.mutate({ caseId: editingCase.id, data });
    }
  };

  const handleEditCase = (caseItem: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCase(caseItem);
    editForm.reset({
      title: caseItem.title,
      description: caseItem.description || "",
    });
    setEditDialogOpen(true);
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      critical: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return <Badge variant={variants[priority] || "outline"} data-testid={`badge-priority-${priority}`}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      investigation: "default",
      review: "secondary",
      resolution: "outline",
      closed: "outline",
    };
    const colors: Record<string, string> = {
      investigation: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      review: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      resolution: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      closed: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    };
    
    return (
      <Badge 
        variant="outline" 
        className={colors[status]}
        data-testid={`badge-status-${status}`}
      >
        {status}
      </Badge>
    );
  };

  const getViolationBadge = (type: string | null) => {
    if (!type) return <span className="text-muted-foreground text-sm">—</span>;
    
    const labels: Record<string, string> = {
      fcpa: "FCPA",
      antitrust: "Antitrust",
      insider_trading: "Insider Trading",
      aml: "AML",
      sox: "SOX",
      sec: "SEC",
      off_channel: "Off-Channel",
      privacy: "Privacy",
    };
    
    return (
      <Badge variant="outline" data-testid={`badge-violation-${type}`}>
        {labels[type] || type}
      </Badge>
    );
  };

  const filteredAndSortedCases = (() => {
    let filtered = cases || [];
    
    // Apply filters
    if (caseNumberFilter) {
      filtered = filtered.filter(c => 
        c.caseNumber.toLowerCase().includes(caseNumberFilter.toLowerCase())
      );
    }
    
    if (titleFilter) {
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(titleFilter.toLowerCase())
      );
    }
    
    if (violationTypeFilter) {
      filtered = filtered.filter(c => 
        c.violationType?.toLowerCase() === violationTypeFilter.toLowerCase()
      );
    }
    
    // Apply sorting
    if (sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
    }
    
    return filtered;
  })();
  
  const hasActiveFilters = caseNumberFilter || titleFilter || violationTypeFilter;
  
  const clearFilters = () => {
    setCaseNumberFilter("");
    setTitleFilter("");
    setViolationTypeFilter("");
  };
  
  const toggleSort = () => {
    setSortOrder(prev => {
      if (prev === null) return "desc";
      if (prev === "desc") return "asc";
      return "desc";
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between stagger-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-cases">
            Cases
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage compliance investigation cases
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-case">
                <Plus className="mr-2 h-4 w-4" />
                Create Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Case</DialogTitle>
                <DialogDescription>
                  Create a new compliance investigation case
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter case title" {...field} data-testid="input-case-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter case description"
                            {...field}
                            data-testid="textarea-case-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="violationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Case Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-violation-type">
                                <SelectValue placeholder="Select case type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                              <SelectItem value="fcpa">FCPA</SelectItem>
                              <SelectItem value="antitrust">Antitrust</SelectItem>
                              <SelectItem value="insider_trading">Insider Trading</SelectItem>
                              <SelectItem value="aml">AML/BSA</SelectItem>
                              <SelectItem value="sox">SOX</SelectItem>
                              <SelectItem value="sec">SEC</SelectItem>
                              <SelectItem value="off_channel">Off-Channel</SelectItem>
                              <SelectItem value="privacy">Privacy</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="employeeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Name (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter employee name if applicable"
                            {...field}
                            data-testid="input-employee-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createCaseMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* Edit Case Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setEditingCase(null);
              editForm.reset();
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Case</DialogTitle>
                <DialogDescription>
                  Update the case title and description
                </DialogDescription>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter case title" {...field} data-testid="input-edit-case-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter case description"
                            {...field}
                            data-testid="input-edit-case-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditDialogOpen(false);
                        setEditingCase(null);
                        editForm.reset();
                      }}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={editCaseMutation.isPending}
                      data-testid="button-submit-edit"
                    >
                      {editCaseMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="stagger-2">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Active Cases ({filteredAndSortedCases.length})
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                Case Number
              </label>
              <Input
                placeholder="Filter by case number..."
                value={caseNumberFilter}
                onChange={(e) => setCaseNumberFilter(e.target.value)}
                data-testid="input-filter-case-number"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                Title
              </label>
              <Input
                placeholder="Filter by title..."
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                data-testid="input-filter-title"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                Violation Type
              </label>
              <Select value={violationTypeFilter || undefined} onValueChange={(value) => setViolationTypeFilter(value)}>
                <SelectTrigger data-testid="select-filter-violation-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="fcpa">FCPA</SelectItem>
                  <SelectItem value="antitrust">Antitrust</SelectItem>
                  <SelectItem value="insider_trading">Insider Trading</SelectItem>
                  <SelectItem value="aml">AML</SelectItem>
                  <SelectItem value="sox">SOX</SelectItem>
                  <SelectItem value="sec">SEC</SelectItem>
                  <SelectItem value="off_channel">Off-Channel</SelectItem>
                  <SelectItem value="privacy">Privacy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedCases.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Cases Found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters ? "Try adjusting your filters" : "Load demo data to see sample investigation cases"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Violation Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSort}
                      className="h-8 px-2 -ml-2"
                      data-testid="button-sort-date"
                    >
                      Created
                      {sortOrder === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
                      {sortOrder === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
                      {sortOrder === null && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCases.map((caseItem) => (
                  <TableRow 
                    key={caseItem.id} 
                    className="hover-elevate cursor-pointer" 
                    data-testid={`row-case-${caseItem.id}`}
                    onClick={() => setLocation(`/cases/${caseItem.id}`)}
                  >
                    <TableCell className="font-mono text-sm" data-testid={`text-case-number-${caseItem.id}`}>
                      {caseItem.caseNumber}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="font-medium" data-testid={`text-case-title-${caseItem.id}`}>
                          {caseItem.title}
                        </div>
                        {caseItem.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {caseItem.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getViolationBadge(caseItem.violationType)}</TableCell>
                    <TableCell>{getPriorityBadge(caseItem.priority)}</TableCell>
                    <TableCell>{getStatusBadge(caseItem.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(caseItem.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEditCase(caseItem, e)}
                          title="Edit Case"
                          data-testid={`button-edit-case-${caseItem.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <span className="inline-flex items-center gap-1 text-sm text-primary" data-testid={`link-view-case-${caseItem.id}`}>
                          View Details
                          <ExternalLink className="h-3 w-3" />
                        </span>
                        {isAdmin && caseItem.status !== "closed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeCaseMutation.mutate(caseItem.id);
                            }}
                            disabled={closeCaseMutation.isPending}
                            title="Close Case"
                            data-testid={`button-close-case-${caseItem.id}`}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && !caseItem.archivedAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveCaseMutation.mutate(caseItem.id);
                            }}
                            disabled={archiveCaseMutation.isPending}
                            title="Archive Case"
                            data-testid={`button-archive-case-${caseItem.id}`}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admin Section: Closed and Archived Cases */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArchiveRestore className="h-5 w-5" />
                Closed & Archived Cases
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchivedCases(!showArchivedCases)}
                data-testid="button-toggle-archived-cases"
              >
                {showArchivedCases ? "Hide" : "Show"} Archived Cases
              </Button>
            </div>
          </CardHeader>
          {showArchivedCases && (
            <CardContent>
              {archivedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : !archivedCases || archivedCases.length === 0 ? (
                <div className="text-center py-8">
                  <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No closed or archived cases</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Number</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Closed/Archived</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedCases.map((caseItem) => (
                      <TableRow key={caseItem.id} data-testid={`row-archived-case-${caseItem.id}`}>
                        <TableCell className="font-mono text-sm">
                          {caseItem.caseNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{caseItem.title}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {caseItem.status === "closed" && (
                              <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400">
                                Closed
                              </Badge>
                            )}
                            {caseItem.archivedAt && (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
                                Archived
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {caseItem.archivedAt
                            ? format(new Date(caseItem.archivedAt), "MMM d, yyyy")
                            : caseItem.closedAt
                            ? format(new Date(caseItem.closedAt), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reopenCaseMutation.mutate(caseItem.id)}
                            disabled={reopenCaseMutation.isPending}
                            data-testid={`button-reopen-case-${caseItem.id}`}
                          >
                            <Unlock className="h-4 w-4 mr-2" />
                            Reopen Case
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
