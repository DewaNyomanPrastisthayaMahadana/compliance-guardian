import { createFileRoute, Link } from "@tanstack/react-router";
import { requireRouteAccess } from "@/lib/auth-server";
import {
  CircleHelp,
  Search,
  ShieldCheck,
  HardHat,
  Shirt,
  Cable,
  Award,
  FileSpreadsheet,
  MessageSquareShare,
  UsersRound,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusPill } from "@/components/status-pill";

export const Route = createFileRoute("/faq")({
  beforeLoad: () => requireRouteAccess("/faq"),
  head: () => ({
    meta: [
      { title: "FAQ & Panduan Sistem — IconGuard" },
      {
        name: "description",
        content:
          "Pusat bantuan dan pertanyaan yang sering diajukan (FAQ) seputar sistem pemantauan kepatuhan mitra IconGuard PT PLN Icon Plus.",
      },
      { property: "og:title", content: "FAQ & Panduan Sistem — IconGuard" },
      {
        property: "og:description",
        content:
          "Panduan lengkap kategori K3, Penampilan, QC Instalasi, perhitungan Scorecard Mitra, dan Portal Klarifikasi.",
      },
    ],
  }),
  component: FaqPage,
});

type FaqCategory =
  | "semua"
  | "umum"
  | "kategori"
  | "scorecard"
  | "klarifikasi"
  | "data";

interface FaqItem {
  id: string;
  category: Exclude<FaqCategory, "semua">;
  categoryLabel: string;
  question: string;
  answer: string;
  bullets?: string[];
}

const faqCategories: { id: FaqCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "semua", label: "Semua Topik", icon: CircleHelp },
  { id: "umum", label: "Umum & Akses", icon: UsersRound },
  { id: "kategori", label: "K3, Penampilan & Instalasi", icon: HardHat },
  { id: "scorecard", label: "Scorecard & Zona Mitra", icon: Award },
  { id: "klarifikasi", label: "Klarifikasi & Status Tiket", icon: MessageSquareShare },
  { id: "data", label: "Import & Export Data", icon: FileSpreadsheet },
];

