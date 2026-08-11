import React, { useState } from 'react';
import { C } from '../constants';

// ─── Media Soal: Gambar & Audio yang disisipkan guru (responsif desktop & HP) ─
// Menampilkan gambar/audio soal dengan penanganan error (jika URL gagal
// dimuat, siswa tetap melihat pesan yang jelas, bukan tampilan kosong),
// ukuran yang menyesuaikan layar, dan gambar bisa di-tap untuk diperbesar
// (penting di layar smartphone yang kecil).
export const QuestionMedia = ({ imageUrl, audioUrl, isMobile }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [audioError, setAudioError] = useState(false);

  if (!imageUrl && !audioUrl) return null;

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      {imageUrl && (
        imageError ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: C.redBg, color: C.red, borderRadius: '10px',
            padding: '0.6rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.5rem',
          }}>
            ⚠️ Gambar soal gagal dimuat. Coba muat ulang halaman.
          </div>
        ) : (
          <div
            onClick={() => setLightboxOpen(true)}
            style={{ position: 'relative', display: 'inline-block', cursor: 'zoom-in', maxWidth: '100%', marginBottom: '0.5rem' }}
          >
            <img
              src={imageUrl}
              alt="Gambar soal dari guru"
              loading="lazy"
              onError={() => setImageError(true)}
              style={{
                display: 'block',
                width: '100%',
                maxWidth: isMobile ? '100%' : '420px',
                maxHeight: isMobile ? '200px' : '260px',
                objectFit: 'contain',
                borderRadius: '10px',
                border: `1.5px solid ${C.border}`,
                background: C.cream,
              }}
            />
            <span style={{
              position: 'absolute', bottom: '6px', right: '6px',
              background: 'rgba(0,0,0,0.55)', color: C.white,
              fontSize: '0.65rem', padding: '2px 8px', borderRadius: '40px',
              fontWeight: 'bold', pointerEvents: 'none',
            }}>
              🔍 Perbesar
            </span>
          </div>
        )
      )}

      {audioUrl && (
        audioError ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: C.redBg, color: C.red, borderRadius: '10px',
            padding: '0.6rem 0.8rem', fontSize: '0.8rem',
          }}>
            ⚠️ Audio soal gagal dimuat. Coba muat ulang halaman.
          </div>
        ) : (
          <audio
            src={audioUrl}
            controls
            preload="metadata"
            onError={() => setAudioError(true)}
            style={{ width: '100%', maxWidth: isMobile ? '100%' : '380px', height: '38px', display: 'block' }}
          />
        )
      )}

      {lightboxOpen && !imageError && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.2rem', cursor: 'zoom-out',
          }}
        >
          <img
            src={imageUrl}
            alt="Gambar soal (diperbesar)"
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', objectFit: 'contain' }}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Tutup"
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.15)', border: 'none', color: C.white,
              width: '36px', height: '36px', borderRadius: '50%',
              fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
