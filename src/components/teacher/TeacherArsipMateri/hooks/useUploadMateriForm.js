import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabaseClient';

export const useUploadMateriForm = ({ userId, onUploaded }) => {
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Kategori sumber materi: Pribadi atau Sekolah yang diajar
  const [kategori, setKategori] = useState('Pribadi');

  // Folder tempat materi dikelompokkan (spesifik per kategori)
  const [folderList, setFolderList] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderId, setFolderId] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderErrorMsg, setFolderErrorMsg] = useState('');

  // Mapel sekarang dropdown tetap (lihat MAPEL_OPTIONS); Bab & Sub Bab tetap
  // input teks bebas (tidak bergantung ke tabel bab_ajar)
  const [mapel, setMapel] = useState('');
  const [bab, setBab] = useState('');
  const [subBab, setSubBab] = useState('');
  // Riwayat bab yang pernah diketik guru ini, dipakai sebagai saran datalist saja
  const [babHistory, setBabHistory] = useState([]);

  const [kelas, setKelas] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  // Bentuk materi: unggah File atau tautan Link
  const [bentuk, setBentuk] = useState('File');
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [link, setLink] = useState('');

  // Field khusus kategori Sekolah
  const [pengajar, setPengajar] = useState('');
  const [jenis, setJenis] = useState('Materi');

  const [namaGuru, setNamaGuru] = useState('');

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoadingOptions(true);

      const [{ data: profile }, { data: riwayatMateri }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).single(),
        supabase.from('materi_file').select('mapel, bab').eq('user_id', userId),
      ]);

      setNamaGuru(profile?.full_name || '');
      setPengajar(profile?.full_name || '');
      setBabHistory(Array.from(new Set((riwayatMateri || []).map(r => r.bab).filter(Boolean))).sort());
      setLoadingOptions(false);
    };
    loadData();
  }, [userId]);

  // Muat ulang daftar folder setiap kali kategori (Pribadi/Sekolah) berganti
  const loadFolders = useCallback(async (kat) => {
    if (!userId) return;
    setLoadingFolders(true);
    const { data, error } = await supabase
      .from('folder_materi')
      .select('id, nama, siswa_id')
      .eq('user_id', userId)
      .eq('kategori', kat)
      .order('nama', { ascending: true });
    if (!error) setFolderList(data || []);
    setLoadingFolders(false);
  }, [userId]);

  useEffect(() => {
    setFolderId('');
    setShowNewFolderInput(false);
    setNewFolderName('');
    setFolderErrorMsg('');
    loadFolders(kategori);
  }, [kategori, loadFolders]);

  const handleCreateFolder = async () => {
    setFolderErrorMsg('');
    if (!newFolderName.trim()) {
      setFolderErrorMsg('Nama folder wajib diisi.');
      return;
    }
    setCreatingFolder(true);
    try {
      const { data, error } = await supabase
        .from('folder_materi')
        .insert({ user_id: userId, nama: newFolderName.trim(), kategori })
        .select('id, nama')
        .single();
      if (error) throw error;
      setFolderList(prev => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setFolderId(data.id);
      setNewFolderName('');
      setShowNewFolderInput(false);
    } catch (err) {
      console.error(err);
      setFolderErrorMsg('Gagal membuat folder: ' + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.size > 10 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 10MB.');
      return;
    }
    setErrorMsg('');
    setFile(f || null);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!judul.trim()) return setErrorMsg('Judul materi wajib diisi.');
    if (!mapel.trim()) return setErrorMsg('Isi Mapel.');
    if (!bab.trim()) return setErrorMsg('Isi Bab / Topik.');
    if (!kelas) return setErrorMsg('Pilih Kelas.');
    if (kategori === 'Sekolah' && !pengajar.trim()) return setErrorMsg('Isi nama pengajar materi ini.');
    if (bentuk === 'File' && !file) return setErrorMsg('Pilih file untuk diunggah.');
    if (bentuk === 'Link' && !link.trim()) return setErrorMsg('Isi tautan (link) materi.');

    setUploading(true);
    try {
      let finalUrl = '';
      let tipe = 'link';

      if (bentuk === 'File') {
        const safeName = file.name.replace(/\s+/g, '_');
        const path = `${userId}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from('materi').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('materi').getPublicUrl(path);
        finalUrl = publicUrlData.publicUrl;
        tipe = file.type || safeName.split('.').pop();
      } else {
        finalUrl = link.trim();
      }

      const { error: insertError } = await supabase.from('materi_file').insert({
        mapel: mapel.trim(),
        bab: bab.trim(),
        sub_bab: subBab.trim() || null,
        user_id: userId,
        nama: judul.trim(),
        tipe,
        diupload_oleh: namaGuru,
        tanggal: new Date().toISOString(),
        url: finalUrl,
        kelas,
        deskripsi: deskripsi.trim() || null,
        status: 'Dipublish',
        kategori,
        folder_id: folderId || null,
        bentuk,
        pengajar: kategori === 'Sekolah' ? pengajar.trim() : null,
        jenis: kategori === 'Sekolah' ? jenis : null,
      });
      if (insertError) throw insertError;

      // Reset field yang biasanya beda tiap materi, biarkan Kategori/Folder/Kelas/
      // Mapel/Bab tetap terisi supaya guru bisa langsung unggah beberapa
      // materi berikutnya untuk folder & bab yang sama tanpa mengisi ulang dari awal.
      setJudul('');
      setDeskripsi('');
      setFile(null);
      setFileInputKey(k => k + 1);
      setLink('');
      setSuccessMsg('Materi berhasil diunggah.');
      setBabHistory(prev => Array.from(new Set([...prev, bab.trim()])).sort());

      onUploaded('Dipublish');
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mengunggah materi: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return {
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
    file, fileInputKey, handleFileChange,
    link, setLink,
    pengajar, setPengajar,
    jenis, setJenis,
    uploading, errorMsg, successMsg,
    handleSubmit,
  };
};
