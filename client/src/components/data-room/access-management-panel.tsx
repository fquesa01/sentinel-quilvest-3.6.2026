import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users,
  UserPlus,
  Shield,
  Clock,
  MoreVertical,
  Mail,
  Building,
  Trash2,
  Edit,
  Eye,
  Download,
  Upload,
  Plus,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface AccessManagementPanelProps {
  dataRoomId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DataRoomGroup {
  id: string;
  dataRoomId: string;
  name: string;
  description?: string;
  color: string;
  canView: boolean;
  canDownload: boolean;
  canUpload: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
  enableWatermark: boolean;
  enablePrintBlock: boolean;
  downloadFormat: string;
  createdAt: string;
}

interface AccessRecord {
  access: {
    id: string;
    dataRoomId: string;
    userId?: string;
    guestId?: string;
    groupId?: string;
    role: string;
    accessGrantedAt: string;
    accessExpiresAt?: string;
    status: string;
    invitedBy?: string;
    inviteSentAt?: string;
    inviteAcceptedAt?: string;
    accessNotes?: string;
  };
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  guest?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    status: string;
    lastLoginAt?: string;
    loginCount: number;
  };
  group?: DataRoomGroup;
}

export function AccessManagementPanel({ dataRoomId, isOpen, onClose }: AccessManagementPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState("viewer");

  const { data: accessData, isLoading: isAccessLoading } = useQuery<{ users: AccessRecord[], guests: AccessRecord[] }>({
    queryKey: ["/api/data-rooms", dataRoomId, "access"],
    queryFn: async () => {
      const res = await fetch(`/api/data-rooms/${dataRoomId}/access`);
      if (!res.ok) throw new Error("Failed to load access data");
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: groups, isLoading: isGroupsLoading } = useQuery<DataRoomGroup[]>({
    queryKey: ["/api/data-rooms", dataRoomId, "groups"],
    queryFn: async () => {
      const res = await fetch(`/api/data-rooms/${dataRoomId}/groups`);
      if (!res.ok) throw new Error("Failed to load groups");
      return res.json();
    },
    enabled: isOpen,
  });

  const inviteGuestMutation = useMutation({
    mutationFn: async (data: { email: string; firstName?: string; lastName?: string; company?: string; groupId?: string; role: string }) => {
      return apiRequest("POST", `/api/data-rooms/${dataRoomId}/guests`, data);
    },
    onSuccess: () => {
      toast({ title: "Invitation sent", description: "Guest will receive an email invitation." });
      queryClient.invalidateQueries({ queryKey: ["/api/data-rooms", dataRoomId, "access"] });
      setIsInviteOpen(false);
      resetInviteForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (accessId: string) => {
      return apiRequest("DELETE", `/api/data-room-access/${accessId}`);
    },
    onSuccess: () => {
      toast({ title: "Access revoked", description: "The user no longer has access to this data room." });
      queryClient.invalidateQueries({ queryKey: ["/api/data-rooms", dataRoomId, "access"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; canView: boolean; canDownload: boolean; canUpload: boolean }) => {
      return apiRequest("POST", `/api/data-rooms/${dataRoomId}/groups`, data);
    },
    onSuccess: () => {
      toast({ title: "Group created", description: "Permission group has been created." });
      queryClient.invalidateQueries({ queryKey: ["/api/data-rooms", dataRoomId, "groups"] });
      setIsCreateGroupOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("DELETE", `/api/data-room-groups/${groupId}`);
    },
    onSuccess: () => {
      toast({ title: "Group deleted", description: "Permission group has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/data-rooms", dataRoomId, "groups"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteFirstName("");
    setInviteLastName("");
    setInviteCompany("");
    setInviteGroupId(null);
    setInviteRole("viewer");
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return;
    }
    inviteGuestMutation.mutate({
      email: inviteEmail.trim(),
      firstName: inviteFirstName.trim() || undefined,
      lastName: inviteLastName.trim() || undefined,
      company: inviteCompany.trim() || undefined,
      groupId: inviteGroupId || undefined,
      role: inviteRole,
    });
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
      case "expired":
        return <Badge variant="secondary" className="bg-red-500/10 text-red-600">Expired</Badge>;
      case "revoked":
        return <Badge variant="secondary" className="bg-gray-500/10 text-gray-600">Revoked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">Admin</Badge>;
      case "editor":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">Editor</Badge>;
      case "viewer":
        return <Badge variant="secondary" className="bg-gray-500/10 text-gray-600">Viewer</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  if (!isOpen) return null;

  const users = accessData?.users || [];
  const guests = accessData?.guests || [];
  const pendingGuests = guests.filter(g => g.access.status === "pending");
  const activeAccess = [...users, ...guests.filter(g => g.access.status === "active")];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Access Management
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Users ({activeAccess.length})
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2" data-testid="tab-groups">
              <Shield className="h-4 w-4" />
              Groups ({groups?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2" data-testid="tab-pending">
              <Clock className="h-4 w-4" />
              Pending ({pendingGuests.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="users" className="h-full m-0">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  {activeAccess.length} user{activeAccess.length !== 1 ? "s" : ""} with access
                </p>
                <Button size="sm" onClick={() => setIsInviteOpen(true)} data-testid="button-invite-user">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>

              <ScrollArea className="h-[350px]">
                {isAccessLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : activeAccess.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No users have access to this data room</p>
                    <Button className="mt-4" onClick={() => setIsInviteOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite First User
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeAccess.map((record) => {
                      const isUser = !!record.user;
                      const person = record.user || record.guest;
                      return (
                        <Card key={record.access.id} className="p-3" data-testid={`access-record-${record.access.id}`}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {getInitials(person?.firstName, person?.lastName, person?.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {person?.firstName && person?.lastName
                                    ? `${person.firstName} ${person.lastName}`
                                    : person?.email}
                                </span>
                                {!isUser && record.guest?.company && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {record.guest.company}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {person?.email}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getRoleBadge(record.access.role)}
                              {getStatusBadge(record.access.status)}
                              {record.group && (
                                <Badge variant="outline" style={{ borderColor: record.group.color, color: record.group.color }}>
                                  {record.group.name}
                                </Badge>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-access-menu-${record.access.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Permissions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => revokeAccessMutation.mutate(record.access.id)}
                                  data-testid={`button-revoke-access-${record.access.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Revoke Access
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="groups" className="h-full m-0">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Define permission groups to control access levels
                </p>
                <Button size="sm" onClick={() => setIsCreateGroupOpen(true)} data-testid="button-create-group">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </div>

              <ScrollArea className="h-[350px]">
                {isGroupsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : groups?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No permission groups defined</p>
                    <p className="text-xs mt-1">Create groups to organize access permissions</p>
                    <Button className="mt-4" onClick={() => setIsCreateGroupOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Group
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups?.map((group) => (
                      <Card key={group.id} className="p-4" data-testid={`group-${group.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-3 h-10 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            <div>
                              <h4 className="font-medium">{group.name}</h4>
                              {group.description && (
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {group.canView && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Badge>
                                )}
                                {group.canDownload && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Badge>
                                )}
                                {group.canUpload && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Upload className="h-3 w-3 mr-1" />
                                    Upload
                                  </Badge>
                                )}
                                {group.enableWatermark && (
                                  <Badge variant="outline" className="text-xs">
                                    Watermark
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-group-menu-${group.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Group
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteGroupMutation.mutate(group.id)}
                                data-testid={`button-delete-group-${group.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pending" className="h-full m-0">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  {pendingGuests.length} pending invitation{pendingGuests.length !== 1 ? "s" : ""}
                </p>
              </div>

              <ScrollArea className="h-[350px]">
                {pendingGuests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No pending invitations</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingGuests.map((record) => (
                      <Card key={record.access.id} className="p-3" data-testid={`pending-${record.access.id}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {getInitials(record.guest?.firstName, record.guest?.lastName, record.guest?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {record.guest?.firstName && record.guest?.lastName
                                  ? `${record.guest.firstName} ${record.guest.lastName}`
                                  : record.guest?.email}
                              </span>
                              {record.guest?.company && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {record.guest.company}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {record.guest?.email}
                              <span className="text-xs">
                                Invited {record.access.inviteSentAt && format(new Date(record.access.inviteSentAt), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getRoleBadge(record.access.role)}
                            {getStatusBadge("pending")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Resend Invitation"
                              data-testid={`button-resend-${record.access.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => revokeAccessMutation.mutate(record.access.id)}
                              title="Cancel Invitation"
                              data-testid={`button-cancel-invite-${record.access.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-first-name">First Name</Label>
                <Input
                  id="invite-first-name"
                  placeholder="John"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                  data-testid="input-invite-first-name"
                />
              </div>
              <div>
                <Label htmlFor="invite-last-name">Last Name</Label>
                <Input
                  id="invite-last-name"
                  placeholder="Doe"
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                  data-testid="input-invite-last-name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="invite-company">Company</Label>
              <Input
                id="invite-company"
                placeholder="Acme Corp"
                value={inviteCompany}
                onChange={(e) => setInviteCompany(e.target.value)}
                data-testid="input-invite-company"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role" data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invite-group">Permission Group</Label>
                <Select value={inviteGroupId || "none"} onValueChange={(v) => setInviteGroupId(v === "none" ? null : v)}>
                  <SelectTrigger id="invite-group" data-testid="select-invite-group">
                    <SelectValue placeholder="No group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No group</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsInviteOpen(false); resetInviteForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteGuestMutation.isPending} data-testid="button-send-invite">
              {inviteGuestMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Permission Group</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createGroupMutation.mutate({
                name: formData.get("name") as string,
                description: formData.get("description") as string || undefined,
                canView: formData.get("canView") === "on",
                canDownload: formData.get("canDownload") === "on",
                canUpload: formData.get("canUpload") === "on",
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="group-name">Group Name *</Label>
              <Input id="group-name" name="name" required data-testid="input-group-name" />
            </div>
            <div>
              <Label htmlFor="group-description">Description</Label>
              <Input id="group-description" name="description" data-testid="input-group-description" />
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="canView" name="canView" defaultChecked className="rounded" />
                <Label htmlFor="canView" className="font-normal cursor-pointer flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Can view documents
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="canDownload" name="canDownload" className="rounded" />
                <Label htmlFor="canDownload" className="font-normal cursor-pointer flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Can download documents
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="canUpload" name="canUpload" className="rounded" />
                <Label htmlFor="canUpload" className="font-normal cursor-pointer flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Can upload documents
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateGroupOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGroupMutation.isPending} data-testid="button-create-group-submit">
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
