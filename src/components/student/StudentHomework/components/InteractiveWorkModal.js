import React, { useEffect } from 'react';
import { C } from '../constants';
import { buildQuestionParts } from '../utils';
import { QuestionMedia } from './QuestionMedia';
import { SpeakingAnswerRecorder } from './SpeakingAnswerRecorder';

// ─── Modal Interaktif (dengan aksen biru) ──────────────────────────────────
// Ditampilkan FULL LAYAR (baik di desktop maupun smartphone) supaya soal,
// gambar, dan audio dari guru terlihat lebih besar dan jelas saat dikerjakan.
export const InteractiveWorkModal = ({ task, answers, onAnswerChange, onSubmit, onClose, submitting, error, studentId, isMobile }) => {
  // Kunci scroll halaman di belakang modal selama siswa mengerjakan soal.
  useEffect(() => {
    if (!task) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [task]);

  if (!task) return null;
  const isSubmitted = task.status_pengumpulan === 'Sudah';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: C.white, zIndex: 1000,
        display: 'flex', flexDirection: 'column', height: '100dvh',
      }}
    >
      {/* Header — tetap terlihat (sticky) saat soal di-scroll */}
      <div style={{
        flexShrink: 0, borderBottom: `1.5px solid ${C.border}`,
        padding: isMobile ? '0.8rem 1rem' : '1rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem',
        background: C.white,
      }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, color: C.dark, fontSize: isMobile ? '1.05rem' : '1.25rem', overflowWrap: 'break-word' }}>
            {task.judul}
          </h3>
          <p style={{ color: C.gray, fontSize: '0.85rem', margin: '4px 0 0' }}>
            {task.mapel}{task.kelas ? ` • ${task.kelas}` : ''} • {(task.questions || []).length} soal
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0, background: C.cream, border: `1.5px solid ${C.border}`, color: C.gray,
            width: isMobile ? '40px' : '34px', height: isMobile ? '40px' : '34px', borderRadius: '50%', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1,
          }}
          aria-label="Tutup"
        >
          ×
        </button>
      </div>

      {/* Konten soal — area yang bisa di-scroll, dibatasi lebar agar tetap nyaman dibaca di layar besar */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{
          maxWidth: '760px', margin: '0 auto',
          padding: isMobile ? '1rem' : '1.5rem 2rem',
        }}>
          {task.deskripsi && (
            <p style={{ color: C.gray, fontSize: '0.85rem', lineHeight: 1.5, marginTop: 0 }}>
              {task.deskripsi}
            </p>
          )}

          {isSubmitted && task.nilai !== null && task.nilai !== undefined && (
            <div style={{
              background: '#e6f4ee', color: C.green, borderRadius: '10px',
              padding: '0.6rem 0.9rem', fontSize: '0.85rem', fontWeight: 'bold',
              marginTop: '0.75rem',
            }}>
              🏆 Nilai Anda: {task.nilai}/{task.maxScore} — Anda bisa mengerjakan ulang untuk memperbaiki jawaban.
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {(task.questions || []).map((q, qIdx) => {
              const type = q.type || 'isian';
              const qAnswers = answers[q.id] || [];
              const parts = type === 'isian' ? buildQuestionParts(q.question_text || '') : null;

              return (
                <div key={q.id} style={{ border: `1.5px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '1rem' : '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: C.primary, color: C.white, fontSize: '0.8rem', fontWeight: 'bold',
                    }}>
                      {qIdx + 1}
                    </span>
                    <span style={{ color: C.gray, fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {q.points} poin
                    </span>
                  </div>

                  <QuestionMedia imageUrl={q.image_url} audioUrl={q.audio_url} isMobile={isMobile} />

                  {type === 'isian' && (
                    <p style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.05rem', lineHeight: 2.1, color: C.dark }}>
                      {parts.map((part, i) =>
                        part.type === 'text' ? (
                          <span key={i}>{part.value}</span>
                        ) : (
                          <input
                            key={i}
                            type="text"
                            value={qAnswers[part.blankIndex] || ''}
                            onChange={e => onAnswerChange(q.id, part.blankIndex, e.target.value)}
                            placeholder="jawaban"
                            disabled={submitting}
                            style={{
                              margin: '0 4px', minWidth: '100px', padding: '5px 10px',
                              borderRadius: '8px', border: `1.5px solid ${C.primary}`,
                              fontFamily: 'inherit', fontSize: isMobile ? '16px' : '0.95rem', textAlign: 'center',
                              background: C.cream, color: C.dark,
                            }}
                          />
                        )
                      )}
                    </p>
                  )}

                  {type === 'pilihan_ganda' && (
                    <div>
                      <p style={{ margin: '0 0 0.6rem', fontSize: isMobile ? '1rem' : '1.05rem', lineHeight: 1.5, color: C.dark }}>
                        {q.question_text}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(q.options || []).map((opt) => {
                          const checked = qAnswers[0] === opt.id;
                          return (
                            <label
                              key={opt.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 12px', borderRadius: '10px',
                                border: `1.5px solid ${checked ? C.primary : C.border}`,
                                background: checked ? C.primaryBg : C.white,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontSize: '0.92rem', color: C.dark,
                              }}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={checked}
                                onChange={() => onAnswerChange(q.id, 0, opt.id)}
                                disabled={submitting}
                              />
                              {opt.text}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {type === 'speaking' && (
                    <div>
                      <p style={{ margin: '0 0 0.4rem', fontSize: isMobile ? '1rem' : '1.05rem', lineHeight: 1.5, color: C.dark }}>
                        {q.question_text}
                      </p>
                      <SpeakingAnswerRecorder
                        questionId={q.id}
                        studentId={studentId}
                        value={qAnswers[0] || ''}
                        onChange={(url) => onAnswerChange(q.id, 0, url)}
                        disabled={submitting}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{ color: C.red, fontSize: '0.82rem', marginTop: '1rem' }}>{error}</div>
          )}
        </div>
      </div>

      {/* Footer — tetap terlihat (sticky) supaya tombol Kirim selalu terjangkau */}
      <div style={{
        flexShrink: 0, borderTop: `1.5px solid ${C.border}`, background: C.white,
        padding: isMobile ? '0.7rem 1rem' : '0.9rem 2rem',
        display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row',
        gap: '0.6rem', justifyContent: 'flex-end',
      }}>
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
            background: 'transparent', color: C.gray, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            width: isMobile ? '100%' : 'auto', minHeight: isMobile ? '44px' : 'auto',
          }}
        >
          Tutup
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: submitting ? C.border : C.primary, color: C.white,
            fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1, fontFamily: 'inherit',
            width: isMobile ? '100%' : 'auto', minHeight: isMobile ? '44px' : 'auto',
          }}
        >
          {submitting ? 'Mengirim...' : isSubmitted ? 'Kirim Ulang Jawaban' : 'Kirim Jawaban'}
        </button>
      </div>
    </div>
  );
};
