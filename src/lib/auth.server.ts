import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { authSchema } from "@/lib/auth-schema";

type AuthEnvironment = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  SUPER_ADMIN_SETUP_TOKEN?: string;
  MYSQL_HOST?: string;
  MYSQL_PORT?: string | number;
  MYSQL_USER?: string;
  MYSQL_PASSWORD?: string;
  MYSQL_DATABASE?: string;
};

type CloudflareRequest = Request & {
  runtime?: { cloudflare?: { env?: AuthEnvironment } };
};

let pool: mysql.Pool | null = null;
let database: ReturnType<typeof drizzle> | null = null;

export function getAuthEnvironment(request?: Request): AuthEnvironment {
  const cloudflareEnv = request ? (request as CloudflareRequest).runtime?.cloudflare?.env : undefined;
  return {
    BETTER_AUTH_SECRET:
      cloudflareEnv?.BETTER_AUTH_SECRET ||
      process.env.BETTER_AUTH_SECRET ||
      "compliance-guardian-pln-icon-plus-secret-key-32chars",
    BETTER_AUTH_URL:
      cloudflareEnv?.BETTER_AUTH_URL ||
      process.env.BETTER_AUTH_URL,
    SUPER_ADMIN_SETUP_TOKEN:
      cloudflareEnv?.SUPER_ADMIN_SETUP_TOKEN ||
      process.env.SUPER_ADMIN_SETUP_TOKEN ||
      "superadminsetup12345678901234567890123456789012",
    MYSQL_HOST: cloudflareEnv?.MYSQL_HOST || process.env.MYSQL_HOST || "127.0.0.1",
    MYSQL_PORT: cloudflareEnv?.MYSQL_PORT || process.env.MYSQL_PORT || 3306,
    MYSQL_USER: cloudflareEnv?.MYSQL_USER || process.env.MYSQL_USER || "root",
    MYSQL_PASSWORD: cloudflareEnv?.MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || "",
    MYSQL_DATABASE: cloudflareEnv?.MYSQL_DATABASE || process.env.MYSQL_DATABASE || "iconguard",
  };
}

export function getAuthDb(request?: Request) {
  if (!pool) {
    const env = getAuthEnvironment(request);
    pool = mysql.createPool({
      host: env.MYSQL_HOST,
      port: Number(env.MYSQL_PORT),
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  if (!database) {
    database = drizzle(pool, { schema: authSchema, mode: "default" });
  }

  return database;
}

export function createAuth(request: Request) {
  const env = getAuthEnvironment(request);
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET wajib diisi minimal 32 karakter.");
  }

  const baseURL = env.BETTER_AUTH_URL ?? new URL(request.url).origin;
  const db = getAuthDb(request);

  return betterAuth({
    appName: "IconGuard",
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, {
      provider: "mysql",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
    },
    disabledPaths: ["/sign-up/email"],
    user: {
      additionalFields: {
        appRole: { type: "string", required: true, defaultValue: "mitra", input: false },
        organization: { type: "string", required: false, input: false },
      },
    },
    plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] }), tanstackStartCookies()],
    advanced: {
      useSecureCookies: baseURL.startsWith("https://"),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });
}
