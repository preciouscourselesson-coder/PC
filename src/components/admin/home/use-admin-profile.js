// src/components/admin/adminHome/useAdminProfile.js
//
// Custom hook khusus untuk mengambil profil admin yang sedang login
// (dipakai untuk sapaan "Good Morning, Mr./Ms. ..." di header). Dipisah
// dari useAdminHomeData karena scope-nya beda: ini soal siapa yang
// login, bukan data dashboard.
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

export function useAdminProfile() {
  const [adminProfile, setAdminProfile] = useState(null);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, gender')
        .eq('id', user.id)
        .maybeSingle();
      setAdminProfile(data || null);
    };
    fetchAdminProfile();
  }, []);

  return { adminProfile };
}
