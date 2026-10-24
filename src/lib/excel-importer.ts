import * as XLSX from "xlsx";
import {
  violations,
  mitraList,
  poinBySeverity,
  saveCustomDataToIndexedDB,
  sbuOptions,
  isRealViolation,
  type Violation,
  type Mitra,
  type Severity,
} from "./iconguard-data";

export type ColumnMapping = {
  tanggalCek?: string | undefined;
  sbu?: string | undefined;
  idPa?: string | undefined;
  tanggalAktivasi?: string | undefined;
  tanggalPermohonan?: string | undefined;
  mitra?: string | undefined;
  petugas?: string | undefined;
  petugasQc?: string | undefined;
  petugasMonitoringPusat?: string | undefined;
  kp?: string | undefined;
  idFat?: string | undefined;
  dwGudang?: string | undefined;
  lokasiFatPelanggan?: string | undefined;
  // Fallbacks
  jenis?: string | undefined;
  severity?: string | undefined;
  status?: string | undefined;
  catatan?: string | undefined;
};

export type ExcelImportResult = {
  success: boolean;
  totalParsed: number;
  totalImported: number;
  violations?: Violation[] | undefined;
  mitraList?: Mitra[] | undefined;
  errors?: string[] | undefined;
};

export type ChecklistColDef = {
  key: string;
  label: string;
  defaultSeverity: Severity;
  aliases: string[];
};

export const K3_AWAL_ITEMS = [
  "k3_awal_helm",
  "k3_awal_sarung_tangan",
  "k3_awal_rompi",
  "k3_awal_body_harnes",
  "k3_awal_lengan_panjang",
  "k3_awal_sepatu",
];

export const K3_AKHIR_ITEMS = [
  "k3_akhir_helm",
  "k3_akhir_sarung_tangan",
  "k3_akhir_rompi",
  "k3_akhir_body_harnes",
  "k3_akhir_lengan_panjang",
  "k3_akhir_sepatu",
];

