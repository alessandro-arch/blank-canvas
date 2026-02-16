import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction = 
  | "bulk_deactivate"
  | "bulk_delete"
  | "update_cpf"
  | "update_enrollment"
  | "release_payment"
  | "mark_payment_paid"
  | "attach_payment_receipt"
  | "update_user_role"
  | "create_enrollment"
  | "delete_enrollment"
  | "approve_report"
  | "reject_report"
  | "create_project"
  | "update_project"
  | "archive_project"
  | "delete_project"
  | "assign_scholar_to_project"
  | "bank_data_under_review"
  | "bank_data_validated"
  | "bank_data_returned"
  | "create_thematic_project"
  | "update_thematic_project"
  | "archive_thematic_project"
  | "delete_thematic_project"
  | "upload_grant_term"
  | "update_grant_term"
  | "update_profile_admin";

export type EntityType = 
  | "user"
  | "enrollment"
  | "payment"
  | "report"
  | "user_role"
  | "project"
  | "bank_account"
  | "thematic_project"
  | "grant_term";

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  details?: Json;
  previousValue?: Json;
  newValue?: Json;
}

export function useAuditLog() {
  const { user } = useAuth();

  const logAction = async ({
    action,
    entityType,
    entityId,
    details,
    previousValue,
    newValue,
  }: AuditLogParams) => {
    if (!user) {
      console.error("[AUDIT] Cannot log action: user not authenticated");
      return { error: new Error("User not authenticated") };
    }

    try {
      // Use secure RPC function instead of direct insert
      // This function validates that only admins/managers can create audit logs
      const { data, error } = await supabase.rpc("insert_audit_log", {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_details: (details || {}) as Json,
        p_previous_value: previousValue || null,
        p_new_value: newValue || null,
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        console.error("[AUDIT] Failed to log action:", error);
        return { error };
      }

      console.log(`[AUDIT] Logged: ${action} on ${entityType}${entityId ? ` (${entityId})` : ""}`);
      return { error: null };
    } catch (err) {
      console.error("[AUDIT] Unexpected error:", err);
      return { error: err as Error };
    }
  };

  return { logAction };
}
