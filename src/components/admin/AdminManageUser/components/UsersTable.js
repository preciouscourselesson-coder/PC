// Tabel user lengkap: menangani state loading/kosong, lalu merender baris via UserRow.
import React from 'react';
import { C } from '../constants';
import UserRow from './UserRow';

const COLUMNS = ['Nama', 'Email', 'Peran', 'Gender', 'Kelas', 'Mapel', 'Referral', 'Status', 'Terdaftar', 'Aksi'];

const UsersTable = ({
  loading,
  error,
  filtered,
  busyId,
  loginAsId,
  mapelDropdownOpenId,
  mapelDropdownRef,
  onToggleMapelDropdown,
  actions,
}) => {
  if (loading) {
    return (
      <div style={{
        background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
        padding: '2.5rem', textAlign: 'center', color: C.gray, fontSize: '0.92rem',
      }}>
        Memuat daftar user...
      </div>
    );
  }

  if (!error && filtered.length === 0) {
    return (
      <div style={{
        background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
        padding: '3rem 2rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
        <p style={{ color: C.dark, fontWeight: 'bold', fontSize: '1rem', margin: '0 0 4px' }}>
          Tidak ada user yang cocok
        </p>
        <p style={{ color: C.gray, fontSize: '0.88rem', margin: 0 }}>
          Coba ubah kata kunci pencarian atau filter.
        </p>
      </div>
    );
  }

  if (filtered.length === 0) return null;

  return (
    <div style={{
      background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px' }}>
          <thead>
            <tr style={{ background: C.cream }}>
              {COLUMNS.map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '12px 16px', fontSize: '0.78rem',
                  color: C.gray, fontWeight: 'bold', textTransform: 'uppercase',
                  letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <UserRow
                key={u.id}
                user={u}
                isBusy={busyId === u.id}
                isLoginAsBusy={loginAsId === u.id}
                mapelDropdownOpenId={mapelDropdownOpenId}
                mapelDropdownRef={mapelDropdownRef}
                onToggleMapelDropdown={onToggleMapelDropdown}
                actions={actions}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTable;
