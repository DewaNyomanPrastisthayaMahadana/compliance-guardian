import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, ShieldCheck, UserPlus, UsersRound, Building2, User, Mail, Lock, Shield, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createManagedUser, requireRouteAccess } from "@/lib/auth-server";
import { roleOptions, type AppRole } from "@/lib/demo-access";
import { sbuOptions, sbuMitraMapping } from "@/lib/iconguard-data";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/buat-akun")({
  beforeLoad: () => requireRouteAccess("/buat-akun"),
  head: () => ({ meta: [{ title: "Buat Akun — IconGuard" }] }),
  component: BuatAkunPage,
});

function BuatAkunPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [appRole, setAppRole] = useState<AppRole>("mitra");
  const [sbu, setSbu] = useState<string>("");
  const [organization, setOrganization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string; role: string; sbu?: string } | null>(null);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setCreatedUser(null);

    const sbuObj = sbuOptions.find((s) => s.code === sbu);
    const finalOrg =
      appRole === "super-admin"
        ? "PT PLN Icon Plus"
        : appRole === "petugas-sbu"
        ? organization.trim() || (sbuObj ? `PLN Icon Plus SBU ${sbuObj.label}` : "PLN Icon Plus SBU")
        : organization.trim();

    if ((appRole === "mitra" || appRole === "petugas-mitra") && !finalOrg) {
      toast.error("Nama Mitra / Perusahaan wajib diisi untuk akun Mitra.");
      setSubmitting(false);
      return;
    }

    if (appRole !== "super-admin" && !sbu) {
      toast.error("Wilayah SBU wajib dipilih untuk akun ini.");
      setSubmitting(false);
      return;
    }

    try {
      await createManagedUser({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          appRole,
          sbu: sbu === "SEMUA" ? "" : sbu,
          organization: finalOrg,
        },
      });

      setCreatedUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: roleOptions.find((r) => r.value === appRole)?.label || appRole,
        sbu: sbuObj ? `${sbuObj.code} - ${sbuObj.label}` : undefined,
      });

      toast.success("Akun berhasil dibuat dan tersimpan ke database!");

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setSbu("");
      setOrganization("");
      setAppRole("mitra");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Gagal membuat akun.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="dashboard-enter space-y-6">
        <PageHeader
          title="Buat Akun Pengguna"
          description="Formulir pendaftaran akun resmi dan penentuan hak akses pengguna sistem IconGuard."
          action={
            <Button variant="outline" asChild className="gap-2">
              <Link to="/data-akun">
                <UsersRound className="size-4" />
                <span>Lihat Data Akun</span>
              </Link>
            </Button>
          }
        />

        {createdUser && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                <Check className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold">
                  Akun untuk {createdUser.name} ({createdUser.role}) berhasil dibuat!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Email: <strong>{createdUser.email}</strong> · Pengguna sekarang dapat masuk ke aplikasi.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreatedUser(null)}
                className="h-8 text-xs border-emerald-300 bg-white hover:bg-emerald-100 dark:border-emerald-700 dark:bg-slate-900"
              >
                Tutup Notifikasi
              </Button>
              <Button
                size="sm"
                onClick={() => void navigate({ to: "/data-akun" })}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Buka Data Akun
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulir Buat Akun */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlus className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Formulir Tambah Pengguna Baru</CardTitle>
                  <CardDescription className="text-xs">
                    Isi detail akun di bawah ini. Akun yang dibuat akan langsung tersimpan di database dan dapat digunakan untuk masuk.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleCreateUser(e)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Nama Lengkap */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="create-name" className="text-xs font-semibold flex items-center gap-1.5">
                      <User className="size-3.5 text-primary" />
                      Nama Lengkap Pengguna <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="create-name"
                      placeholder=""
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      minLength={2}
                      maxLength={100}
                      required
                      className="h-10 text-sm"
                    />
                  </div>

                  {/* Email Kerja */}
                  <div className="space-y-1.5">
                    <Label htmlFor="create-email" className="text-xs font-semibold flex items-center gap-1.5">
                      <Mail className="size-3.5 text-primary" />
                      Email Kerja <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="create-email"
                      type="email"
                      placeholder=""
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={254}
                      required
                      className="h-10 text-sm"
                    />
                  </div>

                  {/* Kata Sandi dengan Tombol Lihat Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="create-password" className="text-xs font-semibold flex items-center gap-1.5">
                      <Lock className="size-3.5 text-primary" />
                      Kata Sandi Awal <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="create-password"
                        type={showPassword ? "text" : "password"}
                        placeholder=""
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        maxLength={128}
                        required
                        className="h-10 text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                        title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Role Aplikasi */}
                  <div className="space-y-1.5">
                    <Label htmlFor="create-role" className="text-xs font-semibold flex items-center gap-1.5">
                      <Shield className="size-3.5 text-primary" />
                      Role Aplikasi <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={appRole}
                      onValueChange={(val) => {
                        const nextRole = val as AppRole;
                        setAppRole(nextRole);
                        if (nextRole === "super-admin") {
                          setOrganization("PT PLN Icon Plus");
                          setSbu("SEMUA");
                        } else if (nextRole === "petugas-sbu") {
                          if (organization === "PT PLN Icon Plus") setOrganization("");
                          if (sbu && sbu !== "SEMUA") {
                            const opt = sbuOptions.find((s) => s.code === sbu);
                            setOrganization(opt ? `PLN Icon Plus SBU ${opt.label}` : "");
                          }
                        } else if (organization === "PT PLN Icon Plus") {
                          setOrganization("");
                        }
                      }}
                    >
                      <SelectTrigger id="create-role" className="h-10 text-sm">
                        <SelectValue placeholder="Pilih Role Akun" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value} className="text-sm">
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wilayah SBU */}
                  <div className="space-y-1.5">
                    <Label htmlFor="create-sbu" className="text-xs font-semibold flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary" />
                      Wilayah SBU {appRole !== "super-admin" && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={sbu}
                      onValueChange={(val) => {
                        setSbu(val);
                        if (appRole === "petugas-sbu") {
                          const opt = sbuOptions.find((s) => s.code === val);
                          setOrganization(opt ? `PLN Icon Plus SBU ${opt.label}` : "");
                        }
                      }}
                    >
                      <SelectTrigger id="create-sbu" className="h-10 text-sm">
                        <SelectValue placeholder="Pilih Wilayah SBU" />
                      </SelectTrigger>
                      <SelectContent>
                        {appRole === "super-admin" && (
                          <SelectItem value="SEMUA" className="text-sm">
                            Semua SBU (Nasional / Kantor Pusat)
                          </SelectItem>
                        )}
                        {sbuOptions.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code} className="text-sm">
                            {opt.code} — {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nama Perusahaan / Mitra / Unit SBU */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="create-org" className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-primary" />
                      {appRole === "petugas-sbu"
                        ? "Unit / Kantor SBU"
                        : appRole === "super-admin"
                        ? "Organisasi / Divisi"
                        : "Organisasi / Nama Mitra"}{" "}
                      {(appRole === "mitra" || appRole === "petugas-mitra") && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <Input
                      id="create-org"
                      value={appRole === "super-admin" ? "PT PLN Icon Plus" : organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      readOnly={appRole === "super-admin"}
                      placeholder=""
                      required={appRole === "mitra" || appRole === "petugas-mitra"}
                      maxLength={160}
                      className={`h-10 text-sm ${appRole === "super-admin" ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
                    />

                    {/* Saran Mitra berdasarkan SBU yang dipilih */}
                    {(appRole === "mitra" || appRole === "petugas-mitra") && sbu && sbuMitraMapping[sbu] && (
                      <div className="pt-1.5">
                        <p className="text-[11px] text-muted-foreground mb-1">
                          Mitra terdaftar di SBU ini (klik untuk memilih):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sbuMitraMapping[sbu].map((partner) => (
                            <button
                              key={partner.nama}
                              type="button"
                              onClick={() => setOrganization(partner.nama)}
                              className={`text-[11px] rounded-lg px-2.5 py-1 border transition-colors ${
                                organization === partner.nama
                                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                                  : "bg-muted/50 hover:bg-muted text-foreground border-border"
                              }`}
                            >
                              {partner.nama}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Semua data akun tersimpan secara aman di database IconGuard.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setName("");
                        setEmail("");
                        setPassword("");
                        setSbu("");
                        setOrganization("");
                        setAppRole("mitra");
                      }}
                      className="text-xs"
                    >
                      Reset Form
                    </Button>
                    <Button type="submit" disabled={submitting} className="gap-2 min-w-[130px]">
                      <UserPlus className="size-4" />
                      <span>{submitting ? "Menyimpan..." : "Buat Akun"}</span>
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Panduan Hak Akses Role */}
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4.5 text-primary" />
                  <CardTitle className="text-sm font-bold">Panduan Role Pengguna</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Hak akses setiap role akun di dalam aplikasi IconGuard:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">Super Admin</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary font-mono">SA</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Akses penuh untuk Divisi Material &amp; Jasa Kantor Pusat: Dashboard nasional, upload Excel, input QC pelanggaran, audit trail, kelola akun, dan konfigurasi master data.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-600 dark:text-sky-400">Petugas SBU</span>
                    <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 font-mono">QC</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Akses operasional regional: Dashboard utama, Data Pelanggaran, Score Card Mitra, dan memverifikasi klarifikasi tiket yang berada di wilayah SBU-nya.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Mitra</span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">MT</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Manajemen perusahaan mitra: Dashboard utama, Data Pelanggaran, Score Card evaluasi mitra, serta Portal Klarifikasi khusus tiket perusahaan dan SBU mereka.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Petugas Mitra</span>
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 font-mono">PM</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Teknisi/petugas lapangan mitra: Dashboard utama, Data Pelanggaran, Score Card, dan Portal Klarifikasi untuk mengunggah Berita Acara Klarifikasi &amp; bukti before-after.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

