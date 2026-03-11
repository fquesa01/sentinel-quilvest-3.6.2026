import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus, Search, Eye, FileText, MoreHorizontal, ChevronRight, Calendar, Users,
  ClipboardList, ArrowLeft, FileStack, Sparkles, RefreshCw, Upload, Building,
  Handshake, Landmark, TrendingUp, AlertCircle, Pencil, Check, X,
} from "lucide-react";
import type { Deal, DealTemplate, RequestList } from "@shared/schema";
import { format } from "date-fns";

const transactionTypes = [
  { value: "all", label: "All Types" },
  { value: "equity", label: "PE Equity" },
  { value: "debt", label: "Debt Transaction" },
  { value: "real_estate", label: "Real Estate" },
  { value: "ma_asset", label: "M&A (Asset Purchase)" },
  { value: "ma_stock", label: "M&A (Stock Purchase)" },
  { value: "merger", label: "Merger" },
  { value: "investment", label: "Investment" },
  { value: "jv", label: "Joint Venture" },
  { value: "franchise", label: "Franchise" },
  { value: "other", label: "Other" },
];

const typeIcons: Record<string, typeof Building> = {
  equity: TrendingUp,
  real_estate: Building,
  ma_asset: Handshake,
  ma_stock: Handshake,
  merger: Handshake,
  investment: Landmark,
  debt: Landmark,
  jv: Handshake,
  franchise: FileText,
  other: FileText,
};

