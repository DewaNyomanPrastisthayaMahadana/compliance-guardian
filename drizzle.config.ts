import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/auth-schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.PG_HOST || "127.0.0.1",
    port: Number(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER || "deditt",
    password: process.env.PG_PASSWORD || "",
    database: process.env.PG_DATABASE || "iconguard",
    ssl: false,
  },
});
