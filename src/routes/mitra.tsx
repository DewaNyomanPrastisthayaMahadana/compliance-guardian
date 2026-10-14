import { createFileRoute } from "@tanstack/react-router";
import { getMitraScorecardData, requireRouteAccess } from "@/lib/auth-server";
import { Download } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  mitraList as defaultMitraList,
  violations as defaultViolations,
  zoneOf,
  getCustomViolationsFromStorage,
  getCustomMitraListFromStorage,
  getDeletedViolationIds,
  hydrateCustomDataFromIndexedDB,
  sbuOptions,
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

  useEffect(() => {
    const onHydrated = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("iconguard-data-hydrated", onHydrated);
    void hydrateCustomDataFromIndexedDB();
    return () => window.removeEventListener("iconguard-data-hydrated", onHydrated);
  }, []);

  const allMitraList = useMemo(() => {
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    const customMitra = getCustomMitraListFromStorage();
    if (isOverridden && customMitra.length > 0) {
      return isMitra && organization
        ? customMitra.filter((m) => m.nama.trim().toLowerCase() === organization.trim().toLowerCase())
        : customMitra;
    }
    const base = loadedMitraList ?? defaultMitraList;
    if (customMitra.length === 0) return base;
    const list = [...base];
    for (const cm of customMitra) {
      const idx = list.findIndex((m) => m.nama.trim().toLowerCase() === cm.nama.trim().toLowerCase());
      if (idx >= 0) {
        list[idx] = cm;
      } else {
        list.unshift(cm);
      }
    }
    return isMitra && organization
      ? list.filter((m) => m.nama.trim().toLowerCase() === organization.trim().toLowerCase())
      : list;
  }, [loadedMitraList, isMitra, organization, refreshTrigger]);

  const allViolations = useMemo(() => {
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    const deletedIds = new Set(getDeletedViolationIds());
    const custom = getCustomViolationsFromStorage();
    if (isOverridden && custom.length > 0) {
      const filtered = custom.filter((v) => !deletedIds.has(v.id));
      return isMitra && organization
        ? filtered.filter((v) => v.mitra.trim().toLowerCase() === organization.trim().toLowerCase())
        : filtered;
    }
    const base = loadedViolations ?? defaultViolations;
    const combined = [
      ...custom,
      ...base.filter((v) => !custom.some((c) => c.id === v.id)),
    ];
    const filtered = combined.filter((v) => !deletedIds.has(v.id));
    return isMitra && organization
      ? filtered.filter((v) => v.mitra.trim().toLowerCase() === organization.trim().toLowerCase())
      : filtered;
  }, [loadedViolations, isMitra, organization, refreshTrigger]);

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
                className="dashboard-enter flex flex-col justify-between"
                style={{ animationDelay: `${Math.min(index, 6) * 90 + 100}ms` }}
              >
                <CardHeader className="pb-3 min-h-[110px] flex flex-col justify-between space-y-2">
                  <CardTitle className="text-base font-bold leading-snug break-words">
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
                      <p className="text-3xl font-bold tracking-tight">{m.skor}</p>
                    </div>
                    <StatusPill tone={zone.tone}>{zone.label}</StatusPill>
                  </div>
                  <Progress value={Math.min(100, m.skor)} />
                  <p className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{m.pelanggaranAktif} pelanggaran aktif</span>
                    <span>{m.totalPelanggaran} total tercatat</span>
                  </p>
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

      {allViolations.length > 0 && <Card className="dashboard-enter mt-6" style={{ animationDelay: "550ms" }}>
        <CardHeader>
          <CardTitle>Riwayat Pelanggaran Mitra</CardTitle>
          <CardDescription>Rekap seluruh tiket pada periode berjalan</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiket</TableHead>
                <TableHead>ID PA ICRM</TableHead>
                <TableHead>Tgl Cek</TableHead>
                <TableHead>SBU / KP</TableHead>
                <TableHead>Mitra</TableHead>
                <TableHead>Petugas Mitra</TableHead>
                <TableHead>Petugas QC SBU</TableHead>
                <TableHead>ID FAT</TableHead>
                <TableHead>Jenis Temuan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allViolations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {v.idPa ?? "Belum dicatat"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{v.tanggalCek || v.createdAt || "—"}</TableCell>
                  <TableCell className="text-xs">{v.sbu ? `${v.sbu}${v.kp ? ` (${v.kp})` : ""}` : v.lokasi}</TableCell>
                  <TableCell className="font-medium">{v.mitra}</TableCell>
                  <TableCell>{v.petugas}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {v.petugasQc && v.petugasQc !== v.sbu && !sbuOptions.some((s) => s.code === v.petugasQc)
                      ? v.petugasQc
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{v.idFat || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{v.jenis}</TableCell>
                  <TableCell>{v.severity}</TableCell>
                  <TableCell>{v.status}</TableCell>
                  <TableCell className="text-right font-semibold">{v.poin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>}
    </AppShell>
  );
}
