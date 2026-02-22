import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = `Voce e um avaliador tecnico de relatorios mensais de bolsistas de pesquisa vinculados a programas de fomento.

REGRAS OBRIGATORIAS:
1. Responda EXCLUSIVAMENTE em JSON valido. NAO use Markdown, asteriscos, hashtags, code fences ou qualquer formatacao.
2. Idioma: pt-BR obrigatorio em todo o conteudo.
3. NAO mencione "horas dedicadas", "horas esperadas" ou qualquer metrica de horas.
4. Se o relatorio for curto, generico, sem numeros, sem evidencias verificaveis ou sem vinculo claro com o plano de trabalho:
   - Reduza fortemente as notas de "evidencia_verificabilidade_0a5" e "aderencia_plano_0a5"
   - Sugira "devolver" ou "aprovar_com_ressalvas" com checklist do que corrigir
5. Elogios so sao permitidos se houver evidencias explicitas (numeros, datasets, resultados concretos, amostras, logs, tabelas).
6. Cite OBRIGATORIAMENTE ao menos 2 elementos do Plano de Trabalho (objetivo, entrega ou cronograma).
7. Compare com o historico quando disponivel (ao menos 1 comparacao explicita).
8. Use texto limpo, sem caracteres especiais desnecessarios. Apenas letras, numeros, pontuacao padrao pt-BR.

SCHEMA JSON OBRIGATORIO (responda exatamente neste formato):
{
  "parecer": {
    "titulo": "Parecer Tecnico - Relatorio Mensal",
    "identificacao": {
      "bolsista": "Nome do bolsista",
      "instituicao": "Instituicao",
      "nivel": "Nivel academico",
      "projeto": "Titulo do projeto (codigo)",
      "periodo": "YYYY-MM"
    },
    "sumario": ["Ponto 1", "Ponto 2", "Ponto 3"],
    "avaliacao_tecnica": [
      { "secao": "Atividades e Resultados", "texto": "Analise detalhada..." },
      { "secao": "Confronto com Plano de Trabalho", "texto": "Comparacao explicita..." },
      { "secao": "Evolucao vs Historico", "texto": "Comparacao com meses anteriores..." }
    ],
    "metricas": {
      "aderencia_plano_0a5": 0,
      "evidencia_verificabilidade_0a5": 0,
      "progresso_vs_historico_0a5": 0,
      "qualidade_tecnica_clareza_0a5": 0
    },
    "evidencias": ["Evidencia concreta 1", "Evidencia concreta 2"],
    "lacunas": ["Lacuna 1", "Lacuna 2"],
    "riscos_pendencias": ["Risco ou pendencia 1"],
    "perguntas_ao_bolsista": ["Pergunta direta 1 (maximo 5)"],
    "decisao_sugerida": "aprovar|aprovar_com_ressalvas|devolver",
    "justificativa_decisao": "Justificativa em 3 a 6 linhas, objetiva e fundamentada."
  },
  "indicadores": {
    "aderencia_plano_0a5": 0,
    "evidencia_verificabilidade_0a5": 0,
    "progresso_vs_historico_0a5": 0,
    "qualidade_tecnica_clareza_0a5": 0,
    "resumo": "Resumo objetivo dos indicadores"
  },
  "analise_riscos": {
    "riscos": ["Risco 1"],
    "mitigacoes": ["Mitigacao 1"]
  },
  "resumo_executivo": {
    "texto": "Resumo executivo conciso do relatorio e parecer."
  }
}`;

