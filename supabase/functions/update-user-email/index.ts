import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

type Profile = {
  user_id: string;
  role: string;
  status: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'missing_environment' }, 500);
    }

    const authorization = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!userId || !isValidEmail(email)) {
      return jsonResponse({ error: 'invalid_payload' }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const [{ data: callerProfile, error: callerError }, { data: targetProfile, error: targetError }] = await Promise.all([
      adminClient.from('profiles').select('user_id, role, status').eq('user_id', user.id).single(),
      adminClient.from('profiles').select('user_id, role, status').eq('user_id', userId).single(),
    ]);

    if (callerError || !callerProfile) {
      return jsonResponse({ error: 'caller_profile_not_found' }, 403);
    }

    const caller = callerProfile as Profile;
    if (caller.role !== 'super_admin' || caller.status !== 'active') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    if (targetError || !targetProfile) {
      return jsonResponse({ error: 'target_profile_not_found' }, 404);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });

    if (updateError) {
      console.error('update-user-email failed', updateError);
      return jsonResponse({ error: 'email_update_failed' }, 400);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('update-user-email internal error', error);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
});
