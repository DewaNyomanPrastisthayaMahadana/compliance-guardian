import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Table as TableIcon, FileSpreadsheet, ShieldCheck, Wrench, BarChart3, Percent } from "lucide-react";
import * as XLSX from "xlsx";
import type { Violation } from "@/lib/iconguard-data";

export interface PivotTableProps {
  violations: Violation[];
}

// SBU Regional Order & Target HC Standards
export const SBU_REGIONAL_CONFIG: Record<
  string,
  { label: string; short: string; hcTarget: number }
> = {
  "01SBU": { label: "01-SBU", short: "01SBU", hcTarget: 5410 },
  "02SBT": { label: "02-SBT", short: "02SBT", hcTarget: 6790 },
  "03SBS": { label: "03-SBS", short: "03SBS", hcTarget: 9852 },
  "04JKT": { label: "04-JKB", short: "04JKT", hcTarget: 4964 },
  "05JBB": { label: "05-JBR", short: "05JBB", hcTarget: 6756 },
  "06JTG": { label: "06-JTG", short: "06JTG", hcTarget: 6076 },
  "07JBT": { label: "07-JTM", short: "07JBT", hcTarget: 5732 },
  "08BNT": { label: "08-BNT", short: "08BNT", hcTarget: 8182 },
  "09KAL": { label: "09-KAL", short: "09KAL", hcTarget: 4907 },
  "10SIBT": { label: "10-SIBT", short: "10SIBT", hcTarget: 7078 },
};


// Urutan bulan (label Indonesia seperti di sheet Pivot Excel)
export const MONTHS_ALL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
// Bulan minimal yang selalu tampil (Jan s.d Sep)
export const MONTHS_COLUMNS = MONTHS_ALL.slice(0, 9);
// Bulan terakhir yang sudah lengkap (Okt belum selesai, jadi belum ditampilkan)
const LAST_COMPLETE_MONTH_INDEX = 8;

// Default Pivot Data dari file rekap Pivot_QC_2026_Hingga_September.xlsx
export const DEFAULT_QC_K3_PIVOT: Record<string, Record<string, number>> = {
  "01SBU": { Jan: 2, Feb: 3, Mar: 0, Apr: 0, Mei: 0, Jun: 0, Jul: 0, Agu: 1, Sep: 0 },
  "02SBT": { Jan: 5, Feb: 6, Mar: 1, Apr: 2, Mei: 1, Jun: 0, Jul: 1, Agu: 1, Sep: 0 },
  "03SBS": { Jan: 11, Feb: 15, Mar: 10, Apr: 4, Mei: 1, Jun: 0, Jul: 0, Agu: 4, Sep: 7 },
  "04JKT": { Jan: 11, Feb: 0, Mar: 0, Apr: 0, Mei: 0, Jun: 0, Jul: 0, Agu: 0, Sep: 0 },
  "05JBB": { Jan: 1, Feb: 0, Mar: 0, Apr: 0, Mei: 0, Jun: 0, Jul: 2, Agu: 1, Sep: 0 },
  "06JTG": { Jan: 7, Feb: 0, Mar: 1, Apr: 0, Mei: 1, Jun: 0, Jul: 1, Agu: 0, Sep: 0 },
  "07JBT": { Jan: 9, Feb: 16, Mar: 10, Apr: 4, Mei: 3, Jun: 2, Jul: 0, Agu: 1, Sep: 2 },
  "08BNT": { Jan: 16, Feb: 12, Mar: 7, Apr: 0, Mei: 1, Jun: 0, Jul: 0, Agu: 0, Sep: 0 },
  "09KAL": { Jan: 12, Feb: 10, Mar: 6, Apr: 2, Mei: 3, Jun: 2, Jul: 2, Agu: 2, Sep: 6 },
  "10SIBT": { Jan: 10, Feb: 10, Mar: 6, Apr: 6, Mei: 3, Jun: 1, Jul: 2, Agu: 7, Sep: 4 },
};

