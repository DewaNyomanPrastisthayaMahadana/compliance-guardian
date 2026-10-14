import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Clock, Gauge, Plus, FileSpreadsheet, Award, UserCheck, Table as TableIcon, Calendar, MapPin, Building2, User, UserX, FileText, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { PivotTableView, SBU_REGIONAL_CONFIG } from "@/components/pivot-table-view";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Violation,
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
  hydrateCustomDataFromIndexedDB,
  isRealViolation,
  sbuOptions,
  sbuMitraMapping,
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

function getSbuInfo(input?: string | Violation): { code: string; label: string; full: string } {
  let raw = "";
  if (!input) return { code: "—", label: "—", full: "—" };
  if (typeof input === "string") {
    raw = input.trim().toUpperCase();
  } else {
    raw = (input.sbu || input.lokasi || "").trim().toUpperCase();
  }

  // Fallback via mitra mapping if raw is empty
  if (!raw || raw === "—" || raw === "LAINNYA") {
    if (typeof input !== "string" && input?.mitra) {
      const mName = input.mitra.trim().toLowerCase();
      for (const [code, partners] of Object.entries(sbuMitraMapping)) {
        if (partners.some((p) => p.nama.trim().toLowerCase() === mName)) {
          const opt = sbuOptions.find((s) => s.code === code);
          const label = opt?.label || code;
          return {
            code,
            label,
            full: `${code} — ${label}`,
          };
        }
      }
    }
    return { code: "—", label: "—", full: "—" };
  }

  for (const sbu of sbuOptions) {
    if (raw.includes(sbu.code) || raw.includes(sbu.label)) {
      return { code: sbu.code, label: sbu.label, full: `${sbu.code} — ${sbu.label}` };
    }
  }

  for (const [key, conf] of Object.entries(SBU_REGIONAL_CONFIG)) {
    if (raw.includes(key) || raw.startsWith(key) || (conf.label && raw.includes(conf.label.toUpperCase()))) {
      const label = conf.label || conf.short || key;
      return { code: key, label, full: `${key} — ${label}` };
    }
  }

  const match = raw.match(/^(\d{2}[A-Z]+)/);
  if (match && match[1]) {
    const opt = sbuOptions.find((s) => s.code === match[1]);
    if (opt) {
      return { code: opt.code, label: opt.label, full: `${opt.code} — ${opt.label}` };
    }
    return { code: match[1], label: match[1], full: match[1] };
  }

  return { code: raw, label: raw, full: raw };
}

function getSbuKey(v: Violation): string {
  const info = getSbuInfo(v);
  return info.code !== "—" ? info.code : "LAINNYA";
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

interface Bar3DProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: any;
  trendFilterType: "bulan" | "sbu";
  selectedMonth: string;
  selectedSbuForKpi: string | null;
}

