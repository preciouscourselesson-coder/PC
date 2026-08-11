import React from 'react';
import { C } from '../constants';
import { TaskCard } from './TaskCard';

export const TaskList = ({ loading, filteredTasks, isMobile, onUpload, onWork }) => {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: C.gray }}>Memuat tugas...</div>;
  }

  if (filteredTasks.length === 0) {
    return (
      <div style={{
        background: C.white,
        border: `1.5px solid ${C.border}`,
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center',
        color: C.gray,
      }}>
        Tidak ada tugas.
      </div>
    );
  }

  return (
    <>
      {filteredTasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onUpload={onUpload}
          onWork={onWork}
          isMobile={isMobile}
        />
      ))}
      <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.78rem', marginTop: '1.5rem' }}>
        © 2026 Precious Course. All rights reserved.
      </p>
    </>
  );
};
