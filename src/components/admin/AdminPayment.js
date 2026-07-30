// src/components/admin/AdminPayment.js
//
// ============================================================
// SKEMA TABEL SUPABASE YANG DIBUTUHKAN (belum ada, buat dulu)
// ============================================================
// create table pembayaran (
//   id                  uuid primary key default gen_random_uuid(),
//   jenis               text not null check (jenis in ('siswa','gaji_guru','referral')),
//   tanggal             date not null,
//   nominal             numeric not null default 0,
//   metode              text,              -- Cash / Transfer Bank / E-Wallet / QRIS
//   status              text default 'Lunas', -- Lunas / Pending
//   keterangan          text,
//
//   -- khusus jenis = 'siswa' (uang MASUK dari pembayaran murid les)
//   paket_siswa_id      uuid references paket_siswa(id),
//   siswa_id            uuid references profiles(id),
//   guru_id             uuid references guru(id),   -- guru penanggung jawab paket (ikut tersimpan utk laporan)
//
//   -- khusus jenis = 'gaji_guru' (uang KELUAR, nominal input manual admin)
//   -- guru_id di atas dipakai juga untuk gaji_guru
//   periode             text,              -- contoh: '2026-07' (gaji bulan berapa)
//
//   -- khusus jenis = 'referral' (uang KELUAR, komisi ke siswa/orang yang mereferensikan)
//   nama_referral       text,              -- input manual, bukan relasi tabel
//   siswa_referral_id   uuid references profiles(id), -- opsional: siswa baru hasil referral tsb
//
//   created_at          timestamptz default now(),
//   created_by          uuid references profiles(id)
// );
//
// Disarankan index: create index idx_pembayaran_tanggal on pembayaran(tanggal);
//                    create index idx_pembayaran_jenis on pembayaran(jenis);
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';

// Palet terang (tabel & kartu ringkasan) -- disamakan dengan Pricelist.js / PaketSiswa.js
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

// Palet gelap untuk panel form input (konsisten dengan halaman lain)
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

// ============================================================
// KONSTANTA
// ============================================================
const JENIS_META = {
  siswa:      { label: 'Pembayaran Siswa', arah: 'masuk',  bg: C.greenBg, fg: C.green, icon: '💰' },
  gaji_guru:  { label: 'Gaji Guru',        arah: 'keluar', bg: C.blueBg,  fg: C.blue,  icon: '🎓' },
  referral:   { label: 'Biaya Referral',   arah: 'keluar', bg: C.amberBg, fg: C.amber, icon: '🤝' },
};

const METODE_OPTIONS = ['Cash', 'Transfer Bank', 'E-Wallet', 'QRIS'];
const STATUS_OPTIONS = ['Lunas', 'Pending'];
const STATUS_META = {
  Lunas:   { bg: C.greenBg, fg: C.green },
  Pending: { bg: C.amberBg, fg: C.amber },
};

const TABLE = 'pembayaran';
const PAGE_SIZE = 10;

const CSV_COLUMNS = [
  { key: 'tanggal', label: 'Tanggal' },
  { key: 'jenis_label', label: 'Jenis' },
  { key: 'pihak', label: 'Pihak Terkait' },
  { key: 'keterangan', label: 'Keterangan' },
  { key: 'metode', label: 'Metode/Periode' },
  { key: 'status', label: 'Status' },
  { key: 'nominal', label: 'Nominal' },
];

