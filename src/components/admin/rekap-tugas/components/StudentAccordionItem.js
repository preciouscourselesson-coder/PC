import React from 'react';
import { C } from '../constants';
import { TaskRow } from './TaskRow';

// ─── Baris siswa (accordion) — klik nama untuk lihat daftar tugas & nilainya ─
export const StudentAccordionItem = ({ student, expanded, onToggle, isMobile }) => {
  const total = student.tasks.length;
  const sudah = student.tasks.filter(t => t.submitted).length;

  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: '14px',
      marginBottom: '0.8rem',
      overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: isMobile ? '0.9rem 1rem' : '0.9rem 1.3rem',
          cursor: 'pointer',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.95rem' }}>
            {student.fullName}
          </div>
          <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>
            Kelas {student.kelas} • {sudah}/{total} tugas dikerjakan
          </div>
        </div>
        <span style={{
          flexShrink: 0,
          color: C.primary,
          fontSize: '1.1rem',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s',
        }}>
          ▾
        </span>
      </div>

      {expanded && (
        <div style={{
          borderTop: `1.5px solid ${C.border}`,
          padding: isMobile ? '0.8rem 1rem' : '0.8rem 1.3rem',
        }}>
          {total === 0 ? (
            <div style={{ color: C.gray, fontSize: '0.82rem', textAlign: 'center', padding: '0.5rem' }}>
              Tidak ada tugas untuk filter saat ini.
            </div>
          ) : (
            student.tasks.map(task => (
              <TaskRow key={task.homeworkId} task={task} isMobile={isMobile} />
            ))
          )}
        </div>
      )}
    </div>
  );
};
