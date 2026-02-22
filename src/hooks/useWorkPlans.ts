import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WorkPlan {
  id: string;
  organization_id: string;
  project_id: string;
  scholar_user_id: string;
  uploaded_by: string;
  uploaded_at: string;
  status: "active" | "archived";
  file_name: string;
  file_size: number | null;
  pdf_path: string;
  checksum_sha256: string;
  extracted_json: Record<string, unknown> | null;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkPlans(scholarUserId?: string) {
  const { user } = useAuth();
  const userId = scholarUserId || user?.id;

  const { data: workPlans, isLoading, error, refetch } = useQuery({
    queryKey: ["work-plans", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("work_plans")
        .select("*")
        .eq("scholar_user_id", userId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WorkPlan[];
    },
    enabled: !!userId,
  });

  const getSignedUrl = async (workplanId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-workplan-signed-url", {
        body: { workplan_id: workplanId },
      });
      if (error) throw error;
      return data?.signedUrl || null;
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar URL de acesso");
      return null;
    }
  };

  return {
    workPlans: workPlans || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    getSignedUrl,
  };
}

export function useWorkPlanByProject(projectId?: string, scholarUserId?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["work-plan-project", projectId, scholarUserId],
    queryFn: async () => {
      if (!projectId) return null;
      let query = supabase
        .from("work_plans")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "active");
      if (scholarUserId) {
        query = query.eq("scholar_user_id", scholarUserId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as unknown as WorkPlan | null;
    },
    enabled: !!projectId,
  });

  return { activeWorkPlan: data, loading: isLoading, refetch };
}
