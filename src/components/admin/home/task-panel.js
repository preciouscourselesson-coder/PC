// src/components/admin/adminHome/TaskPanel.js
import React, { forwardRef } from 'react';
import { C } from '../../shared/Theme';
import { cardStyle, inputStyle, labelStyle, btnPrimary, btnDelete } from './admin-home-styles';

const TaskPanel = forwardRef(({
  tasks,
  showTaskForm,
  setShowTaskForm,
  taskForm,
  setTaskForm,
  onAddTask,
  onDeleteTask,
}, ref) => {
  const tasksWithStudent = tasks.filter((t) => t.nama_siswa && t.nama_siswa.trim() !== '').length;

  return (
    <div style={cardStyle} ref={ref}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ position: 'relative', fontSize: '1.2rem' }}>
            🔔
            {tasksWithStudent > 0 && (
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
                {tasksWithStudent}
              </span>
            )}
          </span>
          <h3 style={{ margin: 0, color: C.dark }}>Tugas / Penilaian Siswa</h3>
        </div>
        <button onClick={() => setShowTaskForm((s) => !s)} style={btnPrimary}>{showTaskForm ? 'Batal' : '+ Tambah'}</button>
      </div>

      {showTaskForm && (
        <form onSubmit={onAddTask} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Judul</label>
            <input required value={taskForm.judul} onChange={(e) => setTaskForm({ ...taskForm, judul: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Kelas</label>
            <input required placeholder="XI IPA - Nama Guru" value={taskForm.kelas} onChange={(e) => setTaskForm({ ...taskForm, kelas: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tanggal</label>
            <input required type="date" value={taskForm.tanggal} onChange={(e) => setTaskForm({ ...taskForm, tanggal: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Jenis</label>
            <select value={taskForm.type} onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })} style={inputStyle}>
              <option value="Tugas">Tugas</option>
              <option value="Penilaian">Penilaian</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={{ ...btnPrimary, width: '100%' }}>Simpan</button>
          </div>
        </form>
      )}

      {tasks.length === 0 && <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada tugas/penilaian.</p>}
      {tasks
        .slice()
        .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
        .map((item, idx, arr) => (
          <div key={item.id} style={{ padding: '0.5rem 0', borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: C.dark }}>{item.judul}</div>
                <div style={{ fontSize: '0.85rem', color: C.gray }}>{item.kelas}</div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.8rem', color: C.gray }}>{new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span style={{ background: C.goldBg, color: C.gold, padding: '0 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600' }}>{item.type}</span>
                </div>
              </div>
              <button onClick={() => onDeleteTask(item.id)} style={btnDelete}>🗑️</button>
            </div>
          </div>
        ))}
    </div>
  );
});

export default TaskPanel;
