import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Users, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  profileImageUrl?: string | null;
};

type ShareDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentSubject: string;
};

export function ShareDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentSubject,
}: ShareDocumentDialogProps) {
  const { toast } = useToast();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/investigators"],
    enabled: open,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/communications/${documentId}/share`, {
        recipientUserIds: selectedUserIds,
        message: message || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Document shared",
        description: `Notification sent to ${selectedUserIds.length} user(s)`,
      });
      setSelectedUserIds([]);
      setMessage("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to share document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "attorney":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "compliance_officer":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "auditor":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full" data-testid="dialog-share-document">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Flag this document for review by other team members. They will receive an in-app notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium truncate" data-testid="text-share-subject">
              {documentSubject || "Untitled Document"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Recipients</Label>
              {users.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  data-testid="button-select-all-users"
                >
                  {selectedUserIds.length === users.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users available</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-1 pr-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer overflow-hidden"
                      onClick={() => handleToggleUser(user.id)}
                      data-testid={`user-item-${user.id}`}
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleToggleUser(user.id)}
                        className="flex-shrink-0"
                        data-testid={`checkbox-user-${user.id}`}
                      />
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={user.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 whitespace-nowrap ${getRoleBadgeColor(user.role)}`}
                      >
                        {formatRole(user.role)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedUserIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedUserIds.length} user(s) selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-message">Message (optional)</Label>
            <Textarea
              id="share-message"
              placeholder="Add a note about why you're sharing this document..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              data-testid="input-share-message"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-share"
          >
            Cancel
          </Button>
          <Button
            onClick={() => shareMutation.mutate()}
            disabled={selectedUserIds.length === 0 || shareMutation.isPending}
            data-testid="button-send-share"
          >
            {shareMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Share ({selectedUserIds.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
