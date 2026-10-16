import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LogIn, Eye, EyeOff, AlertCircle, X, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  bootstrapSuperAdmin,
  getAuthStatus,
  getCurrentAuthUser,
  loginWithGoogleVerified,
} from "@/lib/auth-server";
import { roleDetails } from "@/lib/demo-access";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const isFreshSessionStarted = window.sessionStorage.getItem("iconguard_session_started");
    const savedBootId = window.sessionStorage.getItem("iconguard_boot_id");
    if (!isFreshSessionStarted || !savedBootId) {
      await authClient.signOut().catch(() => undefined);
      return;
    }
    const user = await getCurrentAuthUser();
    if (!user || user.bootId !== savedBootId) {
      window.sessionStorage.removeItem("iconguard_session_started");
      window.sessionStorage.removeItem("iconguard_boot_id");
      await authClient.signOut().catch(() => undefined);
      return;
    }
    throw redirect({ to: roleDetails[user.appRole].landingPath, replace: true });
  },
  head: () => ({
    meta: [
      { title: "Masuk — IconGuard" },
      { name: "description", content: "Masuk ke IconGuard PT PLN Icon Plus." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [setupStatus, setSetupStatus] = useState<{
    needsBootstrap: boolean;
    bootstrapEnabled: boolean;
    bootId?: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [setupToken, setSetupToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // State untuk Fitur Masuk dengan Google
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleMessage, setGoogleMessage] = useState("");
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    void getAuthStatus()
      .then((status) => {
        setSetupStatus(status);
        if (typeof window !== "undefined") {
          const isStarted = window.sessionStorage.getItem("iconguard_session_started");
          const savedBoot = window.sessionStorage.getItem("iconguard_boot_id");
          if (!isStarted || savedBoot !== status.bootId) {
            window.sessionStorage.removeItem("iconguard_session_started");
            window.sessionStorage.removeItem("iconguard_boot_id");
            void authClient.signOut().catch(() => undefined);
          }
        }
      })
      .catch((error: unknown) => {
        setSetupStatus({ needsBootstrap: false, bootstrapEnabled: false });
        setMessage(error instanceof Error ? error.message : "Status database gagal dimuat.");
      });
  }, []);

  const needsBootstrap = Boolean(setupStatus?.needsBootstrap);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      if (needsBootstrap) {
        await bootstrapSuperAdmin({ data: { name, email, password, setupToken } });
      }

      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: false,
      });

      if (result.error) {
        const errorMsg = result.error.message || "";
        if (
          errorMsg.toLowerCase().includes("invalid email or password") ||
          errorMsg.toLowerCase().includes("invalid_email_or_password")
        ) {
          throw new Error("Email atau kata sandi salah. Silakan periksa kembali.");
        }
        if (errorMsg.toLowerCase().includes("invalid origin")) {
          throw new Error("Akses origin tidak valid. Silakan muat ulang halaman.");
        }
        throw new Error(result.error.message || "Gagal masuk ke sistem.");
      }

      const user = await getCurrentAuthUser();
      if (!user) {
        await authClient.signOut();
        throw new Error("Role akun ini sudah tidak aktif. Hubungi Super Admin untuk membuat akun baru.");
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("iconguard_session_started", "true");
        window.sessionStorage.setItem("iconguard_boot_id", user.bootId);
      }

      void navigate({ to: roleDetails[user.appRole].landingPath, replace: true });
    } catch (error) {
      let msg = error instanceof Error ? error.message : "Login gagal.";
      if (msg.includes("ECONNREFUSED") || msg.includes("EPERM") || msg.includes("connect")) {
        msg = "Tidak dapat terhubung ke MySQL di XAMPP. Pastikan modul MySQL di XAMPP Control Panel sudah dalam status 'Running' (Port 3306).";
      }
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGoogleMessage("");
    setGoogleSubmitting(true);

    try {
      const cleanEmail = googleEmail.trim().toLowerCase();
      const result = await loginWithGoogleVerified({ data: { email: cleanEmail } });

      if (!result.success || !result.user) {
        throw new Error("Gagal memverifikasi akun Google.");
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("iconguard_session_started", "true");
        window.sessionStorage.setItem("iconguard_boot_id", result.user.bootId);
      }

      setShowGoogleModal(false);
      void navigate({ to: roleDetails[result.user.appRole].landingPath, replace: true });
    } catch (error) {
      setGoogleMessage(
        error instanceof Error
          ? error.message
          : "Akun Google belum didaftarkan oleh Super Admin. Silakan hubungi Super Admin untuk pendaftaran akun terlebih dahulu."
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen overflow-hidden bg-background lg:grid-cols-2">
      {/* Panel Kiri */}
      <section className="login-panel-left relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-[#C2E2FC] px-6 py-7 text-slate-900 sm:px-10 lg:min-h-screen lg:px-16 lg:py-12">
        {/* Elemen dekorasi animasi mengambang */}
        <div className="login-float pointer-events-none absolute -top-20 -left-20 size-72 rounded-full bg-white/35 blur-3xl" />
        <div
          className="login-float pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-[#38b6ad]/25 blur-3xl"
          style={{ animationDelay: "2s" }}
        />

        <div
          className="dashboard-enter relative z-10 flex w-full items-center justify-between gap-4"
          style={{ animationDelay: "120ms" }}
        >
          <a
            href="/login"
            aria-label="IconGuard, halaman masuk"
            className="w-fit transition-transform duration-300 hover:scale-105"
          >
            <img
              src="/logoIconPlus.png"
              alt="PLN Icon Plus"
              className="h-auto w-32 object-contain sm:w-40"
            />
          </a>
          <img
            src="/logo_danantara.png"
            alt="Danantara Indonesia"
            className="h-auto w-28 object-contain sm:w-36 transition-transform duration-300 hover:scale-105"
          />
        </div>

        <div className="relative z-10 py-8 lg:py-0">
          <div
            className="dashboard-enter mb-5 h-1.5 w-14 rounded-full bg-[#38b6ad]"
            style={{ animationDelay: "220ms" }}
          />
          <h1
            className="dashboard-enter text-3xl font-extrabold tracking-tight sm:text-5xl"
            style={{ animationDelay: "300ms" }}
          >
            IconGuard
          </h1>
          <p
            className="dashboard-enter mt-3 max-w-md text-sm font-medium text-slate-700 sm:text-base"
            style={{ animationDelay: "380ms" }}
          >
            Sistem Pemantauan Kepatuhan Mitra &amp; Evaluasi QC Divisi Material dan Jasa
          </p>
        </div>

        <p
          className="dashboard-enter relative z-10 text-xs font-medium text-slate-700"
          style={{ animationDelay: "520ms" }}
        >
          © 2026 PT PLN Icon Plus · All Rights Reserved
        </p>
      </section>

      {/* Panel Kanan */}
      <main className="login-panel-right flex min-h-[560px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen">
        <div className="w-full max-w-sm">
          <div className="dashboard-enter mb-8" style={{ animationDelay: "180ms" }}>
            <h2 className="text-3xl font-bold tracking-tight">Selamat Datang</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Silakan masuk menggunakan akun kerja Anda atau masuk dengan menggunakan akun Google
            </p>
          </div>

          {!setupStatus ? (
            <div
              className="dashboard-enter flex items-center gap-2.5 text-sm text-muted-foreground"
              aria-busy="true"
            >
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Memeriksa kesiapan sistem...
            </div>
          ) : (
            <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              {needsBootstrap && (
                <div className="dashboard-enter space-y-2" style={{ animationDelay: "240ms" }}>
                  <label htmlFor="name" className="text-sm font-medium">
                    Nama Super Admin
                  </label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={100}
                    required
                    className="h-12 bg-card transition-all duration-200 focus:scale-[1.01] focus:shadow-md"
                  />
                </div>
              )}

              <div className="dashboard-enter space-y-2" style={{ animationDelay: "280ms" }}>
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@perusahaan.co.id"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-12 bg-card transition-all duration-200 focus:scale-[1.01] focus:shadow-md"
                />
              </div>

              {needsBootstrap && (
                <div className="dashboard-enter space-y-2" style={{ animationDelay: "320ms" }}>
                  <label htmlFor="setupToken" className="text-sm font-medium">
                    Token setup Super Admin
                  </label>
                  <Input
                    id="setupToken"
                    name="setupToken"
                    type="password"
                    autoComplete="off"
                    value={setupToken}
                    onChange={(event) => setSetupToken(event.target.value)}
                    minLength={32}
                    maxLength={256}
                    required
                    disabled={!setupStatus.bootstrapEnabled}
                    className="h-12 bg-card transition-all duration-200 focus:scale-[1.01] focus:shadow-md"
                  />
                  {!setupStatus.bootstrapEnabled && (
                    <p role="alert" className="text-xs text-destructive">
                      SUPER_ADMIN_SETUP_TOKEN belum dikonfigurasi.
                    </p>
                  )}
                </div>
              )}

              <div className="dashboard-enter space-y-2" style={{ animationDelay: "360ms" }}>
                <label htmlFor="password" className="text-sm font-medium">
                  Kata sandi
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={needsBootstrap ? "new-password" : "current-password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={needsBootstrap ? 12 : undefined}
                    maxLength={128}
                    required
                    className="h-12 bg-card pr-11 transition-all duration-200 focus:scale-[1.01] focus:shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              <div className="dashboard-enter pt-1" style={{ animationDelay: "440ms" }}>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  disabled={submitting || (needsBootstrap && !setupStatus.bootstrapEnabled)}
                >
                  <LogIn className="mr-1.5 size-4" />
                  {submitting ? "Memproses..." : needsBootstrap ? "Buat Super Admin" : "Masuk ke Sistem"}
                </Button>
              </div>

              {message && (
                <div
                  role="status"
                  aria-live="polite"
                  className="dashboard-enter rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-start gap-2"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              {!needsBootstrap && (
                <div className="dashboard-enter space-y-4 pt-2" style={{ animationDelay: "480ms" }}>
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-border" />
                    <span className="bg-background px-3 text-xs uppercase font-medium text-muted-foreground">
                      atau
                    </span>
                    <div className="w-full border-t border-border" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setGoogleMessage("");
                      setShowGoogleModal(true);
                    }}
                    disabled={submitting}
                    className="h-12 w-full font-medium border-border/80 bg-card hover:bg-accent/40 transition-all duration-200 shadow-xs flex items-center justify-center gap-2.5"
                  >
                    <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Masuk dengan Google
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* Modal / Dialog Masuk dengan Akun Google */}
          {showGoogleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowGoogleModal(false);
                    setGoogleMessage("");
                  }}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Tutup"
                >
                  <X className="size-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 shadow-xs">
                    <svg className="size-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Masuk dengan Google</h3>
                    <p className="text-xs text-muted-foreground">
                      Akses sistem menggunakan akun Google terdaftar
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-3 mb-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                  <ShieldAlert className="size-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <span>
                    Pastikan akun Google Anda telah didaftarkan sebelumnya oleh Super Admin ke dalam sistem IconGuard.
                  </span>
                </div>

                <form onSubmit={(e) => void handleGoogleSubmit(e)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="google-email"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Alamat Email Google
                    </label>
                    <Input
                      id="google-email"
                      type="email"
                      placeholder="nama@gmail.com"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      required
                      autoFocus
                      className="h-11 bg-background"
                    />
                  </div>

                  {googleMessage && (
                    <div
                      role="alert"
                      className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-start gap-2 leading-relaxed"
                    >
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{googleMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowGoogleModal(false);
                        setGoogleMessage("");
                      }}
                      className="flex-1 h-11"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={googleSubmitting || !googleEmail.trim()}
                      className="flex-1 h-11 font-semibold"
                    >
                      {googleSubmitting ? "Memverifikasi..." : "Lanjutkan Masuk"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
