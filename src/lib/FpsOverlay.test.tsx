import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FpsOverlay } from './FpsOverlay';

describe('FpsOverlay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays hidden when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is disabled', 'SecurityError');
    });

    const { container } = render(<FpsOverlay />);

    expect(container.firstChild).toBeNull();
  });
});
