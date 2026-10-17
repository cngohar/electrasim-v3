import {
  COMPONENT_DEFS,
  FAULT_REGISTRY,
  type FaultTarget,
  type FaultType,
  assessFaultTarget,
  normalizeCircuitFaults,
} from '@electrasim/domain';
import { circuitRevision, isCurrentSimulation } from '@electrasim/domain/simulationEvidence';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { focusFaultTarget, selectCircuit, undo, useCircuitStore, useUiStore } from '../../../store';
import {
  recordFaultLabEdit,
  rememberFaultResponse,
  useFaultLabStore,
} from '../../../store/faultLabStore';
import { isCircuitReadOnly, useSimulatorAccess } from '../../../store/simulatorAccess';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Modal } from '../Modal';
import { COMPONENT_IMAGES } from '../componentImages';
import { FaultApplicationPreview } from './FaultApplicationPreview';
import { FaultLabStage } from './FaultLabStage';
import FaultRepairPanel from './FaultRepairPanel';
import { InspectorHistoryView } from './InspectorHistoryView';
import {
  captureFaultResponse,
  formatReading,
  responseStages,
  targetKey,
  targetLabel,
} from './faultLabEvidence';
import './fault-lab.css';

type Tab = 'explain' | 'readings' | 'repair';
type Window = 'library' | 'history' | 'photo' | 'leave' | 'help' | null;
const faultName = (type: FaultType) => FAULT_REGISTRY[type].label;
const helpSteps = [
  [
    'Choose what changes',
    'Select a component, conductor or named terminal on the circuit.',
    'm8 5 16 13-9 1-4 8Z',
  ],
  [
    'Review and apply a fault',
    'Check the highlighted location. Applied cards focus the existing cause.',
    'M3 16h8m10 0h8M13 9v14m6-14v14',
  ],
  [
    'Run the diagnostic',
    'An open path can produce zero current. Read the captured outcome or the blocking check.',
    'm10 6 16 10-16 10Z',
  ],
  [
    'Read the response',
    'Inspect current, potential and named events. Unsupported effects remain unavailable.',
    'M4 24V8h24v16ZM8 20l5-7 5 5 6-9',
  ],
  [
    'Clear, reset or replace',
    'Clear the injected cause. Reset protection to OFF, turn ON deliberately, or replace damaged items separately.',
    'm9 5 5 5-4 4-5-5v7l6 5 5-1 10 10 4-4-10-10 1-5-5-6Z',
  ],
  [
    'Run again to verify',
    'Compare fresh results. A cleared marker alone does not prove successful repair.',
    'M25 12a11 11 0 1 0 0 10M25 4v9h-9',
  ],
] as const;

export function InspectorFaultLabView({ onAdvanced }: { onAdvanced?: () => void }) {
  const circuit = useCircuitStore((s) => s);
  const result = useUiStore((s) => s.simResult);
  const running = useUiStore((s) => s.simRunning);
  const runBlocked = useUiStore((s) => s.complianceGateBlocked);
  const labOpen = useUiStore((s) => s.faultLabOpen);
  const access = useSimulatorAccess();
  const blocked = isCircuitReadOnly(circuit);
  const reduced = useReducedMotion();
  const component = circuit.components.find((c) => c.id === circuit.selectedComponentId) ?? null;
  const wire =
    !component && circuit.selectedWireIds.length === 1
      ? (circuit.wires.find((w) => w.id === circuit.selectedWireIds[0]) ?? null)
      : null;
  const def = component && COMPONENT_DEFS[component.type];
  const rememberedTerminal = useFaultLabStore((s) => s.targetTerminal);
  const terminal =
    rememberedTerminal &&
    component &&
    rememberedTerminal.componentId === component.id &&
    def?.ports[rememberedTerminal.portIndex]
      ? rememberedTerminal.portIndex
      : null;
  const setTerminal = (portIndex: number | null) =>
    useFaultLabStore.setState({
      targetTerminal:
        component && portIndex !== null ? { componentId: component.id, portIndex } : null,
    });
  const [tab, setTab] = useState<Tab>('explain');
  const [window, setWindow] = useState<Window>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [draft, setDraft] = useState<{
    type: FaultType;
    target: FaultTarget;
    revision: string;
  } | null>(null);
  const [applying, setApplying] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [inside, setInside] = useState(true);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [compare, setCompare] = useState(false);
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [selectedCause, setSelectedCause] = useState<{ target: string; id: string } | null>(null);
  const [hidden, setHidden] = useState(document.hidden);
  const [picking, setPicking] = useState(!component && !wire);
  const [externalModal, setExternalModal] = useState(false);
  const target = useMemo<FaultTarget | null>(
    () =>
      component
        ? terminal !== null && def?.ports[terminal]
          ? { type: 'port', componentId: component.id, portIndex: terminal }
          : { type: 'component', id: component.id }
        : wire
          ? { type: 'wire', id: wire.id }
          : null,
    [component, wire, terminal, def],
  );
  const key = targetKey(target);
  useEffect(() => {
    useFaultLabStore.setState({ target });
  }, [target]);
  const selectedCauseId = selectedCause?.target === key ? selectedCause.id : null;
  const setSelectedCauseId = (id: string | null) =>
    setSelectedCause(id ? { target: key, id } : null);
  const revision = useMemo(() => circuitRevision(circuit), [circuit]);
  const capture = useMemo(
    () => captureFaultResponse(circuit, result, target),
    [circuit, result, target],
  );
  const saved = useFaultLabStore((s) => s.responses[key]);
  const edits = useFaultLabStore((s) => s.edits);
  const original = useFaultLabStore((s) => s.original);
  // Stop clears live telemetry. A detached accepted capture remains reviewable
  // while its electrical revision matches; a changed or rejected result cannot.
  const fresh =
    saved?.current.revision === revision && (result === null || capture !== null)
      ? saved.current
      : null;
  const baseline = saved?.before ?? null;
  const shown = compare && fresh && baseline ? baseline : fresh;
  const playable = !!fresh && !fresh.unassessed;
  const stages = shown ? responseStages(shown) : null;
  const faults = normalizeCircuitFaults(circuit).filter((f) => !f.resolved);
  const sameTargetSubject = (faultTarget: FaultTarget, selectedTarget: FaultTarget | null) => {
    if (!selectedTarget || faultTarget.type === 'wire' || selectedTarget.type === 'wire')
      return (
        faultTarget.type === 'wire' &&
        selectedTarget?.type === 'wire' &&
        faultTarget.id === selectedTarget.id
      );
    const faultComponent = faultTarget.type === 'port' ? faultTarget.componentId : faultTarget.id;
    const selectedComponent =
      selectedTarget.type === 'port' ? selectedTarget.componentId : selectedTarget.id;
    return faultComponent === selectedComponent;
  };
  const selectedFaults = faults.filter((f) => sameTargetSubject(f.target, target));
  const appliedFault = !compare
    ? (selectedFaults.find((f) => f.id === selectedCauseId) ??
      (selectedFaults.length === 1 ? selectedFaults[0] : null))
    : null;
  const currentResult = isCurrentSimulation(circuit, result);
  const unavailable =
    currentResult &&
    ((result.electrical?.status ?? result.phasor?.status) === 'unsupported' || !!fresh?.unassessed);
  const runState =
    runBlocked && !running
      ? 'blocked'
      : unavailable
        ? 'unavailable'
        : fresh && !fresh.unassessed
          ? 'captured'
          : running && !currentResult
            ? 'running'
            : saved || (result && !currentResult)
              ? 'stale'
              : 'not-run';
  const photo = component ? COMPONENT_IMAGES[component.type] : null;
  const stop = useCallback(() => setPlaying(false), []);

  useEffect(() => {
    if (labOpen && !original)
      useFaultLabStore.setState({
        original: structuredClone({
          circuit: selectCircuit(useCircuitStore.getState()),
          groups: useCircuitStore.getState().componentGroups,
        }),
      });
  }, [labOpen, original]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: target identity resets the draft; electrical edits must not change a chosen terminal.
  useEffect(() => {
    setDraft(null);
    setCompare(false);
    setStage(0);
    setPicking(!component && !wire);
    stop();
  }, [component?.id, wire?.id, stop]);
  useEffect(() => {
    if (capture) rememberFaultResponse(capture);
  }, [capture]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision and target changes invalidate presentation state.
  useEffect(() => {
    stop();
    setCompare(false);
    setStage(0);
  }, [revision, key, stop]);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    const detect = () =>
      setExternalModal(
        !!document.querySelector(
          'dialog[open][aria-modal="true"]:not([data-surface-state="closing"])',
        ),
      );
    const observer = new MutationObserver(detect);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-modal', 'data-surface-state', 'open'],
    });
    detect();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (reduced || hidden || window || draft || externalModal || !playable || blocked || !labOpen)
      stop();
  }, [reduced, hidden, window, draft, externalModal, playable, blocked, labOpen, stop]);
  useEffect(() => {
    if (!playing || !playable || hidden || window || draft || externalModal || blocked || reduced)
      return;
    const timer = globalThis.setInterval(
      () =>
        setStage((current) => {
          if (current >= 5) {
            stop();
            return current;
          }
          return current + 1;
        }),
      1400 / speed,
    );
    return () => clearInterval(timer);
  }, [playing, speed, playable, hidden, window, draft, externalModal, blocked, reduced, stop]);

  const choose = (type: FaultType) => {
    if (!target || blocked || !assessFaultTarget(circuit, type, target).applicable) return;
    stop();
    setDraftError(null);
    setWindow(null);
    const active = faults.find((f) => f.type === type && targetKey(f.target) === key);
    if (active) {
      setSelectedCauseId(active.id);
      setTab('explain');
      useUiStore.getState().notify({
        message: `${faultName(type)} is already applied to ${targetLabel(circuit, target)}. Inspect or clear the existing cause.`,
        type: 'info',
        target,
      });
      return;
    }
    setDraft({ type, target: { ...target }, revision });
  };
  const apply = async () => {
    if (!draft || applying) return;
    if (
      draft.revision !== circuitRevision(useCircuitStore.getState()) ||
      targetKey(draft.target) !== key
    ) {
      useUiStore
        .getState()
        .showNoticeToast('The target or circuit changed. Review the fault again.');
      setDraft(null);
      return;
    }
    setApplying(true);
    const id = await useCircuitStore
      .getState()
      .injectFault({ type: draft.type, target: draft.target });
    setApplying(false);
    if (!id)
      setDraftError(
        'The edit was not applied. Review existing causes, the target and membership status. The Console records the rejection reason.',
      );
    if (id) {
      const description = `Applied ${faultName(draft.type)} on ${targetLabel(circuit, draft.target)}.`;
      recordFaultLabEdit(description);
      useUiStore.getState().addLog(description, 'warning', draft.target);
      setDraft(null);
    }
  };
  const clear = async (id?: string) => {
    const clearedCause = id ? faults.find((f) => f.id === id) : null;
    const success = id
      ? await useCircuitStore.getState().removeFault(id)
      : await useCircuitStore.getState().clearAllFaults();
    if (success) {
      const description = id
        ? 'Cleared one injected cause; protection and damage preserved.'
        : 'Cleared all injected causes; protection and damage preserved.';
      recordFaultLabEdit(description);
      useUiStore.getState().notify({
        message: description,
        type: 'info',
        target: clearedCause?.target,
        showUndo: true,
      });
    }
  };
  const focus = (faultTarget: FaultTarget) => {
    if (faultTarget.type === 'wire') {
      circuit.selectWire(faultTarget.id);
      focusFaultTarget({ wireId: faultTarget.id });
    } else {
      const id = faultTarget.type === 'port' ? faultTarget.componentId : faultTarget.id;
      circuit.selectComponent(id);
      focusFaultTarget({ componentId: id });
    }
  };
  const restore = async () => {
    if (!original || running || blocked) return;
    if (
      await useCircuitStore
        .getState()
        .restoreCircuitSnapshot(structuredClone(original.circuit), structuredClone(original.groups))
    ) {
      recordFaultLabEdit('Restored the investigation starting circuit. Undo remains available.');
      useFaultLabStore.setState({ original: null, responses: {} });
      useUiStore.getState().setFaultLabOpen(false);
    }
  };
  const openConsole = () => {
    stop();
    useUiStore.getState().setLogOpen(true);
    if (matchMedia('(max-width: 640px)').matches) useUiStore.getState().setInspectorCollapsed(true);
  };
  const readouts = (response: typeof shown) =>
    response ? (
      <>
        <dl className="fault-lab-readings">
          <div>
            <dt>
              {target?.type === 'wire'
                ? 'Wire branch voltage'
                : target?.type === 'port'
                  ? 'Component terminal-pair voltage'
                  : 'Target voltage'}
            </dt>
            <dd>{formatReading(response.voltage, 'V')}</dd>
          </div>
          <div>
            <dt>Target current</dt>
            <dd>{formatReading(response.current, 'A')}</dd>
          </div>
          <div>
            <dt>{target?.type === 'wire' ? 'Wire loss' : 'Target power'}</dt>
            <dd>{formatReading(response.power, 'W')}</dd>
          </div>
          {response.potentials && (
            <>
              <div>
                <dt>From potential</dt>
                <dd>{formatReading(response.potentials.fromPotentialVolts, 'V')}</dd>
              </div>
              <div>
                <dt>To potential</dt>
                <dd>{formatReading(response.potentials.toPotentialVolts, 'V')}</dd>
              </div>
            </>
          )}
        </dl>
        <p className="fault-lab-note">
          Final operating point. Wire potentials are source-relative; neither is a voltage-to-earth
          measurement.
        </p>
        <h4>Source branches</h4>
        {response.sources.map((source) => (
          <p key={source.id}>
            {source.label}: {formatReading(source.voltage, 'V')} ·{' '}
            {formatReading(source.current, 'A')} · {formatReading(source.power, 'W')}
          </p>
        ))}
        {response.damage && (
          <p>
            Declared stress: {response.damage.exposure} / {response.damage.budget}{' '}
            {response.damage.unit}.{' '}
            {response.damage.damaged ? 'Replacement required.' : 'Budget not crossed.'}
          </p>
        )}
      </>
    ) : (
      <p>
        Run the current circuit to capture fresh readings. Previous responses are stale after an
        edit.
      </p>
    );

  const library = (
    <>
      <div className="fault-lab-library-filters">
        <input
          aria-label="Search fault library"
          placeholder="Search faults or target guidance"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Fault category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {[...new Set(Object.values(FAULT_REGISTRY).map((f) => f.category))].map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="fault-lab-library">
        {Object.values(FAULT_REGISTRY)
          .filter(
            (f) =>
              (category === 'all' || f.category === category) &&
              `${f.label} ${f.description}`.toLowerCase().includes(search.toLowerCase()),
          )
          .map((f) => {
            const assessment = target ? assessFaultTarget(circuit, f.id, target) : null;
            const applied = faults.some(
              (cause) => cause.type === f.id && targetKey(cause.target) === key,
            );
            return (
              <button
                type="button"
                key={f.id}
                data-applied={applied || undefined}
                disabled={!assessment?.applicable || blocked}
                onClick={() => choose(f.id)}
              >
                <strong>{f.label}</strong>
                {applied && <b className="fault-lab-applied-badge">Applied</b>}
                <small>{assessment?.reason ?? 'Select a component or a wire on the canvas.'}</small>
                <span>
                  {assessment?.coverage === 'supported'
                    ? 'Modeled target'
                    : 'Electrical effect not assessed'}
                </span>
              </button>
            );
          })}
      </div>
    </>
  );

  return (
    <section
      className={`fault-lab ${picking ? 'fault-lab-picking' : ''}`}
      aria-label="Fault Lab panel"
      data-fault-playback={playing ? 'playing' : 'paused'}
    >
      <header className="fault-lab-heading">
        <div>
          <small>FAULT LAB · EXPLORE</small>
          <h3>Follow the failure.</h3>
          <p>Inspect a real target. Run. Read the response. Repair.</p>
        </div>
        <button type="button" onClick={() => setWindow('help')}>
          Help
        </button>
      </header>
      {blocked && (
        <output className="fault-lab-warning">
          Editing blocked by membership or read-only access. You can inspect and export this
          drawing.
        </output>
      )}
      <div className="fault-lab-layout">
        <div className="fault-lab-demonstration">
          <div className="fault-lab-target">
            <b>Target</b>
            <span>{target ? targetLabel(circuit, target) : 'No target selected'}</span>
            {target && (
              <button
                type="button"
                onClick={() => {
                  stop();
                  circuit.clearSelection();
                  setPicking(true);
                }}
              >
                Change target on canvas
              </button>
            )}
            {def && (
              <select
                aria-label="Fault target terminal"
                value={terminal ?? 'component'}
                onChange={(event) =>
                  setTerminal(
                    event.target.value === 'component' ? null : Number(event.target.value),
                  )
                }
              >
                <option value="component">Whole component</option>
                {def.ports.map((p, index) => (
                  <option key={`${index}-${p.label}`} value={index}>
                    {p.label} · {p.type}
                  </option>
                ))}
              </select>
            )}
          </div>
          {!target && <p>Click a component or a wire on the canvas to target it with a fault.</p>}
          <fieldset className="fault-lab-tools" aria-label="Drawing view">
            <button type="button" aria-pressed={inside} onClick={() => setInside(true)}>
              Inside
            </button>
            <button type="button" aria-pressed={!inside} onClick={() => setInside(false)}>
              Circuit
            </button>
            <button type="button" onClick={() => setWindow('photo')}>
              Reference photo
            </button>
          </fieldset>
          <FaultLabStage
            circuit={circuit}
            response={shown}
            inside={inside}
            playing={playing}
            stage={stage}
            reduced={reduced}
            suspended={hidden || externalModal || !!window || !!draft || blocked || !labOpen}
            appliedFault={appliedFault}
          />
          <output className="fault-lab-response-status" data-run-state={runState}>
            <b>
              {
                {
                  'not-run': 'Not run',
                  running: 'Running',
                  captured: 'Captured',
                  blocked: 'Blocked',
                  unavailable: 'Unavailable',
                  stale: 'Stale',
                }[runState]
              }
            </b>{' '}
            <span>
              {runState === 'blocked'
                ? 'Run was blocked by circuit checks. Review the findings, then return here.'
                : runState === 'unavailable'
                  ? 'Electrical effect not assessed for the current circuit; no accepted consequence capture is available.'
                  : runState === 'running'
                    ? 'Waiting for a current circuit result.'
                    : fresh
                      ? fresh.unassessed
                        ? 'Unassessed fault · consequence playback unavailable'
                        : compare
                          ? 'Previous captured revision · comparison only'
                          : 'Fresh captured response'
                      : saved
                        ? 'Stale response · run the current circuit again'
                        : 'No accepted response · run the circuit'}
            </span>
            {running && runState === 'captured' && <small>Continuous simulation running</small>}
          </output>
          {selectedFaults.length > 1 && (
            <label className="fault-lab-cause-picker">
              {selectedFaults.length} causes on this target
              <select
                aria-label="Inspect applied cause"
                value={selectedCauseId ?? ''}
                onChange={(event) => setSelectedCauseId(event.target.value || null)}
              >
                <option value="">Choose a cause to inspect</option>
                {selectedFaults.map((f) => (
                  <option key={f.id} value={f.id}>
                    {faultName(f.type)} · {targetLabel(circuit, f.target)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <fieldset className="fault-lab-steps" aria-label="Causal walkthrough stages">
            {['Target', 'Cause', 'Path', 'Response', 'Inspect', 'Repair'].map((name, index) => (
              <button
                type="button"
                key={name}
                aria-label={name === 'Inspect' ? 'Inspect stage' : undefined}
                disabled={!playable}
                aria-pressed={index === stage}
                onClick={() => {
                  stop();
                  setStage(index);
                }}
              >
                {name}
              </button>
            ))}
          </fieldset>
          <div className="fault-lab-caption" aria-live="polite">
            <b>{stages?.[stage][0] ?? 'Inspect the target'}</b>
            <p>
              {stages?.[stage][1] ??
                'Apply a reviewed edit, then use Run Simulation in the workspace to capture its accepted response.'}
            </p>
          </div>
          <div className="fault-lab-tools">
            <button
              type="button"
              disabled={!playable || reduced}
              onClick={() => {
                setStage(stage === 5 ? 0 : stage);
                setPlaying(!playing);
              }}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              disabled={!playable}
              onClick={() => {
                stop();
                setStage(0);
              }}
            >
              Replay
            </button>
            <label>
              Speed{' '}
              <select
                aria-label="Playback speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={2}>2×</option>
              </select>
            </label>
            <button
              type="button"
              disabled={!playable || !baseline || baseline.unassessed}
              aria-pressed={compare}
              onClick={() => {
                stop();
                setCompare(!compare);
              }}
            >
              Compare previous
            </button>
            <button
              type="button"
              className="fault-lab-phone-toggle"
              aria-expanded={inspectorVisible}
              aria-controls="fault-inspector"
              onClick={() => setInspectorVisible(!inspectorVisible)}
            >
              {inspectorVisible ? 'Hide Inspector' : 'Show Inspector'}
            </button>
          </div>
          <p className="fault-lab-note">
            Playback changes the presentation.{' '}
            {reduced
              ? 'Reduced motion: use the static stages.'
              : 'Stage spacing is not measured time.'}
          </p>
          <div className="fault-lab-tools">
            <button type="button" onClick={() => setWindow('library')}>
              Browse fault library · 14
            </button>
            <button type="button" onClick={openConsole}>
              Console
            </button>
            <button type="button" onClick={() => setWindow('history')}>
              History &amp; Undo
            </button>
            <button type="button" onClick={() => setWindow('leave')}>
              Leave the lab
            </button>
          </div>
          <details className="fault-lab-quick-library">
            <summary>Introduce fault · target catalogue</summary>
            {library}
          </details>
          <section aria-label="Active faults" className="fault-lab-active">
            <div className="fault-lab-tools">
              <h4>Active faults ({faults.length})</h4>
              <button
                type="button"
                disabled={blocked || !faults.length}
                aria-label="Clear all injected faults from the active list"
                onClick={() => void clear()}
              >
                Clear all
              </button>
            </div>
            {faults.map((f) => (
              <div key={f.id} data-active-fault={f.type}>
                <span>
                  <b>{faultName(f.type)}</b>
                  <small>{targetLabel(circuit, f.target)}</small>
                </span>
                <button
                  type="button"
                  aria-label={`Focus ${faultName(f.type)} on canvas`}
                  onClick={() => focus(f.target)}
                >
                  Focus
                </button>
                <button
                  type="button"
                  disabled={!fresh || fresh.unassessed || targetKey(f.target) !== key}
                  aria-label={`Replay ${faultName(f.type)} explanation`}
                  onClick={() => {
                    stop();
                    setStage(0);
                  }}
                >
                  Replay
                </button>
                <button
                  type="button"
                  disabled={blocked}
                  aria-label={`Clear ${faultName(f.type)}`}
                  onClick={() => void clear(f.id)}
                >
                  Clear
                </button>
              </div>
            ))}
            {!faults.length && (
              <p>No injected causes. Derived stress, trip latches and damage are separate.</p>
            )}
          </section>
        </div>
        <aside
          id="fault-inspector"
          className="fault-lab-inspector"
          aria-label="Fault Inspector"
          data-phone-visible={inspectorVisible}
        >
          <h4>{target ? targetLabel(circuit, target) : 'Choose a target'}</h4>
          <div className="fault-lab-tabs" role="tablist" aria-label="Fault Inspector sections">
            {(['explain', 'readings', 'repair'] as const).map((id, index) => (
              <button
                type="button"
                role="tab"
                key={id}
                id={`fault-tab-${id}`}
                aria-selected={tab === id}
                aria-controls="fault-tab-content"
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const next =
                    event.key === 'Home'
                      ? 'explain'
                      : event.key === 'End'
                        ? 'repair'
                        : (['explain', 'readings', 'repair'] as const)[
                            (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3
                          ];
                  setTab(next);
                  document.getElementById(`fault-tab-${next}`)?.focus();
                }}
              >
                {id[0].toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
          <div id="fault-tab-content" role="tabpanel" aria-labelledby={`fault-tab-${tab}`}>
            {tab === 'explain' && (
              <>
                <p>
                  Faults change the circuit. Protection operation and irreversible damage need their
                  own declared models and fresh results.
                </p>
                {selectedFaults.map((f) => (
                  <section key={f.id}>
                    <h4>{faultName(f.type)}</h4>
                    <p>{assessFaultTarget(circuit, f.type, f.target).reason}</p>
                    <p>
                      {assessFaultTarget(circuit, f.type, f.target).coverage === 'supported'
                        ? 'Clear this cause, then verify a new run.'
                        : 'Electrical effect not assessed. No trip, arc or damage animation is asserted.'}
                    </p>
                  </section>
                ))}
                {!selectedFaults.length && (
                  <p>
                    No injected cause on this target. Open earth can be behaviorally silent; an
                    unlit load does not establish isolation.
                  </p>
                )}
                <button type="button" onClick={() => setWindow('library')}>
                  Introduce fault
                </button>
                {onAdvanced && (
                  <button type="button" onClick={onAdvanced}>
                    Detailed model settings
                  </button>
                )}
                <p className="fault-lab-note">
                  Cutaways do not move saved terminals or wires. Temperature, arcs and standards
                  compliance are unassessed.
                </p>
              </>
            )}
            {tab === 'readings' && (
              <>
                {readouts(shown)}
                {shown && (
                  <>
                    <h4>Recorded circuit events · last 100</h4>
                    {shown.events.length === 0 && <p>No timed event recorded.</p>}
                    {shown.events.map((event) => (
                      <p key={event.sequence}>
                        {event.type === 'damage'
                          ? targetLabel(circuit, event.target)
                          : targetLabel(circuit, { type: 'component', id: event.componentId })}{' '}
                        · {event.type} at {event.atSeconds} s simulated time.
                      </p>
                    ))}
                    {shown.protection.map((p) => (
                      <p key={p.componentId}>
                        {targetLabel(circuit, { type: 'component', id: p.componentId })} ·{' '}
                        {p.tripped ? 'tripped' : p.closed ? 'closed' : 'open'} · pole current{' '}
                        {formatReading(p.maxPoleCurrentAmps, 'A')}
                      </p>
                    ))}
                  </>
                )}
              </>
            )}
            {tab === 'repair' && <FaultRepairPanel component={component} wire={wire} />}
          </div>
        </aside>
      </div>
      <Modal
        open={!!draft}
        onClose={() => !applying && setDraft(null)}
        title="Review fault edit"
        widthClass="max-w-xl"
      >
        {draft && (
          <>
            {draftError && (
              <p role="alert" className="fault-lab-draft-error">
                {draftError}
              </p>
            )}
            <p>
              <b>{faultName(draft.type)}</b> · {targetLabel(circuit, draft.target)}
            </p>
            <p>{assessFaultTarget(circuit, draft.type, draft.target).reason}</p>
            <p>
              Review what changes below. Apply makes one undoable circuit edit; Cancel preserves the
              drawing. Run Simulation after applying to assess the resulting circuit.
            </p>
            <FaultApplicationPreview circuit={circuit} target={draft.target} type={draft.type} />
            <div className="fault-lab-tools">
              <button type="button" disabled={applying} onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={applying || blocked || draft.revision !== revision}
                onClick={() => void apply()}
              >
                {applying ? 'Applying…' : 'Apply fault edit'}
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!window}
        onClose={() => setWindow(null)}
        title={
          window === 'library'
            ? 'Fault library'
            : window === 'history'
              ? 'Fault Lab history and Undo'
              : window === 'photo'
                ? 'Target reference photo'
                : window === 'leave'
                  ? 'Leave Fault Lab'
                  : 'Fault Lab help'
        }
        widthClass="max-w-3xl"
      >
        {window === 'library' && library}
        {window === 'history' && (
          <>
            <button
              type="button"
              disabled={blocked || running}
              onClick={() => {
                undo();
                recordFaultLabEdit('Undo requested through the shared circuit history.');
              }}
            >
              Undo circuit edit
            </button>
            <p>
              Playback does not add edits. Undo uses the ordinary circuit history; each Apply is one
              edit.
            </p>
            <ol>
              {edits.map((edit) => (
                <li key={edit.id}>{edit.description}</li>
              ))}
            </ol>
            <InspectorHistoryView />
          </>
        )}
        {window === 'photo' &&
          (photo ? (
            <>
              <img
                className="fault-lab-photo"
                src={photo}
                alt={`${def?.label} representative hardware`}
              />
              <p>
                {def?.label} · representative appearance. The simulator model defines terminals and
                ratings.
              </p>
            </>
          ) : (
            <p>
              No direct photograph is available for this {wire ? 'conductor' : 'target'} in the
              repository. The cutaway is an explanation of the selected model.
            </p>
          ))}
        {window === 'leave' && (
          <>
            <p>
              Keep your edits, or explicitly restore the circuit captured when this investigation
              started. Saved circuit records are untouched. Restoration is undoable.
            </p>
            <div className="fault-lab-tools">
              <button type="button" onClick={() => setWindow(null)}>
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  useFaultLabStore.setState({ original: null });
                  useUiStore.getState().setFaultLabOpen(false);
                }}
              >
                Keep edits and leave
              </button>
              <button
                type="button"
                disabled={!original || running || blocked || access.pending > 0}
                onClick={() => void restore()}
              >
                Restore starting circuit and leave
              </button>
            </div>
            {running && <p>Stop the simulation before restoring.</p>}
          </>
        )}
        {window === 'help' && (
          <ol className="fault-lab-help-steps">
            {helpSteps.map(([title, detail, path], index) => (
              <li key={title}>
                <b>{index + 1}</b>
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path d={path} />
                </svg>
                <div>
                  <h4>{title}</h4>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </section>
  );
}
