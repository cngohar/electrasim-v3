import { COMPONENT_DEFS, normalizeCircuitFaults } from '@electrasim/domain';
import { exportJSON } from '@electrasim/domain/circuitFormat';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { downloadText } from '../../lib/exportImport';
import { basicCopy, premiumComponents, saveRecovery } from '../../store/circuitRecovery';
import { clearHistory, useCircuitStore } from '../../store/circuitStore';
import {
  accessMessage,
  isCircuitReadOnly,
  refreshAccess,
  useSimulatorAccess,
} from '../../store/simulatorAccess';

export function SimulatorAccessBanner() {
  const access = useSimulatorAccess();
  const circuit = useCircuitStore(
    useShallow((s) => ({
      components: s.components,
      wires: s.wires,
      faults: s.faults,
      globalVoltage: s.globalVoltage,
      supply: s.supply,
    })),
  );
  const [copying, setCopying] = useState(false);
  const [removeComponents, setRemoveComponents] = useState<string[]>([]);
  const [removeFaults, setRemoveFaults] = useState<string[]>([]);
  const readOnly = isCircuitReadOnly(circuit);
  if (!readOnly && !access.message && !access.pending) return null;
  const toggle = (values: string[], id: string) =>
    values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
  return (
    <aside
      aria-label="Membership and recovery"
      data-canvas-occluder
      className="fixed left-1/2 top-20 z-40 max-h-[65vh] w-[min(520px,90vw)] -translate-x-1/2 overflow-auto rounded-xl border border-amber-400 bg-white p-3 text-sm text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100"
    >
      <output className="block">
        {readOnly
          ? 'This circuit is read-only. An active membership is needed to edit or run its premium content.'
          : access.pending
            ? 'Checking membership…'
            : access.message}
      </output>
      {readOnly && access.message && <p>{access.message}</p>}
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          className="underline"
          onClick={() =>
            downloadText(exportJSON(circuit), 'circuit-backup.electrasim.json', 'application/json')
          }
        >
          Export original
        </button>
        {readOnly && (
          <button type="button" className="underline" onClick={() => setCopying(!copying)}>
            Create basic copy
          </button>
        )}
        <button type="button" className="underline" onClick={() => void refreshAccess()}>
          Refresh membership
        </button>
        {!readOnly && (
          <button type="button" className="underline" onClick={() => accessMessage(null)}>
            Dismiss
          </button>
        )}
      </div>
      {copying && (
        <div className="mt-3 space-y-2">
          <p>
            Choose what to remove. Connected wires are removed with a component. The original will
            be backed up before opening the copy.
          </p>
          {premiumComponents(circuit).map((component) => (
            <label className="block" key={component.id}>
              <input
                type="checkbox"
                checked={removeComponents.includes(component.id)}
                onChange={() => setRemoveComponents(toggle(removeComponents, component.id))}
              />{' '}
              Remove {component.state.autoLabel ?? COMPONENT_DEFS[component.type].label} (
              {component.id})
            </label>
          ))}
          {normalizeCircuitFaults(circuit).map((fault) => (
            <label className="block" key={fault.id}>
              <input
                type="checkbox"
                checked={removeFaults.includes(fault.id)}
                onChange={() => setRemoveFaults(toggle(removeFaults, fault.id))}
              />{' '}
              Remove {fault.type} ({fault.id})
            </label>
          ))}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void (async () => {
                try {
                  const original = useCircuitStore.getState();
                  const copy = basicCopy(original, removeComponents, removeFaults);
                  await saveRecovery(original);
                  if (
                    original.components !== useCircuitStore.getState().components ||
                    original.wires !== useCircuitStore.getState().wires ||
                    original.faults !== useCircuitStore.getState().faults
                  )
                    throw new Error('Circuit changed; retry the copy.');
                  const { useDiagnosisStore } = await import('../../store/diagnosisStore');
                  useDiagnosisStore.getState().exit();
                  useCircuitStore.getState().setCircuit(copy);
                  clearHistory();
                  setCopying(false);
                  accessMessage(
                    'Basic copy opened. The original backup is available under Saved circuits.',
                  );
                } catch (error) {
                  accessMessage(
                    error instanceof Error ? error.message : 'Could not preserve the original.',
                  );
                }
              })();
            }}
          >
            Back up original and open basic copy
          </button>
        </div>
      )}
    </aside>
  );
}
