import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Database, RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

type ConnectorConfig = {
  id: string;
  connectorType: string;
  connectorName: string;
  status: string;
  configuration: any;
  lastSyncAt: string | null;
  createdAt: string;
};

export default function CollectionsPage() {
  const [dialogOpen, setDialogOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create")) {
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }
    return false;
  });
  const [connectorName, setConnectorName] = useState("");
  const [connectorType, setConnectorType] = useState("");
  const [selectedConfig, setSelectedConfig] = useState<ConnectorConfig | null>(null);
  const { toast } = useToast();

  const { data: connectors, isLoading } = useQuery<ConnectorConfig[]>({
    queryKey: ["/api/connector-configs"],
  });

  const createConnectorMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/connector-configs", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connector-configs"] });
      toast({
        title: "Success",
        description: "Connector created successfully",
      });
      setDialogOpen(false);
      setConnectorName("");
      setConnectorType("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncConnectorMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/connector-configs/${id}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to sync connector");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connector-configs"] });
      toast({
        title: "Sync Started",
        description: "Collection sync is in progress",
      });
    },
  });

  const handleCreateConnector = () => {
    if (!connectorName || !connectorType) return;

    // Default configurations for each type
    const defaultConfigs: Record<string, any> = {
      m365: {
        tenantId: "",
        clientId: "",
        enabled: true,
        dataTypes: ["email", "teams", "onedrive"],
      },
      slack: {
        workspaceId: "",
        apiToken: "",
        enabled: true,
        channels: [],
      },
      sms: {
        mdmProvider: "",
        enabled: true,
        phoneNumbers: [],
      },
      gmail: {
        domain: "",
        serviceAccount: "",
        enabled: true,
      },
    };

    createConnectorMutation.mutate({
      connectorName,
      connectorType,
      status: "configured",
      configuration: defaultConfigs[connectorType] || { enabled: true },
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      active: { variant: "default", icon: CheckCircle },
      configured: { variant: "secondary", icon: Clock },
      error: { variant: "destructive", icon: AlertCircle },
      syncing: { variant: "outline", icon: RefreshCw },
    };

    const config = variants[status] || variants.configured;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const connectorTypeLabels: Record<string, string> = {
    m365: "Microsoft 365",
    slack: "Slack",
    sms: "SMS / Mobile",
    gmail: "Gmail / Google Workspace",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collection Management</h1>
          <p className="text-muted-foreground mt-1">
            Configure and monitor data collection from communication sources
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-connector">
              <Plus className="h-4 w-4 mr-2" />
              Add Connector
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Data Connector</DialogTitle>
              <DialogDescription>
                Configure a new data source for communication collection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="connector-name">Connector Name</Label>
                <Input
                  id="connector-name"
                  value={connectorName}
                  onChange={(e) => setConnectorName(e.target.value)}
                  placeholder="e.g., Production Email System"
                  data-testid="input-connector-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="connector-type">Connector Type</Label>
                <Select value={connectorType} onValueChange={setConnectorType}>
                  <SelectTrigger data-testid="select-connector-type">
                    <SelectValue placeholder="Select connector type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m365">Microsoft 365</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="sms">SMS / Mobile (MDM)</SelectItem>
                    <SelectItem value="gmail">Gmail / Google Workspace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateConnector}
                disabled={!connectorName || !connectorType}
                data-testid="button-create-connector"
              >
                Create Connector
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connectors</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-connectors">
              {connectors?.filter(c => c.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connectors</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-connectors">
              {connectors?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium" data-testid="text-last-sync">
              {connectors?.[0]?.lastSyncAt 
                ? format(new Date(connectors[0].lastSyncAt), "MMM d, h:mm a")
                : "Never"
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connectors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Connectors</CardTitle>
          <CardDescription>
            Manage and monitor data collection from various sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading connectors...
            </div>
          ) : connectors && connectors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connectors.map((connector) => (
                  <TableRow key={connector.id} data-testid={`row-connector-${connector.id}`}>
                    <TableCell className="font-medium" data-testid={`text-connector-name-${connector.id}`}>
                      {connector.connectorName}
                    </TableCell>
                    <TableCell data-testid={`text-connector-type-${connector.id}`}>
                      {connectorTypeLabels[connector.connectorType] || connector.connectorType}
                    </TableCell>
                    <TableCell data-testid={`badge-connector-status-${connector.id}`}>
                      {getStatusBadge(connector.status)}
                    </TableCell>
                    <TableCell data-testid={`text-connector-sync-${connector.id}`}>
                      {connector.lastSyncAt
                        ? format(new Date(connector.lastSyncAt), "MMM d, h:mm a")
                        : "Never"}
                    </TableCell>
                    <TableCell data-testid={`text-connector-created-${connector.id}`}>
                      {format(new Date(connector.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncConnectorMutation.mutate(connector.id)}
                        disabled={syncConnectorMutation.isPending}
                        data-testid={`button-sync-${connector.id}`}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No connectors configured</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add a data connector to start collecting communications
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-connector">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Connector
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
