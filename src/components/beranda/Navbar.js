import React from 'react';
import logo from '../../Resource/PC_Horisontal.png';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigate = useNavigate();

  return (
    <nav style={{ 
      background: '#f7f6f0', 
      boxShadow: '0 2px 12px rgba(23,20,17,0.08)', 
      position: 'sticky', 
      top: 0, 
      zIndex: 100,
      padding: '0 5%'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '4px 0'
      }}>
        {/* Logo */}
        <div style={{ flex: '0 0 20%' }}>
          <button onClick={() => scrollToSection('HeroFeatures')} style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}>
            <img src={logo} alt="Precious Course" style={{ height: '64px' }} />
          </button>
        </div>

        {/* Menu + CTA + Login */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          <ul style={{ 
            display: 'flex', 
            listStyle: 'none', 
            gap: '1.2rem', 
            margin: 0, 
            padding: 0,
            alignItems: 'center'
          }}>
            <li><button className="nav-link" onClick={() => scrollToSection('HeroFeatures')}>Beranda</button></li>
            <li><button className="nav-link" onClick={() => scrollToSection('programs')}>Program</button></li>
            <li><button className="nav-link" onClick={() => scrollToSection('whyus')}>Tentang Kami</button></li>
            <li><button className="nav-link" onClick={() => scrollToSection('testimonials')}>Testimoni</button></li>
          </ul>

          <button onClick={() => navigate('/konsultasi')} style={ctaButtonStyle}>
            Konsultasi Gratis →
          </button>

          {/* Tombol Login — ganti href sesuai path halaman login kamu */}
          <a href="/login" style={loginButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f0ede6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Login
          </a>
        </div>
      </div>

      <style>{`
        .nav-link {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          color: #171411;
          padding: 8px 0;
          transition: color 0.2s ease;
          font-family: inherit;
          text-decoration: none;
        }
        .nav-link:hover {
          color: #b4964b;
          text-decoration: underline;
          text-underline-offset: 6px;
        }
      `}</style>
    </nav>
  );
};

const loginButtonStyle = {
  border: '1.5px solid #171411',
  background: 'transparent',
  padding: '8px 16px',
  borderRadius: '40px',
  cursor: 'pointer',
  color: '#171411',
  fontWeight: 'bold',
  fontSize: '1rem',
  transition: 'background 0.2s',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  display: 'inline-block'
};

const ctaButtonStyle = {
  border: '1.5px solid #b4964b',
  background: '#b4964b',
  padding: '8px 20px',
  borderRadius: '40px',
  cursor: 'pointer',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '1rem',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap'
};

export default Navbar;