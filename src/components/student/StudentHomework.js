// src/components/student/StudentHomework.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { checkedUpdate } from '../../utils/supabaseUpdateGuard';

// ---------------------------------------------------------------------------
// Warna biru sebagai tema utama
// ---------------------------------------------------------------------------
const C = {
  primary:   '#2563eb',      // biru utama
  primaryDark: '#1a4cbf',    // biru lebih gelap
  primaryLight: '#dbeafe',   // biru sangat muda untuk background
  primaryBg: 'rgba(37, 99, 235, 0.08)',
  green:     '#2d6a4f',
  dark:      '#171411',
  gray:      '#444242',
  cream:     '#f7f6f0',
  white:     '#ffffff',
  border:    '#e0ddd6',
  red:       '#e74c3c',
  redBg:     '#fff0f0',
  orange:    '#f39c12',
  orangeBg:  '#fef9e7',
};

// ─── Helper: parsing & grading soal isian [blank] ────────────────────────────
const buildQuestionParts = (text = '') => {
  const rawParts = text.split(/(\[.+?\])/g).filter((p) => p !== '');
  let blankIndex = 0;
  return rawParts.map((part) => {
    const match = part.match(/^\[(.+?)\]$/);
    if (match) {
      const idx = blankIndex;
      blankIndex += 1;
      return { type: 'blank', blankIndex: idx, key: `b${idx}` };
    }
    return { type: 'text', value: part };
  });
};

const computeInteractiveScore = (questions = [], answersMap = {}) => {
  let score = 0;
  let maxScore = 0;
  questions.forEach((q) => {
    const type = q.type || 'isian';
    const points = q.points || 0;
    maxScore += points;
    const given = answersMap[q.id] || [];

    if (type === 'pilihan_ganda') {
      // Nilai otomatis: cocokkan opsi yang dipilih siswa dengan correct_option_id.
      const chosenId = given[0];
      if (chosenId && q.correct_option_id && chosenId === q.correct_option_id) {
        score += points;
      }
      return;
    }

    if (type === 'speaking') {
      // Tidak dinilai otomatis — guru menilai manual lewat GradingPanel
      // setelah mendengarkan rekaman siswa (lihat TeacherHomework.js).
      return;
    }

    // Tipe 'isian' (default): cocokkan tiap [blank] dengan jawaban siswa.
    const blanks = q.blanks || [];
    if (blanks.length === 0) return;
    let correctCount = 0;
    blanks.forEach((expected, i) => {
      const userAnswer = String(given[i] || '').trim().toLowerCase();
      const correctAnswer = String(expected || '').trim().toLowerCase();
      if (userAnswer && userAnswer === correctAnswer) correctCount += 1;
    });
    score += (correctCount / blanks.length) * points;
  });
  return { score: Math.round(score * 100) / 100, maxScore };
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatDeadline = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} WIB`;
};

// ─── Komponen Task Card (dengan aksen biru) ─────────────────────────────────
const TaskCard = ({ task, onUpload, onWork, isMobile }) => {
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

// ─── Rekam Jawaban Speaking (mic → Supabase Storage) ───────────────────────
const SpeakingAnswerRecorder = ({ questionId, studentId, value, onChange, disabled }) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const uploadRecording = async (blob) => {
    setUploading(true);
    setError('');
    try {
      const mimeType = blob.type || 'audio/webm';
      const ext = mimeType.split('/')[1]?.split(';')[0] || 'webm';
      const fileName = `${studentId}/${questionId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('homework-speaking-answers')
        .upload(fileName, blob, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('homework-speaking-answers')
        .getPublicUrl(fileName);

      onChange(publicUrlData.publicUrl);
    } catch (err) {
      console.error(err);
      setError('Gagal mengunggah rekaman: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Perangkat/browser ini tidak mendukung perekaman audio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(
        (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)
      );
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await uploadRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      setError('Tidak bisa mengakses mikrofon: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div style={{ marginTop: '0.4rem' }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <audio src={value} controls style={{ height: '36px', maxWidth: '260px' }} />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: '4px 12px', borderRadius: '40px', border: `1.5px solid ${C.border}`,
                background: 'transparent', color: C.gray, fontSize: '0.75rem', fontWeight: 'bold',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🔁 Rekam Ulang
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={disabled || uploading}
            style={{
              padding: '6px 16px', borderRadius: '40px', border: 'none',
              background: recording ? C.red : C.primary, color: C.white,
              fontSize: '0.8rem', fontWeight: 'bold',
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
              opacity: disabled || uploading ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            {uploading ? 'Mengunggah...' : recording ? '⏹ Berhenti Merekam' : '🎙️ Mulai Merekam'}
          </button>
          {recording && (
            <span style={{ color: C.red, fontSize: '0.78rem', fontWeight: 'bold' }}>
              ● Sedang merekam...
            </span>
          )}
        </div>
      )}
      {error && (
        <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '6px' }}>{error}</div>
      )}
    </div>
  );
};

