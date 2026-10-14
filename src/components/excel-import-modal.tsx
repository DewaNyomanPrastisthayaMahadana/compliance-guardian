import React, { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Download, CheckCircle, AlertCircle, Layers, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parseExcelHeadersAndPreview,
  parseSheetData,
  detectAutoMapping,
  processAndImportData,
  downloadExcelTemplate,
  CHECKLIST_COLUMNS,
  type ColumnMapping,
} from "@/lib/excel-importer";
import { clearAllCustomDataFromStorage } from "@/lib/iconguard-data";
import { importExcelViolations } from "@/lib/auth-server";

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExcelImportModal({ open, onOpenChange, onSuccess }: ExcelImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "mapping">("upload");
  const [fileName, setFileName] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [replaceAll, setReplaceAll] = useState(true);

  const resetState = () => {
    setStep("upload");
    setFileName("");
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setHeaderRowIndex(0);
    setHeaders([]);
    setPreviewRows([]);
    setAllRows([]);
    setMapping({});
    setIsProcessing(false);
    setReplaceAll(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setFileName(file.name);
      const parsed = await parseExcelHeadersAndPreview(file);

      setWorkbook(parsed.workbook);
      setSheetNames(parsed.sheetNames);
      setSelectedSheet(parsed.selectedSheet);
      setHeaders(parsed.headers);
      setPreviewRows(parsed.previewRows);
      setAllRows(parsed.allRows);

      // Otomatis mendeteksi pemetaan kolom
      const autoMap = detectAutoMapping(parsed.headers);
      setMapping(autoMap);

      setStep("mapping");
      toast.success(
        `Berhasil membaca sheet "${parsed.selectedSheet}" (${parsed.allRows.length} baris, ${parsed.headers.length} kolom).`
      );
    } catch (err: any) {
      toast.error(err.message || "Gagal membaca file Excel.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSheetChange = (newSheet: string) => {
    if (!workbook || !workbook.Sheets[newSheet]) return;
    try {
      setSelectedSheet(newSheet);
      const parsed = parseSheetData(workbook.Sheets[newSheet]);
      setHeaderRowIndex(parsed.headerRowIndex);
      setHeaders(parsed.headers);
      setPreviewRows(parsed.previewRows);
      setAllRows(parsed.allRows);

      // Re-detect mapping untuk sheet yang baru
      const autoMap = detectAutoMapping(parsed.headers);
      setMapping(autoMap);

      toast.info(
        `Beralih ke sheet "${newSheet}": ${parsed.headers.length} kolom & ${parsed.allRows.length} baris data ditemukan.`
      );
    } catch (err: any) {
      toast.error("Gagal beralih sheet: " + err.message);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setIsProcessing(true);
      const result = processAndImportData(allRows, mapping, { replaceAll });
      if (result.success) {
        try {
          await importExcelViolations({
            data: {
              newViolations: result.violations ?? [],
              newMitraList: result.mitraList ?? [],
              replaceAll,
            },
          });
        } catch (serverErr) {
          console.warn("Server sync error (client fallback used):", serverErr);
        }
        toast.success(`Berhasil mengimpor ${result.totalImported} data temuan dari file Excel!`);
        onOpenChange(false);
        resetState();
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.errors?.[0] || "Gagal mengimpor data.");
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan saat memproses data: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Hitung berapa checklist columns yang terdeteksi di sheet aktif
  const detectedChecklistCount = CHECKLIST_COLUMNS.filter((item) => {
    const cleanAliases = [item.label, ...item.aliases].map((a) =>
      a.toLowerCase().replace(/[^a-z0-9]/g, "")
    );
    return headers.some((h) => {
      const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      return cleanAliases.some((alias) => hClean === alias || hClean.includes(alias) || alias.includes(hClean));
    });
  }).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetState();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            Upload & Olah Data Mentah Excel (Material & Jasa)
          </DialogTitle>
          <DialogDescription>
            Import data temuan/inspeksi vendor dari format Excel (.xlsx / .xls) untuk diolah secara otomatis ke Dashboard, Pelanggaran, dan Scorecard.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl hover:border-primary/60 hover:bg-muted/40 cursor-pointer transition-all"
            >
              <UploadCloud className="size-12 text-primary/70 mb-3" />
              <p className="font-semibold text-base">Pilih atau Drag File Excel ke Sini</p>
              <p className="text-xs text-muted-foreground mt-1">Mendukung file .xlsx, .xls, atau .csv (Multi-sheet & Smart Header)</p>
              <Button type="button" variant="outline" size="sm" className="mt-4 pointer-events-none">
                Pilih File dari Komputer
              </Button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 text-xs">
              <span className="text-muted-foreground">Belum punya format baku atau ingin download contoh tabel?</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-primary text-xs"
                onClick={downloadExcelTemplate}
              >
                <Download className="size-3.5" /> Download Template Excel
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs">
              <span className="text-muted-foreground">Ingin membersihkan data hasil import sebelumnya?</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs"
                onClick={() => {
                  clearAllCustomDataFromStorage();
                  toast.success("Data tersimpan dan cache lama berhasil dibersihkan.");
                  onOpenChange(false);
                  resetState();
                  if (onSuccess) onSuccess();
                }}
              >
                <Trash2 className="size-3.5" /> Bersihkan Cache Data
              </Button>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4 py-2">
            {/* Sheet Selector & File Info */}
            <div className="bg-muted/60 border rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <FileSpreadsheet className="size-4 text-primary" />
                    File: <span className="font-bold">{fileName}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {sheetNames.length > 1
                      ? `File memiliki ${sheetNames.length} sheet. Pilih sheet yang berisi data Hasil QC/Checklist di samping:`
                      : "File berhasil dibaca dan kolom dicocokkan secara otomatis."}
                  </p>
                </div>

                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground shrink-0">Pilih Sheet:</span>
                    <Select value={selectedSheet} onValueChange={handleSheetChange}>
                      <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs bg-background font-medium">
                        <SelectValue placeholder="Pilih Sheet" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetNames.map((s) => (
                          <SelectItem key={s} value={s}>
                            Sheet: {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground bg-background/80 px-2.5 py-1.5 rounded-lg border">
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Check className="size-3" /> Sheet Aktif: <strong>{selectedSheet}</strong>
                </span>
                <span>•</span>
                <span>Baris Judul (Header): Baris ke-{headerRowIndex + 1}</span>
                <span>•</span>
                <span>{headers.length} Kolom Ditemukan</span>
                <span>•</span>
                <span>{allRows.length} Baris Data</span>
              </div>
            </div>

            {/* Checklist Detection Summary */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>{detectedChecklistCount} dari {CHECKLIST_COLUMNS.length}</strong> item Checklist QC & K3 terdeteksi otomatis dari sheet ini.
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                (K3 Helm, Rompi, FAT, ONT, Speedtest, BAA, dll.)
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Berikut adalah pemetaan kolom identitas inspeksi. Sistem telah mencocokkan kolom secara otomatis:
            </p>

            {/* Grid Mapping Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Tanggal Cek */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tanggal Cek / Inspeksi</label>
                <Select
                  value={mapping.tanggalCek || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, tanggalCek: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom Tanggal Cek" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Hari ini --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SBU */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">SBU *</label>
                <Select
                  value={mapping.sbu || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, sbu: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom SBU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Default (SBU Operasional) --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ID PA */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">ID PA / No Order *</label>
                <Select
                  value={mapping.idPa || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, idPa: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom ID PA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Buat Otomatis --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tanggal Aktivasi */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tanggal Aktivasi</label>
                <Select
                  value={mapping.tanggalAktivasi || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, tanggalAktivasi: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom Tanggal Aktivasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tanggal Permohonan */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tanggal Permohonan</label>
                <Select
                  value={mapping.tanggalPermohonan || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, tanggalPermohonan: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom Tanggal Permohonan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nama Mitra */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Nama Mitra / Vendor *</label>
                <Select
                  value={mapping.mitra || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, mitra: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom Mitra" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada (Mitra Operasional) --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Petugas Mitra */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Petugas Mitra</label>
                <Select
                  value={mapping.petugas || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, petugas: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom Petugas Mitra" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Petugas QC SBU */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Petugas QC SBU / Pengawas</label>
                <Select
                  value={mapping.petugasQc || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, petugasQc: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom Petugas QC SBU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada / Kosong --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Petugas Monitoring Pusat */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Petugas Monitoring Pusat</label>
                <Select
                  value={mapping.petugasMonitoringPusat || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, petugasMonitoringPusat: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom Monitoring Pusat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada / Kosong --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* KP */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">KP (Kantor Perwakilan)</label>
                <Select
                  value={mapping.kp || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, kp: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom KP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ID FAT */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">ID FAT</label>
                <Select
                  value={mapping.idFat || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, idFat: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom ID FAT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DW Gudang */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">DW Gudang</label>
                <Select
                  value={mapping.dwGudang || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, dwGudang: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom DW Gudang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lokasi FAT - Pelanggan */}
              <div className="space-y-1 sm:col-span-2 md:col-span-3">
                <label className="font-semibold text-foreground">Lokasi FAT - Pelanggan</label>
                <Select
                  value={mapping.lokasiFatPelanggan || "none"}
                  onValueChange={(val) => setMapping({ ...mapping, lokasiFatPelanggan: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Pilih Kolom Lokasi FAT-Pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak Ada --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview Sample */}
            <div className="border rounded-xl p-4 bg-muted/30">
              <p className="text-xs font-semibold mb-3 text-foreground">Contoh Data Baris Pertama (Preview):</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-xs font-mono">
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] mb-0.5 font-sans">Tgl Cek:</span>
                  <p className="break-words font-medium text-foreground">{String(previewRows[0]?.[mapping.tanggalCek || ""] || "—")}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] mb-0.5 font-sans">Mitra:</span>
                  <p className="break-words font-medium text-foreground">{String(previewRows[0]?.[mapping.mitra || ""] || "—")}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] mb-0.5 font-sans">Petugas Mitra:</span>
                  <p className="break-all font-medium text-foreground">{String(previewRows[0]?.[mapping.petugas || ""] || "—")}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] mb-0.5 font-sans">QC SBU:</span>
                  <p className="break-words font-medium text-foreground">{String(previewRows[0]?.[mapping.petugasQc || ""] || "—")}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] mb-0.5 font-sans">Monitoring Pusat:</span>
                  <p className="break-words font-medium text-foreground">{String(previewRows[0]?.[mapping.petugasMonitoringPusat || ""] || "—")}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] mb-0.5 font-sans">Tgl Aktivasi:</span>
                  <p className="break-words font-medium text-foreground">{String(previewRows[0]?.[mapping.tanggalAktivasi || ""] || "—")}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] mb-0.5 font-sans">ID PA:</span>
                  <p className="break-all font-medium text-foreground">{String(previewRows[0]?.[mapping.idPa || ""] || "—")}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] mb-0.5 font-sans">SBU:</span>
                  <p className="break-words font-medium text-foreground">{String(previewRows[0]?.[mapping.sbu || ""] || "—")}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border bg-amber-500/10 border-amber-500/20 text-xs">
              <input
                type="checkbox"
                id="replaceAllCheckbox"
                checked={replaceAll}
                onChange={(e) => setReplaceAll(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
              />
              <label htmlFor="replaceAllCheckbox" className="cursor-pointer select-none font-medium text-foreground">
                Hapus data PT/CV demo bawaan (Ganti semua dashboard & scorecard murni dengan data dari file Excel ini)
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "mapping" && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("upload")}>
                Ganti File
              </Button>
              <Button type="button" onClick={handleConfirmImport} disabled={isProcessing}>
                {isProcessing ? "Mengolah Data..." : `Proses & Tampilkan (${allRows.length} Data)`}
              </Button>
            </>
          )}
          {step === "upload" && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
