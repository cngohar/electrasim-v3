import { heaterFixture } from '@electrasim/domain/core/operatingPointFixtures';
import { simulate } from '@electrasim/domain/simulation';
import type { SimulationResult } from '@electrasim/domain/types';
import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../store';
import { labGlassLight } from '../theme';
import { ComponentNode } from './ComponentNode';

const previousMode = useSettingsStore.getState().diagnosticOverlayMode;
afterEach(() => useSettingsStore.setState({ diagnosticOverlayMode: previousMode }));

function heatCard(result: SimulationResult) {
  useSettingsStore.setState({ diagnosticOverlayMode: 'heat' });
  const circuit = heaterFixture();
  const heater = circuit.components[1]!;
  return render(
    <svg role="img" aria-label="Heater thermal readings">
      <ComponentNode
        component={heater}
        componentsById={new Map(circuit.components.map((c) => [c.id, c]))}
        simulation={result}
        theme={labGlassLight}
        selected={false}
        energized={result.energizedComponents.has(heater.id)}
        error={false}
        wireMode={false}
        pendingFrom={null}
        customPathFrom={null}
        activeLoadEffects={false}
        reducedDetails={false}
        onPointerDown={vi.fn()}
        onPortClick={vi.fn()}
        onHoverChange={vi.fn()}
        onContextMenu={vi.fn()}
      />
    </svg>,
  );
}

it('does not invent a temperature for a solved resistive heater without a thermal law', () => {
  const result = simulate(heaterFixture());
  expect(result.componentCalculations?.heater.powerWatts).toBeGreaterThan(1900);
  expect(result.thermalData).toBeUndefined();
  expect(heatCard(result).container.textContent).not.toContain('°C');
});

it('does not display retained legacy temperatures as current measurements', () => {
  const result = simulate(heaterFixture());
  result.legacyObservation = { engineVersion: 'legacy-rail-1.5b', reason: 'historical' };
  result.thermalData = {
    heater: { temperature: 85, powerWatts: 2000, maxTemperature: 100, colorCode: '#ef4444' },
  };
  expect(heatCard(result).container.textContent).not.toContain('°C');
});
