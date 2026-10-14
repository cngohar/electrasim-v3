import { heaterFixture } from '@electrasim/domain/core/operatingPointFixtures';
import { simulate } from '@electrasim/domain/simulation';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { selectCircuit, useCircuitStore } from '../../store/circuitStore';
import { useElectricalEditing } from '../../store/electricalEditing';
import { useUiStore } from '../../store/uiStore';
import { SimulationFeedback } from './SimulationFeedback';

beforeEach(() => {
  useElectricalEditing.setState({ reviewOpen: false });
  useUiStore.setState({ simResult: null, simRunning: false });
});

function circuitFor(type: string, voltage = 12) {
  const circuit = heaterFixture();
  circuit.components[0]!.state = { customVoltage: voltage };
  circuit.components[1]!.type = type;
  circuit.components[1]!.state = {};
  return circuit;
}

it('names the missing LED simulation and the 12 V versus 230 V difference with the Console closed', () => {
  const circuit = circuitFor('bulb');
  useCircuitStore.getState().setCircuit(circuit);
  const result = simulate(selectCircuit(useCircuitStore.getState()));
  useUiStore.setState({ simResult: result, simRunning: true, logOpen: false });
  render(<SimulationFeedback />);
  expect(screen.getByRole('status')).toHaveTextContent('Simulation unavailable');
  expect(screen.getByRole('status')).toHaveTextContent('LED Bulb (9W)');
  expect(screen.getByRole('status')).toHaveTextContent(
    '12 V differs from the device design voltage 230 V',
  );
  expect(result.electrical?.status).toBe('unsupported');
  expect(result.componentCalculations).toBeUndefined();
  expect(result.energizedComponents.size).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'View findings' }));
  expect(useElectricalEditing.getState().reviewOpen).toBe(true);
});

it('reports other missing component models and hides feedback immediately for changed electrical inputs', () => {
  const circuit = circuitFor('ceiling-fan', 230);
  useCircuitStore.getState().setCircuit(circuit);
  useUiStore.setState({
    simResult: simulate(selectCircuit(useCircuitStore.getState())),
    simRunning: true,
  });
  render(<SimulationFeedback />);
  expect(screen.getByRole('status')).toHaveTextContent('Ceiling Fan');
  act(() => useCircuitStore.setState({ globalVoltage: 24 }));
  expect(screen.queryByRole('status')).toBeNull();
});

it('keeps a solved incandescent result visible without claiming its missing ratings prevent calculation', () => {
  const circuit = circuitFor('bulb-incandescent');
  useCircuitStore.getState().setCircuit(circuit);
  const result = simulate(selectCircuit(useCircuitStore.getState()));
  useUiStore.setState({ simResult: result, simRunning: true });
  render(<SimulationFeedback />);
  expect(result.electrical?.status).toBe('converged');
  expect(result.componentCalculations?.heater.powerWatts).toBeLessThan(1);
  expect(screen.queryByRole('status')).toBeNull();
});
