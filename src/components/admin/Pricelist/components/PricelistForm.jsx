import React from 'react';
import {
  D,
  KELAS_OPTIONS,
  PROGRAM_OPTIONS,
  PERTEMUAN_OPTIONS,
  DURASI_OPTIONS,
  PENGAJAR_OPTIONS,
  STATUS_OPTIONS,
  STATUS_META,
} from '../constants';
import { darkInputStyle, darkLabelStyle } from '../styles';

const PricelistForm = ({
  formRef,
  form,
  setField,
  formErrors,
  saving,
  saveError,
  justSaved,
  editingId,
  onSubmit,
  onCancel,
}) => {
  return (
    <div ref={formRef} style={{ background: D.bg, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.28)' }}>
      <div style={{ padding: '1.1rem 1.5rem', background: D.bgSoft, borderBottom: `1px solid ${D.gold}` }}>
        <span style={{ color: D.gold, fontWeight: 800, fontSize: '0.98rem', letterSpacing: '0.02em' }}>
          {editingId ? 'EDIT PRICELIST' : 'TAMBAH PRICELIST'}
        </span>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={darkLabelStyle}>Jenjang</label>
            <select value={form.kelas} onChange={(e) => setField('kelas', e.target.value)} style={{ ...darkInputStyle(formErrors.kelas), cursor: 'pointer' }}>
              {KELAS_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={darkLabelStyle}>Program</label>
            <select value={form.program} onChange={(e) => setField('program', e.target.value)} style={{ ...darkInputStyle(formErrors.program), cursor: 'pointer' }}>
              {PROGRAM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={darkLabelStyle}>Jumlah Pertemuan</label>
          <select value={form.jumlahPertemuan} onChange={(e) => setField('jumlahPertemuan', e.target.value)} style={{ ...darkInputStyle(formErrors.jumlahPertemuan), cursor: 'pointer' }}>
            {PERTEMUAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={darkLabelStyle}>Durasi</label>
            <select value={form.durasi} onChange={(e) => setField('durasi', e.target.value)} style={{ ...darkInputStyle(formErrors.durasi), cursor: 'pointer' }}>
              {DURASI_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={darkLabelStyle}>Pengajar</label>
            <select value={form.pengajar} onChange={(e) => setField('pengajar', e.target.value)} style={{ ...darkInputStyle(formErrors.pengajar), cursor: 'pointer' }}>
              {PENGAJAR_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.1rem' }}>
          <label style={darkLabelStyle}>Harga (Rupiah)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: D.textFaint, marginBottom: '4px' }}>Privat</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: D.textMuted, fontSize: '0.85rem' }}>Rp</span>
                <input type="number" min="0" step="1000" value={form.hargaPrivat} onChange={(e) => setField('hargaPrivat', e.target.value)} style={darkInputStyle(formErrors.hargaPrivat)} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: D.textFaint, marginBottom: '4px' }}>2 Siswa</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: D.textMuted, fontSize: '0.85rem' }}>Rp</span>
                <input type="number" min="0" step="1000" value={form.harga2} onChange={(e) => setField('harga2', e.target.value)} style={darkInputStyle(false)} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: D.textFaint, marginBottom: '4px' }}>3 Siswa</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: D.textMuted, fontSize: '0.85rem' }}>Rp</span>
                <input type="number" min="0" step="1000" value={form.harga3} onChange={(e) => setField('harga3', e.target.value)} style={darkInputStyle(false)} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: D.textFaint, marginBottom: '4px' }}>4 Siswa</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: D.textMuted, fontSize: '0.85rem' }}>Rp</span>
                <input type="number" min="0" step="1000" value={form.harga4} onChange={(e) => setField('harga4', e.target.value)} style={darkInputStyle(false)} />
              </div>
            </div>
          </div>
          {formErrors.hargaPrivat && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{formErrors.hargaPrivat}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1.1rem' }}>
          <div>
            <label style={darkLabelStyle}>Status</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
              {STATUS_OPTIONS.map((s) => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: D.text, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="radio" name="status" checked={form.status === s} onChange={() => setField('status', s)} style={{ accentColor: STATUS_META[s].dot }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_META[s].dot, display: 'inline-block' }} />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={darkLabelStyle}>Tanggal Berlaku</label>
            <input type="date" value={form.tanggalBerlaku} onChange={(e) => setField('tanggalBerlaku', e.target.value)} style={darkInputStyle(formErrors.tanggalBerlaku)} />
            {formErrors.tanggalBerlaku && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{formErrors.tanggalBerlaku}</div>}
            <div style={{ fontSize: '0.7rem', color: D.textFaint, marginTop: '6px' }}>
              Harga akan berlaku mulai tanggal ini untuk pemesanan baru.
            </div>
          </div>
        </div>

        {saveError && <div style={{ color: D.danger, fontSize: '0.82rem', marginTop: '1rem' }}>{saveError}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          {justSaved && <span style={{ color: D.green, fontSize: '0.85rem', fontWeight: 600 }}>&#10003; Pricelist tersimpan</span>}
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ background: 'none', border: `1.5px solid ${D.fieldBorder}`, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', color: D.textMuted, fontWeight: 500 }}
          >
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            style={{ background: D.gold, border: 'none', padding: '10px 26px', borderRadius: '10px', cursor: saving ? 'default' : 'pointer', color: '#241d0d', fontWeight: 700, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricelistForm;
