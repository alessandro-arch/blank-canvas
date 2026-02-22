import { Calendar, Sun, Moon, CloudSun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Bom dia", icon: Sun };
  if (hour < 18) return { text: "Boa tarde", icon: CloudSun };
  return { text: "Boa noite", icon: Moon };
}

function formatDate() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

interface DaySummary {
  pendingReports: number;
  paymentsToRelease: number;
  newScholars: number;
}

export function ManagerGreeting() {
  const { user } = useAuth();
  const [managerName, setManagerName] = useState("Gestor");
  const [summary, setSummary] = useState<DaySummary>({
    pendingReports: 0,
    paymentsToRelease: 0,
    newScholars: 0,
  });
  
  const greeting = getGreeting();
  const Icon = greeting.icon;

  useEffect(() => {
    async function fetchManagerData() {
      if (!user) return;
      
      // Fetch manager profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      
      const name = profile?.full_name || user.user_metadata?.full_name;
      if (name) {
        setManagerName(name.split(" ")[0]);
      }
      
      // Fetch summary stats
      const { count: pendingCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "under_review");
      
      const { count: approvedCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      setSummary({
        pendingReports: pendingCount ?? 0,
        paymentsToRelease: approvedCount ?? 0,
        newScholars: 0,
      });
    }
    
    fetchManagerData();
  }, [user]);

  return (
    <div className="card-institutional mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {greeting.text}, {managerName}!
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{formatDate()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 md:gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">{summary.pendingReports}</p>
            <p className="text-xs text-muted-foreground">Relatórios pendentes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{summary.paymentsToRelease}</p>
            <p className="text-xs text-muted-foreground">Pagamentos liberáveis</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-info">{summary.newScholars}</p>
            <p className="text-xs text-muted-foreground">Novos bolsistas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
