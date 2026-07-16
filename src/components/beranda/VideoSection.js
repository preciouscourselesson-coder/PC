import React, { useState } from 'react';

// =============================================
// EDIT VIDEO DI SINI
// Ganti videoId dengan ID dari URL YouTube kamu
// Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ
//                                          ↑ ini videoId-nya
// =============================================
const videosData = [
  {
    videoId: 'RKduclXbXgI',
    title: 'Pembahasan Statistika Kelas X',
    subject: 'Matematika'
  },
  {
    videoId: 'xFjnsDucWu0',
    title: 'Pembahasan Kurva Kuadrat Kelas X',
    subject: 'Matematika'
  },
  {
    videoId: 'bMt41OpHiC8',
    title: 'Rumus Empiris dan Rumus Molekul Kelas X',
    subject: 'Kimia'
  }
];

const VideoSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const activeVideo = videosData[activeIndex];

  const handleSelectVideo = (idx) => {
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      setPlaying(false); // reset ke thumbnail saat ganti video
    }
  };

  return (
    <section id="video" style={{ background: '#ffffff', padding: '48px 5%', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#b4964b', fontSize: '1rem', letterSpacing: '2px', marginBottom: '8px', fontWeight: 'bold' }}>
          VIDEO PEMBAHASAN
        </h2>
        <h3 style={{ color: '#171411', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', fontWeight: 'bold', margin: 0 }}>
          Belajar Lewat Pembahasan Video
        </h3>
      </div>

      {/* Konten: embed + daftar */}
      <div className="video-grid" style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        alignItems: 'start',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Kiri: Thumbnail atau YouTube Embed */}
        <div style={{
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
          background: '#000',
          aspectRatio: '16/9',
          position: 'relative',
          cursor: 'pointer'
        }}>
          {playing ? (
            <iframe
              key={activeVideo.videoId}
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1`}
              title={activeVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ display: 'block', width: '100%', height: '100%' }}
            />
          ) : (
            <div
              onClick={() => setPlaying(true)}
              style={{ position: 'relative', width: '100%', height: '100%' }}
            >
              {/* Thumbnail YouTube */}
              <img
                src={`https://img.youtube.com/vi/${activeVideo.videoId}/hqdefault.jpg`}
                alt={activeVideo.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Overlay gelap */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {/* Tombol Play */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: '#b4964b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span style={{ color: 'white', fontSize: '1.6rem', marginLeft: '4px' }}>▶</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kanan: Daftar Video */}
        <div className="video-list" style={{
          background: '#1e1e2f',
          borderRadius: '24px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <p style={{ color: 'white', fontWeight: 'bold', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
            📋 Daftar Video
          </p>
          {videosData.map((video, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectVideo(idx)}
              style={{
                background: idx === activeIndex ? '#b4964b' : '#2d2d3a',
                border: 'none',
                borderRadius: '16px',
                padding: '10px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                if (idx !== activeIndex) e.currentTarget.style.background = '#3a3a4a';
              }}
              onMouseLeave={(e) => {
                if (idx !== activeIndex) e.currentTarget.style.background = '#2d2d3a';
              }}
            >
              <span style={{
                fontSize: '0.7rem',
                background: idx === activeIndex ? 'rgba(255,255,255,0.25)' : '#2d6a4f',
                color: 'white',
                padding: '2px 10px',
                borderRadius: '20px',
                display: 'inline-block',
                marginBottom: '4px'
              }}>
                {video.subject}
              </span>
              <span style={{
                color: 'white',
                fontWeight: idx === activeIndex ? 'bold' : 'normal',
                fontSize: '0.88rem'
              }}>
                {idx === activeIndex && playing ? '▶ ' : '📘 '}{video.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .video-grid {
            grid-template-columns: 1fr !important;
          }
          .video-list {
            max-height: none;
          }
        }
      `}</style>
    </section>
  );
};

export default VideoSection;