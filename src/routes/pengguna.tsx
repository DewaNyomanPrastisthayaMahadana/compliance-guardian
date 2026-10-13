import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createManagedUser,
  deleteManagedUser,
  listManagedUsers,
  requireRouteAccess,
  updateManagedUser,
} from "@/lib/auth-server";
import { roleDetails, roleOptions, type AppRole } from "@/lib/demo-access";
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

export const Route = createFileRoute("/pengguna")({
  beforeLoad: () => requireRouteAccess("/pengguna"),
  head: () => ({ meta: [{ title: "Buat Akun — IconGuard" }] }),
  component: PenggunaPage,
});

function PenggunaPage() {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<Awaited<ReturnType<typeof listManagedUsers>>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"mitra" | "petugas-mitra">("mitra");
  const [editOrganization, setEditOrganization] = useState("");
  const [userPendingDelete, setUserPendingDelete] = useState<(typeof users)[number] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [appRole, setAppRole] = useState<AppRole>("mitra");
  const [organization, setOrganization] = useState("");

  const refreshUsers = async () => {
    const result = await listManagedUsers();
    setUsers(result);
  };

  useEffect(() => {
    void refreshUsers()
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Daftar pengguna gagal dimuat.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.appRole} ${user.organization ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await createManagedUser({ data: { name, email, password, appRole, organization } });
      await refreshUsers();
      setName("");
      setEmail("");
      setPassword("");
      setOrganization("");
      setAppRole("mitra");
      setShowCreateForm(false);
      setMessage("Akun berhasil dibuat.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Akun gagal dibuat.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingUser = (user: (typeof users)[number]) => {
    if (user.appRole !== "mitra" && user.appRole !== "petugas-mitra") return;
    setEditingUserId(user.id);
    setEditRole(user.appRole);
    setEditOrganization(user.organization ?? "");
    setMessage("");
  };

  const handleUpdateUser = async (userId: string) => {
    if (editRole === "mitra" && !editOrganization.trim()) {
      setMessage("Nama perusahaan wajib untuk akun Mitra.");
      return;
    }
    setSubmitting(true);
    setMessage("");

    try {
      await updateManagedUser({
        data: { id: userId, appRole: editRole, organization: editOrganization },
      });
      await refreshUsers();
      setEditingUserId(null);
      setMessage("Role akun berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Perubahan role akun gagal disimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userPendingDelete) return;
    setSubmitting(true);
    setMessage("");

    try {
      await deleteManagedUser({ data: { id: userPendingDelete.id } });
      await refreshUsers();
      setMessage(`Akun ${userPendingDelete.name} berhasil dihapus.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Akun gagal dihapus.");
    } finally {
      setUserPendingDelete(null);
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="dashboard-enter">
        <PageHeader
          title="Buat Akun"
          description="Kelola akun dan tingkat akses IconGuard."
          action={
            <Button onClick={() => setShowCreateForm((visible) => !visible)}>
              <UserPlus /> Tambah pengguna
            </Button>
          }
        />
      </div>

      <Card className="dashboard-enter" style={{ animationDelay: "100ms" }}>
        <CardHeader>
          <CardTitle>Akun terdaftar</CardTitle>
          <CardDescription>
            Akun tersimpan di database dan dikelola oleh Super Admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <form
              onSubmit={(event) => void handleCreateUser(event)}
              className="mb-6 grid gap-4 border-b border-border pb-6 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <label htmlFor="new-name" className="text-sm font-medium">
                  Nama
                </label>
                <Input
                  id="new-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-email" className="text-sm font-medium">
                  Email kerja
                </label>
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium">
                  Kata sandi awal
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-role" className="text-sm font-medium">
                  Role aplikasi
                </label>
                <Select
                  value={appRole}
                  onValueChange={(value) => {
                    const nextRole = value as AppRole;
                    setAppRole(nextRole);
                    setOrganization(nextRole === "super-admin" ? "PT PLN Icon Plus" : "");
                  }}
                >
                  <SelectTrigger id="new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(appRole === "mitra" || appRole === "petugas-mitra") && (
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="new-organization" className="text-sm font-medium">
                    Nama Mitra
                  </label>
                  <Input
                    id="new-organization"
                    value={organization}
                    onChange={(event) => setOrganization(event.target.value)}
                    maxLength={160}
                    required={appRole === "mitra"}
                  />
                </div>
              )}
              {appRole === "super-admin" && (
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="new-super-admin-organization" className="text-sm font-medium">
                    Nama Perusahaan
                  </label>
                  <Input id="new-super-admin-organization" value="PT PLN Icon Plus" readOnly />
                </div>
              )}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Buat akun"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Batal
                </Button>
              </div>
            </form>
          )}

          <div className="mb-4 max-w-sm">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, email, role, atau nama mitra"
              aria-label="Cari pengguna"
            />
          </div>

          {message && (
            <p role="status" aria-live="polite" className="mb-4 text-sm text-muted-foreground">
              {message}
            </p>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organisasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => (
                  <TableRow
                    key={user.id}
                    className="dashboard-enter"
                    style={{ animationDelay: `${Math.min(index, 6) * 75 + 300}ms` }}
                  >
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {editingUserId === user.id ? (
                        <Select
                          value={editRole}
                          onValueChange={(value) => setEditRole(value as "mitra" | "petugas-mitra")}
                        >
                          <SelectTrigger aria-label={`Role ${user.name}`} className="min-w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions
                              .filter((role) => role.value !== "super-admin")
                              .map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        (roleDetails[user.appRole as AppRole]?.label ?? user.appRole)
                      )}
                    </TableCell>
                    <TableCell>
                      {editingUserId === user.id ? (
                        <Input
                          value={editOrganization}
                          onChange={(event) => setEditOrganization(event.target.value)}
                          aria-label={`Organisasi ${user.name}`}
                          maxLength={160}
                          required={editRole === "mitra"}
                        />
                      ) : (
                        (user.organization ?? "—")
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={user.banned ? "critical" : "success"}>
                        {user.banned ? "Diblokir" : "Aktif"}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {editingUserId === user.id ? (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={submitting}
                              onClick={() => void handleUpdateUser(user.id)}
                              aria-label="Simpan perubahan akun"
                              title="Simpan perubahan akun"
                            >
                              <Check />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={submitting}
                              onClick={() => setEditingUserId(null)}
                              aria-label="Batal mengedit akun"
                              title="Batal mengedit akun"
                            >
                              <X />
                            </Button>
                          </>
                        ) : user.appRole === "mitra" || user.appRole === "petugas-mitra" ? (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => startEditingUser(user)}
                              aria-label={`Edit role ${user.name}`}
                              title="Edit role dan organisasi"
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => setUserPendingDelete(user)}
                              aria-label={`Hapus akun ${user.name}`}
                              title="Hapus akun"
                            >
                              <Trash2 />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Pengguna tidak ditemukan.
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Memuat pengguna...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(userPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !submitting) setUserPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun {userPendingDelete?.name} ({userPendingDelete?.email}) akan dihapus permanen dan
              sesi loginnya dicabut. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteUser();
              }}
            >
              {submitting ? "Menghapus..." : "Hapus akun"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
