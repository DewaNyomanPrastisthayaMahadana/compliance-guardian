import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { deleteViolationReport, getPelanggaranData, requireRouteAccess } from "@/lib/auth-server";
import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, MapPin, Plus, Search, Trash2, Table as TableIcon, LayoutList, Building2, CheckCircle2, Calendar, Handshake } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { ExcelImportModal } from "@/components/excel-import-modal";
import { PivotTableView, SBU_REGIONAL_CONFIG, MONTHS_ALL } from "@/components/pivot-table-view";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteViolationEvidence, loadViolationEvidence } from "@/lib/evidence-storage";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  auditTrail,
  getDeletedViolationIds,
  removeViolationRecord,
  severityTone,
  statusTone,
  violations,
  getCustomViolationsFromStorage,
  hydrateCustomDataFromIndexedDB,
  sbuOptions,
  type Violation,
} from "@/lib/iconguard-data";

export const Route = createFileRoute("/pelanggaran")({
  beforeLoad: () => requireRouteAccess("/pelanggaran"),
  loader: () => getPelanggaranData(),
  head: () => ({
    meta: [
      { title: "Manajemen Pelanggaran — IconGuard" },
      {
        name: "description",
        content:
          "Daftar tiket pelanggaran mitra beserta status klarifikasi, deadline SLA, dan audit trail.",
      },
      { property: "og:title", content: "Manajemen Pelanggaran — IconGuard" },
      {
        property: "og:description",
        content: "Pantau status setiap tiket pelanggaran dan riwayat eskalasi reminder otomatis.",
      },
    ],
  }),
  component: PelanggaranPage,
});

const filters = ["Semua", "Aktif", "Overdue", "Closed"] as const;

function matches(v: Violation, filter: (typeof filters)[number]) {
  if (filter === "Semua") return true;
  if (filter === "Closed") return v.status === "Closed";
  if (filter === "Overdue") return v.status === "Overdue";
  return v.status !== "Closed";
}

