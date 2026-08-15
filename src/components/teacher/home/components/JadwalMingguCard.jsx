import React from 'react';
import { C, HARI_LIST } from '../constants';
import { badgeForJenis, displayNamaSiswa } from '../utils/jadwal';
import { formatJam } from '../utils/format';
import { getCardStyle, linkBtn } from '../utils/styles';

export const JadwalMingguCard = ({ jadwalList, studentNameMap, loading, isMobile, onOpenFormFromCell, onOpenBlankForm }) => {
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

  return (
    <div style={{ ...getCardStyle(isMobile), gridRow: isMobile ? 'auto' : '1 / 3' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: C.dark, fontSize: isMobile ? '1.1rem' : '1.17rem' }}>Jadwal Mengajar Minggu Ini</h3>
      {loading ? (
        <p style={{ color: C.gray, fontSize: '0.9rem' }}>Memuat jadwal...</p>
      ) : slots.length === 0 ? (
        <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada jadwal tetap.</p>
      ) : isMobile ? (
        // ===== TAMPILAN MOBILE: URUTKAN BERDASARKAN HARI =====
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {HARI_LIST.map((hari) => {
            const daySlots = slots.filter((slot) => getCell(hari, slot));
            if (daySlots.length === 0) {
              return (
                <div key={hari} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '0.75rem', background: C.cream }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{hari}</div>
                  <div style={{ fontSize: '0.8rem', color: C.gray }}>Tidak ada jadwal</div>
                </div>
              );
            }
            return (
              <div key={hari} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.4rem' }}>{hari}</div>
                {daySlots.map((slot) => {
                  const cell = getCell(hari, slot);
                  const badge = badgeForJenis(cell.jenis);
                  const displayName = displayNamaSiswa(cell, studentNameMap);
                  return (
                    <div
                      key={slot.jam_mulai}
                      style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}`, fontSize: '0.85rem' }}
                    >
                      <span>
                        {formatJam(slot.jam_mulai)} - {formatJam(slot.jam_selesai)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'right' }}>
                        <span>{displayName}</span>
                        <span style={{ fontSize: '0.7rem', border: `1px solid ${badge.color}`, borderRadius: '4px', padding: '0 4px', color: badge.color }}>
                          {badge.letter}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        // ===== TAMPILAN TABEL DESKTOP =====
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
                    const displayName = displayNamaSiswa(cell, studentNameMap);
                    return (
                      <td
                        key={hari}
                        style={{ padding: '8px', textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => onOpenFormFromCell(cell.id)}
                        title="Klik untuk ajukan perubahan jadwal ini"
                      >
                        <div style={{ color: badge.color, fontWeight: 600, fontSize: '0.8rem' }}>
                          {displayName}
                          <span style={{ fontSize: '0.7rem', border: `1px solid ${badge.color}`, borderRadius: '4px', padding: '0 4px', marginLeft: '4px' }}>
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
      <button style={{ ...linkBtn, marginTop: '1rem', padding: '10px 16px', fontSize: isMobile ? '1rem' : '0.9rem' }} onClick={onOpenBlankForm}>
        + Ajukan Perubahan Jadwal
      </button>
    </div>
  );
};
