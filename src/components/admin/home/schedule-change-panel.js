// src/components/admin/adminHome/ScheduleChangePanel.js
import React from 'react';
import { C } from '../../shared/Theme';
import { cardStyle, inputStyle, labelStyle, btnPrimary } from './admin-home-styles';
import { HARI_LIST } from './admin-home-constants';
import { teacherName } from './admin-home-helpers';
import PengajuanJadwalList from './pengajuan-jadwal-list';
import TemporaryScheduleList from './temporary-schedule-list';

const ScheduleChangePanel = ({
  schedules,
  teachers,
  pengajuanJadwal,
  respondingPengajuanId,
  onRespondPengajuan,
  showChangeForm,
  setShowChangeForm,
  changeForm,
  setChangeForm,
  onScheduleChange,
  onDeleteScheduleChange,
}) => {
  const changeNotifCount = schedules.filter((s) => s.is_temporary).length + pengajuanJadwal.length;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ position: 'relative', fontSize: '1.2rem' }}>
            🔔
            {changeNotifCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: C.red,
                color: 'white',
                borderRadius: '50%',
                padding: '1px 5px',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                lineHeight: '1.4',
              }}>
                {changeNotifCount}
              </span>
            )}
          </span>
          <h3 style={{ margin: 0, color: C.dark }}>Perubahan Jadwal</h3>
        </div>
        <button onClick={() => setShowChangeForm((s) => !s)} style={btnPrimary}>{showChangeForm ? 'Batal' : '+ Ajukan Perubahan'}</button>
      </div>

      {showChangeForm && (
        <form onSubmit={onScheduleChange} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Jadwal yang diubah</label>
            <select required value={changeForm.jadwal_id} onChange={(e) => setChangeForm({ ...changeForm, jadwal_id: e.target.value })} style={inputStyle}>
              <option value="">Pilih jadwal...</option>
              {schedules.filter((s) => !s.is_temporary).map((s) => (
                <option key={s.id} value={s.id}>
                  {teacherName(teachers, s.guru_id)} · {s.kelas} · {s.hari} {s.jam_mulai}-{s.jam_selesai}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Jenis Perubahan</label>
            <select value={changeForm.jenis} onChange={(e) => setChangeForm({ ...changeForm, jenis: e.target.value })} style={inputStyle}>
              <option value="Permanen">Permanen</option>
              <option value="Sementara">Sementara (satu kali)</option>
            </select>
          </div>
          {changeForm.jenis === 'Sementara' && (
            <div>
              <label style={labelStyle}>Tanggal Berlaku</label>
              <input required type="date" value={changeForm.tanggal_temporary} onChange={(e) => setChangeForm({ ...changeForm, tanggal_temporary: e.target.value })} style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Hari Baru (opsional)</label>
            <select value={changeForm.hari_baru} onChange={(e) => setChangeForm({ ...changeForm, hari_baru: e.target.value })} style={inputStyle}>
              <option value="">Tetap sama</option>
              {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Jam Mulai Baru (opsional)</label>
            <input type="time" value={changeForm.jam_mulai_baru} onChange={(e) => setChangeForm({ ...changeForm, jam_mulai_baru: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Jam Selesai Baru (opsional)</label>
            <input type="time" value={changeForm.jam_selesai_baru} onChange={(e) => setChangeForm({ ...changeForm, jam_selesai_baru: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Alasan Perubahan</label>
            <input required placeholder="Misal: guru berhalangan hadir, permintaan siswa, dll." value={changeForm.alasan} onChange={(e) => setChangeForm({ ...changeForm, alasan: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={{ ...btnPrimary, width: '100%' }}>Simpan Perubahan</button>
          </div>
        </form>
      )}

      {!showChangeForm && (
        <div>
          <PengajuanJadwalList
            pengajuanJadwal={pengajuanJadwal}
            respondingPengajuanId={respondingPengajuanId}
            onRespond={onRespondPengajuan}
          />
          <TemporaryScheduleList
            schedules={schedules}
            teachers={teachers}
            onDeleteScheduleChange={onDeleteScheduleChange}
          />
        </div>
      )}
    </div>
  );
};

export default ScheduleChangePanel;
