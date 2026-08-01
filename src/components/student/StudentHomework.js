// src/components/student/StudentHomework.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

// ---------------------------------------------------------------------------
// Update: siswa sekarang bisa mengerjakan dua jenis tugas di halaman ini.
//
// 1) Tugas file (skema lama, tidak berubah)
//    penugasan_guru -> pengumpulan_tugas (upload file jawaban)
//
// 2) Tugas isian interaktif (skema baru, dibuat guru lewat TeacherHomework.js)
//    homework -> homework_questions -> homework_assignments
//    Siswa mengisi bagian [blank] pada kalimat soal langsung di halaman ini,
//    lalu dinilai otomatis dengan mencocokkan jawaban ke `blanks` (case-
//    insensitive, trimmed). Skema homework_* tidak menyediakan tabel untuk
//    menyimpan jawaban siswa, jadi tabel baru berikut PERLU dibuat manual
//    di Supabase sebelum fitur ini berfungsi:
//
//    create table homework_submissions (
//      id           uuid primary key default gen_random_uuid(),
//      homework_id  uuid not null references homework(id) on delete cascade,
//      student_id   uuid not null references profiles(id) on delete cascade,
//      answers      jsonb not null default '{}'::jsonb, -- { [homework_question_id]: string[] }
//      score        numeric not null default 0,
//      max_score    numeric not null default 0,
//      submitted_at timestamptz not null default now(),
//      unique (homework_id, student_id) -- supaya bisa upsert saat siswa mengerjakan ulang
//    );
//    alter table homework_submissions enable row level security;
//    create policy "siswa kelola submission sendiri" on homework_submissions
//      for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
//    -- tambahkan policy SELECT terpisah untuk guru (mis. via guru_owns_tugas())
//    -- jika ingin nilai ini juga terlihat di sisi guru.
// ---------------------------------------------------------------------------

const C = {
  gold:    '#b4964b',
  green:   '#2d6a4f',
  dark:    '#171411',
  gray:    '#444242',
  cream:   '#f7f6f0',
  white:   '#ffffff',
  border:  '#e0ddd6',
  goldBg:  'rgba(180,150,75,0.10)',
  red:     '#e74c3c',
  redBg:   '#fff0f0',
  orange:  '#f39c12',
  orangeBg:'#fef9e7',
  blue:    '#3f7ea6',
  blueBg:  'rgba(63,126,166,0.10)',
};

// ─── Helper: parsing & grading soal isian [blank] ────────────────────────────
// Memecah teks soal menjadi bagian teks biasa dan bagian blank (mengacu pada
// format [kata] yang sama dengan yang dipakai TeacherHomework.js). Setiap
// bagian blank diberi nomor urut (blankIndex) supaya jawabannya bisa dipetakan
// balik ke array `blanks` pada baris homework_questions.
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

