export type Severity = "Ringan" | "Sedang" | "Berat";
export type Status = "Open" | "Pending Klarifikasi" | "Verifikasi" | "Closed" | "Overdue";

export const sbuOptions = [
  { code: "01SBU", label: "SUMATERA BAGIAN UTARA" },
  { code: "02SBT", label: "SUMATERA BAGIAN TENGAH" },
  { code: "03SBS", label: "SUMATERA BAGIAN SELATAN" },
  { code: "04JKT", label: "JAKARTA & BANTEN" },
  { code: "05JBB", label: "JAWA BAGIAN BARAT" },
  { code: "06JTG", label: "JAWA BAGIAN TENGAH" },
  { code: "07JBT", label: "JAWA BAGIAN TIMUR" },
  { code: "08BNT", label: "BALI NUSA TENGGARA" },
  { code: "09KAL", label: "KALIMANTAN" },
  { code: "10SIBT", label: "SULAWESI INDONESIA BAGIAN TIMUR" },
] as const;

export type MitraPartner = {
  nama: string;
  petugas: readonly string[];
};

export const sbuMitraMapping: Record<string, readonly MitraPartner[]> = {
  "01SBU": [
    {
      nama: "PT Indonesia Teknik",
      petugas: ["Andi", "Budi Santoso", "Fajar Pratama"],
    },
    {
      nama: "CV Karya Mandiri Utara",
      petugas: ["Rian Hidayat", "Surya Darma"],
    },
  ],
  "02SBT": [
    {
      nama: "PT Riau Sinergi Telekomunikasi",
      petugas: ["Doni Saputra", "Ilham Ramadhan"],
    },
    {
      nama: "CV Sentosa Jaya Tehnik",
      petugas: ["Dedi Kurniawan", "Hendra Wijaya"],
    },
  ],
  "03SBS": [
    {
      nama: "PT Abadi Teknik",
      petugas: ["Agus Setiawan", "Tri Wahyudi", "M. Rizky"],
    },
    {
      nama: "CV Sriwijaya Fiber Optik",
      petugas: ["Bambang Hermanto", "Eko Prasetyo"],
    },
  ],
  "04JKT": [
    {
      nama: "PT Sinar Nusantara Teknik",
      petugas: ["Ahmad Fauzi", "Bagus Setiawan"],
    },
    {
      nama: "CV Metro Telematika",
      petugas: ["Farhan Ramadhan", "Bayu Nugroho"],
    },
  ],
  "05JBB": [
    {
      nama: "PT Andalan Prima Sarana",
      petugas: ["Dewi Lestari", "Siti Marlina"],
    },
    {
      nama: "CV Terang Abadi",
      petugas: ["Hendra Gunawan", "Yusuf Maulana"],
    },
    {
      nama: "CV Pasundan Mandiri Teknik",
      petugas: ["Asep Sunandar", "Cecep Mulyana"],
    },
  ],
  "06JTG": [
    {
      nama: "PT Citra Lintas Data",
      petugas: ["Joko Susilo", "Danang Prasetya"],
    },
    {
      nama: "CV Berkah Solusindo",
      petugas: ["Hadi Pranoto", "Yudi Prabowo"],
    },
  ],
  "07JBT": [
    {
      nama: "PT Delta Sarana Fiber",
      petugas: ["Dimas Anggara", "Wahyu Utomo"],
    },
    {
      nama: "CV Jaya Fiber Mandiri",
      petugas: ["Rizky Pratama", "Rina Oktaviani"],
    },
    {
      nama: "CV Brawijaya Cipta Mandiri",
      petugas: ["Lukman Hakim", "Faris Akbar"],
    },
  ],
  "08BNT": [
    {
      nama: "PT Dewata Jaring Nusantara",
      petugas: ["I Made Suardana", "Wayan Arianto"],
    },
    {
      nama: "CV Sasak Prima Solusi",
      petugas: ["Gede Pratama", "Nyoman Wirawan"],
    },
  ],
  "09KAL": [
    {
      nama: "PT Borneo Telekom Mandiri",
      petugas: ["Rizal Effendi", "Syahril Ramli"],
    },
    {
      nama: "CV Mahakam Mega Cipta",
      petugas: ["Aris Munandar", "Zulkipli"],
    },
  ],
  "10SIBT": [
    {
      nama: "PT Celebes Jaringan Solusindo",
      petugas: ["Muh. Fadli", "Hasan Basri"],
    },
    {
      nama: "CV Cendrawasih Fiber Papua",
      petugas: ["Yohanes Wally", "Markus Tabuni"],
    },
  ],
};

export const mitraOptionsBySbu: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(sbuMitraMapping).map(([sbu, list]) => [sbu, list.map((item) => item.nama)]),
);

