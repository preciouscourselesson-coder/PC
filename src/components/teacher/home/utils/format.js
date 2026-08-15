export const formatJam = (t) => (t ? t.slice(0, 5) : '');

export const formatTanggalPanjang = (tanggalStr) => {
  if (!tanggalStr) return '';
  return new Date(`${tanggalStr}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/** Memformat selisih waktu dari sekarang, mis. "5 menit lalu", "2 hari lalu" */
export const waktuLalu = (isoDate) => {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const menit = Math.floor(diffMs / 60000);
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
};

/** Sapaan berdasarkan jam saat ini, mis. "Good Morning" */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Good Morning';
  if (hour < 15) return 'Good Afternoon';
  if (hour < 18) return 'Good Evening';
  return 'Good Night';
};

/** Tanggal hari ini dalam format panjang Indonesia, huruf awal tiap kata kapital */
export const getTodayLongDate = () => {
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Date()
    .toLocaleDateString('id-ID', options)
    .replace(/,/, '')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};
