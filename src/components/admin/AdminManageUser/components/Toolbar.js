// Baris tombol aksi utama di atas tabel: tambah user, download template, import/export Excel, generate referral.
import React from 'react';
import { C } from '../constants';

const Toolbar = ({
  onAddUser,
  onDownloadTemplate,
  onImportClick,
  onImportFileChange,
  onExport,
  onGenerateAllReferrals,
  importing,
  fileInputRef,
}) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
    <button
      onClick={onAddUser}
      style={{
        padding: '9px 16px', borderRadius: '10px', border: 'none',
        background: C.gold, color: C.white, fontSize: '0.85rem', fontWeight: 'bold',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      + Tambah User
    </button>
    <button
      onClick={onDownloadTemplate}
      style={{
        padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
        background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      📋 Download Template
    </button>
    <button
      onClick={onImportClick}
      disabled={importing}
      style={{
        padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
        background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
        cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        opacity: importing ? 0.6 : 1,
      }}
    >
      {importing ? 'Mengimpor...' : '📂 Import Excel'}
    </button>
    <input
      type="file" accept=".xlsx,.xls" ref={fileInputRef}
      onChange={onImportFileChange} style={{ display: 'none' }}
    />
    <button
      onClick={onExport}
      style={{
        padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
        background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      📎 Ekspor Excel
    </button>
    <button
      onClick={onGenerateAllReferrals}
      disabled={importing}
      style={{
        padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.gold}`,
        background: C.white, color: C.gold, fontSize: '0.85rem', fontWeight: 'bold',
        cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        opacity: importing ? 0.6 : 1,
      }}
    >
      🎟️ Generate Kode Referral
    </button>
  </div>
);

export default Toolbar;
