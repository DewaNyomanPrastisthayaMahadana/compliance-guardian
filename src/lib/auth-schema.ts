import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  text,
  boolean,
  int,
  date,
  json,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const user = mysqlTable(
  "user",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("createdAt", { fsp: 3 }).notNull(),
    updatedAt: timestamp("updatedAt", { fsp: 3 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("user"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("banReason"),
    banExpires: timestamp("banExpires", { fsp: 3 }),
    appRole: varchar("appRole", { length: 50 }).notNull().default("mitra"),
    organization: varchar("organization", { length: 255 }),
    sbu: varchar("sbu", { length: 100 }),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = mysqlTable(
  "session",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    expiresAt: timestamp("expiresAt", { fsp: 3 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt", { fsp: 3 }).notNull(),
    updatedAt: timestamp("updatedAt", { fsp: 3 }).notNull(),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    userId: varchar("userId", { length: 64 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: varchar("impersonatedBy", { length: 64 }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_index").on(table.userId),
  ],
);

export const account = mysqlTable(
  "account",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("accountId", { length: 255 }).notNull(),
    providerId: varchar("providerId", { length: 50 }).notNull(),
    userId: varchar("userId", { length: 64 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { fsp: 3 }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { fsp: 3 }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { fsp: 3 }).notNull(),
    updatedAt: timestamp("updatedAt", { fsp: 3 }).notNull(),
  },
  (table) => [index("account_user_id_index").on(table.userId)],
);

export const verification = mysqlTable(
  "verification",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { fsp: 3 }).notNull(),
    createdAt: timestamp("createdAt", { fsp: 3 }),
    updatedAt: timestamp("updatedAt", { fsp: 3 }),
  },
  (table) => [index("verification_identifier_index").on(table.identifier)],
);

export const authBootstrapGuard = mysqlTable("auth_bootstrap_guard", {
  id: int("id").primaryKey(),
});

export const sbu = mysqlTable("sbu", {
  kode: varchar("kode", { length: 20 }).primaryKey(),
  namaWilayah: varchar("nama_wilayah", { length: 100 }).notNull(),
});

export const mitra = mysqlTable("mitra", {
  id: int("id").primaryKey().autoincrement(),
  namaMitra: varchar("nama_mitra", { length: 150 }).notNull().unique(),
  sbuKode: varchar("sbu_kode", { length: 20 }).notNull().references(() => sbu.kode),
  kontrak: varchar("kontrak", { length: 100 }),
  picNama: varchar("pic_nama", { length: 100 }),
  picEmail: varchar("pic_email", { length: 150 }),
  picTelepon: varchar("pic_telepon", { length: 30 }),
  statusZona: varchar("status_zona", { length: 20 }).notNull().default("Aman"),
  totalPelanggaran: int("total_pelanggaran").notNull().default(0),
  totalPoin: int("total_poin").notNull().default(0),
  extraData: text("extra_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const petugas = mysqlTable("petugas", {
  id: int("id").primaryKey().autoincrement(),
  mitraId: int("mitra_id").notNull().references(() => mitra.id, { onDelete: "cascade" }),
  namaPetugas: varchar("nama_petugas", { length: 150 }).notNull(),
  noTelepon: varchar("no_telepon", { length: 30 }),
  statusAktif: boolean("status_aktif").notNull().default(true),
  totalPelanggaran: int("total_pelanggaran").notNull().default(0),
});

export const inspections = mysqlTable("inspections", {
  id: int("id").primaryKey().autoincrement(),
  uploadId: int("upload_id"),
  idPa: varchar("id_pa", { length: 50 }).notNull(),
  sbuKode: varchar("sbu_kode", { length: 20 }).notNull(),
  mitraId: int("mitra_id").notNull().references(() => mitra.id),
  petugasId: int("petugas_id").references(() => petugas.id),
  namaMitra: varchar("nama_mitra", { length: 150 }).notNull(),
  namaPetugas: varchar("nama_petugas", { length: 150 }).notNull(),
  tanggalCek: date("tanggal_cek", { mode: "string" }),
  tanggalAktivasi: date("tanggal_aktivasi", { mode: "string" }),
  tanggalPermohonan: date("tanggal_permohonan", { mode: "string" }),
  petugasQcSbu: varchar("petugas_qc_sbu", { length: 100 }),
  petugasMonitoringPusat: varchar("petugas_monitoring_pusat", { length: 100 }),
  kp: varchar("kp", { length: 50 }),
  idFat: varchar("id_fat", { length: 50 }),
  dwGudang: int("dw_gudang"),
  lokasiFatPelanggan: int("lokasi_fat_pelanggan"),
  qcK3: varchar("qc_k3", { length: 10 }).default("OK"),
  qcInstalasi: varchar("qc_instalasi", { length: 10 }).default("OK"),
  statusKeseluruhan: varchar("status_keseluruhan", { length: 10 }).notNull().default("OK"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const violations = mysqlTable("violations", {
  id: varchar("id", { length: 50 }).primaryKey(),
  inspectionId: int("inspection_id").references(() => inspections.id),
  idPa: varchar("id_pa", { length: 50 }).notNull(),
  sbuKode: varchar("sbu_kode", { length: 20 }).notNull(),
  mitraId: int("mitra_id").notNull().references(() => mitra.id),
  petugasId: int("petugas_id").references(() => petugas.id),
  namaMitra: varchar("nama_mitra", { length: 150 }).notNull(),
  namaPetugas: varchar("nama_petugas", { length: 150 }).notNull(),
  jenisPelanggaran: varchar("jenis_pelanggaran", { length: 255 }).notNull(),
  kategori: varchar("kategori", { length: 50 }).notNull().default("K3"),
  severity: varchar("severity", { length: 20 }).notNull().default("Sedang"),
  poin: int("poin").notNull().default(5),
  status: varchar("status", { length: 50 }).notNull().default("Open"),
  tanggalCek: date("tanggal_cek", { mode: "string" }),
  deadlineKlarifikasi: date("deadline_klarifikasi", { mode: "string" }),
  catatan: text("catatan"),
  buktiFotoUrls: json("bukti_foto_urls"),
  extraData: text("extra_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const violationChecklists = mysqlTable("violation_checklists", {
  id: int("id").primaryKey().autoincrement(),
  violationId: varchar("violation_id", { length: 50 }).notNull().references(() => violations.id, { onDelete: "cascade" }),
  itemKey: varchar("item_key", { length: 100 }).notNull(),
  itemLabel: varchar("item_label", { length: 255 }).notNull(),
  kategori: varchar("kategori", { length: 50 }).notNull(),
  statusHasil: varchar("status_hasil", { length: 20 }).notNull().default("NOK"),
});

export const clarifications = mysqlTable("clarifications", {
  id: int("id").primaryKey().autoincrement(),
  violationId: varchar("violation_id", { length: 50 }).notNull().references(() => violations.id, { onDelete: "cascade" }),
  submittedByUserId: varchar("submitted_by_user_id", { length: 64 }).references(() => user.id),
  kronologiTindakLanjut: text("kronologi_tindak_lanjut").notNull(),
  dokumenBakUrl: text("dokumen_bak_url"),
  fotoBeforeUrl: text("foto_before_url"),
  fotoAfterUrl: text("foto_after_url"),
  statusVerifikasi: varchar("status_verifikasi", { length: 50 }).notNull().default("Menunggu"),
  catatanQcPln: text("catatan_qc_pln"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const authSchema = {
  user,
  session,
  account,
  verification,
  authBootstrapGuard,
  sbu,
  mitra,
  petugas,
  inspections,
  violations,
  violationChecklists,
  clarifications,
};

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const mitraRelations = relations(mitra, ({ one, many }) => ({
  sbu: one(sbu, { fields: [mitra.sbuKode], references: [sbu.kode] }),
  petugasList: many(petugas),
  violations: many(violations),
}));

export const petugasRelations = relations(petugas, ({ one, many }) => ({
  mitra: one(mitra, { fields: [petugas.mitraId], references: [mitra.id] }),
  violations: many(violations),
}));

export const violationsRelations = relations(violations, ({ one, many }) => ({
  mitra: one(mitra, { fields: [violations.mitraId], references: [mitra.id] }),
  petugas: one(petugas, { fields: [violations.petugasId], references: [petugas.id] }),
  inspection: one(inspections, { fields: [violations.inspectionId], references: [inspections.id] }),
  checklists: many(violationChecklists),
  clarifications: many(clarifications),
}));