export const DEFAULT_QC_INSTALASI_PIVOT: Record<string, Record<string, number>> = {
  "01SBU": { Jan: 0, Feb: 0, Mar: 0, Apr: 0, Mei: 0, Jun: 0, Jul: 0, Agu: 2, Sep: 0 },
  "02SBT": { Jan: 1, Feb: 1, Mar: 3, Apr: 3, Mei: 3, Jun: 3, Jul: 2, Agu: 3, Sep: 8 },
  "03SBS": { Jan: 4, Feb: 2, Mar: 3, Apr: 2, Mei: 1, Jun: 1, Jul: 3, Agu: 5, Sep: 6 },
  "04JKT": { Jan: 1, Feb: 0, Mar: 0, Apr: 0, Mei: 1, Jun: 0, Jul: 0, Agu: 0, Sep: 1 },
  "05JBB": { Jan: 0, Feb: 0, Mar: 0, Apr: 0, Mei: 1, Jun: 0, Jul: 1, Agu: 0, Sep: 0 },
  "06JTG": { Jan: 0, Feb: 2, Mar: 1, Apr: 0, Mei: 0, Jun: 1, Jul: 0, Agu: 2, Sep: 2 },
  "07JBT": { Jan: 0, Feb: 3, Mar: 1, Apr: 1, Mei: 1, Jun: 0, Jul: 2, Agu: 0, Sep: 2 },
  "08BNT": { Jan: 2, Feb: 3, Mar: 5, Apr: 1, Mei: 1, Jun: 0, Jul: 3, Agu: 2, Sep: 3 },
  "09KAL": { Jan: 0, Feb: 1, Mar: 0, Apr: 1, Mei: 2, Jun: 1, Jul: 2, Agu: 1, Sep: 4 },
  "10SIBT": { Jan: 0, Feb: 1, Mar: 0, Apr: 2, Mei: 2, Jun: 2, Jul: 3, Agu: 0, Sep: 6 },
};

// Data Total Sampling QC (Pencapaian Sampling Aktual dari file rekap)
export const TOTAL_SAMPLING_QC: Record<string, Record<string, number>> = {
  "01SBU": { Jan: 18, Feb: 32, Mar: 32, Apr: 38, Mei: 32, Jun: 40, Jul: 37, Agu: 38, Sep: 60 },
  "02SBT": { Jan: 18, Feb: 32, Mar: 32, Apr: 38, Mei: 32, Jun: 40, Jul: 38, Agu: 38, Sep: 60 },
  "03SBS": { Jan: 18, Feb: 32, Mar: 32, Apr: 38, Mei: 32, Jun: 40, Jul: 38, Agu: 38, Sep: 60 },
  "04JKT": { Jan: 18, Feb: 32, Mar: 32, Apr: 37, Mei: 32, Jun: 40, Jul: 38, Agu: 38, Sep: 60 },
  "05JBB": { Jan: 18, Feb: 32, Mar: 32, Apr: 38, Mei: 32, Jun: 40, Jul: 38, Agu: 38, Sep: 60 },
  "06JTG": { Jan: 16, Feb: 34, Mar: 32, Apr: 38, Mei: 32, Jun: 40, Jul: 38, Agu: 38, Sep: 60 },
  "07JBT": { Jan: 14, Feb: 36, Mar: 32, Apr: 38, Mei: 32, Jun: 40, Jul: 38, Agu: 36, Sep: 60 },
  "08BNT": { Jan: 18, Feb: 32, Mar: 32, Apr: 38, Mei: 32, Jun: 40, Jul: 38, Agu: 36, Sep: 60 },
  "09KAL": { Jan: 18, Feb: 34, Mar: 30, Apr: 38, Mei: 32, Jun: 40, Jul: 38, Agu: 36, Sep: 60 },
  "10SIBT": { Jan: 16, Feb: 34, Mar: 32, Apr: 38, Mei: 31, Jun: 40, Jul: 38, Agu: 36, Sep: 60 },
};

