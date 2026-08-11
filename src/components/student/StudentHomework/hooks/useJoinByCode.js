import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { parseShareCodeInput } from '../utils';

// ─── Buka Tugas dengan Kode/Link (opsional) ─────────────────────────────────
// Siswa mengerjakan tugas yang dibagikan lewat kode/link dari guru, tanpa
// perlu ditugaskan lebih dulu lewat daftar siswa di TeacherHomework.js.
//
// CATATAN SKEMA/RLS: setelah tugas ditemukan lewat `share_code`, kode ini
// mencoba mendaftarkan siswa ke `homework_assignments` (self-enroll) agar
// tugas otomatis muncul lagi di "Tugas Saya" pada kunjungan berikutnya.
// Ini best-effort: jika policy INSERT pada `homework_assignments` masih
// dibatasi hanya untuk guru pemilik tugas (lihat catatan di
// `handleAssignToStudents`, TeacherHomework.js), insert ini akan gagal
// secara diam-diam — siswa TETAP bisa mengerjakan & mengirim jawaban
// tugas ini sekarang, hanya saja perlu memasukkan kode yang sama lagi
// setelah reload. Agar permanen, tambahkan policy berikut di Supabase:
//   create policy "siswa gabung tugas via kode" on homework_assignments
//     for insert with check (auth.uid() = student_id);
// Selain itu, pastikan tabel `homework` punya policy SELECT yang
// mengizinkan siswa membaca tugas berstatus 'published' meski belum
// ditugaskan, mis.:
//   create policy "siswa lihat tugas published via kode" on homework
//     for select using (status = 'published');
export const useJoinByCode = ({ studentId, setTasks, setMapelList, onOpened }) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccessMsg, setJoinSuccessMsg] = useState('');

  const handleJoinByCode = async () => {
    const code = parseShareCodeInput(joinCodeInput);
    setJoinError('');
    setJoinSuccessMsg('');

    if (!code) {
      setJoinError('Masukkan kode atau link tugas terlebih dahulu.');
      return;
    }
    if (!studentId) {
      setJoinError('Sesi belum siap, coba lagi sebentar.');
      return;
    }

    setJoining(true);
    try {
      const { data: hwRow, error: hwError } = await supabase
        .from('homework')
        .select(`
          id, title, subject, grade, description, due_date, status,
          homework_questions (
            id, question_text, blanks, points, order_index,
            image_url, audio_url, type, options, correct_option_id, reference_answer
          )
        `)
        .eq('share_code', code)
        .maybeSingle();

      if (hwError) throw hwError;
      if (!hwRow || hwRow.status !== 'published') {
        setJoinError('Kode/link tugas tidak ditemukan, atau tugas belum dipublikasikan guru.');
        return;
      }

      // Best-effort self-enroll — lihat catatan RLS di atas fungsi ini.
      try {
        await supabase
          .from('homework_assignments')
          .insert({ homework_id: hwRow.id, student_id: studentId });
      } catch (assignErr) {
        console.warn('Gagal mendaftarkan tugas kode ke daftar tugas (RLS?):', assignErr);
      }

      const { data: subRow } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('homework_id', hwRow.id)
        .maybeSingle();

      const questions = (hwRow.homework_questions || [])
        .slice()
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const maxScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);

      const newTask = {
        id: `hw_${hwRow.id}`,
        homeworkId: hwRow.id,
        type: 'interactive',
        judul: hwRow.title,
        mapel: hwRow.subject,
        kelas: hwRow.grade,
        deskripsi: hwRow.description,
        deadline: hwRow.due_date,
        questions,
        maxScore,
        status_pengumpulan: subRow ? 'Sudah' : 'Belum',
        nilai: subRow ? subRow.score : null,
        submitted_at: subRow ? subRow.submitted_at : null,
        answers: subRow ? subRow.answers : null,
        viaCode: true,
      };

      setTasks(prev => {
        const exists = prev.some(t => t.id === newTask.id);
        return exists ? prev.map(t => (t.id === newTask.id ? newTask : t)) : [newTask, ...prev];
      });
      setMapelList(prev => (newTask.mapel && !prev.includes(newTask.mapel) ? [...prev, newTask.mapel] : prev));

      setJoinCodeInput('');
      setJoinSuccessMsg(`Tugas "${newTask.judul}" berhasil dibuka.`);
      if (onOpened) onOpened(newTask);
    } catch (err) {
      console.error(err);
      setJoinError('Gagal membuka tugas: ' + err.message);
    } finally {
      setJoining(false);
    }
  };

  return {
    joinCodeInput,
    setJoinCodeInput,
    joining,
    joinError,
    joinSuccessMsg,
    handleJoinByCode,
  };
};
