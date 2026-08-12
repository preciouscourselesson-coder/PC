// src/components/student/StudentHome.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { checkedUpdate } from '../../utils/supabaseUpdateGuard';

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

const MAPEL_TUGAS_LIST = [
  { value: 'matematika', label: 'Matematika' },
  { value: 'fisika', label: 'Fisika' },
  { value: 'kimia', label: 'Kimia' },
  { value: 'bahasa_inggris', label: 'Bahasa Inggris' },
];

// Ukuran maksimal file gambar catatan (5MB)
const MAX_CATATAN_GAMBAR_SIZE = 5 * 1024 * 1024;

const formatJam = (t) => (t ? t.slice(0, 5) : '');

// Konversi hasil Date.getDay() (0=Minggu..6=Sabtu) ke index HARI_LIST (0=Senin..6=Minggu)
const HARI_INDEX_FROM_GETDAY = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

const getHariFromTanggal = (tanggalStr) => {
  if (!tanggalStr) return '';
  const d = new Date(`${tanggalStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  return HARI_LIST[HARI_INDEX_FROM_GETDAY[d.getDay()]];
};

// Cari tanggal terdekat (hari ini atau setelahnya) yang jatuh pada hari tertentu
const nextTanggalForHari = (hari) => {
  const targetIdx = HARI_LIST.indexOf(hari);
  if (targetIdx === -1) return '';
  const today = new Date();
  const todayIdx = HARI_INDEX_FROM_GETDAY[today.getDay()];
  let diff = targetIdx - todayIdx;
  if (diff < 0) diff += 7;
  const hasil = new Date(today);
  hasil.setDate(today.getDate() + diff);
  return hasil.toISOString().slice(0, 10);
};

const formatTanggalPanjang = (tanggalStr) => {
  if (!tanggalStr) return '';
  return new Date(`${tanggalStr}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

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

const useIsMobile = (bp = 768) => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < bp : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < bp);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [bp]);
  return isMobile;
};

