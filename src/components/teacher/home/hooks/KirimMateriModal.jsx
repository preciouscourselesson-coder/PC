import React from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from '../constants';
import { getModalOverlayStyle, getModalContentStyle, getButtonBatal } from '../utils/styles';

export const KirimMateriModal = ({ show, isMobile, materiRequestList, materiRequestHook, onClose }) => {
  const navigate = useNavigate();
  if (!show) return null;

  const { selectedRequestId } = materiRequestHook;
  const buttonBatal = getButtonBatal(isMobile);

  const request = materiRequestList?.find((r) => r.id === selectedRequestId);

  const handleGoToArsip = () => {
    navigate('/guru/arsip-materi', {
      state: {
        filterKategori: 'Bersama',
        openUpload: true,
        prefill: {
          judul: request?.judul_materi || '',
          kelas: request?.kelas || '',
          deskripsi: request?.deskripsi ? `Menjawab request siswa: ${request.deskripsi}` : '',
        },
      },
    });
    onClose();
  };

  return (
    <div style={getModalOverlayStyle(isMobile)}>
      <div style={getModalContentStyle(isMobile)}>
        <h3 style={{ margin: '0 0 0.75rem 0', color: C.dark, fontSize: isMobile ? '1.2rem' : '1.17rem' }}>Kirim Materi</h3>

        <p style={{ fontSize: '0.85rem', color: C.gray, margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
          {request?.siswa_nama ? `${request.siswa_nama} meminta` : 'Siswa meminta'} materi
          {request?.judul_materi ? <> <strong style={{ color: C.dark }}>"{request.judul_materi}"</strong></> : ''}.
          Unggah materinya di Arsip Materi, lalu tandai permintaan ini selesai setelah selesai diunggah.
        </p>

        <button
          type="button"
          onClick={handleGoToArsip}
          style={{
            width: '100%',
            padding: isMobile ? '12px' : '10px',
            borderRadius: '9px',
            border: 'none',
            background: C.gold,
            color: C.white,
            fontWeight: 700,
            fontSize: isMobile ? '0.95rem' : '0.88rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Buka Arsip Materi →
        </button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button onClick={onClose} style={buttonBatal}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};