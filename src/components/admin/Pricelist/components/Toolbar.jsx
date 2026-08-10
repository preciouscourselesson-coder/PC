import React from 'react';
import { C } from '../constants';

const Toolbar = ({
  importing,
  exporting,
  hasFilteredItems,
  importInputRef,
  onDownloadTemplate,
  onImportFile,
  onExport,
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: C.dark, margin: 0 }}>Daftar Pricelist</h2>
        <p style={{ fontSize: '0.8rem', color: C.gray, margin: '2px 0 0' }}>Kelola paket &amp; harga bimbingan belajar</p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={onDownloadTemplate}
          style={{ background: C.white, border: `1.5px solid ${C.border}`, color: C.dark, padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
        >
          &#8681; Unduh Template
        </button>
        <button
          onClick={() => importInputRef.current && importInputRef.current.click()}
          disabled={importing}
          style={{ background: C.white, border: `1.5px solid ${C.gold}`, color: C.goldDark, padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.6 : 1 }}
        >
          {importing ? 'Mengimpor...' : '\u2191 Import Excel'}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={onImportFile}
          style={{ display: 'none' }}
        />
        <button
          onClick={onExport}
          disabled={exporting || !hasFilteredItems}
          style={{ background: C.gold, border: 'none', color: C.white, padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: (exporting || !hasFilteredItems) ? 'default' : 'pointer', opacity: (exporting || !hasFilteredItems) ? 0.6 : 1 }}
        >
          &#8595; Export Excel
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
