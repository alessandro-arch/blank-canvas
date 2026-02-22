import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.208.0/csv/parse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify user is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already imported
    const { count } = await supabase
      .from("institutions_mec")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ message: `Already imported ${count} records` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch CSV from public URL
    const body = await req.json().catch(() => ({}));
    const csvUrl = body.csv_url;
    if (!csvUrl) {
      return new Response(
        JSON.stringify({ error: "csv_url is required in body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch CSV" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvText = await csvResponse.text();
    const records = parse(csvText, {
      skipFirstRow: true,
      separator: ";",
    });

    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE).map((row: Record<string, string>) => ({
        codigo_ies: parseInt(row["CODIGO_DA_IES"]) || null,
        nome: (row["NOME_DA_IES"] || "").toUpperCase().trim(),
        sigla: (row["SIGLA"] || "").toUpperCase().trim() || null,
        uf: (row["UF"] || "").toUpperCase().trim(),
        categoria: (row["CATEGORIA_DA_IES"] || "").trim() || null,
        organizacao_academica: (row["ORGANIZACAO_ACADEMICA"] || "").trim() || null,
        municipio: (row["MUNICIPIO"] || "").toUpperCase().trim() || null,
        situacao: (row["SITUACAO_IES"] || "").trim() || null,
        normalized_name: normalizeText(row["NOME_DA_IES"] || ""),
      }));

      const validBatch = batch.filter((r) => r.nome && r.uf && r.uf.length === 2);

      if (validBatch.length > 0) {
        const { error } = await supabase
          .from("institutions_mec")
          .insert(validBatch);

        if (error) {
          console.error(`Batch error at ${i}:`, error);
          throw error;
        }
        inserted += validBatch.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
