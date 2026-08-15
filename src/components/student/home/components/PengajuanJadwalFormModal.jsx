import React from 'react';
import { C, HARI_LIST } from '../constants';
import { formatTanggalPanjang } from '../utils/format';
import { buttonBatal, buttonKirim, getModalContentStyle, modalOverlayStyle } from '../utils/styles';

export const PengajuanJadwalFormModal = ({
  show,
  isMobile,
  tanggalAsal,
  setTanggalAsal,
  hariAsal,
  selectedJadwalId,
  kandidatJadwal,
  getPihakLabel,
  applyJadwalSelection,
  formData,
  setFormData,
  submitting,
  onClose,
  onSubmit,
}) => {
  if (!show) return null;

  const fieldStyle = { width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, boxSizing: 'border-box', fontSize: isMobile ? '16px' : '1rem' };

  return (
    <div style={modalOverlayStyle}>
      <div style={getModalContentStyle(isMobile)}>
        <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Ajukan Perubahan Jadwal</h3>

        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>
          Jadwal yang Ingin Diubah
        </div>

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Tanggal Kelas</label>
        <input type="date" value={tanggalAsal} onChange={(e) => setTanggalAsal(e.target.value)} style={{ ...fieldStyle, marginBottom: '0.4rem' }} />
        {tanggalAsal && (
          <div style={{ fontSize: '0.8rem', color: C.gray, marginBottom: '0.75rem' }}>
            Hari: <strong style={{ color: C.dark }}>{hariAsal || '-'}</strong>
          </div>
        )}

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Guru yang Bersangkutan</label>
        <select
          value={selectedJadwalId}
          onChange={(e) => applyJadwalSelection(e.target.value)}
          disabled={!tanggalAsal}
          style={{ ...fieldStyle, marginBottom: '0.25rem', opacity: tanggalAsal ? 1 : 0.6 }}
        >
          <option value="">-- Pilih --</option>
          {kandidatJadwal.map((j) => (
            <option key={j.id} value={j.id}>
              {getPihakLabel(j)}
            </option>
          ))}
        </select>
        {tanggalAsal && kandidatJadwal.length === 0 && (
          <p style={{ fontSize: '0.78rem', color: C.gray, margin: '0.25rem 0 0.75rem 0' }}>Tidak ada jadwal pada tanggal/hari tersebut.</p>
        )}

        <div style={{ height: '1rem' }} />

        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>
          Jadwal Pengganti
        </div>

        <label style={{ fontSize: '0.85rem', color: C.gray }}>Hari Pengganti</label>
        <select value={formData.hari_baru} onChange={(e) => setFormData({ ...formData, hari_baru: e.target.value })} style={{ ...fieldStyle, marginBottom: '0.75rem' }}>
          <option value="">-- Pilih --</option>
          {HARI_LIST.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 130px' }}>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Jam Mulai</label>
            <input type="time" value={formData.jam_mulai_baru} onChange={(e) => setFormData({ ...formData, jam_mulai_baru: e.target.value })} style={fieldStyle} />
          </div>
          <div style={{ flex: '1 1 130px' }}>
            <label style={{ fontSize: '0.85rem', color: C.gray }}>Jam Selesai</label>
            <input type="time" value={formData.jam_selesai_baru} onChange={(e) => setFormData({ ...formData, jam_selesai_baru: e.target.value })} style={fieldStyle} />
          </div>
        </div>

        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>Sifat Pengajuan</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_temporary_baru: false })}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: isMobile ? '0.95rem' : '0.85rem',
              fontWeight: 600,
              border: `1px solid ${!formData.is_temporary_baru ? C.green : C.border}`,
              background: !formData.is_temporary_baru ? C.greenBg : 'transparent',
              color: !formData.is_temporary_baru ? C.green : C.gray,
            }}
          >
            Permanent
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_temporary_baru: true })}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: isMobile ? '0.95rem' : '0.85rem',
              fontWeight: 600,
              border: `1px solid ${formData.is_temporary_baru ? C.gold : C.border}`,
              background: formData.is_temporary_baru ? C.goldBg : 'transparent',
              color: formData.is_temporary_baru ? C.gold : C.gray,
            }}
          >
            Sementara
          </button>
        </div>

        {formData.is_temporary_baru && (
          <>
            <div style={{ fontSize: '0.78rem', color: C.gray, marginBottom: '0.5rem' }}>
              Berlaku khusus tanggal: <strong style={{ color: C.dark }}>{tanggalAsal ? formatTanggalPanjang(tanggalAsal) : '-'}</strong> (jadwal
              rutin minggu lain tidak berubah)
            </div>
            <label style={{ fontSize: '0.85rem', color: C.dark, fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Alasan (kenapa perubahan ini sementara) <span style={{ color: C.red }}>*</span>
            </label>
            <textarea
              value={formData.alasan}
              onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
              rows={3}
              placeholder="Contoh: Ada acara sekolah, berhalangan hadir, dll."
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '1rem',
                borderRadius: '10px',
                border: `1.5px solid ${C.gold}`,
                background: C.goldBg,
                resize: 'vertical',
                minHeight: '90px',
                boxSizing: 'border-box',
                fontSize: isMobile ? '16px' : '0.95rem',
                color: C.dark,
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onClose} style={buttonBatal}>
            Batal
          </button>
          <button onClick={onSubmit} disabled={submitting} style={{ ...buttonKirim, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>
    </div>
  );
};
