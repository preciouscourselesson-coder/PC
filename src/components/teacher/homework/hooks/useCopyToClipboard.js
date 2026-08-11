import { useState } from "react";

/** Menyalin teks ke clipboard dan menandai field mana yang baru tersalin selama ~1.8 detik */
export function useCopyToClipboard() {
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch (err) {
      console.error("Gagal menyalin:", err);
    }
  };

  return { copiedField, handleCopy };
}
