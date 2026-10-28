import { ApiError } from '../admin/client';
export { ApiError };
export async function profileResponse<T>(response: Response): Promise<T> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.ok ? 502 : response.status,
      'The profile service returned an incomplete response. Reload and try again.',
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status,
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Profile request failed',
    );
  return data as T;
}
export async function profileRequest<T>(
  path: string,
  method = 'GET',
  body?: Record<string, unknown>,
): Promise<T> {
  return profileResponse<T>(
    await fetch(`/api/${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}
