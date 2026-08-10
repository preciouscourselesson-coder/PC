import { useState, useRef } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';
import { emptyForm, PRICELIST_TABLE, RIWAYAT_TABLE } from '../constants';
import { validateForm } from '../utils/validation';
import { buildDiffText } from '../utils/diff';

// Kelola state form tambah/edit/duplikasi pricelist beserta proses submit ke Supabase.
//
// Params:
// - adminId, adminNama: identitas admin yang login (dari useAdmin)
// - items: daftar item saat ini (untuk menghitung diff saat edit)
// - loadItems: reload daftar item setelah simpan
// - selectedId, loadRiwayat: agar riwayat ikut ter-refresh bila item yang
//   sedang dilihat detailnya adalah item yang baru saja diedit
export const usePricelistForm = ({ adminId, adminNama, items, loadItems, selectedId, loadRiwayat }) => {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const formRef = useRef(null);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrors({});
    setSaveError('');
  };

  const scrollToForm = () => {
    formRef.current && formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      kelas: item.kelas,
      program: item.program,
      jumlahPertemuan: item.jumlah_pertemuan,
      durasi: item.durasi,
      pengajar: item.pengajar,
      hargaPrivat: item.harga_privat != null ? String(item.harga_privat) : '',
      harga2: item.harga_2siswa != null ? String(item.harga_2siswa) : '',
      harga3: item.harga_3siswa != null ? String(item.harga_3siswa) : '',
      harga4: item.harga_4siswa != null ? String(item.harga_4siswa) : '',
      status: item.status,
      tanggalBerlaku: item.tanggal_berlaku || '',
    });
    setFormErrors({});
    setSaveError('');
    scrollToForm();
  };

  const handleDuplikasi = (item) => {
    setEditingId(null);
    setForm({
      kelas: item.kelas,
      program: item.program,
      jumlahPertemuan: item.jumlah_pertemuan,
      durasi: item.durasi,
      pengajar: item.pengajar,
      hargaPrivat: item.harga_privat != null ? String(item.harga_privat) : '',
      harga2: item.harga_2siswa != null ? String(item.harga_2siswa) : '',
      harga3: item.harga_3siswa != null ? String(item.harga_3siswa) : '',
      harga4: item.harga_4siswa != null ? String(item.harga_4siswa) : '',
      status: 'Draft',
      tanggalBerlaku: '',
    });
    setFormErrors({});
    setSaveError('');
    scrollToForm();
  };

  const handleSubmit = async () => {
    const newErrors = validateForm(form);
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    setSaveError('');
    const wasEditingId = editingId;
    try {
      const payload = {
        kelas: form.kelas,
        program: form.program,
        jumlah_pertemuan: form.jumlahPertemuan,
        durasi: form.durasi,
        pengajar: form.pengajar,
        harga_privat: Number(form.hargaPrivat) || 0,
        harga_2siswa: form.harga2 === '' ? null : Number(form.harga2),
        harga_3siswa: form.harga3 === '' ? null : Number(form.harga3),
        harga_4siswa: form.harga4 === '' ? null : Number(form.harga4),
        status: form.status,
        tanggal_berlaku: form.tanggalBerlaku,
      };

      if (wasEditingId) {
        const oldRow = items.find((i) => i.id === wasEditingId);
        const { error: updateError } = await checkedUpdate(
          supabase
            .from(PRICELIST_TABLE)
            .update({ ...payload, updated_by: adminId })
            .eq('id', wasEditingId)
        );
        if (updateError) throw updateError;

        const diffLines = buildDiffText(oldRow, payload);
        const perubahan = diffLines.length > 0 ? diffLines.join('; ') : 'Data disimpan ulang tanpa perubahan nilai';
        await supabase.from(RIWAYAT_TABLE).insert({
          pricelist_id: wasEditingId,
          admin_id: adminId,
          admin_nama: adminNama,
          perubahan,
        });
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from(PRICELIST_TABLE)
          .insert({ ...payload, created_by: adminId, updated_by: adminId })
          .select('id')
          .single();
        if (insertError) throw insertError;

        await supabase.from(RIWAYAT_TABLE).insert({
          pricelist_id: inserted.id,
          admin_id: adminId,
          admin_nama: adminNama,
          perubahan: 'Pricelist dibuat',
        });
      }

      resetForm();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
      await loadItems();
      if (wasEditingId && selectedId === wasEditingId) await loadRiwayat(wasEditingId);
    } catch (err) {
      setSaveError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    form, setField, formRef,
    editingId, formErrors,
    saving, saveError, justSaved,
    resetForm, handleEdit, handleDuplikasi, handleSubmit,
  };
};
