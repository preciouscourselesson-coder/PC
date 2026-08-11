// src/components/admin/adminHome/TodayScheduleTable.js
import React from 'react';
import { C } from '../../shared/Theme';
import { btnDelete } from './admin-home-styles';
import { getTeacherName, getStudentNames } from './admin-home-helpers';

const TodayScheduleTable = ({ todayHari, todaySchedule, filterType, teachers, students, onDeleteJadwal }) => {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: C.dark, fontSize: '0.9rem' }}>Jadwal Hari Ini ({todayHari})</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: C.cream }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Waktu</th>
              {filterType === 'siswa' && (
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Guru</th>
              )}
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kelas / Group</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tipe</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jenis</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {todaySchedule.length === 0 && (
              <tr><td colSpan={filterType === 'siswa' ? 7 : 6} style={{ padding: '12px 10px', color: C.gray, textAlign: 'center' }}>Tidak ada jadwal les hari ini untuk filter ini.</td></tr>
            )}
            {todaySchedule.map((row) => (
              <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 10px' }}>{row.jam_mulai} - {row.jam_selesai}{row.is_temporary && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: C.gold }}>(sementara)</span>}</td>
                {filterType === 'siswa' && (
                  <td style={{ padding: '8px 10px' }}>{getTeacherName(teachers, row.guru_id)}</td>
                )}
                <td style={{ padding: '8px 10px' }}>{row.kelas}</td>
                <td style={{ padding: '8px 10px' }}>{getStudentNames(students, row.siswa_ids)}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    background: row.tipe === 'Online' ? 'rgba(45,106,79,0.12)' : C.goldBg,
                    color: row.tipe === 'Online' ? C.green : C.gold,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}>
                    {row.tipe}
                  </span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    background: row.jenis === 'Private' ? C.greenBg : C.goldBg,
                    color: row.jenis === 'Private' ? C.green : C.gold,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}>
                    {row.jenis}
                  </span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <button
                    onClick={() => onDeleteJadwal(row.id)}
                    title="Hapus jadwal ini"
                    style={btnDelete}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TodayScheduleTable;
