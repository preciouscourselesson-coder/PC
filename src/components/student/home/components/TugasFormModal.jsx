import React from 'react';
import { C, MAPEL_TUGAS_LIST } from '../constants';
import { buttonBatal, buttonKirim, getModalContentStyle, modalOverlayStyle } from '../utils/styles';

export const TugasFormModal = ({
  show,
  isMobile,
  editingTugasId,
  tugasForm,
  setTugasForm,
  guruOptions,
  catatanGambarFile,
  catatanGambarPreview,
  onCatatanGambarChange,
  onRemoveCatatanGambar,
  submittingTugas,
  onClose,
  onSubmit,
}) => {
  if (!show) return null;

  const fieldStyle = { padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '0.5rem', width: '100%', boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' };

  return (
    <div style={modalOverlayStyle}>
      <div style={getModalContentStyle(isMobile)}>
        <h3 style={{ margin: '0 0 0.25rem 0', color: C.dark }}>{editingTugasId ? 'Edit Penilaian/Tugas' : 'Tambah Penilaian/Tugas'}</h3>
        <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: 0 }}>
          {editingTugasId ? 'Ubah jika ada perubahan jadwal atau info dari guru.' : 'Catat sendiri tugas/ulangan yang sudah diberitahu guru.'}
        </p>

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Guru Les</label>
        <select value={tugasForm.guruId} onChange={(e) => setTugasForm({ ...tugasForm, guruId: e.target.value })} style={{ ...fieldStyle, marginBottom: '0.25rem' }}>
          <option value="">-- Pilih Guru Les --</option>
          {guruOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nama}
            </option>
          ))}
        </select>
        <p style={{ fontSize: '0.72rem', color: C.grayLight, marginTop: 0, marginBottom: '0.5rem' }}>Info ini akan ditampilkan ke dashboard guru les yang dipilih.</p>

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Mapel</label>
        <select value={tugasForm.mapel} onChange={(e) => setTugasForm({ ...tugasForm, mapel: e.target.value })} style={fieldStyle}>
          <option value="">-- Pilih Mapel --</option>
          {MAPEL_TUGAS_LIST.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Nama Guru Pengajar di Sekolah</label>
        <input
          type="text"
          placeholder="Contoh: Bpk. Andi Wijaya"
          value={tugasForm.namaGuruSekolah}
          onChange={(e) => setTugasForm({ ...tugasForm, namaGuruSekolah: e.target.value })}
          style={{ ...fieldStyle, marginBottom: '0.25rem' }}
        />
        <p style={{ fontSize: '0.72rem', color: C.grayLight, marginTop: 0, marginBottom: '0.5rem' }}>Ini cuma catatan teks -- guru sekolah tidak punya akun di sistem ini.</p>

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Judul Bab</label>
        <input
          type="text"
          placeholder="Contoh: Bab 3 - Integral"
          value={tugasForm.judulBab}
          onChange={(e) => setTugasForm({ ...tugasForm, judulBab: e.target.value })}
          style={fieldStyle}
        />

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Tanggal</label>
        <input type="date" value={tugasForm.tanggal} onChange={(e) => setTugasForm({ ...tugasForm, tanggal: e.target.value })} style={fieldStyle} />

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Catatan (opsional)</label>
        <div style={{ marginBottom: '0.25rem' }}>
          <input
            type="text"
            placeholder="Link materi ujian (opsional) - https://..."
            value={tugasForm.catatanLink}
            onChange={(e) => setTugasForm({ ...tugasForm, catatanLink: e.target.value })}
            style={fieldStyle}
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label
            htmlFor="catatan-gambar-input"
            style={{ display: 'inline-block', padding: '8px 14px', borderRadius: '8px', border: `1px dashed ${C.border}`, color: C.gray, fontSize: '0.85rem', cursor: 'pointer', background: C.cream }}
          >
            {catatanGambarFile ? 'Ganti Gambar Catatan' : 'Upload Gambar Catatan (opsional)'}
          </label>
          <input id="catatan-gambar-input" type="file" accept="image/*" onChange={onCatatanGambarChange} style={{ display: 'none' }} />
          {catatanGambarPreview && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img
                src={catatanGambarPreview}
                alt="Preview catatan"
                style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${C.border}` }}
              />
              <button type="button" onClick={onRemoveCatatanGambar} style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                Hapus Gambar
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={buttonBatal}>
            Batal
          </button>
          <button onClick={onSubmit} disabled={submittingTugas} style={{ ...buttonKirim, opacity: submittingTugas ? 0.6 : 1 }}>
            {submittingTugas ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};
