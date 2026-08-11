import React from 'react';
import { C } from '../constants';
import { formatDate } from '../utils';
import { StatusBadge } from './StatusBadge';

export const TaskRow = ({ task, isMobile }) => (
  <div style={{
    display: 'flex',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: '10px',
    padding: '0.7rem 0.9rem',
    borderRadius: '10px',
    background: C.cream,
    marginBottom: '6px',
  }}>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.88rem' }}>{task.title}</span>
        <span style={{
          background: C.primaryBg, color: C.primary, padding: '1px 9px',
          borderRadius: '40px', fontSize: '0.68rem', fontWeight: 'bold',
        }}>
          {task.subject}
        </span>
      </div>
      <div style={{ color: C.gray, fontSize: '0.75rem', marginTop: '2px' }}>
        Guru: {task.teacherName} • Tenggat: {formatDate(task.dueDate)}
      </div>
    </div>
    <StatusBadge submitted={task.submitted} score={task.score} maxScore={task.maxScore} />
  </div>
);
