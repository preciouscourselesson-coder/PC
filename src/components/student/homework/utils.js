// ─── Helper: parsing & grading soal isian [blank] ────────────────────────────
export const buildQuestionParts = (text = '') => {
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

export const computeInteractiveScore = (questions = [], answersMap = {}) => {
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
export const formatDeadline = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} WIB`;
};

// ─── Helper: parsing input kode/link "Buka Tugas dengan Kode" ───────────────
// Mengekstrak kode 6-karakter dari input siswa. Menerima baik kode polos
// (mis. "K3F9XA") maupun link lengkap (mis. "https://app.sekolah.id/tugas/K3F9XA").
export const parseShareCodeInput = (raw) => {
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
