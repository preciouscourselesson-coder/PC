import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const C = {
  gold:   '#b4964b',
  green:  '#2d6a4f',
  dark:   '#171411',
  gray:   '#444242',
  cream:  '#f7f6f0',
  white:  '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.08)',
};

const LABEL_OPTIONS = ['Siswa UTBK', 'Siswa Reguler', 'Siswa SMA', 'Siswa SMP', 'Alumni', 'Orang Tua'];

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.9rem', marginBottom: '6px' }}>
    {children}{required && <span style={{ color: C.gold, marginLeft: '3px' }}>*</span>}
  </label>
);

const Input = ({ placeholder, value, onChange, type = 'text' }) => (
  <input
    type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{
      width: '100%', padding: '10px 14px', borderRadius: '10px',
      border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
      fontFamily: 'inherit', color: C.dark, background: C.white,
      outline: 'none', boxSizing: 'border-box'
    }}
    onFocus={e => e.target.style.borderColor = C.gold}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const StarPicker = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: '6px' }}>
    {[1, 2, 3, 4, 5].map(n => (
      <span key={n} onClick={() => onChange(n)} style={{
        fontSize: '1.8rem', cursor: 'pointer',
        color: n <= value ? C.gold : '#ddd',
        transition: 'color 0.15s'
      }}>★</span>
    ))}
  </div>
);

const TestimoniForm = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nama: '', label: '', rating: 5, isi: '' });
  const [fotoFile, setFotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.nama || !form.isi) {
      setError('Mohon isi Nama dan Testimoni terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError(null);

    let foto_url = null;

    // Upload foto jika ada
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop();
      const fileName = `testimoni/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('foto-testimoni')
        .upload(fileName, fotoFile, { upsert: true });

      if (uploadError) {
        setError('Gagal upload foto. Coba lagi atau kirim tanpa foto.');
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('foto-testimoni')
        .getPublicUrl(fileName);
      foto_url = urlData.publicUrl;
    }

    // Insert ke tabel testimoni
    const { error: insertError } = await supabase.from('testimoni').insert([{
      nama:     form.nama,
      label:    form.label || null,
      rating:   form.rating,
      isi:      form.isi,
      foto_url: foto_url,
      approved: false, // perlu disetujui admin dulu
    }]);

    setLoading(false);

    if (insertError) {
      setError('Gagal mengirim testimoni. Silakan coba lagi.');
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 5%', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', background: C.white, borderRadius: '24px', padding: '2.5rem 1.75rem', maxWidth: '400px', width: '100%', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ color: C.dark, marginBottom: '8px' }}>Terima Kasih!</h2>
          <p style={{ color: C.gray, lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Testimonimu sudah kami terima dan akan ditampilkan setelah direview oleh tim Precious Course.
          </p>
          <button onClick={() => navigate('/')} style={{
            background: C.gold, border: 'none', color: 'white',
            padding: '10px 28px', borderRadius: '40px', fontWeight: 'bold',
            fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{
        background: C.white, boxShadow: '0 2px 12px rgba(23,20,17,0.08)',
        padding: '0 5%', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: 'bold', color: C.gold, fontSize: '1.1rem', fontFamily: 'inherit', padding: 0
          }}>
            ← Kembali ke Beranda
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem 5% 3rem', boxSizing: 'border-box' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: C.dark, margin: '0 0 8px', fontWeight: 'bold' }}>
            Bagikan <span style={{ color: C.gold }}>Pengalamanmu</span>
          </h1>
          <p style={{ color: C.gray, margin: 0, fontSize: '0.92rem' }}>
            Testimonimu akan membantu calon siswa lain menemukan tempat belajar yang tepat.
          </p>
        </div>

        <div style={{
          background: C.white, borderRadius: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 'clamp(1.25rem, 5vw, 2rem)', boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* Foto */}
            <div>
              <Label>Foto Profil (opsional)</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
                  background: preview ? 'transparent' : C.cream,
                  border: `2px solid ${C.border}`, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {preview
                    ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.5rem' }}>👤</span>
                  }
                </div>
                <label style={{
                  background: C.cream, border: `1.5px solid ${C.border}`,
                  borderRadius: '40px', padding: '8px 18px', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '0.88rem', color: C.gray
                }}>
                  {preview ? 'Ganti Foto' : 'Upload Foto'}
                  <input type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* Nama */}
            <div>
              <Label required>Nama</Label>
              <Input placeholder="Contoh: Seshil" value={form.nama} onChange={update('nama')} />
            </div>

            {/* Label */}
            <div>
              <Label>Keterangan (opsional)</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {LABEL_OPTIONS.map(l => (
                  <button key={l} onClick={() => setForm({ ...form, label: form.label === l ? '' : l })}
                    style={{
                      padding: '6px 14px', borderRadius: '40px', fontSize: '0.85rem',
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                      border: `1.5px solid ${form.label === l ? C.gold : C.border}`,
                      background: form.label === l ? C.gold : C.white,
                      color: form.label === l ? C.white : C.gray,
                      fontWeight: form.label === l ? 'bold' : 'normal'
                    }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <Label required>Rating</Label>
              <StarPicker value={form.rating} onChange={r => setForm({ ...form, rating: r })} />
            </div>

            {/* Testimoni */}
            <div>
              <Label required>Ceritakan pengalamanmu</Label>
              <textarea
                placeholder="Ceritakan pengalamanmu belajar di Precious Course..."
                value={form.isi}
                onChange={update('isi')}
                rows={5}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
                  fontFamily: 'inherit', color: C.dark, background: C.white,
                  outline: 'none', boxSizing: 'border-box', resize: 'vertical'
                }}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: form.isi.length > 500 ? 'red' : C.gray, marginTop: '4px' }}>
                {form.isi.length} karakter
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff0f0', border: '1.5px solid #e74c3c', borderRadius: '12px',
                padding: '10px 16px', color: '#e74c3c', fontSize: '0.88rem', textAlign: 'center'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading} style={{
              width: '100%', background: loading ? '#ccc' : C.gold, border: 'none', color: 'white',
              padding: '14px', borderRadius: '40px', fontWeight: 'bold', fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s'
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c8a84e'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.gold; }}
            >
              {loading ? '⏳ Mengirim...' : 'Kirim Testimoni →'}
            </button>

            <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.8rem', margin: 0 }}>
              Testimoni akan ditampilkan setelah direview oleh tim kami.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimoniForm;