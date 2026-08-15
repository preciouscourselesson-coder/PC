import { useMemo, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';
import { getHariFromTanggal, nextTanggalForHari } from '../utils/jadwal';
import { getAggregateStatus } from '../utils/pengajuan';
import { formatJam } from '../utils/format';

const FORM_KOSONG = {
  hari_baru: '',
  jam_mulai_baru: '',
  jam_selesai_baru: '',
  is_temporary_baru: false,
  tanggal_temporary_baru: '',
  alasan: '',
};

/**
 * Mengelola seluruh alur pengajuan perubahan jadwal: form ajukan perubahan
 * baru, respon (setuju/tolak) atas pengajuan yang masuk dari guru, serta
 * penghapusan pengajuan milik sendiri yang ditolak dan pengingat yang sudah
 * disetujui semua pihak.
 */
export function usePengajuanJadwal({
  profile,
  jadwalList,
  guruMap,
  pengajuanSaya,
  setPengajuanSaya,
  pengajuanMasuk,
  setPengajuanMasuk,
  setErrorMsg,
  loadAll,
}) {
  const [showForm, setShowForm] = useState(false);
  const [tanggalAsal, setTanggalAsalRaw] = useState('');
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  const [formData, setFormData] = useState(FORM_KOSONG);
  const [submitting, setSubmitting] = useState(false);

  const [respondingId, setRespondingId] = useState(null);
  const [confirmTolakId, setConfirmTolakId] = useState(null);
  const [confirmDeletePengingatId, setConfirmDeletePengingatId] = useState(null);
  const [deletingPengingatId, setDeletingPengingatId] = useState(null);
  const [confirmDeleteSayaId, setConfirmDeleteSayaId] = useState(null);
  const [deletingSayaId, setDeletingSayaId] = useState(null);
  const [showAllPengingat, setShowAllPengingat] = useState(false);

  // Mengubah tanggal asal sekaligus mereset pilihan jadwal (karena kandidat
  // jadwal tergantung tanggal yang dipilih).
  const setTanggalAsal = (value) => {
    setTanggalAsalRaw(value);
    setSelectedJadwalId('');
  };

  const hariAsal = useMemo(() => getHariFromTanggal(tanggalAsal), [tanggalAsal]);

  const kandidatJadwal = useMemo(() => {
    if (!tanggalAsal || !hariAsal) return [];
    return jadwalList.filter((j) => (j.is_temporary ? j.tanggal_temporary === tanggalAsal : j.hari === hariAsal));
  }, [jadwalList, tanggalAsal, hariAsal]);

  const getPihakLabel = (j) => {
    const nama = guruMap[j.guru_id] || 'Guru';
    return `${nama}${j.kelas ? ` (${j.kelas})` : ''} - ${formatJam(j.jam_mulai)}-${formatJam(j.jam_selesai)}`;
  };

  const applyJadwalSelection = (jadwalId) => {
    const j = jadwalList.find((x) => x.id === jadwalId);
    setSelectedJadwalId(jadwalId);
    setFormData((prev) => ({
      ...prev,
      hari_baru: j?.hari || '',
      jam_mulai_baru: j?.jam_mulai ? formatJam(j.jam_mulai) : '',
      jam_selesai_baru: j?.jam_selesai ? formatJam(j.jam_selesai) : '',
    }));
  };

  const openFormFromCell = (jadwalId) => {
    const j = jadwalList.find((x) => x.id === jadwalId);
    setTanggalAsalRaw(j?.is_temporary && j?.tanggal_temporary ? j.tanggal_temporary : nextTanggalForHari(j?.hari || ''));
    setSelectedJadwalId(jadwalId);
    setFormData({
      hari_baru: j?.hari || '',
      jam_mulai_baru: j?.jam_mulai ? formatJam(j.jam_mulai) : '',
      jam_selesai_baru: j?.jam_selesai ? formatJam(j.jam_selesai) : '',
      is_temporary_baru: false,
      tanggal_temporary_baru: '',
      alasan: '',
    });
    setShowForm(true);
  };

  const openBlankForm = () => {
    setTanggalAsalRaw('');
    setSelectedJadwalId('');
    setFormData(FORM_KOSONG);
    setShowForm(true);
  };

  const submitPengajuan = async () => {
    if (!tanggalAsal) {
      setErrorMsg('Pilih tanggal kelas yang ingin diubah terlebih dahulu.');
      return;
    }
    if (!selectedJadwalId) {
      setErrorMsg('Pilih guru/jadwal yang bersangkutan terlebih dahulu.');
      return;
    }
    if (!formData.hari_baru || !formData.jam_mulai_baru || !formData.jam_selesai_baru) {
      setErrorMsg('Isi hari pengganti beserta jam mulai dan jam selesai.');
      return;
    }
    if (formData.is_temporary_baru && !formData.alasan.trim()) {
      setErrorMsg('Isi alasan kenapa perubahan ini bersifat sementara.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const jadwalTerpilih = jadwalList.find((j) => j.id === selectedJadwalId);
      if (!jadwalTerpilih) throw new Error('Jadwal tidak ditemukan.');

      const isGroup = jadwalTerpilih.siswa_ids && jadwalTerpilih.siswa_ids.length > 1;
      const batchId = isGroup
        ? typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`
        : null;

      const payload = {
        jadwal_id: selectedJadwalId,
        guru_id: jadwalTerpilih.guru_id,
        siswa_id: profile.id,
        diajukan_oleh: 'siswa',
        nama_pengaju: profile.full_name,
        hari_baru: formData.hari_baru || null,
        jam_mulai_baru: formData.jam_mulai_baru || null,
        jam_selesai_baru: formData.jam_selesai_baru || null,
        is_temporary_baru: formData.is_temporary_baru,
        tanggal_temporary_baru: formData.is_temporary_baru ? tanggalAsal || null : null,
        alasan: formData.alasan || null,
        status: 'menunggu_persetujuan',
        batch_id: batchId,
      };

      if (isGroup) {
        const siswaIds = jadwalTerpilih.siswa_ids;
        const payloads = siswaIds.map((siswaId) => ({
          ...payload,
          siswa_id: siswaId,
        }));
        const { error } = await supabase.from('pengajuan_perubahan_jadwal').insert(payloads);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pengajuan_perubahan_jadwal').insert(payload);
        if (error) throw error;
      }

      try {
        const { data: guruData } = await supabase
          .from('guru')
          .select('profile_id')
          .eq('id', jadwalTerpilih.guru_id)
          .single();
        if (guruData?.profile_id) {
          await supabase.from('notifikasi').insert({
            user_id: guruData.profile_id,
            pesan: `Siswa ${profile.full_name} mengajukan perubahan jadwal ke ${formData.hari_baru || '-'} ${
              formData.jam_mulai_baru || ''
            }-${formData.jam_selesai_baru || ''}.`,
            link: null,
          });
        }
      } catch (notifErr) {
        console.error('Gagal kirim notifikasi ke guru:', notifErr);
      }

      setShowForm(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const respondPengajuan = async (p, setuju) => {
    setErrorMsg('');
    setRespondingId(p.id);
    try {
      const newStatus = setuju ? 'disetujui_siswa' : 'ditolak';
      const { error } = await checkedUpdate(
        supabase.from('pengajuan_perubahan_jadwal').update({ status: newStatus }).eq('id', p.id).eq('siswa_id', profile.id),
        { notFoundMessage: 'Perubahan tidak tersimpan (kemungkinan dibatasi oleh policy keamanan database). Hubungi admin.' }
      );
      if (error) throw error;

      if (setuju) {
        try {
          const { data: guruData } = await supabase.from('guru').select('profile_id').eq('id', p.guru_id).single();
          if (guruData?.profile_id) {
            await supabase.from('notifikasi').insert({
              user_id: guruData.profile_id,
              pesan: `Siswa ${profile.full_name} menyetujui pengajuan perubahan jadwal ke ${p.hari_baru || '-'}.`,
              link: null,
            });
          }
        } catch (notifErr) {
          console.error('Gagal kirim notifikasi ke guru:', notifErr);
        }
      }

      setConfirmTolakId(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memperbarui pengajuan.');
    } finally {
      setRespondingId(null);
    }
  };

  const hapusPerubahanDisetujui = async (p) => {
    setDeletingPengingatId(p.id);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .delete()
        .eq('id', p.id)
        .eq('siswa_id', profile.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Data tidak terhapus (kemungkinan diblokir aturan akses/RLS di database).');
      }
      setPengajuanMasuk((list) => list.filter((item) => item.id !== p.id));
      setPengajuanSaya((list) => list.filter((item) => item.id !== p.id));
      setConfirmDeletePengingatId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus pengingat.');
    } finally {
      setDeletingPengingatId(null);
    }
  };

  // Hapus pengajuan milik saya yang statusnya ditolak (oleh guru maupun admin)
  // dari daftar "Pengajuan Saya". Mendukung pengajuan tunggal maupun batch.
  const hapusPengajuanSaya = async (item) => {
    setDeletingSayaId(item.id);
    setErrorMsg('');
    try {
      let query = supabase.from('pengajuan_perubahan_jadwal').delete().eq('siswa_id', profile.id);
      query = item.isBatch ? query.eq('batch_id', item.id) : query.eq('id', item.id);
      const { data, error } = await query.select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Data tidak terhapus (kemungkinan diblokir aturan akses/RLS di database).');
      }
      const idsTerhapus = new Set(data.map((d) => d.id));
      setPengajuanSaya((list) => list.filter((row) => !idsTerhapus.has(row.id)));
      setPengajuanMasuk((list) => list.filter((row) => !idsTerhapus.has(row.id)));
      setConfirmDeleteSayaId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus pengajuan.');
    } finally {
      setDeletingSayaId(null);
    }
  };

  // Pengajuan milik saya, dikelompokkan per batch (kalau ada), dan
  // menyingkirkan yang sudah disetujui admin (dipindahkan ke kartu pengingat).
  const pengajuanSayaGrouped = useMemo(() => {
    const batchMap = new Map();
    const items = [];
    pengajuanSaya.forEach((p) => {
      if (p.batch_id) {
        if (!batchMap.has(p.batch_id)) {
          const group = { id: p.batch_id, isBatch: true, rows: [], created_at: p.created_at };
          batchMap.set(p.batch_id, group);
          items.push(group);
        }
        batchMap.get(p.batch_id).rows.push(p);
      } else {
        items.push({ id: p.id, isBatch: false, rows: [p], created_at: p.created_at });
      }
    });
    return items
      .filter((item) => getAggregateStatus(item.rows) !== 'disetujui_admin')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [pengajuanSaya]);

  // Perubahan jadwal yang sudah disetujui ketiganya (siswa, guru, admin) —
  // dipakai untuk kartu pengingat. Perubahan sementara yang tanggal berlakunya
  // sudah lewat ditandai supaya bisa dihapus (dibersihkan) manual.
  const perubahanDisetujuiList = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isTanggalLewat = (tanggalStr) => !!tanggalStr && tanggalStr < todayStr;
    const gabungan = [...pengajuanMasuk, ...pengajuanSaya].filter((p) => p.status === 'disetujui_admin');
    return gabungan
      .map((p) => ({ ...p, sudahLewat: p.is_temporary_baru ? isTanggalLewat(p.tanggal_temporary_baru) : false }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [pengajuanMasuk, pengajuanSaya]);

  return {
    // form ajukan perubahan
    showForm,
    setShowForm,
    tanggalAsal,
    setTanggalAsal,
    hariAsal,
    selectedJadwalId,
    kandidatJadwal,
    getPihakLabel,
    applyJadwalSelection,
    openFormFromCell,
    openBlankForm,
    formData,
    setFormData,
    submitting,
    submitPengajuan,
    // respon pengajuan masuk
    respondingId,
    confirmTolakId,
    setConfirmTolakId,
    respondPengajuan,
    // pengajuan saya
    pengajuanSayaGrouped,
    confirmDeleteSayaId,
    setConfirmDeleteSayaId,
    deletingSayaId,
    hapusPengajuanSaya,
    // pengingat perubahan disetujui
    perubahanDisetujuiList,
    showAllPengingat,
    setShowAllPengingat,
    confirmDeletePengingatId,
    setConfirmDeletePengingatId,
    deletingPengingatId,
    hapusPerubahanDisetujui,
  };
}
