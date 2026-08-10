// theme.js
//
// Palet warna terpusat untuk seluruh aplikasi Precious Course.
// Sebelumnya `const C = {...}` (dan `const D = {...}` untuk panel form gelap)
// didefinisikan ulang secara manual di 34+ file, dengan variasi kecil antar
// file (lihat temuan Code Review 7 Agustus 2026, Bagian 5 - "Palet warna
// didefinisikan ulang di 34 dari 53 file"). File ini menggantikan semua itu:
// cukup import C dan/atau D dari sini.
//
// PENTING - keputusan desain saat penggabungan:
// Beberapa file ternyata memakai varian warna yang sedikit berbeda untuk
// "konsep" yang sama (mis. abu-abu teks sekunder ada yang '#726d66' ada yang
// '#444242'; merah error ada yang '#b0413e' ada yang '#e74c3c'). Nilai yang
// dipakai di bawah ini dipilih berdasarkan MAYORITAS file yang sudah ada.
// Efeknya: beberapa file akan mengalami sedikit pergeseran warna visual
// (paling terasa: warna abu-abu teks sekunder & merah error/hapus di
// AdminConfirmUser.js, AdminConsulPage.js, TeacherArsipMateri.js).
// Silakan cek tampilannya setelah pindah ke theme ini — kalau ada preferensi
// warna yang berbeda, tinggal ubah nilainya DI SINI SAJA (satu tempat).

// ────────────────────────────────────────────────────────────────────────
// C — Palet terang, dipakai di hampir semua halaman (kartu, tabel, teks).
// ────────────────────────────────────────────────────────────────────────
export const C = {
  // Warna brand utama
  gold: '#b4964b',
  goldDark: '#96793a',
  goldBg: 'rgba(180,150,75,0.10)',
  goldLight: 'rgba(180,150,75,0.06)',

  // Hijau (sukses / status aktif)
  green: '#2d6a4f',
  greenBg: 'rgba(45,106,79,0.10)',

  // Kuning keemasan (peringatan / status pending)
  amber: '#a3760f',
  amberBg: 'rgba(180,150,75,0.14)',

  // Merah (error / hapus / danger) — dan alias 'danger' untuk file yang
  // sebelumnya memakai penamaan itu (mis. AdminConfirmUser.js)
  red: '#b0413e',
  redBg: 'rgba(176,65,62,0.10)',
  danger: '#b0413e',
  dangerBg: 'rgba(176,65,62,0.10)',
  lightRed: 'rgba(176,65,62,0.10)', // alias, dipakai di AdminConsulPage.js

  // Oranye (status "diproses" di AdminConsulPage.js)
  orange: '#ff9800',
  orangeBg: 'rgba(255,152,0,0.10)',

  // Biru (info / kategori sekunder)
  blue: '#3f7ea6',
  blueBg: 'rgba(63,126,166,0.10)',

  // Netral
  dark: '#171411',
  gray: '#444242',
  grayLight: '#a8a29a',
  grayBg: 'rgba(68,66,66,0.08)',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
};

// ────────────────────────────────────────────────────────────────────────
// D — Palet gelap, dipakai khusus untuk panel form input & detail bertema
// gelap (AdminPayment, PaketSiswa, Pricelist, TeacherAbsensiMateri, dll).
// Nilainya sudah identik persis di keempat file asal, jadi tidak ada
// konflik yang perlu diputuskan di sini.
// ────────────────────────────────────────────────────────────────────────
export const D = {
  bg: '#12141c',
  bgSoft: '#181b26',
  field: '#1c2030',
  fieldBorder: '#2c3145',
  fieldBorderFocus: '#c9a24b',
  gold: '#d4ac52',
  goldSoft: 'rgba(212,172,82,0.14)',
  text: '#f2efe6',
  textMuted: '#9a9fb0',
  textFaint: '#5f6577',
  red: '#e0574f',
  green: '#7fbf9e',
  blue: '#4f8fdb',
  danger: '#e0574f',
};