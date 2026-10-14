import { COMPONENT_DEFS, type ComponentInstance } from '@electrasim/domain';
import type { ReactNode } from 'react';
import { DEVICE_FAMILIES } from './deviceVectors';

/** Family glyph, not a second set of connectable terminals or an internal netlist. */
export function ComponentSymbol({
  component,
  contactsOpen = false,
}: {
  component: ComponentInstance;
  /** Override the contact glyph when a Fault Lab cause opens the modeled poles. */
  contactsOpen?: boolean;
}) {
  const def = COMPONENT_DEFS[component.type];
  const family = DEVICE_FAMILIES[component.type];
  const on =
    !contactsOpen && component.state.on && !component.state.isTripped && !component.state.isBlown;
  let shape: ReactNode;
  if (family === 'lamp') {
    shape = (
      <>
        <circle cx="32" cy="30" r="19" />
        <path d="m19 17 26 26m0-26L19 43" />
      </>
    );
  } else if (family === 'source') {
    shape = (
      <>
        <circle cx="32" cy="30" r="20" />
        <path
          d={
            component.type.includes('dc') || component.type.includes('solar')
              ? 'M21 25h12m-6-6v12m8 7h10'
              : 'M17 30q7-18 15 0t15 0'
          }
        />
      </>
    );
  } else if (family === 'socket') {
    shape = <path d="M5 30h12M17 15a20 20 0 0 1 0 30M22 21h12M22 39h12M43 30h10" />;
  } else if (family === 'terminal' || family === 'junction' || family === 'lever') {
    shape =
      component.type === 'earth-terminal' || component.type === 'earth-rod' ? (
        <path d="M32 9v22M13 32h38M20 39h24M27 46h10" />
      ) : (
        <>
          <path d="M5 30h20M39 30h20M32 8v15M32 37v16" />
          <circle cx="32" cy="30" r="7" />
        </>
      );
  } else if (family === 'relay' || family === 'contactor') {
    shape = (
      <>
        <rect x="5" y="18" width="20" height="24" />
        <path d="M15 7v11M15 42v11M25 30h9" strokeDasharray="2 3" />
        <path d={on ? 'M43 9v44' : 'M43 9v9l13 20M43 43v10'} />
        <circle cx="43" cy="18" r="2" />
        <circle cx="43" cy="43" r="2" />
      </>
    );
  } else if (family === 'motor' || family === 'fan') {
    shape = (
      <>
        <circle cx="32" cy="30" r="20" />
        <path d="M21 40V20l11 13 11-13v20" />
      </>
    );
  } else if (def?.isSwitch || family === 'breaker' || family === 'residual') {
    shape = (
      <>
        <path d={on ? 'M7 34h50' : 'M7 34h10m0 0L45 17m2 17h10'} />
        <circle cx="17" cy="34" r="2" />
        <circle cx="47" cy="34" r="2" />
      </>
    );
  } else if (family === 'heater' || family === 'fuse' || def?.category === 'load') {
    shape = (
      <>
        <path d="M3 30h10m38 0h10" />
        <rect x="13" y="21" width="38" height="18" />
      </>
    );
  } else if (family === 'transformer') {
    shape = (
      <path d="M12 12q18 5 0 10q18 5 0 10q18 5 0 10m40-30q-18 5 0 10q-18 5 0 10q-18 5 0 10M29 10v36m6-36v36" />
    );
  } else {
    // Do not invent pole topology for complex devices. Use a labeled functional block.
    shape = (
      <>
        <rect x="8" y="10" width="48" height="38" rx="4" />
        <text x="32" y="33" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">
          {(def?.category ?? 'device').slice(0, 5).toUpperCase()}
        </text>
      </>
    );
  }
  return (
    <g
      data-component-symbol={component.type}
      data-forced-open-contacts={contactsOpen ? 'true' : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
    >
      {shape}
    </g>
  );
}