export const CHECKLIST_COLUMNS: ChecklistColDef[] = [
  // 5 Ketentuan Detail K3 Awal + 1 Penampilan Awal
  { key: "k3_awal_helm", label: "k3 awal helm", defaultSeverity: "Berat", aliases: ["k3 awal helm", "k3 awal - helm", "awal helm", "helm awal"] },
  { key: "k3_awal_sarung_tangan", label: "k3 awal sarung tangan", defaultSeverity: "Berat", aliases: ["k3 awal sarung tangan", "sarung tangan awal"] },
  { key: "k3_awal_rompi", label: "k3 awal rompi", defaultSeverity: "Berat", aliases: ["k3 awal rompi", "rompi awal"] },
  { key: "k3_awal_body_harnes", label: "k3 awal body harnes", defaultSeverity: "Berat", aliases: ["k3 awal body harnes", "k3 awal body harness", "body harnes awal", "body harness awal", "harnes awal", "harness awal"] },
  { key: "k3_awal_lengan_panjang", label: "Penampilan Awal - Lengan Panjang", defaultSeverity: "Berat", aliases: ["penampilan awal - lengan panjang", "penampilan awal lengan panjang", "k3 awal lengan panjang", "lengan panjang awal"] },
  { key: "k3_awal_sepatu", label: "k3 awal sepatu", defaultSeverity: "Berat", aliases: ["k3 awal sepatu", "sepatu awal"] },

  { key: "id_fat", label: "ID FAT", defaultSeverity: "Sedang", aliases: ["id fat", "idfat", "fat id", "label fat"] },
  { key: "kerapian_instalasi_tiang_listrik", label: "Kerapian Instalasi Tiang Listrik", defaultSeverity: "Sedang", aliases: ["kerapian instalasi tiang listrik", "kerapian instalasi tiang", "kerapian tiang listrik", "tiang listrik", "instalasi tiang"] },
  { key: "opm_fat_25db", label: "OPM FAT -25 dB", defaultSeverity: "Sedang", aliases: ["opm fat -25db", "opm fat -25 db", "opm fat 25db", "opm fat -25", "opm fat"] },
  { key: "stiker_ont", label: "Stiker ONT", defaultSeverity: "Ringan", aliases: ["stiker ont", "stiker barcode ont", "stiker"] },
  { key: "sn_ont", label: "SN ONT", defaultSeverity: "Sedang", aliases: ["sn ont", "serial number ont", "s/n ont"] },
  { key: "opm_ont_26db", label: "OPM ONT -26 dB", defaultSeverity: "Sedang", aliases: ["opm ont -26db", "opm ont -26 db", "opm ont 26db", "opm ont -26", "opm ont"] },
  { key: "instalasi_s_clamp_dan_hookclam_di_rumah", label: "Instalasi S-Clamp dan Hookclam di Rumah", defaultSeverity: "Berat", aliases: ["instalasi s-clamp dan hookclam di rumah", "instalasi s-clamp dan hookclam", "s-clamp dan hookclam", "sclamp dan hookclam", "s clamp", "hookclam", "hook clamp"] },
  { key: "speedtest", label: "Speedtest", defaultSeverity: "Sedang", aliases: ["speedtest", "speed test", "hasil speedtest", "uji kecepatan"] },
  { key: "foto_bersama_pelanggan", label: "Foto Bersama Pelanggan", defaultSeverity: "Ringan", aliases: ["foto bersama pelanggan", "foto bersama", "foto pelanggan"] },
  { key: "foto_depan_rumah_pelanggan", label: "Foto Depan Rumah Pelanggan", defaultSeverity: "Ringan", aliases: ["foto depan rumah pelangan", "foto depan rumah pelanggan", "foto depan rumah", "foto rumah"] },
  { key: "aplikasi_my_icon", label: "Aplikasi My Icon", defaultSeverity: "Ringan", aliases: ["aplikasi my icon", "aplikasi myicon", "my icon", "myicon"] },

  // 5 Ketentuan Detail K3 Akhir + 1 Penampilan Akhir
  { key: "k3_akhir_helm", label: "k3 akhir helm", defaultSeverity: "Berat", aliases: ["k3 akhir helm", "k3 akhir - helm", "akhir helm", "helm akhir"] },
  { key: "k3_akhir_sarung_tangan", label: "k3 akhir sarung tangan", defaultSeverity: "Berat", aliases: ["k3 akhir sarung tangan", "sarung tangan akhir"] },
  { key: "k3_akhir_rompi", label: "k3 akhir rompi", defaultSeverity: "Berat", aliases: ["k3 akhir rompi", "rompi akhir"] },
  { key: "k3_akhir_body_harnes", label: "k3 akhir body harnes", defaultSeverity: "Berat", aliases: ["k3 akhir body harnes", "k3 akhir body harness", "body harnes akhir", "body harness akhir", "harnes akhir", "harness akhir"] },
  { key: "k3_akhir_lengan_panjang", label: "Penampilan Akhir - Lengan Panjang", defaultSeverity: "Berat", aliases: ["penampilan akhir - lengan panjang", "penampilan akhir lengan panjang", "k3 akhir lengan panjang", "lengan panjang akhir"] },
  { key: "k3_akhir_sepatu", label: "k3 akhir sepatu", defaultSeverity: "Berat", aliases: ["k3 akhir sepatu", "sepatu akhir"] },

  { key: "baa", label: "BAA", defaultSeverity: "Sedang", aliases: ["baa", "berita acara aktivasi", "berita acara"] },
];

/**
 * Membaca worksheet spesifik dan mencari baris header terbaik secara otomatis.
 */
export function parseSheetData(worksheet: XLSX.WorkSheet): {
  headers: string[];
  previewRows: Record<string, any>[];
  allRows: Record<string, any>[];
  headerRowIndex: number;
} {
  const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
  if (!rawMatrix || rawMatrix.length === 0) {
    return { headers: [], previewRows: [], allRows: [], headerRowIndex: 0 };
  }

  // Scan 15 baris pertama untuk mencari baris judul/header terbaik
  let bestRowIndex = 0;
  let maxScore = -1;
  const qcKeywords = [
    "tanggal", "tgl", "sbu", "idpa", "pa", "aktivasi", "permohonan",
    "mitra", "petugas", "qc", "monitoring", "pusat", "kp", "k3",
    "helm", "rompi", "harnes", "harness", "sepatu", "sarung", "lengan",
    "fat", "ont", "tiang", "opm", "speedtest", "foto", "myicon", "icon",
    "baa", "dw", "gudang", "pelanggan"
  ];

  const searchDepth = Math.min(300, rawMatrix.length);
  for (let r = 0; r < searchDepth; r++) {
    const row = rawMatrix[r] || [];
    const stringCells = row
      .map((c) => String(c ?? "").trim())
      .filter((c) => c.length > 0 && !c.startsWith("__EMPTY"));

    if (stringCells.length === 0) continue;

    let keywordMatches = 0;
    stringCells.forEach((cell) => {
      const clean = cell.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (qcKeywords.some((kw) => clean.includes(kw))) {
        keywordMatches++;
      }
      if (
        clean.includes("k3awal") ||
        clean.includes("k3akhir") ||
        clean.includes("idfat") ||
        clean.includes("snont") ||
        clean.includes("opmfat") ||
        clean.includes("opmont") ||
        clean.includes("sclamp") ||
        clean.includes("tianglistrik")
      ) {
        keywordMatches += 4;
      }
    });

    const score = keywordMatches * 30 + stringCells.length;
    if (score > maxScore) {
      maxScore = score;
      bestRowIndex = r;
    }
  }

  const rawHeadersRow = (rawMatrix[bestRowIndex] || []).map((c) => String(c ?? "").trim());
  const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    range: bestRowIndex,
    defval: "",
  });

  const detectedHeaders = new Set<string>();
  rawHeadersRow.forEach((h) => {
    if (h && !h.startsWith("__EMPTY")) detectedHeaders.add(h);
  });
  if (json.length > 0) {
    Object.keys(json[0] || {}).forEach((k) => {
      if (k && !k.startsWith("__EMPTY")) detectedHeaders.add(k);
    });
  }

  const cleanHeaders = Array.from(detectedHeaders);
  const filteredRows = json.filter((row) =>
    Object.values(row).some((val) => String(val ?? "").trim() !== "")
  );

  return {
    headers: cleanHeaders,
    previewRows: filteredRows.slice(0, 5),
    allRows: filteredRows,
    headerRowIndex: bestRowIndex,
  };
}

