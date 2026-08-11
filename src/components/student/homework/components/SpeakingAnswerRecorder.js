import React, { useState, useRef } from 'react';
import { supabase } from '../../../../supabaseClient';
import { C } from '../constants';

// ─── Rekam Jawaban Speaking (mic → Supabase Storage) ───────────────────────
export const SpeakingAnswerRecorder = ({ questionId, studentId, value, onChange, disabled }) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const uploadRecording = async (blob) => {
    setUploading(true);
    setError('');
    try {
      const mimeType = blob.type || 'audio/webm';
      const ext = mimeType.split('/')[1]?.split(';')[0] || 'webm';
      const fileName = `${studentId}/${questionId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('homework-speaking-answers')
        .upload(fileName, blob, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('homework-speaking-answers')
        .getPublicUrl(fileName);

      onChange(publicUrlData.publicUrl);
    } catch (err) {
      console.error(err);
      setError('Gagal mengunggah rekaman: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Perangkat/browser ini tidak mendukung perekaman audio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(
        (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)
      );
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await uploadRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      setError('Tidak bisa mengakses mikrofon: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div style={{ marginTop: '0.4rem' }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <audio src={value} controls style={{ height: '36px', maxWidth: '260px' }} />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: '4px 12px', borderRadius: '40px', border: `1.5px solid ${C.border}`,
                background: 'transparent', color: C.gray, fontSize: '0.75rem', fontWeight: 'bold',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🔁 Rekam Ulang
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={disabled || uploading}
            style={{
              padding: '6px 16px', borderRadius: '40px', border: 'none',
              background: recording ? C.red : C.primary, color: C.white,
              fontSize: '0.8rem', fontWeight: 'bold',
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
              opacity: disabled || uploading ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            {uploading ? 'Mengunggah...' : recording ? '⏹ Berhenti Merekam' : '🎙️ Mulai Merekam'}
          </button>
          {recording && (
            <span style={{ color: C.red, fontSize: '0.78rem', fontWeight: 'bold' }}>
              ● Sedang merekam...
            </span>
          )}
        </div>
      )}
      {error && (
        <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '6px' }}>{error}</div>
      )}
    </div>
  );
};
