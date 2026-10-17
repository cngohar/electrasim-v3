import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { damageCircuit } from '../../../packages/domain/src/core/damageFixtures';
import { selectCircuit, useCircuitStore } from '../../store/circuitStore';
import { useElectricalEditing } from '../../store/electricalEditing';
import { notificationUndoAvailable, useUiStore } from '../../store/uiStore';
import { UndoToast } from './UndoToast';

beforeEach(() => {
  vi.useFakeTimers();
  useElectricalEditing.setState({ notice: null, reviewOpen: false });
  useUiStore.setState({ notifications: [], notificationHistory: [], logs: [], undoToast: null });
});
afterEach(() => {
  useUiStore.setState({ notifications: [], notificationHistory: [], undoToast: null });
  vi.useRealTimers();
});

describe('shared user-action notifications', () => {
  it('creates one labelled severity toast and one retained Console entry', () => {
    useUiStore.getState().addLog('Import could not be read', 'error');
    render(<UndoToast />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error');
    expect(alert).toHaveTextContent('Import could not be read');
    expect(alert.querySelector('svg')).toBeTruthy();
    fireEvent.click(within(alert).getByRole('button', { name: 'Dismiss error notification' }));
    expect(useUiStore.getState().notifications).toHaveLength(0);
    expect(useUiStore.getState().logs).toHaveLength(1);
  });
  it('expires after five seconds and composes hover/focus pause without losing remaining time', () => {
    useUiStore.getState().addLog('Settings saved', 'success');
    render(<UndoToast />);
    act(() => vi.advanceTimersByTime(2000));
    const toast = screen.getByRole('status');
    fireEvent.mouseEnter(toast);
    fireEvent.focus(within(toast).getByRole('button', { name: 'View Console' }));
    act(() => vi.advanceTimersByTime(6000));
    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('status')).toBeVisible();
    fireEvent.blur(within(toast).getByRole('button', { name: 'View Console' }), {
      relatedTarget: document.body,
    });
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByRole('status')).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(useUiStore.getState().logs).toHaveLength(1);
  });
  it('keeps progress until completion, then starts its five-second expiry', () => {
    const id = useUiStore
      .getState()
      .notify({ message: 'Importing…', type: 'info', progress: true });
    render(<UndoToast />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    act(() => {
      useUiStore.getState().notify({ id, message: 'Import complete', type: 'success' });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Import complete');
    expect(useUiStore.getState().logs).toHaveLength(1);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByRole('status')).toBeNull();
    expect(useUiStore.getState().logs[0]!.type).toBe('success');
  });
  it('coalesces addLog/Undo callers and preserves Undo when informational events arrive', () => {
    useUiStore.getState().addLog('Wire deleted.', 'info');
    useUiStore.getState().showUndoToast('Wire deleted');
    const undo = useUiStore.getState().notifications[0]!;
    useUiStore.getState().showNoticeToast('Pro interface selected');
    render(<UndoToast />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeVisible();
    expect(useUiStore.getState().logs).toHaveLength(2);
    expect(notificationUndoAvailable(undo.id)).toBe(true);
  });
  it('does not use an old toast to undo a newer edit', () => {
    useUiStore.getState().showUndoToast('First edit');
    const id = useUiStore.getState().notifications[0]!.id;
    const history = useCircuitStore.temporal.getState();
    useCircuitStore.temporal.setState({ pastStates: [...history.pastStates] });
    expect(notificationUndoAvailable(id)).toBe(false);
    render(<UndoToast />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText(/newer edit changed the Undo history/)).toBeVisible();
    expect(useCircuitStore.temporal.getState().pastStates).toEqual(history.pastStates);
  });
  it('suppresses repeated same-revision solver findings and bounds Console/burst history', () => {
    const ui = useUiStore.getState();
    for (let i = 0; i < 20; i++) {
      ui.notify({ message: 'Operating range', type: 'warning', key: 'revision-a:range' });
      vi.advanceTimersByTime(1000);
    }
    expect(useUiStore.getState().logs).toHaveLength(1);
    ui.notify({ message: 'Operating range', type: 'warning', key: 'revision-b:range' });
    expect(useUiStore.getState().logs).toHaveLength(2);
    for (let i = 0; i < 120; i++) ui.addLog(`Event ${i}`, 'info');
    expect(useUiStore.getState().logs).toHaveLength(100);
    expect(useUiStore.getState().notificationHistory).toHaveLength(100);
    expect(useUiStore.getState().notifications).toHaveLength(3);
  });
  it('opens Console and preserves its entry after the toast action', () => {
    useUiStore.getState().addLog('Wire connected', 'info');
    render(<UndoToast />);
    fireEvent.click(screen.getByRole('button', { name: 'View Console' }));
    expect(useUiStore.getState().logOpen).toBe(true);
    expect(useUiStore.getState().logs).toHaveLength(1);
    expect(useUiStore.getState().notifications).toHaveLength(0);
  });
  it('retains electrical-change Review and disables its Undo after a newer edit', () => {
    useUiStore.setState({ simRunning: false });
    useCircuitStore.getState().setCircuit(damageCircuit());
    const component = useCircuitStore.getState().components[0]!;
    act(() => {
      useCircuitStore.getState().moveComponent(component.id, component.x + 20, component.y);
    });
    useElectricalEditing.setState({
      notice: {
        message: 'Supply changed from 230 V to 12 V. Review ratings.',
        after: selectCircuit(useCircuitStore.getState()),
        historyEntry: useCircuitStore.temporal.getState().pastStates.at(-1),
      },
    });
    useUiStore.getState().notify({
      message: 'Supply changed from 230 V to 12 V. Review ratings.',
      type: 'info',
      showUndo: true,
      reviewCircuit: true,
    });
    render(<UndoToast />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    act(() => {
      useCircuitStore.getState().moveComponent(component.id, component.x + 40, component.y);
    });
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(useElectricalEditing.getState().reviewOpen).toBe(true);
    expect(useUiStore.getState().notifications).toHaveLength(0);
    expect(
      useUiStore.getState().logs.some((entry) => entry.message.startsWith('Supply changed')),
    ).toBe(true);
  });
  it('navigates to the actual target and disables Inspect when that target disappears', () => {
    useCircuitStore.getState().setCircuit(damageCircuit());
    useUiStore.getState().addLog('Broken conductor', 'warning', { type: 'wire', id: 'load-feed' });
    render(<UndoToast />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    expect(useCircuitStore.getState().selectedWireIds).toEqual(['load-feed']);
    act(() => {
      useUiStore.getState().addLog('Removed conductor', 'warning', { type: 'wire', id: 'deleted' });
    });
    expect(screen.getByRole('button', { name: 'Inspect' })).toBeDisabled();
  });
});
