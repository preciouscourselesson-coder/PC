// src/components/admin/PaketSiswa.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import InvoicePaketSiswa from './InvoicePaketSiswa';

// ============================================================
// PALET WARNA
// ============================================================
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
  blueBg: 'rgba(63,126,166,0.12)',
  dark: '#171411',
  gray: '#726d66',
  grayBg: 'rgba(114,109,102,0.12)',
  grayLight: '#a8a29a',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e6e2d8',
};

const D = {
  bg: '#12141c',
  bgSoft: '#181b26',
  field: '#1c2030',
  fieldBorder: '#2c3145',
  fieldBorderFocus: '#c9a24b',
  gold: '#d4ac52',
  goldSoft: 'rgba(212,172,82,0.14)',
  text: '#f2efe6',
  textMuted: '#9a9fb0',
  textFaint: '#5f6577',
  red: '#e0574f',
  green: '#7fbf9e',
  blue: '#4f8fdb',
  danger: '#e0574f',
};

const STATUS_META = {
  Aktif: { bg: C.greenBg, fg: C.green, dot: C.green },
  'Akan Berakhir': { bg: C.amberBg, fg: C.amber, dot: C.amber },
  Berakhir: { bg: C.grayBg, fg: C.gray, dot: C.gray },
  Selesai: { bg: C.grayBg, fg: C.gray, dot: C.gray },
};

// Badge untuk jenis pengajar (menentukan tarif pricelist yang dipakai)
const PENGAJAR_META = {
  Profesional: { bg: C.amberBg, fg: C.amber, icon: '🎓' },
  Mahasiswa: { bg: C.blueBg, fg: C.blue, icon: '📘' },
};

const getPengajarMeta = (pengajar) =>
  PENGAJAR_META[pengajar] || { bg: C.grayBg, fg: C.gray, icon: '👤' };

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
};

// Hitung harga pricelist sesuai jenis paket (Private/Group) & jumlah siswa group.
// Disamakan persis dengan getHargaPaket di InvoicePaketSiswa.js agar Total Harga
// yang ditampilkan di sini konsisten dengan nominal yang muncul di invoice.
const getHargaPaket = (jenis, jumlahGroup, pricelist) => {
  if (!pricelist) return 0;
  if (jenis !== 'Group') return pricelist.harga_privat || 0;
  if (jumlahGroup === 2) return pricelist.harga_2siswa ?? pricelist.harga_privat ?? 0;
  if (jumlahGroup === 3) return pricelist.harga_3siswa ?? pricelist.harga_privat ?? 0;
  if (jumlahGroup === 4) return pricelist.harga_4siswa ?? pricelist.harga_privat ?? 0;
  return pricelist.harga_privat || 0;
};

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatTanggal = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  const bulan = BULAN_SINGKAT[parseInt(m, 10) - 1] || m;
  return `${d} ${bulan} ${y}`;
};

// Kolom pricelist.jumlah_pertemuan berisi teks deskriptif, contoh:
// "2x per minggu (8 pertemuan satu bulan)". Untuk disimpan sebagai integer
// di paket_siswa.total_pertemuan, ambil angka di dalam tanda kurung (mis. 8).
const extractJumlahPertemuan = (text) => {
  if (!text) return 0;
  const match = String(text).match(/\((\d+)\s*pertemuan/i);
  if (match) return parseInt(match[1], 10);
  // Fallback: kalau formatnya tidak sesuai pola di atas, ambil angka pertama yang ditemukan
  const fallback = String(text).match(/\d+/);
  return fallback ? parseInt(fallback[0], 10) : 0;
};

const generateSiswaId = (createdAt, index) => {
  if (!createdAt) return `SIS-${String(index + 1).padStart(4, '0')}`;
  const d = new Date(createdAt);
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `SIS-${y}${m}${day}${String(index + 1).padStart(2, '0')}`;
};

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: `1.5px solid ${hasError ? C.red : C.border}`,
  fontSize: '0.85rem',
  color: C.dark,
  fontFamily: 'inherit',
  background: C.white,
  outline: 'none',
  boxSizing: 'border-box',
});

