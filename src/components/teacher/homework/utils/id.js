/** Menghasilkan kode tugas acak 6 karakter, mis. "K3F9XA" */
export function generateShareCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

let idCounter = 1;
export const generateId = () => `q${idCounter++}_${Date.now().toString(36)}`;

let optionIdCounter = 1;
export const generateOptionId = () =>
  `opt${optionIdCounter++}_${Date.now().toString(36)}`;
