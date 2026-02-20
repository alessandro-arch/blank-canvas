import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

Deno.serve(async (req) => {
  

  function errorResponse(
    status: number,
    errorCode: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    return new Response(
      JSON.stringify({
        error: errorCode,
        message,
        ...(details && { details }),
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  function successResponse(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "unauthorized", "Token de autenticação não fornecido.");
    }

    // Create client with user's token for authentication verification
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Claims error:", claimsError);
      return errorResponse(401, "invalid_token", "Token de autenticação inválido ou expirado.");
    }

    const userId = claimsData.claims.sub;
    console.log("Request from user:", userId);

    // Create admin client for privileged operations (including role verification)
    // This bypasses RLS to ensure authorization checks are independent of RLS configuration
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check user role using service role (defense-in-depth)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError || !roleData) {
      console.error("Role check failed:", roleError);
      return errorResponse(500, "server_error", "Erro ao verificar permissões do usuário.");
    }

    const isAdmin = roleData.role === "admin";
    const isManager = roleData.role === "manager" || isAdmin;

    if (!isManager) {
      return errorResponse(403, "forbidden", "Apenas gestores podem gerenciar usuários.");
    }

    // Get request body
    let body: { action?: string; userIds?: string[] };
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "invalid_request", "Corpo da requisição inválido.");
    }

    const { action, userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return errorResponse(400, "invalid_request", "Lista de usuários inválida ou vazia.");
    }

    // Array size limit to prevent DoS
    if (userIds.length > 100) {
      return errorResponse(400, "limit_exceeded", "Máximo de 100 usuários por requisição.");
    }

    // Validate UUID format for all IDs
    const invalidIds = userIds.filter((id: string) => typeof id !== 'string' || !isValidUUID(id));
    if (invalidIds.length > 0) {
      return errorResponse(400, "invalid_uuid", "Um ou mais IDs de usuário possuem formato inválido.");
    }

    // Prevent self-action
    if (userIds.includes(userId)) {
      return errorResponse(400, "self_action", "Você não pode executar esta ação na própria conta.");
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string; code: string }[],
    };

    if (action === "deactivate" || action === "reactivate") {
      // Deactivate/Reactivate users
      const isActive = action === "reactivate";
      console.log(`${action} users:`, userIds);

      for (const targetUserId of userIds) {
        try {
          // Check if user exists
          const { data: profile, error: profileCheckError } = await supabaseAdmin
            .from("profiles")
            .select("id, is_active")
            .eq("user_id", targetUserId)
            .single();

          if (profileCheckError || !profile) {
            console.error(`User not found: ${targetUserId}`);
            results.failed.push({ id: targetUserId, error: "Usuário não encontrado.", code: "not_found" });
            continue;
          }

          // Update profile is_active status
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq("user_id", targetUserId);

          if (profileError) {
            console.error(`Error updating profile for ${targetUserId}:`, profileError);
            results.failed.push({ id: targetUserId, error: "Falha ao atualizar perfil do usuário.", code: "update_failed" });
            continue;
          }

          // If deactivating, suspend all active enrollments
          if (!isActive) {
            const { error: enrollmentError } = await supabaseAdmin
              .from("enrollments")
              .update({ status: "suspended", updated_at: new Date().toISOString() })
              .eq("user_id", targetUserId)
              .eq("status", "active");

            if (enrollmentError) {
              console.error(`Error suspending enrollments for ${targetUserId}:`, enrollmentError);
            }
          }

          console.log(`Successfully ${action}d user:`, targetUserId);
          results.success.push(targetUserId);
        } catch (err) {
          console.error(`Unexpected error ${action}ing user ${targetUserId}:`, err);
          console.error(`Unexpected error ${action}ing user ${targetUserId}:`, err);
          results.failed.push({ id: targetUserId, error: "Erro inesperado ao processar usuário.", code: "server_error" });
        }
      }

      const actionLabel = isActive ? "reativado(s)" : "desativado(s)";
      return successResponse({
        message: `${results.success.length} usuário(s) ${actionLabel} com sucesso`,
        results,
      });
    }

    if (action === "delete") {
      // Only admins can permanently delete
      if (!isAdmin) {
        return errorResponse(403, "forbidden", "Apenas administradores podem excluir usuários permanentemente.");
      }

      console.log("Permanently deleting users:", userIds);

      for (const targetUserId of userIds) {
        try {
          // Check if user exists
          const { data: profile, error: profileCheckError } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("user_id", targetUserId)
            .single();

          if (profileCheckError || !profile) {
            console.error(`User not found: ${targetUserId}`);
            results.failed.push({ id: targetUserId, error: "Usuário não encontrado.", code: "not_found" });
            continue;
          }

          // Check for linked records
          const { data: enrollments } = await supabaseAdmin
            .from("enrollments")
            .select("id")
            .eq("user_id", targetUserId)
            .limit(1);

          const { data: payments } = await supabaseAdmin
            .from("payments")
            .select("id")
            .eq("user_id", targetUserId)
            .limit(1);

          const { data: reports } = await supabaseAdmin
            .from("reports")
            .select("id")
            .eq("user_id", targetUserId)
            .limit(1);

          const hasEnrollments = enrollments && enrollments.length > 0;
          const hasPayments = payments && payments.length > 0;
          const hasReports = reports && reports.length > 0;

          if (hasEnrollments || hasPayments || hasReports) {
            const linkedTypes: string[] = [];
            if (hasEnrollments) linkedTypes.push("matrículas");
            if (hasPayments) linkedTypes.push("pagamentos");
            if (hasReports) linkedTypes.push("relatórios");

            console.log(`User ${targetUserId} has linked records: ${linkedTypes.join(", ")}`);
            results.failed.push({ 
              id: targetUserId, 
              error: `Usuário possui ${linkedTypes.join(", ")} vinculado(s). Desative em vez de excluir.`,
              code: "has_dependencies"
            });
            continue;
          }

          // Delete from user_roles
          await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);

          // Delete from profiles
          await supabaseAdmin.from("profiles").delete().eq("user_id", targetUserId);

          // Delete from bank_accounts
          await supabaseAdmin.from("bank_accounts").delete().eq("user_id", targetUserId);

          // Delete the auth user
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

          if (authDeleteError) {
            console.error("Error deleting auth user", targetUserId, authDeleteError);
            results.failed.push({ id: targetUserId, error: "Falha ao excluir usuário.", code: "auth_delete_failed" });
          } else {
            console.log("Successfully deleted user:", targetUserId);
            results.success.push(targetUserId);
          }
        } catch (err) {
          console.error("Unexpected error deleting user", targetUserId, err);
          results.failed.push({ id: targetUserId, error: "Falha interna ao excluir usuário.", code: "server_error" });
        }
      }

      // If all failed due to dependencies, return 409
      if (results.success.length === 0 && results.failed.every(f => f.code === "has_dependencies")) {
        return errorResponse(409, "has_dependencies", 
          "Usuário(s) possui(em) registros vinculados. Desative em vez de excluir.",
          { failed: results.failed }
        );
      }

      return successResponse({
        message: `${results.success.length} usuário(s) excluído(s) permanentemente`,
        results,
      });
    }

    return errorResponse(400, "invalid_action", "Ação inválida. Use: deactivate, reactivate ou delete.");

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: "Falha interna do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