export const petugasOptionsByMitra: Record<string, readonly string[]> = Object.fromEntries(
  Object.values(sbuMitraMapping).flatMap((list) => list.map((item) => [item.nama, item.petugas])),
);

export function getPetugasBySbuAndMitra(sbuCode: string, mitraName: string): readonly string[] {
  const partners = sbuMitraMapping[sbuCode];
  if (!partners) return [];
  const partner = partners.find((p) => p.nama === mitraName);
  return partner ? partner.petugas : [];
}

export type Violation = {
  id: string;
  idPa: string;
  mitra: string;
  petugas: string;
  petugasQc?: string | undefined;
  petugasMonitoringPusat?: string | undefined;
  sbu?: string | undefined;
  tanggalCek?: string | undefined;
  tanggalAktivasi?: string | undefined;
  tanggalPermohonan?: string | undefined;
  kp?: string | undefined;
  idFat?: string | undefined;
  dwGudang?: string | undefined;
  lokasiFatPelanggan?: string | undefined;
  jenis: string;
  severity: Severity;
  status: Status;
  lokasi: string;
  createdAt: string;
  deadline: string;
  poin: number;
  catatan: string;
  bukti?: string[];
  checklistResults?: Record<string, string>;
  /** Status kolom "QC K3" dari Excel (OK/NOK), dipakai untuk pivot table */
  qcK3?: string;
  /** Status kolom "QC INSTALASI" dari Excel (OK/NOK), dipakai untuk pivot table */
  qcInstalasi?: string;
};

export function fixedSeverityForViolation(jenis: string): Severity | null {
  const normalizedJenis = jenis.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalizedJenis.startsWith("k3awal") || normalizedJenis.startsWith("k3akhir")) {
    return "Berat";
  }
  if (normalizedJenis === "fotabersamapelanggan") return "Ringan";
  if (normalizedJenis.includes("sclamp") && normalizedJenis.includes("hookclam")) {
    return "Berat";
  }
  return null;
}

export type Mitra = {
  nama: string;
  kontrak: string;
  pic: string;
  skor: number;
  pelanggaranAktif: number;
  totalPelanggaran: number;
};

export const jenisPelanggaran = [
  "K3 Awal - First",
  "K3 Awal - Helm",
  "K3 Awal - Sarung Tangan",
  "K3 Awal - Rompi",
  "K3 Awal - Body Harness",
  "K3 Awal - Lengan Panjang",
  "K3 Awal - Sepatu",
  "ID FAT",
  "Kerapian Instalasi Tiang Listrik",
  "OPM FAT -25 dB",
  "Stiker ONT",
  "SN ONT",
  "OPM ONT -26 dB",
  "Instalasi S-Clamp dan Hookclam di Rumah",
  "Speedtest",
  "Foto Bersama Pelanggan",
  "Foto Depan Rumah Pelanggan",
  "Aplikasi My Icon",
  "K3 Akhir - First",
  "K3 Akhir - Helm",
  "K3 Akhir - Sarung Tangan",
  "K3 Akhir - Rompi",
  "K3 Akhir - Body Harness",
  "K3 Akhir - Lengan Panjang",
  "K3 Akhir - Sepatu",
  "BAA",
] as const;

const demoMitra = [
  "PT Indonesia Teknik",
  "PT Abadi Teknik",
  "CV Terang Abadi",
  "PT Andalan Prima Sarana",
  "CV Jaya Fiber Mandiri",
  "PT Sinar Nusantara Teknik",
];
const demoPetugas = [
  "Andi",
  "Agus Setiawan",
  "Ahmad Fauzi",
  "Rizky Pratama",
  "Dewi Lestari",
  "Bagus Setiawan",
  "Hendra Gunawan",
  "Siti Marlina",
];
const demoSeverities = ["Berat", "Sedang", "Ringan"] as const;
const demoStatuses = ["Open", "Pending Klarifikasi", "Verifikasi", "Overdue", "Closed"] as const;

export const violations: Violation[] = [];

export const mitraList: Mitra[] = [];

export const trenBulanan = [
  { bulan: "Jan", jumlah: 92 },
  { bulan: "Feb", jumlah: 84 },
  { bulan: "Mar", jumlah: 54 },
  { bulan: "Apr", jumlah: 28 },
  { bulan: "Mei", jumlah: 25 },
  { bulan: "Jun", jumlah: 13 },
  { bulan: "Jul", jumlah: 24 },
  { bulan: "Agu", jumlah: 20 },
  { bulan: "Sep", jumlah: 26 },
  { bulan: "Okt", jumlah: 14 },
];

