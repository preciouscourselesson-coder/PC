import React from 'react';
import { C } from '../theme';

export const SearchInput = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.gray }}>🔍</span>
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
    />
  </div>
);

export default SearchInput;
