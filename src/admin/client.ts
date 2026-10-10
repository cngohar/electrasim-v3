export type Row = Record<string, unknown>;
export type Resource = 'plans' | 'features' | 'memberships';
export type View = Resource | 'audit';
export type Page = { items: Row[]; total: number };
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(path: string, method = 'GET', body?: Row): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(response.status, data.error?.message ?? data.error ?? 'Request failed');
  return data as T;
}
export function identifier(row: Row) {
  return String(row.id ?? row.key);
}
export function label(row: Row) {
  return typeof row.name === 'object' && row.name
    ? String((row.name as Row).en)
    : String(row.name ?? row.userId ?? row.action ?? identifier(row));
}
export function grantState(row: Row, now = Date.now()) {
  if (row.status === 'revoked') return 'revoked';
  if (row.status === 'suspended') return 'suspended';
  if (Number(row.startsAt) > now) return 'scheduled';
  if (row.endsAt != null && Number(row.endsAt) <= now) return 'expired';
  return 'active';
}
export function dateInput(value: unknown) {
  return value == null ? '' : new Date(Number(value)).toISOString().slice(0, 16);
}
export function dateValue(value: FormDataEntryValue | null) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value)))
    throw new Error('Enter a valid UTC date and time.');
  const time = Date.parse(`${String(value)}:00Z`);
  if (!Number.isFinite(time)) throw new Error('Enter a valid UTC date and time.');
  return time;
}
export function removalMessage(resource: Resource, row: Row) {
  if (resource === 'memberships')
    return 'Revoke this grant. Its contribution to access ends on the next protected action. Other grants remain effective; history is retained.';
  if (resource === 'plans')
    return row.status === 'draft' && row.grantCount === 0
      ? 'Delete this unused draft. Its audit history is retained.'
      : 'Archive this plan. New assignments stop; existing grants and capabilities remain.';
  return row.referenceCount === 0
    ? 'Delete this unreferenced benefit. Its audit history is retained.'
    : 'Archive this benefit from marketing and new attachments. Existing capabilities remain; disable it to remove access.';
}
