import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Validate caller auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get organization_id from query params
    const url = new URL(req.url);
    const organizationId = url.searchParams.get('organization_id');
    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organization_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate caller is admin/manager of this org OR system admin
    const { data: callerRole } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    const { data: systemRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isOrgAdmin = callerRole?.role && ['admin', 'owner', 'manager'].includes(callerRole.role);
    const isSystemAdmin = !!systemRole;

    if (!isOrgAdmin && !isSystemAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional filters
    const roleFilter = url.searchParams.get('role_filter');
    const includeInactive = url.searchParams.get('include_inactive') === 'true';

    // Fetch org members
    let membersQuery = supabaseAdmin
      .from('organization_members')
      .select('id, user_id, organization_id, role, is_active, permissions, created_at, updated_at')
      .eq('organization_id', organizationId);

    if (roleFilter) {
      membersQuery = membersQuery.eq('role', roleFilter);
    }
    if (!includeInactive) {
      membersQuery = membersQuery.eq('is_active', true);
    }

    const { data: members, error: membersError } = await membersQuery.order('created_at', { ascending: false });
    if (membersError) throw membersError;

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ members: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch organization name
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    const orgName = orgData?.name || null;

    // Fetch profiles for full_name + avatar
    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    // Check which users are system admins
    const { data: systemAdmins } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .in('user_id', userIds);

    const systemAdminSet = new Set((systemAdmins || []).map(r => r.user_id));

    // Fetch emails from auth.users (service role only)
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    
    const emailMap = new Map<string, string>();
    if (authUsersData?.users) {
      for (const u of authUsersData.users) {
        if (userIds.includes(u.id)) {
          emailMap.set(u.id, u.email || '');
        }
      }
    }

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    );

    // Merge data
    const result = members.map(m => ({
      id: m.id,
      user_id: m.user_id,
      organization_id: m.organization_id,
      organization_name: systemAdminSet.has(m.user_id) ? "Todas" : orgName,
      role: m.role,
      is_active: m.is_active,
      permissions: m.permissions,
      created_at: m.created_at,
      updated_at: m.updated_at,
      full_name: profileMap.get(m.user_id)?.full_name || null,
      avatar_url: profileMap.get(m.user_id)?.avatar_url || null,
      email: emailMap.get(m.user_id) || null,
    }));

    return new Response(JSON.stringify({ members: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in admin-list-members:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
