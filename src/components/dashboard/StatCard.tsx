import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: "primary" | "success" | "warning" | "info";
}

const iconColorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral",
  icon: Icon,
  iconColor = "primary"
}: StatCardProps) {
  return (
    <div className="card-stat">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-[11px] font-medium text-muted-foreground mt-1">{title}</p>
          {change && (
            <p className={cn(
              "text-[10px] font-medium mt-0.5",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn(
          "w-7 h-7 rounded flex items-center justify-center shrink-0",
          iconColorClasses[iconColor]
        )}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
