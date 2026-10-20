import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getCurrentAuthUser, getPelanggaranData, requireRouteAccess } from "@/lib/auth-server";
import { toast } from "sonner";
import {
  FileUp,
  Send,
  Upload,
  CheckCircle2,
  Building2,
  MapPin,
  Shield,
  FileWarning,
  Clock,
  ChevronRight,
  Filter,
  Eye,
  Check,
  X,
  Search,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  History,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  auditTrail,
  getCustomViolationsFromStorage,
  getDeletedViolationIds,
  getSbuInfo,
  hydrateCustomDataFromIndexedDB,
  isRealViolation,
  saveCustomViolationToStorage,
  syncViolationRecord,
  sbuOptions,
  severityTone,
  statusTone,
  violations,
  type Violation,
} from "@/lib/iconguard-data";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/portal")({
  beforeLoad: () => requireRouteAccess("/portal"),
  loader: () => getPelanggaranData(),
  head: () => ({
    meta: [
      { title: "Portal Klarifikasi Mitra — IconGuard" },
      {
        name: "description",
        content:
          "Portal self-service mitra dan SBU untuk mengunggah Berita Acara Klarifikasi dan bukti perbaikan.",
      },
      { property: "og:title", content: "Portal Klarifikasi Mitra — IconGuard" },
      {
        property: "og:description",
        content:
          "Unggah klarifikasi, foto before-after, dan pantau status tiket pelanggaran sesuai wilayah SBU dan perusahaan Anda.",
      },
    ],
  }),
  component: PortalPage,
});

type AuthUser = Awaited<ReturnType<typeof getCurrentAuthUser>>;

