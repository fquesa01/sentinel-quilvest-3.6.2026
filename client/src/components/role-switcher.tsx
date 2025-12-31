import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";

const ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-500" },
  { value: "compliance_officer", label: "Compliance Officer", color: "bg-blue-500" },
  { value: "attorney", label: "Attorney", color: "bg-purple-500" },
  { value: "external_counsel", label: "External Counsel", color: "bg-indigo-500" },
  { value: "auditor", label: "Auditor", color: "bg-green-500" },
  { value: "employee", label: "Employee", color: "bg-gray-500" },
  { value: "vendor", label: "Vendor", color: "bg-orange-500" },
];

export function RoleSwitcher() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const switchRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      const response = await apiRequest("POST", "/api/admin/switch-role", { role: newRole });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role Switched",
        description: "Your role has been updated. The page will refresh automatically.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to switch role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Show role switcher for designated testing admin users
  // This allows them to switch between roles for testing without losing access
  const testingAdminEmails = [
    "frank.quesada@gmail.com",
    "binhaks@binhaklaw.com",
    "zoinertejada@gmail.com",
    "charliewhorton@gmail.com",
    "rjb@borgheselaw.com",
  ];
  const isTestingAdmin = user?.email && testingAdminEmails.includes(user.email);
  
  if (!user || !isTestingAdmin) {
    return null;
  }

  const currentRole = ROLES.find(r => r.value === user.role) || ROLES[0];

  return (
    <div className="flex items-center gap-2">
      <Shield className="h-4 w-4 text-muted-foreground" data-testid="icon-role-switcher" />
      <Select
        value={user.role}
        onValueChange={(value) => switchRoleMutation.mutate(value)}
        onOpenChange={setIsOpen}
        disabled={switchRoleMutation.isPending}
      >
        <SelectTrigger 
          className="w-[180px] h-8" 
          data-testid="select-role-switcher"
        >
          {switchRoleMutation.isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-sm">Switching...</span>
            </div>
          ) : (
            <SelectValue>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${currentRole.color}`} />
                <span className="text-sm">{currentRole.label}</span>
              </div>
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem 
              key={role.value} 
              value={role.value}
              data-testid={`role-option-${role.value}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${role.color}`} />
                <span>{role.label}</span>
                {user.role === role.value && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Current
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
