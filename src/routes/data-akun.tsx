import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Pencil,
  Trash2,
  UserPlus,
  UsersRound,
  X,
  Search,
  Building2,
  Shield,
  Mail,
  User,
  Filter,
  MapPin,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteManagedUser,
  listManagedUsers,
  requireRouteAccess,
  updateManagedUser,
  type ManagedUser,
} from "@/lib/auth-server";
import { roleOptions, type AppRole } from "@/lib/demo-access";
import { sbuOptions, getSbuInfo } from "@/lib/iconguard-data";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/data-akun")({
  beforeLoad: () => requireRouteAccess("/data-akun"),
  head: () => ({ meta: [{ title: "Data Akun — IconGuard" }] }),
  component: DataAkunPage,
});

function getRoleTone(role?: string | null): "info" | "success" | "warning" | "neutral" {
  switch (role) {
    case "super-admin":
    case "petugas-sbu":
      return "info";
    case "mitra":
      return "success";
    case "petugas-mitra":
      return "warning";
    default:
      return "neutral";
  }
}

function getAccountStatusTone(status?: string | null): "success" | "warning" | "critical" | "neutral" {
  switch (status) {
    case "aktif":
      return "success";
    case "cuti":
      return "warning";
    case "resign":
      return "critical";
    default:
      return "neutral";
  }
}

function getAccountStatusLabel(status?: string | null): string {
  switch (status) {
    case "aktif":
      return "Aktif";
    case "cuti":
      return "Cuti";
    case "resign":
      return "Resign";
    default:
      return status || "Aktif";
  }
}

function getRoleLabel(role?: string | null): string {
  if (!role) return "—";
  return roleOptions.find((r) => r.value === role)?.label || role;
}

