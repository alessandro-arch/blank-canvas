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

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(kek), "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, combined);
  return new TextDecoder().decode(decrypted);
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
    const { target_user_id } = await req.json();
    const targetUserId = target_user_id || callerId;

    // Check permissions
    const { data: systemRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    const callerRole = systemRole?.role || "scholar";
    const isSystemAdmin = callerRole === "admin";
    const isOwnData = callerId === targetUserId;

    // Scholars can only read their own data
    if (!isOwnData && !isSystemAdmin && callerRole !== "manager") {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For managers, verify they share an organization with the target user
    if (!isOwnData && callerRole === "manager") {
      const { data: callerOrgs } = await supabaseAdmin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", callerId)
        .eq("is_active", true);

      const callerOrgIds = (callerOrgs || []).map(o => o.organization_id);

      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("organization_id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (!targetProfile?.organization_id || !callerOrgIds.includes(targetProfile.organization_id)) {
        return new Response(
          JSON.stringify({ error: "Acesso negado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch sensitive data
    const { data: sensitiveData, error: fetchError } = await supabaseAdmin
      .from("profiles_sensitive")
      .select("cpf, cpf_enc, phone, phone_enc")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching PII:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sensitiveData) {
      return new Response(
        JSON.stringify({ cpf: null, phone: null, cpf_locked: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt if encrypted versions exist
    let cpf = sensitiveData.cpf || null;
    let phone = sensitiveData.phone || null;

    if (cryptoKek) {
      try {
        if (sensitiveData.cpf_enc) {
          cpf = await decryptField(sensitiveData.cpf_enc, cryptoKek);
        }
        if (sensitiveData.phone_enc) {
          phone = await decryptField(sensitiveData.phone_enc, cryptoKek);
        }
      } catch (decErr) {
        console.error("Decryption failed, using plain fields:", decErr);
        // Fallback to plain text columns
      }
    }

    const cpfLocked = !!cpf && cpf.length > 0 && !cpf.includes("*");

    // Audit log for non-own access
    if (!isOwnData) {
      try {
        await supabaseAdmin.from("audit_logs").insert({
          user_id: callerId,
          action: "sensitive_pii_read",
          entity_type: "profiles_sensitive",
          entity_id: targetUserId,
          details: {
            role: callerRole,
            fields_accessed: ["cpf", "phone"],
          },
        });
      } catch (auditErr) {
        console.error("Audit log failed (non-blocking):", auditErr);
      }
    }

    return new Response(
      JSON.stringify({ cpf, phone, cpf_locked: cpfLocked }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in secure-pii-read:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
