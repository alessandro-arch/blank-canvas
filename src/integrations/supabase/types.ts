export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          organization_id: string | null
          previous_value: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          organization_id?: string | null
          previous_value?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          organization_id?: string | null
          previous_value?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string
          account_type: string | null
          agency: string
          bank_code: string
          bank_name: string
          created_at: string
          id: string
          locked_for_edit: boolean
          notes_gestor: string | null
          pix_key_encrypted: string | null
          pix_key_masked: string | null
          pix_key_type: string | null
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validation_status: Database["public"]["Enums"]["bank_validation_status"]
        }
        Insert: {
          account_number: string
          account_type?: string | null
          agency: string
          bank_code: string
          bank_name: string
          created_at?: string
          id?: string
          locked_for_edit?: boolean
          notes_gestor?: string | null
          pix_key_encrypted?: string | null
          pix_key_masked?: string | null
          pix_key_type?: string | null
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["bank_validation_status"]
        }
        Update: {
          account_number?: string
          account_type?: string | null
          agency?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          id?: string
          locked_for_edit?: boolean
          notes_gestor?: string | null
          pix_key_encrypted?: string | null
          pix_key_masked?: string | null
          pix_key_type?: string | null
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["bank_validation_status"]
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          created_at: string
          end_date: string
          grant_value: number
          id: string
          modality: Database["public"]["Enums"]["grant_modality"]
          observations: string | null
          project_id: string
          start_date: string
          status: Database["public"]["Enums"]["enrollment_status"]
          total_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          grant_value: number
          id?: string
          modality: Database["public"]["Enums"]["grant_modality"]
          observations?: string | null
          project_id: string
          start_date: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          total_installments: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          grant_value?: number
          id?: string
          modality?: Database["public"]["Enums"]["grant_modality"]
          observations?: string | null
          project_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          total_installments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_terms: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          signed_at: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          signed_at: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          signed_at?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      institutional_documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          title: string
          type: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          title: string
          type: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          title?: string
          type?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      invite_code_uses: {
        Row: {
          id: string
          invite_code_id: string
          used_at: string
          used_by: string
          used_by_email: string
        }
        Insert: {
          id?: string
          invite_code_id: string
          used_at?: string
          used_by: string
          used_by_email: string
        }
        Update: {
          id?: string
          invite_code_id?: string
          used_at?: string
          used_by?: string
          used_by_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_code_uses_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          organization_id: string | null
          partner_company_id: string
          status: string
          thematic_project_id: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          organization_id?: string | null
          partner_company_id: string
          status?: string
          thematic_project_id: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          organization_id?: string | null
          partner_company_id?: string
          status?: string
          thematic_project_id?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string
          html_template: string | null
          id: string
          is_default: boolean
          name: string
          organization_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by: string
          html_template?: string | null
          id?: string
          is_default?: boolean
          name: string
          organization_id?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string
          html_template?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          campaign_code: string | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          email_error: string | null
          email_status: string | null
          event_type: string | null
          id: string
          link_url: string | null
          organization_id: string | null
          provider: string | null
          provider_message_id: string | null
          read: boolean
          read_at: string | null
          recipient_id: string
          sender_id: string | null
          sent_at: string | null
          subject: string
          type: string
          updated_at: string | null
        }
        Insert: {
          body: string
          campaign_code?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          email_error?: string | null
          email_status?: string | null
          event_type?: string | null
          id?: string
          link_url?: string | null
          organization_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          read?: boolean
          read_at?: string | null
          recipient_id: string
          sender_id?: string | null
          sent_at?: string | null
          subject: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          campaign_code?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          email_error?: string | null
          email_status?: string | null
          event_type?: string | null
          id?: string
          link_url?: string | null
          organization_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          read?: boolean
          read_at?: string | null
          recipient_id?: string
          sender_id?: string | null
          sent_at?: string | null
          subject?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email_provider_id: string | null
          email_sent_at: string | null
          expires_at: string
          id: string
          invited_email: string
          organization_id: string
          role: string
          send_error: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email_provider_id?: string | null
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          invited_email: string
          organization_id: string
          role: string
          send_error?: string | null
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email_provider_id?: string | null
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          invited_email?: string
          organization_id?: string
          role?: string
          send_error?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          email_notifications_enabled: boolean
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          enrollment_id: string
          id: string
          installment_number: number
          paid_at: string | null
          receipt_url: string | null
          reference_month: string
          report_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          enrollment_id: string
          id?: string
          installment_number: number
          paid_at?: string | null
          receipt_url?: string | null
          reference_month: string
          report_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          enrollment_id?: string
          id?: string
          installment_number?: number
          paid_at?: string | null
          receipt_url?: string | null
          reference_month?: string
          report_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_level: string | null
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          institution: string | null
          invite_code_used: string | null
          invite_used_at: string | null
          is_active: boolean
          lattes_url: string | null
          onboarding_status: string
          organization_id: string | null
          origin: string | null
          partner_company_id: string | null
          phone: string | null
          thematic_project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_level?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          institution?: string | null
          invite_code_used?: string | null
          invite_used_at?: string | null
          is_active?: boolean
          lattes_url?: string | null
          onboarding_status?: string
          organization_id?: string | null
          origin?: string | null
          partner_company_id?: string | null
          phone?: string | null
          thematic_project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_level?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          institution?: string | null
          invite_code_used?: string | null
          invite_used_at?: string | null
          is_active?: boolean
          lattes_url?: string | null
          onboarding_status?: string
          organization_id?: string | null
          origin?: string | null
          partner_company_id?: string | null
          phone?: string | null
          thematic_project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_sensitive: {
        Row: {
          cpf: string | null
          created_at: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          code: string
          coordenador_tecnico_icca: string | null
          created_at: string
          end_date: string
          id: string
          modalidade_bolsa: string | null
          observacoes: string | null
          orientador: string
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          thematic_project_id: string
          title: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          code: string
          coordenador_tecnico_icca?: string | null
          created_at?: string
          end_date: string
          id?: string
          modalidade_bolsa?: string | null
          observacoes?: string | null
          orientador: string
          start_date: string
          status?: Database["public"]["Enums"]["project_status"]
          thematic_project_id: string
          title: string
          updated_at?: string
          valor_mensal: number
        }
        Update: {
          code?: string
          coordenador_tecnico_icca?: string | null
          created_at?: string
          end_date?: string
          id?: string
          modalidade_bolsa?: string | null
          observacoes?: string | null
          orientador?: string
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          thematic_project_id?: string
          title?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_thematic_project_id_fkey"
            columns: ["thematic_project_id"]
            isOneToOne: false
            referencedRelation: "thematic_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          feedback: string | null
          file_name: string
          file_url: string
          id: string
          installment_number: number
          observations: string | null
          reference_month: string
          resubmission_deadline: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          file_name: string
          file_url: string
          id?: string
          installment_number: number
          observations?: string | null
          reference_month: string
          resubmission_deadline?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          file_name?: string
          file_url?: string
          id?: string
          installment_number?: number
          observations?: string | null
          reference_month?: string
          resubmission_deadline?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thematic_projects: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          observations: string | null
          organization_id: string | null
          sponsor_name: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          observations?: string | null
          organization_id?: string | null
          sponsor_name: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          observations?: string | null
          organization_id?: string | null
          sponsor_name?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thematic_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_org_invite: { Args: { p_token: string }; Returns: Json }
      create_org_invite: {
        Args: {
          p_email: string
          p_expires_days?: number
          p_organization_id: string
          p_role: string
        }
        Returns: Json
      }
      get_invite_details: { Args: { p_token: string }; Returns: Json }
      get_user_organizations: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
          p_new_value?: Json
          p_previous_value?: Json
          p_user_agent?: string
        }
        Returns: string
      }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_admin_or_manager: { Args: { p_org_id: string }; Returns: boolean }
      user_can_access_profile_by_org: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      user_has_org_access: { Args: { p_org_id: string }; Returns: boolean }
      user_org_role: { Args: { p_org_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "scholar"
      bank_validation_status:
        | "pending"
        | "under_review"
        | "validated"
        | "returned"
      enrollment_status: "active" | "suspended" | "completed" | "cancelled"
      grant_modality:
        | "ict"
        | "ext"
        | "ens"
        | "ino"
        | "dct_a"
        | "dct_b"
        | "dct_c"
        | "postdoc"
        | "senior"
        | "prod"
        | "visitor"
      payment_status: "pending" | "eligible" | "paid" | "cancelled"
      project_status: "active" | "inactive" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "scholar"],
      bank_validation_status: [
        "pending",
        "under_review",
        "validated",
        "returned",
      ],
      enrollment_status: ["active", "suspended", "completed", "cancelled"],
      grant_modality: [
        "ict",
        "ext",
        "ens",
        "ino",
        "dct_a",
        "dct_b",
        "dct_c",
        "postdoc",
        "senior",
        "prod",
        "visitor",
      ],
      payment_status: ["pending", "eligible", "paid", "cancelled"],
      project_status: ["active", "inactive", "archived"],
    },
  },
} as const