function PortalPage() {
  const router = useRouter();
  const { violations: loadedViolations } = Route.useLoaderData();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [selectedSbuFilter, setSelectedSbuFilter] = useState<string>("ALL");
  const [submitting, setSubmitting] = useState(false);

  // State untuk Panel Data Pending & Cross Check
  const [pendingTab, setPendingTab] = useState<"verifikasi" | "pending" | "semua" | "closed">("verifikasi");
  const [searchPendingQuery, setSearchPendingQuery] = useState("");
  const [crossCheckTicket, setCrossCheckTicket] = useState<Violation | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

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

  // Logika Filter Hak Akses SBU & Mitra:
  // - Petugas SBU: Hanya bisa mengakses & mengklarifikasi tiket di wilayah SBU asalnya (misal SBU Kalimantan).
  // - Mitra & Petugas Mitra: Hanya bisa mengakses & mengklarifikasi tiket dari SBU asalnya DAN PT Mitra perusahaannya.
  // - Super Admin: Memiliki akses nasional dan dapat memfilter per SBU jika diperlukan.
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

  // Tiket yang sedang aktif dipilih untuk proses klarifikasi
  const activeTicket = useMemo(() => {
    if (!scopedViolations.length) return null;
    if (selectedTicketId) {
      const found = scopedViolations.find((v) => v.id === selectedTicketId);
      if (found) return found;
    }
    // Jika tidak ada tiket eksplisit, utamakan yang berstatus Open atau Pending Klarifikasi
    const pendingInput = scopedViolations.find(
      (v) => v.status === "Pending Klarifikasi" || v.status === "Open" || v.status === "Overdue"
    );
    if (pendingInput) return pendingInput;
    // Jika tidak ada, ambil tiket dalam proses Verifikasi
    const inVerifikasi = scopedViolations.find((v) => v.status === "Verifikasi");
    if (inVerifikasi) return inVerifikasi;
    return scopedViolations[0];
  }, [scopedViolations, selectedTicketId]);

  const userSbuInfo = useMemo(() => {
    if (!currentUser) return null;
    return getSbuInfo(currentUser.sbu || currentUser.organization);
  }, [currentUser]);

  // Pengelompokan Data Pending untuk Panel Kanan
  const verifikasiTickets = useMemo(() => {
    return scopedViolations.filter((v) => v.status === "Verifikasi");
  }, [scopedViolations]);

  const pendingKlarifikasiTickets = useMemo(() => {
    return scopedViolations.filter(
      (v) => v.status === "Pending Klarifikasi" || v.status === "Open" || v.status === "Overdue"
    );
  }, [scopedViolations]);

  const closedTickets = useMemo(() => {
    return scopedViolations.filter((v) => v.status === "Closed");
  }, [scopedViolations]);

  const displayedPendingList = useMemo(() => {
    let base = scopedViolations;
    if (pendingTab === "verifikasi") {
      base = verifikasiTickets;
    } else if (pendingTab === "pending") {
      base = pendingKlarifikasiTickets;
    } else if (pendingTab === "closed") {
      base = closedTickets;
    }

    if (!searchPendingQuery.trim()) return base;
    const q = searchPendingQuery.trim().toLowerCase();
    return base.filter((v) => {
      return (
        v.id.toLowerCase().includes(q) ||
        (v.idPa && v.idPa.toLowerCase().includes(q)) ||
        v.mitra.toLowerCase().includes(q) ||
        v.jenis.toLowerCase().includes(q) ||
        v.lokasi.toLowerCase().includes(q) ||
        (v.catatan && v.catatan.toLowerCase().includes(q))
      );
    });
  }, [scopedViolations, pendingTab, verifikasiTickets, pendingKlarifikasiTickets, closedTickets, searchPendingQuery]);

  const handleKirimKlarifikasi = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeTicket) return;

    const form = e.currentTarget;
    const explanation = new FormData(form).get("explanation");
    const clarificationFile = form.elements.namedItem("clarification-file") as HTMLInputElement | null;
    const evidenceFiles = form.elements.namedItem("evidence-files") as HTMLInputElement | null;

    if (
      typeof explanation !== "string" ||
      !explanation.trim() ||
      !clarificationFile?.files?.length ||
      !evidenceFiles?.files?.length
    ) {
      toast.error("Mohon lengkapi penjelasan dan unggah seluruh dokumen yang diperlukan.");
      return;
    }

    setSubmitting(true);
    try {
      const nowStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updated: Violation = {
        ...activeTicket,
        status: "Verifikasi",
        catatan: `${activeTicket.catatan}\n\n[Klarifikasi diajukan oleh ${currentUser?.name || "Mitra"} (${currentUser?.organization || "Mitra"}) pada ${nowStr}]: ${explanation.trim()}`,
        clarificationSubmittedAt: nowStr,
        clarificationSubmittedBy: currentUser?.name || "Mitra",
        clarificationRole: currentUser?.appRole || "mitra",
        clarificationOrganization: currentUser?.organization || currentUser?.sbu || "Mitra",
        clarificationNote: explanation.trim(),
        ...(clarificationFile?.files?.[0]?.name ? { clarificationBakFile: clarificationFile.files[0].name } : {}),
        ...(evidenceFiles?.files?.[0]?.name ? { clarificationEvidenceFile: evidenceFiles.files[0].name } : {}),
      };

      syncViolationRecord(updated);
      setRefreshTrigger((prev) => prev + 1);
      router.invalidate();

      toast.success(`Klarifikasi untuk tiket ${activeTicket.id} berhasil dikirim!`, {
        description: "Status tiket diperbarui menjadi Verifikasi. Data telah masuk ke daftar pending di sebelah kanan untuk cross check.",
      });

      // Beralih ke tab verifikasi agar user langsung melihat item barunya di daftar pending kanan
      setPendingTab("verifikasi");

      form.reset();
    } catch {
      toast.error("Gagal mengirim klarifikasi. Silakan coba kembali.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveClarification = () => {
    if (!crossCheckTicket) return;
    setReviewActionLoading(true);
    try {
      const nowStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updated: Violation = {
        ...crossCheckTicket,
        status: "Closed",
        poin: 0,
        clarificationReviewedAt: nowStr,
        clarificationReviewedBy: `${currentUser?.name || "Super Admin"} (${currentUser?.appRole === "super-admin" ? "Super Admin" : "Petugas QA/QC SBU"})`,
        clarificationReviewNote: reviewNote.trim() || "Klarifikasi dan bukti perbaikan disetujui. Tiket ditutup.",
        catatan: `${crossCheckTicket.catatan}\n\n[Diverifikasi & Disetujui oleh ${currentUser?.name || "Super Admin"} pada ${nowStr}]: ${reviewNote.trim() || "Klarifikasi dan bukti perbaikan disetujui. Tiket ditutup."}`,
      };

      syncViolationRecord(updated);
      setRefreshTrigger((prev) => prev + 1);
      router.invalidate();
      setCrossCheckTicket(null);
      setReviewNote("");
      toast.success(`Tiket ${crossCheckTicket.id} berhasil disetujui & ditutup (Closed)!`, {
        description: "Poin penalti tiket telah dipulihkan menjadi 0.",
      });
    } catch {
      toast.error("Gagal menyetujui klarifikasi.");
    } finally {
      setReviewActionLoading(false);
    }
  };

  const handleRejectClarification = () => {
    if (!crossCheckTicket) return;
    if (!reviewNote.trim()) {
      toast.error("Mohon tuliskan catatan alasan penolakan/revisi agar mitra dapat memperbaikinya.");
      return;
    }
    setReviewActionLoading(true);
    try {
      const nowStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updated: Violation = {
        ...crossCheckTicket,
        status: "Pending Klarifikasi",
        clarificationReviewedAt: nowStr,
        clarificationReviewedBy: `${currentUser?.name || "Super Admin"} (${currentUser?.appRole === "super-admin" ? "Super Admin" : "Petugas QA/QC SBU"})`,
        clarificationReviewNote: reviewNote.trim(),
        catatan: `${crossCheckTicket.catatan}\n\n[Revisi Diminta oleh ${currentUser?.name || "Super Admin"} pada ${nowStr}]: ${reviewNote.trim()}`,
      };

      syncViolationRecord(updated);
      setRefreshTrigger((prev) => prev + 1);
      router.invalidate();
      setCrossCheckTicket(null);
      setReviewNote("");
      toast.warning(`Tiket ${crossCheckTicket.id} dikembalikan untuk perbaikan (Pending Klarifikasi).`, {
        description: "Catatan revisi diteruskan ke mitra terkait.",
      });
    } catch {
      toast.error("Gagal meminta revisi klarifikasi.");
    } finally {
      setReviewActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="dashboard-enter space-y-4">
        <PageHeader
          title="Portal Klarifikasi"
          description="Layanan klarifikasi mandiri tiket pelanggaran instalasi material & jasa sesuai wilayah kerja."
        />

        {/* Informasi Hak Akses & Wilayah SBU Pengguna */}
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
                  {userSbuInfo && userSbuInfo.code !== "—" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 font-semibold text-primary shadow-2xs border border-primary/10">
                      <MapPin className="size-3" /> SBU {userSbuInfo.code} ({userSbuInfo.label})
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
      </div>

      {!activeTicket ? (
        <div
          className="dashboard-enter rounded-2xl border border-dashed border-border p-12 text-center bg-card mt-6"
          style={{ animationDelay: "100ms" }}
        >
          <CheckCircle2 className="size-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            Tidak Ada Tiket yang Perlu Diklarifikasi
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
            {currentUser?.appRole === "petugas-sbu"
              ? `Saat ini tidak ada tiket pelanggaran yang memerlukan klarifikasi di wilayah ${userSbuInfo?.label || "SBU Anda"}.`
              : currentUser?.appRole === "mitra" || currentUser?.appRole === "petugas-mitra"
              ? `Perusahaan Anda (${currentUser?.organization || "Mitra"}) di wilayah ${userSbuInfo?.label || "SBU Anda"} saat ini tidak memiliki tiket pelanggaran aktif yang memerlukan klarifikasi.`
              : "Saat ini tidak ada data tiket pelanggaran aktif yang memerlukan klarifikasi."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 mt-6">
          {/* Kolom Kiri: Formulir Klarifikasi & Detail Tiket Terpilih */}
          <div className="space-y-6 lg:col-span-2">
            {/* Pemilihan Tiket jika ada lebih dari 1 tiket yang sesuai lingkup */}
            {scopedViolations.length > 1 && (
              <Card className="dashboard-enter border-primary/20 shadow-xs">
                <CardHeader className="py-3 px-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileWarning className="size-4 text-amber-500" />
                      <CardTitle className="text-xs font-bold">
                        Pilih Tiket Pelanggaran ({scopedViolations.length} Tiket Tersedia)
                      </CardTitle>
                    </div>
                    <Select
                      value={activeTicket.id}
                      onValueChange={(val) => setSelectedTicketId(val)}
                    >
                      <SelectTrigger className="h-8 text-xs max-w-xs bg-muted/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scopedViolations.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.id} · {v.mitra} ({v.jenis})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Kartu Rincian Tiket Pelanggaran */}
            <Card className="dashboard-enter shadow-sm" style={{ animationDelay: "100ms" }}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {activeTicket.id}
                    </span>
                    <StatusPill tone={severityTone(activeTicket.severity)}>
                      {activeTicket.severity}
                    </StatusPill>
                    <StatusPill tone={statusTone(activeTicket.status)}>
                      {activeTicket.status}
                    </StatusPill>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3.5 text-amber-500" /> Deadline: {activeTicket.deadline}
                  </span>
                </div>
                <CardTitle className="mt-2 text-base font-bold text-foreground">
                  {activeTicket.jenis}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  ID PA ICRM: <strong>{activeTicket.idPa || "Belum dicatat"}</strong> · Mitra:{" "}
                  <strong>{activeTicket.mitra}</strong> · Wilayah SBU:{" "}
                  <strong>{getSbuInfo(activeTicket).full}</strong> · Lokasi:{" "}
                  <strong>{activeTicket.lokasi}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed border border-border/60">
                  <p className="font-semibold text-foreground mb-1">Catatan Temuan QA/QC:</p>
                  <p className="whitespace-pre-line">{activeTicket.catatan}</p>
                </div>
              </CardContent>
            </Card>

            {/* Formulir Klarifikasi & Tindak Lanjut */}
            <Card className="dashboard-enter shadow-sm" style={{ animationDelay: "220ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Form Klarifikasi &amp; Tindak Lanjut</CardTitle>
                <CardDescription className="text-xs">
                  Unggah Berita Acara Klarifikasi (BAK) serta bukti dokumentasi foto perbaikan before–after.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Banner Status Konteks Tiket Terpilih */}
                {activeTicket.status === "Verifikasi" && (
                  <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <Clock className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-bold">Klarifikasi Sedang Dalam Proses Verifikasi</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        Tiket ini telah diajukan klarifikasinya{activeTicket.clarificationSubmittedAt ? ` pada ${activeTicket.clarificationSubmittedAt}` : ""} dan sedang menunggu review tim QA/QC PLN Icon Plus. Anda dapat mengirimkan pembaruan keterangan atau berkas tambahan di bawah ini jika diperlukan.
                      </p>
                    </div>
                  </div>
                )}

                {activeTicket.status === "Closed" && (
                  <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-bold">Tiket Telah Selesai (Closed)</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        Klarifikasi dan bukti perbaikan telah diverifikasi serta disetujui. Poin penalti tiket ini telah dipulihkan menjadi 0.
                      </p>
                    </div>
                  </div>
                )}

                {activeTicket.clarificationReviewNote && activeTicket.status === "Pending Klarifikasi" && (
                  <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                    <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-bold">Catatan Permintaan Revisi Verifikator:</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed font-medium">
                        &ldquo;{activeTicket.clarificationReviewNote}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleKirimKlarifikasi}>
                  <div>
                    <Label className="mb-2 block text-xs font-semibold">
                      Penjelasan &amp; Tindak Lanjut Mitra <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      name="explanation"
                      rows={5}
                      required
                      defaultValue={activeTicket.clarificationNote || ""}
                      placeholder="Jelaskan penyebab temuan, tindakan perbaikan yang telah dilakukan di lapangan, serta langkah pencegahan ke depan..."
                      className="text-xs leading-relaxed"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <UploadBox
                      label="Berita Acara Klarifikasi (BAK)"
                      icon={<FileUp className="size-5 text-primary" />}
                      name="clarification-file"
                      accept=".pdf,image/*"
                      required
                    />
                    <UploadBox
                      label="Foto Bukti Perbaikan Before–After"
                      icon={<Upload className="size-5 text-primary" />}
                      name="evidence-files"
                      accept="image/*"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    <Send className="size-4" />
                    <span>{submitting ? "Mengirim Klarifikasi..." : "Kirim Klarifikasi"}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Kolom Kanan: Data Klarifikasi Pending & Cross Check */}
          <div className="space-y-4">
            <Card className="dashboard-enter shadow-sm border-primary/20" style={{ animationDelay: "300ms" }}>
              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-4 text-amber-500" />
                    <CardTitle className="text-sm font-bold">Data Klarifikasi Pending</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-mono">
                    {verifikasiTickets.length + pendingKlarifikasiTickets.length} Pending
                  </Badge>
                </div>
                <CardDescription className="text-xs leading-relaxed">
                  {currentUser?.appRole === "super-admin" || currentUser?.appRole === "petugas-sbu"
                    ? "Daftar pengajuan klarifikasi mitra yang perlu di-cross check dan diverifikasi."
                    : "Pantau posisi data klarifikasi yang telah Anda ajukan hingga disetujui."}
                </CardDescription>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setPendingTab("verifikasi")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
                      pendingTab === "verifikasi"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <span>Menunggu Verifikasi</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px]",
                        pendingTab === "verifikasi" ? "bg-white/20 text-white" : "bg-background text-foreground"
                      )}
                    >
                      {verifikasiTickets.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingTab("pending")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
                      pendingTab === "pending"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <span>Perlu Klarifikasi</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px]",
                        pendingTab === "pending" ? "bg-white/20 text-white" : "bg-background text-foreground"
                      )}
                    >
                      {pendingKlarifikasiTickets.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingTab("closed")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
                      pendingTab === "closed"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <span>Selesai</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px]",
                        pendingTab === "closed" ? "bg-white/20 text-white" : "bg-background text-foreground"
                      )}
                    >
                      {closedTickets.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingTab("semua")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
                      pendingTab === "semua"
                        ? "bg-slate-700 text-white shadow-2xs dark:bg-slate-300 dark:text-slate-900"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <span>Semua</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px]",
                        pendingTab === "semua" ? "bg-white/20 text-white" : "bg-background text-foreground"
                      )}
                    >
                      {scopedViolations.length}
                    </span>
                  </button>
                </div>

                {/* Kolom Pencarian Tiket Pending */}
                <div className="relative pt-1">
                  <Search className="absolute left-2.5 top-3 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari ID tiket, mitra, jenis..."
                    value={searchPendingQuery}
                    onChange={(e) => setSearchPendingQuery(e.target.value)}
                    className="h-8 text-xs pl-8 bg-muted/30"
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0 max-h-[540px] overflow-y-auto pr-1">
                {displayedPendingList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-foreground">Tidak Ada Data</p>
                    <p className="mt-0.5">
                      {pendingTab === "verifikasi"
                        ? "Belum ada tiket yang sedang menunggu verifikasi pada filter ini."
                        : pendingTab === "pending"
                        ? "Tidak ada tiket yang memerlukan klarifikasi saat ini."
                        : pendingTab === "closed"
                        ? "Belum ada tiket yang disetujui & ditutup."
                        : "Tidak ada tiket yang cocok dengan pencarian."}
                    </p>
                  </div>
                ) : (
                  displayedPendingList.map((v) => {
                    const isVerif = v.status === "Verifikasi";
                    const isClosed = v.status === "Closed";
                    const isSelectedInForm = activeTicket?.id === v.id;

                    return (
                      <div
                        key={v.id}
                        className={cn(
                          "rounded-xl border p-3 text-xs transition-all space-y-2.5",
                          isSelectedInForm ? "ring-2 ring-primary/60" : "",
                          isVerif
                            ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70"
                            : isClosed
                            ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60"
                            : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        {/* Top: ID, Severity, Status */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {v.id}
                            </span>
                            <StatusPill tone={severityTone(v.severity)}>
                              {v.severity}
                            </StatusPill>
                          </div>
                          <StatusPill tone={statusTone(v.status)}>
                            {v.status}
                          </StatusPill>
                        </div>

                        {/* Mitra & SBU */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-foreground text-xs truncate">
                              {v.mitra}
                            </p>
                            <span className="shrink-0 font-mono text-[10px] font-semibold bg-muted px-1.5 py-0.2 rounded border">
                              {getSbuInfo(v).code}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {v.jenis}
                          </p>
                        </div>

                        {/* Visual Progress Stepper: Posisi Data */}
                        <div className="rounded-lg bg-muted/40 p-2 border border-border/60 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-muted-foreground">Posisi Data:</span>
                            <span
                              className={cn(
                                "font-bold",
                                isClosed
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isVerif
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {isClosed
                                ? "✓ Selesai Diverifikasi"
                                : isVerif
                                ? "⏳ Sedang Diverifikasi QA/QC"
                                : "📝 Menunggu Input Klarifikasi"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[9px] text-center font-medium">
                            <div className="rounded border border-emerald-500/30 bg-emerald-500/20 py-0.5 text-emerald-700 dark:text-emerald-300">
                              ✓ Dilaporkan
                            </div>
                            <div
                              className={cn(
                                "rounded border py-0.5",
                                isVerif || isClosed
                                  ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : "border-border bg-muted text-muted-foreground"
                              )}
                            >
                              {isVerif || isClosed ? "✓ Klarifikasi" : "⏳ Klarifikasi"}
                            </div>
                            <div
                              className={cn(
                                "rounded border py-0.5",
                                isClosed
                                  ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : isVerif
                                  ? "border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse font-bold"
                                  : "border-border bg-muted text-muted-foreground"
                              )}
                            >
                              {isClosed ? "✓ Selesai" : "⏳ Verifikasi"}
                            </div>
                          </div>
                        </div>

                        {/* Jika sudah ada klarifikasi yang diinput */}
                        {v.clarificationSubmittedAt && (
                          <div className="space-y-1 text-[11px] text-muted-foreground border-t border-border/50 pt-1.5">
                            <div className="flex items-center justify-between">
                              <span>Diajukan: <strong>{v.clarificationSubmittedAt}</strong></span>
                              <span className="truncate max-w-[120px] text-right">
                                Oleh: {v.clarificationSubmittedBy || "Mitra"}
                              </span>
                            </div>
                            {v.clarificationNote && (
                              <p className="line-clamp-2 italic text-foreground/80 bg-background/50 p-1.5 rounded border border-border/40 text-[10px]">
                                &ldquo;{v.clarificationNote}&rdquo;
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {v.clarificationBakFile && (
                                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-medium text-primary">
                                  <FileText className="size-2.5" /> BAK: {v.clarificationBakFile}
                                </span>
                              )}
                              {v.clarificationEvidenceFile && (
                                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-medium text-primary">
                                  <Upload className="size-2.5" /> Foto: {v.clarificationEvidenceFile}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Catatan Review Jika Ada (cth: Revisi Diminta) */}
                        {v.clarificationReviewNote && v.status === "Pending Klarifikasi" && (
                          <div className="rounded-lg bg-rose-500/10 p-2 text-[10px] text-rose-700 dark:text-rose-300 border border-rose-500/20">
                            <strong>⚠️ Catatan Revisi Verifikator:</strong> {v.clarificationReviewNote}
                          </div>
                        )}

                        {/* Tombol Aksi */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant={isVerif ? "default" : "outline"}
                            className={cn(
                              "h-7 text-xs flex-1 gap-1 cursor-pointer",
                              isVerif ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                            )}
                            onClick={() => {
                              setCrossCheckTicket(v);
                              setReviewNote(v.clarificationReviewNote || "");
                            }}
                          >
                            <Eye className="size-3" />
                            <span>
                              {currentUser?.appRole === "super-admin" || currentUser?.appRole === "petugas-sbu"
                                ? isVerif
                                  ? "Cross Check"
                                  : "Detail Tiket"
                                : "Lihat Status & Detail"}
                            </span>
                          </Button>

                          {!isClosed && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-primary hover:bg-primary/10 cursor-pointer"
                              title="Tampilkan di formulir klarifikasi sebelah kiri"
                              onClick={() => {
                                setSelectedTicketId(v.id);
                                toast.info(`Tiket ${v.id} dimuat di formulir klarifikasi.`);
                              }}
                            >
                              <span>Buka Form</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Riwayat Komunikasi & Audit Trail (Collapsible) */}
            <Card className="dashboard-enter shadow-sm" style={{ animationDelay: "340ms" }}>
              <CardHeader
                className="py-3 px-4 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl"
                onClick={() => setShowAuditTrail(!showAuditTrail)}
              >
                <div>
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <History className="size-3.5 text-muted-foreground" />
                    Riwayat Komunikasi &amp; Audit Trail
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Transparansi antara Mitra, Petugas SBU, dan Tim Material &amp; Jasa.
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {showAuditTrail ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </CardHeader>
              {showAuditTrail && (
                <CardContent className="space-y-3 pt-0 pb-4">
                  {auditTrail.map((a, i) => (
                    <div key={i} className="border-l-2 border-primary/40 pl-3 space-y-0.5">
                      <p className="text-[10px] font-mono text-muted-foreground">{a.waktu}</p>
                      <p className="text-xs font-bold text-foreground">{a.aktor}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{a.aksi}</p>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Modal Cross Check & Detail Klarifikasi */}
      {crossCheckTicket && (
        <Dialog open={Boolean(crossCheckTicket)} onOpenChange={(open) => !open && setCrossCheckTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {crossCheckTicket.id}
                  </span>
                  <StatusPill tone={severityTone(crossCheckTicket.severity)}>
                    {crossCheckTicket.severity}
                  </StatusPill>
                  <StatusPill tone={statusTone(crossCheckTicket.status)}>
                    {crossCheckTicket.status}
                  </StatusPill>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  SBU: {getSbuInfo(crossCheckTicket).code}
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold text-foreground mt-2">
                Cross Check Klarifikasi Pelanggaran
              </DialogTitle>
              <DialogDescription className="text-xs">
                Periksa kesesuaian antara temuan inspeksi lapangan dengan penjelasan dan dokumen bukti yang diajukan mitra.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-2">
              {/* Bagian 1: Temuan Lapangan Awal */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <FileWarning className="size-3.5 text-amber-500" />
                  <span>1. Informasi Temuan Pelanggaran</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">ID PA / ICRM:</span>
                    <p className="font-semibold text-foreground">{crossCheckTicket.idPa || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mitra Pelaksana:</span>
                    <p className="font-semibold text-foreground">{crossCheckTicket.mitra}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Petugas Lapangan:</span>
                    <p className="font-semibold text-foreground">{crossCheckTicket.petugas}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wilayah SBU:</span>
                    <p className="font-semibold text-foreground">{getSbuInfo(crossCheckTicket).full}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lokasi FAT / Pelanggan:</span>
                    <p className="font-semibold text-foreground">{crossCheckTicket.lokasi}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Poin Penalti:</span>
                    <p className="font-semibold text-rose-600 dark:text-rose-400">{crossCheckTicket.poin} Poin</p>
                  </div>
                </div>
                <div className="rounded-lg bg-background p-2.5 border border-border/60 text-[11px] leading-relaxed">
                  <span className="font-semibold text-muted-foreground block mb-0.5">Catatan Temuan Inspeksi:</span>
                  <p className="whitespace-pre-line text-foreground">
                    {crossCheckTicket.catatan.split("\n\n[")[0] || crossCheckTicket.catatan}
                  </p>
                </div>
              </div>

              {/* Bagian 2: Data Klarifikasi & Bukti Mitra */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-primary flex items-center gap-1.5 text-xs">
                    <FileCheck2 className="size-3.5" />
                    <span>2. Dokumen &amp; Penjelasan Klarifikasi Mitra</span>
                  </p>
                  {crossCheckTicket.clarificationSubmittedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      Diajukan: {crossCheckTicket.clarificationSubmittedAt}
                    </span>
                  )}
                </div>

                <div className="text-[11px] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Diajukan Oleh:</span>
                    <span className="font-semibold text-foreground">
                      {crossCheckTicket.clarificationSubmittedBy || crossCheckTicket.mitra}
                      {crossCheckTicket.clarificationOrganization ? ` (${crossCheckTicket.clarificationOrganization})` : ""}
                    </span>
                  </div>

                  <div className="rounded-lg bg-background p-2.5 border border-border/60 leading-relaxed">
                    <span className="font-semibold text-muted-foreground block mb-0.5">Penjelasan &amp; Kronologi Tindak Lanjut:</span>
                    <p className="text-foreground whitespace-pre-line">
                      {crossCheckTicket.clarificationNote || "Penjelasan klarifikasi telah tercatat di riwayat tiket."}
                    </p>
                  </div>

                  {/* Berkas Lampiran */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-2 rounded-lg bg-background p-2 border border-border/60">
                      <FileUp className="size-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[11px] text-foreground truncate">
                          {crossCheckTicket.clarificationBakFile || "Berita Acara Klarifikasi (BAK).pdf"}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Dokumen Terunggah</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-background p-2 border border-border/60">
                      <Upload className="size-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[11px] text-foreground truncate">
                          {crossCheckTicket.clarificationEvidenceFile || "Foto Bukti Before-After.jpg"}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Foto Dokumentasi Terunggah</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Riwayat Verifikasi / Catatan Terdahulu */}
              {crossCheckTicket.clarificationReviewNote && (
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">Catatan Verifikator Terdahulu:</span>
                    <span className="text-[10px] text-muted-foreground">{crossCheckTicket.clarificationReviewedAt}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{crossCheckTicket.clarificationReviewNote}</p>
                </div>
              )}

              {/* Bagian 4: Aksi Keputusan Cross Check (Khusus Super Admin & Petugas QA/QC SBU) */}
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
                      Catatan Verifikator (Wajib diisi jika menolak / meminta revisi):
                    </Label>
                    <Textarea
                      rows={2}
                      placeholder="Tuliskan catatan verifikasi (cth: Bukti foto dan BAK telah sesuai standar K3, klarifikasi disetujui)..."
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
                      onClick={() => setCrossCheckTicket(null)}
                      disabled={reviewActionLoading}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 cursor-pointer"
                      onClick={handleRejectClarification}
                      disabled={reviewActionLoading}
                    >
                      <X className="size-3.5" />
                      <span>{reviewActionLoading ? "Menyimpan..." : "Tolak / Minta Revisi"}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                      onClick={handleApproveClarification}
                      disabled={reviewActionLoading}
                    >
                      <Check className="size-3.5" />
                      <span>{reviewActionLoading ? "Menyimpan..." : "Setujui & Tutup Tiket (Closed)"}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-center space-y-1">
                  <p className="font-semibold text-foreground">
                    {crossCheckTicket.status === "Closed"
                      ? "✓ Tiket ini telah selesai diverifikasi dan dinyatakan ditutup (Closed)."
                      : crossCheckTicket.status === "Verifikasi"
                      ? "⏳ Klarifikasi Anda telah masuk ke sistem dan sedang menunggu proses cross check oleh Tim QA/QC PLN Icon Plus."
                      : "📝 Tiket ini sedang menunggu pengisian klarifikasi dan berkas perbaikan."}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Jika ada perubahan atau tambahan dokumen sebelum tiket ditutup, Anda dapat memperbarui formulir di sebelah kiri.
                  </p>
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCrossCheckTicket(null)}
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

function UploadBox({
  label,
  icon,
  name,
  accept,
  required,
}: {
  label: string;
  icon: React.ReactNode;
  name: string;
  accept: string;
  required?: boolean;
}) {
  const [fileName, setFileName] = useState<string>("");

  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground hover:border-primary/50 transition-colors bg-muted/20 hover:bg-muted/40 p-4">
      {icon}
      <span className="font-semibold text-foreground">{label}</span>
      <span className="text-[11px] text-muted-foreground">
        {fileName ? `File terpilih: ${fileName}` : "Klik untuk memilih file dokumen / foto"}
      </span>
      <input
        type="file"
        name={name}
        required={required}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files[0]) {
            setFileName(files[0].name);
          }
        }}
      />
    </label>
  );
}
