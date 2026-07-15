// src/components/student/StudentScore.js
import React, { useState, useEffect, useCallback } from 'react';
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
  red:     '#e74c3c',
  redBg:   '#fff0f0',
  orange:  '#f39c12',
  orangeBg:'#fef9e7',
  blue:    '#2980b9',
  blueBg:  '#f0f7ff',
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};


const getGrade = (score) => {
  if (score >= 90) return { label: 'A', color: C.green };
  if (score >= 80) return { label: 'B', color: C.gold };
  if (score >= 70) return { label: 'C', color: C.orange };
  return { label: 'D', color: C.red };
};

// ─── Data dummy ──────────────────────────────────────────────────────────────
const dummyScores = [
  {
    id: 1,
    mapel: 'Matematika',
    judul: 'Bab 3: Persamaan Kuadrat',
    jenis: 'Ulangan Harian',
    tanggal: '2025-05-27',
    semester: 'Semester Genap',
    nilai: 90,
    bukti: 'bukti_math.jpg',
  },
  {
    id: 2,
    mapel: 'Kimia',
    judul: 'Reaksi Redoks',
    jenis: 'Ulangan Harian',
    tanggal: '2025-05-24',
    semester: 'Semester Genap',
    nilai: 88,
    bukti: 'bukti_kimia.jpg',
  },
  {
    id: 3,
    mapel: 'Bahasa Indonesia',
    judul: 'Menulis Teks Eksplanasi',
    jenis: 'Tugas',
    tanggal: '2025-05-20',
    semester: 'Semester Genap',
    nilai: 85,
    bukti: 'bukti_bindo.jpg',
  },
  {
    id: 4,
    mapel: 'Fisika',
    judul: 'Gerak Parabola',
    jenis: 'Ulangan Harian',
    tanggal: '2025-05-19',
    semester: 'Semester Genap',
    nilai: 92,
    bukti: null,
  },
  {
    id: 5,
    mapel: 'Biologi',
    judul: 'Sistem Pernapasan',
    jenis: 'Ulangan Harian',
    tanggal: '2025-05-15',
    semester: 'Semester Genap',
    nilai: 95,
    bukti: 'bukti_biologi.jpg',
  },
  {
    id: 6,
    mapel: 'Bahasa Inggris',
    judul: 'Recount Text',
    jenis: 'Ulangan Harian',
    tanggal: '2025-05-17',
    semester: 'Semester Genap',
    nilai: 75,
    bukti: null,
  },
  {
    id: 7,
    mapel: 'Matematika',
    judul: 'Bab 2: Fungsi Kuadrat',
    jenis: 'Tugas',
    tanggal: '2025-05-10',
    semester: 'Semester Genap',
    nilai: 82,
    bukti: null,
  },
  {
    id: 8,
    mapel: 'Kimia',
    judul: 'Struktur Atom',
    jenis: 'Ulangan Harian',
    tanggal: '2025-05-05',
    semester: 'Semester Genap',
    nilai: 78,
    bukti: null,
  },
];

