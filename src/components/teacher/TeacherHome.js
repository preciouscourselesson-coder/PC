import React, { useState, useEffect, useMemo } from 'react';
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

const TeacherHome = () => {
  const [loading, setLoading] = useState(true);
  const [guru, setGuru] = useState(null);
  const [jadwalList, setJadwalList] = useState([]);
  const [pengajuanMasuk, setPengajuanMasuk] = useState([]);
  const [pengajuanSaya, setPengajuanSaya] = useState([]);
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
  const [errorMsg, setErrorMsg] = useState('');
  const [respondingId, setRespondingId] = useState(null);
  const [confirmTolakId, setConfirmTolakId] = useState(null);

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

  const [showMateriForm, setShowMateriForm] = useState(false);
  const [materiForm, setMateriForm] = useState({
    mapel_id: '',
    mapel_nama: '',
    bab_id: '',
    bab_nama: '',
    file: null,
    link: '',
  });
  const [mapelOptions, setMapelOptions] = useState([]);
  const [babOptions, setBabOptions] = useState([]);
  const [submittingMateri, setSubmittingMateri] = useState(false);
  const [materiArsip, setMateriArsip] = useState([]);

  const [showKirimMateri, setShowKirimMateri] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedMateriId, setSelectedMateriId] = useState('');
  const [kirimMateriNote, setKirimMateriNote] = useState('');

  const [studentNameMap, setStudentNameMap] = useState({});

  const now = new Date();

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
      const profileId = userData?.user?.id;
      if (!profileId) throw new Error('Tidak ada sesi login yang aktif.');

      const { data: guruData, error: guruError } = await supabase
        .from('guru')
        .select('*')
        .eq('profile_id', profileId)
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
      setPengajuanMasuk(all.filter(p => p.diajukan_oleh === 'siswa' && p.status === 'menunggu_persetujuan'));
      setPengajuanSaya(all.filter(p => p.diajukan_oleh === 'guru'));

      const { data: materiData, error: materiError } = await supabase
        .from('materi_request')
        .select('*')
        .eq('guru_id', guruData.id)
        .order('created_at', { ascending: false });
      if (materiError) throw materiError;
      setMateriRequestList(materiData || []);

      // 🔥 Perbaikan: Hapus filter tanggal agar semua data dari siswa muncul
      const { data: tugasData, error: tugasError } = await supabase
        .from('tugas_penilaian')
        .select(`
          *,
          id_mapel (id, nama),
          id_bab (id, nama)
        `)
        .eq('id_guru', guruData.id)
        .not('siswa_id', 'is', null)  // hanya dari siswa
        .order('tanggal', { ascending: true });
      if (tugasError) throw tugasError;
      setUjianTerdekatList(tugasData || []);

      const { data: fileData, error: fileError } = await supabase
        .from('materi_file')
        .select(`
          *,
          bab_id (id, nama, mapel_id (id, nama))
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });
      if (!fileError) setMateriArsip(fileData || []);

      await loadMapel();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  const loadMapel = async () => {
    const { data, error } = await supabase
      .from('materi_mapel')
      .select('*')
      .order('nama');
    if (!error) setMapelOptions(data || []);
  };

  const loadBab = async (mapelId) => {
    if (!mapelId) { setBabOptions([]); return; }
    const { data, error } = await supabase
      .from('materi_bab')
      .select('*')
      .eq('mapel_id', mapelId)
      .order('urutan');
    if (!error) setBabOptions(data || []);
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
        tanggal_temporary_baru: formData.is_temporary_baru ? (formData.tanggal_temporary_baru || null) : null,
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
      const { error } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .update({ status: newStatus })
        .eq('id', p.id);
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
      const { error } = await supabase
        .from('materi_request')
        .update({
          status: materiRespondAksi,
          catatan_guru: materiCatatan || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', materiRespondId);
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

  // ========== KIRIM MATERI DARI ARSIP ==========
  const openKirimMateri = (requestId) => {
    setSelectedRequestId(requestId);
    setSelectedMateriId('');
    setKirimMateriNote('');
    setShowKirimMateri(true);
  };

  const submitKirimMateri = async () => {
    if (!selectedRequestId || !selectedMateriId) {
      alert('Pilih materi yang akan dikirim.');
      return;
    }
    try {
      const request = materiRequestList.find(m => m.id === selectedRequestId);
      const materi = materiArsip.find(m => m.id === selectedMateriId);
      if (!request || !materi) throw new Error('Data tidak ditemukan.');

      const { error } = await supabase
        .from('materi_request')
        .update({
          status: 'selesai',
          catatan_guru: `Materi "${materi.nama}" telah dikirimkan.${kirimMateriNote ? ` Catatan: ${kirimMateriNote}` : ''}`,
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedRequestId);
      if (error) throw error;

      if (request?.siswa_id) {
        await supabase.from('notifikasi').insert({
          user_id: request.siswa_id,
          pesan: `Guru telah mengirimkan materi "${materi.nama}" untuk permintaan "${request.judul_materi}". Silakan cek materi di dashboard Anda.`,
          link: null,
        });
      }

      setMateriRequestList(list => list.map(m =>
        m.id === selectedRequestId
          ? { ...m, status: 'selesai', catatan_guru: `Materi "${materi.nama}" telah dikirimkan.${kirimMateriNote ? ` Catatan: ${kirimMateriNote}` : ''}` }
          : m
      ));

      setShowKirimMateri(false);
      setSelectedRequestId(null);
      setSelectedMateriId('');
      setKirimMateriNote('');
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim materi: ' + err.message);
    }
  };

  // ========== PENGAJUAN PENILAIAN/TUGAS (untuk guru, tetap dipertahankan) ==========
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

  const submitMateri = async () => {
    setSubmittingMateri(true);
    setErrorMsg('');
    try {
      let mapelId = materiForm.mapel_id;
      if (materiForm.mapel_id === 'new' && materiForm.mapel_nama) {
        const { data: newMapel, error: mapelError } = await supabase
          .from('materi_mapel')
          .insert({ nama: materiForm.mapel_nama })
          .select();
        if (mapelError) throw mapelError;
        mapelId = newMapel[0].id;
        await loadMapel();
      } else if (!materiForm.mapel_id) {
        throw new Error('Pilih atau tambahkan mapel.');
      }

      let babId = materiForm.bab_id;
      if (materiForm.bab_id === 'new' && materiForm.bab_nama) {
        const { data: newBab, error: babError } = await supabase
          .from('materi_bab')
          .insert({ nama: materiForm.bab_nama, mapel_id: mapelId })
          .select();
        if (babError) throw babError;
        babId = newBab[0].id;
      } else if (!materiForm.bab_id) {
        throw new Error('Pilih atau tambahkan bab.');
      }

      let fileUrl = null;
      let fileTipe = null;
      let fileNama = '';

      if (materiForm.file) {
        fileUrl = await uploadMateriFile(materiForm.file, guru.profile_id);
        fileTipe = materiForm.file.type.startsWith('image/') ? 'image' : 'pdf';
        fileNama = materiForm.file.name;
      } else if (materiForm.link) {
        fileUrl = materiForm.link;
        fileTipe = 'link';
        fileNama = 'Link Materi';
      } else {
        throw new Error('Pilih file atau masukkan link.');
      }

      const { error: fileError } = await supabase
        .from('materi_file')
        .insert({
          bab_id: babId,
          user_id: guru.profile_id,
          nama: fileNama,
          tipe: fileTipe,
          diupload_oleh: guru.nama,
          tanggal: new Date().toISOString().split('T')[0],
          url: fileUrl,
        });
      if (fileError) throw fileError;

      setShowMateriForm(false);
      setMateriForm({ mapel_id: '', mapel_nama: '', bab_id: '', bab_nama: '', file: null, link: '' });
      const { data: fileData, error: refreshError } = await supabase
        .from('materi_file')
        .select(`
          *,
          bab_id (id, nama, mapel_id (id, nama))
        `)
        .eq('user_id', guru.profile_id)
        .order('created_at', { ascending: false });
      if (!refreshError) setMateriArsip(fileData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyimpan materi.');
    } finally {
      setSubmittingMateri(false);
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
  const buttonSecondary = {
    background: C.cream, color: C.dark, border: `1px solid ${C.border}`, borderRadius: '8px',
    padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem'
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
          {greeting}{title ? `, ${title}` : ''} {guru?.nama || 'Guru'}!
        </h1>
        <p style={{ fontSize: '1rem', color: C.gray, margin: '0.25rem 0 0 0' }}>
          Selamat datang kembali! Setiap ilmu yang Anda bagikan hari ini adalah benih kebaikan untuk masa depan.
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
        {/* Kiri: Jadwal Mengajar Minggu Ini - row 1 / 3 */}
        <div style={{ ...cardStyle, gridRow: '1 / 3' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Jadwal Mengajar Minggu Ini</h3>
          {loading ? (
            <p style={{ color: C.gray, fontSize: '0.9rem' }}>Memuat jadwal...</p>
          ) : slots.length === 0 ? (
            <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada jadwal tetap.</p>
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
                              {(() => {
                                if (cell.siswa_id) {
                                  return studentNameMap[cell.siswa_id] || cell.siswa_id;
                                } else if (Array.isArray(cell.siswa_ids) && cell.siswa_ids.length > 0) {
                                  const names = cell.siswa_ids
                                    .map(id => studentNameMap[id] || id)
                                    .join(', ');
                                  return names;
                                } else {
                                  return '-';
                                }
                              })()}
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
          <button style={{ ...linkBtn, marginTop: '1rem' }} onClick={() => openForm(jadwalList[0]?.id || '')}>
            + Ajukan Perubahan Jadwal
          </button>
        </div>

        {/* Kanan Atas: Penilaian/Tugas Terdekat - baris 1 (tombol tambah dihapus) */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Penilaian/Tugas Terdekat (dari Siswa)</h3>
          {loading ? (
            <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
          ) : ujianTerdekatList.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada penilaian/tugas dari siswa.</p>
          ) : (
            ujianTerdekatList.map((item, idx) => (
              <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < ujianTerdekatList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: C.dark }}>{item.materi}</div>
                    <div style={{ fontSize: '0.85rem', color: C.gray }}>
                      {item.id_mapel?.nama}{item.id_bab?.nama ? ` - ${item.id_bab.nama}` : ''}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: C.gray }}>
                      Dari siswa: {item.nama_siswa || 'Tidak diketahui'}
                    </div>
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

      {/* Pengingat Perubahan Jadwal dari Admin (statis) */}
      <div style={{ background: C.goldBg, borderRadius: '12px', padding: '1rem 1.5rem', border: `1px solid ${C.gold}`, marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, color: C.dark, fontSize: '0.95rem' }}>
          ⚠️ <strong>Pengingat Perubahan Jadwal dari Admin:</strong> Tidak ada perubahan jadwal yang diinputkan oleh admin saat ini.
        </p>
      </div>

      {/* Materi Request - full width */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: C.dark }}>
            Materi Request ({materiRequestList.filter(m => m.status !== 'selesai' && m.status !== 'ditolak').length})
          </h3>
          <button style={linkBtn} onClick={() => setShowMateriForm(true)}>+ Tambah Materi</button>
        </div>
        {loading ? (
          <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
        ) : materiRequestList.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada permintaan materi dari siswa.</p>
        ) : (
          materiRequestList.map((item, idx) => (
            <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < materiRequestList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: '600', color: C.dark }}>{item.judul_materi}</div>
                  <div style={{ fontSize: '0.85rem', color: C.gray }}>{item.siswa_nama || 'Siswa'}{item.kelas ? ` - ${item.kelas}` : ''}</div>
                  {item.deskripsi && (
                    <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic' }}>{item.deskripsi}</div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: C.gray }}>{waktuLalu(item.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                    style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
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

      {/* Modal Kirim Materi dari Arsip */}
      {showKirimMateri && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Kirim Materi dari Arsip</h3>
            <p style={{ fontSize: '0.85rem', color: C.gray, margin: '-0.5rem 0 0.5rem 0' }}>
              Pilih materi yang sudah pernah Anda unggah untuk dikirim ke siswa.
            </p>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Pilih Materi</label>
            <select
              value={selectedMateriId}
              onChange={(e) => setSelectedMateriId(e.target.value)}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
            >
              <option value="">-- Pilih Materi --</option>
              {materiArsip.length === 0 && <option value="" disabled>Belum ada materi di arsip.</option>}
              {materiArsip.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nama} - {m.bab_id?.nama} ({m.bab_id?.mapel_id?.nama})
                </option>
              ))}
            </select>
            <label style={{ fontSize: '0.85rem', color: C.gray, marginTop: '0.5rem' }}>Catatan (opsional)</label>
            <textarea
              value={kirimMateriNote}
              onChange={(e) => setKirimMateriNote(e.target.value)}
              rows={2}
              placeholder="Tambahkan catatan untuk siswa"
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowKirimMateri(false)} style={buttonBatal}>Batal</button>
              <button onClick={submitKirimMateri} style={{ ...buttonKirim, background: C.green }}>
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Penilaian/Tugas Terdekat (tetap ada untuk guru, tapi tidak dipanggil dari card) */}
      {showUjianForm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Tambah Jadwal Penilaian/Tugas</h3>
            <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: '-0.5rem' }}>
              Jadwal akan langsung aktif dan admin akan menerima notifikasi sebagai informasi.
            </p>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Mapel</label>
            <select
              value={ujianForm.mapel_id}
              onChange={(e) => {
                const val = e.target.value;
                setUjianForm({ ...ujianForm, mapel_id: val, bab_id: '' });
                loadUjianBab(val);
              }}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
            >
              <option value="">-- Pilih Mapel --</option>
              {mapelOptions.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </select>

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Bab</label>
            <select
              value={ujianForm.bab_id}
              onChange={(e) => setUjianForm({ ...ujianForm, bab_id: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
              disabled={!ujianForm.mapel_id}
            >
              <option value="">-- Pilih Bab --</option>
              {ujianBabOptions.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
            </select>

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Materi</label>
            <input
              type="text"
              placeholder="Contoh: Bilangan Pecahan"
              value={ujianForm.materi}
              onChange={(e) => setUjianForm({ ...ujianForm, materi: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
            />

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Nama Siswa (opsional, kosongkan jika untuk semua siswa)</label>
            <input
              type="text"
              placeholder="Nama siswa"
              value={ujianForm.nama_siswa}
              onChange={(e) => setUjianForm({ ...ujianForm, nama_siswa: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
            />

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Tanggal</label>
            <input
              type="date"
              value={ujianForm.tanggal}
              onChange={(e) => setUjianForm({ ...ujianForm, tanggal: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
            />

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Deskripsi (opsional)</label>
            <textarea
              value={ujianForm.deskripsi}
              onChange={(e) => setUjianForm({ ...ujianForm, deskripsi: e.target.value })}
              rows={2}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowUjianForm(false); setUjianBabOptions([]); }} style={buttonBatal}>Batal</button>
              <button onClick={submitUjian} disabled={submittingUjian} style={{ ...buttonKirim, opacity: submittingUjian ? 0.6 : 1 }}>
                {submittingUjian ? 'Mengirim...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Materi (untuk tambah materi baru) */}
      {showMateriForm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Tambah Materi yang Diajarkan</h3>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Pilih Mapel</label>
            <select
              value={materiForm.mapel_id}
              onChange={(e) => {
                const val = e.target.value;
                setMateriForm({ ...materiForm, mapel_id: val });
                if (val && val !== 'new') loadBab(val);
                else setBabOptions([]);
              }}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
            >
              <option value="">-- Pilih --</option>
              {mapelOptions.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
              <option value="new">+ Tambah Baru</option>
            </select>
            {materiForm.mapel_id === 'new' && (
              <input
                type="text"
                placeholder="Nama Mapel Baru"
                value={materiForm.mapel_nama}
                onChange={(e) => setMateriForm({ ...materiForm, mapel_nama: e.target.value })}
                style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
              />
            )}

            <label style={{ fontSize: '0.85rem', color: C.gray }}>Pilih Bab</label>
            <select
              value={materiForm.bab_id}
              onChange={(e) => setMateriForm({ ...materiForm, bab_id: e.target.value })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
              disabled={!materiForm.mapel_id || materiForm.mapel_id === 'new'}
            >
              <option value="">-- Pilih --</option>
              {babOptions.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
              <option value="new">+ Tambah Baru</option>
            </select>
            {materiForm.bab_id === 'new' && (
              <input
                type="text"
                placeholder="Nama Bab Baru"
                value={materiForm.bab_nama}
                onChange={(e) => setMateriForm({ ...materiForm, bab_nama: e.target.value })}
                style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
              />
            )}

            <label style={{ fontSize: '0.85rem', color: C.gray }}>File Materi (PDF/Gambar)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setMateriForm({ ...materiForm, file: e.target.files[0], link: '' })}
              style={{ padding: '4px' }}
            />
            <div style={{ margin: '0.5rem 0', textAlign: 'center', color: C.gray }}>atau</div>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Link Video YouTube</label>
            <input
              type="url"
              placeholder="https://youtube.com/..."
              value={materiForm.link}
              onChange={(e) => setMateriForm({ ...materiForm, link: e.target.value, file: null })}
              style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}` }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMateriForm(false)} style={buttonBatal}>Batal</button>
              <button onClick={submitMateri} disabled={submittingMateri} style={{ ...buttonKirim, opacity: submittingMateri ? 0.6 : 1 }}>
                {submittingMateri ? 'Menyimpan...' : 'Simpan'}
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

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button style={linkBtn}>Lihat semua jadwal</button>
        <button style={linkBtn}>Lihat semua ujian</button>
      </div>
    </div>
  );
};

export default TeacherHome;