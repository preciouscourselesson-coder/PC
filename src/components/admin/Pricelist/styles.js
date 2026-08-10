import { C, D } from './constants';

export const inputStyle = (hasError) => ({
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: `1.5px solid ${hasError ? C.red : C.border}`,
  fontSize: '0.85rem',
  color: C.dark,
  fontFamily: 'inherit',
  background: C.white,
  outline: 'none',
  boxSizing: 'border-box',
});

export const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: C.gray,
  marginBottom: '6px',
};

export const darkInputStyle = (hasError) => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: '9px',
  border: `1.5px solid ${hasError ? D.danger : D.fieldBorder}`,
  fontSize: '0.88rem',
  color: D.text,
  fontFamily: 'inherit',
  background: D.field,
  outline: 'none',
  boxSizing: 'border-box',
});

export const darkLabelStyle = {
  display: 'block',
  fontSize: '0.76rem',
  fontWeight: 600,
  color: D.textMuted,
  marginBottom: '6px',
};

export const iconBtnStyle = (bg, fg) => ({
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  border: 'none',
  background: bg,
  color: fg,
  fontSize: '0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});
