import React from 'react';
import heroImage from '../../Resource/bg_people.png';
import { useNavigate } from 'react-router-dom';


const HeroFeatures = () => {
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const featuresData = [
    { icon: 'fa-user-friends', emoji: '🤝', title: 'Pendekatan Personal', desc: 'Belajar sesuai kebutuhan setiap siswa' },
    { icon: 'fa-layer-group', emoji: '📚', title: 'Materi Terstruktur', desc: 'Disusun berbagai materi yang relevan' },
    { icon: 'fa-chart-line', emoji: '📈', title: 'Evaluasi Berkala', desc: 'Monitoring progress secara rutin' },
    { icon: 'fa-laptop-house', emoji: '💻', title: 'Belajar Fleksibel', desc: 'Online maupun offline sesuai kesepakatan' }
  ];

  const navigate = useNavigate();

  return (
    <section id="HeroFeatures" style={{ background: '#f7f6f0', padding: '48px 5%', width: '100%', boxSizing: 'border-box' }}>
      <div className="hero-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr) 40%',
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>
        {/* Baris 1: Hero teks */}
        <div className="hero-text" style={{ gridColumn: '1 / span 4', gridRow: '1' }}>
          <h1 style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.2rem)', marginBottom: '12px', lineHeight: 1.2, color: '#171411' }}>
            Pendampingan Akademik untuk
          </h1>
          <h1 style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.2rem)', marginBottom: '16px', lineHeight: 1.2, color: '#171411' }}>
            <span style={{ color: '#b4964b' }}>Target Kampus Impianmu</span>
          </h1>
          <p style={{ fontSize: 'clamp(0.92rem, 2vw, 1rem)', marginBottom: '24px', color: '#444242' }}>
            Pembelajaran terstruktur, materi berkualitas, dan pendampingan personal untuk membantu kamu belajar lebih efektif dan percaya diri.
          </p>
          <div className="hero-buttons" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/konsultasi')}
              style={{ background: '#b4964b', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '40px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#bf9735'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#b4964b'}
            >
              Mulai Konsultasi Gratis →
            </button>
            <button
              onClick={() => scrollToSection('programs')}
              style={{ background: 'transparent', border: '1.5px solid #b4964b', color: '#b4964b', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', padding: '10px 24px', borderRadius: '40px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#b4964b'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#b4964b'; }}
            >
              Lihat Program ↓
            </button>
          </div>
        </div>

        {/* Kolom gambar (span 2 baris) */}
        <div className="hero-image" style={{ gridRow: 'span 2', gridColumn: '5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={heroImage}
            alt="Belajar bersama Precious Course"
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '32px' }}
          />
        </div>

        {/* Baris 2: Kartu fitur */}
        {featuresData.map((f, idx) => (
          <div key={idx} className="hero-feature-card" style={{
            gridRow: '2',
            gridColumn: idx + 1,
            background: 'white',
            padding: '1.5rem 1.2rem 1.2rem',
            borderRadius: '24px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.1), 0 6px 6px rgba(0,0,0,0.05)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            cursor: 'pointer',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            border: '1px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(180,150,75,0.25), 0 10px 10px -5px rgba(0,0,0,0.05)';
            e.currentTarget.style.border = '1px solid rgba(180,150,75,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1), 0 6px 6px rgba(0,0,0,0.05)';
            e.currentTarget.style.border = '1px solid transparent';
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #b4964b 0%, #d9b968 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 6px 14px rgba(180,150,75,0.35)'
            }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }} role="img" aria-hidden="true">{f.emoji}</span>
              <i className={`fas ${f.icon}`} style={{ display: 'none' }}></i>
            </div>
            <h3 style={{ marginBottom: '6px', color: '#171411', fontSize: '0.95rem', fontWeight: 'bold' }}>{f.title}</h3>
            <p style={{ color: '#444242', margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .hero-text {
            grid-column: 1 !important;
            grid-row: auto !important;
            order: 1;
          }
          .hero-image {
            grid-column: 1 !important;
            grid-row: auto !important;
            order: 2;
            margin-bottom: 0.5rem;
          }
          .hero-feature-card {
            grid-column: 1 !important;
            grid-row: auto !important;
            order: 3;
          }
          .hero-buttons button {
            flex: 1 1 100%;
          }
        }
        @media (min-width: 601px) and (max-width: 900px) {
          .hero-feature-card {
            grid-column: span 1 !important;
          }
          .hero-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .hero-text, .hero-image {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroFeatures;