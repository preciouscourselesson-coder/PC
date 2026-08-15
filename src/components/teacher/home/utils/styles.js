import { C } from '../constants';

export const getCardStyle = (isMobile) => ({
  background: C.white,
  borderRadius: '16px',
  border: `1.5px solid ${C.border}`,
  padding: isMobile ? '1rem' : '1.5rem',
});

export const linkBtn = {
  background: 'none',
  border: 'none',
  color: C.gold,
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const getModalOverlayStyle = (isMobile) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: isMobile ? 'flex-end' : 'center',
  justifyContent: 'center',
  zIndex: 60,
});

export const getModalContentStyle = (isMobile) => ({
  background: C.white,
  borderRadius: isMobile ? '16px 16px 0 0' : '16px',
  padding: isMobile ? '1.25rem' : '1.5rem',
  width: isMobile ? '100%' : '500px',
  maxWidth: isMobile ? '100%' : '90vw',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  maxHeight: '90vh',
  overflowY: 'auto',
});

export const getButtonBatal = (isMobile) => ({
  background: 'none',
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  padding: isMobile ? '12px 20px' : '8px 16px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: isMobile ? '16px' : '0.9rem',
});

export const getButtonKirim = (isMobile) => ({
  background: C.gold,
  color: C.white,
  border: 'none',
  borderRadius: '8px',
  padding: isMobile ? '12px 20px' : '8px 16px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: isMobile ? '16px' : '0.9rem',
});

export const getButtonSecondary = (isMobile) => ({
  background: C.cream,
  color: C.dark,
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  padding: isMobile ? '10px 16px' : '6px 14px',
  cursor: 'pointer',
  fontSize: isMobile ? '0.95rem' : '0.8rem',
  fontFamily: 'inherit',
});
