import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getCurrentAuthUser, getPelanggaranData, requireRouteAccess } from "@/lib/auth-server";
import { useEffect, useMemo, useState } from "react";
import {
  FileCheck2,
  Building2,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  FileUp,
  Download,
  Eye,
  Shield,
  UserCheck,
  User,
  Users,
  HardHat,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCustomViolationsFromStorage,
  getDeletedViolationIds,
  getSbuInfo,
  hydrateCustomDataFromIndexedDB,
  isRealViolation,
  syncViolationRecord,
  sbuOptions,
  severityTone,
  statusTone,
  violations,
  type Violation,
} from "@/lib/iconguard-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/laporan-klarifikasi")({
  beforeLoad: () => requireRouteAccess("/laporan-klarifikasi"),
  loader: () => getPelanggaranData(),
  head: () => ({
    meta: [
      { title: "Laporan Klarifikasi — IconGuard" },
      {
        name: "description",
        content:
          "Rekapitulasi lengkap data klarifikasi pelanggaran yang diajukan oleh SBU, Mitra, dan Petugas Mitra.",
      },
      { property: "og:title", content: "Laporan Klarifikasi — IconGuard" },
      {
        property: "og:description",
        content:
          "Pantau dan cross check seluruh data klarifikasi beserta kejelasan asal SBU, perusahaan Mitra, dan Petugas Lapangan.",
      },
    ],
  }),
  component: LaporanKlarifikasiPage,
});

type AuthUser = Awaited<ReturnType<typeof getCurrentAuthUser>>;

function getClarificationInfo(v: Violation) {
  let note = v.clarificationNote || "";
  let submittedBy = v.clarificationSubmittedBy || "";
  let submittedAt = v.clarificationSubmittedAt || "";
  let role = v.clarificationRole || "";
  let org = v.clarificationOrganization || "";

  if (!note && v.catatan && v.catatan.includes("[Klarifikasi diajukan")) {
    const match = v.catatan.match(/\[Klarifikasi diajukan oleh ([^\]]+)\]:\s*([\s\S]+)/);
    if (match) {
      submittedBy = match[1];
      note = match[2];
    }
  }

  // Fallback deteksi role jika tidak tercatat spesifik
  if (!role) {
    const sLower = (submittedBy || "").toLowerCase();
    if (sLower.includes("sbu")) role = "petugas-sbu";
    else if (sLower.includes("petugas")) role = "petugas-mitra";
    else if (sLower.includes("super admin")) role = "super-admin";
    else role = "mitra";
  }

  return {
    note: note || "Klarifikasi dan bukti perbaikan telah diajukan.",
    submittedBy: submittedBy || v.mitra,
    submittedAt: submittedAt || v.createdAt || "—",
    role: role || "mitra",
    org: org || v.mitra,
    bakFile: v.clarificationBakFile || "BAK-Klarifikasi.pdf",
    evidenceFile: v.clarificationEvidenceFile || "Foto-Perbaikan-BeforeAfter.jpg",
    reviewedAt: v.clarificationReviewedAt,
    reviewedBy: v.clarificationReviewedBy,
    reviewNote: v.clarificationReviewNote,
  };
}

function getRoleBadge(role: string) {
  switch (role) {
    case "petugas-sbu":
      return {
        label: "Petugas SBU",
        className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
        icon: Shield,
      };
    case "petugas-mitra":
      return {
        label: "Petugas Mitra",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        icon: HardHat,
      };
    case "super-admin":
      return {
        label: "Super Admin",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
        icon: UserCheck,
      };
    case "mitra":
    default:
      return {
        label: "Mitra (PIC)",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        icon: Building2,
      };
  }
}

