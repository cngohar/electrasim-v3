import { describe, expect, it } from 'vitest';
import { dateValue, grantState, removalMessage } from './client';
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
