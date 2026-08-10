import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabaseClient';
import { RIWAYAT_TABLE } from '../constants';

// Kelola state seleksi item + riwayat perubahannya
export const useRiwayat = () => {
  const [selectedId, setSelectedId] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

  const loadRiwayat = useCallback(async (pricelistId) => {
    setLoadingRiwayat(true);
    const { data, error } = await supabase
      .from(RIWAYAT_TABLE)
      .select('*')
      .eq('pricelist_id', pricelistId)
      .order('created_at', { ascending: false });
    if (!error) setRiwayat(data || []);
    setLoadingRiwayat(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadRiwayat(selectedId);
    else setRiwayat([]);
  }, [selectedId, loadRiwayat]);

  return { selectedId, setSelectedId, riwayat, loadingRiwayat, loadRiwayat };
};
