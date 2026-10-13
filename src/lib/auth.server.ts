import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/d1";
import { authSchema } from "@/lib/auth-schema";

type D1Binding = Parameters<typeof drizzle>[0];
type AuthEnvironment = {
  DB?: D1Binding;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  SUPER_ADMIN_SETUP_TOKEN?: string;
};
type CloudflareRequest = Request & {
  runtime?: { cloudflare?: { env?: AuthEnvironment } };
};

const databases = new WeakMap<object, ReturnType<typeof drizzle>>();

export function getAuthEnvironment(request: Request): AuthEnvironment {
  const env = (request as CloudflareRequest).runtime?.cloudflare?.env;
  if (!env) throw new Error("Environment Cloudflare tidak tersedia pada request.");
  return env;
}

export function getAuthDb(request: Request) {
  const binding = getAuthEnvironment(request).DB;
  if (!binding) throw new Error("Binding D1 'DB' belum dikonfigurasi di Cloudflare.");

  let database = databases.get(binding);
  if (!database) {
    database = drizzle(binding, { schema: authSchema });
    databases.set(binding, database);
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

  return betterAuth({
    appName: "IconGuard",
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(getAuthDb(request), {
      provider: "sqlite",
      schema: authSchema,
      transaction: false,
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
