import React from 'react';
import { C, PAGE_SIZE, pagerBtnStyle } from '../theme';

export const Pagination = ({ page, totalPages, total, onPrev, onNext, itemLabel }) => {
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem', color: C.gray }}>
      <span>Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} {itemLabel}</span>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={onPrev} disabled={page === 1} style={pagerBtnStyle(page === 1)}>‹ Sebelumnya</button>
        <span style={{ padding: '7px 10px' }}>Hal {page} / {totalPages}</span>
        <button onClick={onNext} disabled={page === totalPages} style={pagerBtnStyle(page === totalPages)}>Selanjutnya ›</button>
      </div>
    </div>
  );
};

export default Pagination;
