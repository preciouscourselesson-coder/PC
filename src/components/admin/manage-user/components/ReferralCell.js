// Sel kode referral: menampilkan kode + tombol salin/regenerate, atau tombol buat kode baru.
import React from 'react';
import { C } from '../constants';
import IconBtn from './IconBtn';
import { IconCopy, IconRefresh, IconTicket } from './icons';

const ReferralCell = ({ user, isBusy, onCopy, onGenerate }) => {
  if (!user.referral_code) {
    return (
      <IconBtn
        title="Buat kode referral"
        disabled={isBusy}
        color={C.gold} bg={C.goldBg} border={C.gold}
        onClick={onGenerate}
      >
        <IconTicket />
      </IconBtn>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 'bold',
        color: C.dark, background: C.cream, padding: '4px 8px', borderRadius: '6px',
        letterSpacing: '0.3px', whiteSpace: 'nowrap',
      }}>
        {user.referral_code}
      </span>
      <IconBtn
        title="Salin kode"
        color={C.gray} bg={C.white} border={C.border}
        onClick={onCopy}
      >
        <IconCopy />
      </IconBtn>
      <IconBtn
        title="Buat ulang kode"
        disabled={isBusy}
        color={C.gold} bg={C.white} border={C.border}
        onClick={onGenerate}
      >
        <IconRefresh />
      </IconBtn>
    </div>
  );
};

export default ReferralCell;
