import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  "https://sisconnecta.lovable.app",
  "https://www.innovago.app",
  "https://id-preview--2b9d72d4-676d-41a6-bf6b-707f4c8b4527.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

interface AssignScholarRequest {
  scholar_id: string;
  project_id: string;
  start_date: string;
  end_date: string;
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('[ASSIGN] User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Sessão inválida. Faça login novamente.', code: 'INVALID_SESSION' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ASSIGN] Request from user: ${user.id} (${user.email})`);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check user role - must be manager or admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      console.error('[ASSIGN] Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões.', code: 'ROLE_CHECK_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (roleData.role !== 'manager' && roleData.role !== 'admin') {
      console.warn(`[ASSIGN] Permission denied for user ${user.id} with role ${roleData.role}`);
      return new Response(
        JSON.stringify({ error: 'Você não tem permissão para vincular bolsistas.', code: 'PERMISSION_DENIED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: AssignScholarRequest = await req.json();
    const { scholar_id, project_id, start_date, end_date } = body;

    console.log(`[ASSIGN] Attempting to assign scholar ${scholar_id} to project ${project_id}`);

    // Validate required fields
    if (!scholar_id) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório ausente: bolsista_id', code: 'MISSING_SCHOLAR_ID' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório ausente: subprojeto_id', code: 'MISSING_PROJECT_ID' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    if (!isValidUUID(scholar_id)) {
      return new Response(
        JSON.stringify({ error: 'Formato de ID de bolsista inválido.', code: 'INVALID_SCHOLAR_ID' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!isValidUUID(project_id)) {
      return new Response(
        JSON.stringify({ error: 'Formato de ID de subprojeto inválido.', code: 'INVALID_PROJECT_ID' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!start_date) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório ausente: data_inicio', code: 'MISSING_START_DATE' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!end_date) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório ausente: data_termino', code: 'MISSING_END_DATE' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Formato de data inválido.', code: 'INVALID_DATE_FORMAT' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (endDateObj <= startDateObj) {
      return new Response(
        JSON.stringify({ error: 'A data de término deve ser posterior à data de início.', code: 'INVALID_DATE_RANGE' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('[ASSIGN] Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Subprojeto não encontrado.', code: 'PROJECT_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate dates are within project period
    const projectStart = new Date(project.start_date);
    const projectEnd = new Date(project.end_date);

    if (startDateObj < projectStart || endDateObj > projectEnd) {
      return new Response(
        JSON.stringify({ 
          error: 'O período deve estar dentro do período do subprojeto.', 
          code: 'DATE_OUT_OF_PROJECT_RANGE' 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate enrollment (same scholar, same project)
    const { data: existingEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', scholar_id)
      .eq('project_id', project_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingEnrollment) {
      console.warn(`[ASSIGN] Duplicate: scholar ${scholar_id} already enrolled in project ${project_id}`);
      return new Response(
        JSON.stringify({ error: 'Este bolsista já está vinculado a este subprojeto.', code: 'DUPLICATE_ENROLLMENT' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check exclusivity rule: scholar can only have one active enrollment
    const { data: activeEnrollments } = await supabaseAdmin
      .from('enrollments')
      .select('id, project_id')
      .eq('user_id', scholar_id)
      .eq('status', 'active');

    if (activeEnrollments && activeEnrollments.length > 0) {
      // Get the project code for better error message
      const existingProjectId = activeEnrollments[0].project_id;
      const { data: existingProject } = await supabaseAdmin
        .from('projects')
        .select('code')
        .eq('id', existingProjectId)
        .single();
      
      console.warn(`[ASSIGN] Exclusivity: scholar ${scholar_id} already has active enrollment`);
      return new Response(
        JSON.stringify({ 
          error: 'Este bolsista já possui um subprojeto ativo.', 
          code: 'SCHOLAR_HAS_ACTIVE_ENROLLMENT' 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total installments
    const totalInstallments = 
      (endDateObj.getFullYear() - startDateObj.getFullYear()) * 12 + 
      (endDateObj.getMonth() - startDateObj.getMonth()) + 1;

    // Map modality
    const modalityMap: Record<string, string> = {
      'ict': 'ict', 'ext': 'ext', 'ens': 'ens', 'ino': 'ino',
      'dct_a': 'dct_a', 'dct_b': 'dct_b', 'dct_c': 'dct_c',
      'postdoc': 'postdoc', 'senior': 'senior', 'prod': 'prod', 'visitor': 'visitor',
    };
    const modality = modalityMap[project.modalidade_bolsa || ''] || 'ict';

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        user_id: scholar_id,
        project_id: project_id,
        modality,
        grant_value: project.valor_mensal,
        start_date,
        end_date,
        total_installments: totalInstallments,
        status: 'active',
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('[ASSIGN] Enrollment creation error:', enrollmentError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar vínculo. Tente novamente.', code: 'ENROLLMENT_INSERT_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ASSIGN] Enrollment created: ${enrollment.id}`);

    // Create ALL payment installments
    const paymentRows = [];
    for (let i = 0; i < totalInstallments; i++) {
      const refDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + i, 1);
      const refMonth = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
      paymentRows.push({
        user_id: scholar_id,
        enrollment_id: enrollment.id,
        installment_number: i + 1,
        reference_month: refMonth,
        amount: project.valor_mensal,
        status: 'pending' as const,
      });
    }

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentRows);

    if (paymentError) {
      console.error('[ASSIGN] Payment creation error:', paymentError);
      // Rollback enrollment
      await supabaseAdmin.from('enrollments').delete().eq('id', enrollment.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar parcelas. Operação cancelada.', code: 'PAYMENT_INSERT_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit log (no PII for data minimization)
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'assign_scholar_to_project',
      entity_type: 'enrollment',
      entity_id: enrollment.id,
      details: {
        project_id,
        project_code: project.code,
        scholar_id,
        modality,
        grant_value: project.valor_mensal,
        start_date,
        end_date,
        total_installments: totalInstallments,
      },
    });

    console.log(`[ASSIGN] Success: scholar ${scholar_id} assigned to project ${project_id}`);

    // Get scholar name for response
    const { data: scholarProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', scholar_id)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        enrollment_id: enrollment.id,
        scholar_name: scholarProfile?.full_name || 'Bolsista',
        message: `Bolsista vinculado com sucesso ao subprojeto ${project.code}.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ASSIGN] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor. Tente novamente.', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
