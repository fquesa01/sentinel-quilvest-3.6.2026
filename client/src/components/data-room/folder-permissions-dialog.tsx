import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  Eye,
  Download,
  Upload,
  EyeOff,
  UserCheck,
  Trash2,
} from "lucide-react";

interface FolderPermissionsDialogProps {
  dataRoomId: string;
  folderId: string;
  folderName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface FolderPermission {
  id: string;
  folderId: string;
  userId?: string;
  guestId?: string;
  groupId?: string;
  permission: string;
  createdAt: string;
  user?: { email: string; firstName?: string; lastName?: string };
  guest?: { email: string; firstName?: string; lastName?: string };
  group?: { name: string };
}

interface AccessRecord {
  access: {
    id: string;
    userId?: string;
    guestId?: string;
    groupId?: string;
  };
  user?: { id: string; email: string; firstName?: string; lastName?: string };
  guest?: { id: string; email: string; firstName?: string; lastName?: string };
  group?: { id: string; name: string };
}

const permissionLabels: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  view: { label: "View Only", icon: Eye, color: "text-blue-500" },
  download: { label: "View & Download", icon: Download, color: "text-green-500" },
  upload: { label: "Full Access", icon: Upload, color: "text-purple-500" },
  none: { label: "No Access", icon: EyeOff, color: "text-red-500" },
};

export function FolderPermissionsDialog({
  dataRoomId,
  folderId,
  folderName,
  isOpen,
  onClose,
}: FolderPermissionsDialogProps) {
  const { toast } = useToast();
  const [selectedEntity, setSelectedEntity] = useState<{
    type: "user" | "guest" | "group";
    id: string;
  } | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<string>("view");

  const { data: accessRecords } = useQuery<AccessRecord[]>({
    queryKey: ["/api/data-rooms", dataRoomId, "access"],
    enabled: isOpen,
  });

  const { data: folderPermissions, refetch: refetchPermissions } = useQuery<FolderPermission[]>({
    queryKey: ["/api/data-room-folders", folderId, "permissions"],
    queryFn: async () => {
      const res = await fetch(`/api/data-room-folders/${folderId}/permissions`);
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
    enabled: isOpen,
  });

  const createPermissionMutation = useMutation({
    mutationFn: async (data: {
      userId?: string;
      guestId?: string;
      groupId?: string;
      permission: string;
    }) => {
      return apiRequest("POST", `/api/data-room-folders/${folderId}/permissions`, data);
    },
    onSuccess: () => {
      refetchPermissions();
      setSelectedEntity(null);
      toast({ title: "Permission added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      return apiRequest("DELETE", `/api/data-room-folder-permissions/${permissionId}`, {});
    },
    onSuccess: () => {
      refetchPermissions();
      toast({ title: "Permission removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getEntityName = (record: AccessRecord) => {
    if (record.user) {
      return record.user.firstName && record.user.lastName
        ? `${record.user.firstName} ${record.user.lastName}`
        : record.user.email;
    }
    if (record.guest) {
      return record.guest.firstName && record.guest.lastName
        ? `${record.guest.firstName} ${record.guest.lastName}`
        : record.guest.email;
    }
    if (record.group) {
      return record.group.name;
    }
    return "Unknown";
  };

  const getEntityType = (record: AccessRecord): "user" | "guest" | "group" => {
    if (record.user) return "user";
    if (record.guest) return "guest";
    return "group";
  };

  const getEntityId = (record: AccessRecord): string => {
    if (record.access.userId) return record.access.userId;
    if (record.access.guestId) return record.access.guestId;
    if (record.access.groupId) return record.access.groupId;
    return "";
  };

  const getInitials = (record: AccessRecord) => {
    if (record.user?.firstName && record.user?.lastName) {
      return `${record.user.firstName[0]}${record.user.lastName[0]}`;
    }
    if (record.guest?.firstName && record.guest?.lastName) {
      return `${record.guest.firstName[0]}${record.guest.lastName[0]}`;
    }
    if (record.group) return record.group.name.substring(0, 2).toUpperCase();
    if (record.user?.email) return record.user.email.substring(0, 2).toUpperCase();
    if (record.guest?.email) return record.guest.email.substring(0, 2).toUpperCase();
    return "??";
  };

  const handleAddPermission = () => {
    if (!selectedEntity) return;
    const data: any = { permission: selectedPermission };
    if (selectedEntity.type === "user") data.userId = selectedEntity.id;
    if (selectedEntity.type === "guest") data.guestId = selectedEntity.id;
    if (selectedEntity.type === "group") data.groupId = selectedEntity.id;
    createPermissionMutation.mutate(data);
  };

  const existingPermissionIds = new Set(
    (folderPermissions || []).map((p) => p.userId || p.guestId || p.groupId)
  );

  const availableEntities = (accessRecords || []).filter((record) => {
    const id = getEntityId(record);
    return !existingPermissionIds.has(id);
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Folder Permissions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Manage access permissions for <span className="font-medium">{folderName}</span>
          </div>

          {availableEntities.length > 0 && (
            <div className="border rounded-lg p-3 space-y-3">
              <label className="text-sm font-medium">Add Permission Override</label>
              <div className="flex gap-2">
                <Select
                  value={selectedEntity ? `${selectedEntity.type}:${selectedEntity.id}` : ""}
                  onValueChange={(value) => {
                    const [type, id] = value.split(":");
                    setSelectedEntity({ type: type as "user" | "guest" | "group", id });
                  }}
                >
                  <SelectTrigger className="flex-1" data-testid="select-entity">
                    <SelectValue placeholder="Select user, guest, or group" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEntities.map((record) => {
                      const type = getEntityType(record);
                      const id = getEntityId(record);
                      return (
                        <SelectItem key={`${type}:${id}`} value={`${type}:${id}`}>
                          <div className="flex items-center gap-2">
                            {type === "group" ? (
                              <Users className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            <span>{getEntityName(record)}</span>
                            <Badge variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                  <SelectTrigger className="w-[140px]" data-testid="select-permission-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(permissionLabels).map(([value, { label, icon: Icon }]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAddPermission}
                disabled={!selectedEntity || createPermissionMutation.isPending}
                data-testid="button-add-permission"
              >
                Add Permission
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Current Permissions</label>
            {!folderPermissions || folderPermissions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No specific permissions set</p>
                <p className="text-xs">Using inherited permissions from data room</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {folderPermissions.map((permission) => {
                    const permInfo = permissionLabels[permission.permission] || permissionLabels.view;
                    const PermIcon = permInfo.icon;
                    return (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                        data-testid={`permission-${permission.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {permission.user?.firstName?.[0] ||
                                permission.guest?.firstName?.[0] ||
                                permission.group?.name?.[0] ||
                                "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {permission.user?.email ||
                                permission.guest?.email ||
                                permission.group?.name ||
                                "Unknown"}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${permInfo.color}`}
                            >
                              <PermIcon className="h-3 w-3 mr-1" />
                              {permInfo.label}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deletePermissionMutation.mutate(permission.id)}
                          data-testid={`button-remove-permission-${permission.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
