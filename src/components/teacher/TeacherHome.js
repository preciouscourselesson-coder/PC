// TeacherHome.js
// Perbaikan:
// 1. Tampilan mobile: urutkan berdasarkan hari Senin–Minggu, lalu di dalamnya tampilkan slot jam
// 2. Pengajuan yang sudah disetujui admin (disetujui_admin) tidak ditampilkan
// 3. Status 'disetujui_menunggu_admin' tetap muncul, yang 'disetujui_admin' disembunyikan

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { checkedUpdate } from '../../utils/supabaseUpdateGuard';
import Toast, { useToast } from '../shared/Toast';
import { C } from '../shared/Theme';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Daftar mapel tetap, sama seperti yang dipakai di form "Tambah Tugas/Penilaian" milik siswa
// (StudentHome.js). Dipakai untuk menerjemahkan value teks (mis. 'matematika') jadi label.
const MAPEL_TUGAS_LIST = [
  { value: 'matematika', label: 'Matematika' },
  { value: 'fisika', label: 'Fisika' },
  { value: 'kimia', label: 'Kimia' },
  { value: 'bahasa_inggris', label: 'Bahasa Inggris' },
];

const MOBILE_BREAKPOINT = 768;

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

const getAggregateStatus = (rows) => {
  if (rows.length === 1) return rows[0].status;
  if (rows.some(r => r.status === 'ditolak')) return 'ditolak';
  if (rows.some(r => r.status === 'ditolak_admin')) return 'ditolak_admin';
  if (rows.every(r => r.status === 'disetujui_admin')) return 'disetujui_admin';
  if (rows.every(r => r.status === 'disetujui_menunggu_admin')) return 'disetujui_menunggu_admin';
  if (rows.some(r => STATUS_SISWA_SETUJU.includes(r.status))) return 'disetujui_siswa';
  return 'menunggu_persetujuan';
};

