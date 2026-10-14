import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LogIn, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { bootstrapSuperAdmin, getAuthStatus, getCurrentAuthUser } from "@/lib/auth-server";
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
  const [setupToken, setSetupToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

      const result = await authClient.signIn.email({ email, password, rememberMe: false });
      if (result.error) throw new Error(result.error.message);

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
      setMessage(error instanceof Error ? error.message : "Login gagal. Periksa koneksi database.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen overflow-hidden bg-background lg:grid-cols-2">
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
          <a href="/login" aria-label="IconGuard, halaman masuk" className="w-fit transition-transform duration-300 hover:scale-105">
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

          <div
            className="dashboard-enter mt-6 hidden flex-wrap gap-2.5 sm:flex"
            style={{ animationDelay: "460ms" }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur-sm shadow-xs">
              <ShieldCheck className="size-3.5 text-[#0e7490]" /> Monitoring Real-Time
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur-sm shadow-xs">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Evaluasi Scorecard Mitra
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur-sm shadow-xs">
              <Sparkles className="size-3.5 text-amber-600" /> Integrasi Data QC SBU
            </span>
          </div>
        </div>

        <p
          className="dashboard-enter relative z-10 text-xs font-medium text-slate-700"
          style={{ animationDelay: "520ms" }}
        >
          © 2026 PT PLN Icon Plus · All Rights Reserved
        </p>
      </section>

      <main className="login-panel-right flex min-h-[560px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen">
        <div className="w-full max-w-sm">
          <div className="dashboard-enter mb-8" style={{ animationDelay: "180ms" }}>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" /> Portal Akses Resmi
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Selamat Datang</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Silakan masuk menggunakan akun kerja Anda untuk memulai sesi baru.
            </p>
          </div>

          {!setupStatus ? (
            <div className="dashboard-enter flex items-center gap-2.5 text-sm text-muted-foreground" aria-busy="true">
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
                      SUPER_ADMIN_SETUP_TOKEN belum dikonfigurasi di Vercel.
                    </p>
                  )}
                </div>
              )}
              <div className="dashboard-enter space-y-2" style={{ animationDelay: "360ms" }}>
                <label htmlFor="password" className="text-sm font-medium">
                  Kata sandi
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={needsBootstrap ? "new-password" : "current-password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                  className="h-12 bg-card transition-all duration-200 focus:scale-[1.01] focus:shadow-md"
                />
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
                <p
                  role="status"
                  aria-live="polite"
                  className="dashboard-enter rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
                >
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
