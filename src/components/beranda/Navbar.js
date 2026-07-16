import React, { useState } from 'react';
import logo from '../../Resource/PC_Horisontal.png';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  };

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
        justifyContent: 'space-between',
        padding: '4px 0'
      }}>
        {/* Logo */}
        <button onClick={() => scrollToSection('HeroFeatures')} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <img src={logo} alt="Precious Course" className="navbar-logo" style={{ height: '64px' }} />
        </button>

        {/* Menu + CTA + Login (desktop) */}
        <div className="navbar-desktop-menu" style={{
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

          <a href="/login" style={loginButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f0ede6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Login
          </a>
        </div>

        {/* Hamburger (mobile only) */}
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Buka menu"
          aria-expanded={menuOpen}
        >
          <span className={`bar ${menuOpen ? 'bar-top-open' : ''}`} />
          <span className={`bar ${menuOpen ? 'bar-mid-open' : ''}`} />
          <span className={`bar ${menuOpen ? 'bar-bot-open' : ''}`} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          <button className="nav-link-mobile" onClick={() => scrollToSection('HeroFeatures')}>Beranda</button>
          <button className="nav-link-mobile" onClick={() => scrollToSection('programs')}>Program</button>
          <button className="nav-link-mobile" onClick={() => scrollToSection('whyus')}>Tentang Kami</button>
          <button className="nav-link-mobile" onClick={() => scrollToSection('testimonials')}>Testimoni</button>
          <button
            onClick={() => { navigate('/konsultasi'); setMenuOpen(false); }}
            style={{ ...ctaButtonStyle, width: '100%', textAlign: 'center', marginTop: '10px', boxSizing: 'border-box' }}
          >
            Konsultasi Gratis →
          </button>
          <a href="/login" style={{ ...loginButtonStyle, width: '100%', textAlign: 'center', boxSizing: 'border-box', marginTop: '8px' }}>
            Login
          </a>
        </div>
      )}

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
        .nav-link-mobile {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          color: #171411;
          padding: 12px 4px;
          text-align: left;
          font-family: inherit;
          border-bottom: 1px solid #e0ddd6;
        }
        .navbar-hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
        }
        .navbar-hamburger .bar {
          width: 24px;
          height: 2px;
          background: #171411;
          display: block;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .navbar-hamburger .bar-top-open { transform: translateY(7px) rotate(45deg); }
        .navbar-hamburger .bar-mid-open { opacity: 0; }
        .navbar-hamburger .bar-bot-open { transform: translateY(-7px) rotate(-45deg); }
        .navbar-mobile-menu {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0.5rem 0 1.2rem;
          border-top: 1px solid #e0ddd6;
        }
        @media (max-width: 860px) {
          .navbar-desktop-menu { display: none !important; }
          .navbar-hamburger { display: flex !important; }
          .navbar-logo { height: 48px !important; }
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