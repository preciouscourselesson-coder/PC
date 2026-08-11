import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { computeInteractiveScore } from '../utils';

// ─── Kerjakan & kirim jawaban tugas isian interaktif ────────────────────────
export const useInteractiveWork = ({ studentId, setTasks }) => {
  const [workingTask, setWorkingTask] = useState(null);
  const [workAnswers, setWorkAnswers] = useState({});
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [workError, setWorkError] = useState('');

  const openWorkModal = (task) => {
    const initialAnswers = {};
    (task.questions || []).forEach(q => {
      const type = q.type || 'isian';
      const existing = task.answers && task.answers[q.id];
      if (type === 'isian') {
        const blanksLen = (q.blanks || []).length;
        initialAnswers[q.id] = Array.from({ length: blanksLen }, (_, i) => (existing && existing[i]) || '');
      } else {
        // 'pilihan_ganda' (id opsi terpilih) & 'speaking' (URL rekaman) hanya
        // butuh satu nilai, disimpan di index 0 supaya format tetap array
        // seperti yang dibaca GradingPanel di TeacherHomework.js.
        initialAnswers[q.id] = [(existing && existing[0]) || ''];
      }
    });
    setWorkAnswers(initialAnswers);
    setWorkError('');
    setWorkingTask(task);
  };

  const closeWorkModal = () => {
    setWorkingTask(null);
    setWorkAnswers({});
    setWorkError('');
  };

  const handleBlankChange = (questionId, blankIndex, value) => {
    setWorkAnswers(prev => {
      const arr = [...(prev[questionId] || [])];
      arr[blankIndex] = value;
      return { ...prev, [questionId]: arr };
    });
  };

  const handleSubmitAnswers = async () => {
    if (!workingTask) return;
    setSubmittingAnswers(true);
    setWorkError('');

    try {
      const { score, maxScore } = computeInteractiveScore(workingTask.questions, workAnswers);

      const { data, error } = await supabase
        .from('homework_submissions')
        .upsert(
          {
            homework_id: workingTask.homeworkId,
            student_id: studentId,
            answers: workAnswers,
            score,
            max_score: maxScore,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'homework_id,student_id' }
        )
        .select()
        .single();

      if (error) throw error;

      const updater = t =>
        t.id === workingTask.id
          ? {
              ...t,
              status_pengumpulan: 'Sudah',
              nilai: data.score,
              submitted_at: data.submitted_at,
              answers: data.answers,
            }
          : t;

      setTasks(prev => prev.map(updater));
      setWorkingTask(prev => (prev ? updater(prev) : prev));
    } catch (err) {
      console.error(err);
      setWorkError('Gagal mengirim jawaban: ' + err.message);
    } finally {
      setSubmittingAnswers(false);
    }
  };

  return {
    workingTask,
    workAnswers,
    submittingAnswers,
    workError,
    openWorkModal,
    closeWorkModal,
    handleBlankChange,
    handleSubmitAnswers,
  };
};
