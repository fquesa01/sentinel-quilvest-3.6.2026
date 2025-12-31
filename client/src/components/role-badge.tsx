import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config: Record<string, { label: string; className: string }> = {
    admin: {
      label: "Admin",
      className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
    },
    compliance_officer: {
      label: "Compliance Officer",
      className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    },
    attorney: {
      label: "Attorney",
      className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    },
    auditor: {
      label: "Auditor",
      className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
    },
  };

  const { label, className } = config[role] || config.compliance_officer;

  return (
    <Badge
      variant="outline"
      className={`${className} font-medium text-xs`}
      data-testid={`badge-role-${role}`}
    >
      {label}
    </Badge>
  );
}
