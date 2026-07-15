import React from 'react';
import { Link } from 'react-router-dom';

const CTA = () => {
  return (
    <section id="cta" style={{ textAlign: 'center', background: '#2d6a4f', color: 'white', padding: '48px 5%', width: '100%', boxSizing: 'border-box' }}>
      <div>
        <h2 style={{ color: 'white', fontSize: '1.6rem', marginBottom: '12px' }}>
          Mulai Langkah pertamamu bersama Precious Course hari ini.
        </h2>
        <p style={{ marginBottom: '24px', fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>
          Konsultasi gratis untuk mengetahui program yang paling sesuai untukmu.
        </p>
        <Link to="/konsultasi"
          style={{
            background: 'white',
            color: '#2d6a4f',
            textDecoration: 'none',
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: '40px',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          Mulai Konsultasi Gratis →
        </Link>
      </div>
    </section>
  );
};

export default CTA;