import type { Database } from '@/integrations/supabase/types';

export type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];

export interface ThematicProjectWithScholars {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  scholars_count: number;
  active_scholars_count: number;
  pending_reports_count: number;
  pending_payments_count: number;
}

export interface ScholarWithProject {
  userId: string;
  fullName: string | null;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  isActive: boolean;
  projectId: string | null;
  projectTitle: string | null;
  projectCode: string | null;
  thematicProjectId: string | null;
  thematicProjectTitle: string | null;
  modality: string | null;
  enrollmentStatus: EnrollmentStatus | null;
  enrollmentId: string | null;
  pendingReports: number;
  pendingPayments: number;
  paidInstallments: number;
  totalInstallments: number;
  origin: string | null;
  createdAt: string;
}
