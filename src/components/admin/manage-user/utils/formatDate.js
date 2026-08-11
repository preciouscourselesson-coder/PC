// Memformat tanggal ISO menjadi string tanggal berbahasa Indonesia, mis. "3 Agu 2026".
export const formatDate = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};
