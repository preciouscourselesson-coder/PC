// src/components/student/StudentHome.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  goldBg: '#f6efdc',
  green: '#2d6a4f',
  greenBg: '#e4efe9',
  red: '#b3423a',
  redBg: '#fbeceb',
  dark: '#171411',
  gray: '#444242',
  grayLight: '#8a8782',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
};

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const formatJam = (t) => (t ? t.slice(0, 5) : '');

const StatusPill = ({ status }) => {
  const map = {
    menunggu_persetujuan: { label: 'Menunggu Persetujuan', bg: C.goldBg, color: C.gold },
    disetujui_siswa: { label: 'Menunggu Siswa Lain', bg: C.goldBg, color: C.gold },
    disetujui_menunggu_admin: { label: 'Disetujui, Menunggu Admin', bg: C.greenBg, color: C.green },
    ditolak: { label: 'Ditolak', bg: C.redBg, color: C.red },
    disetujui_admin: { label: 'Disetujui Admin', bg: C.greenBg, color: C.green },
    ditolak_admin: { label: 'Ditolak Admin', bg: C.redBg, color: C.red },
  };
  const s = map[status] || { label: status, bg: C.cream, color: C.gray };
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

const STATUS_SISWA_SETUJU = ['disetujui_siswa', 'disetujui_menunggu_admin', 'disetujui_admin'];

const StudentHome = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jadwalList, setJadwalList] = useState([]);
  const [pengajuanSaya, setPengajuanSaya] = useState([]);
  const [pengajuanMasuk, setPengajuanMasuk] = useState([]);
  const [materiRequestList, setMateriRequestList] = useState([]);
  const [guruOptions, setGuruOptions] = useState([]);
  const [guruMap, setGuruMap] = useState({});
  const [ujianTerdekatList, setUjianTerdekatList] = useState([]);
  const [mapelOptions, setMapelOptions] = useState([]);
  const [babOptions, setBabOptions] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  const [formData, setFormData] = useState({
    hari_baru: '',
    jam_mulai_baru: '',
    jam_selesai_baru: '',
    is_temporary_baru: false,
    tanggal_temporary_baru: '',
    alasan: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [materiForm, setMateriForm] = useState({
    guruId: '',
    judul: '',
    deskripsi: '',
  });
  const [submittingMateri, setSubmittingMateri] = useState(false);

  const [showTugasForm, setShowTugasForm] = useState(false);
  const [tugasForm, setTugasForm] = useState({
    guruId: '',
    mapelId: '',
    babId: '',
    materi: '',
    tanggal: '',
    deskripsi: '',
  });
  const [submittingTugas, setSubmittingTugas] = useState(false);

  const [respondingId, setRespondingId] = useState(null);
  const [confirmTolakId, setConfirmTolakId] = useState(null);

  const getAggregateStatus = (rows) => {
    // Bukan batch (cuma 1 siswa) -> tampilkan status aslinya langsung,
    // tidak perlu logika agregat.
    if (rows.length === 1) return rows[0].status;
    if (rows.some(r => r.status === 'ditolak')) return 'ditolak';
    if (rows.some(r => r.status === 'ditolak_admin')) return 'ditolak_admin';
    if (rows.every(r => r.status === 'disetujui_admin')) return 'disetujui_admin';
    if (rows.every(r => r.status === 'disetujui_menunggu_admin')) return 'disetujui_menunggu_admin';
    if (rows.some(r => STATUS_SISWA_SETUJU.includes(r.status))) return 'disetujui_siswa';
    return 'menunggu_persetujuan';
  };

  const pengajuanSayaGrouped = useMemo(() => {
    const batchMap = new Map();
    const items = [];
    pengajuanSaya.forEach(p => {
      if (p.batch_id) {
        if (!batchMap.has(p.batch_id)) {
          const group = { id: p.batch_id, isBatch: true, rows: [], created_at: p.created_at };
          batchMap.set(p.batch_id, group);
          items.push(group);
        }
        batchMap.get(p.batch_id).rows.push(p);
      } else {
        items.push({ id: p.id, isBatch: false, rows: [p], created_at: p.created_at });
      }
    });
    return items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [pengajuanSaya]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Good Morning' : hour < 15 ? 'Good Afternoon' : hour < 18 ? 'Good Evening' : 'Good Night';
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dateStr = now.toLocaleDateString('id-ID', options).replace(/,/, '').replace(/\b\w/g, l => l.toUpperCase());

  const waktuLalu = (isoDate) => {
    if (!isoDate) return '';
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const menit = Math.floor(diffMs / 60000);
    if (menit < 1) return 'Baru saja';
    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} jam lalu`;
    const hari = Math.floor(jam / 24);
    return `${hari} hari lalu`;
  };

  const renderPerubahanInfo = (p) => {
    const asal = p.jadwal_les;
    const asalStr = asal
      ? `${asal.hari} ${formatJam(asal.jam_mulai)}-${formatJam(asal.jam_selesai)}`
      : 'jadwal asal tidak ditemukan';
    const baruStr = `${p.hari_baru || '-'} ${formatJam(p.jam_mulai_baru)}-${formatJam(p.jam_selesai_baru)}`;
    return (
      <>
        <div style={{ fontSize: '0.78rem', color: C.gray }}>
          <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{asalStr}</span>
          {' → '}
          <span style={{ fontWeight: 600, color: C.dark }}>{baruStr}</span>
        </div>
        {p.is_temporary_baru && p.tanggal_temporary_baru ? (
          <div style={{ fontSize: '0.72rem', color: C.gold, fontWeight: 600, marginTop: '2px' }}>
            Khusus tanggal {new Date(p.tanggal_temporary_baru).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} saja
          </div>
        ) : (
          <div style={{ fontSize: '0.72rem', color: C.green, fontWeight: 600, marginTop: '2px' }}>
            Perubahan permanen
          </div>
        )}
      </>
    );
  };

  // ========== FUNGSI LOAD DENGAN useCallback ==========
  const loadMapel = useCallback(async () => {
    const { data, error } = await supabase
      .from('materi_mapel')
      .select('*')
      .order('nama');
    if (!error) setMapelOptions(data || []);
  }, []);

  const loadBab = useCallback(async (mapelId) => {
    if (!mapelId) { setBabOptions([]); return; }
    const { data, error } = await supabase
      .from('materi_bab')
      .select('*')
      .eq('mapel_id', mapelId)
      .order('urutan');
    if (!error) setBabOptions(data || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const profileId = userData?.user?.id;
      if (!profileId) throw new Error('Tidak ada sesi login.');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: jadwalData, error: jadwalError } = await supabase
        .from('jadwal_les')
        .select('*')
        .or(`siswa_id.eq.${profileId},siswa_ids.cs.{${profileId}}`);
      if (jadwalError) throw jadwalError;
      setJadwalList(jadwalData || []);

      const guruIds = [...new Set(jadwalData.map(j => j.guru_id))];
      if (guruIds.length > 0) {
        const { data: guruData, error: guruError } = await supabase
          .from('guru')
          .select('id, nama, profile_id')
          .in('id', guruIds);
        if (!guruError) {
          const map = {};
          guruData.forEach(g => { map[g.id] = g.nama; });
          setGuruMap(map);
          setGuruOptions(guruData);
        }
      }

      const { data: pengajuanMasukData, error: pengajuanMasukError } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .select('*, jadwal_les(hari, jam_mulai, jam_selesai, kelas)')
        .eq('diajukan_oleh', 'guru')
        .order('created_at', { ascending: false });
      if (pengajuanMasukError) throw pengajuanMasukError;
      setPengajuanMasuk(pengajuanMasukData || []);

      const { data: pengajuanSayaData, error: pengajuanSayaError } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .select('*, jadwal_les(hari, jam_mulai, jam_selesai, kelas)')
        .eq('diajukan_oleh', 'siswa')
        .order('created_at', { ascending: false });
      if (pengajuanSayaError) throw pengajuanSayaError;
      setPengajuanSaya(pengajuanSayaData || []);

      const { data: materiRequestData, error: materiRequestError } = await supabase
        .from('materi_request')
        .select('*')
        .eq('siswa_id', profileId)
        .order('created_at', { ascending: false });
      if (materiRequestError) throw materiRequestError;
      setMateriRequestList(materiRequestData || []);

      const todayStr = new Date().toISOString().slice(0, 10);
      if (guruIds.length > 0) {
        const { data: tugasData, error: tugasError } = await supabase
          .from('tugas_penilaian')
          .select(`
            *,
            id_mapel (id, nama),
            id_bab (id, nama)
          `)
          .in('id_guru', guruIds)
          .gte('tanggal', todayStr)
          .order('tanggal', { ascending: true });
        if (!tugasError) setUjianTerdekatList(tugasData || []);
      }

      await loadMapel();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [loadMapel]); // loadMapel sebagai dependency

  // ========== EFFECT ==========
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ========== HANDLER LAINNYA ==========
  const openForm = (jadwalId) => {
    const j = jadwalList.find(x => x.id === jadwalId);
    setSelectedJadwalId(jadwalId);
    setFormData({
      hari_baru: j?.hari || '',
      jam_mulai_baru: j?.jam_mulai ? formatJam(j.jam_mulai) : '',
      jam_selesai_baru: j?.jam_selesai ? formatJam(j.jam_selesai) : '',
      is_temporary_baru: false,
      tanggal_temporary_baru: '',
      alasan: '',
    });
    setShowForm(true);
  };

  const submitPengajuan = async () => {
    if (!selectedJadwalId) {
      setErrorMsg('Pilih jadwal yang ingin diubah terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const jadwalTerpilih = jadwalList.find(j => j.id === selectedJadwalId);
      if (!jadwalTerpilih) throw new Error('Jadwal tidak ditemukan.');

      const isGroup = jadwalTerpilih.siswa_ids && jadwalTerpilih.siswa_ids.length > 1;
      const batchId = isGroup
        ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
        : null;

      const payload = {
        jadwal_id: selectedJadwalId,
        guru_id: jadwalTerpilih.guru_id,
        siswa_id: profile.id,
        diajukan_oleh: 'siswa',
        nama_pengaju: profile.full_name,
        hari_baru: formData.hari_baru || null,
        jam_mulai_baru: formData.jam_mulai_baru || null,
        jam_selesai_baru: formData.jam_selesai_baru || null,
        is_temporary_baru: formData.is_temporary_baru,
        tanggal_temporary_baru: formData.is_temporary_baru ? (formData.tanggal_temporary_baru || null) : null,
        alasan: formData.alasan || null,
        status: 'menunggu_persetujuan',
        batch_id: batchId,
      };

      if (isGroup) {
        const siswaIds = jadwalTerpilih.siswa_ids;
        const payloads = siswaIds.map(siswaId => ({
          ...payload,
          siswa_id: siswaId,
        }));
        const { error } = await supabase.from('pengajuan_perubahan_jadwal').insert(payloads);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pengajuan_perubahan_jadwal').insert(payload);
        if (error) throw error;
      }

      try {
        const { data: guruData } = await supabase
          .from('guru')
          .select('profile_id')
          .eq('id', jadwalTerpilih.guru_id)
          .single();
        if (guruData?.profile_id) {
          await supabase.from('notifikasi').insert({
            user_id: guruData.profile_id,
            pesan: `Siswa ${profile.full_name} mengajukan perubahan jadwal ke ${formData.hari_baru || '-'} ${formData.jam_mulai_baru || ''}-${formData.jam_selesai_baru || ''}.`,
            link: null,
          });
        }
      } catch (notifErr) {
        console.error('Gagal kirim notifikasi ke guru:', notifErr);
      }

      setShowForm(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const respondPengajuan = async (p, setuju) => {
    setErrorMsg('');
    setRespondingId(p.id);
    try {
      const newStatus = setuju ? 'disetujui_siswa' : 'ditolak';
      const { data, error } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .update({ status: newStatus })
        .eq('id', p.id)
        .eq('siswa_id', profile.id)
        .select('id, status');
      if (error) throw error;

      // Kalau tidak ada baris yang benar-benar terupdate, biasanya berarti
      // RLS memblokir UPDATE ini (bukan error, tapi 0 baris match) —
      // jangan diam-diam anggap sukses.
      if (!data || data.length === 0) {
        throw new Error('Perubahan tidak tersimpan (kemungkinan dibatasi oleh policy keamanan database). Hubungi admin.');
      }

      if (setuju) {
        try {
          const { data: guruData } = await supabase
            .from('guru')
            .select('profile_id')
            .eq('id', p.guru_id)
            .single();
          if (guruData?.profile_id) {
            await supabase.from('notifikasi').insert({
              user_id: guruData.profile_id,
              pesan: `Siswa ${profile.full_name} menyetujui pengajuan perubahan jadwal ke ${p.hari_baru || '-'}.`,
              link: null,
            });
          }
        } catch (notifErr) {
          console.error('Gagal kirim notifikasi ke guru:', notifErr);
        }
      }

      setConfirmTolakId(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memperbarui pengajuan.');
    } finally {
      setRespondingId(null);
    }
  };

  // ========== MATERI REQUEST ==========
  const submitMateriRequest = async () => {
    if (!materiForm.judul.trim()) {
      setErrorMsg('Judul materi tidak boleh kosong.');
      return;
    }
    if (!materiForm.guruId) {
      setErrorMsg('Pilih guru tujuan terlebih dahulu.');
      return;
    }
    setSubmittingMateri(true);
    setErrorMsg('');
    try {
      const payload = {
        guru_id: materiForm.guruId,
        siswa_id: profile.id,
        siswa_nama: profile.full_name,
        kelas: profile.kelas || '-',
        judul_materi: materiForm.judul.trim(),
        deskripsi: materiForm.deskripsi.trim() || null,
        status: 'baru',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('materi_request').insert(payload);
      if (error) throw error;

      try {
        const { data: guruData } = await supabase
          .from('guru')
          .select('profile_id')
          .eq('id', materiForm.guruId)
          .single();
        if (guruData?.profile_id) {
          await supabase.from('notifikasi').insert({
            user_id: guruData.profile_id,
            pesan: `Siswa ${profile.full_name} meminta materi: "${materiForm.judul.trim()}"`,
            link: null,
          });
        }
      } catch (notifErr) {
        console.error('Gagal kirim notifikasi ke guru:', notifErr);
      }

      setMateriForm({ guruId: '', judul: '', deskripsi: '' });
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim permintaan materi.');
    } finally {
      setSubmittingMateri(false);
    }
  };

  // ========== PENILAIAN/TUGAS TERDEKAT ==========
  const openTugasForm = () => {
    setTugasForm({ guruId: '', mapelId: '', babId: '', materi: '', tanggal: '', deskripsi: '' });
    setBabOptions([]);
    setShowTugasForm(true);
  };

  const handleTugasMapelChange = (mapelId) => {
    setTugasForm({ ...tugasForm, mapelId, babId: '' });
    loadBab(mapelId);
  };

  const submitTugasPenilaian = async () => {
    if (!tugasForm.guruId) {
      setErrorMsg('Pilih guru terlebih dahulu.');
      return;
    }
    if (!tugasForm.materi.trim()) {
      setErrorMsg('Judul tugas tidak boleh kosong.');
      return;
    }
    if (!tugasForm.tanggal) {
      setErrorMsg('Tanggal tidak boleh kosong.');
      return;
    }
    setSubmittingTugas(true);
    setErrorMsg('');
    try {
      const payload = {
        id_guru: tugasForm.guruId,
        id_mapel: tugasForm.mapelId || null,
        id_bab: tugasForm.babId || null,
        materi: tugasForm.materi.trim(),
        tanggal: tugasForm.tanggal,
        deskripsi: tugasForm.deskripsi.trim() || null,
        nama_siswa: profile.full_name,
        siswa_id: profile.id,
        type: 'Tugas',
      };
      const { error } = await supabase.from('tugas_penilaian').insert(payload);
      if (error) throw error;

      setShowTugasForm(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menambahkan penilaian/tugas.');
    } finally {
      setSubmittingTugas(false);
    }
  };

  // ========== RENDER ==========
  const cardStyle = { background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.5rem' };
  const linkBtn = { background: 'none', border: 'none', color: C.gold, fontWeight: '600', cursor: 'pointer' };
  const modalOverlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
  };
  const modalContentStyle = {
    background: C.white, borderRadius: '16px', padding: '1.5rem',
    width: '500px', maxWidth: '90vw',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  };
  const buttonBatal = {
    background: 'none', border: `1px solid ${C.border}`, borderRadius: '8px',
    padding: '8px 16px', cursor: 'pointer'
  };
  const buttonKirim = {
    background: C.gold, color: C.white, border: 'none', borderRadius: '8px',
    padding: '8px 16px', cursor: 'pointer'
  };

  const jadwalTetap = jadwalList.filter(j => !j.is_temporary);
  const jadwalSementara = jadwalList.filter(j => j.is_temporary);
  const slotSet = new Map();
  jadwalTetap.forEach(j => {
    const key = `${j.jam_mulai}-${j.jam_selesai}`;
    if (!slotSet.has(key)) slotSet.set(key, { jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai });
  });
  const slots = Array.from(slotSet.values()).sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));
  const getCell = (hari, slot) =>
    jadwalTetap.find(j => j.hari === hari && j.jam_mulai === slot.jam_mulai && j.jam_selesai === slot.jam_selesai);
  const badgeForJenis = (jenis) => {
    const isGroup = (jenis || '').toLowerCase().startsWith('group') || (jenis || '').toLowerCase().startsWith('kelompok');
    return isGroup ? { letter: 'G', color: C.gold } : { letter: 'P', color: C.green };
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Sapaan */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: C.dark, margin: '0' }}>
          {greeting}, {profile?.full_name || 'Siswa'}!
        </h1>
        <p style={{ fontSize: '1rem', color: C.gray, margin: '0.25rem 0 0 0' }}>
          Semangat belajar hari ini, masa depan cerah menanti Anda.
        </p>
        <p style={{ fontSize: '0.9rem', color: C.gray, marginTop: '0.3rem' }}>
          <strong>Hari Ini</strong> - {dateStr}
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Grid: kiri (Jadwal) 2 baris, kanan atas (Penilaian), kanan bawah (Pengajuan) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>
        {/* Kiri: Jadwal Les Minggu Ini - row 1 / 3 */}
        <div style={{ ...cardStyle, gridRow: '1 / 3' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Jadwal Les Minggu Ini</h3>
          {loading ? (
            <p style={{ color: C.gray, fontSize: '0.9rem' }}>Memuat jadwal...</p>
          ) : slots.length === 0 ? (
            <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada jadwal les yang terdaftar.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: C.cream }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jam</th>
                    {HARI_LIST.map(h => (
                      <th key={h} style={{ padding: '8px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px', fontWeight: 600, color: C.dark, whiteSpace: 'nowrap' }}>
                        {formatJam(slot.jam_mulai)} - {formatJam(slot.jam_selesai)}
                      </td>
                      {HARI_LIST.map(hari => {
                        const cell = getCell(hari, slot);
                        if (!cell) return <td key={hari} style={{ padding: '8px' }} />;
                        const badge = badgeForJenis(cell.jenis);
                        return (
                          <td
                            key={hari}
                            style={{ padding: '8px', textAlign: 'center', cursor: 'pointer' }}
                            onClick={() => openForm(cell.id)}
                            title="Klik untuk ajukan perubahan jadwal ini"
                          >
                            <div style={{ color: badge.color, fontWeight: 600, fontSize: '0.8rem' }}>
                              {guruMap[cell.guru_id] || 'Guru'}
                              <span style={{ fontSize: '0.7rem', border: `1px solid ${badge.color}`, borderRadius: '4px', padding: '0 4px', marginLeft: '4px' }}>
                                {badge.letter}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: C.gray }}>{cell.kelas}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {jadwalSementara.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>Perubahan Sementara</div>
              {jadwalSementara.map(j => (
                <div key={j.id} style={{ fontSize: '0.8rem', color: C.gray, padding: '0.4rem 0', borderBottom: `1px solid ${C.border}` }}>
                  {j.tanggal_temporary} - {j.kelas} ({formatJam(j.jam_mulai)}-{formatJam(j.jam_selesai)}) {j.alasan ? `- ${j.alasan}` : ''}
                </div>
              ))}
            </div>
          )}
          {jadwalList.length > 0 && (
            <button style={{ ...linkBtn, marginTop: '1rem' }} onClick={() => openForm(jadwalList[0]?.id || '')}>
              + Ajukan Perubahan Jadwal
            </button>
          )}
        </div>

        {/* Kanan Atas: Penilaian/Tugas Terdekat - baris 1 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: C.dark }}>Penilaian/Tugas Terdekat</h3>
            <button style={linkBtn} onClick={openTugasForm}>+ Tambah</button>
          </div>
          {loading ? (
            <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
          ) : ujianTerdekatList.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada penilaian/tugas terjadwal.</p>
          ) : (
            ujianTerdekatList.map((item, idx) => (
              <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < ujianTerdekatList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: C.dark }}>{item.materi}</div>
                    <div style={{ fontSize: '0.85rem', color: C.gray }}>
                      {item.id_mapel?.nama}{item.id_bab?.nama ? ` - ${item.id_bab.nama}` : ''}
                    </div>
                    {item.nama_siswa && (
                      <div style={{ fontSize: '0.8rem', color: C.gray }}>Siswa: {item.nama_siswa}</div>
                    )}
                    {item.deskripsi && (
                      <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic' }}>{item.deskripsi}</div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: C.gray, whiteSpace: 'nowrap' }}>
                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Kanan Bawah: Pengajuan Perubahan Jadwal - baris 2 */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Pengajuan Perubahan Jadwal</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>
                Butuh Persetujuan Anda ({pengajuanMasuk.filter(p => p.siswa_id === profile?.id && p.status === 'menunggu_persetujuan').length})
              </div>
              {pengajuanMasuk.filter(p => p.siswa_id === profile?.id && p.status === 'menunggu_persetujuan').length === 0 ? (
                <p style={{ color: C.gray, fontSize: '0.82rem', marginTop: 0 }}>Tidak ada pengajuan dari guru.</p>
              ) : (
                pengajuanMasuk.filter(p => p.siswa_id === profile?.id && p.status === 'menunggu_persetujuan').map(p => {
                  const batchItems = p.batch_id ? pengajuanMasuk.filter(ps => ps.batch_id === p.batch_id) : [p];
                  const isBatch = batchItems.length > 1;
                  return (
                    <div key={p.id} style={{ padding: '0.6rem 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: '0.85rem', color: C.dark, fontWeight: 600 }}>{p.nama_pengaju || 'Guru'}</div>
                      {renderPerubahanInfo(p)}
                      {isBatch && (
                        <div style={{ fontSize: '0.72rem', color: C.gray, marginTop: '2px' }}>
                          {batchItems.filter(r => STATUS_SISWA_SETUJU.includes(r.status)).length}/{batchItems.length} siswa setuju
                        </div>
                      )}
                      {p.alasan && <div style={{ fontSize: '0.75rem', color: C.gray, fontStyle: 'italic' }}>"{p.alasan}"</div>}
                      {confirmTolakId === p.id ? (
                        <div style={{ marginTop: '0.4rem' }}>
                          <div style={{ fontSize: '0.78rem', color: C.dark, marginBottom: '0.3rem' }}>Yakin ingin menolak?</div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              style={{ ...linkBtn, color: C.red, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1 }}
                              onClick={() => respondPengajuan(p, false)}
                              disabled={respondingId === p.id}
                            >
                              {respondingId === p.id ? 'Memproses...' : 'Ya, Tolak'}
                            </button>
                            <button
                              style={{ ...linkBtn, color: C.gray, fontSize: '0.8rem' }}
                              onClick={() => setConfirmTolakId(null)}
                              disabled={respondingId === p.id}
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <button
                            style={{ ...linkBtn, color: C.green, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1 }}
                            onClick={() => respondPengajuan(p, true)}
                            disabled={respondingId === p.id}
                          >
                            {respondingId === p.id ? 'Memproses...' : 'Setujui'}
                          </button>
                          <button
                            style={{ ...linkBtn, color: C.red, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1 }}
                            onClick={() => setConfirmTolakId(p.id)}
                            disabled={respondingId === p.id}
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>
                Pengajuan Saya ({pengajuanSayaGrouped.length})
              </div>
              {pengajuanSayaGrouped.length === 0 ? (
                <p style={{ color: C.gray, fontSize: '0.82rem', marginTop: 0 }}>Belum ada pengajuan.</p>
              ) : (
                pengajuanSayaGrouped.map(item => {
                  const first = item.rows[0];
                  const status = getAggregateStatus(item.rows);
                  return (
                    <div key={item.id} style={{ padding: '0.5rem 0', borderBottom: `1px solid ${C.border}` }}>
                      {renderPerubahanInfo(first)}
                      {item.isBatch && (
                        <div style={{ fontSize: '0.72rem', color: C.gray, margin: '2px 0' }}>
                          {item.rows.filter(r => STATUS_SISWA_SETUJU.includes(r.status)).length}/{item.rows.length} siswa setuju
                        </div>
                      )}
                      <StatusPill status={status} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Permintaan Materi Saya - grid 2 kolom */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Permintaan Materi Saya</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Kiri: daftar permintaan */}
          <div>
            {loading ? (
              <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
            ) : materiRequestList.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada permintaan materi.</p>
            ) : (
              materiRequestList.map((item, idx) => (
                <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < materiRequestList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: C.dark }}>{item.judul_materi}</div>
                      <div style={{ fontSize: '0.85rem', color: C.gray }}>
                        Untuk guru: {guruOptions.find(g => g.id === item.guru_id)?.nama || '...'}
                      </div>
                      {item.deskripsi && (
                        <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic' }}>{item.deskripsi}</div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: C.gray }}>{waktuLalu(item.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginLeft: '1rem' }}>
                      {item.status === 'selesai' ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.greenBg, color: C.green, whiteSpace: 'nowrap' }}>✅ Selesai</span>
                      ) : item.status === 'ditolak' ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.redBg, color: C.red, whiteSpace: 'nowrap' }}>❌ Ditolak</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.goldBg, color: C.gold, whiteSpace: 'nowrap' }}>⏳ Menunggu</span>
                      )}
                      {item.catatan_guru && (
                        <div style={{ fontSize: '0.72rem', color: C.gray, background: C.cream, padding: '2px 8px', borderRadius: '4px', textAlign: 'right', maxWidth: '200px' }}>
                          💬 {item.catatan_guru}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Kanan: Form minta materi */}
          <div style={{ background: C.cream, borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: C.dark }}>Minta Materi</h4>
            <p style={{ fontSize: '0.8rem', color: C.gray, marginBottom: '0.75rem' }}>
              Ajukan permintaan materi yang ingin dipelajari.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Kirim ke Guru</label>
              <select
                value={materiForm.guruId}
                onChange={(e) => setMateriForm({ ...materiForm, guruId: e.target.value })}
                style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, fontSize: '0.85rem' }}
              >
                <option value="">-- Pilih Guru --</option>
                {guruOptions.map(g => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>

              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Judul Materi</label>
              <input
                type="text"
                placeholder="Contoh: Integral Tak Tentu"
                value={materiForm.judul}
                onChange={(e) => setMateriForm({ ...materiForm, judul: e.target.value })}
                style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, fontSize: '0.85rem' }}
              />

              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Deskripsi (opsional)</label>
              <textarea
                placeholder="Jelaskan kesulitan atau poin yang ingin dipelajari..."
                value={materiForm.deskripsi}
                onChange={(e) => setMateriForm({ ...materiForm, deskripsi: e.target.value })}
                rows={2}
                style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
              />

              <button
                onClick={submitMateriRequest}
                disabled={submittingMateri}
                style={{
                  ...buttonKirim,
                  width: '100%',
                  marginTop: '0.5rem',
                  opacity: submittingMateri ? 0.6 : 1,
                }}
              >
                {submittingMateri ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Form Tambah Penilaian/Tugas */}
      {showTugasForm && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 0.25rem 0', color: C.dark }}>Tambah Penilaian/Tugas</h3>
            <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: 0 }}>
              Catat sendiri tugas/ulangan yang sudah diberitahu guru.
            </p>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Guru</label>
            <select
              value={tugasForm.guruId}
              onChange={(e) => setTugasForm({ ...tugasForm, guruId: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem' }}
            >
              <option value="">-- Pilih Guru --</option>
              {guruOptions.map(g => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Mapel (opsional)</label>
            <select
              value={tugasForm.mapelId}
              onChange={(e) => handleTugasMapelChange(e.target.value)}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem' }}
            >
              <option value="">-- Pilih Mapel --</option>
              {mapelOptions.map(m => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </select>
            {tugasForm.mapelId && (
              <>
                <label style={{ fontSize: '0.85rem', color: C.gray }}>Bab (opsional)</label>
                <select
                  value={tugasForm.babId}
                  onChange={(e) => setTugasForm({ ...tugasForm, babId: e.target.value })}
                  style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem' }}
                >
                  <option value="">-- Pilih Bab --</option>
                  {babOptions.map(b => (
                    <option key={b.id} value={b.id}>{b.nama}</option>
                  ))}
                </select>
              </>
            )}
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Judul Tugas/Penilaian</label>
            <input
              type="text"
              placeholder="Contoh: Ulangan Harian Bab Integral"
              value={tugasForm.materi}
              onChange={(e) => setTugasForm({ ...tugasForm, materi: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem' }}
            />
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Tanggal</label>
            <input
              type="date"
              value={tugasForm.tanggal}
              onChange={(e) => setTugasForm({ ...tugasForm, tanggal: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem' }}
            />
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Catatan (opsional)</label>
            <textarea
              placeholder="Materi yang perlu dipelajari, dsb..."
              value={tugasForm.deskripsi}
              onChange={(e) => setTugasForm({ ...tugasForm, deskripsi: e.target.value })}
              rows={3}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTugasForm(false)} style={buttonBatal}>Batal</button>
              <button onClick={submitTugasPenilaian} disabled={submittingTugas} style={{ ...buttonKirim, opacity: submittingTugas ? 0.6 : 1 }}>
                {submittingTugas ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal form pengajuan perubahan jadwal */}
      {showForm && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Ajukan Perubahan Jadwal</h3>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Pilih Jadwal</label>
            <select
              value={selectedJadwalId}
              onChange={(e) => openForm(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '0.75rem', borderRadius: '8px', border: `1px solid ${C.border}` }}
            >
              <option value="">-- Pilih --</option>
              {jadwalList.map(j => (
                <option key={j.id} value={j.id}>
                  {j.hari} {formatJam(j.jam_mulai)}-{formatJam(j.jam_selesai)} - {j.kelas}
                </option>
              ))}
            </select>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Hari Baru</label>
            <select
              value={formData.hari_baru}
              onChange={(e) => setFormData({ ...formData, hari_baru: e.target.value })}
              style={{ width: '100%', padding: '8px', marginBottom: '0.75rem', borderRadius: '8px', border: `1px solid ${C.border}` }}
            >
              {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: C.gray }}>Jam Mulai</label>
                <input
                  type="time"
                  value={formData.jam_mulai_baru}
                  onChange={(e) => setFormData({ ...formData, jam_mulai_baru: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: C.gray }}>Jam Selesai</label>
                <input
                  type="time"
                  value={formData.jam_selesai_baru}
                  onChange={(e) => setFormData({ ...formData, jam_selesai_baru: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
                />
              </div>
            </div>
            <label style={{ fontSize: '0.85rem', color: C.gray, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={formData.is_temporary_baru}
                onChange={(e) => setFormData({ ...formData, is_temporary_baru: e.target.checked })}
              />
              Ini perubahan sementara (bukan permanen)
            </label>
            {formData.is_temporary_baru && (
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.85rem', color: C.gray }}>Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal_temporary_baru}
                  onChange={(e) => setFormData({ ...formData, tanggal_temporary_baru: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
                />
              </div>
            )}
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Alasan</label>
            <textarea
              value={formData.alasan}
              onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
              rows={3}
              style={{ width: '100%', padding: '8px', marginBottom: '1rem', borderRadius: '8px', border: `1px solid ${C.border}`, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setShowForm(false)} style={buttonBatal}>Batal</button>
              <button onClick={submitPengajuan} disabled={submitting} style={{ ...buttonKirim, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <button style={linkBtn}>Lihat semua jadwal</button>
        <button style={linkBtn}>Lihat semua tugas</button>
      </div>
    </div>
  );
};

export default StudentHome;