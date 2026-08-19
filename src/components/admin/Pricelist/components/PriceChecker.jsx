import React from 'react';
import { C, KELAS_OPTIONS, PROGRAM_OPTIONS, PERTEMUAN_OPTIONS, DURASI_OPTIONS, PENGAJAR_OPTIONS, STATUS_META } from '../constants';
import { inputStyle, labelStyle } from '../styles';
import { SISWA_OPTIONS } from '../hooks/usePriceChecker';

const formatRupiah = (n) =>
  n === null || n === undefined || n === '' ? '-' : 'Rp ' + Number(n).toLocaleString('id-ID');

const PriceChecker = ({
  kelas, setKelas,
  program, setProgram,
  pertemuan, setPertemuan,
  durasi, setDurasi,
  pengajar, setPengajar,
  siswaKey, setSiswaKey,
  matchedItem, selectedPrice, siswaOption,
}) => {
  const statusMeta = matchedItem ? STATUS_META[matchedItem.status] : null;

  return (
    <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Cek Harga</div>
      <div style={{ fontSize: '0.8rem', color: C.gray, marginBottom: '1rem' }}>
        Pilih kelas, program, waktu belajar, pengajar, dan jumlah siswa untuk langsung melihat harganya.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Kelas</label>
          <select value={kelas} onChange={(e) => setKelas(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
            {KELAS_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Program</label>
          <select value={program} onChange={(e) => setProgram(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
            {PROGRAM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Waktu Belajar</label>
          <select value={pertemuan} onChange={(e) => setPertemuan(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
            {PERTEMUAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Durasi</label>
          <select value={durasi} onChange={(e) => setDurasi(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
            {DURASI_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Pengajar</label>
          <select value={pengajar} onChange={(e) => setPengajar(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
            {PENGAJAR_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Jumlah siswa */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {SISWA_OPTIONS.map((s) => {
          const active = s.key === siswaKey;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSiswaKey(s.key)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                border: `1.5px solid ${active ? C.green : C.border}`,
                background: active ? C.greenBg : C.white,
                color: active ? C.green : C.gray,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Hasil */}
      {matchedItem ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: C.grayBg, borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: C.gray, marginBottom: '0.15rem' }}>{siswaOption.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{formatRupiah(selectedPrice)}</div>
          </div>
          {statusMeta && (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.65rem', borderRadius: '999px', background: statusMeta.bg, color: statusMeta.fg }}>
              {matchedItem.status}
            </span>
          )}
        </div>
      ) : (
        <div style={{ background: C.grayBg, borderRadius: '12px', padding: '1rem 1.25rem', fontSize: '0.85rem', color: C.gray }}>
          Belum ada data harga untuk kombinasi ini di pricelist.
        </div>
      )}
    </div>
  );
};

export default PriceChecker;
