import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AES-256-GCM encryption: returns "base64(iv).base64(tag).base64(ciphertext)"
async function encryptField(plaintext: string, kek: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = enc.encode(kek);
  const key = await crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, enc.encode(plaintext));
  // encrypted = ciphertext + tag (last 16 bytes)
  const buf = new Uint8Array(encrypted);
  const ciphertext = buf.slice(0, buf.length - 16);
  const tag = buf.slice(buf.length - 16);

  const b64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));
  return `${b64(iv)}.${b64(tag)}.${b64(ciphertext)}`;
}

function deriveLast4(accountNumber: string): string {
  const clean = accountNumber.replace(/\D/g, "");
  return clean.length >= 4 ? clean.slice(-4) : clean;
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

    if (!cryptoKek || cryptoKek.length !== 32) {
      return new Response(
        JSON.stringify({ error: "Encryption key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const body = await req.json();
    const {
      organization_id,
      bank_name,
      bank_code,
      agency,
      account_number,
      account_type,
      pix_key,
      pix_key_type,
    } = body;

    if (!bank_name || !bank_code || !agency || !account_number) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: bank_name, bank_code, agency, account_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine role
    const { data: systemRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    const callerRole = systemRole?.role || "scholar";

    // Scholars can only write their own data
    const targetUserId = body.target_user_id || callerId;
    
    if (callerRole === "scholar" && targetUserId !== callerId) {
      return new Response(
        JSON.stringify({ error: "Bolsistas só podem editar seus próprios dados" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encrypt sensitive fields
    const accountNumberEnc = await encryptField(account_number, cryptoKek);
    const agencyEnc = await encryptField(agency, cryptoKek);
    const bankCodeEnc = await encryptField(bank_code, cryptoKek);
    const last4 = deriveLast4(account_number);

    // Build update/insert data
    const bankData: Record<string, unknown> = {
      user_id: targetUserId,
      bank_name,
      bank_code,
      agency,
      account_number,
      account_type: account_type || "checking",
      pix_key_type: pix_key_type || null,
      pix_key_masked: pix_key || null,
      account_number_enc: accountNumberEnc,
      agency_enc: agencyEnc,
      bank_code_enc: bankCodeEnc,
      last4_account: last4,
      has_bank_data: true,
      updated_at: new Date().toISOString(),
    };

    // Reset validation if scholar edits
    if (callerRole === "scholar") {
      bankData.validation_status = "pending";
      bankData.locked_for_edit = false;
      bankData.validated_at = null;
      bankData.validated_by = null;
    }

    // Check if exists
    const { data: existing } = await supabaseAdmin
      .from("bank_accounts")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    let action: string;
    if (existing) {
      const { error } = await supabaseAdmin
        .from("bank_accounts")
        .update(bankData)
        .eq("user_id", targetUserId);
      if (error) throw error;
      action = "update";
    } else {
      const { error } = await supabaseAdmin
        .from("bank_accounts")
        .insert(bankData);
      if (error) throw error;
      action = "create";
    }

    // Audit log
    try {
      await supabaseAdmin.from("bank_access_logs").insert({
        actor_user_id: callerId,
        actor_role: callerRole,
        target_user_id: targetUserId,
        tenant_id: organization_id || null,
        action,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      });
    } catch (auditErr) {
      console.error("Audit log failed (non-blocking):", auditErr);
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in secure-bank-write:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