// ─── Media Soal: Gambar & Audio yang disisipkan guru (responsif desktop & HP) ─
// Menampilkan gambar/audio soal dengan penanganan error (jika URL gagal
// dimuat, siswa tetap melihat pesan yang jelas, bukan tampilan kosong),
// ukuran yang menyesuaikan layar, dan gambar bisa di-tap untuk diperbesar
// (penting di layar smartphone yang kecil).
const QuestionMedia = ({ imageUrl, audioUrl, isMobile }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [audioError, setAudioError] = useState(false);

  if (!imageUrl && !audioUrl) return null;

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      {imageUrl && (
        imageError ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: C.redBg, color: C.red, borderRadius: '10px',
            padding: '0.6rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.5rem',
          }}>
            ⚠️ Gambar soal gagal dimuat. Coba muat ulang halaman.
          </div>
        ) : (
          <div
            onClick={() => setLightboxOpen(true)}
            style={{ position: 'relative', display: 'inline-block', cursor: 'zoom-in', maxWidth: '100%', marginBottom: '0.5rem' }}
          >
            <img
              src={imageUrl}
              alt="Gambar soal dari guru"
              loading="lazy"
              onError={() => setImageError(true)}
              style={{
                display: 'block',
                width: '100%',
                maxWidth: isMobile ? '100%' : '420px',
                maxHeight: isMobile ? '200px' : '260px',
                objectFit: 'contain',
                borderRadius: '10px',
                border: `1.5px solid ${C.border}`,
                background: C.cream,
              }}
            />
            <span style={{
              position: 'absolute', bottom: '6px', right: '6px',
              background: 'rgba(0,0,0,0.55)', color: C.white,
              fontSize: '0.65rem', padding: '2px 8px', borderRadius: '40px',
              fontWeight: 'bold', pointerEvents: 'none',
            }}>
              🔍 Perbesar
            </span>
          </div>
        )
      )}

      {audioUrl && (
        audioError ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: C.redBg, color: C.red, borderRadius: '10px',
            padding: '0.6rem 0.8rem', fontSize: '0.8rem',
          }}>
            ⚠️ Audio soal gagal dimuat. Coba muat ulang halaman.
          </div>
        ) : (
          <audio
            src={audioUrl}
            controls
            preload="metadata"
            onError={() => setAudioError(true)}
            style={{ width: '100%', maxWidth: isMobile ? '100%' : '380px', height: '38px', display: 'block' }}
          />
        )
      )}

      {lightboxOpen && !imageError && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.2rem', cursor: 'zoom-out',
          }}
        >
          <img
            src={imageUrl}
            alt="Gambar soal (diperbesar)"
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', objectFit: 'contain' }}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Tutup"
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.15)', border: 'none', color: C.white,
              width: '36px', height: '36px', borderRadius: '50%',
              fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Modal Interaktif (dengan aksen biru) ──────────────────────────────────
// Ditampilkan FULL LAYAR (baik di desktop maupun smartphone) supaya soal,
// gambar, dan audio dari guru terlihat lebih besar dan jelas saat dikerjakan.
const InteractiveWorkModal = ({ task, answers, onAnswerChange, onSubmit, onClose, submitting, error, studentId, isMobile }) => {
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

const useIsMobile = (bp = 768) => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < bp : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < bp);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [bp]);
  return isMobile;
};

