export type LampMode = 'assembly' | 'cutaway' | 'disassemble' | 'build' | 'xray';
export type VacuumState = 'open' | 'pumping' | 'sealed';
export interface LampState { mode: LampMode; buildStep: number; vacuum: VacuumState; voltage: number; failed: boolean; }
export const INITIAL_LAMP_STATE: LampState = { mode: 'assembly', buildStep: 0, vacuum: 'open', voltage: 0, failed: false };
export function nextBuildStep(step: number): number { return (step + 1) % 7; }
export function vacuumTransition(state: VacuumState): VacuumState { return state === 'open' ? 'pumping' : state === 'pumping' ? 'sealed' : 'open'; }
export function lampPower(voltage: number, resistance = 140) { const current = voltage / resistance; return { current, watts: voltage * current, brightness: Math.min(1, voltage / 110) }; }
