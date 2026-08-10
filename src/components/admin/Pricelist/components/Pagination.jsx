import React from 'react';
import { C } from '../constants';
import { iconBtnStyle } from '../styles';

const Pagination = ({ safePage, totalPages, setPage, rangeStart, rangeEnd, totalCount }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.1rem' }}>
      <span style={{ fontSize: '0.8rem', color: C.gray }}>
        Menampilkan {rangeStart}-{rangeEnd} dari {totalCount} data
      </span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
          style={{ ...iconBtnStyle(C.cream, C.dark), width: '28px', height: '28px', borderRadius: '8px', cursor: safePage === 1 ? 'default' : 'pointer', opacity: safePage === 1 ? 0.5 : 1 }}
        >
          &#8249;
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: p === safePage ? C.gold : C.cream,
              color: p === safePage ? C.white : C.dark,
            }}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
          style={{ ...iconBtnStyle(C.cream, C.dark), width: '28px', height: '28px', borderRadius: '8px', cursor: safePage === totalPages ? 'default' : 'pointer', opacity: safePage === totalPages ? 0.5 : 1 }}
        >
          &#8250;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
