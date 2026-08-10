// Pemanggilan Supabase Edge Function 'create-user'.
// Catatan path: sesuaikan kedalaman '../../../../' ini dengan lokasi asli
// folder AdminManageUser.js relatif terhadap supabaseClient.js di project Anda.
import { supabase } from '../../../../supabaseClient';

export const createUserViaEdgeFunction = async ({ full_name, email, password, role, status, gender, kelas }) => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error: fnError } = await supabase.functions.invoke('create-user', {
    body: { full_name, email, password, role, status, gender, kelas: role === 'student' ? (kelas || null) : null },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (fnError) throw new Error(fnError.message || 'Gagal memanggil fungsi pembuatan user.');
  if (data?.error) throw new Error(data.error);
  return data;
};
