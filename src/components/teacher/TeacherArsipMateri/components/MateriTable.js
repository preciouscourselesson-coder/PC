import React from 'react';
import { C } from '../../../shared/Theme';
import { KATEGORI_STYLE, KATEGORI_LABEL, JENIS_STYLE } from '../constants';
import { fileIcon, formatTanggal } from '../utils';
import { Badge } from './Badge';
import { IconBtn } from './IconBtn';

export const MateriTable = ({ items, statusStyle, onView, onEdit, onArchive, onDelete }) => (
  <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
      <thead>
        <tr style={{ background: C.cream, textAlign: 'left' }}>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Judul Materi</th>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Kategori</th>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Kelas</th>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Mapel</th>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Bab / Topik</th>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Sub Bab</th>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Tanggal Publish</th>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Status</th>
          <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const icon = fileIcon(item.tipe);
          const badge = statusStyle[item.status] || statusStyle.Draft;
          return (
            <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${icon.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                    {icon.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', color: C.dark }}>{item.nama}</div>
                    {item.deskripsi && (
                      <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>{item.deskripsi}</div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                  <Badge label={KATEGORI_LABEL[item.kategori] || 'Pribadi'} style={KATEGORI_STYLE[item.kategori] || KATEGORI_STYLE.Pribadi} />
                  {item.jenis && <Badge label={item.jenis} style={JENIS_STYLE[item.jenis] || JENIS_STYLE.Materi} />}
                  {item.folder_materi?.nama && (
                    <span style={{ fontSize: '0.72rem', color: C.gray }}>📂 {item.folder_materi.nama}</span>
                  )}
                  {item.kategori === 'Sekolah' && item.pengajar && (
                    <span style={{ fontSize: '0.72rem', color: C.gray }}>Pengajar: {item.pengajar}</span>
                  )}
                </div>
              </td>
              <td style={{ padding: '12px 16px', color: C.dark }}>{item.kelas || '-'}</td>
              <td style={{ padding: '12px 16px', color: C.dark }}>{item.mapel || '-'}</td>
              <td style={{ padding: '12px 16px', color: C.dark }}>{item.bab || '-'}</td>
              <td style={{ padding: '12px 16px', color: C.dark }}>{item.sub_bab || '-'}</td>
              <td style={{ padding: '12px 16px', color: C.gray }}>{formatTanggal(item.tanggal)}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', background: badge.bg, color: badge.color }}>
                  {item.status}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <IconBtn title="Lihat file" color={C.blue} bg={C.blueBg} onClick={() => onView(item)}>👁️</IconBtn>
                  <IconBtn title="Edit" color={C.gold} bg={C.goldBg} onClick={() => onEdit(item)}>✏️</IconBtn>
                  {item.kategori !== 'Pribadi' && (
                    <IconBtn
                      title={item.status === 'Diarsipkan' ? 'Pulihkan' : 'Arsipkan'}
                      color="#b45309" bg="rgba(180,83,9,0.10)"
                      onClick={() => onArchive(item)}
                    >
                      {item.status === 'Diarsipkan' ? '📤' : '📦'}
                    </IconBtn>
                  )}
                  <IconBtn title="Hapus" color={C.red} bg={C.redBg} onClick={() => onDelete(item)}>🗑️</IconBtn>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
