// src/components/admin/paketSiswa/FormTambahSiswa.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { checkedUpdate } from '../../../utils/supabaseUpdateGuard';
import { C } from '../../shared/Theme';
import { useFormOptions } from './use-form-options';
import { inputStyle, labelStyle, cardStyle, errorTextStyle } from './paket-siswa-styles';
import {
  extractJumlahPertemuan,
  formatPaketLabel,
  KELAS_OPTIONS,
  DURASI_OPTIONS,
  PENGAJAR_OPTIONS,
} from './paket-siswa-helpers';

const FormTambahSiswa = ({ onSuccess, onCancelEdit, userRole, guruId, editingItem, onError }) => {
  const isEditing = !!editingItem;

  const [loading, setLoading] = useState(false);
  const { siswaList, pricelistList, guruList } = useFormOptions(userRole);

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
        onError && onError('warning', 'Guru penanggung jawab belum ditentukan. Silakan pilih guru terlebih dahulu.');
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
        ? await checkedUpdate(supabase.from('paket_siswa').update(payload).eq('id', editingItem.id))
        : await supabase.from('paket_siswa').insert(payload);

      if (error) throw error;

      resetForm();
      onSuccess && onSuccess();
    } catch (err) {
      onError && onError('error', 'Gagal menyimpan: ' + err.message);
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

export default FormTambahSiswa;