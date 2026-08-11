export const SUBJECT_OPTIONS = [
  "Matematika",
  "Fisika",
  "Kimia",
  "Bahasa Inggris",
  "Bahasa Mandarin",
];

// Tingkat kelas dikelompokkan per jenjang: SD (Kelas I-VI), SMP (Kelas
// VII-IX), SMA (Kelas X-XII), dan Universitas (Semester 1-8). Dirender
// sebagai <optgroup> di dropdown "Tingkat Kelas" supaya tetap satu field
// tapi terlihat rapi per jenjang.
export const GRADE_GROUPS = [
  {
    label: "SD",
    options: ["Kelas I", "Kelas II", "Kelas III", "Kelas IV", "Kelas V", "Kelas VI"],
  },
  {
    label: "SMP",
    options: ["Kelas VII", "Kelas VIII", "Kelas IX"],
  },
  {
    label: "SMA",
    options: ["Kelas X", "Kelas XI", "Kelas XII"],
  },
  {
    label: "Universitas",
    options: [
      "Semester 1",
      "Semester 2",
      "Semester 3",
      "Semester 4",
      "Semester 5",
      "Semester 6",
      "Semester 7",
      "Semester 8",
    ],
  },
];
