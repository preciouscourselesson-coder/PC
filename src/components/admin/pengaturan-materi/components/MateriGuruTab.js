import React from 'react';
import { C, selectStyle, STATUS_COLOR, STATUS_DB_TO_LABEL, MATERI_TABS, PAGE_SIZE } from '../theme';
import { formatTanggal } from '../utils/formatters';
import { IconBtn } from './IconBtn';
import { Pagination } from './Pagination';
import { StatusTabBar } from './StatusTabBar';
import { ErrorBanner } from './ErrorBanner';
import { SearchInput } from './SearchInput';

// Tab "Materi Guru" (tabel materi_file). Semua state & logika bisnis
// (filter, paginasi, arsip, edit) datang dari hook useMateriGuru dan
// diteruskan lewat props — komponen ini murni presentational.
export const MateriGuruTab = ({
  search, onSearchChange,
  mapelFilter, onMapelFilterChange, mapelOptions,
  guruFilter, onGuruFilterChange, guruOptions,
  kelasFilter, onKelasFilterChange, kelasOptions,
  statusFilter, onStatusFilterChange,
  materiCounts,
  materiError,
  loading,
  page,
  materiPageRows,
  materiTotalPages,
  filteredCount,
  onPrevPage, onNextPage,
  busyId,
  onArchiveToggle,
  onEdit,
  onDelete,
}) => (
  <>
    <SearchInput value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Cari judul materi, guru, mapel, bab..." />

    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
      <select value={mapelFilter} onChange={e => onMapelFilterChange(e.target.value)} style={selectStyle}>
        <option value="">Semua Mapel</option>
        {mapelOptions.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={guruFilter} onChange={e => onGuruFilterChange(e.target.value)} style={selectStyle}>
        <option value="">Semua Guru</option>
        {guruOptions.map(g => <option key={g.user_id} value={g.user_id}>{g.nama}</option>)}
      </select>
      <select value={kelasFilter} onChange={e => onKelasFilterChange(e.target.value)} style={selectStyle}>
        <option value="">Semua Kelas</option>
        {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
      </select>
      <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)} style={selectStyle}>
        <option value="">Semua Status</option>
        <option value="Dipublish">Aktif</option>
        <option value="Draft">Draft</option>
        <option value="Diarsipkan">Diarsipkan</option>
      </select>
    </div>

    <StatusTabBar tabs={MATERI_TABS} active={statusFilter} counts={materiCounts} onChange={onStatusFilterChange} />

    <ErrorBanner message={materiError} />

    <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: C.cream, textAlign: 'left' }}>
              {['No', 'Judul Materi', 'Mapel', 'Bab / Topik', 'Kelas', 'Teacher', 'Tanggal Publish', 'Status', 'Aksi'].map(h => (
                <th key={h} style={{ padding: '12px 16px', color: C.gray, fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Memuat data materi...</td></tr>
            )}
            {!loading && materiPageRows.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Tidak ada materi yang cocok dengan filter ini.</td></tr>
            )}
            {!loading && materiPageRows.map((item, idx) => {
              const badge = STATUS_COLOR[item.status] || { color: C.gray, bg: C.cream };
              const isBusy = busyId === item.id;
              return (
                <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px', color: C.gray }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 'bold', color: C.dark }}>{item.nama}</div>
                    {item.deskripsi && <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>{item.deskripsi}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.mapel || '-'}</td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.bab || '-'}</td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.kelas || '-'}</td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.diupload_oleh || '-'}</td>
                  <td style={{ padding: '12px 16px', color: C.gray, whiteSpace: 'nowrap' }}>{formatTanggal(item.tanggal)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', background: badge.bg, color: badge.color }}>
                      {STATUS_DB_TO_LABEL[item.status] || item.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <IconBtn title={item.status === 'Diarsipkan' ? 'Aktifkan kembali' : 'Arsipkan'} color="#b45309" bg="rgba(180,83,9,0.10)" disabled={isBusy} onClick={() => onArchiveToggle(item)}>
                        {item.status === 'Diarsipkan' ? '📤' : '📦'}
                      </IconBtn>
                      <IconBtn title="Edit" color={C.blue} bg={C.blueBg} disabled={isBusy} onClick={() => onEdit(item)}>✏️</IconBtn>
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
      <Pagination page={page} totalPages={materiTotalPages} total={filteredCount} itemLabel="materi"
        onPrev={onPrevPage} onNext={onNextPage} />
    )}
  </>
);

export default MateriGuruTab;
