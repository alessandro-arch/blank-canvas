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
  const buf = new Uint8Array(encrypted);
  const ciphertext = buf.slice(0, buf.length - 16);
  const tag = buf.slice(buf.length - 16);
  const b64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));
  return `${b64(iv)}.${b64(tag)}.${b64(ciphertext)}`;
}

function maskCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return "***.***.***-**";
  return `${clean.slice(0, 3)}.***.***.${clean.slice(-2)}`;
}

function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 4) return "****";
  return `****${clean.slice(-4)}`;
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
    const { cpf, phone } = body;

    if (!cpf && !phone) {
      return new Response(
        JSON.stringify({ error: "Pelo menos um campo (cpf ou phone) deve ser fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build upsert data
    const updateData: Record<string, unknown> = {
      user_id: callerId,
      updated_at: new Date().toISOString(),
    };

    if (cpf) {
      const cleanCpf = cpf.replace(/\D/g, "");
      // Check if CPF is already locked (exists and non-empty)
      const { data: existing } = await supabaseAdmin
        .from("profiles_sensitive")
        .select("cpf")
        .eq("user_id", callerId)
        .maybeSingle();

      if (existing?.cpf && existing.cpf.length > 0) {
        return new Response(
          JSON.stringify({ error: "CPF já cadastrado e não pode ser alterado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      updateData.cpf = maskCpf(cleanCpf);
      updateData.cpf_enc = await encryptField(cleanCpf, cryptoKek);
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      updateData.phone = maskPhone(cleanPhone);
      updateData.phone_enc = await encryptField(cleanPhone, cryptoKek);
    }

    // Upsert
    const { data: existingRow } = await supabaseAdmin
      .from("profiles_sensitive")
      .select("id")
      .eq("user_id", callerId)
      .maybeSingle();

    if (existingRow) {
      const { error } = await supabaseAdmin
        .from("profiles_sensitive")
        .update(updateData)
        .eq("user_id", callerId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("profiles_sensitive")
        .insert(updateData);
      if (error) throw error;
    }

    // Audit log
    try {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: callerId,
        action: "sensitive_pii_write",
        entity_type: "profiles_sensitive",
        entity_id: callerId,
        details: {
          cpf_updated: !!cpf,
          phone_updated: !!phone,
          encrypted: true,
        },
      });
    } catch (auditErr) {
      console.error("Audit log failed (non-blocking):", auditErr);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in secure-pii-write:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
