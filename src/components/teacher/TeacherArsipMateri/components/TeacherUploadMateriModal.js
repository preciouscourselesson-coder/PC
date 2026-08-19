import React, { useEffect, useRef, useState } from 'react';
import { C } from '../../../shared/Theme';
import { KATEGORI_OPTIONS, BENTUK_OPTIONS, MAPEL_OPTIONS, KELAS_GROUPS, JENIS_OPTIONS, JENIS_LABEL } from '../constants';
import { useUploadMateriForm } from '../hooks/useUploadMateriForm';
import { SegmentedControl } from './SegmentedControl';

const uploadFieldLabel = { fontSize: '0.8rem', color: C.gray, display: 'block', marginBottom: '4px', marginTop: '10px' };
const uploadFieldInput = { width: '100%', padding: '10px 11px', borderRadius: '9px', border: `1.5px solid ${C.border}`, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' };

export const TeacherUploadMateriModal = ({ userId, onUploaded, prefill }) => {
  const {
    loadingOptions,
    kategori, setKategori,
    folderList, loadingFolders, folderId, setFolderId,
    showNewFolderInput, setShowNewFolderInput,
    newFolderName, setNewFolderName,
    creatingFolder, folderErrorMsg,
    handleCreateFolder,
    mapel, setMapel,
    bab, setBab,
    subBab, setSubBab,
    babHistory,
    kelas, setKelas,
    judul, setJudul,
    deskripsi, setDeskripsi,
    bentuk, setBentuk,
    fileInputKey, handleFileChange,
    link, setLink,
    pengajar, setPengajar,
    jenis, setJenis,
    uploading, errorMsg, successMsg,
    handleSubmit,
  } = useUploadMateriForm({ userId, onUploaded });

  // Prefill datang dari MateriRequestSection/KirimMateriModal (TeacherHome.js)
  // saat guru menjawab permintaan materi siswa lewat "Upload dulu di Arsip
  // Materi ->". Hanya diterapkan sekali per mount (dan setelah loadingOptions
  // selesai, supaya tidak tertimpa reset dari useUploadMateriForm).
  const appliedPrefillRef = useRef(false);
  const [cameFromRequest, setCameFromRequest] = useState(false);
  useEffect(() => {
    if (!prefill || appliedPrefillRef.current || loadingOptions) return;
    setKategori('Sekolah'); // request materi selalu untuk siswa -> kategori Shared
    if (prefill.judul) setJudul(prefill.judul);
    if (prefill.kelas) setKelas(prefill.kelas);
    if (prefill.deskripsi) setDeskripsi(prefill.deskripsi);
    setCameFromRequest(true);
    appliedPrefillRef.current = true;
  }, [prefill, loadingOptions, setKategori, setJudul, setKelas, setDeskripsi]);

  return (
    <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.2rem', fontFamily: 'inherit' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: C.dark, marginBottom: '4px' }}>+ Unggah Materi</div>
        <div style={{ fontSize: '0.82rem', color: C.gray }}>Materi akan tersimpan di penyimpanan dan tabel materi.</div>

        {loadingOptions ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: C.gray }}>Memuat data...</div>
        ) : (
          <>
            {cameFromRequest && (
              <div style={{ background: C.goldBg, color: C.gold, borderRadius: '8px', padding: '8px 10px', fontSize: '0.78rem', marginTop: '10px', fontWeight: 600, lineHeight: 1.5 }}>
                📥 Menjawab permintaan materi siswa — Judul &amp; Kelas sudah terisi. Lengkapi Mapel &amp; Bab sebelum unggah, lalu pilih folder siswa (🎓) yang sesuai.
              </div>
            )}

            <label style={uploadFieldLabel}>Kategori Materi</label>
            <SegmentedControl options={KATEGORI_OPTIONS} value={kategori} onChange={setKategori} />

            <label style={uploadFieldLabel}>Folder</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                style={{ ...uploadFieldInput, flex: 1 }}
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                disabled={loadingFolders}
              >
                <option value="">Tanpa folder (Umum)</option>
                {folderList.map(f => <option key={f.id} value={f.id}>{f.siswa_id ? '🎓 ' : ''}{f.nama}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowNewFolderInput(s => !s)}
                style={{ padding: '0 14px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: showNewFolderInput ? C.goldBg : C.white, color: C.gold, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                + Folder
              </button>
            </div>
            {loadingFolders && <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '4px' }}>Memuat folder...</div>}
            {showNewFolderInput && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input
                  style={{ ...uploadFieldInput, flex: 1 }}
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder={`Nama folder ${kategori === 'Sekolah' ? 'sekolah' : 'pribadi'} baru...`}
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={creatingFolder}
                  style={{ padding: '0 14px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  {creatingFolder ? '...' : 'Buat'}
                </button>
              </div>
            )}
            {folderErrorMsg && <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '4px' }}>{folderErrorMsg}</div>}

            <label style={uploadFieldLabel}>Judul Materi</label>
            <input style={uploadFieldInput} value={judul} onChange={e => setJudul(e.target.value)} placeholder="Misal: Persamaan Kuadrat" />

            <label style={uploadFieldLabel}>Deskripsi (opsional)</label>
            <textarea style={{ ...uploadFieldInput, resize: 'vertical' }} rows={2} value={deskripsi} onChange={e => setDeskripsi(e.target.value)} placeholder="Ringkasan singkat isi materi" />

            <label style={uploadFieldLabel}>Kelas</label>
            <select style={uploadFieldInput} value={kelas} onChange={e => setKelas(e.target.value)}>
              <option value="">Pilih kelas...</option>
              {KELAS_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(k => <option key={k} value={k}>{k}</option>)}
                </optgroup>
              ))}
            </select>

            <label style={uploadFieldLabel}>Mapel</label>
            <select
              style={uploadFieldInput}
              value={mapel}
              onChange={e => setMapel(e.target.value)}
            >
              <option value="">Pilih mapel...</option>
              {MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <label style={uploadFieldLabel}>Bab / Topik</label>
            <input
              style={uploadFieldInput}
              value={bab}
              onChange={e => setBab(e.target.value)}
              placeholder="Misal: Persamaan Kuadrat"
              list="bab-history-list"
            />
            <datalist id="bab-history-list">
              {babHistory.map(b => <option key={b} value={b} />)}
            </datalist>

            <label style={uploadFieldLabel}>Sub Bab (opsional)</label>
            <input
              style={uploadFieldInput}
              value={subBab}
              onChange={e => setSubBab(e.target.value)}
              placeholder="Misal: Rumus ABC"
            />

            {kategori === 'Sekolah' && (
              <>
                <label style={uploadFieldLabel}>Pengajar Materi Ini</label>
                <input style={uploadFieldInput} value={pengajar} onChange={e => setPengajar(e.target.value)} placeholder="Nama guru pengajar materi" />

                <label style={uploadFieldLabel}>Jenis</label>
                <select style={uploadFieldInput} value={jenis} onChange={e => setJenis(e.target.value)}>
                  {JENIS_OPTIONS.map(j => <option key={j} value={j}>{JENIS_LABEL[j] || j}</option>)}
                </select>
              </>
            )}

            <label style={uploadFieldLabel}>Bentuk</label>
            <SegmentedControl options={BENTUK_OPTIONS} value={bentuk} onChange={setBentuk} />

            {bentuk === 'File' ? (
              <>
                <label style={uploadFieldLabel}>File Materi</label>
                <input key={fileInputKey} type="file" onChange={handleFileChange} style={{ width: '100%', fontSize: '0.85rem' }} />
              </>
            ) : (
              <>
                <label style={uploadFieldLabel}>Tautan (Link)</label>
                <input style={uploadFieldInput} value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
              </>
            )}

            {errorMsg && <div style={{ color: C.red, fontSize: '0.82rem', marginTop: '10px' }}>{errorMsg}</div>}
            {!errorMsg && successMsg && <div style={{ color: C.green, fontSize: '0.82rem', marginTop: '10px' }}>{successMsg}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
              >
                {uploading ? 'Mengunggah...' : 'Unggah'}
              </button>
            </div>
          </>
        )}
    </div>
  );
};