// ============================================================
// HELPER
// ============================================================
const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
};

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatTanggal = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  const bulan = BULAN_SINGKAT[parseInt(m, 10) - 1] || m;
  return `${d} ${bulan} ${y}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const currentPeriode = () => new Date().toISOString().slice(0, 7); // YYYY-MM

// Hitung nominal saran berdasarkan jenis paket (Private/Group) & jumlah siswa group,
// mengikuti kolom harga di tabel pricelist (harga_privat, harga_2siswa, dst).
const getHargaSaran = (paket) => {
  if (!paket || !paket.pricelist) return 0;
  const p = paket.pricelist;
  if (paket.jenis !== 'Group') return p.harga_privat || 0;
  const jumlah = paket.jumlah_siswa_group;
  if (jumlah === 2) return p.harga_2siswa ?? p.harga_privat ?? 0;
  if (jumlah === 3) return p.harga_3siswa ?? p.harga_privat ?? 0;
  if (jumlah === 4) return p.harga_4siswa ?? p.harga_privat ?? 0;
  return p.harga_privat || 0;
};

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: `1.5px solid ${hasError ? D.danger : D.fieldBorder}`,
  fontSize: '0.85rem',
  color: D.text,
  fontFamily: 'inherit',
  background: D.field,
  outline: 'none',
  boxSizing: 'border-box',
});

const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: D.textMuted,
  marginBottom: '6px',
};

const errorTextStyle = { color: D.danger, fontSize: '0.75rem', marginTop: '4px' };

const cardStyle = {
  background: C.white,
  borderRadius: '16px',
  border: `1.5px solid ${C.border}`,
  padding: '1.5rem',
  boxSizing: 'border-box',
};

const summaryCardStyle = {
  ...cardStyle,
  padding: '1.1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

// ============================================================
// FORM TAMBAH / EDIT TRANSAKSI
// ============================================================
const emptyForm = {
  jenis: 'siswa',
  tanggal: todayISO(),
  nominal: '',
  metode: 'Transfer Bank',
  status: 'Lunas',
  keterangan: '',
  paket_siswa_id: '',
  guru_id: '',
  periode: currentPeriode(),
  nama_referral: '',
  siswa_referral_id: '',
};

const FormPembayaran = ({ onSuccess, onCancelEdit, editingItem }) => {
  const isEditing = !!editingItem;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm);

  const [paketList, setPaketList] = useState([]);
  const [guruList, setGuruList] = useState([]);
  const [siswaList, setSiswaList] = useState([]);

  // Ambil daftar paket siswa aktif (untuk pencatatan pembayaran siswa)
  useEffect(() => {
    const fetchPaket = async () => {
      const { data, error } = await supabase
        .from('paket_siswa')
        .select(`
          id, jenis, jumlah_siswa_group, status, guru_id,
          siswa:profiles!paket_siswa_siswa_id_fkey (id, full_name, kelas),
          pricelist:pricelist!paket_siswa_pricelist_id_fkey (program, harga_privat, harga_2siswa, harga_3siswa, harga_4siswa)
        `)
        .neq('status', 'Selesai')
        .order('created_at', { ascending: false });
      if (!error) setPaketList(data || []);
    };
    fetchPaket();
  }, []);

  // Ambil daftar guru (untuk gaji guru)
  useEffect(() => {
    const fetchGuru = async () => {
      const { data, error } = await supabase.from('guru').select('id, nama').order('nama');
      if (!error) setGuruList(data || []);
    };
    fetchGuru();
  }, []);

  // Ambil daftar siswa (untuk siswa hasil referral, opsional)
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

  useEffect(() => {
    if (editingItem) {
      setForm({
        jenis: editingItem.jenis,
        tanggal: editingItem.tanggal || todayISO(),
        nominal: editingItem.nominal != null ? String(editingItem.nominal) : '',
        metode: editingItem.metode || 'Transfer Bank',
        status: editingItem.status || 'Lunas',
        keterangan: editingItem.keterangan || '',
        paket_siswa_id: editingItem.paket_siswa_id || '',
        guru_id: editingItem.guru_id || '',
        periode: editingItem.periode || currentPeriode(),
        nama_referral: editingItem.nama_referral || '',
        siswa_referral_id: editingItem.siswa_referral_id || '',
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [editingItem]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Saat memilih paket siswa, otomatis isi saran nominal berdasarkan pricelist
  const handlePilihPaket = (paketId) => {
    handleChange('paket_siswa_id', paketId);
    const paket = paketList.find((p) => String(p.id) === String(paketId));
    if (paket) {
      handleChange('nominal', String(getHargaSaran(paket)));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.tanggal) e.tanggal = 'Isi tanggal';
    if (!form.nominal || Number(form.nominal) <= 0) e.nominal = 'Isi nominal yang valid';

    if (form.jenis === 'siswa' && !form.paket_siswa_id) {
      e.paket_siswa_id = 'Pilih paket siswa';
    }
    if (form.jenis === 'gaji_guru' && !form.guru_id) {
      e.guru_id = 'Pilih guru';
    }
    if (form.jenis === 'referral' && !form.nama_referral.trim()) {
      e.nama_referral = 'Isi nama penerima referral';
    }
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        jenis: form.jenis,
        tanggal: form.tanggal,
        nominal: Number(form.nominal),
        metode: form.jenis !== 'gaji_guru' ? form.metode : null,
        status: form.status,
        keterangan: form.keterangan || null,
        paket_siswa_id: null,
        siswa_id: null,
        guru_id: null,
        periode: null,
        nama_referral: null,
        siswa_referral_id: null,
      };

      if (form.jenis === 'siswa') {
        const paket = paketList.find((p) => String(p.id) === String(form.paket_siswa_id));
        payload.paket_siswa_id = form.paket_siswa_id;
        payload.siswa_id = paket?.siswa?.id || null;
        payload.guru_id = paket?.guru_id || null;
      } else if (form.jenis === 'gaji_guru') {
        payload.guru_id = form.guru_id;
        payload.periode = form.periode;
      } else if (form.jenis === 'referral') {
        payload.nama_referral = form.nama_referral.trim();
        payload.siswa_referral_id = form.siswa_referral_id || null;
      }

      const { error } = isEditing
        ? await supabase.from(TABLE).update(payload).eq('id', editingItem.id)
        : await supabase.from(TABLE).insert(payload);

      if (error) throw error;

      setForm(emptyForm);
      onSuccess && onSuccess();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatal = () => {
    setForm(emptyForm);
    setErrors({});
    onCancelEdit && onCancelEdit();
  };

  return (
    <div style={{ background: D.bg, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.28)' }}>
      <div style={{ padding: '1.1rem 1.5rem', background: D.bgSoft, borderBottom: `1px solid ${D.gold}` }}>
        <span style={{ color: D.gold, fontWeight: 800, fontSize: '0.98rem' }}>
          {isEditing ? 'EDIT TRANSAKSI' : 'CATAT TRANSAKSI BARU'}
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Tab jenis transaksi */}
        <div>
          <label style={labelStyle}>Jenis Transaksi</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {Object.entries(JENIS_META).map(([key, meta]) => (
              <button
                type="button"
                key={key}
                disabled={isEditing}
                onClick={() => handleChange('jenis', key)}
                style={{
                  padding: '10px 6px',
                  borderRadius: '10px',
                  border: form.jenis === key ? `1.5px solid ${D.gold}` : `1.5px solid ${D.fieldBorder}`,
                  background: form.jenis === key ? D.goldSoft : D.field,
                  color: form.jenis === key ? D.gold : D.textMuted,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: isEditing ? 'not-allowed' : 'pointer',
                  opacity: isEditing && form.jenis !== key ? 0.4 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {meta.icon} {meta.label}
              </button>
            ))}
          </div>
          {isEditing && (
            <div style={{ fontSize: '0.7rem', color: D.textFaint, marginTop: '6px' }}>
              Jenis transaksi tidak bisa diubah saat edit. Hapus dan catat ulang bila perlu ganti jenis.
            </div>
          )}
        </div>

        {/* Field khusus: Pembayaran Siswa */}
        {form.jenis === 'siswa' && (
          <div>
            <label style={labelStyle}>Paket Siswa</label>
            <select
              value={form.paket_siswa_id}
              onChange={(e) => handlePilihPaket(e.target.value)}
              style={inputStyle(!!errors.paket_siswa_id)}
            >
              <option value="">Pilih siswa & paket</option>
              {paketList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.siswa?.full_name || 'Tidak diketahui'} — {p.pricelist?.program || 'Paket'} ({p.jenis}
                  {p.jenis === 'Group' && p.jumlah_siswa_group ? ` ${p.jumlah_siswa_group} org` : ''})
                </option>
              ))}
            </select>
            {errors.paket_siswa_id && <div style={errorTextStyle}>{errors.paket_siswa_id}</div>}
            <div style={{ fontSize: '0.7rem', color: D.textFaint, marginTop: '4px' }}>
              Nominal otomatis terisi dari harga pricelist paket ini, tapi bisa diubah manual di bawah.
            </div>
          </div>
        )}

        {/* Field khusus: Gaji Guru */}
        {form.jenis === 'gaji_guru' && (
          <>
            <div>
              <label style={labelStyle}>Guru</label>
              <select
                value={form.guru_id}
                onChange={(e) => handleChange('guru_id', e.target.value)}
                style={inputStyle(!!errors.guru_id)}
              >
                <option value="">Pilih guru</option>
                {guruList.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
              {errors.guru_id && <div style={errorTextStyle}>{errors.guru_id}</div>}
            </div>
            <div>
              <label style={labelStyle}>Periode Gaji</label>
              <input
                type="month"
                value={form.periode}
                onChange={(e) => handleChange('periode', e.target.value)}
                style={inputStyle(false)}
              />
            </div>
          </>
        )}

        {/* Field khusus: Referral */}
        {form.jenis === 'referral' && (
          <>
            <div>
              <label style={labelStyle}>Nama Penerima Referral</label>
              <input
                type="text"
                placeholder="Nama siswa/orang yang mereferensikan"
                value={form.nama_referral}
                onChange={(e) => handleChange('nama_referral', e.target.value)}
                style={inputStyle(!!errors.nama_referral)}
              />
              {errors.nama_referral && <div style={errorTextStyle}>{errors.nama_referral}</div>}
            </div>
            <div>
              <label style={labelStyle}>Siswa Baru Hasil Referral (opsional)</label>
              <select
                value={form.siswa_referral_id}
                onChange={(e) => handleChange('siswa_referral_id', e.target.value)}
                style={inputStyle(false)}
              >
                <option value="">Tidak dipilih</option>
                {siswaList.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} - {s.kelas || '-'}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Field umum */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Tanggal</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => handleChange('tanggal', e.target.value)}
              style={inputStyle(!!errors.tanggal)}
            />
            {errors.tanggal && <div style={errorTextStyle}>{errors.tanggal}</div>}
          </div>
          <div>
            <label style={labelStyle}>Nominal (Rp)</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={form.nominal}
              onChange={(e) => handleChange('nominal', e.target.value)}
              style={inputStyle(!!errors.nominal)}
            />
            {errors.nominal && <div style={errorTextStyle}>{errors.nominal}</div>}
          </div>
        </div>

        {form.jenis !== 'gaji_guru' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Metode Pembayaran</label>
              <select
                value={form.metode}
                onChange={(e) => handleChange('metode', e.target.value)}
                style={inputStyle(false)}
              >
                {METODE_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                style={inputStyle(false)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              style={inputStyle(false)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div style={{ fontSize: '0.7rem', color: D.textFaint, marginTop: '4px' }}>
              Pilih Pending kalau gaji belum dicairkan, atau Lunas kalau sudah dibayarkan ke guru.
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Keterangan (opsional)</label>
          <textarea
            rows={2}
            placeholder="Catatan tambahan..."
            value={form.keterangan}
            onChange={(e) => handleChange('keterangan', e.target.value)}
            style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.25rem' }}>
          {isEditing && (
            <button
              type="button"
              onClick={handleBatal}
              style={{ padding: '9px 20px', borderRadius: '8px', border: `1.5px solid ${D.fieldBorder}`, background: 'transparent', color: D.textMuted, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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
              background: D.gold,
              color: '#241d0d',
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit',
              flex: isEditing ? 'initial' : 1,
            }}
          >
            {loading ? 'Menyimpan...' : isEditing ? 'Update Transaksi' : 'Simpan Transaksi'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================
// KOMPONEN UTAMA
// ============================================================
const AdminPayment = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('semua');
  const [dariBulan, setDariBulan] = useState('');   // format YYYY-MM (dari <input type="month">)
  const [sampaiBulan, setSampaiBulan] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from(TABLE)
        .select(`
          *,
          siswa:profiles!pembayaran_siswa_id_fkey (full_name),
          guru:guru!pembayaran_guru_id_fkey (nama),
          siswa_referral:profiles!pembayaran_siswa_referral_id_fkey (full_name)
        `)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const processed = (data || []).map((item) => {
        let pihak = '-';
        if (item.jenis === 'siswa') pihak = item.siswa?.full_name || 'Siswa tidak diketahui';
        else if (item.jenis === 'gaji_guru') pihak = item.guru?.nama || 'Guru tidak diketahui';
        else if (item.jenis === 'referral') pihak = item.nama_referral || '-';

        return {
          ...item,
          jenis_label: JENIS_META[item.jenis]?.label || item.jenis,
          pihak,
        };
      });

      setList(processed);
    } catch (err) {
      console.error('Error loading pembayaran:', err);
      setError('Gagal memuat data pembayaran: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return list.filter((item) => {
      if (filterJenis !== 'semua' && item.jenis !== filterJenis) return false;
      if (dariBulan && item.tanggal.slice(0, 7) < dariBulan) return false;
      if (sampaiBulan && item.tanggal.slice(0, 7) > sampaiBulan) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match =
          (item.pihak || '').toLowerCase().includes(q) ||
          (item.keterangan || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [list, filterJenis, dariBulan, sampaiBulan, search]);

  // Ringkasan dihitung dari data yang sudah difilter (mengikuti rentang tanggal aktif).
  // Saldo Bersih hanya menghitung transaksi berstatus Lunas -- transaksi Pending
  // belum dianggap uang yang benar-benar sudah masuk/keluar.
  const summary = useMemo(() => {
    let masuk = 0, gaji = 0, referral = 0;
    let masukLunas = 0, gajiLunas = 0, referralLunas = 0;
    filtered.forEach((item) => {
      const n = Number(item.nominal) || 0;
      const isLunas = item.status !== 'Pending';
      if (item.jenis === 'siswa') {
        masuk += n;
        if (isLunas) masukLunas += n;
      } else if (item.jenis === 'gaji_guru') {
        gaji += n;
        if (isLunas) gajiLunas += n;
      } else if (item.jenis === 'referral') {
        referral += n;
        if (isLunas) referralLunas += n;
      }
    });
    return { masuk, gaji, referral, gajiLunas, referralLunas, saldo: masukLunas - gajiLunas - referralLunas };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterJenis, dariBulan, sampaiBulan]);

  const handleEdit = (item) => {
    setEditingItem(item);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleModalSuccess = () => {
    setEditingItem(null);
    setToast({ type: 'success', message: editingItem ? 'Transaksi berhasil diperbarui.' : 'Transaksi berhasil dicatat.' });
    loadData();
  };

  const handleDelete = async (item) => {
    setBusyId(item.id);
    const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', item.id);
    setBusyId(null);
    setConfirmDelete(null);

    if (deleteError) {
      setToast({ type: 'error', message: 'Gagal menghapus transaksi.' });
      return;
    }
    setList((prev) => prev.filter((i) => i.id !== item.id));
    setToast({ type: 'success', message: 'Transaksi berhasil dihapus.' });
  };

  const handleExport = () => {
    const rows = filtered.map((item) => ({
      tanggal: item.tanggal,
      jenis_label: item.jenis_label,
      pihak: item.pihak,
      keterangan: item.keterangan || '',
      metode: item.jenis === 'gaji_guru' ? (item.periode || '') : (item.metode || ''),
      status: item.status || '',
      nominal: item.nominal,
    }));
    const header = CSV_COLUMNS.map((c) => c.label);
    const body = rows.map((row) => CSV_COLUMNS.map((c) => row[c.key] ?? ''));
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws['!cols'] = CSV_COLUMNS.map((c) => ({ wch: Math.max(14, c.label.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pembayaran');
    XLSX.writeFile(wb, `pembayaran_${todayISO()}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'inherit' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 300,
            padding: '12px 20px', borderRadius: '10px',
            background: toast.type === 'success' ? C.greenBg : C.redBg,
            color: toast.type === 'success' ? C.green : C.red,
            fontWeight: 600, fontSize: '0.85rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, color: C.dark }}>Pembayaran</h2>
        <button
          onClick={handleExport}
          style={{
            padding: '9px 18px', borderRadius: '10px', border: `1.5px solid ${C.gold}`,
            background: C.white, color: C.goldDark, fontSize: '0.82rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          &#128190; Export Excel
        </button>
      </div>

      {/* Kartu Ringkasan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={summaryCardStyle}>
          <span style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 600 }}>Total Pemasukan Siswa</span>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: C.green }}>{formatRupiah(summary.masuk)}</span>
        </div>
        <div style={summaryCardStyle}>
          <span style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 600 }}>Total Gaji Guru</span>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: C.blue }}>{formatRupiah(summary.gajiLunas)}</span>
          <span style={{ fontSize: '0.68rem', color: C.gray }}>Hanya transaksi Lunas</span>
        </div>
        <div style={summaryCardStyle}>
          <span style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 600 }}>Total Biaya Referral</span>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: C.amber }}>{formatRupiah(summary.referralLunas)}</span>
          <span style={{ fontSize: '0.68rem', color: C.gray }}>Hanya transaksi Lunas</span>
        </div>
        <div style={{ ...summaryCardStyle, background: summary.saldo >= 0 ? C.greenBg : C.redBg, border: 'none' }}>
          <span style={{ fontSize: '0.75rem', color: C.dark, fontWeight: 600 }}>Saldo Bersih</span>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: summary.saldo >= 0 ? C.green : C.red }}>
            {formatRupiah(summary.saldo)}
          </span>
          <span style={{ fontSize: '0.68rem', color: C.gray }}>Hanya transaksi Lunas</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Tabel & Filter */}
        <div style={{ flex: '2 1 560px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...cardStyle, padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Cari nama / keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: '1 1 200px', padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
              />
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              >
                <option value="semua">Semua Jenis</option>
                {Object.entries(JENIS_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
              <input
                type="month"
                value={dariBulan}
                onChange={(e) => setDariBulan(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }}
              />
              <input
                type="month"
                value={sampaiBulan}
                onChange={(e) => setSampaiBulan(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.gray }}>Memuat data...</div>
            ) : error ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.red }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Belum ada transaksi tercatat.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: C.cream, textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', color: C.gray, fontSize: '0.72rem' }}>Tanggal</th>
                      <th style={{ padding: '10px 14px', color: C.gray, fontSize: '0.72rem' }}>Jenis</th>
                      <th style={{ padding: '10px 14px', color: C.gray, fontSize: '0.72rem' }}>Pihak Terkait</th>
                      <th style={{ padding: '10px 14px', color: C.gray, fontSize: '0.72rem' }}>Nominal</th>
                      <th style={{ padding: '10px 14px', color: C.gray, fontSize: '0.72rem' }}>Status</th>
                      <th style={{ padding: '10px 14px', color: C.gray, fontSize: '0.72rem' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => {
                      const meta = JENIS_META[item.jenis] || {};
                      const isBusy = busyId === item.id;
                      return (
                        <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: '10px 14px', color: C.dark }}>{formatTanggal(item.tanggal)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ background: meta.bg, color: meta.fg, padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {meta.icon} {meta.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: C.dark }}>
                            {item.pihak}
                            {item.keterangan && (
                              <div style={{ fontSize: '0.72rem', color: C.grayLight, marginTop: '2px' }}>{item.keterangan}</div>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: meta.arah === 'masuk' ? C.green : C.red, whiteSpace: 'nowrap' }}>
                            {meta.arah === 'masuk' ? '+' : '-'} {formatRupiah(item.nominal)}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {item.status ? (
                              <span style={{ background: STATUS_META[item.status]?.bg, color: STATUS_META[item.status]?.fg, padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
                                {item.status}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <button
                              disabled={isBusy}
                              onClick={() => handleEdit(item)}
                              style={{ marginRight: '8px', padding: '5px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.white, color: C.gray, fontSize: '0.75rem', fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                            >
                              Edit
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => setConfirmDelete(item)}
                              style={{ padding: '5px 10px', borderRadius: '8px', border: `1.5px solid ${C.red}`, background: C.white, color: C.red, fontSize: '0.75rem', fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '0.78rem', color: C.gray }}>
                  Menampilkan {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length} transaksi
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    disabled={safePage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '5px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.white, cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.5 : 1 }}
                  >
                    &#8249;
                  </button>
                  <span style={{ fontSize: '0.78rem', color: C.gray, alignSelf: 'center' }}>{safePage} / {totalPages}</span>
                  <button
                    disabled={safePage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    style={{ padding: '5px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.white, cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.5 : 1 }}
                  >
                    &#8250;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Tambah/Edit (kolom kanan, sticky) */}
        <div style={{ flex: '1 1 340px', minWidth: '300px', maxWidth: '400px', position: 'sticky', top: 0 }}>
          <FormPembayaran
            onSuccess={handleModalSuccess}
            onCancelEdit={() => setEditingItem(null)}
            editingItem={editingItem}
          />
        </div>
      </div>

      {/* Modal konfirmasi hapus */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: C.white, borderRadius: '18px', padding: '1.75rem', maxWidth: '400px', width: '100%', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: C.dark, fontWeight: 'bold' }}>
              Hapus transaksi ini?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: C.gray, lineHeight: 1.6 }}>
              Transaksi <strong>{confirmDelete.pihak}</strong> sebesar <strong>{formatRupiah(confirmDelete.nominal)}</strong> pada {formatTanggal(confirmDelete.tanggal)} akan dihapus permanen.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ padding: '9px 18px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: C.red, color: C.white, fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayment;