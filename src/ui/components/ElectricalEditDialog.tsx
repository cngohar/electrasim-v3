import { COMPONENT_DEFS } from '@electrasim/domain';
import { explicitSupplyProfile, resolveDocumentSupply } from '@electrasim/domain/core/supplies';
import {
  previewSupplyChange,
  supplyAtTarget,
  supplyDescription,
} from '@electrasim/domain/core/supplyEditing';
import { previewVariantChange } from '@electrasim/domain/core/variantEditing';
import { useEffect, useRef, useState } from 'react';
import { selectCircuit, undo, useCircuitStore } from '../../store/circuitStore';
import {
  type ElectricalEdit,
  closeElectricalEdit,
  sameCircuitRevision,
  useConfigurationLockReason,
  useElectricalEditing,
} from '../../store/electricalEditing';
import { useCircuitDocument } from '../../store/electricalReadiness';
import { useUiStore } from '../../store/uiStore';
import { CircuitReadinessDetails } from './CircuitReadinessDetails';
import { Modal } from './Modal';
import { ComponentPropertiesView } from './inspector/ComponentPropertiesView';

const buttonClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50 dark:border-slate-600';
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800';
type Request = NonNullable<ReturnType<typeof useElectricalEditing.getState>['request']>;

function EditForm({ request }: { request: Request }) {
  const circuit = useCircuitDocument();
  const initial =
    request.kind === 'supply'
      ? (request.profile ??
        supplyAtTarget(circuit, request.target) ??
        resolveDocumentSupply(circuit))
      : resolveDocumentSupply(circuit);
  const [kind, setKind] = useState(initial.model.kind);
  const [voltage, setVoltage] = useState(String(initial.model.voltage));
  const [frequency, setFrequency] = useState(
    String(initial.model.kind === 'dc' ? 50 : initial.model.frequencyHz),
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const previousRevision = useRef(circuit);
  const [refreshed, setRefreshed] = useState(false);
  const locked = useConfigurationLockReason();
  useEffect(() => {
    if (!sameCircuitRevision(previousRevision.current, circuit)) setRefreshed(true);
    previousRevision.current = circuit;
  }, [circuit]);
  const profile = explicitSupplyProfile(
    kind === 'dc'
      ? { kind, voltage: Number(voltage) }
      : kind === 'ac-three-phase'
        ? { kind, voltage: Number(voltage), frequencyHz: Number(frequency), sequence: 'abc' }
        : { kind, voltage: Number(voltage), frequencyHz: Number(frequency) },
  );
  const supplyPreview =
    request.kind === 'supply' ? previewSupplyChange(circuit, request.target, profile) : null;
  const variantPreview =
    request.kind === 'variant'
      ? previewVariantChange(circuit, request.componentId, request.toType)
      : null;
  const preview = supplyPreview ?? variantPreview!;

  const apply = async () => {
    if (preview.status !== 'ready' || locked || pending) return;
    const edit: ElectricalEdit =
      request.kind === 'supply'
        ? { kind: 'supply', target: request.target, profile }
        : { kind: 'variant', componentId: request.componentId, toType: request.toType };
    setPending(true);
    const applied = await useCircuitStore.getState().applyElectricalEdit(edit, circuit, request.id);
    setPending(false);
    if (!applied) {
      setMessage(
        'The change was not applied. Check membership, edit locks and the refreshed drawing before trying again.',
      );
      return;
    }
    const after = selectCircuit(useCircuitStore.getState());
    const message = supplyPreview?.previous
      ? `Supply changed from ${supplyDescription(supplyPreview.previous)} to ${supplyDescription(profile)}. ${supplyPreview.reviewComponentIds.length} components need review.`
      : `Replaced ${COMPONENT_DEFS[variantPreview?.fromType ?? '']?.label} with ${COMPONENT_DEFS[variantPreview?.toType ?? '']?.label}. Review the connections and ratings.`;
    useUiStore.getState().clearUndoToast();
    useElectricalEditing.setState({
      request: null,
      notice: {
        message,
        after,
        historyEntry: useCircuitStore.temporal.getState().pastStates.at(-1),
      },
    });
  };
  return (
    <Modal
      open
      onClose={closeElectricalEdit}
      title={supplyPreview ? 'Change supply' : 'Replace component variant'}
      description={
        supplyPreview?.targetLabel ??
        'Review the terminal mapping and new device defaults before applying.'
      }
      widthClass="max-w-xl"
      footer={
        <>
          <button type="button" className={buttonClass} onClick={closeElectricalEdit}>
            Cancel
          </button>
          <button
            type="button"
            className={`${buttonClass} bg-blue-600 text-white`}
            disabled={preview.status !== 'ready' || !!locked || pending}
            onClick={() => void apply()}
          >
            {pending
              ? 'Checking membership…'
              : supplyPreview
                ? 'Apply supply change'
                : 'Apply replacement'}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-700 dark:text-slate-200">
        {supplyPreview && (
          <>
            <p>
              Current:{' '}
              <strong>
                {supplyPreview.previous
                  ? supplyDescription(supplyPreview.previous)
                  : 'Unavailable source'}
              </strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Supply kind
                <select
                  aria-label="Supply kind"
                  className={inputClass}
                  value={kind}
                  disabled={pending}
                  onChange={(e) => setKind(e.target.value as typeof kind)}
                >
                  <option value="ac-single-phase">AC single-phase</option>
                  <option value="dc">DC</option>
                  <option value="ac-three-phase" disabled>
                    Three-phase · unavailable
                  </option>
                </select>
              </label>
              <label>
                Voltage (V){kind !== 'dc' && ' RMS'}
                <input
                  aria-label="Supply voltage in volts"
                  className={inputClass}
                  type="number"
                  min="0.001"
                  max="100000"
                  step="any"
                  value={voltage}
                  disabled={pending}
                  onChange={(e) => setVoltage(e.target.value)}
                />
              </label>
              {kind !== 'dc' && (
                <label>
                  Frequency (Hz)
                  <input
                    aria-label="Supply frequency in hertz"
                    className={inputClass}
                    type="number"
                    min="0.001"
                    max="100000"
                    step="any"
                    value={frequency}
                    disabled={pending}
                    onChange={(e) => setFrequency(e.target.value)}
                  />
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {[12, 24, 48, 110, 120, 230, 240].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={buttonClass}
                  disabled={pending}
                  onClick={() => setVoltage(String(v))}
                >
                  {v} V
                </button>
              ))}
            </div>
            <p>
              Device nameplate ratings, wiring and faults stay in place. Results must be assessed
              again after the change.
            </p>
            <p>
              {supplyPreview.sourceComponentIds.length} source aliases/blocks change;{' '}
              {supplyPreview.independentSourceIds.length} independent sources keep their settings.
            </p>
            {supplyPreview.terminalChanges.map((text) => (
              <p key={text}>{text}</p>
            ))}
            <details open>
              <summary>
                Affected parts ({supplyPreview.affectedComponentIds.length}) ·{' '}
                {supplyPreview.reviewComponentIds.length} need review
              </summary>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {supplyPreview.affectedComponentIds.map((id) => {
                  const c = circuit.components.find((c) => c.id === id);
                  const reasons = [
                    ...new Set(
                      supplyPreview.readiness.groups
                        .filter((g) => g.componentId === id)
                        .flatMap((g) => g.result.reasons.map((r) => r.message)),
                    ),
                  ];
                  return (
                    <li key={id}>
                      <strong>
                        {COMPONENT_DEFS[c?.type ?? '']?.label ?? id} · {id}
                      </strong>
                      {reasons.map((r) => (
                        <p key={r}>{r}</p>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </details>
            <p>Three-phase sources require explicit L1/L2/L3 terminals and are unavailable here.</p>
          </>
        )}
        {variantPreview && (
          <>
            <p>
              <strong>{COMPONENT_DEFS[variantPreview.fromType]?.label}</strong> →{' '}
              <strong>{COMPONENT_DEFS[variantPreview.toType]?.label}</strong>
            </p>
            <p>
              This replacement uses the new device’s nameplate, control and protection defaults.
              Custom rating overrides are reset. Injected faults, labels and grouping remain.
            </p>
            <ul>
              {variantPreview.ports.map((p) => (
                <li key={p.from}>
                  {p.label}: terminal {p.from + 1} → {p.to + 1}
                </li>
              ))}
            </ul>
            <p>Connections to review: {variantPreview.wireIds.join(', ') || 'None'}.</p>
            {!!variantPreview.addedPorts.length && (
              <p>
                New unconnected terminals: {variantPreview.addedPorts.join(', ')}. Wire these
                explicitly before expecting a complete path.
              </p>
            )}
            {!!variantPreview.resetFields.length && (
              <p>Reset settings: {variantPreview.resetFields.join(', ')}.</p>
            )}
          </>
        )}
        {refreshed && (
          <output className="block">
            The drawing changed. This preview has been refreshed; review it before applying.
          </output>
        )}
        {preview.reason && <p role="alert">{preview.reason}</p>}
        {preview.status === 'unchanged' && <p>No change to apply.</p>}
        {locked && <p role="alert">{locked}</p>}
        {message && <p role="alert">{message}</p>}
      </div>
    </Modal>
  );
}

export function ElectricalEditDialog() {
  const request = useElectricalEditing((s) => s.request);
  const reviewOpen = useElectricalEditing((s) => s.reviewOpen);
  const notice = useElectricalEditing((s) => s.notice);
  const inspectComponentId = useElectricalEditing((s) => s.inspectComponentId);
  const simResult = useUiStore((s) => s.simResult);
  const locked = useConfigurationLockReason();
  const circuit = useCircuitDocument();
  const [noticeVisible, setNoticeVisible] = useState(true);
  useEffect(() => {
    if (!notice) return;
    setNoticeVisible(true);
    const timer = setTimeout(() => setNoticeVisible(false), 12_000);
    return () => clearTimeout(timer);
  }, [notice]);
  const dismissReview = () => useElectricalEditing.setState({ reviewOpen: false });
  const canUndo =
    notice &&
    sameCircuitRevision(notice.after, circuit) &&
    notice.historyEntry === useCircuitStore.temporal.getState().pastStates.at(-1) &&
    !locked;
  const inspected = circuit.components.find((c) => c.id === inspectComponentId);
  return (
    <>
      {inspected && !request && !reviewOpen && (
        <Modal
          open
          onClose={() => useElectricalEditing.setState({ inspectComponentId: null })}
          title="Component properties"
        >
          <ComponentPropertiesView selectedComp={inspected} simResult={simResult} />
        </Modal>
      )}
      {request && <EditForm key={request.id} request={request} />}
      {reviewOpen && !request && (
        <Modal open onClose={dismissReview} title="Circuit readiness" widthClass="max-w-2xl">
          <CircuitReadinessDetails />
        </Modal>
      )}
      {notice && noticeVisible && !request && !reviewOpen && (
        <output className="fixed bottom-16 left-1/2 z-[45] flex w-[min(580px,calc(100vw-2rem))] -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl bg-slate-900 p-3 text-xs text-white shadow-xl">
          <span className="flex-1">{notice.message}</span>
          <button
            type="button"
            className={buttonClass}
            onClick={() => useElectricalEditing.setState({ reviewOpen: true })}
          >
            Review
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={!canUndo}
            title={
              canUndo
                ? 'Undo this change'
                : 'Later edits exist; use the history controls to undo them first.'
            }
            onClick={() => {
              if (canUndo) {
                undo();
                setNoticeVisible(false);
              }
            }}
          >
            Undo
          </button>
          <button
            type="button"
            aria-label="Dismiss supply notice"
            onClick={() => setNoticeVisible(false)}
          >
            ×
          </button>
        </output>
      )}
    </>
  );
}
