// src/components/teacher/TeacherContent.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  green: '#2d6a4f',
  dark: '#171411',
  gray: '#444242',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  danger: '#e74c3c',
  dangerBg: '#fff0f0',
};

const MOBILE_BREAKPOINT = 768;

// Hook kecil untuk deteksi ukuran layar (mobile vs desktop)
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
};

const btnPrimary = {
  padding: '9px 18px',
  borderRadius: '10px',
  border: 'none',
  background: C.gold,
  color: C.white,
  fontWeight: 'bold',
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnGhost = {
  padding: '8px 14px',
  borderRadius: '10px',
  border: `1px solid ${C.border}`,
  background: C.white,
  color: C.gray,
  fontSize: '0.85rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: `1.5px solid ${C.border}`,
  fontSize: '16px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '70px',
  resize: 'vertical',
};

const TeacherContent = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState(null);

  const [babList, setBabList] = useState([]); // [{...bab, sub_bab_ajar: [...]}]
  const [expanded, setExpanded] = useState({}); // { [babId]: boolean }

  // form tambah bab baru (sekaligus mapel & sub bab pertama)
  const [mapelBaru, setMapelBaru] = useState('');
  const [judulBabBaru, setJudulBabBaru] = useState('');
  const [judulSubBabBaru, setJudulSubBabBaru] = useState('');
  const [deskripsiSubBabBaru, setDeskripsiSubBabBaru] = useState('');
  const [addingBab, setAddingBab] = useState(false);

  // form tambah sub bab (per bab)
  const [subForm, setSubForm] = useState({}); // { [babId]: { judul, deskripsi } }
  const [addingSubFor, setAddingSubFor] = useState(null);

  // edit state
  const [editingBabId, setEditingBabId] = useState(null);
  const [editBabValue, setEditBabValue] = useState('');
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSubValue, setEditSubValue] = useState({ judul: '', deskripsi: '' });

  const fetchBahanAjar = useCallback(async (uid) => {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase
      .from('bab_ajar')
      .select('*, sub_bab_ajar(*)')
      .eq('guru_id', uid)
      .order('urutan', { ascending: true })
      .order('urutan', { referencedTable: 'sub_bab_ajar', ascending: true });

    if (error) {
      console.error(error);
      setErrorMsg('Gagal memuat bahan ajar. Pastikan tabel sudah dibuat di Supabase.');
      setBabList([]);
    } else {
      setBabList(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveUser = async () => {
      // Coba getSession dulu
      const { data: { session } } = await supabase.auth.getSession();
      let uid = session?.user?.id;

      // Fallback: kalau session belum siap, coba getUser langsung
      if (!uid) {
        const { data: userData } = await supabase.auth.getUser();
        uid = userData?.user?.id;
      }

      if (!isMounted) return;

      if (uid) {
        setUserId(uid);
        fetchBahanAjar(uid);
      } else {
        setLoading(false);
        setErrorMsg('Sesi login tidak ditemukan. Silakan login ulang.');
      }
    };

    resolveUser();

    // Pastikan userId ter-update begitu status auth berubah/siap
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id;
      if (uid && isMounted) {
        setUserId(uid);
        fetchBahanAjar(uid);
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [fetchBahanAjar]);

  // ---------- BAB ----------
  const handleTambahBab = async () => {
    if (!mapelBaru.trim() || !judulBabBaru.trim()) return;

    // Ambil ulang user id secara langsung untuk menghindari race condition
    let uid = userId;
    if (!uid) {
      const { data: userData } = await supabase.auth.getUser();
      uid = userData?.user?.id;
      if (uid) setUserId(uid);
    }
    if (!uid) {
      setErrorMsg('Tidak bisa menambahkan bab: sesi login tidak ditemukan. Silakan refresh atau login ulang.');
      return;
    }

    setAddingBab(true);
    setErrorMsg('');
    const urutan = babList.length > 0 ? Math.max(...babList.map(b => b.urutan || 0)) + 1 : 1;
    const { data, error } = await supabase
      .from('bab_ajar')
      .insert([{ guru_id: uid, mapel: mapelBaru.trim(), judul_bab: judulBabBaru.trim(), urutan }])
      .select('*, sub_bab_ajar(*)');

    if (error) {
      console.error(error);
      setErrorMsg('Gagal menambahkan bab baru.');
      setAddingBab(false);
      return;
    }

    const babBaru = data?.[0];

    // Kalau judul sub bab pertama diisi, langsung buat sub bab-nya juga
    if (babBaru && judulSubBabBaru.trim()) {
      const { data: subData, error: subError } = await supabase
        .from('sub_bab_ajar')
        .insert([{
          bab_id: babBaru.id,
          judul_sub_bab: judulSubBabBaru.trim(),
          deskripsi: deskripsiSubBabBaru.trim(),
          urutan: 1,
        }])
        .select();

      if (subError) {
        console.error(subError);
        setErrorMsg('Bab berhasil dibuat, tetapi gagal menambahkan sub bab pertama.');
      } else if (subData) {
        babBaru.sub_bab_ajar = subData;
      }
    }

    if (babBaru) {
      setBabList(prev => [...prev, babBaru]);
      setExpanded(prev => ({ ...prev, [babBaru.id]: true }));
    }

    setMapelBaru('');
    setJudulBabBaru('');
    setJudulSubBabBaru('');
    setDeskripsiSubBabBaru('');
    setAddingBab(false);
  };

  const handleEditBab = (bab) => {
    setEditingBabId(bab.id);
    setEditBabValue(bab.judul_bab);
  };

  const handleSimpanEditBab = async (babId) => {
    if (!editBabValue.trim()) return;
    const { error } = await supabase
      .from('bab_ajar')
      .update({ judul_bab: editBabValue.trim() })
      .eq('id', babId);

    if (error) {
      console.error(error);
      setErrorMsg('Gagal menyimpan perubahan bab.');
    } else {
      setBabList(prev => prev.map(b => b.id === babId ? { ...b, judul_bab: editBabValue.trim() } : b));
      setEditingBabId(null);
    }
  };

  const handleHapusBab = async (babId) => {
    if (!window.confirm('Hapus bab ini beserta seluruh sub bab di dalamnya?')) return;
    const { error } = await supabase.from('bab_ajar').delete().eq('id', babId);
    if (error) {
      console.error(error);
      setErrorMsg('Gagal menghapus bab.');
    } else {
      setBabList(prev => prev.filter(b => b.id !== babId));
    }
  };

  // ---------- SUB BAB ----------
  const handleSubFormChange = (babId, field, value) => {
    setSubForm(prev => ({
      ...prev,
      [babId]: { ...prev[babId], [field]: value },
    }));
  };

  const handleTambahSubBab = async (babId) => {
    const form = subForm[babId] || {};
    if (!form.judul?.trim()) return;
    setAddingSubFor(babId);
    setErrorMsg('');

    const bab = babList.find(b => b.id === babId);
    const existingSub = bab?.sub_bab_ajar || [];
    const urutan = existingSub.length > 0 ? Math.max(...existingSub.map(s => s.urutan || 0)) + 1 : 1;

    const { data, error } = await supabase
      .from('sub_bab_ajar')
      .insert([{
        bab_id: babId,
        judul_sub_bab: form.judul.trim(),
        deskripsi: form.deskripsi?.trim() || '',
        urutan,
      }])
      .select();

    if (error) {
      console.error(error);
      setErrorMsg('Gagal menambahkan sub bab.');
    } else if (data) {
      setBabList(prev => prev.map(b =>
        b.id === babId ? { ...b, sub_bab_ajar: [...(b.sub_bab_ajar || []), ...data] } : b
      ));
      setSubForm(prev => ({ ...prev, [babId]: { judul: '', deskripsi: '' } }));
    }
    setAddingSubFor(null);
  };

  const handleEditSub = (sub) => {
    setEditingSubId(sub.id);
    setEditSubValue({ judul: sub.judul_sub_bab, deskripsi: sub.deskripsi || '' });
  };

  const handleSimpanEditSub = async (babId, subId) => {
    if (!editSubValue.judul.trim()) return;
    const { error } = await supabase
      .from('sub_bab_ajar')
      .update({ judul_sub_bab: editSubValue.judul.trim(), deskripsi: editSubValue.deskripsi.trim() })
      .eq('id', subId);

    if (error) {
      console.error(error);
      setErrorMsg('Gagal menyimpan perubahan sub bab.');
    } else {
      setBabList(prev => prev.map(b => b.id === babId ? {
        ...b,
        sub_bab_ajar: b.sub_bab_ajar.map(s => s.id === subId
          ? { ...s, judul_sub_bab: editSubValue.judul.trim(), deskripsi: editSubValue.deskripsi.trim() }
          : s)
      } : b));
      setEditingSubId(null);
    }
  };

  const handleHapusSub = async (babId, subId) => {
    if (!window.confirm('Hapus sub bab ini?')) return;
    const { error } = await supabase.from('sub_bab_ajar').delete().eq('id', subId);
    if (error) {
      console.error(error);
      setErrorMsg('Gagal menghapus sub bab.');
    } else {
      setBabList(prev => prev.map(b => b.id === babId
        ? { ...b, sub_bab_ajar: b.sub_bab_ajar.filter(s => s.id !== subId) }
        : b));
    }
  };

  const toggleExpand = (babId) => {
    setExpanded(prev => ({ ...prev, [babId]: !prev[babId] }));
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: C.gray }}>Memuat bahan ajar...</div>;
  }

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: C.dark, fontSize: '1.3rem' }}>📚 Bahan Ajar</h2>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.9rem' }}>
          Susun bahan ajar Anda mulai dari bab hingga sub bab.
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: C.dangerBg, color: C.danger, padding: '10px 14px', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* Form tambah mapel + bab + sub bab (kolom kanan) */}
      <div style={{
        order: 2, width: isMobile ? '100%' : '340px', flexShrink: 0, background: C.white,
        border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: isMobile ? '1rem' : '1.2rem',
        position: isMobile ? 'static' : 'sticky', top: 0, boxSizing: 'border-box',
      }}>
        <div style={{ fontWeight: 'bold', color: C.dark, marginBottom: '10px', fontSize: '0.95rem' }}>+ Tambah Bahan Ajar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: C.gray, display: 'block', marginBottom: '4px' }}>Nama Mapel</label>
            <input
              style={inputStyle}
              placeholder="mis. Matematika"
              value={mapelBaru}
              onChange={e => setMapelBaru(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: C.gray, display: 'block', marginBottom: '4px' }}>Bab</label>
            <input
              style={inputStyle}
              placeholder="mis. Bab 1 - Pengenalan"
              value={judulBabBaru}
              onChange={e => setJudulBabBaru(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: C.gray, display: 'block', marginBottom: '4px' }}>Sub Bab (opsional, bisa ditambah lagi nanti)</label>
            <input
              style={{ ...inputStyle, marginBottom: '8px' }}
              placeholder="mis. 1.1 Latar Belakang"
              value={judulSubBabBaru}
              onChange={e => setJudulSubBabBaru(e.target.value)}
            />
            <textarea
              style={textareaStyle}
              placeholder="Deskripsi / catatan sub bab (opsional)"
              value={deskripsiSubBabBaru}
              onChange={e => setDeskripsiSubBabBaru(e.target.value)}
            />
          </div>
          <button
            style={{ ...btnPrimary, alignSelf: isMobile ? 'stretch' : 'flex-start', textAlign: 'center' }}
            onClick={handleTambahBab}
            disabled={addingBab || !mapelBaru.trim() || !judulBabBaru.trim()}
          >
            {addingBab ? 'Menyimpan...' : '+ Simpan'}
          </button>
        </div>
      </div>

      {/* Daftar bab, dikelompokkan per mapel (kolom kiri) */}
      <div style={{ order: 1, flex: isMobile ? '1 1 100%' : '1 1 420px', minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
      {babList.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.gray, padding: '2rem', background: C.white, borderRadius: '16px', border: `1.5px dashed ${C.border}` }}>
          Belum ada bahan ajar. Tambahkan mapel & bab pertama Anda di samping.
        </div>
      ) : (
        Object.entries(
          babList.reduce((groups, bab) => {
            const key = bab.mapel?.trim() || 'Tanpa Mapel';
            (groups[key] = groups[key] || []).push(bab);
            return groups;
          }, {})
        ).map(([mapel, babGroup]) => (
          <div key={mapel} style={{ marginBottom: '1.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.05rem' }}>📘</span>
              <h3 style={{ margin: 0, color: C.green, fontSize: '1.05rem' }}>{mapel}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {babGroup.map((bab, idx) => (
            <div key={bab.id} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
              {/* Header bab */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px',
                padding: isMobile ? '12px' : '14px 16px', background: C.cream, flexWrap: 'wrap',
              }}>
                <button onClick={() => toggleExpand(bab.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: C.gray, flexShrink: 0 }}>
                  {expanded[bab.id] ? '▾' : '▸'}
                </button>

                {editingBabId === bab.id ? (
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', flex: 1, minWidth: isMobile ? '100%' : 'auto' }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={editBabValue}
                      onChange={e => setEditBabValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSimpanEditBab(bab.id)}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ ...btnPrimary, flex: isMobile ? 1 : 'initial' }} onClick={() => handleSimpanEditBab(bab.id)}>Simpan</button>
                      <button style={{ ...btnGhost, flex: isMobile ? 1 : 'initial' }} onClick={() => setEditingBabId(null)}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span style={{ flex: '1 1 auto', minWidth: isMobile ? '100%' : 0, fontWeight: 'bold', color: C.dark, fontSize: isMobile ? '0.95rem' : '1rem', wordBreak: 'break-word' }}>
                      {idx + 1}. {bab.judul_bab}
                    </span>
                    <span style={{ color: C.gray, fontSize: '0.8rem' }}>
                      {(bab.sub_bab_ajar || []).length} sub bab
                    </span>
                    <div style={{ display: 'flex', gap: '6px', marginLeft: isMobile ? 0 : 'auto' }}>
                      <button style={btnGhost} onClick={() => handleEditBab(bab)}>✏️ Edit</button>
                      <button style={{ ...btnGhost, color: C.danger }} onClick={() => handleHapusBab(bab.id)}>🗑️ Hapus</button>
                    </div>
                  </>
                )}
              </div>

              {/* Isi bab: sub bab */}
              {expanded[bab.id] && (
                <div style={{ padding: isMobile ? '12px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(bab.sub_bab_ajar || []).length === 0 && (
                    <div style={{ color: C.gray, fontSize: '0.85rem', fontStyle: 'italic' }}>Belum ada sub bab.</div>
                  )}

                  {(bab.sub_bab_ajar || [])
                    .slice()
                    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
                    .map((sub, sidx) => (
                    <div key={sub.id} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 14px' }}>
                      {editingSubId === sub.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            style={inputStyle}
                            value={editSubValue.judul}
                            onChange={e => setEditSubValue(v => ({ ...v, judul: e.target.value }))}
                            placeholder="Judul sub bab"
                          />
                          <textarea
                            style={textareaStyle}
                            value={editSubValue.deskripsi}
                            onChange={e => setEditSubValue(v => ({ ...v, deskripsi: e.target.value }))}
                            placeholder="Deskripsi / catatan (opsional)"
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={btnPrimary} onClick={() => handleSimpanEditSub(bab.id, sub.id)}>Simpan</button>
                            <button style={btnGhost} onClick={() => setEditingSubId(null)}>Batal</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.92rem' }}>
                              {idx + 1}.{sidx + 1} {sub.judul_sub_bab}
                            </div>
                            {sub.deskripsi && (
                              <div style={{ color: C.gray, fontSize: '0.85rem', marginTop: '4px' }}>{sub.deskripsi}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button style={{ ...btnGhost, padding: isMobile ? '8px 12px' : btnGhost.padding }} onClick={() => handleEditSub(sub)}>✏️</button>
                            <button style={{ ...btnGhost, color: C.danger, padding: isMobile ? '8px 12px' : btnGhost.padding }} onClick={() => handleHapusSub(bab.id, sub.id)}>🗑️</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Form tambah sub bab */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', paddingTop: '10px', borderTop: `1px dashed ${C.border}` }}>
                    <input
                      style={inputStyle}
                      placeholder="Judul sub bab baru"
                      value={subForm[bab.id]?.judul || ''}
                      onChange={e => handleSubFormChange(bab.id, 'judul', e.target.value)}
                    />
                    <textarea
                      style={textareaStyle}
                      placeholder="Deskripsi / catatan (opsional)"
                      value={subForm[bab.id]?.deskripsi || ''}
                      onChange={e => handleSubFormChange(bab.id, 'deskripsi', e.target.value)}
                    />
                    <button
                      style={{ ...btnPrimary, alignSelf: 'flex-start' }}
                      onClick={() => handleTambahSubBab(bab.id)}
                      disabled={addingSubFor === bab.id || !subForm[bab.id]?.judul?.trim()}
                    >
                      {addingSubFor === bab.id ? 'Menyimpan...' : '+ Tambah Sub Bab'}
                    </button>
                  </div>
                </div>
              )}
            </div>
              ))}
            </div>
          </div>
        ))
      )}
      </div>

      </div>
    </div>
  );
};

export default TeacherContent;