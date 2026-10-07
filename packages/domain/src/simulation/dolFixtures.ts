/** Actual authored DOL guide exercised through domain, Comlink and local Hono. */
import { cloneTemplateCircuit, getGuidedCircuitTemplate } from '../templates';
import type { Circuit } from '../types';

export function dolAcceptanceCircuits(): Record<string, Circuit> {
  const template = getGuidedCircuitTemplate('pro-3phase-dol-starter');
  if (!template) throw new Error('Missing DOL guide');
  const make = () => cloneTemplateCircuit(template);
  const stopped = make();
  stopped.components.find((c) => c.id.endsWith('-control'))!.state.on = false;
  const phaseLoss = make();
  phaseLoss.wires.find((w) => w.id.endsWith('contactor-motor-v'))!.fault = 'open-circuit';
  const coilLoss = make();
  coilLoss.wires.find((w) => w.id.endsWith('coil-return'))!.fault = 'open-circuit';
  const reversed = make();
  reversed.wires.find((w) => w.id.endsWith('contactor-motor-v'))!.toPortIndex = 2;
  reversed.wires.find((w) => w.id.endsWith('contactor-motor-w'))!.toPortIndex = 1;
  const undeclared = make();
  undeclared.components.find((c) => c.id.endsWith('-motor'))!.state.motorModel = undefined;
  return {
    'dol-running': make(),
    'dol-stopped': stopped,
    'dol-phase-loss': phaseLoss,
    'dol-coil-loss': coilLoss,
    'dol-reversed': reversed,
    'dol-undeclared': undeclared,
  };
}
