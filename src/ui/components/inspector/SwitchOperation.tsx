import { COMPONENT_DEFS, type ComponentInstance, type SimulationResult } from '@electrasim/domain';
import { useEffect } from 'react';
import { setMomentarySwitchState, useCircuitStore } from '../../../store';

/** Manual operation stays available while running; automatic contacts remain derived. */
export function SwitchOperation({
  component,
  result,
}: { component: ComponentInstance; result: SimulationResult | null }) {
  const def = COMPONENT_DEFS[component.type];
  useEffect(
    () => () => {
      if (def?.isMomentary) setMomentarySwitchState(component.id, false);
    },
    [component.id, def?.isMomentary],
  );
  if (!def?.isSwitch) return null;
  const coil = result?.coilStates?.[component.id];
  const timer = result?.timerContactStates?.[component.id];
  const on =
    coil ?? timer ?? result?.protectionContactStates?.[component.id] ?? component.state.on === true;
  if (def.isMomentary)
    return (
      <button
        type="button"
        className="table-operation"
        aria-label="Press and hold"
        aria-pressed={on}
        onPointerDown={(event) => {
          if (event.button > 0) return;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setMomentarySwitchState(component.id, true);
        }}
        onPointerUp={() => setMomentarySwitchState(component.id, false)}
        onPointerCancel={() => setMomentarySwitchState(component.id, false)}
        onLostPointerCapture={() => setMomentarySwitchState(component.id, false)}
        onBlur={() => setMomentarySwitchState(component.id, false)}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault();
            setMomentarySwitchState(component.id, true);
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            setMomentarySwitchState(component.id, false);
          }
        }}
      >
        {on ? 'PRESSED' : 'RELEASED'}
      </button>
    );
  return (
    <section className="table-operation-state">
      <h4>Operation</h4>
      <button
        type="button"
        className="table-operation"
        disabled={coil !== undefined}
        onClick={() => useCircuitStore.getState().toggleSwitch(component.id)}
      >
        {component.state.timerModel
          ? component.state.timerModel.kind === 'schedule'
            ? component.state.on
              ? 'Disable timer program'
              : 'Enable timer program'
            : component.state.on
              ? 'Release trigger'
              : 'Trigger timer'
          : def.switchContacts?.some((pair) => pair.nc !== undefined)
            ? on
              ? 'NO selected'
              : 'NC selected'
            : on
              ? 'CLOSED (ON)'
              : 'OPEN (OFF)'}
      </button>
      {coil !== undefined && <p>Automatic coil control · declared model</p>}
    </section>
  );
}
