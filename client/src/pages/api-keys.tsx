import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Key, Plus, Copy, Ban, Clock, Shield, Activity, Eye } from "lucide-react";
import { Redirect } from "wouter";
import { API_KEY_SCOPES } from "@shared/schema";

interface ApiKeyData {
  id: string;
  displayName: string;
  keyPrefix: string;
  userId: string;
  scopes: string[];
  rateLimitPerMinute: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  rawKey?: string;
}

interface AuditLogData {
  id: string;
  apiKeyId: string;
  userId: string | null;
  method: string;
  path: string;
  statusCode: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const SCOPE_LABELS: Record<string, string> = {
  "deals:read": "Read Deals",
  "deals:write": "Write Deals",
  "documents:read": "Read Documents",
  "documents:write": "Write Documents",
  "cases:read": "Read Cases",
  "cases:write": "Write Cases",
  "analysis:trigger": "Trigger Analysis",
  "communications:read": "Read Communications",
};

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState("60");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  const keysQuery = useQuery<{ data: ApiKeyData[] }>({
    queryKey: ["/api/api-keys"],
  });

  const auditQuery = useQuery<{ data: AuditLogData[]; pagination: { total: number } }>({
    queryKey: ["/api/api-key-audit-logs"],
  });

  const keyAuditQuery = useQuery<{ data: AuditLogData[]; pagination: { total: number } }>({
    queryKey: ["/api/api-keys", selectedKeyId, "audit-logs"],
    enabled: !!selectedKeyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { displayName: string; scopes: string[]; rateLimitPerMinute: number }) => {
      const res = await apiRequest("POST", "/api/api-keys", data);
      return res.json();
    },
    onSuccess: (result: { data: ApiKeyData }) => {
      setCreatedKey(result.data.rawKey || null);
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key created", description: "Save the key now - it won't be shown again." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create API key.", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/api-keys/${id}/revoke`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key revoked", description: "The key can no longer be used." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to revoke API key.", variant: "destructive" });
    },
  });

  if ((user as any)?.role !== "super_admin") {
    return <Redirect to="/dashboard" />;
  }

  const handleCreate = () => {
    if (!newKeyName.trim() || selectedScopes.length === 0) return;
    createMutation.mutate({
      displayName: newKeyName.trim(),
      scopes: selectedScopes,
      rateLimitPerMinute: parseInt(rateLimit) || 60,
    });
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      toast({ title: "Copied", description: "API key copied to clipboard." });
    }
  };

  const resetCreateForm = () => {
    setNewKeyName("");
    setSelectedScopes([]);
    setRateLimit("60");
    setCreatedKey(null);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const keys = keysQuery.data?.data || [];
  const auditLogs = auditQuery.data?.data || [];
  const keyAuditLogs = keyAuditQuery.data?.data || [];

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">API Keys</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Manage API keys for external agent access
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetCreateForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-api-key">
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            {createdKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>
                    Copy this key now. It will not be shown again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdKey}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-created-key"
                    />
                    <Button size="icon" variant="outline" onClick={handleCopyKey} data-testid="button-copy-key">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }} data-testid="button-done-create">
                    Done
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for external agent access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key-name">Display Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., OpenClaw Agent"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      data-testid="input-key-name"
                    />
                  </div>
                  <div>
                    <Label>Permission Scopes</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {API_KEY_SCOPES.map((scope) => (
                        <label
                          key={scope}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                          data-testid={`checkbox-scope-${scope}`}
                        >
                          <Checkbox
                            checked={selectedScopes.includes(scope)}
                            onCheckedChange={() => toggleScope(scope)}
                          />
                          {SCOPE_LABELS[scope] || scope}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
                    <Input
                      id="rate-limit"
                      type="number"
                      min="1"
                      max="10000"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(e.target.value)}
                      data-testid="input-rate-limit"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newKeyName.trim() || selectedScopes.length === 0 || createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Key"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="keys">
        <TabsList data-testid="tabs-api-keys">
          <TabsTrigger value="keys" data-testid="tab-keys">
            <Key className="mr-2 h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <Activity className="mr-2 h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Active API Keys
              </CardTitle>
              <CardDescription>
                Keys used by external agents to access the platform API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keysQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-keys">
                  No API keys created yet. Create one to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Rate Limit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                        <TableCell className="font-medium" data-testid={`text-key-name-${key.id}`}>
                          {key.displayName}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded" data-testid={`text-key-prefix-${key.id}`}>
                            {key.keyPrefix}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.scopes.map((scope) => (
                              <Badge key={scope} variant="secondary" className="text-xs" data-testid={`badge-scope-${key.id}-${scope}`}>
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-rate-limit-${key.id}`}>
                          {key.rateLimitPerMinute}/min
                        </TableCell>
                        <TableCell>
                          {key.isActive ? (
                            <Badge variant="default" data-testid={`badge-status-${key.id}`}>Active</Badge>
                          ) : (
                            <Badge variant="destructive" data-testid={`badge-status-${key.id}`}>Revoked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-last-used-${key.id}`}>
                          {formatDate(key.lastUsedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-created-${key.id}`}>
                          {formatDate(key.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelectedKeyId(selectedKeyId === key.id ? null : key.id)}
                              data-testid={`button-view-logs-${key.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {key.isActive && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-revoke-${key.id}`}>
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently revoke the key "{key.displayName}". Any agents using this key will lose access immediately.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => revokeMutation.mutate(key.id)}
                                      data-testid="button-confirm-revoke"
                                    >
                                      Revoke
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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

          {selectedKeyId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Usage Logs for {keys.find(k => k.id === selectedKeyId)?.displayName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {keyAuditQuery.isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : keyAuditLogs.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground" data-testid="text-no-key-logs">
                    No usage recorded yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keyAuditLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-key-audit-${log.id}`}>
                          <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.path}</TableCell>
                          <TableCell>
                            <Badge variant={log.statusCode && log.statusCode < 400 ? "default" : "destructive"}>
                              {log.statusCode || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                All API Activity
              </CardTitle>
              <CardDescription>
                Recent API key usage across all keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground" data-testid="text-no-audit-logs">
                  No API activity recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => {
                      const key = keys.find(k => k.id === log.apiKeyId);
                      return (
                        <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                          <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-audit-key-${log.id}`}>
                            {key?.displayName || log.apiKeyId.slice(0, 8) + "..."}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.path}</TableCell>
                          <TableCell>
                            <Badge variant={log.statusCode && log.statusCode < 400 ? "default" : "destructive"}>
                              {log.statusCode || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