const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: C.gray,
  marginBottom: '6px',
};

const iconBtnStyle = (bg, fg) => ({
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  border: 'none',
  background: bg,
  color: fg,
  fontSize: '0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const cardStyle = {
  background: C.white,
  borderRadius: '16px',
  border: `1.5px solid ${C.border}`,
  padding: '1.5rem',
  boxSizing: 'border-box',
};

const errorTextStyle = { color: C.red, fontSize: '0.75rem', marginTop: '4px' };

// Label dropdown paket: gabungan program · kelas · jumlah pertemuan · durasi · pengajar
const formatPaketLabel = (p) => {
  const parts = [p.program];
  if (p.kelas) parts.push(p.kelas);
  if (p.jumlah_pertemuan) parts.push(`${p.jumlah_pertemuan}x pertemuan`);
  if (p.durasi) parts.push(p.durasi);
  if (p.pengajar) parts.push(p.pengajar);
  return parts.join(' · ');
};

// Opsi filter Durasi & Pengajar -- disamakan dengan opsi pada Pricelist.js
const KELAS_OPTIONS = ['SMA', 'SMP'];
const DURASI_OPTIONS = ['60 Menit', '90 Menit'];
const PENGAJAR_OPTIONS = ['Profesional', 'Mahasiswa'];

const PAGE_SIZE = 8;

// ============================================================
// KOMPONEN FORM TAMBAH / EDIT PAKET SISWA
// ============================================================
const FormTambahSiswa = ({ onSuccess, onCancelEdit, userRole, guruId, editingItem }) => {
  const isEditing = !!editingItem;

  const [loading, setLoading] = useState(false);
  const [siswaList, setSiswaList] = useState([]);
  const [pricelistList, setPricelistList] = useState([]);
  const [guruList, setGuruList] = useState([]);
  const [filterDurasiPaket, setFilterDurasiPaket] = useState('Semua');
  const [filterPengajarPaket, setFilterPengajarPaket] = useState('Semua');
  const [filterKelasPaket, setFilterKelasPaket] = useState('Semua');
  const [form, setForm] = useState({
    siswa_id: '',
    pricelist_id: '',
    guru_id: '',
    tanggal_mulai: '',
    jenis: 'Private',
    jumlah_siswa_group: '2',
    status: 'Aktif',
    harga_custom: '',
    catatan_harga_custom: '',
  });
  const [errors, setErrors] = useState({});

  // Ambil daftar siswa (role = student)
  useEffect(() => {
    const fetchSiswa = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, kelas')
        .eq('role', 'student')
        .order('full_name');
      if (!error) setSiswaList(data || []);
    };
    fetchSiswa();
  }, []);

  // Ambil daftar pricelist yang aktif
  useEffect(() => {
    const fetchPricelist = async () => {
      const { data, error } = await supabase
        .from('pricelist')
        .select('id, program, kelas, jumlah_pertemuan, durasi, pengajar')
        .eq('status', 'Aktif')
        .order('program');
      if (!error) setPricelistList(data || []);
    };
    fetchPricelist();
  }, []);

  // Ambil daftar guru (hanya diperlukan untuk admin, karena admin harus memilih guru penanggung jawab)
  useEffect(() => {
    if (userRole !== 'admin') return;
    const fetchGuru = async () => {
      const { data, error } = await supabase
        .from('guru')
        .select('id, nama')
        .order('nama');
      if (!error) setGuruList(data || []);
    };
    fetchGuru();
  }, [userRole]);

  // Isi ulang form saat mulai edit (atau kosongkan saat kembali ke mode tambah)
  useEffect(() => {
    if (editingItem) {
      setForm({
        siswa_id: editingItem.siswa_id || '',
        pricelist_id: editingItem.pricelist_id || '',
        guru_id: editingItem.guru_id || '',
        tanggal_mulai: editingItem.tanggal_mulai || '',
        jenis: editingItem.jenis === 'Group' ? 'Group' : 'Private',
        jumlah_siswa_group: editingItem.jumlah_siswa_group ? String(editingItem.jumlah_siswa_group) : '2',
        status: editingItem.status || 'Aktif',
        harga_custom: editingItem.harga_custom != null ? String(editingItem.harga_custom) : '',
        catatan_harga_custom: editingItem.catatan_harga_custom || '',
      });
    } else {
      resetForm();
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem]);

  const resetForm = () => {
    setForm({
      siswa_id: '',
      pricelist_id: '',
      guru_id: '',
      tanggal_mulai: '',
      jenis: 'Private',
      jumlah_siswa_group: '2',
      status: 'Aktif',
      harga_custom: '',
      catatan_harga_custom: '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.siswa_id) newErrors.siswa_id = 'Pilih siswa';
    if (!form.pricelist_id) newErrors.pricelist_id = 'Pilih paket';
    if (userRole === 'admin' && !form.guru_id) newErrors.guru_id = 'Pilih guru';
    if (!form.tanggal_mulai) newErrors.tanggal_mulai = 'Isi tanggal mulai';
    if (form.jenis === 'Group' && !form.jumlah_siswa_group) newErrors.jumlah_siswa_group = 'Pilih jumlah siswa';
    return newErrors;
  };

  const handleBatal = () => {
    resetForm();
    setErrors({});
    onCancelEdit && onCancelEdit();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Tentukan guru_id: untuk guru (teacher) pakai guruId dari akun sendiri,
      // untuk admin pakai guru yang dipilih di form.
      const guru_id = userRole === 'admin' ? form.guru_id : guruId;
      if (!guru_id) {
        alert('Guru penanggung jawab belum ditentukan. Silakan pilih guru terlebih dahulu.');
        setLoading(false);
        return;
      }

      const selectedPricelist = pricelistList.find(p => String(p.id) === String(form.pricelist_id));
      const totalPertemuan = extractJumlahPertemuan(selectedPricelist?.jumlah_pertemuan);

      // Sisa pertemuan: kalau paket baru dipilih (atau ini entri baru), mulai penuh dari total.
      // Kalau sedang edit dan paketnya tidak berubah, pertahankan sisa pertemuan yang sudah berjalan.
      let sisaPertemuan = totalPertemuan;
      if (isEditing && editingItem.pricelist_id === form.pricelist_id && editingItem.sisa_pertemuan != null) {
        sisaPertemuan = editingItem.sisa_pertemuan;
      }

      const payload = {
        siswa_id: form.siswa_id,
        pricelist_id: form.pricelist_id,
        guru_id: guru_id,
        tanggal_mulai: form.tanggal_mulai,
        jenis: form.jenis,
        jumlah_siswa_group: form.jenis === 'Group' ? Number(form.jumlah_siswa_group) : null,
        total_pertemuan: totalPertemuan,
        sisa_pertemuan: sisaPertemuan,
        status: form.status,
        harga_custom: form.harga_custom !== '' ? Number(form.harga_custom) : null,
        catatan_harga_custom: form.harga_custom !== '' ? (form.catatan_harga_custom || null) : null,
      };

      const { error } = isEditing
        ? await supabase.from('paket_siswa').update(payload).eq('id', editingItem.id)
        : await supabase.from('paket_siswa').insert(payload);

      if (error) throw error;

      resetForm();
      onSuccess && onSuccess();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPricelistList = pricelistList.filter((p) => {
    if (filterKelasPaket !== 'Semua' && p.kelas !== filterKelasPaket) return false;
    if (filterDurasiPaket !== 'Semua' && p.durasi !== filterDurasiPaket) return false;
    if (filterPengajarPaket !== 'Semua' && p.pengajar !== filterPengajarPaket) return false;
    return true;
  });

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>
        {isEditing ? 'Edit Paket Siswa' : 'Tambah Siswa ke Paket'}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Siswa</label>
          <select
            name="siswa_id"
            value={form.siswa_id}
            onChange={handleChange}
            style={inputStyle(!!errors.siswa_id)}
          >
            <option value="">Pilih siswa</option>
            {siswaList.map(s => (
              <option key={s.id} value={s.id}>{s.full_name} - {s.kelas || '-'}</option>
            ))}
          </select>
          {errors.siswa_id && <div style={errorTextStyle}>{errors.siswa_id}</div>}
        </div>

        <div>
          <label style={labelStyle}>Paket</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <div>
              <select
                value={filterKelasPaket}
                onChange={(e) => setFilterKelasPaket(e.target.value)}
                style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <option value="Semua">Semua Kelas</option>
                {KELAS_OPTIONS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterDurasiPaket}
                onChange={(e) => setFilterDurasiPaket(e.target.value)}
                style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <option value="Semua">Semua Durasi</option>
                {DURASI_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterPengajarPaket}
                onChange={(e) => setFilterPengajarPaket(e.target.value)}
                style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <option value="Semua">Semua Pengajar</option>
                {PENGAJAR_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <select
            name="pricelist_id"
            value={form.pricelist_id}
            onChange={handleChange}
            style={inputStyle(!!errors.pricelist_id)}
          >
            <option value="">Pilih paket</option>
            {filteredPricelistList.map(p => (
              <option key={p.id} value={p.id}>{formatPaketLabel(p)}</option>
            ))}
          </select>
          {errors.pricelist_id && <div style={errorTextStyle}>{errors.pricelist_id}</div>}
          <div style={{ fontSize: '0.72rem', color: C.grayLight, marginTop: '4px' }}>
            Dropdown menampilkan program · kelas · jumlah pertemuan · durasi · pengajar. Gunakan filter di atas untuk mempersempit pilihan.
          </div>
        </div>

        {userRole === 'admin' && (
          <div>
            <label style={labelStyle}>Guru</label>
            <select
              name="guru_id"
              value={form.guru_id}
              onChange={handleChange}
              style={inputStyle(!!errors.guru_id)}
            >
              <option value="">Pilih guru</option>
              {guruList.map(g => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
            {errors.guru_id && <div style={errorTextStyle}>{errors.guru_id}</div>}
            {guruList.length === 0 && (
              <div style={{ fontSize: '0.72rem', color: C.grayLight, marginTop: '4px' }}>
                Belum ada data guru. Tambahkan guru terlebih dahulu di menu Guru.
              </div>
            )}
          </div>
        )}

        <div>
          <label style={labelStyle}>Tanggal Mulai</label>
          <input
            type="date"
            name="tanggal_mulai"
            value={form.tanggal_mulai}
            onChange={handleChange}
            style={inputStyle(!!errors.tanggal_mulai)}
          />
          {errors.tanggal_mulai && <div style={errorTextStyle}>{errors.tanggal_mulai}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: form.jenis === 'Group' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Private atau Group</label>
            <select
              name="jenis"
              value={form.jenis}
              onChange={handleChange}
              style={inputStyle(false)}
            >
              <option value="Private">Private</option>
              <option value="Group">Group</option>
            </select>
          </div>

          {form.jenis === 'Group' && (
            <div>
              <label style={labelStyle}>Jumlah Siswa dalam Group</label>
              <select
                name="jumlah_siswa_group"
                value={form.jumlah_siswa_group}
                onChange={handleChange}
                style={inputStyle(!!errors.jumlah_siswa_group)}
              >
                <option value="2">2 orang</option>
                <option value="3">3 orang</option>
                <option value="4">4 orang</option>
              </select>
              {errors.jumlah_siswa_group && <div style={errorTextStyle}>{errors.jumlah_siswa_group}</div>}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            style={inputStyle(false)}
          >
            <option value="Aktif">Aktif</option>
            <option value="Akan Berakhir">Akan Berakhir</option>
            <option value="Berakhir">Berakhir</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>

        <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: '0.85rem' }}>
          <label style={labelStyle}>Harga Khusus (opsional)</label>
          <input
            type="number"
            name="harga_custom"
            value={form.harga_custom}
            onChange={handleChange}
            placeholder="Kosongkan untuk pakai harga pricelist otomatis"
            style={inputStyle(false)}
            min="0"
          />
          {form.harga_custom !== '' && (
            <input
              type="text"
              name="catatan_harga_custom"
              value={form.catatan_harga_custom}
              onChange={handleChange}
              placeholder="Alasan, mis. Lokasi Batam - tambahan transport"
              style={{ ...inputStyle(false), marginTop: '6px' }}
            />
          )}
          <div style={{ fontSize: '0.72rem', color: C.grayLight, marginTop: '4px' }}>
            Isi hanya kalau siswa ini butuh harga berbeda dari pricelist standar (mis. lokasi berbeda). Harga pricelist tidak berubah untuk siswa lain.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.25rem' }}>
          {isEditing && (
            <button
              type="button"
              onClick={handleBatal}
              style={{ padding: '9px 20px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: 'transparent', color: C.gray, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: C.gold,
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit',
              flex: isEditing ? 'initial' : 1,
            }}
          >
            {loading ? 'Menyimpan...' : isEditing ? 'Update Paket' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================
// KOMPONEN UTAMA
// ============================================================
const PaketSiswa = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paketList, setPaketList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // untuk edit
  const [invoiceItem, setInvoiceItem] = useState(null); // paket siswa yang sedang dibuatkan invoice

  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterDurasi, setFilterDurasi] = useState('Semua');
  const [filterPengajar, setFilterPengajar] = useState('Semua');
  const [page, setPage] = useState(1);

  // Role & user info
  const [userRole, setUserRole] = useState('');
  const [guruId, setGuruId] = useState(null);
  const [guruNama, setGuruNama] = useState('');

  // Ambil role dan guru ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      if (!profileError && profile) {
        setUserRole(profile.role);
      }

      if (profile?.role === 'teacher') {
        const { data: guru, error: guruError } = await supabase
          .from('guru')
          .select('id, nama')
          .eq('profile_id', uid)
          .maybeSingle();
        if (!guruError && guru) {
          setGuruId(guru.id);
          setGuruNama(guru.nama);
        }
      }
    };
    fetchUser();
  }, []);

  // Ambil data paket siswa
  const loadPaketSiswa = useCallback(async () => {
    setLoading(true);
    setError('');

    if (userRole === 'teacher' && !guruId) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('paket_siswa').select(`
        *,
        siswa:profiles!paket_siswa_siswa_id_fkey (id, full_name, kelas, gender, created_at),
        pricelist:pricelist!paket_siswa_pricelist_id_fkey (
          id, program, jumlah_pertemuan, durasi, pengajar,
          harga_privat, harga_2siswa, harga_3siswa, harga_4siswa
        )
      `);

      if (userRole === 'teacher' && guruId) {
        query = query.eq('guru_id', guruId);
      }

      const { data, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const processed = (data || []).map((item, index) => {
        const siswa = item.siswa;
        const pricelist = item.pricelist || {};
        const siswaId = generateSiswaId(siswa?.created_at, index);
        return {
          ...item,
          siswa_nama: siswa?.full_name || 'Tidak Diketahui',
          siswa_id_display: siswaId,
          kelas_siswa: siswa?.kelas || '-',
          paket: pricelist.program || 'Paket Reguler',
          mapel: 'Matematika', // FIXME: ambil dari data asli
          program: 'Regular', // FIXME: ambil dari data asli
          jenis: item.jenis || 'Private', // ambil dari kolom jenis di paket_siswa
          jumlah_siswa_group: item.jumlah_siswa_group || null,
          pengajar: pricelist.pengajar || '-',
          durasi: pricelist.durasi || '-',
          harga: item.harga_custom != null
            ? item.harga_custom
            : getHargaPaket(item.jenis, item.jumlah_siswa_group, pricelist),
          harga_dari_pricelist: getHargaPaket(item.jenis, item.jumlah_siswa_group, pricelist),
          is_harga_custom: item.harga_custom != null,
          catatan_harga_custom: item.catatan_harga_custom || null,
          pricelist: pricelist,
          total_pertemuan: item.total_pertemuan,
          sisa_pertemuan: item.sisa_pertemuan,
          tanggal_mulai: item.tanggal_mulai,
          tanggal_berakhir: item.tanggal_berakhir,
          status: item.status,
        };
      });

      setPaketList(processed);
    } catch (err) {
      console.error('Error loading paket siswa:', err);
      setError('Gagal memuat data paket siswa: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [userRole, guruId]);

  useEffect(() => {
    if (userRole) loadPaketSiswa();
  }, [userRole, loadPaketSiswa]);

  // Filter
  const filtered = paketList.filter((item) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        item.siswa_nama.toLowerCase().includes(q) ||
        item.siswa_id_display.toLowerCase().includes(q) ||
        item.paket.toLowerCase().includes(q) ||
        item.mapel.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterKelas !== 'Semua' && item.kelas_siswa !== filterKelas) return false;
    if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
    if (filterDurasi !== 'Semua' && item.durasi !== filterDurasi) return false;
    if (filterPengajar !== 'Semua' && item.pengajar !== filterPengajar) return false;
    return true;
  });

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, filterKelas, filterStatus, filterDurasi, filterPengajar]);

  const selectedItem = paketList.find((item) => item.id === selectedId) || null;

  // ========== CRUD HANDLERS ==========
  const handleEdit = (item) => {
    setEditingItem(item);
    // Scroll form ke tampilan (berguna terutama saat klik dari panel Detail di bawah tabel)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus paket siswa ini?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('paket_siswa').delete().eq('id', id);
      if (error) throw error;
      await loadPaketSiswa();
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalSuccess = () => {
    loadPaketSiswa();
    setEditingItem(null);
  };

  const handleModalClose = () => {
    setEditingItem(null);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: C.dark, margin: 0 }}>Paket Siswa</h1>
        <p style={{ fontSize: '0.85rem', color: C.gray, margin: '4px 0 0' }}>
          {userRole === 'admin'
            ? 'Daftar semua paket siswa'
            : guruNama
            ? `Daftar paket les untuk siswa ${guruNama}`
            : 'Daftar paket les'}
        </p>
      </div>

      {/* Konten utama: tabel (kiri) + form tambah/edit paket (kanan) */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>

      {/* Tabel */}
      <div
        style={{
          background: C.white,
          borderRadius: '16px',
          border: `1.5px solid ${C.border}`,
          padding: '1.5rem',
          flex: '1 1 640px',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Filter */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <label style={labelStyle}>Cari</label>
            <input
              type="text"
              placeholder="Cari nama siswa, paket, atau mapel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle(false)}
            />
          </div>
          <div>
            <label style={labelStyle}>Kelas</label>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              style={{ ...inputStyle(false), cursor: 'pointer' }}
            >
              <option>Semua</option>
              <option>VII</option>
              <option>VIII</option>
              <option>IX</option>
              <option>X</option>
              <option>XI</option>
              <option>XII</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...inputStyle(false), cursor: 'pointer' }}
            >
              <option>Semua</option>
              <option>Aktif</option>
              <option>Akan Berakhir</option>
              <option>Berakhir</option>
              <option>Selesai</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Durasi</label>
            <select
              value={filterDurasi}
              onChange={(e) => setFilterDurasi(e.target.value)}
              style={{ ...inputStyle(false), cursor: 'pointer' }}
            >
              <option>Semua</option>
              {DURASI_OPTIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Pengajar</label>
            <select
              value={filterPengajar}
              onChange={(e) => setFilterPengajar(e.target.value)}
              style={{ ...inputStyle(false), cursor: 'pointer' }}
            >
              <option>Semua</option>
              {PENGAJAR_OPTIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div style={{ color: C.red, marginBottom: '1rem' }}>{error}</div>}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th
                  style={{
                    padding: '10px',
                    textAlign: 'left',
                    borderBottom: `1px solid ${C.border}`,
                    borderRadius: '8px 0 0 0',
                  }}
                >
                  No
                </th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kelas</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Paket</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Durasi</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jenis</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jumlah Pertemuan/Bulan</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                <th
                  style={{
                    padding: '10px',
                    textAlign: 'left',
                    borderBottom: `1px solid ${C.border}`,
                    borderRadius: '0 8px 0 0',
                  }}
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    Memuat data...
                  </td>
                </tr>
              )}
              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    {search || filterKelas !== 'Semua' || filterStatus !== 'Semua' || filterDurasi !== 'Semua' || filterPengajar !== 'Semua'
                      ? 'Tidak ada hasil'
                      : 'Belum ada paket siswa'}
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((item, idx) => {
                  const st = STATUS_META[item.status] || STATUS_META.Aktif;
                  const displayNumber = rangeStart + idx;
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px', color: C.gray }}>{displayNumber}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>
                        <div>{item.siswa_nama}</div>
                        <div style={{ fontSize: '0.7rem', color: C.grayLight }}>{item.siswa_id_display}</div>
                      </td>
                      <td style={{ padding: '10px' }}>{item.kelas_siswa}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>
                        <div>{item.paket}</div>
                        {item.is_harga_custom && (
                          <span
                            title={item.catatan_harga_custom || 'Harga khusus'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginTop: '3px',
                              marginRight: '4px',
                              background: C.redBg,
                              color: C.red,
                              padding: '1px 8px',
                              borderRadius: '999px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                            }}
                          >
                            💰 Harga Khusus
                          </span>
                        )}
                        {item.pengajar && item.pengajar !== '-' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginTop: '3px',
                              background: getPengajarMeta(item.pengajar).bg,
                              color: getPengajarMeta(item.pengajar).fg,
                              padding: '1px 8px',
                              borderRadius: '999px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                            }}
                          >
                            {getPengajarMeta(item.pengajar).icon} {item.pengajar}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>{item.durasi}</td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            background: C.blueBg,
                            color: C.blue,
                            padding: '2px 10px',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                        >
                          {item.jenis}
                          {item.jenis === 'Group' && item.jumlah_siswa_group ? ` (${item.jumlah_siswa_group} orang)` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        {item.total_pertemuan}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            background: st.bg,
                            color: st.fg,
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            title="Lihat detail"
                            onClick={() => setSelectedId(item.id)}
                            style={iconBtnStyle(C.blueBg, C.blue)}
                          >
                            &#128065;
                          </button>
                          <button
                            title="Edit"
                            onClick={() => handleEdit(item)}
                            style={iconBtnStyle(C.amberBg, C.amber)}
                          >
                            &#9998;
                          </button>
                          <button
                            title="Hapus"
                            onClick={() => handleDelete(item.id)}
                            style={iconBtnStyle(C.redBg, C.red)}
                          >
                            &#128465;
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1.1rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: C.gray }}>
            Menampilkan {rangeStart}-{rangeEnd} dari {filtered.length} data
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                ...iconBtnStyle(C.cream, C.dark),
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                opacity: safePage === 1 ? 0.5 : 1,
              }}
            >
              &#8249;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: p === safePage ? C.gold : C.cream,
                  color: p === safePage ? C.white : C.dark,
                  fontWeight: 600,
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                ...iconBtnStyle(C.cream, C.dark),
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                opacity: safePage === totalPages ? 0.5 : 1,
              }}
            >
              &#8250;
            </button>
          </div>
        </div>
      </div>

      {/* Form Tambah/Edit Paket Siswa (kolom kanan, selalu tampil) */}
      <div style={{ flex: '1 1 340px', minWidth: '300px', maxWidth: '400px', position: 'sticky', top: 0 }}>
        <FormTambahSiswa
          onSuccess={handleModalSuccess}
          onCancelEdit={handleModalClose}
          userRole={userRole}
          guruId={guruId}
          editingItem={editingItem}
        />
      </div>

      </div>

      {/* Detail Paket Siswa */}
      <div
        style={{
          background: D.bg,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
        }}
      >
        <div
          style={{
            padding: '1.1rem 1.5rem',
            background: D.bgSoft,
            borderBottom: `1px solid ${D.gold}`,
          }}
        >
          <span style={{ color: D.gold, fontWeight: 800, fontSize: '0.98rem' }}>DETAIL PAKET SISWA</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {!selectedItem ? (
            <div style={{ color: D.textFaint, textAlign: 'center', padding: '2rem 0' }}>
              Klik ikon &#128065; pada salah satu baris untuk melihat detail paket siswa di sini.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: D.text, fontSize: '1.1rem', fontWeight: 800 }}>
                    {selectedItem.siswa_nama}
                  </div>
                  <div style={{ color: D.textMuted, fontSize: '0.8rem' }}>
                    {selectedItem.siswa_id_display}
                  </div>
                </div>
                <div style={{ color: D.textMuted }}>{selectedItem.kelas_siswa}</div>
                <span
                  style={{
                    background: STATUS_META[selectedItem.status]?.bg,
                    color: STATUS_META[selectedItem.status]?.fg,
                    padding: '3px 14px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedItem.status}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1.5rem',
                  marginTop: '1.25rem',
                }}
              >
                <div>
                  <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '10px' }}>
                    Informasi Paket
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ color: D.textMuted }}>
                      Paket <span style={{ float: 'right', color: D.text }}>{selectedItem.paket}</span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Jenis <span style={{ float: 'right', color: D.text }}>
                        {selectedItem.jenis}
                        {selectedItem.jenis === 'Group' && selectedItem.jumlah_siswa_group ? ` (${selectedItem.jumlah_siswa_group} orang)` : ''}
                      </span>
                    </div>
                    <div style={{ color: D.textMuted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Tipe Pengajar</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: getPengajarMeta(selectedItem.pengajar).bg,
                          color: getPengajarMeta(selectedItem.pengajar).fg,
                          padding: '2px 12px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {getPengajarMeta(selectedItem.pengajar).icon} {selectedItem.pengajar || 'Belum diatur'}
                      </span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Jumlah Pertemuan/Bulan{' '}
                      <span style={{ float: 'right', color: D.gold, fontWeight: 700 }}>
                        {selectedItem.total_pertemuan}
                      </span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Tanggal Mulai{' '}
                      <span style={{ float: 'right', color: D.text }}>
                        {formatTanggal(selectedItem.tanggal_mulai)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '10px' }}>
                    Pembayaran
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ color: D.textMuted }}>
                      Total Harga{' '}
                      <span style={{ float: 'right', color: D.gold, fontWeight: 700, fontSize: '1rem' }}>
                        {formatRupiah(selectedItem.harga)}
                      </span>
                    </div>
                    {selectedItem.is_harga_custom && (
                      <div
                        style={{
                          background: 'rgba(224,87,79,0.12)',
                          border: `1px solid ${D.danger}`,
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '0.72rem',
                          color: D.text,
                        }}
                      >
                        ⚠️ Harga khusus, bukan dari pricelist standar
                        <span style={{ color: D.textMuted }}>
                          {' '}(pricelist: {formatRupiah(selectedItem.harga_dari_pricelist)})
                        </span>
                        {selectedItem.catatan_harga_custom && (
                          <div style={{ color: D.textMuted, marginTop: '3px' }}>
                            {selectedItem.catatan_harga_custom}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedItem.pricelist && (
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: `1px solid ${D.fieldBorder}`,
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', color: D.textFaint }}>Detail Pricelist:</div>
                        <div style={{ fontSize: '0.75rem', color: D.textMuted }}>
                          {selectedItem.pricelist.jumlah_pertemuan} &middot; {selectedItem.pricelist.durasi}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: `1px solid ${D.fieldBorder}`,
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <button
                  onClick={() => handleEdit(selectedItem)}
                  style={{
                    background: D.goldSoft,
                    border: `1px solid ${D.gold}`,
                    color: D.gold,
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  &#9998; Edit Paket
                </button>
                <button
                  onClick={() => setInvoiceItem(selectedItem)}
                  style={{
                    background: 'none',
                    border: `1px solid ${D.fieldBorder}`,
                    color: D.textMuted,
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  &#128176; Pembayaran
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {invoiceItem && (
        <InvoicePaketSiswa item={invoiceItem} onClose={() => setInvoiceItem(null)} />
      )}

    </div>
  );
};

export default PaketSiswa;