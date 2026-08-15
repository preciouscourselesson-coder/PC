import React from 'react';
import { C } from '../../../shared/Theme';

// Modal tanya-dulu ketika sinkronisasi folder-per-siswa menemukan nama folder
// yang persis sama dengan folder lain yang sudah ada (kemungkinan: siswa baru
// dengan nama yang kebetulan sama dengan siswa/folder lain).
export const StudentFolderConflictModal = ({ conflict, onResolve }) => {
  if (!conflict) return null;
  const { student, existingFolder } = conflict;
  const btnStyle = {
    padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.white,
    color: C.dark, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', textAlign: 'left',
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 250, padding: '1rem',
    }}>
      <div style={{ background: C.white, padding: '1.4rem', width: '380px', maxWidth: '100%', borderRadius: '16px', boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '8px', color: C.dark }}>Nama Folder Sudah Ada</div>
        <div style={{ color: C.gray, fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.5 }}>
          Siswa <strong>{student.nama}</strong> baru saja masuk ke daftar siswa Anda dan seharusnya dibuatkan folder otomatis. Tapi sudah ada folder dengan nama persis sama: <strong>"{existingFolder.nama}"</strong>. Mungkin ini folder yang memang untuk siswa ini, atau kebetulan ada siswa lain dengan nama yang sama. Pilih salah satu:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button style={btnStyle} onClick={() => onResolve('use-existing')}>
            ✅ Pakai folder "{existingFolder.nama}" yang sudah ada untuk siswa ini
          </button>
          <button style={btnStyle} onClick={() => onResolve('create-new')}>
            ➕ Buat folder baru terpisah (nama sama, folder berbeda)
          </button>
          <button style={btnStyle} onClick={() => onResolve('skip')}>
            ⏭️ Putuskan nanti — lewati dulu
          </button>
        </div>
      </div>
    </div>
  );
};
