import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../supabaseClient';

// ─── Rekap Nilai Tugas Interaktif (khusus modul homework, bukan penugasan_guru) ─
//
// Bentuk data akhir per siswa:
// {
//   studentId, fullName, kelas,
//   tasks: [
//     { homeworkId, title, subject, teacherName, dueDate,
//       submitted, score, maxScore, submittedAt }
//   ]
// }
//
// CATATAN RELASI: `homework_assignments.student_id` dan `homework.teacher_id`
// mereferensikan auth.users.id (bukan FK langsung ke `profiles`/`guru` yang
// bisa di-embed lewat PostgREST), jadi data diambil terpisah lalu digabung
// manual di JS — sama seperti pola di StudentHomework.js.
export const useRekapTugasData = () => {
  const [students, setStudents] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [mapelList, setMapelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [filterKelas, setFilterKelas] = useState('Semua Kelas');
  const [filterMapel, setFilterMapel] = useState('Semua Mapel');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Semua tugas interaktif yang sudah dipublikasikan
      const { data: hwData, error: hwError } = await supabase
        .from('homework')
        .select('id, title, subject, grade, due_date, status, teacher_id')
        .eq('status', 'published');
      if (hwError) throw hwError;

      const homeworkList = hwData || [];
      const homeworkIds = homeworkList.map(h => h.id);

      if (homeworkIds.length === 0) {
        setStudents([]);
        setKelasList([]);
        setMapelList([]);
        return;
      }

      // 2. Siapa saja yang ditugaskan
      const { data: assignData, error: assignError } = await supabase
        .from('homework_assignments')
        .select('homework_id, student_id')
        .in('homework_id', homeworkIds);
      if (assignError) throw assignError;

      // 3. Submission (nilai) yang sudah masuk
      const { data: subData, error: subError } = await supabase
        .from('homework_submissions')
        .select('homework_id, student_id, score, max_score, submitted_at')
        .in('homework_id', homeworkIds);
      if (subError) throw subError;

      const studentIds = [...new Set((assignData || []).map(a => a.student_id))];
      const teacherIds = [...new Set(homeworkList.map(h => h.teacher_id).filter(Boolean))];

      // 4. Profil siswa (nama & kelas)
      let profileMap = {};
      if (studentIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, kelas')
          .in('id', studentIds);
        if (profileError) throw profileError;
        profileMap = (profileData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      // 5. Nama guru (guru.profile_id = homework.teacher_id)
      let guruMap = {};
      if (teacherIds.length > 0) {
        const { data: guruData, error: guruError } = await supabase
          .from('guru')
          .select('profile_id, nama')
          .in('profile_id', teacherIds);
        if (guruError) throw guruError;
        guruMap = (guruData || []).reduce((acc, g) => {
          acc[g.profile_id] = g.nama;
          return acc;
        }, {});
      }

      const homeworkMap = homeworkList.reduce((acc, h) => {
        acc[h.id] = h;
        return acc;
      }, {});

      const submissionMap = (subData || []).reduce((acc, s) => {
        acc[`${s.homework_id}_${s.student_id}`] = s;
        return acc;
      }, {});

      // 6. Susun per siswa
      const studentTasksMap = {};
      (assignData || []).forEach(a => {
        const profile = profileMap[a.student_id];
        if (!profile) return; // profil tidak ditemukan (siswa dihapus/role beda)

        const hw = homeworkMap[a.homework_id];
        if (!hw) return;

        if (!studentTasksMap[a.student_id]) {
          studentTasksMap[a.student_id] = {
            studentId: a.student_id,
            fullName: profile.full_name || '(Tanpa nama)',
            kelas: profile.kelas || '-',
            tasks: [],
          };
        }

        const submission = submissionMap[`${a.homework_id}_${a.student_id}`] || null;

        studentTasksMap[a.student_id].tasks.push({
          homeworkId: a.homework_id,
          title: hw.title,
          subject: hw.subject || '-',
          teacherName: guruMap[hw.teacher_id] || 'Guru tidak diketahui',
          dueDate: hw.due_date,
          submitted: !!submission,
          score: submission ? submission.score : null,
          maxScore: submission ? submission.max_score : null,
          submittedAt: submission ? submission.submitted_at : null,
        });
      });

      const studentsArr = Object.values(studentTasksMap).sort((a, b) =>
        a.fullName.localeCompare(b.fullName)
      );

      setStudents(studentsArr);

      const kelasSet = [...new Set(studentsArr.map(s => s.kelas).filter(k => k && k !== '-'))].sort();
      setKelasList(['Semua Kelas', ...kelasSet]);

      const mapelSet = [...new Set(homeworkList.map(h => h.subject).filter(Boolean))].sort();
      setMapelList(['Semua Mapel', ...mapelSet]);

    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat rekap tugas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Terapkan filter kelas & mapel ────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => filterKelas === 'Semua Kelas' || s.kelas === filterKelas)
      .map(s => {
        if (filterMapel === 'Semua Mapel') return s;
        return { ...s, tasks: s.tasks.filter(t => t.subject === filterMapel) };
      })
      .filter(s => filterMapel === 'Semua Mapel' || s.tasks.length > 0);
  }, [students, filterKelas, filterMapel]);

  const resetFilters = () => {
    setFilterKelas('Semua Kelas');
    setFilterMapel('Semua Mapel');
  };

  return {
    students,
    filteredStudents,
    kelasList,
    mapelList,
    filterKelas,
    setFilterKelas,
    filterMapel,
    setFilterMapel,
    resetFilters,
    loading,
    errorMsg,
    fetchData,
  };
};
