import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body for action
    let body: { action?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = { action: "list" };
    }

    // List all auth users
    const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUsers = authData.users;

    // Get all profile user_ids
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id");

    const profileUserIds = new Set((profiles || []).map((p: { user_id: string }) => p.user_id));

    // Find orphans (in auth but not in profiles)
    const orphans = authUsers.filter((u) => !profileUserIds.has(u.id));

    if (body.action === "delete") {
      const results = { deleted: [] as string[], failed: [] as string[] };

      for (const orphan of orphans) {
        // Also clean up any user_roles
        await supabaseAdmin.from("user_roles").delete().eq("user_id", orphan.id);

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphan.id);
        if (deleteError) {
          console.error(`Failed to delete orphan ${orphan.id}:`, deleteError);
          results.failed.push(orphan.email || orphan.id);
        } else {
          console.log(`Deleted orphan: ${orphan.email}`);
          results.deleted.push(orphan.email || orphan.id);
        }
      }

      return new Response(JSON.stringify({
        message: `${results.deleted.length} usuário(s) órfão(s) removido(s)`,
        results,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: list orphans
    return new Response(JSON.stringify({
      total_auth_users: authUsers.length,
      total_profiles: profileUserIds.size,
      orphan_count: orphans.length,
      orphans: orphans.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      })),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
