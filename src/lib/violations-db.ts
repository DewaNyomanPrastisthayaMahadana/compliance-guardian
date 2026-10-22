import pg from "pg";
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

let dbPool: pg.Pool | null = null;

function getPool(request?: Request): pg.Pool {
  if (!dbPool) {
    const env = getAuthEnvironment(request);
    if (env.DATABASE_URL) {
      dbPool = new pg.Pool({ connectionString: env.DATABASE_URL });
    } else {
      dbPool = new pg.Pool({
        host: env.PG_HOST || "127.0.0.1",
        port: Number(env.PG_PORT) || 5432,
        user: env.PG_USER || "deditt",
        password: env.PG_PASSWORD || "",
        database: env.PG_DATABASE || "iconguard",
        max: 10,
      });
    }
  }
  return dbPool;
}

async function querySql(sql: string, params: any[] = [], request?: Request): Promise<pg.QueryResult<any>> {
  const pool = getPool(request);
  let idx = 1;
  const pgSql = sql.replace(/\?/g, () => `$${idx++}`);
  return pool.query(pgSql, params);
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
    j.includes("seragam") ||
    j.includes("tampilan")
  ) {
    return "Penampilan";
  }
  return "Instalasi";
}

function parseDateForPostgres(d?: string): string | null {
  if (!d || d === "—" || d === "Hari ini") return null;
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

/**
 * Mengambil semua data pelanggaran dari PostgreSQL.
 */
export async function fetchViolationsFromDb(request?: Request): Promise<Violation[]> {
  try {
    const res = await querySql(`SELECT * FROM violations ORDER BY created_at DESC`, [], request);
    const rows = res.rows;

    if (Array.isArray(rows) && rows.length > 0) {
      const dbViolations: Violation[] = rows.map((r: any) => {
        let extra: any = {};
        if (r.extra_data) {
          try {
            extra = typeof r.extra_data === "string" ? JSON.parse(r.extra_data) : r.extra_data;
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
          sbu: sbuCode,
          lokasi: sbuInfo.label,
          catatan: r.catatan || "",
          bukti: Array.isArray(bukti) ? bukti : [],
          tanggalCek: r.tanggal_cek ? new Date(r.tanggal_cek).toISOString().slice(0, 10) : extra.tanggalCek,
          deadline: r.deadline_klarifikasi ? new Date(r.deadline_klarifikasi).toISOString().slice(0, 10) : extra.deadline,
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
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        };
      });

      const validViolations = dbViolations.filter(isRealViolation);
      inMemoryViolations.length = 0;
      inMemoryViolations.push(...validViolations);
      return validViolations;
    }
  } catch (error) {
    console.error("Gagal mengambil pelanggaran dari PostgreSQL, fallback ke memory:", error);
  }

  return inMemoryViolations.filter(isRealViolation);
}

/**
 * Mengambil daftar mitra dari PostgreSQL.
 */
export async function fetchMitraFromDb(request?: Request): Promise<Mitra[]> {
  try {
    const res = await querySql(`SELECT * FROM mitra ORDER BY nama_mitra ASC`, [], request);
    const rows = res.rows;

    if (Array.isArray(rows) && rows.length > 0) {
      const dbMitra: Mitra[] = rows.map((r: any) => {
        let extra: any = {};
        if (r.extra_data) {
          try {
            extra = typeof r.extra_data === "string" ? JSON.parse(r.extra_data) : r.extra_data;
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
    console.error("Gagal mengambil mitra dari PostgreSQL, fallback ke memory:", error);
  }

  return inMemoryMitraList;
}

/**
 * Menyimpan data hasil import Excel ke PostgreSQL secara permanen.
 */
export async function saveViolationsAndMitraToDb(
  newViolationsList: Violation[],
  newMitraList?: Mitra[],
  replaceAll = true,
  request?: Request,
): Promise<void> {
  const filteredViolations = newViolationsList.filter(isRealViolation);

  // 1. Dapatkan atau buat ID untuk setiap Mitra
  const mitraIdMap = new Map<string, number>();

  const existingMitraRes = await querySql("SELECT id, nama_mitra FROM mitra", [], request);
  if (Array.isArray(existingMitraRes.rows)) {
    for (const row of existingMitraRes.rows) {
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

  // Simpan / update mitra ke PostgreSQL
  for (const [key, m] of mitrasToProcess.entries()) {
    const sbuCode = resolveSbuCode(m.sbu || m.sbuCode);
    const extraData = JSON.stringify({
      skor: m.skor,
      pelanggaranAktif: m.pelanggaranAktif,
      totalPelanggaran: m.totalPelanggaran,
    });

    if (mitraIdMap.has(key)) {
      const existingId = mitraIdMap.get(key)!;
      await querySql(
        `UPDATE mitra SET
           sbu_kode = ?,
           kontrak = ?,
           pic_nama = ?,
           total_pelanggaran = ?,
           total_poin = ?,
           extra_data = ?
         WHERE id = ?`,
        [sbuCode, m.kontrak || null, m.pic || null, m.totalPelanggaran || 0, m.skor ? 100 - m.skor : 0, extraData, existingId],
        request
      );
    } else {
      const insertRes = await querySql(
        `INSERT INTO mitra (
           nama_mitra, sbu_kode, kontrak, pic_nama, status_zona, total_pelanggaran, total_poin, extra_data
         ) VALUES (?, ?, ?, ?, 'Aman', ?, ?, ?)
         RETURNING id`,
        [m.nama, sbuCode, m.kontrak || null, m.pic || null, m.totalPelanggaran || 0, m.skor ? 100 - m.skor : 0, extraData],
        request
      );
      if (insertRes.rows && insertRes.rows[0]) {
        mitraIdMap.set(key, insertRes.rows[0].id);
      }
    }
  }

  // 2. Jika replaceAll, kosongkan tabel violations lama terlebih dahulu
  if (replaceAll) {
    await querySql("DELETE FROM violation_checklists", [], request);
    await querySql("DELETE FROM clarifications", [], request);
    await querySql("DELETE FROM violations", [], request);
  }

  // 3. Simpan data pelanggaran ke PostgreSQL
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
    const tanggalCek = parseDateForPostgres(v.tanggalCek);
    const deadline = parseDateForPostgres(v.deadline);

    await querySql(
      `INSERT INTO violations (
         id, id_pa, sbu_kode, mitra_id, nama_mitra, nama_petugas,
         jenis_pelanggaran, kategori, severity, poin, status,
         tanggal_cek, deadline_klarifikasi, catatan, bukti_foto_urls, extra_data
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         id_pa = EXCLUDED.id_pa,
         sbu_kode = EXCLUDED.sbu_kode,
         mitra_id = EXCLUDED.mitra_id,
         nama_mitra = EXCLUDED.nama_mitra,
         nama_petugas = EXCLUDED.nama_petugas,
         jenis_pelanggaran = EXCLUDED.jenis_pelanggaran,
         kategori = EXCLUDED.kategori,
         severity = EXCLUDED.severity,
         poin = EXCLUDED.poin,
         status = EXCLUDED.status,
         tanggal_cek = EXCLUDED.tanggal_cek,
         deadline_klarifikasi = EXCLUDED.deadline_klarifikasi,
         catatan = EXCLUDED.catatan,
         bukti_foto_urls = EXCLUDED.bukti_foto_urls,
         extra_data = EXCLUDED.extra_data`,
      [
        v.id,
        v.idPa,
        sbuCode,
        mitraId,
        v.mitra,
        v.petugas,
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
      ],
      request
    );
  }

  if (replaceAll) {
    inMemoryViolations.length = 0;
    inMemoryViolations.push(...filteredViolations);
  } else {
    inMemoryViolations.unshift(...filteredViolations);
  }
}

/**
 * Menyimpan 1 tiket temuan baru (dari form Lapor) ke PostgreSQL.
 */
export async function insertSingleViolationToDb(data: any, request?: Request): Promise<Violation> {
  const mitraRows = await querySql(
    "SELECT id FROM mitra WHERE LOWER(nama_mitra) = LOWER(?) LIMIT 1",
    [data.mitra.trim()],
    request
  );
  let mitraId = 1;
  const sbuCode = resolveSbuCode(data.sbu);
  if (Array.isArray(mitraRows.rows) && mitraRows.rows.length > 0) {
    mitraId = mitraRows.rows[0].id;
  } else {
    const ins = await querySql(
      "INSERT INTO mitra (nama_mitra, sbu_kode, status_zona) VALUES (?, ?, 'Aman') RETURNING id",
      [data.mitra, sbuCode],
      request
    );
    mitraId = ins.rows[0].id;
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

  const tanggalCek = parseDateForPostgres(data.tanggalCek);
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 3);
  const deadline = deadlineDate.toISOString().slice(0, 10);

  await querySql(
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
    ],
    request
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
 * Menghapus 1 tiket temuan dari PostgreSQL.
 */
export async function deleteSingleViolationFromDb(id: string, request?: Request): Promise<boolean> {
  await querySql("DELETE FROM violation_checklists WHERE violation_id = ?", [id], request);
  await querySql("DELETE FROM clarifications WHERE violation_id = ?", [id], request);
  const res = await querySql("DELETE FROM violations WHERE id = ?", [id], request);

  const idx = inMemoryViolations.findIndex((v) => v.id === id);
  if (idx >= 0) inMemoryViolations.splice(idx, 1);

  return (res.rowCount || 0) > 0;
}
