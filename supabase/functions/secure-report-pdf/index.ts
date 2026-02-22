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

    const body = await req.json();
    const { report_id, action = "view" } = body;

    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch report
    const { data: report, error: reportError } = await db
      .from("monthly_reports")
      .select("*")
      .eq("id", report_id)
      .maybeSingle();

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: "Relatório não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check authorization — user may have multiple roles
    const { data: userRoles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (userRoles || []).map((r: { role: string }) => r.role);
    const isAdmin = roles.includes("admin");
    const isManager = roles.includes("manager");
    const isAuditor = roles.includes("auditor");
    const isScholar = !isAdmin && !isManager && !isAuditor;
    const role = isAdmin ? "admin" : isManager ? "manager" : isAuditor ? "auditor" : "scholar";

    if (isScholar && report.beneficiary_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isManager || isAuditor) {
      const { data: membership } = await db
        .from("organization_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", report.organization_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Acesso negado: organização diferente" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch document path
    const { data: doc } = await db
      .from("monthly_report_documents")
      .select("storage_path, sha256")
      .eq("report_id", report_id)
      .eq("type", "official_pdf")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!doc) {
      return new Response(JSON.stringify({ error: "PDF não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if encrypted (.enc suffix)
    const isEncrypted = doc.storage_path.endsWith(".enc");

    let pdfBytes: Uint8Array;

    if (isEncrypted && cryptoKek) {
      // Download encrypted file
      const { data: fileData, error: dlError } = await db.storage
        .from("relatorios")
        .download(doc.storage_path);

      if (dlError || !fileData) {
        return new Response(JSON.stringify({ error: "Erro ao baixar PDF cifrado" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encryptedBuf = new Uint8Array(await fileData.arrayBuffer());

      // Decrypt AES-256-GCM: first 12 bytes = IV, rest = ciphertext + tag
      const iv = encryptedBuf.slice(0, 12);
      const ciphertextWithTag = encryptedBuf.slice(12);

      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", enc.encode(cryptoKek), "AES-GCM", false, ["decrypt"]
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, tagLength: 128 }, key, ciphertextWithTag
      );

      pdfBytes = new Uint8Array(decrypted);
    } else {
      // Legacy unencrypted file - serve via signed URL (backward compat)
      const { data: signed } = await db.storage
        .from("relatorios")
        .createSignedUrl(doc.storage_path, 300);

      if (signed?.signedUrl) {
        // Log access
        try {
          await db.from("report_access_logs").insert({
            report_id,
            user_id: user.id,
            role,
            action,
            organization_id: report.organization_id,
            ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
          });
        } catch (e) { console.error("Access log failed:", e); }

        return new Response(JSON.stringify({ signedUrl: signed.signedUrl, legacy: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao gerar URL" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log access
    try {
      await db.from("report_access_logs").insert({
        report_id,
        user_id: user.id,
        role,
        action,
        organization_id: report.organization_id,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      });
    } catch (e) { console.error("Access log failed:", e); }

    // Return decrypted PDF
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": action === "download"
          ? `attachment; filename="relatorio_${report_id}.pdf"`
          : "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error in secure-report-pdf:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