export type ParsedWorkbookResult = {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  previewRows: Record<string, any>[];
  allRows: Record<string, any>[];
  workbook: XLSX.WorkBook;
};

/**
 * Membaca seluruh file Excel, mendeteksi semua sheet, dan otomatis memilih sheet yang paling sesuai (berisi kolom QC).
 */
export function parseExcelHeadersAndPreview(file: File): Promise<ParsedWorkbookResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("File Excel kosong atau tidak memiliki sheet.");
        }

        // Cari sheet terbaik secara otomatis (yang memiliki kolom QC terbanyak)
        let bestSheetName: string = workbook.SheetNames[0] ?? "";
        const firstSheet = workbook.Sheets[bestSheetName];
        if (!firstSheet) {
          throw new Error("Gagal membaca sheet Excel.");
        }
        let bestParsed = parseSheetData(firstSheet);
        let highestSheetScore = -1;

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const parsed = parseSheetData(sheet);
          const mapping = detectAutoMapping(parsed.headers);

          let matchedMetaCount = 0;
          if (mapping.tanggalCek) matchedMetaCount += 4;
          if (mapping.tanggalAktivasi) matchedMetaCount += 4;
          if (mapping.petugasMonitoringPusat) matchedMetaCount += 4;
          if (mapping.tanggalPermohonan) matchedMetaCount += 3;
          if (mapping.idPa) matchedMetaCount += 2;
          if (mapping.mitra) matchedMetaCount += 2;
          if (mapping.petugasQc) matchedMetaCount += 2;

          let matchedChecklistCount = 0;
          parsed.headers.forEach((h) => {
            const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (
              hClean.includes("k3") ||
              hClean.includes("ont") ||
              hClean.includes("fat") ||
              hClean.includes("speedtest") ||
              hClean.includes("sclamp") ||
              hClean.includes("tiang") ||
              hClean.includes("baa")
            ) {
              matchedChecklistCount++;
            }
          });

          // Skor sheet mengutamakan keberadaan kolom QC
          const sheetScore =
            matchedMetaCount * 30 +
            matchedChecklistCount * 15 +
            parsed.headers.length +
            (parsed.allRows.length > 0 ? 50 : 0);

          if (sheetScore > highestSheetScore && parsed.allRows.length > 0) {
            highestSheetScore = sheetScore;
            bestSheetName = sheetName;
            bestParsed = parsed;
          }
        }

        resolve({
          sheetNames: workbook.SheetNames,
          selectedSheet: bestSheetName,
          headers: bestParsed.headers,
          previewRows: bestParsed.previewRows,
          allRows: bestParsed.allRows,
          workbook,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Auto-detect header names based on common keywords
export function detectAutoMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  function findBestHeader(
    primaryKeywords: string[],
    fallbackKeywords: string[] = [],
    exactExcludes: string[] = [],
    containsExcludes: string[] = [],
  ): string | undefined {
    const cleanHeaders = headers.map((h) => ({ original: h, clean: cleanStr(h) }));
    const cleanPrimary = primaryKeywords.map(cleanStr).filter(Boolean);
    const cleanFallback = fallbackKeywords.map(cleanStr).filter(Boolean);
    const cleanExactExcludes = exactExcludes.map(cleanStr).filter(Boolean);
    const cleanContainsExcludes = containsExcludes.map(cleanStr).filter(Boolean);

    const isExcluded = (hClean: string) => {
      if (cleanExactExcludes.some((ex) => hClean === ex)) return true;
      if (cleanContainsExcludes.some((ex) => ex.length >= 3 && hClean.includes(ex))) return true;
      return false;
    };

    // Phase 1: Exact match with primary keywords (highest priority)
    for (const kw of cleanPrimary) {
      const found = cleanHeaders.find((h) => !isExcluded(h.clean) && h.clean === kw);
      if (found) return found.original;
    }

    // Phase 2: Exact match with fallback keywords
    for (const kw of cleanFallback) {
      const found = cleanHeaders.find((h) => !isExcluded(h.clean) && h.clean === kw);
      if (found) return found.original;
    }

    // Phase 3: Header contains primary keyword (longest keyword first)
    const sortedPrimary = [...cleanPrimary].sort((a, b) => b.length - a.length);
    for (const kw of sortedPrimary) {
      if (kw.length < 3) continue;
      const found = cleanHeaders.find((h) => !isExcluded(h.clean) && h.clean.includes(kw));
      if (found) return found.original;
    }

    // Phase 4: Header contains fallback keyword (longest keyword first)
    const sortedFallback = [...cleanFallback].sort((a, b) => b.length - a.length);
    for (const kw of sortedFallback) {
      if (kw.length < 3) continue;
      const found = cleanHeaders.find((h) => !isExcluded(h.clean) && h.clean.includes(kw));
      if (found) return found.original;
    }

    return undefined;
  }

  mapping.tanggalCek = findBestHeader(
    ["tanggalcek", "tglcek", "tglinspeksi", "tglperiksa", "tanggalperiksa", "tanggalinspeksi"],
    ["tanggal", "tgl"],
    [],
    ["aktivasi", "permohonan"]
  );

  mapping.sbu = findBestHeader(
    ["sbu"],
    ["wilayah", "area", "region"],
    [],
    ["petugas", "qc", "waslak", "monitoring", "mitra", "pengawas"]
  );

  mapping.idPa = findBestHeader(
    ["idpa", "nopa"],
    ["pa", "project", "spk", "noorder", "order"],
    [],
    ["fat", "pelanggan"]
  );

  mapping.tanggalAktivasi = findBestHeader(
    ["tanggalaktivasi", "tglaktivasi", "tglaktif", "tglaktv", "aktivasi"],
    ["tglon"],
    [],
    ["permohonan", "cek", "inspeksi"]
  );

  mapping.tanggalPermohonan = findBestHeader(
    ["tanggalpermohonan", "tglpermohonan", "tglmohon", "permohonan"],
    [],
    [],
    ["aktivasi", "cek", "inspeksi"]
  );

  mapping.mitra = findBestHeader(
    ["namamitra", "mitra"],
    ["vendor", "perusahaan", "rekanan", "pt", "cv"],
    [],
    ["petugas"]
  );

  mapping.petugas = findBestHeader(
    ["petugasmitra", "namapetugasmitra", "teknisi", "petugaslapangan", "namapekerja"],
    ["petugas", "namapetugas"],
    [],
    ["qc", "monitoring", "pusat", "waslak"]
  );

  mapping.petugasQc = findBestHeader(
    ["petugasqcsbu", "namapetugasqcsbu", "petugasqc", "namapetugasqc", "qcsbu"],
    ["waslak", "pengawas", "pemeriksasbu", "waslaksbu"],
    ["sbu"], // Never map to column that is purely SBU!
    ["mitra", "monitoring", "pusat"]
  );

  mapping.petugasMonitoringPusat = findBestHeader(
    ["petugasmonitoringpusat", "monitoringpusat", "petugasmonitoring", "monitoring"],
    ["pusat"],
    [],
    ["mitra", "qc"]
  );

  mapping.kp = findBestHeader(
    ["kp", "kantorperwakilan"],
    [],
    [],
    []
  );

  mapping.idFat = findBestHeader(
    ["idfat"],
    ["fat"],
    [],
    ["pelanggan", "lokasi"]
  );

  mapping.dwGudang = findBestHeader(
    ["dwgudang"],
    ["dw", "gudang", "do"],
    [],
    []
  );

  mapping.lokasiFatPelanggan = findBestHeader(
    ["lokasifatpelanggan", "fatpelanggan", "lokasifat"],
    ["jarakfat", "pelanggan"],
    [],
    ["permohonan"]
  );

  mapping.jenis = findBestHeader(
    ["jenistemuan", "jenispelanggaran"],
    ["temuan", "pelanggaran", "jenis"],
    [],
    []
  );

  mapping.severity = findBestHeader(
    ["severity", "tingkatkeparahan"],
    ["tingkat", "kategori", "bobot"],
    [],
    []
  );

  mapping.status = findBestHeader(
    ["status", "tindaklanjut"],
    [],
    [],
    []
  );

  mapping.catatan = findBestHeader(
    ["catatan", "keterangan"],
    ["deskripsi", "notes", "remark"],
    [],
    []
  );

  return mapping;
}

function normalizeDate(val: any): string {
  if (!val) return "—";
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  if (typeof val === "number") {
    // Excel serial date format
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    }
  }
  const s = String(val).trim();
  const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m1 && m1[1] && m1[2] && m1[3]) {
    const y = parseInt(m1[1]);
    const m = parseInt(m1[2]);
    const d = parseInt(m1[3]);
    if (m >= 1 && m <= 12) {
      return `${d} ${months[m - 1]} ${y}`;
    }
  }
  const m2 = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m2 && m2[1] && m2[2] && m2[3]) {
    const d = parseInt(m2[1]);
    const m = parseInt(m2[2]);
    const y = parseInt(m2[3]);
    if (m >= 1 && m <= 12) {
      return `${d} ${months[m - 1]} ${y}`;
    }
  }
  return s;
}

