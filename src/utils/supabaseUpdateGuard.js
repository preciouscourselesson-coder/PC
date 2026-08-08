// src/utils/supabaseUpdateGuard.js
//
// Utilitas untuk mendeteksi silent-fail RLS pada operasi UPDATE.
//
// Supabase TIDAK melempar error untuk UPDATE yang match 0 baris (misalnya
// karena ditolak RLS) -- response `error` tetap null, dan tanpa `.select()`
// eksplisit, `data` juga null, sehingga tidak ada cara membedakan
// "berhasil update 1 baris" dari "tidak ada baris yang ke-update sama
// sekali". Akibatnya UI bisa menampilkan pesan "berhasil" (apalagi kalau
// dikombinasikan dengan optimistic update di state React) padahal data di
// database sama sekali tidak berubah.
//
// Fungsi ini membungkus query builder .update(...), otomatis menambahkan
// .select() supaya baris yang benar-benar berubah ikut dikembalikan oleh
// PostgREST, lalu mengecek panjangnya. Kalau hasilnya 0 baris, dikembalikan
// sebagai error eksplisit -- bukan silent success.
//
// Pola dasar ini diadaptasi dari StudentHome.js (fungsi respondPengajuan),
// yang sudah lebih dulu menerapkan pengecekan data.length === 0 secara
// manual -- di sini dijadikan satu helper reusable supaya konsisten dan
// tidak perlu ditulis ulang di setiap file.
//
// ─── Cara pakai ──────────────────────────────────────────────────────────
//
//   import { checkedUpdate } from '../../utils/supabaseUpdateGuard';
//
//   // SEBELUM:
//   const { error } = await supabase
//     .from('materi_file')
//     .update({ status: nextStatus })
//     .eq('id', item.id);
//
//   // SESUDAH:
//   const { error } = await checkedUpdate(
//     supabase.from('materi_file').update({ status: nextStatus }).eq('id', item.id)
//   );
//
// Pemanggil tidak perlu berubah lebih lanjut -- pola `if (error) { ... }`
// yang sudah ada di seluruh file tetap jalan seperti biasa, karena
// checkedUpdate mengembalikan bentuk { data, error } yang sama.
//
// CATATAN: jangan gunakan untuk query yang query builder-nya sudah
// memanggil .select() sendiri sebelum masuk ke sini (mis. kalau di masa
// depan ada kebutuhan select kolom spesifik) -- panggil .select() itu
// SETELAH checkedUpdate, atau sesuaikan helper ini untuk menerima opsi
// kolom select kalau kasusnya muncul.

export async function checkedUpdate(query, options = {}) {
  const {
    notFoundMessage = 'Perubahan tidak tersimpan. Kemungkinan data sudah dihapus/berubah, atau akses Anda ke data ini ditolak oleh sistem keamanan. Silakan refresh halaman dan coba lagi, atau hubungi admin jika masalah berlanjut.',
  } = options;

  const { data, error } = await query.select();

  if (error) {
    return { data: null, error };
  }

  if (!data || data.length === 0) {
    return {
      data: null,
      error: { message: notFoundMessage, code: 'RLS_SILENT_FAIL_UPDATE' },
    };
  }

  return { data, error: null };
}