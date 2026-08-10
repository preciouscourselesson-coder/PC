// src/components/admin/adminAbsensi/entries-table-desktop.js
import React from 'react';
import { C } from '../../Theme';
import { formatTanggalDisplay, initials, avatarColor, statusStyle } from './admin-absensi-helpers';
import BuktiLinks from './bukti-links';
import RowActionsMenu from './row-actions-menu';

const EntriesTableDesktop = ({
  loadingEntries,
  filteredEntries,
  updatingId,
  openMenuId,
  onToggleMenu,
  onUpdateStatus,
  onOpenEditDate,
  onOpenDelete,
}) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ background: C.cream }}>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>No.</th>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tanggal</th>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Guru</th>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Judul Materi Ajar</th>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Catatan</th>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Bukti</th>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
          <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {loadingEntries && (
          <tr>
            <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Memuat data pertemuan...</td>
          </tr>
        )}
        {!loadingEntries && filteredEntries.map((item, idx) => {
          const st = statusStyle(item.status);
          const namaSiswa = item.siswa?.full_name || 'Siswa tidak ditemukan';
          const namaGuru = item.guruProfile?.full_name || 'Guru tidak ditemukan';
          return (
            <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '10px', color: C.gray }}>{idx + 1}</td>
              <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{formatTanggalDisplay(item.tanggal)}</td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: avatarColor(namaGuru), color: C.white,
                      fontSize: '0.6rem', fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {initials(namaGuru)}
                  </span>
                  <span>{namaGuru}</span>
                </div>
              </td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: avatarColor(namaSiswa), color: C.white,
                      fontSize: '0.6rem', fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {initials(namaSiswa)}
                  </span>
                  <span>{namaSiswa}</span>
                </div>
              </td>
              <td style={{ padding: '10px', fontWeight: '500', minWidth: '160px' }}>{item.judul_materi}</td>
              <td style={{ padding: '10px', maxWidth: '220px', color: C.gray, wordBreak: 'break-word' }}>
                {item.catatan || '-'}
              </td>
              <td style={{ padding: '10px' }}>
                {(!item.bukti_urls || item.bukti_urls.length === 0) ? (
                  <span style={{ color: C.grayLight }}>-</span>
                ) : (
                  <BuktiLinks urls={item.bukti_urls} size={22} />
                )}
              </td>
              <td style={{ padding: '10px' }}>
                <span style={{ background: st.bg, color: st.fg, padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {item.status}
                </span>
              </td>
              <td style={{ padding: '10px', position: 'relative' }}>
                <RowActionsMenu
                  item={item}
                  updatingId={updatingId}
                  isMenuOpen={openMenuId === item.id}
                  onToggleMenu={onToggleMenu}
                  onUpdateStatus={onUpdateStatus}
                  onOpenEditDate={onOpenEditDate}
                  onOpenDelete={onOpenDelete}
                />
              </td>
            </tr>
          );
        })}
        {!loadingEntries && filteredEntries.length === 0 && (
          <tr>
            <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
              Belum ada pertemuan yang cocok dengan filter ini.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default EntriesTableDesktop;