// ─── Halaman Utama ────────────────────────────────────────────────────────────
const StudentHomework = () => {
  const isMobile = useIsMobile();
  const [studentId, setStudentId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterMapel, setFilterMapel] = useState('Semua Mapel');
  const [sortBy, setSortBy] = useState('Terbaru');
  const [mapelList, setMapelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // State upload & interaktif
  const [uploadingTaskId, setUploadingTaskId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [workingTask, setWorkingTask] = useState(null);
  const [workAnswers, setWorkAnswers] = useState({});
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [workError, setWorkError] = useState('');

  // State "Buka Tugas dengan Kode/Link" (opsional — siswa mengerjakan tugas
  // yang dibagikan lewat kode/link dari guru, tanpa perlu ditugaskan lebih
  // dulu lewat daftar siswa di TeacherHomework.js).
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccessMsg, setJoinSuccessMsg] = useState('');

  // ── Ambil data user (hanya studentId) ────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStudentId(session.user.id);
      }
    };
    init();
  }, []);

  // ── Ambil tugas dari Supabase ─────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setErrorMsg('');

    try {
      // Tugas file
      const { data, error } = await supabase
        .from('penugasan_guru')
        .select(`
          id,
          judul,
          mapel,
          jenjang,
          bab,
          materi,
          kelas,
          deskripsi,
          file_name,
          file_url,
          status,
          deadline,
          pengumpulan_tugas (
            id,
            status,
            file_name,
            file_url,
            nilai,
            graded_at,
            siswa_id
          )
        `)
        .eq('status', 'Aktif')
        .order('deadline', { ascending: true });

      if (error) throw error;

      const myTasks = (data || [])
        .map(task => {
          const submissions = task.pengumpulan_tugas || [];
          const mySubmission = submissions.find(s => s.siswa_id === studentId);
          if (!mySubmission) return null;
          return {
            ...task,
            type: 'file',
            status_pengumpulan: mySubmission.status || 'Belum',
            submission_id: mySubmission.id,
            submission_file_url: mySubmission.file_url || null,
            submission_file_name: mySubmission.file_name || null,
            nilai: mySubmission.nilai || null,
            graded_at: mySubmission.graded_at || null,
          };
        })
        .filter(Boolean);

      // Tugas interaktif
      const { data: hwAssignData, error: hwAssignError } = await supabase
        .from('homework_assignments')
        .select(`
          id,
          assigned_at,
          homework:homework_id (
            id,
            title,
            subject,
            grade,
            description,
            due_date,
            status,
            homework_questions (
              id, question_text, blanks, points, order_index,
              image_url, audio_url, type, options, correct_option_id, reference_answer
            )
          )
        `)
        .eq('student_id', studentId);

      if (hwAssignError) throw hwAssignError;

      const homeworkMap = new Map();
      (hwAssignData || []).forEach(a => {
        if (a.homework && a.homework.status === 'published' && !homeworkMap.has(a.homework.id)) {
          homeworkMap.set(a.homework.id, a.homework);
        }
      });
      const homeworkIds = Array.from(homeworkMap.keys());

      let submissionMap = {};
      if (homeworkIds.length > 0) {
        const { data: subData, error: subError } = await supabase
          .from('homework_submissions')
          .select('*')
          .eq('student_id', studentId)
          .in('homework_id', homeworkIds);

        if (subError) {
          console.warn('Gagal memuat submission interaktif:', subError.message);
        } else {
          submissionMap = (subData || []).reduce((acc, s) => {
            acc[s.homework_id] = s;
            return acc;
          }, {});
        }
      }

      const interactiveTasks = Array.from(homeworkMap.values()).map(hw => {
        const questions = (hw.homework_questions || [])
          .slice()
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        const maxScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);
        const submission = submissionMap[hw.id] || null;

        return {
          id: `hw_${hw.id}`,
          homeworkId: hw.id,
          type: 'interactive',
          judul: hw.title,
          mapel: hw.subject,
          kelas: hw.grade,
          deskripsi: hw.description,
          deadline: hw.due_date,
          questions,
          maxScore,
          status_pengumpulan: submission ? 'Sudah' : 'Belum',
          nilai: submission ? submission.score : null,
          submitted_at: submission ? submission.submitted_at : null,
          answers: submission ? submission.answers : null,
        };
      });

      const allTasks = [...myTasks, ...interactiveTasks];
      setTasks(allTasks);

      const mapels = [...new Set(allTasks.map(t => t.mapel).filter(Boolean))];
      setMapelList(['Semua Mapel', ...mapels]);

    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat tugas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      fetchTasks();
    }
  }, [studentId, fetchTasks]);

  // ── Filter & Sortir ────────────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    let result = [...tasks];

    if (filterStatus !== 'Semua') {
      if (filterStatus === 'Sudah Dikumpulkan') {
        result = result.filter(t => t.status_pengumpulan === 'Sudah');
      } else if (filterStatus === 'Belum Dikumpulkan') {
        result = result.filter(t => t.status_pengumpulan === 'Belum');
      } else if (filterStatus === 'Terlambat') {
        result = result.filter(t => {
          const isOverdue = !!t.deadline && new Date(t.deadline) < new Date() && t.status_pengumpulan !== 'Sudah';
          return isOverdue;
        });
      }
    }

    if (filterMapel !== 'Semua Mapel') {
      result = result.filter(t => t.mapel === filterMapel);
    }

    if (sortBy === 'Terbaru') {
      result.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
    } else if (sortBy === 'Terlama') {
      result.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sortBy === 'A-Z') {
      result.sort((a, b) => a.judul.localeCompare(b.judul));
    }

    setFilteredTasks(result);
  }, [tasks, filterStatus, filterMapel, sortBy]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ── Statistik untuk sidebar ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.length;
    const belum = tasks.filter(t => t.status_pengumpulan === 'Belum').length;
    const sudah = tasks.filter(t => t.status_pengumpulan === 'Sudah').length;
    const terlambat = tasks.filter(t => {
      return !!t.deadline && new Date(t.deadline) < new Date() && t.status_pengumpulan !== 'Sudah';
    }).length;
    const mapelStats = {};
    tasks.forEach(t => {
      if (t.mapel) {
        mapelStats[t.mapel] = (mapelStats[t.mapel] || 0) + 1;
      }
    });
    return { total, belum, sudah, terlambat, mapelStats };
  }, [tasks]);

  // ── Handle Upload ──────────────────────────────────────────────────────────
  const openUploadModal = (taskId) => {
    setUploadingTaskId(taskId);
    setUploadFile(null);
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadingTaskId(null);
    setUploadFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setErrorMsg('Hanya file gambar atau PDF yang diizinkan.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Ukuran file maksimal 5MB.');
        return;
      }
      setUploadFile(file);
      setErrorMsg('');
    }
  };

  const submitUpload = async () => {
    if (!uploadFile || !uploadingTaskId) return;

    setUploading(true);
    setErrorMsg('');

    try {
      const task = tasks.find(t => t.id === uploadingTaskId);
      if (!task || !task.submission_id) {
        throw new Error('Data tugas tidak ditemukan.');
      }

      const fileName = `${studentId}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('tugas-siswa')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('tugas-siswa')
        .getPublicUrl(fileName);

      const { error: updateError } = await checkedUpdate(
        supabase
          .from('pengumpulan_tugas')
          .update({
            status: 'Sudah',
            file_name: uploadFile.name,
            file_url: publicUrlData.publicUrl,
          })
          .eq('id', task.submission_id)
      );

      if (updateError) throw updateError;

      setTasks(prev =>
        prev.map(t =>
          t.id === uploadingTaskId
            ? {
                ...t,
                status_pengumpulan: 'Sudah',
                submission_file_url: publicUrlData.publicUrl,
                submission_file_name: uploadFile.name,
              }
            : t
        )
      );

      closeUploadModal();
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mengupload jawaban: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Handle Interaktif ─────────────────────────────────────────────────────
  const openWorkModal = (task) => {
    const initialAnswers = {};
    (task.questions || []).forEach(q => {
      const type = q.type || 'isian';
      const existing = task.answers && task.answers[q.id];
      if (type === 'isian') {
        const blanksLen = (q.blanks || []).length;
        initialAnswers[q.id] = Array.from({ length: blanksLen }, (_, i) => (existing && existing[i]) || '');
      } else {
        // 'pilihan_ganda' (id opsi terpilih) & 'speaking' (URL rekaman) hanya
        // butuh satu nilai, disimpan di index 0 supaya format tetap array
        // seperti yang dibaca GradingPanel di TeacherHomework.js.
        initialAnswers[q.id] = [(existing && existing[0]) || ''];
      }
    });
    setWorkAnswers(initialAnswers);
    setWorkError('');
    setWorkingTask(task);
  };

  const closeWorkModal = () => {
    setWorkingTask(null);
    setWorkAnswers({});
    setWorkError('');
  };

  const handleBlankChange = (questionId, blankIndex, value) => {
    setWorkAnswers(prev => {
      const arr = [...(prev[questionId] || [])];
      arr[blankIndex] = value;
      return { ...prev, [questionId]: arr };
    });
  };

  const handleSubmitAnswers = async () => {
    if (!workingTask) return;
    setSubmittingAnswers(true);
    setWorkError('');

    try {
      const { score, maxScore } = computeInteractiveScore(workingTask.questions, workAnswers);

      const { data, error } = await supabase
        .from('homework_submissions')
        .upsert(
          {
            homework_id: workingTask.homeworkId,
            student_id: studentId,
            answers: workAnswers,
            score,
            max_score: maxScore,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'homework_id,student_id' }
        )
        .select()
        .single();

      if (error) throw error;

      const updater = t =>
        t.id === workingTask.id
          ? {
              ...t,
              status_pengumpulan: 'Sudah',
              nilai: data.score,
              submitted_at: data.submitted_at,
              answers: data.answers,
            }
          : t;

      setTasks(prev => prev.map(updater));
      setWorkingTask(prev => (prev ? updater(prev) : prev));
    } catch (err) {
      console.error(err);
      setWorkError('Gagal mengirim jawaban: ' + err.message);
    } finally {
      setSubmittingAnswers(false);
    }
  };

  // ── Buka Tugas dengan Kode/Link (opsional) ────────────────────────────────
  // Mengekstrak kode 6-karakter dari input siswa. Menerima baik kode polos
  // (mis. "K3F9XA") maupun link lengkap (mis. "https://app.sekolah.id/tugas/K3F9XA").
  const parseShareCodeInput = (raw) => {
    if (!raw) return '';
    let value = raw.trim();
    const marker = '/tugas/';
    const idx = value.indexOf(marker);
    if (idx !== -1) {
      value = value.slice(idx + marker.length);
    }
    value = value.split(/[?#/]/)[0].trim();
    return value.toUpperCase();
  };

  /**
   * Membuka tugas lewat kode/link yang dibagikan guru (lihat ShareModal &
   * kolom `share_code` pada tabel `homework` di TeacherHomework.js), TANPA
   * siswa harus lebih dulu dipilih guru lewat daftar siswa (homework_assignments).
   * Ini bersifat opsional — tombol "📤 Upload Jawaban" / daftar tugas biasa
   * tetap berjalan seperti sebelumnya untuk tugas yang memang ditugaskan.
   *
   * CATATAN SKEMA/RLS: setelah tugas ditemukan lewat `share_code`, kode ini
   * mencoba mendaftarkan siswa ke `homework_assignments` (self-enroll) agar
   * tugas otomatis muncul lagi di "Tugas Saya" pada kunjungan berikutnya.
   * Ini best-effort: jika policy INSERT pada `homework_assignments` masih
   * dibatasi hanya untuk guru pemilik tugas (lihat catatan di
   * `handleAssignToStudents`, TeacherHomework.js), insert ini akan gagal
   * secara diam-diam — siswa TETAP bisa mengerjakan & mengirim jawaban
   * tugas ini sekarang, hanya saja perlu memasukkan kode yang sama lagi
   * setelah reload. Agar permanen, tambahkan policy berikut di Supabase:
   *   create policy "siswa gabung tugas via kode" on homework_assignments
   *     for insert with check (auth.uid() = student_id);
   * Selain itu, pastikan tabel `homework` punya policy SELECT yang
   * mengizinkan siswa membaca tugas berstatus 'published' meski belum
   * ditugaskan, mis.:
   *   create policy "siswa lihat tugas published via kode" on homework
   *     for select using (status = 'published');
   */
  const handleJoinByCode = async () => {
    const code = parseShareCodeInput(joinCodeInput);
    setJoinError('');
    setJoinSuccessMsg('');

    if (!code) {
      setJoinError('Masukkan kode atau link tugas terlebih dahulu.');
      return;
    }
    if (!studentId) {
      setJoinError('Sesi belum siap, coba lagi sebentar.');
      return;
    }

    setJoining(true);
    try {
      const { data: hwRow, error: hwError } = await supabase
        .from('homework')
        .select(`
          id, title, subject, grade, description, due_date, status,
          homework_questions (
            id, question_text, blanks, points, order_index,
            image_url, audio_url, type, options, correct_option_id, reference_answer
          )
        `)
        .eq('share_code', code)
        .maybeSingle();

      if (hwError) throw hwError;
      if (!hwRow || hwRow.status !== 'published') {
        setJoinError('Kode/link tugas tidak ditemukan, atau tugas belum dipublikasikan guru.');
        return;
      }

      // Best-effort self-enroll — lihat catatan RLS di atas fungsi ini.
      try {
        await supabase
          .from('homework_assignments')
          .insert({ homework_id: hwRow.id, student_id: studentId });
      } catch (assignErr) {
        console.warn('Gagal mendaftarkan tugas kode ke daftar tugas (RLS?):', assignErr);
      }

      const { data: subRow } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('homework_id', hwRow.id)
        .maybeSingle();

      const questions = (hwRow.homework_questions || [])
        .slice()
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const maxScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);

      const newTask = {
        id: `hw_${hwRow.id}`,
        homeworkId: hwRow.id,
        type: 'interactive',
        judul: hwRow.title,
        mapel: hwRow.subject,
        kelas: hwRow.grade,
        deskripsi: hwRow.description,
        deadline: hwRow.due_date,
        questions,
        maxScore,
        status_pengumpulan: subRow ? 'Sudah' : 'Belum',
        nilai: subRow ? subRow.score : null,
        submitted_at: subRow ? subRow.submitted_at : null,
        answers: subRow ? subRow.answers : null,
        viaCode: true,
      };

      setTasks(prev => {
        const exists = prev.some(t => t.id === newTask.id);
        return exists ? prev.map(t => (t.id === newTask.id ? newTask : t)) : [newTask, ...prev];
      });
      setMapelList(prev => (newTask.mapel && !prev.includes(newTask.mapel) ? [...prev, newTask.mapel] : prev));

      setJoinCodeInput('');
      setJoinSuccessMsg(`Tugas "${newTask.judul}" berhasil dibuka.`);
      openWorkModal(newTask);
    } catch (err) {
      console.error(err);
      setJoinError('Gagal membuka tugas: ' + err.message);
    } finally {
      setJoining(false);
    }
  };


  const isActiveStatus = (status) => filterStatus === status && filterMapel === 'Semua Mapel';

  const handleStatusClick = (status) => {
    setFilterStatus(status);
    setFilterMapel('Semua Mapel');
  };

  const handleMapelClick = (mapel) => {
    setFilterMapel(mapel);
    setFilterStatus('Semua');
  };

  const Sidebar = () => {
    return (
      <div style={{
        background: C.white,
        border: `1.5px solid ${C.border}`,
        borderRadius: '16px',
        padding: '0.8rem 0',
        width: '100%',
        minWidth: '200px',
      }}>
        <div style={{ padding: '0 0.8rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: C.dark, fontWeight: 'bold' }}>
            📂 Filter Tugas
          </h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <SidebarItem
            label="Semua Tugas"
            count={stats.total}
            active={filterStatus === 'Semua' && filterMapel === 'Semua Mapel'}
            onClick={() => { setFilterStatus('Semua'); setFilterMapel('Semua Mapel'); }}
          />
          <SidebarItem
            label="Belum Dikumpulkan"
            count={stats.belum}
            active={isActiveStatus('Belum Dikumpulkan')}
            onClick={() => handleStatusClick('Belum Dikumpulkan')}
          />
          <SidebarItem
            label="Sudah Dikumpulkan"
            count={stats.sudah}
            active={isActiveStatus('Sudah Dikumpulkan')}
            onClick={() => handleStatusClick('Sudah Dikumpulkan')}
          />
          <SidebarItem
            label="Terlambat"
            count={stats.terlambat}
            active={isActiveStatus('Terlambat')}
            onClick={() => handleStatusClick('Terlambat')}
          />
          <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0.6rem 0.8rem' }} />
          <div style={{ padding: '0 0.8rem', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 'bold' }}>MATA PELAJARAN</span>
          </div>
          {mapelList.map(m => {
            if (m === 'Semua Mapel') return null;
            return (
              <SidebarItem
                key={m}
                label={m}
                count={stats.mapelStats[m] || 0}
                active={filterMapel === m && filterStatus === 'Semua'}
                onClick={() => handleMapelClick(m)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Filter khusus mobile: chip yang bisa digeser horizontal ────────────────
  // Sidebar vertikal terlalu memakan tempat di layar HP (siswa harus scroll
  // panjang dulu sebelum sampai ke daftar tugas). Di mobile, filter status &
  // mapel ditampilkan sebagai baris chip yang bisa digeser ke samping,
  // sehingga daftar tugas langsung terlihat di bawahnya.
  const FilterChip = ({ label, count, active, onClick }) => (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', minHeight: '40px', borderRadius: '40px',
        border: `1.5px solid ${active ? C.primary : C.border}`,
        background: active ? C.primary : C.white,
        color: active ? C.white : C.dark,
        fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : C.primaryBg,
        color: active ? C.white : C.primary,
        padding: '1px 8px', borderRadius: '40px', fontSize: '0.7rem',
      }}>
        {count}
      </span>
    </button>
  );

  const FilterChipsBar = () => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px',
        WebkitOverflowScrolling: 'touch',
      }}>
        <FilterChip label="Semua" count={stats.total} active={filterStatus === 'Semua' && filterMapel === 'Semua Mapel'} onClick={() => { setFilterStatus('Semua'); setFilterMapel('Semua Mapel'); }} />
        <FilterChip label="Belum" count={stats.belum} active={isActiveStatus('Belum Dikumpulkan')} onClick={() => handleStatusClick('Belum Dikumpulkan')} />
        <FilterChip label="Sudah" count={stats.sudah} active={isActiveStatus('Sudah Dikumpulkan')} onClick={() => handleStatusClick('Sudah Dikumpulkan')} />
        <FilterChip label="Terlambat" count={stats.terlambat} active={isActiveStatus('Terlambat')} onClick={() => handleStatusClick('Terlambat')} />
      </div>
      {mapelList.length > 1 && (
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '2px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {mapelList.filter(m => m !== 'Semua Mapel').map(m => (
            <FilterChip
              key={m}
              label={m}
              count={stats.mapelStats[m] || 0}
              active={filterMapel === m && filterStatus === 'Semua'}
              onClick={() => handleMapelClick(m)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const SidebarItem = ({ label, count, active, onClick }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 0.8rem',
        borderRadius: '8px',
        cursor: 'pointer',
        background: active ? C.primaryBg : 'transparent',
        color: active ? C.primary : C.dark,
        fontWeight: active ? 'bold' : 'normal',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = C.primaryLight;
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ fontSize: '0.85rem' }}>{label}</span>
      <span style={{
        background: active ? C.primary : C.border,
        color: active ? C.white : C.gray,
        padding: '1px 10px',
        borderRadius: '40px',
        fontSize: '0.7rem',
        fontWeight: 'bold',
      }}>{count}</span>
    </div>
  );

  // ─── RENDER UTAMA ──────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem',
      }}>
        {/* HEADER dengan latar biru */}
        <div style={{
          background: C.primary,
          padding: isMobile ? '1rem 1.2rem' : '1.2rem 2rem',
          borderRadius: '16px 16px 0 0',
          marginBottom: '1.5rem',
        }}>
          <h1 style={{ margin: 0, color: C.white, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
            Tugas Saya
          </h1>
        </div>

        {errorMsg && (
          <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Kartu opsional: buka tugas lewat kode/link dari guru, tanpa
            menunggu ditugaskan lewat daftar siswa */}
        <div style={{
          background: C.primaryBg,
          border: `1.5px solid ${C.primary}`,
          borderRadius: '16px',
          padding: isMobile ? '1rem' : '1rem 1.5rem',
          marginBottom: '1.5rem',
        }}>
          <h4 style={{ margin: '0 0 4px', color: C.dark, fontSize: '0.95rem', fontWeight: 'bold' }}>
            🔑 Punya kode atau link tugas dari guru?
          </h4>
          <p style={{ margin: '0 0 0.7rem', color: C.gray, fontSize: '0.8rem' }}>
            Opsional — masukkan kode (mis. K3F9XA) atau tempel link tugas untuk langsung mengerjakannya, tanpa perlu menunggu ditugaskan.
          </p>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
            <input
              type="text"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleJoinByCode(); }}
              placeholder="Kode tugas atau link, mis. K3F9XA"
              disabled={joining}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: '40px',
                border: `1.5px solid ${C.border}`, fontFamily: 'inherit',
                fontSize: isMobile ? '16px' : '0.85rem', minHeight: isMobile ? '44px' : 'auto',
                outline: 'none', background: C.white, color: C.dark, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleJoinByCode}
              disabled={joining || !joinCodeInput.trim()}
              style={{
                padding: '9px 20px', borderRadius: '40px', border: 'none',
                background: joining || !joinCodeInput.trim() ? C.border : C.primary,
                color: C.white, fontWeight: 'bold', fontSize: '0.85rem',
                minHeight: isMobile ? '44px' : 'auto',
                cursor: joining || !joinCodeInput.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {joining ? 'Membuka...' : '🚀 Buka Tugas'}
            </button>
          </div>
          {joinError && (
            <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '6px' }}>{joinError}</div>
          )}
          {joinSuccessMsg && !joinError && (
            <div style={{ color: C.green, fontSize: '0.78rem', marginTop: '6px' }}>{joinSuccessMsg}</div>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1.5rem',
        }}>
          {/* Sidebar filter — hanya di desktop; di mobile diganti FilterChipsBar
              (di dalam kolom konten) supaya daftar tugas langsung terlihat */}
          {!isMobile && (
            <div style={{ flex: '0 0 240px', minWidth: '200px' }}>
              <Sidebar />
            </div>
          )}

          {/* Konten Utama */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isMobile && <FilterChipsBar />}

            {/* Kontrol Sortir */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '40px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: isMobile ? '16px' : '0.82rem',
                  minHeight: isMobile ? '44px' : 'auto',
                  fontFamily: 'inherit',
                  background: C.white,
                  color: C.dark,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="Terbaru">Urutkan: Terbaru</option>
                <option value="Terlama">Urutkan: Terlama</option>
                <option value="A-Z">Urutkan: A-Z</option>
              </select>
              {(filterStatus !== 'Semua' || filterMapel !== 'Semua Mapel') && (
                <button
                  onClick={() => { setFilterStatus('Semua'); setFilterMapel('Semua Mapel'); }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '40px',
                    border: `1px solid ${C.primary}`,
                    background: 'transparent',
                    color: C.primary,
                    fontSize: '0.75rem',
                    minHeight: isMobile ? '36px' : 'auto',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Daftar Tugas */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: C.gray }}>Memuat tugas...</div>
            ) : filteredTasks.length === 0 ? (
              <div style={{
                background: C.white,
                border: `1.5px solid ${C.border}`,
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                color: C.gray,
              }}>
                Tidak ada tugas.
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpload={openUploadModal}
                  onWork={openWorkModal}
                  isMobile={isMobile}
                />
              ))
            )}

            <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.78rem', marginTop: '1.5rem' }}>
              © 2026 Precious Course. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Upload Jawaban */}
      {showUploadModal && (
        <div
          onClick={closeUploadModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.white,
              borderRadius: '20px',
              padding: '1.5rem',
              maxWidth: '450px',
              width: '100%',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: C.dark }}>Upload Jawaban Tugas</h3>
            <p style={{ color: C.gray, fontSize: '0.85rem', marginBottom: '1rem' }}>
              {tasks.find(t => t.id === uploadingTaskId)?.judul}
            </p>

            <div style={{
              border: `2px dashed ${C.border}`,
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              background: C.cream,
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('fileInput').click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {uploadFile ? (
                <div>
                  <div style={{ fontSize: '1.5rem' }}>📎</div>
                  <div style={{ fontWeight: 'bold', color: C.dark }}>{uploadFile.name}</div>
                  <div style={{ fontSize: '0.75rem', color: C.gray }}>
                    {(uploadFile.size / 1024).toFixed(0)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.5rem' }}>📤</div>
                  <div style={{ fontSize: '0.85rem', color: C.gray }}>
                    Klik untuk pilih file atau drag & drop
                  </div>
                  <div style={{ fontSize: '0.7rem', color: C.gray, marginTop: '4px' }}>
                    PDF, JPG, PNG (Maks. 5MB)
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div style={{ color: C.red, fontSize: '0.82rem', marginTop: '0.5rem' }}>{errorMsg}</div>
            )}

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '0.6rem', marginTop: '1.2rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeUploadModal}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  background: 'transparent',
                  color: C.gray,
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto',
                  minHeight: isMobile ? '44px' : 'auto',
                }}
              >
                Batal
              </button>
              <button
                onClick={submitUpload}
                disabled={!uploadFile || uploading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: !uploadFile || uploading ? C.border : C.primary,
                  color: C.white,
                  fontWeight: '700',
                  cursor: !uploadFile || uploading ? 'not-allowed' : 'pointer',
                  opacity: !uploadFile || uploading ? 0.6 : 1,
                  width: isMobile ? '100%' : 'auto',
                  minHeight: isMobile ? '44px' : 'auto',
                }}
              >
                {uploading ? 'Mengunggah...' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kerjakan Tugas Isian Interaktif */}
      {workingTask && (
        <InteractiveWorkModal
          task={workingTask}
          answers={workAnswers}
          onAnswerChange={handleBlankChange}
          onSubmit={handleSubmitAnswers}
          onClose={closeWorkModal}
          submitting={submittingAnswers}
          error={workError}
          studentId={studentId}
          isMobile={isMobile}
        />
      )}
    </>
  );
};

export default StudentHomework;