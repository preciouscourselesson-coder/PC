// src/components/admin/adminAbsensi/__tests__/admin-absensi-helpers.test.js
import {
  initials,
  formatTanggalDisplay,
  formatTanggalIndo,
  bulanFromIso,
  fileTypeFromUrl,
  fileNameFromUrl,
} from '../admin-absensi-helpers';

describe('initials', () => {
  it('mengambil huruf pertama dari maksimal 2 kata pertama', () => {
    expect(initials('Budi Santoso')).toBe('BS');
    expect(initials('Ani')).toBe('A');
    expect(initials('')).toBe('');
  });
});

describe('formatTanggalDisplay', () => {
  it('mengubah ISO date menjadi dd/mm/yyyy', () => {
    expect(formatTanggalDisplay('2026-08-09')).toBe('09/08/2026');
  });
  it('mengembalikan "-" jika kosong', () => {
    expect(formatTanggalDisplay('')).toBe('-');
    expect(formatTanggalDisplay(undefined)).toBe('-');
  });
});

describe('formatTanggalIndo', () => {
  it('mengubah ISO date menjadi format nama bulan Indonesia', () => {
    expect(formatTanggalIndo('2026-08-09')).toBe('9 Agustus 2026');
  });
});

describe('bulanFromIso', () => {
  it('mengembalikan "Nama Bulan Tahun"', () => {
    expect(bulanFromIso('2026-01-15')).toBe('Januari 2026');
  });
  it('mengembalikan string kosong jika tidak ada tanggal', () => {
    expect(bulanFromIso('')).toBe('');
  });
});

describe('fileTypeFromUrl', () => {
  it('mendeteksi pdf berdasarkan ekstensi', () => {
    expect(fileTypeFromUrl('https://x.com/berkas.PDF')).toBe('pdf');
    expect(fileTypeFromUrl('https://x.com/foto.jpg')).toBe('img');
  });
});

describe('fileNameFromUrl', () => {
  it('mengambil nama file terakhir dan mendecode URI', () => {
    expect(fileNameFromUrl('https://x.com/folder/Bukti%20Absen.pdf')).toBe('Bukti Absen.pdf');
  });
});