export const jenisDominan = [
  { label: "K3 Awal - Rompi", jumlah: 98 },
  { label: "K3 Awal - Helm", jumlah: 76 },
  { label: "Instalasi S-Clamp dan Hookclam di Rumah", jumlah: 54 },
  { label: "K3 Awal - Lengan Panjang", jumlah: 49 },
  { label: "OPM FAT -25 dB", jumlah: 22 },
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
    aktor: "Super Admin Material & Jasa",
    aksi: "Laporan pelanggaran dibuat, deadline klarifikasi 1x24 jam.",
  },
  {
    waktu: "27 Sep 2026 · 09:13",
    aktor: "Sistem",
    aksi: "Notifikasi WhatsApp & Email terkirim ke PIC mitra dan petugas mitra.",
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
  if (skor >= 85) return { label: "Zona Merah", tone: "critical" as const };
  if (skor >= 70) return { label: "Zona Kuning", tone: "warning" as const };
  return { label: "Zona Hijau", tone: "success" as const };
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

export function addViolationRecord(data: {
  idPa: string;
  sbu: string;
  mitra: string;
  petugas: string;
  jenis: string;
  severity: Severity;
  catatan: string;
  bukti?: string[];
}): Violation {
  const existing = violations.find(
    (v) =>
      v.idPa === data.idPa &&
      v.jenis === data.jenis &&
      v.mitra === data.mitra &&
      v.petugas === data.petugas,
  );
  if (existing) {
    if (data.bukti && data.bukti.length > 0) {
      existing.bukti = [...(existing.bukti ?? []), ...data.bukti];
      saveCustomViolationToStorage(existing);
    }
    return existing;
  }

  const nextNumber = violations.length + 149;
  const newId = `VL-2026-${String(nextNumber).padStart(4, "0")}`;

  const sbuObj = sbuOptions.find((s) => s.code === data.sbu);
  const lokasi = sbuObj ? sbuObj.label : data.sbu;

  const now = new Date();
  const daysToAdd = data.severity === "Berat" ? 1 : data.severity === "Sedang" ? 3 : 5;
  const deadlineDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const createdAt = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const deadline = `${deadlineDate.getDate()} ${months[deadlineDate.getMonth()]} ${deadlineDate.getFullYear()} · 17:00`;
  const poin = poinBySeverity[data.severity] ?? 15;

  const newViolation: Violation = {
    id: newId,
    idPa: data.idPa,
    mitra: data.mitra,
    petugas: data.petugas,
    jenis: data.jenis,
    severity: data.severity,
    status: "Open",
    lokasi,
    createdAt,
    deadline,
    poin,
    catatan: data.catatan || `Checklist ${data.jenis} belum terpenuhi.`,
    bukti: data.bukti ?? [],
  };

  violations.unshift(newViolation);
  saveCustomViolationToStorage(newViolation);

  const existingMitra = mitraList.find(
    (m) => m.nama.trim().toLowerCase() === data.mitra.trim().toLowerCase(),
  );
  if (existingMitra) {
    existingMitra.totalPelanggaran += 1;
    existingMitra.pelanggaranAktif += 1;
    existingMitra.skor = Math.max(0, existingMitra.skor - poin);
  } else {
    mitraList.unshift({
      nama: data.mitra,
      kontrak: `KTR-2026-${String(mitraList.length + 1).padStart(3, "0")}`,
      pic: data.petugas,
      skor: Math.max(0, 95 - poin),
      pelanggaranAktif: 1,
      totalPelanggaran: 1,
    });
  }

  return newViolation;
}

export function setServerViolationsAndMitra(
  newViolationsList: Violation[],
  newMitraList?: Mitra[],
  replaceAll = true,
): void {
  if (replaceAll) {
    violations.length = 0;
    violations.push(...newViolationsList);
    if (newMitraList && newMitraList.length > 0) {
      mitraList.length = 0;
      mitraList.push(...newMitraList);
    }
  } else {
    violations.unshift(...newViolationsList);
  }
}

export function syncViolationRecord(violation: Violation): void {
  const index = violations.findIndex((item) => item.id === violation.id);
  if (index >= 0) {
    violations[index] = violation;
  } else {
    violations.unshift(violation);
  }
  saveCustomViolationToStorage(violation);
}

const DELETED_VIOLATIONS_KEY = "iconguard_deleted_violations";

export function getDeletedViolationIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_VIOLATIONS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function removeViolationRecord(id: string): boolean {
  const index = violations.findIndex((item) => item.id === id);
  const [removed] = index >= 0 ? violations.splice(index, 1) : [];
  if (removed) {
    const partner = mitraList.find(
      (item) => item.nama.trim().toLowerCase() === removed.mitra.trim().toLowerCase(),
    );
    if (partner) {
      partner.totalPelanggaran = Math.max(0, partner.totalPelanggaran - 1);
      if (removed.status !== "Closed") {
        partner.pelanggaranAktif = Math.max(0, partner.pelanggaranAktif - 1);
      }
      partner.skor = Math.min(100, partner.skor + removed.poin);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CUSTOM_VIOLATIONS_KEY);
      const custom: Violation[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(
        CUSTOM_VIOLATIONS_KEY,
        JSON.stringify(custom.filter((item) => item.id !== id)),
      );
      localStorage.setItem(
        DELETED_VIOLATIONS_KEY,
        JSON.stringify([...new Set([...getDeletedViolationIds(), id])]),
      );
    } catch {
      // The in-memory deletion still applies for the current session.
    }
  }
  return Boolean(removed);
}

export function updateViolationEvidence(id: string, buktiList: string[]): boolean {
  const target = violations.find((v) => v.id === id);
  if (target) {
    target.bukti = [...(target.bukti ?? []), ...buktiList];
    saveCustomViolationToStorage(target);
    return true;
  }
  return false;
}

function createDemoSvgDataUri(title: string, subtitle: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#1e293b"/>
    <rect x="20" y="20" width="360" height="360" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <circle cx="200" cy="160" r="48" fill="${color}" opacity="0.2"/>
    <path d="M176 160h48M200 136v48" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
    <rect x="50" y="240" width="300" height="32" rx="6" fill="#1e293b"/>
    <text x="200" y="262" font-family="sans-serif" font-size="14" font-weight="bold" fill="#f8fafc" text-anchor="middle">${title}</text>
    <text x="200" y="300" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">${subtitle}</text>
    <rect x="40" y="40" width="80" height="24" rx="4" fill="#dc2626"/>
    <text x="80" y="56" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">TEMUAN</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getEvidencePhotos(v?: Violation): string[] {
  if (!v) return [];
  if (v.bukti && v.bukti.length > 0) {
    return v.bukti;
  }
  return [
    createDemoSvgDataUri("Dokumentasi Temuan QC", `${v.jenis}`, "#ef4444"),
    createDemoSvgDataUri("Detail Temuan Teknis", `${v.mitra}`, "#f59e0b"),
    createDemoSvgDataUri("Dokumentasi QC SBU", `ID PA: ${v.idPa || v.id}`, "#3b82f6"),
  ];
}

export const CUSTOM_VIOLATIONS_KEY = "iconguard_custom_violations";
export const CUSTOM_MITRA_KEY = "iconguard_custom_mitra";

export function getCustomViolationsFromStorage(): Violation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_VIOLATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Violation[];
    // Hapus data dummy lama yang memiliki jenis "Pemeriksaan Lapangan"
    const cleaned = list.filter((v) => v.jenis !== "Pemeriksaan Lapangan");
    if (cleaned.length !== list.length) {
      localStorage.setItem(CUSTOM_VIOLATIONS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function clearAllCustomDataFromStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CUSTOM_VIOLATIONS_KEY);
    localStorage.removeItem(CUSTOM_MITRA_KEY);
    localStorage.removeItem("iconguard_override_all");
  } catch {
    // ignore
  }
}

