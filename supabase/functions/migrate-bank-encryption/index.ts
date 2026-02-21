import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

async function encryptField(plaintext: string, kek: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(kek), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, enc.encode(plaintext));
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
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cryptoKek = Deno.env.get("CRYPTO_KEK");

    if (!cryptoKek || cryptoKek.length !== 32) {
      return new Response(
        JSON.stringify({ error: "CRYPTO_KEK not configured or invalid length" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate caller is admin
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

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores podem executar esta migração" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default true for safety

    // Fetch all bank accounts that have plain data but missing encrypted columns
    const { data: accounts, error: fetchError } = await db
      .from("bank_accounts")
      .select("id, user_id, bank_code, agency, account_number, account_number_enc, agency_enc, bank_code_enc, last4_account")
      .or("account_number_enc.is.null,agency_enc.is.null,bank_code_enc.is.null");

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Erro ao buscar contas", details: fetchError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma conta para migrar", migrated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { total: accounts.length, migrated: 0, skipped: 0, errors: [] as string[] };

    for (const acc of accounts) {
      try {
        if (!acc.account_number || !acc.agency || !acc.bank_code) {
          results.skipped++;
          continue;
        }

        const updates: Record<string, unknown> = {};

        if (!acc.account_number_enc) {
          updates.account_number_enc = await encryptField(acc.account_number, cryptoKek);
        }
        if (!acc.agency_enc) {
          updates.agency_enc = await encryptField(acc.agency, cryptoKek);
        }
        if (!acc.bank_code_enc) {
          updates.bank_code_enc = await encryptField(acc.bank_code, cryptoKek);
        }
        if (!acc.last4_account) {
          updates.last4_account = deriveLast4(acc.account_number);
        }

        if (Object.keys(updates).length === 0) {
          results.skipped++;
          continue;
        }

        if (!dryRun) {
          updates.updated_at = new Date().toISOString();
          const { error: updateError } = await db
            .from("bank_accounts")
            .update(updates)
            .eq("id", acc.id);

          if (updateError) {
            results.errors.push(`${acc.id}: ${updateError.message}`);
            continue;
          }
        }

        results.migrated++;
      } catch (e: any) {
        results.errors.push(`${acc.id}: ${e.message}`);
      }
    }

    // Audit log
    if (!dryRun && results.migrated > 0) {
      await db.from("audit_logs").insert({
        user_id: user.id,
        action: "bank_data_encryption_migration",
        entity_type: "bank_accounts",
        details: { migrated: results.migrated, skipped: results.skipped, errors: results.errors.length },
      });
    }

    return new Response(JSON.stringify({
      dry_run: dryRun,
      ...results,
      message: dryRun
        ? `Dry run: ${results.migrated} contas seriam migradas. Envie { "dry_run": false } para executar.`
        : `Migração concluída: ${results.migrated} contas criptografadas.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
