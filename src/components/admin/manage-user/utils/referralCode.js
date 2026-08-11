// Membuat kode referral unik dari nama user + 4 karakter acak.
export const generateReferralCode = (name) => {
  const base = (name || 'USER')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
    .slice(0, 5) || 'USER';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
};
