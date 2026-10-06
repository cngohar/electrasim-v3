/** Opt-in unity-PF teaching equivalent, never an induction-motor nameplate law. */
export interface MotorModel {
  version: 1;
  kind: 'balanced-resistive';
  nominalLineVoltage: number;
  inputPowerWatts: number;
  frequencyHz: number;
  operatingLineVoltageRange: { min: number; max: number };
  maximumUnbalanceRatio: number;
  requiredSequence: 'abc' | 'acb';
}

export const MOTOR_APPROXIMATION =
  'Declared balanced unity-power-factor delta equivalent using electrical input power. Reactive power, efficiency, speed, torque, inrush, stall, phase-loss heating and damage are unassessed. Readings outside the operating conditions describe only the passive equivalent.';

export function isMotorModel(value: unknown): value is MotorModel {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const m = value as Record<string, unknown>;
  const finite = (value: unknown, min: number, max: number): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const range = m.operatingLineVoltageRange;
  if (!range || typeof range !== 'object' || Array.isArray(range)) return false;
  const r = range as Record<string, unknown>;
  return (
    Object.keys(m).every((key) =>
      [
        'version',
        'kind',
        'nominalLineVoltage',
        'inputPowerWatts',
        'frequencyHz',
        'operatingLineVoltageRange',
        'maximumUnbalanceRatio',
        'requiredSequence',
      ].includes(key),
    ) &&
    m.version === 1 &&
    m.kind === 'balanced-resistive' &&
    finite(m.nominalLineVoltage, 0.001, 100_000) &&
    finite(m.inputPowerWatts, 0.001, 100_000) &&
    finite(m.frequencyHz, 1, 100_000) &&
    Object.keys(r).length === 2 &&
    finite(r.min, 0.001, m.nominalLineVoltage) &&
    finite(r.max, m.nominalLineVoltage, 100_000) &&
    finite(m.maximumUnbalanceRatio, 0, 0.1) &&
    (m.requiredSequence === 'abc' || m.requiredSequence === 'acb')
  );
}

export function copyMotorModel(model: MotorModel): MotorModel {
  return { ...model, operatingLineVoltageRange: { ...model.operatingLineVoltageRange } };
}
