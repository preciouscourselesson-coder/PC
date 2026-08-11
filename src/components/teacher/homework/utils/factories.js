import { generateId, generateOptionId } from "./id";

export function createEmptyOption() {
  return { id: generateOptionId(), text: "" };
}

export function createEmptyQuestion() {
  return {
    id: generateId(),
    type: "isian", // "isian" (format [blank]), "pilihan_ganda", atau "speaking"
    questionText: "",
    imageUrl: null,
    audioUrl: null,
    blanks: [],
    options: [],
    correctOptionId: null,
    referenceAnswer: "", // catatan internal guru untuk soal speaking (opsional)
    points: 10,
  };
}

/** Membuat objek tugas baru berdasarkan keterangan yang diisi di modal "Tugas Baru" */
export function createEmptyHomework(overrides = {}) {
  return {
    id: null,
    title: "",
    subject: "",
    grade: "",
    description: "",
    dueDate: "", // sengaja kosong — diisi nanti saat tugas dibagikan ke siswa
    folderId: null,
    status: "draft",
    shareCode: null,
    questions: [createEmptyQuestion()],
    ...overrides,
  };
}
