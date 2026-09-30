import { createFileRoute } from "@tanstack/react-router";
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
import { mitraList, violations, zoneOf } from "@/lib/iconguard-data";

export const Route = createFileRoute("/mitra")({
  head: () => ({
    meta: [
      { title: "Scorecard Kepatuhan Mitra — IconGuard" },
      {
        name: "description",
        content: "Rating kepatuhan setiap mitra Divisi Material dan Jasa sebagai dasar evaluasi kontrak dan sanksi.",
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
  return (
    <AppShell>
      <PageHeader
        title="Mitra Compliance Scorecard"
        description="Dasar evaluasi perpanjangan kontrak dan penetapan sanksi oleh manajemen PLN Icon Plus."
        action={
          <Button variant="outline">
            <Download className="size-4" /> Unduh laporan eksekutif
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {mitraList.map((m) => {
          const zone = zoneOf(m.skor);
          return (
            <Card key={m.nama}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-snug">{m.nama}</CardTitle>
                <CardDescription>
                  {m.kontrak} · PIC {m.pic}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold tracking-tight">{m.skor}</p>
                  <StatusPill tone={zone.tone}>{zone.label}</StatusPill>
                </div>
                <Progress value={m.skor} />
                <p className="text-xs text-muted-foreground">
                  {m.pelanggaranAktif} pelanggaran aktif · {m.totalPelanggaran} total tercatat
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Riwayat Pelanggaran per Mitra</CardTitle>
          <CardDescription>Rekap seluruh tiket pada periode berjalan</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiket</TableHead>
                <TableHead>Mitra</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.id}</TableCell>
                  <TableCell className="font-medium">{v.mitra}</TableCell>
                  <TableCell className="text-muted-foreground">{v.jenis}</TableCell>
                  <TableCell>{v.severity}</TableCell>
                  <TableCell>{v.status}</TableCell>
                  <TableCell className="text-right font-semibold">{v.poin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
