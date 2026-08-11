// ─── Helper ───────────────────────────────────────────────────────────────────
export const formatDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()}`;
};

export const formatDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} WIB`;
};

// Persentase nilai (0-100), null kalau max_score 0 (hindari pembagian dgn nol)
export const scorePercent = (score, maxScore) => {
  if (!maxScore) return null;
  return Math.round((score / maxScore) * 100);
};
