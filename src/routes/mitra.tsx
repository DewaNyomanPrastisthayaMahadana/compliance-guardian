import { createFileRoute, Link } from "@tanstack/react-router";
import { getMitraScorecardData, requireRouteAccess } from "@/lib/auth-server";
import { Download, Users, ChevronRight, CheckCircle2, ShieldAlert, ChevronDown, Search } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  mitraList as defaultMitraList,
  violations as defaultViolations,
  zoneOf,
  statusTone,
  getCustomViolationsFromStorage,
  getCustomMitraListFromStorage,
  getDeletedViolationIds,
  hydrateCustomDataFromIndexedDB,
  isRealViolation,
  type Mitra,
  type Violation,
} from "@/lib/iconguard-data";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/mitra")({
  beforeLoad: () => requireRouteAccess("/mitra"),
  loader: () => getMitraScorecardData(),
  head: () => ({
    meta: [
      { title: "Scorecard Kepatuhan Mitra — IconGuard" },
      {
        name: "description",
        content:
          "Rating kepatuhan setiap mitra Divisi Material dan Jasa sebagai dasar evaluasi kontrak dan sanksi.",
      },
      { property: "og:title", content: "Scorecard Kepatuhan Mitra — IconGuard" },
      {
        property: "og:description",
        content: "Zona hijau, kuning, dan merah kepatuhan mitra beserta riwayat pelanggaran.",
      },
    ],
  }),
  component: MitraPage,
});

