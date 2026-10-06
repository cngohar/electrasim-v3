import { simulate } from '@electrasim/domain/simulation';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  motorAcceptanceCircuits,
  motorCircuit,
} from '../../../../packages/domain/src/core/motorFixtures';
import {
  threePhaseAcceptanceCircuits,
  threePhaseStarFixture,
} from '../../../../packages/domain/src/core/threePhaseFixtures';
import { PhasorReadings, PhasorWireReadings } from './PhasorReadings';

describe('complex RMS inspector', () => {
  it('explains unavailable residuals across independent source references', () => {
    const { container } = render(
      <PhasorReadings
        componentId="p"
        result={simulate(motorAcceptanceCircuits()['independent-poles']!)}
      />,
    );
    expect(container.querySelector('[data-reading="residual"]')).toHaveTextContent('Unavailable');
    expect(screen.getByText(/sensed currents use independent source references/)).toBeVisible();
  });
  it('shows running and blocked motor teaching states with actual line currents and limitations', () => {
    const view = render(<PhasorReadings componentId="motor" result={simulate(motorCircuit())} />);
    expect(view.container.querySelector('[data-motor-state="running"]')).toHaveTextContent(
      'L1 / L2 / L3',
    );
    expect(view.container.querySelector('[data-motor-line="0"]')).toHaveTextContent('4.3245 A');
    expect(screen.getByText(/Declared balanced unity-power-factor/)).toBeVisible();
    view.rerender(
      <PhasorReadings
        componentId="motor"
        result={simulate(motorAcceptanceCircuits()['lost-phase']!)}
      />,
    );
    expect(view.container.querySelector('[data-motor-state="blocked"]')).toHaveTextContent(
      'L1 / missing / L3',
    );
  });
  it('shows coil consumption, sensed pole RMS current and residual mA without an automatic-trip claim', () => {
    const result = simulate(motorCircuit(true), { deltaSeconds: 1 });
    const { container } = render(<PhasorReadings componentId="k" result={result} />);
    expect(container.querySelector('[data-phasor-control="k"]')).toHaveTextContent('closed');
    expect(container.querySelector('[data-reading="residual"]')).toHaveTextContent('0 mA');
    expect(container.querySelector('[data-reading="pole-current"]')).toHaveTextContent('4.3188 A');
    expect(container.querySelector('[data-phasor-poles="k"]')).toHaveTextContent(
      'Automatic clearing: unassessed',
    );
  });
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
