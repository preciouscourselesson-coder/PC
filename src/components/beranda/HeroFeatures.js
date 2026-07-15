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
    { icon: 'fa-user-friends', title: 'Pendekatan Personal', desc: 'Belajar sesuai kebutuhan setiap siswa' },
    { icon: 'fa-layer-group', title: 'Materi Terstruktur', desc: 'Disusun berbagai materi yang relevan' },
    { icon: 'fa-chart-line', title: 'Evaluasi Berkala', desc: 'Monitoring progress secara rutin' },
    { icon: 'fa-laptop-house', title: 'Belajar Fleksibel', desc: 'Online maupun offline sesuai kesepakatan' }
  ];

  const navigate = useNavigate();

  return (
    <section id="HeroFeatures" style={{ background: '#f7f6f0', padding: '48px 5%', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr) 40%',
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>
        {/* Baris 1: Hero teks */}
        <div style={{ gridColumn: '1 / span 4', gridRow: '1' }}>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '12px', lineHeight: 1.2, color: '#171411' }}>
            Pendampingan Akademik untuk
          </h1>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '16px', lineHeight: 1.2, color: '#171411' }}>
            <span style={{ color: '#b4964b' }}>Target Kampus Impianmu</span>
          </h1>
          <p style={{ fontSize: '1rem', marginBottom: '24px', color: '#444242' }}>
            Pembelajaran terstruktur, materi berkualitas, dan pendampingan personal untuk membantu kamu belajar lebih efektif dan percaya diri.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
        <div style={{ gridRow: 'span 2', gridColumn: '5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={heroImage} 
            alt="Belajar bersama Precious Course" 
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '32px' }} 
          />
        </div>

        {/* Baris 2: Kartu fitur */}
        {featuresData.map((f, idx) => (
          <div key={idx} style={{
            gridRow: '2',
            gridColumn: idx + 1,
            background: 'white',
            padding: '1.2rem',
            borderRadius: '24px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.1), 0 6px 6px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1), 0 6px 6px rgba(0,0,0,0.05)';
          }}>
            <i className={`fas ${f.icon}`} style={{ fontSize: '1.6rem', color: '#b4964b', marginBottom: '12px', display: 'block' }}></i>
            <h3 style={{ marginBottom: '6px', color: '#171411', fontSize: '0.95rem' }}>{f.title}</h3>
            <p style={{ color: '#444242', margin: 0, fontSize: '0.88rem' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HeroFeatures;