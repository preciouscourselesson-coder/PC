import React from 'react';
import { C } from '../constants';
import { scorePercent } from '../utils';

// ─── Badge status: nilai (kalau sudah dikerjakan) atau "Belum Dikerjakan" ───
export const StatusBadge = ({ submitted, score, maxScore }) => {
  if (!submitted) {
    return (
      <span style={{
        background: C.orangeBg, color: C.orange,
        padding: '3px 12px', borderRadius: '40px',
        fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap',
      }}>
        ⏳ Belum Dikerjakan
      </span>
    );
  }

  const pct = scorePercent(score, maxScore);
  const isLow = pct !== null && pct < 60;

  return (
    <span style={{
      background: isLow ? C.redBg : C.greenBg,
      color: isLow ? C.red : C.green,
      padding: '3px 12px', borderRadius: '40px',
      fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap',
    }}>
      🏆 {score}/{maxScore}{pct !== null ? ` (${pct}%)` : ''}
    </span>
  );
};
