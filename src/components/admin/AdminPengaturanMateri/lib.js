// Titik pusat impor Supabase untuk seluruh sub-komponen & custom hook di
// dalam folder AdminPengaturanMateri/. Dipisah supaya kalau path relatif ke
// supabaseClient / supabaseUpdateGuard berubah, cukup diperbaiki di satu
// tempat ini saja.
//
// PENTING: sesuaikan path di bawah ini dengan struktur folder proyek Anda
// yang sebenarnya. Path ini diturunkan dari import asli di
// AdminPengaturanMateri.js ('../../supabaseClient' dan
// '../../utils/supabaseUpdateGuard'), ditambah satu level folder karena
// file ini berada di dalam folder AdminPengaturanMateri/.
export { supabase } from '../../../supabaseClient';
export { checkedUpdate } from '../../../utils/supabaseUpdateGuard';
