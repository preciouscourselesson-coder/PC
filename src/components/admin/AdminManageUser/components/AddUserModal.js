// Modal form untuk menambah user baru secara manual.
import React from 'react';
import { C, KELAS_OPTIONS } from '../constants';

const inputStyle = {
  padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
  fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: C.dark,
};
const selectStyle = { ...inputStyle, background: C.white };

const AddUserModal = ({ open, form, onFormChange, submitting, onSubmit, onCancel }) => {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      padding: '1rem',
    }}>
      <div style={{
        background: C.white, borderRadius: '18px', padding: '1.75rem', maxWidth: '420px',
        width: '100%', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: C.dark, fontWeight: 'bold' }}>
          Tambah User Baru
        </h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text" placeholder="Nama Lengkap" value={form.full_name}
            onChange={e => onFormChange({ ...form, full_name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="email" placeholder="Email" value={form.email}
            onChange={e => onFormChange({ ...form, email: e.target.value })}
            style={inputStyle}
          />
          <input
            type="password" placeholder="Password (min 6 karakter)" value={form.password}
            onChange={e => onFormChange({ ...form, password: e.target.value })}
            style={inputStyle}
          />
          <select
            value={form.role}
            onChange={e => onFormChange({ ...form, role: e.target.value })}
            style={selectStyle}
          >
            <option value="student">Siswa</option>
            <option value="teacher">Guru</option>
            <option value="parent">Wali Siswa</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={form.gender}
            onChange={e => onFormChange({ ...form, gender: e.target.value })}
            style={selectStyle}
          >
            <option value="">Pilih Gender (opsional)</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>

          {form.role === 'student' && (
            <select
              value={form.kelas}
              onChange={e => onFormChange({ ...form, kelas: e.target.value })}
              style={selectStyle}
            >
              <option value="">Pilih Kelas (opsional)</option>
              {KELAS_OPTIONS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '9px 18px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 18px', borderRadius: '10px', border: 'none',
                background: submitting ? '#ccc' : C.gold, color: C.white, fontSize: '0.85rem', fontWeight: 'bold',
                cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {submitting ? 'Menyimpan...' : 'Tambah User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
