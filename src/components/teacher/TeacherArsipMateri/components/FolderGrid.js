import React from 'react';
import { C } from '../../../shared/Theme';
import { FolderTile } from './FolderTile';

export const FolderGrid = ({
  isMobile,
  totalCount,
  countNoFolder,
  activeFolderId,
  onSelectFolder,
  folders,
  countInFolder,
  onDeleteFolder,
  onRenameFolder,
  onAddFolder,
}) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px', marginBottom: '1.2rem',
  }}>
    <FolderTile
      icon="📋"
      label="Semua Materi"
      count={totalCount}
      active={activeFolderId === 'all'}
      onClick={() => onSelectFolder('all')}
    />
    <FolderTile
      icon="📄"
      label="Tanpa Folder"
      count={countNoFolder}
      active={activeFolderId === 'none'}
      onClick={() => onSelectFolder('none')}
    />
    {folders.map(f => (
      <FolderTile
        key={f.id}
        icon={f.siswa_id ? '🎓' : '📂'}
        label={f.nama}
        count={countInFolder(f.id)}
        active={activeFolderId === f.id}
        onClick={() => onSelectFolder(f.id)}
        onDelete={() => onDeleteFolder(f)}
        onRename={() => onRenameFolder(f)}
        isStudentFolder={!!f.siswa_id}
      />
    ))}
    <div
      role="button"
      tabIndex={0}
      onClick={onAddFolder}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAddFolder(); } }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
        borderRadius: '12px', border: `1.5px dashed ${C.border}`, color: C.gray, padding: '0.8rem',
        cursor: 'pointer', boxSizing: 'border-box',
      }}
    >
      <span style={{ fontSize: '1rem' }}>➕</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Folder Baru</span>
    </div>
  </div>
);
