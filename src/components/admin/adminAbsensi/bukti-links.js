// src/components/admin/adminAbsensi/bukti-links.js
import React from 'react';
import { fileTypeFromUrl, fileNameFromUrl } from './admin-absensi-helpers';

const BuktiLinks = ({ urls, size = 22 }) => {
  if (!urls || urls.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noreferrer"
          title={fileNameFromUrl(url)}
          style={{
            width: `${size}px`, height: `${size}px`, borderRadius: '6px',
            background: fileTypeFromUrl(url) === 'pdf' ? '#e0574f' : '#3f7ea6',
            color: '#fff', fontSize: '0.55rem', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
          }}
        >
          {fileTypeFromUrl(url) === 'pdf' ? 'PDF' : 'IMG'}
        </a>
      ))}
    </div>
  );
};

export default BuktiLinks;
