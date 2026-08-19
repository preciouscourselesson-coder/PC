import React from 'react';
import { C } from '../constants';
import { getCardStyle, linkBtn } from '../utils/styles';
import { MateriRequestList } from './MateriRequestList';

export const MateriRequestSection = ({ isMobile, materiRequestList, loading, guruOptions, onNavigateToFolderShared }) => (
  <div style={getCardStyle(isMobile)}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
      <h3 style={{ margin: 0, color: C.dark }}>Permintaan Materi Saya</h3>
      <button style={linkBtn} onClick={onNavigateToFolderShared}>
        + Minta Materi
      </button>
    </div>
    <MateriRequestList materiRequestList={materiRequestList} loading={loading} guruOptions={guruOptions} />
  </div>
);
