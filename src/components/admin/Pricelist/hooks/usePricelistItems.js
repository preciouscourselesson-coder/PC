import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabaseClient';
import { PRICELIST_TABLE } from '../constants';

// Ambil seluruh data pricelist -- jumlah data kecil, filter/paginasi dilakukan di client
export const usePricelistItems = () => {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState('');

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    setItemsError('');
    const { data, error } = await supabase
      .from(PRICELIST_TABLE)
      .select('*')
      .order('kelas', { ascending: true })
      .order('program', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      setItemsError('Gagal memuat pricelist: ' + error.message);
    } else {
      setItems(data || []);
    }
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return { items, setItems, loadingItems, itemsError, loadItems };
};
