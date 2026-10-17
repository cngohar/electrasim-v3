import type { FaultType } from '@electrasim/domain';
import { protectionCircuit } from '../../packages/domain/src/core/protectionFixtures';

export type Scenario = {
  fault: FaultType;
  circuit: ReturnType<typeof protectionCircuit>;
  target: { type: 'component'; id: string } | { type: 'wire'; id: string };
  terminal?: number;
};

const protectedCircuit = () => {
  const circuit = protectionCircuit('mcb', 16);
  circuit.components.push({ id: 'outlet', type: 'socket-3pin', x: 690, y: 300, state: {} });
  circuit.components[2]!.x = 980;
  circuit.wires[1]!.toComponentId = 'outlet';
  circuit.wires[2]!.fromComponentId = 'outlet';
  const cable = circuit.wires[0]!;
  circuit.wires.push(
    {
      ...cable,
      id: 'cpc',
      fromComponentId: 'source',
      fromPortIndex: 2,
      toComponentId: 'outlet',
      toPortIndex: 2,
    },
    {
      ...cable,
      id: 'load-l',
      fromComponentId: 'outlet',
      fromPortIndex: 0,
      toComponentId: 'lamp',
      toPortIndex: 0,
    },
    {
      ...cable,
      id: 'load-n',
      fromComponentId: 'lamp',
      fromPortIndex: 1,
      toComponentId: 'outlet',
      toPortIndex: 1,
    },
  );
  return circuit;
};
export const scenarios: Scenario[] = [
  { fault: 'open-circuit', circuit: protectedCircuit(), target: { type: 'wire', id: 'load-feed' } },
  { fault: 'open-live', circuit: protectedCircuit(), target: { type: 'wire', id: 'feed' } },
  { fault: 'open-neutral', circuit: protectedCircuit(), target: { type: 'wire', id: 'return' } },
  {
    fault: 'open-earth',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
    terminal: 2,
  },
  {
    fault: 'terminal-disconnect',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'control' },
    terminal: 0,
  },
  {
    fault: 'reverse-polarity',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
  {
    fault: 'switched-neutral',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'control' },
  },
  {
    fault: 'earth-fault',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
  {
    fault: 'live-to-earth',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
  {
    fault: 'smooth-dc-residual',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
  { fault: 'arc-fault', circuit: protectedCircuit(), target: { type: 'component', id: 'outlet' } },
  {
    fault: 'protection-forced-open',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'control' },
  },
  {
    fault: 'protection-bypass',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'control' },
  },
  {
    fault: 'short-circuit',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
];

export const faultCardNames: Record<FaultType, RegExp> = {
  'open-circuit': /Open Circuit Break/,
  'open-live': /Open Live \(Line Break\)/,
  'open-neutral': /Open Neutral \(Floating Return\)/,
  'open-earth': /Open Earth \(Broken CPC\)/,
  'terminal-disconnect': /Loose \/ Disconnected Terminal/,
  'reverse-polarity': /Reversed Polarity/,
  'switched-neutral': /Switched Neutral Hazard/,
  'earth-fault': /Earth Fault \/ Short to Earth/,
  'live-to-earth': /Insulation Leakage \(Live to Earth\)/,
  'smooth-dc-residual': /Smooth DC Residual Leakage/,
  'arc-fault': /Arc Fault/,
  'protection-forced-open': /Breaker Jammed \/ Forced Open/,
  'protection-bypass': /Protection Bypassed \/ Shunted/,
  'short-circuit': /Dead Short Circuit/,
};
