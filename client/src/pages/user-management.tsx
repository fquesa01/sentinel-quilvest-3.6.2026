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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleBadge } from "@/components/role-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Trash2, Building2, Plus, Pencil, UserMinus } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  userType: string;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  description: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface OrgMember {
  id: string;
  organizationId: string;
  userId: string;
  joinedAt: string;
  user?: User;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [addOrgDialogOpen, setAddOrgDialogOpen] = useState(false);
  const [editOrgDialogOpen, setEditOrgDialogOpen] = useState(false);
  const [deleteOrgDialogOpen, setDeleteOrgDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [viewOrgMembersOpen, setViewOrgMembersOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [assignOrgDialogOpen, setAssignOrgDialogOpen] = useState(false);
  const [userToAssignOrg, setUserToAssignOrg] = useState<User | null>(null);
  const [selectedOrgForAssign, setSelectedOrgForAssign] = useState("");

  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "employee",
    password: "",
    userType: "individual" as "individual" | "corporate",
    organizationId: "",
  });

  const [newOrg, setNewOrg] = useState({ name: "", description: "" });
  const [editOrgData, setEditOrgData] = useState({ name: "", description: "" });
  const [selectedMemberUserId, setSelectedMemberUserId] = useState("");
  const [inlineOrgCreating, setInlineOrgCreating] = useState(false);
  const [inlineOrgName, setInlineOrgName] = useState("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: orgs, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const { data: userOrgMap } = useQuery<Record<string, { organizationId: string; orgName: string }>>({
    queryKey: ["/api/user-org-map"],
  });

  const { data: orgMembers } = useQuery<OrgMember[]>({
    queryKey: ["/api/organizations", selectedOrg?.id, "members"],
    queryFn: async () => {
      if (!selectedOrg) return [];
      const res = await apiRequest("GET", `/api/organizations/${selectedOrg.id}/members`);
      return res.json();
    },
    enabled: !!selectedOrg && viewOrgMembersOpen,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role Updated", description: "User role has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Failed to update user role", variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-org-map"] });
      toast({ title: "User Created", description: "New user has been created successfully" });
      setAddUserDialogOpen(false);
      setNewUser({ email: "", firstName: "", lastName: "", role: "employee", password: "", userType: "individual", organizationId: "" });
    },
    onError: (error: any) => {
      toast({ title: "Creation Failed", description: error.message || "Failed to create user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-org-map"] });
      toast({ title: "User Deleted", description: "User has been deleted successfully" });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Deletion Failed", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (orgData: typeof newOrg) => {
      return apiRequest("POST", "/api/organizations", orgData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({ title: "Organization Created", description: "New organization has been created" });
      setAddOrgDialogOpen(false);
      setNewOrg({ name: "", description: "" });
    },
    onError: (error: any) => {
      toast({ title: "Creation Failed", description: error.message || "Failed to create organization", variant: "destructive" });
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editOrgData }) => {
      return apiRequest("PATCH", `/api/organizations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({ title: "Organization Updated", description: "Organization has been updated" });
      setEditOrgDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Failed to update organization", variant: "destructive" });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/organizations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Organization Deleted", description: "Organization has been deleted" });
      setDeleteOrgDialogOpen(false);
      setSelectedOrg(null);
    },
    onError: (error: any) => {
      toast({ title: "Deletion Failed", description: error.message || "Failed to delete organization", variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      return apiRequest("POST", `/api/organizations/${orgId}/members`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", selectedOrg?.id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-org-map"] });
      toast({ title: "Member Added", description: "User has been added to the organization" });
      setAddMemberDialogOpen(false);
      setSelectedMemberUserId("");
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message || "Failed to add member", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      return apiRequest("DELETE", `/api/organizations/${orgId}/members/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", selectedOrg?.id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-org-map"] });
      toast({ title: "Member Removed", description: "User has been removed from the organization" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message || "Failed to remove member", variant: "destructive" });
    },
  });

  const assignOrgMutation = useMutation({
    mutationFn: async ({ userId, orgId }: { userId: string; orgId: string }) => {
      return apiRequest("POST", `/api/organizations/${orgId}/members`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-org-map"] });
      toast({ title: "Organization Assigned", description: "User has been assigned to the organization" });
      setAssignOrgDialogOpen(false);
      setUserToAssignOrg(null);
      setSelectedOrgForAssign("");
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message || "Failed to assign organization", variant: "destructive" });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleCreateUser = () => {
    createUserMutation.mutate(newUser);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const openEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    setEditOrgData({ name: org.name, description: org.description || "" });
    setEditOrgDialogOpen(true);
  };

  const openViewMembers = (org: Organization) => {
    setSelectedOrg(org);
    setViewOrgMembersOpen(true);
  };

  const openAssignOrg = (user: User) => {
    setUserToAssignOrg(user);
    setSelectedOrgForAssign("");
    setAssignOrgDialogOpen(true);
  };

  const availableUsersForOrg = users?.filter(u => {
    if (!selectedOrg) return true;
    const memberIds = orgMembers?.map(m => m.userId) || [];
    return !memberIds.includes(u.id);
  }) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" data-testid="heading-user-management">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage users, roles, and organizations
          </p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList data-testid="tabs-user-management">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="organizations" data-testid="tab-organizations">
            <Building2 className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    Assign roles and manage user accounts
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setAddUserDialogOpen(true)}
                  data-testid="button-add-user"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Change Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.userType === "corporate" ? "default" : "outline"} className="text-xs">
                            {user.userType === "corporate" ? "Corporate" : "Individual"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger
                              className="w-48"
                              data-testid={`select-role-${user.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                              <SelectItem value="attorney">Attorney</SelectItem>
                              <SelectItem value="auditor">Auditor</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                              <SelectItem value="external_counsel">External Counsel</SelectItem>
                              <SelectItem value="cro">CRO</SelectItem>
                              <SelectItem value="risk_manager">Risk Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user.userType === "corporate" && userOrgMap?.[user.id] ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {userOrgMap[user.id].orgName}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAssignOrg(user)}
                                data-testid={`button-reassign-org-${user.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAssignOrg(user)}
                              data-testid={`button-assign-org-${user.id}`}
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              Assign
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(user)}
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Organizations</CardTitle>
                  <CardDescription>
                    Manage firms, companies, and their members
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setAddOrgDialogOpen(true)}
                  data-testid="button-add-org"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : orgs && orgs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.map((org) => (
                      <TableRow key={org.id} data-testid={`org-row-${org.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {org.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {org.description || "No description"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewMembers(org)}
                              data-testid={`button-view-members-${org.id}`}
                            >
                              <Users className="h-3 w-3 mr-1" />
                              Members
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditOrg(org)}
                              data-testid={`button-edit-org-${org.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOrg(org);
                                setDeleteOrgDialogOpen(true);
                              }}
                              data-testid={`button-delete-org-${org.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No organizations yet</p>
                  <p className="text-sm mt-1">Create an organization to group users together</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent data-testid="dialog-add-user" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with specified role and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User Type</Label>
              <Select
                value={newUser.userType}
                onValueChange={(value: "individual" | "corporate") =>
                  setNewUser({ ...newUser, userType: value, organizationId: value === "individual" ? "" : newUser.organizationId })
                }
              >
                <SelectTrigger data-testid="select-user-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.userType === "corporate" && (
              <div className="space-y-2">
                <Label>Organization</Label>
                {inlineOrgCreating ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New organization name"
                      value={inlineOrgName}
                      onChange={(e) => setInlineOrgName(e.target.value)}
                      data-testid="input-inline-org-name"
                    />
                    <Button
                      size="sm"
                      disabled={!inlineOrgName.trim() || createOrgMutation.isPending}
                      onClick={async () => {
                        try {
                          const res = await apiRequest("POST", "/api/organizations", { name: inlineOrgName.trim(), description: "" });
                          const created = await res.json();
                          queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
                          setNewUser({ ...newUser, organizationId: created.id });
                          setInlineOrgCreating(false);
                          setInlineOrgName("");
                          toast({ title: "Organization Created", description: `Created "${created.name}"` });
                        } catch (err: any) {
                          toast({ title: "Failed", description: err.message || "Failed to create organization", variant: "destructive" });
                        }
                      }}
                      data-testid="button-inline-create-org"
                    >
                      {createOrgMutation.isPending ? "..." : "Create"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setInlineOrgCreating(false); setInlineOrgName(""); }}
                      data-testid="button-cancel-inline-org"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={newUser.organizationId}
                      onValueChange={(value) => setNewUser({ ...newUser, organizationId: value })}
                    >
                      <SelectTrigger data-testid="select-organization" className="flex-1">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {orgs?.map((org) => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInlineOrgCreating(true)}
                      data-testid="button-new-org-inline"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                data-testid="input-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Initial Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                data-testid="input-password"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger id="role" data-testid="select-new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                  <SelectItem value="attorney">Attorney</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="external_counsel">External Counsel</SelectItem>
                  <SelectItem value="cro">CRO</SelectItem>
                  <SelectItem value="risk_manager">Risk Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddUserDialogOpen(false)}
              data-testid="button-cancel-add-user"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              data-testid="button-confirm-add-user"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.firstName} {userToDelete?.lastName}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-user">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Organization Dialog */}
      <Dialog open={addOrgDialogOpen} onOpenChange={setAddOrgDialogOpen}>
        <DialogContent data-testid="dialog-add-org">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to group users together
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                placeholder="e.g., QVF Law"
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                data-testid="input-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-desc">Description</Label>
              <Input
                id="org-desc"
                placeholder="Optional description"
                value={newOrg.description}
                onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                data-testid="input-org-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOrgDialogOpen(false)} data-testid="button-cancel-add-org">
              Cancel
            </Button>
            <Button
              onClick={() => createOrgMutation.mutate(newOrg)}
              disabled={createOrgMutation.isPending}
              data-testid="button-confirm-add-org"
            >
              {createOrgMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={editOrgDialogOpen} onOpenChange={setEditOrgDialogOpen}>
        <DialogContent data-testid="dialog-edit-org">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org-name">Name</Label>
              <Input
                id="edit-org-name"
                value={editOrgData.name}
                onChange={(e) => setEditOrgData({ ...editOrgData, name: e.target.value })}
                data-testid="input-edit-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-desc">Description</Label>
              <Input
                id="edit-org-desc"
                value={editOrgData.description}
                onChange={(e) => setEditOrgData({ ...editOrgData, description: e.target.value })}
                data-testid="input-edit-org-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrgDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedOrg && updateOrgMutation.mutate({ id: selectedOrg.id, data: editOrgData })}
              disabled={updateOrgMutation.isPending}
              data-testid="button-confirm-edit-org"
            >
              {updateOrgMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Confirmation */}
      <AlertDialog open={deleteOrgDialogOpen} onOpenChange={setDeleteOrgDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-org">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedOrg?.name}"? All members will be converted to individual users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedOrg && deleteOrgMutation.mutate(selectedOrg.id)}
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              data-testid="button-confirm-delete-org"
            >
              {deleteOrgMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Organization Members Dialog */}
      <Dialog open={viewOrgMembersOpen} onOpenChange={setViewOrgMembersOpen}>
        <DialogContent data-testid="dialog-org-members" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedOrg?.name} - Members</DialogTitle>
            <DialogDescription>
              Manage members of this organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              size="sm"
              onClick={() => setAddMemberDialogOpen(true)}
              data-testid="button-add-member"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
            {orgMembers && orgMembers.length > 0 ? (
              <div className="space-y-2">
                {orgMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-2 p-3 rounded-md border">
                    <div>
                      <p className="text-sm font-medium" data-testid={`text-member-name-${member.userId}`}>
                        {member.user?.firstName} {member.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.user && <RoleBadge role={member.user.role} />}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => selectedOrg && removeMemberMutation.mutate({ orgId: selectedOrg.id, userId: member.userId })}
                        data-testid={`button-remove-member-${member.userId}`}
                      >
                        <UserMinus className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No members in this organization</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member to Organization Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent data-testid="dialog-add-member">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a user to {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedMemberUserId} onValueChange={setSelectedMemberUserId}>
                <SelectTrigger data-testid="select-member-user">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsersForOrg.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedOrg && selectedMemberUserId && addMemberMutation.mutate({ orgId: selectedOrg.id, userId: selectedMemberUserId })}
              disabled={addMemberMutation.isPending || !selectedMemberUserId}
              data-testid="button-confirm-add-member"
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Organization Dialog */}
      <Dialog open={assignOrgDialogOpen} onOpenChange={setAssignOrgDialogOpen}>
        <DialogContent data-testid="dialog-assign-org">
          <DialogHeader>
            <DialogTitle>Assign Organization</DialogTitle>
            <DialogDescription>
              Assign {userToAssignOrg?.firstName} {userToAssignOrg?.lastName} to an organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={selectedOrgForAssign} onValueChange={setSelectedOrgForAssign}>
                <SelectTrigger data-testid="select-assign-org">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOrgDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => userToAssignOrg && selectedOrgForAssign && assignOrgMutation.mutate({ userId: userToAssignOrg.id, orgId: selectedOrgForAssign })}
              disabled={assignOrgMutation.isPending || !selectedOrgForAssign}
              data-testid="button-confirm-assign-org"
            >
              {assignOrgMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
