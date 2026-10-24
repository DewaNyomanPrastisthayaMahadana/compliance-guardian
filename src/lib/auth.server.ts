import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { createAuthEndpoint, APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { z } from "zod";
import { authSchema } from "@/lib/auth-schema";

type AuthEnvironment = {
  BETTER_AUTH_SECRET?: string | undefined;
  BETTER_AUTH_URL?: string | undefined;
  SUPER_ADMIN_SETUP_TOKEN?: string | undefined;
  PG_HOST?: string | undefined;
  PG_PORT?: string | number | undefined;
  PG_USER?: string | undefined;
  PG_PASSWORD?: string | undefined;
  PG_DATABASE?: string | undefined;
  DATABASE_URL?: string | undefined;
  MYSQL_HOST?: string | undefined;
  MYSQL_PORT?: string | number | undefined;
  MYSQL_USER?: string | undefined;
  MYSQL_PASSWORD?: string | undefined;
  MYSQL_DATABASE?: string | undefined;
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_CLIENT_SECRET?: string | undefined;
};

type CloudflareRequest = Request & {
  runtime?: { cloudflare?: { env?: AuthEnvironment } };
};

let pool: pg.Pool | null = null;
let database: any = null;

export function getAuthEnvironment(request?: Request): AuthEnvironment {
  const cloudflareEnv = request ? (request as CloudflareRequest).runtime?.cloudflare?.env : undefined;
  const envMap = (typeof process !== "undefined" && process?.env ? process.env : {}) as Record<string, string | undefined>;
  return {
    BETTER_AUTH_SECRET:
      cloudflareEnv?.BETTER_AUTH_SECRET ||
      envMap["BETTER_AUTH_SECRET"] ||
      "compliance-guardian-pln-icon-plus-secret-key-32chars",
    BETTER_AUTH_URL:
      cloudflareEnv?.BETTER_AUTH_URL ||
      envMap["BETTER_AUTH_URL"],
    SUPER_ADMIN_SETUP_TOKEN:
      cloudflareEnv?.SUPER_ADMIN_SETUP_TOKEN ||
      envMap["SUPER_ADMIN_SETUP_TOKEN"] ||
      "superadminsetup12345678901234567890123456789012",
    PG_HOST: cloudflareEnv?.PG_HOST || envMap["PG_HOST"] || envMap["MYSQL_HOST"] || "127.0.0.1",
    PG_PORT: cloudflareEnv?.PG_PORT || envMap["PG_PORT"] || envMap["MYSQL_PORT"] || 5432,
    PG_USER: cloudflareEnv?.PG_USER || envMap["PG_USER"] || envMap["MYSQL_USER"] || "deditt",
    PG_PASSWORD: cloudflareEnv?.PG_PASSWORD ?? envMap["PG_PASSWORD"] ?? envMap["MYSQL_PASSWORD"] ?? "",
    PG_DATABASE: cloudflareEnv?.PG_DATABASE || envMap["PG_DATABASE"] || envMap["MYSQL_DATABASE"] || "iconguard",
    DATABASE_URL: cloudflareEnv?.DATABASE_URL || envMap["DATABASE_URL"],
    GOOGLE_CLIENT_ID: cloudflareEnv?.GOOGLE_CLIENT_ID || envMap["GOOGLE_CLIENT_ID"],
    GOOGLE_CLIENT_SECRET: cloudflareEnv?.GOOGLE_CLIENT_SECRET || envMap["GOOGLE_CLIENT_SECRET"],
  };
}

let schemaChecked = false;
async function ensureSchemaUpdated(p: pg.Pool) {
  if (schemaChecked) return;
  schemaChecked = true;
  try {
    await p.query('ALTER TABLE "user" ALTER COLUMN "appRole" SET DEFAULT \'mitra\'');
  } catch {
    /* ignore */
  }
  try {
    await p.query('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "sbu" VARCHAR(100)');
  } catch {
    /* ignore */
  }
  try {
    await p.query('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT \'aktif\'');
  } catch {
    /* ignore */
  }
}

export function getAuthDb(request?: Request): any {
  if (!pool) {
    const env = getAuthEnvironment(request);
    if (env.DATABASE_URL) {
      pool = new pg.Pool({ connectionString: env.DATABASE_URL });
    } else {
      pool = new pg.Pool({
        host: env.PG_HOST || "127.0.0.1",
        port: Number(env.PG_PORT) || 5432,
        user: env.PG_USER || "deditt",
        password: env.PG_PASSWORD || "",
        database: env.PG_DATABASE || "iconguard",
        max: 10,
      });
    }
    void ensureSchemaUpdated(pool);
  }

  if (!database) {
    database = drizzle(pool, { schema: authSchema });
  }

  return database;
}

export function createAuth(request: Request) {
  const env = getAuthEnvironment(request);
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET wajib diisi minimal 32 karakter.");
  }

  const originFromUrl = new URL(request.url).origin;
  const baseURL = env.BETTER_AUTH_URL || originFromUrl;
  const db = getAuthDb(request);

  const requestOrigin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const trustedOrigins: string[] = [
    baseURL,
    originFromUrl,
    "http://localhost:*",
    "https://localhost:*",
    "http://127.0.0.1:*",
    "https://127.0.0.1:*",
    "http://192.168.*:*",
    "https://192.168.*:*",
    "http://10.*:*",
    "https://10.*:*",
    "http://172.*:*",
    "https://172.*:*",
  ];

  if (requestOrigin && !trustedOrigins.includes(requestOrigin)) {
    trustedOrigins.push(requestOrigin);
  }
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!trustedOrigins.includes(refererOrigin)) {
        trustedOrigins.push(refererOrigin);
      }
    } catch {}
  }

  const googlePreRegisteredPlugin = {
    id: "google-pre-registered",
    endpoints: {
      signInGoogleVerified: createAuthEndpoint(
        "/sign-in/google-verified",
        {
          method: "POST",
          body: z.object({
            email: z.string().email(),
          }),
        },
        async (ctx) => {
          const email = ctx.body.email.trim().toLowerCase();
          const result = await ctx.context.internalAdapter.findUserByEmail(email);
          const userRecord = (result as any)?.user;
          if (!userRecord) {
            throw APIError.from("UNAUTHORIZED", {
              code: "UNAUTHORIZED",
              message: `Akun Google (${email}) belum didaftarkan oleh Super Admin. Silakan hubungi Super Admin untuk pendaftaran akun terlebih dahulu.`,
            });
          }
          if (userRecord.banned || userRecord.status === "resign") {
            throw APIError.from("FORBIDDEN", {
              code: "FORBIDDEN",
              message: userRecord.banned
                ? `Akun ini telah dinonaktifkan: ${userRecord.banReason || "Akses ditolak"}`
                : "Akun ini telah berstatus Resign dan tidak memiliki akses ke sistem.",
            });
          }
          const session = await ctx.context.internalAdapter.createSession(userRecord.id, false);
          if (!session) {
            throw APIError.from("INTERNAL_SERVER_ERROR", {
              code: "INTERNAL_SERVER_ERROR",
              message: "Gagal membuat sesi login.",
            });
          }
          await setSessionCookie(ctx, { session, user: userRecord }, false);
          return ctx.json({
            success: true,
            user: userRecord,
            token: session.token,
          });
        }
      ),
    },
  };

  return betterAuth({
    appName: "IconGuard",
    baseURL,
    secret,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    disabledPaths: ["/sign-up/email"],
    user: {
      additionalFields: {
        appRole: { type: "string", required: true, defaultValue: "mitra", input: false },
        organization: { type: "string", required: false, input: false },
        sbu: { type: "string", required: false, input: false },
        status: { type: "string", required: false, defaultValue: "aktif", input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (_data, ctx) => {
            // Blokir registrasi otomatis akun jika berasal dari OAuth / callback luar
            if (ctx?.path?.includes("callback") || ctx?.path?.includes("oauth")) {
              throw new APIError("FORBIDDEN", {
                message: "Akun Google ini belum didaftarkan oleh Super Admin. Silakan hubungi Super Admin untuk pendaftaran akun terlebih dahulu.",
              });
            }
          },
        },
      },
    },
    plugins: [
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
      tanstackStartCookies(),
      googlePreRegisteredPlugin,
    ],
    advanced: {
      useSecureCookies: baseURL.startsWith("https://"),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });
}

