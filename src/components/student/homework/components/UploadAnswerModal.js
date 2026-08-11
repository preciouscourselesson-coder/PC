import React from 'react';
import { C } from '../constants';

// ─── Modal Upload Jawaban ────────────────────────────────────────────────────
export const UploadAnswerModal = ({
  show,
  taskTitle,
  uploadFile,
  errorMsg,
  uploading,
  isMobile,
  onClose,
  onFileChange,
  onSubmit,
}) => {
  if (!show) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: '20px',
          padding: '1.5rem',
          maxWidth: '450px',
          width: '100%',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', color: C.dark }}>Upload Jawaban Tugas</h3>
        <p style={{ color: C.gray, fontSize: '0.85rem', marginBottom: '1rem' }}>
          {taskTitle}
        </p>

        <div style={{
          border: `2px dashed ${C.border}`,
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          background: C.cream,
          cursor: 'pointer',
        }}
        onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
          {uploadFile ? (
            <div>
              <div style={{ fontSize: '1.5rem' }}>📎</div>
              <div style={{ fontWeight: 'bold', color: C.dark }}>{uploadFile.name}</div>
              <div style={{ fontSize: '0.75rem', color: C.gray }}>
                {(uploadFile.size / 1024).toFixed(0)} KB
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '1.5rem' }}>📤</div>
              <div style={{ fontSize: '0.85rem', color: C.gray }}>
                Klik untuk pilih file atau drag & drop
              </div>
              <div style={{ fontSize: '0.7rem', color: C.gray, marginTop: '4px' }}>
                PDF, JPG, PNG (Maks. 5MB)
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div style={{ color: C.red, fontSize: '0.82rem', marginTop: '0.5rem' }}>{errorMsg}</div>
        )}

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '0.6rem', marginTop: '1.2rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: `1.5px solid ${C.border}`,
              background: 'transparent',
              color: C.gray,
              fontWeight: '600',
              cursor: 'pointer',
              width: isMobile ? '100%' : 'auto',
              minHeight: isMobile ? '44px' : 'auto',
            }}
          >
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={!uploadFile || uploading}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: !uploadFile || uploading ? C.border : C.primary,
              color: C.white,
              fontWeight: '700',
              cursor: !uploadFile || uploading ? 'not-allowed' : 'pointer',
              opacity: !uploadFile || uploading ? 0.6 : 1,
              width: isMobile ? '100%' : 'auto',
              minHeight: isMobile ? '44px' : 'auto',
            }}
          >
            {uploading ? 'Mengunggah...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  );
};