function MitraPage() {
  const { organization, isMitra, mitraList: loadedMitraList, violations: loadedViolations } = Route.useLoaderData();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedMitraModal, setSelectedMitraModal] = useState<Mitra | null>(null);
  const [expandedOfficers, setExpandedOfficers] = useState<Set<string>>(new Set());
  const [officerSearch, setOfficerSearch] = useState("");

  useEffect(() => {
    setExpandedOfficers(new Set());
    setOfficerSearch("");
  }, [selectedMitraModal]);

  const toggleOfficerExpand = (petugasName: string) => {
    setExpandedOfficers((prev) => {
      const next = new Set(prev);
      if (next.has(petugasName)) {
        next.delete(petugasName);
      } else {
        next.add(petugasName);
      }
      return next;
    });
  };

  useEffect(() => {
    const onHydrated = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("iconguard-data-hydrated", onHydrated);
    void hydrateCustomDataFromIndexedDB();
    return () => window.removeEventListener("iconguard-data-hydrated", onHydrated);
  }, []);

  const allViolations = useMemo(() => {
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    const deletedIds = new Set(getDeletedViolationIds());
    const custom = getCustomViolationsFromStorage();
    if (isOverridden && custom.length > 0) {
      const filtered = custom.filter((v) => !deletedIds.has(v.id) && isRealViolation(v));
      return isMitra && organization
        ? filtered.filter((v) => v.mitra.trim().toLowerCase() === organization.trim().toLowerCase())
        : filtered;
    }
    const base = loadedViolations ?? defaultViolations;
    const combined = [
      ...custom,
      ...base.filter((v) => !custom.some((c) => c.id === v.id)),
    ];
    const filtered = combined.filter((v) => !deletedIds.has(v.id) && isRealViolation(v));
    return isMitra && organization
      ? filtered.filter((v) => v.mitra.trim().toLowerCase() === organization.trim().toLowerCase())
      : filtered;
  }, [loadedViolations, isMitra, organization, refreshTrigger]);

  const allMitraList = useMemo(() => {
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    const customMitra = getCustomMitraListFromStorage();
    let result: Mitra[] = [];

    if (isOverridden && customMitra.length > 0) {
      result = isMitra && organization
        ? customMitra.filter((m) => m.nama.trim().toLowerCase() === organization.trim().toLowerCase())
        : customMitra;
    } else {
      const base = loadedMitraList ?? defaultMitraList;
      if (customMitra.length === 0) {
        result = [...base];
      } else {
        const list = [...base];
        for (const cm of customMitra) {
          const idx = list.findIndex((m) => m.nama.trim().toLowerCase() === cm.nama.trim().toLowerCase());
          if (idx >= 0) {
            list[idx] = cm;
          } else {
            list.unshift(cm);
          }
        }
        result = isMitra && organization
          ? list.filter((m) => m.nama.trim().toLowerCase() === organization.trim().toLowerCase())
          : list;
      }
    }

    // Sinkronisasi data skor dan kasus riil dari allViolations (murni pelanggaran teknis, bukan inspeksi rutin)
    const synchronized = result.map((m) => {
      const mViolations = allViolations.filter(
        (v) => v.mitra.trim().toLowerCase() === m.nama.trim().toLowerCase() && isRealViolation(v),
      );
      const realSkor = mViolations.reduce((acc, v) => acc + (v.poin || 0), 0);
      const realTotal = mViolations.length;
      const realAktif = mViolations.filter((v) => v.status !== "Closed").length;
      return {
        ...m,
        skor: realSkor,
        totalPelanggaran: realTotal,
        pelanggaranAktif: realAktif,
      };
    });

    // Urutkan dari skor mitra tertinggi ke terendah (hingga yang tidak ada skor / 0)
    return synchronized.sort((a, b) => {
      const skorA = a.skor ?? 0;
      const skorB = b.skor ?? 0;
      if (skorB !== skorA) {
        return skorB - skorA;
      }
      const totalA = a.totalPelanggaran ?? 0;
      const totalB = b.totalPelanggaran ?? 0;
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      return a.nama.localeCompare(b.nama);
    });
  }, [loadedMitraList, isMitra, organization, refreshTrigger, allViolations]);

  // Agregasi daftar petugas yang melakukan pelanggaran dari mitra yang dipilih di modal
  const officerList = useMemo(() => {
    if (!selectedMitraModal) return [];
    const targetName = selectedMitraModal.nama.trim().toLowerCase();
    const map = new Map<
      string,
      {
        totalPoin: number;
        totalPelanggaran: number;
        pelanggaranAktif: number;
        jenisCounts: Record<string, number>;
        tickets: Violation[];
      }
    >();

    allViolations.forEach((v) => {
      if (!isRealViolation(v)) return;
      if (v.mitra.trim().toLowerCase() !== targetName) return;
      const pName = (v.petugas || "Petugas Lapangan").trim();
      if (!map.has(pName)) {
        map.set(pName, {
          totalPoin: 0,
          totalPelanggaran: 0,
          pelanggaranAktif: 0,
          jenisCounts: {},
          tickets: [],
        });
      }
      const entry = map.get(pName)!;
      entry.totalPoin += v.poin ?? 0;
      entry.totalPelanggaran += 1;
      if (v.status !== "Closed") {
        entry.pelanggaranAktif += 1;
      }
      entry.jenisCounts[v.jenis] = (entry.jenisCounts[v.jenis] || 0) + 1;
      entry.tickets.push(v);
    });

    const resultList: {
      petugas: string;
      totalPoin: number;
      totalPelanggaran: number;
      pelanggaranAktif: number;
      dominantJenis: string;
      tickets: Violation[];
    }[] = [];

    map.forEach((data, petugas) => {
      let dominantJenis = "—";
      let maxCount = 0;
      Object.entries(data.jenisCounts).forEach(([jenis, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantJenis = jenis;
        }
      });

      resultList.push({
        petugas,
        totalPoin: data.totalPoin,
        totalPelanggaran: data.totalPelanggaran,
        pelanggaranAktif: data.pelanggaranAktif,
        dominantJenis,
        tickets: data.tickets.sort((a, b) => (b.poin ?? 0) - (a.poin ?? 0)),
      });
    });

    // Urutkan dari petugas yang paling banyak mendapatkan poin pelanggaran
    return resultList.sort((a, b) => {
      if (b.totalPoin !== a.totalPoin) {
        return b.totalPoin - a.totalPoin;
      }
      if (b.totalPelanggaran !== a.totalPelanggaran) {
        return b.totalPelanggaran - a.totalPelanggaran;
      }
      return a.petugas.localeCompare(b.petugas);
    });
  }, [allViolations, selectedMitraModal]);

  const filteredOfficerList = useMemo(() => {
    if (!officerSearch.trim()) return officerList;
    const q = officerSearch.trim().toLowerCase();
    return officerList.filter((o) => o.petugas.toLowerCase().includes(q));
  }, [officerList, officerSearch]);

  return (
    <AppShell>
      <div className="dashboard-enter">
        <PageHeader
          title="Mitra Compliance Scorecard"
          description={
            isMitra
              ? organization
                ? `Scorecard kepatuhan perusahaan ${organization}.`
                : "Scorecard kepatuhan untuk perusahaan pada akun Anda."
              : "Dasar evaluasi perpanjangan kontrak dan penetapan sanksi oleh manajemen PLN Icon Plus."
          }
          action={isMitra ? undefined : (
            <Button variant="outline">
              <Download className="size-4" /> Unduh laporan eksekutif
            </Button>
          )}
        />
      </div>

      {allMitraList.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {allMitraList.map((m, index) => {
            const zone = zoneOf(m.skor);
            return (
              <Card
                key={m.nama}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMitraModal(m)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedMitraModal(m);
                  }
                }}
                className="dashboard-enter flex flex-col justify-between cursor-pointer transition-all duration-200 hover:border-primary/60 hover:shadow-lg hover:-translate-y-0.5 group focus:outline-none focus:ring-2 focus:ring-primary/40"
                style={{ animationDelay: `${Math.min(index, 6) * 90 + 100}ms` }}
              >
                <CardHeader className="pb-3 min-h-[110px] flex flex-col justify-between space-y-2">
                  <CardTitle className="text-base font-bold leading-snug break-words group-hover:text-primary transition-colors">
                    {m.nama}
                  </CardTitle>
                  <CardDescription className="text-xs break-all leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">{m.kontrak}</span>
                    {m.pic ? ` · PIC ${m.pic}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Skor Penalti</span>
                      <p className="text-3xl font-bold tracking-tight text-foreground">{m.skor}</p>
                    </div>
                    <StatusPill tone={zone.tone}>{zone.label}</StatusPill>
                  </div>
                  <Progress value={Math.min(100, m.skor)} />
                  <p className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{m.pelanggaranAktif} pelanggaran aktif</span>
                    <span>{m.totalPelanggaran} total tercatat</span>
                  </p>
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                    <span className="font-medium">Lihat daftar petugas pelanggar</span>
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p
          className="dashboard-enter rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
          style={{ animationDelay: "100ms" }}
        >
          Scorecard belum tersedia untuk perusahaan ini. Hubungi Admin untuk memastikan nama
          perusahaan pada akun Anda sudah sesuai.
        </p>
      )}

      {/* Pop-up Dialog Daftar Petugas Pelanggar dari Mitra Terpilih */}
      <Dialog
        open={Boolean(selectedMitraModal)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMitraModal(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedMitraModal && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <span className="font-mono text-xs font-bold rounded bg-secondary px-2.5 py-1 text-primary">
                    {selectedMitraModal.kontrak}
                  </span>
                  <StatusPill tone={zoneOf(selectedMitraModal.skor).tone}>
                    {zoneOf(selectedMitraModal.skor).label}
                  </StatusPill>
                  <span className="ml-auto font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                    Total {selectedMitraModal.skor} Poin Penalti
                  </span>
                </div>
                <DialogTitle className="mt-2 text-lg font-bold leading-snug">
                  {selectedMitraModal.nama}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                  {selectedMitraModal.pic && (
                    <span>
                      PIC: <strong className="text-foreground">{selectedMitraModal.pic}</strong>
                    </span>
                  )}
                  <span>•</span>
                  <span>
                    {officerList.reduce((acc, o) => acc + o.totalPelanggaran, 0)} Total Pelanggaran (
                    {officerList.reduce((acc, o) => acc + o.pelanggaranAktif, 0)} Aktif)
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Rangkuman KPI Mitra (Dibuat ringkas) */}
              <div className="grid grid-cols-3 gap-2 my-1 text-xs">
                <div className="py-2 px-3 rounded-lg border border-border bg-muted/30">
                  <span className="text-[11px] text-muted-foreground block">Akumulasi Penalti</span>
                  <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5 leading-tight">
                    {officerList.reduce((acc, o) => acc + o.totalPoin, 0)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">Pts</span>
                  </p>
                </div>
                <div className="py-2 px-3 rounded-lg border border-border bg-muted/30">
                  <span className="text-[11px] text-muted-foreground block">Kasus Pelanggaran</span>
                  <p className="text-base font-bold text-foreground mt-0.5 leading-tight">
                    {officerList.reduce((acc, o) => acc + o.totalPelanggaran, 0)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">kasus</span>
                  </p>
                </div>
                <div className="py-2 px-3 rounded-lg border border-border bg-muted/30">
                  <span className="text-[11px] text-muted-foreground block">Petugas Terlibat</span>
                  <p className="text-base font-bold text-primary mt-0.5 leading-tight">
                    {officerList.length}{" "}
                    <span className="text-xs font-normal text-muted-foreground">orang</span>
                  </p>
                </div>
              </div>

              {/* Header List Petugas & Pencarian Cepat */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-0.5">
                <p className="text-xs font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  Daftar Petugas Pelanggar (Poin Tertinggi ke Terendah)
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {filteredOfficerList.length} dari {officerList.length} Personil
                  </span>
                  {officerList.length > 6 && (
                    <div className="relative w-36">
                      <Search className="size-3 text-muted-foreground absolute left-2 top-2" />
                      <Input
                        placeholder="Cari nama..."
                        value={officerSearch}
                        onChange={(e) => setOfficerSearch(e.target.value)}
                        className="h-7 text-xs pl-6 pr-2"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* List Petugas: Grid 2 Kolom Kompak agar Muat Banyak Tanpa Scroll */}
              <div className="max-h-[440px] overflow-y-auto pr-1">
                {filteredOfficerList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredOfficerList.map((off, idx) => {
                      const isExpanded = expandedOfficers.has(off.petugas);
                      return (
                        <div
                          key={off.petugas}
                          className="rounded-xl border border-border bg-card p-2.5 text-xs transition-all hover:border-primary/40 hover:bg-muted/15 h-fit"
                        >
                          <div
                            className="flex items-center justify-between gap-2 cursor-pointer select-none"
                            onClick={() => toggleOfficerExpand(off.petugas)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                  idx === 0
                                    ? "bg-rose-500 text-white shadow-xs"
                                    : idx === 1
                                    ? "bg-amber-500 text-white shadow-xs"
                                    : idx === 2
                                    ? "bg-orange-500 text-white shadow-xs"
                                    : "bg-muted text-muted-foreground font-medium"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground text-xs truncate" title={off.petugas}>
                                  {off.petugas}
                                </p>
                                <p className="text-muted-foreground text-[10px] truncate flex items-center gap-1.5 mt-0.5">
                                  <span>{off.totalPelanggaran} Kasus ({off.pelanggaranAktif} Aktif)</span>
                                  <span>•</span>
                                  <span className="truncate">
                                    Sering: <strong className="text-rose-600 dark:text-rose-400 font-medium">{off.dominantJenis}</strong>
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full font-mono text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                {off.totalPoin} Pts
                              </span>
                              <span className="p-0.5 text-muted-foreground hover:text-foreground">
                                <ChevronDown
                                  className={`size-3.5 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-primary" : ""
                                  }`}
                                />
                              </span>
                            </div>
                          </div>

                          {/* Riwayat Tiket Singkat Petugas (Hanya tampil saat di-expand) */}
                          {isExpanded && off.tickets.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/60">
                              <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                                Rincian Tiket Pelanggaran ({off.tickets.length}):
                              </p>
                              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                {off.tickets.map((t) => (
                                  <div
                                    key={t.id}
                                    className="flex items-center justify-between gap-1.5 p-1 rounded bg-muted/40 text-[10px]"
                                  >
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="font-mono text-muted-foreground shrink-0">{t.id}</span>
                                      <span className="truncate font-medium text-foreground">{t.jenis}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                                        {t.poin} Pts
                                      </span>
                                      <StatusPill tone={statusTone(t.status)}>{t.status}</StatusPill>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : officerList.length > 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    Tidak ditemukan petugas dengan nama "{officerSearch}".
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-foreground text-base">Nihil Pelanggaran Petugas</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Seluruh petugas mitra {selectedMitraModal.nama} memiliki catatan kepatuhan 100% bersih tanpa poin sanksi.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedMitraModal(null)}>
                  Tutup
                </Button>
                <Button asChild>
                  <Link to="/pelanggaran">
                    Buka Halaman Pelanggaran
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
