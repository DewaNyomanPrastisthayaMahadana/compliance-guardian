import { relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  serial,
  date,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "user",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    role: varchar("role", { length: 50 }).notNull().default("user"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("banReason"),
    banExpires: timestamp("banExpires"),
    appRole: varchar("appRole", { length: 50 }).notNull().default("mitra"),
    organization: varchar("organization", { length: 255 }),
    sbu: varchar("sbu", { length: 100 }),
    status: varchar("status", { length: 20 }).notNull().default("aktif"),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
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

export const account = pgTable(
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
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [index("account_user_id_index").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [index("verification_identifier_index").on(table.identifier)],
);

export const authBootstrapGuard = pgTable("auth_bootstrap_guard", {
  id: integer("id").primaryKey(),
});

export const sbu = pgTable("sbu", {
  kode: varchar("kode", { length: 20 }).primaryKey(),
  namaWilayah: varchar("nama_wilayah", { length: 100 }).notNull(),
});

export const mitra = pgTable("mitra", {
  id: serial("id").primaryKey(),
  namaMitra: varchar("nama_mitra", { length: 150 }).notNull().unique(),
  sbuKode: varchar("sbu_kode", { length: 20 }).notNull().references(() => sbu.kode),
  kontrak: varchar("kontrak", { length: 100 }),
  picNama: varchar("pic_nama", { length: 100 }),
  picEmail: varchar("pic_email", { length: 150 }),
  picTelepon: varchar("pic_telepon", { length: 30 }),
  statusZona: varchar("status_zona", { length: 20 }).notNull().default("Aman"),
  totalPelanggaran: integer("total_pelanggaran").notNull().default(0),
  totalPoin: integer("total_poin").notNull().default(0),
  extraData: text("extra_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const petugas = pgTable("petugas", {
  id: serial("id").primaryKey(),
  mitraId: integer("mitra_id").notNull().references(() => mitra.id, { onDelete: "cascade" }),
  namaPetugas: varchar("nama_petugas", { length: 150 }).notNull(),
  noTelepon: varchar("no_telepon", { length: 30 }),
  statusAktif: boolean("status_aktif").notNull().default(true),
  totalPelanggaran: integer("total_pelanggaran").notNull().default(0),
});

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id"),
  idPa: varchar("id_pa", { length: 50 }).notNull(),
  sbuKode: varchar("sbu_kode", { length: 20 }).notNull(),
  mitraId: integer("mitra_id").notNull().references(() => mitra.id),
  petugasId: integer("petugas_id").references(() => petugas.id),
  namaMitra: varchar("nama_mitra", { length: 150 }).notNull(),
  namaPetugas: varchar("nama_petugas", { length: 150 }).notNull(),
  tanggalCek: date("tanggal_cek", { mode: "string" }),
  tanggalAktivasi: date("tanggal_aktivasi", { mode: "string" }),
  tanggalPermohonan: date("tanggal_permohonan", { mode: "string" }),
  petugasQcSbu: varchar("petugas_qc_sbu", { length: 100 }),
  petugasMonitoringPusat: varchar("petugas_monitoring_pusat", { length: 100 }),
  kp: varchar("kp", { length: 50 }),
  idFat: varchar("id_fat", { length: 50 }),
  dwGudang: integer("dw_gudang"),
  lokasiFatPelanggan: integer("lokasi_fat_pelanggan"),
  qcK3: varchar("qc_k3", { length: 10 }).default("OK"),
  qcInstalasi: varchar("qc_instalasi", { length: 10 }).default("OK"),
  statusKeseluruhan: varchar("status_keseluruhan", { length: 10 }).notNull().default("OK"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const violations = pgTable("violations", {
  id: varchar("id", { length: 50 }).primaryKey(),
  inspectionId: integer("inspection_id").references(() => inspections.id),
  idPa: varchar("id_pa", { length: 50 }).notNull(),
  sbuKode: varchar("sbu_kode", { length: 20 }).notNull(),
  mitraId: integer("mitra_id").notNull().references(() => mitra.id),
  petugasId: integer("petugas_id").references(() => petugas.id),
  namaMitra: varchar("nama_mitra", { length: 150 }).notNull(),
  namaPetugas: varchar("nama_petugas", { length: 150 }).notNull(),
  jenisPelanggaran: varchar("jenis_pelanggaran", { length: 255 }).notNull(),
  kategori: varchar("kategori", { length: 50 }).notNull().default("K3"),
  severity: varchar("severity", { length: 20 }).notNull().default("Sedang"),
  poin: integer("poin").notNull().default(5),
  status: varchar("status", { length: 50 }).notNull().default("Open"),
  tanggalCek: date("tanggal_cek", { mode: "string" }),
  deadlineKlarifikasi: date("deadline_klarifikasi", { mode: "string" }),
  catatan: text("catatan"),
  buktiFotoUrls: jsonb("bukti_foto_urls"),
  extraData: text("extra_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const violationChecklists = pgTable("violation_checklists", {
  id: serial("id").primaryKey(),
  violationId: varchar("violation_id", { length: 50 }).notNull().references(() => violations.id, { onDelete: "cascade" }),
  itemKey: varchar("item_key", { length: 100 }).notNull(),
  itemLabel: varchar("item_label", { length: 255 }).notNull(),
  kategori: varchar("kategori", { length: 50 }).notNull(),
  statusHasil: varchar("status_hasil", { length: 20 }).notNull().default("NOK"),
});

export const clarifications = pgTable("clarifications", {
  id: serial("id").primaryKey(),
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
