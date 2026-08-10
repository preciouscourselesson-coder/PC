import React from 'react';
import { C, selectStyle, JENIS_COLOR, BANK_TABS, PAGE_SIZE } from '../theme';
import { formatTanggalSingkat } from '../utils/formatters';
import { IconBtn } from './IconBtn';
import { Pagination } from './Pagination';
import { StatusTabBar } from './StatusTabBar';
import { ErrorBanner } from './ErrorBanner';
import { SearchInput } from './SearchInput';

// Tab "Bank Soal Siswa" (tabel bank_soal_siswa).
export const BankSoalTab = ({
  search, onSearchChange,
  siswaFilter, onSiswaFilterChange, siswaOptions,
  jenisFilter, onJenisFilterChange,
  counts,
  bankError,
  loading,
  page,
  pageRows,
  totalPages,
  filteredCount,
  onPrevPage, onNextPage,
  busyId,
  onDelete,
}) => (
  <>
    <SearchInput value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Cari judul, bab, sub bab, atau siswa..." />

    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
      <select value={siswaFilter} onChange={e => onSiswaFilterChange(e.target.value)} style={selectStyle}>
        <option value="">Semua Siswa</option>
        {siswaOptions.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>

    <StatusTabBar tabs={BANK_TABS} active={jenisFilter} counts={counts} onChange={onJenisFilterChange} />

    <ErrorBanner message={bankError} />

    <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: C.cream, textAlign: 'left' }}>
              {['No', 'Siswa', 'Jenis', 'Bab / Sub Bab', 'Judul', 'File', 'Tanggal', 'Aksi'].map(h => (
                <th key={h} style={{ padding: '12px 16px', color: C.gray, fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Memuat data bank soal siswa...</td></tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Tidak ada data yang cocok dengan filter ini.</td></tr>
            )}
            {!loading && pageRows.map((item, idx) => {
              const badge = JENIS_COLOR[item.jenis] || { color: C.gray, bg: C.cream };
              const isBusy = busyId === item.id;
              return (
                <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px', color: C.gray }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td style={{ padding: '12px 16px', color: C.dark, fontWeight: 'bold' }}>{item.siswaNama}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', background: badge.bg, color: badge.color }}>
                      {item.jenis === 'Ulangan' ? 'Ulangan (PH)' : item.jenis}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.bab}{item.sub_bab ? ` / ${item.sub_bab}` : ''}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 'bold', color: C.dark }}>{item.judul}</div>
                    {item.deskripsi && <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>{item.deskripsi}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.file_url
                      ? <a href={item.file_url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: '0.82rem', textDecoration: 'none' }}>📎 {item.file_name || 'Lihat file'}</a>
                      : <span style={{ color: C.gray }}>-</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: C.gray, whiteSpace: 'nowrap' }}>{formatTanggalSingkat(item.created_at)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
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
      <Pagination page={page} totalPages={totalPages} total={filteredCount} itemLabel="data"
        onPrev={onPrevPage} onNext={onNextPage} />
    )}
  </>
);

export default BankSoalTab;