// ─── Komponen Kartu Stat ─────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = C.dark }) => (
  <div style={{
    background: C.white,
    borderRadius: '20px',
    padding: '1.2rem 1.5rem',
    border: `1.5px solid ${C.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '14px',
      background: C.goldBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ color: C.gray, fontSize: '0.78rem', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontWeight: 'bold', fontSize: '1.6rem', color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>{sub}</div>}
    </div>
  </div>
);

// ─── Komponen Score Card ────────────────────────────────────────────────────
const ScoreCard = ({ score }) => {
  const grade = getGrade(score.nilai);
  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: '16px',
      padding: '1rem 1.5rem',
      marginBottom: '0.8rem',
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
            <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '1rem' }}>{score.mapel}</span>
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>• {score.judul}</span>
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>• {score.semester}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', marginTop: '4px' }}>
            <span style={{
              background: '#e6f4ee',
              color: C.green,
              padding: '2px 12px',
              borderRadius: '40px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}>
              {score.jenis}
            </span>
            <span style={{ color: C.gray, fontSize: '0.78rem' }}>{formatDate(score.tanggal)}</span>
            {score.bukti && (
              <span style={{
                background: C.goldBg,
                color: C.gold,
                padding: '2px 10px',
                borderRadius: '40px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                📎 Bukti Nilai
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: grade.color }}>
            {score.nilai}
          </div>
          <div style={{ color: C.gray, fontSize: '0.7rem' }}>/ 100</div>
        </div>
      </div>
    </div>
  );
};

// ─── Komponen Distribusi Nilai ──────────────────────────────────────────────
const DistributionChart = ({ scores }) => {
  const total = scores.length;
  const distribution = {
    A: scores.filter(s => s.nilai >= 90).length,
    B: scores.filter(s => s.nilai >= 80 && s.nilai < 90).length,
    C: scores.filter(s => s.nilai >= 70 && s.nilai < 80).length,
    D: scores.filter(s => s.nilai < 70).length,
  };

  const colors = {
    A: C.green,
    B: C.gold,
    C: C.orange,
    D: C.red,
  };

  const ranges = {
    A: '90 - 100',
    B: '80 - 89',
    C: '70 - 79',
    D: '< 70',
  };

  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: '16px',
      padding: '1.2rem 1.5rem',
    }}>
      <h4 style={{ margin: '0 0 1rem', color: C.dark, fontSize: '1rem' }}>Distribusi Nilai</h4>
      {Object.keys(distribution).map(grade => {
        const count = distribution[grade];
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        return (
          <div key={grade} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}>
            <div style={{ width: '30px', fontWeight: 'bold', color: colors[grade], fontSize: '0.9rem' }}>
              {grade}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                height: '8px',
                background: C.cream,
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: colors[grade],
                  borderRadius: '4px',
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
            <div style={{
              color: C.gray,
              fontSize: '0.78rem',
              minWidth: '80px',
              textAlign: 'right',
            }}>
              {ranges[grade]} • {count} nilai ({percentage}%)
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Komponen Form Tambah Nilai ─────────────────────────────────────────────
const AddScoreForm = ({ mapelList, onSave }) => {
  const [formData, setFormData] = useState({
    mapel: '',
    jenis: '',
    nilai: '',
    catatan: '',
  });
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.mapel || !formData.jenis || !formData.nilai) {
      alert('Mohon lengkapi semua field yang wajib diisi.');
      return;
    }
    const nilaiNum = parseFloat(formData.nilai);
    if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 100) {
      alert('Nilai harus antara 0 - 100.');
      return;
    }
    onSave({ ...formData, nilai: nilaiNum, bukti: file ? file.name : null });
    setFormData({ mapel: '', jenis: '', nilai: '', catatan: '' });
    setFile(null);
  };

  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: '20px',
      padding: '1.5rem',
    }}>
      <h4 style={{ margin: '0 0 1rem', color: C.dark, fontSize: '1rem' }}>Tambah Nilai Baru</h4>
      <p style={{ color: C.gray, fontSize: '0.85rem', marginBottom: '1.2rem' }}>
        Catat nilai yang kamu dapatkan di sekolah.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: C.gray, marginBottom: '4px', fontWeight: 'bold' }}>
              Mata Pelajaran *
            </label>
            <select
              value={formData.mapel}
              onChange={e => setFormData({ ...formData, mapel: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${C.border}`,
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                color: C.dark,
                background: C.white,
                outline: 'none',
              }}
              required
            >
              <option value="">Pilih Mapel</option>
              {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: C.gray, marginBottom: '4px', fontWeight: 'bold' }}>
              Jenis Penilaian *
            </label>
            <select
              value={formData.jenis}
              onChange={e => setFormData({ ...formData, jenis: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${C.border}`,
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                color: C.dark,
                background: C.white,
                outline: 'none',
              }}
              required
            >
              <option value="">Pilih Jenis Penilaian</option>
              <option value="Ulangan Harian">Ulangan Harian</option>
              <option value="Tugas">Tugas</option>
              <option value="UTS">UTS</option>
              <option value="UAS">UAS</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: C.gray, marginBottom: '4px', fontWeight: 'bold' }}>
            Nilai (0 - 100) *
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.nilai}
            onChange={e => setFormData({ ...formData, nilai: e.target.value })}
            placeholder="Masukkan nilai"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: `1.5px solid ${C.border}`,
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              color: C.dark,
              background: C.white,
              outline: 'none',
            }}
            required
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: C.gray, marginBottom: '4px', fontWeight: 'bold' }}>
            Catatan (Opsional)
          </label>
          <input
            type="text"
            value={formData.catatan}
            onChange={e => setFormData({ ...formData, catatan: e.target.value })}
            placeholder="Contoh: Materi yang diujikan, dll."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: `1.5px solid ${C.border}`,
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              color: C.dark,
              background: C.white,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: C.gray, marginBottom: '4px', fontWeight: 'bold' }}>
            Upload Bukti (Opsional)
          </label>
          <div style={{
            border: `2px dashed ${C.border}`,
            borderRadius: '12px',
            padding: '1.2rem',
            textAlign: 'center',
            background: C.cream,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
              setFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => document.getElementById('fileInput').click()}
          >
            <input
              id="fileInput"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])}
            />
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📤</div>
            <div style={{ fontSize: '0.85rem', color: C.gray }}>
              {file ? `📎 ${file.name}` : 'Klik untuk upload atau drag & drop'}
            </div>
            <div style={{ fontSize: '0.7rem', color: C.gray, marginTop: '4px' }}>
              JPG, PNG, PDF (Maks. 5MB)
            </div>
          </div>
        </div>
        <button
          type="submit"
          style={{
            width: '100%',
            background: C.gold,
            border: 'none',
            color: C.white,
            padding: '12px',
            borderRadius: '40px',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#c8a84e'}
          onMouseLeave={e => e.currentTarget.style.background = C.gold}
        >
          Simpan Nilai
        </button>
      </form>
    </div>
  );
};

// ─── Halaman Utama ───────────────────────────────────────────────────────────
const StudentScore = () => {
  const [user, setUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [filteredScores, setFilteredScores] = useState([]);
  const [sortBy, setSortBy] = useState('Terbaru');
  const [filterMapel, setFilterMapel] = useState('Semua Mapel');

  // ── Statistik ──────────────────────────────────────────────────────────────
  const totalScores = scores.length;
  const avgScore = totalScores > 0 ? (scores.reduce((sum, s) => sum + s.nilai, 0) / totalScores).toFixed(1) : 0;
  const highestScore = totalScores > 0 ? Math.max(...scores.map(s => s.nilai)) : 0;
  const highestSubject = totalScores > 0 ? scores.find(s => s.nilai === highestScore)?.mapel || '-' : '-';
  const uniqueMapels = [...new Set(scores.map(s => s.mapel))];
  const withBukti = scores.filter(s => s.bukti).length;

  // ── Ambil data user ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user.user_metadata);
    };
    init();
  }, []);

  // ── Inisialisasi data dummy ──────────────────────────────────────────────
  useEffect(() => {
    setScores(dummyScores);
  }, []);

  // ── Filter & Sortir ──────────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    let result = [...scores];

    if (filterMapel !== 'Semua Mapel') {
      result = result.filter(s => s.mapel === filterMapel);
    }

    if (sortBy === 'Terbaru') {
      result.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    } else if (sortBy === 'Terlama') {
      result.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    } else if (sortBy === 'Tertinggi') {
      result.sort((a, b) => b.nilai - a.nilai);
    } else if (sortBy === 'Terendah') {
      result.sort((a, b) => a.nilai - b.nilai);
    }

    setFilteredScores(result);
  }, [scores, filterMapel, sortBy]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ── Handle tambah nilai ──────────────────────────────────────────────────
  const handleAddScore = (newScore) => {
    const newEntry = {
      id: scores.length + 1,
      mapel: newScore.mapel,
      judul: newScore.catatan || `Nilai ${newScore.jenis}`,
      jenis: newScore.jenis,
      tanggal: new Date().toISOString().split('T')[0],
      semester: 'Semester Genap 2024/2025',
      nilai: newScore.nilai,
      bukti: newScore.bukti,
    };
    setScores([newEntry, ...scores]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const namaDepan = user?.full_name?.split(' ')[0] || 'Siswa';

  return (
    <>
      <div style={{ maxWidth: '960px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 'bold', color: C.dark }}>
            Hai, {namaDepan}! 🎓
          </h2>
          <p style={{ margin: 0, color: C.gray, fontSize: '0.95rem' }}>
            Yuk catat nilai terbaikmu dan pantau perkembangan belajarmu.
          </p>
        </div>

        {/* Statistik */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <StatCard icon="📊" label="Rata-rata Nilai" value={avgScore} sub="Baik" color={parseFloat(avgScore) >= 75 ? C.green : C.red} />
          <StatCard icon="🏆" label="Nilai Tertinggi" value={highestScore} sub={highestSubject} color={C.gold} />
          <StatCard icon="📝" label="Jumlah Nilai Dicatat" value={totalScores} sub={`Dari ${uniqueMapels.length} mapel`} />
          <StatCard icon="📎" label="Bukti Nilai" value={withBukti} sub="Dokumen" />
        </div>

        {/* Filter dan Sorting */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          padding: '0.8rem 0',
        }}>
          <select
            value={filterMapel}
            onChange={e => setFilterMapel(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '40px',
              border: `1.5px solid ${C.border}`,
              fontSize: '0.82rem',
              fontFamily: 'inherit',
              background: C.white,
              color: C.dark,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="Semua Mapel">Semua Mapel</option>
            {uniqueMapels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '40px',
              border: `1.5px solid ${C.border}`,
              fontSize: '0.82rem',
              fontFamily: 'inherit',
              background: C.white,
              color: C.dark,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="Terbaru">Urutkan: Terbaru</option>
            <option value="Terlama">Urutkan: Terlama</option>
            <option value="Tertinggi">Urutkan: Tertinggi</option>
            <option value="Terendah">Urutkan: Terendah</option>
          </select>
        </div>

        {/* Daftar Nilai + Distribusi */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            <h4 style={{ margin: '0 0 0.8rem', color: C.dark, fontSize: '1rem' }}>Daftar Nilai</h4>
            {filteredScores.length === 0 ? (
              <div style={{
                background: C.white,
                border: `1.5px solid ${C.border}`,
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                color: C.gray,
              }}>
                Belum ada nilai dicatat.
              </div>
            ) : (
              filteredScores.map(score => <ScoreCard key={score.id} score={score} />)
            )}
          </div>
          <DistributionChart scores={filteredScores} />
        </div>

        {/* Tips Mencatat Nilai */}
        <div style={{
          background: C.goldBg,
          border: `1.5px solid ${C.gold}`,
          borderRadius: '20px',
          padding: '1.5rem',
        }}>
          <h4 style={{ margin: '0 0 0.8rem', color: C.dark, fontSize: '1rem' }}>💡 Tips Mencatat Nilai</h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: C.gray, fontSize: '0.9rem', lineHeight: 1.8 }}>
            <li>Catat nilai segera setelah diterima</li>
            <li>Unggah bukti nilai yang jelas</li>
            <li>Pastikan mapel &amp; jenis penilaian sudah benar</li>
          </ul>
        </div>

        {/* Form Tambah Nilai + Upload Terbaru */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <AddScoreForm mapelList={uniqueMapels} onSave={handleAddScore} />

          <div>
            <h4 style={{ margin: '0 0 0.8rem', color: C.dark, fontSize: '1rem' }}>Upload Terbaru</h4>
            {scores.filter(s => s.bukti).slice(0, 3).map(score => (
              <div key={score.id} style={{
                background: C.white,
                border: `1.5px solid ${C.border}`,
                borderRadius: '16px',
                padding: '0.8rem 1.2rem',
                marginBottom: '0.6rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.9rem' }}>{score.mapel}</div>
                  <div style={{ color: C.gray, fontSize: '0.75rem' }}>{score.jenis} • {formatDate(score.tanggal)}</div>
                </div>
                <div style={{ fontWeight: 'bold', color: C.gold, fontSize: '1.1rem' }}>{score.nilai}</div>
              </div>
            ))}
            <button
              onClick={() => alert('Lihat semua upload bukti nilai')}
              style={{
                background: 'none',
                border: 'none',
                color: C.gold,
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '0.4rem 0',
              }}
            >
              Lihat semua →
            </button>
          </div>
        </div>

        {/* Catatan Penting */}
        <div style={{
          background: C.cream,
          borderRadius: '16px',
          padding: '1.2rem 1.5rem',
          border: `1px solid ${C.border}`,
        }}>
          <h4 style={{ margin: '0 0 4px', color: C.dark, fontSize: '0.95rem' }}>📌 Catatan Penting</h4>
          <p style={{ margin: 0, color: C.gray, fontSize: '0.88rem' }}>
            Nilai yang kamu input akan membantu memantau perkembangan belajarmu. Pastikan data yang diinput sudah benar ya!
          </p>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.78rem', marginTop: '0.5rem' }}>
          © 2026 Precious Course. All rights reserved.
        </p>
      </div>
    </>
  );
};

export default StudentScore;