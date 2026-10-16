import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/auth-schema.ts",
  out: "./drizzle/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "iconguard",
  },
});
