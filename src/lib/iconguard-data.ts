export type Severity = "Ringan" | "Sedang" | "Berat";
export type Status = "Open" | "Pending Klarifikasi" | "Verifikasi" | "Closed" | "Overdue";

export type Violation = {
  id: string;
  mitra: string;
  petugas: string;
  jenis: string;
  severity: Severity;
  status: Status;
  lokasi: string;
  createdAt: string;
  deadline: string;
  poin: number;
  catatan: string;
};

export type Mitra = {
  nama: string;
  kontrak: string;
  pic: string;
  skor: number;
  pelanggaranAktif: number;
  totalPelanggaran: number;
};

export const violations: Violation[] = [
  {
    id: "VL-2026-0148",
    mitra: "PT Sinar Nusantara Teknik",
    petugas: "Ahmad Fauzi",
    jenis: "Tidak menggunakan APD lengkap",
    severity: "Berat",
    status: "Overdue",
    lokasi: "Jakarta Selatan — Gandaria",
    createdAt: "27 Sep 2026",
    deadline: "28 Sep 2026 · 09:00",
    poin: 15,
    catatan: "Petugas memanjat tiang tanpa full body harness pada pekerjaan penarikan kabel FO.",
  },
  {
    id: "VL-2026-0147",
    mitra: "CV Jaya Fiber Mandiri",
    petugas: "Rizky Pratama",
    jenis: "Keterlambatan pengiriman material",
    severity: "Sedang",
    status: "Pending Klarifikasi",
    lokasi: "Bekasi — Gudang Cikarang",
    createdAt: "28 Sep 2026",
    deadline: "1 Okt 2026 · 17:00",
    poin: 8,
    catatan: "Pengiriman ODP 8 core terlambat 4 hari dari jadwal kontrak.",
  },
  {
    id: "VL-2026-0146",
    mitra: "PT Andalan Prima Sarana",
    petugas: "Dewi Lestari",
    jenis: "Kelengkapan berkas BA tidak sesuai",
    severity: "Ringan",
    status: "Verifikasi",
    lokasi: "Bandung — Kantor Area",
    createdAt: "25 Sep 2026",
    deadline: "30 Sep 2026 · 12:00",
    poin: 3,
    catatan: "Berita Acara serah terima material belum ditandatangani pengawas lapangan.",
  },
  {
    id: "VL-2026-0145",
    mitra: "PT Sinar Nusantara Teknik",
    petugas: "Bagus Setiawan",
    jenis: "Material tidak sesuai spesifikasi",
    severity: "Berat",
    status: "Open",
    lokasi: "Tangerang — Alam Sutera",
    createdAt: "29 Sep 2026",
    deadline: "30 Sep 2026 · 08:00",
    poin: 15,
    catatan: "Drop core yang dipasang bukan tipe yang disetujui pada dokumen teknis.",
  },
  {
    id: "VL-2026-0144",
    mitra: "CV Terang Abadi",
    petugas: "Hendra Gunawan",
    jenis: "Area kerja tidak diberi rambu",
    severity: "Sedang",
    status: "Closed",
    lokasi: "Depok — Margonda",
    createdAt: "18 Sep 2026",
    deadline: "21 Sep 2026 · 16:00",
    poin: 8,
    catatan: "Galian kabel dibiarkan terbuka tanpa safety line. Sudah diperbaiki dan diverifikasi.",
  },
  {
    id: "VL-2026-0143",
    mitra: "PT Andalan Prima Sarana",
    petugas: "Siti Marlina",
    jenis: "Laporan harian tidak diunggah",
    severity: "Ringan",
    status: "Closed",
    lokasi: "Bandung — Buah Batu",
    createdAt: "15 Sep 2026",
    deadline: "20 Sep 2026 · 17:00",
    poin: 3,
    catatan: "Laporan progres mingguan terlambat diunggah ke portal.",
  },
];

