// src/components/admin/adminHome/WeeklyScheduleTable.js
import React, { useMemo } from 'react';
import { C } from '../../shared/Theme';
import { HARI_LIST } from './admin-home-constants';
import { getTeacherName, getStudentNames } from './admin-home-helpers';

const getCellStyle = (jenis) => {
  if (jenis === 'Private') return { background: C.greenBg, color: C.green };
  if (jenis === 'Group') return { background: C.goldBg, color: C.gold };
  return { background: 'transparent' };
};

const WeeklyScheduleTable = ({ schedules, teachers, students, filterType, onDelete }) => {
  const timeSlots = useMemo(() => {
    const set = new Set();
    schedules.forEach((s) => set.add(`${s.jam_mulai}-${s.jam_selesai}`));
    return Array.from(set)
      .map((str) => {
        const [start, end] = str.split('-');
        return { start, end, key: str };
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [schedules]);

  const scheduleByDay = useMemo(() => {
    const map = {};
    HARI_LIST.forEach((h) => (map[h] = {}));
    schedules.forEach((s) => {
      const key = `${s.jam_mulai}-${s.jam_selesai}`;
      if (!map[s.hari]) map[s.hari] = {};
      map[s.hari][key] = s;
    });
    return map;
  }, [schedules]);

  if (schedules.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: '1rem' }}>Tidak ada jadwal untuk filter ini.</p>;
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ background: C.cream }}>
            <th style={{ padding: '6px 8px', border: `1px solid ${C.border}`, textAlign: 'center' }}>Jam</th>
            {HARI_LIST.map((h) => (
              <th key={h} style={{ padding: '6px 8px', border: `1px solid ${C.border}`, textAlign: 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(({ start, end, key }) => (
            <tr key={key} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 8px', border: `1px solid ${C.border}`, textAlign: 'center', fontWeight: '600' }}>
                {start} - {end}
              </td>
              {HARI_LIST.map((day) => {
                const s = scheduleByDay[day]?.[key];
                return (
                  <td
                    key={day}
                    style={{
                      padding: '6px 8px',
                      border: `1px solid ${C.border}`,
                      textAlign: 'center',
                      position: 'relative',
                      ...getCellStyle(s?.jenis),
                    }}
                  >
                    {s ? (
                      <>
                        {onDelete && (
                          <button
                            onClick={() => onDelete(s.id)}
                            title="Hapus jadwal ini"
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              width: '16px',
                              height: '16px',
                              lineHeight: '14px',
                              padding: 0,
                              borderRadius: '50%',
                              border: 'none',
                              background: C.red,
                              color: 'white',
                              fontSize: '0.65rem',
                              cursor: 'pointer',
                            }}
                          >
                            ×
                          </button>
                        )}
                        <div style={{ fontWeight: '500' }}>
                          {filterType === 'siswa' && (
                            <div style={{ fontSize: '0.7rem', color: C.gray, fontWeight: 'normal' }}>
                              {getTeacherName(teachers, s.guru_id)}
                            </div>
                          )}
                          {s.jenis === 'Group' && s.kelas ? (
                            <span style={{ fontWeight: 'bold' }}>{s.kelas}</span>
                          ) : (
                            getStudentNames(students, s.siswa_ids)
                          )}
                          <span style={{ fontSize: '0.65rem', marginLeft: '4px', fontWeight: 'bold' }}>
                            {s.jenis === 'Private' ? 'P' : 'G'}
                          </span>
                        </div>
                        {s.jenis === 'Group' && (
                          <div style={{ fontSize: '0.65rem', color: C.gray }}>
                            {getStudentNames(students, s.siswa_ids)}
                          </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: C.gray }}>{s.tipe}</div>
                      </>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WeeklyScheduleTable;
