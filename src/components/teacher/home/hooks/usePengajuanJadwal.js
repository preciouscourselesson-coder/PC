import { useMemo, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';
import { getHariFromTanggal, nextTanggalForHari } from '../utils/jadwal';
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
 * Mengelola seluruh alur pengajuan perubahan jadwal milik guru: form ajukan
 * perubahan baru (helper pilih Tanggal -> Hari -> Siswa yang berkepentingan),
 * respon (setuju/tolak) atas pengajuan yang masuk dari siswa, penghapusan
 * pengajuan milik sendiri yang ditolak, serta kartu pengingat untuk
 * perubahan yang sudah disetujui ketiga pihak (siswa, guru, admin).
 */
export function usePengajuanJadwal({
  guru,
  jadwalList,
  studentNameMap,
  pengajuanSaya,
  setPengajuanSaya,
  pengajuanMasuk,
  setPengajuanMasuk,
  pengajuanRiwayatAdmin,
  setPengajuanRiwayatAdmin,
  setErrorMsg,
  showToast,
  loadAll,
}) {
  const [showForm, setShowForm] = useState(false);
  const [tanggalAsal, setTanggalAsalRaw] = useState('');
  const [selectedJadwalId, setSelectedJadwalId] = useState('');

  // Setiap kali tanggal kelas asal berubah, kandidat jadwal juga berubah,
  // jadi pilihan siswa/jadwal sebelumnya harus direset.
  const setTanggalAsal = (value) => {
    setTanggalAsalRaw(value);
    setSelectedJadwalId('');
  };
  const [formData, setFormData] = useState(FORM_KOSONG);
  const [submitting, setSubmitting] = useState(false);

  const [respondingId, setRespondingId] = useState(null);
  const [confirmTolakId, setConfirmTolakId] = useState(null);

  const [confirmDeleteSayaId, setConfirmDeleteSayaId] = useState(null);
  const [deletingSayaId, setDeletingSayaId] = useState(null);

  const [confirmDeleteRiwayatId, setConfirmDeleteRiwayatId] = useState(null);
  const [deletingRiwayatId, setDeletingRiwayatId] = useState(null);
  const [showAllPengingat, setShowAllPengingat] = useState(false);

  // ========== HELPER PILIH JADWAL (Tanggal -> Hari -> Yang Berkepentingan) ==========
  const hariAsal = useMemo(() => getHariFromTanggal(tanggalAsal), [tanggalAsal]);

  const kandidatJadwal = useMemo(() => {
    if (!tanggalAsal || !hariAsal) return [];
    return jadwalList.filter((j) => (j.is_temporary ? j.tanggal_temporary === tanggalAsal : j.hari === hariAsal));
  }, [jadwalList, tanggalAsal, hariAsal]);

  const getPihakLabel = (j) => {
    let nama = '';
    if (j.siswa_id) nama = studentNameMap[j.siswa_id] || 'Siswa';
    else if (Array.isArray(j.siswa_ids) && j.siswa_ids.length > 0) {
      nama = j.siswa_ids.map((id) => studentNameMap[id] || id).join(', ');
    }
    return `${nama || 'Tidak diketahui'}${j.kelas ? ` (${j.kelas})` : ''} - ${formatJam(j.jam_mulai)}-${formatJam(j.jam_selesai)}`;
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
    return items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [pengajuanSaya]);

  // Perubahan jadwal yang sudah disetujui ketiganya (siswa, guru, admin) --
  // dipakai untuk kartu pengingat. Perubahan sementara yang tanggal
  // berlakunya sudah lewat ditandai supaya bisa dihapus (dibersihkan) manual.
  const perubahanDisetujuiList = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isTanggalLewat = (tanggalStr) => !!tanggalStr && tanggalStr < todayStr;
    return pengajuanRiwayatAdmin
      .filter((p) => p.status === 'disetujui_admin')
      .map((p) => ({ ...p, sudahLewat: p.is_temporary_baru ? isTanggalLewat(p.tanggal_temporary_baru) : false }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [pengajuanRiwayatAdmin]);

  const submitPengajuan = async () => {
    if (!tanggalAsal) {
      setErrorMsg('Pilih tanggal kelas yang ingin diubah terlebih dahulu.');
      return;
    }
    if (!selectedJadwalId) {
      setErrorMsg('Pilih siswa/jadwal yang bersangkutan terlebih dahulu.');
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
      const daftarSiswaId = jadwalTerpilih?.siswa_id
        ? [jadwalTerpilih.siswa_id]
        : Array.isArray(jadwalTerpilih?.siswa_ids)
        ? jadwalTerpilih.siswa_ids
        : [];
      if (daftarSiswaId.length === 0) {
        throw new Error('Jadwal ini tidak memiliki siswa terdaftar, tidak bisa mengajukan perubahan.');
      }
      const isKelompok = daftarSiswaId.length > 1;
      const batchId = isKelompok
        ? typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`
        : null;
      const basePayload = {
        jadwal_id: selectedJadwalId,
        guru_id: guru.id,
        diajukan_oleh: 'guru',
        nama_pengaju: guru.nama,
        hari_baru: formData.hari_baru || null,
        jam_mulai_baru: formData.jam_mulai_baru || null,
        jam_selesai_baru: formData.jam_selesai_baru || null,
        is_temporary_baru: formData.is_temporary_baru,
        tanggal_temporary_baru: formData.is_temporary_baru ? tanggalAsal || null : null,
        alasan: formData.alasan || null,
        status: 'menunggu_persetujuan',
      };
      const payloads = daftarSiswaId.map((siswaId) => ({
        ...basePayload,
        siswa_id: siswaId,
        batch_id: batchId,
      }));
      const { error } = await supabase.from('pengajuan_perubahan_jadwal').insert(payloads);
      if (error) throw error;
      try {
        if (daftarSiswaId.length > 0) {
          const pesan = `Guru ${guru.nama} mengajukan perubahan jadwal ke ${formData.hari_baru || '-'} ${
            formData.jam_mulai_baru || ''
          }-${formData.jam_selesai_baru || ''}.${
            isKelompok ? ' Perubahan ini butuh persetujuan semua siswa di kelompok.' : ''
          } Mohon segera direspons.`;
          await supabase.from('notifikasi').insert(daftarSiswaId.map((userId) => ({ user_id: userId, pesan, link: null })));
        }
      } catch (notifErr) {
        console.error('Gagal mengirim notifikasi ke siswa:', notifErr);
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
      const newStatus = setuju ? 'disetujui_menunggu_admin' : 'ditolak';
      const { error } = await checkedUpdate(
        supabase.from('pengajuan_perubahan_jadwal').update({ status: newStatus }).eq('id', p.id)
      );
      if (error) throw error;
      if (setuju) {
        const { data: adminUsers, error: adminError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('status', 'approved');
        if (!adminError && adminUsers && adminUsers.length > 0) {
          const pesan = `Guru ${guru.nama} menyetujui pengajuan perubahan jadwal dari ${p.nama_pengaju || 'siswa'} ke ${
            p.hari_baru || '-'
          } ${formatJam(p.jam_mulai_baru)}-${formatJam(p.jam_selesai_baru)}. Menunggu persetujuan admin.`;
          for (let admin of adminUsers) {
            await supabase.from('notifikasi').insert({
              user_id: admin.id,
              pesan,
              link: null,
            });
          }
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
    setDeletingRiwayatId(p.id);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .delete()
        .eq('id', p.id)
        .eq('guru_id', guru.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Data tidak terhapus (kemungkinan diblokir aturan akses/RLS di database).');
      }
      setPengajuanRiwayatAdmin((list) => list.filter((item) => item.id !== p.id));
      setConfirmDeleteRiwayatId(null);
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal menghapus pengingat: ' + err.message);
    } finally {
      setDeletingRiwayatId(null);
    }
  };

  // Hapus pengajuan milik saya (guru) yang statusnya ditolak, dari daftar
  // "Pengajuan Saya". Mendukung pengajuan tunggal maupun batch.
  const hapusPengajuanSaya = async (item) => {
    setDeletingSayaId(item.id);
    setErrorMsg('');
    try {
      let query = supabase.from('pengajuan_perubahan_jadwal').delete().eq('guru_id', guru.id);
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
      showToast('error', 'Gagal menghapus pengajuan: ' + err.message);
    } finally {
      setDeletingSayaId(null);
    }
  };

  return {
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

    respondingId,
    confirmTolakId,
    setConfirmTolakId,
    respondPengajuan,

    pengajuanSayaGrouped,
    confirmDeleteSayaId,
    setConfirmDeleteSayaId,
    deletingSayaId,
    hapusPengajuanSaya,

    perubahanDisetujuiList,
    confirmDeleteRiwayatId,
    setConfirmDeleteRiwayatId,
    deletingRiwayatId,
    hapusPerubahanDisetujui,
    showAllPengingat,
    setShowAllPengingat,
  };
}