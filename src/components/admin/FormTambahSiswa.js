// src/components/admin/FormTambahSiswa.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const FormTambahSiswa = ({ isOpen, onClose, onSuccess, userRole, guruId }) => {
  const [loading, setLoading] = useState(false);
  const [siswaList, setSiswaList] = useState([]);
  const [pricelistList, setPricelistList] = useState([]);
  const [form, setForm] = useState({
    siswa_id: '',
    pricelist_id: '',
    tanggal_mulai: '',
    tanggal_berakhir: '',
    total_pertemuan: '',
    sisa_pertemuan: '',
    status: 'Aktif',
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
        .select('id, program, kelas, jumlah_pertemuan, durasi, pengajar, harga_privat')
        .eq('status', 'Aktif')
        .order('program');
      if (!error) setPricelistList(data || []);
    };
    fetchPricelist();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Hapus error untuk field yang diubah
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.siswa_id) newErrors.siswa_id = 'Pilih siswa';
    if (!form.pricelist_id) newErrors.pricelist_id = 'Pilih paket';
    if (!form.tanggal_mulai) newErrors.tanggal_mulai = 'Isi tanggal mulai';
    if (!form.total_pertemuan || Number(form.total_pertemuan) <= 0) newErrors.total_pertemuan = 'Isi total pertemuan';
    if (!form.sisa_pertemuan || Number(form.sisa_pertemuan) < 0) newErrors.sisa_pertemuan = 'Isi sisa pertemuan';
    if (Number(form.sisa_pertemuan) > Number(form.total_pertemuan)) newErrors.sisa_pertemuan = 'Sisa pertemuan tidak boleh melebihi total';
    return newErrors;
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
      // Tentukan guru_id
      let guru_id = guruId;
      if (userRole === 'admin' && !guru_id) {
        // Untuk admin, kita bisa buat pilihan guru di form nanti,
        // untuk sekarang kita lewati dengan error.
        alert('Untuk admin, fitur pilih guru belum diimplementasikan. Gunakan sebagai guru atau tambahkan dulu.');
        setLoading(false);
        return;
      }

      const payload = {
        siswa_id: form.siswa_id,
        guru_id: guru_id,
        pricelist_id: form.pricelist_id,
        tanggal_mulai: form.tanggal_mulai,
        tanggal_berakhir: form.tanggal_berakhir || null,
        total_pertemuan: Number(form.total_pertemuan),
        sisa_pertemuan: Number(form.sisa_pertemuan),
        status: form.status,
      };

      const { error } = await supabase
        .from('paket_siswa')
        .insert(payload);

      if (error) throw error;

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0, color: '#171411' }}>Tambah Siswa ke Paket</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#726d66' }}>Siswa</label>
            <select
              name="siswa_id"
              value={form.siswa_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${errors.siswa_id ? '#b0413e' : '#e6e2d8'}` }}
            >
              <option value="">Pilih siswa</option>
              {siswaList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name} - {s.kelas || '-'}</option>
              ))}
            </select>
            {errors.siswa_id && <div style={{ color: '#b0413e', fontSize: '0.75rem', marginTop: '4px' }}>{errors.siswa_id}</div>}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#726d66' }}>Paket</label>
            <select
              name="pricelist_id"
              value={form.pricelist_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${errors.pricelist_id ? '#b0413e' : '#e6e2d8'}` }}
            >
              <option value="">Pilih paket</option>
              {pricelistList.map(p => (
                <option key={p.id} value={p.id}>{p.program} - {p.kelas} - {p.jumlah_pertemuan}</option>
              ))}
            </select>
            {errors.pricelist_id && <div style={{ color: '#b0413e', fontSize: '0.75rem', marginTop: '4px' }}>{errors.pricelist_id}</div>}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#726d66' }}>Tanggal Mulai</label>
            <input
              type="date"
              name="tanggal_mulai"
              value={form.tanggal_mulai}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${errors.tanggal_mulai ? '#b0413e' : '#e6e2d8'}` }}
            />
            {errors.tanggal_mulai && <div style={{ color: '#b0413e', fontSize: '0.75rem', marginTop: '4px' }}>{errors.tanggal_mulai}</div>}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#726d66' }}>Tanggal Berakhir (opsional)</label>
            <input
              type="date"
              name="tanggal_berakhir"
              value={form.tanggal_berakhir}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${errors.tanggal_berakhir ? '#b0413e' : '#e6e2d8'}` }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#726d66' }}>Total Pertemuan</label>
              <input
                type="number"
                min="0"
                name="total_pertemuan"
                value={form.total_pertemuan}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${errors.total_pertemuan ? '#b0413e' : '#e6e2d8'}` }}
              />
              {errors.total_pertemuan && <div style={{ color: '#b0413e', fontSize: '0.75rem', marginTop: '4px' }}>{errors.total_pertemuan}</div>}
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#726d66' }}>Sisa Pertemuan</label>
              <input
                type="number"
                min="0"
                name="sisa_pertemuan"
                value={form.sisa_pertemuan}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${errors.sisa_pertemuan ? '#b0413e' : '#e6e2d8'}` }}
              />
              {errors.sisa_pertemuan && <div style={{ color: '#b0413e', fontSize: '0.75rem', marginTop: '4px' }}>{errors.sisa_pertemuan}</div>}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#726d66' }}>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${errors.status ? '#b0413e' : '#e6e2d8'}` }}
            >
              <option value="Aktif">Aktif</option>
              <option value="Akan Berakhir">Akan Berakhir</option>
              <option value="Berakhir">Berakhir</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 20px', borderRadius: '8px', border: '1.5px solid #e6e2d8', background: 'transparent', cursor: 'pointer' }}>Batal</button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#b4964b',
                color: '#fff',
                fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormTambahSiswa;