import { useState, useMemo } from 'react';
import { KELAS_OPTIONS, PROGRAM_OPTIONS, PERTEMUAN_OPTIONS, DURASI_OPTIONS, PENGAJAR_OPTIONS } from '../constants';

export const SISWA_OPTIONS = [
  { key: 'privat', label: 'Privat (1 Siswa)', field: 'harga_privat' },
  { key: '2', label: '2 Siswa', field: 'harga_2siswa' },
  { key: '3', label: '3 Siswa', field: 'harga_3siswa' },
  { key: '4', label: '4 Siswa', field: 'harga_4siswa' },
];

// Cari kombinasi kelas/program/waktu belajar/durasi/pengajar yang cocok di
// `items`, lalu sediakan harga langsung untuk jumlah siswa yang dipilih.
// Tidak melakukan fetch baru -- murni mencocokkan data yang sudah dimuat
// oleh usePricelistItems, supaya "Cek Harga" tetap instan.
export const usePriceChecker = (items) => {
  const [kelas, setKelas] = useState(KELAS_OPTIONS[0]);
  const [program, setProgram] = useState(PROGRAM_OPTIONS[0]);
  const [pertemuan, setPertemuan] = useState(PERTEMUAN_OPTIONS[0]);
  const [durasi, setDurasi] = useState(DURASI_OPTIONS[0]);
  const [pengajar, setPengajar] = useState(PENGAJAR_OPTIONS[0]);
  const [siswaKey, setSiswaKey] = useState(SISWA_OPTIONS[0].key);

  const candidates = useMemo(() => {
    return items.filter((it) =>
      it.kelas === kelas &&
      it.program === program &&
      it.jumlah_pertemuan === pertemuan &&
      it.durasi === durasi &&
      it.pengajar === pengajar
    );
  }, [items, kelas, program, pertemuan, durasi, pengajar]);

  // Kalau ada beberapa baris untuk kombinasi yang sama (mis. riwayat harga
  // lama tersimpan sebagai baris terpisah), utamakan yang berstatus Aktif,
  // lalu yang tanggal_berlaku paling baru.
  const matchedItem = useMemo(() => {
    if (candidates.length === 0) return null;
    const aktif = candidates.filter((it) => it.status === 'Aktif');
    const pool = aktif.length > 0 ? aktif : candidates;
    return [...pool].sort((a, b) => (b.tanggal_berlaku || '').localeCompare(a.tanggal_berlaku || ''))[0];
  }, [candidates]);

  const siswaOption = SISWA_OPTIONS.find((s) => s.key === siswaKey) || SISWA_OPTIONS[0];
  const selectedPrice = matchedItem ? matchedItem[siswaOption.field] : null;

  return {
    kelas, setKelas,
    program, setProgram,
    pertemuan, setPertemuan,
    durasi, setDurasi,
    pengajar, setPengajar,
    siswaKey, setSiswaKey,
    matchedItem, selectedPrice, siswaOption,
  };
};
