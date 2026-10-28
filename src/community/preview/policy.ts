import { COMPONENT_DEFS, type Circuit, isAutomaticProtection } from '@electrasim/domain';
import { CIRCUIT_SCHEMA_VERSION } from '@electrasim/domain/circuitFormat';
import { ELECTRICAL_MODEL_VERSION } from '@electrasim/domain/core/contracts';
import { CONTROL_ENGINE_VERSION } from '@electrasim/domain/core/controlStep';
import { MNA_ENGINE_VERSION } from '@electrasim/domain/core/mna';
import { resolveDeviceModel } from '@electrasim/domain/core/models';

export function previewSwitches(circuit: Circuit) {
  return circuit.components.filter((c) => {
    const d = COMPONENT_DEFS[c.type];
    const model = d ? resolveDeviceModel(c, d, circuit) : null;
    return (
      d?.isSwitch &&
      !isAutomaticProtection(c.type) &&
      model?.kind === 'contacts' &&
      !model.coil &&
      !model.coilModel &&
      !model.timerModel
    );
  });
}
export function earlierModel(v: {
  circuitSchemaVersion: number;
  modelVersion: string;
  engineVersion: string;
  controlEngineVersion: string;
}) {
  return (
    v.circuitSchemaVersion !== CIRCUIT_SCHEMA_VERSION ||
    v.modelVersion !== ELECTRICAL_MODEL_VERSION ||
    v.engineVersion !== MNA_ENGINE_VERSION ||
    v.controlEngineVersion !== CONTROL_ENGINE_VERSION
  );
}
