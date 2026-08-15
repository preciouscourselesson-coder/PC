import React from 'react';
import { C } from '../constants';
import { getCardStyle } from '../utils/styles';
import { MateriRequestList } from './MateriRequestList';
import { MateriRequestForm } from './MateriRequestForm';

export const MateriRequestSection = ({ isMobile, materiRequestList, loading, guruOptions, materiRequestHook }) => (
  <div style={getCardStyle(isMobile)}>
    <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Permintaan Materi Saya</h3>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '1rem' : '1.5rem' }}>
      <div>
        <MateriRequestList materiRequestList={materiRequestList} loading={loading} guruOptions={guruOptions} />
      </div>
      <MateriRequestForm
        isMobile={isMobile}
        guruOptions={guruOptions}
        materiForm={materiRequestHook.materiForm}
        setMateriForm={materiRequestHook.setMateriForm}
        materiFile={materiRequestHook.materiFile}
        submittingMateri={materiRequestHook.submittingMateri}
        onFileChange={materiRequestHook.handleMateriFileChange}
        onRemoveFile={materiRequestHook.removeMateriFile}
        onSubmit={materiRequestHook.submitMateriRequest}
      />
    </div>
  </div>
);
