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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleBadge } from "@/components/role-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Users, ShieldCheck, UserCog, User } from "lucide-react";
import { Redirect } from "wouter";

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  userType: string;
  createdAt: string;
  updatedAt: string;
}

const ROLES = [
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Full system access, can manage all users, roles, and settings",
    icon: ShieldCheck,
  },
  {
    key: "entity_admin",
    label: "Entity Admin",
    description: "Manages users and settings within their organization",
    icon: Shield,
  },
  {
    key: "entity_user",
    label: "Entity User",
    description: "Standard access within their organization",
    icon: UserCog,
  },
  {
    key: "individual_user",
    label: "Individual User",
    description: "Basic individual account access",
    icon: User,
  },
] as const;

export default function RoleManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("super_admin");

  const isSuperAdmin = currentUser?.role === "super_admin";

  const { data: users, isLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/users"],
    enabled: isSuperAdmin,
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

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  if (currentUser && !isSuperAdmin) {
    return <Redirect to="/dashboard" />;
  }

  const getUserCountByRole = (role: string) => {
    if (!users) return 0;
    return users.filter((u) => u.role === role).length;
  };

  const getUsersByRole = (role: string) => {
    if (!users) return [];
    return users.filter((u) => u.role === role);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" data-testid="heading-role-management">
            Role Management
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage system roles and their assigned users
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.map((role) => {
          const count = getUserCountByRole(role.key);
          const RoleIcon = role.icon;
          return (
            <Card
              key={role.key}
              className={`cursor-pointer transition-colors ${activeTab === role.key ? "border-primary" : ""}`}
              onClick={() => setActiveTab(role.key)}
              data-testid={`card-role-summary-${role.key}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RoleIcon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{role.label}</CardTitle>
                  </div>
                  <Badge variant="secondary" data-testid={`badge-count-${role.key}`}>
                    {isLoading ? "..." : count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-role-management">
          {ROLES.map((role) => (
            <TabsTrigger key={role.key} value={role.key} data-testid={`tab-role-${role.key}`}>
              <role.icon className="h-4 w-4 mr-2" />
              {role.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ROLES.map((role) => (
          <TabsContent key={role.key} value={role.key} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {role.label} Users
                    </CardTitle>
                    <CardDescription>
                      {getUserCountByRole(role.key)} user{getUserCountByRole(role.key) !== 1 ? "s" : ""} assigned to this role
                    </CardDescription>
                  </div>
                  <RoleBadge role={role.key} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : getUsersByRole(role.key).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid={`empty-role-${role.key}`}>
                    No users assigned to this role
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
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getUsersByRole(role.key).map((user) => (
                        <TableRow key={user.id} data-testid={`role-user-row-${user.id}`}>
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
                                data-testid={`select-role-change-${user.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="entity_admin">Entity Admin</SelectItem>
                                <SelectItem value="entity_user">Entity User</SelectItem>
                                <SelectItem value="individual_user">Individual User</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}