function DataAkunPage() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"petugas-sbu" | "mitra" | "petugas-mitra">("mitra");
  const [editStatus, setEditStatus] = useState<"aktif" | "cuti" | "resign">("aktif");
  const [editSbu, setEditSbu] = useState("");
  const [editOrganization, setEditOrganization] = useState("");
  const [userPendingDelete, setUserPendingDelete] = useState<(typeof users)[number] | null>(null);

  const refreshUsers = async () => {
    try {
      const result = await listManagedUsers();
      setUsers(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Daftar pengguna gagal dimuat.");
    }
  };

  useEffect(() => {
    void refreshUsers().finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    return {
      all: users.length,
      superAdmin: users.filter((u) => u.appRole === "super-admin").length,
      petugasSbu: users.filter((u) => u.appRole === "petugas-sbu").length,
      mitra: users.filter((u) => u.appRole === "mitra").length,
      petugasMitra: users.filter((u) => u.appRole === "petugas-mitra").length,
      aktif: users.filter((u) => (u.status || "aktif") === "aktif").length,
      cuti: users.filter((u) => u.status === "cuti").length,
      resign: users.filter((u) => u.status === "resign").length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.appRole === roleFilter;
      const userStatus = user.status || "aktif";
      const matchesStatus = statusFilter === "ALL" || userStatus === statusFilter;
      const matchesQuery =
        !query.trim() ||
        `${user.name} ${user.email} ${user.appRole} ${userStatus} ${user.sbu ?? ""} ${user.organization ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return matchesRole && matchesStatus && matchesQuery;
    });
  }, [users, roleFilter, statusFilter, query]);

  const startEditingUser = (user: (typeof users)[number]) => {
    if (user.appRole === "super-admin") return;
    setEditingUserId(user.id);
    setEditRole(user.appRole as "petugas-sbu" | "mitra" | "petugas-mitra");
    setEditSbu(user.sbu ?? "");
    setEditOrganization(user.organization ?? "");
    setEditStatus((user.status as any) || "aktif");
  };

  const handleUpdateUser = async (userId: string) => {
    if ((editRole === "mitra" || editRole === "petugas-mitra") && !editOrganization.trim()) {
      toast.error("Nama perusahaan/mitra wajib diisi untuk akun Mitra.");
      return;
    }
    setSubmitting(true);

    try {
      await updateManagedUser({
        data: {
          id: userId,
          appRole: editRole,
          sbu: editSbu,
          organization: editOrganization,
          status: editStatus,
        },
      });
      await refreshUsers();
      setEditingUserId(null);
      toast.success("Role & status akun berhasil diperbarui!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userPendingDelete) return;
    setSubmitting(true);

    try {
      await deleteManagedUser({ data: { id: userPendingDelete.id } });
      await refreshUsers();
      toast.success(`Akun ${userPendingDelete.name} berhasil dihapus dari sistem.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus akun.");
    } finally {
      setUserPendingDelete(null);
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="dashboard-enter space-y-6">
        <PageHeader
          title="Data Akun Pengguna"
          description="Daftar seluruh akun terdaftar di sistem IconGuard, dikelola oleh Super Admin."
          action={
            <Button asChild className="gap-2">
              <Link to="/buat-akun">
                <UserPlus className="size-4" />
                <span>Buat Akun Baru</span>
              </Link>
            </Button>
          }
        />

        {/* Filter Bar & Statistik Ringkas */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={roleFilter === "ALL" ? "default" : "outline"}
                onClick={() => setRoleFilter("ALL")}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <span>Semua Role</span>
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                  {counts.all}
                </span>
              </Button>
              <Button
                size="sm"
                variant={roleFilter === "super-admin" ? "default" : "outline"}
                onClick={() => setRoleFilter("super-admin")}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <span>Super Admin</span>
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                  {counts.superAdmin}
                </span>
              </Button>
              <Button
                size="sm"
                variant={roleFilter === "petugas-sbu" ? "default" : "outline"}
                onClick={() => setRoleFilter("petugas-sbu")}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <span>Petugas SBU</span>
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                  {counts.petugasSbu}
                </span>
              </Button>
              <Button
                size="sm"
                variant={roleFilter === "mitra" ? "default" : "outline"}
                onClick={() => setRoleFilter("mitra")}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <span>Mitra</span>
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                  {counts.mitra}
                </span>
              </Button>
              <Button
                size="sm"
                variant={roleFilter === "petugas-mitra" ? "default" : "outline"}
                onClick={() => setRoleFilter("petugas-mitra")}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <span>Petugas Mitra</span>
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                  {counts.petugasMitra}
                </span>
              </Button>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, email, role, status, mitra..."
                className="h-8.5 pl-9 text-xs"
              />
            </div>
          </div>

          {/* Sub-Filter: Status Akun */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="size-3" />
              Status Akun:
            </span>
            <Button
              size="sm"
              variant={statusFilter === "ALL" ? "secondary" : "ghost"}
              onClick={() => setStatusFilter("ALL")}
              className="h-7 text-[11px] px-2.5 font-medium"
            >
              Semua ({counts.all})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "aktif" ? "secondary" : "ghost"}
              onClick={() => setStatusFilter("aktif")}
              className="h-7 text-[11px] px-2.5 font-medium text-emerald-600 hover:text-emerald-700"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5" />
              Aktif ({counts.aktif})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "cuti" ? "secondary" : "ghost"}
              onClick={() => setStatusFilter("cuti")}
              className="h-7 text-[11px] px-2.5 font-medium text-amber-600 hover:text-amber-700"
            >
              <span className="size-1.5 rounded-full bg-amber-500 mr-1.5" />
              Cuti ({counts.cuti})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "resign" ? "secondary" : "ghost"}
              onClick={() => setStatusFilter("resign")}
              className="h-7 text-[11px] px-2.5 font-medium text-rose-600 hover:text-rose-700"
            >
              <span className="size-1.5 rounded-full bg-rose-500 mr-1.5" />
              Resign ({counts.resign})
            </Button>
          </div>
        </div>

        {/* Tabel Data Akun */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UsersRound className="size-4.5 text-primary" />
                  <span>Daftar Pengguna Terdaftar</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Menampilkan {filteredUsers.length} dari {users.length} total akun terdaftar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-sm text-muted-foreground" aria-busy="true">
                Memuat data akun...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <UsersRound className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-foreground">Tidak Ada Akun Ditemukan</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {query
                    ? `Tidak ada akun yang cocok dengan kata kunci "${query}".`
                    : "Belum ada akun pengguna pada kategori ini."}
                </p>
                {query && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery("")}
                    className="mt-3 h-8 text-xs"
                  >
                    Reset Pencarian
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-12 text-center font-bold text-xs">No</TableHead>
                      <TableHead className="font-bold text-xs">Nama &amp; Pengguna</TableHead>
                      <TableHead className="font-bold text-xs">Email Kerja</TableHead>
                      <TableHead className="font-bold text-xs">Role</TableHead>
                      <TableHead className="font-bold text-xs">Status</TableHead>
                      <TableHead className="font-bold text-xs">Wilayah SBU</TableHead>
                      <TableHead className="font-bold text-xs">Organisasi / Mitra</TableHead>
                      <TableHead className="w-28 text-right font-bold text-xs">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, idx) => {
                      const isEditing = editingUserId === user.id;
                      const isSuperAdmin = user.appRole === "super-admin";

                      return (
                        <TableRow key={user.id} className="hover:bg-muted/30">
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-foreground truncate">{user.name}</p>
                                <p className="font-mono text-[10px] text-muted-foreground truncate">{user.id}</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {user.email}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editRole}
                                onValueChange={(val) => setEditRole(val as typeof editRole)}
                              >
                                <SelectTrigger className="h-7 text-xs w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="petugas-sbu" className="text-xs">Petugas SBU</SelectItem>
                                  <SelectItem value="mitra" className="text-xs">Mitra</SelectItem>
                                  <SelectItem value="petugas-mitra" className="text-xs">Petugas Mitra</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <StatusPill tone={getRoleTone(user.appRole)}>
                                {getRoleLabel(user.appRole)}
                              </StatusPill>
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editStatus}
                                onValueChange={(val) => setEditStatus(val as typeof editStatus)}
                              >
                                <SelectTrigger className="h-7 text-xs w-[110px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="aktif" className="text-xs">
                                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                      <span className="size-1.5 rounded-full bg-emerald-500" />
                                      Aktif
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="cuti" className="text-xs">
                                    <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                                      <span className="size-1.5 rounded-full bg-amber-500" />
                                      Cuti
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="resign" className="text-xs">
                                    <span className="flex items-center gap-1.5 text-rose-600 font-medium">
                                      <span className="size-1.5 rounded-full bg-rose-500" />
                                      Resign
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <StatusPill tone={getAccountStatusTone(user.status)}>
                                {getAccountStatusLabel(user.status)}
                              </StatusPill>
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <Select value={editSbu} onValueChange={setEditSbu}>
                                <SelectTrigger className="h-7 text-xs w-[140px]">
                                  <SelectValue placeholder="Pilih SBU" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sbuOptions.map((s) => (
                                    <SelectItem key={s.code} value={s.code} className="text-xs">
                                      {s.code} — {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#C2E2FC]/40 px-2 py-0.5 text-xs font-semibold text-primary">
                                  <MapPin className="size-3 text-primary/70 shrink-0" />
                                  <span className="truncate max-w-[150px]">
                                    {user.sbu
                                      ? (sbuOptions.find((s) => s.code === user.sbu)?.label
                                          ? `${user.sbu} · ${sbuOptions.find((s) => s.code === user.sbu)?.label}`
                                          : user.sbu)
                                      : getSbuInfo(user.organization ?? undefined).code !== "—"
                                      ? getSbuInfo(user.organization ?? undefined).full
                                      : user.appRole === "super-admin"
                                      ? "Semua SBU (Nasional)"
                                      : "—"}
                                  </span>
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={editOrganization}
                                onChange={(e) => setEditOrganization(e.target.value)}
                                placeholder="Nama Mitra / Unit SBU"
                                className="h-7 text-xs max-w-xs"
                              />
                            ) : (
                              <span className="text-xs text-foreground/90 font-medium">
                                {user.organization || "—"}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {isSuperAdmin ? (
                              <span className="text-[11px] text-muted-foreground italic">Terkunci</span>
                            ) : isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={submitting}
                                  onClick={() => void handleUpdateUser(user.id)}
                                  className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Simpan Perubahan"
                                >
                                  <Check className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={submitting}
                                  onClick={() => setEditingUserId(null)}
                                  className="size-7 text-muted-foreground hover:bg-muted"
                                  title="Batal"
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => startEditingUser(user)}
                                  className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  title="Edit Role / Organisasi"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setUserPendingDelete(user)}
                                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Hapus Akun"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Konfirmasi Hapus Akun */}
        <AlertDialog
          open={Boolean(userPendingDelete)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setUserPendingDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Akun Pengguna?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus akun{" "}
                <strong>{userPendingDelete?.name}</strong> ({userPendingDelete?.email})? Tindakan ini akan
                menghapus akses login pengguna secara permanen dari sistem.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handleDeleteUser()}
                disabled={submitting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus Akun"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

