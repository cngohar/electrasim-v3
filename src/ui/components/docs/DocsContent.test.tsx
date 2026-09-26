import { GUIDED_CIRCUIT_TEMPLATES } from '@electrasim/domain/templates';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../../../store';
import { DocsContent } from './DocsContent';
import { buildComponentGroups } from './data';

beforeEach(() => {
  useUiStore.setState({ docsOpen: false, activeGuideId: null });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DocsContent', () => {
  it('lists every guided circuit with open actions and site links', () => {
    render(<DocsContent groups={buildComponentGroups()} />);

    // Both guide groups are present with counts.
    expect(screen.getByText('Getting started')).toBeVisible();
    expect(screen.getByText('Pro toolbox')).toBeVisible();

    // One "Open guide" button per template (18).
    expect(screen.getAllByRole('button', { name: 'Open guide' })).toHaveLength(
      GUIDED_CIRCUIT_TEMPLATES.length,
    );

    // Site walkthrough links exist for the mapped guides and fall back to the
    // templates listing for the rest.
    const walkthroughLinks = screen.getAllByRole('link', { name: /Site walkthrough ↗/ });
    expect(walkthroughLinks.length).toBeGreaterThanOrEqual(6);
    expect(walkthroughLinks[0]).toHaveAttribute(
      'href',
      expect.stringContaining('https://electrasim.com/guide/#circuit-'),
    );
    expect(
      screen.getAllByRole('link', { name: /All guides on the site ↗/ }).length,
    ).toBeGreaterThan(0);
  });

  it('loads a guide into the editor from the docs', () => {
    render(<DocsContent groups={buildComponentGroups()} />);

    // "Simple Protected Lamp" is the first basic guide row.
    const openButton = screen.getAllByRole('button', { name: 'Open guide' })[0];
    expect(openButton).toBeDefined();

    fireEvent.click(openButton!);

    expect(useUiStore.getState().activeGuideId).toBe('simple-lamp');
  });

  it('links the quick-reference sections to the website', () => {
    render(<DocsContent groups={buildComponentGroups()} />);

    const guideLink = screen.getByRole('link', { name: /Full step-by-step guide/ });
    expect(guideLink).toHaveAttribute('href', 'https://electrasim.com/guide/');
    expect(guideLink).toHaveAttribute('target', '_blank');
    expect(guideLink).toHaveAttribute('rel', 'noopener noreferrer');

    // The On the Website destination grid.
    expect(screen.getByRole('heading', { name: 'On the Website' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Voltage drop calculator/ })).toHaveAttribute(
      'href',
      'https://electrasim.com/tools/voltage-drop-calculator/',
    );
    expect(screen.getByRole('link', { name: /Explore — coming in v2\.1/ })).toHaveAttribute(
      'href',
      'https://electrasim.com/explore/',
    );
    expect(screen.getByRole('link', { name: /Blog & changelog/ })).toHaveAttribute(
      'href',
      'https://electrasim.com/blog/',
    );
  });
});
