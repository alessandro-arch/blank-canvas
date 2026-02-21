import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AES-256-GCM decryption from format: "base64(iv).base64(tag).base64(ciphertext)"
async function decryptField(encrypted: string, kek: string): Promise<string> {
  const parts = encrypted.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const iv = fromB64(parts[0]);
  const tag = fromB64(parts[1]);
  const ciphertext = fromB64(parts[2]);

  // Reconstruct ciphertext + tag for AES-GCM
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(kek), "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, combined);
  return new TextDecoder().decode(decrypted);
}

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
    const cryptoKek = Deno.env.get("CRYPTO_KEK");
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = user.id;

    // Parse body
    const { organization_id, beneficiary_user_id } = await req.json();
    if (!organization_id || !beneficiary_user_id) {
      return new Response(
        JSON.stringify({ error: "organization_id e beneficiary_user_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller role
    const { data: systemRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    const callerRole = systemRole?.role || "scholar";
    const isSystemAdmin = callerRole === "admin";

    // Check caller membership in organization
    const { data: membership } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("user_id", callerId)
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .maybeSingle();

    const isOrgAdminOrManager = membership?.role && ["admin", "manager", "owner"].includes(membership.role);

    // Scholars can only read their own data
    const isOwnData = callerId === beneficiary_user_id;
    if (!isOrgAdminOrManager && !isSystemAdmin && !isOwnData) {
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

    // Try to decrypt encrypted fields if available
    let decryptedAccountNumber = bankAccount.account_number;
    let decryptedAgency = bankAccount.agency;
    let decryptedBankCode = bankAccount.bank_code;

    if (cryptoKek && mode === "full") {
      try {
        if (bankAccount.account_number_enc) {
          decryptedAccountNumber = await decryptField(bankAccount.account_number_enc, cryptoKek);
        }
        if (bankAccount.agency_enc) {
          decryptedAgency = await decryptField(bankAccount.agency_enc, cryptoKek);
        }
        if (bankAccount.bank_code_enc) {
          decryptedBankCode = await decryptField(bankAccount.bank_code_enc, cryptoKek);
        }
      } catch (decErr) {
        console.error("Decryption failed, using plain fields:", decErr);
      }
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
      response.bank_code = decryptedBankCode;
      response.bank_name = bankAccount.bank_name;
      response.agency = decryptedAgency;
      response.account_number = decryptedAccountNumber;
      response.account_type = bankAccount.account_type;
      response.pix = bankAccount.pix_key_masked || null;
      response.pix_key_type = bankAccount.pix_key_type;
      response.pix_protected = true;
    }

    // Audit log in bank_access_logs
    try {
      await supabaseAdmin.from("bank_access_logs").insert({
        actor_user_id: callerId,
        actor_role: callerRole,
        target_user_id: beneficiary_user_id,
        tenant_id: organization_id,
        action: "view",
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
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
