import React from 'react';

const whyUsData = [
  {
    icon: 'fa-user-check',
    title: 'Pendekatan Belajar Personal',
    desc: 'Setiap siswa punya cara belajar yang berbeda. Kami menyesuaikan pendekatan agar belajar lebih efektif dan tepat sasaran.'
  },
  {
    icon: 'fa-database',
    title: 'Bank Soal Terstruktur',
    desc: 'Soal disusun berdasarkan materi dan tingkat kesulitan, memudahkan latihan dari dasar hingga tingkat lanjut.'
  },
  {
    icon: 'fa-video',
    title: 'Video Pembahasan',
    desc: 'Setiap soal dibahas secara detail lewat video agar siswa benar-benar paham, bukan sekadar hafal jawaban.'
  },
  {
    icon: 'fa-chart-simple',
    title: 'Progress Tracking',
    desc: 'Pantau perkembangan belajar secara berkala sehingga langkah selanjutnya selalu tepat dan terarah.'
  },
  {
    icon: 'fa-step-forward',
    title: 'Sistem Belajar Bertahap',
    desc: 'Materi disusun dari yang mendasar hingga kompleks agar pemahaman terbangun dengan kokoh.'
  },
  {
    icon: 'fa-tree',
    title: 'Lingkungan Belajar Nyaman',
    desc: 'Suasana belajar yang fokus, sportif, dan suportif membantu siswa berkembang dengan lebih percaya diri.'
  }
];

const WhyUs = () => {
  return (
    <section id="whyus" style={{ background: '#f7f6f0', padding: '48px 5%', width: '100%', boxSizing: 'border-box' }}>
      <div className="whyus-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Judul */}
        <div style={{ gridColumn: '1 / span 3', textAlign: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ color: '#b4964b', fontSize: '1rem', letterSpacing: '2px', marginBottom: '8px', fontWeight: 'bold' }}>
            KENAPA KAMI
          </h2>
          <h3 style={{ color: '#171411', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', fontWeight: 'bold', margin: 0 }}>
            Alasan Memilih Precious Course
          </h3>
        </div>

        {/* Kartu keunggulan */}
        {whyUsData.map((item, idx) => (
          <div key={idx} style={{
            background: 'white',
            padding: '1.2rem',
            borderRadius: '24px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.08), 0 6px 6px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08), 0 6px 6px rgba(0,0,0,0.05)';
          }}>
            <i className={`fas ${item.icon}`} style={{ fontSize: '1.6rem', color: '#b4964b', marginBottom: '12px', display: 'block' }}></i>
            <h3 style={{ marginBottom: '6px', color: '#171411', fontSize: '1rem', fontWeight: 'bold' }}>{item.title}</h3>
            <p style={{ color: '#444242', margin: 0, lineHeight: 1.6, fontSize: '0.88rem' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .whyus-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .whyus-grid > div:first-child {
            grid-column: 1 / -1 !important;
          }
        }
        @media (max-width: 560px) {
          .whyus-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};

export default WhyUs;