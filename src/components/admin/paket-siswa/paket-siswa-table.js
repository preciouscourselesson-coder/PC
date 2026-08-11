// src/components/admin/paketSiswa/PaketSiswaTable.js
import React from 'react';
import { C } from '../../shared/Theme';
import { iconBtnStyle } from './paket-siswa-styles';
import { STATUS_META, getPengajarMeta } from './paket-siswa-helpers';

const PaketSiswaTable = ({
  loading,
  pageItems,
  rangeStart,
  hasActiveFilter,
  onView,
  onEdit,
  onDelete,
  // pagination
  page,
  totalPages,
  rangeEnd,
  filteredCount,
  onPageChange,
}) => {
  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: C.cream }}>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  borderBottom: `1px solid ${C.border}`,
                  borderRadius: '8px 0 0 0',
                }}
              >
                No
              </th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kelas</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Paket</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Durasi</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jenis</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jumlah Pertemuan/Bulan</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  borderBottom: `1px solid ${C.border}`,
                  borderRadius: '0 8px 0 0',
                }}
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                  Memuat data...
                </td>
              </tr>
            )}
            {!loading && pageItems.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                  {hasActiveFilter ? 'Tidak ada hasil' : 'Belum ada paket siswa'}
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((item, idx) => {
                const st = STATUS_META[item.status] || STATUS_META.Aktif;
                const displayNumber = rangeStart + idx;
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px', color: C.gray }}>{displayNumber}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>
                      <div>{item.siswa_nama}</div>
                      <div style={{ fontSize: '0.7rem', color: C.grayLight }}>{item.siswa_id_display}</div>
                    </td>
                    <td style={{ padding: '10px' }}>{item.kelas_siswa}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>
                      <div>{item.paket}</div>
                      {item.is_harga_custom && (
                        <span
                          title={item.catatan_harga_custom || 'Harga khusus'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginTop: '3px',
                            marginRight: '4px',
                            background: C.redBg,
                            color: C.red,
                            padding: '1px 8px',
                            borderRadius: '999px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          💰 Harga Khusus
                        </span>
                      )}
                      {item.pengajar && item.pengajar !== '-' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginTop: '3px',
                            background: getPengajarMeta(item.pengajar).bg,
                            color: getPengajarMeta(item.pengajar).fg,
                            padding: '1px 8px',
                            borderRadius: '999px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          {getPengajarMeta(item.pengajar).icon} {item.pengajar}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>{item.durasi}</td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          background: C.blueBg,
                          color: C.blue,
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      >
                        {item.jenis}
                        {item.jenis === 'Group' && item.jumlah_siswa_group ? ` (${item.jumlah_siswa_group} orang)` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {item.total_pertemuan}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          background: st.bg,
                          color: st.fg,
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          title="Lihat detail"
                          onClick={() => onView(item.id)}
                          style={iconBtnStyle(C.blueBg, C.blue)}
                        >
                          &#128065;
                        </button>
                        <button
                          title="Edit"
                          onClick={() => onEdit(item)}
                          style={iconBtnStyle(C.amberBg, C.amber)}
                        >
                          &#9998;
                        </button>
                        <button
                          title="Hapus"
                          onClick={() => onDelete(item.id)}
                          style={iconBtnStyle(C.redBg, C.red)}
                        >
                          &#128465;
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginTop: '1.1rem',
        }}
      >
        <span style={{ fontSize: '0.8rem', color: C.gray }}>
          Menampilkan {rangeStart}-{rangeEnd} dari {filteredCount} data
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              ...iconBtnStyle(C.cream, C.dark),
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            &#8249;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: p === page ? C.gold : C.cream,
                color: p === page ? C.white : C.dark,
                fontWeight: 600,
              }}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{
              ...iconBtnStyle(C.cream, C.dark),
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            &#8250;
          </button>
        </div>
      </div>
    </>
  );
};

export default PaketSiswaTable;