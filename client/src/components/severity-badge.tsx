import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, AlertCircle, Zap } from "lucide-react";

interface SeverityBadgeProps {
  severity: "critical" | "high" | "medium" | "low" | "informational";
  showIcon?: boolean;
}

export function SeverityBadge({ severity, showIcon = true }: SeverityBadgeProps) {
  const config = {
    critical: {
      label: "CRITICAL",
      className: "bg-destructive text-destructive-foreground border-destructive",
      icon: Zap,
    },
    high: {
      label: "HIGH",
      className: "bg-orange-600 text-white border-orange-600 dark:bg-orange-500",
      icon: AlertTriangle,
    },
    medium: {
      label: "MEDIUM",
      className: "bg-yellow-600 text-white border-yellow-600 dark:bg-yellow-500",
      icon: AlertCircle,
    },
    low: {
      label: "LOW",
      className: "bg-blue-600 text-white border-blue-600 dark:bg-blue-500",
      icon: Info,
    },
    informational: {
      label: "INFO",
      className: "bg-muted text-muted-foreground border-muted",
      icon: Info,
    },
  };

  const { label, className, icon: Icon } = config[severity];

  return (
    <Badge
      variant="outline"
      className={`${className} font-semibold text-xs tracking-wide px-2 py-0.5`}
      data-testid={`badge-severity-${severity}`}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}
