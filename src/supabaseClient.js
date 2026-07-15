import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqgjufvsjskdtijyfqqi.supabase.co';      
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZ2p1ZnZzanNrZHRpanlmcXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Nzg2MTYsImV4cCI6MjA5NzE1NDYxNn0.RwGBvEH639kQbyE0vXNDyEJ3Tfsrar-_64oj_QgPTn0';                    // ganti dengan anon key kamu

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);