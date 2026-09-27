import { validFeatureConfig } from '@electrasim/access';
import { HTTPException } from 'hono/http-exception';

export type Data = Record<string, unknown>;
export function invalid(message: string): never {
  throw new HTTPException(400, { message });
}
export function object(value: unknown): Data {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Expected an object');
  return value as Data;
}
export function keys(data: Data, allowed: readonly string[]) {
  for (const key of Object.keys(data))
    if (!allowed.includes(key)) invalid(`Unsupported field: ${key}`);
}
export function string(value: unknown, field: string, max = 200, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
    invalid(`Invalid ${field}`);
  return value.trim();
}
export function integer(
  value: unknown,
  field: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    invalid(`Invalid ${field}`);
  return value;
}
export function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') invalid(`Invalid ${field}`);
  return value;
}
function choice(value: unknown, field: string, choices: string[]) {
  if (typeof value !== 'string' || !choices.includes(value)) invalid(`Invalid ${field}`);
  return value;
}
function localized(value: unknown, field: string, empty = false) {
  const data = object(value);
  if (!Object.hasOwn(data, 'en') || Object.keys(data).length > 40)
    invalid(`${field} requires en and at most 40 locales`);
  for (const [locale, text] of Object.entries(data)) {
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) invalid('Invalid locale');
    string(text, field, empty ? 2000 : 200, empty);
  }
  return data;
}
export type FeatureInput = { featureKey: string; enabled: boolean; config: Data };
export function featureList(value: unknown): FeatureInput[] {
  if (!Array.isArray(value) || value.length > 40) invalid('Invalid features');
  const seen = new Set<string>();
  return value.map((item) => {
    const data = object(item);
    keys(data, ['featureKey', 'enabled', 'config']);
    const featureKey = string(data.featureKey, 'featureKey', 80);
    if (seen.has(featureKey)) invalid('Duplicate feature');
    seen.add(featureKey);
    const config = object(data.config ?? {});
    if (Object.keys(config).length) invalid('Boolean benefits accept only empty config');
    return { featureKey, enabled: boolean(data.enabled, 'enabled'), config };
  });
}
export const planFields = [
  'slug',
  'name',
  'description',
  'priceMinor',
  'currency',
  'durationDays',
  'noExpiry',
  'status',
  'features',
];
export function validatePlan(data: Data) {
  const slug = string(data.slug, 'slug', 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) invalid('Invalid slug');
  const noExpiry = boolean(data.noExpiry, 'noExpiry');
  const durationDays = noExpiry ? null : integer(data.durationDays, 'durationDays', 1, 36500);
  if (noExpiry && data.durationDays != null) invalid('No-expiry plan must have null durationDays');
  const priceMinor =
    data.priceMinor == null ? null : integer(data.priceMinor, 'priceMinor', 0, 1_000_000_000);
  const currency = data.currency == null ? null : string(data.currency, 'currency', 3);
  if (
    (priceMinor === null) !== (currency === null) ||
    (currency !== null && !/^[A-Z]{3}$/.test(currency))
  )
    invalid('Price and three-letter currency must be supplied together');
  return {
    slug,
    name: string(data.name, 'name'),
    description: string(data.description ?? '', 'description', 2000, true),
    priceMinor,
    currency,
    durationDays,
    noExpiry,
    status: choice(data.status, 'status', ['draft', 'active', 'archived']),
  };
}
export const benefitFields = [
  'key',
  'handler',
  'name',
  'description',
  'enabled',
  'sortOrder',
  'archived',
];
export function validateBenefit(data: Data) {
  const key = string(data.key, 'key', 80);
  if (!/^[a-z][a-z0-9_]*$/.test(key)) invalid('Invalid feature key');
  const handler = string(data.handler, 'handler', 80);
  if (!validFeatureConfig(handler, {})) invalid('Unsupported benefit handler');
  return {
    key,
    handler,
    name: localized(data.name, 'name'),
    description: localized(data.description ?? { en: '' }, 'description', true),
    enabled: boolean(data.enabled, 'enabled'),
    sortOrder: integer(data.sortOrder ?? 0, 'sortOrder', 0, 10000),
  };
}
export const grantFields = ['userId', 'planId', 'status', 'startsAt', 'endsAt', 'noExpiry'];
export function validateGrant(data: Data) {
  const startsAt = integer(data.startsAt, 'startsAt', 0, 8_640_000_000_000_000);
  const noExpiry = boolean(data.noExpiry, 'noExpiry');
  const endsAt =
    data.endsAt === null ? null : integer(data.endsAt, 'endsAt', 0, 8_640_000_000_000_000);
  if (noExpiry ? endsAt !== null : endsAt === null || endsAt <= startsAt)
    invalid('Require endsAt > startsAt or explicit noExpiry with null endsAt');
  return {
    userId: string(data.userId, 'userId', 100),
    planId: string(data.planId, 'planId', 100),
    status: choice(data.status, 'status', ['active', 'suspended', 'revoked']),
    startsAt,
    endsAt,
    noExpiry,
  };
}
export function pagination(query: Record<string, string>) {
  function parse(key: string, fallback: number, max: number) {
    if (query[key] === undefined) return fallback;
    if (!/^\d+$/.test(query[key])) invalid(`Invalid ${key}`);
    return integer(Number(query[key]), key, key === 'limit' ? 1 : 0, max);
  }
  return { limit: parse('limit', 30, 100), offset: parse('offset', 0, 1_000_000) };
}
