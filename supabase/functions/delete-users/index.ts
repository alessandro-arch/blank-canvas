import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://sisconnecta.lovable.app",
  "https://www.innovago.app",
  "https://id-preview--2b9d72d4-676d-41a6-bf6b-707f4c8b4527.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Request from user:", userId);

    // Create admin client for privileged operations (including role verification)
    // This bypasses RLS to ensure authorization checks are independent of RLS configuration
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user is admin using service role (defense-in-depth)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError || !roleData) {
      console.error("Role check failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões do usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (roleData.role !== "admin") {
      console.error("User is not admin:", roleData.role);
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem excluir usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user IDs to delete from request body
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Lista de usuários inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Array size limit to prevent DoS
    if (userIds.length > 100) {
      return new Response(
        JSON.stringify({ error: "Máximo de 100 usuários por requisição" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format for all IDs
    const invalidIds = userIds.filter((id: string) => typeof id !== 'string' || !isValidUUID(id));
    if (invalidIds.length > 0) {
      return new Response(
        JSON.stringify({ error: "Um ou mais IDs de usuário possuem formato inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (userIds.includes(userId)) {
      return new Response(
        JSON.stringify({ error: "Você não pode excluir a própria conta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Deleting users:", userIds);

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const targetUserId of userIds) {
      try {
        // Delete from user_roles first
        const { error: rolesDeleteError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId);

        if (rolesDeleteError) {
          console.error("Error deleting roles for", targetUserId, rolesDeleteError);
        }

        // Delete from profiles
        const { error: profileDeleteError } = await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("user_id", targetUserId);

        if (profileDeleteError) {
          console.error("Error deleting profile for", targetUserId, profileDeleteError);
        }

        // Delete from enrollments (if any)
        const { error: enrollmentsDeleteError } = await supabaseAdmin
          .from("enrollments")
          .delete()
          .eq("user_id", targetUserId);

        if (enrollmentsDeleteError) {
          console.error("Error deleting enrollments for", targetUserId, enrollmentsDeleteError);
        }

        // Delete from payments (if any)
        const { error: paymentsDeleteError } = await supabaseAdmin
          .from("payments")
          .delete()
          .eq("user_id", targetUserId);

        if (paymentsDeleteError) {
          console.error("Error deleting payments for", targetUserId, paymentsDeleteError);
        }

        // Delete from reports (if any)
        const { error: reportsDeleteError } = await supabaseAdmin
          .from("reports")
          .delete()
          .eq("user_id", targetUserId);

        if (reportsDeleteError) {
          console.error("Error deleting reports for", targetUserId, reportsDeleteError);
        }

        // Delete from bank_accounts (if any)
        const { error: bankDeleteError } = await supabaseAdmin
          .from("bank_accounts")
          .delete()
          .eq("user_id", targetUserId);

        if (bankDeleteError) {
          console.error("Error deleting bank accounts for", targetUserId, bankDeleteError);
        }

        // Finally delete the auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (authDeleteError) {
          console.error("Error deleting auth user", targetUserId, authDeleteError);
          results.failed.push({ id: targetUserId, error: "Falha ao excluir usuário" });
        } else {
          console.log("Successfully deleted user:", targetUserId);
          results.success.push(targetUserId);
        }
      } catch (err) {
        console.error("Unexpected error deleting user", targetUserId, err);
        console.error("Unexpected error deleting user", targetUserId, err);
        results.failed.push({ id: targetUserId, error: "Erro inesperado ao excluir usuário" });
      }
    }

    return new Response(
      JSON.stringify({
        message: `${results.success.length} usuário(s) excluído(s) com sucesso`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
