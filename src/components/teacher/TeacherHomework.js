import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  green: '#2d6a4f',
  red: '#b3423f',
  dark: '#171411',
  gray: '#444242',
  grayLight: '#8a8782',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  goldLight: 'rgba(180,150,75,0.06)',
};

const MAPEL_LIST = ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Indonesia', 'Bahasa Inggris'];
const JENJANG_LIST = ['SD', 'SMP', 'SMA'];
const KELAS_BY_JENJANG = {
  SD: ['Kelas I', 'Kelas II', 'Kelas III', 'Kelas IV', 'Kelas V', 'Kelas VI'],
  SMP: ['Kelas VII', 'Kelas VIII', 'Kelas IX'],
  SMA: ['Kelas X', 'Kelas XI', 'Kelas XII'],
};
const GRADE_OPTIONS = ['A', 'B', 'C', 'D'];

const gradeColor = (g) => {
  if (g === 'A') return C.green;
  if (g === 'B') return C.gold;
  if (g === 'C') return '#a9772f';
  if (g === 'D') return C.red;
  return C.gray;
};

const statusStyle = (status) => {
  if (status === 'Aktif') return { bg: C.goldBg, color: C.gold };
  if (status === 'Selesai') return { bg: 'rgba(45,106,79,0.12)', color: C.green };
  return { bg: 'rgba(68,66,66,0.08)', color: C.gray }; // Draft
};