function PelanggaranPage() {
  const router = useRouter();
  const { violations: loadedViolations, canDelete } = Route.useLoaderData();
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Violation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const allViolations = useMemo(() => {
    const deletedIdsSet = new Set(getDeletedViolationIds());
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    const custom = getCustomViolationsFromStorage();
    if (isOverridden && custom.length > 0) {
      return custom.filter((v) => !deletedIdsSet.has(v.id));
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
    return combined.filter((v) => !deletedIdsSet.has(v.id));
  }, [loadedViolations, refreshTrigger]);
  const visibleViolations = allViolations.filter((violation) => !deletedIds.includes(violation.id));
  const [filter, setFilter] = useState<(typeof filters)[number]>("Semua");
  const [q, setQ] = useState("");
  const [selectedSbu, setSelectedSbu] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedMitra, setSelectedMitra] = useState<string>("SEMUA");
  const [selectedId, setSelectedId] = useState("");
  const [storedEvidence, setStoredEvidence] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "pivot">("list");

  // Helper ekstrak bulan dari string tanggal
  const getMonthKey = (dateRaw?: string): string => {
    const dateStr = (dateRaw || "").toLowerCase();
    if (dateStr.includes("jan") || dateStr.includes("-01-") || dateStr.includes("/01/")) return "Jan";
    if (dateStr.includes("feb") || dateStr.includes("-02-") || dateStr.includes("/02/")) return "Feb";
    if (dateStr.includes("mar") || dateStr.includes("-03-") || dateStr.includes("/03/")) return "Mar";
    if (dateStr.includes("apr") || dateStr.includes("-04-") || dateStr.includes("/04/")) return "Apr";
    if (dateStr.includes("mei") || dateStr.includes("may") || dateStr.includes("-05-") || dateStr.includes("/05/")) return "Mei";
    if (dateStr.includes("jun") || dateStr.includes("-06-") || dateStr.includes("/06/")) return "Jun";
    if (dateStr.includes("jul") || dateStr.includes("-07-") || dateStr.includes("/07/")) return "Jul";
    if (dateStr.includes("agu") || dateStr.includes("aug") || dateStr.includes("-08-") || dateStr.includes("/08/")) return "Agu";
    if (dateStr.includes("sep") || dateStr.includes("-09-") || dateStr.includes("/09/")) return "Sep";
    if (dateStr.includes("okt") || dateStr.includes("oct") || dateStr.includes("-10-") || dateStr.includes("/10/")) return "Okt";
    if (dateStr.includes("nov") || dateStr.includes("-11-") || dateStr.includes("/11/")) return "Nov";
    if (dateStr.includes("des") || dateStr.includes("dec") || dateStr.includes("-12-") || dateStr.includes("/12/")) return "Des";
    return "";
  };

  // Helper normalisasi SBU dari data tiket
  const getSbuKey = (v: Violation): string => {
    const raw = (v.sbu || v.lokasi || "").trim().toUpperCase();
    for (const key of Object.keys(SBU_REGIONAL_CONFIG)) {
      if (raw.includes(key) || raw.startsWith(key)) return key;
      const conf = SBU_REGIONAL_CONFIG[key];
      if (conf?.label && raw.includes(conf.label.toUpperCase())) return key;
      if (conf?.short && raw.includes(conf.short.toUpperCase())) return key;
    }
    const match = raw.match(/^(\d{2}[A-Z]+)/);
    if (match && match[1]) return match[1];
    return raw || "LAINNYA";
  };

  // Kumpulkan daftar SBU yang tersedia beserta jumlah tiketnya
  const availableSbuList = useMemo(() => {
    const sbuMap: Record<string, { key: string; label: string; count: number }> = {};

    Object.entries(SBU_REGIONAL_CONFIG).forEach(([key, cfg]) => {
      sbuMap[key] = {
        key,
        label: `${cfg.label} (${key})`,
        count: 0,
      };
    });

    visibleViolations.forEach((v) => {
      const sKey = getSbuKey(v);
      if (!sbuMap[sKey]) {
        sbuMap[sKey] = {
          key: sKey,
          label: sKey,
          count: 0,
        };
      }
      sbuMap[sKey].count += 1;
    });

    return Object.values(sbuMap);
  }, [visibleViolations]);

  // Daftar bulan yang memiliki data untuk SBU terpilih
  const availableMonths = useMemo(() => {
    const counts: Record<string, number> = {};
    MONTHS_ALL.forEach((m) => {
      counts[m] = 0;
    });

    visibleViolations.forEach((v) => {
      if (selectedSbu && selectedSbu !== "SEMUA" && getSbuKey(v) !== selectedSbu) return;
      const m = getMonthKey(v.tanggalCek || v.createdAt);
      if (m && counts[m] !== undefined) {
        counts[m] += 1;
      }
    });

    return MONTHS_ALL.map((m) => ({
      bulan: m,
      count: counts[m] || 0,
    }));
  }, [visibleViolations, selectedSbu]);

  // Daftar Mitra yang tersedia untuk SBU & Bulan terpilih
  const availableMitraList = useMemo(() => {
    const counts: Record<string, number> = {};

    visibleViolations.forEach((v) => {
      if (selectedSbu && selectedSbu !== "SEMUA" && getSbuKey(v) !== selectedSbu) return;
      const m = getMonthKey(v.tanggalCek || v.createdAt);
      if (selectedMonth && selectedMonth !== "SEMUA" && m !== selectedMonth) return;
      const mName = (v.mitra || "").trim();
      if (mName) {
        counts[mName] = (counts[mName] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([nama, count]) => ({ nama, count }))
      .sort((a, b) => b.count - a.count || a.nama.localeCompare(b.nama));
  }, [visibleViolations, selectedSbu, selectedMonth]);

  const availableMitraTotalCount = useMemo(() => {
    return availableMitraList.reduce((acc, curr) => acc + curr.count, 0);
  }, [availableMitraList]);

  // Reset filter mitra ke SEMUA jika mitra yang dipilih sebelumnya tidak ada di SBU/Bulan saat ini
  useEffect(() => {
    if (selectedMitra && selectedMitra !== "SEMUA") {
      const exists = availableMitraList.some(
        (m) => m.nama.trim().toLowerCase() === selectedMitra.trim().toLowerCase(),
      );
      if (!exists) {
        setSelectedMitra("SEMUA");
      }
    }
  }, [availableMitraList, selectedMitra]);

  useEffect(() => {
    setDeletedIds(getDeletedViolationIds());
    const onHydrated = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("iconguard-data-hydrated", onHydrated);
    void hydrateCustomDataFromIndexedDB();
    return () => window.removeEventListener("iconguard-data-hydrated", onHydrated);
  }, []);

  useEffect(() => {
    const recentId = window.sessionStorage.getItem("iconguard:last-submitted-violation");
    if (recentId && allViolations.some((violation) => violation.id === recentId)) {
      setSelectedId(recentId);
      window.sessionStorage.removeItem("iconguard:last-submitted-violation");
    }
  }, [allViolations]);

  const list = useMemo(
    () => {
      if (!selectedSbu || !selectedMonth) return [];
      return visibleViolations.filter((v) => {
        const matchesSbu = selectedSbu === "SEMUA" || getSbuKey(v) === selectedSbu;
        const vMonth = getMonthKey(v.tanggalCek || v.createdAt);
        const matchesMonth = selectedMonth === "SEMUA" || vMonth === selectedMonth;
        const matchesMitra =
          !selectedMitra ||
          selectedMitra === "SEMUA" ||
          v.mitra.trim().toLowerCase() === selectedMitra.trim().toLowerCase();
        const matchesTab = matches(v, filter);
        const matchesSearch = (v.mitra + v.petugas + v.jenis + v.id + (v.idPa ?? "") + (v.sbu ?? "") + (v.lokasi ?? ""))
          .toLowerCase()
          .includes(q.toLowerCase());
        return matchesSbu && matchesMonth && matchesMitra && matchesTab && matchesSearch;
      });
    },
    [visibleViolations, selectedSbu, selectedMonth, selectedMitra, filter, q],
  );

  const activeSelectedId = list.some((v) => v.id === selectedId)
    ? selectedId
    : (list[0]?.id ?? "");

  const selected = list.find((v) => v.id === activeSelectedId) ?? list[0];

  const handleDeleteViolation = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteViolationReport({ data: { id: pendingDelete.id } });
      removeViolationRecord(pendingDelete.id);
      await deleteViolationEvidence(pendingDelete.id).catch(() => undefined);
      setDeletedIds((current) => [...new Set([...current, pendingDelete.id])]);
      setSelectedId(visibleViolations.find((item) => item.id !== pendingDelete.id)?.id ?? "");
      setDeleteOpen(false);
      setPendingDelete(null);
      toast.success(`Pelanggaran ${pendingDelete.id} berhasil dihapus.`);
      await router.invalidate();
    } catch (error) {
      console.error(error);
      setDeleteError("Pelanggaran gagal dihapus. Silakan coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setStoredEvidence([]);
    if (!selected?.id || selected.bukti?.length) return;
    void loadViolationEvidence(selected.id)
      .then((photos) => {
        if (!cancelled) setStoredEvidence(photos);
      })
      .catch((error) => console.error("Gagal memuat foto bukti:", error));
    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.bukti]);

  return (
    <AppShell>
      <div className="dashboard-enter">
        <PageHeader
          title="Violation & Incident Management"
          description="Semua tiket pelanggaran dengan deadline klarifikasi otomatis berdasarkan kategori."
          action={
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  <LayoutList className="size-3.5" />
                  Daftar Tiket
                </Button>
                <Button
                  variant={viewMode === "pivot" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("pivot")}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  <TableIcon className="size-3.5" />
                  Pivot Table
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setImportModalOpen(true)}
                className="gap-1.5"
              >
                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                Upload Data Excel
              </Button>
              <Button asChild>
                <Link to="/lapor">
                  <Plus className="size-4" /> Input Pelanggaran
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => {
          setRefreshTrigger((prev) => prev + 1);
          router.invalidate();
        }}
      />

      {viewMode === "pivot" ? (
        <PivotTableView violations={visibleViolations} />
      ) : (
        <>
          <div
            className="dashboard-enter mb-4 flex flex-wrap items-center justify-between gap-3"
            style={{ animationDelay: "90ms" }}
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Pilih SBU */}
              <div className="flex items-center gap-2">
                <Select value={selectedSbu} onValueChange={(val) => setSelectedSbu(val)}>
                  <SelectTrigger className="w-auto min-w-[245px] h-9 px-3.5 text-xs font-semibold bg-background border-border gap-2">
                    <Building2 className="mr-0.5 size-4 text-primary shrink-0" />
                    <SelectValue placeholder="Pilih SBU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMUA" className="text-xs font-semibold text-primary">
                      🌐 Semua SBU ({visibleViolations.length} Tiket)
                    </SelectItem>
                    {availableSbuList.map((sbu) => (
                      <SelectItem key={sbu.key} value={sbu.key} className="text-xs">
                        {sbu.label} ({sbu.count} Tiket)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Pilih Bulan */}
              <div className="flex items-center gap-2">
                <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
                  <SelectTrigger className="w-auto min-w-[170px] h-9 px-3.5 text-xs font-semibold bg-background border-border gap-2">
                    <Calendar className="mr-0.5 size-4 text-primary shrink-0" />
                    <SelectValue placeholder="Pilih Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMUA" className="text-xs font-semibold text-primary">
                      📅 Semua Bulan
                    </SelectItem>
                    {availableMonths.map((m) => (
                      <SelectItem key={m.bulan} value={m.bulan} className="text-xs">
                        Bulan {m.bulan} ({m.count} Tiket)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Pilih Mitra */}
              <div className="flex items-center gap-2">
                <Select value={selectedMitra} onValueChange={(val) => setSelectedMitra(val)}>
                  <SelectTrigger className="w-auto min-w-[200px] max-w-[280px] h-9 px-3.5 text-xs font-semibold bg-background border-border gap-2">
                    <Handshake className="mr-0.5 size-4 text-primary shrink-0" />
                    <SelectValue placeholder="Pilih Mitra" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="SEMUA" className="text-xs font-semibold text-primary">
                      🤝 Semua Mitra ({availableMitraTotalCount} Tiket)
                    </SelectItem>
                    {availableMitraList.map((m) => (
                      <SelectItem key={m.nama} value={m.nama} className="text-xs">
                        <span className="truncate max-w-[220px] inline-block align-bottom">{m.nama}</span> ({m.count} Tiket)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList className="h-9 max-w-full flex-wrap justify-start">
                  {filters.map((f) => (
                    <TabsTrigger key={f} value={f} className="text-xs">
                      {f}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari mitra, petugas, tiket..."
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {list.map((v, index) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              style={{ animationDelay: `${Math.min(index, 5) * 90 + 180}ms` }}
              className={`dashboard-enter w-full rounded-xl border p-4 text-left transition-colors ${
                v.id === activeSelectedId
                  ? "border-primary bg-secondary"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{v.id}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  ID PA: {v.idPa ?? "Belum dicatat"}
                </span>
                <StatusPill tone={severityTone(v.severity)}>{v.severity}</StatusPill>
                <StatusPill tone={statusTone(v.status)}>{v.status}</StatusPill>
                <span className="ml-auto text-xs text-muted-foreground">{v.createdAt}</span>
              </div>
              <p className="mt-2 font-semibold">{v.jenis}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{v.mitra}</span> · Petugas Mitra: {v.petugas}
                {v.petugasQc && v.petugasQc !== v.sbu && !sbuOptions.some((s) => s.code === v.petugasQc) ? ` · QC SBU: ${v.petugasQc}` : ""}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {v.lokasi} · deadline {v.deadline}
              </p>
            </button>
          ))}
          {list.length === 0 && (
            <div
              className="dashboard-enter rounded-xl border border-dashed border-border p-10 text-center"
              style={{ animationDelay: "180ms" }}
            >
              {!selectedSbu || !selectedMonth ? (
                <>
                  <Building2 className="size-8 text-primary mx-auto mb-2.5 opacity-80" />
                  <p className="font-semibold text-foreground">Silakan Pilih SBU dan Bulan Terlebih Dahulu</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Untuk menampilkan daftar tiket pelanggaran, pilih <strong>SBU</strong> dan <strong>Bulan</strong> pada menu filter di atas.
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Tidak Ada Tiket Pelanggaran</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {`Tidak ditemukan tiket pelanggaran untuk ${
                      selectedSbu === "SEMUA" ? "Semua SBU" : `SBU ${selectedSbu}`
                    }${
                      selectedMonth === "SEMUA" ? "" : ` di bulan ${selectedMonth}`
                    }${
                      selectedMitra && selectedMitra !== "SEMUA" ? ` pada Mitra ${selectedMitra}` : ""
                    } pada kriteria filter ini.`}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {selected ? (
            <Card className="dashboard-enter" style={{ animationDelay: "540ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="font-mono">{selected.id}</span>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={statusTone(selected.status)}>{selected.status}</StatusPill>
                    {canDelete && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        aria-label={`Hapus pelanggaran ${selected.id}`}
                        title="Hapus pelanggaran"
                        onClick={() => {
                          setPendingDelete(selected);
                          setDeleteError("");
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>{selected.jenis}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Detail label="ID PA ICRM" value={selected.idPa ?? "Belum dicatat"} />
              <Detail label="SBU Operasional" value={selected.sbu ?? selected.lokasi} />
              <Detail label="Nama Mitra" value={selected.mitra} />
              <Detail label="Petugas Mitra" value={selected.petugas} />
              <Detail
                label="Petugas QC SBU"
                value={
                  selected.petugasQc &&
                  selected.petugasQc !== selected.sbu &&
                  !sbuOptions.some((s) => s.code === selected.petugasQc)
                    ? selected.petugasQc
                    : "Belum dicatat"
                }
              />
              {selected.petugasMonitoringPusat && (
                <Detail label="Petugas Monitoring Pusat" value={selected.petugasMonitoringPusat} />
              )}
              {selected.tanggalCek && (
                <Detail label="Tanggal Cek / Inspeksi" value={selected.tanggalCek} />
              )}
              {selected.tanggalAktivasi && (
                <Detail label="Tanggal Aktivasi" value={selected.tanggalAktivasi} />
              )}
              {selected.tanggalPermohonan && (
                <Detail label="Tanggal Permohonan" value={selected.tanggalPermohonan} />
              )}
              {selected.kp && <Detail label="Kantor Perwakilan (KP)" value={selected.kp} />}
              {selected.idFat && <Detail label="ID FAT" value={selected.idFat} />}
              {selected.dwGudang && <Detail label="DW Gudang" value={selected.dwGudang} />}
              {selected.lokasiFatPelanggan && (
                <Detail label="Lokasi FAT - Pelanggan" value={selected.lokasiFatPelanggan} />
              )}
              <Detail
                label="Kategori / poin sanksi"
                value={`${selected.severity} · ${selected.poin} poin`}
              />
              <Detail label="Deadline klarifikasi" value={selected.deadline} />
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Catatan
                </p>
                <p className="mt-1">{selected.catatan}</p>
              </div>

              {selected.checklistResults && Object.keys(selected.checklistResults).length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase mb-2">
                    Hasil Checklist QC
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2 space-y-1.5 text-xs bg-muted/20">
                    {Object.entries(selected.checklistResults).map(([item, res]) => {
                      const isNok = String(res).toLowerCase() === "nok" || String(res).toLowerCase() === "tidak";
                      return (
                        <div key={item} className="flex items-center justify-between py-0.5 border-b border-border/40 last:border-0">
                          <span className="text-muted-foreground">{item}</span>
                          <span className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                            isNok
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}>
                            {res || "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
                {[1, 2, 3].map((i) => {
                  const photo = (selected.bukti?.length ? selected.bukti : storedEvidence)[i - 1];
                  return (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt={`Bukti ${i} untuk ${selected.id}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                          Bukti {i}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </CardContent>
            </Card>
          ) : (
            <p
              className="dashboard-enter rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
              style={{ animationDelay: "540ms" }}
            >
              Belum ada pelanggaran.
            </p>
          )}

          {selected && <Card className="dashboard-enter" style={{ animationDelay: "660ms" }}>
            <CardHeader>
              <CardTitle className="text-base">Audit Trail &amp; Reminder</CardTitle>
              <CardDescription>Riwayat komunikasi dan eskalasi otomatis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditTrail.map((a) => (
                <div key={a.waktu} className="border-l-2 border-accent pl-3">
                  <p className="text-xs text-muted-foreground">{a.waktu}</p>
                  <p className="text-sm font-semibold">{a.aktor}</p>
                  <p className="text-sm text-muted-foreground">{a.aksi}</p>
                </div>
              ))}
            </CardContent>
          </Card>}
        </div>
      </div>
    </>
  )}
  <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pelanggaran ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiket {pendingDelete?.id} dan foto buktinya akan dihapus. Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteViolation();
              }}
            >
              {isDeleting ? "Menghapus..." : "Hapus pelanggaran"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
