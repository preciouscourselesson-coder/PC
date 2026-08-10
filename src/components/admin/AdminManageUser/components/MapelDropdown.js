// Sel dropdown multi-pilih untuk mapel guru pada satu baris tabel.
import React from 'react';
import { C, MAPEL_OPTIONS } from '../constants';

const MapelDropdown = ({ user, isBusy, isOpen, onToggle, dropdownRef, onMapelChange }) => (
  <div
    ref={isOpen ? dropdownRef : null}
    style={{ position: 'relative', minWidth: '160px' }}
  >
    <button
      type="button"
      disabled={isBusy}
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        textAlign: 'left',
        padding: '6px 10px',
        borderRadius: '8px',
        border: `1.5px solid ${isOpen ? C.gold : C.border}`,
        fontSize: '0.83rem',
        fontFamily: 'inherit',
        color: C.dark,
        background: C.white,
        cursor: isBusy ? 'not-allowed' : 'pointer',
      }}
    >
      {(user.mapel && user.mapel.length > 0) ? (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
          {user.mapel.map(m => (
            <span key={m} style={{
              background: C.goldBg, color: C.gold, fontSize: '0.72rem', fontWeight: 'bold',
              padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
            }}>
              {m}
            </span>
          ))}
        </span>
      ) : (
        <span style={{ color: C.gray, flex: 1 }}>Pilih mapel</span>
      )}
      <span style={{ color: C.gray, fontSize: '0.7rem' }}>▾</span>
    </button>

    {isOpen && (
      <div style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30,
        minWidth: '190px', background: C.white, border: `1.5px solid ${C.border}`,
        borderRadius: '10px', boxShadow: '0 8px 20px rgba(23,20,17,0.14)', padding: '6px',
      }}>
        {MAPEL_OPTIONS.map(m => {
          const checked = (user.mapel || []).includes(m);
          return (
            <label
              key={m}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 8px',
                borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem', color: C.dark,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.cream; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isBusy}
                onChange={() => {
                  const current = user.mapel || [];
                  const next = checked ? current.filter(x => x !== m) : [...current, m];
                  onMapelChange(next);
                }}
                style={{ accentColor: C.gold, width: '15px', height: '15px', cursor: 'pointer' }}
              />
              {m}
            </label>
          );
        })}
      </div>
    )}
  </div>
);

export default MapelDropdown;