export const mitraList: Mitra[] = [
  {
    nama: "CV Terang Abadi",
    kontrak: "KTR-2026-018",
    pic: "Yusuf Maulana",
    skor: 94,
    pelanggaranAktif: 0,
    totalPelanggaran: 3,
  },
  {
    nama: "PT Andalan Prima Sarana",
    kontrak: "KTR-2025-044",
    pic: "Dewi Lestari",
    skor: 81,
    pelanggaranAktif: 1,
    totalPelanggaran: 7,
  },
  {
    nama: "CV Jaya Fiber Mandiri",
    kontrak: "KTR-2026-007",
    pic: "Rina Oktaviani",
    skor: 72,
    pelanggaranAktif: 1,
    totalPelanggaran: 9,
  },
  {
    nama: "PT Sinar Nusantara Teknik",
    kontrak: "KTR-2025-031",
    pic: "Bambang Iskandar",
    skor: 58,
    pelanggaranAktif: 2,
    totalPelanggaran: 14,
  },
];

export const trenBulanan = [
  { bulan: "Apr", jumlah: 9 },
  { bulan: "Mei", jumlah: 14 },
  { bulan: "Jun", jumlah: 11 },
  { bulan: "Jul", jumlah: 18 },
  { bulan: "Agu", jumlah: 15 },
  { bulan: "Sep", jumlah: 21 },
];

export const jenisDominan = [
  { label: "Kelengkapan APD", jumlah: 34 },
  { label: "Keterlambatan material", jumlah: 26 },
  { label: "Kelengkapan berkas", jumlah: 19 },
  { label: "Material tidak sesuai spek", jumlah: 12 },
  { label: "Rambu & pengamanan kerja", jumlah: 9 },
];

export const jenisPelanggaran = [
  "Tidak menggunakan APD lengkap",
  "Keterlambatan pengiriman material",
  "Material tidak sesuai spesifikasi",
  "Kelengkapan berkas BA tidak sesuai",
  "Area kerja tidak diberi rambu",
  "Laporan harian tidak diunggah",
];

export const slaBySeverity: Record<Severity, string> = {
  Berat: "1 x 24 jam",
  Sedang: "3 x 24 jam",
  Ringan: "5 x 24 jam",
};

export const poinBySeverity: Record<Severity, number> = {
  Berat: 15,
  Sedang: 8,
  Ringan: 3,
};

export const auditTrail = [
  {
    waktu: "27 Sep 2026 · 09:12",
    aktor: "Admin Material & Jasa",
    aksi: "Laporan pelanggaran dibuat, deadline klarifikasi 1x24 jam.",
  },
  {
    waktu: "27 Sep 2026 · 09:13",
    aktor: "Sistem",
    aksi: "Notifikasi WhatsApp & Email terkirim ke PIC mitra dan petugas lapangan.",
  },
  {
    waktu: "27 Sep 2026 · 21:00",
    aktor: "Sistem",
    aksi: "Reminder T-12 jam dikirim ke PIC mitra.",
  },
  {
    waktu: "28 Sep 2026 · 09:05",
    aktor: "Sistem",
    aksi: "Status berubah menjadi Overdue. Eskalasi ke manajemen mitra & internal.",
  },
];

export function zoneOf(skor: number) {
  if (skor >= 85) return { label: "Zona Hijau", tone: "success" as const };
  if (skor >= 70) return { label: "Zona Kuning", tone: "warning" as const };
  return { label: "Zona Merah", tone: "critical" as const };
}

export function statusTone(status: Status) {
  switch (status) {
    case "Closed":
      return "success" as const;
    case "Overdue":
      return "critical" as const;
    case "Open":
      return "critical" as const;
    default:
      return "warning" as const;
  }
}

export function severityTone(severity: Severity) {
  if (severity === "Berat") return "critical" as const;
  if (severity === "Sedang") return "warning" as const;
  return "info" as const;
}
