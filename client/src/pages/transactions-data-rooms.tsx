import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  FileText,
  ChevronRight,
  ArrowLeft,
  FolderOpen,
  Lock,
  Users,
  HardDrive,
  Trash2,
} from "lucide-react";
import type { Deal, DataRoom, User } from "@shared/schema";
import { format } from "date-fns";

export default function TransactionsDataRooms() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateStandaloneOpen, setIsCreateStandaloneOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [deleteRoomName, setDeleteRoomName] = useState<string>("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });
  
  const isAdmin = user?.role === "admin";

  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: allRooms, isLoading: standaloneLoading } = useQuery<DataRoom[]>({
    queryKey: ["/api/data-rooms"],
  });
  
  // Filter for standalone rooms (no deal association)
  const standaloneRooms = allRooms?.filter((room) => !room.dealId);

  const { data: dataRooms, isLoading: roomsLoading } = useQuery<DataRoom[]>({
    queryKey: ["/api/deals", selectedDealId, "data-rooms"],
    enabled: !!selectedDealId,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", `/api/deals/${selectedDealId}/data-rooms`, data);
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["/api/deals", selectedDealId, "data-rooms"] });
      setIsCreateOpen(false);
      toast({
        title: "Data room created",
        description: "The virtual data room has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create data room",
        variant: "destructive",
      });
    },
  });

  const createStandaloneRoomMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", `/api/data-rooms`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/data-rooms"] });
      setIsCreateStandaloneOpen(false);
      toast({
        title: "Data room created",
        description: "The standalone data room has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create data room",
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return apiRequest("DELETE", `/api/data-rooms/${roomId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/data-rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals", selectedDealId, "data-rooms"] });
      setDeleteRoomId(null);
      setDeleteRoomName("");
      toast({
        title: "Data room deleted",
        description: "The data room has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete data room",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRoom = (roomId: string, roomName: string) => {
    setDeleteRoomId(roomId);
    setDeleteRoomName(roomName);
  };

  const confirmDeleteRoom = () => {
    if (deleteRoomId) {
      deleteRoomMutation.mutate(deleteRoomId);
    }
  };

  const activeDeals = deals?.filter((d) => d.status === "active" || d.status === "pipeline") || [];
  const selectedDeal = deals?.find((d) => d.id === selectedDealId);

  const handleCreateStandaloneRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createStandaloneRoomMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    });
  };

  const filteredRooms = dataRooms?.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRoomMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    });
  };

  if (dealsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between stagger-1">
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
            <h1 className="text-2xl font-bold">Data Rooms</h1>
            <p className="text-muted-foreground">
              Secure virtual data rooms for document sharing
            </p>
          </div>
        </div>
      </div>

      {!selectedDealId ? (
        <div className="space-y-6">
          {/* Standalone Data Rooms Section */}
          <Card className="stagger-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Standalone Data Rooms
                </CardTitle>
                <Dialog open={isCreateStandaloneOpen} onOpenChange={setIsCreateStandaloneOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-standalone-room">
                      <Plus className="h-4 w-4 mr-2" />
                      New Data Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Standalone Data Room</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateStandaloneRoom} className="space-y-4">
                      <div>
                        <Label htmlFor="standalone-name">Room Name</Label>
                        <Input
                          id="standalone-name"
                          name="name"
                          placeholder="e.g., General Documents"
                          required
                          data-testid="input-standalone-room-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="standalone-description">Description</Label>
                        <Textarea
                          id="standalone-description"
                          name="description"
                          placeholder="Describe the purpose of this data room"
                          data-testid="input-standalone-room-description"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateStandaloneOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createStandaloneRoomMutation.isPending}
                          data-testid="button-submit-standalone-room"
                        >
                          {createStandaloneRoomMutation.isPending ? "Creating..." : "Create Room"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Create data rooms independent of any deal for general document management.
              </p>
              {standaloneLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              ) : standaloneRooms?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No standalone data rooms yet. Click "New Data Room" to create one.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {standaloneRooms?.map((room) => (
                    <Card
                      key={room.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/transactions/data-rooms/${room.id}`)}
                      data-testid={`card-standalone-room-${room.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded">
                              <FolderOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{room.name}</p>
                              <Badge variant={room.isActive ? "default" : "secondary"} className="mt-1">
                                {room.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRoom(room.id, room.name);
                                }}
                                data-testid={`button-delete-room-${room.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {room.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            {room.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {room.createdAt ? format(new Date(room.createdAt), "MMM d, yyyy") : "—"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deal-Based Data Rooms Section */}
          <Card className="stagger-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Deal-Based Data Rooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Choose an active deal to view or create data rooms linked to that deal.
              </p>
              <div className="grid gap-3">
                {activeDeals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No active deals found. Create a deal first to add deal-based data rooms.
                  </p>
                ) : (
                  activeDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedDealId(deal.id)}
                      data-testid={`card-deal-${deal.id}`}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{deal.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {deal.dealNumber} • {deal.dealType?.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={deal.status === "active" ? "default" : "secondary"}>
                            {deal.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDealId(null)}
                    data-testid="button-change-deal"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Change Deal
                  </Button>
                  <div className="border-l pl-3">
                    <p className="font-medium">{selectedDeal?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDeal?.dealNumber}
                    </p>
                  </div>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-room">
                      <Plus className="h-4 w-4 mr-2" />
                      New Data Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Data Room</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateRoom} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Room Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="e.g., Buyer Data Room"
                          required
                          data-testid="input-room-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Describe the purpose of this data room"
                          data-testid="input-room-description"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createRoomMutation.isPending}
                          data-testid="button-submit-room"
                        >
                          {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search data rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-rooms"
              />
            </div>
          </div>

          {roomsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : filteredRooms?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HardDrive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Data Rooms</h3>
                <p className="text-muted-foreground mb-4">
                  Create a virtual data room to organize and share documents securely.
                </p>
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-room">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Data Room
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRooms?.map((room) => (
                <Card
                  key={room.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(`/transactions/data-rooms/${room.id}`)}
                  data-testid={`card-room-${room.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{room.name}</CardTitle>
                          <Badge variant={room.isActive ? "default" : "secondary"} className="mt-1">
                            {room.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Access Control</span>
                      </div>
                      <span>
                        Created {room.createdAt ? format(new Date(room.createdAt), "MMM d, yyyy") : "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRoomId} onOpenChange={(open) => !open && setDeleteRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deleteRoomName}"? This action cannot be undone and will remove all documents, folders, and access permissions associated with this data room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRoom}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRoomMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteRoomMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