function sanitizeOutput(raw: string): Record<string, unknown> {
  // Strip code fences
  let text = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  // Remove CJK characters
  text = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f]/g, "");
  // Remove asterisks and hashtags
  text = text.replace(/[*#]/g, "");
  // Try to extract JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Nenhum JSON encontrado na resposta da IA");
  const parsed = JSON.parse(jsonMatch[0]);
  // Validate required top-level keys
  if (!parsed.parecer) throw new Error("Campo 'parecer' ausente na resposta da IA");
  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Auth check
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) throw new Error("Usuario nao autenticado");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("manager")) {
      throw new Error("Acesso negado: apenas gestores e admins");
    }

    const { report_id } = await req.json() as { report_id: string };
    if (!report_id) throw new Error("report_id e obrigatorio");

    // Fetch report
    const { data: report, error: reportErr } = await supabase
      .from("monthly_reports")
      .select("*, projects(title, code, start_date, end_date, thematic_project_id, thematic_projects(title, organization_id))")
      .eq("id", report_id)
      .single();

    if (reportErr || !report) throw new Error("Relatorio nao encontrado");

    const orgId = (report as any).projects?.thematic_projects?.organization_id;

    // Fetch fields, profile, work plan, history in parallel
    const [
      { data: fields },
      { data: profile },
      { data: workPlan },
      { data: history },
    ] = await Promise.all([
      supabase.from("monthly_report_fields").select("payload").eq("report_id", report_id).single(),
      supabase.from("profiles").select("full_name, institution, academic_level").eq("user_id", report.beneficiary_user_id).single(),
      supabase.from("work_plans").select("extracted_text, extracted_json").eq("project_id", report.project_id).eq("status", "active").maybeSingle(),
      supabase
        .from("monthly_reports")
        .select("period_year, period_month, status, approved_by_user_id, return_reason, monthly_report_fields(payload)")
        .eq("beneficiary_user_id", report.beneficiary_user_id)
        .eq("project_id", report.project_id)
        .neq("id", report_id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(6),
    ]);

    const payload = (fields?.payload as Record<string, unknown>) || {};

    // Build report context
    const proj = (report as any).projects;
    const periodo = `${report.period_year}-${String(report.period_month).padStart(2, "0")}`;

    const reportContext = [
      `Bolsista: ${profile?.full_name || "N/A"}`,
      `Instituicao: ${profile?.institution || "N/A"}`,
      `Nivel academico: ${profile?.academic_level || "N/A"}`,
      `Projeto: ${proj?.title || "N/A"} (${proj?.code || ""})`,
      `Vigencia do projeto: ${proj?.start_date || "?"} a ${proj?.end_date || "?"}`,
      `Periodo do relatorio: ${periodo}`,
      `Status: ${report.status}`,
      "",
      "=== CONTEUDO DO RELATORIO ===",
      `Atividades realizadas: ${payload.atividades_realizadas || "Nao preenchido"}`,
      `Resultados alcancados: ${payload.resultados_alcancados || "Nao preenchido"}`,
      `Dificuldades encontradas: ${payload.dificuldades_encontradas || "Nao preenchido"}`,
      `Proximos passos: ${payload.proximos_passos || "Nao preenchido"}`,
      `Entregas: ${Array.isArray(payload.entregas) ? (payload.entregas as string[]).join(", ") : "Nenhuma"}`,
      `Observacoes: ${payload.observacoes || "Nenhuma"}`,
    ].join("\n");

    // Work plan context
    let workPlanContext = "";
    let hasWorkPlan = false;
    if (workPlan) {
      hasWorkPlan = true;
      const wpJson = workPlan.extracted_json as Record<string, string> | null;
      const wpParts: string[] = ["\n\n=== PLANO DE TRABALHO ==="];
      if (wpJson?.objetivo_geral) wpParts.push(`Objetivo geral: ${wpJson.objetivo_geral}`);
      if (wpJson?.objetivos_especificos) wpParts.push(`Objetivos especificos: ${wpJson.objetivos_especificos}`);
      if (wpJson?.atividades) wpParts.push(`Atividades e cronograma: ${wpJson.atividades}`);
      if (workPlan.extracted_text && !wpJson) wpParts.push(workPlan.extracted_text.substring(0, 3000));
      if (wpParts.length > 1) workPlanContext = wpParts.join("\n");
    }

    // History context
    const historyLines = (history || []).map((h: any) => {
      const hp = h.monthly_report_fields?.[0]?.payload || h.monthly_report_fields?.payload || {};
      const returnReason = h.return_reason ? ` | Motivo devolucao: ${h.return_reason}` : "";
      return `[${h.period_year}-${String(h.period_month).padStart(2, "0")}] Status: ${h.status}${returnReason} | Atividades: ${((hp as any).atividades_realizadas || "N/A").substring(0, 300)} | Resultados: ${((hp as any).resultados_alcancados || "N/A").substring(0, 200)}`;
    });
    const historyContext = historyLines.length > 0
      ? "\n\n=== HISTORICO (ultimos meses) ===\n" + historyLines.join("\n")
      : "\n\n=== HISTORICO ===\nNenhum relatorio anterior disponivel.";

    const workPlanWarning = !hasWorkPlan
      ? "\n\nATENCAO: Nenhum Plano de Trabalho foi encontrado para este bolsista. Informe isso no parecer, reduza a nota de aderencia ao plano e indique que a analise e limitada."
      : "";

    const userPrompt = `Avalie o relatorio mensal abaixo e retorne o JSON estruturado conforme o schema.\n\n${reportContext}${historyContext}${workPlanContext}${workPlanWarning}`;

    // Call LLM
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisicoes excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Creditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("Erro no servico de IA");
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "";
    const modelUsed = aiData.model || "google/gemini-3-flash-preview";

    // Sanitize and parse
    let parsedOutput: Record<string, unknown>;
    try {
      parsedOutput = sanitizeOutput(aiText);
    } catch (parseErr) {
      console.error("Failed to parse AI output:", parseErr, "Raw:", aiText.substring(0, 500));
      // Return raw as fallback
      parsedOutput = {
        parecer: { titulo: "Erro ao processar parecer", justificativa_decisao: aiText.substring(0, 2000) },
        _parse_error: true,
      };
    }

    // Upsert into monthly_report_ai_outputs
    if (orgId) {
      const { data: existing } = await supabase
        .from("monthly_report_ai_outputs")
        .select("id")
        .eq("report_id", report_id)
        .maybeSingle();

      const row = {
        report_id,
        organization_id: orgId,
        payload: parsedOutput,
        model: modelUsed,
        prompt_version: PROMPT_VERSION,
        generated_by: user.id,
        created_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from("monthly_report_ai_outputs").update(row).eq("id", existing.id);
      } else {
        await supabase.from("monthly_report_ai_outputs").insert(row);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: parsedOutput,
      model: modelUsed,
      has_work_plan: hasWorkPlan,
      history_count: historyLines.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-evaluate-monthly-report error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
