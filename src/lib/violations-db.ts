import mysql from "mysql2/promise";
import { getAuthEnvironment } from "@/lib/auth.server";
import {
  type Violation,
  type Mitra,
  type Severity,
  type Status,
  getSbuInfo,
  violations as inMemoryViolations,
  mitraList as inMemoryMitraList,
  isRealViolation,
} from "@/lib/iconguard-data";

let dbPool: mysql.Pool | null = null;

function getPool(request?: Request): mysql.Pool {
  if (!dbPool) {
    const env = getAuthEnvironment(request);
    dbPool = mysql.createPool({
      host: env.MYSQL_HOST || "localhost",
      port: Number(env.MYSQL_PORT) || 3306,
      user: env.MYSQL_USER || "root",
      password: env.MYSQL_PASSWORD || "",
      database: env.MYSQL_DATABASE || "iconguard",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return dbPool;
}

const VALID_SBU_CODES = new Set([
  "01SBU",
  "02SBT",
  "03SBS",
  "04JKT",
  "05JBB",
  "06JTG",
  "07JBT",
  "08BNT",
  "09KAL",
  "10SIBT",
]);

function resolveSbuCode(input?: string): string {
  if (!input) return "01SBU";
  const info = getSbuInfo(input);
  if (VALID_SBU_CODES.has(info.code)) return info.code;
  return "01SBU";
}

function resolveKategori(jenis: string): "K3" | "Penampilan" | "Instalasi" {
  const j = (jenis || "").toLowerCase();
  if (
    j.includes("k3") ||
    j.includes("helm") ||
    j.includes("rompi") ||
    j.includes("sepatu") ||
    j.includes("sarung") ||
    j.includes("harness") ||
    j.includes("harnes") ||
    j.includes("kacamata")
  ) {
    return "K3";
  }
  if (
    j.includes("penampilan") ||
    j.includes("baju") ||
    j.includes("lengan") ||
    j.includes("seragam")
  ) {
    return "Penampilan";
  }
  return "Instalasi";
}

function parseDateForMysql(d?: string | null): string | null {
  if (!d || d === "—" || d === "-") return null;
  const str = String(d).trim();
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  } catch {}
  return null;
}

function formatSqlDate(val: any): string {
  if (!val) return "";
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return String(val);
}

/**
 * Mengambil daftar Pelanggaran langsung dari MySQL.
 * Jika MySQL memiliki data, sinkronkan ke memori server.
 */
export async function fetchViolationsFromDb(request?: Request): Promise<Violation[]> {
  try {
    const pool = getPool(request);
    const [rows]: any = await pool.execute(`
      SELECT * FROM violations ORDER BY created_at DESC
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      const dbViolations: Violation[] = rows.map((r: any) => {
        let extra: any = {};
        if (r.extra_data) {
          try {
            extra = JSON.parse(r.extra_data);
          } catch {}
        }

        let bukti: string[] = [];
        if (r.bukti_foto_urls) {
          try {
            bukti = typeof r.bukti_foto_urls === "string" ? JSON.parse(r.bukti_foto_urls) : r.bukti_foto_urls;
          } catch {}
        }

        const sbuCode = r.sbu_kode || "01SBU";
        const sbuInfo = getSbuInfo(sbuCode);

        return {
          id: r.id,
          idPa: r.id_pa || `PA-${r.id}`,
          mitra: r.nama_mitra || "Mitra",
          petugas: r.nama_petugas || "Petugas",
          jenis: r.jenis_pelanggaran || "Pelanggaran",
          severity: (r.severity as Severity) || "Sedang",
          status: (r.status as Status) || "Open",
          poin: Number(r.poin) || 0,
          catatan: r.catatan || "",
          bukti,
          sbu: sbuCode,
          lokasi: sbuInfo.label,
          tanggalCek: formatSqlDate(r.tanggal_cek) || extra.tanggalCek,
          deadline: formatSqlDate(r.deadline_klarifikasi) || extra.deadline,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          checklistResults: extra.checklistResults,
          qcK3: extra.qcK3,
          qcInstalasi: extra.qcInstalasi,
          kp: extra.kp,
          idFat: extra.idFat,
          dwGudang: extra.dwGudang,
          lokasiFatPelanggan: extra.lokasiFatPelanggan,
          petugasQc: extra.petugasQc,
          petugasMonitoringPusat: extra.petugasMonitoringPusat,
          tanggalAktivasi: extra.tanggalAktivasi,
          tanggalPermohonan: extra.tanggalPermohonan,
        };
      });

      // Sinkronkan memori server
      const filtered = dbViolations.filter(isRealViolation);
      inMemoryViolations.length = 0;
      inMemoryViolations.push(...filtered);

      // Secara otomatis bersihkan temuan non-pelanggaran / DW kabel yang tersimpan di database
      const invalidRows = dbViolations.filter((v) => !isRealViolation(v));
      if (invalidRows.length > 0) {
        const invalidIds = invalidRows.map((v) => v.id);
        void pool.query("DELETE FROM violations WHERE id IN (?)", [invalidIds]).catch(() => {});
      }

      return filtered;
    }
  } catch (error) {
    console.error("Gagal mengambil violations dari MySQL, fallback ke memory:", error);
  }

  return inMemoryViolations;
}

/**
 * Mengambil daftar Mitra langsung dari MySQL.
 */
export async function fetchMitraFromDb(request?: Request): Promise<Mitra[]> {
  try {
    const pool = getPool(request);
    const [rows]: any = await pool.execute(`
      SELECT * FROM mitra ORDER BY nama_mitra ASC
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      const dbMitra: Mitra[] = rows.map((r: any) => {
        let extra: any = {};
        if (r.extra_data) {
          try {
            extra = JSON.parse(r.extra_data);
          } catch {}
        }
        const sbuCode = r.sbu_kode || "01SBU";
        const sbuInfo = getSbuInfo(sbuCode);

        return {
          nama: r.nama_mitra,
          kontrak: r.kontrak || "KTR-2026-001",
          pic: r.pic_nama || "PIC Mitra",
          skor: typeof extra.skor === "number" ? extra.skor : Math.max(0, 100 - (Number(r.total_poin) || 0)),
          pelanggaranAktif: Number(r.total_pelanggaran) || 0,
          totalPelanggaran: Number(r.total_pelanggaran) || 0,
          sbu: sbuCode,
          sbuCode,
          sbuLabel: sbuInfo.label,
        };
      });

      inMemoryMitraList.length = 0;
      inMemoryMitraList.push(...dbMitra);
      return dbMitra;
    }
  } catch (error) {
    console.error("Gagal mengambil mitra dari MySQL, fallback ke memory:", error);
  }

  return inMemoryMitraList;
}

/**
 * Menyimpan data hasil import Excel ke MySQL secara permanen.
 */
export async function saveViolationsAndMitraToDb(
  newViolationsList: Violation[],
  newMitraList?: Mitra[],
  replaceAll = true,
  request?: Request,
): Promise<void> {
  const pool = getPool(request);
  const filteredViolations = newViolationsList.filter(isRealViolation);

  // 1. Dapatkan atau buat ID untuk setiap Mitra
  const mitraIdMap = new Map<string, number>();

  // Muat mitra yang ada di database
  const [existingMitraRows]: any = await pool.execute("SELECT id, nama_mitra FROM mitra");
  if (Array.isArray(existingMitraRows)) {
    for (const row of existingMitraRows) {
      mitraIdMap.set(String(row.nama_mitra).trim().toLowerCase(), row.id);
    }
  }

  // Jika ada newMitraList atau mitra baru dari pelanggaran, pastikan tersimpan di DB
  const mitrasToProcess = new Map<string, Mitra>();
  if (newMitraList && newMitraList.length > 0) {
    for (const m of newMitraList) {
      mitrasToProcess.set(m.nama.trim().toLowerCase(), m);
    }
  }
  for (const v of filteredViolations) {
    const key = v.mitra.trim().toLowerCase();
    if (!mitrasToProcess.has(key)) {
      mitrasToProcess.set(key, {
        nama: v.mitra,
        kontrak: `KTR-2026-${String(mitraIdMap.size + 1).padStart(3, "0")}`,
        pic: v.petugas || "PIC Mitra",
        skor: 100,
        pelanggaranAktif: 0,
        totalPelanggaran: 0,
        sbu: v.sbu,
      });
    }
  }

  // Simpan / update mitra ke MySQL
  for (const [key, m] of mitrasToProcess.entries()) {
    const sbuCode = resolveSbuCode(m.sbu || m.sbuCode);
    const extraData = JSON.stringify({
      skor: m.skor,
      pelanggaranAktif: m.pelanggaranAktif,
      totalPelanggaran: m.totalPelanggaran,
    });

    if (mitraIdMap.has(key)) {
      const existingId = mitraIdMap.get(key)!;
      await pool.execute(
        `UPDATE mitra SET
           sbu_kode = ?,
           kontrak = ?,
           pic_nama = ?,
           total_pelanggaran = ?,
           total_poin = ?,
           extra_data = ?
         WHERE id = ?`,
        [sbuCode, m.kontrak || null, m.pic || null, m.totalPelanggaran || 0, m.skor ? 100 - m.skor : 0, extraData, existingId]
      );
    } else {
      const [insertRes]: any = await pool.execute(
        `INSERT INTO mitra (
           nama_mitra, sbu_kode, kontrak, pic_nama, status_zona, total_pelanggaran, total_poin, extra_data
         ) VALUES (?, ?, ?, ?, 'Aman', ?, ?, ?)`,
        [m.nama, sbuCode, m.kontrak || null, m.pic || null, m.totalPelanggaran || 0, m.skor ? 100 - m.skor : 0, extraData]
      );
      mitraIdMap.set(key, insertRes.insertId);
    }
  }

  // 2. Jika replaceAll, kosongkan tabel violations lama terlebih dahulu
  if (replaceAll) {
    // Hapus checklist dan klarifikasi terkait jika ada
    await pool.execute("DELETE FROM violation_checklists");
    await pool.execute("DELETE FROM clarifications");
    await pool.execute("DELETE FROM violations");
  }

  // 3. Simpan data pelanggaran ke MySQL
  for (const v of filteredViolations) {
    const mitraKey = v.mitra.trim().toLowerCase();
    const mitraId = mitraIdMap.get(mitraKey) || 1;
    const sbuCode = resolveSbuCode(v.sbu || v.lokasi);
    const kategori = resolveKategori(v.jenis);
    const severity = (["Ringan", "Sedang", "Berat"].includes(v.severity) ? v.severity : "Sedang") as Severity;
    const status = (["Open", "Pending Klarifikasi", "Verifikasi", "Closed", "Overdue"].includes(v.status) ? v.status : "Open") as Status;

    const extraData = JSON.stringify({
      checklistResults: v.checklistResults,
      qcK3: v.qcK3,
      qcInstalasi: v.qcInstalasi,
      kp: v.kp,
      idFat: v.idFat,
      dwGudang: v.dwGudang,
      lokasiFatPelanggan: v.lokasiFatPelanggan,
      petugasQc: v.petugasQc,
      petugasMonitoringPusat: v.petugasMonitoringPusat,
      tanggalAktivasi: v.tanggalAktivasi,
      tanggalPermohonan: v.tanggalPermohonan,
      tanggalCek: v.tanggalCek,
      deadline: v.deadline,
    });

    const buktiJson = JSON.stringify(v.bukti || []);
    const tanggalCek = parseDateForMysql(v.tanggalCek);
    const deadline = parseDateForMysql(v.deadline);

    await pool.execute(
      `INSERT INTO violations (
         id, id_pa, sbu_kode, mitra_id, nama_mitra, nama_petugas,
         jenis_pelanggaran, kategori, severity, poin, status,
         tanggal_cek, deadline_klarifikasi, catatan, bukti_foto_urls, extra_data
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id_pa = VALUES(id_pa),
         sbu_kode = VALUES(sbu_kode),
         mitra_id = VALUES(mitra_id),
         nama_mitra = VALUES(nama_mitra),
         nama_petugas = VALUES(nama_petugas),
         jenis_pelanggaran = VALUES(jenis_pelanggaran),
         kategori = VALUES(kategori),
         severity = VALUES(severity),
         poin = VALUES(poin),
         status = VALUES(status),
         tanggal_cek = VALUES(tanggal_cek),
         deadline_klarifikasi = VALUES(deadline_klarifikasi),
         catatan = VALUES(catatan),
         bukti_foto_urls = VALUES(bukti_foto_urls),
         extra_data = VALUES(extra_data)`,
      [
        v.id,
        v.idPa,
        sbuCode,
        mitraId,
        v.mitra,
        v.petugas || "Petugas Lapangan",
        v.jenis,
        kategori,
        severity,
        v.poin,
        status,
        tanggalCek,
        deadline,
        v.catatan || "",
        buktiJson,
        extraData,
      ]
    );
  }

  // 4. Sinkronkan juga memori RAM agar request saat ini langsung mendapatkan data baru
  if (replaceAll) {
    inMemoryViolations.length = 0;
    inMemoryViolations.push(...filteredViolations);
    if (newMitraList && newMitraList.length > 0) {
      inMemoryMitraList.length = 0;
      inMemoryMitraList.push(...newMitraList);
    }
  } else {
    inMemoryViolations.unshift(...filteredViolations);
  }
}

/**
 * Menyimpan 1 tiket temuan baru (dari form Lapor) ke MySQL.
 */
export async function insertSingleViolationToDb(data: any, request?: Request): Promise<Violation> {
  const pool = getPool(request);

  // Dapatkan atau buat mitra
  const [mitraRows]: any = await pool.execute(
    "SELECT id FROM mitra WHERE LOWER(nama_mitra) = LOWER(?) LIMIT 1",
    [data.mitra.trim()]
  );
  let mitraId = 1;
  const sbuCode = resolveSbuCode(data.sbu);
  if (Array.isArray(mitraRows) && mitraRows.length > 0) {
    mitraId = mitraRows[0].id;
  } else {
    const [ins]: any = await pool.execute(
      "INSERT INTO mitra (nama_mitra, sbu_kode, status_zona) VALUES (?, ?, 'Aman')",
      [data.mitra, sbuCode]
    );
    mitraId = ins.insertId;
  }

  const id = `VIO-${sbuCode}-${Date.now().toString().slice(-4)}`;
  const kategori = resolveKategori(data.jenis);
  const severity = data.severity || "Sedang";
  const poin = typeof data.poin === "number" ? data.poin : severity === "Berat" ? 10 : severity === "Sedang" ? 5 : 2;
  const status = data.status || "Open";

  const extraData = JSON.stringify({
    checklistResults: data.checklistResults,
    qcK3: data.qcK3,
    qcInstalasi: data.qcInstalasi,
    kp: data.kp,
    idFat: data.idFat,
    dwGudang: data.dwGudang,
    lokasiFatPelanggan: data.lokasiFatPelanggan,
    petugasQc: data.petugasQc,
    petugasMonitoringPusat: data.petugasMonitoringPusat,
    tanggalAktivasi: data.tanggalAktivasi,
    tanggalPermohonan: data.tanggalPermohonan,
    tanggalCek: data.tanggalCek,
  });

  const tanggalCek = parseDateForMysql(data.tanggalCek);
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 3);
  const deadline = deadlineDate.toISOString().slice(0, 10);

  await pool.execute(
    `INSERT INTO violations (
       id, id_pa, sbu_kode, mitra_id, nama_mitra, nama_petugas,
       jenis_pelanggaran, kategori, severity, poin, status,
       tanggal_cek, deadline_klarifikasi, catatan, bukti_foto_urls, extra_data
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.idPa,
      sbuCode,
      mitraId,
      data.mitra,
      data.petugas,
      data.jenis,
      kategori,
      severity,
      poin,
      status,
      tanggalCek,
      deadline,
      data.catatan || "",
      JSON.stringify(data.bukti || []),
      extraData,
    ]
  );

  const newViolation: Violation = {
    id,
    idPa: data.idPa,
    mitra: data.mitra,
    petugas: data.petugas,
    petugasQc: data.petugasQc,
    petugasMonitoringPusat: data.petugasMonitoringPusat,
    sbu: sbuCode,
    tanggalCek: data.tanggalCek,
    tanggalAktivasi: data.tanggalAktivasi,
    tanggalPermohonan: data.tanggalPermohonan,
    kp: data.kp,
    idFat: data.idFat,
    dwGudang: data.dwGudang,
    lokasiFatPelanggan: data.lokasiFatPelanggan,
    jenis: data.jenis,
    severity,
    status,
    lokasi: getSbuInfo(sbuCode).label,
    createdAt: new Date().toISOString(),
    deadline,
    poin,
    catatan: data.catatan || "",
    bukti: data.bukti || [],
    checklistResults: data.checklistResults,
    qcK3: data.qcK3,
    qcInstalasi: data.qcInstalasi,
  };

  inMemoryViolations.unshift(newViolation);
  return newViolation;
}

/**
 * Menghapus 1 tiket temuan dari MySQL.
 */
export async function deleteSingleViolationFromDb(id: string, request?: Request): Promise<boolean> {
  const pool = getPool(request);
  await pool.execute("DELETE FROM violation_checklists WHERE violation_id = ?", [id]);
  await pool.execute("DELETE FROM clarifications WHERE violation_id = ?", [id]);
  const [res]: any = await pool.execute("DELETE FROM violations WHERE id = ?", [id]);

  const idx = inMemoryViolations.findIndex((v) => v.id === id);
  if (idx >= 0) inMemoryViolations.splice(idx, 1);

  return res.affectedRows > 0;
}
