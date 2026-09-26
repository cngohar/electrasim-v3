// Drizzle D1 helper — creates a drizzle instance from the D1 binding.
// Usage inside Worker handler: `const db = createDrizzle(c.env.DB);`
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import * as schema from './schema';

export function createDrizzle(d1: unknown) {
  return drizzleD1(d1, { schema });
}

export type DrizzleDB = ReturnType<typeof createDrizzle>;
