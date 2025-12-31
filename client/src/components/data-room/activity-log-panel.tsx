import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Eye,
  Download,
  Upload,
  Trash2,
  UserPlus,
  Shield,
  FileText,
  Folder,
  Users,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface ActivityLogPanelProps {
  dataRoomId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AuditLogEntry {
  log: {
    id: string;
    dataRoomId: string;
    userId?: string;
    guestId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
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
  };
}

const actionIcons: Record<string, typeof Eye> = {
  view: Eye,
  download: Download,
  upload: Upload,
  delete: Trash2,
  invite: UserPlus,
  revoke: Shield,
  create: FileText,
  update: RefreshCw,
  permission_change: Shield,
  add_user: UserPlus,
};

const actionColors: Record<string, string> = {
  view: "text-blue-500",
  download: "text-green-500",
  upload: "text-purple-500",
  delete: "text-red-500",
  invite: "text-amber-500",
  revoke: "text-red-500",
  create: "text-green-500",
  update: "text-blue-500",
  permission_change: "text-amber-500",
  add_user: "text-green-500",
};

const resourceIcons: Record<string, typeof FileText> = {
  document: FileText,
  folder: Folder,
  guest: Users,
  user: Users,
  group: Shield,
  access: Shield,
  question: MessageSquare,
};

export function ActivityLogPanel({ dataRoomId, isOpen, onClose }: ActivityLogPanelProps) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [limit, setLimit] = useState(50);

  const { data: logs, isLoading, refetch } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/data-rooms", dataRoomId, "audit-log", limit],
    queryFn: async () => {
      const res = await fetch(`/api/data-rooms/${dataRoomId}/audit-log?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to load audit log");
      return res.json();
    },
    enabled: isOpen,
  });

  const getInitials = (user?: AuditLogEntry["user"], guest?: AuditLogEntry["guest"]) => {
    const person = user || guest;
    if (!person) return "SY";
    if (person.firstName && person.lastName) {
      return `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();
    }
    if (person.email) {
      return person.email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getActorName = (user?: AuditLogEntry["user"], guest?: AuditLogEntry["guest"]) => {
    const person = user || guest;
    if (!person) return "System";
    if (person.firstName && person.lastName) {
      return `${person.firstName} ${person.lastName}`;
    }
    return person.email;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      view: "Viewed",
      download: "Downloaded",
      upload: "Uploaded",
      delete: "Deleted",
      invite: "Invited",
      revoke: "Revoked access",
      create: "Created",
      update: "Updated",
      permission_change: "Changed permissions",
      add_user: "Added user",
    };
    return labels[action] || action;
  };

  const filteredLogs = logs?.filter((entry) => {
    if (actionFilter === "all") return true;
    return entry.log.action === actionFilter;
  }) || [];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Log
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-action-filter">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="view">Views</SelectItem>
                <SelectItem value="download">Downloads</SelectItem>
                <SelectItem value="upload">Uploads</SelectItem>
                <SelectItem value="delete">Deletions</SelectItem>
                <SelectItem value="invite">Invitations</SelectItem>
                <SelectItem value="create">Creations</SelectItem>
                <SelectItem value="update">Updates</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredLogs.length} entries
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-logs"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <ScrollArea className="flex-1 h-[400px]">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((entry) => {
                const ActionIcon = actionIcons[entry.log.action] || Eye;
                const ResourceIcon = resourceIcons[entry.log.resourceType || "document"] || FileText;
                const actionColor = actionColors[entry.log.action] || "text-gray-500";

                return (
                  <Card
                    key={entry.log.id}
                    className="p-3 flex items-start gap-3"
                    data-testid={`activity-${entry.log.id}`}
                  >
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="text-xs">
                        {getInitials(entry.user, entry.guest)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {getActorName(entry.user, entry.guest)}
                        </span>
                        <Badge variant="secondary" className={`text-xs ${actionColor}`}>
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {getActionLabel(entry.log.action)}
                        </Badge>
                        {entry.log.resourceType && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ResourceIcon className="h-3 w-3" />
                            {entry.log.resourceType}
                          </span>
                        )}
                      </div>
                      {entry.log.resourceName && (
                        <p className="text-sm text-muted-foreground truncate">
                          {entry.log.resourceName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(entry.log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {entry.log.ipAddress && (
                          <span className="flex items-center gap-1">
                            IP: {entry.log.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {logs && logs.length >= limit && (
          <div className="pt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit((prev) => prev + 50)}
              data-testid="button-load-more"
            >
              Load More
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
