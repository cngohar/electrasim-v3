import type { Circuit, ComponentGroup, FaultTarget } from '@electrasim/domain';
import { create } from 'zustand';
import type { FaultResponse } from '../ui/components/inspector/faultLabEvidence';

/** Ephemeral investigation state; never persisted with a circuit or browser attempt. */
export const useFaultLabStore = create<{
  original: { circuit: Circuit; groups: ComponentGroup[] } | null;
  responses: Record<string, { before: FaultResponse | null; current: FaultResponse }>;
  edits: { id: number; description: string }[];
  targetTerminal: { componentId: string; portIndex: number } | null;
  target: FaultTarget | null;
}>(() => ({ original: null, responses: {}, edits: [], targetTerminal: null, target: null }));

export function rememberFaultResponse(response: FaultResponse) {
  useFaultLabStore.setState((state) => {
    const previous = state.responses[response.key];
    const sameRun =
      previous?.current.revision === response.revision &&
      response.elapsedSeconds !== null &&
      previous.current.elapsedSeconds !== null &&
      response.elapsedSeconds >= previous.current.elapsedSeconds;
    const events = sameRun
      ? [
          ...new Map(
            [...previous.current.events, ...response.events].map((event) => [
              `${event.sequence}:${event.atSeconds}:${event.type}`,
              event,
            ]),
          ).values(),
        ].slice(-100)
      : response.events;
    return {
      responses: {
        ...Object.fromEntries(
          Object.entries(state.responses)
            .filter(([key]) => key !== response.key)
            .slice(-39),
        ),
        [response.key]: {
          before:
            previous?.current.revision === response.revision
              ? previous.before
              : (previous?.current ?? null),
          current: { ...response, events },
        },
      },
    };
  });
}

let nextEdit = 0;
export function recordFaultLabEdit(description: string) {
  useFaultLabStore.setState((state) => ({
    edits: [...state.edits, { id: ++nextEdit, description }].slice(-100),
  }));
}
