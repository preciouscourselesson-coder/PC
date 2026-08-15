import { C } from '../../shared/Theme';

export const fileIcon = (tipe) => {
  const t = (tipe || '').toLowerCase();
  if (t === 'link') return { emoji: '🔗', label: 'LINK', color: C.blue };
  if (t.includes('pdf')) return { emoji: '📄', label: 'PDF', color: C.red };
  if (t.includes('doc')) return { emoji: '📝', label: 'DOC', color: C.blue };
  if (t.includes('ppt')) return { emoji: '📊', label: 'PPT', color: '#d97706' };
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return { emoji: '🖼️', label: 'IMG', color: C.green };
  return { emoji: '📁', label: 'FILE', color: C.gray };
};

export const formatTanggal = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${bulan[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
};
