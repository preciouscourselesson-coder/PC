import React from 'react';
import { C } from '../../../shared/Theme';
import { STATUS_STYLE } from '../constants';
import { fileIcon } from '../utils';
import { MateriCard } from './MateriCard';
import { MateriTable } from './MateriTable';

export const MateriListSection = ({
  isMobile,
  loading,
  errorMsg,
  items,
  activeTab,
  onView,
  onEdit,
  onArchive,
  onDelete,
}) => {
  if (loading) {
    return (
      <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, padding: '28px', textAlign: 'center', color: C.gray }}>
        Memuat materi...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, padding: '28px', textAlign: 'center', color: C.red }}>
        {errorMsg}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, padding: '28px', textAlign: 'center', color: C.gray }}>
        Belum ada materi di sini untuk status "{activeTab}".
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map(item => {
          const icon = fileIcon(item.tipe);
          const badge = STATUS_STYLE[item.status] || STATUS_STYLE.Draft;
          return (
            <MateriCard
              key={item.id}
              item={item}
              icon={icon}
              badge={badge}
              onView={() => onView(item)}
              onEdit={() => onEdit(item)}
              onArchive={() => onArchive(item)}
              onDelete={() => onDelete(item)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <MateriTable
      items={items}
      statusStyle={STATUS_STYLE}
      onView={onView}
      onEdit={onEdit}
      onArchive={onArchive}
      onDelete={onDelete}
    />
  );
};
