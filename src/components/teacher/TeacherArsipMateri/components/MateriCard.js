import React from 'react';
import { C } from '../../../shared/Theme';
import { KATEGORI_STYLE, KATEGORI_LABEL, JENIS_STYLE } from '../constants';
import { formatTanggal } from '../utils';
import { Badge } from './Badge';
import { IconBtn } from './IconBtn';

export const MateriCard = ({ item, badge, icon, onView, onEdit, onArchive, onDelete }) => (
  <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${icon.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
        {icon.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.95rem', wordBreak: 'break-word' }}>{item.nama}</div>
        {item.deskripsi && (
          <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px', wordBreak: 'break-word' }}>{item.deskripsi}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
          {item.kategori && <Badge label={KATEGORI_LABEL[item.kategori] || 'Pribadi'} style={KATEGORI_STYLE[item.kategori] || KATEGORI_STYLE.Pribadi} />}
          {item.jenis && <Badge label={item.jenis} style={JENIS_STYLE[item.jenis] || JENIS_STYLE.Materi} />}
          {item.folder_materi?.nama && <Badge label={`📂 ${item.folder_materi.nama}`} style={{ bg: C.grayBg, color: C.gray }} />}
        </div>
      </div>
      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 'bold', background: badge.bg, color: badge.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {item.status}
      </span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '6px', columnGap: '8px', fontSize: '0.82rem' }}>
      <div style={{ color: C.gray }}>Kelas</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{item.kelas || '-'}</div>

      <div style={{ color: C.gray }}>Mapel</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{item.mapel || '-'}</div>

      <div style={{ color: C.gray }}>Bab / Topik</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{item.bab || '-'}</div>

      {item.sub_bab && (
        <>
          <div style={{ color: C.gray }}>Sub Bab</div>
          <div style={{ color: C.dark, textAlign: 'right' }}>{item.sub_bab}</div>
        </>
      )}

      {item.kategori === 'Sekolah' && (
        <>
          <div style={{ color: C.gray }}>Pengajar</div>
          <div style={{ color: C.dark, textAlign: 'right' }}>{item.pengajar || '-'}</div>
        </>
      )}

      <div style={{ color: C.gray }}>Tanggal</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{formatTanggal(item.tanggal)}</div>
    </div>

    <div style={{ display: 'flex', gap: '8px', borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '2px' }}>
      <IconBtn title="Lihat file" color={C.blue} bg={C.blueBg} onClick={onView} size={38}>👁️</IconBtn>
      <IconBtn title="Edit" color={C.gold} bg={C.goldBg} onClick={onEdit} size={38}>✏️</IconBtn>
      {item.kategori !== 'Pribadi' && (
        <IconBtn
          title={item.status === 'Diarsipkan' ? 'Pulihkan' : 'Arsipkan'}
          color="#b45309" bg="rgba(180,83,9,0.10)"
          onClick={onArchive}
          size={38}
        >
          {item.status === 'Diarsipkan' ? '📤' : '📦'}
        </IconBtn>
      )}
      <IconBtn title="Hapus" color={C.red} bg={C.redBg} onClick={onDelete} size={38}>🗑️</IconBtn>
    </div>
  </div>
);
