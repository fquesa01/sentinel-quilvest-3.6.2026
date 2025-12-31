import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Cloud,
  MessageSquare,
  Mail,
  FolderOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Shield,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { SiSlack, SiGoogle, SiDropbox, SiBox, SiZoom } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AddSourceWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

type ProviderType = 
  | "chat_slack"
  | "email_m365"
  | "email_google"
  | "file_share_dropbox"
  | "file_share_box"
  | "file_share_drive"
  | "chat_teams"
  | "chat_zoom"
  | "chat_whatsapp"
  | "file_share_s3";

interface Provider {
  type: ProviderType;
  name: string;
  icon: any;
  description: string;
  category: "Chat" | "Email" | "File Storage" | "Case Management";
  requiresOAuth: boolean;
}

const providers: Provider[] = [
  {
    type: "chat_slack",
    name: "Slack",
    icon: SiSlack,
    description: "Team chats and channels",
    category: "Chat",
    requiresOAuth: true,
  },
  {
    type: "email_m365",
    name: "Microsoft 365",
    icon: Mail,
    description: "Email and calendar",
    category: "Email",
    requiresOAuth: true,
  },
  {
    type: "email_google",
    name: "Google Workspace",
    icon: SiGoogle,
    description: "Gmail and Drive",
    category: "Email",
    requiresOAuth: true,
  },
  {
    type: "file_share_dropbox",
    name: "Dropbox",
    icon: SiDropbox,
    description: "File storage",
    category: "File Storage",
    requiresOAuth: true,
  },
  {
    type: "file_share_box",
    name: "Box",
    icon: SiBox,
    description: "Enterprise file storage",
    category: "File Storage",
    requiresOAuth: true,
  },
  {
    type: "file_share_drive",
    name: "Google Drive",
    icon: FolderOpen,
    description: "Cloud file storage",
    category: "File Storage",
    requiresOAuth: true,
  },
  {
    type: "chat_teams",
    name: "Microsoft Teams",
    icon: MessageSquare,
    description: "Team collaboration",
    category: "Chat",
    requiresOAuth: true,
  },
  {
    type: "chat_zoom",
    name: "Zoom Chat",
    icon: SiZoom,
    description: "Video and chat",
    category: "Chat",
    requiresOAuth: true,
  },
  {
    type: "chat_whatsapp",
    name: "WhatsApp",
    icon: MessageSquare,
    description: "Via uploaded exports",
    category: "Chat",
    requiresOAuth: false,
  },
  {
    type: "file_share_s3",
    name: "Custom S3 / Azure",
    icon: Cloud,
    description: "Custom storage",
    category: "File Storage",
    requiresOAuth: false,
  },
  {
    type: "file_share_clio" as ProviderType,
    name: "Clio",
    icon: FileText,
    description: "Legal docs & communications",
    category: "Case Management",
    requiresOAuth: true,
  },
];

interface DetectedUser {
  externalId: string;
  email?: string;
  name?: string;
  suggestedCustodianId?: string;
  suggestedCustodianName?: string;
  role?: string;
}

