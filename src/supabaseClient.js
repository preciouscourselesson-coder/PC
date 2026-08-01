import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Supabase belum dikonfigurasi. Pastikan REACT_APP_SUPABASE_URL dan ' +
    'REACT_APP_SUPABASE_ANON_KEY sudah diisi di file .env, lalu restart dev server.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);