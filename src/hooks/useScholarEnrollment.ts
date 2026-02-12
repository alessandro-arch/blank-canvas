import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

interface EnrollmentWithProject extends Enrollment {
  project?: Project | null;
}

interface UseScholarEnrollmentReturn {
  enrollment: EnrollmentWithProject | null;
  loading: boolean;
  hasActiveEnrollment: boolean;
  error: string | null;
}

export function useScholarEnrollment(): UseScholarEnrollmentReturn {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<EnrollmentWithProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEnrollment() {
      if (!user) {
        setEnrollment(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch the scholar's active enrollment with project data
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("enrollments")
          .select(`
            *,
            project:projects(*)
          `)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (enrollmentError) {
          console.error("Error fetching enrollment:", enrollmentError);
          setError(enrollmentError.message);
          setEnrollment(null);
        } else {
          setEnrollment(enrollmentData);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching enrollment:", err);
        setError("Erro ao carregar dados do vínculo");
        setEnrollment(null);
      } finally {
        setLoading(false);
      }
    }

    fetchEnrollment();
  }, [user]);

  const hasActiveEnrollment = enrollment !== null;

  return {
    enrollment,
    loading,
    hasActiveEnrollment,
    error,
  };
}
