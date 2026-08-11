/** Mengekstrak jawaban dari teks berformat [kata_kunci] */
export function extractBlanks(text) {
  const matches = [...text.matchAll(/\[(.+?)\]/g)];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}
