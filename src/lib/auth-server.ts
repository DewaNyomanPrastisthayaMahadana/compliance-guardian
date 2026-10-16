import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { constantTimeEqual } from "better-auth/crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { authBootstrapGuard, user } from "@/lib/auth-schema";
import { createAuth, getAuthDb, getAuthEnvironment } from "@/lib/auth.server";
import {
  addViolationRecord,
  removeViolationRecord,
  updateViolationEvidence,
  setServerViolationsAndMitra,
  mitraList,
  violations,
} from "@/lib/iconguard-data";
import type { AppRole } from "@/lib/demo-access";

const appRoles = ["super-admin", "mitra", "petugas-mitra"] as const;
const routePaths = ["/", "/lapor", "/pelanggaran", "/mitra", "/portal", "/pengguna", "/faq"] as const;
type ProtectedRoutePath = (typeof routePaths)[number];

// ID unik setiap kali server dijalankan ulang (restart/start).
// Jika server dimatikan dan dinyalakan kembali, bootId berubah dan memaksa sesi login ulang.
const SERVER_BOOT_ID = `boot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const routeAccess: Record<AppRole, readonly (typeof routePaths)[number][]> = {
  "super-admin": routePaths,
  mitra: ["/mitra", "/portal", "/faq"],
  "petugas-mitra": ["/portal", "/faq"],
};

const roleLanding: Record<AppRole, "/" | "/portal"> = {
  "super-admin": "/",
  mitra: "/portal",
  "petugas-mitra": "/portal",
};

function getRequestAuth() {
  const request = getRequest();
  return { request, auth: createAuth(request) };
}

async function getSignedInUser(request: Request) {
  const session = await createAuth(request).api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

async function requireSuperAdmin(request: Request) {
  const signedInUser = await getSignedInUser(request);
  if (!signedInUser || signedInUser.appRole !== "super-admin") {
    throw new Error("Akses hanya untuk Super Admin.");
  }
  return signedInUser;
}

export const getAuthStatus = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const [firstUser] = await getAuthDb(request).select({ id: user.id }).from(user).limit(1);
  return {
    needsBootstrap: !firstUser,
    bootstrapEnabled: Boolean(getAuthEnvironment(request).SUPER_ADMIN_SETUP_TOKEN),
    bootId: SERVER_BOOT_ID,
  };
});

export const getCurrentAuthUser = createServerFn({ method: "GET" }).handler(async () => {
  const { request } = getRequestAuth();
  const signedInUser = await getSignedInUser(request);
  if (!signedInUser || !appRoles.includes(signedInUser.appRole as AppRole)) return null;

  return {
    id: signedInUser.id,
    name: signedInUser.name,
    email: signedInUser.email,
    appRole: signedInUser.appRole as AppRole,
    organization: signedInUser.organization ?? "",
    bootId: SERVER_BOOT_ID,
  };
});

export const loginWithGoogleVerified = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const { request, auth } = getRequestAuth();
    const email = data.email.trim().toLowerCase();

    const db = getAuthDb(request);
    const [existingUser] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        appRole: user.appRole,
        organization: user.organization,
        banned: user.banned,
        banReason: user.banReason,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!existingUser) {
      throw new Error(
        `Akun Google (${email}) belum didaftarkan oleh Super Admin. Anda tidak dapat masuk ke sistem. Silakan hubungi Super Admin untuk pendaftaran akun terlebih dahulu.`
      );
    }

    if (existingUser.banned) {
      throw new Error(`Akun ini dinonaktifkan: ${existingUser.banReason || "Akses dicabut"}`);
    }

    await (auth.api as any).signInGoogleVerified({
      headers: request.headers,
      body: { email },
    });

    return {
      success: true,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        appRole: existingUser.appRole as AppRole,
        organization: existingUser.organization ?? "",
        bootId: SERVER_BOOT_ID,
      },
    };
  });

export const getMitraScorecardData = createServerFn({ method: "GET" }).handler(async () => {
  const { request } = getRequestAuth();
  const signedInUser = await getSignedInUser(request);
  const role = signedInUser?.appRole as AppRole | undefined;

  if (!signedInUser || !role || !["super-admin", "mitra"].includes(role)) {
    throw new Error("Akses Scorecard tidak diizinkan.");
  }

  const isMitra = role === "mitra";
  const organization = signedInUser.organization?.trim() ?? "";
  const organizationKey = organization.toLowerCase();

  return {
    organization,
    isMitra,
    mitraList: isMitra
      ? mitraList.filter((mitra) => mitra.nama.trim().toLowerCase() === organizationKey)
      : mitraList,
    violations: isMitra
      ? violations.filter((violation) => violation.mitra.trim().toLowerCase() === organizationKey)
      : violations,
  };
});

export const createViolationReport = createServerFn({ method: "POST" })
  .validator(
    z.object({
      idPa: z.string(),
      sbu: z.string(),
      mitra: z.string(),
      petugas: z.string(),
      jenis: z.string(),
      severity: z.enum(["Ringan", "Sedang", "Berat"]),
      catatan: z.string(),
      bukti: z.array(z.string()).default([]),
      tanggalCek: z.string().optional(),
      tanggalAktivasi: z.string().optional(),
      tanggalPermohonan: z.string().optional(),
      petugasQc: z.string().optional(),
      petugasMonitoringPusat: z.string().optional(),
      kp: z.string().optional(),
      idFat: z.string().optional(),
      checklistResults: z.record(z.string(), z.string()).optional(),
      qcK3: z.string().optional(),
      qcInstalasi: z.string().optional(),
      poin: z.number().optional(),
      status: z.enum(["Open", "Pending Klarifikasi", "Verifikasi", "Closed", "Overdue"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const violation = addViolationRecord(data);
    return { success: true, violation };
  });

export const deleteViolationReport = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { request } = getRequestAuth();
    await requireSuperAdmin(request);
    const deleted = removeViolationRecord(data.id);
    if (!deleted) throw new Error("Pelanggaran tidak ditemukan atau sudah dihapus.");
    return { success: true };
  });

export const importExcelViolations = createServerFn({ method: "POST" })
  .validator(
    z.object({
      newViolations: z.array(z.any()),
      newMitraList: z.array(z.any()).optional(),
      replaceAll: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    setServerViolationsAndMitra(data.newViolations, data.newMitraList, data.replaceAll);
    return { success: true, count: data.newViolations.length };
  });

export const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const { request } = getRequestAuth();
  const signedInUser = await getSignedInUser(request);
  if (!signedInUser) {
    throw new Error("Akses tidak diizinkan.");
  }
  return {
    violations,
    mitraList,
  };
});

export const getPelanggaranData = createServerFn({ method: "GET" }).handler(async () => {
  const { request } = getRequestAuth();
  const signedInUser = await getSignedInUser(request);
  if (!signedInUser) {
    throw new Error("Akses tidak diizinkan.");
  }
  return {
    violations,
    canDelete: signedInUser.appRole === "super-admin",
  };
});

export const checkRouteAccess = createServerFn({ method: "GET" })
  .validator(z.object({ path: z.enum(routePaths) }))
  .handler(async ({ data }) => {
    const { request } = getRequestAuth();
    const signedInUser = await getSignedInUser(request);
    const role = signedInUser?.appRole as AppRole | undefined;

    if (!signedInUser || !role || !appRoles.includes(role)) {
      return {
        authenticated: false as const,
        allowed: false as const,
        home: "/login" as const,
        bootId: SERVER_BOOT_ID,
      };
    }

    return {
      authenticated: true as const,
      allowed: routeAccess[role].includes(data.path),
      home: roleLanding[role],
      bootId: SERVER_BOOT_ID,
    };
  });

export async function requireRouteAccess(path: ProtectedRoutePath) {
  const access = await checkRouteAccess({ data: { path } });
  if (typeof window !== "undefined") {
    const isFreshSessionStarted = window.sessionStorage.getItem("iconguard_session_started");
    const savedBootId = window.sessionStorage.getItem("iconguard_boot_id");
    if (!isFreshSessionStarted || savedBootId !== access.bootId) {
      window.sessionStorage.removeItem("iconguard_session_started");
      window.sessionStorage.removeItem("iconguard_boot_id");
      throw redirect({ to: "/login", replace: true });
    }
  }
  if (!access.authenticated) throw redirect({ to: "/login", replace: true });
  if (!access.allowed) throw redirect({ to: access.home, replace: true });
}

export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(100),
      email: z.email().max(254),
      password: z.string().min(12).max(128),
      setupToken: z.string().min(32).max(256),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const expectedToken = getAuthEnvironment(request).SUPER_ADMIN_SETUP_TOKEN;
    if (!expectedToken || !constantTimeEqual(data.setupToken, expectedToken)) {
      throw new Error("Token setup Super Admin tidak valid.");
    }

    const db = getAuthDb(request);
    const [firstUser] = await db.select({ id: user.id }).from(user).limit(1);
    if (firstUser) throw new Error("Super Admin pertama sudah dibuat.");

    try {
      await db.insert(authBootstrapGuard).values({ id: 1 });
    } catch {
      throw new Error("Setup Super Admin sudah digunakan.");
    }

    try {
      await createAuth(request).api.createUser({
        body: {
          name: data.name,
          email: data.email.trim().toLowerCase(),
          password: data.password,
          role: "admin",
          data: { appRole: "super-admin", organization: "PLN Icon Plus · Material & Jasa" },
        },
      });
      return { ok: true };
    } catch (error) {
      await db.delete(authBootstrapGuard).where(eq(authBootstrapGuard.id, 1));
      throw error;
    }
  });

export const listManagedUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { request } = getRequestAuth();
  await requireSuperAdmin(request);
  return getAuthDb(request)
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      appRole: user.appRole,
      organization: user.organization,
      banned: user.banned,
    })
    .from(user)
    .orderBy(desc(user.createdAt));
});

export const createManagedUser = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.email().max(254),
        password: z.string().min(12).max(128),
        appRole: z.enum(appRoles),
        organization: z.string().trim().max(160).optional(),
      })
      .refine((data) => data.appRole !== "mitra" || Boolean(data.organization), {
        path: ["organization"],
        message: "Nama perusahaan wajib untuk akun Mitra.",
      }),
  )
  .handler(async ({ data }) => {
    const { request, auth } = getRequestAuth();
    await requireSuperAdmin(request);

    const result = await auth.api.createUser({
      headers: request.headers,
      body: {
        name: data.name,
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: "user",
        data: {
          appRole: data.appRole,
          organization:
            data.appRole === "super-admin" ? "PT PLN Icon Plus" : data.organization || null,
        },
      },
    });

    return {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      appRole: data.appRole,
      organization: data.organization ?? "",
      banned: false,
    };
  });

export const updateManagedUser = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        id: z.string().min(1).max(128),
        appRole: z.enum(["mitra", "petugas-mitra"]),
        organization: z.string().trim().max(160).optional(),
      })
      .refine((data) => data.appRole !== "mitra" || Boolean(data.organization), {
        path: ["organization"],
        message: "Nama perusahaan wajib untuk akun Mitra.",
      }),
  )
  .handler(async ({ data }) => {
    const { request } = getRequestAuth();
    await requireSuperAdmin(request);

    const db = getAuthDb(request);
    const [managedUser] = await db
      .select({ appRole: user.appRole })
      .from(user)
      .where(eq(user.id, data.id))
      .limit(1);

    if (!managedUser) throw new Error("Akun tidak ditemukan.");
    if (!["mitra", "petugas-mitra"].includes(managedUser.appRole)) {
      throw new Error("Role akun ini tidak dapat diubah dari halaman pengguna.");
    }

    const [updatedUser] = await db
      .update(user)
      .set({
        appRole: data.appRole,
        organization: data.organization || null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, data.id))
      .returning({ id: user.id });

    if (!updatedUser) throw new Error("Perubahan role akun gagal disimpan.");

    return { id: updatedUser.id, appRole: data.appRole };
  });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(128) }))
  .handler(async ({ data }) => {
    const { request } = getRequestAuth();
    const signedInUser = await requireSuperAdmin(request);
    const db = getAuthDb(request);
    const [managedUser] = await db
      .select({ id: user.id, appRole: user.appRole })
      .from(user)
      .where(eq(user.id, data.id))
      .limit(1);

    if (!managedUser) throw new Error("Akun tidak ditemukan.");
    if (
      managedUser.id === signedInUser.id ||
      !["mitra", "petugas-mitra"].includes(managedUser.appRole)
    ) {
      throw new Error("Akun ini tidak dapat dihapus dari halaman pengguna.");
    }

    const [deletedUser] = await db
      .delete(user)
      .where(eq(user.id, data.id))
      .returning({ id: user.id });

    if (!deletedUser) throw new Error("Akun gagal dihapus.");
    return { id: deletedUser.id };
  });
