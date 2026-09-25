import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for migration commands");

export default defineConfig({
  dialect: "postgresql",
  schema: "./packages/database/src/schema.ts",
  out: "./packages/database/migrations/generated",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
