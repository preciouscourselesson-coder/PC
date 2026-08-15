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
  padding: '6px 2px',
  fontFamily: 'inherit',
};

export const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
};

export const getModalContentStyle = (isMobile) => ({
  background: C.white,
  borderRadius: '16px',
  padding: isMobile ? '1rem' : '1.5rem',
  width: '500px',
  maxWidth: '92vw',
  maxHeight: '88vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  boxSizing: 'border-box',
});

export const buttonBatal = {
  background: 'none',
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  padding: '8px 16px',
  cursor: 'pointer',
};

export const buttonKirim = {
  background: C.gold,
  color: C.white,
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  cursor: 'pointer',
};

export const getInputStyle = (isMobile, overrides = {}) => ({
  width: '100%',
  padding: '8px',
  borderRadius: '8px',
  border: `1px solid ${C.border}`,
  boxSizing: 'border-box',
  fontSize: isMobile ? '16px' : '1rem',
  ...overrides,
});
