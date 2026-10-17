import { createFileRoute } from "@tanstack/react-router";
import { getCurrentAuthUser, requireRouteAccess } from "@/lib/auth-server";
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
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  sbuOptions,
  severityTone,
  statusTone,
  violations,
  type Violation,
} from "@/lib/iconguard-data";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/portal")({
  beforeLoad: () => requireRouteAccess("/portal"),
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
  const [, setRefreshTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [selectedSbuFilter, setSelectedSbuFilter] = useState<string>("ALL");
  const [submitting, setSubmitting] = useState(false);

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

  const custom = getCustomViolationsFromStorage();
  const deleted = new Set(getDeletedViolationIds());
  const allList = useMemo(() => {
    return [...custom, ...violations].filter((v) => !deleted.has(v.id) && isRealViolation(v));
  }, [custom, deleted]);

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
    return scopedViolations[0];
  }, [scopedViolations, selectedTicketId]);

  const userSbuInfo = useMemo(() => {
    if (!currentUser) return null;
    return getSbuInfo(currentUser.sbu || currentUser.organization);
  }, [currentUser]);

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
      const updated: Violation = {
        ...activeTicket,
        status: "Verifikasi",
        catatan: `${activeTicket.catatan}\n\n[Klarifikasi diajukan oleh ${currentUser?.name || "Mitra"} (${currentUser?.organization || "Mitra"})]: ${explanation.trim()}`,
      };

      saveCustomViolationToStorage(updated);
      setRefreshTrigger((prev) => prev + 1);

      toast.success(`Klarifikasi untuk tiket ${activeTicket.id} berhasil dikirim!`, {
        description: "Status tiket diperbarui menjadi Verifikasi. Tim QA/QC akan memverifikasi bukti Anda.",
      });

      form.reset();
    } catch {
      toast.error("Gagal mengirim klarifikasi. Silakan coba kembali.");
    } finally {
      setSubmitting(false);
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
                  <span>Akses: {currentUser.appRole === "super-admin" ? "Super Admin (Nasional)" : currentUser.appRole === "petugas-sbu" ? "Petugas QA/QC SBU" : "Mitra / Petugas Lapangan"}</span>
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
                <form className="space-y-4" onSubmit={handleKirimKlarifikasi}>
                  <div>
                    <Label className="mb-2 block text-xs font-semibold">
                      Penjelasan &amp; Tindak Lanjut Mitra <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      name="explanation"
                      rows={5}
                      required
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

          {/* Riwayat Komunikasi & Status Klarifikasi */}
          <div className="space-y-4">
            <Card className="dashboard-enter shadow-sm" style={{ animationDelay: "340ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Riwayat Komunikasi &amp; Audit Trail</CardTitle>
                <CardDescription className="text-xs">
                  Transparansi antara Mitra, Petugas SBU, dan Tim Material &amp; Jasa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {auditTrail.map((a, i) => (
                  <div key={i} className="border-l-2 border-primary/40 pl-3 space-y-0.5">
                    <p className="text-[10px] font-mono text-muted-foreground">{a.waktu}</p>
                    <p className="text-xs font-bold text-foreground">{a.aktor}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.aksi}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
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
          if (files && files.length > 0) {
            setFileName(files[0].name);
          }
        }}
      />
    </label>
  );
}
