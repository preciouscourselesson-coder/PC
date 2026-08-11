import React from 'react';
import { C } from '../constants';
import { formatDeadline } from '../utils';

// ─── Komponen Task Card (dengan aksen biru) ─────────────────────────────────
export const TaskCard = ({ task, onUpload, onWork, isMobile }) => {
  const isInteractive = task.type === 'interactive';
  const hasMedia = isInteractive && (task.questions || []).some(q => q.image_url || q.audio_url);
  const isOverdue = !!task.deadline && new Date(task.deadline) < new Date() && task.status_pengumpulan !== 'Sudah';
  const isToday = !!task.deadline && new Date(task.deadline).toDateString() === new Date().toDateString();
  const isSubmitted = task.status_pengumpulan === 'Sudah';

  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${isOverdue ? C.red : C.border}`,
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '1.2rem 1.5rem',
      marginBottom: '1rem',
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
    onMouseLeave={e => e.currentTarget.style.borderColor = isOverdue ? C.red : C.border}
    >
      <div style={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: C.dark }}>
              {task.judul}
            </h4>
            {isInteractive && (
              <span style={{
                background: C.primaryBg, color: C.primary, padding: '1px 10px',
                borderRadius: '40px', fontSize: '0.68rem', fontWeight: 'bold',
              }}>
                ✍️ Isian Interaktif
              </span>
            )}
            {hasMedia && (
              <span style={{
                background: C.orangeBg, color: C.orange, padding: '1px 10px',
                borderRadius: '40px', fontSize: '0.68rem', fontWeight: 'bold',
              }}>
                🖼️🔊 Ada Gambar/Audio
              </span>
            )}
            {task.viaCode && (
              <span style={{
                background: C.primaryBg, color: C.primary, padding: '1px 10px',
                borderRadius: '40px', fontSize: '0.68rem', fontWeight: 'bold',
              }}>
                🔑 Dibuka via Kode
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ color: C.primary, fontWeight: 'bold', fontSize: '0.85rem' }}>{task.mapel}</span>
            {!isInteractive && (
              <span style={{ color: C.gray, fontSize: '0.8rem' }}>• {task.bab || 'Bab belum diisi'}</span>
            )}
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>• {task.kelas || '-'}</span>
          </div>
          <p style={{ margin: '0 0 8px', color: C.gray, fontSize: '0.88rem', lineHeight: 1.5 }}>
            {task.deskripsi || 'Tidak ada deskripsi.'}
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              background: isOverdue ? C.redBg : isSubmitted ? '#e6f4ee' : C.orangeBg,
              color: isOverdue ? C.red : isSubmitted ? C.green : C.orange,
              padding: '2px 12px',
              borderRadius: '40px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}>
              {isOverdue ? 'Terlambat' : isSubmitted ? 'Sudah Dikumpulkan' : isToday ? 'Deadline Hari Ini' : 'Deadline'}
            </span>
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>
              {formatDeadline(task.deadline)}
            </span>
            {isInteractive && (
              <span style={{ color: C.gray, fontSize: '0.8rem' }}>
                • {(task.questions || []).length} soal
              </span>
            )}
            {isInteractive && isSubmitted && task.nilai !== null && task.nilai !== undefined && (
              <span style={{ color: C.green, fontWeight: 'bold', fontSize: '0.8rem' }}>
                🏆 Nilai: {task.nilai}/{task.maxScore}
              </span>
            )}
            {!isInteractive && task.file_url && (
              <a
                href={task.file_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: C.primaryBg,
                  color: C.primary,
                  padding: '2px 10px',
                  borderRadius: '40px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                📎 Lihat Soal
              </a>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          {isInteractive ? (
            <button
              onClick={() => onWork(task)}
              style={{
                background: isSubmitted ? 'transparent' : C.primary,
                border: isSubmitted ? `1.5px solid ${C.primary}` : 'none',
                color: isSubmitted ? C.primary : C.white,
                padding: '6px 14px',
                minHeight: isMobile ? '40px' : 'auto',
                borderRadius: '40px',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {isSubmitted ? '📄 Lihat / Kerjakan Ulang' : '✍️ Kerjakan Tugas'}
            </button>
          ) : isSubmitted ? (
            <span style={{
              background: '#e6f4ee',
              color: C.green,
              padding: '2px 12px',
              borderRadius: '40px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}>
              ✅ Dikumpulkan
            </span>
          ) : (
            <button
              onClick={() => onUpload(task.id)}
              style={{
                background: C.primary,
                border: 'none',
                color: C.white,
                padding: '6px 14px',
                minHeight: isMobile ? '40px' : 'auto',
                borderRadius: '40px',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              📤 Upload Jawaban
            </button>
          )}
          {!isInteractive && task.submission_file_url && (
            <a
              href={task.submission_file_url}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.7rem',
                color: C.primary,
                textDecoration: 'none',
              }}
            >
              Lihat kiriman saya
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
