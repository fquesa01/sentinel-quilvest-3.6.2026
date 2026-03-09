import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ListChecks,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  MinusCircle,
  AlertTriangle,
  FileText,
  ChevronRight,
  Loader2,
  FileStack,
  Paperclip,
  Plus,
  X,
  File,
  Wand2,
  Sparkles,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface ChecklistData {
  checklist: {
    id: string;
    dealId: string;
    templateId: string;
    name: string;
    description?: string;
    totalItems: number;
    completedItems: number;
    percentComplete: number;
    createdAt: string;
  };
  template?: {
    id: string;
    name: string;
    description?: string;
    transactionType: string;
    version: string;
  };
  categories: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    sortOrder: number;
  }[];
}

interface EnrichedItem {
  id: string;
  dealChecklistId: string;
  templateItemId: string;
  status: "pending" | "in_progress" | "complete" | "na" | "waived";
  notes?: string;
  documentCount?: number;
  hasAutoMatched?: boolean;
  autoMatchConfidence?: number;
  templateItem?: {
    id: string;
    name: string;
    description?: string;
    categoryId: string;
    isRequired: boolean;
    isCritical: boolean;
    keywords?: string[];
    documentType?: string;
    sortOrder: number;
  };
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

const statusConfig: Record<string, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground", label: "Pending" },
  in_progress: { icon: Clock, color: "text-amber-500", label: "In Progress" },
  complete: { icon: CheckCircle2, color: "text-green-500", label: "Complete" },
  na: { icon: XCircle, color: "text-slate-400", label: "N/A" },
  waived: { icon: MinusCircle, color: "text-blue-400", label: "Waived" },
};

interface LinkedDocument {
  id: string;
  documentId: string;
  isAutoMatched?: boolean;
  matchConfidence?: number;
  document?: {
    id: string;
    name: string;
    fileName: string;
    fileType?: string;
  };
}

interface DataRoomDocument {
  id: string;
  name: string;
  fileName: string;
  fileType?: string;
  folderId?: string;
}

