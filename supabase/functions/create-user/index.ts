// supabase/functions/create-user/index.ts
//
// Edge Function untuk membuat user baru dari sisi server, menggunakan service role key.
// Ini menghindari masalah "admin ter-logout" yang terjadi kalau supabase.auth.signUp()
// dipanggil langsung dari client (karena signUp mengganti sesi aktif menjadi user baru).
//
// Deploy dengan:
//   supabase functions deploy create-user
//
// Pastikan environment variable berikut sudah diset di Supabase Dashboard
// (Project Settings -> Edge Functions -> Secrets), BUKAN dikirim dari client:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Pastikan yang memanggil function ini benar-benar admin yang sudah login
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Tidak ada token otorisasi." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Token tidak valid." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerData.user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Hanya admin yang boleh membuat user." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Ambil data user baru dari body request
    const { email, password, full_name, role, status } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Data tidak lengkap (email, password, full_name, role wajib diisi)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password minimal 6 karakter." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const allowedRoles = ["student", "teacher", "parent", "admin"];
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: `Role "${role}" tidak dikenali.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Buat user di auth.users tanpa mengganggu sesi admin yang memanggil
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // langsung confirmed, tidak perlu verifikasi email
      user_metadata: { full_name, role },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Set role & status yang benar di profiles (trigger mungkin sudah insert baris dasar)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name, role, status: status || "approved" })
      .eq("id", newUser.user.id);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});