const faqItems: FaqItem[] = [
  {
    id: "umum-1",
    category: "umum",
    categoryLabel: "Umum & Akses",
    question: "Apa itu sistem IconGuard (Mitra & Material Compliance System)?",
    answer:
      "IconGuard adalah platform pemantauan kepatuhan mitra milik Divisi Material dan Jasa PT PLN Icon Plus. Sistem ini dirancang untuk mencatat temuan pelanggaran lapangan (K3, Penampilan, dan Kualitas Instalasi), memantau evaluasi performa mitra maupun petugas per SBU, serta memfasilitasi proses klarifikasi dan tindak lanjut perbaikan secara transparan.",
  },
  {
    id: "umum-2",
    category: "umum",
    categoryLabel: "Umum & Akses",
    question: "Apa perbedaan hak akses antara Super Admin, Mitra, dan Petugas Mitra?",
    answer:
      "Setiap pengguna memiliki hak akses halaman yang disesuaikan dengan perannya di dalam sistem:",
    bullets: [
      "Super Admin (PLN Icon Plus · Material & Jasa): Memiliki akses penuh ke seluruh halaman (Dashboard Eksekutif, Input Laporan, Daftar Pelanggaran, Import Excel, Scorecard Mitra, Portal Klarifikasi, dan Buat Akun).",
      "Mitra (PIC Perusahaan Mitra): Dapat mengakses halaman Scorecard Mitra khusus perusahaannya sendiri, memantau rincian pelanggaran petugas di bawah perusahaannya, serta mengunggah klarifikasi di Portal Klarifikasi.",
      "Petugas Mitra: Fokus mengakses Portal Klarifikasi untuk melihat temuan pelanggaran terkait dan mengunggah bukti perbaikan lapangan.",
    ],
  },
  {
    id: "umum-3",
    category: "umum",
    categoryLabel: "Umum & Akses",
    question: "Bagaimana cara mendaftarkan akun baru untuk PIC Mitra atau Petugas?",
    answer:
      "Pembuatan akun dilakukan secara terpusat oleh Super Admin melalui menu 'Buat Akun' (/buat-akun) dan dapat ditinjau atau dikelola melalui menu 'Data Akun' (/data-akun). Super Admin cukup mengisi nama pengguna, alamat email, kata sandi, memilih Role (Super Admin, Mitra, atau Petugas Mitra), serta menentukan nama organisasi/perusahaan mitra terkait.",
  },
  {
    id: "kategori-1",
    category: "kategori",
    categoryLabel: "K3, Penampilan & Instalasi",
    question: "Apa perbedaan antara kategori pelanggaran K3, Penampilan, dan QC Instalasi?",
    answer:
      "Di dalam sistem IconGuard, pemeriksaan lapangan dibagi menjadi tiga kelompok utama pada tahap Pemeriksaan Awal dan Pemeriksaan Akhir:",
    bullets: [
      "Kategori K3 (Keselamatan & Kesehatan Kerja): Meliputi kelengkapan Alat Pelindung Diri (APD) utama, yaitu Helm Safety, Safety Belt / Full Body Harness, Sepatu Safety, dan kelayakan Tangga.",
      "Kategori Penampilan: Meliputi kerapian dan atribut seragam kerja di lapangan, yaitu penggunaan Baju Lengan Panjang (Penampilan Awal & Akhir) serta Rompi Kerja.",
      "Kategori QC Instalasi & Material: Meliputi kualitas teknis pemasangan di lapangan seperti kerapian tarikan kabel dropcore, pemasangan aksesoris pada tiang/FAT, pelabelan kabel, dan standar redaman optik.",
    ],
  },
  {
    id: "kategori-2",
    category: "kategori",
    categoryLabel: "K3, Penampilan & Instalasi",
    question: "Mengapa item 'Lengan Panjang' masuk ke dalam kategori Penampilan dan bukan K3?",
    answer:
      "Berdasarkan standarisasi terbaru pada evaluasi lapangan, atribut pakaian kerja berupa Lengan Panjang dan Rompi dikelompokkan ke dalam aspek 'Penampilan' (Penampilan Awal - Lengan Panjang & Penampilan Akhir - Lengan Panjang), sedangkan kategori K3 difokuskan murni pada alat pelindung keselamatan kerja berisiko tinggi (Helm, Safety Belt, Sepatu Safety, dan Tangga).",
  },
  {
    id: "kategori-3",
    category: "kategori",
    categoryLabel: "K3, Penampilan & Instalasi",
    question: "Bagaimana cara menginput laporan pelanggaran baru secara manual?",
    answer:
      "Super Admin dapat menekan tombol '+ Input Pelanggaran' di halaman Dashboard atau halaman Daftar Pelanggaran. Pada formulir input, pilih SBU Regional, Nama Mitra, Nama Petugas, ID PA ICRM, tanggal pemeriksaan, lalu centang item checklist K3, Penampilan, atau Instalasi yang tidak sesuai standar, serta lampirkan foto bukti temuan lapangan.",
  },
  {
    id: "scorecard-1",
    category: "scorecard",
    categoryLabel: "Scorecard & Zona Mitra",
    question: "Bagaimana cara perhitungan poin pelanggaran dan penentuan Tingkat Keparahan (Ringan, Sedang, Berat)?",
    answer:
      "Setiap tiket pelanggaran memiliki bobot poin berdasarkan tingkat keparahan dan jumlah item ketidakpatuhan yang ditemukan pada pemeriksaan QC:",
    bullets: [
      "Pelanggaran Ringan: Dikenakan pada ketidakpatuhan minor (contoh: atribut penampilan atau catatan kerapian ringan) dengan bobot poin rendah.",
      "Pelanggaran Sedang: Dikenakan apabila terdapat beberapa item ketidakpatuhan sekaligus pada satu ID PA atau pelanggaran prosedur menengah.",
      "Pelanggaran Berat: Dikenakan pada kelalaian K3 kritikal (seperti bekerja di ketinggian tanpa Safety Belt / Helm) atau temuan berulang yang membahayakan keselamatan kerja.",
    ],
  },
  {
    id: "scorecard-2",
    category: "scorecard",
    categoryLabel: "Scorecard & Zona Mitra",
    question: "Apa arti dari Zona Hijau, Zona Kuning, dan Zona Merah pada Scorecard Mitra?",
    answer:
      "Zona Kepatuhan digunakan untuk mengelompokkan profil risiko masing-masing perusahaan mitra berdasarkan akumulasi poin pelanggaran:",
    bullets: [
      "Zona Hijau (< 15 Poin): Kepatuhan mitra berada dalam kategori Baik / Aman. Tetap dilakukan pemantauan rutin.",
      "Zona Kuning (15 – 29 Poin): Kategori Peringatan / Pembinaan. Mitra perlu segera melakukan evaluasi internal dan menyelesaikan tiket klarifikasi yang terbuka.",
      "Zona Merah (≥ 30 Poin): Kategori Kritis / Evaluasi Khusus. Menandakan tingginya angka pelanggaran sehingga memerlukan pemanggilan klarifikasi manajemen mitra dan tindakan tegas.",
    ],
  },
  {
    id: "scorecard-3",
    category: "scorecard",
    categoryLabel: "Scorecard & Zona Mitra",
    question: "Bagaimana cara melihat daftar petugas yang melanggar maupun yang patuh di setiap mitra?",
    answer:
      "Buka menu 'Scorecard Mitra' (/mitra), gunakan filter SBU atau kolom pencarian untuk menemukan mitra yang diinginkan, lalu klik kartu mitra tersebut. Akan muncul jendela pop-up (modal) berisi daftar seluruh petugas di bawah mitra tersebut beserta statusnya ('Ada Pelanggaran' atau 'Patuh / 0 Pelanggaran'). Klik pada nama petugas untuk melihat rincian tiket, tanggal cek, ID PA, dan jenis pelanggarannya.",
  },
  {
    id: "klarifikasi-1",
    category: "klarifikasi",
    categoryLabel: "Klarifikasi & Status Tiket",
    question: "Apa arti dari status tiket Open, Pending Klarifikasi, Verifikasi, Closed, dan Overdue?",
    answer:
      "Setiap temuan pelanggaran melewati siklus tindak lanjut dengan status sebagai berikut:",
    bullets: [
      "Open: Temuan pelanggaran baru tercatat di sistem dan menunggu respons awal dari pihak mitra.",
      "Pending Klarifikasi: Tiket sedang dalam proses penyiapan Berita Acara Klarifikasi (BAK) dan perbaikan lapangan oleh mitra.",
      "Verifikasi: Mitra telah mengunggah dokumen klarifikasi dan foto bukti perbaikan, menunggu pemeriksaan/persetujuan tim QC PLN Icon Plus.",
      "Closed: Perbaikan dan klarifikasi telah diverifikasi serta dinyatakan selesai.",
      "Overdue: Mitra melewati batas waktu (deadline) klarifikasi tanpa menyelesaikan tindak lanjut yang diminta.",
    ],
  },
  {
    id: "klarifikasi-2",
    category: "klarifikasi",
    categoryLabel: "Klarifikasi & Status Tiket",
    question: "Bagaimana cara mengunggah bukti perbaikan dan Berita Acara Klarifikasi (BAK)?",
    answer:
      "Melalui menu 'Portal Klarifikasi' (/portal), PIC Mitra atau Petugas Mitra dapat melihat tiket pelanggaran aktif, mengisi kronologi/penjelasan tindak lanjut pada kolom keterangan, melampirkan dokumen Berita Acara Klarifikasi (BAK) serta foto perbaikan Before–After, lalu menekan tombol kirim untuk diajukan ke tahap Verifikasi.",
  },
  {
    id: "data-1",
    category: "data",
    categoryLabel: "Import & Export Data",
    question: "Bagaimana cara menggunakan fitur Import Data Excel di Dashboard?",
    answer:
      "Pada halaman Dashboard, klik tombol 'Import Data Excel' di pojok kanan atas. Pilih file spreadsheet (.xlsx / .xls / .csv) hasil rekap monitoring QC lapangan. Sistem secara otomatis mengenali kolom SBU, Nama Mitra, Nama Petugas, ID PA, serta kolom checklist K3 Awal/Akhir, Penampilan (Lengan Panjang & Rompi), dan QC Instalasi.",
  },
  {
    id: "data-2",
    category: "data",
    categoryLabel: "Import & Export Data",
    question: "Apa perbedaan opsi 'Ganti Semua Data' dan 'Gabungkan Data' saat Import Excel?",
    answer:
      "Saat mengunggah file Excel, Anda dapat memilih salah satu dari dua mode penyimpanan:",
    bullets: [
      "Ganti Semua Data (Replace): Menghapus data pelanggaran sebelumnya dan menggantinya sepenuhnya dengan data dari file Excel yang baru diunggah. Cocok digunakan saat memperbarui laporan bulanan secara utuh.",
      "Gabungkan Data (Merge): Menambahkan baris data baru dari file Excel ke dalam daftar data yang sudah ada di sistem tanpa menghapus laporan yang telah diinput sebelumnya.",
    ],
  },
  {
    id: "data-3",
    category: "data",
    categoryLabel: "Import & Export Data",
    question: "Apakah data pelanggaran dan Scorecard Mitra dapat diunduh (Export)?",
    answer:
      "Ya. Anda dapat mengunduh rekapitulasi data kapan saja melalui tombol 'Export CSV' di halaman Daftar Pelanggaran (/pelanggaran) maupun tombol 'Export Scorecard (CSV)' di halaman Scorecard Mitra (/mitra). Selain itu, bukti foto pada masing-masing tiket pelanggaran juga dapat diunduh langsung dari detail tiket.",
  },
];

