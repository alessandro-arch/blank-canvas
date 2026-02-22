import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UseUserRoleReturn {
  role: AppRole | null;
  loading: boolean;
  isManager: boolean;
  isAdmin: boolean;
  isScholar: boolean;
  isAuditor: boolean;
  hasManagerAccess: boolean;
  hasAuditorAccess: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserRole() {
      if (!user) {
        if (isMounted) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      // CRITICAL: Set loading true when user changes to prevent race conditions
      if (isMounted) setLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (!isMounted) return;

        if (error || !data || data.length === 0) {
          console.error("Error fetching user role:", error);
          // Default to scholar if no role found
          setRole("scholar");
        } else {
          // Prioritize highest role: admin > manager > auditor > scholar
          const roles = data.map((r) => r.role);
          if (roles.includes("admin")) {
            setRole("admin");
          } else if (roles.includes("manager")) {
            setRole("manager");
          } else if (roles.includes("auditor")) {
            setRole("auditor");
          } else {
            setRole("scholar");
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        if (isMounted) setRole("scholar");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchUserRole();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isScholar = role === "scholar";
  const isAuditor = role === "auditor";
  const hasManagerAccess = isAdmin || isManager;
  const hasAuditorAccess = isAuditor;

  return {
    role,
    loading,
    isManager,
    isAdmin,
    isScholar,
    isAuditor,
    hasManagerAccess,
    hasAuditorAccess,
  };
}
