import type { Database } from '@/integrations/supabase/types';

export type ProjectStatus = Database['public']['Enums']['project_status'];

export interface ThematicProjectWithStats {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  subprojects_count: number;
  assigned_scholars_count: number;
  total_monthly_value: number;
}

export interface SubprojectWithScholar {
  id: string;
  code: string;
  title: string;
  orientador: string;
  thematic_project_id: string;
  modalidade_bolsa: string | null;
  valor_mensal: number;
  start_date: string;
  end_date: string;
  coordenador_tecnico_icca: string | null;
  observacoes?: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  // Scholar info
  scholar_name: string | null;
  scholar_email: string | null;
  enrollment_id: string | null;
  enrollment_status: string | null;
  user_id: string | null;
  // Monthly stats
  report_status: string | null;
  payment_status: string | null;
  pending_reports: number;
  blocked_payments: number;
  released_amount: number;
}

export interface Project {
  id: string;
  code: string;
  title: string;
  orientador: string;
  thematic_project_id: string;
  modalidade_bolsa: string | null;
  valor_mensal: number;
  start_date: string;
  end_date: string;
  coordenador_tecnico_icca: string | null;
  observacoes?: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}
