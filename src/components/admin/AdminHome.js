import React, { useState, useEffect, useMemo } from 'react';
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
  greenBg: 'rgba(45,106,79,0.15)',
  red: '#b3423a',
  redBg: '#fbeceb',
};

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const HARI_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const BULAN_LIST = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const cardStyle = { background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.5rem' };
const inputStyle = { padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontSize: '0.8rem', fontWeight: '600', color: C.dark, marginBottom: '4px', display: 'block' };
const btnPrimary = { background: C.gold, color: C.white, border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' };
const btnSecondary = { background: 'none', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 14px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', color: C.gray };
const btnDelete = { background: C.red, color: 'white', border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', cursor: 'pointer' };

// Komponen tabel mingguan (sama seperti sebelumnya)
const WeeklyScheduleTable = ({ schedules, teachers, students, filterType }) => {
  const timeSlots = useMemo(() => {
    const set = new Set();
    schedules.forEach(s => set.add(`${s.jam_mulai}-${s.jam_selesai}`));
    return Array.from(set)
      .map(str => {
        const [start, end] = str.split('-');
        return { start, end, key: str };
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [schedules]);

  const scheduleByDay = useMemo(() => {
    const map = {};
    HARI_LIST.forEach(h => map[h] = {});
    schedules.forEach(s => {
      const key = `${s.jam_mulai}-${s.jam_selesai}`;
      if (!map[s.hari]) map[s.hari] = {};
      map[s.hari][key] = s;
    });
    return map;
  }, [schedules]);

  const getCellStyle = (jenis) => {
    if (jenis === 'Private') return { background: C.greenBg, color: C.green };
    if (jenis === 'Group') return { background: C.goldBg, color: C.gold };
    return { background: 'transparent' };
  };

  const getStudentNames = (siswaIds) => {
    if (!siswaIds || siswaIds.length === 0) return '-';
    return siswaIds.map(id => {
      const student = students.find(s => s.id === id);
      return student ? student.full_name : '?';
    }).join(', ');
  };

  const getTeacherName = (guruId) => {
    const teacher = teachers.find(t => String(t.id) === String(guruId));
    return teacher ? teacher.nama : '?';
  };

  if (schedules.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: '1rem' }}>Tidak ada jadwal untuk filter ini.</p>;
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ background: C.cream }}>
            <th style={{ padding: '6px 8px', border: `1px solid ${C.border}`, textAlign: 'center' }}>Jam</th>
            {HARI_LIST.map(h => (
              <th key={h} style={{ padding: '6px 8px', border: `1px solid ${C.border}`, textAlign: 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(({ start, end, key }) => (
            <tr key={key} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 8px', border: `1px solid ${C.border}`, textAlign: 'center', fontWeight: '600' }}>
                {start} - {end}
              </td>
              {HARI_LIST.map(day => {
                const s = scheduleByDay[day]?.[key];
                return (
                  <td key={day} style={{ 
                    padding: '6px 8px', 
                    border: `1px solid ${C.border}`, 
                    textAlign: 'center',
                    ...getCellStyle(s?.jenis)
                  }}>
                    {s ? (
                      <>
                        <div style={{ fontWeight: '500' }}>
                          {filterType === 'siswa' && (
                            <div style={{ fontSize: '0.7rem', color: C.gray, fontWeight: 'normal' }}>
                              {getTeacherName(s.guru_id)}
                            </div>
                          )}
                          {s.jenis === 'Group' && s.kelas ? (
                            <span style={{ fontWeight: 'bold' }}>{s.kelas}</span>
                          ) : (
                            getStudentNames(s.siswa_ids)
                          )}
                          <span style={{ fontSize: '0.65rem', marginLeft: '4px', fontWeight: 'bold' }}>
                            {s.jenis === 'Private' ? 'P' : 'G'}
                          </span>
                        </div>
                        {s.jenis === 'Group' && (
                          <div style={{ fontSize: '0.65rem', color: C.gray }}>
                            {getStudentNames(s.siswa_ids)}
                          </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: C.gray }}>{s.tipe}</div>
                      </>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminHome = () => {
  const today = new Date();
  const taskSectionRef = React.useRef(null);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const [adminProfile, setAdminProfile] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [pengajuanJadwal, setPengajuanJadwal] = useState([]);
  const [respondingPengajuanId, setRespondingPengajuanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [filterType, setFilterType] = useState('guru');
  const [filterValue, setFilterValue] = useState('');

  const [scheduleForm, setScheduleForm] = useState({
    guru_id: '',
    hari: 'Senin',
    jam_mulai: '',
    jam_selesai: '',
    kelas: '',
    siswa_ids: [],
    tipe: 'Online',
    jenis: 'Private',
    nama_group: '',
  });

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ judul: '', kelas: '', tanggal: '', type: 'Tugas' });

  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeForm, setChangeForm] = useState({
    jadwal_id: '',
    jenis: 'Permanen',
    hari_baru: '',
    jam_mulai_baru: '',
    jam_selesai_baru: '',
    tanggal_temporary: '',
    alasan: ''
  });

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, gender')
        .eq('id', user.id)
        .maybeSingle();
      setAdminProfile(data || null);
    };
    fetchAdminProfile();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    if (hour >= 18 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const getTitle = (gender) => {
    if (gender === 'L') return 'Mr.';
    if (gender === 'P') return 'Ms.';
    return '';
  };

  const formatHariTanggal = (date) => {
    const hari = HARI_LIST[(date.getDay() + 6) % 7];
    return `${hari}, ${date.getDate()} ${BULAN_LIST[date.getMonth()]} ${date.getFullYear()}`;
  };

  const fetchAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 🔁 Query join tanpa !inner dan tanpa order
      const [guruRes, siswaRes, tugasRes, jadwalRes, pengajuanRes] = await Promise.all([
        supabase
          .from('guru')
          .select(`
            id,
            profile_id,
            profiles (
              id,
              full_name,
              email
            )
          `)
          .eq('profiles.role', 'teacher')
          .eq('profiles.status', 'approved'),
        
        supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
        supabase.from('tugas_penilaian').select('*').order('tanggal'),
        supabase.from('jadwal_les').select('*'),
        // Permintaan perubahan jadwal yang sudah disetujui kedua pihak
        // (siswa & guru) dan sekarang menunggu keputusan admin.
        // 'disetujui_menunggu_admin' = siswa ajukan, guru sudah setuju.
        // 'disetujui_siswa'          = guru ajukan, siswa sudah setuju.
        supabase
          .from('pengajuan_perubahan_jadwal')
          .select('*, jadwal_les(hari, jam_mulai, jam_selesai, kelas)')
          .in('status', ['disetujui_menunggu_admin', 'disetujui_siswa'])
          .order('created_at', { ascending: false }),
      ]);

      // Cek error masing-masing
      if (guruRes.error) throw guruRes.error;
      if (siswaRes.error) throw siswaRes.error;
      if (tugasRes.error) throw tugasRes.error;
      if (jadwalRes.error) throw jadwalRes.error;
      if (pengajuanRes.error) throw pengajuanRes.error;

      // Mapping data guru
      const rawGuru = guruRes.data || [];
      // Sort by full_name (manual)
      const sortedGuru = rawGuru
        .map(g => ({
          id: g.id,
          profile_id: g.profile_id,
          full_name: g.profiles?.full_name || '',
          nama: g.profiles?.full_name || '',
          email: g.profiles?.email || '',
        }))
        .sort((a, b) => a.nama.localeCompare(b.nama));

      setTeachers(sortedGuru);
      setStudents(siswaRes.data || []);
      setTasks(tugasRes.data || []);
      setSchedules(jadwalRes.data || []);
      setPengajuanJadwal(pengajuanRes.data || []);

      // Inisialisasi filterValue dengan guru pertama (jika ada)
      if (sortedGuru.length > 0) {
        setFilterValue(String(sortedGuru[0].id));
      } else if (siswaRes.data && siswaRes.data.length > 0) {
        setFilterValue(String(siswaRes.data[0].id));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat data dari Supabase. Periksa koneksi/konfigurasi tabel.');
    } finally {
      setLoading(false);
    }
  };

  const teacherName = (id) => teachers.find(g => String(g.id) === String(id))?.nama || '-';
  const getStudentNames = (siswaIds) => {
    if (!siswaIds || siswaIds.length === 0) return '-';
    return siswaIds.map(id => {
      const student = students.find(s => s.id === id);
      return student ? student.full_name : '?';
    }).join(', ');
  };

  // ---------- Kalender ----------
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.tanggal) return;
      const d = new Date(t.tanggal);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }, [tasks, viewMonth, viewYear]);

  const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const goToPrevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const goToNextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const goToCurrentMonth = () => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); };

  const handleDayClick = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setTaskForm(prev => ({ ...prev, tanggal: dateStr }));
    setShowTaskForm(true);
    taskSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ---------- Jadwal les hari ini ----------
  const todayHari = HARI_LIST[(today.getDay() + 6) % 7];
  const todayDateStr = today.toISOString().slice(0, 10);

  const filteredSchedules = useMemo(() => {
    if (!filterValue) return [];
    return schedules.filter(s => {
      if (s.is_temporary) return false;
      if (filterType === 'guru') {
        return String(s.guru_id) === String(filterValue);
      } else {
        return s.siswa_ids && s.siswa_ids.some(id => String(id) === String(filterValue));
      }
    });
  }, [schedules, filterType, filterValue]);

  const todaySchedule = useMemo(() => {
    if (!filterValue) return [];
    return schedules.filter(s => {
      if (filterType === 'guru' && String(s.guru_id) !== String(filterValue)) return false;
      if (filterType === 'siswa' && !(s.siswa_ids && s.siswa_ids.some(id => String(id) === String(filterValue)))) return false;
      if (s.is_temporary) return s.tanggal_temporary === todayDateStr;
      const hasOverrideToday = schedules.some(o => o.is_temporary && o.tanggal_temporary === todayDateStr && String(o.guru_id) === String(s.guru_id) && o.kelas === s.kelas);
      return s.hari === todayHari && !hasOverrideToday;
    });
  }, [schedules, filterType, filterValue, todayHari, todayDateStr]);

  // ---------- Handlers ----------
  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('tugas_penilaian').insert([taskForm]).select();
      if (error) throw error;
      setTasks(prev => [...prev, ...(data || [])]);
      setTaskForm({ judul: '', kelas: '', tanggal: '', type: 'Tugas' });
      setShowTaskForm(false);
    } catch (err) {
      alert('Gagal menyimpan tugas: ' + err.message);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Yakin ingin menghapus tugas/penilaian ini?')) return;
    try {
      const { error } = await supabase.from('tugas_penilaian').delete().eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      if (scheduleForm.siswa_ids.length === 0) {
        alert('Pilih minimal satu siswa.');
        return;
      }
      let kelasValue = scheduleForm.kelas;
      if (scheduleForm.jenis === 'Group') {
        if (!scheduleForm.nama_group.trim()) {
          alert('Nama Group wajib diisi.');
          return;
        }
        kelasValue = scheduleForm.nama_group.trim();
      } else {
        if (!scheduleForm.kelas.trim()) {
          alert('Kelas wajib diisi.');
          return;
        }
        kelasValue = scheduleForm.kelas.trim();
      }

      const payload = {
        guru_id: scheduleForm.guru_id,
        hari: scheduleForm.hari,
        jam_mulai: scheduleForm.jam_mulai,
        jam_selesai: scheduleForm.jam_selesai,
        kelas: kelasValue,
        siswa_ids: scheduleForm.siswa_ids,
        tipe: scheduleForm.tipe,
        jenis: scheduleForm.jenis,
        is_temporary: false,
      };
      const { data, error } = await supabase.from('jadwal_les').insert([payload]).select();
      if (error) throw error;
      setSchedules(prev => [...prev, ...(data || [])]);
      setScheduleForm({
        guru_id: '',
        hari: 'Senin',
        jam_mulai: '',
        jam_selesai: '',
        kelas: '',
        siswa_ids: [],
        tipe: 'Online',
        jenis: 'Private',
        nama_group: '',
      });
    } catch (err) {
      alert('Gagal menyimpan jadwal guru: ' + err.message);
    }
  };

  const handleScheduleChange = async (e) => {
    e.preventDefault();
    try {
      const original = schedules.find(s => String(s.id) === String(changeForm.jadwal_id));
      if (!original) throw new Error('Jadwal asal tidak ditemukan');

      if (changeForm.jenis === 'Permanen') {
        const { data, error } = await supabase.from('jadwal_les').update({
          hari: changeForm.hari_baru || original.hari,
          jam_mulai: changeForm.jam_mulai_baru || original.jam_mulai,
          jam_selesai: changeForm.jam_selesai_baru || original.jam_selesai,
        }).eq('id', original.id).select();
        if (error) throw error;
        setSchedules(prev => prev.map(s => (s.id === original.id ? data[0] : s)));
      } else {
        if (!changeForm.tanggal_temporary) throw new Error('Tanggal perubahan sementara wajib diisi');
        const { data, error } = await supabase.from('jadwal_les').insert([{
          guru_id: original.guru_id,
          kelas: original.kelas,
          siswa_ids: original.siswa_ids,
          tipe: original.tipe,
          jenis: original.jenis,
          hari: changeForm.hari_baru || original.hari,
          jam_mulai: changeForm.jam_mulai_baru || original.jam_mulai,
          jam_selesai: changeForm.jam_selesai_baru || original.jam_selesai,
          is_temporary: true,
          tanggal_temporary: changeForm.tanggal_temporary,
          alasan: changeForm.alasan,
        }]).select();
        if (error) throw error;
        setSchedules(prev => [...prev, ...(data || [])]);
      }
      setChangeForm({ jadwal_id: '', jenis: 'Permanen', hari_baru: '', jam_mulai_baru: '', jam_selesai_baru: '', tanggal_temporary: '', alasan: '' });
      setShowChangeForm(false);
    } catch (err) {
      alert('Gagal menyimpan perubahan jadwal: ' + err.message);
    }
  };

  const handleDeleteScheduleChange = async (id) => {
    if (!window.confirm('Yakin ingin menghapus perubahan jadwal sementara ini?')) return;
    try {
      const { error } = await supabase.from('jadwal_les').delete().eq('id', id);
      if (error) throw error;
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Gagal menghapus perubahan jadwal: ' + err.message);
    }
  };

  // Hitung notifikasi tugas (tugas dengan nama_siswa)
  const tasksWithStudent = tasks.filter(t => t.nama_siswa && t.nama_siswa.trim() !== '').length;

  // Notifikasi perubahan jadwal: jumlah jadwal sementara (is_temporary = true)
  const changeNotifCount = schedules.filter(s => s.is_temporary).length + pengajuanJadwal.length;

  const formatJamSingkat = (t) => (t ? t.slice(0, 5) : '');

  const asalJadwalStr = (p) => {
    const asal = p.jadwal_les;
    return asal
      ? `${asal.hari} ${formatJamSingkat(asal.jam_mulai)}-${formatJamSingkat(asal.jam_selesai)}`
      : 'jadwal asal tidak ditemukan';
  };

  const baruJadwalStr = (p) =>
    `${p.hari_baru || '-'} ${formatJamSingkat(p.jam_mulai_baru)}-${formatJamSingkat(p.jam_selesai_baru)}`;

  const handleRespondPengajuanAdmin = async (p, setuju) => {
    setRespondingPengajuanId(p.id);
    setErrorMsg('');
    try {
      const newStatus = setuju ? 'disetujui_admin' : 'ditolak_admin';
      const { data, error } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .update({ status: newStatus })
        .eq('id', p.id)
        .select('id, status');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Perubahan tidak tersimpan (kemungkinan dibatasi oleh policy keamanan database).');
      }

      setPengajuanJadwal((prev) => prev.filter((item) => item.id !== p.id));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memperbarui pengajuan.');
    } finally {
      setRespondingPengajuanId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: C.dark, margin: '0 0 0.25rem 0' }}>
          {getGreeting()}, {getTitle(adminProfile?.gender)}{getTitle(adminProfile?.gender) ? ' ' : ''}{adminProfile?.full_name || 'Admin'}
        </h1>
        <p style={{ fontSize: '0.95rem', color: C.gray, margin: 0 }}>{formatHariTanggal(today)}</p>
      </div>

      {errorMsg && (
        <div style={{ background: '#fdecea', color: '#a33', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {loading && (
        <div style={{ background: C.goldBg, color: C.gold, borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>
          Memuat data...
        </div>
      )}

      {/* ========== BAGIAN ATAS: Kalender + Tugas/Perubahan ========== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Kalender Akademik */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: C.dark }}>Kalender Akademik</h3>
            {!isCurrentMonth && (
              <button onClick={goToCurrentMonth} style={{ ...btnSecondary, padding: '4px 10px', fontSize: '0.75rem' }}>Bulan ini</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <button onClick={goToPrevMonth} style={{ ...btnSecondary, padding: '2px 10px' }}>‹</button>
            <div style={{ fontWeight: '600', color: C.dark }}>{BULAN_LIST[viewMonth]} {viewYear}</div>
            <button onClick={goToNextMonth} style={{ ...btnSecondary, padding: '2px 10px' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', fontSize: '0.8rem' }}>
            {HARI_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontWeight: '600', color: C.gray }}>{d}</div>)}
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`empty-${i}`} />)}
            {calendarDays.map(day => {
              const dayTasks = tasksByDate[day] || [];
              const hasTugas = dayTasks.some(t => t.type === 'Tugas');
              const hasPenilaian = dayTasks.some(t => t.type === 'Penilaian');
              const isToday = isCurrentMonth && day === today.getDate();
              const label = dayTasks.map(t => `${t.type}: ${t.judul}`).join('\n');
              return (
                <div
                  key={day}
                  title={label ? `${label}\n(klik untuk tambah)` : 'Klik untuk tambah tugas/penilaian'}
                  onClick={() => handleDayClick(day)}
                  style={{
                    textAlign: 'center',
                    padding: '4px 0',
                    borderRadius: '4px',
                    background: dayTasks.length ? C.goldBg : 'transparent',
                    color: dayTasks.length ? C.gold : C.dark,
                    fontWeight: dayTasks.length || isToday ? 'bold' : 'normal',
                    outline: isToday ? `1.5px solid ${C.green}` : 'none',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.goldBg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = dayTasks.length ? C.goldBg : 'transparent'; }}
                >
                  {day}
                  {(hasTugas || hasPenilaian) && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '1px' }}>
                      {hasTugas && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.gold, display: 'inline-block' }} />}
                      {hasPenilaian && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.green, display: 'inline-block' }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: C.gold, borderRadius: '50%', marginRight: '4px' }}></span>Tugas</span>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: C.green, borderRadius: '50%', marginRight: '4px' }}></span>Penilaian</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', border: `1.5px solid ${C.green}`, borderRadius: '3px', marginRight: '4px' }}></span>Hari ini</span>
          </div>
        </div>

        {/* Kolom kanan: Tugas & Perubahan Jadwal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tugas / Penilaian Siswa */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ position: 'relative', fontSize: '1.2rem' }}>
                  🔔
                  {tasksWithStudent > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: C.red,
                      color: 'white',
                      borderRadius: '50%',
                      padding: '1px 5px',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      lineHeight: '1.4',
                    }}>
                      {tasksWithStudent}
                    </span>
                  )}
                </span>
                <h3 style={{ margin: 0, color: C.dark }}>Tugas / Penilaian Siswa</h3>
              </div>
              <button onClick={() => setShowTaskForm(s => !s)} style={btnPrimary}>{showTaskForm ? 'Batal' : '+ Tambah'}</button>
            </div>

            {showTaskForm && (
              <form onSubmit={handleAddTask} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Judul</label>
                  <input required value={taskForm.judul} onChange={e => setTaskForm({ ...taskForm, judul: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kelas</label>
                  <input required placeholder="XI IPA - Nama Guru" value={taskForm.kelas} onChange={e => setTaskForm({ ...taskForm, kelas: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Tanggal</label>
                  <input required type="date" value={taskForm.tanggal} onChange={e => setTaskForm({ ...taskForm, tanggal: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Jenis</label>
                  <select value={taskForm.type} onChange={e => setTaskForm({ ...taskForm, type: e.target.value })} style={inputStyle}>
                    <option value="Tugas">Tugas</option>
                    <option value="Penilaian">Penilaian</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <button type="submit" style={{ ...btnPrimary, width: '100%' }}>Simpan</button>
                </div>
              </form>
            )}

            {tasks.length === 0 && <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada tugas/penilaian.</p>}
            {tasks
              .slice()
              .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
              .map((item, idx, arr) => (
                <div key={item.id} style={{ padding: '0.5rem 0', borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: C.dark }}>{item.judul}</div>
                      <div style={{ fontSize: '0.85rem', color: C.gray }}>{item.kelas}</div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.8rem', color: C.gray }}>{new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <span style={{ background: C.goldBg, color: C.gold, padding: '0 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600' }}>{item.type}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTask(item.id)} style={btnDelete}>🗑️</button>
                  </div>
                </div>
              ))}
          </div>

          {/* Perubahan Jadwal */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ position: 'relative', fontSize: '1.2rem' }}>
                  🔔
                  {changeNotifCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: C.red,
                      color: 'white',
                      borderRadius: '50%',
                      padding: '1px 5px',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      lineHeight: '1.4',
                    }}>
                      {changeNotifCount}
                    </span>
                  )}
                </span>
                <h3 style={{ margin: 0, color: C.dark }}>Perubahan Jadwal</h3>
              </div>
              <button onClick={() => setShowChangeForm(s => !s)} style={btnPrimary}>{showChangeForm ? 'Batal' : '+ Ajukan Perubahan'}</button>
            </div>

            {showChangeForm && (
              <form onSubmit={handleScheduleChange} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Jadwal yang diubah</label>
                  <select required value={changeForm.jadwal_id} onChange={e => setChangeForm({ ...changeForm, jadwal_id: e.target.value })} style={inputStyle}>
                    <option value="">Pilih jadwal...</option>
                    {schedules.filter(s => !s.is_temporary).map(s => (
                      <option key={s.id} value={s.id}>
                        {teacherName(s.guru_id)} · {s.kelas} · {s.hari} {s.jam_mulai}-{s.jam_selesai}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Jenis Perubahan</label>
                  <select value={changeForm.jenis} onChange={e => setChangeForm({ ...changeForm, jenis: e.target.value })} style={inputStyle}>
                    <option value="Permanen">Permanen</option>
                    <option value="Sementara">Sementara (satu kali)</option>
                  </select>
                </div>
                {changeForm.jenis === 'Sementara' && (
                  <div>
                    <label style={labelStyle}>Tanggal Berlaku</label>
                    <input required type="date" value={changeForm.tanggal_temporary} onChange={e => setChangeForm({ ...changeForm, tanggal_temporary: e.target.value })} style={inputStyle} />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Hari Baru (opsional)</label>
                  <select value={changeForm.hari_baru} onChange={e => setChangeForm({ ...changeForm, hari_baru: e.target.value })} style={inputStyle}>
                    <option value="">Tetap sama</option>
                    {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Jam Mulai Baru (opsional)</label>
                  <input type="time" value={changeForm.jam_mulai_baru} onChange={e => setChangeForm({ ...changeForm, jam_mulai_baru: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Jam Selesai Baru (opsional)</label>
                  <input type="time" value={changeForm.jam_selesai_baru} onChange={e => setChangeForm({ ...changeForm, jam_selesai_baru: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Alasan Perubahan</label>
                  <input required placeholder="Misal: guru berhalangan hadir, permintaan siswa, dll." value={changeForm.alasan} onChange={e => setChangeForm({ ...changeForm, alasan: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <button type="submit" style={{ ...btnPrimary, width: '100%' }}>Simpan Perubahan</button>
                </div>
              </form>
            )}

            {!showChangeForm && (
              <div>
                {/* Permintaan dari guru/siswa yang menunggu keputusan admin */}
                {pengajuanJadwal.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>
                      Permintaan Menunggu Persetujuan Anda ({pengajuanJadwal.length})
                    </div>
                    {pengajuanJadwal.map((p) => (
                      <div key={p.id} style={{ padding: '0.6rem 0', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: C.dark, fontSize: '0.85rem' }}>
                              {p.nama_pengaju || (p.diajukan_oleh === 'guru' ? 'Guru' : 'Siswa')}
                              <span style={{ fontWeight: 400, color: C.gray, fontSize: '0.75rem', marginLeft: '6px' }}>
                                (diajukan oleh {p.diajukan_oleh})
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: C.gray, marginTop: '2px' }}>
                              <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{asalJadwalStr(p)}</span>
                              {' → '}
                              <span style={{ fontWeight: 600, color: C.dark }}>{baruJadwalStr(p)}</span>
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
                            {p.alasan && (
                              <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic', marginTop: '2px' }}>
                                "{p.alasan}"
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              onClick={() => handleRespondPengajuanAdmin(p, true)}
                              disabled={respondingPengajuanId === p.id}
                              style={{
                                background: C.green,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: respondingPengajuanId === p.id ? 'default' : 'pointer',
                                opacity: respondingPengajuanId === p.id ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {respondingPengajuanId === p.id ? '...' : 'Setujui'}
                            </button>
                            <button
                              onClick={() => handleRespondPengajuanAdmin(p, false)}
                              disabled={respondingPengajuanId === p.id}
                              style={{
                                background: 'transparent',
                                color: C.red,
                                border: `1.5px solid ${C.red}`,
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: respondingPengajuanId === p.id ? 'default' : 'pointer',
                                opacity: respondingPengajuanId === p.id ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Tolak
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {schedules.filter(s => s.is_temporary).length === 0 && <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada perubahan jadwal sementara.</p>}
                {schedules.filter(s => s.is_temporary).map(s => (
                  <div key={s.id} style={{ padding: '0.5rem 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: C.dark, fontSize: '0.85rem' }}>
                          {teacherName(s.guru_id)} · {s.kelas} · {new Date(s.tanggal_temporary).toLocaleDateString('id-ID')} · {s.hari} {s.jam_mulai}-{s.jam_selesai}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: C.gray }}>Alasan: {s.alasan}</div>
                      </div>
                      <button onClick={() => handleDeleteScheduleChange(s.id)} style={btnDelete}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== BAGIAN BAWAH: Jadwal Les + Form Tambah Jadwal (selalu tampil) ========== */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Kiri: Jadwal Les */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Jadwal Les</h3>

          {/* Filter: Tipe dan Pilihan */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 150px' }}>
              <label style={labelStyle}>Filter Berdasarkan</label>
              <select
                value={filterType}
                onChange={e => {
                  const newType = e.target.value;
                  setFilterType(newType);
                  if (newType === 'guru' && teachers.length > 0) {
                    setFilterValue(String(teachers[0].id));
                  } else if (newType === 'siswa' && students.length > 0) {
                    setFilterValue(String(students[0].id));
                  } else {
                    setFilterValue('');
                  }
                }}
                style={inputStyle}
              >
                <option value="guru">Guru</option>
                <option value="siswa">Siswa</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Pilih {filterType === 'guru' ? 'Guru' : 'Siswa'}</label>
              <select
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                style={inputStyle}
              >
                {filterType === 'guru' ? (
                  teachers.length === 0 ? (
                    <option value="">Belum ada guru</option>
                  ) : (
                    teachers.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)
                  )
                ) : (
                  students.length === 0 ? (
                    <option value="">Belum ada siswa</option>
                  ) : (
                    students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)
                  )
                )}
              </select>
            </div>
          </div>

          {filterValue ? (
            <>
              <WeeklyScheduleTable
                schedules={filteredSchedules}
                teachers={teachers}
                students={students}
                filterType={filterType}
              />

              {/* Jadwal Hari Ini */}
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: C.dark, fontSize: '0.9rem' }}>Jadwal Hari Ini ({todayHari})</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: C.cream }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Waktu</th>
                        {filterType === 'siswa' && (
                          <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Guru</th>
                        )}
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kelas / Group</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tipe</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jenis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaySchedule.length === 0 && (
                        <tr><td colSpan={filterType === 'siswa' ? 6 : 5} style={{ padding: '12px 10px', color: C.gray, textAlign: 'center' }}>Tidak ada jadwal les hari ini untuk filter ini.</td></tr>
                      )}
                      {todaySchedule.map((row) => (
                        <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '8px 10px' }}>{row.jam_mulai} - {row.jam_selesai}{row.is_temporary && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: C.gold }}>(sementara)</span>}</td>
                          {filterType === 'siswa' && (
                            <td style={{ padding: '8px 10px' }}>{teacherName(row.guru_id)}</td>
                          )}
                          <td style={{ padding: '8px 10px' }}>{row.kelas}</td>
                          <td style={{ padding: '8px 10px' }}>{getStudentNames(row.siswa_ids)}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              background: row.tipe === 'Online' ? 'rgba(45,106,79,0.12)' : C.goldBg,
                              color: row.tipe === 'Online' ? C.green : C.gold,
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {row.tipe}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              background: row.jenis === 'Private' ? C.greenBg : C.goldBg,
                              color: row.jenis === 'Private' ? C.green : C.gold,
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {row.jenis}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: '1rem' }}>
              {filterType === 'guru' ? 'Belum ada guru terdaftar.' : 'Belum ada siswa terdaftar.'}
            </p>
          )}
        </div>

        {/* Kanan: Form Tambah Jadwal (selalu tampil) */}
        <div style={{ ...cardStyle, alignSelf: 'start' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Tambah Jadwal Baru</h3>
          <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Guru</label>
              <select
                required
                value={scheduleForm.guru_id}
                onChange={e => setScheduleForm({ ...scheduleForm, guru_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">Pilih guru...</option>
                {teachers.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Siswa (tahan Ctrl untuk pilih banyak)</label>
              <select
                required
                multiple
                value={scheduleForm.siswa_ids}
                onChange={e => {
                  const options = e.target.options;
                  const selected = [];
                  for (let i = 0; i < options.length; i++) {
                    if (options[i].selected) selected.push(options[i].value);
                  }
                  setScheduleForm({ ...scheduleForm, siswa_ids: selected });
                }}
                style={{ ...inputStyle, height: 'auto', minHeight: '80px' }}
              >
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <div style={{ fontSize: '0.7rem', color: C.gray, marginTop: '2px' }}>
                {scheduleForm.siswa_ids.length} siswa dipilih
              </div>
            </div>

            <div>
              <label style={labelStyle}>Hari</label>
              <select
                required
                value={scheduleForm.hari}
                onChange={e => setScheduleForm({ ...scheduleForm, hari: e.target.value })}
                style={inputStyle}
              >
                {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={labelStyle}>Jam Mulai</label>
                <input
                  required
                  type="time"
                  value={scheduleForm.jam_mulai}
                  onChange={e => setScheduleForm({ ...scheduleForm, jam_mulai: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Jam Selesai</label>
                <input
                  required
                  type="time"
                  value={scheduleForm.jam_selesai}
                  onChange={e => setScheduleForm({ ...scheduleForm, jam_selesai: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={labelStyle}>Jenis</label>
                <select
                  value={scheduleForm.jenis}
                  onChange={e => {
                    const val = e.target.value;
                    setScheduleForm({ ...scheduleForm, jenis: val, nama_group: '' });
                  }}
                  style={inputStyle}
                >
                  <option value="Private">Private</option>
                  <option value="Group">Group</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipe Les</label>
                <select
                  value={scheduleForm.tipe}
                  onChange={e => setScheduleForm({ ...scheduleForm, tipe: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
            </div>

            {scheduleForm.jenis === 'Group' && (
              <div>
                <label style={labelStyle}>Nama Group</label>
                <input
                  required
                  placeholder="Contoh: Kelas A Matematika"
                  value={scheduleForm.nama_group}
                  onChange={e => setScheduleForm({ ...scheduleForm, nama_group: e.target.value })}
                  style={inputStyle}
                />
              </div>
            )}

            {scheduleForm.jenis === 'Private' && (
              <div>
                <label style={labelStyle}>Kelas</label>
                <input
                  required
                  placeholder="XI IPA - Matematika"
                  value={scheduleForm.kelas}
                  onChange={e => setScheduleForm({ ...scheduleForm, kelas: e.target.value })}
                  style={inputStyle}
                />
              </div>
            )}

            <button type="submit" style={{ ...btnPrimary, width: '100%', marginTop: '0.5rem' }}>
              Simpan Jadwal
            </button>
          </form>
        </div>
      </div>

      {/* Catatan Admin */}
      <div style={{ background: C.goldBg, borderRadius: '12px', padding: '1rem 1.5rem', border: `1px solid ${C.gold}` }}>
        <p style={{ margin: 0, color: C.gold, fontWeight: '500' }}>
          💡 Setelah import atau perubahan jadwal, sistem akan mengirimkan notifikasi ke guru & siswa terkait.
        </p>
      </div>
    </div>
  );
};

export default AdminHome;