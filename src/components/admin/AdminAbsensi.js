// src/components/admin/AdminAbsensi.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { checkedUpdate } from '../../utils/supabaseUpdateGuard';
import logo from '../../Resource/PC_Horisontal.png';
import Toast, { useToast } from '../../components/Toast';

const C = {
  gold: '#b4964b',
  goldDark: '#96793a',
  green: '#2d6a4f',
  greenBg: 'rgba(45,106,79,0.10)',
  amber: '#a3760f',
  amberBg: 'rgba(180,150,75,0.14)',
  red: '#b0413e',
  redBg: 'rgba(176,65,62,0.10)',
  blue: '#3f7ea6',
  blueBg: 'rgba(63,126,166,0.10)',
  dark: '#171411',
  gray: '#726d66',
  grayLight: '#a8a29a',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e6e2d8',
};

const TABLE = 'sesi_pembelajaran';
const GURU_TABLE = 'guru';
const MOBILE_BREAKPOINT = 768;

// ---------- Helpers ----------
const initials = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const avatarPalette = ['#b4964b', '#2d6a4f', '#7a5c9e', '#3f7ea6', '#b0413e', '#a3760f'];
const avatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
};

const formatTanggalDisplay = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const formatTanggalIndo = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${parseInt(d, 10)} ${bulan[parseInt(m, 10) - 1]} ${y}`;
};

const bulanFromIso = (isoDate) => {
  if (!isoDate) return '';
  const bulanNama = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const [y, m] = isoDate.split('-');
  return `${bulanNama[parseInt(m, 10) - 1]} ${y}`;
};

const fileTypeFromUrl = (url = '') => (url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'img');
const fileNameFromUrl = (url = '') => decodeURIComponent(url.split('/').pop() || 'file');

const statusStyle = (status) => {
  if (status === 'Disetujui') return { bg: C.greenBg, fg: C.green };
  if (status === 'Ditolak') return { bg: C.redBg, fg: C.red };
  return { bg: C.amberBg, fg: C.amber };
};

// Hook deteksi layar mobile
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

// ---------- Komponen stat card ----------
const StatCard = ({ label, value, fg, bg }) => (
  <div
    style={{
      background: bg || C.cream,
      borderRadius: '14px',
      padding: '1rem 1.1rem',
      flex: '1 1 150px',
      border: `1px solid ${C.border}`,
    }}
  >
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: C.gray, marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: fg || C.dark }}>{value}</div>
  </div>
);

const MiniStatusBar = ({ counts }) => {
  const total = (counts.Menunggu || 0) + (counts.Disetujui || 0) + (counts.Ditolak || 0);
  if (total === 0) return <span style={{ color: C.grayLight, fontSize: '0.75rem' }}>Belum ada data</span>;
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {counts.Disetujui > 0 && (
        <span style={{ background: C.greenBg, color: C.green, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Disetujui} Disetujui
        </span>
      )}
      {counts.Menunggu > 0 && (
        <span style={{ background: C.amberBg, color: C.amber, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Menunggu} Menunggu
        </span>
      )}
      {counts.Ditolak > 0 && (
        <span style={{ background: C.redBg, color: C.red, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Ditolak} Ditolak
        </span>
      )}
    </div>
  );
};

// ---------- Komponen utama ----------
const AdminAbsensi = () => {
  const isMobile = useIsMobile();

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');
  const { toast, showToast } = useToast();

  const [guruList, setGuruList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);

  const [filterGuru, setFilterGuru] = useState('Semua Guru');
  const [filterSiswa, setFilterSiswa] = useState('Semua Siswa');
  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [rekapTab, setRekapTab] = useState('guru');

  // ----- State untuk edit tanggal -----
  const [showEditDateModal, setShowEditDateModal] = useState(false);
  const [editDateId, setEditDateId] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');

  // ----- State untuk konfirmasi hapus -----
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // ----- State untuk rekap siswa -----
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [rekapSiswaId, setRekapSiswaId] = useState('');
  const [rekapBulan, setRekapBulan] = useState('');
  const [rekapData, setRekapData] = useState([]);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [siswaName, setSiswaName] = useState('');
  const rekapRef = useRef();

  // Ambil daftar guru & siswa
  useEffect(() => {
    const loadMasters = async () => {
      setLoadingMasters(true);
      const [guruRes, siswaRes] = await Promise.all([
        supabase.from(GURU_TABLE).select('id, profile_id, profiles:profiles!profile_id(full_name)'),
        supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name', { ascending: true }),
      ]);
      if (!guruRes.error) {
        const list = (guruRes.data || [])
          .map((g) => ({ id: g.profile_id, full_name: g.profiles?.full_name || 'Guru tanpa nama' }))
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
        setGuruList(list);
      }
      if (!siswaRes.error) setStudentList(siswaRes.data || []);
      setLoadingMasters(false);
    };
    loadMasters();
  }, []);

  // Ambil seluruh sesi pembelajaran
  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setEntriesError('');
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, tanggal, judul_materi, catatan, bukti_urls, status, siswa_id, guru_id, siswa:profiles!sesi_pembelajaran_siswa_id_fkey(full_name), guruProfile:profiles!sesi_pembelajaran_guru_id_fkey(full_name)'
      )
      .order('tanggal', { ascending: false });

    if (error) {
      setEntriesError('Gagal memuat data pertemuan: ' + error.message);
    } else {
      setEntries(data || []);
    }
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Rekap per guru
  const rekapPerGuru = useMemo(() => {
    const map = new Map();
    guruList.forEach((g) => map.set(g.id, { id: g.id, nama: g.full_name, total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 }));
    entries.forEach((e) => {
      const key = e.guru_id;
      if (!map.has(key)) {
        map.set(key, { id: key, nama: e.guruProfile?.full_name || 'Guru tidak dikenal', total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 });
      }
      const row = map.get(key);
      row.total += 1;
      row[e.status] = (row[e.status] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries, guruList]);

  const rekapPerSiswa = useMemo(() => {
    const map = new Map();
    studentList.forEach((s) => map.set(s.id, { id: s.id, nama: s.full_name, total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 }));
    entries.forEach((e) => {
      const key = e.siswa_id;
      if (!map.has(key)) {
        map.set(key, { id: key, nama: e.siswa?.full_name || 'Siswa tidak dikenal', total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 });
      }
      const row = map.get(key);
      row.total += 1;
      row[e.status] = (row[e.status] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries, studentList]);

  const totalPertemuan = entries.length;
  const totalMenunggu = entries.filter((e) => e.status === 'Menunggu').length;
  const totalDisetujui = entries.filter((e) => e.status === 'Disetujui').length;
  const totalDitolak = entries.filter((e) => e.status === 'Ditolak').length;
  const guruAktifCount = rekapPerGuru.filter((g) => g.total > 0).length;
  const siswaAktifCount = rekapPerSiswa.filter((s) => s.total > 0).length;

  const bulanOptions = ['Semua Bulan', ...Array.from(new Set(entries.map((e) => bulanFromIso(e.tanggal)))).filter(Boolean)];

  // Filter untuk tabel detail
  const filteredEntries = entries.filter((e) => {
    const namaSiswa = e.siswa?.full_name || '';
    const namaGuru = e.guruProfile?.full_name || '';
    if (filterGuru !== 'Semua Guru' && e.guru_id !== filterGuru) return false;
    if (filterSiswa !== 'Semua Siswa' && e.siswa_id !== filterSiswa) return false;
    if (filterBulan !== 'Semua Bulan' && bulanFromIso(e.tanggal) !== filterBulan) return false;
    if (filterStatus !== 'Semua Status' && e.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !e.judul_materi.toLowerCase().includes(q) &&
        !(e.catatan || '').toLowerCase().includes(q) &&
        !namaSiswa.toLowerCase().includes(q) &&
        !namaGuru.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // ---------- Aksi admin: ubah status ----------
  const handleUpdateStatus = async (id, newStatus) => {
    setOpenMenuId(null);
    setUpdatingId(id);
    const prevEntries = entries;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e)));
    const { error } = await checkedUpdate(
      supabase.from(TABLE).update({ status: newStatus }).eq('id', id)
    );
    if (error) {
      setEntries(prevEntries);
      showToast('error', 'Gagal mengubah status: ' + error.message);
    }
    setUpdatingId(null);
  };

  // ---------- Aksi: edit tanggal ----------
  const openEditDateModal = (id, currentDate) => {
    setEditDateId(id);
    setEditDateValue(currentDate);
    setShowEditDateModal(true);
    setOpenMenuId(null);
  };

  const handleUpdateDate = async () => {
    if (!editDateId || !editDateValue) return;
    setUpdatingId(editDateId);
    const prevEntries = entries;
    setEntries((prev) => prev.map((e) => (e.id === editDateId ? { ...e, tanggal: editDateValue } : e)));
    const { error } = await checkedUpdate(
      supabase.from(TABLE).update({ tanggal: editDateValue }).eq('id', editDateId)
    );
    if (error) {
      setEntries(prevEntries);
      showToast('error', 'Gagal update tanggal: ' + error.message);
    }
    setUpdatingId(null);
    setShowEditDateModal(false);
    setEditDateId(null);
    setEditDateValue('');
  };

  // ---------- Aksi: hapus ----------
  const openDeleteModal = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setUpdatingId(deleteId);
    const prevEntries = entries;
    setEntries((prev) => prev.filter((e) => e.id !== deleteId));
    const { error } = await supabase.from(TABLE).delete().eq('id', deleteId);
    if (error) {
      setEntries(prevEntries);
      showToast('error', 'Gagal menghapus pertemuan: ' + error.message);
    }
    setUpdatingId(null);
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  // ---------- Rekap siswa dengan pengelompokan per guru ----------
  const loadRekap = async () => {
    if (!rekapSiswaId || !rekapBulan) {
      showToast('warning', 'Pilih siswa dan bulan terlebih dahulu.');
      return;
    }
    setLoadingRekap(true);
    const [year, month] = rekapBulan.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${new Date(year, month, 0).getDate()}`;
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        tanggal, judul_materi, catatan, status,
        guru_id,
        guruProfile:profiles!sesi_pembelajaran_guru_id_fkey(full_name)
      `)
      .eq('siswa_id', rekapSiswaId)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: true });

    if (error) {
      showToast('error', 'Gagal mengambil rekap: ' + error.message);
    } else {
      setRekapData(data || []);
      const siswa = studentList.find(s => s.id === rekapSiswaId);
      setSiswaName(siswa?.full_name || 'Siswa');
      setShowRekapModal(true);
    }
    setLoadingRekap(false);
  };

  // Kelompokkan data rekap berdasarkan guru (guru_id)
  const groupedByGuru = useMemo(() => {
    const groups = {};
    rekapData.forEach(item => {
      const key = item.guru_id || 'unknown';
      if (!groups[key]) {
        groups[key] = {
          guru_id: key,
          guru_name: item.guruProfile?.full_name || 'Guru tidak diketahui',
          items: []
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups).sort((a, b) => a.guru_name.localeCompare(b.guru_name));
  }, [rekapData]);

  // ---------- Download PDF dengan pengelompokan per guru ----------
  const handleDownloadPDF = () => {
    const printContent = document.getElementById('rekap-print');
    if (!printContent) return;
    const originalTitle = document.title;
    document.title = `Rekap ${siswaName} ${rekapBulan}`;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showToast('warning', 'Mohon izinkan popup untuk mencetak PDF.');
      return;
    }
    const styles = `
      body { font-family: 'Times New Roman', Times, serif; margin: 40px; color: #171411; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #b4964b; padding-bottom: 15px; }
      .logo { max-height: 60px; }
      .title { font-size: 24px; font-weight: bold; color: #b4964b; margin: 10px 0 0; }
      .subtitle { font-size: 16px; color: #726d66; margin: 4px 0 0; }
      .info { margin: 15px 0 20px; font-size: 14px; }
      .info span { font-weight: bold; }
      .guru-section { margin-bottom: 30px; }
      .guru-header { font-size: 18px; font-weight: bold; color: #2d6a4f; margin-bottom: 10px; border-bottom: 1px solid #b4964b; padding-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 5px; }
      th { background: #f7f6f0; padding: 8px 8px; border: 1px solid #e6e2d8; text-align: left; }
      td { padding: 6px 8px; border: 1px solid #e6e2d8; vertical-align: top; }
      .status { padding: 2px 10px; border-radius: 12px; font-weight: 600; font-size: 11px; display: inline-block; }
      .status-disetujui { background: #e4efe9; color: #2d6a4f; }
      .status-ditolak { background: #fbeceb; color: #b0413e; }
      .status-menunggu { background: #fdf6ec; color: #a3760f; }
      .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #a8a29a; border-top: 1px solid #e6e2d8; padding-top: 15px; }
      .total-row { background: #f7f6f0; font-weight: bold; }
      .sub-total { font-weight: bold; margin-top: 8px; text-align: right; }
    `;

    let guruTablesHtml = '';
    groupedByGuru.forEach(group => {
      const items = group.items;
      guruTablesHtml += `
        <div class="guru-section">
          <div class="guru-header">👨‍🏫 ${group.guru_name}</div>
          <table>
            <thead>
              <tr><th>No.</th><th>Tanggal</th><th>Materi</th><th>Catatan</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => {
                const statusClass = `status-${item.status.toLowerCase()}`;
                return `
                  <tr>
                    <td>${idx+1}</td>
                    <td>${formatTanggalIndo(item.tanggal)}</td>
                    <td>${item.judul_materi}</td>
                    <td>${item.catatan || '-'}</td>
                    <td><span class="status ${statusClass}">${item.status}</span></td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td colspan="5" style="text-align:right;">Total dengan ${group.guru_name}: ${items.length} pertemuan</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });

    const totalAll = rekapData.length;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Rekap ${siswaName} ${rekapBulan}</title><style>${styles}</style></head>
      <body>
        <div class="header">
          <img src="${logo}" alt="Precious Course" class="logo" />
          <div class="title">LAPORAN REKAP PERTEMUAN</div>
          <div class="subtitle">Precious Course — Monitoring Belajar Siswa</div>
        </div>
        <div class="info">
          <div><span>Nama Siswa:</span> ${siswaName}</div>
          <div><span>Periode:</span> ${bulanFromIso(rekapBulan+'-01')}</div>
          <div><span>Total Pertemuan:</span> ${totalAll} sesi</div>
        </div>
        ${guruTablesHtml}
        <div class="footer">
          Laporan ini dibuat secara otomatis oleh sistem Precious Course.<br />
          ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    document.title = originalTitle;
  };

  const selectStyle = {
    padding: '9px 12px',
    borderRadius: '9px',
    border: `1.5px solid ${C.border}`,
    fontSize: '0.85rem',
    color: C.dark,
    background: C.white,
    cursor: 'pointer',
    outline: 'none',
  };

  const rekapRows = rekapTab === 'guru' ? rekapPerGuru : rekapPerSiswa;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: C.dark }}>Monitoring Pertemuan</h2>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.88rem' }}>
          Pantau pertemuan yang dilaporkan oleh setiap guru dan yang diikuti tiap siswa.
        </p>
      </div>

      <Toast toast={toast} />

      {/* Statistik ringkas */}
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="Total Pertemuan" value={totalPertemuan} />
        <StatCard label="Guru Aktif" value={guruAktifCount} fg={C.goldDark} />
        <StatCard label="Siswa Aktif" value={siswaAktifCount} fg={C.blue} bg={C.blueBg} />
        <StatCard label="Menunggu Persetujuan" value={totalMenunggu} fg={C.amber} bg={C.amberBg} />
        <StatCard label="Disetujui" value={totalDisetujui} fg={C.green} bg={C.greenBg} />
        <StatCard label="Ditolak" value={totalDitolak} fg={C.red} bg={C.redBg} />
      </div>

      {entriesError && (
        <div style={{ background: C.redBg, color: C.red, padding: '10px 14px', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {entriesError}
        </div>
      )}

      {/* Rekap per Guru / per Siswa */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          <button
            onClick={() => setRekapTab('guru')}
            style={{
              flex: 1,
              padding: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: rekapTab === 'guru' ? C.cream : C.white,
              color: rekapTab === 'guru' ? C.dark : C.gray,
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            Rekap per Guru
          </button>
          <button
            onClick={() => setRekapTab('siswa')}
            style={{
              flex: 1,
              padding: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: rekapTab === 'siswa' ? C.cream : C.white,
              color: rekapTab === 'siswa' ? C.dark : C.gray,
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            Rekap per Siswa
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  {rekapTab === 'guru' ? 'Nama Guru' : 'Nama Siswa'}
                </th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Total Pertemuan</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Rincian Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingMasters || loadingEntries ? (
                <tr>
                  <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: C.grayLight }}>
                    Memuat rekap...
                  </td>
                </tr>
              ) : rekapRows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: C.grayLight }}>
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                rekapRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => (rekapTab === 'guru' ? setFilterGuru(row.id) : setFilterSiswa(row.id))}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
                  >
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            background: avatarColor(row.nama), color: C.white,
                            fontSize: '0.65rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                        >
                          {initials(row.nama)}
                        </span>
                        <span style={{ fontWeight: 600 }}>{row.nama}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{row.total}</td>
                    <td style={{ padding: '10px' }}>
                      <MiniStatusBar counts={row} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.7rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '1rem',
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          padding: '0.85rem',
        }}
      >
        <select value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)} style={selectStyle}>
          <option value="Semua Guru">Semua Guru</option>
          {guruList.map((g) => (
            <option key={g.id} value={g.id}>{g.full_name}</option>
          ))}
        </select>

        <select value={filterSiswa} onChange={(e) => setFilterSiswa(e.target.value)} style={selectStyle}>
          <option value="Semua Siswa">Semua Siswa</option>
          {studentList.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>

        <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} style={selectStyle}>
          {bulanOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="Semua Status">Semua Status</option>
          <option value="Menunggu">Menunggu</option>
          <option value="Disetujui">Disetujui</option>
          <option value="Ditolak">Ditolak</option>
        </select>

        <input
          type="text"
          placeholder="Cari judul materi, catatan, nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...selectStyle, cursor: 'text', flex: '1 1 220px', minWidth: '200px' }}
        />

        <button
          onClick={() => setShowRekapModal(true)}
          style={{ ...selectStyle, background: C.gold, color: C.white, fontWeight: 'bold', border: 'none' }}
        >
          📊 Rekap Siswa
        </button>

        {(filterGuru !== 'Semua Guru' || filterSiswa !== 'Semua Siswa' || filterBulan !== 'Semua Bulan' || filterStatus !== 'Semua Status' || search) && (
          <button
            onClick={() => {
              setFilterGuru('Semua Guru');
              setFilterSiswa('Semua Siswa');
              setFilterBulan('Semua Bulan');
              setFilterStatus('Semua Status');
              setSearch('');
            }}
            style={{ ...selectStyle, background: C.cream, fontWeight: 700 }}
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Tabel / kartu detail pertemuan */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
        {isMobile ? (
          // --- Tampilan mobile (kartu) ---
          <div style={{ padding: '0.75rem' }}>
            {loadingEntries && <div style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Memuat data...</div>}
            {!loadingEntries && filteredEntries.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Belum ada pertemuan yang cocok dengan filter ini.</div>
            )}
            {!loadingEntries && filteredEntries.map((item) => {
              const st = statusStyle(item.status);
              const namaSiswa = item.siswa?.full_name || 'Siswa tidak ditemukan';
              const namaGuru = item.guruProfile?.full_name || 'Guru tidak ditemukan';
              return (
                <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '0.9rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: C.dark }}>{item.judul_materi}</div>
                      <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '2px' }}>{formatTanggalDisplay(item.tanggal)}</div>
                    </div>
                    <span style={{ background: st.bg, color: st.fg, padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {item.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: C.gray, marginBottom: '8px' }}>
                    <span><strong style={{ color: C.dark }}>Guru:</strong> {namaGuru}</span>
                    <span><strong style={{ color: C.dark }}>Siswa:</strong> {namaSiswa}</span>
                    {item.catatan && <span><strong style={{ color: C.dark }}>Catatan:</strong> {item.catatan}</span>}
                  </div>

                  {item.bukti_urls && item.bukti_urls.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                      {item.bukti_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          title={fileNameFromUrl(url)}
                          style={{
                            width: '24px', height: '24px', borderRadius: '6px',
                            background: fileTypeFromUrl(url) === 'pdf' ? '#e0574f' : '#3f7ea6',
                            color: '#fff', fontSize: '0.55rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                          }}
                        >
                          {fileTypeFromUrl(url) === 'pdf' ? 'PDF' : 'IMG'}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Aksi mobile: Setujui/Tolak/Hapus */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {item.status === 'Menunggu' && (
                      <>
                        <button
                          disabled={updatingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, 'Disetujui')}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: C.green, color: C.white, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                        >
                          Setujui
                        </button>
                        <button
                          disabled={updatingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, 'Ditolak')}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: C.red, color: C.white, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                        >
                          Tolak
                        </button>
                      </>
                    )}
                    <button
                      disabled={updatingId === item.id}
                      onClick={() => openDeleteModal(item.id)}
                      style={{ flex: item.status === 'Menunggu' ? '0.5' : 1, padding: '8px', borderRadius: '8px', border: `1.5px solid ${C.red}`, background: C.white, color: C.red, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // --- Tampilan desktop (tabel) ---
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: C.cream }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>No.</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tanggal</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Guru</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Judul Materi Ajar</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Catatan</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Bukti</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingEntries && (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Memuat data pertemuan...</td>
                  </tr>
                )}
                {!loadingEntries && filteredEntries.map((item, idx) => {
                  const st = statusStyle(item.status);
                  const namaSiswa = item.siswa?.full_name || 'Siswa tidak ditemukan';
                  const namaGuru = item.guruProfile?.full_name || 'Guru tidak ditemukan';
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px', color: C.gray }}>{idx + 1}</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{formatTanggalDisplay(item.tanggal)}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: avatarColor(namaGuru), color: C.white,
                              fontSize: '0.6rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                          >
                            {initials(namaGuru)}
                          </span>
                          <span>{namaGuru}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: avatarColor(namaSiswa), color: C.white,
                              fontSize: '0.6rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                          >
                            {initials(namaSiswa)}
                          </span>
                          <span>{namaSiswa}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontWeight: '500', minWidth: '160px' }}>{item.judul_materi}</td>
                      <td style={{ padding: '10px', maxWidth: '220px', color: C.gray, wordBreak: 'break-word' }}>
                        {item.catatan || '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {(!item.bukti_urls || item.bukti_urls.length === 0) ? (
                          <span style={{ color: C.grayLight }}>-</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {item.bukti_urls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                title={fileNameFromUrl(url)}
                                style={{
                                  width: '22px', height: '22px', borderRadius: '6px',
                                  background: fileTypeFromUrl(url) === 'pdf' ? '#e0574f' : '#3f7ea6',
                                  color: '#fff', fontSize: '0.55rem', fontWeight: 700,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                                }}
                              >
                                {fileTypeFromUrl(url) === 'pdf' ? 'PDF' : 'IMG'}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ background: st.bg, color: st.fg, padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', position: 'relative' }}>
                        {item.status === 'Menunggu' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              disabled={updatingId === item.id}
                              onClick={() => handleUpdateStatus(item.id, 'Disetujui')}
                              title="Setujui"
                              style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: C.greenBg, color: C.green, cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✓
                            </button>
                            <button
                              disabled={updatingId === item.id}
                              onClick={() => handleUpdateStatus(item.id, 'Ditolak')}
                              title="Tolak"
                              style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: C.redBg, color: C.red, cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✕
                            </button>
                            <button
                              onClick={() => openDeleteModal(item.id)}
                              title="Hapus"
                              style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: C.redBg, color: C.red, cursor: 'pointer', fontWeight: 700 }}
                            >
                              🗑
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '1.1rem', padding: '0 6px' }}
                          >
                            ⋮
                          </button>
                        )}
                        {openMenuId === item.id && (
                          <div
                            style={{
                              position: 'absolute', right: 0, top: '30px', background: C.white,
                              border: `1px solid ${C.border}`, borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, minWidth: '140px',
                            }}
                          >
                            <button
                              onClick={() => handleUpdateStatus(item.id, 'Menunggu')}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.dark, fontSize: '0.82rem' }}
                            >
                              Set ke Menunggu
                            </button>
                            <button
                              onClick={() => openEditDateModal(item.id, item.tanggal)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.blue, fontSize: '0.82rem' }}
                            >
                              Edit Tanggal
                            </button>
                            <button
                              onClick={() => openDeleteModal(item.id)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: '0.82rem' }}
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loadingEntries && filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                      Belum ada pertemuan yang cocok dengan filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODAL EDIT TANGGAL ===== */}
      {showEditDateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: C.dark }}>Edit Tanggal Pertemuan</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: C.gray }}>
              Ubah tanggal pertemuan menjadi:
            </p>
            <input
              type="date"
              value={editDateValue}
              onChange={(e) => setEditDateValue(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${C.border}`,
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowEditDateModal(false);
                  setEditDateId(null);
                  setEditDateValue('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1.5px solid ${C.border}`,
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  color: C.gray,
                }}
              >
                Batal
              </button>
              <button
                onClick={handleUpdateDate}
                disabled={updatingId === editDateId}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: C.gold,
                  color: C.white,
                  fontWeight: 'bold',
                  cursor: updatingId === editDateId ? 'default' : 'pointer',
                  opacity: updatingId === editDateId ? 0.6 : 1,
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              >
                {updatingId === editDateId ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL KONFIRMASI HAPUS ===== */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: C.dark }}>Hapus Pertemuan</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: C.gray }}>
              Yakin ingin menghapus pertemuan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteId(null);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1.5px solid ${C.border}`,
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  color: C.gray,
                }}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={updatingId === deleteId}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: C.red,
                  color: C.white,
                  fontWeight: 'bold',
                  cursor: updatingId === deleteId ? 'default' : 'pointer',
                  opacity: updatingId === deleteId ? 0.6 : 1,
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              >
                {updatingId === deleteId ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL REKAP SISWA (dikelompokkan per guru) ===== */}
      {showRekapModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: C.dark }}>📊 Rekap Pertemuan Siswa</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleDownloadPDF}
                  disabled={rekapData.length === 0}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: C.green,
                    color: C.white,
                    fontWeight: 'bold',
                    cursor: rekapData.length === 0 ? 'default' : 'pointer',
                    opacity: rekapData.length === 0 ? 0.5 : 1,
                    fontFamily: 'inherit',
                    fontSize: '0.8rem',
                  }}
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => {
                    setShowRekapModal(false);
                    setRekapData([]);
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.gray }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <select
                value={rekapSiswaId}
                onChange={(e) => setRekapSiswaId(e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Pilih Siswa --</option>
                {studentList.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>

              <input
                type="month"
                value={rekapBulan}
                onChange={(e) => setRekapBulan(e.target.value)}
                style={{ ...selectStyle, cursor: 'text' }}
              />

              <button
                onClick={loadRekap}
                disabled={loadingRekap}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: C.gold,
                  color: C.white,
                  fontWeight: 'bold',
                  cursor: loadingRekap ? 'default' : 'pointer',
                  opacity: loadingRekap ? 0.6 : 1,
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              >
                {loadingRekap ? 'Memuat...' : 'Tampilkan'}
              </button>
            </div>

            {rekapData.length === 0 && !loadingRekap && (
              <div style={{ textAlign: 'center', color: C.grayLight, padding: '1.5rem 0' }}>
                Belum ada data untuk siswa dan bulan ini.
              </div>
            )}

            {rekapData.length > 0 && (
              <div id="rekap-print" ref={rekapRef}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', borderBottom: `2px solid ${C.gold}`, paddingBottom: '0.5rem' }}>
                  <img src={logo} alt="Precious Course" style={{ height: '40px' }} />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: C.dark }}>Rekap Pertemuan</div>
                    <div style={{ fontSize: '0.8rem', color: C.gray }}>{siswaName} — {bulanFromIso(rekapBulan+'-01')}</div>
                  </div>
                </div>

                {/* Kelompokkan per guru */}
                {groupedByGuru.map((group, idx) => (
                  <div key={idx} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: C.goldDark, borderBottom: `1px solid ${C.gold}`, paddingBottom: '4px', marginBottom: '8px' }}>
                      👨‍🏫 {group.guru_name}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: C.cream }}>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>No.</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>Tanggal</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>Materi</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>Catatan</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item, idx2) => {
                            const st = statusStyle(item.status);
                            return (
                              <tr key={idx2} style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '6px 8px' }}>{idx2 + 1}</td>
                                <td style={{ padding: '6px 8px' }}>{formatTanggalDisplay(item.tanggal)}</td>
                                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{item.judul_materi}</td>
                                <td style={{ padding: '6px 8px', color: C.gray }}>{item.catatan || '-'}</td>
                                <td style={{ padding: '6px 8px' }}>
                                  <span style={{ background: st.bg, color: st.fg, padding: '2px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{ background: C.cream }}>
                            <td colSpan={5} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                              Total dengan {group.guru_name}: {group.items.length} pertemuan
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: C.grayLight, textAlign: 'center', borderTop: `1px solid ${C.border}`, paddingTop: '0.5rem' }}>
                  Total seluruh pertemuan: {rekapData.length} • Dicetak dari Precious Course • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAbsensi;