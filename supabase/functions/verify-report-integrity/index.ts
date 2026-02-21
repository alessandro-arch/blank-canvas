import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cryptoKek = Deno.env.get("CRYPTO_KEK");

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only admin/manager
    const { data: userRole } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userRole || !["admin", "manager"].includes(userRole.role)) {
      return new Response(JSON.stringify({ error: "Acesso restrito a admin/gestor" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch document
    const { data: doc } = await db
      .from("monthly_report_documents")
      .select("storage_path, sha256")
      .eq("report_id", report_id)
      .eq("type", "official_pdf")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!doc) {
      return new Response(JSON.stringify({ error: "Documento PDF não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storedHash = doc.sha256;

    // Download file
    const { data: fileData, error: dlError } = await db.storage
      .from("relatorios")
      .download(doc.storage_path);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: "Erro ao baixar arquivo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let pdfBytes: Uint8Array;
    const rawBytes = new Uint8Array(await fileData.arrayBuffer());

    if (doc.storage_path.endsWith(".enc") && cryptoKek) {
      // Decrypt first
      const iv = rawBytes.slice(0, 12);
      const ciphertextWithTag = rawBytes.slice(12);

      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", enc.encode(cryptoKek), "AES-GCM", false, ["decrypt"]
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, tagLength: 128 }, key, ciphertextWithTag
      );
      pdfBytes = new Uint8Array(decrypted);
    } else {
      pdfBytes = rawBytes;
    }

    // Compute SHA-256
    const hashBuffer = await crypto.subtle.digest("SHA-256", pdfBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const status = computedHash === storedHash ? "VALID" : "TAMPERED";

    // Audit log
    try {
      await db.from("audit_logs").insert({
        user_id: user.id,
        action: "report_integrity_check",
        entity_type: "monthly_report",
        entity_id: report_id,
        details: { status, computed_hash: computedHash, stored_hash: storedHash },
      });
    } catch (e) { console.error("Audit failed:", e); }

    return new Response(
      JSON.stringify({ status, computed_hash: computedHash, stored_hash: storedHash }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-report-integrity:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
