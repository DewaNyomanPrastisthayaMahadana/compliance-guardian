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
  /** Metadata klarifikasi yang diajukan oleh mitra/petugas */
  clarificationSubmittedAt?: string;
  clarificationSubmittedBy?: string;
  clarificationRole?: string;
  clarificationOrganization?: string;
  clarificationNote?: string;
  clarificationBakFile?: string;
  clarificationEvidenceFile?: string;
  clarificationReviewedAt?: string;
  clarificationReviewedBy?: string;
  clarificationReviewNote?: string;
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
  sbu?: string | undefined;
  sbuCode?: string | undefined;
  sbuLabel?: string | undefined;
};

export const sbuRegionalConfig: Record<string, { label: string; short?: string }> = {
  "01SBU": { label: "SUMATERA BAGIAN UTARA", short: "SBU" },
  "02SBT": { label: "SUMATERA BAGIAN TENGAH", short: "SBT" },
  "03SBS": { label: "SUMATERA BAGIAN SELATAN", short: "SBS" },
  "04JKT": { label: "JAKARTA & BANTEN", short: "JKT" },
  "05JBB": { label: "JAWA BAGIAN BARAT", short: "JBB" },
  "06JTG": { label: "JAWA BAGIAN TENGAH", short: "JTG" },
  "07JBT": { label: "JAWA BAGIAN TIMUR", short: "JBT" },
  "08BNT": { label: "BALI NUSA TENGGARA", short: "BNT" },
  "09KAL": { label: "KALIMANTAN", short: "KAL" },
  "10SIBT": { label: "SULAWESI INDONESIA BAGIAN TIMUR", short: "SIBT" },
};

export function getSbuInfo(
  input?: string | Violation | { sbu?: string; lokasi?: string; mitra?: string }
): { code: string; label: string; full: string } {
  let raw = "";
  if (!input) return { code: "—", label: "—", full: "—" };
  if (typeof input === "string") {
    raw = input.trim().toUpperCase();
  } else {
    raw = (input.sbu || input.lokasi || "").trim().toUpperCase();
  }

  // Fallback via mitra mapping if raw is empty
  if (!raw || raw === "—" || raw === "LAINNYA") {
    if (typeof input !== "string" && input?.mitra) {
      const mName = input.mitra.trim().toLowerCase();
      for (const [code, partners] of Object.entries(sbuMitraMapping)) {
        if (partners.some((p) => p.nama.trim().toLowerCase() === mName)) {
          const opt = sbuOptions.find((s) => s.code === code);
          const label = opt?.label || code;
          return {
            code,
            label,
            full: `${code} — ${label}`,
          };
        }
      }
    }
    return { code: "—", label: "—", full: "—" };
  }

  for (const sbu of sbuOptions) {
    if (raw.includes(sbu.code) || raw.includes(sbu.label)) {
      return { code: sbu.code, label: sbu.label, full: `${sbu.code} — ${sbu.label}` };
    }
  }

  for (const [key, conf] of Object.entries(sbuRegionalConfig)) {
    if (raw.includes(key) || raw.startsWith(key) || (conf.label && raw.includes(conf.label.toUpperCase()))) {
      const label = conf.label || conf.short || key;
      return { code: key, label, full: `${key} — ${label}` };
    }
  }

  const match = raw.match(/^(\d{2}[A-Z]+)/);
  if (match && match[1]) {
    const opt = sbuOptions.find((s) => s.code === match[1]);
    if (opt) {
      return { code: opt.code, label: opt.label, full: `${opt.code} — ${opt.label}` };
    }
    return { code: match[1], label: match[1], full: match[1] };
  }

  return { code: raw, label: raw, full: raw };
}