export default function TransactionsDiligence() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [genDescription, setGenDescription] = useState("");
  const [genType, setGenType] = useState("other");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameListValue, setRenameListValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") && selectedDealId) {
      window.history.replaceState({}, "", window.location.pathname);
      setIsCreateOpen(true);
    }
  }, [selectedDealId]);

  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<DealTemplate[]>({
    queryKey: ["/api/deal-templates"],
  });

  const { data: requestLists, isLoading: listsLoading } = useQuery<RequestList[]>({
    queryKey: ["/api/deals", selectedDealId, "request-lists"],
    enabled: !!selectedDealId,
  });

  const generateTemplate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/deal-templates/generate", {
        description: genDescription,
        transactionType: genType,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-templates"] });
      setShowGenDialog(false);
      setGenDescription("");
      setGenType("other");
      toast({ title: "Template generated successfully" });
      const templateId = data?.template?.id || data?.id;
      if (templateId) {
        navigate(`/transactions/deal-templates/${templateId}`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate template", description: err.message, variant: "destructive" });
    },
  });

  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; requestingParty?: string; respondingParty?: string; dueDate?: string }) => {
      return apiRequest("POST", `/api/deals/${selectedDealId}/request-lists`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", selectedDealId, "request-lists"] });
      setIsCreateOpen(false);
      toast({ title: "Request list created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create request list", variant: "destructive" });
    },
  });

  const renameTemplateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return apiRequest("PATCH", `/api/deal-templates/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-templates"] });
      setRenamingId(null);
      toast({ title: "Template renamed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to rename", description: err.message, variant: "destructive" });
    },
  });

  const renameListMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return apiRequest("PATCH", `/api/request-lists/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", selectedDealId, "request-lists"] });
      setRenamingListId(null);
      toast({ title: "Request list renamed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to rename", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/deals/${selectedDealId}/diligence/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", selectedDealId, "request-lists"] });
      setShowUploadDialog(false);
      toast({ title: "Checklist created from file", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const activeDeals = deals?.filter((d) => d.status === "active" || d.status === "pipeline") || [];
  const selectedDeal = deals?.find((d) => d.id === selectedDealId);

  const filteredTemplates = templates?.filter((t) => {
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || t.transactionType === typeFilter;
    return matchesSearch && matchesType;
  });

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  if (dealsLoading || templatesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Diligence - Docs & Checklists</h1>
            <p className="text-muted-foreground">Manage templates, request lists, and due diligence checklists</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="gap-2" data-testid="tab-requests">
            <ClipboardList className="h-4 w-4" />
            Request Lists
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2" data-testid="tab-templates">
            <FileStack className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-4">
          {!selectedDealId ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Select a Deal
                  </CardTitle>
                  <Button onClick={() => navigate("/transactions/deals?createDeal=true")} data-testid="button-new-deal">
                    <Plus className="h-4 w-4 mr-2" />
                    New Deal
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Choose an active deal to view or create document request lists.
                </p>
                <div className="grid gap-3">
                  {activeDeals.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No active deals found. Create a deal first.
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
                            <div className="p-2 bg-primary/10 rounded-md">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{deal.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {deal.dealNumber} {deal.dealType && `\u2022 ${deal.dealType.replace(/_/g, " ")}`}
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
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDealId(null)} data-testid="button-change-deal">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Change Deal
                      </Button>
                      <div className="border-l pl-3">
                        <p className="font-medium">{selectedDeal?.title}</p>
                        <p className="text-sm text-muted-foreground">{selectedDeal?.dealNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-file">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                      <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-list">
                        <Plus className="h-4 w-4 mr-2" />
                        New Request List
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search request lists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-lists"
                />
              </div>

              {listsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : filteredLists?.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2" data-testid="text-no-lists">No Request Lists</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a document request list to start tracking due diligence requests.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button variant="outline" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-first">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                      <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-list">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First List
                      </Button>
                    </div>
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
                            {renamingListId === list.id ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={renameListValue}
                                  onChange={(e) => setRenameListValue(e.target.value)}
                                  className="h-8 w-48"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && renameListValue.trim()) {
                                      renameListMutation.mutate({ id: list.id, name: renameListValue.trim() });
                                    } else if (e.key === "Escape") {
                                      setRenamingListId(null);
                                    }
                                  }}
                                  data-testid="input-rename-list"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => renameListValue.trim() && renameListMutation.mutate({ id: list.id, name: renameListValue.trim() })}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setRenamingListId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium">{list.name}</p>
                                {list.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">{list.description}</p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-3 w-3" />
                              {list.requestingParty || "\u2014"} \u2192 {list.respondingParty || "\u2014"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {list.dueDate ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(list.dueDate), "MMM d, yyyy")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">\u2014</span>
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
                                <Button variant="ghost" size="icon" data-testid={`button-menu-list-${list.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/transactions/request-lists/${list.id}`); }}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingListId(list.id);
                                  setRenameListValue(list.name);
                                }}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Rename
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
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-templates"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowGenDialog(true)} data-testid="button-generate-template">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
          </div>

          {!filteredTemplates || filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileStack className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium" data-testid="text-no-templates">No templates found</p>
                <p className="text-muted-foreground">
                  {searchQuery || typeFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "No deal templates have been created yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const Icon = typeIcons[template.transactionType || "other"] || FileText;
                return (
                  <Card key={template.id} className="hover-elevate cursor-pointer" data-testid={`card-template-${template.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {renamingId === template.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="h-8"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && renameValue.trim()) {
                                      renameTemplateMutation.mutate({ id: template.id, name: renameValue.trim() });
                                    } else if (e.key === "Escape") {
                                      setRenamingId(null);
                                    }
                                  }}
                                  data-testid="input-rename-template"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => renameValue.trim() && renameTemplateMutation.mutate({ id: template.id, name: renameValue.trim() })}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setRenamingId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {template.isSystemTemplate && <Badge variant="secondary" className="text-xs">System</Badge>}
                              {template.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                              {template.transactionType && (
                                <Badge variant="default" className="text-xs" data-testid={`badge-deal-type-${template.id}`}>
                                  {transactionTypes.find(t => t.value === template.transactionType)?.label || template.transactionType}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-template-${template.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/transactions/deal-templates/${template.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setRenamingId(template.id);
                              setRenameValue(template.name);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2 mb-4">
                        {template.description || "No description available"}
                      </CardDescription>
                      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-4">
                        <span>Version {template.version}</span>
                        <span>Used {template.usageCount || 0} times</span>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/transactions/deal-templates/${template.id}`)}
                        data-testid={`button-view-template-${template.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Checklist Items
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Request List</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateList} className="space-y-4">
            <div>
              <Label htmlFor="name">List Name</Label>
              <Input id="name" name="name" placeholder="e.g., Initial Due Diligence Request" required data-testid="input-list-name" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Describe the purpose of this request list" data-testid="input-list-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requestingParty">Requesting Party</Label>
                <Input id="requestingParty" name="requestingParty" placeholder="e.g., Buyer" data-testid="input-requesting-party" />
              </div>
              <div>
                <Label htmlFor="respondingParty">Responding Party</Label>
                <Input id="respondingParty" name="respondingParty" placeholder="e.g., Target" data-testid="input-responding-party" />
              </div>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" name="dueDate" type="date" data-testid="input-due-date" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createListMutation.isPending} data-testid="button-submit-list">
                {createListMutation.isPending ? "Creating..." : "Create List"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showGenDialog} onOpenChange={setShowGenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate AI Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={genType} onValueChange={setGenType}>
                <SelectTrigger data-testid="select-gen-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {transactionTypes.filter((t) => t.value !== "all").map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Describe your deal or template needs</Label>
              <Textarea
                value={genDescription}
                onChange={(e) => setGenDescription(e.target.value)}
                placeholder="e.g., SaaS company acquisition with focus on IP due diligence..."
                className="min-h-[120px]"
                data-testid="input-gen-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenDialog(false)} disabled={generateTemplate.isPending}>Cancel</Button>
            <Button onClick={() => generateTemplate.mutate()} disabled={!genDescription.trim() || generateTemplate.isPending} data-testid="button-submit-generate">
              {generateTemplate.isPending ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><Sparkles className="h-4 w-4 mr-2" />Generate Template</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Diligence File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Upload a CSV, Excel (.xlsx), Word (.docx), or PDF file to automatically create a diligence request list or checklist. Each line or row will become an item.
            </p>
            <div
              className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover-elevate"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-upload"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-1">Click to select a file</p>
              <p className="text-sm text-muted-foreground">CSV, XLSX, DOCX, PDF (max 200 items)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.docx,.doc,.pdf,.txt"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
            </div>
            {uploadMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing file...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
