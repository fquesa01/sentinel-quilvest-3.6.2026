import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; className: string }> = {
    alert: {
      label: "Alert",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    investigation: {
      label: "Investigation",
      className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    },
    review: {
      label: "Review",
      className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
    },
    resolution: {
      label: "Resolution",
      className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
    },
    closed: {
      label: "Closed",
      className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    },
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    },
    dismissed: {
      label: "Dismissed",
      className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
    },
    scheduled: {
      label: "Scheduled",
      className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  const { label, className } = config[status] || config.pending;

  return (
    <Badge
      variant="outline"
      className={`${className} font-medium text-xs`}
      data-testid={`badge-status-${status}`}
    >
      {label}
    </Badge>
  );
}
