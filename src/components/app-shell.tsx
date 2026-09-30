import { Link } from "@tanstack/react-router";
import { ShieldCheck, LayoutDashboard, FileWarning, Building2, MessageSquareShare, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pelanggaran", label: "Pelanggaran", icon: FileWarning },
  { to: "/mitra", label: "Scorecard Mitra", icon: Building2 },
  { to: "/portal", label: "Portal Klarifikasi", icon: MessageSquareShare },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface-brand text-brand-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent/20">
            <ShieldCheck className="size-5" />
          </div>
          <div className="mr-auto leading-tight">
            <p className="text-base font-bold tracking-tight">IconGuard</p>
            <p className="text-[11px] opacity-80">Mitra &amp; Material Compliance System</p>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-80 transition-colors hover:bg-accent/20 hover:opacity-100"
                activeProps={{ className: "bg-accent/25 opacity-100" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 border-l border-brand-foreground/20 pl-3 md:flex">
            <div className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              AM
            </div>
            <div className="text-xs leading-tight">
              <p className="font-semibold">Admin Material &amp; Jasa</p>
              <p className="opacity-75">PT PLN Icon Plus</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Buka menu"
            className="rounded-md p-2 hover:bg-accent/20 md:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
        {open && (
          <nav className="grid gap-1 border-t border-brand-foreground/15 px-4 py-2 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium opacity-85"
                activeProps={{ className: "bg-accent/25 opacity-100" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        IconGuard · Divisi Material dan Jasa — PT PLN Icon Plus
      </footer>
    </div>
  );
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
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
