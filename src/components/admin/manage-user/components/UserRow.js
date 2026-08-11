// Satu baris tabel user: nama, email, role, gender, kelas, mapel, referral, status, tanggal, aksi.
import React from 'react';
import { C, STATUS_LABEL, STATUS_COLOR, KELAS_OPTIONS } from '../constants';
import { formatDate } from '../utils/formatDate';
import IconBtn from './IconBtn';
import MapelDropdown from './MapelDropdown';
import ReferralCell from './ReferralCell';
import { IconCheck, IconX, IconTrash, IconLogIn, IconRefresh } from './icons';

const UserRow = ({
  user: u,
  isBusy,
  isLoginAsBusy,
  mapelDropdownOpenId,
  mapelDropdownRef,
  onToggleMapelDropdown,
  actions,
}) => {
  const sc = STATUS_COLOR[u.status] || { color: C.gray, bg: C.cream };
  const name = u.full_name || u.email;

  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: C.dark, fontWeight: 'bold' }}>
        {u.full_name || '(Tanpa nama)'}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: C.gray }}>
        {u.email}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <select
          value={u.role}
          disabled={isBusy}
          onChange={e => actions.handleRoleChange(u.id, name, e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
            fontSize: '0.83rem', fontFamily: 'inherit', color: C.dark, background: C.white,
            cursor: isBusy ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="student">Siswa</option>
          <option value="teacher">Guru</option>
          <option value="parent">Wali Siswa</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <select
          value={u.gender || ''}
          disabled={isBusy}
          onChange={e => actions.handleGenderChange(u.id, name, e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
            fontSize: '0.83rem', fontFamily: 'inherit', color: C.dark, background: C.white,
            cursor: isBusy ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">Belum diisi</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </td>
      <td style={{ padding: '12px 16px' }}>
        {u.role === 'student' ? (
          <select
            value={u.kelas || ''}
            disabled={isBusy}
            onChange={e => actions.handleKelasChange(u.id, name, e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
              fontSize: '0.83rem', fontFamily: 'inherit', color: C.dark, background: C.white,
              cursor: isBusy ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Belum diisi</option>
            {KELAS_OPTIONS.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        ) : (
          <span style={{ color: C.gray, fontSize: '0.83rem' }}>-</span>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        {u.role === 'teacher' ? (
          <MapelDropdown
            user={u}
            isBusy={isBusy}
            isOpen={mapelDropdownOpenId === u.id}
            onToggle={() => onToggleMapelDropdown(mapelDropdownOpenId === u.id ? null : u.id)}
            dropdownRef={mapelDropdownRef}
            onMapelChange={(next) => actions.handleMapelChange(u.id, name, next)}
          />
        ) : (
          <span style={{ color: C.gray, fontSize: '0.83rem' }}>-</span>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <ReferralCell
          user={u}
          isBusy={isBusy}
          onCopy={() => actions.handleCopyReferral(u.referral_code)}
          onGenerate={() => actions.handleGenerateReferral(u.id, name)}
        />
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          background: sc.bg, color: sc.color, fontSize: '0.76rem', fontWeight: 'bold',
          padding: '4px 11px', borderRadius: '20px', whiteSpace: 'nowrap',
        }}>
          {STATUS_LABEL[u.status] || u.status}
        </span>
      </td>
      <td style={{ padding: '12px 16px', fontSize: '0.83rem', color: C.gray, whiteSpace: 'nowrap' }}>
        {formatDate(u.created_at)}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {u.status !== 'approved' && (
            <IconBtn
              title="Setujui"
              disabled={isBusy}
              color={C.white} bg={C.gold} border={C.gold}
              onClick={() => actions.handleStatusChange(u.id, name, 'approved')}
            >
              <IconCheck />
            </IconBtn>
          )}
          {u.status !== 'rejected' && (
            <IconBtn
              title="Tolak"
              disabled={isBusy}
              color={C.danger} bg={C.white} border={C.danger}
              onClick={() => actions.handleStatusChange(u.id, name, 'rejected')}
            >
              <IconX />
            </IconBtn>
          )}
          {(u.role === 'teacher' || u.role === 'student') && u.status === 'approved' && (
            <IconBtn
              title={isLoginAsBusy ? 'Membuka...' : `Masuk sebagai ${name}`}
              disabled={isBusy || isLoginAsBusy}
              color={C.gold} bg={C.white} border={C.gold}
              onClick={() => actions.handleLoginAs(u.id, name)}
            >
              {isLoginAsBusy ? <IconRefresh /> : <IconLogIn />}
            </IconBtn>
          )}
          <IconBtn
            title="Hapus"
            disabled={isBusy}
            color={C.gray} bg={C.white} border={C.border}
            onClick={() => actions.setConfirmDelete(u)}
          >
            <IconTrash />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
};

export default UserRow;
