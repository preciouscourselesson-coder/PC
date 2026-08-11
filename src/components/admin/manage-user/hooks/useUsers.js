// Hook untuk memuat daftar user dari tabel 'profiles' dan mengelola state loading/error-nya.
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../../supabaseClient';

export default function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status, gender, kelas, created_at, mapel, referral_code')
      .order('created_at', { ascending: false });

    setLoading(false);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      setError('Gagal memuat daftar user. Silakan muat ulang halaman.');
      return;
    }
    setUsers(data || []);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return { users, setUsers, loading, error, fetchUsers };
}
