import { useState, useEffect } from 'react';
import { supabase } from '../../../../supabaseClient';

// Ambil user login. Dipisah jadi hook sendiri supaya komponen yang memakainya
// tidak perlu tahu detail cara mengambil sesi dari supabase.
export const useCurrentUserId = () => {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    getUser();
  }, []);

  return userId;
};
