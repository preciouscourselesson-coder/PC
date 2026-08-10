import React from 'react';
import { C } from '../constants';

const ImportSummaryBanner = ({ importSummary }) => {
  if (!importSummary) return null;
  const hasErrors = importSummary.errors.length > 0;

  return (
    <div style={{
      marginBottom: '1.1rem', padding: '0.85rem 1rem', borderRadius: '10px',
      background: hasErrors ? C.amberBg : C.greenBg,
      border: `1px solid ${hasErrors ? C.amber : C.green}`,
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: hasErrors ? C.amber : C.green }}>
        {importSummary.success} data berhasil diimpor{hasErrors ? `, ${importSummary.errors.length} baris gagal` : ''}.
      </div>
      {hasErrors && (
        <ul style={{ margin: '6px 0 0', paddingLeft: '1.1rem', fontSize: '0.76rem', color: C.dark }}>
          {importSummary.errors.slice(0, 10).map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
          {importSummary.errors.length > 10 && <li>...dan {importSummary.errors.length - 10} error lainnya.</li>}
        </ul>
      )}
    </div>
  );
};

export default ImportSummaryBanner;
