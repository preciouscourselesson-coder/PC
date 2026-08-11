import React from 'react';
import { C } from '../constants';

// ─── Kartu opsional: buka tugas lewat kode/link dari guru, tanpa
// menunggu ditugaskan lewat daftar siswa ─────────────────────────────────────
export const JoinByCodeCard = ({
  isMobile,
  joinCodeInput,
  setJoinCodeInput,
  joining,
  joinError,
  joinSuccessMsg,
  onSubmit,
}) => {
  return (
    <div style={{
      background: C.primaryBg,
      border: `1.5px solid ${C.primary}`,
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '1rem 1.5rem',
      marginBottom: '1.5rem',
    }}>
      <h4 style={{ margin: '0 0 4px', color: C.dark, fontSize: '0.95rem', fontWeight: 'bold' }}>
        🔑 Punya kode atau link tugas dari guru?
      </h4>
      <p style={{ margin: '0 0 0.7rem', color: C.gray, fontSize: '0.8rem' }}>
        Opsional — masukkan kode (mis. K3F9XA) atau tempel link tugas untuk langsung mengerjakannya, tanpa perlu menunggu ditugaskan.
      </p>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
        <input
          type="text"
          value={joinCodeInput}
          onChange={e => setJoinCodeInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
          placeholder="Kode tugas atau link, mis. K3F9XA"
          disabled={joining}
          style={{
            flex: 1, padding: '9px 14px', borderRadius: '40px',
            border: `1.5px solid ${C.border}`, fontFamily: 'inherit',
            fontSize: isMobile ? '16px' : '0.85rem', minHeight: isMobile ? '44px' : 'auto',
            outline: 'none', background: C.white, color: C.dark, boxSizing: 'border-box',
          }}
        />
        <button
          onClick={onSubmit}
          disabled={joining || !joinCodeInput.trim()}
          style={{
            padding: '9px 20px', borderRadius: '40px', border: 'none',
            background: joining || !joinCodeInput.trim() ? C.border : C.primary,
            color: C.white, fontWeight: 'bold', fontSize: '0.85rem',
            minHeight: isMobile ? '44px' : 'auto',
            cursor: joining || !joinCodeInput.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          {joining ? 'Membuka...' : '🚀 Buka Tugas'}
        </button>
      </div>
      {joinError && (
        <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '6px' }}>{joinError}</div>
      )}
      {joinSuccessMsg && !joinError && (
        <div style={{ color: C.green, fontSize: '0.78rem', marginTop: '6px' }}>{joinSuccessMsg}</div>
      )}
    </div>
  );
};
