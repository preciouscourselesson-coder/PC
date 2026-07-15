// src/components/student/StudentHelp.js
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold:    '#b4964b',
  green:   '#2d6a4f',
  dark:    '#171411',
  gray:    '#444242',
  cream:   '#f7f6f0',
  white:   '#ffffff',
  border:  '#e0ddd6',
  goldBg:  'rgba(180,150,75,0.10)',
  greenBg: 'rgba(45,106,79,0.08)',
};

// ─── Dummy data jadwal (nanti dari Supabase) ──────────────────────────────────
const dummyJadwal = [
  { id: 1, label: 'Jumat, 31 Mei 2025 • 16.00 - 17.30 WIB • Matematika - Pak Ronald' },
  { id: 2, label: 'Senin, 2 Juni 2025 • 16.00 - 17.30 WIB • Fisika - Pak William' },
  { id: 3, label: 'Rabu, 4 Juni 2025 • 16.00 - 17.30 WIB • Kimia - Kak Sashi' },
];

const dummyMapel = ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Inggris'];
const dummyBab = {
  Matematika: ['Bab 1: Persamaan Linear', 'Bab 2: Fungsi Kuadrat', 'Bab 3: Trigonometri'],
  Fisika:     ['Bab 1: Hukum Newton', 'Bab 2: Gerak Parabola', 'Bab 3: Gelombang'],
  Kimia:      ['Bab 1: Struktur Atom', 'Bab 2: Ikatan Kimia', 'Bab 3: Stoikiometri'],
  Biologi:    ['Bab 1: Sel', 'Bab 2: Jaringan', 'Bab 3: Sistem Pernapasan'],
  'Bahasa Inggris': ['Bab 1: Narrative Text', 'Bab 2: Recount Text', 'Bab 3: Report Text'],
};

const PAYMENT_OPTIONS = [
  { key: 'konfirmasi',    icon: '✅', label: 'Konfirmasi pembayaran' },
  { key: 'belum',         icon: '🧾', label: 'Belum melakukan pembayaran' },
  { key: 'perpanjangan',  icon: '🕐', label: 'Permohonan perpanjangan pembayaran' },
  { key: 'kendala',       icon: '🖥️', label: 'Kendala pembayaran lainnya' },
];

// ─── Reusable komponen ────────────────────────────────────────────────────────
const SectionCard = ({ number, icon, title, subtitle, children }) => (
  <div style={{
    background: C.white,
    border: `1.5px solid ${C.border}`,
    borderRadius: '20px',
    padding: '1.8rem 2rem',
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.4rem' }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: C.greenBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 'bold', color: C.dark }}>
          {number}. {title}
        </h3>
        <p style={{ margin: 0, color: C.gray, fontSize: '0.88rem' }}>{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

const Textarea = ({ placeholder, value, onChange, maxLength = 500, rows = 4 }) => (
  <div>
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      maxLength={maxLength}
      style={{
        width: '100%', padding: '12px 14px', borderRadius: '12px',
        border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
        fontFamily: 'inherit', color: C.dark, background: C.white,
        outline: 'none', boxSizing: 'border-box', resize: 'vertical',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderColor = C.green}
      onBlur={e => e.target.style.borderColor = C.border}
    />
    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: C.gray, marginTop: '4px' }}>
      {value.length}/{maxLength}
    </div>
  </div>
);

const SelectInput = ({ value, onChange, placeholder, options }) => (
  <div style={{ position: 'relative' }}>
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%', padding: '11px 40px 11px 14px', borderRadius: '12px',
        border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
        fontFamily: 'inherit', color: value ? C.dark : C.gray,
        background: C.white, outline: 'none', boxSizing: 'border-box',
        appearance: 'none', cursor: 'pointer', transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderColor = C.green}
      onBlur={e => e.target.style.borderColor = C.border}
    >
      <option value="">{placeholder}</option>
      {options.map((opt, i) => (
        <option key={i} value={typeof opt === 'object' ? opt.id : opt}>
          {typeof opt === 'object' ? opt.label : opt}
        </option>
      ))}
    </select>
    <span style={{
      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
      color: C.gray, fontSize: '0.8rem', pointerEvents: 'none',
    }}>▾</span>
  </div>
);

const Label = ({ children, required }) => (
  <label style={{
    display: 'block', fontWeight: 'bold', color: C.dark,
    fontSize: '0.85rem', marginBottom: '8px',
  }}>
    {children}
    {required && <span style={{ color: C.gold, marginLeft: '3px' }}>*</span>}
  </label>
);

const InfoNote = ({ text }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    background: C.greenBg, border: `1px solid ${C.green}22`,
    borderRadius: '10px', padding: '10px 14px',
  }}>
    <span style={{ color: C.green, fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
    <span style={{ color: C.green, fontSize: '0.83rem' }}>{text}</span>
  </div>
);

const SubmitButton = ({ label, onClick, loading, disabled }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    style={{
      background: loading || disabled ? '#aaa' : C.green,
      border: 'none', color: C.white, padding: '11px 24px',
      borderRadius: '40px', fontWeight: 'bold', fontSize: '0.92rem',
      cursor: loading || disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', transition: 'background 0.2s', whiteSpace: 'nowrap',
    }}
    onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.background = '#235a40'; }}
    onMouseLeave={e => { if (!loading && !disabled) e.currentTarget.style.background = C.green; }}
  >
    {loading ? '⏳ Mengirim...' : label}
  </button>
);

