import { createFileRoute, Link } from "@tanstack/react-router";
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
import { AlertTriangle, CheckCircle2, Clock, Gauge, Plus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  jenisDominan,
  mitraList,
  trenBulanan,
  violations,
  statusTone,
  severityTone,
  zoneOf,
} from "@/lib/iconguard-data";

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
        content: "Pantau pelanggaran aktif, laporan pending, dan rating kepatuhan mitra secara real-time.",
      },
    ],
  }),
  component: Dashboard,
});

const kpis = [
  { label: "Pelanggaran Aktif", value: "4", icon: AlertTriangle, tone: "critical" as const },
  { label: "Menunggu Klarifikasi", value: "2", icon: Clock, tone: "warning" as const },
  { label: "Laporan Closed (Sep)", value: "17", icon: CheckCircle2, tone: "success" as const },
  { label: "Rata-rata Kepatuhan", value: "76%", icon: Gauge, tone: "info" as const },
];

function Dashboard() {
  const terbaru = violations.slice(0, 4);

  return (
    <AppShell>
      <PageHeader
        title="Executive Dashboard"
        description="Ringkasan kepatuhan mitra dan petugas lapangan Divisi Material dan Jasa, diperbarui real-time."
        action={
          <Button asChild>
            <Link to="/lapor">
              <Plus className="size-4" /> Input Pelanggaran
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 pt-6">
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
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tren Pelanggaran Bulanan</CardTitle>
            <CardDescription>Jumlah laporan pelanggaran yang tercatat per bulan</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trenBulanan} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bulan" stroke="var(--muted-foreground)" fontSize={12} />
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Jenis Pelanggaran Dominan</CardTitle>
            <CardDescription>Akumulasi 6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jenisDominan} layout="vertical" margin={{ left: 8, right: 16 }}>
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
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard Kepatuhan Mitra</CardTitle>
            <CardDescription>Zona Hijau ≥ 85 · Zona Kuning 70–84 · Zona Merah &lt; 70</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mitraList.map((m, i) => {
              const zone = zoneOf(m.skor);
              return (
                <div key={m.nama} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                    <span className="mr-auto text-sm font-semibold">{m.nama}</span>
                    <StatusPill tone={zone.tone}>{zone.label}</StatusPill>
                    <span className="w-10 text-right text-sm font-bold">{m.skor}</span>
                  </div>
                  <Progress value={m.skor} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pelanggaran Terbaru</CardTitle>
            <CardDescription>Laporan yang perlu tindak lanjut segera</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {terbaru.map((v) => (
              <div key={v.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{v.id}</span>
                  <StatusPill tone={severityTone(v.severity)}>{v.severity}</StatusPill>
                  <StatusPill tone={statusTone(v.status)}>{v.status}</StatusPill>
                </div>
                <p className="mt-2 text-sm font-semibold">{v.jenis}</p>
                <p className="text-xs text-muted-foreground">
                  {v.mitra} · {v.petugas} · deadline {v.deadline}
                </p>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link to="/pelanggaran">Lihat semua pelanggaran</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