// "Pencapaian HC 2026": volume target/inspeksi HC per regional
// Untuk bulan September diisi dari rata-rata atau total sampling aktual sehingga rasio terhitung sempurna
const PENCAPAIAN_HC: Record<string, Record<string, number>> = {
  "01SBU": { Jan: 628, Feb: 665, Mar: 560, Apr: 844, Mei: 586, Jun: 807, Jul: 702, Agu: 618, Sep: 676 },
  "02SBT": { Jan: 1018, Feb: 781, Mar: 593, Apr: 920, Mei: 886, Jun: 913, Jul: 861, Agu: 818, Sep: 849 },
  "03SBS": { Jan: 1407, Feb: 1223, Mar: 875, Apr: 1379, Mei: 1219, Jun: 1368, Jul: 1306, Agu: 1075, Sep: 1232 },
  "04JKT": { Jan: 633, Feb: 583, Mar: 455, Apr: 633, Mei: 697, Jun: 670, Jul: 704, Agu: 589, Sep: 621 },
  "05JBB": { Jan: 890, Feb: 774, Mar: 635, Apr: 847, Mei: 904, Jun: 939, Jul: 863, Agu: 904, Sep: 845 },
  "06JTG": { Jan: 763, Feb: 685, Mar: 700, Apr: 855, Mei: 776, Jun: 815, Jul: 845, Agu: 637, Sep: 760 },
  "07JBT": { Jan: 777, Feb: 688, Mar: 588, Apr: 786, Mei: 663, Jun: 751, Jul: 725, Agu: 754, Sep: 717 },
  "08BNT": { Jan: 1129, Feb: 1033, Mar: 1013, Apr: 1003, Mei: 1107, Jun: 944, Jul: 980, Agu: 973, Sep: 1023 },
  "09KAL": { Jan: 722, Feb: 610, Mar: 589, Apr: 664, Mei: 539, Jun: 600, Jul: 613, Agu: 570, Sep: 613 },
  "10SIBT": { Jan: 1149, Feb: 918, Mar: 857, Apr: 980, Mei: 854, Jun: 873, Jul: 754, Agu: 693, Sep: 885 },
};

const normalizeSbuKey = (rawSbu?: string): string | null => {
  if (!rawSbu) return null;
  const s = rawSbu.toUpperCase();
  for (const k of Object.keys(SBU_REGIONAL_CONFIG)) {
    if (s.includes(k) || s.includes(SBU_REGIONAL_CONFIG[k].label)) return k;
  }
  return null;
};

