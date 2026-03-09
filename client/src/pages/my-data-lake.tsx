import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Link,
  DollarSign,
  Mail,
  HardDrive,
  Search,
  Upload,
  RefreshCw,
  CheckCircle,
  Settings,
  Zap,
  FileText,
  File,
  Table2,
  Trash2,
  Filter,
  Database,
  Cloud,
} from "lucide-react";
import { SiGmail, SiGoogledrive } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DataLakeItem } from "@shared/schema";

const CONNECTOR_META: Record<string, { name: string; desc: string; icon: any; color: string }> = {
  outlook: { name: "Microsoft Outlook", desc: "Sync historical & live email", icon: Mail, color: "text-blue-600" },
  gmail: { name: "Gmail", desc: "Sync historical & live email", icon: SiGmail, color: "text-red-500" },
  onedrive: { name: "OneDrive / SharePoint", desc: "Sync work folders & files", icon: Cloud, color: "text-blue-600" },
  gdrive: { name: "Google Drive", desc: "Sync work folders & files", icon: SiGoogledrive, color: "text-green-600" },
};

const TYPE_BADGE_VARIANT: Record<string, string> = {
  pdf: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  email: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  docx: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  xlsx: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400",
};

const USE_CASES = [
  {
    icon: Brain,
    title: "Ambient Intelligence",
    desc: "Your files and emails are instantly searchable during live calls and video meetings — no context switching.",
    accent: "text-indigo-500 bg-indigo-500/10",
  },
  {
    icon: Link,
    title: "Relationship Intelligence",
    desc: "Surface shared history, past deals, and warm introductions when reaching out to contacts.",
    accent: "text-sky-500 bg-sky-500/10",
  },
  {
    icon: DollarSign,
    title: "Transaction Benchmarking",
    desc: "When evaluating new deals, reference comparable past transactions directly from your own data.",
    accent: "text-emerald-500 bg-emerald-500/10",
  },
];

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getItemTypeIcon(type: string) {
  switch (type) {
    case "email": return Mail;
    case "pdf": return FileText;
    case "docx": return File;
    case "xlsx": return Table2;
    default: return File;
  }
}