const emptyForm = { judul: '', mapel: '', jenjang: '', bab: '', materi: '', kelas: '', deskripsi: '', fileName: '' };

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const formatDeadline = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm} WIB`;
};

const mapTaskRow = (t) => ({
  id: t.id,
  judul: t.judul,
  mapel: t.mapel,
  jenjang: t.jenjang,
  bab: t.bab,
  materi: t.materi,
  kelas: t.kelas,
  deskripsi: t.deskripsi,
  fileName: t.file_name,
  fileUrl: t.file_url,
  status: t.status,
  deadline: formatDeadline(t.deadline),
  submissions: (t.pengumpulan_tugas || []).map((s) => ({
    id: s.id,
    siswaId: s.siswa_id,
    siswa: s.profiles?.full_name || 'Siswa',
    file: s.file_name,
    fileUrl: s.file_url,
    status: s.status,
    nilai: s.nilai,
  })),
});

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

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: `1.5px solid ${C.border}`,
  fontSize: '16px',
  outline: 'none',
  fontFamily: 'inherit',
  color: C.dark,
  boxSizing: 'border-box',
  background: C.white,
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: C.dark,
  marginBottom: '6px',
};

const TeacherHomework = () => {
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Buat Tugas Baru form
  const [form, setForm] = useState(emptyForm);
  const [formFile, setFormFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Daftar Tugas Saya filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Soal');
  const [filterMapel, setFilterMapel] = useState('Semua Mata Pelajaran');
  const [filterJenjang, setFilterJenjang] = useState('Semua Jenjang');
  const [filterKelas, setFilterKelas] = useState('Semua Kelas');

  // Daftar siswa (untuk dipilih saat publish / tambah siswa)
  const [students, setStudents] = useState([]);

  // Publish modal
  const [publishTaskId, setPublishTaskId] = useState(null);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState([]);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');

  // Pengumpulan Tugas panel
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [subTab, setSubTab] = useState('Sudah');

  // Tambah siswa ke tugas yang sudah ada
  const [showAddSiswaModal, setShowAddSiswaModal] = useState(false);
  const [addSiswaTaskId, setAddSiswaTaskId] = useState(null);
  const [addSiswaIds, setAddSiswaIds] = useState([]);
  const [addingSiswa, setAddingSiswa] = useState(false);

  const statusOptions = ['Semua Soal', 'Draft', 'Aktif', 'Selesai'];

  // Ambil semua tugas milik guru yang sedang login, beserta pengumpulan siswanya
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('Sesi tidak ditemukan. Silakan login ulang.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('penugasan_guru')
      .select('*, pengumpulan_tugas(id, status, nilai, file_name, file_url, siswa_id, profiles(full_name))')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setErrorMsg('Gagal memuat data tugas.');
      setLoading(false);
      return;
    }

    const mapped = (data || []).map(mapTaskRow);
    setTasks(mapped);
    setSelectedTaskId((prev) => prev ?? (mapped[0]?.id ?? null));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Ambil daftar siswa (role = 'student') untuk dipilih saat publish / tambah siswa
  const fetchStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (error) {
      console.error(error);
      setErrorMsg('Gagal memuat daftar siswa.');
      return;
    }
    setStudents(data || []);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleFormChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setFormFile(f);
      handleFormChange('fileName', f.name);
    }
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    if (!form.judul.trim() || saving) return;
    setSaving(true);
    setErrorMsg('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('Sesi tidak ditemukan. Silakan login ulang.');
      setSaving(false);
      return;
    }

    let fileUrl = null;
    let fileName = form.fileName || null;

    if (formFile) {
      const path = `${user.id}/${Date.now()}_${formFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('tugas-guru')
        .upload(path, formFile);
      if (uploadError) {
        console.error(uploadError);
        setErrorMsg('Gagal mengunggah file tugas.');
        setSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('tugas-guru').getPublicUrl(path);
      fileUrl = publicUrlData.publicUrl;
      fileName = formFile.name;
    }

    const { error } = await supabase.from('penugasan_guru').insert({
      guru_id: user.id,
      judul: form.judul.trim(),
      mapel: form.mapel || 'Belum dipilih',
      jenjang: form.jenjang || '-',
      bab: form.bab || '-',
      materi: form.materi || '-',
      kelas: form.kelas || '-',
      deskripsi: form.deskripsi,
      file_name: fileName,
      file_url: fileUrl,
      status: 'Draft',
    });

    if (error) {
      console.error(error);
      setErrorMsg('Gagal menyimpan tugas.');
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setFormFile(null);
    setSaving(false);
    fetchTasks();
  };

  const openPublish = (task) => {
    setPublishTaskId(task.id);
    setSelectedSiswaIds(task.submissions.map((s) => s.siswaId).filter(Boolean));
    setDeadlineDate('');
    setDeadlineTime('23:59');
  };

  const closePublish = () => setPublishTaskId(null);

  const toggleSiswa = (siswaId) => {
    setSelectedSiswaIds((ids) =>
      ids.includes(siswaId) ? ids.filter((id) => id !== siswaId) : [...ids, siswaId]
    );
  };

  const confirmPublish = async () => {
    if (selectedSiswaIds.length === 0 || !deadlineDate) return;
    const deadlineIso = new Date(`${deadlineDate}T${deadlineTime}:00`).toISOString();

    const { error: updateError } = await supabase
      .from('penugasan_guru')
      .update({ status: 'Aktif', deadline: deadlineIso })
      .eq('id', publishTaskId);

    if (updateError) {
      console.error(updateError);
      setErrorMsg('Gagal mempublikasikan tugas.');
      return;
    }

    const rows = selectedSiswaIds.map((siswaId) => ({
      tugas_id: publishTaskId,
      siswa_id: siswaId,
      status: 'Belum',
    }));

    const { error: insertError } = await supabase
      .from('pengumpulan_tugas')
      .upsert(rows, { onConflict: 'tugas_id,siswa_id', ignoreDuplicates: true });

    if (insertError) {
      console.error(insertError);
      setErrorMsg('Tugas terpublish, tapi gagal menugaskan sebagian siswa.');
    }

    closePublish();
    fetchTasks();
  };

  const gradeSubmission = async (taskId, subId, grade) => {
    const task = tasks.find((t) => t.id === taskId);
    const sub = task?.submissions.find((s) => s.id === subId);
    const newNilai = sub?.nilai === grade ? null : grade;

    setTasks((ts) =>
      ts.map((t) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              submissions: t.submissions.map((s) =>
                s.id === subId ? { ...s, nilai: newNilai } : s
              ),
            }
      )
    );

    const { error } = await supabase
      .from('pengumpulan_tugas')
      .update({ nilai: newNilai, graded_at: new Date().toISOString() })
      .eq('id', subId);

    if (error) {
      console.error(error);
      setErrorMsg('Gagal menyimpan nilai, memuat ulang data...');
      fetchTasks();
    }
  };

  // ─── TAMBAH SISWA KE TUGAS YANG SUDAH ADA ──────────────────────────────
  const openAddSiswa = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    // Ambil siswa yang sudah ditugaskan
    const existingIds = task.submissions.map(s => s.siswaId).filter(Boolean);
    // Default pilih semua siswa yang belum ditugaskan
    const available = students.filter(s => !existingIds.includes(s.id));
    setAddSiswaTaskId(taskId);
    setAddSiswaIds(available.map(s => s.id));
    setShowAddSiswaModal(true);
  };

  const closeAddSiswa = () => {
    setShowAddSiswaModal(false);
    setAddSiswaTaskId(null);
    setAddSiswaIds([]);
    setAddingSiswa(false);
    setErrorMsg('');
  };

  const toggleAddSiswa = (siswaId) => {
    setAddSiswaIds((ids) =>
      ids.includes(siswaId) ? ids.filter((id) => id !== siswaId) : [...ids, siswaId]
    );
  };

  const confirmAddSiswa = async () => {
    if (!addSiswaTaskId || addSiswaIds.length === 0) return;
    setAddingSiswa(true);
    setErrorMsg('');

    const rows = addSiswaIds.map((siswaId) => ({
      tugas_id: addSiswaTaskId,
      siswa_id: siswaId,
      status: 'Belum',
    }));

    const { error } = await supabase
      .from('pengumpulan_tugas')
      .upsert(rows, { onConflict: 'tugas_id,siswa_id', ignoreDuplicates: true });

    setAddingSiswa(false);
    if (error) {
      console.error(error);
      setErrorMsg('Gagal menambahkan siswa: ' + error.message);
      return;
    }

    closeAddSiswa();
    fetchTasks();
  };

  // ─── FILTER & RENDER ──────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(
    (t) =>
      (filterStatus === 'Semua Soal' || t.status === filterStatus) &&
      (filterMapel === 'Semua Mata Pelajaran' || t.mapel === filterMapel) &&
      (filterJenjang === 'Semua Jenjang' || t.jenjang === filterJenjang) &&
      (filterKelas === 'Semua Kelas' || t.kelas === filterKelas) &&
      t.judul.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const subsSudah = selectedTask ? selectedTask.submissions.filter((s) => s.status === 'Sudah') : [];
  const subsBelum = selectedTask ? selectedTask.submissions.filter((s) => s.status === 'Belum') : [];
  const activeSubs = subTab === 'Sudah' ? subsSudah : subsBelum;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', fontFamily: 'inherit' }}>
      {errorMsg && (
        <div style={{ background: 'rgba(179,66,63,0.08)', color: C.red, border: `1.5px solid ${C.red}`, borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.gray }}>Memuat data tugas...</div>
      ) : (
        <>
          {/* Main layout */}
          <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : undefined, gridTemplateColumns: isMobile ? undefined : '2fr 1.1fr', gap: isMobile ? '1rem' : '1.5rem', alignItems: 'start' }}>
            {/* KIRI */}
            <div>
              {/* Filter & search */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Cari judul tugas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ ...inputStyle, flex: isMobile ? '1 1 100%' : 1, minWidth: '160px', padding: '8px 12px', order: isMobile ? -1 : 0 }}
                />
                <select value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: isMobile ? '1 1 47%' : 'initial', padding: '8px 10px' }}>
                  <option>Semua Mata Pelajaran</option>
                  {MAPEL_LIST.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={filterJenjang}
                  onChange={(e) => {
                    setFilterJenjang(e.target.value);
                    setFilterKelas('Semua Kelas');
                  }}
                  style={{ ...inputStyle, width: 'auto', flex: isMobile ? '1 1 47%' : 'initial', padding: '8px 10px' }}
                >
                  <option>Semua Jenjang</option>
                  {JENJANG_LIST.map((j) => (
                    <option key={j}>{j}</option>
                  ))}
                </select>
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  disabled={filterJenjang === 'Semua Jenjang'}
                  style={{ ...inputStyle, width: 'auto', flex: isMobile ? '1 1 47%' : 'initial', padding: '8px 10px' }}
                >
                  <option>Semua Kelas</option>
                  {(KELAS_BY_JENJANG[filterJenjang] || []).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', overflowX: isMobile ? 'auto' : 'visible' }}>
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: filterStatus === status ? `2px solid ${C.gold}` : `1.5px solid ${C.border}`,
                        background: filterStatus === status ? C.goldBg : 'transparent',
                        color: filterStatus === status ? C.gold : C.gray,
                        fontWeight: filterStatus === status ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daftar Tugas Saya */}
              <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '0.5rem 1rem', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0.75rem 0', color: C.dark }}>Daftar Tugas Saya</h4>
                {filteredTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: C.gray }}>Tidak ada tugas ditemukan</div>
                ) : (
                  filteredTasks.map((task) => {
                    const st = statusStyle(task.status);
                    const isSelected = task.id === selectedTaskId;
                    return (
                      <div
                        key={task.id}
                        style={{
                          padding: isMobile ? '0.9rem 0.6rem' : '1rem 0.25rem',
                          borderBottom: `1px solid ${C.border}`,
                          display: isMobile ? 'flex' : 'grid',
                          flexDirection: isMobile ? 'column' : undefined,
                          gridTemplateColumns: isMobile ? undefined : '2.3fr 1fr auto',
                          gap: isMobile ? '0.5rem' : '0.75rem',
                          alignItems: isMobile ? 'stretch' : 'center',
                          background: isSelected ? C.goldLight : 'transparent',
                          borderRadius: '10px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', color: C.dark, wordBreak: 'break-word' }}>{task.judul}</div>
                          <div style={{ fontSize: '0.83rem', color: C.gray }}>{task.mapel} • {task.bab} • {task.materi}</div>
                          <div style={{ fontSize: '0.8rem', color: C.grayLight }}>
                            {task.jenjang && task.jenjang !== '-' ? `${task.jenjang} • ` : ''}{task.kelas}
                            {task.deadline ? ` • Deadline: ${task.deadline}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '0.5rem' }}>
                          <span style={{ background: st.bg, color: st.color, padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                            {task.status}
                          </span>
                          {isMobile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button
                                onClick={() => setSelectedTaskId(task.id)}
                                title="Lihat pengumpulan"
                                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '8px', color: C.gold, fontWeight: '600', cursor: 'pointer', padding: '6px 10px', fontSize: '0.8rem' }}
                              >
                                Lihat
                              </button>
                              {task.status === 'Draft' && (
                                <button
                                  onClick={() => openPublish(task)}
                                  title="Publikasikan ke siswa"
                                  style={{ background: C.gold, border: 'none', borderRadius: '8px', color: C.white, cursor: 'pointer', padding: '6px 10px', fontSize: '1rem', lineHeight: 1 }}
                                >
                                  📢
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {!isMobile && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={() => setSelectedTaskId(task.id)}
                              title="Lihat pengumpulan"
                              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '8px', color: C.gold, fontWeight: '600', cursor: 'pointer', padding: '6px 10px', fontSize: '0.8rem' }}
                            >
                              Lihat
                            </button>
                            {task.status === 'Draft' && (
                              <button
                                onClick={() => openPublish(task)}
                                title="Publikasikan ke siswa"
                                style={{ background: C.gold, border: 'none', borderRadius: '8px', color: C.white, cursor: 'pointer', padding: '6px 10px', fontSize: '1rem', lineHeight: 1 }}
                              >
                                📢
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Daftar Pengumpulan Tugas */}
              <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0, color: C.dark }}>Daftar Pengumpulan Tugas</h4>
                  {selectedTask && selectedTask.status === 'Aktif' && (
                    <button
                      onClick={() => openAddSiswa(selectedTask.id)}
                      style={{
                        background: C.gold,
                        border: 'none',
                        color: C.white,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      ➕ Tambah Siswa
                    </button>
                  )}
                </div>
                {!selectedTask ? (
                  <div style={{ color: C.gray, fontSize: '0.9rem' }}>Pilih tugas dari daftar di atas untuk melihat pengumpulan.</div>
                ) : (
                  <>
                    <div style={{ fontSize: '0.85rem', color: C.gray, marginBottom: '1rem' }}>{selectedTask.judul}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <button
                        onClick={() => setSubTab('Sudah')}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '20px',
                          border: subTab === 'Sudah' ? `2px solid ${C.green}` : `1.5px solid ${C.border}`,
                          background: subTab === 'Sudah' ? 'rgba(45,106,79,0.10)' : 'transparent',
                          color: subTab === 'Sudah' ? C.green : C.gray,
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Sudah Dikumpulkan ({subsSudah.length})
                      </button>
                      <button
                        onClick={() => setSubTab('Belum')}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '20px',
                          border: subTab === 'Belum' ? `2px solid ${C.red}` : `1.5px solid ${C.border}`,
                          background: subTab === 'Belum' ? 'rgba(179,66,63,0.08)' : 'transparent',
                          color: subTab === 'Belum' ? C.red : C.gray,
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Belum Dikumpulkan ({subsBelum.length})
                      </button>
                    </div>

                    {activeSubs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: C.gray, fontSize: '0.9rem' }}>
                        Tidak ada siswa pada kategori ini.
                      </div>
                    ) : isMobile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {activeSubs.map((sub) => (
                          <div key={sub.id} style={{ border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ fontWeight: '600', color: C.dark, fontSize: '0.9rem' }}>{sub.siswa}</div>
                            <div style={{ fontSize: '0.82rem', color: C.gray }}>{selectedTask.deskripsi || '-'}</div>
                            <div style={{ fontSize: '0.82rem', color: sub.file ? C.gold : C.grayLight }}>
                              {sub.file ? (
                                sub.fileUrl ? (
                                  <a href={sub.fileUrl} target="_blank" rel="noreferrer" style={{ color: C.gold, textDecoration: 'none' }}>
                                    📄 {sub.file}
                                  </a>
                                ) : (
                                  `📄 ${sub.file}`
                                )
                              ) : (
                                '— belum ada file —'
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', paddingTop: '0.3rem', borderTop: `1px solid ${C.border}` }}>
                              {sub.status === 'Sudah' ? (
                                GRADE_OPTIONS.map((g) => (
                                  <button
                                    key={g}
                                    onClick={() => gradeSubmission(selectedTask.id, sub.id, g)}
                                    title={`Beri nilai ${g}`}
                                    style={{
                                      width: '34px',
                                      height: '34px',
                                      borderRadius: '8px',
                                      border: sub.nilai === g ? `2px solid ${gradeColor(g)}` : `1.5px solid ${C.border}`,
                                      background: sub.nilai === g ? gradeColor(g) : C.white,
                                      color: sub.nilai === g ? C.white : C.gray,
                                      fontWeight: '700',
                                      fontSize: '0.85rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {g}
                                  </button>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: C.grayLight }}>Menunggu pengumpulan</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 2fr 1.3fr 1.6fr', gap: '0.5rem', padding: '0.4rem 0.25rem', fontSize: '0.78rem', fontWeight: '700', color: C.grayLight, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>
                          <span>Nama Siswa</span>
                          <span>Deskripsi Tugas</span>
                          <span>File</span>
                          <span>Aksi</span>
                        </div>
                        {activeSubs.map((sub) => (
                          <div key={sub.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 2fr 1.3fr 1.6fr', gap: '0.5rem', padding: '0.7rem 0.25rem', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: C.dark, fontSize: '0.88rem' }}>{sub.siswa}</span>
                            <span style={{ fontSize: '0.82rem', color: C.gray }}>{selectedTask.deskripsi || '-'}</span>
                            <span style={{ fontSize: '0.82rem', color: sub.file ? C.gold : C.grayLight }}>
                              {sub.file ? (
                                sub.fileUrl ? (
                                  <a href={sub.fileUrl} target="_blank" rel="noreferrer" style={{ color: C.gold, textDecoration: 'none' }}>
                                    📄 {sub.file}
                                  </a>
                                ) : (
                                  `📄 ${sub.file}`
                                )
                              ) : (
                                '— belum ada file —'
                              )}
                            </span>
                            <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                              {sub.status === 'Sudah' ? (
                                GRADE_OPTIONS.map((g) => (
                                  <button
                                    key={g}
                                    onClick={() => gradeSubmission(selectedTask.id, sub.id, g)}
                                    title={`Beri nilai ${g}`}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '8px',
                                      border: sub.nilai === g ? `2px solid ${gradeColor(g)}` : `1.5px solid ${C.border}`,
                                      background: sub.nilai === g ? gradeColor(g) : C.white,
                                      color: sub.nilai === g ? C.white : C.gray,
                                      fontWeight: '700',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {g}
                                  </button>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: C.grayLight }}>Menunggu pengumpulan</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* KANAN: Buat Tugas Baru */}
            <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: isMobile ? '1.1rem' : '1.5rem', position: isMobile ? 'static' : 'sticky', top: '1rem', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: C.dark }}>Buat Tugas Baru</h4>
              <form onSubmit={handleSaveDraft}>
                <div style={{ marginBottom: '0.9rem' }}>
                  <label style={labelStyle}>Judul Tugas</label>
                  <input
                    type="text"
                    placeholder="Contoh: Latihan Soal Fungsi Kuadrat"
                    value={form.judul}
                    onChange={(e) => handleFormChange('judul', e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '0.9rem' }}>
                  <label style={labelStyle}>Mata Pelajaran</label>
                  <select value={form.mapel} onChange={(e) => handleFormChange('mapel', e.target.value)} style={inputStyle}>
                    <option value="">Pilih Mata Pelajaran</option>
                    {MAPEL_LIST.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
                  <div>
                    <label style={labelStyle}>Bab</label>
                    <input type="text" placeholder="Contoh: Bab 3" value={form.bab} onChange={(e) => handleFormChange('bab', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Jenjang</label>
                    <select
                      value={form.jenjang}
                      onChange={(e) => {
                        handleFormChange('jenjang', e.target.value);
                        handleFormChange('kelas', '');
                      }}
                      style={inputStyle}
                    >
                      <option value="">Pilih Jenjang</option>
                      {JENJANG_LIST.map((j) => (
                        <option key={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '0.9rem' }}>
                  <label style={labelStyle}>Kelas</label>
                  <select
                    value={form.kelas}
                    onChange={(e) => handleFormChange('kelas', e.target.value)}
                    disabled={!form.jenjang}
                    style={inputStyle}
                  >
                    <option value="">{form.jenjang ? 'Pilih Kelas' : 'Pilih jenjang dulu'}</option>
                    {(KELAS_BY_JENJANG[form.jenjang] || []).map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '0.9rem' }}>
                  <label style={labelStyle}>Materi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Persamaan Linear Dua Variabel"
                    value={form.materi}
                    onChange={(e) => handleFormChange('materi', e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '0.9rem' }}>
                  <label style={labelStyle}>Deskripsi Tugas</label>
                  <textarea
                    placeholder="Tuliskan instruksi atau deskripsi tugas di sini..."
                    value={form.deskripsi}
                    onChange={(e) => handleFormChange('deskripsi', e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle}>Upload Tugas</label>
                  <label
                    htmlFor="upload-tugas"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      border: `1.5px dashed ${C.border}`,
                      cursor: 'pointer',
                      color: C.gray,
                      fontSize: '0.85rem',
                      background: C.goldLight,
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>☁️</span>
                    <span>{form.fileName ? form.fileName : 'Klik untuk memilih file tugas'}</span>
                    <input id="upload-tugas" type="file" accept="image/*,application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: saving ? C.border : C.gold,
                    color: C.white,
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan sebagai Draft'}
                </button>
                <div style={{ fontSize: '0.78rem', color: C.grayLight, marginTop: '0.6rem', textAlign: 'center' }}>
                  Tugas akan tersimpan sebagai Draft. Publikasikan ke siswa kapan saja dari Daftar Tugas Saya.
                </div>
              </form>
            </div>
          </div>

          {/* Modal Publikasikan */}
          {publishTaskId && (
            <div
              onClick={closePublish}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(23,20,17,0.45)',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                zIndex: 50,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: C.white, borderRadius: isMobile ? '16px 16px 0 0' : '16px',
                  padding: isMobile ? '1.2rem' : '1.5rem', width: isMobile ? '100%' : '380px',
                  maxWidth: isMobile ? '100%' : '90vw', maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box',
                }}
              >
                <h4 style={{ margin: '0 0 0.25rem 0', color: C.dark }}>Publikasikan Tugas</h4>
                <div style={{ fontSize: '0.85rem', color: C.gray, marginBottom: '1rem' }}>
                  {tasks.find((t) => t.id === publishTaskId)?.judul}
                </div>

                <div style={{ marginBottom: '0.9rem' }}>
                  <label style={labelStyle}>Pilih Siswa ({selectedSiswaIds.length} dipilih)</label>
                  {students.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: C.grayLight, padding: '0.5rem 0' }}>
                      Belum ada siswa terdaftar.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '220px', overflowY: 'auto', border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '0.4rem' }}>
                      {students.map((s) => {
                        const checked = selectedSiswaIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '9px 8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: checked ? C.goldLight : 'transparent',
                              fontSize: '0.85rem',
                              color: C.dark,
                            }}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleSiswa(s.id)} />
                            {s.full_name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.4fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={labelStyle}>Tanggal Deadline</label>
                    <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Jam</label>
                    <input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    onClick={closePublish}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: 'transparent', color: C.gray, fontWeight: '600', cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmPublish}
                    disabled={selectedSiswaIds.length === 0 || !deadlineDate}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: selectedSiswaIds.length === 0 || !deadlineDate ? C.border : C.gold,
                      color: C.white,
                      fontWeight: '700',
                      cursor: selectedSiswaIds.length === 0 || !deadlineDate ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Publikasikan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Tambah Siswa */}
          {showAddSiswaModal && (
            <div
              onClick={closeAddSiswa}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(23,20,17,0.45)',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                zIndex: 50,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: C.white, borderRadius: isMobile ? '16px 16px 0 0' : '16px',
                  padding: isMobile ? '1.2rem' : '1.5rem', width: isMobile ? '100%' : '380px',
                  maxWidth: isMobile ? '100%' : '90vw', maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box',
                }}
              >
                <h4 style={{ margin: '0 0 0.25rem 0', color: C.dark }}>Tambah Siswa ke Tugas</h4>
                <div style={{ fontSize: '0.85rem', color: C.gray, marginBottom: '1rem' }}>
                  {tasks.find((t) => t.id === addSiswaTaskId)?.judul}
                </div>

                <div style={{ marginBottom: '0.9rem' }}>
                  <label style={labelStyle}>Pilih Siswa Tambahan ({addSiswaIds.length} dipilih)</label>
                  {students.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: C.grayLight, padding: '0.5rem 0' }}>
                      Belum ada siswa terdaftar.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '220px', overflowY: 'auto', border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '0.4rem' }}>
                      {students.map((s) => {
                        // Cek apakah siswa sudah ditugaskan
                        const task = tasks.find(t => t.id === addSiswaTaskId);
                        const alreadyAssigned = task?.submissions.some(sub => sub.siswaId === s.id) || false;
                        const checked = addSiswaIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '9px 8px',
                              borderRadius: '8px',
                              cursor: alreadyAssigned ? 'default' : 'pointer',
                              background: checked ? C.goldLight : 'transparent',
                              fontSize: '0.85rem',
                              color: alreadyAssigned ? C.grayLight : C.dark,
                              opacity: alreadyAssigned ? 0.6 : 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAddSiswa(s.id)}
                              disabled={alreadyAssigned}
                            />
                            {s.full_name}
                            {alreadyAssigned && <span style={{ fontSize: '0.7rem', color: C.grayLight, marginLeft: 'auto' }}>✓ sudah ditugaskan</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    onClick={closeAddSiswa}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: 'transparent', color: C.gray, fontWeight: '600', cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmAddSiswa}
                    disabled={addSiswaIds.length === 0 || addingSiswa}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: addSiswaIds.length === 0 || addingSiswa ? C.border : C.gold,
                      color: C.white,
                      fontWeight: '700',
                      cursor: addSiswaIds.length === 0 || addingSiswa ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {addingSiswa ? 'Menyimpan...' : 'Tambahkan'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherHomework;