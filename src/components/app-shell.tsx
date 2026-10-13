import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileWarning,
  Building2,
  MessageSquareShare,
  Menu,
  LogOut,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { getCurrentAuthUser } from "@/lib/auth-server";
import { canAccessPath, roleDetails, type AppRole } from "@/lib/demo-access";
import { severityTone, statusTone, violations, type Violation } from "@/lib/iconguard-data";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pelanggaran", label: "Pelanggaran", icon: FileWarning },
  { to: "/mitra", label: "Scorecard Mitra", icon: Building2 },
  { to: "/portal", label: "Portal Klarifikasi", icon: MessageSquareShare },
  { to: "/pengguna", label: "Buat Akun", icon: UsersRound },
] as const;

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  appRole: AppRole;
  organization: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [firstLoginWarnings, setFirstLoginWarnings] = useState<Violation[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void getCurrentAuthUser()
      .then((user) => {
        if (active) {
          setCurrentUser(user);
          setRoleReady(true);
          if (!user) void navigate({ to: "/login", replace: true });
          if (user && (user.appRole === "mitra" || user.appRole === "petugas-mitra")) {
            const organization = user.organization.trim().toLowerCase();
            const seenWarningIds = getSeenWarningIds(user.id);
            setFirstLoginWarnings(
              violations.filter(
                (violation) =>
                  violation.mitra.trim().toLowerCase() === organization &&
                  violation.status !== "Closed" &&
                  !seenWarningIds.has(violation.id),
              ),
            );
          }
        }
      })
      .catch(() => {
        if (active) {
          setCurrentUser(null);
          setRoleReady(true);
          void navigate({ to: "/login", replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const appRole = currentUser?.appRole;
  const visibleNav =
    roleReady && appRole ? nav.filter((item) => canAccessPath(appRole, item.to)) : [];
  const profile = appRole ? roleDetails[appRole] : null;
  const hasAccess = Boolean(appRole && canAccessPath(appRole, currentPath));

  const handleLogout = async () => {
    await authClient.signOut();
    setCurrentUser(null);
    void navigate({ to: "/login", replace: true });
  };

  const dismissFirstLoginWarnings = () => {
    if (currentUser && firstLoginWarnings.length > 0) {
      const key = `iconguard:seen-warnings:${currentUser.id}`;
      const seenWarningIds = getSeenWarningIds(currentUser.id);
      for (const warning of firstLoginWarnings) seenWarningIds.add(warning.id);
      window.localStorage.setItem(key, JSON.stringify([...seenWarningIds]));
    }
    setFirstLoginWarnings([]);
  };

  return (
    <div className="min-h-screen bg-[#EAF5FE]">
      <Dialog
        open={firstLoginWarnings.length > 0}
        onOpenChange={(isOpen) => {
          if (!isOpen) dismissFirstLoginWarnings();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Peringatan Instalasi</DialogTitle>
            <DialogDescription>
              Super Admin Material &amp; Jasa mengirim peringatan untuk perusahaan Anda. Mohon
              tindak lanjuti sesuai prosedur instalasi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {firstLoginWarnings.map((warning) => (
              <div key={warning.id} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{warning.id}</span>
                  <StatusPill tone={severityTone(warning.severity)}>{warning.severity}</StatusPill>
                  <StatusPill tone={statusTone(warning.status)}>{warning.status}</StatusPill>
                </div>
                <p className="text-sm font-semibold">{warning.jenis}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  ID PA ICRM: {warning.idPa}
                </p>
                <p className="text-sm text-muted-foreground">{warning.catatan}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={dismissFirstLoginWarnings}>Saya memahami</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <aside className="fixed inset-y-3 left-3 z-50 hidden w-60 flex-col overflow-hidden rounded-3xl border border-primary/10 bg-[#C2E2FC] shadow-sm lg:flex">
        {roleReady && currentUser && profile && (
          <div className="flex items-center gap-3 border-b border-primary/10 px-5 py-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {profile.initials}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{currentUser.name || profile.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {currentUser.organization || profile.organization}
              </p>
            </div>
          </div>
        )}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Menu Utama
          </p>
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-primary/80 transition-colors hover:bg-white/60 hover:text-primary"
              style={{ borderRadius: "24px" }}
              activeProps={{ className: "rounded-xl bg-white px-3 py-2 text-primary shadow-sm" }}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>
        {roleReady && currentUser && (
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mx-3 mb-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-primary/80 transition-colors hover:bg-white/60 hover:text-destructive"
          >
            <LogOut className="size-[18px]" />
            Keluar
          </button>
        )}
      </aside>

      <header className="mx-3 bg-transparent text-slate-900 lg:ml-[264px] lg:mr-3">
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          <img
            src="/logoIconPlus.png"
            alt="Logo PLN Icon Plus"
            className="hidden h-10 w-auto translate-y-1 object-contain lg:block"
          />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Buka menu"
            className="rounded-md p-2 transition-colors hover:bg-white/50 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="leading-tight lg:hidden">
            <p className="text-sm font-bold">IconGuard</p>
            <p className="text-[10px] opacity-75">Mitra &amp; Material Compliance System</p>
          </div>
          <img
            src="/logo_danantara.png"
            alt="Logo Danantara"
            className="ml-auto hidden h-8 w-auto object-contain lg:block"
          />
          {roleReady && currentUser && (
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Keluar"
              title="Keluar"
              className="ml-auto rounded-md p-2 transition-colors hover:bg-white/50 lg:hidden"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
        {open && (
        <nav className="grid gap-1 border-t border-primary/10 bg-card px-4 py-3 shadow-lg lg:hidden">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-[#EAF5FE] hover:text-primary"
                style={{ borderRadius: "24px" }}
                activeProps={{ className: "rounded-xl bg-[#C2E2FC] px-3 py-2 text-primary" }}
              >
                <item.icon className="size-[18px]" />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void handleLogout();
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-[18px]" />
              Keluar
            </button>
          </nav>
        )}
      </header>
      <main className="lg:ml-[264px]">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {!roleReady ? (
            <div className="min-h-[50vh]" aria-busy="true" />
          ) : currentUser && hasAccess ? (
            children
          ) : (
            <div className="mx-auto max-w-lg py-16 text-center">
              <h1 className="text-2xl font-bold">Akses dibatasi</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Akun Anda tidak memiliki akses ke halaman ini.
              </p>
              <Link
                to={profile?.landingPath ?? "/login"}
                className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Kembali ke halaman role
              </Link>
            </div>
          )}
        </div>
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground lg:ml-[264px]">
        IconGuard · Divisi Material dan Jasa — PT PLN Icon Plus
      </footer>
    </div>
  );
}

function getSeenWarningIds(userId: string) {
  try {
    const stored = window.localStorage.getItem(`iconguard:seen-warnings:${userId}`);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [],
    );
  } catch {
    return new Set<string>();
  }
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
