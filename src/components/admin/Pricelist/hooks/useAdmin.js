import { useState, useEffect } from 'react';
import { supabase } from '../../../../supabaseClient';

// Ambil admin yang sedang login (untuk created_by/updated_by & label di riwayat perubahan)
export const useAdmin = () => {
  const [adminId, setAdminId] = useState(null);
  const [adminNama, setAdminNama] = useState('Admin');

  useEffect(() => {
    const loadAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;
      setAdminId(uid);
      if (uid) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle();
        setAdminNama(data?.full_name || 'Admin');
      }
    };
    loadAdmin();
  }, []);

  return { adminId, adminNama };
};
