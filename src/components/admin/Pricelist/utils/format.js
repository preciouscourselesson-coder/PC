export const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
};

export const formatTanggalDisplay = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  const bulan = BULAN_SINGKAT[parseInt(m, 10) - 1] || m;
  return `${d} ${bulan} ${y}`;
};

export const formatTanggalWaktu = (isoTimestamp) => {
  if (!isoTimestamp) return '-';
  const d = new Date(isoTimestamp);
  const tgl = String(d.getDate()).padStart(2, '0');
  const bulan = BULAN_SINGKAT[d.getMonth()];
  const tahun = d.getFullYear();
  return `${tgl} ${bulan} ${tahun}`;
};
