import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, dateValue, grantState, removalMessage, request } from './client';
afterEach(() => vi.unstubAllGlobals());
describe('administrative service responses', () => {
  it('reports an empty failed proxy response without a JSON parser error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(request('admin/access')).rejects.toThrow('incomplete response');
  });
  it('retains an empty denial status so callers still clear private data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    await expect(request('admin/access')).rejects.toMatchObject({ status: 403 });
  });
  it('rejects malformed successful responses as a service error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>unavailable</html>', { status: 200 })),
    );
    await expect(request('admin/access')).rejects.toBeInstanceOf(ApiError);
  });
});
describe('administrative lifecycle descriptions', () => {
  it('distinguishes draft deletion, referenced archive, and grant revocation', () => {
    expect(removalMessage('plans', { status: 'draft', grantCount: 0 })).toContain('Delete');
    expect(removalMessage('plans', { status: 'draft', grantCount: 1 })).toContain('Archive');
    expect(removalMessage('plans', { status: 'active', grantCount: 0 })).toContain('Archive');
    expect(removalMessage('features', { referenceCount: 2 })).toContain(
      'Existing capabilities remain',
    );
    expect(removalMessage('memberships', {})).toContain('Other grants remain');
  });
  it('shows scheduled, exclusive expiry, suspended and terminal revoked states', () => {
    const row = { status: 'active', startsAt: 100, endsAt: 200 };
    expect(grantState(row, 99)).toBe('scheduled');
    expect(grantState(row, 100)).toBe('active');
    expect(grantState(row, 200)).toBe('expired');
    expect(grantState({ ...row, status: 'suspended' }, 150)).toBe('suspended');
    expect(grantState({ ...row, status: 'revoked' }, 150)).toBe('revoked');
  });
  it('interprets date fields in explicit UTC regardless of local timezone', () => {
    expect(dateValue('2030-01-02T03:04')).toBe(Date.UTC(2030, 0, 2, 3, 4));
    expect(() => dateValue('')).toThrow('valid UTC');
  });
});
