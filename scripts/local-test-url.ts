/** Keep browser test targets on this machine while V3 has no deployment account. */
export function localTestUrl(
  value: string | undefined,
  fallback: string,
  variable: string,
): string {
  const target = new URL(value ?? fallback);
  if (
    !['http:', 'https:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.username ||
    target.password
  ) {
    throw new Error(`${variable} must point to localhost during local-only development.`);
  }
  return target.toString().replace(/\/$/, '');
}
