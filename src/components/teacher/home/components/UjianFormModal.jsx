import React from 'react';
import { C } from '../constants';
import { getModalOverlayStyle, getModalContentStyle, getButtonBatal, getButtonKirim } from '../utils/styles';

export const UjianFormModal = ({ show, isMobile, ujianForm, setUjianForm, mapelOptions, ujianBabOptions, loadUjianBab, submittingUjian, onClose, onSubmit }) => {
  if (!show) return null;
  const buttonBatal = getButtonBatal(isMobile);
  const buttonKirim = getButtonKirim(isMobile);

  return (
    <div style={getModalOverlayStyle(isMobile)}>
      <div style={getModalContentStyle(isMobile)}>
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
          {mapelOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nama}
            </option>
          ))}
        </select>

        <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Bab</label>
        <select
          value={ujianForm.bab_id}
          onChange={(e) => setUjianForm({ ...ujianForm, bab_id: e.target.value })}
          style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
          disabled={!ujianForm.mapel_id}
        >
          <option value="">-- Pilih Bab --</option>
          {ujianBabOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nama}
            </option>
          ))}
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
          <button onClick={onClose} style={buttonBatal}>
            Batal
          </button>
          <button onClick={onSubmit} disabled={submittingUjian} style={{ ...buttonKirim, opacity: submittingUjian ? 0.6 : 1 }}>
            {submittingUjian ? 'Mengirim...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};
