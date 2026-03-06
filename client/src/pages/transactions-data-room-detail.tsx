import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, useSearch } from "wouter";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  ArrowLeft,
  FolderOpen,
  Folder,
  FolderPlus,
  FileText,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Upload,
  Download,
  Trash2,
  Edit,
  FileUp,
  LayoutTemplate,
  Users,
  History,
  Shield,
  MessageSquare,
  ArrowUpDown,
  Calendar,
  SortAsc,
  SortDesc,
  Sparkles,
  Eye,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { DataRoom, DataRoomFolder, DataRoomDocument, DataRoomTemplate } from "@shared/schema";
import { format } from "date-fns";
import { AccessManagementPanel } from "@/components/data-room/access-management-panel";
import { ActivityLogPanel } from "@/components/data-room/activity-log-panel";
import { FolderPermissionsDialog } from "@/components/data-room/folder-permissions-dialog";
import { QAPanel } from "@/components/data-room/qa-panel";

interface DataRoomWithContent extends DataRoom {
  folders: DataRoomFolder[];
  documents: DataRoomDocument[];
}

interface FolderTreeNode extends DataRoomFolder {
  children: FolderTreeNode[];
  documents: DataRoomDocument[];
}

function buildFolderTree(
  folders: DataRoomFolder[],
  documents: DataRoomDocument[]
): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>();
  const rootFolders: FolderTreeNode[] = [];

  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      documents: documents.filter((d) => d.folderId === folder.id),
    });
  });

  folders.forEach((folder) => {
    const node = folderMap.get(folder.id)!;
    if (folder.parentFolderId && folderMap.has(folder.parentFolderId)) {
      folderMap.get(folder.parentFolderId)!.children.push(node);
    } else {
      rootFolders.push(node);
    }
  });

  const sortByIndex = (a: FolderTreeNode, b: FolderTreeNode) => {
    const aNum = parseFloat(a.indexNumber?.replace(/[^\d.]/g, "") || "999");
    const bNum = parseFloat(b.indexNumber?.replace(/[^\d.]/g, "") || "999");
    return aNum - bNum;
  };

  const sortRecursively = (nodes: FolderTreeNode[]) => {
    nodes.sort(sortByIndex);
    nodes.forEach((n) => sortRecursively(n.children));
  };

  sortRecursively(rootFolders);
  return rootFolders;
}

