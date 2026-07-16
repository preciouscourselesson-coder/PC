import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold:   '#b4964b',
  green:  '#2d6a4f',
  dark:   '#171411',
  gray:   '#444242',
  cream:  '#f1f5f9',
  white:  '#ffffff',
  border: '#e0ddd6',
};

const StarRating = ({ count }) => (
  <div style={{ display: 'flex', gap: '3px', marginBottom: '10px' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} style={{ color: i < count ? C.gold : '#ddd', fontSize: '1rem' }}>★</span>
    ))}
  </div>
);

const TestimonialCard = ({ t }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = t.isi && t.isi.length > 150;
  const displayed = expanded || !isLong ? t.isi : t.isi.slice(0, 150) + '...';

  return (
    <div className="testimonial-card" style={{
      background: C.white,
      padding: '1.5rem',
      borderRadius: '24px',
      boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      minWidth: '300px',
      maxWidth: '320px',
      flexShrink: 0,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 20px 28px rgba(0,0,0,0.12)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)';
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        {t.foto_url ? (
          <img src={t.foto_url} alt={t.nama}
            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.gold}`, flexShrink: 0 }} />
        ) : (
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', background: C.green,
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0
          }}>
            {t.nama?.[0] || '?'}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.95rem' }}>{t.nama}</div>
          {t.label && <div style={{ color: C.gold, fontSize: '0.8rem', fontWeight: 'bold' }}>{t.label}</div>}
        </div>
      </div>

      <StarRating count={t.rating || 5} />

      <i className="fas fa-quote-left" style={{ color: C.gold, opacity: 0.5, fontSize: '1.2rem', marginBottom: '8px' }}></i>

      <p style={{ color: C.gray, margin: '0 0 10px', fontSize: '0.9rem', lineHeight: 1.7, flex: 1 }}>
        {displayed}
      </p>

      {isLong && (
        <button onClick={() => setExpanded(!expanded)} style={{
          background: 'none', border: 'none', color: C.gold, fontWeight: 'bold',
          fontSize: '0.82rem', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit'
        }}>
          {expanded ? '▲ Sembunyikan' : '▼ Baca selengkapnya'}
        </button>
      )}
    </div>
  );
};

const Testimonials = () => {
  const [testimoniList, setTestimoniList] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchTestimoni = async () => {
      const { data, error } = await supabase
        .from('testimoni')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (!error && data) setTestimoniList(data);
      setLoading(false);
    };
    fetchTestimoni();
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
    }
  };

  return (
    <section id="testimonials" style={{ background: C.cream, padding: '48px 0', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '0 5%' }}>
        <h2 style={{ color: C.gold, fontSize: '1rem', letterSpacing: '2px', marginBottom: '8px', fontWeight: 'bold' }}>
          TESTIMONI
        </h2>
        <h3 style={{ color: C.dark, fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', fontWeight: 'bold', margin: '0 0 8px' }}>
          💬 Apa Kata Mereka?
        </h3>
        <a href="/testimoni" style={{
          color: C.gold, fontWeight: 'bold', fontSize: '0.88rem',
          textDecoration: 'none', borderBottom: `1px solid ${C.gold}`
        }}>
          + Bagikan pengalamanmu
        </a>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.gray, padding: '2rem' }}>Memuat testimoni...</div>
      ) : testimoniList.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.gray, padding: '2rem' }}>Belum ada testimoni.</div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Tombol scroll kiri (disembunyikan di mobile, geser pakai swipe) */}
          <button className="testimonials-arrow testimonials-arrow-left" onClick={() => scroll(-1)} style={{
            position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: C.white, border: `1.5px solid ${C.border}`,
            borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>‹</button>

          {/* Scroll container */}
          <div ref={scrollRef} className="testimonials-scroll" style={{
            display: 'flex', gap: '1.2rem', overflowX: 'auto', padding: '1rem 5%',
            scrollbarWidth: 'none', msOverflowStyle: 'none'
          }}>
            {testimoniList.map(t => <TestimonialCard key={t.id} t={t} />)}
          </div>

          {/* Tombol scroll kanan (disembunyikan di mobile, geser pakai swipe) */}
          <button className="testimonials-arrow testimonials-arrow-right" onClick={() => scroll(1)} style={{
            position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: C.white, border: `1.5px solid ${C.border}`,
            borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>›</button>
        </div>
      )}

      <style>{`
        .testimonials-scroll::-webkit-scrollbar { display: none; }
        .testimonials-scroll {
          scroll-snap-type: x proximity;
        }
        .testimonial-card {
          scroll-snap-align: start;
        }
        @media (max-width: 600px) {
          .testimonial-card {
            min-width: 82vw !important;
            max-width: 82vw !important;
          }
          .testimonials-arrow {
            display: none !important;
          }
          .testimonials-scroll {
            padding-left: 5% !important;
            padding-right: 5% !important;
          }
        }
      `}</style>
    </section>
  );
};

export default Testimonials;