function Bar3D(props: Bar3DProps) {
  const {
    x,
    y,
    width,
    height,
    payload,
    trendFilterType,
    selectedMonth,
    selectedSbuForKpi,
  } = props;

  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    isNaN(x) ||
    isNaN(y) ||
    isNaN(width) ||
    isNaN(height) ||
    height <= 0
  ) {
    return null;
  }

  const name = String(payload?.name || payload?.key || payload?.bulan || "");
  const isSelected =
    trendFilterType === "sbu"
      ? name === selectedSbuForKpi
      : name === selectedMonth;
  const isAnySbuSelected = trendFilterType === "sbu" && Boolean(selectedSbuForKpi);
  const isDimmed = isAnySbuSelected && !isSelected;

  // 3D Perspective Offsets (Isometric cuboid depth)
  const depthX = Math.round(Math.max(4, Math.min(8, width * 0.28)));
  const depthY = Math.round(Math.max(3, Math.min(5, depthX * 0.6)));

  // Polygon coordinates:
  // 1. Top face (roof highlight):
  const topPath = `M ${x},${y} L ${x + depthX},${y - depthY} L ${x + width + depthX},${y - depthY} L ${x + width},${y} Z`;

  // 2. Right face (side wall in shadow):
  const rightPath = `M ${x + width},${y} L ${x + width + depthX},${y - depthY} L ${x + width + depthX},${y + height - depthY} L ${x + width},${y + height} Z`;

  // Colors harmonized with web background (#EAF5FE) and sidebar (#C2E2FC)
  let frontFill = "url(#bar3DFront)";
  let topFill = "#C2E2FC"; // Harmonized with web sidebar background
  let topStroke = "#A3D2F8";
  let rightFill = "#4F9CE0"; // Soft medium blue shadow (avoids harsh dark navy)
  let rightStroke = "#5DA6E5";
  let frontStroke = "#68ADE8";
  let filter = "url(#bar3DShadow)";
  let opacity = 1;

  if (isSelected) {
    frontFill = "url(#bar3DFrontSelected)";
    topFill = "#9DD0FA";
    topStroke = "#72B7F2";
    rightFill = "#1E72C8";
    rightStroke = "#2B7FD4";
    frontStroke = "#3388DC";
    filter = "url(#bar3DSelectedGlow)";
    opacity = 1;
  } else if (isDimmed) {
    frontFill = "url(#bar3DFrontMuted)";
    topFill = "#EAF5FE"; // Harmonized with web page background
    topStroke = "#D0E7FC";
    rightFill = "#B5D9F8";
    rightStroke = "#C5E2FA";
    frontStroke = "#C5E2FA";
    filter = "none";
    opacity = 0.7;
  }

  return (
    <g
      className="transition-all duration-200 cursor-pointer hover:brightness-110"
      role="button"
      tabIndex={0}
      aria-label={`${name}: ${payload?.jumlah ?? 0} laporan`}
      style={{ opacity, cursor: "pointer" }}
    >
      {/* Front Face */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={frontFill}
        stroke={frontStroke}
        strokeWidth={isSelected ? 1 : 0.5}
        filter={filter}
      />

      {/* Right Face (Side Shadow) */}
      <path
        d={rightPath}
        fill={rightFill}
        stroke={rightStroke}
        strokeWidth={0.5}
      />

      {/* Top Face (Roof Highlight) */}
      <path
        d={topPath}
        fill={topFill}
        stroke={topStroke}
        strokeWidth={0.5}
      />
    </g>
  );
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

  useEffect(() => {
    const onHydrated = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("iconguard-data-hydrated", onHydrated);
    void hydrateCustomDataFromIndexedDB();
    return () => window.removeEventListener("iconguard-data-hydrated", onHydrated);
  }, []);

  const allViolations = useMemo(() => {
    const deletedIds = new Set(getDeletedViolationIds());
    const custom = getCustomViolationsFromStorage();
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    const base = loadedViolations ?? violations;
    const combined = [
      ...custom,
      ...base.filter((v) => !custom.some((c) => c.id === v.id)),
    ];
    return (isOverridden && custom.length > 0 ? custom : combined).filter(
      (v) => !deletedIds.has(v.id) && isRealViolation(v),
    );
  }, [loadedViolations, refreshTrigger]);

  const allMitraList = useMemo(() => {
    const customMitra = getCustomMitraListFromStorage();
    const isOverridden = typeof window !== "undefined" && localStorage.getItem("iconguard_override_all") === "true";
    let baseList: Mitra[] = [];
    if (isOverridden && customMitra.length > 0) {
      baseList = customMitra;
    } else {
      const base = loadedMitraList ?? mitraList;
      if (customMitra.length === 0) {
        baseList = base;
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
        baseList = list;
      }
    }

    // Sinkronisasi data skor dan kasus riil dari allViolations (murni pelanggaran teknis, bukan inspeksi rutin)
    return baseList.map((m) => {
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
  }, [loadedMitraList, refreshTrigger, allViolations]);

  // SBU yang dipilih untuk memfilter 4 kotak KPI di atas (null = seluruh SBU)
  const [selectedSbuForKpi, setSelectedSbuForKpi] = useState<string | null>(null);

  // Pelanggaran yang disaring untuk kotak KPI di atas
  const kpiViolations = useMemo(() => {
    if (!selectedSbuForKpi) return allViolations;
    return allViolations.filter((v) => getSbuKey(v) === selectedSbuForKpi);
  }, [allViolations, selectedSbuForKpi]);

  const openViolations = useMemo(
    () => kpiViolations.filter((v) => v.status !== "Closed" && v.jenis !== "Pemeriksaan Lapangan"),
    [kpiViolations],
  );
  // Ambil semua pelanggaran dari data QC paling bawah (terbaru)
  const terbaru = openViolations;

  const activeViolationsCount = openViolations.length;
  const pendingClarificationCount = kpiViolations.filter(
    (v) => v.status === "Pending Klarifikasi",
  ).length;
  const closedCount = kpiViolations.filter((v) => v.status === "Closed").length;

  // Rata-rata kepatuhan dihitung: 0 poin penalti = 100% patuh, penalti mengurangi persentase
  const avgCompliance = useMemo(() => {
    if (!selectedSbuForKpi) {
      if (allMitraList.length === 0) return 100;
      const totalPoin = allMitraList.reduce((acc, m) => acc + m.skor, 0);
      const avgPoin = totalPoin / allMitraList.length;
      return Math.max(0, Math.round(100 - avgPoin));
    }

    // Untuk SBU terpilih
    const mitraInSbu = new Set(kpiViolations.map((v) => v.mitra.trim().toLowerCase()));
    const relevantMitra = allMitraList.filter((m) => mitraInSbu.has(m.nama.trim().toLowerCase()));

    if (relevantMitra.length > 0) {
      const totalSbuPoin = kpiViolations.reduce((acc, v) => acc + (v.poin || 0), 0);
      const avgSbuPoin = totalSbuPoin / relevantMitra.length;
      return Math.max(0, Math.round(100 - avgSbuPoin));
    }

    if (kpiViolations.length === 0) return 100;
    const totalSbuPoin = kpiViolations.reduce((acc, v) => acc + (v.poin || 0), 0);
    return Math.max(0, Math.round(100 - totalSbuPoin / Math.max(1, kpiViolations.length)));
  }, [allMitraList, selectedSbuForKpi, kpiViolations]);

  // Mode filter tren grafik: 'bulan' (Tren Pelanggaran Bulanan) atau 'sbu' (Tren Pelanggaran SBU)
  const [trendFilterType, setTrendFilterType] = useState<"bulan" | "sbu">("bulan");
  const [selectedSbuKey, setSelectedSbuKey] = useState<string>("01SBU");

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

  // Kalkulasi dinamis grafik tren bulanan dari data aktual (Jan - Okt)
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
      name: bulan,
      bulan,
      jumlah: monthCounts[bulan] || 0,
    }));
  }, [allViolations]);

  // Kalkulasi dinamis grafik tren SBU (01SBU s.d. 10SIBT)
  const dynamicTrenSbu = useMemo(() => {
    const sbuKeys = [
      "01SBU",
      "02SBT",
      "03SBS",
      "04JKT",
      "05JBB",
      "06JTG",
      "07JBT",
      "08BNT",
      "09KAL",
      "10SIBT",
    ];
    const sbuCounts: Record<string, number> = {};
    sbuKeys.forEach((key) => {
      sbuCounts[key] = 0;
    });

    allViolations.forEach((v) => {
      if (v.status === "Closed" && v.poin === 0) return;
      const sKey = getSbuKey(v);
      if (sbuCounts[sKey] !== undefined) {
        sbuCounts[sKey] += 1;
      } else {
        sbuCounts[sKey] = (sbuCounts[sKey] || 0) + 1;
      }
    });

    const result = sbuKeys.map((key) => {
      const opt = sbuOptions.find((s) => s.code === key);
      const conf = SBU_REGIONAL_CONFIG[key];
      return {
        name: key,
        key,
        label: key,
        fullLabel: `${key} — ${opt?.label || conf?.label || key}`,
        jumlah: sbuCounts[key] || 0,
      };
    });

    Object.keys(sbuCounts).forEach((k) => {
      if (!sbuKeys.includes(k) && sbuCounts[k] > 0) {
        result.push({
          name: k,
          key: k,
          label: k,
          fullLabel: k,
          jumlah: sbuCounts[k],
        });
      }
    });

    return result;
  }, [allViolations]);

  const activeChartData = useMemo(() => {
    return trendFilterType === "bulan" ? dynamicTrenBulanan : dynamicTrenSbu;
  }, [trendFilterType, dynamicTrenBulanan, dynamicTrenSbu]);

  const selectedSbuSummary = useMemo(() => {
    return dynamicTrenSbu.find((item) => item.key === selectedSbuKey) ?? dynamicTrenSbu[0];
  }, [dynamicTrenSbu, selectedSbuKey]);

  const totalViolationsCount = useMemo(() => {
    return allViolations.filter((v) => !(v.status === "Closed" && v.poin === 0)).length;
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

    const officerStats: Record<
      string,
      {
        nama: string;
        mitra: string;
        sbuCounts: Record<string, number>;
        totalInspeksi: number;
        violations: number;
        tickets: Violation[];
      }
    > = {};

    allViolations.forEach((v) => {
      const vMonth = extractMonthKey(v.tanggalCek || v.createdAt);
      if (vMonth !== targetMonth) return;
      if (!v.petugas || v.petugas === "—") return;

      const key = `${v.petugas.trim()}___${v.mitra.trim()}`;
      if (!officerStats[key]) {
        officerStats[key] = {
          nama: v.petugas.trim(),
          mitra: v.mitra.trim(),
          sbuCounts: {},
          totalInspeksi: 0,
          violations: 0,
          tickets: [],
        };
      }

      officerStats[key].totalInspeksi += 1;
      officerStats[key].tickets.push(v);
      const sbuVal = (v.sbu || v.lokasi || "").trim();
      if (sbuVal) {
        officerStats[key].sbuCounts[sbuVal] = (officerStats[key].sbuCounts[sbuVal] || 0) + 1;
      }
      if (v.status !== "Closed" || v.poin > 0) {
        officerStats[key].violations += 1;
      }
    });

    let cleanOfficers = Object.values(officerStats)
      .filter((o) => o.violations === 0)
      .sort((a, b) => b.totalInspeksi - a.totalInspeksi)
      .map((o) => {
        let topSbu = "";
        let maxSbuCount = 0;
        Object.entries(o.sbuCounts).forEach(([sbu, count]) => {
          if (count > maxSbuCount) {
            maxSbuCount = count;
            topSbu = sbu;
          }
        });
        const sbuInfo = getSbuInfo(topSbu || o.tickets[0] || ({ mitra: o.mitra } as any));
        return {
          ...o,
          sbuInfo,
          sbu: sbuInfo.full !== "—" ? sbuInfo.full : topSbu || "—",
          sbuCode: sbuInfo.code !== "—" ? sbuInfo.code : topSbu || "—",
        };
      });

    if (cleanOfficers.length === 0) {
      const violatingOfficerNames = new Set(
        allViolations
          .filter((v) => extractMonthKey(v.tanggalCek || v.createdAt) === targetMonth && (v.status !== "Closed" || v.poin > 0))
          .map((v) => v.petugas?.trim().toLowerCase())
      );

      const catalogOfficers: {
        nama: string;
        mitra: string;
        sbuCounts: Record<string, number>;
        sbuInfo: ReturnType<typeof getSbuInfo>;
        sbu: string;
        sbuCode: string;
        totalInspeksi: number;
        violations: number;
        tickets: Violation[];
      }[] = [];
      allMitraList.forEach((m) => {
        if (m.pic && !violatingOfficerNames.has(m.pic.trim().toLowerCase())) {
          const sbuInfo = getSbuInfo({ mitra: m.nama } as any);
          catalogOfficers.push({
            nama: m.pic,
            mitra: m.nama,
            sbuCounts: {},
            sbuInfo,
            sbu: sbuInfo.full,
            sbuCode: sbuInfo.code,
            totalInspeksi: 1,
            violations: 0,
            tickets: [],
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

  // 4. Kalkulasi dinamis Petugas dengan Pelanggaran Terbanyak / Sering Melakukan Kesalahan (Perlu Pembinaan)
  const dynamicPetugasTerburuk = useMemo(() => {
    const targetMonth = selectedMonth || dynamicTrenBulanan[dynamicTrenBulanan.length - 1]?.bulan || "Okt";

    const officerViolations: Record<
      string,
      {
        nama: string;
        mitra: string;
        sbuCounts: Record<string, number>;
        kpCounts: Record<string, number>;
        totalViolations: number;
        totalPoin: number;
        openCount: number;
        dominantJenis: string;
        jenisFrequency: Record<string, number>;
        tickets: Violation[];
      }
    > = {};

    allViolations.forEach((v) => {
      const vMonth = extractMonthKey(v.tanggalCek || v.createdAt);
      if (vMonth !== targetMonth) return;
      if (!v.petugas || v.petugas === "—") return;
      if (v.status === "Closed" && (v.poin === 0 || !v.poin)) return;

      const key = `${v.petugas.trim()}___${v.mitra.trim()}`;
      if (!officerViolations[key]) {
        officerViolations[key] = {
          nama: v.petugas.trim(),
          mitra: v.mitra.trim(),
          sbuCounts: {},
          kpCounts: {},
          totalViolations: 0,
          totalPoin: 0,
          openCount: 0,
          dominantJenis: v.jenis,
          jenisFrequency: {},
          tickets: [],
        };
      }

      officerViolations[key].totalViolations += 1;
      officerViolations[key].totalPoin += (v.poin || 0);
      if (v.status !== "Closed") {
        officerViolations[key].openCount += 1;
      }
      officerViolations[key].jenisFrequency[v.jenis] =
        (officerViolations[key].jenisFrequency[v.jenis] || 0) + 1;
      officerViolations[key].tickets.push(v);

      const sbuVal = (v.sbu || v.lokasi || "").trim();
      if (sbuVal) {
        officerViolations[key].sbuCounts[sbuVal] =
          (officerViolations[key].sbuCounts[sbuVal] || 0) + 1;
      }
      const kpVal = (v.kp || "").trim();
      if (kpVal) {
        officerViolations[key].kpCounts[kpVal] =
          (officerViolations[key].kpCounts[kpVal] || 0) + 1;
      }
    });

    return Object.values(officerViolations)
      .map((item) => {
        let maxCount = 0;
        let topJenis = item.dominantJenis;
        Object.entries(item.jenisFrequency).forEach(([jenis, count]) => {
          if (count > maxCount) {
            maxCount = count;
            topJenis = jenis;
          }
        });

        // Resolve dominant SBU
        let topSbu = "";
        let maxSbuCount = 0;
        Object.entries(item.sbuCounts).forEach(([sbu, count]) => {
          if (count > maxSbuCount) {
            maxSbuCount = count;
            topSbu = sbu;
          }
        });
        const sbuInfo = getSbuInfo(topSbu || item.tickets[0] || ({ mitra: item.mitra } as any));

        // Resolve dominant KP
        let topKp = "";
        let maxKpCount = 0;
        Object.entries(item.kpCounts).forEach(([kp, count]) => {
          if (count > maxKpCount) {
            maxKpCount = count;
            topKp = kp;
          }
        });

        return {
          ...item,
          dominantJenis: topJenis,
          sbuInfo,
          sbu: sbuInfo.full !== "—" ? sbuInfo.full : topSbu || "—",
          sbuCode: sbuInfo.code !== "—" ? sbuInfo.code : topSbu || "—",
          kp: topKp || item.tickets.find((t) => t.kp)?.kp || "",
        };
      })
      .sort((a, b) => b.totalViolations - a.totalViolations || b.totalPoin - a.totalPoin)
      .slice(0, 5);
  }, [allViolations, selectedMonth, dynamicTrenBulanan]);

  // State Pop-up Detail untuk Kotak Monitoring Bulanan
  const [selectedViolationDetail, setSelectedViolationDetail] = useState<Violation | null>(null);
  const [selectedMitraDetail, setSelectedMitraDetail] = useState<
    (typeof dynamicTop5Mitra)[number] | null
  >(null);
  const [selectedPetugasDetail, setSelectedPetugasDetail] = useState<
    (typeof dynamicPetugasTerbaik)[number] | null
  >(null);
  const [selectedPetugasTerburukDetail, setSelectedPetugasTerburukDetail] = useState<
    (typeof dynamicPetugasTerburuk)[number] | null
  >(null);

  const selectedMitraTickets = useMemo(() => {
    if (!selectedMitraDetail) return [];
    const targetMonth = selectedMonth || "Okt";
    return allViolations.filter((v) => {
      const vMonth = extractMonthKey(v.tanggalCek || v.createdAt);
      return (
        vMonth === targetMonth &&
        v.mitra?.trim().toLowerCase() === selectedMitraDetail.nama.trim().toLowerCase()
      );
    });
  }, [allViolations, selectedMitraDetail, selectedMonth]);

  const selectedPetugasTickets = useMemo(() => {
    if (!selectedPetugasDetail) return [];
    const targetMonth = selectedMonth || "Okt";
    return allViolations.filter((v) => {
      const vMonth = extractMonthKey(v.tanggalCek || v.createdAt);
      return (
        vMonth === targetMonth &&
        v.petugas?.trim().toLowerCase() === selectedPetugasDetail.nama.trim().toLowerCase() &&
        v.mitra?.trim().toLowerCase() === selectedPetugasDetail.mitra.trim().toLowerCase()
      );
    });
  }, [allViolations, selectedPetugasDetail, selectedMonth]);

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

      {/* Indikator Filter SBU untuk Kotak KPI di atas */}
      {selectedSbuForKpi && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary dashboard-enter">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 shrink-0" />
            <span>
              Menampilkan data ringkasan KPI untuk:{" "}
              <strong>SBU {selectedSbuForKpi}</strong>
              {sbuOptions.find((s) => s.code === selectedSbuForKpi)?.label
                ? ` — ${sbuOptions.find((s) => s.code === selectedSbuForKpi)?.label}`
                : ""}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSbuForKpi(null)}
            className="h-7 px-2.5 text-xs text-primary hover:bg-primary/20 gap-1 font-semibold"
          >
            <X className="size-3.5" />
            Reset (Semua SBU)
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Card
            key={kpi.label}
            className="dashboard-enter relative overflow-hidden transition-all duration-200"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            {selectedSbuForKpi && (
              <span className="absolute top-2.5 right-2.5 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                {selectedSbuForKpi}
              </span>
            )}
            <CardContent className="flex min-h-24 items-center gap-3.5 !p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary shrink-0">
                <kpi.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-snug">
                  {kpi.label}
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
                  {kpi.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="dashboard-enter lg:col-span-3" style={{ animationDelay: "460ms" }}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>
                  {trendFilterType === "bulan" ? "Tren Pelanggaran Bulanan" : "Tren Pelanggaran SBU"}
                </CardTitle>
                {trendFilterType === "sbu" && selectedSbuForKpi && (
                  <span className="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    Terpilih: {selectedSbuForKpi}
                  </span>
                )}
              </div>
              <CardDescription>
                {trendFilterType === "bulan"
                  ? "Jumlah laporan pelanggaran yang tercatat per bulan"
                  : selectedSbuForKpi
                  ? `Klik batang ${selectedSbuForKpi} lagi untuk me-reset 4 kotak di atas ke Semua SBU`
                  : "Klik salah satu diagram batang SBU untuk menyesuaikan 4 kotak di atas"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:inline">Pilihan:</span>
              <Select
                value={trendFilterType}
                onValueChange={(val: "bulan" | "sbu") => setTrendFilterType(val)}
              >
                <SelectTrigger className="w-28 sm:w-32 h-8 text-xs font-semibold">
                  {trendFilterType === "bulan" ? (
                    <Calendar className="mr-1.5 size-3.5 text-primary shrink-0" />
                  ) : (
                    <Building2 className="mr-1.5 size-3.5 text-primary shrink-0" />
                  )}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulan" className="text-xs font-semibold">
                    Bulan
                  </SelectItem>
                  <SelectItem value="sbu" className="text-xs font-semibold">
                    SBU
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeChartData}
                margin={{ left: -16, right: 30, top: 18 }}
                onClick={(state) => {
                  if (!state || !state.activePayload || state.activePayload.length === 0) return;
                  const payload = state.activePayload[0]?.payload;
                  if (!payload) return;

                  if (trendFilterType === "sbu") {
                    const sbu = payload.key || payload.name;
                    if (typeof sbu === "string") {
                      setSelectedSbuForKpi((prev) => (prev === sbu ? null : sbu));
                      setSelectedSbuKey(sbu);
                    }
                  } else {
                    const bulan = payload.bulan || payload.name;
                    if (typeof bulan === "string") {
                      setSelectedMonth(bulan);
                    }
                  }
                }}
              >
                <defs>
                  {/* Filter: Subtle soft blue shadow harmonized with white card */}
                  <filter id="bar3DShadow" x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#78BAF0" floodOpacity="0.22" />
                  </filter>

                  {/* Filter: Soft blue highlight for selected bar */}
                  <filter id="bar3DSelectedGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#55A2E5" floodOpacity="0.35" />
                  </filter>

                  {/* Normal 3D Front Gradient: Soft pastel sky-to-medium blue matching #EAF5FE & #C2E2FC */}
                  <linearGradient id="bar3DFront" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A1D1F8" />
                    <stop offset="50%" stopColor="#78BAF0" />
                    <stop offset="100%" stopColor="#55A2E5" />
                  </linearGradient>

                  {/* Selected 3D Front Gradient: Richer accent blue */}
                  <linearGradient id="bar3DFrontSelected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6DB3F2" />
                    <stop offset="50%" stopColor="#4198E8" />
                    <stop offset="100%" stopColor="#267FD8" />
                  </linearGradient>

                  {/* Dimmed 3D Front Gradient: Very light soft pastel matching #EAF5FE */}
                  <linearGradient id="bar3DFrontMuted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E1F0FD" />
                    <stop offset="100%" stopColor="#C8E4FB" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  tick={(props) => {
                    const { x, y, payload } = props as {
                      x: number;
                      y: number;
                      payload: { value: string };
                    };
                    const isSelected =
                      trendFilterType === "bulan"
                        ? payload.value === selectedMonth
                        : payload.value === selectedSbuForKpi;
                    const onSelect = () => {
                      if (trendFilterType === "bulan") {
                        setSelectedMonth(payload.value);
                      } else {
                        setSelectedSbuForKpi((prev) => (prev === payload.value ? null : payload.value));
                        setSelectedSbuKey(payload.value);
                      }
                    };

                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          y={16}
                          textAnchor="middle"
                          fill={isSelected ? "#267FD8" : "var(--muted-foreground)"}
                          fontWeight={isSelected ? 700 : 400}
                          role="button"
                          tabIndex={0}
                          aria-label={`Pilih ${payload.value}`}
                          style={{ cursor: "pointer" }}
                          onClick={onSelect}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") onSelect();
                          }}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(194, 226, 252, 0.45)" }}
                  formatter={(value: any, _name: any, item: any) => [
                    `${value} laporan`,
                    trendFilterType === "sbu" && item?.payload?.fullLabel
                      ? item.payload.fullLabel
                      : "Total Pelanggaran",
                  ]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="jumlah"
                  maxBarSize={32}
                  shape={(barProps: any) => (
                    <Bar3D
                      {...barProps}
                      trendFilterType={trendFilterType}
                      selectedMonth={selectedMonth}
                      selectedSbuForKpi={selectedSbuForKpi}
                    />
                  )}
                />
              </BarChart>
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
                    width={135}
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
                  <Bar dataKey="jumlah" fill="#78BAF0" radius={[0, 6, 6, 0]} barSize={14} />
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
        {trendFilterType === "bulan" ? (
          <>
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
          </>
        ) : (
          <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Ringkasan SBU {selectedSbuKey}</CardTitle>
                <CardDescription>
                  {selectedSbuSummary?.fullLabel || `SBU ${selectedSbuKey}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">Pilih SBU:</span>
                <Select value={selectedSbuKey} onValueChange={(val) => setSelectedSbuKey(val)}>
                  <SelectTrigger className="w-36 sm:w-48 h-8 text-xs font-semibold">
                    <Building2 className="mr-1.5 size-3.5 text-primary" />
                    <SelectValue placeholder="Pilih SBU" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {dynamicTrenSbu.map((ts) => (
                      <SelectItem key={ts.key} value={ts.key} className="text-xs">
                        {ts.label} ({ts.jumlah} Laporan)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-4xl font-bold tracking-tight text-primary">
                {selectedSbuSummary?.jumlah ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">total laporan pelanggaran</p>
              <p className="text-sm font-medium text-muted-foreground">
                (
                {totalViolationsCount > 0
                  ? Math.round(((selectedSbuSummary?.jumlah ?? 0) / totalViolationsCount) * 100)
                  : 0}
                % dari total seluruh SBU)
              </p>
            </CardContent>
          </>
        )}
      </Card>

      {/* 4 Kotak Monitoring Bulanan (2 Kolom Lebar per Baris) */}
      <div className="mt-6 grid gap-6 grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* Top 5 Mitra Terbaik Bulan Terpilih */}
        <Card className="dashboard-enter flex flex-col h-full" style={{ animationDelay: "760ms" }}>
          <CardHeader className="h-[100px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 h-6">
              <CardTitle>Top 5 Mitra Terbaik</CardTitle>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary shrink-0">
                {selectedTrend.bulan}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Pilih Evaluasi Bulan:</span>
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
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedMitraDetail(m)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedMitraDetail(m);
                        }
                      }}
                      className="rounded-lg border border-border p-3 transition-all hover:bg-muted/50 hover:border-primary/40 cursor-pointer h-[104px] flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="mr-auto text-sm font-semibold text-foreground truncate">{m.nama}</span>
                        <StatusPill tone={isClean ? "success" : m.skor < 70 ? "warning" : "critical"}>
                          {isClean ? "Bersih · 0 Poin" : `${m.skor} Poin`}
                        </StatusPill>
                        <span className="w-16 shrink-0 text-right text-xs font-bold font-mono">
                          {m.skor} Pts
                        </span>
                      </div>
                      <Progress
                        value={isClean ? 100 : Math.max(5, 100 - m.skor)}
                        className={isClean ? "[&>div]:bg-success" : m.skor < 70 ? "[&>div]:bg-warning" : "[&>div]:bg-critical"}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">{m.kontrak || "Mitra Aktif"}</span>
                        <span className="shrink-0 font-medium">{m.pelanggaranAktif ?? 0} pelanggaran aktif</span>
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
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                {selectedTrend.bulan}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Pilih Evaluasi Bulan:</span>
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
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPetugasDetail(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPetugasDetail(p);
                      }
                    }}
                    className="rounded-lg border border-border p-3 transition-all hover:bg-muted/50 hover:border-emerald-500/40 cursor-pointer h-[104px] flex flex-col justify-between"
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
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <span className="inline-flex items-center rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">
                        {p.sbuCode !== "—" ? p.sbuCode : "SBU"}
                      </span>
                      <span className="truncate">
                        Mitra: <span className="font-semibold text-foreground">{p.mitra}</span>
                      </span>
                    </div>
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

        {/* Petugas Perlu Pembinaan (Pelanggaran Terbanyak) */}
        <Card className="dashboard-enter flex flex-col h-full" style={{ animationDelay: "835ms" }}>
          <CardHeader className="h-[100px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 h-6">
              <CardTitle>Petugas Perlu Pembinaan</CardTitle>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                {selectedTrend.bulan}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Pilih Evaluasi Bulan:</span>
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
              {dynamicPetugasTerburuk.length > 0 ? (
                dynamicPetugasTerburuk.map((p, i) => (
                  <div
                    key={`${p.nama}-${p.mitra}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPetugasTerburukDetail(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPetugasTerburukDetail(p);
                      }
                    }}
                    className="rounded-lg border border-border p-3 transition-all hover:bg-muted/50 hover:border-rose-500/40 cursor-pointer h-[104px] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400">
                          {i + 1}
                        </span>
                        <p className="text-sm font-bold text-foreground truncate">{p.nama}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill tone="critical">{p.totalViolations} Pelanggaran</StatusPill>
                        <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                          {p.totalPoin} Pts
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <span className="inline-flex items-center rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0 font-mono">
                        {p.sbuCode !== "—" ? p.sbuCode : "SBU"}
                      </span>
                      <span className="truncate">
                        Mitra: <span className="font-semibold text-foreground">{p.mitra}</span>
                      </span>
                    </div>
                    <p className="flex items-center justify-between text-xs text-muted-foreground truncate">
                      <span className="truncate">
                        Sering: <strong className="text-rose-600 dark:text-rose-400">{p.dominantJenis}</strong>
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-medium shrink-0 ml-2">
                        ⚠️ Perlu Pembinaan
                      </span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Tidak Ada Petugas Melanggar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Seluruh petugas mitra di bulan {selectedTrend.bulan} berstatus nihil pelanggaran / 100% patuh.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-2 p-4 sm:p-6 sm:pt-2">
            <Button asChild variant="outline" className="w-full h-10">
              <Link to="/pelanggaran">Lihat evaluasi kepatuhan petugas</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Pelanggaran Terbaru Bulan Terpilih */}
        <Card className="dashboard-enter flex flex-col h-full" style={{ animationDelay: "860ms" }}>
          <CardHeader className="h-[100px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 h-6">
              <CardTitle>Pelanggaran Bulan {selectedTrend.bulan}</CardTitle>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                {selectedTrend.bulan}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Pilih Evaluasi Bulan:</span>
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
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedViolationDetail(v)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedViolationDetail(v);
                      }
                    }}
                    className="rounded-lg border border-border p-3 transition-all hover:bg-muted/50 hover:border-rose-500/40 cursor-pointer h-[104px] flex flex-col justify-between"
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
                      {v.petugasQc && v.petugasQc !== v.sbu && !sbuOptions.some((s) => s.code === v.petugasQc) ? ` · QC: ${v.petugasQc}` : ""}
                    </p>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground truncate">
                      {(v.sbu || v.lokasi) && (
                        <span className="inline-flex items-center rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary font-mono shrink-0">
                          {getSbuInfo(v).code}
                        </span>
                      )}
                      <span className="truncate">
                        ID PA: <span className="font-semibold text-foreground">{v.idPa ?? "Belum dicatat"}</span>
                      </span>
                    </div>
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

      {/* Pop-up Detail Pelanggaran (Kotak Ketiga) */}
      <Dialog
        open={Boolean(selectedViolationDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedViolationDetail(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedViolationDetail && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <span className="font-mono text-xs font-bold rounded bg-secondary px-2 py-0.5 text-primary">
                    {selectedViolationDetail.id}
                  </span>
                  <StatusPill tone={severityTone(selectedViolationDetail.severity)}>
                    {selectedViolationDetail.severity}
                  </StatusPill>
                  <StatusPill tone={statusTone(selectedViolationDetail.status)}>
                    {selectedViolationDetail.status}
                  </StatusPill>
                  <span className="ml-auto font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {selectedViolationDetail.poin} Poin Sanksi
                  </span>
                </div>
                <DialogTitle className="mt-2 text-base leading-snug">
                  {selectedViolationDetail.jenis}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 text-xs">
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  {selectedViolationDetail.lokasi} · Bulan Evaluasi {selectedTrend.bulan}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-3.5 text-sm">
                <PopupDetailRow
                  label="ID PA ICRM"
                  value={selectedViolationDetail.idPa ?? "Belum dicatat"}
                  mono
                />
                <PopupDetailRow
                  label="SBU Operasional"
                  value={selectedViolationDetail.sbu ?? selectedViolationDetail.lokasi}
                />
                {selectedViolationDetail.kp && (
                  <PopupDetailRow
                    label="Kantor Perwakilan (KP)"
                    value={selectedViolationDetail.kp}
                  />
                )}
                <PopupDetailRow label="Nama Mitra" value={selectedViolationDetail.mitra} />
                <PopupDetailRow label="Petugas Mitra" value={selectedViolationDetail.petugas} />
                <PopupDetailRow
                  label="Petugas QC SBU"
                  value={
                    selectedViolationDetail.petugasQc &&
                    selectedViolationDetail.petugasQc !== selectedViolationDetail.sbu &&
                    !sbuOptions.some((s) => s.code === selectedViolationDetail.petugasQc)
                      ? selectedViolationDetail.petugasQc
                      : "Belum dicatat"
                  }
                />
                {selectedViolationDetail.petugasMonitoringPusat && (
                  <PopupDetailRow
                    label="Petugas Monitoring Pusat"
                    value={selectedViolationDetail.petugasMonitoringPusat}
                  />
                )}
                {selectedViolationDetail.tanggalCek && (
                  <PopupDetailRow
                    label="Tanggal Cek / Inspeksi"
                    value={selectedViolationDetail.tanggalCek}
                  />
                )}
                {selectedViolationDetail.tanggalAktivasi && (
                  <PopupDetailRow
                    label="Tanggal Aktivasi"
                    value={selectedViolationDetail.tanggalAktivasi}
                  />
                )}
                {selectedViolationDetail.tanggalPermohonan && (
                  <PopupDetailRow
                    label="Tanggal Permohonan"
                    value={selectedViolationDetail.tanggalPermohonan}
                  />
                )}
                {selectedViolationDetail.idFat && (
                  <PopupDetailRow label="ID FAT" value={selectedViolationDetail.idFat} mono />
                )}
                {selectedViolationDetail.dwGudang && (
                  <PopupDetailRow label="DW Gudang" value={selectedViolationDetail.dwGudang} />
                )}
                {selectedViolationDetail.lokasiFatPelanggan && (
                  <PopupDetailRow
                    label="Lokasi FAT - Pelanggan"
                    value={selectedViolationDetail.lokasiFatPelanggan}
                  />
                )}
                <PopupDetailRow
                  label="Kategori / Poin Sanksi"
                  value={`${selectedViolationDetail.severity} · ${selectedViolationDetail.poin} Poin`}
                />
                <PopupDetailRow
                  label="Deadline Klarifikasi"
                  value={selectedViolationDetail.deadline}
                />
              </div>

              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" />
                  Catatan Temuan QC
                </p>
                <p className="mt-1.5 text-foreground leading-relaxed">
                  {selectedViolationDetail.catatan || "Tidak ada catatan tambahan."}
                </p>
              </div>

              {selectedViolationDetail.checklistResults &&
                Object.keys(selectedViolationDetail.checklistResults).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                      Rincian Hasil Checklist QC (
                      {Object.keys(selectedViolationDetail.checklistResults).length} Parameter)
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2.5 space-y-1.5 text-xs bg-muted/20">
                      {Object.entries(selectedViolationDetail.checklistResults).map(
                        ([item, res]) => {
                          const isNok =
                            String(res).toLowerCase() === "nok" ||
                            String(res).toLowerCase() === "tidak";
                          return (
                            <div
                              key={item}
                              className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0"
                            >
                              <span className="text-muted-foreground">{item}</span>
                              <span
                                className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] shrink-0 ${
                                  isNok
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {res || "—"}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setSelectedViolationDetail(null)}>
                  Tutup
                </Button>
                <Button asChild>
                  <Link to="/pelanggaran">Buka di Halaman Pelanggaran</Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pop-up Detail Mitra Terbaik (Kotak Pertama) */}
      <Dialog
        open={Boolean(selectedMitraDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedMitraDetail(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedMitraDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 pr-6">
                  <Building2 className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Detail Evaluasi Mitra · Bulan {selectedTrend.bulan}
                  </span>
                </div>
                <DialogTitle className="mt-1 text-lg">{selectedMitraDetail.nama}</DialogTitle>
                <DialogDescription>{selectedMitraDetail.kontrak || "Mitra Aktif"}</DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-3.5 text-sm">
                <PopupDetailRow label="Nama Mitra" value={selectedMitraDetail.nama} />
                <PopupDetailRow
                  label="Nomor / Status Kontrak"
                  value={selectedMitraDetail.kontrak || "Mitra Aktif"}
                />
                <PopupDetailRow label="Bulan Evaluasi" value={`Bulan ${selectedTrend.bulan}`} />
                <PopupDetailRow
                  label="Total Poin Sanksi Bulan Ini"
                  value={`${selectedMitraDetail.skor} Poin`}
                  mono
                />
                <PopupDetailRow
                  label="Pelanggaran Aktif Bulan Ini"
                  value={`${selectedMitraDetail.pelanggaranAktif} Tiket`}
                />
                <PopupDetailRow
                  label="Total Tiket Inspeksi QC Bulan Ini"
                  value={`${selectedMitraTickets.length} Data QC`}
                />
              </div>

              {selectedMitraTickets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                    Daftar Inspeksi &amp; Tiket Bulan {selectedTrend.bulan} ({selectedMitraTickets.length})
                  </p>
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {selectedMitraTickets.map((t) => (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedMitraDetail(null);
                          setSelectedViolationDetail(t);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedMitraDetail(null);
                            setSelectedViolationDetail(t);
                          }
                        }}
                        className="rounded-lg border border-border p-2.5 text-xs hover:bg-muted/50 hover:border-primary/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground truncate">{t.jenis}</span>
                          <StatusPill tone={statusTone(t.status)}>{t.status}</StatusPill>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          ID PA: <span className="font-mono text-foreground">{t.idPa ?? "—"}</span> · Petugas:{" "}
                          <span className="text-foreground">{t.petugas}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setSelectedMitraDetail(null)}>
                  Tutup
                </Button>
                <Button asChild>
                  <Link to="/mitra">Lihat Scorecard Mitra</Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pop-up Detail Petugas Mitra Terbaik (Kotak Kedua) */}
      <Dialog
        open={Boolean(selectedPetugasDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedPetugasDetail(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedPetugasDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 pr-6">
                  <User className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Detail Petugas Terbaik · Bulan {selectedTrend.bulan}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <DialogTitle className="text-lg">{selectedPetugasDetail.nama}</DialogTitle>
                  <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    SBU {selectedPetugasDetail.sbuCode}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Mitra: <strong className="text-foreground">{selectedPetugasDetail.mitra}</strong>
                  {selectedPetugasDetail.sbu && selectedPetugasDetail.sbu !== "—" ? (
                    <> · Wilayah: <strong className="text-foreground">{selectedPetugasDetail.sbu}</strong></>
                  ) : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-3.5 text-sm">
                <PopupDetailRow label="Nama Petugas Mitra" value={selectedPetugasDetail.nama} />
                <PopupDetailRow
                  label="Wilayah Operasional SBU"
                  value={
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <Building2 className="size-3.5 shrink-0" />
                      {selectedPetugasDetail.sbu}
                    </span>
                  }
                />
                <PopupDetailRow label="Perusahaan Mitra" value={selectedPetugasDetail.mitra} />
                <PopupDetailRow label="Bulan Evaluasi" value={`Bulan ${selectedTrend.bulan}`} />
                <PopupDetailRow label="Status Kepatuhan QC" value="Nihil Pelanggaran (100% Patuh)" />
                <PopupDetailRow label="Poin Sanksi Bulan Ini" value="0 Poin" mono />
                <PopupDetailRow
                  label="Jumlah Inspeksi QC Bulan Ini"
                  value={`${selectedPetugasDetail.totalInspeksi} Pekerjaan`}
                />
              </div>

              {selectedPetugasTickets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                    Daftar Pekerjaan / Inspeksi QC Bulan {selectedTrend.bulan} (
                    {selectedPetugasTickets.length})
                  </p>
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {selectedPetugasTickets.map((t) => (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedPetugasDetail(null);
                          setSelectedViolationDetail(t);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedPetugasDetail(null);
                            setSelectedViolationDetail(t);
                          }
                        }}
                        className="rounded-lg border border-border p-2.5 text-xs hover:bg-muted/50 hover:border-emerald-500/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-semibold text-foreground">
                            ID PA: {t.idPa ?? t.id}
                          </span>
                          <StatusPill tone={statusTone(t.status)}>{t.status}</StatusPill>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          SBU: <span className="text-foreground">{t.sbu ?? t.lokasi}</span>
                          {t.tanggalCek ? ` · Tgl Cek: ${t.tanggalCek}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setSelectedPetugasDetail(null)}>
                  Tutup
                </Button>
                <Button asChild>
                  <Link to="/mitra">Lihat Daftar Petugas Mitra</Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pop-up Detail Petugas Pelanggaran Terbanyak / Perlu Pembinaan */}
      <Dialog
        open={Boolean(selectedPetugasTerburukDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedPetugasTerburukDetail(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedPetugasTerburukDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 pr-6">
                  <UserX className="size-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Evaluasi Petugas Perlu Pembinaan · Bulan {selectedTrend.bulan}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <DialogTitle className="text-lg">{selectedPetugasTerburukDetail.nama}</DialogTitle>
                  <span className="inline-flex items-center rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                    SBU {selectedPetugasTerburukDetail.sbuCode}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Perusahaan Mitra: <strong className="text-foreground">{selectedPetugasTerburukDetail.mitra}</strong>
                  {selectedPetugasTerburukDetail.sbu && selectedPetugasTerburukDetail.sbu !== "—" ? (
                    <> · Wilayah: <strong className="text-foreground">{selectedPetugasTerburukDetail.sbu}</strong></>
                  ) : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-3.5 text-sm">
                <PopupDetailRow label="Nama Petugas Lapangan" value={selectedPetugasTerburukDetail.nama} />
                <PopupDetailRow
                  label="Wilayah Operasional SBU"
                  value={
                    <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                      <Building2 className="size-3.5 shrink-0" />
                      {selectedPetugasTerburukDetail.sbu}
                    </span>
                  }
                />
                {selectedPetugasTerburukDetail.kp && (
                  <PopupDetailRow
                    label="Kantor Perwakilan (KP)"
                    value={selectedPetugasTerburukDetail.kp}
                  />
                )}
                <PopupDetailRow label="Perusahaan Mitra" value={selectedPetugasTerburukDetail.mitra} />
                <PopupDetailRow label="Bulan Evaluasi" value={`Bulan ${selectedTrend.bulan}`} />
                <PopupDetailRow
                  label="Total Pelanggaran Bulan Ini"
                  value={`${selectedPetugasTerburukDetail.totalViolations} Kasus`}
                  mono
                />
                <PopupDetailRow
                  label="Total Poin Penalti Sanksi"
                  value={`${selectedPetugasTerburukDetail.totalPoin} Poin`}
                  mono
                />
                <PopupDetailRow
                  label="Pelanggaran Belum Selesai (Open)"
                  value={`${selectedPetugasTerburukDetail.openCount} Kasus`}
                />
                <PopupDetailRow
                  label="Temuan Kesalahan Paling Sering"
                  value={selectedPetugasTerburukDetail.dominantJenis}
                />
              </div>

              {selectedPetugasTerburukDetail.tickets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                    Daftar Pelanggaran Petugas Bulan {selectedTrend.bulan} ({selectedPetugasTerburukDetail.tickets.length})
                  </p>
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {selectedPetugasTerburukDetail.tickets.map((t) => {
                      const tSbu = t.sbu || t.lokasi || selectedPetugasTerburukDetail.sbuCode;
                      return (
                        <div
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedPetugasTerburukDetail(null);
                            setSelectedViolationDetail(t);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedPetugasTerburukDetail(null);
                              setSelectedViolationDetail(t);
                            }
                          }}
                          className="rounded-lg border border-border p-2.5 text-xs hover:bg-muted/50 hover:border-rose-500/40 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground truncate">{t.jenis}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <StatusPill tone={severityTone(t.severity)}>{t.severity}</StatusPill>
                              <StatusPill tone={statusTone(t.status)}>{t.status}</StatusPill>
                            </div>
                          </div>
                          <p className="mt-1 text-muted-foreground flex flex-wrap items-center gap-1.5">
                            {tSbu && tSbu !== "—" && (
                              <span className="inline-flex items-center rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary font-mono">
                                {tSbu}
                              </span>
                            )}
                            {t.kp && (
                              <span className="text-[11px] text-muted-foreground">
                                KP: <strong className="text-foreground">{t.kp}</strong> ·
                              </span>
                            )}
                            <span>ID PA: <span className="font-mono text-foreground">{t.idPa ?? t.id}</span></span>
                            <span>·</span>
                            <span>Poin: <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{t.poin} Pts</span></span>
                            {t.tanggalCek ? <span>· Tgl Cek: {t.tanggalCek}</span> : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setSelectedPetugasTerburukDetail(null)}>
                  Tutup
                </Button>
                <Button asChild>
                  <Link to="/pelanggaran">Lihat Semua di Halaman Pelanggaran</Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bagian Pivot Table Otomatis Dashboard */}
      <div className="mt-8 dashboard-enter" style={{ animationDelay: "920ms" }}>
        <PivotTableView violations={allViolations} />
      </div>
    </AppShell>
  );
}

function PopupDetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right text-xs font-semibold text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
