import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { bootstrapSuperAdmin, getAuthStatus, getCurrentAuthUser } from "@/lib/auth-server";
import { roleDetails } from "@/lib/demo-access";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await getCurrentAuthUser();
    if (user) throw redirect({ to: roleDetails[user.appRole].landingPath, replace: true });
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
  } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getAuthStatus()
      .then(setSetupStatus)
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

      const result = await authClient.signIn.email({ email, password, rememberMe: true });
      if (result.error) throw new Error(result.error.message);

      const user = await getCurrentAuthUser();
      if (!user) {
        await authClient.signOut();
        throw new Error("Role akun ini sudah tidak aktif. Hubungi Super Admin untuk membuat akun baru.");
      }

      void navigate({ to: roleDetails[user.appRole].landingPath, replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login gagal. Periksa koneksi database.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="flex min-h-[240px] flex-col justify-between bg-[#C2E2FC] px-6 py-7 text-slate-900 sm:px-10 lg:min-h-screen lg:px-16 lg:py-12">
        <div className="flex w-full items-center justify-between gap-4">
          <a href="/login" aria-label="IconGuard, halaman masuk" className="w-fit">
            <img
              src="/logoIconPlus.png"
              alt="PLN Icon Plus"
              className="h-auto w-32 object-contain sm:w-40"
            />
          </a>
          <img
            src="/logo_danantara.png"
            alt="Danantara Indonesia"
            className="h-auto w-28 object-contain sm:w-36"
          />
        </div>

        <div className="py-8 lg:py-0">
          <div className="mb-5 h-1 w-12 rounded-full bg-[#38b6ad]" />
          <h1 className="text-3xl font-bold sm:text-4xl">IconGuard</h1>
          <p className="mt-3 text-sm text-slate-700">Divisi Material dan Jasa</p>
        </div>

        <p className="text-xs text-slate-700">PT PLN Icon Plus</p>
      </section>

      <main className="flex min-h-[560px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-sm font-semibold text-primary">IconGuard</p>
            <h2 className="mt-2 text-3xl font-bold">Masuk</h2>
            <p className="mt-2 text-sm text-muted-foreground">Gunakan akun kerja Anda.</p>
          </div>

          {!setupStatus ? (
            <p className="text-sm text-muted-foreground" aria-busy="true">
              Memeriksa database...
            </p>
          ) : (
            <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              {needsBootstrap && (
                <div className="space-y-2">
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
                    className="h-12 bg-card"
                  />
                </div>
              )}
              <div className="space-y-2">
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
                  className="h-12 bg-card"
                />
              </div>
              {needsBootstrap && (
                <div className="space-y-2">
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
                    className="h-12 bg-card"
                  />
                  {!setupStatus.bootstrapEnabled && (
                    <p role="alert" className="text-xs text-destructive">
                      SUPER_ADMIN_SETUP_TOKEN belum dikonfigurasi di Vercel.
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Kata sandi
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={needsBootstrap ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                  className="h-12 bg-card"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full"
                disabled={submitting || (needsBootstrap && !setupStatus.bootstrapEnabled)}
              >
                <LogIn />
                {submitting ? "Memproses..." : needsBootstrap ? "Buat Super Admin" : "Masuk"}
              </Button>
              {message && (
                <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
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
