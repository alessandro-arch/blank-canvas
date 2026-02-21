import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AnalysisType = "summary" | "risks" | "indicators" | "opinion";

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

    // Auth check - user must be manager/admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) throw new Error("Usuário não autenticado");

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

    const { report_id, type } = await req.json() as { report_id: string; type: AnalysisType };

    if (!report_id || !type) throw new Error("report_id e type são obrigatórios");
    if (!["summary", "risks", "indicators", "opinion"].includes(type)) {
      throw new Error("type inválido");
    }

    // Fetch report + fields + profile
    const [
      { data: report },
      { data: fields },
      { data: history },
    ] = await Promise.all([
      supabase.from("monthly_reports").select("*, projects(title, code)").eq("id", report_id).single(),
      supabase.from("monthly_report_fields").select("payload").eq("report_id", report_id).single(),
      // Last 6 months of reports from same user+project
      supabase
        .from("monthly_reports")
        .select("period_year, period_month, status, monthly_report_fields(payload)")
        .eq("beneficiary_user_id", (await supabase.from("monthly_reports").select("beneficiary_user_id, project_id").eq("id", report_id).single()).data?.beneficiary_user_id ?? "")
        .eq("project_id", (await supabase.from("monthly_reports").select("project_id").eq("id", report_id).single()).data?.project_id ?? "")
        .neq("id", report_id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(6),
    ]);

    if (!report) throw new Error("Relatório não encontrado");

    const payload = fields?.payload as Record<string, unknown> || {};
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, institution, academic_level")
      .eq("user_id", report.beneficiary_user_id)
      .single();

    // Build context
    const reportContext = [
      `Bolsista: ${profile?.full_name || "N/A"}`,
      `Instituição: ${profile?.institution || "N/A"}`,
      `Nível acadêmico: ${profile?.academic_level || "N/A"}`,
      `Projeto: ${(report as any).projects?.title || "N/A"} (${(report as any).projects?.code || ""})`,
      `Período: ${report.period_year}-${String(report.period_month).padStart(2, "0")}`,
      `Status: ${report.status}`,
      "",
      "=== CONTEÚDO DO RELATÓRIO ===",
      `Atividades realizadas: ${payload.atividades_realizadas || "Não preenchido"}`,
      `Resultados alcançados: ${payload.resultados_alcancados || "Não preenchido"}`,
      `Dificuldades encontradas: ${payload.dificuldades_encontradas || "Não preenchido"}`,
      `Próximos passos: ${payload.proximos_passos || "Não preenchido"}`,
      `Horas dedicadas: ${payload.horas_dedicadas || "Não informado"}`,
      `Entregas: ${Array.isArray(payload.entregas) ? (payload.entregas as string[]).join(", ") : "Nenhuma"}`,
      `Observações: ${payload.observacoes || "Nenhuma"}`,
    ].join("\n");

    // History context
    const historyLines = (history || []).map((h: any) => {
      const hp = h.monthly_report_fields?.[0]?.payload || h.monthly_report_fields?.payload || {};
      return `[${h.period_year}-${String(h.period_month).padStart(2, "0")}] Status: ${h.status} | Atividades: ${(hp as any).atividades_realizadas?.substring(0, 200) || "N/A"}`;
    });

    const historyContext = historyLines.length > 0
      ? "\n\n=== HISTÓRICO (últimos meses) ===\n" + historyLines.join("\n")
      : "";

    // Prompts per type
    const prompts: Record<AnalysisType, string> = {
      summary: `Analise o relatório mensal abaixo e gere um resumo executivo conciso (3-5 parágrafos) destacando:
1. Principais atividades e entregas do período
2. Resultados mais relevantes
3. Pontos de atenção
Seja objetivo e profissional. Escreva em português do Brasil.`,

      risks: `Analise o relatório mensal abaixo e identifique:
1. Riscos potenciais (atrasos, baixa produtividade, falta de entregas)
2. Inconsistências com relatórios anteriores (se disponível)
3. Pontos que merecem atenção do gestor
4. Sugestões de perguntas para o bolsista
Liste em formato de tópicos. Seja analítico mas justo. Escreva em português do Brasil.`,

      indicators: `Analise o relatório mensal abaixo e extraia indicadores quantitativos e qualitativos:
1. Nível de produtividade (alto/médio/baixo) com justificativa
2. Aderência ao plano de trabalho (estimativa percentual)
3. Qualidade das entregas descritas
4. Tendência comparada ao histórico (melhora/estável/declínio)
5. Horas dedicadas vs. esperado
Retorne em formato estruturado. Escreva em português do Brasil.`,

      opinion: `Com base no relatório mensal e no histórico do bolsista, elabore um rascunho de parecer técnico do gestor contendo:
1. Análise das atividades realizadas
2. Avaliação dos resultados
3. Recomendação (aprovar / devolver para ajustes)
4. Observações e sugestões ao bolsista
O parecer deve ser formal, objetivo e fundamentado. Escreva em português do Brasil. Inclua a ressalva: "Este é um rascunho gerado por IA e deve ser revisado pelo gestor antes de uso."`,
    };

    const systemPrompt = `Você é um analista de programas de bolsas de pesquisa. Sua tarefa é auxiliar gestores na avaliação de relatórios mensais de bolsistas. Seja profissional, objetivo e construtivo.`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${prompts[type]}\n\n${reportContext}${historyContext}` },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("Erro no serviço de IA");
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "";
    const modelUsed = aiData.model || "google/gemini-3-flash-preview";

    // Save to monthly_report_ai
    const updateFields: Record<string, unknown> = {
      report_id,
      model_version: modelUsed,
    };

    switch (type) {
      case "summary": updateFields.summary_text = aiText; break;
      case "risks": updateFields.risks_text = aiText; break;
      case "indicators":
        updateFields.inconsistencies_text = aiText;
        // Try to parse structured indicators
        try {
          updateFields.indicators = JSON.parse(aiText);
        } catch {
          updateFields.indicators = { raw: aiText };
        }
        break;
      case "opinion": updateFields.merit_opinion_draft = aiText; break;
    }

    // Upsert - check if record exists
    const { data: existing } = await supabase
      .from("monthly_report_ai")
      .select("id")
      .eq("report_id", report_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("monthly_report_ai")
        .update({ ...updateFields, created_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("monthly_report_ai").insert(updateFields);
    }

    return new Response(JSON.stringify({ success: true, type, text: aiText, model: modelUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-analyze-report error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