export default function MyDataLakePage() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upload")) {
      window.history.replaceState({}, "", window.location.pathname);
      return "upload";
    }
    return "overview";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [fileFilter, setFileFilter] = useState("all");
  const [uploadDragging, setUploadDragging] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [searchSource, setSearchSource] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalItems: number;
    emailsIngested: number;
    filesIndexed: number;
    activeConnectors: number;
    totalConnectors: number;
  }>({
    queryKey: ["/api/data-lake/stats"],
  });

  const { data: connectors, isLoading: connectorsLoading } = useQuery<any[]>({
    queryKey: ["/api/data-lake/connectors"],
  });

  const itemsQueryUrl = (() => {
    const params = new URLSearchParams();
    if (fileFilter === "emails") params.set("itemType", "email");
    else if (fileFilter === "files") params.set("itemType", "file");
    else if (fileFilter === "uploaded") params.set("source", "upload");
    const qs = params.toString();
    return qs ? `/api/data-lake/items?${qs}` : "/api/data-lake/items";
  })();

  const { data: items, isLoading: itemsLoading } = useQuery<DataLakeItem[]>({
    queryKey: [itemsQueryUrl],
  });

  const searchQueryUrl = (() => {
    if (!searchQuery) return null;
    const params = new URLSearchParams({ q: searchQuery });
    if (searchSource !== "all") params.set("source", searchSource);
    return `/api/data-lake/search?${params}`;
  })();

  const { data: searchResults, isLoading: searchLoading } = useQuery<DataLakeItem[]>({
    queryKey: [searchQueryUrl ?? "/api/data-lake/search"],
    enabled: !!searchQueryUrl,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/data-lake/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/data-lake/") });
      toast({ title: "File uploaded", description: "Your file has been added to the data lake." });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Could not upload file. Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/data-lake/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/data-lake/") });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (type: string) => {
      await apiRequest("POST", `/api/data-lake/connectors/${type}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/data-lake/") });
      toast({ title: "Sync triggered", description: "Connector sync has been initiated." });
    },
  });

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setUploadDragging(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => uploadMutation.mutate(file));
    },
    [uploadMutation]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => uploadMutation.mutate(file));
    },
    [uploadMutation]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 overflow-auto h-full">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight" data-testid="text-page-title">My Data Lake</h1>
          <p className="text-sm text-muted-foreground">
            Your personal knowledge base — emails, files, and past deals, unified and instantly searchable.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {USE_CASES.map((uc) => (
          <Card key={uc.title} data-testid={`card-usecase-${uc.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="flex gap-3 items-start p-4">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${uc.accent}`}>
                <uc.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{uc.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed mt-1">{uc.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Items Indexed", value: stats?.totalItems ?? 0, icon: Database },
          { label: "Emails Ingested", value: stats?.emailsIngested ?? 0, icon: Mail },
          { label: "Files Indexed", value: stats?.filesIndexed ?? 0, icon: HardDrive },
          { label: "Active Connectors", value: `${stats?.activeConnectors ?? 0} / ${stats?.totalConnectors ?? 4}`, icon: Zap },
        ].map((s) => (
          <Card key={s.label} data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {statsLoading ? "..." : typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-data-lake">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="connectors" data-testid="tab-connectors">Connectors</TabsTrigger>
          <TabsTrigger value="files" data-testid="tab-files">Recent Ingestions</TabsTrigger>
          <TabsTrigger value="search" data-testid="tab-search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold">Connected Sources</CardTitle>
                <Button variant="outline" size="sm" data-testid="button-add-source">
                  <Zap className="w-3 h-3 mr-1" /> Add Source
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {connectorsLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading connectors...</div>
                ) : (
                  <div className="divide-y">
                    {(connectors || []).map((c: any) => {
                      const meta = CONNECTOR_META[c.connectorType];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={c.connectorType}
                          className="flex items-center gap-3 px-4 py-3"
                          data-testid={`connector-row-${c.connectorType}`}
                        >
                          <Icon className={`w-5 h-5 shrink-0 ${meta.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{meta.name}</div>
                            {c.status === "connected" ? (
                              <div className="text-xs text-muted-foreground">
                                {c.itemsIndexed.toLocaleString()} items indexed
                                {c.lastSync ? ` · Synced ${formatRelativeTime(c.lastSync)}` : ""}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">Not connected</div>
                            )}
                          </div>
                          {c.status === "connected" ? (
                            <div className="flex items-center gap-2">
                              {c.liveSyncEnabled && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
                                  Live
                                </Badge>
                              )}
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                          ) : (
                            <Button size="sm" data-testid={`button-connect-${c.connectorType}`}>
                              Connect
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Upload Files Directly</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setUploadDragging(true); }}
                    onDragLeave={() => setUploadDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                      uploadDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid="drop-zone-upload"
                  >
                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-sm font-medium mb-1">Drop files here or browse</div>
                    <div className="text-xs text-muted-foreground">PDF, DOCX, XLSX, MSG, EML, PST supported</div>
                    <Button
                      size="sm"
                      className="mt-3"
                      disabled={uploadMutation.isPending}
                      data-testid="button-browse-files"
                    >
                      {uploadMutation.isPending ? "Uploading..." : "Browse Files"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.msg,.eml,.pst,.zip"
                      multiple
                      onChange={handleFileSelect}
                      data-testid="input-file-upload"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Quick Search Your Data Lake</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={quickSearch}
                      onChange={(e) => setQuickSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickSearch) {
                          setSearchQuery(quickSearch);
                          setActiveTab("search");
                        }
                      }}
                      placeholder='e.g. "Bainbridge term sheet" or "KKR diligence"'
                      className="pl-9"
                      data-testid="input-quick-search"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["Project Atlas", "NDA emails", "Term sheets 2024"].map((s) => (
                      <Button
                        key={s}
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSearchQuery(s);
                          setActiveTab("search");
                        }}
                        data-testid={`button-suggested-${s.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="connectors" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(connectors || []).map((c: any) => {
              const meta = CONNECTOR_META[c.connectorType];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <Card key={c.connectorType} data-testid={`connector-card-${c.connectorType}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center bg-muted ${meta.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{meta.name}</div>
                        <div className="text-xs text-muted-foreground">{meta.desc}</div>
                      </div>
                      {c.status === "connected" ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">Available</Badge>
                      )}
                    </div>

                    {c.status === "connected" && (
                      <div className="bg-muted/50 rounded-md p-3 flex justify-between">
                        <div>
                          <div className="text-lg font-bold">{c.itemsIndexed.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.connectorType === "outlook" || c.connectorType === "gmail" ? "emails indexed" : "files indexed"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Last sync</div>
                          <div className="text-sm font-medium">{c.lastSync ? formatRelativeTime(c.lastSync) : "Never"}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {c.status === "connected" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => syncMutation.mutate(c.connectorType)}
                            disabled={syncMutation.isPending}
                            data-testid={`button-sync-${c.connectorType}`}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Sync Now
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            data-testid={`button-manage-${c.connectorType}`}
                          >
                            <Settings className="w-3 h-3 mr-1" /> Manage
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="flex-1"
                          data-testid={`button-connect-${c.connectorType}`}
                        >
                          <Link className="w-3 h-3 mr-1" /> Connect {meta.name}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-sm font-semibold">Recently Ingested</CardTitle>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "emails", label: "Emails" },
                  { key: "files", label: "Files" },
                  { key: "uploaded", label: "Uploaded" },
                ].map((f) => (
                  <Button
                    key={f.key}
                    variant={fileFilter === f.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFileFilter(f.key)}
                    data-testid={`button-filter-${f.key}`}
                  >
                    {f.key === "all" && <Filter className="w-3 h-3 mr-1" />}
                    {f.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {itemsLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading items...</div>
              ) : !items?.length ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No items found. Upload files or connect a source to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-ingestions">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Source</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Indexed</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Size</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item) => {
                        const TypeIcon = getItemTypeIcon(item.itemType);
                        return (
                          <tr
                            key={item.id}
                            className="cursor-pointer transition-colors hover:bg-muted/50"
                            data-testid={`row-item-${item.id}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <TypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate max-w-xs">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE_VARIANT[item.itemType] || TYPE_BADGE_VARIANT.other}`}>
                                {item.itemType.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground capitalize">{item.source}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(item.indexedAt as any)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatFileSize(item.fileSize)}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(item.id);
                                }}
                                data-testid={`button-delete-item-${item.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="text-sm font-semibold">Search Across Your Entire Data Lake</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emails, files, deals, contacts..."
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Suggested:</span>
                {["NDA templates", "KKR correspondence", "IC memos Q4", "Term sheets 2024", "Clearway deal files"].map((s) => (
                  <Button
                    key={s}
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearchQuery(s)}
                    data-testid={`button-search-suggest-${s.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter by Source</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All Sources" },
                  { key: "outlook", label: "Outlook" },
                  { key: "gmail", label: "Gmail" },
                  { key: "onedrive", label: "OneDrive" },
                  { key: "gdrive", label: "Google Drive" },
                  { key: "upload", label: "Uploaded Files" },
                ].map((f) => (
                  <Button
                    key={f.key}
                    variant={searchSource === f.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchSource(f.key)}
                    data-testid={`button-source-filter-${f.key}`}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {searchQuery && (
            <Card>
              <CardContent className="p-5">
                {searchLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">Searching...</div>
                ) : !searchResults?.length ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">{searchResults.length} results</div>
                    {searchResults.map((item) => {
                      const TypeIcon = getItemTypeIcon(item.itemType);
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-md cursor-pointer border hover-elevate"
                          data-testid={`search-result-${item.id}`}
                        >
                          <TypeIcon className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE_VARIANT[item.itemType] || TYPE_BADGE_VARIANT.other}`}>
                                {item.itemType.toUpperCase()}
                              </span>
                              <span className="text-xs text-muted-foreground capitalize">{item.source}</span>
                              <span className="text-xs text-muted-foreground">{formatRelativeTime(item.indexedAt as any)}</span>
                              {item.fileSize && (
                                <span className="text-xs text-muted-foreground">{formatFileSize(item.fileSize)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
