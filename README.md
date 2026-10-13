# Compliance Guardian

PROPOSAL PENGEMBANGAN SISTEM

IconGuard: Mitra & Material Compliance System

Divisi Material dan Jasa — PT PLN Icon Plus

1. Eksekutif Ringkasan (Executive Summary)

Pengawasan dan pengendalian kinerja mitra serta petugas lapangan di bagian Material dan Jasa merupakan aspek krusial dalam menjaga standar operasional dan kualitas layanan PLN Icon Plus. IconGuard dirancang sebagai sistem pemantauan, pencatatan pelanggaran, dan pengingat (reminder) otomatis terintegrasi. Sistem ini menjamin transparansi, mempercepat respons tindak lanjut perbaikan (corrective action), serta menyediakan data evaluasi performa mitra secara real-time.

2. Tujuan Proyek

Digitalisasi Pengawasan: Menggantikan proses pencatatan dan teguran manual menjadi tersentralisasi berbasis web.

Otomatisasi Reminder & Sanksi: Mengirimkan peringatan dini (reminder) otomatis melalui Multi-Channel (WhatsApp & Email) kepada mitra dan petugas lapangan sebelum dan sesudah batas waktu klarifikasi.

Akuntabilitas & Transparansi: Menyediakan portal self-service bagi mitra untuk memberikan klarifikasi serta bukti perbaikan.

Data-Driven Decision: Menyediakan Mitra Compliance Scorecard untuk mempermudah evaluasi perpanjangan kontrak atau pengenalan sanksi oleh Manajemen PLN Icon Plus.

3. Matriks Pengguna & Hak Akses (User Role Matrix)

Role PenggunaTanggung Jawab & Fitur UtamaAdmin Internal (Material & Jasa)Input laporan pelanggaran, upload bukti, tentukan deadline klarifikasi, verifikasi tindak lanjut mitra, kelola master data & poin sanksi.Management / Management PLNAkses dashboard analytic, melihat compliance rating seluruh mitra, mengunduh laporan eksekutif (PDF/Excel).PIC / Admin MitraMenerima notifikasi teguran, mengunggah Berita Acara Klarifikasi (BAK) & bukti perbaikan lapangan, memantau riwayat skor kepatuhan perusahaan.Petugas Lapangan MitraMenerima notifikasi pengingat/teguran individu via WhatsApp/Email, melihat status kepatuhan pribadi.

4. Spesifikasi Fitur Utama (Core Modules)

Module 1: Executive Dashboard & Analytics

Real-time KPI Widget: Total pelanggaran aktif, laporan pending, laporan closed, dan tingkat kepatuhan rata-rata (%).

Mitra Leaderboard & Rating: Ranking kepatuhan mitra (Zone Hijau/Kuning/Merah).

Interactive Charts: Trend pelanggaran bulanan, jenis pelanggaran dominan (APD, keterlambatan material, kelengkapan berkas, dsb.).

Module 2: Violation & Incident Management

Form Input Pelanggaran Mobile-Friendly: Fleksibel digunakan di PC maupun Smartphone oleh petugas lapangan/supervisor internal.

Fitur Input: Dropdown Mitra, Dropdown Petugas, Jenis Pelanggaran (Ringan/Sedang/Berat), Geolocation, dan Multi-Upload Bukti Foto.

Auto SLA & Deadline Engine: Penentuan batas waktu klarifikasi otomatis berdasarkan kategori pelanggaran (misal: Berat = 1x24 jam, Sedang = 3x24 jam).

Module 3: Multi-Channel Automated Reminder Engine

WhatsApp & Email Integration: Notifikasi otomatis terkirim langsung saat laporan dibuat.

Cron-Job Escalation:

T-24 Jam: Pengingat batas waktu klarifikasi.

Overdue Notification: Eskalasi peringatan ke level manajemen mitra & internal jika melewati batas waktu.

Module 4: Partner Clarification & Action Portal

Form khusus mitra untuk mengunggah dokumen balasan, foto before-after perbaikan, dan Berita Acara.

Audit Trail & Chat History: Log komunikasi transparan antara tim Material & Jasa dengan pihak Mitra pada setiap tiket pelanggaran.

5. Rekomendasi Arsitektur Teknologi (Tech Stack)

Plaintext

[ FRONTEND ] ──────────► [ BACKEND REST API ] ──────────► [ DATABASE ]
React.js / Next.js       Node.js (NestJS/Express)         PostgreSQL / MySQL
Tailwind CSS             JWT Authentication              Redis (Queue/Reminders)
Ant Design UI            Nodemailer & WA Gateway API


6. Standar Branding & UI/UX (PLN Icon Plus Guidelines)

Skema Warna:

Primary Color: #005B9A (PLN Blue)

Secondary/Accent: #00A8B5 (Icon Plus Cyan)

Status Color: Red #E53E3E (Critical Violation), Amber #D69E2E (Pending Action), Green #38A169(Compliant/Resolved).

Typography: Modern Sans-Serif (Inter / Plus Jakarta Sans).

7. Rencana Tahapan Pengenalan & Pengembangan (Timeline Project)

Plaintext

Phase 1: Analysis & Design (Waktu: Week 1 - 2)
 ├── Requirement Gathering & Finalisasi Workflow
 └── Wireframing UI/UX & Database Schema Design

Phase 2: Core Development (Waktu: Week 3 - 6)
 ├── Frontend & Backend API Development
 ├── Integrasi Database & Multi-role Auth
 └── Integrasi WhatsApp & Email Gateway (Reminder Engine)

Phase 3: Testing & Deployment (Waktu: Week 7 - 8)
 ├── User Acceptance Testing (UAT) Internal Material & Jasa
 ├── Bug Fixing & Security Hardening
 └── Server Deployment (Cloud / Infrastructure PLN) & Training Mitra

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/23ec686b-e51c-4242-b923-e274c6a31455).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Authentication and Cloudflare D1

Authentication uses Better Auth with email/password and Cloudflare D1. Public sign-up is disabled. The first Super Admin is created once from `/login` using `SUPER_ADMIN_SETUP_TOKEN`; afterward, that Super Admin creates Admin, Mitra, and Petugas Mitra accounts. Roles are stored in the D1 `user.appRole` field and checked on the server. Passwords must contain at least 12 characters.

For local development, copy `.dev.vars.example` to `.dev.vars`, then set `BETTER_AUTH_SECRET` and `SUPER_ADMIN_SETUP_TOKEN` to random values of at least 32 characters. Generate them with `openssl rand -base64 32` and `openssl rand -hex 32`. Keep `.dev.vars` private; it is ignored by Git.

The project uses the D1 binding named `DB` in `wrangler.jsonc`. Apply the existing D1 migrations locally with `npx wrangler d1 migrations apply iconguard --local`, then run `npm run dev:database`. This builds the Cloudflare Worker and starts it with Wrangler at `http://localhost:8080`.

For a Cloudflare deployment, create or select the D1 database named `iconguard`, replace the placeholder `database_id` in `wrangler.jsonc` with its real ID, and apply migrations with `npx wrangler d1 migrations apply iconguard --remote`. Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `SUPER_ADMIN_SETUP_TOKEN` as Worker secrets/variables. On first login, use the setup token to create the Super Admin; remove the token after bootstrap.

`drizzle/migrations/0001`–`0003` are the SQLite/D1 migrations. The PostgreSQL-only migration is kept separately under `drizzle/migrations-postgres/` and must not be applied to D1.
