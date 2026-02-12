import { cn } from "@/lib/utils";

export type StatusType = "active" | "pending" | "inactive" | "suspended";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: "Ativo", className: "status-active" },
  pending: { label: "Pendente", className: "status-pending" },
  inactive: { label: "Inativo", className: "status-inactive" },
  suspended: { label: "Suspenso", className: "status-suspended" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn("status-badge", config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || config.label}
    </span>
  );
}