const StudentHome = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jadwalList, setJadwalList] = useState([]);
  const [pengajuanSaya, setPengajuanSaya] = useState([]);
  const [pengajuanMasuk, setPengajuanMasuk] = useState([]);
  const [materiRequestList, setMateriRequestList] = useState([]);
  const [guruOptions, setGuruOptions] = useState([]);
  const [guruMap, setGuruMap] = useState({});
  const [ujianTerdekatList, setUjianTerdekatList] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [tanggalAsal, setTanggalAsal] = useState('');
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
  const [editingTugasId, setEditingTugasId] = useState(null);
  const [tugasForm, setTugasForm] = useState({
    guruId: '',
    mapel: '',
    namaGuruSekolah: '',
    judulBab: '',
    tanggal: '',
    catatanLink: '',
  });
  const [catatanGambarFile, setCatatanGambarFile] = useState(null);
  const [catatanGambarPreview, setCatatanGambarPreview] = useState('');
  const [catatanGambarUrlLama, setCatatanGambarUrlLama] = useState('');
  const [catatanGambarDihapus, setCatatanGambarDihapus] = useState(false);
  const [submittingTugas, setSubmittingTugas] = useState(false);

  const [respondingId, setRespondingId] = useState(null);
  const [confirmTolakId, setConfirmTolakId] = useState(null);
  const [confirmDeleteTugasId, setConfirmDeleteTugasId] = useState(null);
  const [deletingTugasId, setDeletingTugasId] = useState(null);

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
      const { data: tugasData, error: tugasError } = await supabase
        .from('tugas_penilaian')
        .select('*')
        .eq('siswa_id', profileId)
        .gte('tanggal', todayStr)
        .order('tanggal', { ascending: true });
      if (!tugasError) setUjianTerdekatList(tugasData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ========== EFFECT ==========
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ========== HANDLER LAINNYA ==========

  // ---- Helper Pilih Jadwal (Tanggal -> Hari -> Yang Berkepentingan) ----
  const hariAsal = useMemo(() => getHariFromTanggal(tanggalAsal), [tanggalAsal]);

  const kandidatJadwal = useMemo(() => {
    if (!tanggalAsal || !hariAsal) return [];
    return jadwalList.filter(j => (
      j.is_temporary ? j.tanggal_temporary === tanggalAsal : j.hari === hariAsal
    ));
  }, [jadwalList, tanggalAsal, hariAsal]);

  const getPihakLabel = (j) => {
    const nama = guruMap[j.guru_id] || 'Guru';
    return `${nama}${j.kelas ? ` (${j.kelas})` : ''} - ${formatJam(j.jam_mulai)}-${formatJam(j.jam_selesai)}`;
  };

  const applyJadwalSelection = (jadwalId) => {
    const j = jadwalList.find(x => x.id === jadwalId);
    setSelectedJadwalId(jadwalId);
    setFormData(prev => ({
      ...prev,
      hari_baru: j?.hari || '',
      jam_mulai_baru: j?.jam_mulai ? formatJam(j.jam_mulai) : '',
      jam_selesai_baru: j?.jam_selesai ? formatJam(j.jam_selesai) : '',
    }));
  };

  const openFormFromCell = (jadwalId) => {
    const j = jadwalList.find(x => x.id === jadwalId);
    setTanggalAsal(j?.is_temporary && j?.tanggal_temporary ? j.tanggal_temporary : nextTanggalForHari(j?.hari || ''));
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

  const openBlankForm = () => {
    setTanggalAsal('');
    setSelectedJadwalId('');
    setFormData({
      hari_baru: '',
      jam_mulai_baru: '',
      jam_selesai_baru: '',
      is_temporary_baru: false,
      tanggal_temporary_baru: '',
      alasan: '',
    });
    setShowForm(true);
  };

  const submitPengajuan = async () => {
    if (!tanggalAsal) {
      setErrorMsg('Pilih tanggal kelas yang ingin diubah terlebih dahulu.');
      return;
    }
    if (!selectedJadwalId) {
      setErrorMsg('Pilih guru/jadwal yang bersangkutan terlebih dahulu.');
      return;
    }
    if (!formData.hari_baru || !formData.jam_mulai_baru || !formData.jam_selesai_baru) {
      setErrorMsg('Isi hari pengganti beserta jam mulai dan jam selesai.');
      return;
    }
    if (formData.is_temporary_baru && !formData.alasan.trim()) {
      setErrorMsg('Isi alasan kenapa perubahan ini bersifat sementara.');
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
        tanggal_temporary_baru: formData.is_temporary_baru ? (tanggalAsal || null) : null,
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
      const { error } = await checkedUpdate(
        supabase
          .from('pengajuan_perubahan_jadwal')
          .update({ status: newStatus })
          .eq('id', p.id)
          .eq('siswa_id', profile.id),
        { notFoundMessage: 'Perubahan tidak tersimpan (kemungkinan dibatasi oleh policy keamanan database). Hubungi admin.' }
      );
      if (error) throw error;

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
    setEditingTugasId(null);
    setTugasForm({ guruId: '', mapel: '', namaGuruSekolah: '', judulBab: '', tanggal: '', catatanLink: '' });
    setCatatanGambarFile(null);
    setCatatanGambarPreview('');
    setCatatanGambarUrlLama('');
    setCatatanGambarDihapus(false);
    setShowTugasForm(true);
  };

  const openEditTugasForm = (item) => {
    setEditingTugasId(item.id);
    setTugasForm({
      guruId: item.id_guru || '',
      mapel: item.mapel || '',
      namaGuruSekolah: item.nama_guru_sekolah || '',
      judulBab: item.judul_bab || item.materi || '',
      tanggal: item.tanggal || '',
      catatanLink: item.catatan_link || '',
    });
    setCatatanGambarFile(null);
    setCatatanGambarPreview(item.catatan_gambar_url || '');
    setCatatanGambarUrlLama(item.catatan_gambar_url || '');
    setCatatanGambarDihapus(false);
    setErrorMsg('');
    setShowTugasForm(true);
  };

  const handleCatatanGambarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('File catatan harus berupa gambar.');
      return;
    }
    if (file.size > MAX_CATATAN_GAMBAR_SIZE) {
      setErrorMsg('Ukuran gambar maksimal 5MB.');
      return;
    }
    setErrorMsg('');
    setCatatanGambarFile(file);
    setCatatanGambarPreview(URL.createObjectURL(file));
    setCatatanGambarDihapus(false);
  };

  const removeCatatanGambar = () => {
    setCatatanGambarFile(null);
    setCatatanGambarPreview('');
    // Kalau sebelumnya sudah ada gambar tersimpan (mode edit), tandai supaya
    // saat disimpan gambar itu benar-benar dihapus dari record.
    if (catatanGambarUrlLama) setCatatanGambarDihapus(true);
  };

  const submitTugasPenilaian = async () => {
    if (!tugasForm.guruId) {
      setErrorMsg('Pilih guru les terlebih dahulu.');
      return;
    }
    if (!tugasForm.mapel) {
      setErrorMsg('Pilih mapel terlebih dahulu.');
      return;
    }
    if (!tugasForm.namaGuruSekolah.trim()) {
      setErrorMsg('Nama guru pengajar di sekolah tidak boleh kosong.');
      return;
    }
    if (!tugasForm.judulBab.trim()) {
      setErrorMsg('Judul bab tidak boleh kosong.');
      return;
    }
    if (!tugasForm.tanggal) {
      setErrorMsg('Tanggal tidak boleh kosong.');
      return;
    }
    setSubmittingTugas(true);
    setErrorMsg('');
    try {
      let catatanGambarUrl = catatanGambarUrlLama || null;

      // Upload gambar catatan baru (jika ada) ke Supabase Storage
      if (catatanGambarFile) {
        const ext = catatanGambarFile.name.split('.').pop();
        const filePath = `${profile.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('catatan-tugas')
          .upload(filePath, catatanGambarFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('catatan-tugas')
          .getPublicUrl(filePath);
        catatanGambarUrl = publicUrlData?.publicUrl || null;
      } else if (catatanGambarDihapus) {
        catatanGambarUrl = null;
      }

      const payload = {
        // id_guru: guru LES yang punya akun -- menentukan tugas ini tampil di dashboard guru siapa.
        id_guru: tugasForm.guruId,
        mapel: tugasForm.mapel,
        // nama_guru_sekolah: cuma catatan teks, guru sekolah tidak punya akun/tidak ada di database.
        nama_guru_sekolah: tugasForm.namaGuruSekolah.trim(),
        judul_bab: tugasForm.judulBab.trim(),
        tanggal: tugasForm.tanggal,
        catatan_link: tugasForm.catatanLink.trim() || null,
        catatan_gambar_url: catatanGambarUrl,
      };

      if (editingTugasId) {
        const { error } = await checkedUpdate(
          supabase
            .from('tugas_penilaian')
            .update(payload)
            .eq('id', editingTugasId)
            .eq('siswa_id', profile.id),
          { notFoundMessage: 'Perubahan tidak tersimpan (kemungkinan dibatasi oleh policy keamanan database). Hubungi admin.' }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tugas_penilaian').insert({
          ...payload,
          nama_siswa: profile.full_name,
          siswa_id: profile.id,
          type: 'Tugas',
        });
        if (error) throw error;
      }

      setShowTugasForm(false);
      setEditingTugasId(null);
      setCatatanGambarFile(null);
      setCatatanGambarPreview('');
      setCatatanGambarUrlLama('');
      setCatatanGambarDihapus(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyimpan penilaian/tugas.');
    } finally {
      setSubmittingTugas(false);
    }
  };

  const deleteTugasPenilaian = async (item) => {
    setDeletingTugasId(item.id);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('tugas_penilaian')
        .delete()
        .eq('id', item.id)
        .eq('siswa_id', profile.id);
      if (error) throw error;
      setConfirmDeleteTugasId(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus penilaian/tugas.');
    } finally {
      setDeletingTugasId(null);
    }
  };


  // ========== RENDER ==========
  const cardStyle = { background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: isMobile ? '1rem' : '1.5rem' };
  const linkBtn = { background: 'none', border: 'none', color: C.gold, fontWeight: '600', cursor: 'pointer', padding: '6px 2px', fontFamily: 'inherit' };
  const modalOverlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
  };
  const modalContentStyle = {
    background: C.white, borderRadius: '16px', padding: isMobile ? '1rem' : '1.5rem',
    width: '500px', maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '0.5rem', boxSizing: 'border-box',
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 0.85rem' : '0', fontFamily: 'inherit', boxSizing: 'border-box' }}>
      {/* Sapaan */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.8rem', fontWeight: '700', color: C.dark, margin: '0' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '1rem' : '1.5rem', alignItems: 'start' }}>
        {/* Kiri: Jadwal Les Minggu Ini - row 1 / 3 (desktop only) */}
        <div style={{ ...cardStyle, gridRow: isMobile ? 'auto' : '1 / 3' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Jadwal Les Minggu Ini</h3>
          {loading ? (
            <p style={{ color: C.gray, fontSize: '0.9rem' }}>Memuat jadwal...</p>
          ) : slots.length === 0 ? (
            <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada jadwal les yang terdaftar.</p>
          ) : isMobile ? (
            // ── Tampilan kartu per hari (mobile) — lebih mudah dibaca & disentuh dibanding tabel 8 kolom ──
            (() => {
              const hariDenganJadwal = HARI_LIST
                .map(hari => ({
                  hari,
                  entries: slots
                    .map(slot => ({ slot, cell: getCell(hari, slot) }))
                    .filter(x => x.cell),
                }))
                .filter(x => x.entries.length > 0);

              if (hariDenganJadwal.length === 0) {
                return <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada jadwal les yang terdaftar.</p>;
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {hariDenganJadwal.map(({ hari, entries }) => (
                    <div key={hari}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                        {hari}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {entries.map(({ slot, cell }) => {
                          const badge = badgeForJenis(cell.jenis);
                          return (
                            <div
                              key={cell.id}
                              onClick={() => openFormFromCell(cell.id)}
                              role="button"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.7rem 0.8rem',
                                borderRadius: '10px',
                                background: C.cream,
                                cursor: 'pointer',
                                minHeight: '44px',
                                boxSizing: 'border-box',
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: C.dark, fontSize: '0.88rem' }}>
                                  {formatJam(slot.jam_mulai)} - {formatJam(slot.jam_selesai)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: badge.color, fontWeight: 600, marginTop: '2px' }}>
                                  {guruMap[cell.guru_id] || 'Guru'}
                                  <span style={{ fontSize: '0.68rem', border: `1px solid ${badge.color}`, borderRadius: '4px', padding: '0 4px', marginLeft: '4px' }}>
                                    {badge.letter}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '1px' }}>{cell.kelas}</div>
                              </div>
                              <span style={{ color: C.grayLight, fontSize: '1rem', flexShrink: 0 }}>›</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
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
                            onClick={() => openFormFromCell(cell.id)}
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
            <button style={{ ...linkBtn, marginTop: '1rem' }} onClick={openBlankForm}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px 8px' }}>
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: C.dark, wordBreak: 'break-word' }}>{item.judul_bab}</div>
                    <div style={{ fontSize: '0.85rem', color: C.gray, wordBreak: 'break-word' }}>
                      {MAPEL_TUGAS_LIST.find(m => m.value === item.mapel)?.label || item.mapel}
                      {item.nama_guru_sekolah ? ` - ${item.nama_guru_sekolah}` : ''}
                    </div>
                    {item.nama_siswa && (
                      <div style={{ fontSize: '0.8rem', color: C.gray }}>Siswa: {item.nama_siswa}</div>
                    )}
                    {item.catatan_link && (
                      <div style={{ fontSize: '0.78rem', wordBreak: 'break-word' }}>
                        <a href={item.catatan_link} target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>
                          Lihat link materi ujian
                        </a>
                      </div>
                    )}
                    {item.catatan_gambar_url && (
                      <a href={item.catatan_gambar_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={item.catatan_gambar_url}
                          alt="Catatan"
                          style={{ marginTop: '4px', width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${C.border}` }}
                        />
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: C.gray, whiteSpace: 'nowrap' }}>
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: isMobile ? 'short' : 'long', year: 'numeric' })}
                    </span>
                    {confirmDeleteTugasId === item.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '0.72rem', color: C.dark }}>Yakin hapus?</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => deleteTugasPenilaian(item)}
                            disabled={deletingTugasId === item.id}
                            style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px', opacity: deletingTugasId === item.id ? 0.6 : 1 }}
                          >
                            {deletingTugasId === item.id ? 'Menghapus...' : 'Ya, Hapus'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteTugasId(null)}
                            disabled={deletingTugasId === item.id}
                            style={{ background: 'none', border: 'none', color: C.gray, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEditTugasForm(item)}
                          style={{ background: 'none', border: 'none', color: C.gold, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteTugasId(item.id)}
                          style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '1rem' : '1.5rem' }}>
          {/* Kiri: daftar permintaan */}
          <div>
            {loading ? (
              <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
            ) : materiRequestList.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada permintaan materi.</p>
            ) : (
              materiRequestList.map((item, idx) => (
                <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < materiRequestList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px 10px' }}>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <div style={{ fontWeight: '600', color: C.dark, wordBreak: 'break-word' }}>{item.judul_materi}</div>
                      <div style={{ fontSize: '0.85rem', color: C.gray, wordBreak: 'break-word' }}>
                        Untuk guru: {guruOptions.find(g => g.id === item.guru_id)?.nama || '...'}
                      </div>
                      {item.deskripsi && (
                        <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic', wordBreak: 'break-word' }}>{item.deskripsi}</div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: C.gray }}>{waktuLalu(item.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', maxWidth: isMobile ? '100%' : '220px' }}>
                      {item.status === 'selesai' ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.greenBg, color: C.green, whiteSpace: 'nowrap' }}>✅ Selesai</span>
                      ) : item.status === 'ditolak' ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.redBg, color: C.red, whiteSpace: 'nowrap' }}>❌ Ditolak</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.goldBg, color: C.gold, whiteSpace: 'nowrap' }}>⏳ Menunggu</span>
                      )}
                      {item.catatan_guru && (
                        <div style={{ fontSize: '0.72rem', color: C.gray, background: C.cream, padding: '4px 8px', borderRadius: '4px', textAlign: 'right', wordBreak: 'break-word' }}>
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
                style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, fontSize: isMobile ? '16px' : '0.85rem', width: '100%', boxSizing: 'border-box' }}
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
                style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, fontSize: isMobile ? '16px' : '0.85rem', width: '100%', boxSizing: 'border-box' }}
              />

              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Deskripsi (opsional)</label>
              <textarea
                placeholder="Jelaskan kesulitan atau poin yang ingin dipelajari..."
                value={materiForm.deskripsi}
                onChange={(e) => setMateriForm({ ...materiForm, deskripsi: e.target.value })}
                rows={2}
                style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, resize: 'vertical', fontFamily: 'inherit', fontSize: isMobile ? '16px' : '0.85rem', width: '100%', boxSizing: 'border-box' }}
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
            <h3 style={{ margin: '0 0 0.25rem 0', color: C.dark }}>{editingTugasId ? 'Edit Penilaian/Tugas' : 'Tambah Penilaian/Tugas'}</h3>
            <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: 0 }}>
              {editingTugasId ? 'Ubah jika ada perubahan jadwal atau info dari guru.' : 'Catat sendiri tugas/ulangan yang sudah diberitahu guru.'}
            </p>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Guru Les</label>
            <select
              value={tugasForm.guruId}
              onChange={(e) => setTugasForm({ ...tugasForm, guruId: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.25rem', width: '100%', boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
            >
              <option value="">-- Pilih Guru Les --</option>
              {guruOptions.map(g => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.72rem', color: C.grayLight, marginTop: 0, marginBottom: '0.5rem' }}>
              Info ini akan ditampilkan ke dashboard guru les yang dipilih.
            </p>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Mapel</label>
            <select
              value={tugasForm.mapel}
              onChange={(e) => setTugasForm({ ...tugasForm, mapel: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem', width: '100%', boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
            >
              <option value="">-- Pilih Mapel --</option>
              {MAPEL_TUGAS_LIST.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Nama Guru Pengajar di Sekolah</label>
            <input
              type="text"
              placeholder="Contoh: Bpk. Andi Wijaya"
              value={tugasForm.namaGuruSekolah}
              onChange={(e) => setTugasForm({ ...tugasForm, namaGuruSekolah: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.25rem', width: '100%', boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
            />
            <p style={{ fontSize: '0.72rem', color: C.grayLight, marginTop: 0, marginBottom: '0.5rem' }}>
              Ini cuma catatan teks -- guru sekolah tidak punya akun di sistem ini.
            </p>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Judul Bab</label>
            <input
              type="text"
              placeholder="Contoh: Bab 3 - Integral"
              value={tugasForm.judulBab}
              onChange={(e) => setTugasForm({ ...tugasForm, judulBab: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem', width: '100%', boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
            />
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Tanggal</label>
            <input
              type="date"
              value={tugasForm.tanggal}
              onChange={(e) => setTugasForm({ ...tugasForm, tanggal: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem', width: '100%', boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
            />
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Catatan (opsional)</label>
            <div style={{ marginBottom: '0.25rem' }}>
              <input
                type="text"
                placeholder="Link materi ujian (opsional) - https://..."
                value={tugasForm.catatanLink}
                onChange={(e) => setTugasForm({ ...tugasForm, catatanLink: e.target.value })}
                style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem', width: '100%', boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
              />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label
                htmlFor="catatan-gambar-input"
                style={{
                  display: 'inline-block', padding: '8px 14px', borderRadius: '8px',
                  border: `1px dashed ${C.border}`, color: C.gray, fontSize: '0.85rem',
                  cursor: 'pointer', background: C.cream,
                }}
              >
                {catatanGambarFile ? 'Ganti Gambar Catatan' : 'Upload Gambar Catatan (opsional)'}
              </label>
              <input
                id="catatan-gambar-input"
                type="file"
                accept="image/*"
                onChange={handleCatatanGambarChange}
                style={{ display: 'none' }}
              />
              {catatanGambarPreview && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img
                    src={catatanGambarPreview}
                    alt="Preview catatan"
                    style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${C.border}` }}
                  />
                  <button
                    type="button"
                    onClick={removeCatatanGambar}
                    style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hapus Gambar
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowTugasForm(false); setEditingTugasId(null); }} style={buttonBatal}>Batal</button>
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

            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>Jadwal yang Ingin Diubah</div>

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Tanggal Kelas</label>
            <input
              type="date"
              value={tanggalAsal}
              onChange={(e) => { setTanggalAsal(e.target.value); setSelectedJadwalId(''); }}
              style={{ width: '100%', padding: '8px', marginBottom: '0.4rem', borderRadius: '8px', border: `1px solid ${C.border}`, boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
            />
            {tanggalAsal && (
              <div style={{ fontSize: '0.8rem', color: C.gray, marginBottom: '0.75rem' }}>
                Hari: <strong style={{ color: C.dark }}>{hariAsal || '-'}</strong>
              </div>
            )}

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Guru yang Bersangkutan</label>
            <select
              value={selectedJadwalId}
              onChange={(e) => applyJadwalSelection(e.target.value)}
              disabled={!tanggalAsal}
              style={{ width: '100%', padding: '8px', marginBottom: '0.25rem', borderRadius: '8px', border: `1px solid ${C.border}`, boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem', opacity: tanggalAsal ? 1 : 0.6 }}
            >
              <option value="">-- Pilih --</option>
              {kandidatJadwal.map(j => (
                <option key={j.id} value={j.id}>{getPihakLabel(j)}</option>
              ))}
            </select>
            {tanggalAsal && kandidatJadwal.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: C.gray, margin: '0.25rem 0 0.75rem 0' }}>Tidak ada jadwal pada tanggal/hari tersebut.</p>
            )}

            <div style={{ height: '1rem' }} />

            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>Jadwal Pengganti</div>

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Hari Pengganti</label>
            <select
              value={formData.hari_baru}
              onChange={(e) => setFormData({ ...formData, hari_baru: e.target.value })}
              style={{ width: '100%', padding: '8px', marginBottom: '0.75rem', borderRadius: '8px', border: `1px solid ${C.border}`, boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
            >
              <option value="">-- Pilih --</option>
              {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 130px' }}>
                <label style={{ fontSize: '0.85rem', color: C.gray }}>Jam Mulai</label>
                <input
                  type="time"
                  value={formData.jam_mulai_baru}
                  onChange={(e) => setFormData({ ...formData, jam_mulai_baru: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
                />
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <label style={{ fontSize: '0.85rem', color: C.gray }}>Jam Selesai</label>
                <input
                  type="time"
                  value={formData.jam_selesai_baru}
                  onChange={(e) => setFormData({ ...formData, jam_selesai_baru: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>Sifat Pengajuan</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_temporary_baru: false })}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: isMobile ? '0.95rem' : '0.85rem', fontWeight: 600,
                  border: `1px solid ${!formData.is_temporary_baru ? C.green : C.border}`,
                  background: !formData.is_temporary_baru ? C.greenBg : 'transparent',
                  color: !formData.is_temporary_baru ? C.green : C.gray,
                }}
              >
                Permanent
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_temporary_baru: true })}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: isMobile ? '0.95rem' : '0.85rem', fontWeight: 600,
                  border: `1px solid ${formData.is_temporary_baru ? C.gold : C.border}`,
                  background: formData.is_temporary_baru ? C.goldBg : 'transparent',
                  color: formData.is_temporary_baru ? C.gold : C.gray,
                }}
              >
                Sementara
              </button>
            </div>

            {formData.is_temporary_baru && (
              <>
                <div style={{ fontSize: '0.78rem', color: C.gray, marginBottom: '0.5rem' }}>
                  Berlaku khusus tanggal: <strong style={{ color: C.dark }}>{tanggalAsal ? formatTanggalPanjang(tanggalAsal) : '-'}</strong> (jadwal rutin minggu lain tidak berubah)
                </div>
                <label style={{ fontSize: '0.85rem', color: C.dark, fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Alasan (kenapa perubahan ini sementara) <span style={{ color: C.red }}>*</span>
                </label>
                <textarea
                  value={formData.alasan}
                  onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                  rows={3}
                  placeholder="Contoh: Ada acara sekolah, berhalangan hadir, dll."
                  style={{
                    width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '10px',
                    border: `1.5px solid ${C.gold}`, background: C.goldBg, resize: 'vertical',
                    minHeight: '90px', boxSizing: 'border-box', fontSize: isMobile ? '16px' : '0.95rem',
                    color: C.dark, fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />
              </>
            )}

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