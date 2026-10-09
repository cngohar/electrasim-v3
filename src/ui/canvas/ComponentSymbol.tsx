import { COMPONENT_DEFS, type ComponentInstance } from '@electrasim/domain';
import type { ReactNode } from 'react';
import { DEVICE_FAMILIES } from './deviceVectors';

/** Family glyph, not a second set of connectable terminals or an internal netlist. */
export function ComponentSymbol({ component }: { component: ComponentInstance }) {
  const def = COMPONENT_DEFS[component.type];
  const family = DEVICE_FAMILIES[component.type];
  const on = component.state.on && !component.state.isTripped && !component.state.isBlown;
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
