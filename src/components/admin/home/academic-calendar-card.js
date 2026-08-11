// src/components/admin/adminHome/AcademicCalendarCard.js
import React from 'react';
import { C } from '../../shared/Theme';
import { HARI_SHORT, BULAN_LIST } from './admin-home-constants';
import { cardStyle, btnSecondary } from './admin-home-styles';

const AcademicCalendarCard = ({
  today,
  viewMonth,
  viewYear,
  firstDayOffset,
  calendarDays,
  tasksByDate,
  isCurrentMonth,
  onPrevMonth,
  onNextMonth,
  onGoToCurrentMonth,
  onDayClick,
}) => {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: C.dark }}>Kalender Akademik</h3>
        {!isCurrentMonth && (
          <button onClick={onGoToCurrentMonth} style={{ ...btnSecondary, padding: '4px 10px', fontSize: '0.75rem' }}>Bulan ini</button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <button onClick={onPrevMonth} style={{ ...btnSecondary, padding: '2px 10px' }}>‹</button>
        <div style={{ fontWeight: '600', color: C.dark }}>{BULAN_LIST[viewMonth]} {viewYear}</div>
        <button onClick={onNextMonth} style={{ ...btnSecondary, padding: '2px 10px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', fontSize: '0.8rem' }}>
        {HARI_SHORT.map((d) => <div key={d} style={{ textAlign: 'center', fontWeight: '600', color: C.gray }}>{d}</div>)}
        {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`empty-${i}`} />)}
        {calendarDays.map((day) => {
          const dayTasks = tasksByDate[day] || [];
          const hasTugas = dayTasks.some((t) => t.type === 'Tugas');
          const hasPenilaian = dayTasks.some((t) => t.type === 'Penilaian');
          const isToday = isCurrentMonth && day === today.getDate();
          const label = dayTasks.map((t) => `${t.type}: ${t.judul}`).join('\n');
          return (
            <div
              key={day}
              title={label ? `${label}\n(klik untuk tambah)` : 'Klik untuk tambah tugas/penilaian'}
              onClick={() => onDayClick(day)}
              style={{
                textAlign: 'center',
                padding: '4px 0',
                borderRadius: '4px',
                background: dayTasks.length ? C.goldBg : 'transparent',
                color: dayTasks.length ? C.gold : C.dark,
                fontWeight: dayTasks.length || isToday ? 'bold' : 'normal',
                outline: isToday ? `1.5px solid ${C.green}` : 'none',
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.goldBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = dayTasks.length ? C.goldBg : 'transparent'; }}
            >
              {day}
              {(hasTugas || hasPenilaian) && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '1px' }}>
                  {hasTugas && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.gold, display: 'inline-block' }} />}
                  {hasPenilaian && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.green, display: 'inline-block' }} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: C.gold, borderRadius: '50%', marginRight: '4px' }}></span>Tugas</span>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: C.green, borderRadius: '50%', marginRight: '4px' }}></span>Penilaian</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', border: `1.5px solid ${C.green}`, borderRadius: '3px', marginRight: '4px' }}></span>Hari ini</span>
      </div>
    </div>
  );
};

export default AcademicCalendarCard;
