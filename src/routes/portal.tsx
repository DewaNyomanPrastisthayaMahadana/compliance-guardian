import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileUp, Send, Upload } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { auditTrail, severityTone, statusTone, violations } from "@/lib/iconguard-data";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal Klarifikasi Mitra — IconGuard" },
      {
        name: "description",
        content: "Portal self-service mitra untuk mengunggah Berita Acara Klarifikasi dan bukti perbaikan lapangan.",
      },
      { property: "og:title", content: "Portal Klarifikasi Mitra — IconGuard" },
      {
        property: "og:description",
        content: "Unggah klarifikasi, foto before-after, dan pantau status tiket pelanggaran perusahaan Anda.",
      },
    ],
  }),
  component: PortalPage,
});

const tiket = violations[0];

function PortalPage() {
  return (
    <AppShell>
      <PageHeader
        title="Portal Klarifikasi Mitra"
        description="Tampilan yang dilihat PIC mitra saat menerima teguran dan mengunggah tindak lanjut."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{tiket.id}</span>
                <StatusPill tone={severityTone(tiket.severity)}>{tiket.severity}</StatusPill>
                <StatusPill tone={statusTone(tiket.status)}>{tiket.status}</StatusPill>
              </div>
              <CardTitle className="mt-2">{tiket.jenis}</CardTitle>
              <CardDescription>
                {tiket.mitra} · petugas {tiket.petugas} · deadline klarifikasi {tiket.deadline}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{tiket.catatan}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Klarifikasi &amp; Tindak Lanjut</CardTitle>
              <CardDescription>
                Unggah Berita Acara Klarifikasi (BAK) serta bukti perbaikan before–after.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Klarifikasi terkirim", {
                    description: "Tim Material & Jasa akan memverifikasi tindak lanjut Anda.",
                  });
                }}
              >
                <div>
                  <Label className="mb-2 block">Penjelasan mitra</Label>
                  <Textarea rows={5} placeholder="Tuliskan penyebab, tindakan perbaikan, dan pencegahan…" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <UploadBox label="Berita Acara Klarifikasi" icon={<FileUp className="size-5" />} />
                  <UploadBox label="Foto before–after" icon={<Upload className="size-5" />} />
                </div>
                <Button type="submit">
                  <Send className="size-4" /> Kirim klarifikasi
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat Komunikasi</CardTitle>
            <CardDescription>Transparan antara mitra dan tim Material &amp; Jasa</CardDescription>
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
    </AppShell>
  );
}

function UploadBox({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground hover:border-primary/50">
      {icon}
      {label}
      <input type="file" multiple className="hidden" />
    </label>
  );
}