// Mengecek apakah suatu nilai checklist menandakan adanya temuan/pelanggaran (misal: NOK, Tidak, Silang, 0)
// Needkonfirm / Need Confirm / Konfirmasi TIDAK dimasukkan sebagai pelanggaran / PTS
function isChecklistViolation(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim().toLowerCase();
  if (
    !str ||
    str === "-" ||
    str === "—" ||
    str === "n/a" ||
    str === "na" ||
    str === "ok" ||
    str.includes("needkonfirm") ||
    str.includes("need konfirm") ||
    str.includes("needconfirm") ||
    str.includes("need confirm") ||
    str.includes("konfirm") ||
    str.includes("confirm") ||
    str.includes("pending") ||
    str.includes("menunggu")
  ) {
    return false;
  }
  return (
    str === "nok" ||
    str === "not ok" ||
    str === "tidak" ||
    str === "tidak ada" ||
    str === "belum" ||
    str === "x" ||
    str === "0" ||
    str === "false" ||
    str.includes("tidak") ||
    str.includes("temuan") ||
    str.includes("kurang") ||
    str.includes("rusak") ||
    str.includes("kendor")
  );
}

export function processAndImportData(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  options?: { replaceAll?: boolean },
): ExcelImportResult {
  if (!rows || rows.length === 0) {
    return { success: false, totalParsed: 0, totalImported: 0, errors: ["Data kosong"] };
  }

  const replaceAll = options?.replaceAll ?? true;
  const newViolations: Violation[] = [];
  let ticketIndex = 1;

  // Temukan kolom-kolom checklist yang ada di baris data ini
  const allHeaders = Object.keys(rows[0] || {});
  const matchedChecklistCols = CHECKLIST_COLUMNS.map((item) => {
    const cleanAliases = [item.label, ...item.aliases].map((a) =>
      a.toLowerCase().replace(/[^a-z0-9]/g, "")
    );
    const headerName = allHeaders.find((h) => {
      const hLower = h.toLowerCase().trim();
      const hClean = hLower.replace(/[^a-z0-9]/g, "");

      // 12 Kolom yang dilarang dimasukkan sebagai temuan / poin PTS:
      // DW gudang, lokasi FAT-Pelanggan, Selisih DW dari FAT-lokasi, QC STATUS DW, QC Stiker ONT,
      // QC PENAMPILAN, QC K3, QC INSTALASI, Remark Stiker ONT, Remark Penampilan, Remark k3, Remark Instalasi & DW
      // Serta seluruh kategori Kabel DW / Drop Wire (material, bukan pelanggaran teknis/K3, tidak kena PTS)
      if (
        hLower.startsWith("remark") ||
        hClean.startsWith("remark") ||
        hLower.startsWith("qc") ||
        hClean.startsWith("qc") ||
        hClean.includes("dw") ||
        hLower.includes("drop wire") ||
        hClean.includes("dropwire") ||
        hClean.includes("lokasifat") ||
        hClean.includes("fatlokasi") ||
        hClean.includes("material") ||
        hLower.includes("material")
      ) {
        return false;
      }

      return cleanAliases.some((alias) => hClean === alias || hClean.includes(alias) || alias.includes(hClean));
    });
    return { ...item, headerName };
  }).filter((c) => Boolean(c.headerName));

  rows.forEach((row, rowIdx) => {
    // Ambil nilai kolom dengan toleransi tinggi
    const rawMitra = String(
      (mapping.mitra && row[mapping.mitra]) ||
      row["Nama Mitra"] ||
      row["Mitra"] ||
      row["namamitra"] ||
      ""
    ).trim();

    const rawIdPa = String(
      (mapping.idPa && row[mapping.idPa]) ||
      row["ID PA"] ||
      row["idpa"] ||
      `PA-${Date.now()}-${rowIdx}`
    ).trim();

    // Lewati baris jika benar-benar kosong dari ID PA dan Mitra
    if (!rawMitra && !rawIdPa) return;

    const displayMitra = rawMitra || "Mitra Operasional";
    const rawSbu = String(
      (mapping.sbu && row[mapping.sbu]) ||
      row["SBU"] ||
      row["sbu"] ||
      row["Wilayah"] ||
      "SBU Operasional"
    ).trim();

    const isSbuValue = (val?: string): boolean => {
      if (!val) return false;
      const vUpper = val.toUpperCase().trim();
      return (
        vUpper === rawSbu.toUpperCase() ||
        sbuOptions.some((s) => s.code === vUpper || s.label.toUpperCase() === vUpper)
      );
    };

    // Ambil nama Petugas QC SBU, jangan sampai mengambil kode atau nama SBU
    let rawPetugasQc: string | undefined = undefined;
    if (mapping.petugasQc && mapping.petugasQc !== mapping.sbu && row[mapping.petugasQc] !== undefined) {
      const candidate = String(row[mapping.petugasQc]).trim();
      if (candidate && !isSbuValue(candidate)) {
        rawPetugasQc = candidate;
      }
    }

    if (!rawPetugasQc) {
      const directQcVal =
        row["Petugas QC SBU"] ??
        row["Nama Petugas QC SBU"] ??
        row["Petugas QC"] ??
        row["Nama Petugas QC"] ??
        row["QC SBU"] ??
        row["Pengawas SBU"] ??
        row["Waslak"];
      if (directQcVal !== undefined && directQcVal !== null) {
        const cStr = String(directQcVal).trim();
        if (cStr && !isSbuValue(cStr)) {
          rawPetugasQc = cStr;
        }
      }
    }

    if (!rawPetugasQc) {
      const qcColKey = Object.keys(row).find((k) => {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          (cleanK.includes("petugasqc") ||
            cleanK.includes("qcsbu") ||
            cleanK === "waslak" ||
            cleanK === "pengawas") &&
          cleanK !== "sbu" &&
          !cleanK.includes("mitra") &&
          !cleanK.includes("pusat")
        );
      });
      if (qcColKey && row[qcColKey]) {
        const cStr = String(row[qcColKey]).trim();
        if (cStr && !isSbuValue(cStr)) {
          rawPetugasQc = cStr;
        }
      }
    }

    let rawMonitoringPusat =
      mapping.petugasMonitoringPusat &&
      mapping.petugasMonitoringPusat !== mapping.sbu &&
      row[mapping.petugasMonitoringPusat]
        ? String(row[mapping.petugasMonitoringPusat]).trim()
        : row["Petugas Monitoring Pusat"]
        ? String(row["Petugas Monitoring Pusat"]).trim()
        : row["Monitoring Pusat"]
        ? String(row["Monitoring Pusat"]).trim()
        : undefined;
    if (rawMonitoringPusat && isSbuValue(rawMonitoringPusat)) {
      rawMonitoringPusat = undefined;
    }

    let rawPetugas = String(
      (mapping.petugas && mapping.petugas !== mapping.sbu && row[mapping.petugas]) ||
      row["Petugas Mitra"] ||
      row["Nama Petugas Mitra"] ||
      row["Petugas"] ||
      row["Teknisi"] ||
      "Petugas Mitra"
    ).trim();
    if (isSbuValue(rawPetugas)) {
      rawPetugas = "Petugas Mitra";
    }

    const rawKp =
      mapping.kp && row[mapping.kp]
        ? String(row[mapping.kp]).trim()
        : row["KP"]
        ? String(row["KP"]).trim()
        : undefined;

    const rawTanggalCek = normalizeDate((mapping.tanggalCek && row[mapping.tanggalCek]) || row["Tanggal Cek"]);
    const rawTanggalAktivasi = normalizeDate((mapping.tanggalAktivasi && row[mapping.tanggalAktivasi]) || row["Tanggal Aktivasi"]);
    const rawTanggalPermohonan = normalizeDate((mapping.tanggalPermohonan && row[mapping.tanggalPermohonan]) || row["Tanggal Permohonan"]);
    const candidateIdFat =
      mapping.idFat && row[mapping.idFat]
        ? String(row[mapping.idFat]).trim()
        : row["ID FAT"]
        ? String(row["ID FAT"]).trim()
        : undefined;
    const rawIdFat =
      candidateIdFat && !["ok", "nok", "tidak", "ya", "true", "false", "-", "—"].includes(candidateIdFat.toLowerCase())
        ? candidateIdFat
        : undefined;
    const rawDwGudang = mapping.dwGudang && row[mapping.dwGudang] ? String(row[mapping.dwGudang]).trim() : row["DW gudang"] ? String(row["DW gudang"]).trim() : undefined;
    const rawLokasiFatPelanggan = mapping.lokasiFatPelanggan && row[mapping.lokasiFatPelanggan] ? String(row[mapping.lokasiFatPelanggan]).trim() : row["lokasi FAT-Pelanggan"] ? String(row["lokasi FAT-Pelanggan"]).trim() : undefined;

    // Kumpulkan hasil seluruh checklist di baris ini
    const checklistResults: Record<string, string> = {};
    const violationsInRow: typeof matchedChecklistCols = [];

    matchedChecklistCols.forEach((col) => {
      const val = row[col.headerName!];
      const strVal = String(val ?? "").trim();
      checklistResults[col.label] = strVal;
    });

    // Kumpulkan hasil seluruh checklist teknis murni di baris ini yang dinyatakan NOK
    matchedChecklistCols.forEach((col) => {
      const val = row[col.headerName!];
      const strVal = String(val ?? "").trim();
      if (isChecklistViolation(strVal)) {
        violationsInRow.push(col);
      }
    });

    const rowQcK3 = String(row["QC K3"] ?? row["qc k3"] ?? "").trim().toUpperCase();
    const rowQcInst = String(row["QC INSTALASI"] ?? row["qc instalasi"] ?? "").trim().toUpperCase();

    // Jika ada checklist yang NOK / Temuan riil, buat tiket pelanggaran untuk tiap item temuan
    if (violationsInRow.length > 0) {
      violationsInRow.forEach((vCol) => {
        const severity: Severity = vCol.defaultSeverity;
        const poin = poinBySeverity[severity] || 8;
        const ticketId = `VL-${new Date().getFullYear()}-${String(ticketIndex++).padStart(4, "0")}`;

        newViolations.push({
          id: ticketId,
          idPa: rawIdPa,
          mitra: displayMitra,
          petugas: rawPetugas,
          petugasQc: rawPetugasQc,
          petugasMonitoringPusat: rawMonitoringPusat,
          sbu: rawSbu,
          tanggalCek: rawTanggalCek,
          tanggalAktivasi: rawTanggalAktivasi,
          tanggalPermohonan: rawTanggalPermohonan,
          kp: rawKp,
          idFat: rawIdFat,
          dwGudang: rawDwGudang,
          lokasiFatPelanggan: rawLokasiFatPelanggan,
          jenis: vCol.label,
          severity,
          status: "Open",
          lokasi: `${rawSbu} · ${rawKp || rawLokasiFatPelanggan || "Area Kerja"}`,
          createdAt: rawTanggalCek !== "—" ? rawTanggalCek : "Hari ini",
          deadline: "1 x 24 jam",
          poin,
          catatan: `Hasil QC: ${vCol.label} dinyatakan NOK (${checklistResults[vCol.label] || "Tidak Memenuhi Standar"}).`,
          checklistResults,
          qcK3: rowQcK3,
          qcInstalasi: rowQcInst,
        });
      });
    }
  });

  // Kumpulkan seluruh nama mitra unik yang ada di file Excel agar tetap masuk ke Scorecard (meskipun 0 pelanggaran)
  const allMitraInExcel = new Set<string>();
  rows.forEach((row) => {
    const rawM = String((mapping.mitra && row[mapping.mitra]) || row["Nama Mitra"] || row["Mitra"] || "").trim();
    if (rawM) allMitraInExcel.add(rawM);
  });

  const validViolations = newViolations.filter(isRealViolation);

  // Jika replaceAll aktif: kosongkan data demo, gunakan murni data excel yang diunggah
  if (replaceAll) {
    violations.length = 0;
    violations.push(...validViolations);
    mitraList.length = 0;
  } else {
    violations.unshift(...validViolations);
  }

  // Daftarkan seluruh mitra dari Excel ke mitraList dengan nilai awal 0
  allMitraInExcel.forEach((mName) => {
    let existing = mitraList.find((m) => m.nama.trim().toLowerCase() === mName.toLowerCase());
    if (!existing) {
      mitraList.push({
        nama: mName,
        kontrak: `KTR-${new Date().getFullYear()}-${String(mitraList.length + 1).padStart(3, "0")}`,
        pic: "PIC Mitra",
        skor: 0,
        pelanggaranAktif: 0,
        totalPelanggaran: 0,
      });
    }
  });

  // Hitung ulang akumulasi skor Mitra Scorecard HANYA dari pelanggaran riil
  validViolations.forEach((v) => {
    let existing = mitraList.find((m) => m.nama.trim().toLowerCase() === v.mitra.trim().toLowerCase());
    if (!existing) {
      existing = {
        nama: v.mitra,
        kontrak: `KTR-${new Date().getFullYear()}-${String(mitraList.length + 1).padStart(3, "0")}`,
        pic: v.petugas,
        skor: 0,
        pelanggaranAktif: 0,
        totalPelanggaran: 0,
      };
      mitraList.push(existing);
    }

    if (v.status !== "Closed") {
      existing.pelanggaranAktif += 1;
      existing.totalPelanggaran += 1;
      existing.skor += v.poin;
    } else if (v.poin > 0) {
      existing.totalPelanggaran += 1;
      existing.skor += v.poin;
    }
  });

  // Simpan ke IndexedDB (kapasitas besar) dan localStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("iconguard_override_all", "true");
      localStorage.setItem("iconguard_custom_mitra", JSON.stringify(mitraList));
      const STORAGE_KEY = "iconguard_custom_violations";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validViolations));
    } catch {
      // Jika localStorage penuh (>5MB), data tetap aman di IndexedDB dan memori
    }
    void saveCustomDataToIndexedDB([...violations.filter(isRealViolation)], [...mitraList]);
  }

  return {
    success: true,
    totalParsed: rows.length,
    totalImported: validViolations.length,
    violations: validViolations,
    mitraList: mitraList,
    errors: validViolations.length === 0 ? ["Seluruh baris inspeksi pada berkas Excel dinyatakan OK (Nihil Pelanggaran). Tidak ada tiket pelanggaran yang ditambahkan."] : undefined,
  };
}

