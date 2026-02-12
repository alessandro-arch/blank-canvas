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

// Generate a cryptographically random password
function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const specialChars = "!@#$%&*";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  let password = "";
  for (let i = 0; i < 14; i++) {
    password += chars[array[i] % chars.length];
  }
  // Ensure at least one special char and one digit
  password += specialChars[array[14] % specialChars.length];
  password += String(array[15] % 10);
  return password;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    // Verify admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "manager")) {
      return new Response(JSON.stringify({ error: "Apenas administradores/gestores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      action?: string;
      users: Array<{ email: string; cpf: string; full_name?: string }>;
      inviteCode?: string;
    };

    const { action, users, inviteCode } = body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: "Lista de usuários vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Array size limit to prevent DoS
    if (users.length > 100) {
      return new Response(JSON.stringify({ error: "Máximo de 100 usuários por requisição" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: reset-password - generate random password for existing users
    if (action === "reset-password") {
      const resetResults = {
        success: [] as Array<{ email: string }>,
        failed: [] as Array<{ email: string; error: string }>,
      };

      for (const user of users) {
        try {
          const defaultPassword = generateRandomPassword();

          // Find user by email
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const authUser = listData?.users?.find(u => u.email === user.email);

          if (!authUser) {
            resetResults.failed.push({ email: user.email, error: "Usuário não encontrado" });
            continue;
          }

          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            { password: defaultPassword }
          );

          if (updateError) {
            resetResults.failed.push({ email: user.email, error: updateError.message });
          } else {
            resetResults.success.push({ email: user.email });
            console.log(`Password reset for: ${user.email}`);
          }
        } catch (err) {
          resetResults.failed.push({ email: user.email, error: String(err) });
        }
      }

      return new Response(JSON.stringify({
        message: `${resetResults.success.length} senha(s) redefinida(s)`,
        results: resetResults,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!inviteCode) {
      return new Response(JSON.stringify({ error: "Código de convite obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate invite code
    const { data: inviteRecord, error: inviteError } = await supabaseAdmin
      .from("invite_codes")
      .select("*")
      .eq("code", inviteCode.toUpperCase().trim())
      .single();

    if (inviteError || !inviteRecord) {
      return new Response(JSON.stringify({ error: "Código de convite inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = {
      success: [] as Array<{ email: string; user_id: string }>,
      failed: [] as Array<{ email: string; error: string }>,
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const user of users) {
      try {
        // Validate email format
        if (!user.email || !emailRegex.test(user.email.trim())) {
          results.failed.push({ email: user.email || '(vazio)', error: "Formato de email inválido" });
          continue;
        }

        // Validate CPF
        if (!user.cpf || user.cpf.replace(/\D/g, "").length < 11) {
          results.failed.push({ email: user.email, error: "CPF inválido" });
          continue;
        }

        const cpfClean = user.cpf.replace(/\D/g, "");
        // Generate cryptographically random password instead of predictable pattern
        const defaultPassword = generateRandomPassword();

        // Create auth user with auto-confirm
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name || user.email.split("@")[0],
            cpf: cpfClean,
            invite_code: inviteCode,
            origin: "manual",
            requires_password_change: true,
          },
        });

        if (authError) {
          console.error(`Error creating user ${user.email}:`, authError);
          results.failed.push({ email: user.email, error: authError.message });
          continue;
        }

        if (!authData.user) {
          results.failed.push({ email: user.email, error: "Falha ao criar usuário" });
          continue;
        }

        // The handle_new_user trigger should have created the profile.
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("user_id", authData.user.id)
          .single();

        if (!profile) {
          // Trigger may have failed, create profile manually
          const { error: profileError } = await supabaseAdmin.from("profiles").insert({
            user_id: authData.user.id,
            email: user.email,
            full_name: user.full_name || user.email.split("@")[0],
            cpf: cpfClean,
            origin: "manual",
            thematic_project_id: inviteRecord.thematic_project_id,
            partner_company_id: inviteRecord.partner_company_id,
            organization_id: inviteRecord.organization_id,
            invite_code_used: inviteCode,
            invite_used_at: new Date().toISOString(),
          });

          if (profileError) {
            console.error(`Error creating profile for ${user.email}:`, profileError);
          }

          await supabaseAdmin.from("user_roles").upsert({
            user_id: authData.user.id,
            role: "scholar",
          }, { onConflict: "user_id,role" });
        }

        results.success.push({ email: user.email, user_id: authData.user.id });

        console.log(`Successfully created user: ${user.email}`);
      } catch (err) {
        console.error(`Unexpected error for ${user.email}:`, err);
        results.failed.push({ email: user.email, error: String(err) });
      }
    }

    // Update invite code used_count
    if (results.success.length > 0) {
      await supabaseAdmin
        .from("invite_codes")
        .update({ used_count: inviteRecord.used_count + results.success.length })
        .eq("id", inviteRecord.id);
    }

    return new Response(JSON.stringify({
      message: `${results.success.length} conta(s) criada(s) com sucesso`,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
