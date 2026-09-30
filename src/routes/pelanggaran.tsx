import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Plus, Search } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  auditTrail,
  severityTone,
  statusTone,
  violations,
  type Violation,
} from "@/lib/iconguard-data";

export const Route = createFileRoute("/pelanggaran")({
  head: () => ({
    meta: [
      { title: "Manajemen Pelanggaran — IconGuard" },
      {
        name: "description",
        content: "Daftar tiket pelanggaran mitra beserta status klarifikasi, deadline SLA, dan audit trail.",
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
  const [filter, setFilter] = useState<(typeof filters)[number]>("Semua");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(violations[0]!.id);

  const list = useMemo(
    () =>
      violations.filter(
        (v) =>
          matches(v, filter) &&
          (v.mitra + v.petugas + v.jenis + v.id).toLowerCase().includes(q.toLowerCase()),
      ),
    [filter, q],
  );
  const selected = violations.find((v) => v.id === selectedId)!;

  return (
    <AppShell>
      <PageHeader
        title="Violation & Incident Management"
        description="Semua tiket pelanggaran dengan deadline klarifikasi otomatis berdasarkan kategori."
        action={
          <Button asChild>
            <Link to="/lapor">
              <Plus className="size-4" /> Input Pelanggaran
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            {filters.map((f) => (
              <TabsTrigger key={f} value={f}>
                {f}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari mitra, petugas, atau nomor tiket"
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {list.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                v.id === selectedId
                  ? "border-primary bg-secondary"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{v.id}</span>
                <StatusPill tone={severityTone(v.severity)}>{v.severity}</StatusPill>
                <StatusPill tone={statusTone(v.status)}>{v.status}</StatusPill>
                <span className="ml-auto text-xs text-muted-foreground">{v.createdAt}</span>
              </div>
              <p className="mt-2 font-semibold">{v.jenis}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {v.mitra} · {v.petugas}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {v.lokasi} · deadline {v.deadline}
              </p>
            </button>
          ))}
          {list.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Tidak ada tiket yang cocok dengan filter.
            </p>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="font-mono">{selected.id}</span>
                <StatusPill tone={statusTone(selected.status)}>{selected.status}</StatusPill>
              </CardTitle>
              <CardDescription>{selected.jenis}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Detail label="Mitra" value={selected.mitra} />
              <Detail label="Petugas lapangan" value={selected.petugas} />
              <Detail label="Kategori / poin sanksi" value={`${selected.severity} · ${selected.poin} poin`} />
              <Detail label="Lokasi (geolocation)" value={selected.lokasi} />
              <Detail label="Deadline klarifikasi" value={selected.deadline} />
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Catatan</p>
                <p className="mt-1">{selected.catatan}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded-lg bg-muted text-[11px] text-muted-foreground"
                  >
                    Bukti {i}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
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
          </Card>
        </div>
      </div>
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