function LaporanKlarifikasiPage() {
  const router = useRouter();
  const { violations: loadedViolations } = Route.useLoaderData();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Filter states
  const [selectedSbuFilter, setSelectedSbuFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal detail & cross check
  const [selectedDetail, setSelectedDetail] = useState<Violation | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void getCurrentAuthUser().then((u) => {
      setCurrentUser(u);
    });
  }, []);

  useEffect(() => {
    const onHydrated = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("iconguard-data-hydrated", onHydrated);
    void hydrateCustomDataFromIndexedDB();
    return () => window.removeEventListener("iconguard-data-hydrated", onHydrated);
  }, []);

  const deleted = new Set(getDeletedViolationIds());
  const allList = useMemo(() => {
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    const custom = getCustomViolationsFromStorage();
    if (isOverridden && custom.length > 0) {
      return custom.filter((v) => !deleted.has(v.id) && isRealViolation(v));
    }
    const base = loadedViolations
      ? [
          ...loadedViolations.map((violation) => {
            const localViolation = violations.find((item) => item.id === violation.id);
            return localViolation?.bukti?.length
              ? { ...violation, bukti: localViolation.bukti }
              : violation;
          }),
          ...violations.filter((item) => !loadedViolations.some((v) => v.id === item.id)),
        ]
      : violations;

    const combined = [
      ...custom,
      ...base.filter((v) => !custom.some((c) => c.id === v.id)),
    ];
    return (isOverridden && custom.length > 0 ? custom : combined).filter(
      (v) => !deleted.has(v.id) && isRealViolation(v),
    );
  }, [loadedViolations, refreshTrigger]);

  // Hak Akses Scope:
  // - Super Admin: Bebas memfilter seluruh SBU nasional.
  // - Petugas SBU: Terkunci pada SBU asalnya.
  // - Mitra / Petugas Mitra: Terkunci pada SBU dan Perusahaan Mitra asalnya.
  const scopedViolations = useMemo(() => {
    if (!currentUser) return allList;

    const role = currentUser.appRole;
    const userSbuRaw = currentUser.sbu || "";
    const userSbuInfo = getSbuInfo(userSbuRaw || currentUser.organization);
    const userOrg = (currentUser.organization || "").trim().toLowerCase();

    if (role === "super-admin") {
      if (selectedSbuFilter && selectedSbuFilter !== "ALL") {
        return allList.filter((v) => getSbuInfo(v).code === selectedSbuFilter);
      }
      return allList;
    }

    if (role === "petugas-sbu") {
      const targetCode = userSbuInfo.code;
      return allList.filter((v) => {
        const vSbu = getSbuInfo(v);
        if (targetCode !== "—" && vSbu.code === targetCode) return true;
        if (userSbuRaw) {
          const rawUpper = userSbuRaw.toUpperCase();
          const vSbuStr = (v.sbu || v.lokasi || "").toUpperCase();
          if (vSbuStr.includes(rawUpper)) return true;
        }
        return false;
      });
    }

    // Role: mitra atau petugas-mitra
    if (role === "mitra" || role === "petugas-mitra") {
      const targetCode = userSbuInfo.code;
      return allList.filter((v) => {
        const vSbu = getSbuInfo(v);
        const sbuMatch = targetCode === "—" || vSbu.code === targetCode;
        const vMitra = (v.mitra || "").toLowerCase();
        const orgMatch = !userOrg || vMitra.includes(userOrg) || userOrg.includes(vMitra);
        return sbuMatch && orgMatch;
      });
    }

    return allList;
  }, [allList, currentUser, selectedSbuFilter]);

  // Hanya tiket yang MEMILIKI LAPORAN KLARIFIKASI yang dimunculkan di halaman ini.
  // Jika belum ada klarifikasi yang diajukan, daftar ini murni kosong [].
  const allClarificationReports = useMemo(() => {
    return scopedViolations.filter((v) => {
      return (
        Boolean(v.clarificationSubmittedAt) ||
        Boolean(v.clarificationNote) ||
        v.status === "Verifikasi" ||
        (v.catatan && v.catatan.includes("[Klarifikasi diajukan"))
      );
    });
  }, [scopedViolations]);

  // Filter dinamis berdasarkan status, asal pengaju, dan kata kunci pencarian
  const filteredReports = useMemo(() => {
    return allClarificationReports.filter((v) => {
      const info = getClarificationInfo(v);

      // Filter Status
      if (statusFilter !== "ALL") {
        if (statusFilter === "Verifikasi" && v.status !== "Verifikasi") return false;
        if (statusFilter === "Closed" && v.status !== "Closed") return false;
        if (statusFilter === "Pending" && v.status !== "Pending Klarifikasi") return false;
      }

      // Filter Asal Pengaju (SBU, Mitra, Petugas Mitra, Super Admin)
      if (roleFilter !== "ALL") {
        if (info.role !== roleFilter) return false;
      }

      // Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const match =
          v.id.toLowerCase().includes(q) ||
          (v.idPa && v.idPa.toLowerCase().includes(q)) ||
          v.mitra.toLowerCase().includes(q) ||
          v.petugas.toLowerCase().includes(q) ||
          v.jenis.toLowerCase().includes(q) ||
          v.lokasi.toLowerCase().includes(q) ||
          info.submittedBy.toLowerCase().includes(q) ||
          info.org.toLowerCase().includes(q) ||
          info.note.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [allClarificationReports, statusFilter, roleFilter, searchQuery]);

  // Statistik Cepat Laporan Klarifikasi
  const stats = useMemo(() => {
    const total = allClarificationReports.length;
    const verifikasi = allClarificationReports.filter((v) => v.status === "Verifikasi").length;
    const closed = allClarificationReports.filter((v) => v.status === "Closed").length;
    const revision = allClarificationReports.filter((v) => v.status === "Pending Klarifikasi").length;
    return { total, verifikasi, closed, revision };
  }, [allClarificationReports]);

  // Handler Export Excel
  const handleExportExcel = () => {
    if (filteredReports.length === 0) {
      toast.error("Tidak ada data laporan klarifikasi untuk diekspor.");
      return;
    }

    try {
      const rows = filteredReports.map((v, i) => {
        const info = getClarificationInfo(v);
        const sbuInfo = getSbuInfo(v);
        return {
          No: i + 1,
          "ID Tiket": v.id,
          "ID PA ICRM": v.idPa || "—",
          "Kode SBU": sbuInfo.code,
          "Wilayah SBU": sbuInfo.label,
          "Nama Mitra": v.mitra,
          "Petugas Lapangan Mitra": v.petugas,
          "Jenis Pelanggaran": v.jenis,
          Severity: v.severity,
          "Poin Penalti": v.poin,
          "Status Klarifikasi": v.status,
          "Diajukan Oleh": info.submittedBy,
          "Peran Pengaju": getRoleBadge(info.role).label,
          "Organisasi Pengaju": info.org,
          "Waktu Pengajuan": info.submittedAt,
          "Penjelasan / Tindak Lanjut": info.note,
          "Dokumen BAK": info.bakFile,
          "Foto Bukti Perbaikan": info.evidenceFile,
          "Diverifikasi Oleh": info.reviewedBy || "—",
          "Waktu Verifikasi": info.reviewedAt || "—",
          "Catatan Verifikator": info.reviewNote || "—",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Klarifikasi");

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Laporan_Klarifikasi_IconGuard_${dateStr}.xlsx`);
      toast.success("Laporan klarifikasi berhasil diekspor ke Excel!");
    } catch {
      toast.error("Gagal mengekspor laporan ke Excel.");
    }
  };

  // Aksi Super Admin & QA/QC untuk menyetujui / menolak di modal detail
  const handleApproveClarification = () => {
    if (!selectedDetail) return;
    setActionLoading(true);
    try {
      const nowStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updated: Violation = {
        ...selectedDetail,
        status: "Closed",
        poin: 0,
        clarificationReviewedAt: nowStr,
        clarificationReviewedBy: `${currentUser?.name || "Super Admin"} (${currentUser?.appRole === "super-admin" ? "Super Admin" : "Petugas QA/QC SBU"})`,
        clarificationReviewNote: reviewNote.trim() || "Klarifikasi dan bukti perbaikan disetujui. Tiket ditutup.",
        catatan: `${selectedDetail.catatan}\n\n[Diverifikasi & Disetujui oleh ${currentUser?.name || "Super Admin"} pada ${nowStr}]: ${reviewNote.trim() || "Klarifikasi dan bukti perbaikan disetujui. Tiket ditutup."}`,
      };

      syncViolationRecord(updated);
      setRefreshTrigger((prev) => prev + 1);
      router.invalidate();
      setSelectedDetail(null);
      setReviewNote("");
      toast.success(`Tiket ${selectedDetail.id} berhasil disetujui dan ditutup (Closed)!`, {
        description: "Poin penalti tiket telah dipulihkan menjadi 0.",
      });
    } catch {
      toast.error("Gagal menyetujui klarifikasi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClarification = () => {
    if (!selectedDetail) return;
    if (!reviewNote.trim()) {
      toast.error("Mohon tuliskan catatan alasan penolakan/revisi untuk mitra.");
      return;
    }
    setActionLoading(true);
    try {
      const nowStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updated: Violation = {
        ...selectedDetail,
        status: "Pending Klarifikasi",
        clarificationReviewedAt: nowStr,
        clarificationReviewedBy: `${currentUser?.name || "Super Admin"} (${currentUser?.appRole === "super-admin" ? "Super Admin" : "Petugas QA/QC SBU"})`,
        clarificationReviewNote: reviewNote.trim(),
        catatan: `${selectedDetail.catatan}\n\n[Revisi Diminta oleh ${currentUser?.name || "Super Admin"} pada ${nowStr}]: ${reviewNote.trim()}`,
      };

      syncViolationRecord(updated);
      setRefreshTrigger((prev) => prev + 1);
      router.invalidate();
      setSelectedDetail(null);
      setReviewNote("");
      toast.warning(`Tiket ${selectedDetail.id} dikembalikan untuk perbaikan (Pending Klarifikasi).`, {
        description: "Catatan penolakan telah diteruskan ke mitra terkait.",
      });
    } catch {
      toast.error("Gagal meminta revisi klarifikasi.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="dashboard-enter space-y-6">
        {/* Header Halaman */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Laporan Klarifikasi"
            description="Rekapitulasi lengkap data klarifikasi pelanggaran dari SBU, Mitra, dan Petugas Lapangan."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={filteredReports.length === 0}
              className="h-9 gap-1.5 cursor-pointer text-xs font-semibold"
            >
              <Download className="size-3.5" />
              <span>Ekspor Excel</span>
            </Button>
            <Button asChild size="sm" className="h-9 gap-1.5 cursor-pointer text-xs font-semibold">
              <Link to="/portal">
                <FileUp className="size-3.5" />
                <span>Portal Klarifikasi</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Banner Hak Akses Pengguna */}
        {currentUser && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-[#EAF5FE] p-4 text-slate-800 shadow-xs dark:bg-slate-900/60 dark:text-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Shield className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span>
                    Akses:{" "}
                    {currentUser.appRole === "super-admin"
                      ? "Super Admin (Nasional)"
                      : currentUser.appRole === "petugas-sbu"
                      ? "Petugas QA/QC SBU"
                      : "Mitra / Petugas Lapangan"}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                  <span className="font-semibold">{currentUser.name}</span>
                  {currentUser.organization && (
                    <span className="text-muted-foreground">· {currentUser.organization}</span>
                  )}
                  {currentUser.sbu && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 font-semibold text-primary shadow-2xs border border-primary/10">
                      <MapPin className="size-3" /> SBU {currentUser.sbu}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Filter SBU untuk Super Admin */}
            {currentUser.appRole === "super-admin" && (
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select value={selectedSbuFilter} onValueChange={setSelectedSbuFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white w-[190px]">
                    <SelectValue placeholder="Semua SBU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">
                      🌐 Semua SBU (Nasional)
                    </SelectItem>
                    {sbuOptions.map((s) => (
                      <SelectItem key={s.code} value={s.code} className="text-xs">
                        {s.code} — {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* 4 Kartu Metrik Ringkasan */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Laporan Klarifikasi</CardDescription>
              <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <FileCheck2 className="size-3 text-primary" />
                <span>Seluruh laporan klarifikasi masuk</span>
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-amber-800 dark:text-amber-300">
                Menunggu Verifikasi
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.verifikasi}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3 text-amber-500" />
                <span>Perlu di-cross check oleh tim QA/QC</span>
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-emerald-800 dark:text-emerald-300">
                Selesai (Closed)
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.closed}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" />
                <span>Klarifikasi diterima &amp; skor pulih</span>
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-rose-500/20 bg-rose-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-rose-800 dark:text-rose-300">
                Perlu Revisi Bukti
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {stats.revision}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="size-3 text-rose-500" />
                <span>Menunggu perbaikan dokumen mitra</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar & Pencarian */}
        <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs overflow-hidden">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-0 max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari ID tiket, nama mitra, SBU, petugas mitra, atau penjelasan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs w-full bg-background"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Filter Status */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[145px] sm:w-[155px] h-9 text-xs font-medium bg-background">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">
                      Semua Status
                    </SelectItem>
                    <SelectItem value="Verifikasi" className="text-xs">
                      Menunggu Verifikasi
                    </SelectItem>
                    <SelectItem value="Closed" className="text-xs">
                      Selesai (Closed)
                    </SelectItem>
                    <SelectItem value="Pending" className="text-xs">
                      Perlu Revisi
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Asal Pengaju */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Pengaju:</span>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[155px] sm:w-[165px] h-9 text-xs font-medium bg-background">
                    <SelectValue placeholder="Semua Pengaju" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">
                      Semua Pengaju
                    </SelectItem>
                    <SelectItem value="petugas-sbu" className="text-xs">
                      Dari Petugas SBU
                    </SelectItem>
                    <SelectItem value="mitra" className="text-xs">
                      Dari Mitra (PIC)
                    </SelectItem>
                    <SelectItem value="petugas-mitra" className="text-xs">
                      Dari Petugas Mitra
                    </SelectItem>
                    <SelectItem value="super-admin" className="text-xs">
                      Dari Super Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(statusFilter !== "ALL" || roleFilter !== "ALL" || searchQuery.trim()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setRoleFilter("ALL");
                    setSearchQuery("");
                  }}
                >
                  <X className="size-3.5 mr-1" />
                  Reset Filter
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabel Laporan Klarifikasi */}
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                <span>Daftar Laporan Klarifikasi ({filteredReports.length} Data)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Rincian kejelasan entitas mitra, wilayah SBU, petugas pelaksana, dan pihak pengaju klarifikasi.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredReports.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CheckCircle2 className="size-12 text-muted-foreground/40 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Belum Ada Data Laporan Klarifikasi
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {allClarificationReports.length === 0
                      ? "Saat ini belum ada data klarifikasi yang diajukan oleh SBU, Mitra, maupun Petugas Mitra. Klarifikasi yang dikirimkan melalui menu Portal Klarifikasi akan otomatis terdata di halaman ini."
                      : "Tidak ditemukan data klarifikasi yang sesuai dengan kriteria filter atau pencarian Anda."}
                  </p>
                </div>
                {allClarificationReports.length === 0 && (
                  <div className="pt-2">
                    <Button asChild size="sm" className="gap-1.5 text-xs font-semibold">
                      <Link to="/portal">
                        <FileUp className="size-3.5" />
                        <span>Buka Portal Klarifikasi</span>
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">No</th>
                      <th className="py-3 px-3">Tiket &amp; SBU</th>
                      <th className="py-3 px-3">Mitra &amp; Petugas Mitra</th>
                      <th className="py-3 px-3">Pengaju Klarifikasi</th>
                      <th className="py-3 px-3">Temuan Pelanggaran</th>
                      <th className="py-3 px-3">Waktu Pengajuan</th>
                      <th className="py-3 px-3 text-center">Dokumen</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredReports.map((v, i) => {
                      const info = getClarificationInfo(v);
                      const sbuInfo = getSbuInfo(v);
                      const roleBadge = getRoleBadge(info.role);
                      const RoleIcon = roleBadge.icon;

                      return (
                        <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                            {i + 1}
                          </td>

                          {/* Tiket & SBU */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                                {v.id}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span className="font-mono font-bold text-foreground bg-muted px-1 py-0.2 rounded border">
                                  {sbuInfo.code}
                                </span>
                                <span className="truncate max-w-[140px]">{sbuInfo.label}</span>
                              </div>
                            </div>
                          </td>

                          {/* Mitra & Petugas Lapangan */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[180px]">{v.mitra}</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <HardHat className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="truncate max-w-[180px]">
                                  Petugas: <strong className="text-foreground">{v.petugas}</strong>
                                </span>
                              </p>
                            </div>
                          </td>

                          {/* Pengaju Klarifikasi (Role & Asal) */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border",
                                  roleBadge.className
                                )}
                              >
                                <RoleIcon className="size-3" />
                                <span>{roleBadge.label}</span>
                              </span>
                              <p className="font-semibold text-foreground text-[11px] truncate max-w-[160px]">
                                {info.submittedBy}
                              </p>
                              {info.org && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                  {info.org}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Temuan Pelanggaran */}
                          <td className="py-3 px-3">
                            <div className="space-y-1 max-w-[200px]">
                              <p className="font-medium text-foreground truncate">{v.jenis}</p>
                              <div className="flex items-center gap-1.5">
                                <StatusPill tone={severityTone(v.severity)}>
                                  {v.severity}
                                </StatusPill>
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold">
                                  {v.poin} Poin
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Waktu Pengajuan */}
                          <td className="py-3 px-3 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground shrink-0" />
                              <span className="whitespace-nowrap">{info.submittedAt}</span>
                            </div>
                          </td>

                          {/* Dokumen Lampiran */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span
                                className="inline-flex size-6 items-center justify-center rounded bg-primary/10 text-primary"
                                title={`BAK: ${info.bakFile}`}
                              >
                                <FileText className="size-3.5" />
                              </span>
                              <span
                                className="inline-flex size-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                title={`Foto: ${info.evidenceFile}`}
                              >
                                <Upload className="size-3.5" />
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <StatusPill tone={statusTone(v.status)}>
                              {v.status === "Verifikasi"
                                ? "Menunggu Verifikasi"
                                : v.status === "Closed"
                                ? "Disetujui (Closed)"
                                : v.status === "Pending Klarifikasi"
                                ? "Perlu Revisi"
                                : v.status}
                            </StatusPill>
                          </td>

                          {/* Tombol Aksi */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 cursor-pointer"
                                onClick={() => {
                                  setSelectedDetail(v);
                                  setReviewNote(v.clarificationReviewNote || "");
                                }}
                              >
                                <Eye className="size-3" />
                                <span>Detail</span>
                              </Button>
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2 text-primary hover:bg-primary/10 cursor-pointer"
                                title="Buka di Portal Klarifikasi"
                              >
                                <Link to="/portal">
                                  <ExternalLink className="size-3" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Popup Detail & Cross Check Laporan Klarifikasi */}
      {selectedDetail && (
        <Dialog open={Boolean(selectedDetail)} onOpenChange={(open) => !open && setSelectedDetail(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {selectedDetail.id}
                  </span>
                  <StatusPill tone={severityTone(selectedDetail.severity)}>
                    {selectedDetail.severity}
                  </StatusPill>
                  <StatusPill tone={statusTone(selectedDetail.status)}>
                    {selectedDetail.status}
                  </StatusPill>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  SBU: {getSbuInfo(selectedDetail).code}
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold text-foreground mt-2">
                Detail Laporan Klarifikasi Pelanggaran
              </DialogTitle>
              <DialogDescription className="text-xs">
                Informasi detail identitas mitra, wilayah SBU, petugas lapangan, serta berkas bukti klarifikasi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-2">
              {/* Bagian 1: Kejelasan Asal Mitra, SBU, dan Petugas Mitra */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
                <p className="font-bold text-primary flex items-center gap-1.5 text-xs">
                  <Building2 className="size-4" />
                  <span>1. Entitas Mitra, SBU, &amp; Petugas Lapangan</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Wilayah SBU:</span>
                    <p className="font-bold text-foreground">{getSbuInfo(selectedDetail).full}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Perusahaan Mitra:</span>
                    <p className="font-bold text-foreground">{selectedDetail.mitra}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Petugas dari Mitra:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedDetail.petugas}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">ID PA ICRM:</span>
                    <p className="font-semibold text-foreground">{selectedDetail.idPa || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Lokasi Inspeksi:</span>
                    <p className="font-semibold text-foreground">{selectedDetail.lokasi}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Poin Penalti Awal:</span>
                    <p className="font-semibold text-rose-600 dark:text-rose-400">
                      {selectedDetail.poin} Poin
                    </p>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Data Pengaju Klarifikasi & Kronologi Penjelasan */}
              {(() => {
                const info = getClarificationInfo(selectedDetail);
                const roleBadge = getRoleBadge(info.role);
                const RoleIcon = roleBadge.icon;

                return (
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                        <FileText className="size-4 text-amber-500" />
                        <span>2. Klarifikasi yang Diajukan</span>
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        Waktu: {info.submittedAt}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="text-muted-foreground">Diajukan Oleh:</span>
                      <span className="font-bold text-foreground">{info.submittedBy}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.2 text-[10px] font-bold border",
                          roleBadge.className
                        )}
                      >
                        <RoleIcon className="size-3" />
                        <span>{roleBadge.label}</span>
                      </span>
                      {info.org && (
                        <span className="text-muted-foreground text-[10px]">({info.org})</span>
                      )}
                    </div>

                    <div className="rounded-lg bg-background p-2.5 border border-border/60 leading-relaxed text-[11px]">
                      <span className="font-semibold text-muted-foreground block mb-1">
                        Penjelasan &amp; Kronologi Tindak Lanjut:
                      </span>
                      <p className="text-foreground whitespace-pre-line">{info.note}</p>
                    </div>

                    {/* Dokumen & Foto Lampiran */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="flex items-center gap-2 rounded-lg bg-background p-2 border border-border/60">
                        <FileUp className="size-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[11px] text-foreground truncate">
                            {info.bakFile}
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Berita Acara Klarifikasi (BAK)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-background p-2 border border-border/60">
                        <Upload className="size-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[11px] text-foreground truncate">
                            {info.evidenceFile}
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Foto Bukti Perbaikan Before–After
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Bagian 3: Riwayat Verifikasi Terdahulu */}
              {selectedDetail.clarificationReviewNote && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">
                      Catatan Verifikator Terdahulu:
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {selectedDetail.clarificationReviewedAt}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDetail.clarificationReviewNote}
                  </p>
                  {selectedDetail.clarificationReviewedBy && (
                    <p className="text-[10px] text-muted-foreground pt-0.5">
                      Oleh: {selectedDetail.clarificationReviewedBy}
                    </p>
                  )}
                </div>
              )}

              {/* Bagian 4: Aksi Cross Check (Super Admin & Petugas SBU) */}
              {currentUser?.appRole === "super-admin" || currentUser?.appRole === "petugas-sbu" ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-amber-600" />
                    <p className="font-bold text-foreground text-xs">
                      Keputusan Verifikasi &amp; Cross Check
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">
                      Catatan Verifikator (Wajib diisi jika meminta revisi):
                    </Label>
                    <Textarea
                      rows={2}
                      placeholder="Tuliskan catatan hasil cross check klarifikasi..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="text-xs bg-background"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDetail(null)}
                      disabled={actionLoading}
                    >
                      Tutup
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 cursor-pointer"
                      onClick={handleRejectClarification}
                      disabled={actionLoading}
                    >
                      <X className="size-3.5" />
                      <span>{actionLoading ? "Menyimpan..." : "Tolak / Minta Revisi"}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                      onClick={handleApproveClarification}
                      disabled={actionLoading}
                    >
                      <Check className="size-3.5" />
                      <span>{actionLoading ? "Menyimpan..." : "Setujui & Tutup Tiket (Closed)"}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-center space-y-1">
                  <p className="font-semibold text-foreground">
                    {selectedDetail.status === "Closed"
                      ? "✓ Laporan klarifikasi telah diverifikasi dan disetujui (Closed)."
                      : selectedDetail.status === "Verifikasi"
                      ? "⏳ Laporan klarifikasi sedang dalam antrean verifikasi oleh Tim QA/QC."
                      : "📝 Tiket ini memerlukan tindak lanjut perbaikan dari mitra."}
                  </p>
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDetail(null)}
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}

