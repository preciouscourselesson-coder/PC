// Normalisasi nilai mentah dari sheet Excel menjadi value yang dikenali sistem.
import { KELAS_OPTIONS } from '../constants';

export const parseRoleFromSheet = (raw) => {
  const v = (raw || '').toString().trim().toLowerCase();
  if (v === 'guru' || v === 'teacher') return 'teacher';
  if (v === 'siswa' || v === 'student') return 'student';
  if (v === 'wali_siswa' || v === 'wali siswa' || v === 'parent') return 'parent';
  return null;
};

export const parseGenderFromSheet = (raw) => {
  const v = (raw || '').toString().trim().toLowerCase();
  if (v === 'l' || v === 'laki-laki' || v === 'laki laki' || v === 'male') return 'L';
  if (v === 'p' || v === 'perempuan' || v === 'female') return 'P';
  return null;
};

export const parseKelasFromSheet = (raw) => {
  const v = (raw || '').toString().trim().toUpperCase();
  const match = KELAS_OPTIONS.find(k => k.toUpperCase() === v);
  return match || null;
};
