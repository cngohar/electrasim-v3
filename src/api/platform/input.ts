import type { Context } from 'hono';
import type { AdminRegistry } from '../../platform/registry';
import type { ApiEnv } from '../context';
import { invalid, keys, object } from '../membership-validation';

export async function adminInput(c: Context<ApiEnv>, fields: string[]) {
  let value: unknown;
  try {
    value = await c.req.json();
  } catch {
    invalid('Invalid JSON');
  }
  const data = object(value);
  keys(data, ['version', 'reason', ...fields]);
  return data;
}
export function permissionList(registry: AdminRegistry, value: unknown) {
  try {
    return registry.grants(value);
  } catch (error) {
    invalid(error instanceof Error ? error.message : 'Invalid permissions');
  }
}
