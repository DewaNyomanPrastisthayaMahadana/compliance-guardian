import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, MapPin } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  jenisPelanggaran,
  mitraList,
  poinBySeverity,
  slaBySeverity,
  violations,
  type Severity,
} from "@/lib/iconguard-data";

export const Route = createFileRoute("/lapor")({
  head: () => ({
    meta: [
      { title: "Input Pelanggaran — IconGuard" },
      {
        name: "description",
        content: "Formulir pencatatan pelanggaran mitra dengan SLA otomatis, geolocation, dan unggah bukti foto.",
      },
      { property: "og:title", content: "Input Pelanggaran — IconGuard" },
      {
        property: "og:description",
        content: "Catat pelanggaran dari PC maupun ponsel, deadline klarifikasi dihitung otomatis.",
      },
    ],
  }),
  component: LaporPage,
});

const petugas = [...new Set(violations.map((v) => v.petugas))];

function LaporPage() {
  const [severity, setSeverity] = useState<Severity>("Sedang");

  return (
    <AppShell>
      <PageHeader
        title="Input Laporan Pelanggaran"
        description="Formulir mobile-friendly untuk supervisor internal maupun pengawas lapangan."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success("Laporan tercatat", {
            description: `Deadline klarifikasi ${slaBySeverity[severity]} · notifikasi dikirim ke PIC mitra.`,
          });
        }}
        className="grid gap-6 lg:grid-cols-3"
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detail Pelanggaran</CardTitle>
            <CardDescription>Lengkapi semua kolom sebelum mengirim laporan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Mitra">
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mitra" />
                </SelectTrigger>
                <SelectContent>
                  {mitraList.map((m) => (
                    <SelectItem key={m.nama} value={m.nama}>
                      {m.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Petugas lapangan">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih petugas" />
                </SelectTrigger>
                <SelectContent>
                  {petugas.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Jenis pelanggaran" className="sm:col-span-2">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis pelanggaran" />
                </SelectTrigger>
                <SelectContent>
                  {jenisPelanggaran.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Kategori">
              <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Ringan", "Sedang", "Berat"] as Severity[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tanggal & waktu temuan">
              <Input type="datetime-local" defaultValue="2026-09-30T08:00" />
            </Field>

            <Field label="Lokasi (geolocation)" className="sm:col-span-2">
              <div className="flex gap-2">
                <Input placeholder="-6.2607, 106.7816 — Gandaria, Jakarta Selatan" />
                <Button type="button" variant="outline" size="icon" aria-label="Ambil lokasi">
                  <MapPin className="size-4" />
                </Button>
              </div>
            </Field>

            <Field label="Uraian temuan" className="sm:col-span-2">
              <Textarea rows={4} placeholder="Jelaskan kronologi temuan di lapangan…" />
            </Field>

            <Field label="Bukti foto (multi-upload)" className="sm:col-span-2">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-sm text-muted-foreground hover:border-primary/50">
                <Camera className="size-6" />
                Ambil foto atau pilih berkas
                <input type="file" multiple accept="image/*" className="hidden" />
              </label>
            </Field>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto SLA Engine</CardTitle>
              <CardDescription>Dihitung otomatis dari kategori pelanggaran</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Kategori" value={severity} />
              <Row label="Batas klarifikasi" value={slaBySeverity[severity]} />
              <Row label="Poin sanksi" value={`${poinBySeverity[severity]} poin`} />
              <Row label="Reminder" value="T-24 jam & saat overdue" />
              <Row label="Kanal notifikasi" value="WhatsApp & Email" />
            </CardContent>
          </Card>
          <Button type="submit" className="w-full" size="lg">
            Kirim laporan &amp; teguran
          </Button>
          <p className="text-xs text-muted-foreground">
            Mode demo: laporan belum disimpan permanen dan notifikasi belum dikirim.
          </p>
        </div>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
