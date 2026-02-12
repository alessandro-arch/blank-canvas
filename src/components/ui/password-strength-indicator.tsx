import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface StrengthCriteria {
  label: string;
  met: boolean;
}

function evaluatePasswordStrength(password: string): {
  score: number;
  level: "weak" | "fair" | "good" | "strong";
  criteria: StrengthCriteria[];
} {
  const criteria: StrengthCriteria[] = [
    { label: "Mínimo 10 caracteres", met: password.length >= 10 },
    { label: "Letra maiúscula", met: /[A-Z]/.test(password) },
    { label: "Letra minúscula", met: /[a-z]/.test(password) },
    { label: "Número", met: /[0-9]/.test(password) },
    { label: "Caractere especial", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  
  let level: "weak" | "fair" | "good" | "strong";
  if (metCount <= 1) {
    level = "weak";
  } else if (metCount <= 2) {
    level = "fair";
  } else if (metCount <= 3) {
    level = "good";
  } else {
    level = "strong";
  }

  return {
    score: metCount,
    level,
    criteria,
  };
}

const levelConfig = {
  weak: {
    label: "Fraca",
    color: "bg-destructive",
    textColor: "text-destructive",
    bars: 1,
  },
  fair: {
    label: "Razoável",
    color: "bg-warning",
    textColor: "text-warning",
    bars: 2,
  },
  good: {
    label: "Boa",
    color: "bg-success",
    textColor: "text-success",
    bars: 3,
  },
  strong: {
    label: "Forte",
    color: "bg-success",
    textColor: "text-success",
    bars: 4,
  },
};

export function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthIndicatorProps) {
  const { level, criteria } = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );

  const config = levelConfig[level];

  if (!password) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bars */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                bar <= config.bars ? config.color : "bg-muted"
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-medium", config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {criteria.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors duration-200",
              item.met ? "text-success" : "text-muted-foreground"
            )}
          >
            {item.met ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
