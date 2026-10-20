import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileWarning,
  Building2,
  MessageSquareShare,
  Menu,
  LogOut,
  UsersRound,
  UserPlus,
  CircleHelp,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  X,
  Plus,
  FileCheck2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  { to: "/lapor", label: "Input Pelanggaran", icon: FileText },
  { to: "/pelanggaran", label: "Pelanggaran", icon: FileWarning },
  { to: "/mitra", label: "Scorecard Mitra", icon: Building2 },
  { to: "/portal", label: "Portal Klarifikasi", icon: MessageSquareShare },
  { to: "/laporan-klarifikasi", label: "Laporan Klarifikasi", icon: FileCheck2 },
  { to: "/buat-akun", label: "Buat Akun", icon: UserPlus },
  { to: "/data-akun", label: "Data Akun", icon: UsersRound },
  { to: "/faq", label: "FAQ", icon: CircleHelp },
] as const;

export const ROUTE_TAB_DEFINITIONS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "/": { label: "Dashboard", icon: LayoutDashboard },
  "/lapor": { label: "Input Pelanggaran", icon: FileText },
  "/pelanggaran": { label: "Data Pelanggaran", icon: FileWarning },
  "/mitra": { label: "Scorecard Mitra", icon: Building2 },
  "/portal": { label: "Portal Klarifikasi", icon: MessageSquareShare },
  "/laporan-klarifikasi": { label: "Laporan Klarifikasi", icon: FileCheck2 },
  "/buat-akun": { label: "Buat Akun", icon: UserPlus },
  "/data-akun": { label: "Data Akun", icon: UsersRound },
  "/faq": { label: "FAQ & Bantuan", icon: CircleHelp },
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  appRole: AppRole;
  organization: string;
  sbu?: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [firstLoginWarnings, setFirstLoginWarnings] = useState<Violation[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("iconguard_sidebar_open");
      if (saved !== null) return saved === "true";
    }
    return true;
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("iconguard_sidebar_open", String(next));
      }
      return next;
    });
  };

  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    if (typeof window !== "undefined" && !window.sessionStorage.getItem("iconguard_session_started")) {
      void authClient.signOut().finally(() => {
        if (active) {
          setCurrentUser(null);
          setRoleReady(true);
          void navigate({ to: "/login", replace: true });
        }
      });
      return () => {
        active = false;
      };
    }

    void getCurrentAuthUser()
      .then((user) => {
        if (active) {
          const savedBootId = typeof window !== "undefined" ? window.sessionStorage.getItem("iconguard_boot_id") : null;
          if (!user || (savedBootId && user.bootId !== savedBootId)) {
            if (typeof window !== "undefined") {
              window.sessionStorage.removeItem("iconguard_session_started");
              window.sessionStorage.removeItem("iconguard_boot_id");
            }
            void authClient.signOut().finally(() => {
              if (active) {
                setCurrentUser(null);
                setRoleReady(true);
                void navigate({ to: "/login", replace: true });
              }
            });
            return;
          }

          setCurrentUser(user);
          setRoleReady(true);
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
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("iconguard_session_started");
      window.sessionStorage.removeItem("iconguard_boot_id");
    }
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

  // State untuk Tab Bar Navigasi Multi-Halaman
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem("iconguard_open_tabs");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return ["/"];
  });

  const [showTabPicker, setShowTabPicker] = useState(false);

  // Otomatis tambahkan tab bila berpindah ke halaman yang terdaftar
  useEffect(() => {
    if (ROUTE_TAB_DEFINITIONS[currentPath]) {
      setOpenTabs((prev) => {
        if (!prev.includes(currentPath)) {
          const updated = [...prev, currentPath];
          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.setItem("iconguard_open_tabs", JSON.stringify(updated));
            } catch {}
          }
          return updated;
        }
        return prev;
      });
    }
  }, [currentPath]);

  const closedAccessibleTabs = useMemo(() => {
    if (!currentUser) return [];
    return Object.keys(ROUTE_TAB_DEFINITIONS).filter(
      (path) =>
        canAccessPath(currentUser.appRole, path) && !openTabs.includes(path),
    );
  }, [currentUser, openTabs]);

  const handleCloseTab = (tabPath: string) => {
    setOpenTabs((prev) => {
      const filtered = prev.filter((p) => p !== tabPath);
      const nextTabs = filtered.length > 0 ? filtered : ["/"];
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem("iconguard_open_tabs", JSON.stringify(nextTabs));
        } catch {}
      }
      if (currentPath === tabPath) {
        const nextTarget = nextTabs[nextTabs.length - 1] ?? "/";
        void navigate({ to: nextTarget as any });
      }
      return nextTabs;
    });
  };

  const handleOpenNewTab = (tabPath: string) => {
    setOpenTabs((prev) => {
      if (!prev.includes(tabPath)) {
        const updated = [...prev, tabPath];
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem("iconguard_open_tabs", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      }
      return prev;
    });
    void navigate({ to: tabPath as any });
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
      <aside
        className={cn(
          "fixed inset-y-3 left-3 z-50 hidden w-60 flex-col overflow-hidden rounded-3xl border border-primary/10 bg-[#C2E2FC] shadow-sm transition-all duration-300 ease-in-out lg:flex",
          !sidebarOpen && "-translate-x-[calc(100%+24px)] pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-primary/10 px-4 py-4">
          {roleReady && currentUser && profile ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-xs">
                {profile.initials}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold">{currentUser.name || profile.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentUser.organization || profile.organization}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-bold text-primary">IconGuard</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            title="Tutup Menu Sidebar"
            aria-label="Tutup Menu Sidebar"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-white/70 text-primary transition-all duration-200 hover:bg-white hover:text-primary hover:shadow-xs active:scale-95 cursor-pointer"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
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

      <header
        className={cn(
          "sticky top-0 z-30 mx-3 bg-[#EAF5FE]/90 backdrop-blur-md text-slate-900 transition-all duration-300",
          sidebarOpen ? "lg:ml-[264px] lg:mr-3" : "lg:ml-3 lg:mr-3",
        )}
      >
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Buka Menu Sidebar"
              aria-label="Buka Menu Sidebar"
              className="hidden lg:flex items-center gap-2 rounded-xl border border-primary/20 bg-[#C2E2FC] px-3.5 py-2 text-xs font-semibold text-primary shadow-xs transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95 cursor-pointer"
            >
              <PanelLeftOpen className="size-4" />
              <span>Buka Menu</span>
            </button>
          )}
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

        {/* Tab Bar Navigasi Multi-Halaman Sticky */}
        {roleReady && currentUser && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-primary/10 bg-[#C2E2FC]/35 px-3 py-1.5 md:px-6 scrollbar-none">
            {openTabs
              .filter((path) => ROUTE_TAB_DEFINITIONS[path] && canAccessPath(currentUser.appRole, path))
              .map((tabPath) => {
                const def = ROUTE_TAB_DEFINITIONS[tabPath];
                if (!def) return null;
                const isActive = currentPath === tabPath;
                const Icon = def.icon;
                return (
                  <div
                    key={tabPath}
                    onClick={() => {
                      if (!isActive) void navigate({ to: tabPath as any });
                    }}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={0}
                    className={cn(
                      "group relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all select-none cursor-pointer",
                      isActive
                        ? "bg-white text-primary shadow-xs border border-primary/25 font-semibold"
                        : "bg-white/50 text-slate-600 hover:bg-white/85 hover:text-primary border border-transparent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        isActive ? "text-primary" : "text-slate-500 group-hover:text-primary",
                      )}
                    />
                    <span className="truncate max-w-[130px] md:max-w-[180px]">{def.label}</span>

                    {openTabs.length > 1 && (
                      <button
                        type="button"
                        title={`Tutup tab ${def.label}`}
                        aria-label={`Tutup tab ${def.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tabPath);
                        }}
                        className="ml-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors dark:hover:bg-slate-700"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })}

            {/* Quick launcher untuk tab yang belum dibuka */}
            {closedAccessibleTabs.length > 0 && (
              <div className="relative shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTabPicker((prev) => !prev)}
                  title="Buka tab halaman lain"
                  className="h-7 gap-1 px-2 text-xs text-slate-600 hover:bg-white/80 hover:text-primary"
                >
                  <Plus className="size-3.5" />
                  <span className="hidden sm:inline">Tab Baru</span>
                </Button>
                {showTabPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowTabPicker(false)}
                    />
                    <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-primary/10 bg-white p-1.5 shadow-lg backdrop-blur-md dark:bg-slate-900">
                      <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Buka Tab Halaman
                      </p>
                      {closedAccessibleTabs.map((path) => {
                        const def = ROUTE_TAB_DEFINITIONS[path];
                        if (!def) return null;
                        const Icon = def.icon;
                        return (
                          <button
                            key={path}
                            type="button"
                            onClick={() => {
                              setShowTabPicker(false);
                              handleOpenNewTab(path);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-[#EAF5FE] hover:text-primary text-left dark:text-slate-200"
                          >
                            <Icon className="size-3.5 text-slate-500" />
                            <span>{def.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}        {open && (
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
      <main className={cn("transition-all duration-300", sidebarOpen ? "lg:ml-[264px]" : "lg:ml-0")}>
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
      <footer
        className={cn(
          "border-t border-border py-6 text-center text-xs text-muted-foreground transition-all duration-300",
          sidebarOpen ? "lg:ml-[264px]" : "lg:ml-0",
        )}
      >
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