function FolderTreeItem({
  folder,
  level = 0,
  selectedFolderId,
  onSelectFolder,
  onDeleteFolder,
  onRenameFolder,
  onManagePermissions,
}: {
  folder: FolderTreeNode;
  level?: number;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onDeleteFolder: (folder: DataRoomFolder) => void;
  onRenameFolder: (folder: DataRoomFolder) => void;
  onManagePermissions: (folder: DataRoomFolder) => void;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`flex items-start gap-1 px-1 py-1.5 rounded-md cursor-pointer group ${
              isSelected ? "bg-primary/10 text-primary" : "hover-elevate"
            }`}
            style={{ paddingLeft: `${level * 12 + 4}px` }}
            onClick={() => onSelectFolder(folder.id)}
            data-testid={`folder-item-${folder.id}`}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
                className="p-0.5 hover:bg-muted rounded flex-shrink-0 mt-0.5"
                data-testid={`button-toggle-folder-${folder.id}`}
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            {isOpen && hasChildren ? (
              <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Folder className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            {folder.indexNumber && (
              <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                {folder.indexNumber}
              </span>
            )}
            <span className="text-sm leading-tight break-words flex-1">{folder.name}</span>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0">
              {folder.documents.length > 0 && `${folder.documents.length}`}
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onManagePermissions(folder)} data-testid={`context-permissions-folder-${folder.id}`}>
            <Shield className="h-4 w-4 mr-2" />
            Manage Permissions
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onRenameFolder(folder)} data-testid={`context-rename-folder-${folder.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDeleteFolder(folder)}
            data-testid={`context-delete-folder-${folder.id}`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
              onManagePermissions={onManagePermissions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TransactionsDataRoomDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const searchString = useSearch();
  const { toast } = useToast();

  // Parse URL search params for document highlighting
  const urlParams = new URLSearchParams(searchString);
  const highlightDocumentId = urlParams.get('document');
  
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  const documentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isFolderPanelCollapsed, setIsFolderPanelCollapsed] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<DataRoomFolder | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAccessPanelOpen, setIsAccessPanelOpen] = useState(false);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const [isFolderPermissionsOpen, setIsFolderPermissionsOpen] = useState(false);
  const [folderForPermissions, setFolderForPermissions] = useState<DataRoomFolder | null>(null);
  const [isQAPanelOpen, setIsQAPanelOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"documentDate" | "fileName" | "uploadedAt" | "fileSize">("documentDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deletedDocIds, setDeletedDocIds] = useState<Set<string>>(new Set());
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreviewDocument = (docId: string) => {
    setPreviewDocId(docId);
    setIsPreviewOpen(true);
  };

  const { data: previewMetadata, isLoading: isPreviewLoading, error: previewError } = useQuery<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    documentDate: string | null;
    documentDateSource: string | null;
    extractedText: string | null;
    aiSummary: string | null;
    ocrStatus: string;
    previewType: 'image' | 'pdf' | 'text' | 'unsupported';
    previewUrl: string;
  }>({
    queryKey: ["/api/data-room-documents", previewDocId, "metadata"],
    enabled: !!previewDocId && isPreviewOpen,
  });

  const handleManageFolderPermissions = (folder: DataRoomFolder) => {
    setFolderForPermissions(folder);
    setIsFolderPermissionsOpen(true);
  };

  const { data: room, isLoading } = useQuery<DataRoomWithContent>({
    queryKey: ["/api/data-rooms", roomId],
    enabled: !!roomId,
  });

  const { data: templates } = useQuery<DataRoomTemplate[]>({
    queryKey: ["/api/data-room-templates"],
  });

  const folderTree = useMemo(() => {
    if (!room) return [];
    return buildFolderTree(room.folders || [], room.documents || []);
  }, [room]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId || !room) return null;
    return room.folders.find((f) => f.id === selectedFolderId) || null;
  }, [selectedFolderId, room]);

  const currentDocuments = useMemo(() => {
    if (!room) return [];
    let docs = selectedFolderId 
      ? room.documents.filter((d) => d.folderId === selectedFolderId && !deletedDocIds.has(d.id))
      : room.documents.filter((d) => !d.folderId && !deletedDocIds.has(d.id));
    
    // Sort documents based on selected sort criteria
    docs = [...docs].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case "documentDate":
          // Use documentDate if available, fall back to uploadedAt
          aVal = (a as any).documentDate || a.uploadedAt;
          bVal = (b as any).documentDate || b.uploadedAt;
          break;
        case "fileName":
          aVal = a.fileName?.toLowerCase() || "";
          bVal = b.fileName?.toLowerCase() || "";
          break;
        case "uploadedAt":
          aVal = a.uploadedAt;
          bVal = b.uploadedAt;
          break;
        case "fileSize":
          aVal = a.fileSize || 0;
          bVal = b.fileSize || 0;
          break;
        default:
          aVal = a.uploadedAt;
          bVal = b.uploadedAt;
      }
      
      // Handle null/undefined values
      if (!aVal && !bVal) return 0;
      if (!aVal) return sortOrder === "asc" ? 1 : -1;
      if (!bVal) return sortOrder === "asc" ? -1 : 1;
      
      // Compare values
      if (sortBy === "fileName") {
        return sortOrder === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      if (sortBy === "fileSize") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      // Date comparison
      const aDate = new Date(aVal).getTime();
      const bDate = new Date(bVal).getTime();
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    });
    
    return docs;
  }, [room, selectedFolderId, sortBy, sortOrder, deletedDocIds]);

  // Handle URL parameter for document highlighting - navigate to folder and highlight document
  useEffect(() => {
    if (!highlightDocumentId || !room) return;
    
    // Find the document to highlight
    const targetDoc = room.documents.find(d => d.id === highlightDocumentId);
    if (!targetDoc) return;
    
    // Navigate to the document's folder
    if (targetDoc.folderId !== selectedFolderId) {
      setSelectedFolderId(targetDoc.folderId);
    }
    
    // Set the highlighted document
    setHighlightedDocId(highlightDocumentId);
    
    // Open the preview for the highlighted document
    setTimeout(() => {
      handlePreviewDocument(highlightDocumentId);
    }, 300);
    
    // Scroll to the document after a brief delay
    setTimeout(() => {
      const docElement = documentRefs.current.get(highlightDocumentId);
      if (docElement) {
        docElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
    
    // Clear highlight after 5 seconds
    setTimeout(() => {
      setHighlightedDocId(null);
    }, 5000);
  }, [highlightDocumentId, room]);

  const breadcrumbs = useMemo(() => {
    if (!selectedFolderId || !room) return [];
    const path: DataRoomFolder[] = [];
    let current = room.folders.find((f) => f.id === selectedFolderId);
    while (current) {
      path.unshift(current);
      current = room.folders.find((f) => f.id === current?.parentFolderId);
    }
    return path;
  }, [selectedFolderId, room]);

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", `/api/data-rooms/${roomId}/folders`, {
        ...data,
        parentFolderId: selectedFolderId,
      });
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["/api/data-rooms", roomId] });
      setIsCreateFolderOpen(false);
      toast({ title: "Folder created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("POST", `/api/data-rooms/${roomId}/apply-template/${templateId}`, {});
    },
    onSuccess: async () => {
      // Force clear the cache and refetch
      await queryClient.resetQueries({ queryKey: ["/api/data-rooms", roomId] });
      setIsTemplateOpen(false);
      toast({ title: "Template applied successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      return apiRequest("DELETE", `/api/data-room-folders/${folderId}`, {});
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["/api/data-rooms", roomId] });
      if (selectedFolderId) setSelectedFolderId(null);
      toast({ title: "Folder deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      return apiRequest("PATCH", `/api/data-room-folders/${data.id}`, { name: data.name });
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["/api/data-rooms", roomId] });
      setIsRenameFolderOpen(false);
      setFolderToRename(null);
      toast({ title: "Folder renamed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      setDeletedDocIds((prev) => new Set(Array.from(prev).concat(docId)));
      return apiRequest("DELETE", `/api/data-room-documents/${docId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Document deleted successfully" });
    },
    onError: (error: any, docId) => {
      setDeletedDocIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = async () => {
    if (uploadFiles.length === 0) {
      toast({ title: "Please select files to upload", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      uploadFiles.forEach((file) => {
        formData.append("files", file);
      });
      if (selectedFolderId) {
        formData.append("folderId", selectedFolderId);
      }

      const response = await fetch(`/api/data-rooms/${roomId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/data-rooms", roomId] });
      setIsUploadOpen(false);
      setUploadFiles([]);
      toast({ title: `Successfully uploaded ${uploadFiles.length} file(s)` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (docId: string) => {
    window.open(`/api/data-room-documents/${docId}/download`, "_blank");
  };

  const handleCreateFolder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createFolderMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    });
  };

  const handleRenameFolder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!folderToRename) return;
    const formData = new FormData(e.currentTarget);
    renameFolderMutation.mutate({
      id: folderToRename.id,
      name: formData.get("name") as string,
    });
  };

  const handleDeleteFolder = (folder: DataRoomFolder) => {
    if (confirm(`Are you sure you want to delete the folder "${folder.name}"?`)) {
      deleteFolderMutation.mutate(folder.id);
    }
  };

  const openRenameDialog = (folder: DataRoomFolder) => {
    setFolderToRename(folder);
    setIsRenameFolderOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Data room not found</p>
            <Button className="mt-4" onClick={() => navigate("/transactions")}>
              Back to Transactions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="p-4 border-b flex items-center justify-between gap-4 stagger-1">
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
            <h1 className="text-xl font-bold">{room.name}</h1>
            <p className="text-sm text-muted-foreground">{room.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQAPanelOpen(true)}
            data-testid="button-qa"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Q&A
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsActivityPanelOpen(true)}
            data-testid="button-activity-log"
          >
            <History className="h-4 w-4 mr-2" />
            Activity
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAccessPanelOpen(true)}
            data-testid="button-access-management"
          >
            <Users className="h-4 w-4 mr-2" />
            Access
          </Button>
          <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-apply-template">
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Apply Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply Folder Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a template to create a standard folder structure. This will add folders to your data room.
                </p>
                <div className="space-y-2">
                  {templates?.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => applyTemplateMutation.mutate(template.id)}
                      data-testid={`template-${template.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          </div>
                          <Badge variant="secondary">{template.dealType}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden stagger-2">
        <div className={`border-r flex flex-col transition-all duration-200 ${isFolderPanelCollapsed ? 'w-12' : 'w-64'}`}>
          <div className="p-2 border-b flex items-center justify-between gap-1">
            {!isFolderPanelCollapsed && <span className="text-sm font-medium">Folders</span>}
            <div className="flex items-center gap-1 ml-auto">
              {!isFolderPanelCollapsed && (
                <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-create-folder">
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Folder</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateFolder} className="space-y-4">
                      <div>
                        <Label htmlFor="folder-name">Folder Name</Label>
                        <Input id="folder-name" name="name" required data-testid="input-folder-name" />
                      </div>
                      <div>
                        <Label htmlFor="folder-description">Description</Label>
                        <Textarea id="folder-description" name="description" data-testid="input-folder-description" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createFolderMutation.isPending} data-testid="button-submit-folder">
                          {createFolderMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={() => setIsFolderPanelCollapsed(!isFolderPanelCollapsed)}
                    data-testid="button-toggle-folders"
                  >
                    {isFolderPanelCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isFolderPanelCollapsed ? "Show folders" : "Hide folders"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {!isFolderPanelCollapsed && (
            <ScrollArea className="flex-1">
              <div className="p-2">
                <div
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer ${
                    !selectedFolderId ? "bg-primary/10 text-primary" : "hover-elevate"
                  }`}
                  onClick={() => setSelectedFolderId(null)}
                  data-testid="folder-item-all-documents"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">All Documents</span>
                </div>
                {folderTree.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    onDeleteFolder={handleDeleteFolder}
                    onRenameFolder={openRenameDialog}
                    onManagePermissions={handleManageFolderPermissions}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
          {isFolderPanelCollapsed && (
            <div 
              className="flex-1 flex flex-col items-center pt-2 gap-2 cursor-pointer hover:bg-muted/50"
              onClick={() => setIsFolderPanelCollapsed(false)}
              data-testid="folder-collapsed-expand-area"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={!selectedFolderId ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFolderId(null);
                    }}
                    data-testid="folder-collapsed-all"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">All Documents</TooltipContent>
              </Tooltip>
              <span className="text-xs text-muted-foreground [writing-mode:vertical-lr]">Click to expand</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <button
                className="hover:text-primary"
                onClick={() => setSelectedFolderId(null)}
              >
                {room.name}
              </button>
              {breadcrumbs.map((folder, i) => (
                <span key={folder.id} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <button
                    className={i === breadcrumbs.length - 1 ? "font-medium" : "hover:text-primary"}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {/* Sort Controls */}
              <div className="flex items-center gap-1">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-8 w-[140px]" data-testid="select-sort-by">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documentDate">Document Date</SelectItem>
                    <SelectItem value="fileName">File Name</SelectItem>
                    <SelectItem value="uploadedAt">Upload Date</SelectItem>
                    <SelectItem value="fileSize">File Size</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  data-testid="button-toggle-sort-order"
                >
                  {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
              <Dialog open={isUploadOpen} onOpenChange={(open) => {
                setIsUploadOpen(open);
                if (!open) setUploadFiles([]);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Documents</DialogTitle>
                  </DialogHeader>
                  <div 
                    className="py-8 text-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
                    onClick={() => document.getElementById("file-input")?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-primary");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary");
                      const droppedFiles = Array.from(e.dataTransfer.files);
                      setUploadFiles((prev) => [...prev, ...droppedFiles]);
                    }}
                  >
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        setUploadFiles((prev) => [...prev, ...selectedFiles]);
                        e.target.value = "";
                      }}
                      data-testid="input-file-upload"
                    />
                    <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Drag and drop files here or click to browse
                    </p>
                    {selectedFolder && (
                      <p className="text-sm text-primary mt-2">
                        Uploading to: {selectedFolder.name}
                      </p>
                    )}
                  </div>
                  {uploadFiles.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {uploadFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setIsUploadOpen(false); setUploadFiles([]); }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={isUploading || uploadFiles.length === 0}
                      data-testid="button-submit-upload"
                    >
                      {isUploading ? "Uploading..." : `Upload ${uploadFiles.length} file(s)`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {currentDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Documents</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {selectedFolder
                      ? `Upload documents to "${selectedFolder.name}"`
                      : "Upload documents to get started"}
                  </p>
                  <Button onClick={() => setIsUploadOpen(true)} data-testid="button-upload-empty">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
  {currentDocuments.map((doc) => {
                    const docWithOcr = doc as any;
                    const documentDate = docWithOcr.documentDate;
                    const dateSource = docWithOcr.documentDateSource;
                    const ocrStatus = docWithOcr.ocrStatus;
                    const aiSummary = docWithOcr.aiSummary;
                    const uploadDate = doc.uploadedAt;
                    
                    const isHighlighted = highlightedDocId === doc.id;
                    
                    return (
                    <Card 
                      key={doc.id} 
                      ref={(el) => {
                        if (el) documentRefs.current.set(doc.id, el);
                      }}
                      className={`hover-elevate transition-all duration-300 ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''}`}
                      data-testid={`document-${doc.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <FileText className="h-8 w-8 text-blue-500" />
                              {ocrStatus === "processing" && (
                                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse" title="OCR processing..." />
                              )}
                              {ocrStatus === "completed" && dateSource === "content" && (
                                <Calendar className="absolute -bottom-1 -right-1 h-3 w-3 text-green-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{doc.fileName}</p>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>
                                  {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ""}
                                  {doc.fileSize && uploadDate ? " • " : ""}
                                  {uploadDate && (
                                    <span>Uploaded: {format(new Date(uploadDate), "MMM d, yyyy")}</span>
                                  )}
                                </p>
                                {documentDate && (
                                  <p className={dateSource === "content" || dateSource === "filename" || dateSource === "metadata" ? "text-green-600" : "text-muted-foreground"}>
                                    Document Date: {format(new Date(documentDate), "MMM d, yyyy")}
                                    {dateSource && (
                                      <span className="text-muted-foreground ml-1">
                                        ({dateSource === "content" ? "from content" : 
                                          dateSource === "filename" ? "from filename" : 
                                          dateSource === "metadata" ? "from metadata" : 
                                          "from upload"})
                                      </span>
                                    )}
                                  </p>
                                )}
                                {ocrStatus === "processing" && (
                                  <p className="text-yellow-600 italic">Extracting document date...</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewDocument(doc.id);
                              }}
                              data-testid={`button-preview-${doc.id}`}
                              title="Preview document"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleDownload(doc.id)}
                              data-testid={`button-download-${doc.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownload(doc.id)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteDocumentMutation.mutate(doc.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        {aiSummary && (
                          <Collapsible className="mt-2">
                            <CollapsibleTrigger asChild>
                              <button 
                                className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                data-testid={`button-toggle-summary-${doc.id}`}
                              >
                                <Sparkles className="h-3 w-3" />
                                <span>AI Summary</span>
                                <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" />
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 border-l-2 border-purple-400">
                                {aiSummary}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameFolder} className="space-y-4">
            <div>
              <Label htmlFor="rename-folder-name">Folder Name</Label>
              <Input
                id="rename-folder-name"
                name="name"
                defaultValue={folderToRename?.name}
                required
                data-testid="input-rename-folder"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsRenameFolderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renameFolderMutation.isPending} data-testid="button-submit-rename">
                {renameFolderMutation.isPending ? "Renaming..." : "Rename"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {roomId && (
        <>
          <AccessManagementPanel
            dataRoomId={roomId}
            isOpen={isAccessPanelOpen}
            onClose={() => setIsAccessPanelOpen(false)}
          />
          <ActivityLogPanel
            dataRoomId={roomId}
            isOpen={isActivityPanelOpen}
            onClose={() => setIsActivityPanelOpen(false)}
          />
          {folderForPermissions && (
            <FolderPermissionsDialog
              dataRoomId={roomId}
              folderId={folderForPermissions.id}
              folderName={folderForPermissions.name}
              isOpen={isFolderPermissionsOpen}
              onClose={() => {
                setIsFolderPermissionsOpen(false);
                setFolderForPermissions(null);
              }}
            />
          )}
          <QAPanel
            dataRoomId={roomId}
            isOpen={isQAPanelOpen}
            onClose={() => setIsQAPanelOpen(false)}
            folderId={selectedFolderId}
          />
        </>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
        setIsPreviewOpen(open);
        if (!open) setPreviewDocId(null);
      }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col" data-testid="document-preview-dialog">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {previewMetadata?.fileName || "Document Preview"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Metadata Bar */}
            {previewMetadata && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
                <span>{(previewMetadata.fileSize / 1024).toFixed(1)} KB</span>
                {previewMetadata.uploadedAt && (
                  <span>Uploaded: {format(new Date(previewMetadata.uploadedAt), "MMM d, yyyy")}</span>
                )}
                {previewMetadata.documentDate && (
                  <span className="text-green-600">
                    Document Date: {format(new Date(previewMetadata.documentDate), "MMM d, yyyy")}
                    {previewMetadata.documentDateSource && (
                      <span className="text-muted-foreground ml-1">
                        ({previewMetadata.documentDateSource})
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}

            {/* AI Summary */}
            {previewMetadata?.aiSummary && (
              <div className="flex-shrink-0">
                <div className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="font-medium">AI Summary</span>
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 border-l-2 border-purple-400">
                  {previewMetadata.aiSummary}
                </div>
              </div>
            )}

            {/* Preview Content */}
            <div className="flex-1 overflow-auto border rounded-md bg-muted/20">
              {previewError ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileText className="h-16 w-16 text-destructive mb-4" />
                  <h3 className="text-lg font-medium mb-2">Unable to Load Preview</h3>
                  <p className="text-muted-foreground mb-4">
                    {(previewError as Error).message?.includes("403") 
                      ? "You don't have permission to view this document."
                      : "An error occurred while loading the document preview."}
                  </p>
                  <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                    Close
                  </Button>
                </div>
              ) : isPreviewLoading || !previewMetadata ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
                    <p className="mt-2 text-muted-foreground">Loading preview...</p>
                  </div>
                </div>
              ) : previewMetadata.previewType === 'pdf' ? (
                previewMetadata.extractedText ? (
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 pb-2 border-b">
                        <FileText className="h-4 w-4" />
                        <span>Document text content</span>
                      </div>
                      <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                        {previewMetadata.extractedText}
                      </pre>
                    </div>
                  </ScrollArea>
                ) : previewMetadata.ocrStatus === 'pending' || previewMetadata.ocrStatus === 'processing' ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                    <h3 className="text-lg font-medium mb-2">Processing Document</h3>
                    <p className="text-muted-foreground mb-4">
                      Text extraction is in progress. Please check back shortly.
                    </p>
                    <Button onClick={() => handleDownload(previewMetadata.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                ) : (
                  <object
                    data={previewMetadata.previewUrl}
                    type="application/pdf"
                    className="w-full h-full min-h-[400px]"
                    title={previewMetadata.fileName}
                  >
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">PDF Preview Unavailable</h3>
                      <p className="text-muted-foreground mb-4">
                        Your browser cannot display this PDF. Please download to view.
                      </p>
                      <Button onClick={() => handleDownload(previewMetadata.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                      </Button>
                    </div>
                  </object>
                )
              ) : previewMetadata.previewType === 'image' ? (
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={previewMetadata.previewUrl}
                    alt={previewMetadata.fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : previewMetadata.previewType === 'text' ? (
                <ScrollArea className="h-full">
                  <pre className="p-4 text-sm whitespace-pre-wrap font-mono">
                    {previewMetadata.extractedText || "No text content available."}
                  </pre>
                </ScrollArea>
              ) : previewMetadata.extractedText ? (
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 pb-2 border-b">
                      <FileText className="h-4 w-4" />
                      <span>Extracted text from document</span>
                    </div>
                    <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                      {previewMetadata.extractedText}
                    </pre>
                  </div>
                </ScrollArea>
              ) : previewMetadata.ocrStatus === 'pending' || previewMetadata.ocrStatus === 'processing' ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                  <h3 className="text-lg font-medium mb-2">Processing Document</h3>
                  <p className="text-muted-foreground mb-4">
                    Text extraction is in progress. Please check back shortly.
                  </p>
                  <Button onClick={() => handleDownload(previewMetadata.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              ) : previewMetadata.ocrStatus === 'failed' ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileText className="h-16 w-16 text-red-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Text Extraction Failed</h3>
                  <p className="text-muted-foreground mb-4">
                    Could not extract text from this document. The file may be encrypted, corrupted, or in an unsupported format.
                  </p>
                  <Button onClick={() => handleDownload(previewMetadata.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Preview Not Available</h3>
                  <p className="text-muted-foreground mb-4">
                    This file type cannot be previewed directly. Download the file to view its contents.
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => handleDownload(previewMetadata.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            {previewMetadata && (
              <Button onClick={() => handleDownload(previewMetadata.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