export const jenisPelanggaran = [
  "K3 Awal - Helm",
  "K3 Awal - Sarung Tangan",
  "K3 Awal - Rompi",
  "K3 Awal - Body Harness",
  "Penampilan Awal - Lengan Panjang",
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
  "K3 Akhir - Helm",
  "K3 Akhir - Sarung Tangan",
  "K3 Akhir - Rompi",
  "K3 Akhir - Body Harness",
  "Penampilan Akhir - Lengan Panjang",
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
  { label: "Penampilan Awal - Lengan Panjang", jumlah: 49 },
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
  tanggalCek?: string | undefined;
  tanggalAktivasi?: string | undefined;
  tanggalPermohonan?: string | undefined;
  petugasQc?: string | undefined;
  petugasMonitoringPusat?: string | undefined;
  kp?: string | undefined;
  idFat?: string | undefined;
  checklistResults?: Record<string, string> | undefined;
  qcK3?: string | undefined;
  qcInstalasi?: string | undefined;
  poin?: number | undefined;
  status?: Status | undefined;
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
  const createdAt = data.tanggalCek || `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const deadline = `${deadlineDate.getDate()} ${months[deadlineDate.getMonth()]} ${deadlineDate.getFullYear()} · 17:00`;
  const poin = data.poin !== undefined ? data.poin : (poinBySeverity[data.severity] ?? 15);

  const newViolation: Violation = {
    id: newId,
    idPa: data.idPa,
    sbu: data.sbu,
    mitra: data.mitra,
    petugas: data.petugas,
    petugasQc: data.petugasQc || undefined,
    petugasMonitoringPusat: data.petugasMonitoringPusat || undefined,
    tanggalCek: data.tanggalCek || undefined,
    tanggalAktivasi: data.tanggalAktivasi || undefined,
    tanggalPermohonan: data.tanggalPermohonan || undefined,
    kp: data.kp || undefined,
    idFat: data.idFat || undefined,
    jenis: data.jenis,
    severity: data.severity,
    status: data.status || "Open",
    lokasi,
    createdAt,
    deadline,
    poin,
    catatan: data.catatan || `Checklist ${data.jenis} belum terpenuhi.`,
    bukti: data.bukti ?? [],
    checklistResults: data.checklistResults || undefined,
    qcK3: data.qcK3 || undefined,
    qcInstalasi: data.qcInstalasi || undefined,
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
  const filteredViolations = newViolationsList.filter(isRealViolation);
  if (replaceAll) {
    violations.length = 0;
    violations.push(...filteredViolations);
    if (newMitraList && newMitraList.length > 0) {
      mitraList.length = 0;
      mitraList.push(...newMitraList);
    }
  } else {
    violations.unshift(...filteredViolations);
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
      localStorage.setItem(
        DELETED_VIOLATIONS_KEY,
        JSON.stringify([...new Set([...getDeletedViolationIds(), id])]),
      );
      const raw = localStorage.getItem(CUSTOM_VIOLATIONS_KEY);
      if (raw) {
        const custom: Violation[] = JSON.parse(raw);
        localStorage.setItem(
          CUSTOM_VIOLATIONS_KEY,
          JSON.stringify(custom.filter((item) => item.id !== id)),
        );
      }
    } catch {
      // The in-memory deletion still applies for the current session.
    }
    void saveCustomDataToIndexedDB([...violations], [...mitraList]);
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
const IDB_DATA_NAME = "iconguard-excel-store";
const IDB_STORE_NAME = "datasets";

function openExcelDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DATA_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE_NAME)) {
        req.result.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomDataToIndexedDB(
  newViolations: Violation[],
  newMitra: Mitra[],
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openExcelDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(newViolations.filter(isRealViolation), "violations");
      store.put(newMitra, "mitra");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export function isRealViolation(v?: { jenis?: string | null; poin?: number | null; status?: string | null } | null): boolean {
  if (!v || !v.jenis) return false;
  const j = v.jenis.trim().toLowerCase();
  if (
    j === "inspeksi qc rutin material & jasa" ||
    j === "inspeksi qc rutin" ||
    j === "pemeriksaan lapangan" ||
    j.includes("inspeksi qc rutin")
  ) {
    return false;
  }
  return true;
}

export function isSbuCodeOrLabel(val?: string): boolean {
  if (!val) return false;
  const upper = val.toUpperCase().trim();
  return sbuOptions.some((s) => s.code === upper || s.label.toUpperCase() === upper);
}

export function sanitizeViolation(v: Violation): Violation {
  if (v.petugasQc && (v.petugasQc === v.sbu || isSbuCodeOrLabel(v.petugasQc))) {
    v.petugasQc = undefined;
  }
  if (v.petugas && (v.petugas === v.sbu || isSbuCodeOrLabel(v.petugas))) {
    v.petugas = "Petugas Mitra";
  }
  if (v.petugasMonitoringPusat && (v.petugasMonitoringPusat === v.sbu || isSbuCodeOrLabel(v.petugasMonitoringPusat))) {
    v.petugasMonitoringPusat = undefined;
  }
  return v;
}

/**
/**
 * Membersihkan data pelanggaran K3 dari label generik/duplikat "First".
 * Mengubah temuan K3 menjadi rincian ketentuan spesifik (Helm, Rompi, Body Harness, Sarung Tangan, Sepatu, Lengan Panjang)
 * dan menghapus tiket duplikat jika ketentuan spesifik sudah tercatat pada inspeksi yang sama.
 */
export function cleanK3Violations(list: Violation[]): Violation[] {
  const byPa: Record<string, Violation[]> = {};
  list.forEach((v) => {
    const paKey = v.idPa || v.id;
    if (!byPa[paKey]) byPa[paKey] = [];
    byPa[paKey].push(v);
  });

  const cleaned: Violation[] = [];

  list.forEach((v) => {
    const jRaw = (v.jenis || "").trim();
    const jLower = jRaw.toLowerCase();

    // Ubah kategori K3 Lengan Panjang menjadi Penampilan
    if (jLower.includes("lengan")) {
      const isAkhirLengan = jLower.includes("akhir");
      cleaned.push({
        ...v,
        jenis: isAkhirLengan ? "Penampilan Akhir - Lengan Panjang" : "Penampilan Awal - Lengan Panjang",
      });
      return;
    }

    const isFirstAwal =
      jLower.includes("k3 awal - first") ||
      jLower.includes("k3 awal first") ||
      jLower === "awal first" ||
      jLower === "k3 first" ||
      jLower.includes("k3 awal - kelengkapan apd standard");
    const isFirstAkhir =
      jLower.includes("k3 akhir - first") ||
      jLower.includes("k3 akhir first") ||
      jLower === "akhir first" ||
      jLower.includes("k3 akhir - kelengkapan apd standard");

    if (!isFirstAwal && !isFirstAkhir) {
      cleaned.push(v);
      return;
    }

    const paKey = v.idPa || v.id;
    const siblings = byPa[paKey] || [];
    const hasSpecificSibling = siblings.some((s) => {
      if (s.id === v.id) return false;
      const sLower = (s.jenis || "").toLowerCase();
      if (
        isFirstAwal &&
        (sLower.startsWith("k3 awal") || sLower.startsWith("penampilan awal")) &&
        !sLower.includes("first") &&
        !sLower.includes("kelengkapan apd")
      )
        return true;
      if (
        isFirstAkhir &&
        (sLower.startsWith("k3 akhir") || sLower.startsWith("penampilan akhir")) &&
        !sLower.includes("first") &&
        !sLower.includes("kelengkapan apd")
      )
        return true;
      return false;
    });

    if (hasSpecificSibling) {
      return;
    }

    const note = `${v.catatan || ""} ${JSON.stringify(v.checklistResults || {})}`.toLowerCase();
    const prefix = isFirstAwal ? "k3 awal" : "k3 akhir";
    let concreteJenis = `${prefix} helm`;
    if (note.includes("sarung") || note.includes("tangan")) concreteJenis = `${prefix} sarung tangan`;
    else if (note.includes("rompi")) concreteJenis = `${prefix} rompi`;
    else if (note.includes("harnes") || note.includes("harness")) concreteJenis = `${prefix} body harnes`;
    else if (note.includes("lengan") || note.includes("baju") || note.includes("seragam"))
      concreteJenis = isFirstAwal ? "Penampilan Awal - Lengan Panjang" : "Penampilan Akhir - Lengan Panjang";
    else if (note.includes("sepatu")) concreteJenis = `${prefix} sepatu`;
    else if (note.includes("helm")) concreteJenis = `${prefix} helm`;

    cleaned.push({
      ...v,
      jenis: concreteJenis,
    });
  });

  return cleaned;
}

export async function hydrateCustomDataFromIndexedDB(): Promise<{
  violations: Violation[];
  mitraList: Mitra[];
} | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = await openExcelDatabase();
    const result = await new Promise<{ violations: Violation[]; mitraList: Mitra[] } | null>(
      (resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readonly");
        const store = tx.objectStore(IDB_STORE_NAME);
        const vReq = store.get("violations");
        const mReq = store.get("mitra");
        tx.oncomplete = () => {
          const vList = Array.isArray(vReq.result) ? (vReq.result as Violation[]) : [];
          const mList = Array.isArray(mReq.result) ? (mReq.result as Mitra[]) : [];
          if (vList.length === 0 && mList.length === 0) {
            resolve(null);
          } else {
            resolve({ violations: vList, mitraList: mList });
          }
        };
        tx.onerror = () => reject(tx.error);
      },
    );
    db.close();

    if (result) {
      const deletedIds = new Set(getDeletedViolationIds());
      const rawActive = result.violations
        .filter((v) => !deletedIds.has(v.id) && isRealViolation(v))
        .map(sanitizeViolation);
      const activeViolations = cleanK3Violations(rawActive);
      violations.length = 0;
      violations.push(...activeViolations);

      // Otomatis sinkronisasi data yang telah dibersihkan kembali ke IndexedDB jika ada perubahan
      if (
        activeViolations.length !== result.violations.length ||
        activeViolations.some((v, idx) => v.jenis !== result.violations[idx]?.jenis)
      ) {
        void saveCustomDataToIndexedDB(activeViolations, result.mitraList);
      }

      if (result.mitraList.length > 0) {
        mitraList.length = 0;
        mitraList.push(...result.mitraList);
      }

      window.dispatchEvent(new CustomEvent("iconguard-data-hydrated"));
    }
    return result;
  } catch {
    return null;
  }
}

export function getCustomViolationsFromStorage(): Violation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_VIOLATIONS_KEY);
    if (!raw) return violations.length > 0 ? cleanK3Violations(violations.filter(isRealViolation)) : [];
    const list = JSON.parse(raw) as Violation[];
    const cleaned = cleanK3Violations(
      list
        .filter(isRealViolation)
        .map(sanitizeViolation)
    );
    if (
      cleaned.length !== list.length ||
      cleaned.some((v, idx) => v.jenis !== list[idx]?.jenis)
    ) {
      localStorage.setItem(CUSTOM_VIOLATIONS_KEY, JSON.stringify(cleaned));
      void saveCustomDataToIndexedDB(cleaned, getCustomMitraListFromStorage());
    }
    return cleaned;
  } catch {
    return violations.length > 0 ? cleanK3Violations(violations.filter(isRealViolation)) : [];
  }
}

export function clearAllCustomDataFromStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CUSTOM_VIOLATIONS_KEY);
    localStorage.removeItem(CUSTOM_MITRA_KEY);
    localStorage.removeItem("iconguard_override_all");
    violations.length = 0;
    mitraList.length = 0;
    void openExcelDatabase().then((db) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      tx.objectStore(IDB_STORE_NAME).clear();
      tx.oncomplete = () => db.close();
    });
    window.dispatchEvent(new CustomEvent("iconguard-data-hydrated"));
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
    if (!raw) return mitraList.length > 0 ? [...mitraList] : [];
    return JSON.parse(raw) as Mitra[];
  } catch {
    return mitraList.length > 0 ? [...mitraList] : [];
  }
}

export function saveCustomViolationToStorage(item: Violation) {
  if (typeof window === "undefined") return;
  if (!isRealViolation(item)) return;
  try {
    const list = getCustomViolationsFromStorage();
    const idx = list.findIndex((v) => v.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    const filteredList = list.filter(isRealViolation);
    try {
      localStorage.setItem(CUSTOM_VIOLATIONS_KEY, JSON.stringify(filteredList));
    } catch {
      // QuotaExceeded fallback to IndexedDB
    }
    void saveCustomDataToIndexedDB(filteredList, mitraList);
  } catch {
    // ignore storage errors
  }
}

export function restoreCustomViolationsFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CUSTOM_VIOLATIONS_KEY);
    const parsedList: Violation[] = raw ? JSON.parse(raw) : [];
    const list = cleanK3Violations(parsedList.map(sanitizeViolation));
    if (list.length !== parsedList.length || list.some((v, idx) => v.jenis !== parsedList[idx]?.jenis)) {
      localStorage.setItem(CUSTOM_VIOLATIONS_KEY, JSON.stringify(list));
      void saveCustomDataToIndexedDB(list, getCustomMitraListFromStorage());
    }
    const deletedIds = new Set(getDeletedViolationIds());
    for (const item of [...list].reverse()) {
      if (!isRealViolation(item) || deletedIds.has(item.id)) continue;
      const existing = violations.find((v) => v.id === item.id || (v.idPa === item.idPa && v.jenis === item.jenis));
      if (!existing) {
        violations.unshift(item);
      } else if (item.bukti && item.bukti.length > 0) {
        existing.bukti = item.bukti;
      }
    }

    const rawMitra = localStorage.getItem(CUSTOM_MITRA_KEY);
    const savedMitra: Mitra[] = rawMitra ? JSON.parse(rawMitra) : [];
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
  void hydrateCustomDataFromIndexedDB();
}

if (typeof window !== "undefined") {
  restoreCustomViolationsFromStorage();
}
