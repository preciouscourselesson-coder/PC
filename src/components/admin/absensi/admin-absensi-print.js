// src/components/admin/adminAbsensi/admin-absensi-print.js
import { formatTanggalIndo, bulanFromIso } from './admin-absensi-helpers';

// Membangun HTML lengkap (termasuk <style>) untuk halaman cetak PDF.
// Dipisah dari `downloadRekapPdf` supaya string HTML-nya sendiri bisa
// dites (assertion sederhana) tanpa perlu window.open beneran.
export function buildRekapPrintHtml({ logo, siswaName, rekapBulan, groupedByGuru, totalAll }) {
  const styles = `
    body { font-family: 'Times New Roman', Times, serif; margin: 40px; color: #171411; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #b4964b; padding-bottom: 15px; }
    .logo { max-height: 60px; }
    .title { font-size: 24px; font-weight: bold; color: #b4964b; margin: 10px 0 0; }
    .subtitle { font-size: 16px; color: #726d66; margin: 4px 0 0; }
    .info { margin: 15px 0 20px; font-size: 14px; }
    .info span { font-weight: bold; }
    .guru-section { margin-bottom: 30px; }
    .guru-header { font-size: 18px; font-weight: bold; color: #2d6a4f; margin-bottom: 10px; border-bottom: 1px solid #b4964b; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 5px; }
    th { background: #f7f6f0; padding: 8px 8px; border: 1px solid #e6e2d8; text-align: left; }
    td { padding: 6px 8px; border: 1px solid #e6e2d8; vertical-align: top; }
    .status { padding: 2px 10px; border-radius: 12px; font-weight: 600; font-size: 11px; display: inline-block; }
    .status-disetujui { background: #e4efe9; color: #2d6a4f; }
    .status-ditolak { background: #fbeceb; color: #b0413e; }
    .status-menunggu { background: #fdf6ec; color: #a3760f; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #a8a29a; border-top: 1px solid #e6e2d8; padding-top: 15px; }
    .total-row { background: #f7f6f0; font-weight: bold; }
    .sub-total { font-weight: bold; margin-top: 8px; text-align: right; }
  `;

  let guruTablesHtml = '';
  groupedByGuru.forEach((group) => {
    const items = group.items;
    guruTablesHtml += `
      <div class="guru-section">
        <div class="guru-header">👨‍🏫 ${group.guru_name}</div>
        <table>
          <thead>
            <tr><th>No.</th><th>Tanggal</th><th>Materi</th><th>Catatan</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${items
              .map((item, idx) => {
                const statusClass = `status-${item.status.toLowerCase()}`;
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${formatTanggalIndo(item.tanggal)}</td>
                    <td>${item.judul_materi}</td>
                    <td>${item.catatan || '-'}</td>
                    <td><span class="status ${statusClass}">${item.status}</span></td>
                  </tr>
                `;
              })
              .join('')}
            <tr class="total-row">
              <td colspan="5" style="text-align:right;">Total dengan ${group.guru_name}: ${items.length} pertemuan</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Rekap ${siswaName} ${rekapBulan}</title><style>${styles}</style></head>
    <body>
      <div class="header">
        <img src="${logo}" alt="Precious Course" class="logo" />
        <div class="title">LAPORAN REKAP PERTEMUAN</div>
        <div class="subtitle">Precious Course — Monitoring Belajar Siswa</div>
      </div>
      <div class="info">
        <div><span>Nama Siswa:</span> ${siswaName}</div>
        <div><span>Periode:</span> ${bulanFromIso(rekapBulan + '-01')}</div>
        <div><span>Total Pertemuan:</span> ${totalAll} sesi</div>
      </div>
      ${guruTablesHtml}
      <div class="footer">
        Laporan ini dibuat secara otomatis oleh sistem Precious Course.<br />
        ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </body>
    </html>
  `;
}

// Efek samping (window.open, document.write, print) dipisah dari pembangunan
// HTML murni di atas supaya bagian logic-nya tetap testable.
export function downloadRekapPdf({ logo, siswaName, rekapBulan, groupedByGuru, rekapDataLength, onPopupBlocked }) {
  const printContent = document.getElementById('rekap-print');
  if (!printContent) return;

  const originalTitle = document.title;
  document.title = `Rekap ${siswaName} ${rekapBulan}`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    onPopupBlocked?.();
    document.title = originalTitle;
    return;
  }

  const htmlContent = buildRekapPrintHtml({
    logo,
    siswaName,
    rekapBulan,
    groupedByGuru,
    totalAll: rekapDataLength,
  });

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  document.title = originalTitle;
}
