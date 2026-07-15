import React from 'react';
import logo from '../Resource/PC_Horisontal.png';

const C = {
  gold:   '#b4964b',
  dark:   '#171411',
  gray:   '#444242',
  cream:  '#f7f6f0',
  white:  '#ffffff',
  border: '#e0ddd6',
};

const fiturData = [
  { icon: '📖', title: 'Program Terstruktur', desc: 'Materi disusun sistematis sesuai kebutuhanmu.' },
  { icon: '👤', title: 'Mentor Berpengalaman', desc: 'Dibimbing oleh mentor profesional yang suportif.' },
  { icon: '📊', title: 'Pantau Perkembangan', desc: 'Lacak progres belajarmu secara berkala.' },
];

const LeftPanel = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',             // jarak antar elemen (logo, tagline, fitur, footer)
    padding: '3rem',
    minHeight: '100vh',
    background: C.cream,
    boxSizing: 'border-box',
  }}>
    {/* Logo */}
    <div>
      <img src={logo} alt="Precious Course" style={{ height: '84px' }} />
    </div>

    {/* Tagline + Fitur */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2.2rem', color: C.dark, fontWeight: 'bold', lineHeight: 1.25, margin: '0 0 12px' }}>
          Belajar terarah,<br />
          <span style={{ color: C.gold }}>Wawasan</span> bertambah.
        </h1>
        <p style={{ color: C.gray, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
          Precious Course hadir untuk membimbing perjalanan belajarmu mencapai tujuan terbaik.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {fiturData.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              flexShrink: 0,
              background: C.white,
              border: `1.5px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {f.icon}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.95rem', marginBottom: '2px' }}>{f.title}</div>
              <div style={{ color: C.gray, fontSize: '0.85rem', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Footer - tetap di bawah dengan margin-top auto */}
    <div style={{ marginTop: 'auto' }}>
      <p style={{ color: C.gray, fontSize: '0.8rem', margin: 0, lineHeight: 1.7 }}>
        © 2026 Precious Course<br />
        Bimbingan Belajar & Mentoring
      </p>
    </div>
  </div>
);

export default LeftPanel;