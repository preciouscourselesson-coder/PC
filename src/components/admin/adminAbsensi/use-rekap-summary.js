// src/components/admin/adminAbsensi/use-rekap-summary.js
//
// Menghitung rekap per guru & per siswa (dipakai tabel ringkasan atas)
// serta kartu statistik total. Semua murni derived dari data yang
// diberikan lewat argumen -- tidak fetch apa pun -- sehingga bisa ditest
// dengan data statis.
import { useMemo } from 'react';

const emptyRow = (id, nama) => ({ id, nama, total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 });

export function useRekapSummary(entries, guruList, studentList) {
  const rekapPerGuru = useMemo(() => {
    const map = new Map();
    guruList.forEach((g) => map.set(g.id, emptyRow(g.id, g.full_name)));
    entries.forEach((e) => {
      const key = e.guru_id;
      if (!map.has(key)) {
        map.set(key, emptyRow(key, e.guruProfile?.full_name || 'Guru tidak dikenal'));
      }
      const row = map.get(key);
      row.total += 1;
      row[e.status] = (row[e.status] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries, guruList]);

  const rekapPerSiswa = useMemo(() => {
    const map = new Map();
    studentList.forEach((s) => map.set(s.id, emptyRow(s.id, s.full_name)));
    entries.forEach((e) => {
      const key = e.siswa_id;
      if (!map.has(key)) {
        map.set(key, emptyRow(key, e.siswa?.full_name || 'Siswa tidak dikenal'));
      }
      const row = map.get(key);
      row.total += 1;
      row[e.status] = (row[e.status] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries, studentList]);

  const totals = useMemo(
    () => ({
      totalPertemuan: entries.length,
      totalMenunggu: entries.filter((e) => e.status === 'Menunggu').length,
      totalDisetujui: entries.filter((e) => e.status === 'Disetujui').length,
      totalDitolak: entries.filter((e) => e.status === 'Ditolak').length,
      guruAktifCount: rekapPerGuru.filter((g) => g.total > 0).length,
      siswaAktifCount: rekapPerSiswa.filter((s) => s.total > 0).length,
    }),
    [entries, rekapPerGuru, rekapPerSiswa]
  );

  return { rekapPerGuru, rekapPerSiswa, totals };
}
