// Supabase Edge Function: admin-login-as
// Deploy as: supabase functions deploy admin-login-as
//
// Purpose: lets an authenticated ADMIN generate a one-time magic-link so they
// can open a session as another user (teacher/student) in a new tab, without
// needing that user's password.
//
// Required secrets (set with `supabase secrets set`):
//   SUPABASE_URL                (auto-available in most projects)
//   SUPABASE_ANON_KEY           (auto-available)
//   SUPABASE_SERVICE_ROLE_KEY   (from Project Settings > API — keep secret!)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');

    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Tidak terautentikasi.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Client scoped to the caller, used only to verify who is calling.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(jwt);
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Sesi tidak valid.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client (service role) — required to check role and generate links.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: callerProfileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfileErr || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Hanya admin yang dapat menggunakan fitur ini.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, redirect_to } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id wajib diisi.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetProfile, error: targetErr } = await adminClient
      .from('profiles')
      .select('email, role, status, full_name')
      .eq('id', user_id)
      .single();

    if (targetErr || !targetProfile) {
      return new Response(JSON.stringify({ error: 'User tujuan tidak ditemukan.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['teacher', 'student'].includes(targetProfile.role)) {
      return new Response(JSON.stringify({ error: 'Login-as hanya diizinkan untuk akun Guru atau Siswa.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetProfile.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Akun ini belum disetujui.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetProfile.email,
      options: redirect_to ? { redirectTo: redirect_to } : undefined,
    });

    if (linkErr) {
      return new Response(JSON.stringify({ error: linkErr.message || 'Gagal membuat link login.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional but recommended: log who impersonated whom, for auditing.
    await adminClient.from('admin_login_as_logs').insert({
      admin_id: caller.id,
      target_user_id: user_id,
      target_email: targetProfile.email,
    }).select().maybeSingle();

    return new Response(
      JSON.stringify({ action_link: linkData.properties.action_link }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Terjadi kesalahan.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/*
Optional audit table (run once in the SQL editor):

create table if not exists admin_login_as_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  target_user_id uuid references profiles(id),
  target_email text,
  created_at timestamptz default now()
);

If you don't want logging, just delete the `.from('admin_login_as_logs').insert(...)` block above.
*/