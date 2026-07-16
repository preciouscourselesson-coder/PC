import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import bgPeople from '../Resource/bg_people.png';

// ─── Konstanta & Data ────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: 'Data Diri' },
  { number: 2, label: 'Kebutuhan Belajar' },
  { number: 3, label: 'Jadwal & Preferensi' },
  { number: 4, label: 'Konfirmasi' },
];

const STATUS_OPTIONS   = ['SMP', 'SMA', 'Alumni', 'Orang Tua'];
const KELAS_OPTIONS    = ['Kelas 7', 'Kelas 8', 'Kelas 9', 'Kelas 10', 'Kelas 11', 'Kelas 12'];
const TUJUAN_OPTIONS   = ['Naik nilai sekolah', 'Persiapan UTBK', 'Persiapan Olimpiade', 'Persiapan Ujian', 'Belajar dari nol', 'Konsultasi jurusan', 'Lainnya'];
const MAPEL_OPTIONS    = ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Informatika', 'Bahasa Inggris', 'Lainnya'];
const METODE_OPTIONS   = [
  { value: 'online',  label: 'Online', sub: 'Zoom/Google Meet' },
  { value: 'offline', label: 'Offline', sub: 'di lokasi cabang' },
  { value: 'hybrid',  label: 'Hybrid', sub: 'Online & Offline' },
];
const HARI_OPTIONS     = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const JAM_OPTIONS      = ['08.00 – 10.00', '10.00 – 12.00', '13.00 – 15.00', '15.00 – 17.00', '17.00 – 19.00', '19.00 – 21.00'];
const BUDGET_OPTIONS   = ['< Rp 500.000', 'Rp 500.000 – Rp 1.000.000', 'Rp 1.000.000 – Rp 2.000.000', '> Rp 2.000.000', 'Belum tahu'];

// ─── Warna ───────────────────────────────────────────────────────────────────
const C = {
  gold:    '#b4964b',
  green:   '#2d6a4f',
  dark:    '#171411',
  gray:    '#444242',
  cream:   '#f7f6f0',
  white:   '#ffffff',
  border:  '#e0ddd6',
  goldBg:  'rgba(180,150,75,0.08)',
};

// ─── Komponen Kecil ──────────────────────────────────────────────────────────

