import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function maskBankCode(value: string): string {
  return "**";
}

function maskAgency(value: string): string {
  if (value.length <= 1) return "***";
  return "***" + value.slice(-1);
}

function maskAccountNumber(value: string): string {
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub as string;

    // Parse body
    const { organization_id, beneficiary_user_id } = await req.json();
    if (!organization_id || !beneficiary_user_id) {
      return new Response(
        JSON.stringify({ error: "organization_id e beneficiary_user_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller membership in organization
    const { data: membership } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("user_id", callerId)
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .maybeSingle();

    // Also check system admin role
    const { data: systemRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    const isSystemAdmin = !!systemRole;
    const isOrgAdminOrManager = membership?.role && ["admin", "manager", "owner"].includes(membership.role);

    if (!isOrgAdminOrManager && !isSystemAdmin) {
      // User has no access to this org at all
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mode = (isOrgAdminOrManager || isSystemAdmin) ? "full" : "masked";

    // Fetch bank account
    const { data: bankAccount, error: bankError } = await supabaseAdmin
      .from("bank_accounts")
      .select("*")
      .eq("user_id", beneficiary_user_id)
      .maybeSingle();

    if (bankError) {
      console.error("Error fetching bank account:", bankError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar dados bancários" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bankAccount) {
      return new Response(
        JSON.stringify({ error: "Dados bancários não encontrados" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build masked version
    const masked = {
      bank_code: maskBankCode(bankAccount.bank_code),
      bank_name: bankAccount.bank_name,
      agency: maskAgency(bankAccount.agency),
      account_number: maskAccountNumber(bankAccount.account_number),
      account_type: bankAccount.account_type,
      pix: bankAccount.pix_key_masked || "***",
      pix_key_type: bankAccount.pix_key_type,
    };

    // Build response
    const response: Record<string, unknown> = { mode, masked };

    if (mode === "full") {
      response.bank_code = bankAccount.bank_code;
      response.bank_name = bankAccount.bank_name;
      response.agency = bankAccount.agency;
      response.account_number = bankAccount.account_number;
      response.account_type = bankAccount.account_type;
      response.pix = bankAccount.pix_key_masked || null;
      response.pix_key_type = bankAccount.pix_key_type;
      response.pix_protected = true; // PIX is vault-encrypted, we return masked value
    }

    // Audit log
    try {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: callerId,
        action: "bank_data_read",
        entity_type: "bank_account",
        entity_id: bankAccount.id,
        organization_id: organization_id,
        details: {
          mode,
          beneficiary_user_id,
          caller_role: membership?.role || (isSystemAdmin ? "system_admin" : "unknown"),
        },
      });
    } catch (auditErr) {
      console.error("Audit log failed (non-blocking):", auditErr);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in secure-bank-read:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
