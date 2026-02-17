import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";

const logger = createLogger("useScholarPayments");

type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Report = Database["public"]["Tables"]["reports"]["Row"] & {
  resubmission_deadline?: string | null;
  reviewed_by?: string | null;
};
type Project = Database["public"]["Tables"]["projects"]["Row"];
type ThematicProject = Database["public"]["Tables"]["thematic_projects"]["Row"];

export interface ProjectWithThematic extends Project {
  thematic_project: ThematicProject | null;
}

export interface EnrollmentWithProject extends Enrollment {
  project: ProjectWithThematic | null;
}

export interface ReportVersionInfo {
  id: string;
  version: number;
  submittedAt: string;
  status: "approved" | "rejected" | "under_review";
  feedback?: string;
  fileUrl?: string;
}

export interface PaymentWithReport extends Payment {
  report?: Report | null;
  reportVersions?: ReportVersionInfo[];
}

export interface ScholarPaymentsData {
  enrollment: EnrollmentWithProject | null;
  payments: PaymentWithReport[];
  reports: Report[];
  stats: {
    totalForecast: number;
    totalReceived: number;
    totalInstallments: number;
    paidInstallments: number;
    reportsSent: number;
    pendingReports: number;
  };
}

interface UseScholarPaymentsReturn {
  data: ScholarPaymentsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useScholarPayments(): UseScholarPaymentsReturn {
  const { user } = useAuth();
  const [data, setData] = useState<ScholarPaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    const ctx = logger.createContext("fetchData", user.id);

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch active enrollment with project data
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollments")
        .select(`
          *,
          project:projects(*,
            thematic_project:thematic_projects(*)
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (enrollmentError) {
        logger.error("Error fetching enrollment", ctx, enrollmentError);
        setError("Erro ao carregar dados do vínculo");
        setLoading(false);
        return;
      }

      // If no active enrollment, return empty state
      if (!enrollmentData) {
        setData({
          enrollment: null,
          payments: [],
          reports: [],
          stats: {
            totalForecast: 0,
            totalReceived: 0,
            totalInstallments: 0,
            paidInstallments: 0,
            reportsSent: 0,
            pendingReports: 0,
          },
        });
        setLoading(false);
        return;
      }

      // 2. Fetch payments for this enrollment
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("enrollment_id", enrollmentData.id)
        .order("installment_number", { ascending: true });

      if (paymentsError) {
        logger.error("Error fetching payments", ctx, paymentsError);
      }

      // 3. Fetch reports for this user (ordered by created_at desc to get latest first)
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("reference_month", { ascending: true })
        .order("created_at", { ascending: false });

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
      }

      const payments = paymentsData || [];
      const reports = reportsData || [];

      // Group reports by reference_month to get all versions
      const reportsByMonth = reports.reduce((acc, report) => {
        if (!acc[report.reference_month]) {
          acc[report.reference_month] = [];
        }
        acc[report.reference_month].push(report);
        return acc;
      }, {} as Record<string, Report[]>);

      // Map reports to payments by reference_month (using the latest report per month)
      const paymentsWithReports: PaymentWithReport[] = payments.map(payment => {
        const monthReports = reportsByMonth[payment.reference_month] || [];
        // The first report is the most recent (due to ordering)
        const latestReport = monthReports.length > 0 ? monthReports[0] : null;
        
        // Build version info for all reports in this month
        const reportVersions: ReportVersionInfo[] = monthReports.map((r, index) => ({
          id: r.id,
          version: monthReports.length - index, // Latest is highest version
          submittedAt: new Date(r.submitted_at).toLocaleDateString("pt-BR"),
          status: r.status as "approved" | "rejected" | "under_review",
          feedback: r.feedback || undefined,
          fileUrl: r.file_url,
        }));
        
        return { ...payment, report: latestReport, reportVersions };
      });

      // Calculate stats
      const totalInstallments = enrollmentData.total_installments;
      const grantValue = Number(enrollmentData.grant_value);
      const totalForecast = grantValue * totalInstallments;
      
      const paidPayments = payments.filter(p => p.status === "paid");
      const totalReceived = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const paidInstallments = paidPayments.length;
      
      const reportsSent = reports.filter(r => 
        r.status === "under_review" || r.status === "approved" || r.status === "rejected"
      ).length;

      // Pending reports = months that passed without approved report
      const now = new Date();
      const startDate = new Date(enrollmentData.start_date);
      let monthsPassed = 0;
      
      // Calculate how many months have passed since start
      const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      
      if (currentDate >= startMonth) {
        monthsPassed = (currentDate.getFullYear() - startMonth.getFullYear()) * 12 + 
                       (currentDate.getMonth() - startMonth.getMonth()) + 1;
        // Cap at total installments
        monthsPassed = Math.min(monthsPassed, totalInstallments);
      }
      
      const approvedReports = reports.filter(r => r.status === "approved").length;
      const pendingReports = Math.max(0, monthsPassed - approvedReports);

      setData({
        enrollment: enrollmentData as EnrollmentWithProject,
        payments: paymentsWithReports,
        reports,
        stats: {
          totalForecast,
          totalReceived,
          totalInstallments,
          paidInstallments,
          reportsSent,
          pendingReports,
        },
      });
    } catch (err) {
      logger.error("Unexpected error fetching scholar payments", ctx, err);
      setError("Erro ao carregar dados de pagamentos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}