const StepIndicator = ({ current }) => (
  <div className="step-indicator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', gap: 0 }}>
    {STEPS.map((s, idx) => {
      const done   = s.number < current;
      const active = s.number === current;
      return (
        <React.Fragment key={s.number}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div className="step-circle" style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: done ? C.green : active ? C.gold : C.border,
              color: done || active ? 'white' : C.gray,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '0.95rem',
              transition: 'all 0.3s',
              flexShrink: 0
            }}>
              {done ? '✓' : s.number}
            </div>
            <span className="step-label" style={{
              fontSize: '0.72rem', fontWeight: active ? 'bold' : 'normal',
              color: active ? C.gold : done ? C.green : C.gray,
              whiteSpace: 'nowrap'
            }}>{s.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className="step-connector" style={{
              height: '2px', width: '60px', marginBottom: '18px',
              background: done ? C.green : C.border,
              transition: 'background 0.3s'
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.9rem', marginBottom: '6px' }}>
    {children}{required && <span style={{ color: C.gold, marginLeft: '3px' }}>*</span>}
  </label>
);

const Input = ({ placeholder, value, onChange, type = 'text' }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    style={{
      width: '100%', padding: '10px 14px', borderRadius: '10px',
      border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
      fontFamily: 'inherit', color: C.dark, background: C.white,
      outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    }}
    onFocus={e => e.target.style.borderColor = C.gold}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const Textarea = ({ placeholder, value, onChange }) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    rows={4}
    style={{
      width: '100%', padding: '10px 14px', borderRadius: '10px',
      border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
      fontFamily: 'inherit', color: C.dark, background: C.white,
      outline: 'none', boxSizing: 'border-box', resize: 'vertical',
      transition: 'border-color 0.2s'
    }}
    onFocus={e => e.target.style.borderColor = C.gold}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const ChipButton = ({ label, selected, onClick, multi }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 16px', borderRadius: '40px', fontSize: '0.88rem',
      fontWeight: selected ? 'bold' : 'normal', cursor: 'pointer',
      fontFamily: 'inherit', transition: 'all 0.2s',
      border: `1.5px solid ${selected ? C.gold : C.border}`,
      background: selected ? C.gold : C.white,
      color: selected ? C.white : C.gray,
    }}
  >
    {selected && multi ? `✓ ${label}` : label}
  </button>
);

const NavButtons = ({ onBack, onNext, nextLabel = 'Selanjutnya →', backLabel = '← Kembali', showBack = true }) => (
  <div style={{ display: 'flex', justifyContent: showBack ? 'space-between' : 'flex-end', marginTop: '2rem' }}>
    {showBack && (
      <button onClick={onBack} style={{
        background: 'white', border: `1.5px solid ${C.border}`,
        padding: '10px 24px', borderRadius: '40px', fontWeight: 'bold',
        fontSize: '0.95rem', cursor: 'pointer', color: C.gray, fontFamily: 'inherit'
      }}>
        {backLabel}
      </button>
    )}
    <button onClick={onNext} style={{
      background: C.gold, border: 'none', color: 'white',
      padding: '10px 28px', borderRadius: '40px', fontWeight: 'bold',
      fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit'
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#c8a84e'}
    onMouseLeave={e => e.currentTarget.style.background = C.gold}
    >
      {nextLabel}
    </button>
  </div>
);

const SectionTitle = ({ number, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '1.5rem' }}>
    <div style={{
      width: '40px', height: '40px', borderRadius: '50%', background: C.gold,
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0
    }}>{number}</div>
    <div>
      <h2 style={{ margin: 0, fontSize: '1.4rem', color: C.dark, fontWeight: 'bold' }}>{title}</h2>
      <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.88rem' }}>{subtitle}</p>
    </div>
  </div>
);

// ─── Step 1: Data Diri ───────────────────────────────────────────────────────

const StepDataDiri = ({ data, setData, onNext }) => {
  const update = (key) => (e) => setData({ ...data, [key]: e.target.value });

  const handleNext = () => {
    if (!data.nama || !data.whatsapp || !data.status) {
      alert('Mohon lengkapi Nama, Nomor WhatsApp, dan Status terlebih dahulu.');
      return;
    }
    onNext();
  };

  return (
    <div>
      <SectionTitle number="1" title="Data Diri" subtitle="Lengkapi data dirimu terlebih dahulu." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div>
          <Label required>Nama Lengkap</Label>
          <Input placeholder="Contoh: Jefferson William" value={data.nama} onChange={update('nama')} />
        </div>
        <div>
          <Label required>Nomor WhatsApp</Label>
          <Input placeholder="Contoh: 0812 3456 7890" value={data.whatsapp} onChange={update('whatsapp')} type="tel" />
        </div>
        <div>
          <Label>Email (opsional)</Label>
          <Input placeholder="Contoh: jefferson@email.com" value={data.email} onChange={update('email')} type="email" />
        </div>

        <div>
          <Label required>Status</Label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
              <ChipButton key={s} label={s} selected={data.status === s}
                onClick={() => setData({ ...data, status: s, kelas: '' })} />
            ))}
          </div>
        </div>

        {(data.status === 'SMP' || data.status === 'SMA') && (
          <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <Label>Asal Sekolah</Label>
              <Input placeholder="Contoh: SMA Negeri 1 Surabaya" value={data.sekolah} onChange={update('sekolah')} />
            </div>
            <div>
              <Label>Kelas</Label>
              <select
                value={data.kelas}
                onChange={update('kelas')}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
                  fontFamily: 'inherit', color: data.kelas ? C.dark : C.gray,
                  background: C.white, outline: 'none', boxSizing: 'border-box'
                }}
              >
                <option value="">Pilih kelas</option>
                {KELAS_OPTIONS.filter(k =>
                  data.status === 'SMP' ? k.includes('7') || k.includes('8') || k.includes('9')
                  : k.includes('10') || k.includes('11') || k.includes('12')
                ).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <NavButtons showBack={false} onNext={handleNext} />
    </div>
  );
};

// ─── Step 2: Kebutuhan Belajar ───────────────────────────────────────────────

const StepKebutuhan = ({ data, setData, onBack, onNext }) => {
  const toggleMulti = (key, val) => {
    const arr = data[key] || [];
    setData({ ...data, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };

  const handleNext = () => {
    if (!data.tujuan?.length || !data.mapel?.length) {
      alert('Mohon pilih tujuan belajar dan mata pelajaran terlebih dahulu.');
      return;
    }
    onNext();
  };

  return (
    <div>
      <SectionTitle number="2" title="Kebutuhan Belajar" subtitle="Ceritakan kebutuhanmu agar kami bisa membantu lebih baik." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
        <div>
          <Label required>Apa tujuan belajarmu?</Label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TUJUAN_OPTIONS.map(t => (
              <ChipButton key={t} label={t} multi
                selected={(data.tujuan || []).includes(t)}
                onClick={() => toggleMulti('tujuan', t)} />
            ))}
          </div>
        </div>

        <div>
          <Label required>Mata pelajaran yang ingin difokuskan <span style={{ color: C.gray, fontWeight: 'normal' }}>(Pilih lebih dari 1)</span></Label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {MAPEL_OPTIONS.map(m => (
              <ChipButton key={m} label={m} multi
                selected={(data.mapel || []).includes(m)}
                onClick={() => toggleMulti('mapel', m)} />
            ))}
          </div>
        </div>

        <div>
          <Label>Kesulitan utama yang kamu alami</Label>
          <Textarea
            placeholder="Ceritakan kesulitan belajar kamu saat ini..."
            value={data.kesulitan}
            onChange={e => setData({ ...data, kesulitan: e.target.value })}
          />
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} />
    </div>
  );
};

// ─── Step 3: Jadwal & Preferensi ────────────────────────────────────────────

const StepJadwal = ({ data, setData, onBack, onNext }) => {
  const toggleMulti = (key, val) => {
    const arr = data[key] || [];
    setData({ ...data, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };

  const handleNext = () => {
    if (!data.metode || !data.hari?.length || !data.jam?.length) {
      alert('Mohon pilih metode belajar, hari, dan jam yang tersedia.');
      return;
    }
    onNext();
  };

  return (
    <div>
      <SectionTitle number="3" title="Jadwal & Preferensi" subtitle="Beri tahu waktu dan preferensi belajarmu." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
        <div>
          <Label required>Metode belajar</Label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {METODE_OPTIONS.map(m => (
              <button key={m.value} onClick={() => setData({ ...data, metode: m.value })}
                style={{
                  padding: '10px 18px', borderRadius: '12px', cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.2s', textAlign: 'left',
                  border: `1.5px solid ${data.metode === m.value ? C.gold : C.border}`,
                  background: data.metode === m.value ? C.goldBg : C.white,
                }}>
                <div style={{ fontWeight: 'bold', color: data.metode === m.value ? C.gold : C.dark, fontSize: '0.9rem' }}>
                  {data.metode === m.value ? '✓ ' : ''}{m.label}
                </div>
                <div style={{ fontSize: '0.76rem', color: C.gray }}>{m.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label required>Hari yang tersedia</Label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {HARI_OPTIONS.map(h => (
              <ChipButton key={h} label={h} multi
                selected={(data.hari || []).includes(h)}
                onClick={() => toggleMulti('hari', h)} />
            ))}
          </div>
        </div>

        <div>
          <Label required>Jam yang diinginkan</Label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {JAM_OPTIONS.map(j => (
              <ChipButton key={j} label={j} multi
                selected={(data.jam || []).includes(j)}
                onClick={() => toggleMulti('jam', j)} />
            ))}
          </div>
        </div>

        <div>
          <Label>Budget per bulan (opsional)</Label>
          <select
            value={data.budget || ''}
            onChange={e => setData({ ...data, budget: e.target.value })}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
              fontFamily: 'inherit', color: data.budget ? C.dark : C.gray,
              background: C.white, outline: 'none', boxSizing: 'border-box'
            }}
          >
            <option value="">Pilih range budget</option>
            {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} />
    </div>
  );
};

// ─── Step 4: Konfirmasi ──────────────────────────────────────────────────────

const ConfirmRow = ({ icon, label, value, onEdit }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '12px 0', borderBottom: `1px solid ${C.border}`
  }}>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
      <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.78rem', color: C.gray, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: C.dark }}>{value || '-'}</div>
      </div>
    </div>
    <button onClick={onEdit} style={{
      background: 'none', border: 'none', color: C.gold,
      fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer',
      fontFamily: 'inherit', flexShrink: 0, marginLeft: '12px'
    }}>Edit</button>
  </div>
);

const StepKonfirmasi = ({ dataDiri, kebutuhan, jadwal, onEdit, onSubmit }) => {
  const [setuju, setSetuju]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSubmit = async () => {
    if (!setuju) { alert('Mohon centang persetujuan terlebih dahulu.'); return; }

    setLoading(true);
    setError(null);

    const { error: sbError } = await supabase.from('konsultasi').insert([{
      nama:      dataDiri.nama,
      whatsapp:  dataDiri.whatsapp,
      email:     dataDiri.email     || null,
      status:    dataDiri.status    || null,
      sekolah:   dataDiri.sekolah   || null,
      kelas:     dataDiri.kelas     || null,
      tujuan:    kebutuhan.tujuan   || [],
      mapel:     kebutuhan.mapel    || [],
      kesulitan: kebutuhan.kesulitan || null,
      metode:    jadwal.metode      || null,
      hari:      jadwal.hari        || [],
      jam:       jadwal.jam         || [],
      budget:    jadwal.budget      || null,
    }]);

    setLoading(false);

    if (sbError) {
      setError('Gagal mengirim data. Silakan coba lagi.');
      console.error('Supabase error:', sbError);
      return;
    }

    setSubmitted(true);
    if (onSubmit) onSubmit();
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ color: C.dark, marginBottom: '8px' }}>Konsultasi Terkirim!</h2>
        <p style={{ color: C.gray, marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Terima kasih, <strong>{dataDiri.nama}</strong>!<br />
          Tim Precious Course akan menghubungi kamu melalui WhatsApp dalam 1×24 jam.
        </p>
        <div style={{
          background: C.goldBg, border: `1.5px solid ${C.gold}`,
          borderRadius: '16px', padding: '1rem 1.5rem',
          color: C.gold, fontWeight: 'bold', fontSize: '0.95rem'
        }}>
          📱 {dataDiri.whatsapp}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle number="4" title="Konfirmasi" subtitle="Yuk, cek kembali informasi yang sudah kamu isi." />

      <div style={{ background: C.cream, borderRadius: '16px', padding: '0 1rem', marginBottom: '1.5rem' }}>
        <ConfirmRow icon="👤" label="Data Diri"
          value={`${dataDiri.nama} • ${dataDiri.whatsapp}${dataDiri.sekolah ? ` • ${dataDiri.sekolah}` : ''}${dataDiri.kelas ? ` ${dataDiri.kelas}` : ''}`}
          onEdit={() => onEdit(1)} />
        <ConfirmRow icon="🎯" label="Tujuan Belajar"
          value={(kebutuhan.tujuan || []).join(', ')}
          onEdit={() => onEdit(2)} />
        <ConfirmRow icon="📚" label="Mata Pelajaran"
          value={(kebutuhan.mapel || []).join(', ')}
          onEdit={() => onEdit(2)} />
        <ConfirmRow icon="🗓️" label="Jadwal"
          value={`${jadwal.metode ? jadwal.metode.charAt(0).toUpperCase() + jadwal.metode.slice(1) : ''} • ${(jadwal.hari || []).join(', ')} • ${(jadwal.jam || []).join(', ')}`}
          onEdit={() => onEdit(3)} />
        {jadwal.budget && (
          <ConfirmRow icon="💰" label="Budget"
            value={jadwal.budget}
            onEdit={() => onEdit(3)} />
        )}
      </div>

      {/* Persetujuan */}
      <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '1.5rem' }}>
        <input type="checkbox" checked={setuju} onChange={e => setSetuju(e.target.checked)}
          style={{ marginTop: '3px', accentColor: C.gold, width: '16px', height: '16px', flexShrink: 0 }} />
        <span style={{ fontSize: '0.88rem', color: C.gray, lineHeight: 1.5 }}>
          Saya setuju dihubungi oleh tim Precious Course melalui WhatsApp untuk keperluan konsultasi.
        </span>
      </label>

      {error && (
        <div style={{
          background: '#fff0f0', border: '1.5px solid #e74c3c', borderRadius: '12px',
          padding: '10px 16px', color: '#e74c3c', fontSize: '0.88rem',
          marginBottom: '1rem', textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', background: loading ? '#ccc' : C.gold, border: 'none', color: 'white',
        padding: '14px', borderRadius: '40px', fontWeight: 'bold',
        fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        transition: 'background 0.2s'
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c8a84e'; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.gold; }}
      >
        {loading ? '⏳ Mengirim...' : 'Kirim Konsultasi Gratis →'}
      </button>

      <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.8rem', marginTop: '12px' }}>
        🔒 Data kamu aman dan tidak akan disalahgunakan.
      </p>
    </div>
  );
};

// ─── Sidebar Kiri ────────────────────────────────────────────────────────────

const alasanData = [
  { icon: '🎯', title: 'Analisis kebutuhan belajar', desc: 'Kami akan memahami kondisi dan tujuan belajarmu secara mendalam.' },
  { icon: '🏆', title: 'Rekomendasi program terbaik', desc: 'Program yang tepat sesuai dengan tujuanmu.' },
  { icon: '💬', title: 'Konsultasi bersama tim akademik', desc: 'Dibimbing oleh mentor berpengalaman.' },
  { icon: '✅', title: '100% Gratis & Tanpa komitmen', desc: 'Konsultasi dulu, keputusan ada di tanganmu.' },
];

const LeftSidebar = () => (
  <div style={{
    background: C.green,
    borderRadius: '24px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    color: 'white',
    position: 'sticky',
    top: '80px',
    alignSelf: 'start'
  }}>

    {/* Baris 1: Badge + Judul */}
    <div>
      <span style={{
        background: 'rgba(255,255,255,0.2)', color: 'white',
        padding: '4px 14px', borderRadius: '40px', fontSize: '0.78rem',
        fontWeight: 'bold', letterSpacing: '1px', display: 'inline-block', marginBottom: '1rem'
      }}>
        KONSULTASI GRATIS
      </span>
      <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 10px', lineHeight: 1.25 }}>
        Konsultasi<br />Belajar <span style={{ color: C.gold }}>Gratis</span>
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
        Kami siap membantu menemukan program belajar yang paling sesuai untukmu.
      </p>
    </div>

    {/* Baris 2: Foto */}
    <div style={{
      borderRadius: '20px', overflow: 'hidden',
      minHeight: '240px', background:'#2d6a4f'
    }}>
      <img
        src={bgPeople}
        alt="Belajar bersama Precious Course"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={e => {
          // fallback kalau gambar tidak ditemukan
          e.target.style.display = 'none';
          e.target.parentElement.style.background = 'rgba(255,255,255,0.1)';
          e.target.parentElement.style.minHeight = '160px';
          e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:160px;font-size:3rem;">📚</div>';
        }}
      />
    </div>

    {/* Baris 3: Alasan konsultasi */}
    <div>
      <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', margin: '0 0 1rem' }}>
        Mengapa konsultasi bersama kami?
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {alasanData.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
            }}>
              {a.icon}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: 'white', marginBottom: '2px' }}>{a.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Halaman Utama ────────────────────────────────────────────────────────────

const KonsultasiPage = () => {
  const [step, setStep]           = useState(1);
  const [dataDiri, setDataDiri]   = useState({ nama: '', whatsapp: '', email: '', status: '', sekolah: '', kelas: '' });
  const [kebutuhan, setKebutuhan] = useState({ tujuan: [], mapel: [], kesulitan: '' });
  const [jadwal, setJadwal]       = useState({ metode: '', hari: [], jam: [], budget: '' });
  const navigate                  = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{
        background: C.white,
        boxShadow: '0 2px 12px rgba(23,20,17,0.08)',
        padding: '0 5%',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: 'bold', color: C.gold, fontSize: '1.1rem', fontFamily: 'inherit', padding: 0
          }}>
            ← Kembali ke Beranda
          </button>
          <span style={{
            background: C.goldBg, color: C.gold, border: `1px solid ${C.gold}`,
            padding: '4px 14px', borderRadius: '40px', fontSize: '0.8rem', fontWeight: 'bold'
          }}>
            KONSULTASI GRATIS
          </span>
        </div>
      </div>

      {/* Layout Dua Kolom */}
      <div className="konsultasi-layout" style={{
        maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 5%',
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr',
        gap: '2rem',
        alignItems: 'start',
        boxSizing: 'border-box'
      }}>

        {/* Kolom Kiri: Sidebar */}
        <div className="konsultasi-sidebar">
          <LeftSidebar />
        </div>

        {/* Kolom Kanan: Form */}
        <div>
          {/* Judul */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: 'clamp(1.3rem, 4.5vw, 1.6rem)', color: C.dark, margin: '0 0 6px', fontWeight: 'bold' }}>
              ✨ Form Konsultasi <span style={{ color: C.gold }}>Gratis</span>
            </h1>
            <p style={{ color: C.gray, margin: 0, fontSize: '0.88rem' }}>
              Isi data berikut agar kami dapat membantumu lebih tepat.
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator current={step} />

          {/* Card Form */}
          <div style={{
            background: C.white, borderRadius: '24px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            padding: 'clamp(1.25rem, 5vw, 2rem)',
            boxSizing: 'border-box'
          }}>
            {step === 1 && (
              <StepDataDiri data={dataDiri} setData={setDataDiri} onNext={() => setStep(2)} />
            )}
            {step === 2 && (
              <StepKebutuhan data={kebutuhan} setData={setKebutuhan} onBack={() => setStep(1)} onNext={() => setStep(3)} />
            )}
            {step === 3 && (
              <StepJadwal data={jadwal} setData={setJadwal} onBack={() => setStep(2)} onNext={() => setStep(4)} />
            )}
            {step === 4 && (
              <StepKonfirmasi
                dataDiri={dataDiri}
                kebutuhan={kebutuhan}
                jadwal={jadwal}
                onEdit={(s) => setStep(s)}
                onSubmit={() => console.log('Submit:', { dataDiri, kebutuhan, jadwal })}
              />
            )}
          </div>

          {/* Progress teks */}
          {step < 4 && (
            <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.82rem', marginTop: '1rem' }}>
              Langkah {step} dari 4 • Estimasi waktu pengisian: 2–3 menit
            </p>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .konsultasi-layout {
            grid-template-columns: 1fr !important;
          }
          .konsultasi-sidebar > div {
            position: static !important;
            top: auto !important;
          }
        }
        @media (max-width: 640px) {
          .two-col-grid {
            grid-template-columns: 1fr !important;
          }
          .step-indicator {
            flex-wrap: nowrap;
          }
          .step-connector {
            width: 20px !important;
          }
          .step-circle {
            width: 30px !important;
            height: 30px !important;
            font-size: 0.82rem !important;
          }
          .step-label {
            font-size: 0.6rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default KonsultasiPage;