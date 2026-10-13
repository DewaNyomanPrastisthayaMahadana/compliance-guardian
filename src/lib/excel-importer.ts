import * as XLSX from "xlsx";
import {
  violations,
  mitraList,
  poinBySeverity,
  type Violation,
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
  violations?: Violation[];
  mitraList?: Mitra[];
  errors?: string[];
};

export type ChecklistColDef = {
  key: string;
  label: string;
  defaultSeverity: Severity;
  aliases: string[];
};

export const CHECKLIST_COLUMNS: ChecklistColDef[] = [
  { key: "k3_awal_first", label: "K3 Awal - First", defaultSeverity: "Berat", aliases: ["k3 awal first", "k3 awal - first", "k3 first", "awal first"] },
  { key: "k3_awal_helm", label: "K3 Awal - Helm", defaultSeverity: "Berat", aliases: ["k3 awal helm", "k3 awal - helm", "awal helm", "helm awal"] },
  { key: "k3_awal_sarung_tangan", label: "K3 Awal - Sarung Tangan", defaultSeverity: "Berat", aliases: ["k3 awal sarung tangan", "sarung tangan awal", "sarung tangan"] },
  { key: "k3_awal_rompi", label: "K3 Awal - Rompi", defaultSeverity: "Berat", aliases: ["k3 awal rompi", "rompi awal", "rompi"] },
  { key: "k3_awal_body_harnes", label: "K3 Awal - Body Harness", defaultSeverity: "Berat", aliases: ["k3 awal body harnes", "k3 awal body harness", "body harnes", "body harness", "harnes awal", "harness awal"] },
  { key: "k3_awal_lengan_panjang", label: "K3 Awal - Lengan Panjang", defaultSeverity: "Berat", aliases: ["k3 awal lengan panjang", "lengan panjang awal", "lengan panjang"] },
  { key: "k3_awal_sepatu", label: "K3 Awal - Sepatu", defaultSeverity: "Berat", aliases: ["k3 awal sepatu", "sepatu awal", "sepatu safety"] },
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
  { key: "k3_akhir_first", label: "K3 Akhir - First", defaultSeverity: "Berat", aliases: ["k3 akhir first", "k3 akhir - first", "akhir first"] },
  { key: "k3_akhir_helm", label: "K3 Akhir - Helm", defaultSeverity: "Berat", aliases: ["k3 akhir helm", "k3 akhir - helm", "akhir helm", "helm akhir"] },
  { key: "k3_akhir_sarung_tangan", label: "K3 Akhir - Sarung Tangan", defaultSeverity: "Berat", aliases: ["k3 akhir sarung tangan", "sarung tangan akhir"] },
  { key: "k3_akhir_rompi", label: "K3 Akhir - Rompi", defaultSeverity: "Berat", aliases: ["k3 akhir rompi", "rompi akhir"] },
  { key: "k3_akhir_body_harnes", label: "K3 Akhir - Body Harness", defaultSeverity: "Berat", aliases: ["k3 akhir body harnes", "k3 akhir body harness", "body harnes akhir", "body harness akhir"] },
  { key: "k3_akhir_lengan_panjang", label: "K3 Akhir - Lengan Panjang", defaultSeverity: "Berat", aliases: ["k3 akhir lengan panjang", "lengan panjang akhir"] },
  { key: "k3_akhir_sepatu", label: "K3 Akhir - Sepatu", defaultSeverity: "Berat", aliases: ["k3 akhir sepatu", "sepatu akhir"] },
  { key: "baa", label: "BAA", defaultSeverity: "Sedang", aliases: ["baa", "berita acara aktivasi", "berita acara"] },
  { key: "dw_gudang", label: "DW Gudang", defaultSeverity: "Sedang", aliases: ["dw gudang", "dwgudang", "delivery order", "do gudang"] },
  { key: "lokasi_fat_pelanggan", label: "Lokasi FAT-Pelanggan", defaultSeverity: "Sedang", aliases: ["lokasi fat-pelanggan", "lokasi fat pelanggan", "lokasi fat", "jarak fat", "fat-pelanggan"] },
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

  const findHeader = (keywords: string[]) => {
    const cleanedKeywords = keywords.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""));
    return headers.find((h) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      return cleanedKeywords.some((k) => lower === k || lower.includes(k) || k.includes(lower));
    });
  };

  mapping.tanggalCek = findHeader([
    "tanggalcek", "tglcek", "tglinspeksi", "tglperiksa", "tanggalperiksa", "tanggalinspeksi", "tanggal", "tgl"
  ]);
  mapping.sbu = findHeader(["sbu", "wilayah", "area", "region"]);
  mapping.idPa = findHeader(["idpa", "nopa", "pa", "project", "spk", "noorder", "order"]);
  mapping.tanggalAktivasi = findHeader([
    "tanggalaktivasi", "tglaktivasi", "tglaktif", "tglaktv", "aktivasi", "tglon"
  ]);
  mapping.tanggalPermohonan = findHeader([
    "tanggalpermohonan", "tglpermohonan", "tglmohon", "permohonan"
  ]);
  mapping.mitra = findHeader(["namamitra", "mitra", "vendor", "perusahaan", "rekanan", "pt", "cv"]);
  mapping.petugas = findHeader([
    "petugasmitra", "teknisi", "petugaslapangan", "namapekerja", "namapetugas", "petugas"
  ]);
  mapping.petugasQc = findHeader([
    "petugasqcsbu", "petugasqc", "qcsbu", "qc", "waslak", "pengawas"
  ]);
  mapping.petugasMonitoringPusat = findHeader([
    "petugasmonitoringpusat", "monitoringpusat", "petugasmonitoring", "monitoring", "pusat"
  ]);
  mapping.kp = findHeader(["kp", "kantorperwakilan"]);
  mapping.idFat = findHeader(["idfat", "fat"]);
  mapping.dwGudang = findHeader(["dwgudang", "dw", "gudang"]);
  mapping.lokasiFatPelanggan = findHeader([
    "lokasifatpelanggan", "lokasifat", "fatpelanggan", "lokasipelanggan", "jarakfat"
  ]);

  mapping.jenis = findHeader(["jenistemuan", "jenispelanggaran", "temuan", "pelanggaran", "jenis"]);
  mapping.severity = findHeader(["severity", "tingkat", "kategori", "bobot"]);
  mapping.status = findHeader(["status", "tindaklanjut"]);
  mapping.catatan = findHeader(["catatan", "keterangan", "deskripsi", "notes"]);

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
  if (m1) {
    const y = parseInt(m1[1]);
    const m = parseInt(m1[2]);
    const d = parseInt(m1[3]);
    if (m >= 1 && m <= 12) {
      return `${d} ${months[m - 1]} ${y}`;
    }
  }
  const m2 = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m2) {
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
function isChecklistViolation(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim().toLowerCase();
  if (!str || str === "-" || str === "—" || str === "n/a" || str === "na" || str === "ok") return false;
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
    str.includes("kendor") ||
    str.includes("redaman")
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
      const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
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
    const rawPetugas = String(
      (mapping.petugas && row[mapping.petugas]) ||
      row["Petugas Mitra"] ||
      row["Petugas"] ||
      "Petugas Mitra"
    ).trim();

    const rawPetugasQc =
      mapping.petugasQc && row[mapping.petugasQc]
        ? String(row[mapping.petugasQc]).trim()
        : row["Petugas QC SBU"]
        ? String(row["Petugas QC SBU"]).trim()
        : undefined;

    const rawMonitoringPusat =
      mapping.petugasMonitoringPusat && row[mapping.petugasMonitoringPusat]
        ? String(row[mapping.petugasMonitoringPusat]).trim()
        : row["Petugas Monitoring Pusat"]
        ? String(row["Petugas Monitoring Pusat"]).trim()
        : undefined;

    const rawSbu = String(
      (mapping.sbu && row[mapping.sbu]) ||
      row["SBU"] ||
      row["sbu"] ||
      "SBU Operasional"
    ).trim();

    const rawKp =
      mapping.kp && row[mapping.kp]
        ? String(row[mapping.kp]).trim()
        : row["KP"]
        ? String(row["KP"]).trim()
        : undefined;

    const rawTanggalCek = normalizeDate((mapping.tanggalCek && row[mapping.tanggalCek]) || row["Tanggal Cek"]);
    const rawTanggalAktivasi = normalizeDate((mapping.tanggalAktivasi && row[mapping.tanggalAktivasi]) || row["Tanggal Aktivasi"]);
    const rawTanggalPermohonan = normalizeDate((mapping.tanggalPermohonan && row[mapping.tanggalPermohonan]) || row["Tanggal Permohonan"]);
    const rawIdFat = mapping.idFat && row[mapping.idFat] ? String(row[mapping.idFat]).trim() : row["ID FAT"] ? String(row["ID FAT"]).trim() : undefined;
    const rawDwGudang = mapping.dwGudang && row[mapping.dwGudang] ? String(row[mapping.dwGudang]).trim() : row["DW gudang"] ? String(row["DW gudang"]).trim() : undefined;
    const rawLokasiFatPelanggan = mapping.lokasiFatPelanggan && row[mapping.lokasiFatPelanggan] ? String(row[mapping.lokasiFatPelanggan]).trim() : row["lokasi FAT-Pelanggan"] ? String(row["lokasi FAT-Pelanggan"]).trim() : undefined;

    // Kumpulkan hasil seluruh checklist di baris ini
    const checklistResults: Record<string, string> = {};
    const violationsInRow: typeof matchedChecklistCols = [];

    matchedChecklistCols.forEach((col) => {
      const val = row[col.headerName!];
      const strVal = String(val ?? "").trim();
      checklistResults[col.label] = strVal;

      if (isChecklistViolation(strVal)) {
        violationsInRow.push(col);
      }
    });

    const rowQcK3 = String(row["QC K3"] ?? row["qc k3"] ?? "").trim().toUpperCase();
    const rowQcInst = String(row["QC INSTALASI"] ?? row["qc instalasi"] ?? "").trim().toUpperCase();

    // Jika tidak ada checklist spesifik yang terdeteksi NOK, periksa kolom ringkasan QC K3 / QC INSTALASI dan Remark
    if (violationsInRow.length === 0) {
      const qcK3Val = String(row["QC K3"] || row["qc k3"] || "").trim().toLowerCase();
      const qcInstVal = String(row["QC INSTALASI"] || row["qc instalasi"] || "").trim().toLowerCase();
      const remarkK3 = String(row["Remark k3"] || row["remark k3"] || row["Remark Penampilan"] || row["KET"] || row["Remark"] || "").trim();
      const remarkInst = String(row["Remark Instalasi & DW"] || row["Remark Instalasi"] || row["remark instalasi"] || row["Remark"] || "").trim();

      if (qcK3Val === "nok" || qcK3Val.includes("nok") || (remarkK3 && !remarkK3.toLowerCase().includes("tidak menggunakan s-clam"))) {
        let label = "K3 Awal - Rompi";
        const remLower = remarkK3.toLowerCase();
        if (remLower.includes("helm")) label = "K3 Awal - Helm";
        else if (remLower.includes("sarung")) label = "K3 Awal - Sarung Tangan";
        else if (remLower.includes("lengan")) label = "K3 Awal - Lengan Panjang";
        else if (remLower.includes("sepatu")) label = "K3 Awal - Sepatu";
        else if (remLower.includes("harnes") || remLower.includes("harness")) label = "K3 Awal - Body Harness";
        else if (remLower.includes("rompi")) label = "K3 Awal - Rompi";
        else if (remarkK3) label = remarkK3;

        violationsInRow.push({
          key: "k3_summary",
          label,
          defaultSeverity: "Berat",
          aliases: [],
          headerName: "QC K3",
        });
      }

      if (qcInstVal === "nok" || qcInstVal.includes("nok") || remarkInst) {
        let label = "Instalasi S-Clamp dan Hookclam di Rumah";
        const remLower = remarkInst.toLowerCase();
        if (remLower.includes("redaman") || remLower.includes("opm")) label = "OPM FAT -25 dB";
        else if (remLower.includes("fat")) label = "ID FAT";
        else if (remLower.includes("stiker") || remLower.includes("ont")) label = "Stiker ONT";
        else if (remLower.includes("baa")) label = "BAA";
        else if (remLower.includes("s-clam") || remLower.includes("sclam") || remLower.includes("hookclam")) label = "Instalasi S-Clamp dan Hookclam di Rumah";
        else if (remarkInst) label = remarkInst;

        violationsInRow.push({
          key: "inst_summary",
          label,
          defaultSeverity: "Sedang",
          aliases: [],
          headerName: "QC INSTALASI",
        });
      }
    }

    // Jika ada checklist yang NOK / Temuan, buat tiket pelanggaran untuk tiap item temuan
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
    } else {
      // Jika baris ini semua checklist OK atau data umum inspeksi, tetap catat baris inspeksinya dengan status Closed
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
        jenis: "Inspeksi QC Rutin Material & Jasa",
        severity: "Ringan",
        status: "Closed",
        lokasi: `${rawSbu} · ${rawKp || rawLokasiFatPelanggan || "Area Kerja"}`,
        createdAt: rawTanggalCek !== "—" ? rawTanggalCek : "Hari ini",
        deadline: "1 x 24 jam",
        poin: 0,
        catatan: "Inspeksi QC Material & Jasa telah dilakukan.",
        checklistResults,
        qcK3: rowQcK3,
        qcInstalasi: rowQcInst,
      });
    }
  });

  if (newViolations.length === 0) {
    return { success: false, totalParsed: rows.length, totalImported: 0, errors: ["Tidak ada baris data yang valid untuk diimport."] };
  }

  // Jika replaceAll aktif: kosongkan data demo, gunakan murni data excel yang diunggah
  if (replaceAll) {
    violations.length = 0;
    violations.push(...newViolations);
    mitraList.length = 0;
  } else {
    violations.unshift(...newViolations);
  }

  // Hitung ulang Mitra Scorecard dari data riil Excel
  newViolations.forEach((v) => {
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

  // Simpan ke localStorage
  if (typeof window !== "undefined") {
    try {
      const STORAGE_KEY = "iconguard_custom_violations";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newViolations));
      localStorage.setItem("iconguard_custom_mitra", JSON.stringify(mitraList));
      localStorage.setItem("iconguard_override_all", "true");
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    totalParsed: rows.length,
    totalImported: newViolations.length,
    violations: newViolations,
    mitraList: mitraList,
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