export function saveMitraListToStorage(list: Mitra[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_MITRA_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getCustomMitraListFromStorage(): Mitra[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_MITRA_KEY);
    return raw ? (JSON.parse(raw) as Mitra[]) : [];
  } catch {
    return [];
  }
}

function saveCustomViolationToStorage(item: Violation) {
  if (typeof window === "undefined") return;
  try {
    const list = getCustomViolationsFromStorage();
    const idx = list.findIndex((v) => v.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem(CUSTOM_VIOLATIONS_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

export function restoreCustomViolationsFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const list = getCustomViolationsFromStorage();
    const deletedIds = new Set(getDeletedViolationIds());
    for (const item of [...list].reverse()) {
      if (deletedIds.has(item.id)) continue;
      const existing = violations.find((v) => v.id === item.id || (v.idPa === item.idPa && v.jenis === item.jenis));
      if (!existing) {
        violations.unshift(item);
      } else if (item.bukti && item.bukti.length > 0) {
        existing.bukti = item.bukti;
      }
    }

    const savedMitra = getCustomMitraListFromStorage();
    if (savedMitra.length > 0) {
      for (const m of savedMitra) {
        const idx = mitraList.findIndex((item) => item.nama.toLowerCase() === m.nama.toLowerCase());
        if (idx >= 0) {
          mitraList[idx] = m;
        } else {
          mitraList.unshift(m);
        }
      }
    }
  } catch {
    // ignore storage errors
  }
}

if (typeof window !== "undefined") {
  restoreCustomViolationsFromStorage();
}
