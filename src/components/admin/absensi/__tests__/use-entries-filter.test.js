// src/components/admin/adminAbsensi/__tests__/use-entries-filter.test.js
//
// Karena logic filter sudah dipisah dari komponen besar, hook ini bisa
// ditest langsung dengan array `entries` palsu -- tidak perlu mount
// AdminAbsensi lengkap, tidak perlu mock Supabase.
import { renderHook, act } from '@testing-library/react';
import { useEntriesFilter } from '../use-entries-filter';

const sampleEntries = [
  {
    id: '1', tanggal: '2026-08-01', judul_materi: 'Aljabar Linear', catatan: '',
    guru_id: 'g1', siswa_id: 's1', status: 'Disetujui',
    siswa: { full_name: 'Siswa A' }, guruProfile: { full_name: 'Guru A' },
  },
  {
    id: '2', tanggal: '2026-08-05', judul_materi: 'Trigonometri', catatan: 'Perlu latihan',
    guru_id: 'g2', siswa_id: 's2', status: 'Menunggu',
    siswa: { full_name: 'Siswa B' }, guruProfile: { full_name: 'Guru B' },
  },
];

describe('useEntriesFilter', () => {
  it('mengembalikan semua entries ketika tidak ada filter aktif', () => {
    const { result } = renderHook(() => useEntriesFilter(sampleEntries));
    expect(result.current.filteredEntries).toHaveLength(2);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('memfilter berdasarkan status', () => {
    const { result } = renderHook(() => useEntriesFilter(sampleEntries));
    act(() => result.current.setFilterStatus('Menunggu'));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('2');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('memfilter berdasarkan pencarian judul materi', () => {
    const { result } = renderHook(() => useEntriesFilter(sampleEntries));
    act(() => result.current.setSearch('trigono'));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].judul_materi).toBe('Trigonometri');
  });

  it('resetFilters mengembalikan semua filter ke default', () => {
    const { result } = renderHook(() => useEntriesFilter(sampleEntries));
    act(() => {
      result.current.setFilterStatus('Menunggu');
      result.current.setSearch('trigono');
    });
    act(() => result.current.resetFilters());
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filteredEntries).toHaveLength(2);
  });

  it('bulanOptions berisi daftar unik bulan dari entries', () => {
    const { result } = renderHook(() => useEntriesFilter(sampleEntries));
    expect(result.current.bulanOptions).toEqual(['Semua Bulan', 'Agustus 2026']);
  });
});
