import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../supabaseClient';

// ─── Data tugas siswa: ambil dari Supabase, filter, sortir, dan statistik ───
export const useStudentTasks = () => {
  const [studentId, setStudentId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterMapel, setFilterMapel] = useState('Semua Mapel');
  const [sortBy, setSortBy] = useState('Terbaru');
  const [mapelList, setMapelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Ambil data user (hanya studentId) ────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStudentId(session.user.id);
      }
    };
    init();
  }, []);

  // ── Ambil tugas dari Supabase ─────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setErrorMsg('');

    try {
      // Tugas file
      const { data, error } = await supabase
        .from('penugasan_guru')
        .select(`
          id,
          judul,
          mapel,
          jenjang,
          bab,
          materi,
          kelas,
          deskripsi,
          file_name,
          file_url,
          status,
          deadline,
          pengumpulan_tugas (
            id,
            status,
            file_name,
            file_url,
            nilai,
            graded_at,
            siswa_id
          )
        `)
        .eq('status', 'Aktif')
        .order('deadline', { ascending: true });

      if (error) throw error;

      const myTasks = (data || [])
        .map(task => {
          const submissions = task.pengumpulan_tugas || [];
          const mySubmission = submissions.find(s => s.siswa_id === studentId);
          if (!mySubmission) return null;
          return {
            ...task,
            type: 'file',
            status_pengumpulan: mySubmission.status || 'Belum',
            submission_id: mySubmission.id,
            submission_file_url: mySubmission.file_url || null,
            submission_file_name: mySubmission.file_name || null,
            nilai: mySubmission.nilai || null,
            graded_at: mySubmission.graded_at || null,
          };
        })
        .filter(Boolean);

      // Tugas interaktif
      const { data: hwAssignData, error: hwAssignError } = await supabase
        .from('homework_assignments')
        .select(`
          id,
          assigned_at,
          homework:homework_id (
            id,
            title,
            subject,
            grade,
            description,
            due_date,
            status,
            homework_questions (
              id, question_text, blanks, points, order_index,
              image_url, audio_url, type, options, correct_option_id, reference_answer
            )
          )
        `)
        .eq('student_id', studentId);

      if (hwAssignError) throw hwAssignError;

      const homeworkMap = new Map();
      (hwAssignData || []).forEach(a => {
        if (a.homework && a.homework.status === 'published' && !homeworkMap.has(a.homework.id)) {
          homeworkMap.set(a.homework.id, a.homework);
        }
      });
      const homeworkIds = Array.from(homeworkMap.keys());

      let submissionMap = {};
      if (homeworkIds.length > 0) {
        const { data: subData, error: subError } = await supabase
          .from('homework_submissions')
          .select('*')
          .eq('student_id', studentId)
          .in('homework_id', homeworkIds);

        if (subError) {
          console.warn('Gagal memuat submission interaktif:', subError.message);
        } else {
          submissionMap = (subData || []).reduce((acc, s) => {
            acc[s.homework_id] = s;
            return acc;
          }, {});
        }
      }

      const interactiveTasks = Array.from(homeworkMap.values()).map(hw => {
        const questions = (hw.homework_questions || [])
          .slice()
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        const maxScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);
        const submission = submissionMap[hw.id] || null;

        return {
          id: `hw_${hw.id}`,
          homeworkId: hw.id,
          type: 'interactive',
          judul: hw.title,
          mapel: hw.subject,
          kelas: hw.grade,
          deskripsi: hw.description,
          deadline: hw.due_date,
          questions,
          maxScore,
          status_pengumpulan: submission ? 'Sudah' : 'Belum',
          nilai: submission ? submission.score : null,
          submitted_at: submission ? submission.submitted_at : null,
          answers: submission ? submission.answers : null,
        };
      });

      const allTasks = [...myTasks, ...interactiveTasks];
      setTasks(allTasks);

      const mapels = [...new Set(allTasks.map(t => t.mapel).filter(Boolean))];
      setMapelList(['Semua Mapel', ...mapels]);

    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat tugas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      fetchTasks();
    }
  }, [studentId, fetchTasks]);

  // ── Filter & Sortir ────────────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    let result = [...tasks];

    if (filterStatus !== 'Semua') {
      if (filterStatus === 'Sudah Dikumpulkan') {
        result = result.filter(t => t.status_pengumpulan === 'Sudah');
      } else if (filterStatus === 'Belum Dikumpulkan') {
        result = result.filter(t => t.status_pengumpulan === 'Belum');
      } else if (filterStatus === 'Terlambat') {
        result = result.filter(t => {
          const isOverdue = !!t.deadline && new Date(t.deadline) < new Date() && t.status_pengumpulan !== 'Sudah';
          return isOverdue;
        });
      }
    }

    if (filterMapel !== 'Semua Mapel') {
      result = result.filter(t => t.mapel === filterMapel);
    }

    if (sortBy === 'Terbaru') {
      result.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
    } else if (sortBy === 'Terlama') {
      result.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sortBy === 'A-Z') {
      result.sort((a, b) => a.judul.localeCompare(b.judul));
    }

    setFilteredTasks(result);
  }, [tasks, filterStatus, filterMapel, sortBy]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ── Statistik untuk sidebar ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.length;
    const belum = tasks.filter(t => t.status_pengumpulan === 'Belum').length;
    const sudah = tasks.filter(t => t.status_pengumpulan === 'Sudah').length;
    const terlambat = tasks.filter(t => {
      return !!t.deadline && new Date(t.deadline) < new Date() && t.status_pengumpulan !== 'Sudah';
    }).length;
    const mapelStats = {};
    tasks.forEach(t => {
      if (t.mapel) {
        mapelStats[t.mapel] = (mapelStats[t.mapel] || 0) + 1;
      }
    });
    return { total, belum, sudah, terlambat, mapelStats };
  }, [tasks]);

  // ── Helper untuk filter sidebar/chips ────────────────────────────────────
  const isActiveStatus = (status) => filterStatus === status && filterMapel === 'Semua Mapel';

  const handleStatusClick = (status) => {
    setFilterStatus(status);
    setFilterMapel('Semua Mapel');
  };

  const handleMapelClick = (mapel) => {
    setFilterMapel(mapel);
    setFilterStatus('Semua');
  };

  const resetFilters = () => {
    setFilterStatus('Semua');
    setFilterMapel('Semua Mapel');
  };

  return {
    studentId,
    tasks,
    setTasks,
    filteredTasks,
    filterStatus,
    setFilterStatus,
    filterMapel,
    setFilterMapel,
    sortBy,
    setSortBy,
    mapelList,
    setMapelList,
    loading,
    errorMsg,
    setErrorMsg,
    stats,
    fetchTasks,
    isActiveStatus,
    handleStatusClick,
    handleMapelClick,
    resetFilters,
  };
};
