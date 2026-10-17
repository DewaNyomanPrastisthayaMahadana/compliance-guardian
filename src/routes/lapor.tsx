import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { createViolationReport, requireRouteAccess } from "@/lib/auth-server";
import { useMemo, useState } from "react";
import { saveViolationEvidence } from "@/lib/evidence-storage";
import { toast } from "sonner";
import {
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  User,
  ShieldAlert,
  ListChecks,
  HardHat,
  Wrench,
  FileText,
} from "lucide-react";
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
  poinBySeverity,
  mitraOptionsBySbu,
  getPetugasBySbuAndMitra,
  slaBySeverity,
  sbuOptions,
  getCustomMitraListFromStorage,
  type Severity,
} from "@/lib/iconguard-data";

export const Route = createFileRoute("/lapor")({
  beforeLoad: () => requireRouteAccess("/lapor"),
  head: () => ({
    meta: [
      { title: "Input Pelanggaran & QC — IconGuard" },
      {
        name: "description",
        content:
          "Formulir inspeksi QC dan pencatatan pelanggaran mitra Divisi Material dan Jasa sesuai format Excel.",
      },
      { property: "og:title", content: "Input Pelanggaran & QC — IconGuard" },
      {
        property: "og:description",
        content: "Formulir inspeksi QC dengan 26 parameter checklist dan SLA otomatis.",
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

// 24 Parameter Checklist QC sesuai urutan kolom Excel (6 K3 Awal + 12 Teknis/Dokumentasi + 6 K3 Akhir)
export const EXCEL_CHECKLIST_ITEMS = [
  { key: "k3_awal_helm", label: "k3 awal helm", group: "K3 Awal", defaultSeverity: "Berat" as const },
  { key: "k3_awal_sarung_tangan", label: "k3 awal sarung tangan", group: "K3 Awal", defaultSeverity: "Berat" as const },
  { key: "k3_awal_rompi", label: "k3 awal rompi", group: "K3 Awal", defaultSeverity: "Berat" as const },
  { key: "k3_awal_body_harnes", label: "k3 awal body harnes", group: "K3 Awal", defaultSeverity: "Berat" as const },
  { key: "k3_awal_lengan_panjang", label: "Penampilan Awal - Lengan Panjang", group: "Penampilan", defaultSeverity: "Berat" as const },
  { key: "k3_awal_sepatu", label: "k3 awal sepatu", group: "K3 Awal", defaultSeverity: "Berat" as const },
  { key: "id_fat", label: "ID FAT", group: "Instalasi", defaultSeverity: "Sedang" as const },
  { key: "kerapian_instalasi_tiang_listrik", label: "Kerapian instalasi Tiang listrik", group: "Instalasi", defaultSeverity: "Sedang" as const },
  { key: "opm_fat_25db", label: "OPM FAT -25db", group: "Instalasi", defaultSeverity: "Sedang" as const },
  { key: "stiker_ont", label: "Stiker ONT", group: "Instalasi", defaultSeverity: "Ringan" as const },
  { key: "sn_ont", label: "SN ONT", group: "Instalasi", defaultSeverity: "Sedang" as const },
  { key: "opm_ont_26db", label: "OPM ONT -26db", group: "Instalasi", defaultSeverity: "Sedang" as const },
  { key: "instalasi_s_clamp_dan_hookclam_di_rumah", label: "instalasi s-clamp dan hookclam di rumah", group: "Instalasi", defaultSeverity: "Berat" as const },
  { key: "speedtest", label: "Speedtest", group: "Instalasi", defaultSeverity: "Sedang" as const },
  { key: "foto_bersama_pelanggan", label: "foto bersama Pelanggan", group: "Dokumentasi", defaultSeverity: "Ringan" as const },
  { key: "foto_depan_rumah_pelangan", label: "foto Depan Rumah pelangan", group: "Dokumentasi", defaultSeverity: "Ringan" as const },
  { key: "aplikasi_my_icon", label: "Aplikasi My Icon", group: "Dokumentasi", defaultSeverity: "Ringan" as const },
  { key: "k3_akhir_helm", label: "k3 akhir helm", group: "K3 Akhir", defaultSeverity: "Berat" as const },
  { key: "k3_akhir_sarung_tangan", label: "k3 akhir sarung tangan", group: "K3 Akhir", defaultSeverity: "Berat" as const },
  { key: "k3_akhir_rompi", label: "k3 akhir rompi", group: "K3 Akhir", defaultSeverity: "Berat" as const },
  { key: "k3_akhir_body_harnes", label: "k3 akhir body harnes", group: "K3 Akhir", defaultSeverity: "Berat" as const },
  { key: "k3_akhir_lengan_panjang", label: "Penampilan Akhir - Lengan Panjang", group: "Penampilan", defaultSeverity: "Berat" as const },
  { key: "k3_akhir_sepatu", label: "k3 akhir sepatu", group: "K3 Akhir", defaultSeverity: "Berat" as const },
  { key: "baa", label: "BAA", group: "Administrasi", defaultSeverity: "Sedang" as const },
] as const;

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

function getTodayFormatted(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function LaporPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 10 Kolom Informasi Utama Sesuai Format Excel
  const [tanggalCek, setTanggalCek] = useState(getTodayFormatted());
  const [selectedSbu, setSelectedSbu] = useState("");
  const [idPa, setIdPa] = useState("");
  const [tanggalAktivasi, setTanggalAktivasi] = useState("");
  const [tanggalPermohonan, setTanggalPermohonan] = useState("");
  const [selectedMitra, setSelectedMitra] = useState("");
  const [customMitraInput, setCustomMitraInput] = useState("");
  const [selectedPetugas, setSelectedPetugas] = useState("");
  const [customPetugasInput, setCustomPetugasInput] = useState("");
  const [petugasQc, setPetugasQc] = useState("");
  const [petugasMonitoringPusat, setPetugasMonitoringPusat] = useState("");
  const [kp, setKp] = useState("");

  // 26 Parameter Checklist QC: inisialisasi default "OK"
  const [checklist, setChecklist] = useState<Record<string, "OK" | "NOK">>(() => {
    const init: Record<string, "OK" | "NOK"> = {};
    EXCEL_CHECKLIST_ITEMS.forEach((item) => {
      init[item.label] = "OK";
    });
    return init;
  });

  // Uraian Temuan / Catatan Tambahan & Foto Bukti
  const [catatan, setCatatan] = useState("");
  const [manualSeverity, setManualSeverity] = useState<Severity | "">("");
  const [manualJenis, setManualJenis] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<EvidenceImage[]>([]);

  // Daftar Opsi Mitra & Petugas
  const existingMitraStorage = useMemo(() => getCustomMitraListFromStorage(), []);
  const mitraOptions = useMemo(() => {
    const base = selectedSbu ? (mitraOptionsBySbu[selectedSbu] ?? []) : [];
    const fromStorage = existingMitraStorage.map((m) => m.nama);
    const combined = Array.from(new Set([...base, ...fromStorage]));
    return combined;
  }, [selectedSbu, existingMitraStorage]);

  const effectiveMitra = selectedMitra === "__CUSTOM__" ? customMitraInput.trim() : selectedMitra;

  const petugasOptions = useMemo(() => {
    if (!selectedSbu || !effectiveMitra) return [];
    return getPetugasBySbuAndMitra(selectedSbu, effectiveMitra);
  }, [selectedSbu, effectiveMitra]);

  const effectivePetugas =
    selectedPetugas === "__CUSTOM__" ? customPetugasInput.trim() : selectedPetugas;

  // Analisis Hasil 26 Parameter Checklist
  const nokItems = useMemo(() => {
    return EXCEL_CHECKLIST_ITEMS.filter((item) => checklist[item.label] === "NOK");
  }, [checklist]);

  const totalNok = nokItems.length;
  const isAllOk = totalNok === 0;

  // Status QC K3 & QC Instalasi (Sesuai Rekap Excel)
  const qcK3Status = useMemo(() => {
    const k3Nok = nokItems.some((item) => item.group === "K3 Awal" || item.group === "K3 Akhir");
    return k3Nok ? "NOK" : "OK";
  }, [nokItems]);

  const qcInstalasiStatus = useMemo(() => {
    const instalasiNok = nokItems.some(
      (item) => item.group === "Instalasi" || item.group === "Dokumentasi" || item.group === "Administrasi",
    );
    return instalasiNok ? "NOK" : "OK";
  }, [nokItems]);

  // Kalkulasi Otomatis Tingkat Keparahan (Severity)
  const autoSeverity = useMemo<Severity>(() => {
    if (nokItems.some((item) => item.defaultSeverity === "Berat")) return "Berat";
    if (nokItems.some((item) => item.defaultSeverity === "Sedang")) return "Sedang";
    return "Ringan";
  }, [nokItems]);

  const effectiveSeverity = manualSeverity || autoSeverity;

  // Poin Sanksi Otomatis
  const calculatedPoin = isAllOk ? 0 : poinBySeverity[effectiveSeverity];

  // Jenis Pelanggaran Otomatis (sesuai ketentuan K3 dan item teknis spesifik)
  const autoJenis = useMemo(() => {
    if (isAllOk) return "";
    const firstNok = nokItems[0];
    if (nokItems.length === 1 && firstNok) {
      return firstNok.label;
    }
    if (nokItems.length > 1 && firstNok) {
      return `${firstNok.label} (+${nokItems.length - 1} temuan lainnya)`;
    }
    return "Temuan Ketidaksesuaian Standar QC";
  }, [isAllOk, nokItems]);

  const effectiveJenis = manualJenis.trim() || autoJenis;

  // Helper Pengaturan Checklist Cepat
  const handleSetAll = (val: "OK" | "NOK") => {
    const updated: Record<string, "OK" | "NOK"> = {};
    EXCEL_CHECKLIST_ITEMS.forEach((item) => {
      updated[item.label] = val;
    });
    setChecklist(updated);
  };

  const handleToggleItem = (label: string) => {
    setChecklist((prev) => ({
      ...prev,
      [label]: prev[label] === "OK" ? "NOK" : "OK",
    }));
  };

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
        title="Input Pelanggaran & Hasil QC"
        description="Formulir inspeksi QC Divisi Material & Jasa lengkap sesuai format Excel (10 Kolom Administrasi + 26 Parameter Checklist)."
      />

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (isSubmitting) return;

          if (!tanggalCek) {
            toast.error("Mohon isi Tanggal Cek.");
            return;
          }
          if (!selectedSbu) {
            toast.error("Mohon pilih SBU Operasional.");
            return;
          }
          if (!idPa.trim()) {
            toast.error("Mohon isi ID PA ICRM.");
            return;
          }
          if (!effectiveMitra) {
            toast.error("Mohon tentukan Nama Mitra.");
            return;
          }
          if (!effectivePetugas) {
            toast.error("Mohon tentukan Nama Petugas Mitra.");
            return;
          }

          if (isAllOk && !manualJenis.trim()) {
            toast.error("Seluruh parameter QC bernilai OK (Nihil Pelanggaran). Inspeksi rutin yang memenuhi standar tidak dicatat sebagai tiket pelanggaran.");
            return;
          }

          setIsSubmitting(true);
          try {
            const bukti = await Promise.all(
              evidenceImages.map(({ file }) => fileToEvidenceDataUrl(file)),
            );

            // Format catatan otomatis bila kosong dan ada temuan
            let finalCatatan = catatan.trim();
            if (!finalCatatan) {
              if (isAllOk) {
                finalCatatan = "Hasil inspeksi seluruh 26 parameter QC dinyatakan OK (Memenuhi Standar).";
              } else {
                finalCatatan = `Temuan tidak memenuhi standar (NOK) pada: ${nokItems.map((n) => n.label).join(", ")}.`;
              }
            }

            const reportData = {
              idPa: idPa.trim(),
              sbu: selectedSbu,
              mitra: effectiveMitra,
              petugas: effectivePetugas,
              petugasQc: petugasQc.trim() || undefined,
              petugasMonitoringPusat: petugasMonitoringPusat.trim() || undefined,
              tanggalCek: tanggalCek,
              tanggalAktivasi: tanggalAktivasi || undefined,
              tanggalPermohonan: tanggalPermohonan || undefined,
              kp: kp.trim() || undefined,
              jenis: effectiveJenis,
              severity: effectiveSeverity,
              status: isAllOk ? ("Closed" as const) : ("Open" as const),
              poin: calculatedPoin,
              catatan: finalCatatan,
              qcK3: qcK3Status,
              qcInstalasi: qcInstalasiStatus,
              checklistResults: checklist,
              bukti,
            };

            const result = await createViolationReport({ data: reportData });
            if (bukti.length > 0) {
              await saveViolationEvidence(result.violation.id, bukti);
            }
            syncViolationRecord({ ...result.violation, bukti });

            await router.invalidate();

            toast.success(
              isAllOk
                ? "Data Inspeksi QC Berhasil Disimpan (Nihil Pelanggaran)"
                : "Laporan Pelanggaran Berhasil Dicatat ke Scorecard Mitra",
              {
                description: `${effectiveMitra} · Petugas: ${effectivePetugas} · ID PA: ${idPa.trim()} · ${totalNok} Temuan NOK`,
              },
            );

            void navigate({ to: "/pelanggaran" });
          } catch (err) {
            console.error(err);
            toast.error("Gagal menyimpan data laporan. Silakan periksa kembali isian form.");
          } finally {
            setIsSubmitting(false);
          }
        }}
        className="grid gap-6 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          {/* BAGIAN 1: DATA IDENTIFIKASI & ADMINISTRASI (10 KOLOM EXCEL) */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">1. Data Identifikasi &amp; Administrasi Proyek</CardTitle>
                  <CardDescription className="text-xs">
                    10 kolom data umum sesuai urutan format file Excel inspeksi QC.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {/* Kolom 1: Tanggal Cek */}
              <Field label="1. Tanggal Cek *" required>
                <div className="relative">
                  <Input
                    type="date"
                    value={tanggalCek}
                    onChange={(e) => setTanggalCek(e.target.value)}
                    required
                  />
                </div>
              </Field>

              {/* Kolom 2: SBU */}
              <Field label="2. SBU Operasional *" required>
                <Select
                  value={selectedSbu}
                  onValueChange={(val) => {
                    setSelectedSbu(val);
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

              {/* Kolom 3: ID PA */}
              <Field label="3. ID PA (ICRM) *" className="sm:col-span-2" required>
                <Input
                  value={idPa}
                  onChange={(e) => setIdPa(e.target.value)}
                  placeholder="Contoh: A260922151004207709"
                  maxLength={100}
                  required
                />
              </Field>

              {/* Kolom 4: Tanggal Aktivasi */}
              <Field label="4. Tanggal Aktivasi">
                <Input
                  type="date"
                  value={tanggalAktivasi}
                  onChange={(e) => setTanggalAktivasi(e.target.value)}
                />
              </Field>

              {/* Kolom 5: Tanggal Permohonan */}
              <Field label="5. Tanggal Permohonan">
                <Input
                  type="date"
                  value={tanggalPermohonan}
                  onChange={(e) => setTanggalPermohonan(e.target.value)}
                />
              </Field>

              {/* Kolom 6: Nama Mitra */}
              <Field label="6. Nama Mitra *" required>
                <Select
                  value={selectedMitra}
                  onValueChange={(val) => {
                    setSelectedMitra(val);
                    setSelectedPetugas("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih / input nama mitra" />
                  </SelectTrigger>
                  <SelectContent>
                    {mitraOptions.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                    <SelectItem value="__CUSTOM__" className="font-semibold text-primary">
                      ✏️ Tulis Mitra Baru / Lainnya...
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedMitra === "__CUSTOM__" && (
                  <Input
                    className="mt-2 text-xs"
                    placeholder="Ketik nama mitra..."
                    value={customMitraInput}
                    onChange={(e) => setCustomMitraInput(e.target.value)}
                    required
                  />
                )}
              </Field>

              {/* Kolom 7: Petugas Mitra */}
              <Field label="7. Petugas Mitra *" required>
                <Select
                  value={selectedPetugas}
                  onValueChange={(val) => setSelectedPetugas(val)}
                  disabled={!effectiveMitra}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !effectiveMitra ? "Pilih mitra terlebih dahulu" : "Pilih petugas mitra"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {petugasOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                    <SelectItem value="__CUSTOM__" className="font-semibold text-primary">
                      ✏️ Tulis Petugas Baru / Lainnya...
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedPetugas === "__CUSTOM__" && (
                  <Input
                    className="mt-2 text-xs"
                    placeholder="Ketik nama petugas mitra..."
                    value={customPetugasInput}
                    onChange={(e) => setCustomPetugasInput(e.target.value)}
                    required
                  />
                )}
              </Field>

              {/* Kolom 8: Petugas QC SBU */}
              <Field label="8. Petugas QC SBU">
                <Input
                  value={petugasQc}
                  onChange={(e) => setPetugasQc(e.target.value)}
                  placeholder="Nama petugas QC SBU..."
                />
              </Field>

              {/* Kolom 9: Petugas Monitoring Pusat */}
              <Field label="9. Petugas Monitoring Pusat">
                <Input
                  value={petugasMonitoringPusat}
                  onChange={(e) => setPetugasMonitoringPusat(e.target.value)}
                  placeholder="Nama petugas monitoring pusat..."
                />
              </Field>

              {/* Kolom 10: KP (Kantor Perwakilan) */}
              <Field label="10. Kantor Perwakilan (KP)" className="sm:col-span-2">
                <Input
                  value={kp}
                  onChange={(e) => setKp(e.target.value)}
                  placeholder="Contoh: KP Medan / KP Pekanbaru..."
                />
              </Field>
            </CardContent>
          </Card>

          {/* BAGIAN 2: 26 PARAMETER CHECKLIST QC */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ListChecks className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">2. Checklist QC Lapangan (26 Parameter)</CardTitle>
                    <CardDescription className="text-xs">
                      Klik tombol untuk mengubah status parameter: <strong>OK</strong> (Memenuhi Standar) atau{" "}
                      <strong>NOK</strong> (Pelanggaran/Temuan).
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetAll("OK")}
                    className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Set Semua OK
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetAll("NOK")}
                    className="h-7 text-xs gap-1 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                  >
                    <AlertTriangle className="size-3.5" />
                    Set Semua NOK
                  </Button>
                </div>
              </div>

              {/* Indikator Status Total */}
              <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    {EXCEL_CHECKLIST_ITEMS.length - totalNok} OK
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="size-3.5" />
                    {totalNok} NOK (Temuan)
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px]">
                  {isAllOk
                    ? "✓ Seluruh parameter memenuhi standar K3, penampilan & instalasi"
                    : `⚠️ Terdapat ${totalNok} ketidaksesuaian yang terdeteksi`}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Kelompok K3 Awal */}
                <ChecklistSection
                  title="A. K3 Awal Pelaksanaan (5 Parameter)"
                  icon={<HardHat className="size-3.5 text-amber-600" />}
                  items={EXCEL_CHECKLIST_ITEMS.filter((i) => i.group === "K3 Awal")}
                  checklist={checklist}
                  onToggle={handleToggleItem}
                />

                {/* Kelompok Penampilan */}
                <ChecklistSection
                  title="B. Standar Penampilan Petugas (2 Parameter)"
                  icon={<User className="size-3.5 text-indigo-600" />}
                  items={EXCEL_CHECKLIST_ITEMS.filter((i) => i.group === "Penampilan")}
                  checklist={checklist}
                  onToggle={handleToggleItem}
                />

                {/* Kelompok Instalasi & Alat */}
                <ChecklistSection
                  title="C. Standar Material &amp; Instalasi (8 Parameter)"
                  icon={<Wrench className="size-3.5 text-blue-600" />}
                  items={EXCEL_CHECKLIST_ITEMS.filter((i) => i.group === "Instalasi")}
                  checklist={checklist}
                  onToggle={handleToggleItem}
                />

                {/* Kelompok Dokumentasi */}
                <ChecklistSection
                  title="D. Dokumentasi &amp; Aplikasi (3 Parameter)"
                  icon={<Camera className="size-3.5 text-purple-600" />}
                  items={EXCEL_CHECKLIST_ITEMS.filter((i) => i.group === "Dokumentasi")}
                  checklist={checklist}
                  onToggle={handleToggleItem}
                />

                {/* Kelompok K3 Akhir */}
                <ChecklistSection
                  title="E. K3 Akhir Pelaksanaan (5 Parameter)"
                  icon={<HardHat className="size-3.5 text-amber-600" />}
                  items={EXCEL_CHECKLIST_ITEMS.filter((i) => i.group === "K3 Akhir")}
                  checklist={checklist}
                  onToggle={handleToggleItem}
                />

                {/* Kelompok Administrasi (BAA) */}
                <ChecklistSection
                  title="F. Administrasi &amp; Berita Acara (1 Parameter)"
                  icon={<FileText className="size-3.5 text-emerald-600" />}
                  items={EXCEL_CHECKLIST_ITEMS.filter((i) => i.group === "Administrasi")}
                  checklist={checklist}
                  onToggle={handleToggleItem}
                />
              </div>
            </CardContent>
          </Card>

          {/* BAGIAN 3: RINGKASAN TEMUAN & BUKTI FOTO */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">3. Uraian Temuan &amp; Bukti Foto</CardTitle>
                  <CardDescription className="text-xs">
                    Catatan klarifikasi lapangan dan unggah dokumentasi foto temuan.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Uraian Catatan Temuan QC">
                <Textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={3}
                  placeholder={
                    isAllOk
                      ? "Catatan opsional (Hasil inspeksi memenuhi standar)..."
                      : `Rincikan temuan untuk parameter: ${nokItems.map((n) => n.label).join(", ")}...`
                  }
                />
              </Field>

              <Field label="Bukti Foto Lapangan (Multi-upload)">
                <div className="space-y-3">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-muted/30">
                    <Camera className="size-6 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      Ambil foto atau pilih berkas foto bukti
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Mendukung format gambar JPEG/PNG (dapat memilih lebih dari 1 foto)
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
        </div>

        {/* SIDEBAR: AUTO SLA ENGINE & REKAPITULASI HASIL QC */}
        <div className="space-y-4">
          <Card className="sticky top-6 border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Auto SLA Engine &amp; Rekap</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isAllOk
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isAllOk ? "Nihil Pelanggaran" : `${totalNok} Temuan NOK`}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Kalkulasi otomatis poin, severity, dan SLA berdasarkan 26 parameter QC.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Rekap QC K3" value={qcK3Status === "OK" ? "✓ OK (Lengkap)" : "⚠️ NOK (Temuan)"} />
              <Row
                label="Rekap QC Instalasi"
                value={qcInstalasiStatus === "OK" ? "✓ OK (Sesuai)" : "⚠️ NOK (Temuan)"}
              />
              <Row
                label="Tingkat Keparahan"
                value={isAllOk ? "Nihil (Memenuhi Standar)" : effectiveSeverity}
              />
              <Row
                label="Batas Klarifikasi (SLA)"
                value={isAllOk ? "Tidak Ada (Nihil)" : slaBySeverity[effectiveSeverity]}
              />
              <Row
                label="Poin Penalti Sanksi"
                value={`${calculatedPoin} Poin`}
                highlight={calculatedPoin > 0}
              />
              <Row
                label="Status Tiket"
                value={isAllOk ? "Closed (Memenuhi Standar)" : "Open (Perlu Tindak Lanjut)"}
              />

              <div className="pt-2 border-t border-border">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Override Kategori / Severity (Opsional):
                </Label>
                <Select
                  value={manualSeverity || autoSeverity}
                  onValueChange={(val) => setManualSeverity(val as Severity)}
                  disabled={isAllOk}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Ringan", "Sedang", "Berat"] as Severity[]).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s} ({poinBySeverity[s]} Poin)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Judul Temuan Pelanggaran:
                </Label>
                <Input
                  value={effectiveJenis}
                  onChange={(e) => setManualJenis(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
            <div className="p-4 pt-0 space-y-2">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || (isAllOk && !manualJenis.trim())}
              >
                {isSubmitting
                  ? "Menyimpan Data..."
                  : isAllOk && !manualJenis.trim()
                    ? "Seluruh Parameter OK (Nihil Pelanggaran)"
                    : "Kirim Laporan Pelanggaran"}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                {isAllOk && !manualJenis.trim()
                  ? "Inspeksi rutin yang memenuhi standar tidak dicatat sebagai pelanggaran pada sistem."
                  : "Data akan otomatis tersinkronisasi ke Dashboard, Riwayat Pelanggaran, dan Scorecard Mitra."}
              </p>
            </div>
          </Card>
        </div>
      </form>
    </AppShell>
  );
}

function ChecklistSection({
  title,
  icon,
  items,
  checklist,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  items: readonly (typeof EXCEL_CHECKLIST_ITEMS)[number][];
  checklist: Record<string, "OK" | "NOK">;
  onToggle: (label: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const status = checklist[item.label] ?? "OK";
          const isNok = status === "NOK";
          return (
            <div
              key={item.key}
              onClick={() => onToggle(item.label)}
              className={`flex items-center justify-between gap-2 rounded-lg border p-2 text-xs cursor-pointer transition-all ${
                isNok
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-xs"
                  : "border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground"
              }`}
            >
              <span className="truncate pr-1 font-medium">{item.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold font-mono transition-colors ${
                    isNok
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-semibold">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${highlight ? "text-rose-600 dark:text-rose-400 font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
