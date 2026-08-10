// src/components/admin/adminHome/TemporaryScheduleList.js
import React from 'react';
import { C } from '../../Theme';
import { btnDelete } from './admin-home-styles';
import { teacherName } from './admin-home-helpers';

const TemporaryScheduleList = ({ schedules, teachers, onDeleteScheduleChange }) => {
  const temporarySchedules = schedules.filter((s) => s.is_temporary);

  if (temporarySchedules.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada perubahan jadwal sementara.</p>;
  }

  return (
    <>
      {temporarySchedules.map((s) => (
        <div key={s.id} style={{ padding: '0.5rem 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', color: C.dark, fontSize: '0.85rem' }}>
                {teacherName(teachers, s.guru_id)} · {s.kelas} · {new Date(s.tanggal_temporary).toLocaleDateString('id-ID')} · {s.hari} {s.jam_mulai}-{s.jam_selesai}
              </div>
              <div style={{ fontSize: '0.8rem', color: C.gray }}>Alasan: {s.alasan}</div>
            </div>
            <button onClick={() => onDeleteScheduleChange(s.id)} style={btnDelete}>🗑️</button>
          </div>
        </div>
      ))}
    </>
  );
};

export default TemporaryScheduleList;
