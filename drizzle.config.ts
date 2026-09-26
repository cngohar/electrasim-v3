import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'sqlite',
  schema: './packages/db/schema.ts',
  out: './migrations',
  verbose: true,
});
