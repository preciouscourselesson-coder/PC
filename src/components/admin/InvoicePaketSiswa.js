// src/components/admin/InvoicePaketSiswa.js
//
// Modal invoice pembayaran, dibuka dari tombol "Pembayaran" di PaketSiswa.js.
// Tampilannya dibuat mengikuti template invoice Precious Course (Excel) yang
// dipakai sebelumnya. Bisa dicetak / disimpan sebagai PDF lewat window.print().
//
// Mendukung siswa dengan lebih dari satu paket: paket lain milik siswa yang
// sama otomatis dimuat dan bisa dicentang untuk digabung ke invoice yang sama.

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import pcLogo from '../../Resource/PC_Horisontal.png';

// ------------------------------------------------------------
// GANTI BAGIAN INI SESUAI DATA BISNIS ANDA
// ------------------------------------------------------------
const BUSINESS = {
  brandInitial: 'PC',
  brandName: 'PRECIOUS COURSE',
  email: 'preciouscourse.lessons@gmail.com',
  contact: '0812-3572-1425',
  bankName: 'BCA',
  accountName: 'Gonawan Ronald J',
  accountNumber: '0842196670',
  headerColor: '#c0541a',
  footerNote:
    '*Mohon melakukan pembayaran sesuai duedate. Keterlambatan hanya untuk pertemuan pertama.\nApabila belum melakukan pembayaran sampai duedate, kami akan menghubungi Bpk/Ibu Wali Murid.',
};
// ------------------------------------------------------------

const BULAN_PANJANG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const formatTanggalPanjang = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  const bulan = BULAN_PANJANG[parseInt(m, 10) - 1] || m;
  return `${parseInt(d, 10)} ${bulan} ${y}`;
};

const formatBulanTahun = (isoDate) => {
  if (!isoDate) return '';
  const [y, m] = isoDate.split('-');
  const bulan = BULAN_PANJANG[parseInt(m, 10) - 1] || m;
  return `${bulan} ${y}`;
};

// Format angka ala invoice: "500.000,00" (tanpa prefix Rp, 2 desimal)
const formatAngkaInvoice = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (isoDate, days) => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Hitung harga sesuai jenis paket (Private/Group) mengikuti kolom harga di pricelist.
// Kalau ada hargaCustom (harga khusus per siswa), itu yang dipakai dan pricelist diabaikan.
const getHargaPaket = (jenis, jumlahGroup, pricelist, hargaCustom) => {
  if (hargaCustom != null) return hargaCustom;
  if (!pricelist) return 0;
  if (jenis !== 'Group') return pricelist.harga_privat || 0;
  if (jumlahGroup === 2) return pricelist.harga_2siswa ?? pricelist.harga_privat ?? 0;
  if (jumlahGroup === 3) return pricelist.harga_3siswa ?? pricelist.harga_privat ?? 0;
  if (jumlahGroup === 4) return pricelist.harga_4siswa ?? pricelist.harga_privat ?? 0;
  return pricelist.harga_privat || 0;
};

// Item paket yang dibuka dari tombol "Pembayaran" (sudah diproses PaketSiswa.js)
const normalizeFromItem = (it) => ({
  id: it.id,
  paket: it.paket,
  jenis: it.jenis,
  jumlah_siswa_group: it.jumlah_siswa_group,
  totalPertemuan: it.total_pertemuan,
  durasi: it.durasi,
  harga: getHargaPaket(it.jenis, it.jumlah_siswa_group, it.pricelist, it.harga_custom),
  isHargaCustom: it.harga_custom != null,
});

// Paket lain milik siswa yang sama, diambil langsung dari Supabase
const normalizeFromRow = (row) => ({
  id: row.id,
  paket: row.pricelist?.program || 'Paket',
  jenis: row.jenis,
  jumlah_siswa_group: row.jumlah_siswa_group,
  totalPertemuan: row.total_pertemuan,
  durasi: row.pricelist?.durasi,
  harga: getHargaPaket(row.jenis, row.jumlah_siswa_group, row.pricelist, row.harga_custom),
  isHargaCustom: row.harga_custom != null,
});

const fieldStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1.5px solid #2c3145',
  fontSize: '0.82rem',
  color: '#f2efe6',
  fontFamily: 'inherit',
  background: '#1c2030',
  outline: 'none',
  boxSizing: 'border-box',
};

const smallFieldStyle = { ...fieldStyle, padding: '6px 8px', fontSize: '0.78rem' };

const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: '#9a9fb0',
  marginBottom: '4px',
};

const InvoicePaketSiswa = ({ item, onClose }) => {
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDaysISO(todayISO(), 3));
  const [sekolah, setSekolah] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [deskripsi, setDeskripsi] = useState(formatBulanTahun(todayISO()));
  const [diskonPersen, setDiskonPersen] = useState(0);
  const [penyesuaian, setPenyesuaian] = useState(0); // (+) kekurangan bulan lalu, (-) kelebihan bulan lalu
  const [catatan, setCatatan] = useState(
    item?.paket ? `Program ${item.paket}` : ''
  );

  const [otherPaket, setOtherPaket] = useState([]);
  const [loadingOther, setLoadingOther] = useState(false);
  const [lineState, setLineState] = useState({}); // { [paketId]: { included, jam, amount } }

  // Ambil paket lain milik siswa yang sama, supaya bisa digabung ke invoice ini
  useEffect(() => {
    if (!item?.siswa_id) return;
    let cancelled = false;
    setLoadingOther(true);
    (async () => {
      const { data, error } = await supabase
        .from('paket_siswa')
        .select(`
          id, jenis, jumlah_siswa_group, total_pertemuan, status, harga_custom,
          pricelist:pricelist!paket_siswa_pricelist_id_fkey (program, durasi, harga_privat, harga_2siswa, harga_3siswa, harga_4siswa)
        `)
        .eq('siswa_id', item.siswa_id)
        .neq('id', item.id)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setOtherPaket(error ? [] : (data || []));
        setLoadingOther(false);
      }
    })();
    return () => { cancelled = true; };
  }, [item]);

  const allLines = useMemo(() => {
    if (!item) return [];
    return [normalizeFromItem(item), ...otherPaket.map(normalizeFromRow)];
  }, [item, otherPaket]);

  // Inisialisasi state per baris paket (dicentang/tidak, jam, nominal) begitu daftar paket siap
  useEffect(() => {
    setLineState((prev) => {
      const next = { ...prev };
      allLines.forEach((l) => {
        if (!next[l.id]) {
          next[l.id] = {
            included: l.id === item.id,
            jam: l.totalPertemuan ? `${l.totalPertemuan} @${l.durasi || ''}` : '',
            amount: String(l.harga || 0),
          };
        }
      });
      return next;
    });
  }, [allLines, item]);

  const toggleLine = (id) => {
    setLineState((prev) => ({ ...prev, [id]: { ...prev[id], included: !prev[id]?.included } }));
  };

  const updateLineField = (id, field, value) => {
    setLineState((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const selectedLines = useMemo(
    () => allLines.filter((l) => lineState[l.id]?.included),
    [allLines, lineState]
  );

  const subTotal = selectedLines.reduce(
    (sum, l) => sum + (Number(lineState[l.id]?.amount) || 0),
    0
  );
  const totalSetelahDiskon = useMemo(
    () => subTotal * (1 - (Number(diskonPersen) || 0) / 100),
    [subTotal, diskonPersen]
  );
  const total = totalSetelahDiskon + (Number(penyesuaian) || 0);

  const handlePrint = () => {
    window.print();
  };

  if (!item) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 400, padding: '2rem 1rem', overflowY: 'auto',
      }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area {
            position: absolute; top: 0; left: 0; width: 100%; margin: 0; box-shadow: none;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '760px' }}>
        {/* Panel pengaturan (tidak ikut tercetak) */}
        <div
          className="no-print"
          style={{
            background: '#12141c', borderRadius: '16px 16px 0 0', padding: '1.25rem 1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#d4ac52', fontWeight: 800, fontSize: '0.95rem' }}>PENGATURAN INVOICE</span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#9a9fb0', fontSize: '1rem', cursor: 'pointer' }}
            >
              &#10005;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Tanggal Invoice</label>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payment Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nama Sekolah (opsional)</label>
              <input type="text" value={sekolah} onChange={(e) => setSekolah(e.target.value)} style={fieldStyle} placeholder="cth. STAG" />
            </div>
            <div>
              <label style={labelStyle}>Jurusan (opsional)</label>
              <input type="text" value={jurusan} onChange={(e) => setJurusan(e.target.value)} style={fieldStyle} placeholder="cth. IPS" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description (cth. bulan tagihan)</label>
              <input type="text" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} style={fieldStyle} />
            </div>
          </div>

          {/* Daftar paket yang digabung ke invoice ini */}
          <div>
            <label style={labelStyle}>Paket yang Diinvoice</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allLines.map((l) => {
                const state = lineState[l.id] || {};
                const isCurrent = l.id === item.id;
                return (
                  <div
                    key={l.id}
                    style={{
                      background: '#1c2030', border: '1.5px solid #2c3145', borderRadius: '10px',
                      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px',
                      opacity: state.included ? 1 : 0.55,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isCurrent ? 'default' : 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!state.included}
                        disabled={isCurrent}
                        onChange={() => toggleLine(l.id)}
                      />
                      <span style={{ color: '#f2efe6', fontWeight: 700, fontSize: '0.85rem' }}>{l.paket}</span>
                      <span style={{ color: '#9a9fb0', fontSize: '0.72rem' }}>
                        {l.jenis}{l.jenis === 'Group' && l.jumlah_siswa_group ? ` (${l.jumlah_siswa_group} org)` : ''}
                        {isCurrent ? ' - paket yang dipilih' : ''}
                      </span>
                      {l.isHargaCustom && (
                        <span
                          style={{
                            background: 'rgba(224,87,79,0.16)',
                            color: '#e0574f',
                            padding: '1px 8px',
                            borderRadius: '999px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          💰 Harga Khusus
                        </span>
                      )}
                    </label>
                    {state.included && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingLeft: '24px' }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Hours</label>
                          <input
                            type="text"
                            value={state.jam || ''}
                            onChange={(e) => updateLineField(l.id, 'jam', e.target.value)}
                            style={smallFieldStyle}
                          />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Nominal (Rp)</label>
                          <input
                            type="number"
                            min="0"
                            value={state.amount ?? ''}
                            onChange={(e) => updateLineField(l.id, 'amount', e.target.value)}
                            style={smallFieldStyle}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!loadingOther && otherPaket.length === 0 && (
                <div style={{ fontSize: '0.72rem', color: '#5f6577' }}>
                  Siswa ini belum punya paket lain yang aktif.
                </div>
              )}
              {loadingOther && (
                <div style={{ fontSize: '0.72rem', color: '#5f6577' }}>Memuat paket lain milik siswa ini...</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Diskon (%)</label>
              <input type="number" min="0" max="100" value={diskonPersen} onChange={(e) => setDiskonPersen(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Kekurangan (+) / Kelebihan (-) Bulan Lalu</label>
              <input type="number" value={penyesuaian} onChange={(e) => setPenyesuaian(e.target.value)} style={fieldStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Note (tampil di invoice)</label>
            <input type="text" value={catatan} onChange={(e) => setCatatan(e.target.value)} style={fieldStyle} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #2c3145', background: 'transparent', color: '#9a9fb0', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#d4ac52', color: '#241d0d', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              &#128424; Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* AREA YANG DICETAK */}
        {/* ============================================================ */}
        <div
          id="invoice-print-area"
          style={{
            background: '#ffffff', color: '#232323', fontFamily: 'Arial, sans-serif',
            fontSize: '0.85rem', boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
          }}
        >
          {/* Header */}
          <div style={{ background: BUSINESS.headerColor, color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '6px 14px', display: 'flex', alignItems: 'center' }}>
              <img src={pcLogo} alt={BUSINESS.brandName} style={{ height: '38px', display: 'block' }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.7rem', letterSpacing: '0.06em' }}>INVOICE</span>
          </div>

          <div style={{ padding: '26px 32px 24px' }}>
            {/* Kontak & tanggal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingBottom: '18px', borderBottom: `2px solid ${BUSINESS.headerColor}` }}>
              <div style={{ lineHeight: 1.7 }}>
                <div style={{ fontStyle: 'italic', color: BUSINESS.headerColor, fontWeight: 700 }}>{BUSINESS.email}</div>
                <div style={{ color: '#555' }}>contact: {BUSINESS.contact}</div>
              </div>
              <div style={{ textAlign: 'right', lineHeight: 1.7 }}>
                <div>Invoice date: <strong><u>{formatTanggalPanjang(invoiceDate)}</u></strong></div>
                <div>Payment Due Date: <strong><u>{formatTanggalPanjang(dueDate)}</u></strong></div>
              </div>
            </div>

            {/* Info customer */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '18px 0 22px', fontSize: '0.85rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 700, width: '130px', color: '#555' }}>Customer name</td>
                  <td style={{ padding: '4px 0', fontWeight: 700 }}>{item.siswa_nama}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 700, color: '#555' }}>School name</td>
                  <td style={{ padding: '4px 0' }}>{sekolah || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 700, color: '#555' }}>Class</td>
                  <td style={{ padding: '4px 0' }}>{item.kelas_siswa}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 700, color: '#555' }}>Major</td>
                  <td style={{ padding: '4px 0' }}>{jurusan || '-'}</td>
                </tr>
              </tbody>
            </table>

            {/* Tabel item -- satu baris per paket yang dicentang */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#1a1a1a', color: '#fff' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, letterSpacing: '0.02em' }}>Description</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, letterSpacing: '0.02em' }}>Package</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, letterSpacing: '0.02em' }}>Private/ Group</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, letterSpacing: '0.02em' }}>Hours</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, letterSpacing: '0.02em' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedLines.map((l) => (
                  <tr key={l.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e2e2' }}>{deskripsi || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e2e2', background: '#eaf5ee', fontWeight: 600 }}>{l.paket}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e2e2', background: '#eaf5ee' }}>
                      {l.jenis}{l.jenis === 'Group' && l.jumlah_siswa_group ? ` (${l.jumlah_siswa_group} org)` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e2e2' }}>{lineState[l.id]?.jam}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e2e2', background: '#eaf5ee', textAlign: 'right', fontWeight: 600 }}>
                      {formatAngkaInvoice(lineState[l.id]?.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Ringkasan total -- kotak ringkas rata kanan, tidak melebar penuh */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <table style={{ width: '300px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 4px', color: '#555' }}>Sub Total</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e2e2' }}>{formatAngkaInvoice(subTotal)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 4px', color: '#555' }}>Diskon</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e2e2' }}>{Number(diskonPersen) || 0}%</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 4px', color: '#555' }}>Kekurangan/ Kelebihan bln lalu</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e2e2' }}>
                      {Number(penyesuaian) === 0 ? '-' : formatAngkaInvoice(penyesuaian)}
                    </td>
                  </tr>
                  <tr style={{ background: '#1a1a1a', color: '#fff', fontWeight: 800 }}>
                    <td style={{ padding: '9px 4px 9px 10px' }}>Total</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: '0.95rem' }}>{formatAngkaInvoice(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {catatan && (
              <div style={{ fontStyle: 'italic', marginTop: '18px', fontSize: '0.8rem', color: '#444' }}>Note: {catatan}</div>
            )}

            <div style={{ fontStyle: 'italic', fontSize: '0.73rem', color: '#666', textAlign: 'center', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #e2e2e2', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {BUSINESS.footerNote}
            </div>
          </div>

          {/* Payment info */}
          <div style={{ background: BUSINESS.headerColor, color: '#fff', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px 20px', fontSize: '0.8rem' }}>
            <span style={{ fontWeight: 700 }}>Payment Information</span>
            <span>Bank Name: <strong>{BUSINESS.bankName}</strong></span>
            <span>Account Name: <strong>{BUSINESS.accountName}</strong></span>
            <span>Account Number: <strong>{BUSINESS.accountNumber}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePaketSiswa;