import React from 'react';
import { C, selectStyle, SESI_STATUS_COLOR, SESI_TABS, PAGE_SIZE } from '../theme';
import { formatTanggalSingkat } from '../utils/formatters';
import { IconBtn } from './IconBtn';
import { Pagination } from './Pagination';
import { StatusTabBar } from './StatusTabBar';
import { ErrorBanner } from './ErrorBanner';
import { SearchInput } from './SearchInput';

// Tab "Sesi Pembelajaran" (tabel sesi_pembelajaran).
export const SesiPembelajaranTab = ({
  search, onSearchChange,
  siswaFilter, onSiswaFilterChange, siswaOptions,
  statusFilter, onStatusFilterChange,
  counts,
  sesiError,
  loading,
  page,
  pageRows,
  totalPages,
  filteredCount,
  onPrevPage, onNextPage,
  busyId,
  onStatusChange,
  onDelete,
}) => (
  <>
    <SearchInput value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Cari judul materi, catatan, siswa, atau guru..." />

    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
      <select value={siswaFilter} onChange={e => onSiswaFilterChange(e.target.value)} style={selectStyle}>
        <option value="">Semua Siswa</option>
        {siswaOptions.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>

    <StatusTabBar tabs={SESI_TABS} active={statusFilter} counts={counts} onChange={onStatusFilterChange} />

    <ErrorBanner message={sesiError} />

    <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: C.cream, textAlign: 'left' }}>
              {['No', 'Siswa', 'Guru', 'Tanggal', 'Judul Materi', 'Catatan', 'Bukti', 'Status', 'Aksi'].map(h => (
                <th key={h} style={{ padding: '12px 16px', color: C.gray, fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Memuat data sesi pembelajaran...</td></tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Tidak ada sesi yang cocok dengan filter ini.</td></tr>
            )}
            {!loading && pageRows.map((item, idx) => {
              const badge = SESI_STATUS_COLOR[item.status] || { color: C.gray, bg: C.cream };
              const isBusy = busyId === item.id;
              return (
                <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px', color: C.gray }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td style={{ padding: '12px 16px', color: C.dark, fontWeight: 'bold' }}>{item.siswaNama}</td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.guruNama}</td>
                  <td style={{ padding: '12px 16px', color: C.gray, whiteSpace: 'nowrap' }}>{formatTanggalSingkat(item.tanggal)}</td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.judul_materi}</td>
                  <td style={{ padding: '12px 16px', color: C.gray, maxWidth: '220px' }}>{item.catatan || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.bukti_urls && item.bukti_urls.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {item.bukti_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: '0.78rem', textDecoration: 'none' }}>📎 File {i + 1}</a>
                        ))}
                      </div>
                    ) : <span style={{ color: C.gray }}>-</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', background: badge.bg, color: badge.color }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <IconBtn title="Setujui" color={C.success} bg={C.successBg} disabled={isBusy || item.status === 'Disetujui'} onClick={() => onStatusChange(item, 'Disetujui')}>✓</IconBtn>
                      <IconBtn title="Tolak" color={C.danger} bg={C.dangerBg} disabled={isBusy || item.status === 'Ditolak'} onClick={() => onStatusChange(item, 'Ditolak')}>✕</IconBtn>
                      <IconBtn title="Hapus" color={C.danger} bg={C.dangerBg} disabled={isBusy} onClick={() => onDelete(item)}>🗑️</IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {!loading && (
      <Pagination page={page} totalPages={totalPages} total={filteredCount} itemLabel="sesi"
        onPrev={onPrevPage} onNext={onNextPage} />
    )}
  </>
);

export default SesiPembelajaranTab;