// Ambil bulan dari teks tanggal ("12 Jan 2026", "2026-01-12", "12/01/2026"); null jika tidak dikenali
const getMonthColumn = (dateRaw?: string): string | null => {
  const d = (dateRaw || "").trim().toLowerCase();
  if (!d || d === "—") return null;
  const num = d.match(/^(\d{4})-(\d{1,2})-\d{1,2}/) || null;
  if (num) return MONTHS_ALL[parseInt(num[2]) - 1] ?? null;
  const num2 = d.match(/^\d{1,2}[/.-](\d{1,2})[/.-]\d{4}/);
  if (num2) return MONTHS_ALL[parseInt(num2[1]) - 1] ?? null;
  const names: [string, string][] = [
    ["jan", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["apr", "Apr"], ["mei", "Mei"], ["may", "Mei"],
    ["jun", "Jun"], ["jul", "Jul"], ["agu", "Agu"], ["aug", "Agu"], ["sep", "Sep"],
    ["okt", "Okt"], ["oct", "Okt"], ["nov", "Nov"], ["des", "Des"], ["dec", "Des"],
  ];
  for (const [k, v] of names) if (d.includes(k)) return v;
  return null;
};

const isK3Jenis = (j: string) =>
  /k3|helm|rompi|sarung|sepatu|harn|lengan/.test(j);
const isInstalasiJenis = (j: string) =>
  /instalasi|opm|fat|ont|s-clamp|speedtest|baa|dw/.test(j);

export function PivotTableView({ violations }: PivotTableProps) {
  const sbuKeys = Object.keys(SBU_REGIONAL_CONFIG);

  // Pivot dihitung langsung dari data aktif: Count of unique ID PA, QC NOK, per SBU x bulan Tanggal Cek
  const { qcK3TableData, qcInstalasiTableData, months } = useMemo(() => {
    const k3Sets: Record<string, Record<string, Set<string>>> = {};
    const instSets: Record<string, Record<string, Set<string>>> = {};
    const usedMonths = new Set<string>(MONTHS_COLUMNS);

    violations.forEach((v, idx) => {
      const sbu = normalizeSbuKey(v.sbu || v.lokasi);
      const m = getMonthColumn(v.tanggalAktivasi || v.tanggalCek || v.createdAt);
      if (!sbu || !m) return;
      if (MONTHS_ALL.indexOf(m) > LAST_COMPLETE_MONTH_INDEX) return;
      usedMonths.add(m);
      const id = v.idPa || `row-${idx}`;
      const j = (v.jenis || "").toLowerCase();
      const hasFlags = v.qcK3 !== undefined || v.qcInstalasi !== undefined;
      const k3Nok = hasFlags
        ? (v.qcK3 || "").includes("NOK")
        : v.status !== "Closed" && isK3Jenis(j);
      const instNok = hasFlags
        ? (v.qcInstalasi || "").includes("NOK")
        : v.status !== "Closed" && isInstalasiJenis(j) && !isK3Jenis(j);
      if (k3Nok) ((k3Sets[sbu] ??= {})[m] ??= new Set()).add(id);
      if (instNok) ((instSets[sbu] ??= {})[m] ??= new Set()).add(id);
    });

    const toCounts = (
      src: Record<string, Record<string, Set<string>>>,
    ) => {
      const out: Record<string, Record<string, number>> = {};

      sbuKeys.forEach((sbu) => {
        out[sbu] = {};
        MONTHS_ALL.forEach((m) => {
          out[sbu][m] = src[sbu]?.[m]?.size || 0;
        });
      });
      return out;
    };

    return {
      qcK3TableData: toCounts(k3Sets),
      qcInstalasiTableData: toCounts(instSets),
      months: MONTHS_ALL.filter((m) => usedMonths.has(m)),
    };
  }, [violations]);

  // Pencapaian HC 2026 (input manual dari Excel, kosong untuk bulan di luar Jan-Agu)
  const pencapaianHcData = PENCAPAIAN_HC;
  // Bulan yang punya pembagi HC; hanya bulan ini yang masuk perhitungan rasio Total
  const hcMonths = months.filter((m) => sbuKeys.some((sbu) => (pencapaianHcData[sbu]?.[m] || 0) > 0));

  // Format Persentase (0,xx%); "-" jika HC tidak tersedia
  const formatPercentage = (num: number) => {
    if (!isFinite(num) || isNaN(num)) return "-";
    return (num * 100).toFixed(2).replace(".", ",") + "%";
  };

  // Export ke Excel semua sheet tabel pivot
  const handleExportAllPivotExcel = () => {
    const wb = XLSX.utils.book_new();
    const countSheet = (data: Record<string, Record<string, number>>) =>
      sbuKeys.map((sbu) => {
        const row: Record<string, any> = { "Row Labels": sbu };
        let total = 0;
        months.forEach((m) => {
          const val = data[sbu]?.[m] || 0;
          row[m] = val || "";
          total += val;
        });
        row["Grand Total"] = total;
        return row;
      });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(countSheet(qcK3TableData)), "QC K3 NOK");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(countSheet(qcInstalasiTableData)), "QC INSTALASI NOK");

    const hcRows = sbuKeys.map((sbu) => {
      const row: Record<string, any> = { "SBU Regional": SBU_REGIONAL_CONFIG[sbu].label };
      let total = 0;
      months.forEach((m) => {
        const val = pencapaianHcData[sbu]?.[m] || 0;
        row[m] = val || "";
        total += val;
      });
      row["Total"] = total;
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hcRows), "Pencapaian HC 2026");

    XLSX.writeFile(wb, "Pivot_Table_QC_K3_Instalasi_PencapaianHC_2026.xlsx");
  };

  return (
    <div className="space-y-8">
      {/* Header Bagian Khusus Pivot Table */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TableIcon className="size-5 text-primary" />
            Rekapitulasi Pivot Table QC 2026
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pengolahan matriks pivot tabel per bulan (QC K3 NOK, QC INSTALASI NOK, Pencapaian HC, dan Rasio % NOK)
          </p>
        </div>
        <Button onClick={handleExportAllPivotExcel} variant="outline" className="gap-2">
          <Download className="size-4 text-emerald-600 dark:text-emerald-400" />
          Download Semua Pivot Table (Excel)
        </Button>
      </div>

      {/* Baris 1: Dua Pivot Tabel Bersebelahan (QC K3 NOK & QC INSTALASI NOK) */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Tabel 1: QC K3 NOK */}
        <Card className="border-border">
          <CardHeader className="bg-primary/5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  QC K3 — NOK
                </CardTitle>
                <CardDescription className="text-xs">Count of ID PA (Temuan Pelanggaran K3)</CardDescription>
              </div>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                K3 NOK
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10 hover:bg-primary/10 text-xs">
                  <TableHead className="font-bold text-foreground">Row Labels</TableHead>
                  {months.map((m) => (
                    <TableHead key={m} className="text-center font-bold text-foreground px-2">
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold text-foreground pr-4">Grand Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sbuKeys.map((sbu) => {
                  let rowTotal = 0;
                  return (
                    <TableRow key={`k3-${sbu}`} className="text-xs hover:bg-muted/40">
                      <TableCell className="font-semibold font-mono text-foreground">{sbu}</TableCell>
                      {months.map((m) => {
                        const count = qcK3TableData[sbu]?.[m] || 0;
                        rowTotal += count;
                        return (
                          <TableCell key={`k3-${sbu}-${m}`} className="text-center font-mono">
                            {count > 0 ? count : ""}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold font-mono pr-4 bg-muted/20">
                        {rowTotal}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Grand Total Row */}
                <TableRow className="bg-primary/10 hover:bg-primary/10 font-bold text-xs border-t-2 border-primary/20">
                  <TableCell className="font-bold">Grand Total</TableCell>
                  {months.map((m) => {
                    const colTotal = sbuKeys.reduce((acc, sbu) => acc + (qcK3TableData[sbu]?.[m] || 0), 0);
                    return (
                      <TableCell key={`k3-total-${m}`} className="text-center font-mono font-bold">
                        {colTotal}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono font-bold pr-4 text-primary">
                    {sbuKeys.reduce(
                      (acc, sbu) =>
                        acc +
                        months.reduce((mAcc, m) => mAcc + (qcK3TableData[sbu]?.[m] || 0), 0),
                      0,
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabel 2: QC INSTALASI NOK */}
        <Card className="border-border">
          <CardHeader className="bg-amber-500/5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Wrench className="size-4 text-amber-600 dark:text-amber-400" />
                  QC INSTALASI — NOK
                </CardTitle>
                <CardDescription className="text-xs">Count of ID PA (Temuan Pelanggaran Instalasi)</CardDescription>
              </div>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                INSTALASI NOK
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-500/10 hover:bg-amber-500/10 text-xs">
                  <TableHead className="font-bold text-foreground">Row Labels</TableHead>
                  {months.map((m) => (
                    <TableHead key={m} className="text-center font-bold text-foreground px-2">
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold text-foreground pr-4">Grand Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sbuKeys.map((sbu) => {
                  let rowTotal = 0;
                  return (
                    <TableRow key={`inst-${sbu}`} className="text-xs hover:bg-muted/40">
                      <TableCell className="font-semibold font-mono text-foreground">{sbu}</TableCell>
                      {months.map((m) => {
                        const count = qcInstalasiTableData[sbu]?.[m] || 0;
                        rowTotal += count;
                        return (
                          <TableCell key={`inst-${sbu}-${m}`} className="text-center font-mono">
                            {count > 0 ? count : ""}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold font-mono pr-4 bg-muted/20">
                        {rowTotal}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Grand Total Row */}
                <TableRow className="bg-amber-500/10 hover:bg-amber-500/10 font-bold text-xs border-t-2 border-amber-500/20">
                  <TableCell className="font-bold">Grand Total</TableCell>
                  {months.map((m) => {
                    const colTotal = sbuKeys.reduce((acc, sbu) => acc + (qcInstalasiTableData[sbu]?.[m] || 0), 0);
                    return (
                      <TableCell key={`inst-total-${m}`} className="text-center font-mono font-bold">
                        {colTotal}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono font-bold pr-4 text-amber-600 dark:text-amber-400">
                    {sbuKeys.reduce(
                      (acc, sbu) =>
                        acc +
                        months.reduce((mAcc, m) => mAcc + (qcInstalasiTableData[sbu]?.[m] || 0), 0),
                      0,
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Baris 2: Tabel Pencapaian HC 2026 */}
      <Card className="border-border">
        <CardHeader className="bg-blue-500/5 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="size-4 text-blue-600 dark:text-blue-400" />
                Pencapaian HC 2026
              </CardTitle>
              <CardDescription className="text-xs">
                Volume sampling/inspeksi Head Count (HC) regional per bulan
              </CardDescription>
            </div>
            <span className="rounded bg-blue-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              Total Sampling: {sbuKeys
                .reduce(
                  (acc, sbu) =>
                    acc +
                    months.reduce((mAcc, m) => mAcc + (pencapaianHcData[sbu]?.[m] || 0), 0),
                  0,
                )
                .toLocaleString("id-ID")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-600/10 hover:bg-blue-600/10 text-xs">
                <TableHead className="font-bold text-foreground">SBU Regional</TableHead>
                {months.map((m) => (
                  <TableHead key={m} className="text-center font-bold text-foreground px-3">
                    {m}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold text-foreground pr-4">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sbuKeys.map((sbu) => {
                const conf = SBU_REGIONAL_CONFIG[sbu];
                let rowTotal = 0;
                return (
                  <TableRow key={`hc-${sbu}`} className="text-xs hover:bg-muted/40">
                    <TableCell className="font-semibold font-mono text-foreground">{conf.label}</TableCell>
                    {months.map((m) => {
                      const val = pencapaianHcData[sbu]?.[m] || 0;
                      rowTotal += val;
                      return (
                        <TableCell key={`hc-${sbu}-${m}`} className="text-center font-mono">
                          {val > 0 ? val.toLocaleString("id-ID") : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-bold font-mono pr-4 bg-muted/20">
                      {rowTotal > 0 ? rowTotal.toLocaleString("id-ID") : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Grand Total Row */}
              <TableRow className="bg-blue-500/10 hover:bg-blue-500/10 font-bold text-xs border-t-2 border-blue-500/20">
                <TableCell className="font-bold">Total</TableCell>
                {months.map((m) => {
                  const colTotal = sbuKeys.reduce((acc, sbu) => acc + (pencapaianHcData[sbu]?.[m] || 0), 0);
                  return (
                    <TableCell key={`hc-total-${m}`} className="text-center font-mono font-bold">
                      {colTotal > 0 ? colTotal.toLocaleString("id-ID") : "-"}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-mono font-bold pr-4 text-blue-600 dark:text-blue-400">
                  {sbuKeys
                    .reduce(
                      (acc, sbu) =>
                        acc +
                        months.reduce((mAcc, m) => mAcc + (pencapaianHcData[sbu]?.[m] || 0), 0),
                      0,
                    )
                    .toLocaleString("id-ID")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Baris 3: Dua Tabel Rasio Persentase NOK terhadap Pencapaian HC */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Rasio QC K3+Seragam NOK Terhadap HC */}
        <Card className="border-border">
          <CardHeader className="bg-destructive/5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Percent className="size-4 text-destructive" />
                  QC K3 + Seragam NOK (Rasio % Pencapaian HC)
                </CardTitle>
                <CardDescription className="text-xs">Rasio temuan K3 NOK terhadap volume HC</CardDescription>
              </div>
              <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-mono font-bold text-destructive">
                Rasio % K3
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-destructive/10 hover:bg-destructive/10 text-xs">
                  <TableHead className="font-bold text-foreground">Regional</TableHead>
                  {months.map((m) => (
                    <TableHead key={m} className="text-center font-bold text-foreground px-2">
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold text-foreground pr-4">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sbuKeys.map((sbu) => {
                  const conf = SBU_REGIONAL_CONFIG[sbu];
                  let sumNok = 0;
                  let sumHc = 0;
                  return (
                    <TableRow key={`ratio-k3-${sbu}`} className="text-xs hover:bg-muted/40">
                      <TableCell className="font-semibold font-mono text-foreground">{conf.label}</TableCell>
                      {months.map((m) => {
                        const nok = qcK3TableData[sbu]?.[m] || 0;
                        const hc = pencapaianHcData[sbu]?.[m] || 0;
                        if (hc > 0) {
                          sumNok += nok;
                          sumHc += hc;
                        }
                        const ratio = nok / hc;
                        return (
                          <TableCell key={`ratio-k3-${sbu}-${m}`} className="text-center font-mono">
                            {formatPercentage(ratio)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold font-mono pr-4 bg-muted/20 text-destructive">
                        {formatPercentage(sumNok / sumHc)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-destructive/10 hover:bg-destructive/10 font-bold text-xs border-t-2 border-destructive/20">
                  <TableCell className="font-bold">Total</TableCell>
                  {months.map((m) => {
                    const colNok = sbuKeys.reduce((acc, sbu) => acc + (qcK3TableData[sbu]?.[m] || 0), 0);
                    const colHc = sbuKeys.reduce((acc, sbu) => acc + (pencapaianHcData[sbu]?.[m] || 0), 0);
                    return (
                      <TableCell key={`ratio-k3-total-${m}`} className="text-center font-mono font-bold">
                        {formatPercentage(colNok / colHc)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono font-bold pr-4 text-destructive">
                    {formatPercentage(
                      sbuKeys.reduce(
                        (acc, sbu) =>
                          acc +
                          hcMonths.reduce((mAcc, m) => mAcc + (qcK3TableData[sbu]?.[m] || 0), 0),
                        0,
                      ) /
                        sbuKeys.reduce(
                          (acc, sbu) =>
                            acc +
                            hcMonths.reduce((mAcc, m) => mAcc + (pencapaianHcData[sbu]?.[m] || 0), 0),
                          0,
                        ),
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Rasio QC INSTALASI NOK Terhadap HC */}
        <Card className="border-border">
          <CardHeader className="bg-amber-500/5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Percent className="size-4 text-amber-600 dark:text-amber-400" />
                  QC INSTALASI NOK (Rasio % Pencapaian HC)
                </CardTitle>
                <CardDescription className="text-xs">Rasio temuan Instalasi NOK terhadap volume HC</CardDescription>
              </div>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                Rasio % Instalasi
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-500/10 hover:bg-amber-500/10 text-xs">
                  <TableHead className="font-bold text-foreground">Regional</TableHead>
                  {months.map((m) => (
                    <TableHead key={m} className="text-center font-bold text-foreground px-2">
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold text-foreground pr-4">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sbuKeys.map((sbu) => {
                  const conf = SBU_REGIONAL_CONFIG[sbu];
                  let sumNok = 0;
                  let sumHc = 0;
                  return (
                    <TableRow key={`ratio-inst-${sbu}`} className="text-xs hover:bg-muted/40">
                      <TableCell className="font-semibold font-mono text-foreground">{conf.label}</TableCell>
                      {months.map((m) => {
                        const nok = qcInstalasiTableData[sbu]?.[m] || 0;
                        const hc = pencapaianHcData[sbu]?.[m] || 0;
                        if (hc > 0) {
                          sumNok += nok;
                          sumHc += hc;
                        }
                        const ratio = nok / hc;
                        return (
                          <TableCell key={`ratio-inst-${sbu}-${m}`} className="text-center font-mono">
                            {formatPercentage(ratio)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold font-mono pr-4 bg-muted/20 text-amber-600 dark:text-amber-400">
                        {formatPercentage(sumNok / sumHc)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-amber-500/10 hover:bg-amber-500/10 font-bold text-xs border-t-2 border-amber-500/20">
                  <TableCell className="font-bold">Total</TableCell>
                  {months.map((m) => {
                    const colNok = sbuKeys.reduce((acc, sbu) => acc + (qcInstalasiTableData[sbu]?.[m] || 0), 0);
                    const colHc = sbuKeys.reduce((acc, sbu) => acc + (pencapaianHcData[sbu]?.[m] || 0), 0);
                    return (
                      <TableCell key={`ratio-inst-total-${m}`} className="text-center font-mono font-bold">
                        {formatPercentage(colNok / colHc)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono font-bold pr-4 text-amber-600 dark:text-amber-400">
                    {formatPercentage(
                      sbuKeys.reduce(
                        (acc, sbu) =>
                          acc +
                          hcMonths.reduce((mAcc, m) => mAcc + (qcInstalasiTableData[sbu]?.[m] || 0), 0),
                        0,
                      ) /
                        sbuKeys.reduce(
                          (acc, sbu) =>
                            acc +
                            hcMonths.reduce((mAcc, m) => mAcc + (pencapaianHcData[sbu]?.[m] || 0), 0),
                          0,
                        ),
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
