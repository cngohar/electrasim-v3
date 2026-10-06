import { simulate } from '@electrasim/domain/simulation';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  threePhaseAcceptanceCircuits,
  threePhaseStarFixture,
} from '../../../../packages/domain/src/core/threePhaseFixtures';
import { PhasorReadings, PhasorWireReadings } from './PhasorReadings';

describe('complex RMS inspector', () => {
  it('shows named phase pairs, signed power and balanced neutral current', () => {
    const { container } = render(
      <PhasorReadings componentId="s" result={simulate(threePhaseStarFixture())} />,
    );
    expect(
      container.querySelector('[data-phase-reading="L2-N"] [data-reading="voltage"]'),
    ).toHaveTextContent('230 V');
    expect(container.querySelector('[data-voltage-pair="L1-L2"]')).toHaveTextContent('398.3717 V');
    expect(container.querySelector('[data-reading="neutral-current"]')).toHaveTextContent('0 A');
    expect(screen.getByText(/automatic trips, damage and repair/)).toBeVisible();
    expect(
      container.querySelector('[data-phase-reading="L1-N"] [data-reading="power"]')?.textContent,
    ).toMatch(/^-/);
  });
  it('shows wire RMS current and finite loss separately from gauge potentials', () => {
    const circuit = threePhaseStarFixture();
    const { container } = render(
      <PhasorWireReadings
        wire={circuit.wires[0]!}
        components={circuit.components}
        result={simulate(circuit)}
      />,
    );
    expect(container.querySelector('[data-reading="current"]')).toHaveTextContent('9.9395 A');
    expect(container.querySelector('[data-reading="power"]')).toHaveTextContent('6.9156 W');
    expect(screen.getByText(/mathematical reference/)).toBeVisible();
  });
  it('withholds motor/unsupported readings instead of displaying zeros', () => {
    render(
      <PhasorReadings
        componentId="motor"
        result={simulate(threePhaseAcceptanceCircuits()['single-live-motor']!)}
      />,
    );
    expect(screen.getByText('Measurements unavailable')).toBeVisible();
    expect(screen.queryByText('0 A')).toBeNull();
  });
});