const TeacherHome = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [guru, setGuru] = useState(null);
  const { toast, showToast } = useToast();
  const [jadwalList, setJadwalList] = useState([]);
  const [pengajuanMasuk, setPengajuanMasuk] = useState([]);
  const [pengajuanSaya, setPengajuanSaya] = useState([]);
  const [pengajuanRiwayatAdmin, setPengajuanRiwayatAdmin] = useState([]);
  const [confirmDeleteRiwayatId, setConfirmDeleteRiwayatId] = useState(null);
  const [deletingRiwayatId, setDeletingRiwayatId] = useState(null);
  const [showAllPengingat, setShowAllPengingat] = useState(false);
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
  const [errorMsg, setErrorMsg] = useState('');
  const [respondingId, setRespondingId] = useState(null);
  const [confirmTolakId, setConfirmTolakId] = useState(null);
  const [confirmDeleteUjianId, setConfirmDeleteUjianId] = useState(null);
  const [deletingUjianId, setDeletingUjianId] = useState(null);

  const [materiRequestList, setMateriRequestList] = useState([]);
  const [ujianTerdekatList, setUjianTerdekatList] = useState([]);

  const [showUjianForm, setShowUjianForm] = useState(false);
  const [ujianForm, setUjianForm] = useState({
    mapel_id: '',
    bab_id: '',
    materi: '',
    nama_siswa: '',
    tanggal: '',
    deskripsi: '',
  });
  const [ujianBabOptions, setUjianBabOptions] = useState([]);
  const [submittingUjian, setSubmittingUjian] = useState(false);

  const [mapelOptions, setMapelOptions] = useState([]);
  // Arsip materi guru (skema baru -- sama seperti yang dipakai TeacherArsipMateri.js:
  // mapel/bab/sub_bab teks bebas + kategori Pribadi/Sekolah/Request). Dipakai sebagai
  // sumber pilihan pada modal "Kirim Materi" di bawah.
  const [materiArsip, setMateriArsip] = useState([]);

  const [showKirimMateri, setShowKirimMateri] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  // Mode pengiriman materi untuk menjawab request: pilih dari arsip yang sudah ada,
  // atau upload file baru (yang otomatis tersimpan ke arsip dengan kategori 'Request').
  const [kirimMateriMode, setKirimMateriMode] = useState('arsip'); // 'arsip' | 'baru'
  const [selectedMateriId, setSelectedMateriId] = useState('');
  const [kirimMateriNote, setKirimMateriNote] = useState('');
  const [kirimBaruForm, setKirimBaruForm] = useState({ judul: '', mapel: '', bab: '', bentuk: 'File', file: null, link: '' });
  const [kirimMateriSubmitting, setKirimMateriSubmitting] = useState(false);

  const [studentNameMap, setStudentNameMap] = useState({});
  // Profile id (auth uid) guru yang login -- dipakai sebagai materi_file.user_id
  // saat guru upload materi baru langsung dari modal Kirim Materi.
  const [profileId, setProfileId] = useState(null);

  const now = new Date();

  // ========== HELPER PILIH JADWAL (Tanggal -> Hari -> Yang Berkepentingan) ==========
  const hariAsal = useMemo(() => getHariFromTanggal(tanggalAsal), [tanggalAsal]);

  const kandidatJadwal = useMemo(() => {
    if (!tanggalAsal || !hariAsal) return [];
    return jadwalList.filter(j => (
      j.is_temporary ? j.tanggal_temporary === tanggalAsal : j.hari === hariAsal
    ));
  }, [jadwalList, tanggalAsal, hariAsal]);

  const getPihakLabel = (j) => {
    let nama = '';
    if (j.siswa_id) nama = studentNameMap[j.siswa_id] || 'Siswa';
    else if (Array.isArray(j.siswa_ids) && j.siswa_ids.length > 0) nama = j.siswa_ids.map(id => studentNameMap[id] || id).join(', ');
    return `${nama || 'Tidak diketahui'}${j.kelas ? ` (${j.kelas})` : ''} - ${formatJam(j.jam_mulai)}-${formatJam(j.jam_selesai)}`;
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

  // Perubahan jadwal yang sudah disetujui ketiganya (siswa, guru, admin) —
  // dipakai untuk kartu pengingat di bawah. Perubahan sementara yang tanggal
  // berlakunya sudah lewat ditandai supaya bisa dihapus (dibersihkan) manual.
  const todayStr = now.toISOString().slice(0, 10);
  const perubahanDisetujuiList = useMemo(() => {
    const isTanggalLewat = (tanggalStr) => !!tanggalStr && tanggalStr < todayStr;
    return pengajuanRiwayatAdmin
      .filter(p => p.status === 'disetujui_admin')
      .map(p => ({ ...p, sudahLewat: p.is_temporary_baru ? isTanggalLewat(p.tanggal_temporary_baru) : false }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [pengajuanRiwayatAdmin, todayStr]);

  const hapusPerubahanDisetujui = async (p) => {
    setDeletingRiwayatId(p.id);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .delete()
        .eq('id', p.id)
        .eq('guru_id', guru.id);
      if (error) throw error;
      setPengajuanRiwayatAdmin(list => list.filter(item => item.id !== p.id));
      setConfirmDeleteRiwayatId(null);
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal menghapus pengingat: ' + err.message);
    } finally {
      setDeletingRiwayatId(null);
    }
  };

  const hour = now.getHours();
  const greeting = hour < 11 ? 'Good Morning' : hour < 15 ? 'Good Afternoon' : hour < 18 ? 'Good Evening' : 'Good Night';
  const title = guru?.gender === 'L' ? 'Mr.' : guru?.gender === 'P' ? 'Ms.' : '';
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
            Khusus tanggal {new Date(p.tanggal_temporary_baru).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} saja (jadwal rutin minggu lain tidak berubah)
          </div>
        ) : (
          <div style={{ fontSize: '0.72rem', color: C.green, fontWeight: 600, marginTop: '2px' }}>
            Perubahan permanen pada jadwal rutin
          </div>
        )}
      </>
    );
  };

  const loadAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const currentProfileId = userData?.user?.id;
      if (!currentProfileId) throw new Error('Tidak ada sesi login yang aktif.');
      setProfileId(currentProfileId);

      const { data: guruData, error: guruError } = await supabase
        .from('guru')
        .select('*')
        .eq('profile_id', currentProfileId)
        .single();
      if (guruError) throw guruError;
      setGuru(guruData);

      const { data: jadwalData, error: jadwalError } = await supabase
        .from('jadwal_les')
        .select('*')
        .eq('guru_id', guruData.id);
      if (jadwalError) throw jadwalError;
      setJadwalList(jadwalData || []);

      const studentIds = new Set();
      jadwalData.forEach(j => {
        if (j.siswa_id) studentIds.add(j.siswa_id);
        if (Array.isArray(j.siswa_ids)) {
          j.siswa_ids.forEach(id => studentIds.add(id));
        }
      });
      if (studentIds.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(studentIds));
        if (!profileError) {
          const map = {};
          profiles.forEach(p => { map[p.id] = p.full_name; });
          setStudentNameMap(map);
        }
      }

      const { data: pengajuanData, error: pengajuanError } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .select('*, jadwal_les(hari, jam_mulai, jam_selesai, kelas)')
        .eq('guru_id', guruData.id)
        .order('created_at', { ascending: false });
      if (pengajuanError) throw pengajuanError;
      const all = pengajuanData || [];
      // 🔥 Hanya tampilkan pengajuan yang benar-benar masih butuh aksi guru.
      // Begitu guru klik Setujui/Tolak, statusnya berubah jadi 'disetujui_menunggu_admin'
      // atau 'ditolak' — keduanya sudah final dari sisi guru, jadi harus hilang dari antrian.
      setPengajuanMasuk(all.filter(p => p.diajukan_oleh === 'siswa' && p.status === 'menunggu_persetujuan'));
      setPengajuanSaya(all.filter(p => p.diajukan_oleh === 'guru' && p.status !== 'disetujui_admin' && p.status !== 'ditolak_admin'));
      // Riwayat: pengajuan yang sudah diputuskan admin (disetujui/ditolak).
      // Diurutkan terbaru dulu (dari query di atas), cap ditentukan saat render.
      setPengajuanRiwayatAdmin(
        all.filter(p => p.status === 'disetujui_admin' || p.status === 'ditolak_admin')
      );

      const { data: materiData, error: materiError } = await supabase
        .from('materi_request')
        .select('*')
        .eq('guru_id', guruData.id)
        .order('created_at', { ascending: false });
      if (materiError) throw materiError;
      setMateriRequestList(materiData || []);

      const { data: tugasData, error: tugasError } = await supabase
        .from('tugas_penilaian')
        .select(`
          *,
          id_mapel (id, nama),
          id_bab (id, nama)
        `)
        .eq('id_guru', guruData.id)
        .not('siswa_id', 'is', null)
        .order('tanggal', { ascending: true });
      if (tugasError) throw tugasError;
      setUjianTerdekatList(tugasData || []);

      await refreshMateriArsip(currentProfileId);
      await loadMapel();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  // Arsip materi guru (skema baru, sama seperti TeacherArsipMateri.js): dipakai untuk
  // opsi "pilih dari arsip" pada modal Kirim Materi. Sengaja ambil status Dipublish dari
  // semua kategori (Pribadi/Sekolah/Request) supaya guru bisa kirim materi apapun yang
  // sudah pernah ia unggah, tidak dibatasi kategori tertentu.
  const refreshMateriArsip = async (userId) => {
    const { data: rows, error: fileError } = await supabase
      .from('materi_file')
      .select('id, nama, mapel, bab, sub_bab, kategori, kelas, tipe, url, status')
      .eq('user_id', userId)
      .eq('status', 'Dipublish')
      .order('tanggal', { ascending: false });
    if (fileError) {
      console.error(fileError);
      return;
    }
    setMateriArsip(rows || []);
  };

  const loadMapel = async () => {
    const { data, error } = await supabase
      .from('materi_mapel')
      .select('*')
      .order('nama');
    if (!error) setMapelOptions(data || []);
  };

  const loadUjianBab = async (mapelId) => {
    if (!mapelId) { setUjianBabOptions([]); return; }
    const { data, error } = await supabase
      .from('materi_bab')
      .select('*')
      .eq('mapel_id', mapelId)
      .order('urutan');
    if (!error) setUjianBabOptions(data || []);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== PENGAJUAN PERUBAHAN JADWAL ==========
  const submitPengajuan = async () => {
    if (!tanggalAsal) {
      setErrorMsg('Pilih tanggal kelas yang ingin diubah terlebih dahulu.');
      return;
    }
    if (!selectedJadwalId) {
      setErrorMsg('Pilih siswa/jadwal yang bersangkutan terlebih dahulu.');
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
      const daftarSiswaId = jadwalTerpilih?.siswa_id
        ? [jadwalTerpilih.siswa_id]
        : (Array.isArray(jadwalTerpilih?.siswa_ids) ? jadwalTerpilih.siswa_ids : []);
      if (daftarSiswaId.length === 0) {
        throw new Error('Jadwal ini tidak memiliki siswa terdaftar, tidak bisa mengajukan perubahan.');
      }
      const isKelompok = daftarSiswaId.length > 1;
      const batchId = isKelompok
        ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
        : null;
      const basePayload = {
        jadwal_id: selectedJadwalId,
        guru_id: guru.id,
        diajukan_oleh: 'guru',
        nama_pengaju: guru.nama,
        hari_baru: formData.hari_baru || null,
        jam_mulai_baru: formData.jam_mulai_baru || null,
        jam_selesai_baru: formData.jam_selesai_baru || null,
        is_temporary_baru: formData.is_temporary_baru,
        tanggal_temporary_baru: formData.is_temporary_baru ? (tanggalAsal || null) : null,
        alasan: formData.alasan || null,
        status: 'menunggu_persetujuan',
      };
      const payloads = daftarSiswaId.map(siswaId => ({
        ...basePayload,
        siswa_id: siswaId,
        batch_id: batchId,
      }));
      const { error } = await supabase.from('pengajuan_perubahan_jadwal').insert(payloads);
      if (error) throw error;
      try {
        if (daftarSiswaId.length > 0) {
          const pesan = `Guru ${guru.nama} mengajukan perubahan jadwal ke ${formData.hari_baru || '-'} ${formData.jam_mulai_baru || ''}-${formData.jam_selesai_baru || ''}.${isKelompok ? ' Perubahan ini butuh persetujuan semua siswa di kelompok.' : ''} Mohon segera direspons.`;
          await supabase.from('notifikasi').insert(
            daftarSiswaId.map(userId => ({ user_id: userId, pesan, link: null }))
          );
        }
      } catch (notifErr) {
        console.error('Gagal mengirim notifikasi ke siswa:', notifErr);
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
      const newStatus = setuju ? 'disetujui_menunggu_admin' : 'ditolak';
      const { error } = await checkedUpdate(
        supabase
          .from('pengajuan_perubahan_jadwal')
          .update({ status: newStatus })
          .eq('id', p.id)
      );
      if (error) throw error;
      if (setuju) {
        const { data: adminUsers, error: adminError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('status', 'approved');
        if (!adminError && adminUsers && adminUsers.length > 0) {
          const pesan = `Guru ${guru.nama} menyetujui pengajuan perubahan jadwal dari ${p.nama_pengaju || 'siswa'} ke ${p.hari_baru || '-'} ${formatJam(p.jam_mulai_baru)}-${formatJam(p.jam_selesai_baru)}. Menunggu persetujuan admin.`;
          for (let admin of adminUsers) {
            await supabase.from('notifikasi').insert({
              user_id: admin.id,
              pesan,
              link: null,
            });
          }
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
  const [materiRespondId, setMateriRespondId] = useState(null);
  const [materiRespondAksi, setMateriRespondAksi] = useState(null);
  const [materiCatatan, setMateriCatatan] = useState('');
  const [materiResponding, setMateriResponding] = useState(false);

  const openMateriRespond = (id, aksi) => {
    setMateriRespondId(id);
    setMateriRespondAksi(aksi);
    setMateriCatatan('');
  };

  const cancelMateriRespond = () => {
    setMateriRespondId(null);
    setMateriRespondAksi(null);
    setMateriCatatan('');
  };

  const submitMateriRespond = async () => {
    if (!materiRespondId || !materiRespondAksi) return;
    setMateriResponding(true);
    setErrorMsg('');
    try {
      const item = materiRequestList.find(m => m.id === materiRespondId);
      const { error } = await checkedUpdate(
        supabase
          .from('materi_request')
          .update({
            status: materiRespondAksi,
            catatan_guru: materiCatatan || null,
            responded_at: new Date().toISOString(),
          })
          .eq('id', materiRespondId)
      );
      if (error) throw error;
      setMateriRequestList(list => list.map(m => (
        m.id === materiRespondId
          ? { ...m, status: materiRespondAksi, catatan_guru: materiCatatan || null }
          : m
      )));
      if (item?.siswa_id) {
        try {
          const label = materiRespondAksi === 'selesai' ? 'diselesaikan' : 'ditolak';
          await supabase.from('notifikasi').insert({
            user_id: item.siswa_id,
            pesan: `Permintaan materi "${item.judul_materi}" telah ${label} oleh guru.${materiCatatan ? ` Catatan: ${materiCatatan}` : ''}`,
            link: null,
          });
        } catch (notifErr) {
          console.error('Gagal mengirim notifikasi ke siswa:', notifErr);
        }
      }
      cancelMateriRespond();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memperbarui materi request.');
    } finally {
      setMateriResponding(false);
    }
  };

  // ========== KIRIM MATERI (dari arsip, atau upload baru yang otomatis masuk arsip) ==========
  const openKirimMateri = (requestId) => {
    const request = materiRequestList.find(m => m.id === requestId);
    setSelectedRequestId(requestId);
    setKirimMateriMode('arsip');
    setSelectedMateriId('');
    setKirimMateriNote('');
    setKirimBaruForm({ judul: request?.judul_materi || '', mapel: '', bab: '', bentuk: 'File', file: null, link: '' });
    setShowKirimMateri(true);
  };

  const closeKirimMateri = () => {
    setShowKirimMateri(false);
    setSelectedRequestId(null);
    setSelectedMateriId('');
    setKirimMateriNote('');
    setKirimBaruForm({ judul: '', mapel: '', bab: '', bentuk: 'File', file: null, link: '' });
  };

  // Menyelesaikan request materi + mengaitkan file materi (materi_file_id) yang menjawabnya,
  // lalu memberi notifikasi ke siswa. Dipakai oleh kedua mode (pilih arsip / upload baru).
  const selesaikanRequestDenganMateri = async (request, materiFileId, materiNama) => {
    const catatan = `Materi "${materiNama}" telah dikirimkan.${kirimMateriNote ? ` Catatan: ${kirimMateriNote}` : ''}`;
    const { error } = await checkedUpdate(
      supabase
        .from('materi_request')
        .update({
          status: 'selesai',
          catatan_guru: catatan,
          responded_at: new Date().toISOString(),
          materi_file_id: materiFileId,
        })
        .eq('id', request.id)
    );
    if (error) throw error;
    if (request.siswa_id) {
      await supabase.from('notifikasi').insert({
        user_id: request.siswa_id,
        pesan: `Guru telah mengirimkan materi "${materiNama}" untuk permintaan "${request.judul_materi}". Silakan cek materi di dashboard Anda.`,
        link: null,
      });
    }
    setMateriRequestList(list => list.map(m => (
      m.id === request.id ? { ...m, status: 'selesai', catatan_guru: catatan, materi_file_id: materiFileId } : m
    )));
  };

  const submitKirimMateri = async () => {
    const request = materiRequestList.find(m => m.id === selectedRequestId);
    if (!request) { showToast('warning', 'Data permintaan tidak ditemukan.'); return; }

    setKirimMateriSubmitting(true);
    try {
      if (kirimMateriMode === 'arsip') {
        if (!selectedMateriId) { showToast('warning', 'Pilih materi yang akan dikirim.'); return; }
        const materi = materiArsip.find(m => m.id === selectedMateriId);
        if (!materi) throw new Error('Materi tidak ditemukan di arsip.');
        await selesaikanRequestDenganMateri(request, materi.id, materi.nama);
      } else {
        // Mode upload baru: guru mengunggah file/link baru khusus untuk request ini.
        // File ini otomatis tersimpan ke materi_file dengan kategori 'Request', sehingga
        // langsung muncul juga di halaman Arsip Materi (TeacherArsipMateri.js).
        if (!kirimBaruForm.judul.trim()) { showToast('warning', 'Isi judul materi.'); return; }
        if (kirimBaruForm.bentuk === 'File' && !kirimBaruForm.file) { showToast('warning', 'Pilih file untuk diunggah.'); return; }
        if (kirimBaruForm.bentuk === 'Link' && !kirimBaruForm.link.trim()) { showToast('warning', 'Isi tautan (link) materi.'); return; }

        let finalUrl = '';
        let tipe = 'link';
        if (kirimBaruForm.bentuk === 'File') {
          finalUrl = await uploadMateriFile(kirimBaruForm.file, profileId);
          tipe = kirimBaruForm.file.type || kirimBaruForm.file.name.split('.').pop();
        } else {
          finalUrl = kirimBaruForm.link.trim();
          tipe = 'link';
        }

        const { data: inserted, error: insertError } = await supabase
          .from('materi_file')
          .insert({
            mapel: kirimBaruForm.mapel.trim() || null,
            bab: kirimBaruForm.bab.trim() || null,
            sub_bab: null,
            user_id: profileId,
            nama: kirimBaruForm.judul.trim(),
            tipe,
            diupload_oleh: guru?.nama || '',
            tanggal: new Date().toISOString(),
            url: finalUrl,
            kelas: request.kelas || null,
            deskripsi: request.deskripsi || null,
            status: 'Dipublish',
            kategori: 'Request',
            folder_id: null,
            bentuk: kirimBaruForm.bentuk,
            pengajar: null,
            jenis: null,
          })
          .select('id, nama, mapel, bab, sub_bab, kategori, kelas, tipe, url, status')
          .single();
        if (insertError) throw insertError;

        setMateriArsip(prev => [inserted, ...prev]);
        await selesaikanRequestDenganMateri(request, inserted.id, inserted.nama);
      }
      closeKirimMateri();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal mengirim materi: ' + err.message);
    } finally {
      setKirimMateriSubmitting(false);
    }
  };

  // ========== PENGAJUAN PENILAIAN/TUGAS ==========
  const submitUjian = async () => {
    if (!ujianForm.mapel_id) {
      setErrorMsg('Pilih mapel terlebih dahulu.');
      return;
    }
    if (!ujianForm.bab_id) {
      setErrorMsg('Pilih bab terlebih dahulu.');
      return;
    }
    if (!ujianForm.materi) {
      setErrorMsg('Isi materi terlebih dahulu.');
      return;
    }
    if (!ujianForm.tanggal) {
      setErrorMsg('Isi tanggal terlebih dahulu.');
      return;
    }
    setSubmittingUjian(true);
    setErrorMsg('');
    try {
      const payload = {
        id_mapel: ujianForm.mapel_id,
        id_bab: ujianForm.bab_id,
        materi: ujianForm.materi,
        nama_siswa: ujianForm.nama_siswa || '',
        tanggal: ujianForm.tanggal,
        deskripsi: ujianForm.deskripsi || '',
        type: 'Penilaian',
        id_guru: guru.id,
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('tugas_penilaian')
        .insert(payload)
        .select();
      if (error) throw error;
      const mapelNama = mapelOptions.find(m => m.id === ujianForm.mapel_id)?.nama || '';
      const babNama = ujianBabOptions.find(b => b.id === ujianForm.bab_id)?.nama || '';
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('status', 'approved');
      if (!adminError && adminUsers && adminUsers.length > 0) {
        for (let admin of adminUsers) {
          await supabase.from('notifikasi').insert({
            user_id: admin.id,
            pesan: `Guru ${guru.nama} menambahkan jadwal penilaian/tugas: ${mapelNama} - ${babNama} (${ujianForm.materi})${ujianForm.nama_siswa ? ` untuk ${ujianForm.nama_siswa}` : ''} pada tanggal ${ujianForm.tanggal}`,
            link: '/admin/ujian',
          });
        }
      }
      setShowUjianForm(false);
      setUjianForm({ mapel_id: '', bab_id: '', materi: '', nama_siswa: '', tanggal: '', deskripsi: '' });
      setUjianBabOptions([]);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengajukan penilaian/tugas.');
    } finally {
      setSubmittingUjian(false);
    }
  };

  const deleteUjian = async (item) => {
    setDeletingUjianId(item.id);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('tugas_penilaian')
        .delete()
        .eq('id', item.id)
        .eq('id_guru', guru.id);
      if (error) throw error;
      setConfirmDeleteUjianId(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal menghapus penilaian/tugas: ' + err.message);
    } finally {
      setDeletingUjianId(null);
    }
  };

  // ========== UPLOAD MATERI ==========
  const uploadMateriFile = async (file, authUid) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${authUid}/${fileName}`;
    const { error } = await supabase.storage
      .from('materi')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from('materi')
      .getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  // ========== RENDER ==========
  const cardStyle = { background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: isMobile ? '1rem' : '1.5rem' };
  const linkBtn = { background: 'none', border: 'none', color: C.gold, fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' };
  const modalOverlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 60,
  };
  const modalContentStyle = {
    background: C.white, borderRadius: isMobile ? '16px 16px 0 0' : '16px', padding: isMobile ? '1.25rem' : '1.5rem',
    width: isMobile ? '100%' : '500px', maxWidth: isMobile ? '100%' : '90vw',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
    maxHeight: '90vh', overflowY: 'auto',
  };
  const buttonBatal = {
    background: 'none', border: `1px solid ${C.border}`, borderRadius: '8px',
    padding: isMobile ? '12px 20px' : '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: isMobile ? '16px' : '0.9rem',
  };
  const buttonKirim = {
    background: C.gold, color: C.white, border: 'none', borderRadius: '8px',
    padding: isMobile ? '12px 20px' : '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: isMobile ? '16px' : '0.9rem',
  };
  const buttonSecondary = {
    background: C.cream, color: C.dark, border: `1px solid ${C.border}`, borderRadius: '8px',
    padding: isMobile ? '10px 16px' : '6px 14px', cursor: 'pointer', fontSize: isMobile ? '0.95rem' : '0.8rem',
    fontFamily: 'inherit',
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
      <Toast toast={toast} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 200, width: 'auto', maxWidth: '320px' }} />
      {/* Sapaan */}
      <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.8rem', fontWeight: '700', color: C.dark, margin: '0' }}>
          {greeting}{title ? `, ${title}` : ''} {guru?.nama || 'Guru'}!
        </h1>
        <p style={{ fontSize: isMobile ? '0.88rem' : '1rem', color: C.gray, margin: '0.25rem 0 0 0' }}>
          Selamat datang kembali! Setiap ilmu yang Anda bagikan hari ini adalah benih kebaikan untuk masa depan.
        </p>
        <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: '0.3rem' }}>
          <strong>Hari Ini</strong> - {dateStr}
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Grid: kiri (Jadwal) 2 baris, kanan atas (Penilaian), kanan bawah (Pengajuan) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: isMobile ? '1rem' : '1.5rem',
        marginBottom: isMobile ? '1rem' : '1.5rem',
        alignItems: 'start',
      }}>
        {/* Kiri: Jadwal Mengajar Minggu Ini */}
        <div style={{ ...cardStyle, gridRow: isMobile ? 'auto' : '1 / 3' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark, fontSize: isMobile ? '1.1rem' : '1.17rem' }}>Jadwal Mengajar Minggu Ini</h3>
          {loading ? (
            <p style={{ color: C.gray, fontSize: '0.9rem' }}>Memuat jadwal...</p>
          ) : slots.length === 0 ? (
            <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada jadwal tetap.</p>
          ) : isMobile ? (
            // ===== TAMPILAN MOBILE: URUTKAN BERDASARKAN HARI =====
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {HARI_LIST.map(hari => {
                // Cari slot yang memiliki jadwal di hari ini
                const daySlots = slots.filter(slot => getCell(hari, slot));
                if (daySlots.length === 0) {
                  return (
                    <div key={hari} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '0.75rem', background: C.cream }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{hari}</div>
                      <div style={{ fontSize: '0.8rem', color: C.gray }}>Tidak ada jadwal</div>
                    </div>
                  );
                }
                return (
                  <div key={hari} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.4rem' }}>{hari}</div>
                    {daySlots.map(slot => {
                      const cell = getCell(hari, slot);
                      const badge = badgeForJenis(cell.jenis);
                      let displayName = '-';
                      if (cell.siswa_id) {
                        displayName = studentNameMap[cell.siswa_id] || cell.siswa_id;
                      } else if (Array.isArray(cell.siswa_ids) && cell.siswa_ids.length > 0) {
                        displayName = cell.siswa_ids.map(id => studentNameMap[id] || id).join(', ');
                      }
                      return (
                        <div key={slot.jam_mulai} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}`, fontSize: '0.85rem' }}>
                          <span>{formatJam(slot.jam_mulai)} - {formatJam(slot.jam_selesai)}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'right' }}>
                            <span>{displayName}</span>
                            <span style={{ fontSize: '0.7rem', border: `1px solid ${badge.color}`, borderRadius: '4px', padding: '0 4px', color: badge.color }}>
                              {badge.letter}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            // ===== TAMPILAN TABEL DESKTOP =====
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
                        let displayName = '-';
                        if (cell.siswa_id) {
                          displayName = studentNameMap[cell.siswa_id] || cell.siswa_id;
                        } else if (Array.isArray(cell.siswa_ids) && cell.siswa_ids.length > 0) {
                          displayName = cell.siswa_ids.map(id => studentNameMap[id] || id).join(', ');
                        }
                        return (
                          <td
                            key={hari}
                            style={{ padding: '8px', textAlign: 'center', cursor: 'pointer' }}
                            onClick={() => openFormFromCell(cell.id)}
                            title="Klik untuk ajukan perubahan jadwal ini"
                          >
                            <div style={{ color: badge.color, fontWeight: 600, fontSize: '0.8rem' }}>
                              {displayName}
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
          <button style={{ ...linkBtn, marginTop: '1rem', padding: '10px 16px', fontSize: isMobile ? '1rem' : '0.9rem' }} onClick={openBlankForm}>
            + Ajukan Perubahan Jadwal
          </button>
        </div>

        {/* Kanan Atas: Penilaian/Tugas Terdekat */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark, fontSize: isMobile ? '1.1rem' : '1.17rem' }}>Penilaian/Tugas Terdekat (dari Siswa)</h3>
          {loading ? (
            <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
          ) : ujianTerdekatList.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada penilaian/tugas dari siswa.</p>
          ) : (
            ujianTerdekatList.map((item, idx) => (
              <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < ujianTerdekatList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-start', gap: isMobile ? '0.25rem' : 0 }}>
                  <div>
                    <div style={{ fontWeight: '600', color: C.dark, fontSize: isMobile ? '1rem' : '0.9rem' }}>
                      {item.judul_bab || item.materi}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: C.gray }}>
                      {item.mapel
                        ? (MAPEL_TUGAS_LIST.find(m => m.value === item.mapel)?.label || item.mapel)
                        : item.id_mapel?.nama}
                      {item.id_bab?.nama ? ` - ${item.id_bab.nama}` : ''}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: C.gray }}>
                      Dari siswa: {item.nama_siswa || 'Tidak diketahui'}
                    </div>
                    {item.nama_guru_sekolah && (
                      <div style={{ fontSize: '0.8rem', color: C.gray }}>
                        Guru pengajar di sekolah: {item.nama_guru_sekolah}
                      </div>
                    )}
                    {(item.deskripsi || item.catatan_link) && (
                      <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic' }}>
                        {item.deskripsi}
                        {item.catatan_link && (
                          <>
                            {item.deskripsi ? ' - ' : ''}
                            <a href={item.catatan_link} target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>
                              Lihat link materi ujian
                            </a>
                          </>
                        )}
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
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {confirmDeleteUjianId === item.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '0.72rem', color: C.dark }}>Yakin hapus?</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => deleteUjian(item)}
                            disabled={deletingUjianId === item.id}
                            style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px', opacity: deletingUjianId === item.id ? 0.6 : 1 }}
                          >
                            {deletingUjianId === item.id ? 'Menghapus...' : 'Ya, Hapus'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteUjianId(null)}
                            disabled={deletingUjianId === item.id}
                            style={{ background: 'none', border: 'none', color: C.gray, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteUjianId(item.id)}
                        style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Kanan Bawah: Pengajuan Perubahan Jadwal */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark, fontSize: isMobile ? '1.1rem' : '1.17rem' }}>Pengajuan Perubahan Jadwal</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>
                Butuh Persetujuan Anda ({pengajuanMasuk.length})
              </div>
              {pengajuanMasuk.length === 0 ? (
                <p style={{ color: C.gray, fontSize: '0.82rem', marginTop: 0 }}>Tidak ada pengajuan dari siswa.</p>
              ) : (
                pengajuanMasuk.map(p => (
                  <div key={p.id} style={{ padding: '0.6rem 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '0.85rem', color: C.dark, fontWeight: 600 }}>{p.nama_pengaju || 'Siswa'}</div>
                    {renderPerubahanInfo(p)}
                    {p.alasan && <div style={{ fontSize: '0.75rem', color: C.gray, fontStyle: 'italic' }}>"{p.alasan}"</div>}
                    {confirmTolakId === p.id ? (
                      <div style={{ marginTop: '0.4rem' }}>
                        <div style={{ fontSize: '0.78rem', color: C.dark, marginBottom: '0.3rem' }}>Yakin ingin menolak pengajuan ini?</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            style={{ ...linkBtn, color: C.red, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1, padding: '8px 12px' }}
                            onClick={() => respondPengajuan(p, false)}
                            disabled={respondingId === p.id}
                          >
                            {respondingId === p.id ? 'Memproses...' : 'Ya, Tolak'}
                          </button>
                          <button
                            style={{ ...linkBtn, color: C.gray, fontSize: '0.8rem', padding: '8px 12px' }}
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
                          style={{ ...linkBtn, color: C.green, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1, padding: '8px 12px' }}
                          onClick={() => respondPengajuan(p, true)}
                          disabled={respondingId === p.id}
                        >
                          {respondingId === p.id ? 'Memproses...' : 'Setujui'}
                        </button>
                        <button
                          style={{ ...linkBtn, color: C.red, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1, padding: '8px 12px' }}
                          onClick={() => setConfirmTolakId(p.id)}
                          disabled={respondingId === p.id}
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                ))
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
                  const approvedCount = item.rows.filter(r => STATUS_SISWA_SETUJU.includes(r.status)).length;
                  return (
                    <div key={item.id} style={{ padding: '0.5rem 0', borderBottom: `1px solid ${C.border}` }}>
                      {renderPerubahanInfo(first)}
                      {item.isBatch && (
                        <div style={{ fontSize: '0.72rem', color: C.gray, margin: '2px 0' }}>
                          {approvedCount}/{item.rows.length} siswa menyetujui
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

      {/* Pengingat Perubahan Jadwal (disetujui siswa, guru, & admin) */}
      <div style={{ background: C.goldBg, borderRadius: '12px', padding: isMobile ? '0.85rem 1rem' : '1rem 1.5rem', border: `1px solid ${C.gold}`, marginBottom: isMobile ? '1rem' : '1.5rem' }}>
        <p style={{ margin: '0 0 0.5rem 0', color: C.dark, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 700 }}>
          ⚠️ Pengingat Perubahan Jadwal
        </p>
        {perubahanDisetujuiList.length === 0 ? (
          <p style={{ margin: 0, color: C.dark, fontSize: isMobile ? '0.85rem' : '0.95rem' }}>
            Tidak ada perubahan jadwal yang sudah disetujui saat ini.
          </p>
        ) : (
          <>
            {(showAllPengingat ? perubahanDisetujuiList : perubahanDisetujuiList.slice(0, 3)).map((p, idx) => (
              <div
                key={p.id}
                style={{
                  padding: '0.5rem 0',
                  borderTop: idx > 0 ? `1px solid ${C.gold}55` : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', color: C.dark }}>
                    {p.diajukan_oleh === 'siswa' ? (p.nama_pengaju || 'Siswa') : 'Anda'} · disetujui siswa, guru, & admin
                  </div>
                  {renderPerubahanInfo(p)}
                </div>
                {(p.sudahLewat || p.diajukan_oleh !== 'siswa') && (
                  confirmDeleteRiwayatId === p.id ? (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: C.dark }}>Hapus?</span>
                      <button
                        onClick={() => hapusPerubahanDisetujui(p)}
                        disabled={deletingRiwayatId === p.id}
                        style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
                      >
                        {deletingRiwayatId === p.id ? 'Menghapus...' : 'Ya'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteRiwayatId(null)}
                        disabled={deletingRiwayatId === p.id}
                        style={{ background: 'none', border: 'none', color: C.gray, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteRiwayatId(p.id)}
                      title={p.sudahLewat ? 'Tanggal berlakunya sudah lewat' : 'Hapus pengajuan Anda'}
                      style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px', whiteSpace: 'nowrap' }}
                    >
                      {p.sudahLewat ? 'Hapus (sudah lewat)' : 'Hapus'}
                    </button>
                  )
                )}
              </div>
            ))}
            {perubahanDisetujuiList.length > 3 && (
              <button
                onClick={() => setShowAllPengingat(s => !s)}
                style={{ background: 'none', border: 'none', color: C.gold, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', padding: '6px 2px', marginTop: '0.25rem' }}
              >
                {showAllPengingat ? 'Sembunyikan' : `Tampilkan semua (${perubahanDisetujuiList.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Materi Request */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.5rem' : 0, marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: C.dark, fontSize: isMobile ? '1rem' : '1.17rem' }}>
            Materi Request ({materiRequestList.filter(m => m.status !== 'selesai' && m.status !== 'ditolak').length})
          </h3>
          <span style={{ fontSize: isMobile ? '0.78rem' : '0.8rem', color: C.gray }}>
            Untuk mengunggah materi baru (bukan menjawab request), buka menu <strong>Arsip Materi</strong>.
          </span>
        </div>
        {loading ? (
          <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
        ) : materiRequestList.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada permintaan materi dari siswa.</p>
        ) : (
          materiRequestList.map((item, idx) => (
            <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < materiRequestList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: isMobile ? '0.6rem' : 0 }}>
                <div>
                  <div style={{ fontWeight: '600', color: C.dark, fontSize: isMobile ? '1rem' : '0.9rem' }}>{item.judul_materi}</div>
                  <div style={{ fontSize: '0.85rem', color: C.gray }}>{item.siswa_nama || 'Siswa'}{item.kelas ? ` - ${item.kelas}` : ''}</div>
                  {item.deskripsi && (
                    <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic' }}>{item.deskripsi}</div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: C.gray }}>{waktuLalu(item.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {item.status === 'selesai' ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.greenBg, color: C.green, whiteSpace: 'nowrap' }}>Selesai</span>
                  ) : item.status === 'ditolak' ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.redBg, color: C.red, whiteSpace: 'nowrap' }}>Ditolak</span>
                  ) : (
                    <>
                      <button
                        style={{ ...buttonSecondary, background: C.gold, color: C.white, border: 'none' }}
                        onClick={() => openKirimMateri(item.id)}
                      >
                        Kirim Materi
                      </button>
                      <button
                        style={{ ...buttonSecondary, color: C.green }}
                        onClick={() => openMateriRespond(item.id, 'selesai')}
                      >
                        Tandai Selesai
                      </button>
                      <button
                        style={{ ...buttonSecondary, color: C.red }}
                        onClick={() => openMateriRespond(item.id, 'ditolak')}
                      >
                        Tolak
                      </button>
                    </>
                  )}
                </div>
              </div>

              {item.catatan_guru && (item.status === 'selesai' || item.status === 'ditolak') && (
                <div style={{
                  marginTop: '0.4rem', fontSize: '0.78rem', color: C.gray, background: C.cream,
                  borderRadius: '8px', padding: '0.5rem 0.7rem'
                }}>
                  💬 {item.catatan_guru}
                </div>
              )}

              {materiRespondId === item.id && (
                <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.78rem', color: C.gray }}>
                    {materiRespondAksi === 'selesai' ? 'Catatan (opsional)' : 'Alasan penolakan'}
                  </label>
                  <textarea
                    value={materiCatatan}
                    onChange={(e) => setMateriCatatan(e.target.value)}
                    rows={2}
                    placeholder={materiRespondAksi === 'selesai' ? 'Contoh: Materi sudah diunggah di bab terkait.' : 'Contoh: Materi ini belum sesuai kurikulum saat ini.'}
                    style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={cancelMateriRespond} style={buttonBatal} disabled={materiResponding}>Batal</button>
                    <button
                      onClick={submitMateriRespond}
                      disabled={materiResponding || (materiRespondAksi === 'ditolak' && !materiCatatan.trim())}
                      style={{
                        ...buttonKirim,
                        background: materiRespondAksi === 'ditolak' ? C.red : C.green,
                        opacity: materiResponding || (materiRespondAksi === 'ditolak' && !materiCatatan.trim()) ? 0.6 : 1
                      }}
                    >
                      {materiResponding ? 'Menyimpan...' : materiRespondAksi === 'selesai' ? 'Simpan' : 'Tolak Permintaan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Kirim Materi: pilih dari arsip yang sudah ada, atau upload baru
          (yang otomatis tersimpan ke arsip dengan kategori 'Request'). */}
      {showKirimMateri && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle }}>
            <h3 style={{ margin: '0 0 0.75rem 0', color: C.dark, fontSize: isMobile ? '1.2rem' : '1.17rem' }}>Kirim Materi</h3>

            <div style={{ display: 'flex', gap: '6px', background: C.cream, padding: '4px', borderRadius: '10px', marginBottom: '0.75rem' }}>
              {[{ v: 'arsip', l: 'Pilih dari Arsip' }, { v: 'baru', l: 'Upload Materi Baru' }].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setKirimMateriMode(opt.v)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: isMobile ? '0.85rem' : '0.82rem',
                    fontWeight: kirimMateriMode === opt.v ? 'bold' : 'normal',
                    background: kirimMateriMode === opt.v ? C.white : 'transparent',
                    color: kirimMateriMode === opt.v ? C.dark : C.gray,
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            {kirimMateriMode === 'arsip' ? (
              <>
                <p style={{ fontSize: '0.85rem', color: C.gray, margin: '0 0 0.5rem 0' }}>
                  Pilih materi yang sudah pernah Anda unggah untuk dikirim ke siswa.
                </p>
                <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Pilih Materi</label>
                <select
                  value={selectedMateriId}
                  onChange={(e) => setSelectedMateriId(e.target.value)}
                  style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
                >
                  <option value="">-- Pilih Materi --</option>
                  {materiArsip.length === 0 && <option value="" disabled>Belum ada materi di arsip.</option>}
                  {materiArsip.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nama}{m.mapel ? ` - ${m.mapel}` : ''}{m.bab ? ` (${m.bab})` : ''}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: C.gray, margin: '0 0 0.5rem 0' }}>
                  File/link ini akan otomatis tersimpan juga di Arsip Materi (kategori "Dari Request").
                </p>
                <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Judul Materi</label>
                <input
                  type="text"
                  value={kirimBaruForm.judul}
                  onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, judul: e.target.value })}
                  style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Mapel (opsional)</label>
                    <input
                      type="text"
                      value={kirimBaruForm.mapel}
                      onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, mapel: e.target.value })}
                      style={{ width: '100%', padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Bab (opsional)</label>
                    <input
                      type="text"
                      value={kirimBaruForm.bab}
                      onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, bab: e.target.value })}
                      style={{ width: '100%', padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', background: C.cream, padding: '4px', borderRadius: '10px', marginTop: '0.4rem' }}>
                  {[{ v: 'File', l: '📁 Unggah File' }, { v: 'Link', l: '🔗 Tautan (Link)' }].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setKirimBaruForm({ ...kirimBaruForm, bentuk: opt.v })}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: isMobile ? '0.85rem' : '0.82rem',
                        fontWeight: kirimBaruForm.bentuk === opt.v ? 'bold' : 'normal',
                        background: kirimBaruForm.bentuk === opt.v ? C.white : 'transparent',
                        color: kirimBaruForm.bentuk === opt.v ? C.dark : C.gray,
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>

                {kirimBaruForm.bentuk === 'File' ? (
                  <input
                    type="file"
                    onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, file: e.target.files?.[0] || null })}
                    style={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
                  />
                ) : (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={kirimBaruForm.link}
                    onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, link: e.target.value })}
                    style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
                  />
                )}
              </>
            )}

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray, marginTop: '0.5rem' }}>Catatan (opsional)</label>
            <textarea
              value={kirimMateriNote}
              onChange={(e) => setKirimMateriNote(e.target.value)}
              rows={2}
              placeholder="Tambahkan catatan untuk siswa"
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, resize: 'vertical', fontFamily: 'inherit', fontSize: isMobile ? '16px' : '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={closeKirimMateri} style={buttonBatal} disabled={kirimMateriSubmitting}>Batal</button>
              <button onClick={submitKirimMateri} disabled={kirimMateriSubmitting} style={{ ...buttonKirim, background: C.green, opacity: kirimMateriSubmitting ? 0.6 : 1 }}>
                {kirimMateriSubmitting ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Penilaian/Tugas */}
      {showUjianForm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: isMobile ? '1.2rem' : '1.17rem' }}>Tambah Jadwal Penilaian/Tugas</h3>
            <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: '-0.5rem' }}>
              Jadwal akan langsung aktif dan admin akan menerima notifikasi sebagai informasi.
            </p>
            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Mapel</label>
            <select
              value={ujianForm.mapel_id}
              onChange={(e) => {
                const val = e.target.value;
                setUjianForm({ ...ujianForm, mapel_id: val, bab_id: '' });
                loadUjianBab(val);
              }}
              style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
            >
              <option value="">-- Pilih Mapel --</option>
              {mapelOptions.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </select>

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Bab</label>
            <select
              value={ujianForm.bab_id}
              onChange={(e) => setUjianForm({ ...ujianForm, bab_id: e.target.value })}
              style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
              disabled={!ujianForm.mapel_id}
            >
              <option value="">-- Pilih Bab --</option>
              {ujianBabOptions.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
            </select>

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Materi</label>
            <input
              type="text"
              placeholder="Contoh: Bilangan Pecahan"
              value={ujianForm.materi}
              onChange={(e) => setUjianForm({ ...ujianForm, materi: e.target.value })}
              style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
            />

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Nama Siswa (opsional)</label>
            <input
              type="text"
              placeholder="Nama siswa"
              value={ujianForm.nama_siswa}
              onChange={(e) => setUjianForm({ ...ujianForm, nama_siswa: e.target.value })}
              style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
            />

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Tanggal</label>
            <input
              type="date"
              value={ujianForm.tanggal}
              onChange={(e) => setUjianForm({ ...ujianForm, tanggal: e.target.value })}
              style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
            />

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Deskripsi (opsional)</label>
            <textarea
              value={ujianForm.deskripsi}
              onChange={(e) => setUjianForm({ ...ujianForm, deskripsi: e.target.value })}
              rows={2}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, resize: 'vertical', fontSize: isMobile ? '16px' : '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowUjianForm(false); setUjianBabOptions([]); }} style={buttonBatal}>Batal</button>
              <button onClick={submitUjian} disabled={submittingUjian} style={{ ...buttonKirim, opacity: submittingUjian ? 0.6 : 1 }}>{submittingUjian ? 'Mengirim...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal form pengajuan perubahan jadwal */}
      {showForm && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 1rem 0', color: C.dark, fontSize: isMobile ? '1.2rem' : '1.17rem' }}>Ajukan Perubahan Jadwal</h3>

            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>Jadwal yang Ingin Diubah</div>

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Tanggal Kelas</label>
            <input
              type="date"
              value={tanggalAsal}
              onChange={(e) => { setTanggalAsal(e.target.value); setSelectedJadwalId(''); }}
              style={{ width: '100%', padding: isMobile ? '12px' : '8px', marginBottom: '0.4rem', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem', boxSizing: 'border-box' }}
            />
            {tanggalAsal && (
              <div style={{ fontSize: '0.8rem', color: C.gray, marginBottom: '0.75rem' }}>
                Hari: <strong style={{ color: C.dark }}>{hariAsal || '-'}</strong>
              </div>
            )}

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Siswa yang Bersangkutan</label>
            <select
              value={selectedJadwalId}
              onChange={(e) => applyJadwalSelection(e.target.value)}
              disabled={!tanggalAsal}
              style={{ width: '100%', padding: isMobile ? '12px' : '8px', marginBottom: '0.25rem', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem', opacity: tanggalAsal ? 1 : 0.6 }}
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

            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Hari Pengganti</label>
            <select
              value={formData.hari_baru}
              onChange={(e) => setFormData({ ...formData, hari_baru: e.target.value })}
              style={{ width: '100%', padding: isMobile ? '12px' : '8px', marginBottom: '0.75rem', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
            >
              <option value="">-- Pilih --</option>
              {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Jam Mulai</label>
                <input
                  type="time"
                  value={formData.jam_mulai_baru}
                  onChange={(e) => setFormData({ ...formData, jam_mulai_baru: e.target.value })}
                  style={{ width: '100%', padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Jam Selesai</label>
                <input
                  type="time"
                  value={formData.jam_selesai_baru}
                  onChange={(e) => setFormData({ ...formData, jam_selesai_baru: e.target.value })}
                  style={{ width: '100%', padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>Sifat Pengajuan</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_temporary_baru: false })}
                style={{
                  flex: 1, padding: isMobile ? '12px' : '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: isMobile ? '0.95rem' : '0.85rem', fontWeight: 600,
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
                  flex: 1, padding: isMobile ? '12px' : '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: isMobile ? '0.95rem' : '0.85rem', fontWeight: 600,
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
                <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.dark, fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Alasan (kenapa perubahan ini sementara) <span style={{ color: C.red }}>*</span>
                </label>
                <textarea
                  value={formData.alasan}
                  onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                  rows={3}
                  placeholder="Contoh: Ada acara sekolah, siswa berhalangan hadir, dll."
                  style={{
                    width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '10px',
                    border: `1.5px solid ${C.gold}`, background: C.goldBg, resize: 'vertical',
                    minHeight: '90px', fontSize: isMobile ? '16px' : '0.9rem', boxSizing: 'border-box',
                    color: C.dark, fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setShowForm(false)} style={buttonBatal}>Batal</button>
              <button onClick={submitPengajuan} disabled={submitting} style={{ ...buttonKirim, opacity: submitting ? 0.6 : 1 }}>{submitting ? 'Mengirim...' : 'Kirim Pengajuan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherHome;