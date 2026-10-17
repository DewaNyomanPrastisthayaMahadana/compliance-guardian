import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, ShieldCheck, UserPlus, UsersRound, Building2, User, Mail, Lock, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createManagedUser, requireRouteAccess } from "@/lib/auth-server";
import { roleOptions, type AppRole } from "@/lib/demo-access";
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
  const [organization, setOrganization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string; role: string } | null>(null);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setCreatedUser(null);

    const finalOrg = appRole === "super-admin" ? "PT PLN Icon Plus" : organization.trim();

    if (appRole === "mitra" && !finalOrg) {
      toast.error("Nama Mitra / Perusahaan wajib diisi untuk role Mitra.");
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
          organization: finalOrg,
        },
      });

      setCreatedUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: roleOptions.find((r) => r.value === appRole)?.label || appRole,
      });

      toast.success("Akun berhasil dibuat dan tersimpan ke database!");

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
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
                      placeholder="Contoh: Budi Santoso / PT Tapanuli Raya"
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
                      placeholder="nama@plniconplus.co.id atau mitra@perusahaan.com"
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
                        placeholder="Minimal 8 karakter"
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

                  {/* Nama Perusahaan / Mitra */}
                  <div className="space-y-1.5">
                    <Label htmlFor="create-org" className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-primary" />
                      Organisasi / Nama Mitra {appRole === "mitra" && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="create-org"
                      value={appRole === "super-admin" ? "PT PLN Icon Plus" : organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      readOnly={appRole === "super-admin"}
                      placeholder={
                        appRole === "super-admin"
                          ? "PT PLN Icon Plus"
                          : "Contoh: PT Tapanuli Raya Broadband"
                      }
                      required={appRole === "mitra"}
                      maxLength={160}
                      className={`h-10 text-sm ${appRole === "super-admin" ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
                    />
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
                    Akses penuh untuk Divisi Material & Jasa: melihat Dashboard nasional, upload Excel, input QC pelanggaran, audit trail, kelola akun, dan konfigurasi master data.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Mitra</span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">MT</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Diberikan untuk manajemen perusahaan mitra. Dapat melihat scorecard evaluasi perusahaan mereka, statistik penalti, serta mengajukan klarifikasi temuan.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Petugas Mitra</span>
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 font-mono">PM</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Diberikan untuk teknisi/petugas lapangan mitra. Akses langsung ke Portal Klarifikasi untuk membalas dan melampirkan bukti perbaikan instalasi.
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