const Toast = ({ msg, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem',
      background: msg.type === 'success' ? C.green : '#e74c3c',
      color: C.white, padding: '12px 20px', borderRadius: '14px',
      fontWeight: 'bold', fontSize: '0.9rem', zIndex: 9999,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', transition: 'all 0.3s',
    }}>
      {msg.type === 'success' ? '✅' : '⚠️'} {msg.text}
    </div>
  );
};

// ─── Halaman Utama ─────────────────────────────────────────────────────────────
const StudentHelp = () => {
  const [user, setUser]       = useState(null);
  const [toast, setToast]     = useState(null);

  // Seksi 1 — Bantuan Umum
  const [pesanUmum, setPesanUmum]   = useState('');
  const [loadingUmum, setLoadingUmum] = useState(false);

  // Seksi 2 — Ganti Jadwal
  const [jadwalDipilih, setJadwalDipilih]   = useState('');
  const [tanggalGanti, setTanggalGanti]     = useState('');
  const [alasanGanti, setAlasanGanti]       = useState('');
  const [loadingJadwal, setLoadingJadwal]   = useState(false);

  // Seksi 3 — Penjelasan Materi
  const [mapelDipilih, setMapelDipilih] = useState('');
  const [babDipilih, setBabDipilih]     = useState('');
  const [penjelasan, setPenjelasan]     = useState('');
  const [loadingMateri, setLoadingMateri] = useState(false);

  // Seksi 4 — Pembayaran
  const [jenisBayar, setJenisBayar]         = useState('');
  const [alasanBayar, setAlasanBayar]       = useState('');
  const [fileBukti, setFileBukti]           = useState(null);
  const [dragging, setDragging]             = useState(false);
  const [loadingBayar, setLoadingBayar]     = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user.user_metadata);
    };
    init();
  }, []);

  const showToast = (type, text) => setToast({ type, text });

  // ── Handler Kirim ──────────────────────────────────────────────────────────

  const handleUmum = async () => {
    if (!pesanUmum.trim()) { showToast('error', 'Mohon tulis bantuan yang diperlukan.'); return; }
    setLoadingUmum(true);
    const { error } = await supabase.from('bantuan_umum').insert([{
      user_id: user?.sub || null,
      nama: user?.full_name || 'Siswa',
      pesan: pesanUmum.trim(),
    }]);
    setLoadingUmum(false);
    if (error) { showToast('error', 'Gagal mengirim. Silakan coba lagi.'); return; }
    setPesanUmum('');
    showToast('success', 'Permintaan bantuan berhasil dikirim!');
  };

  const handleGantiJadwal = async () => {
    if (!jadwalDipilih || !tanggalGanti || !alasanGanti.trim()) {
      showToast('error', 'Mohon lengkapi semua field ganti jadwal.');
      return;
    }
    setLoadingJadwal(true);
    const jadwalLabel = dummyJadwal.find(j => String(j.id) === String(jadwalDipilih))?.label || jadwalDipilih;
    const { error } = await supabase.from('bantuan_jadwal').insert([{
      user_id: user?.sub || null,
      nama: user?.full_name || 'Siswa',
      jadwal_asal: jadwalLabel,
      tanggal_pengganti: tanggalGanti,
      alasan: alasanGanti.trim(),
    }]);
    setLoadingJadwal(false);
    if (error) { showToast('error', 'Gagal mengirim. Silakan coba lagi.'); return; }
    setJadwalDipilih(''); setTanggalGanti(''); setAlasanGanti('');
    showToast('success', 'Permintaan ganti jadwal berhasil diajukan!');
  };

  const handleMateri = async () => {
    if (!mapelDipilih || !babDipilih || !penjelasan.trim()) {
      showToast('error', 'Mohon lengkapi semua field permintaan video.');
      return;
    }
    setLoadingMateri(true);
    const { error } = await supabase.from('bantuan_materi').insert([{
      user_id: user?.sub || null,
      nama: user?.full_name || 'Siswa',
      mapel: mapelDipilih,
      bab: babDipilih,
      penjelasan: penjelasan.trim(),
    }]);
    setLoadingMateri(false);
    if (error) { showToast('error', 'Gagal mengirim. Silakan coba lagi.'); return; }
    setMapelDipilih(''); setBabDipilih(''); setPenjelasan('');
    showToast('success', 'Permintaan video penjelasan berhasil dikirim!');
  };

  const handleBayar = async () => {
    if (!jenisBayar || !alasanBayar.trim()) {
      showToast('error', 'Mohon pilih jenis bantuan dan isi keterangan.');
      return;
    }
    setLoadingBayar(true);

    let buktiUrl = null;
    if (fileBukti) {
      const ext  = fileBukti.name.split('.').pop();
      const path = `bantuan-bayar/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('bantuan-files').upload(path, fileBukti);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('bantuan-files').getPublicUrl(path);
        buktiUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('bantuan_pembayaran').insert([{
      user_id: user?.sub || null,
      nama: user?.full_name || 'Siswa',
      jenis: jenisBayar,
      alasan: alasanBayar.trim(),
      bukti_url: buktiUrl,
    }]);
    setLoadingBayar(false);
    if (error) { showToast('error', 'Gagal mengirim. Silakan coba lagi.'); return; }
    setJenisBayar(''); setAlasanBayar(''); setFileBukti(null);
    showToast('success', 'Permintaan bantuan pembayaran berhasil dikirim!');
  };

  const handleDropFile = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f) => {
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = f.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) { showToast('error', 'Format file tidak didukung. Gunakan PDF, JPG, atau PNG.'); return; }
    if (f.size > 5 * 1024 * 1024) { showToast('error', 'Ukuran file maksimal 5MB.'); return; }
    setFileBukti(f);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 'bold', color: C.dark }}>Bantuan</h2>
          <p style={{ margin: 0, color: C.gray, fontSize: '0.92rem' }}>Kami siap membantu menyelesaikan kendalamu.</p>
        </div>

        {/* ── Seksi 1: Bantuan yang Diperlukan ── */}
        <SectionCard number="1" icon="💬" title="Bantuan yang Diperlukan"
          subtitle="Sampaikan kendala atau bantuan apa yang kamu butuhkan. Tim kami akan segera membantu.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Textarea
                placeholder="Tuliskan bantuan yang kamu perlukan..."
                value={pesanUmum}
                onChange={e => setPesanUmum(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <SubmitButton label="Kirim Permintaan" onClick={handleUmum} loading={loadingUmum} />
              </div>
            </div>

            {/* Ilustrasi */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '0.5rem' }}>
              <div style={{ position: 'relative', width: '100px', height: '90px' }}>
                {/* Balon chat */}
                <div style={{
                  position: 'absolute', left: 0, top: 0,
                  width: '64px', height: '56px', background: C.green, borderRadius: '16px 16px 16px 4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: '7px', height: '7px', background: C.white, borderRadius: '50%' }} />
                    ))}
                  </div>
                </div>
                {/* Amplop */}
                <div style={{
                  position: 'absolute', right: 0, bottom: 0,
                  width: '56px', height: '44px', background: '#d4e8dc', borderRadius: '8px',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '6px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: '40px', height: '14px', background: '#a8c8b4', borderRadius: '3px',
                  }} />
                </div>
                {/* Tanda tanya */}
                <div style={{
                  position: 'absolute', right: '-4px', top: '4px',
                  width: '28px', height: '28px', background: '#f59e0b', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', color: C.white, fontSize: '1rem',
                }}>?</div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Seksi 2: Ganti Jadwal ── */}
        <SectionCard number="2" icon="📅" title="Ganti Jadwal"
          subtitle="Ajukan permintaan untuk mengganti jadwal lesmu.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <Label required>Jadwal Les yang Ingin Diganti</Label>
                <SelectInput
                  value={jadwalDipilih}
                  onChange={e => setJadwalDipilih(e.target.value)}
                  placeholder="Pilih jadwal les"
                  options={dummyJadwal}
                />
              </div>
              <div>
                <Label required>Tanggal & Jam Pengganti</Label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="datetime-local"
                    value={tanggalGanti}
                    onChange={e => setTanggalGanti(e.target.value)}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: '12px',
                      border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
                      fontFamily: 'inherit', color: tanggalGanti ? C.dark : C.gray,
                      background: C.white, outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s', cursor: 'pointer',
                    }}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label required>Alasan Ganti Jadwal</Label>
              <Textarea
                placeholder="Tuliskan alasan kamu ingin mengganti jadwal..."
                value={alasanGanti}
                onChange={e => setAlasanGanti(e.target.value)}
                maxLength={300}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <InfoNote text="Permintaan akan diteruskan kepada guru dan admin untuk disetujui." />
              <SubmitButton label="Ajukan Perubahan Jadwal" onClick={handleGantiJadwal} loading={loadingJadwal} />
            </div>
          </div>
        </SectionCard>

        {/* ── Seksi 3: Penjelasan Materi Ulang ── */}
        <SectionCard number="3" icon="▶️" title="Bantuan Penjelasan Materi Ulang (Video)"
          subtitle="Minta penjelasan ulang materi yang belum kamu pahami dalam bentuk video.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <Label required>Mata Pelajaran</Label>
                <SelectInput
                  value={mapelDipilih}
                  onChange={e => { setMapelDipilih(e.target.value); setBabDipilih(''); }}
                  placeholder="Pilih mata pelajaran"
                  options={dummyMapel}
                />
              </div>
              <div>
                <Label required>Bab / Materi</Label>
                <SelectInput
                  value={babDipilih}
                  onChange={e => setBabDipilih(e.target.value)}
                  placeholder="Pilih bab / materi"
                  options={mapelDipilih ? (dummyBab[mapelDipilih] || []) : []}
                />
              </div>
            </div>

            <div>
              <Label required>Jelaskan bagian materi yang belum dipahami</Label>
              <Textarea
                placeholder="Contoh: Saya belum paham pada bagian contoh soal nomor 2 di Bab 2..."
                value={penjelasan}
                onChange={e => setPenjelasan(e.target.value)}
                maxLength={300}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <InfoNote text="Guru akan mengunggah video penjelasan dan dapat kamu akses di menu Materi." />
              <SubmitButton label="Minta Video Penjelasan" onClick={handleMateri} loading={loadingMateri} />
            </div>
          </div>
        </SectionCard>

        {/* ── Seksi 4: Bantuan Pembayaran ── */}
        <SectionCard number="4" icon="💳" title="Bantuan Pembayaran"
          subtitle="Ajukan bantuan terkait pembayaran yang kamu alami.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* Pilihan jenis */}
            <div>
              <Label required>Jenis Bantuan Pembayaran</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem' }}>
                {PAYMENT_OPTIONS.map(opt => {
                  const active = jenisBayar === opt.key;
                  return (
                    <button key={opt.key} onClick={() => setJenisBayar(opt.key)} style={{
                      border: `2px solid ${active ? C.green : C.border}`,
                      borderRadius: '14px', padding: '1rem 0.6rem',
                      background: active ? C.greenBg : C.white,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '8px',
                      transition: 'all 0.15s', position: 'relative',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = C.green + '88'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.border; }}
                    >
                      {active && (
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          width: '20px', height: '20px', background: C.green, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: C.white, fontSize: '0.7rem', fontWeight: 'bold',
                        }}>✓</div>
                      )}
                      <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                      <span style={{
                        fontSize: '0.78rem', color: active ? C.green : C.dark,
                        fontWeight: active ? 'bold' : 'normal', textAlign: 'center', lineHeight: 1.4,
                      }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload + Alasan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Upload */}
              <div>
                <Label>Upload Bukti Pembayaran (Opsional)</Label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDropFile}
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    border: `2px dashed ${dragging ? C.green : C.border}`,
                    borderRadius: '14px', padding: '1.5rem 1rem',
                    background: dragging ? C.greenBg : C.cream,
                    textAlign: 'center', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {fileBukti ? (
                    <div>
                      <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>📎</div>
                      <div style={{ fontSize: '0.82rem', color: C.green, fontWeight: 'bold' }}>{fileBukti.name}</div>
                      <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '4px' }}>
                        {(fileBukti.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>☁️</div>
                      <div style={{ fontSize: '0.84rem', color: C.gray }}>
                        <span style={{ color: C.green, fontWeight: 'bold' }}>Klik untuk upload</span>
                        {' '}atau drag & drop
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '4px' }}>
                        PDF, JPG, PNG (Maks. 5MB)
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef} type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files[0]) validateAndSetFile(e.target.files[0]); }}
                />
                {fileBukti && (
                  <button
                    onClick={() => setFileBukti(null)}
                    style={{
                      background: 'none', border: 'none', color: '#e74c3c',
                      fontSize: '0.8rem', cursor: 'pointer', marginTop: '6px',
                      fontFamily: 'inherit', padding: 0,
                    }}
                  >
                    ✕ Hapus file
                  </button>
                )}
              </div>

              {/* Alasan */}
              <div>
                <Label required>Alasan / Keterangan</Label>
                <div>
                  <textarea
                    placeholder="Jelaskan detail permasalahan pembayaran kamu..."
                    value={alasanBayar}
                    onChange={e => setAlasanBayar(e.target.value)}
                    maxLength={300}
                    rows={6}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      border: `1.5px solid ${C.border}`, fontSize: '0.92rem',
                      fontFamily: 'inherit', color: C.dark, background: C.white,
                      outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: C.gray, marginTop: '4px' }}>
                    {alasanBayar.length}/300
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <SubmitButton label="Kirim Permintaan" onClick={handleBayar} loading={loadingBayar} />
            </div>
          </div>
        </SectionCard>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
          <span style={{ fontSize: '1rem', marginRight: '6px' }}>🛡️</span>
          <span style={{ color: C.gray, fontSize: '0.82rem' }}>
            Permintaan kamu akan diproses oleh tim kami dalam 1x24 jam.
          </span>
        </div>
      </div>

      {/* Toast Notifikasi */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
};

export default StudentHelp;