export function AddSourceWizard({ open, onOpenChange, caseId }: AddSourceWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Configuration state
  const [connectorName, setConnectorName] = useState("");
  const [targetCaseId, setTargetCaseId] = useState(caseId);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [custodianMappings, setCustodianMappings] = useState<DetectedUser[]>([]);
  const [syncFrequency, setSyncFrequency] = useState("300"); // 5 minutes default
  const [oauthToken, setOauthToken] = useState("");

  // Mock data for demo - in production, these would come from the provider's API after OAuth
  const mockChannels = ["#legal", "#investigations", "#compliance", "#general", "#random"];
  const mockFolders = ["/Legal", "/Investigations/Case-2143", "/Evidence", "/Finance", "/HR"];
  const mockMailboxes = ["james@company.com", "amanda.smith@company.com", "legal@company.com"];

  // Fetch custodians for mapping
  const { data: custodians = [] } = useQuery<any[]>({
    queryKey: ["/api/custodians"],
    enabled: step === 3 && isAuthenticated,
  });

  // Create connector mutation
  const createConnectorMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/connector-configs", data);
      return await res.json();
    },
    onSuccess: async (connector: any) => {
      // Immediately trigger first sync
      try {
        const syncRes = await apiRequest("POST", `/api/connectors/${connector.id}/sync`);
        const syncResult = await syncRes.json();
        
        toast({
          title: "Source connected successfully",
          description: `${selectedProvider?.name} was connected. First sync completed with ${syncResult.stats?.itemsSucceeded || 0} items.`,
        });
      } catch (error: any) {
        toast({
          title: "Source connected",
          description: "First sync will start automatically",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/connector-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect source",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setStep(1);
    setSelectedProvider(null);
    setIsAuthenticated(false);
    setConnectorName("");
    setSelectedScopes([]);
    setCustodianMappings([]);
    setSyncFrequency("300");
    setOauthToken("");
    setTargetCaseId(caseId);
    onOpenChange(false);
  };

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    setConnectorName(`${provider.name} - ${new Date().toLocaleDateString()}`);
    setStep(2);
  };

  const handleOAuthComplete = () => {
    // Simulate OAuth completion
    setIsAuthenticated(true);
    setOauthToken("mock_oauth_token_" + Date.now());
    
    // Simulate detected users for custodian mapping
    if (selectedProvider?.type === "chat_slack" || selectedProvider?.type === "email_m365") {
      setCustodianMappings([
        {
          externalId: "U12345",
          email: "james@company.com",
          name: "James Carter",
          suggestedCustodianId: custodians.find((c) => c.email === "james@company.com")?.id,
          suggestedCustodianName: "James Carter",
          role: "employee",
        },
        {
          externalId: "U67890",
          email: "amanda.smith@company.com",
          name: "Amanda Smith",
          suggestedCustodianId: custodians.find((c) => c.email === "amanda.smith@company.com")?.id,
          suggestedCustodianName: "Amanda Smith",
          role: "employee",
        },
        {
          externalId: "U11111",
          email: "ext-consultant@vendor.com",
          name: "External Consultant",
          role: "vendor",
        },
      ]);
    }
    
    setStep(3);
  };

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleFinish = () => {
    if (!selectedProvider) return;

    const configData = {
      connectorType: selectedProvider.type,
      connectorName,
      isActive: "true",
      syncFrequency: parseInt(syncFrequency),
      credentialsEncrypted: oauthToken, // In production, this would be properly encrypted
      configurationData: {
        caseId: targetCaseId,
        scope: selectedScopes,
        custodianMappings,
        custodianCount: custodianMappings.length,
      },
    };

    createConnectorMutation.mutate(configData);
  };

  const getScopeOptions = () => {
    if (!selectedProvider) return [];
    
    switch (selectedProvider.type) {
      case "chat_slack":
      case "chat_teams":
        return mockChannels;
      case "file_share_dropbox":
      case "file_share_box":
      case "file_share_drive":
        return mockFolders;
      case "email_m365":
      case "email_google":
        return mockMailboxes;
      default:
        return [];
    }
  };

  const getScopeLabel = () => {
    if (!selectedProvider) return "Items";
    
    switch (selectedProvider.type) {
      case "chat_slack":
      case "chat_teams":
        return "Channels";
      case "file_share_dropbox":
      case "file_share_box":
      case "file_share_drive":
        return "Folders";
      case "email_m365":
      case "email_google":
        return "Mailboxes";
      default:
        return "Items";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Step 1: Provider Selection */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Connect New Source</DialogTitle>
              <DialogDescription>
                Select a system to begin ingestion. Your credentials are always encrypted.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <Card
                  key={provider.type}
                  className="cursor-pointer transition-all hover-elevate active-elevate-2"
                  onClick={() => handleProviderSelect(provider)}
                  data-testid={`card-provider-${provider.type}`}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <provider.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-1">{provider.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {provider.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {provider.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Step 2: OAuth Authentication */}
        {step === 2 && selectedProvider && (
          <>
            <DialogHeader>
              <DialogTitle>Authenticate {selectedProvider.name}</DialogTitle>
              <DialogDescription>
                To begin collecting data from {selectedProvider.name}, Sentinel requires permission to access the selected {getScopeLabel().toLowerCase()}. Credentials are encrypted and stored in accordance with ISO 27001 and SOC 2 guidelines.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8">
              <Card className="border-2">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <selectedProvider.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Ready to connect {selectedProvider.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    Click below to open the {selectedProvider.name} authentication window. You'll be asked to sign in and grant Sentinel read-only access.
                  </p>
                  
                  <div className="space-y-2 mb-6 text-left w-full max-w-md">
                    <div className="flex items-start gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-muted-foreground">
                        OAuth 2.0 industry-standard authentication
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-muted-foreground">
                        Read-only access to selected resources
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-muted-foreground">
                        Revocable at any time
                      </span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleOAuthComplete}
                    className="gap-2"
                    data-testid="button-oauth-connect"
                  >
                    <selectedProvider.icon className="h-4 w-4" />
                    Connect {selectedProvider.name}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    This will open a new window for secure authentication
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                data-testid="button-back-to-providers"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Configuration */}
        {step === 3 && selectedProvider && isAuthenticated && (
          <>
            <DialogHeader>
              <DialogTitle>Configure {selectedProvider.name}</DialogTitle>
              <DialogDescription>
                Map the data to your case and select what to monitor
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 py-4">
                {/* Connector Name */}
                <div className="space-y-2">
                  <Label htmlFor="connector-name">Connection Name</Label>
                  <Input
                    id="connector-name"
                    value={connectorName}
                    onChange={(e) => setConnectorName(e.target.value)}
                    placeholder={`${selectedProvider.name} Connection`}
                    data-testid="input-connector-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    A friendly name to identify this connection
                  </p>
                </div>

                {/* Case Mapping */}
                <div className="space-y-2">
                  <Label>Associate Data With Case</Label>
                  <Input
                    value={targetCaseId}
                    onChange={(e) => setTargetCaseId(e.target.value)}
                    placeholder="Case ID"
                    data-testid="input-case-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    All ingested data will be associated with this case
                  </p>
                </div>

                {/* Custodian Mapping */}
                {custodianMappings.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Map Custodians
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Sentinel detected these users. Match them to existing custodians or create new ones.
                    </p>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Detected User</TableHead>
                            <TableHead>Suggested Custodian</TableHead>
                            <TableHead>Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {custodianMappings.map((mapping, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{mapping.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {mapping.email}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {mapping.suggestedCustodianName ? (
                                  <div className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-green-600" />
                                    <span>{mapping.suggestedCustodianName}</span>
                                  </div>
                                ) : (
                                  <Badge variant="outline">
                                    Create New Custodian
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {mapping.role}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Scope Selection */}
                <div className="space-y-2">
                  <Label>Select {getScopeLabel()} to Monitor</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose exactly which {getScopeLabel().toLowerCase()} Sentinel will ingest
                  </p>
                  
                  <div className="border rounded-lg p-4 space-y-2">
                    {getScopeOptions().map((scope) => (
                      <div key={scope} className="flex items-center space-x-2">
                        <Checkbox
                          id={`scope-${scope}`}
                          checked={selectedScopes.includes(scope)}
                          onCheckedChange={() => handleScopeToggle(scope)}
                          data-testid={`checkbox-scope-${scope}`}
                        />
                        <label
                          htmlFor={`scope-${scope}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {scope}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {selectedScopes.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {selectedScopes.length} {getScopeLabel().toLowerCase()} selected
                    </p>
                  )}
                </div>

                {/* Sync Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="sync-frequency" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Sync Schedule
                  </Label>
                  <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                    <SelectTrigger id="sync-frequency" data-testid="select-sync-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Every 5 minutes</SelectItem>
                      <SelectItem value="900">Every 15 minutes</SelectItem>
                      <SelectItem value="3600">Hourly</SelectItem>
                      <SelectItem value="86400">Daily at 2am</SelectItem>
                      <SelectItem value="0">Manual only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Higher frequency increases real-time monitoring but uses more API calls
                  </p>
                </div>

                {/* Review Summary */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm mb-3">Review & Confirm</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="font-medium">{selectedProvider.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{getScopeLabel()}:</span>
                        <span className="font-medium">{selectedScopes.length} selected</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custodians:</span>
                        <span className="font-medium">{custodianMappings.length} mapped</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sync Frequency:</span>
                        <span className="font-medium">
                          {syncFrequency === "0" ? "Manual" : `Every ${parseInt(syncFrequency) < 3600 ? parseInt(syncFrequency) / 60 + " min" : parseInt(syncFrequency) / 3600 + " hour"}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Case:</span>
                        <span className="font-medium">{targetCaseId}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(2);
                  setIsAuthenticated(false);
                }}
                data-testid="button-back-to-auth"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleFinish}
                disabled={selectedScopes.length === 0 || createConnectorMutation.isPending}
                className="gap-2"
                data-testid="button-finish-setup"
              >
                {createConnectorMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Finish & Start First Sync
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
