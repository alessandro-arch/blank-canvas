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
      bank_access_logs: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          target_user_id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          target_user_id: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          target_user_id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string
          account_number_enc: string | null
          account_type: string | null
          agency: string
          agency_enc: string | null
          bank_code: string
          bank_code_enc: string | null
          bank_name: string
          created_at: string
          has_bank_data: boolean
          id: string
          last4_account: string | null
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
          account_number_enc?: string | null
          account_type?: string | null
          agency: string
          agency_enc?: string | null
          bank_code: string
          bank_code_enc?: string | null
          bank_name: string
          created_at?: string
          has_bank_data?: boolean
          id?: string
          last4_account?: string | null
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
          account_number_enc?: string | null
          account_type?: string | null
          agency?: string
          agency_enc?: string | null
          bank_code?: string
          bank_code_enc?: string | null
          bank_name?: string
          created_at?: string
          has_bank_data?: boolean
          id?: string
          last4_account?: string | null
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
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string
          effective_cancel_date: string | null
          end_date: string
          grant_value: number
          id: string
          modality: Database["public"]["Enums"]["grant_modality"]
          observations: string | null
          project_id: string
          replaced_by_enrollment_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["enrollment_status"]
          total_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          effective_cancel_date?: string | null
          end_date: string
          grant_value: number
          id?: string
          modality: Database["public"]["Enums"]["grant_modality"]
          observations?: string | null
          project_id: string
          replaced_by_enrollment_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          total_installments: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          effective_cancel_date?: string | null
          end_date?: string
          grant_value?: number
          id?: string
          modality?: Database["public"]["Enums"]["grant_modality"]
          observations?: string | null
          project_id?: string
          replaced_by_enrollment_id?: string | null
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
          {
            foreignKeyName: "enrollments_replaced_by_enrollment_id_fkey"
            columns: ["replaced_by_enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
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
      help_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
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
      monthly_report_ai: {
        Row: {
          created_at: string
          id: string
          inconsistencies_text: string | null
          indicators: Json | null
          merit_opinion_draft: string | null
          model_version: string | null
          report_id: string
          risks_text: string | null
          summary_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inconsistencies_text?: string | null
          indicators?: Json | null
          merit_opinion_draft?: string | null
          model_version?: string | null
          report_id: string
          risks_text?: string | null
          summary_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inconsistencies_text?: string | null
          indicators?: Json | null
          merit_opinion_draft?: string | null
          model_version?: string | null
          report_id?: string
          risks_text?: string | null
          summary_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_report_ai_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_report_ai_outputs: {
        Row: {
          created_at: string | null
          generated_by: string | null
          id: string
          model: string | null
          organization_id: string
          payload: Json
          prompt_version: string | null
          report_id: string
        }
        Insert: {
          created_at?: string | null
          generated_by?: string | null
          id?: string
          model?: string | null
          organization_id: string
          payload: Json
          prompt_version?: string | null
          report_id: string
        }
        Update: {
          created_at?: string | null
          generated_by?: string | null
          id?: string
          model?: string | null
          organization_id?: string
          payload?: Json
          prompt_version?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_report_ai_outputs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_report_documents: {
        Row: {
          generated_at: string
          generated_by_user_id: string
          id: string
          metadata: Json
          report_id: string
          sha256: string | null
          storage_path: string
          type: string
        }
        Insert: {
          generated_at?: string
          generated_by_user_id: string
          id?: string
          metadata?: Json
          report_id: string
          sha256?: string | null
          storage_path: string
          type: string
        }
        Update: {
          generated_at?: string
          generated_by_user_id?: string
          id?: string
          metadata?: Json
          report_id?: string
          sha256?: string | null
          storage_path?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_report_documents_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_report_fields: {
        Row: {
          id: string
          payload: Json
          report_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          payload?: Json
          report_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          payload?: Json
          report_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_report_fields_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_report_versions: {
        Row: {
          change_summary: string | null
          changed_at: string
          changed_by_user_id: string
          id: string
          payload: Json
          report_id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          changed_at?: string
          changed_by_user_id: string
          id?: string
          payload?: Json
          report_id: string
          version?: number
        }
        Update: {
          change_summary?: string | null
          changed_at?: string
          changed_by_user_id?: string
          id?: string
          payload?: Json
          report_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          beneficiary_user_id: string
          created_at: string
          id: string
          locked_at: string | null
          organization_id: string
          pdf_sha256: string | null
          period_month: number
          period_year: number
          project_id: string
          return_reason: string | null
          returned_at: string | null
          returned_by_user_id: string | null
          status: string
          submitted_at: string | null
          submitted_ip: string | null
          submitted_user_agent: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          beneficiary_user_id: string
          created_at?: string
          id?: string
          locked_at?: string | null
          organization_id: string
          pdf_sha256?: string | null
          period_month: number
          period_year: number
          project_id: string
          return_reason?: string | null
          returned_at?: string | null
          returned_by_user_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_ip?: string | null
          submitted_user_agent?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          beneficiary_user_id?: string
          created_at?: string
          id?: string
          locked_at?: string | null
          organization_id?: string
          pdf_sha256?: string | null
          period_month?: number
          period_year?: number
          project_id?: string
          return_reason?: string | null
          returned_at?: string | null
          returned_by_user_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_ip?: string | null
          submitted_user_agent?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          organization_id: string | null
          published_at: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          organization_id?: string | null
          published_at?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          organization_id?: string | null
          published_at?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_organization_id_fkey"
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
          send_attempts: number
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
          send_attempts?: number
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
          send_attempts?: number
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
          default_admin_fee: number | null
          default_currency: string | null
          email_notifications_enabled: boolean
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          report_footer_text: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          updated_at: string
          watermark_text: string | null
          watermark_url: string | null
        }
        Insert: {
          created_at?: string
          default_admin_fee?: number | null
          default_currency?: string | null
          email_notifications_enabled?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          report_footer_text?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string
          watermark_text?: string | null
          watermark_url?: string | null
        }
        Update: {
          created_at?: string
          default_admin_fee?: number | null
          default_currency?: string | null
          email_notifications_enabled?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          report_footer_text?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string
          watermark_text?: string | null
          watermark_url?: string | null
        }
        Relationships: []
      }
      payment_status_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          enrollment_id: string
          gates: Json
          id: string
          new_status: string
          old_status: string
          origin: string
          payment_id: string
          period_key: string
          status_reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          enrollment_id: string
          gates?: Json
          id?: string
          new_status: string
          old_status: string
          origin: string
          payment_id: string
          period_key: string
          status_reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          enrollment_id?: string
          gates?: Json
          id?: string
          new_status?: string
          old_status?: string
          origin?: string
          payment_id?: string
          period_key?: string
          status_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
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
          status_gate_snapshot: Json | null
          status_reason: string | null
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
          status_gate_snapshot?: Json | null
          status_reason?: string | null
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
          status_gate_snapshot?: Json | null
          status_reason?: string | null
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
      pdf_logs: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string | null
          file_path: string
          file_size: number | null
          generation_time_ms: number | null
          id: string
          organization_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type?: string
          error_message?: string | null
          file_path: string
          file_size?: number | null
          generation_time_ms?: number | null
          id?: string
          organization_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          file_path?: string
          file_size?: number | null
          generation_time_ms?: number | null
          id?: string
          organization_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_level: string | null
          avatar_url: string | null
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
          thematic_project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_level?: string | null
          avatar_url?: string | null
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
          thematic_project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_level?: string | null
          avatar_url?: string | null
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
          cpf_enc: string | null
          created_at: string
          id: string
          phone: string | null
          phone_enc: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          cpf_enc?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          phone_enc?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          cpf_enc?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          phone_enc?: string | null
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
      report_access_logs: {
        Row: {
          accessed_at: string
          action: string
          id: string
          ip_address: string | null
          organization_id: string | null
          report_id: string
          role: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          report_id: string
          role: string
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          report_id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          feedback: string | null
          file_name: string
          file_url: string
          id: string
          installment_number: number
          monthly_report_id: string | null
          observations: string | null
          old_file_url: string | null
          reenvio_solicitado: boolean
          reenvio_solicitado_at: string | null
          reenvio_solicitado_by: string | null
          reference_month: string
          replace_reason: string | null
          replaced_at: string | null
          replaced_by: string | null
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
          monthly_report_id?: string | null
          observations?: string | null
          old_file_url?: string | null
          reenvio_solicitado?: boolean
          reenvio_solicitado_at?: string | null
          reenvio_solicitado_by?: string | null
          reference_month: string
          replace_reason?: string | null
          replaced_at?: string | null
          replaced_by?: string | null
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
          monthly_report_id?: string | null
          observations?: string | null
          old_file_url?: string | null
          reenvio_solicitado?: boolean
          reenvio_solicitado_at?: string | null
          reenvio_solicitado_by?: string | null
          reference_month?: string
          replace_reason?: string | null
          replaced_at?: string | null
          replaced_by?: string | null
          resubmission_deadline?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      thematic_projects: {
        Row: {
          atribuicao_justificativa: string | null
          atribuicao_modo: string
          contrato_projeto_nome: string | null
          contrato_projeto_uploaded_at: string | null
          contrato_projeto_url: string | null
          created_at: string
          end_date: string | null
          id: string
          impostos_percentual: number | null
          observations: string | null
          organization_id: string | null
          plano_trabalho_nome: string | null
          plano_trabalho_uploaded_at: string | null
          plano_trabalho_url: string | null
          sponsor_name: string
          start_date: string | null
          status: string
          taxa_administrativa_percentual: number | null
          title: string
          updated_at: string
          valor_total_atribuido_bolsas_manual: number | null
          valor_total_projeto: number | null
        }
        Insert: {
          atribuicao_justificativa?: string | null
          atribuicao_modo?: string
          contrato_projeto_nome?: string | null
          contrato_projeto_uploaded_at?: string | null
          contrato_projeto_url?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          impostos_percentual?: number | null
          observations?: string | null
          organization_id?: string | null
          plano_trabalho_nome?: string | null
          plano_trabalho_uploaded_at?: string | null
          plano_trabalho_url?: string | null
          sponsor_name: string
          start_date?: string | null
          status?: string
          taxa_administrativa_percentual?: number | null
          title: string
          updated_at?: string
          valor_total_atribuido_bolsas_manual?: number | null
          valor_total_projeto?: number | null
        }
        Update: {
          atribuicao_justificativa?: string | null
          atribuicao_modo?: string
          contrato_projeto_nome?: string | null
          contrato_projeto_uploaded_at?: string | null
          contrato_projeto_url?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          impostos_percentual?: number | null
          observations?: string | null
          organization_id?: string | null
          plano_trabalho_nome?: string | null
          plano_trabalho_uploaded_at?: string | null
          plano_trabalho_url?: string | null
          sponsor_name?: string
          start_date?: string | null
          status?: string
          taxa_administrativa_percentual?: number | null
          title?: string
          updated_at?: string
          valor_total_atribuido_bolsas_manual?: number | null
          valor_total_projeto?: number | null
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
      user_settings: {
        Row: {
          created_at: string
          density: string
          id: string
          sidebar_behavior: string
          theme_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          density?: string
          id?: string
          sidebar_behavior?: string
          theme_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          density?: string
          id?: string
          sidebar_behavior?: string
          theme_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_plans: {
        Row: {
          checksum_sha256: string
          created_at: string
          extracted_json: Json | null
          extracted_text: string | null
          file_name: string
          file_size: number | null
          id: string
          organization_id: string
          pdf_path: string
          project_id: string
          scholar_user_id: string
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          checksum_sha256: string
          created_at?: string
          extracted_json?: Json | null
          extracted_text?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          organization_id: string
          pdf_path: string
          project_id: string
          scholar_user_id: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          checksum_sha256?: string
          created_at?: string
          extracted_json?: Json | null
          extracted_text?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          organization_id?: string
          pdf_path?: string
          project_id?: string
          scholar_user_id?: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bank_accounts_public: {
        Row: {
          account_type: string | null
          bank_name: string | null
          created_at: string | null
          has_bank_data: boolean | null
          id: string | null
          last4_account: string | null
          locked_for_edit: boolean | null
          notes_gestor: string | null
          pix_key_masked: string | null
          pix_key_type: string | null
          updated_at: string | null
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
          validation_status:
            | Database["public"]["Enums"]["bank_validation_status"]
            | null
        }
        Insert: {
          account_type?: string | null
          bank_name?: string | null
          created_at?: string | null
          has_bank_data?: boolean | null
          id?: string | null
          last4_account?: string | null
          locked_for_edit?: boolean | null
          notes_gestor?: string | null
          pix_key_masked?: string | null
          pix_key_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?:
            | Database["public"]["Enums"]["bank_validation_status"]
            | null
        }
        Update: {
          account_type?: string | null
          bank_name?: string | null
          created_at?: string | null
          has_bank_data?: boolean | null
          id?: string | null
          last4_account?: string | null
          locked_for_edit?: boolean | null
          notes_gestor?: string | null
          pix_key_masked?: string | null
          pix_key_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?:
            | Database["public"]["Enums"]["bank_validation_status"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_org_invite: { Args: { p_token: string }; Returns: Json }
      approve_monthly_report: {
        Args: { p_feedback?: string; p_report_id: string }
        Returns: Json
      }
      cancel_scholarship: {
        Args: {
          p_effective_date?: string
          p_enrollment_id: string
          p_reason: string
        }
        Returns: Json
      }
      check_login_lockout: { Args: { p_email: string }; Returns: Json }
      create_monthly_report_draft: {
        Args: { p_month: number; p_project_id: string; p_year: number }
        Returns: Json
      }
      create_org_invite: {
        Args: {
          p_email: string
          p_expires_days?: number
          p_organization_id: string
          p_role: string
        }
        Returns: Json
      }
      enrollment_in_user_org: {
        Args: { p_enrollment_id: string }
        Returns: boolean
      }
      ensure_profile_exists: { Args: never; Returns: Json }
      fn_evaluate_payment_gates: {
        Args: { p_period_key: string; p_project_id: string; p_user_id: string }
        Returns: Json
      }
      fn_sync_payment_status: {
        Args: {
          p_actor_user_id?: string
          p_origin?: string
          p_period_key: string
          p_project_id: string
          p_user_id: string
        }
        Returns: undefined
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
      monthly_report_belongs_to_user_org: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      project_belongs_to_user_org: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      record_login_attempt: {
        Args: { p_email: string; p_success: boolean }
        Returns: Json
      }
      reopen_monthly_report: { Args: { p_report_id: string }; Returns: Json }
      replace_scholarship: {
        Args: {
          p_monthly_amount?: number
          p_new_scholar_user_id: string
          p_old_enrollment_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      return_monthly_report: {
        Args: { p_reason: string; p_report_id: string }
        Returns: Json
      }
      save_monthly_report_draft: {
        Args: { p_payload: Json; p_report_id: string }
        Returns: Json
      }
      submit_monthly_report: {
        Args: { p_ip?: string; p_report_id: string; p_user_agent?: string }
        Returns: Json
      }
      upsert_sensitive_profile: {
        Args: { p_cpf?: string; p_phone?: string }
        Returns: Json
      }
      user_can_access_profile_by_org: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      user_enrolled_in_thematic_project: {
        Args: { p_thematic_project_id: string }
        Returns: boolean
      }
      user_has_enrollment_in_project: {
        Args: { p_project_id: string }
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
      payment_status: "pending" | "eligible" | "paid" | "cancelled" | "blocked"
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
      payment_status: ["pending", "eligible", "paid", "cancelled", "blocked"],
      project_status: ["active", "inactive", "archived"],
    },
  },
} as const
