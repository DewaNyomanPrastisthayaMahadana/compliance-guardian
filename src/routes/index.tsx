import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Clock, Gauge, Plus, FileSpreadsheet, Award, UserCheck, Table as TableIcon, Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { PivotTableView } from "@/components/pivot-table-view";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  jenisDominan,
  mitraList,
  trenBulanan,
  violations,
  statusTone,
  severityTone,
  zoneOf,
  getCustomViolationsFromStorage,
  getCustomMitraListFromStorage,
  getDeletedViolationIds,
} from "@/lib/iconguard-data";
import { getDashboardData, requireRouteAccess } from "@/lib/auth-server";
import { ExcelImportModal } from "@/components/excel-import-modal";

function extractMonthKey(dateRaw?: string): string {
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
}

function leaderboardZoneOf(skor: number) {
  const zone = zoneOf(skor);
  const progressClass = {
    critical: "[&>div]:bg-critical",
    warning: "[&>div]:bg-warning",
    success: "[&>div]:bg-success",
    info: "",
  }[zone.tone];

  return { ...zone, progressClass };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — IconGuard" },
      {
        name: "description",
        content:
          "KPI kepatuhan mitra, tren pelanggaran bulanan, dan leaderboard mitra Divisi Material dan Jasa PLN Icon Plus.",
      },
      { property: "og:title", content: "Executive Dashboard — IconGuard" },
      {
        property: "og:description",
        content:
          "Pantau pelanggaran aktif, laporan pending, dan rating kepatuhan mitra secara real-time.",
      },
    ],
  }),
  beforeLoad: () => requireRouteAccess("/"),
  loader: () => getDashboardData(),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { violations: loadedViolations, mitraList: loadedMitraList } = Route.useLoaderData();

  const allViolations = useMemo(() => {
    const deletedIds = new Set(getDeletedViolationIds());
    const custom = getCustomViolationsFromStorage();
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    if (isOverridden && custom.length > 0) {
      return custom.filter((v) => !deletedIds.has(v.id));
    }
    const base = loadedViolations ?? violations;
    const combined = [
      ...custom,
      ...base.filter((v) => !custom.some((c) => c.id === v.id)),
    ];
    return combined.filter((v) => !deletedIds.has(v.id));
  }, [loadedViolations, refreshTrigger]);

  const allMitraList = useMemo(() => {
    const customMitra = getCustomMitraListFromStorage();
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    if (isOverridden && customMitra.length > 0) {
      return customMitra;
    }
    const base = loadedMitraList ?? mitraList;
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
    return list;
  }, [loadedMitraList, refreshTrigger]);

  const openViolations = useMemo(
    () => allViolations.filter((v) => v.status !== "Closed" && v.jenis !== "Pemeriksaan Lapangan"),
    [allViolations],
  );
  // Ambil semua pelanggaran dari data QC paling bawah (terbaru)
  const terbaru = openViolations;

  const activeViolationsCount = openViolations.length;
  const pendingClarificationCount = allViolations.filter(
    (v) => v.status === "Pending Klarifikasi",
  ).length;
  const closedCount = allViolations.filter((v) => v.status === "Closed").length;

  // Rata-rata kepatuhan dihitung: 0 poin penalti = 100% patuh, penalti mengurangi persentase
  const avgCompliance = useMemo(() => {
    if (allMitraList.length === 0) return 100;
    const totalPoin = allMitraList.reduce((acc, m) => acc + m.skor, 0);
    const avgPoin = totalPoin / allMitraList.length;
    return Math.max(0, Math.round(100 - avgPoin));
  }, [allMitraList]);

  // Kalkulasi dinamis grafik jenis pelanggaran dominan dari data aktual
  const dynamicJenisDominan = useMemo(() => {
    const counts: Record<string, number> = {};
    allViolations.forEach((v) => {
      if (v.status === "Closed" && v.poin === 0) return;
      const j = v.jenis || "Lainnya";
      if (j !== "Inspeksi QC Rutin Material & Jasa" && j !== "Pemeriksaan Lapangan") {
        counts[j] = (counts[j] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([label, jumlah]) => ({ label, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 5);
  }, [allViolations]);

  // Kalkulasi dinamis grafik tren dari data aktual (Jan - Okt)
  const dynamicTrenBulanan = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt"];
    monthsOrder.forEach((m) => {
      monthCounts[m] = 0;
    });

    allViolations.forEach((v) => {
      if (v.status === "Closed" && v.poin === 0) return;
      const matchedMonth = extractMonthKey(v.tanggalCek || v.createdAt);
      if (matchedMonth && monthCounts[matchedMonth] !== undefined) {
        monthCounts[matchedMonth] = (monthCounts[matchedMonth] || 0) + 1;
      }
    });

    return monthsOrder.map((bulan) => ({
      bulan,
      jumlah: monthCounts[bulan] || 0,
    }));
  }, [allViolations]);

  const kpis = [
    {
      label: "Pelanggaran Aktif",
      value: String(activeViolationsCount),
      icon: AlertTriangle,
      tone: "critical" as const,
    },
    {
      label: "Menunggu Klarifikasi",
      value: String(pendingClarificationCount),
      icon: Clock,
      tone: "warning" as const,
    },
    {
      label: "Laporan Closed",
      value: String(closedCount),
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Rata-rata Kepatuhan",
      value: `${avgCompliance}%`,
      icon: Gauge,
      tone: "info" as const,
    },
  ];

  const [selectedMonth, setSelectedMonth] = useState(
    dynamicTrenBulanan[dynamicTrenBulanan.length - 1]?.bulan ?? "Okt",
  );
  const selectedIndex = dynamicTrenBulanan.findIndex((item) => item.bulan === selectedMonth);
  const selectedTrend = dynamicTrenBulanan[selectedIndex] ??
    dynamicTrenBulanan[dynamicTrenBulanan.length - 1] ?? { bulan: "—", jumlah: 0 };
  const previousTrend = selectedIndex > 0 ? dynamicTrenBulanan[selectedIndex - 1] : undefined;
  const monthChange = previousTrend ? selectedTrend.jumlah - previousTrend.jumlah : null;

  // 1. Kalkulasi dinamis Top 5 Mitra Terbaik per bulan terpilih
  const dynamicTop5Mitra = useMemo(() => {
    const targetMonth = selectedMonth || "Okt";

    const mitraMonthlyData: Record<string, { nama: string; poin: number; pelanggaranAktif: number; kontrak: string }> = {};

    allMitraList.forEach((m) => {
      mitraMonthlyData[m.nama.trim().toLowerCase()] = {
        nama: m.nama,
        poin: 0,
        pelanggaranAktif: 0,
        kontrak: m.kontrak || "Mitra Aktif",
      };
    });

    allViolations.forEach((v) => {
      const vMonth = extractMonthKey(v.tanggalCek || v.createdAt);
      if (vMonth !== targetMonth) return;
      if (!v.mitra || v.mitra === "—") return;

      const key = v.mitra.trim().toLowerCase();
      if (!mitraMonthlyData[key]) {
        mitraMonthlyData[key] = {
          nama: v.mitra.trim(),
          poin: 0,
          pelanggaranAktif: 0,
          kontrak: "Mitra Aktif",
        };
      }

      if (v.status !== "Closed" || v.poin > 0) {
        mitraMonthlyData[key].poin += v.poin || 0;
        if (v.status !== "Closed") {
          mitraMonthlyData[key].pelanggaranAktif += 1;
        }
      }
    });

    const sortedMitra = Object.values(mitraMonthlyData)
      .sort((a, b) => a.poin - b.poin || a.pelanggaranAktif - b.pelanggaranAktif)
      .slice(0, 5)
      .map((item) => ({
        nama: item.nama,
        skor: item.poin,
        pelanggaranAktif: item.pelanggaranAktif,
        kontrak: item.kontrak,
      }));

    return sortedMitra;
  }, [allViolations, allMitraList, selectedMonth]);

  // 2. Kalkulasi dinamis 5 Petugas Mitra Terbaik per bulan terpilih (0 pelanggaran)
  const dynamicPetugasTerbaik = useMemo(() => {
    const targetMonth = selectedMonth || dynamicTrenBulanan[dynamicTrenBulanan.length - 1]?.bulan || "Okt";

    const officerStats: Record<string, { nama: string; mitra: string; totalInspeksi: number; violations: number }> = {};

    allViolations.forEach((v) => {
      const vMonth = extractMonthKey(v.tanggalCek || v.createdAt);
      if (vMonth !== targetMonth) return;
      if (!v.petugas || v.petugas === "—") return;

      const key = `${v.petugas.trim()}___${v.mitra.trim()}`;
      if (!officerStats[key]) {
        officerStats[key] = {
          nama: v.petugas.trim(),
          mitra: v.mitra.trim(),
          totalInspeksi: 0,
          violations: 0,
        };
      }

      officerStats[key].totalInspeksi += 1;
      if (v.status !== "Closed" || v.poin > 0) {
        officerStats[key].violations += 1;
      }
    });

    let cleanOfficers = Object.values(officerStats)
      .filter((o) => o.violations === 0)
      .sort((a, b) => b.totalInspeksi - a.totalInspeksi);

    if (cleanOfficers.length === 0) {
      const violatingOfficerNames = new Set(
        allViolations
          .filter((v) => extractMonthKey(v.tanggalCek || v.createdAt) === targetMonth && (v.status !== "Closed" || v.poin > 0))
          .map((v) => v.petugas?.trim().toLowerCase())
      );

      const catalogOfficers: { nama: string; mitra: string; totalInspeksi: number; violations: number }[] = [];
      allMitraList.forEach((m) => {
        if (m.pic && !violatingOfficerNames.has(m.pic.trim().toLowerCase())) {
          catalogOfficers.push({
            nama: m.pic,
            mitra: m.nama,
            totalInspeksi: 1,
            violations: 0,
          });
        }
      });
      cleanOfficers = catalogOfficers;
    }

    return cleanOfficers.slice(0, 5);
  }, [allViolations, allMitraList, selectedMonth, dynamicTrenBulanan]);

  // 3. Pelanggaran per bulan terpilih (tiket yang dicatat pada bulan tersebut)
  const monthlyViolations = useMemo(() => {
    const targetMonth = selectedMonth || "Okt";
    return allViolations
      .filter((v) => {
        const vMonth = extractMonthKey(v.tanggalCek || v.createdAt);
        return vMonth === targetMonth && v.jenis !== "Pemeriksaan Lapangan";
      })
      .slice()
      .reverse();
  }, [allViolations, selectedMonth]);
  return (
    <AppShell>
      <div className="dashboard-enter">
        <PageHeader
          title="Executive Dashboard"
          description="Ringkasan kepatuhan mitra Divisi Material dan Jasa, diperbarui real-time."
          action={
            <div className="flex items-center gap-2">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Card
            key={kpi.label}
            className="dashboard-enter"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <CardContent className="flex min-h-24 items-center gap-4 !py-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <kpi.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="dashboard-enter lg:col-span-3" style={{ animationDelay: "460ms" }}>
          <CardHeader>
            <CardTitle>Tren Pelanggaran Bulanan</CardTitle>
            <CardDescription>Jumlah laporan pelanggaran yang tercatat per bulan</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dynamicTrenBulanan}
                margin={{ left: -20, right: 8, top: 8 }}
                onClick={(state) => {
                  const bulan = state?.activePayload?.[0]?.payload?.bulan;
                  if (typeof bulan === "string") setSelectedMonth(bulan);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="bulan"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tick={(props) => {
                    const { x, y, payload } = props as {
                      x: number;
                      y: number;
                      payload: { value: string };
                    };
                    const isSelected = payload.value === selectedMonth;
                    const selectMonth = () => setSelectedMonth(payload.value);

                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          y={16}
                          textAnchor="middle"
                          fill={isSelected ? "var(--primary)" : "var(--muted-foreground)"}
                          fontWeight={isSelected ? 700 : 400}
                          role="button"
                          tabIndex={0}
                          aria-label={`Pilih bulan ${payload.value}`}
                          style={{ cursor: "pointer" }}
                          onClick={selectMonth}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") selectMonth();
                          }}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="jumlah"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dashboard-enter lg:col-span-2" style={{ animationDelay: "560ms" }}>
          <CardHeader>
            <CardTitle>Jenis Pelanggaran Dominan</CardTitle>
            <CardDescription>Akumulasi temuan dari data aktif</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-center">
            {dynamicJenisDominan.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicJenisDominan} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="jumlah" fill="var(--accent)" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-8">
                <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-foreground">Tidak Ada Temuan Pelanggaran</p>
                <p className="mt-0.5">Belum ada data temuan yang dicatat dalam sistem.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="dashboard-enter mt-6" style={{ animationDelay: "660ms" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Ringkasan Bulan {selectedTrend.bulan}</CardTitle>
            <CardDescription>Total laporan pelanggaran pada bulan terpilih</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Pilih Bulan:</span>
            <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
              <SelectTrigger className="w-28 h-8 text-xs font-semibold">
                <Calendar className="mr-1.5 size-3.5 text-primary" />
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                {dynamicTrenBulanan.map((tb) => (
                  <SelectItem key={tb.bulan} value={tb.bulan} className="text-xs">
                    Bulan {tb.bulan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-4xl font-bold tracking-tight text-primary">{selectedTrend.jumlah}</p>
          <p className="text-sm text-muted-foreground">laporan pelanggaran</p>
          {previousTrend && monthChange !== null ? (
            <p className="text-sm font-medium">
              {monthChange > 0 ? "Naik" : monthChange < 0 ? "Turun" : "Tidak berubah"}{" "}
              {Math.abs(monthChange)} laporan
              <span className="font-normal text-muted-foreground">
                {" "}
                dibanding {previousTrend.bulan}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Bulan pertama pada grafik</p>
          )}
        </CardContent>
      </Card>

      {/* 3 Kotak Monitoring Bulanan */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3 items-stretch">
        {/* Top 5 Mitra Terbaik Bulan Terpilih */}
        <Card className="dashboard-enter flex flex-col h-full" style={{ animationDelay: "760ms" }}>
          <CardHeader className="h-[100px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 h-6">
              <CardTitle>Top 5 Mitra Terbaik</CardTitle>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {selectedTrend.bulan}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate">Pilih Evaluasi Bulan:</span>
              <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
                <SelectTrigger className="w-[130px] h-7 text-xs font-medium bg-background border-border">
                  <Calendar className="mr-1.5 size-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {dynamicTrenBulanan.map((tb) => (
                    <SelectItem key={tb.bulan} value={tb.bulan} className="text-xs">
                      Bulan {tb.bulan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[460px]">
              {dynamicTop5Mitra.length > 0 ? (
                dynamicTop5Mitra.map((m, i) => {
                  const isClean = m.skor === 0;
                  return (
                    <div
                      key={m.nama}
                      className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 h-[104px] flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="mr-auto text-sm font-semibold text-foreground truncate">{m.nama}</span>
                        <StatusPill tone={isClean ? "success" : m.skor < 70 ? "warning" : "critical"}>
                          {isClean ? "Bersih · 0 Poin" : `${m.skor} Poin`}
                        </StatusPill>
                        <span className="w-12 shrink-0 text-right text-xs font-bold font-mono">
                          {m.skor} Pts
                        </span>
                      </div>
                      <Progress
                        value={isClean ? 100 : Math.max(5, 100 - m.skor)}
                        className={isClean ? "[&>div]:bg-success" : m.skor < 70 ? "[&>div]:bg-warning" : "[&>div]:bg-critical"}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate max-w-[140px]">{m.kontrak || "Mitra Aktif"}</span>
                        <span className="shrink-0">{m.pelanggaranAktif ?? 0} pelanggaran aktif</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Belum Ada Data Mitra di Bulan {selectedTrend.bulan}</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-2 p-4 sm:p-6 sm:pt-2">
            <Button asChild variant="outline" className="w-full h-10">
              <Link to="/mitra">Lihat scorecard seluruh mitra</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Petugas Mitra Terbaik Bulan Ini */}
        <Card className="dashboard-enter flex flex-col h-full" style={{ animationDelay: "810ms" }}>
          <CardHeader className="h-[100px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 h-6">
              <CardTitle>Petugas Mitra Terbaik</CardTitle>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {selectedTrend.bulan}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate">Pilih Evaluasi Bulan:</span>
              <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
                <SelectTrigger className="w-[130px] h-7 text-xs font-medium bg-background border-border">
                  <Calendar className="mr-1.5 size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {dynamicTrenBulanan.map((tb) => (
                    <SelectItem key={tb.bulan} value={tb.bulan} className="text-xs">
                      Bulan {tb.bulan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[460px]">
              {dynamicPetugasTerbaik.length > 0 ? (
                dynamicPetugasTerbaik.map((p, i) => (
                  <div
                    key={`${p.nama}-${p.mitra}`}
                    className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 h-[104px] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {i + 1}
                        </span>
                        <p className="text-sm font-bold text-foreground truncate">{p.nama}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill tone="success">Nihil Pelanggaran</StatusPill>
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          0 Poin
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Mitra: <span className="font-semibold text-foreground">{p.mitra}</span>
                    </p>
                    <p className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Bulan: <strong className="text-foreground">{selectedTrend.bulan}</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">✓ 100% Kepatuhan QC</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Semua Petugas Sedang Dievaluasi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Belum ditemukan petugas dengan rekor 0 pelanggaran di bulan {selectedTrend.bulan}.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-2 p-4 sm:p-6 sm:pt-2">
            <Button asChild variant="outline" className="w-full h-10">
              <Link to="/mitra">Lihat daftar seluruh petugas mitra</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Pelanggaran Terbaru Bulan Terpilih */}
        <Card className="dashboard-enter flex flex-col h-full" style={{ animationDelay: "860ms" }}>
          <CardHeader className="h-[100px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 h-6">
              <CardTitle>Pelanggaran Bulan {selectedTrend.bulan}</CardTitle>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                {selectedTrend.bulan}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate">Pilih Evaluasi Bulan:</span>
              <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
                <SelectTrigger className="w-[130px] h-7 text-xs font-medium bg-background border-border">
                  <Calendar className="mr-1.5 size-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {dynamicTrenBulanan.map((tb) => (
                    <SelectItem key={tb.bulan} value={tb.bulan} className="text-xs">
                      Bulan {tb.bulan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[460px]">
              {monthlyViolations.length > 0 ? (
                monthlyViolations.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 h-[104px] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground truncate min-w-0">{v.jenis}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill tone={severityTone(v.severity)}>{v.severity}</StatusPill>
                        <StatusPill tone={statusTone(v.status)}>{v.status}</StatusPill>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-semibold text-foreground">{v.mitra}</span> · Petugas: <span className="font-medium text-foreground">{v.petugas}</span>
                      {v.petugasQc ? ` · QC: ${v.petugasQc}` : ""}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground truncate">
                      ID PA: <span className="font-semibold text-foreground">{v.idPa ?? "Belum dicatat"}</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Tidak Ada Pelanggaran di Bulan {selectedTrend.bulan}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Semua hasil inspeksi QC Material & Jasa bulan {selectedTrend.bulan} berstatus OK / Memenuhi Standar.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-2 p-4 sm:p-6 sm:pt-2">
            <Button asChild variant="outline" className="w-full h-10">
              <Link to="/pelanggaran">Lihat semua data QC & pelanggaran</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Bagian Pivot Table Otomatis Dashboard */}
      <div className="mt-8 dashboard-enter" style={{ animationDelay: "920ms" }}>
        <PivotTableView violations={allViolations} />
      </div>
    </AppShell>
  );
}