function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("semua");

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return faqItems.filter((item) => {
      const matchesCategory = activeCategory === "semua" || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const inQuestion = item.question.toLowerCase().includes(q);
      const inAnswer = item.answer.toLowerCase().includes(q);
      const inBullets = item.bullets?.some((b) => b.toLowerCase().includes(q)) ?? false;
      const inCat = item.categoryLabel.toLowerCase().includes(q);
      return inQuestion || inAnswer || inBullets || inCat;
    });
  }, [searchQuery, activeCategory]);

  return (
    <AppShell>
      <div className="dashboard-enter">
        <PageHeader
          title="Pusat Bantuan & FAQ"
          description="Pertanyaan yang sering diajukan beserta panduan lengkap penggunaan sistem pemantauan kepatuhan mitra IconGuard."
        />
      </div>

      {/* Ringkasan Panduan Cepat */}
      <div
        className="dashboard-enter mb-6 grid gap-4 md:grid-cols-3"
        style={{ animationDelay: "80ms" }}
      >
        <Card className="border-primary/15 bg-card/95 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">3 Aspek Pemeriksaan QC</CardTitle>
                <CardDescription className="text-xs">Standar evaluasi lapangan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-1 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <HardHat className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <span>
                <strong className="text-foreground">K3:</strong> Helm Safety, Safety Belt, Sepatu Safety, dan Tangga.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Shirt className="mt-0.5 size-3.5 shrink-0 text-sky-600" />
              <span>
                <strong className="text-foreground">Penampilan:</strong> Baju Lengan Panjang &amp; Rompi (Awal &amp; Akhir).
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Cable className="mt-0.5 size-3.5 shrink-0 text-indigo-600" />
              <span>
                <strong className="text-foreground">Instalasi:</strong> Kerapian tarikan kabel, aksesoris &amp; redaman.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/15 bg-card/95 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Award className="size-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Ambang Zona Kepatuhan</CardTitle>
                <CardDescription className="text-xs">Klasifikasi skor risiko mitra</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between rounded-md bg-emerald-500/5 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="size-3.5" /> Zona Hijau
              </span>
              <span className="font-mono font-semibold text-foreground">&lt; 15 Poin</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-amber-500/5 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 font-medium text-amber-700">
                <AlertTriangle className="size-3.5" /> Zona Kuning
              </span>
              <span className="font-mono font-semibold text-foreground">15 – 29 Poin</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-rose-500/5 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 font-medium text-rose-700">
                <ShieldAlert className="size-3.5" /> Zona Merah
              </span>
              <span className="font-mono font-semibold text-foreground">&ge; 30 Poin</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/15 bg-card/95 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                <MessageSquareShare className="size-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Siklus Tindak Lanjut</CardTitle>
                <CardDescription className="text-xs">Alur penyelesaian tiket temuan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1 text-xs text-muted-foreground">
            <p className="leading-relaxed">
              Setiap temuan wajib ditindaklanjuti oleh mitra dengan mengunggah{" "}
              <strong className="text-foreground">Berita Acara Klarifikasi (BAK)</strong> dan foto perbaikan{" "}
              <strong className="text-foreground">Before–After</strong> sebelum batas waktu berakhir.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <StatusPill tone="warning">Open</StatusPill>
              <ArrowRight className="size-3 text-muted-foreground" />
              <StatusPill tone="info">Verifikasi</StatusPill>
              <ArrowRight className="size-3 text-muted-foreground" />
              <StatusPill tone="success">Closed</StatusPill>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Pencarian dan Filter Kategori */}
      <Card className="dashboard-enter mb-6" style={{ animationDelay: "140ms" }}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pertanyaan atau kata kunci (misal: Lengan Panjang, Zona Merah, Import Excel, SBU)..."
                className="h-10 pl-10 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {faqCategories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                const count =
                  cat.id === "semua"
                    ? faqItems.length
                    : faqItems.filter((item) => item.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{cat.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daftar Pertanyaan (Accordion) */}
      <Card className="dashboard-enter" style={{ animationDelay: "200ms" }}>
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Daftar Pertanyaan Umum (FAQ)</CardTitle>
              <CardDescription>
                Menampilkan {filteredFaqs.length} dari {faqItems.length} pertanyaan panduan sistem
              </CardDescription>
            </div>
            {(searchQuery || activeCategory !== "semua") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("semua");
                }}
              >
                Reset Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center">
              <CircleHelp className="mx-auto mb-3 size-10 text-muted-foreground/50" />
              <p className="text-base font-semibold text-foreground">
                Pertanyaan tidak ditemukan
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Coba gunakan kata kunci lain atau pilih kategori &ldquo;Semua Topik&rdquo;.
              </p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={[filteredFaqs[0]?.id ?? "umum-1"]} className="w-full">
              {filteredFaqs.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-border/70">
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="flex flex-col items-start gap-1.5 pr-4 text-left sm:flex-row sm:items-center sm:gap-3">
                      <span className="inline-flex shrink-0 items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        {item.categoryLabel}
                      </span>
                      <span className="text-sm font-semibold text-foreground sm:text-base">
                        {item.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    <div className="space-y-3 pl-0 sm:pl-2">
                      <p>{item.answer}</p>
                      {item.bullets && item.bullets.length > 0 && (
                        <ul className="list-disc space-y-1.5 pl-5 text-foreground/90">
                          {item.bullets.map((bullet, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Footer Pintasan Halaman */}
      <div
        className="dashboard-enter mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-white/80 p-5 shadow-xs"
        style={{ animationDelay: "260ms" }}
      >
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Ingin langsung memantau data kepatuhan atau menindaklanjuti tiket?
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Gunakan pintasan berikut sesuai dengan kebutuhan operasional Anda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="outline" size="sm">
            <Link to="/mitra">Lihat Scorecard Mitra</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/portal">Buka Portal Klarifikasi</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

