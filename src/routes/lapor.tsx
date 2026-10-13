import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { createViolationReport, requireRouteAccess } from "@/lib/auth-server";
import { useState } from "react";
import { saveViolationEvidence } from "@/lib/evidence-storage";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
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
  syncViolationRecord,
  jenisPelanggaran,
  poinBySeverity,
  fixedSeverityForViolation,
  mitraOptionsBySbu,
  getPetugasBySbuAndMitra,
  slaBySeverity,
  sbuOptions,
  type Severity,
} from "@/lib/iconguard-data";

export const Route = createFileRoute("/lapor")({
  beforeLoad: () => requireRouteAccess("/lapor"),
  head: () => ({
    meta: [
      { title: "Input Pelanggaran — IconGuard" },
      {
        name: "description",
        content:
          "Formulir pencatatan pelanggaran mitra dengan SLA otomatis, geolocation, dan unggah bukti foto.",
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

type EvidenceImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function fileToEvidenceDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxDimension = 1280;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);
      if (!context) {
        reject(new Error("Foto bukti tidak dapat diproses."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Foto bukti tidak dapat dibaca."));
    };
    image.src = objectUrl;
  });
}

function LaporPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [severity, setSeverity] = useState<Severity>("Sedang");
  const [idPa, setIdPa] = useState("");
  const [selectedMitra, setSelectedMitra] = useState("");
  const [selectedPetugas, setSelectedPetugas] = useState("");
  const [selectedJenis, setSelectedJenis] = useState("");
  const [selectedSbu, setSelectedSbu] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<EvidenceImage[]>([]);

  const fixedSeverity = fixedSeverityForViolation(selectedJenis);
  const mitraOptions = (selectedSbu ? mitraOptionsBySbu[selectedSbu] : []) ?? [];
  const petugasOptions =
    selectedSbu && selectedMitra
      ? getPetugasBySbuAndMitra(selectedSbu, selectedMitra)
      : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    const newEvidence: EvidenceImage[] = newFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setEvidenceImages((prev) => [...prev, ...newEvidence]);
    e.target.value = "";
  };

  const handleRemoveImage = (idToRemove: string) => {
    setEvidenceImages((prev) => {
      const item = prev.find((img) => img.id === idToRemove);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((img) => img.id !== idToRemove);
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Input Laporan Pelanggaran"
        description="Formulir inspeksi QC untuk Divisi Material dan Jasa."
      />

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (isSubmitting) return;

          const form = e.currentTarget;
          const formData = new FormData(form);
          const description = formData.get("description");

          if (
            !idPa.trim() ||
            !selectedSbu ||
            !selectedMitra ||
            !selectedPetugas ||
            !selectedJenis ||
            !formData.get("found-at") ||
            typeof description !== "string" ||
            !description.trim() ||
            evidenceImages.length === 0
          ) {
            toast.error(
              "Mohon lengkapi seluruh data pelanggaran, termasuk ID PA, SBU, mitra, petugas, jenis pelanggaran, tanggal dan waktu, uraian temuan, serta bukti foto.",
            );
            return;
          }

          setIsSubmitting(true);
          try {
            const bukti = await Promise.all(evidenceImages.map(({ file }) => fileToEvidenceDataUrl(file)));
            const reportData = {
              idPa: idPa.trim(),
              sbu: selectedSbu,
              mitra: selectedMitra,
              petugas: selectedPetugas,
              jenis: selectedJenis,
              severity,
              catatan: description.trim(),
            };

            const result = await createViolationReport({ data: reportData });
            await saveViolationEvidence(result.violation.id, bukti);
            syncViolationRecord({ ...result.violation, bukti });
            try {
              window.sessionStorage.setItem("iconguard:last-submitted-violation", result.violation.id);
            } catch {
              // The saved evidence remains available through the violation list and IndexedDB.
            }
            await router.invalidate();

            const sbuLabel = sbuOptions.find((sbu) => sbu.code === selectedSbu)?.label;
            toast.success("Laporan berhasil dicatat & masuk ke Scorecard Mitra", {
              description: `${sbuLabel} · ${selectedMitra} · Petugas: ${selectedPetugas} · ID PA ${idPa.trim()}`,
            });

            void navigate({ to: "/pelanggaran" });
          } catch (err) {
            console.error(err);
            toast.error("Gagal menyimpan laporan pelanggaran. Silakan coba lagi.");
          } finally {
            setIsSubmitting(false);
          }
        }}
        className="grid gap-6 lg:grid-cols-3"
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detail Pelanggaran</CardTitle>
            <CardDescription>Lengkapi semua kolom sebelum mengirim laporan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="ID PA ICRM" className="sm:col-span-2">
              <Input
                value={idPa}
                onChange={(event) => setIdPa(event.target.value)}
                placeholder="Contoh: A260922151004207709"
                maxLength={100}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Contoh ID PA untuk demo. Gunakan ID resmi dari ICRM untuk data sebenarnya.
              </p>
            </Field>

            <Field label="SBU" className="sm:col-span-2">
              <Select
                value={selectedSbu}
                onValueChange={(sbu) => {
                  setSelectedSbu(sbu);
                  setSelectedMitra("");
                  setSelectedPetugas("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih SBU" />
                </SelectTrigger>
                <SelectContent>
                  {sbuOptions.map((sbu) => (
                    <SelectItem key={sbu.code} value={sbu.code}>
                      {sbu.code} — {sbu.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Mitra">
              <Select
                value={selectedMitra}
                onValueChange={(mitra) => {
                  setSelectedMitra(mitra);
                  setSelectedPetugas("");
                }}
                disabled={!selectedSbu}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedSbu ? "Pilih mitra" : "Pilih SBU dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {mitraOptions.map((mitra) => (
                    <SelectItem key={mitra} value={mitra}>
                      {mitra}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Petugas Mitra">
              <Select
                value={selectedPetugas}
                onValueChange={setSelectedPetugas}
                disabled={!selectedMitra}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedSbu
                        ? "Pilih SBU dahulu"
                        : !selectedMitra
                          ? "Pilih mitra dahulu"
                          : "Pilih petugas"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {petugasOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Jenis pelanggaran" className="sm:col-span-2">
              <Select
                value={selectedJenis}
                onValueChange={(jenis) => {
                  setSelectedJenis(jenis);
                  const nextFixedSeverity = fixedSeverityForViolation(jenis);
                  if (nextFixedSeverity) setSeverity(nextFixedSeverity);
                  else if (fixedSeverity) setSeverity("Sedang");
                }}
              >
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
              <Select
                value={severity}
                disabled={Boolean(fixedSeverity)}
                onValueChange={(v) => setSeverity(v as Severity)}
              >
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
              {fixedSeverity && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Kategori otomatis ditetapkan sebagai {fixedSeverity} untuk jenis ini.
                </p>
              )}
            </Field>

            <Field label="Tanggal & waktu temuan">
              <Input name="found-at" type="datetime-local" />
            </Field>

            <Field label="Uraian temuan" className="sm:col-span-2">
              <Textarea
                name="description"
                rows={4}
                placeholder="Jelaskan kronologi temuan QC…"
              />
            </Field>

            <Field label="Bukti foto (multi-upload)" className="sm:col-span-2">
              <div className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-muted/30">
                  <Camera className="size-6 text-muted-foreground" />
                  <span className="font-medium text-foreground">Ambil foto atau pilih berkas</span>
                  <span className="text-xs text-muted-foreground">
                    Format gambar (dapat memilih lebih dari 1 foto)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {evidenceImages.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {evidenceImages.length} bukti foto terpilih:
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {evidenceImages.map((img) => (
                        <div
                          key={img.id}
                          className="group relative overflow-hidden rounded-lg border border-border bg-card p-1 shadow-sm"
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                            <img
                              src={img.previewUrl}
                              alt={img.file.name}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveImage(img.id);
                              }}
                              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white shadow transition hover:bg-destructive"
                              aria-label="Hapus foto"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <p
                            className="mt-1.5 truncate px-1 text-[11px] font-medium text-foreground"
                            title={img.file.name}
                          >
                            {img.file.name}
                          </p>
                          <p className="px-1 text-[10px] text-muted-foreground">
                            {(img.file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan laporan…" : "Kirim laporan & teguran"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Laporan yang dikirim akan otomatis masuk ke Scorecard Mitra &amp; Riwayat Pelanggaran.
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
