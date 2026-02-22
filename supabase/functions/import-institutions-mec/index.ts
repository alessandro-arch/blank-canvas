import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse request body once
    const body = await req.json().catch(() => ({}));
    const skipCheck = body.skip_check === true;

    if (!skipCheck) {
      const { count } = await supabase
        .from("institutions_mec")
        .select("*", { count: "exact", head: true });

      if (count && count > 4000) {
        return new Response(
          JSON.stringify({ message: `Already imported ${count} records` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Accept CSV either from URL or inline
    let csvText = "";

    if (body.csv_data) {
      csvText = body.csv_data;
    } else if (body.csv_url) {
      const csvResponse = await fetch(body.csv_url);
      if (!csvResponse.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch CSV: ${csvResponse.status}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      csvText = await csvResponse.text();
    } else {
      return new Response(
        JSON.stringify({ error: "csv_url or csv_data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    csvText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = csvText.split("\n").filter((l) => l.trim());
    const header = parseCSVLine(lines[0]);

    console.log("CSV lines count:", lines.length);
    console.log("Header:", header);
    console.log("First data line:", lines[1]?.substring(0, 200));

    const colIndex: Record<string, number> = {};
    header.forEach((h, i) => (colIndex[h.trim()] = i));
    console.log("Column indices:", JSON.stringify(colIndex));

    const BATCH_SIZE = 500;
    let inserted = 0;
    const dataLines = lines.slice(1);
    console.log("Data lines count:", dataLines.length);
    // Debug first record
    if (dataLines.length > 0) {
      const testCols = parseCSVLine(dataLines[0]);
      console.log("Test parse cols count:", testCols.length, "nome:", testCols[colIndex["NOME_DA_IES"]], "uf:", testCols[colIndex["UF"]]);
    }

    for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
      const batch = dataLines.slice(i, i + BATCH_SIZE).map((line) => {
        const cols = parseCSVLine(line);
        const nome = (cols[colIndex["NOME_DA_IES"]] || "").toUpperCase().trim();
        const sigla = (cols[colIndex["SIGLA"]] || "").toUpperCase().trim() || null;
        const uf = (cols[colIndex["UF"]] || "").toUpperCase().trim();
        return {
          codigo_ies: parseInt(cols[colIndex["CODIGO_DA_IES"]]) || null,
          nome,
          sigla,
          uf,
          categoria: (cols[colIndex["CATEGORIA_DA_IES"]] || "").trim() || null,
          organizacao_academica: (cols[colIndex["ORGANIZACAO_ACADEMICA"]] || "").trim() || null,
          municipio: (cols[colIndex["MUNICIPIO"]] || "").toUpperCase().trim() || null,
          situacao: (cols[colIndex["SITUACAO_IES"]] || "").trim() || null,
          normalized_name: normalizeText(cols[colIndex["NOME_DA_IES"]] || ""),
        };
      });

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
