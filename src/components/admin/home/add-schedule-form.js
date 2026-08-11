// src/components/admin/adminHome/AddScheduleForm.js
import React from 'react';
import { C } from '../../shared/Theme';
import { cardStyle, inputStyle, labelStyle, btnPrimary } from './admin-home-styles';
import { HARI_LIST } from './admin-home-constants';

const AddScheduleForm = ({ teachers, students, scheduleForm, setScheduleForm, onAddSchedule }) => {
  return (
    <div style={{ ...cardStyle, alignSelf: 'start' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Tambah Jadwal Baru</h3>
      <form onSubmit={onAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Guru</label>
          <select
            required
            value={scheduleForm.guru_id}
            onChange={(e) => setScheduleForm({ ...scheduleForm, guru_id: e.target.value })}
            style={inputStyle}
          >
            <option value="">Pilih guru...</option>
            {teachers.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Siswa (tahan Ctrl untuk pilih banyak)</label>
          <select
            required
            multiple
            value={scheduleForm.siswa_ids}
            onChange={(e) => {
              const options = e.target.options;
              const selected = [];
              for (let i = 0; i < options.length; i++) {
                if (options[i].selected) selected.push(options[i].value);
              }
              setScheduleForm({ ...scheduleForm, siswa_ids: selected });
            }}
            style={{ ...inputStyle, height: 'auto', minHeight: '80px' }}
          >
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <div style={{ fontSize: '0.7rem', color: C.gray, marginTop: '2px' }}>
            {scheduleForm.siswa_ids.length} siswa dipilih
          </div>
        </div>

        <div>
          <label style={labelStyle}>Hari</label>
          <select
            required
            value={scheduleForm.hari}
            onChange={(e) => setScheduleForm({ ...scheduleForm, hari: e.target.value })}
            style={inputStyle}
          >
            {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>Jam Mulai</label>
            <input
              required
              type="time"
              value={scheduleForm.jam_mulai}
              onChange={(e) => setScheduleForm({ ...scheduleForm, jam_mulai: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Jam Selesai</label>
            <input
              required
              type="time"
              value={scheduleForm.jam_selesai}
              onChange={(e) => setScheduleForm({ ...scheduleForm, jam_selesai: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>Jenis</label>
            <select
              value={scheduleForm.jenis}
              onChange={(e) => {
                const val = e.target.value;
                setScheduleForm({ ...scheduleForm, jenis: val, nama_group: '' });
              }}
              style={inputStyle}
            >
              <option value="Private">Private</option>
              <option value="Group">Group</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipe Les</label>
            <select
              value={scheduleForm.tipe}
              onChange={(e) => setScheduleForm({ ...scheduleForm, tipe: e.target.value })}
              style={inputStyle}
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </div>

        {scheduleForm.jenis === 'Group' && (
          <div>
            <label style={labelStyle}>Nama Group</label>
            <input
              required
              placeholder="Contoh: Kelas A Matematika"
              value={scheduleForm.nama_group}
              onChange={(e) => setScheduleForm({ ...scheduleForm, nama_group: e.target.value })}
              style={inputStyle}
            />
          </div>
        )}

        {scheduleForm.jenis === 'Private' && (
          <div>
            <label style={labelStyle}>Kelas</label>
            <input
              required
              placeholder="XI IPA - Matematika"
              value={scheduleForm.kelas}
              onChange={(e) => setScheduleForm({ ...scheduleForm, kelas: e.target.value })}
              style={inputStyle}
            />
          </div>
        )}

        <button type="submit" style={{ ...btnPrimary, width: '100%', marginTop: '0.5rem' }}>
          Simpan Jadwal
        </button>
      </form>
    </div>
  );
};

export default AddScheduleForm;