export function downloadExcelTemplate() {
  const headers = [
    {
      "Tanggal Cek": "09/10/2026",
      "SBU": "SUMATERA BAGIAN UTARA",
      "ID PA": "A260927091213014801",
      "Tanggal Aktivasi": "08/10/2026",
      "Tanggal Permohonan": "05/10/2026",
      "Nama Mitra": "PT Indonesia Teknik",
      "Petugas Mitra": "Andi",
      "Petugas QC SBU": "Rudi Hartono",
      "Petugas Monitoring Pusat": "Budi Santoso",
      "KP": "Medan Kota",
      "k3 awal First": "OK",
      "k3 awal helm": "NOK",
      "k3 awal sarung tangan": "OK",
      "k3 awal rompi": "OK",
      "k3 awal body harnes": "OK",
      "k3 awal lengan panjang": "OK",
      "k3 awal sepatu": "OK",
      "ID FAT": "FAT-MDN-01",
      "Kerapian instalasi Tiang listrik": "OK",
      "OPM FAT -25db": "OK",
      "Stiker ONT": "OK",
      "SN ONT": "OK",
      "OPM ONT -26db": "OK",
      "instalasi s-clamp dan hookclam di rumah": "OK",
      "Speedtest": "OK",
      "foto bersama Pelanggan": "OK",
      "foto Depan Rumah pelangan": "OK",
      "Aplikasi My Icon": "OK",
      "k3 akhir First": "OK",
      "k3 akhir helm": "OK",
      "k3 akhir sarung tangan": "OK",
      "k3 akhir rompi": "OK",
      "k3 akhir body harnes": "OK",
      "k3 akhir lengan panjang": "OK",
      "k3 akhir sepatu": "OK",
      "BAA": "OK",
      "DW gudang": "OK",
      "lokasi FAT-Pelanggan": "Jln. Gatot Subroto No. 12",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(headers);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template MatJas");
  XLSX.writeFile(workbook, "Template_Data_Material_Jasa_IconGuard.xlsx");
}
