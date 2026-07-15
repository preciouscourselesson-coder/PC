import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold:   '#b4964b',
  green:  '#2d6a4f',
  dark:   '#171411',
  gray:   '#444242',
  cream:  '#f7f6f0',
  white:  '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  red:    '#e74c3c',
  redBg:  '#fff0f0',
};

const FILTERS = [
  { key: 'semua',    label: 'Semua' },
  { key: 'pending',  label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
];

const Stars = ({ rating }) => (
  <div style={{ display: 'flex', gap: '2px' }}>
    {[1, 2, 3, 4, 5].map(n => (
      <span key={n} style={{ fontSize: '0.95rem', color: n <= rating ? C.gold : '#ddd' }}>★</span>
    ))}
  </div>
);

const AdminTestimoni = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('semua');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('testimoni')
      .select('*')
      .order('created_at', { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError('Gagal memuat data testimoni. Silakan refresh halaman.');
      return;
    }
    setItems(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    setActionId(id);
    const { error: updateError } = await supabase
      .from('testimoni')
      .update({ approved: true })
      .eq('id', id);
    setActionId(null);

    if (updateError) {
      setError('Gagal menyetujui testimoni. Coba lagi.');
      return;
    }
    setItems(prev => prev.map(it => it.id === id ? { ...it, approved: true } : it));
  };

  const handleUnapprove = async (id) => {
    setActionId(id);
    const { error: updateError } = await supabase
      .from('testimoni')
      .update({ approved: false })
      .eq('id', id);
    setActionId(null);

    if (updateError) {
      setError('Gagal membatalkan persetujuan. Coba lagi.');
      return;
    }
    setItems(prev => prev.map(it => it.id === id ? { ...it, approved: false } : it));
  };

  const handleDelete = async (item) => {
    setActionId(item.id);

    // Hapus foto dari storage kalau ada
    if (item.foto_url) {
      try {
        const path = item.foto_url.split('/foto-testimoni/')[1];
        if (path) {
          await supabase.storage.from('foto-testimoni').remove([path]);
        }
      } catch (_) {
        // Kalau gagal hapus foto, tetap lanjutkan hapus data
      }
    }

    const { error: deleteError } = await supabase
      .from('testimoni')
      .delete()
      .eq('id', item.id);

    setActionId(null);
    setConfirmDelete(null);

    if (deleteError) {
      setError('Gagal menghapus testimoni. Coba lagi.');
      return;
    }
    setItems(prev => prev.filter(it => it.id !== item.id));
  };

  const filtered = useMemo(() => {
    let result = items;
    if (filter === 'pending') result = result.filter(it => !it.approved);
    if (filter === 'approved') result = result.filter(it => it.approved);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(it =>
        it.nama?.toLowerCase().includes(q) ||
        it.isi?.toLowerCase().includes(q) ||
        it.label?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filter, search]);

  const counts = useMemo(() => ({
    semua: items.length,
    pending: items.filter(it => !it.approved).length,
    approved: items.filter(it => it.approved).length,
  }), [items]);

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', color: C.dark, margin: '0 0 4px', fontWeight: 'bold' }}>Testimoni</h1>
          <p style={{ color: C.gray, margin: 0, fontSize: '0.9rem' }}>
            Tinjau, setujui, atau hapus testimoni yang dikirim oleh pengunjung.
          </p>
        </div>
        <input
          type="text"
          placeholder="Cari nama, isi, atau label..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
            fontSize: '0.9rem', fontFamily: 'inherit', color: C.dark, background: C.white,
            outline: 'none', minWidth: '240px', boxSizing: 'border-box'
          }}
          onFocus={e => e.target.style.borderColor = C.gold}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '8px 18px', borderRadius: '40px', fontSize: '0.88rem', fontWeight: 'bold',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            border: `1.5px solid ${filter === f.key ? C.gold : C.border}`,
            background: filter === f.key ? C.gold : C.white,
            color: filter === f.key ? C.white : C.gray,
          }}>
            {f.label} <span style={{ opacity: 0.75, fontWeight: 'normal' }}>({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: C.redBg, border: `1.5px solid ${C.red}`, borderRadius: '12px',
          padding: '10px 16px', color: C.red, fontSize: '0.88rem', marginBottom: '1.5rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.gray }}>Memuat data testimoni...</div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '3rem', color: C.gray,
          background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`
        }}>
          Belum ada testimoni {filter !== 'semua' ? `pada kategori ini` : ''}.
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map(item => (
          <div key={item.id} style={{
            background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`,
            padding: '1.2rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start'
          }}>
            {/* Foto */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
              background: C.cream, border: `2px solid ${C.border}`, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {item.foto_url
                ? <img src={item.foto_url} alt={item.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '1.3rem' }}>👤</span>
              }
            </div>

            {/* Konten */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.98rem' }}>{item.nama}</span>
                {item.label && (
                  <span style={{
                    fontSize: '0.75rem', color: C.gold, background: C.goldBg,
                    padding: '3px 10px', borderRadius: '40px', fontWeight: 'bold'
                  }}>
                    {item.label}
                  </span>
                )}
                <span style={{
                  fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '40px',
                  background: item.approved ? 'rgba(45,106,79,0.1)' : 'rgba(180,150,75,0.15)',
                  color: item.approved ? C.green : C.gold
                }}>
                  {item.approved ? 'Disetujui' : 'Menunggu'}
                </span>
              </div>

              <Stars rating={item.rating} />

              <p style={{ color: C.gray, fontSize: '0.9rem', lineHeight: 1.6, margin: '8px 0 6px' }}>
                {item.isi}
              </p>

              <span style={{ color: '#999', fontSize: '0.76rem' }}>
                {item.created_at ? new Date(item.created_at).toLocaleString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : ''}
              </span>
            </div>

            {/* Aksi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              {!item.approved ? (
                <button onClick={() => handleApprove(item.id)} disabled={actionId === item.id} style={{
                  background: C.green, border: 'none', color: C.white, fontWeight: 'bold',
                  fontSize: '0.82rem', padding: '8px 16px', borderRadius: '40px',
                  cursor: actionId === item.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  opacity: actionId === item.id ? 0.6 : 1, whiteSpace: 'nowrap'
                }}>
                  ✓ Setujui
                </button>
              ) : (
                <button onClick={() => handleUnapprove(item.id)} disabled={actionId === item.id} style={{
                  background: C.white, border: `1.5px solid ${C.border}`, color: C.gray, fontWeight: 'bold',
                  fontSize: '0.82rem', padding: '8px 16px', borderRadius: '40px',
                  cursor: actionId === item.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  opacity: actionId === item.id ? 0.6 : 1, whiteSpace: 'nowrap'
                }}>
                  Batalkan
                </button>
              )}

              {confirmDelete === item.id ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleDelete(item)} disabled={actionId === item.id} style={{
                    background: C.red, border: 'none', color: C.white, fontWeight: 'bold',
                    fontSize: '0.78rem', padding: '8px 12px', borderRadius: '40px',
                    cursor: 'pointer', fontFamily: 'inherit', flex: 1
                  }}>
                    Yakin
                  </button>
                  <button onClick={() => setConfirmDelete(null)} style={{
                    background: 'none', border: `1.5px solid ${C.border}`, color: C.gray, fontWeight: 'bold',
                    fontSize: '0.78rem', padding: '8px 12px', borderRadius: '40px',
                    cursor: 'pointer', fontFamily: 'inherit', flex: 1
                  }}>
                    Batal
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(item.id)} style={{
                  background: 'none', border: 'none', color: C.red, fontWeight: 'bold',
                  fontSize: '0.82rem', padding: '8px 16px', borderRadius: '40px',
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
                }}>
                  🗑️ Hapus
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTestimoni;