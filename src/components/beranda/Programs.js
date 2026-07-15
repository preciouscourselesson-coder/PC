import React from 'react';

import utbkImg from '../../Resource/3.png';
import schoolImg from '../../Resource/1.png';
import mentoringImg from '../../Resource/2.png';
import internationalImg from '../../Resource/4.png';

const programsData = [
  {
    name: 'Pendalaman Materi Sekolah',
    desc: 'Bantuan untuk memahami materi SMP & SMA agar lebih kuat di sekolah dan ujian.',
    points: ['Materi sesuai kurikulum', 'Pembahasan mudah dipahami', 'Tugas & latihan terarah'],
    img: schoolImg,
    alt: 'Pendalaman Materi Sekolah'
  },
  {
    name: 'Academic Mentoring',
    desc: 'Pendampingan belajar dan evaluasi progres, membantu konsisten fokus ke tujuan.',
    points: ['Pendampingan personal', 'Monitoring progres belajar', 'Saran & strategi belajar'],
    img: mentoringImg,
    alt: 'Academic Mentoring'
  },
  {
    name: 'Persiapan UTBK',
    desc: 'Program persiapan UTBK secara bertahap: konsep, latihan soal, strategi.',
    points: ['Materi terstruktur & update', 'Latihan soal berbasis tryout', 'Evaluasi & pembahasan'],
    img: utbkImg,
    alt: 'Persiapan UTBK'
  },
  {
    name: 'Persiapan Ujian Internasional',
    desc: 'Dasar untuk ICAS, A-Level, dan lainnya sesuai kebutuhan siswa.',
    points: ['Materi dasar terstruktur', 'Latihan soal & pembahasan', 'Pendampingan bertahap'],
    img: internationalImg,
    alt: 'Persiapan Ujian Internasional'
  }
];

const Programs = () => {
  return (
    <section id="programs" style={{ background: '#ffffff', padding: '48px 5%', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Baris 1: Judul */}
        <div style={{ gridColumn: '1 / span 4', textAlign: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ color: '#b4964b', fontSize: '1rem', letterSpacing: '2px', marginBottom: '8px', fontWeight: 'bold' }}>
            PROGRAM KAMI
          </h2>
          <h3 style={{ color: '#171411', fontSize: '1.6rem', fontWeight: 'bold', margin: 0 }}>
            Program Bimbingan Belajar untuk Kamu
          </h3>
        </div>

        {/* Baris 2: Kartu program */}
        {programsData.map((program, idx) => (
          <div key={idx} style={{
            gridRow: '2',
            gridColumn: idx + 1,
            background: 'white',
            padding: '1.2rem',
            borderRadius: '24px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.08), 0 6px 6px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08), 0 6px 6px rgba(0,0,0,0.05)';
          }}>
            <img
              src={program.img}
              alt={program.alt}
              style={{
                width: '56px',
                height: '56px',
                objectFit: 'contain',
                marginBottom: '0.8rem'
              }}
            />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#171411', fontWeight: 'bold' }}>{program.name}</h3>
            <p style={{ color: '#444242', marginBottom: '12px', lineHeight: 1.5, fontSize: '0.9rem' }}>{program.desc}</p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#444242', textAlign: 'left', width: '100%', fontSize: '0.88rem' }}>
              {program.points.map((point, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Programs;