// Satu baris tabel user: nama, email, role, gender, kelas, mapel, referral, status, tanggal, aksi.
//
// Kolom role/gender/kelas/private-per-siswa dipakai lewat EditableSelect --
// tampil polos seperti teks (tanpa kotak/border) selama tidak disentuh, baru
// terlihat sebagai dropdown saat di-hover/klik. Tujuannya supaya baris tabel
// tidak terasa "penuh kotak form" saat sekadar dibaca sekilas.
import React from 'react';
import { C, ROLE_LABEL, ROLE_COLOR, STATUS_LABEL, STATUS_COLOR, KELAS_OPTIONS, JENIS_KELAS_COLOR } from '../constants';
import { formatDate } from '../utils/formatDate';
import EditableSelect from './EditableSelect';
import IconBtn from './IconBtn';
import MapelDropdown from './MapelDropdown';
import ReferralCell from './ReferralCell';
import { IconCheck, IconX, IconTrash, IconLogIn, IconRefresh } from './icons';

const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }));
const GENDER_OPTIONS = [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }];
const KELAS_SELECT_OPTIONS = KELAS_OPTIONS.map(k => ({ value: k, label: k }));
const JENIS_KELAS_OPTIONS = [{ value: 'Private', label: 'Private' }, { value: 'Group', label: 'Group' }];

const cellPad = { padding: '10px 14px' };

const UserRow = ({
  user: u,
  isBusy,
  isLoginAsBusy,
  mapelDropdownOpenId,
  mapelDropdownRef,
  onToggleMapelDropdown,
  actions,
  className = '',
}) => {
  const sc = STATUS_COLOR[u.status] || { color: C.gray, bg: C.cream };
  const name = u.full_name || u.email;

  return (
    <tr className={className} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s ease' }}>
      <td style={{ ...cellPad, fontSize: '0.87rem', color: C.dark, fontWeight: 'bold' }}>
        {u.full_name || '(Tanpa nama)'}
      </td>
      <td style={{ ...cellPad, fontSize: '0.84rem', color: C.gray }}>
        {u.email}
      </td>
      <td style={cellPad}>
        <EditableSelect
          value={u.role}
          disabled={isBusy}
          onChange={e => actions.handleRoleChange(u.id, name, e.target.value)}
          options={ROLE_OPTIONS}
          allowEmpty={false}
          valueColor={ROLE_COLOR[u.role]}
        />
      </td>
      <td style={cellPad}>
        <EditableSelect
          value={u.gender}
          disabled={isBusy}
          onChange={e => actions.handleGenderChange(u.id, name, e.target.value)}
          options={GENDER_OPTIONS}
          placeholder="Belum diisi"
        />
      </td>
      <td style={cellPad}>
        {u.role === 'student' ? (
          <EditableSelect
            value={u.kelas}
            disabled={isBusy}
            onChange={e => actions.handleKelasChange(u.id, name, e.target.value)}
            options={KELAS_SELECT_OPTIONS}
            placeholder="Belum diisi"
          />
        ) : (
          <span style={{ color: C.gray, fontSize: '0.83rem' }}>-</span>
        )}
      </td>
      <td style={cellPad}>
        {u.role === 'student' ? (
          <EditableSelect
            value={u.jenis_kelas}
            disabled={isBusy}
            onChange={e => actions.handleJenisKelasChange(u.id, name, e.target.value)}
            options={JENIS_KELAS_OPTIONS}
            placeholder="Belum diisi"
            valueColor={JENIS_KELAS_COLOR[u.jenis_kelas]}
          />
        ) : (
          <span style={{ color: C.gray, fontSize: '0.83rem' }}>-</span>
        )}
      </td>
      <td style={cellPad}>
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
      <td style={cellPad}>
        <ReferralCell
          user={u}
          isBusy={isBusy}
          onCopy={() => actions.handleCopyReferral(u.referral_code)}
          onGenerate={() => actions.handleGenerateReferral(u.id, name)}
        />
      </td>
      <td style={cellPad}>
        <span style={{
          background: sc.bg, color: sc.color, fontSize: '0.76rem', fontWeight: 'bold',
          padding: '4px 11px', borderRadius: '20px', whiteSpace: 'nowrap',
        }}>
          {STATUS_LABEL[u.status] || u.status}
        </span>
      </td>
      <td style={{ ...cellPad, fontSize: '0.82rem', color: C.gray, whiteSpace: 'nowrap' }}>
        {formatDate(u.created_at)}
      </td>
      <td style={cellPad}>
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