export default function TransactionsDealChecklistDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedItemForDocuments, setSelectedItemForDocuments] = useState<string | null>(null);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

  const { data: checklistData, isLoading: isLoadingChecklist } = useQuery<ChecklistData>({
    queryKey: [`/api/deal-checklists/${id}`],
    enabled: !!id,
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery<EnrichedItem[]>({
    queryKey: [`/api/deal-checklists/${id}/items`],
    enabled: !!id,
  });

  const dealId = checklistData?.checklist?.dealId;

  const { data: dataRoomDocuments = [] } = useQuery<DataRoomDocument[]>({
    queryKey: [`/api/deals/${dealId}/documents`],
    enabled: !!dealId,
  });

  const { data: linkedDocuments = [] } = useQuery<LinkedDocument[]>({
    queryKey: [`/api/deal-checklist-items/${selectedItemForDocuments}/documents`],
    enabled: !!selectedItemForDocuments,
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      return apiRequest("PATCH", `/api/deal-checklist-items/${itemId}`, { status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/deal-checklists/${id}`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/deal-checklists/${id}/items`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item status",
        variant: "destructive",
      });
    },
  });

  const linkDocumentMutation = useMutation({
    mutationFn: async ({ itemId, documentId }: { itemId: string; documentId: string }) => {
      return apiRequest("POST", `/api/deal-checklist-items/${itemId}/documents`, { documentId });
    },
    onSuccess: async () => {
      setSelectedDocumentId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/deal-checklist-items/${selectedItemForDocuments}/documents`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/deal-checklists/${id}/items`] }),
      ]);
      toast({
        title: "Document linked",
        description: "The document has been linked to this checklist item.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link document",
        variant: "destructive",
      });
    },
  });

  const unlinkDocumentMutation = useMutation({
    mutationFn: async (linkId: string) => {
      return apiRequest("DELETE", `/api/checklist-item-documents/${linkId}`);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/deal-checklist-items/${selectedItemForDocuments}/documents`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/deal-checklists/${id}/items`] }),
      ]);
      toast({
        title: "Document unlinked",
        description: "The document has been removed from this checklist item.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unlink document",
        variant: "destructive",
      });
    },
  });

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deal-checklists/${id}/auto-match`);
      return res.json();
    },
    onSuccess: async (data: any) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/deal-checklists/${id}/items`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/deal-checklists/${id}`] }),
      ]);
      toast({
        title: "Auto-match complete",
        description: data.message || `Matched ${data.matchedCount} document(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run auto-match",
        variant: "destructive",
      });
    },
  });

  if (isLoadingChecklist || isLoadingItems) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!checklistData?.checklist) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Checklist Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The checklist you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => window.history.back()} data-testid="button-back">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { checklist, template, categories } = checklistData;

  const itemsByCategory = items.reduce((acc, item) => {
    const categoryId = item.category?.id || item.templateItem?.categoryId || "uncategorized";
    if (!acc[categoryId]) acc[categoryId] = [];
    acc[categoryId].push(item);
    return acc;
  }, {} as Record<string, EnrichedItem[]>);

  const sortedCategories = [...(categories || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === "complete" || i.status === "na" || i.status === "waived").length;
  const inProgressItems = items.filter(i => i.status === "in_progress").length;
  const pendingItems = items.filter(i => i.status === "pending").length;
  const criticalPending = items.filter(i => i.templateItem?.isCritical && i.status === "pending").length;
  const requiredPending = items.filter(i => i.templateItem?.isRequired && i.status === "pending").length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const autoMatchedItems = items.filter(i => i.hasAutoMatched);
  const autoMatchedCount = autoMatchedItems.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/transactions/deals/${checklist.dealId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-checklist-name">{checklist.name}</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {template && (
                <>
                  <span>From template: {template.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">v{template.version}</Badge>
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => autoMatchMutation.mutate()}
          disabled={autoMatchMutation.isPending}
          data-testid="button-auto-match"
        >
          {autoMatchMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Run Auto-Match
        </Button>
      </div>

      {autoMatchedCount > 0 && (
        <Card data-testid="card-auto-completed-summary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-md bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-auto-completed-count">
                  {autoMatchedCount} of {totalItems} items auto-completed from uploaded documents
                </p>
                <p className="text-xs text-muted-foreground">
                  AI automatically matched documents to checklist items based on content analysis
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Progress</div>
            <div className="text-2xl font-bold" data-testid="text-progress-percent">{completionPercentage}%</div>
            <Progress value={completionPercentage} className="h-2 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {completedItems} of {totalItems} items done
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Status Breakdown</div>
            <div className="flex items-center gap-3 text-sm mt-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Circle className="h-3 w-3" /> {pendingItems}
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="h-3 w-3" /> {inProgressItems}
              </span>
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="h-3 w-3" /> {completedItems}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Critical Pending</div>
            <div className="text-2xl font-bold text-red-500" data-testid="text-critical-count">{criticalPending}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Items requiring immediate attention
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Required Pending</div>
            <div className="text-2xl font-bold text-amber-500" data-testid="text-required-count">{requiredPending}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Required items not yet complete
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Checklist Items</CardTitle>
          <CardDescription>
            {sortedCategories.length} categories with {totalItems} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            value={expandedCategories}
            onValueChange={setExpandedCategories}
            className="w-full"
          >
            {sortedCategories.map((category) => {
              const categoryItems = itemsByCategory[category.id] || [];
              const categoryComplete = categoryItems.filter(i => 
                i.status === "complete" || i.status === "na" || i.status === "waived"
              ).length;
              const categoryRequired = categoryItems.filter(i => i.templateItem?.isRequired).length;
              const categoryCritical = categoryItems.filter(i => i.templateItem?.isCritical && i.status === "pending").length;

              return (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger className="hover:no-underline py-3" data-testid={`accordion-category-${category.id}`}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {categoryComplete}/{categoryItems.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {categoryCritical > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {categoryCritical} critical
                          </Badge>
                        )}
                        {categoryRequired > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {categoryRequired} required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {categoryItems
                        .sort((a, b) => (a.templateItem?.sortOrder || 0) - (b.templateItem?.sortOrder || 0))
                        .map((item) => {
                          const StatusIcon = statusConfig[item.status]?.icon || Circle;
                          const statusColor = statusConfig[item.status]?.color || "text-muted-foreground";

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                              data-testid={`checklist-item-${item.id}`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusColor}`} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">
                                      {item.templateItem?.name || "Untitled Item"}
                                    </span>
                                    {item.hasAutoMatched && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="text-xs" data-testid={`badge-ai-matched-${item.id}`}>
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            AI Matched
                                            {item.autoMatchConfidence != null && (
                                              <span className="ml-1 opacity-70">
                                                {Math.round(item.autoMatchConfidence)}%
                                              </span>
                                            )}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>This item was auto-completed by AI document analysis</p>
                                          {item.autoMatchConfidence != null && (
                                            <p className="text-xs opacity-70">Confidence: {Math.round(item.autoMatchConfidence)}%</p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {item.templateItem?.isRequired && (
                                      <Badge variant="secondary" className="text-xs">Required</Badge>
                                    )}
                                    {item.templateItem?.isCritical && (
                                      <Badge variant="destructive" className="text-xs">Critical</Badge>
                                    )}
                                  </div>
                                  {item.hasAutoMatched && item.notes && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate italic" data-testid={`text-auto-match-notes-${item.id}`}>
                                      {item.notes}
                                    </p>
                                  )}
                                  {item.templateItem?.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                      {item.templateItem.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {(item.documentCount && item.documentCount > 0) && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        variant={item.hasAutoMatched ? "outline" : "secondary"} 
                                        className="text-xs cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItemForDocuments(item.id);
                                          setIsDocumentDialogOpen(true);
                                        }}
                                        data-testid={`badge-doc-count-${item.id}`}
                                      >
                                        {item.hasAutoMatched && <Sparkles className="h-3 w-3 mr-1" />}
                                        {item.documentCount} doc{item.documentCount > 1 ? "s" : ""}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {item.hasAutoMatched ? "Click to view matched documents" : "Click to view linked documents"}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setSelectedItemForDocuments(item.id);
                                        setIsDocumentDialogOpen(true);
                                      }}
                                      data-testid={`button-link-docs-${item.id}`}
                                    >
                                      <Paperclip className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Link Documents</TooltipContent>
                                </Tooltip>
                                <Select
                                  value={item.status}
                                  onValueChange={(value) => updateItemMutation.mutate({ itemId: item.id, status: value })}
                                >
                                  <SelectTrigger className="w-32 h-8" data-testid={`select-status-${item.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="complete">Complete</SelectItem>
                                    <SelectItem value="na">N/A</SelectItem>
                                    <SelectItem value="waived">Waived</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          );
                        })}
                      {categoryItems.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No items in this category
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {sortedCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileStack className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No categories found for this checklist</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDocumentDialogOpen} onOpenChange={(open) => {
        setIsDocumentDialogOpen(open);
        if (!open) {
          setSelectedItemForDocuments(null);
          setSelectedDocumentId("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Documents</DialogTitle>
            <DialogDescription>
              Attach documents from the data room to this checklist item
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Linked Documents</label>
              {linkedDocuments.length === 0 ? (
                <div className="text-center py-4 bg-muted/30 rounded-lg text-muted-foreground text-sm">
                  <Paperclip className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p>No documents linked yet</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {linkedDocuments.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover-elevate"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <button
                          className="text-sm truncate text-left underline decoration-muted-foreground/40 hover:decoration-foreground cursor-pointer"
                          onClick={() => {
                            if (link.documentId) {
                              window.open(`/api/data-room-documents/${link.documentId}/preview`, "_blank");
                            }
                          }}
                          data-testid={`link-open-doc-${link.id}`}
                        >
                          {link.document?.name || link.document?.fileName || "Unknown Document"}
                        </button>
                        {link.isAutoMatched && (
                          <Badge variant="outline" className="text-xs flex-shrink-0" data-testid={`badge-auto-matched-doc-${link.id}`}>
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                            {link.matchConfidence != null && (
                              <span className="ml-1 opacity-70">{Math.round(link.matchConfidence)}%</span>
                            )}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (link.documentId) {
                                  window.open(`/api/data-room-documents/${link.documentId}/download`, "_blank");
                                }
                              }}
                              data-testid={`button-download-doc-${link.id}`}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => unlinkDocumentMutation.mutate(link.id)}
                              disabled={unlinkDocumentMutation.isPending}
                              data-testid={`button-unlink-doc-${link.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove link</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Add Document</label>
              <div className="flex gap-2">
                <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                  <SelectTrigger className="flex-1" data-testid="select-document-to-link">
                    <SelectValue placeholder="Select a document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dataRoomDocuments.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No documents in data room
                      </div>
                    ) : (
                      dataRoomDocuments
                        .filter(doc => !linkedDocuments.some(l => l.documentId === doc.id))
                        .map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name || doc.fileName}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => {
                    if (selectedItemForDocuments && selectedDocumentId) {
                      linkDocumentMutation.mutate({
                        itemId: selectedItemForDocuments,
                        documentId: selectedDocumentId,
                      });
                    }
                  }}
                  disabled={!selectedDocumentId || linkDocumentMutation.isPending}
                  data-testid="button-add-document-link"
                >
                  {linkDocumentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
