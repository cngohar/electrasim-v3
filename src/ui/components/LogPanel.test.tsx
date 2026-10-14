import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { damageCircuit } from '../../../packages/domain/src/core/damageFixtures';
import { useCircuitStore, useUiStore } from '../../store';
import { LogPanel } from './LogPanel';

function Console() {
  const logs = useUiStore((s) => s.logs);
  return <LogPanel isPhone={false} open simRunning={false} logs={logs} />;
}
beforeEach(() => {
  useUiStore.setState({ logs: [], eventHistory: [], logOpen: true });
  const circuit = damageCircuit();
  circuit.wires[1]!.isBusted = true;
  circuit.wires[1]!.fault = 'open-circuit';
  useCircuitStore.getState().setCircuit(circuit);
});

describe('independent Console', () => {
  it('severity selection filters messages in place', () => {
    useUiStore.getState().addLog('An error', 'error');
    useUiStore.getState().addLog('A warning', 'warning');
    useUiStore.getState().addLog('A detail', 'info');
    render(<Console />);
    fireEvent.click(screen.getByRole('button', { name: 'Errors' }));
    expect(screen.getByText('An error')).toBeVisible();
    expect(screen.queryByText('A warning')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('A warning')).toBeVisible();
  });
  it('clearing messages preserves injected causes, damage and event history', () => {
    useUiStore.getState().addLog('Clearable message', 'warning');
    useUiStore.getState().addEventHistory({
      eventType: 'fault_detected',
      wireId: 'load-feed',
      description: 'Retained event',
      severity: 'warning',
    });
    const events = useUiStore.getState().eventHistory;
    const wires = useCircuitStore.getState().wires;
    render(<Console />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(useUiStore.getState().logs).toEqual([]);
    expect(useUiStore.getState().eventHistory).toBe(events);
    expect(useCircuitStore.getState().wires).toBe(wires);
  });
  it('focus navigation selects an existing wire and disables a deleted target', () => {
    useUiStore.getState().addLog('Broken conductor', 'error', { type: 'wire', id: 'load-feed' });
    useUiStore.getState().addLog('Old conductor', 'error', { type: 'wire', id: 'deleted' });
    useUiStore.getState().addLog('Affected load', 'error', { type: 'component', id: 'lamp' });
    render(<Console />);
    expect(screen.getByRole('button', { name: 'Focus target for Old conductor' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Focus target for Affected load' }));
    expect(useCircuitStore.getState().selectedComponentId).toBe('lamp');
    act(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Focus target for Broken conductor' })),
    );
    expect(useCircuitStore.getState().selectedWireIds).toEqual(['load-feed']);
    expect(useUiStore.getState().logOpen).toBe(false);
  });
});