// Menilai satu tugas isian: cocokkan jawaban siswa (workAnswers[question.id])
// dengan kunci jawaban (question.blanks) secara case-insensitive & trimmed.
// Nilai per soal proporsional terhadap jumlah blank yang benar.
const computeInteractiveScore = (questions = [], answersMap = {}) => {
  let score = 0;
  let maxScore = 0;
  questions.forEach((q) => {
    const blanks = q.blanks || [];
    maxScore += q.points || 0;
    if (blanks.length === 0) return;
    const given = answersMap[q.id] || [];
    let correctCount = 0;
    blanks.forEach((expected, i) => {
      const userAnswer = String(given[i] || '').trim().toLowerCase();
      const correctAnswer = String(expected || '').trim().toLowerCase();
      if (userAnswer && userAnswer === correctAnswer) correctCount += 1;
    });
    score += (correctCount / blanks.length) * (q.points || 0);
  });
  return { score: Math.round(score * 100) / 100, maxScore };
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDeadline = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} WIB`;
};

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month - 1, 1).getDay();

// ─── Komponen Filter Button ──────────────────────────────────────────────────
const FilterButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? C.gold : 'transparent',
      color: active ? C.white : C.gray,
      border: `1.5px solid ${active ? C.gold : C.border}`,
      borderRadius: '40px',
      padding: '6px 16px',
      fontSize: '0.82rem',
      fontWeight: active ? 'bold' : 'normal',
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
);

// ─── Komponen Task Card ──────────────────────────────────────────────────────
const TaskCard = ({ task, onUpload, onWork, isMobile }) => {
  const isInteractive = task.type === 'interactive';
  const isOverdue = new Date(task.deadline) < new Date() && task.status_pengumpulan !== 'Sudah';
  const isToday = new Date(task.deadline).toDateString() === new Date().toDateString();
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
    onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
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
                background: C.blueBg, color: C.blue, padding: '1px 10px',
                borderRadius: '40px', fontSize: '0.68rem', fontWeight: 'bold',
              }}>
                ✍️ Isian Interaktif
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ color: C.gold, fontWeight: 'bold', fontSize: '0.85rem' }}>{task.mapel}</span>
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
                  background: C.goldBg,
                  color: C.gold,
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
                background: isSubmitted ? 'transparent' : C.gold,
                border: isSubmitted ? `1.5px solid ${C.gold}` : 'none',
                color: isSubmitted ? C.gold : C.white,
                padding: '6px 14px',
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
                background: C.gold,
                border: 'none',
                color: C.white,
                padding: '6px 14px',
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
                color: C.gold,
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

// ─── Kalender Mini ──────────────────────────────────────────────────────────
const MiniCalendar = ({ year, month, selectedDate, onSelectDate, tasksByDate, isMobile }) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const handlePrevMonth = () => {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    onSelectDate(new Date(newYear, newMonth - 1, 1));
  };

  const handleNextMonth = () => {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    onSelectDate(new Date(newYear, newMonth - 1, 1));
  };

  const isSelected = (day) => {
    return selectedDate && selectedDate.getFullYear() === year &&
           selectedDate.getMonth() === month - 1 &&
           selectedDate.getDate() === day;
  };

  const isToday = (day) => {
    return today.getFullYear() === year &&
           today.getMonth() === month - 1 &&
           today.getDate() === day;
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} style={{ width: '100%', paddingBottom: '100%' }} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const selected = isSelected(d);
    const todayFlag = isToday(d);
    const hasTask = tasksByDate && tasksByDate[d] && tasksByDate[d].length > 0;
    days.push(
      <div
        key={d}
        onClick={() => onSelectDate(new Date(year, month - 1, d))}
        style={{
          width: '100%',
          paddingBottom: '100%',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: selected ? C.gold : todayFlag ? C.goldBg : 'transparent',
          color: selected ? C.white : todayFlag ? C.gold : C.dark,
          fontWeight: selected ? 'bold' : todayFlag ? 'bold' : 'normal',
          fontSize: '0.85rem',
          transition: 'background 0.15s',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => {
          if (!selected) e.currentTarget.style.background = C.cream;
        }}
        onMouseLeave={e => {
          if (!selected) e.currentTarget.style.background = todayFlag ? C.goldBg : 'transparent';
        }}
        >
          {d}
          {hasTask && (
            <span style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: C.gold,
              display: 'inline-block',
              marginTop: '2px',
            }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: '16px',
      padding: '1rem 0.5rem',
      maxWidth: isMobile ? '360px' : '280px',
      width: '100%',
      margin: isMobile ? '0 auto' : 0,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 0.5rem',
        marginBottom: '0.8rem',
      }}>
        <button onClick={handlePrevMonth} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.2rem',
          color: C.gray,
          padding: '0 8px',
        }}>‹</button>
        <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '1rem' }}>
          {monthNames[month - 1]} {year}
        </span>
        <button onClick={handleNextMonth} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.2rem',
          color: C.gray,
          padding: '0 8px',
        }}>›</button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        padding: '0 0.25rem',
      }}>
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
          <div key={day} style={{
            fontSize: '0.7rem',
            color: C.gray,
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '4px 0',
          }}>{day}</div>
        ))}
        {days}
      </div>
    </div>
  );
};

// ─── Modal Kerjakan Tugas Isian Interaktif ───────────────────────────────────
// Menampilkan setiap soal dari homework_questions dengan bagian [blank]
// diganti input teks. Jika siswa sudah pernah mengumpulkan, input akan
// terisi otomatis dengan jawaban terakhir sehingga bisa dikerjakan ulang.
const InteractiveWorkModal = ({ task, answers, onAnswerChange, onSubmit, onClose, submitting, error }) => {
  if (!task) return null;
  const isSubmitted = task.status_pengumpulan === 'Sudah';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.white, borderRadius: '20px', padding: '1.5rem',
          maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
          <div>
            <h3 style={{ margin: 0, color: C.dark }}>{task.judul}</h3>
            <p style={{ color: C.gray, fontSize: '0.85rem', margin: '4px 0 0' }}>
              {task.mapel}{task.kelas ? ` • ${task.kelas}` : ''} • {(task.questions || []).length} soal
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.gray, fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {task.deskripsi && (
          <p style={{ color: C.gray, fontSize: '0.85rem', lineHeight: 1.5, marginTop: '0.75rem' }}>
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
            const parts = buildQuestionParts(q.question_text || '');
            const qAnswers = answers[q.id] || [];
            return (
              <div key={q.id} style={{ border: `1.5px solid ${C.border}`, borderRadius: '14px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: C.gold, color: C.white, fontSize: '0.75rem', fontWeight: 'bold',
                  }}>
                    {qIdx + 1}
                  </span>
                  <span style={{ color: C.gray, fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {q.points} poin
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 2, color: C.dark }}>
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
                          margin: '0 4px', minWidth: '90px', padding: '4px 8px',
                          borderRadius: '8px', border: `1.5px solid ${C.gold}`,
                          fontFamily: 'inherit', fontSize: '0.88rem', textAlign: 'center',
                          background: C.cream, color: C.dark,
                        }}
                      />
                    )
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ color: C.red, fontSize: '0.82rem', marginTop: '1rem' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.2rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
              background: 'transparent', color: C.gray, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Tutup
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              padding: '8px 20px', borderRadius: '10px', border: 'none',
              background: submitting ? C.border : C.gold, color: C.white,
              fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            {submitting ? 'Mengirim...' : isSubmitted ? 'Kirim Ulang Jawaban' : 'Kirim Jawaban'}
          </button>
        </div>
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
  const [user, setUser] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterMapel, setFilterMapel] = useState('Semua Mapel');
  const [sortBy, setSortBy] = useState('Terbaru');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth() + 1);
  const [mapelList, setMapelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // State untuk upload jawaban (tugas file)
  const [uploadingTaskId, setUploadingTaskId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // State untuk mengerjakan tugas isian interaktif (homework)
  const [workingTask, setWorkingTask] = useState(null);
  const [workAnswers, setWorkAnswers] = useState({});
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [workError, setWorkError] = useState('');

  // ── Ambil data user ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user.user_metadata);
        setStudentId(session.user.id);
      }
    };
    init();
  }, []);

  // ── Ambil tugas dari Supabase ─────────────────────────────────────────────
  // Dua sumber digabung jadi satu daftar `tasks`, dibedakan lewat field `type`:
  //   'file'        -> penugasan_guru / pengumpulan_tugas (upload jawaban)
  //   'interactive' -> homework / homework_questions / homework_assignments
  //                    (isian [blank] yang dikerjakan langsung di halaman ini)
  const fetchTasks = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setErrorMsg('');

    try {
      // ─── A. Tugas file (skema lama, tidak diubah) ───────────────────────
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
          if (!mySubmission) return null; // belum ditugaskan ke siswa ini
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

      // ─── B. Tugas isian interaktif (skema baru dari TeacherHomework.js) ──
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
            homework_questions ( id, question_text, blanks, points, order_index )
          )
        `)
        .eq('student_id', studentId);

      if (hwAssignError) throw hwAssignError;

      // Hanya tugas yang benar-benar sudah dipublikasikan guru; dedup kalau
      // ada lebih dari satu baris assignment untuk homework yang sama.
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
          // Tabel/policy homework_submissions kemungkinan belum dibuat di
          // Supabase — jangan gagalkan seluruh halaman, anggap saja belum
          // ada jawaban yang dikumpulkan (lihat catatan skema di atas).
          console.warn('Gagal memuat submission tugas interaktif:', subError.message);
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

      // Ambil daftar mapel unik dari kedua jenis tugas
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
          const isOverdue = new Date(t.deadline) < new Date() && t.status_pengumpulan !== 'Sudah';
          return isOverdue;
        });
      }
    }

    if (filterMapel !== 'Semua Mapel') {
      result = result.filter(t => t.mapel === filterMapel);
    }

    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      result = result.filter(t => {
        const taskDate = new Date(t.deadline).toISOString().split('T')[0];
        return taskDate === dateStr;
      });
    }

    if (sortBy === 'Terbaru') {
      result.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
    } else if (sortBy === 'Terlama') {
      result.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sortBy === 'A-Z') {
      result.sort((a, b) => a.judul.localeCompare(b.judul));
    }

    setFilteredTasks(result);
  }, [tasks, filterStatus, filterMapel, sortBy, selectedDate]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ── Handle Upload Jawaban ──────────────────────────────────────────────────
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
      // Cari submission_id untuk tugas ini
      const task = tasks.find(t => t.id === uploadingTaskId);
      if (!task || !task.submission_id) {
        throw new Error('Data tugas tidak ditemukan.');
      }

      // Upload file ke storage
      const fileName = `${studentId}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('tugas-siswa')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('tugas-siswa')
        .getPublicUrl(fileName);

      // Update pengumpulan_tugas
      const { error: updateError } = await supabase
        .from('pengumpulan_tugas')
        .update({
          status: 'Sudah',
          file_name: uploadFile.name,
          file_url: publicUrlData.publicUrl,
        })
        .eq('id', task.submission_id);

      if (updateError) throw updateError;

      // Update local state
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

  // ── Handle Kerjakan Tugas Isian Interaktif ─────────────────────────────────
  const openWorkModal = (task) => {
    // Siapkan array jawaban kosong (atau terisi dari submission terakhir)
    // untuk setiap soal, sepanjang jumlah blank pada soal tersebut.
    const initialAnswers = {};
    (task.questions || []).forEach(q => {
      const blanksLen = (q.blanks || []).length;
      const existing = task.answers && task.answers[q.id];
      initialAnswers[q.id] = Array.from({ length: blanksLen }, (_, i) => (existing && existing[i]) || '');
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

  // ── Grup tasks by date untuk kalender ─────────────────────────────────────
  const tasksByDate = tasks.reduce((acc, t) => {
    if (t.deadline) {
      const d = new Date(t.deadline);
      const day = d.getDate();
      if (!acc[day]) acc[day] = [];
      acc[day].push(t);
    }
    return acc;
  }, {});

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setCurrentYear(date.getFullYear());
    setCurrentMonth(date.getMonth() + 1);
  };

  const namaDepan = user?.full_name?.split(' ')[0] || 'Siswa';
  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';

  return (
    <>
      <div style={{ maxWidth: '960px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: isMobile ? '1.25rem' : '1.6rem', fontWeight: 'bold', color: C.dark }}>
            Hi, {namaDepan}! 😊
          </h2>
          <p style={{ margin: '0 0 4px', color: C.gray, fontSize: '1rem' }}>
            Semangat mengerjakan tugas hari ini!
          </p>
          <p style={{ margin: 0, color: C.gray, fontSize: '0.88rem' }}>
            {tasks.length} tugas dari guru yang perlu dikerjakan.
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem' }}>
            {errorMsg}
          </div>
        )}

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          padding: '0.8rem 0',
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch', paddingBottom: isMobile ? '2px' : 0 }}>
            {['Semua', 'Belum Dikumpulkan', 'Sudah Dikumpulkan', 'Terlambat'].map(status => (
              <FilterButton
                key={status}
                label={status}
                active={filterStatus === status}
                onClick={() => setFilterStatus(status)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: isMobile ? 0 : 'auto' }}>
            <select
              value={filterMapel}
              onChange={e => setFilterMapel(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '40px',
                border: `1.5px solid ${C.border}`,
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                background: C.white,
                color: C.dark,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {mapelList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '40px',
                border: `1.5px solid ${C.border}`,
                fontSize: '0.82rem',
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
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
          gap: isMobile ? '1rem' : '1.5rem',
          alignItems: 'start',
        }}>
          <MiniCalendar
            year={currentYear}
            month={currentMonth}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            tasksByDate={tasksByDate}
            isMobile={isMobile}
          />

          <div>
            <div style={{
              background: C.white,
              border: `1.5px solid ${C.border}`,
              borderRadius: '16px',
              padding: '1.2rem 1.5rem',
              marginBottom: '1rem',
            }}>
              <h4 style={{ margin: 0, color: C.dark, fontSize: '0.95rem' }}>
                {filteredTasks.length} tugas untuk tanggal {selectedDateStr}
              </h4>
            </div>

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
                Tidak ada tugas untuk tanggal ini.
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
          </div>
        </div>

        <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.78rem', marginTop: '0.5rem' }}>
          © 2026 Precious Course. All rights reserved.
        </p>
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

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.2rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeUploadModal}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  background: 'transparent',
                  color: C.gray,
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                onClick={submitUpload}
                disabled={!uploadFile || uploading}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: !uploadFile || uploading ? C.border : C.gold,
                  color: C.white,
                  fontWeight: '700',
                  cursor: !uploadFile || uploading ? 'not-allowed' : 'pointer',
                  opacity: !uploadFile || uploading ? 0.6 : 1,
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
        />
      )}
    </>
  );
};

export default StudentHomework;