import React from 'react';
import { C, HARI_LIST } from '../constants';
import { badgeForJenis } from '../utils/jadwal';
import { formatJam } from '../utils/format';
import { getCardStyle, linkBtn } from '../utils/styles';

export const JadwalMingguCard = ({ jadwalList, guruMap, loading, isMobile, onOpenFormFromCell, onOpenBlankForm }) => {
  const jadwalTetap = jadwalList.filter((j) => !j.is_temporary);
  const jadwalSementara = jadwalList.filter((j) => j.is_temporary);

  const slotSet = new Map();
  jadwalTetap.forEach((j) => {
    const key = `${j.jam_mulai}-${j.jam_selesai}`;
    if (!slotSet.has(key)) slotSet.set(key, { jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai });
  });
  const slots = Array.from(slotSet.values()).sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));
  const getCell = (hari, slot) =>
    jadwalTetap.find((j) => j.hari === hari && j.jam_mulai === slot.jam_mulai && j.jam_selesai === slot.jam_selesai);

  const cardStyle = getCardStyle(isMobile);

  return (
    <div style={{ ...cardStyle, gridRow: isMobile ? 'auto' : '1 / 3' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Jadwal Les Minggu Ini</h3>

      {loading ? (
        <p style={{ color: C.gray, fontSize: '0.9rem' }}>Memuat jadwal...</p>
      ) : slots.length === 0 ? (
        <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada jadwal les yang terdaftar.</p>
      ) : isMobile ? (
        <JadwalMobileView slots={slots} getCell={getCell} guruMap={guruMap} onOpenFormFromCell={onOpenFormFromCell} />
      ) : (
        <JadwalDesktopTable slots={slots} getCell={getCell} guruMap={guruMap} onOpenFormFromCell={onOpenFormFromCell} />
      )}

      {jadwalSementara.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>Perubahan Sementara</div>
          {jadwalSementara.map((j) => (
            <div key={j.id} style={{ fontSize: '0.8rem', color: C.gray, padding: '0.4rem 0', borderBottom: `1px solid ${C.border}` }}>
              {j.tanggal_temporary} - {j.kelas} ({formatJam(j.jam_mulai)}-{formatJam(j.jam_selesai)}) {j.alasan ? `- ${j.alasan}` : ''}
            </div>
          ))}
        </div>
      )}

      {jadwalList.length > 0 && (
        <button style={{ ...linkBtn, marginTop: '1rem' }} onClick={onOpenBlankForm}>
          + Ajukan Perubahan Jadwal
        </button>
      )}
    </div>
  );
};

// ── Tampilan kartu per hari (mobile) — lebih mudah dibaca & disentuh dibanding tabel 8 kolom ──
const JadwalMobileView = ({ slots, getCell, guruMap, onOpenFormFromCell }) => {
  const hariDenganJadwal = HARI_LIST.map((hari) => ({
    hari,
    entries: slots.map((slot) => ({ slot, cell: getCell(hari, slot) })).filter((x) => x.cell),
  })).filter((x) => x.entries.length > 0);

  if (hariDenganJadwal.length === 0) {
    return <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada jadwal les yang terdaftar.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {hariDenganJadwal.map(({ hari, entries }) => (
        <div key={hari}>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: C.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.4rem',
            }}
          >
            {hari}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {entries.map(({ slot, cell }) => {
              const badge = badgeForJenis(cell.jenis);
              return (
                <div
                  key={cell.id}
                  onClick={() => onOpenFormFromCell(cell.id)}
                  role="button"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.7rem 0.8rem',
                    borderRadius: '10px',
                    background: C.cream,
                    cursor: 'pointer',
                    minHeight: '44px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: C.dark, fontSize: '0.88rem' }}>
                      {formatJam(slot.jam_mulai)} - {formatJam(slot.jam_selesai)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: badge.color, fontWeight: 600, marginTop: '2px' }}>
                      {guruMap[cell.guru_id] || 'Guru'}
                      <span
                        style={{
                          fontSize: '0.68rem',
                          border: `1px solid ${badge.color}`,
                          borderRadius: '4px',
                          padding: '0 4px',
                          marginLeft: '4px',
                        }}
                      >
                        {badge.letter}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '1px' }}>{cell.kelas}</div>
                  </div>
                  <span style={{ color: C.grayLight, fontSize: '1rem', flexShrink: 0 }}>›</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const JadwalDesktopTable = ({ slots, getCell, guruMap, onOpenFormFromCell }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ background: C.cream }}>
          <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jam</th>
          {HARI_LIST.map((h) => (
            <th key={h} style={{ padding: '8px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {slots.map((slot, idx) => (
          <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: '8px', fontWeight: 600, color: C.dark, whiteSpace: 'nowrap' }}>
              {formatJam(slot.jam_mulai)} - {formatJam(slot.jam_selesai)}
            </td>
            {HARI_LIST.map((hari) => {
              const cell = getCell(hari, slot);
              if (!cell) return <td key={hari} style={{ padding: '8px' }} />;
              const badge = badgeForJenis(cell.jenis);
              return (
                <td
                  key={hari}
                  style={{ padding: '8px', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => onOpenFormFromCell(cell.id)}
                  title="Klik untuk ajukan perubahan jadwal ini"
                >
                  <div style={{ color: badge.color, fontWeight: 600, fontSize: '0.8rem' }}>
                    {guruMap[cell.guru_id] || 'Guru'}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        border: `1px solid ${badge.color}`,
                        borderRadius: '4px',
                        padding: '0 4px',
                        marginLeft: '4px',
                      }}
                    >
                      {badge.letter}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: C.gray }}>{cell.kelas}</div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
