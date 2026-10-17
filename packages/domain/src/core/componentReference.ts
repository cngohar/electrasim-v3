import { COMPONENT_DEFS } from '../components';
import type { Circuit, ComponentInstance } from '../types';
import { type ElectricalRating, resolveDeviceCapabilities } from './capabilities';
import { createEmptyCircuit, normalizeCircuitDocument } from './normalize';

export interface ReferenceRow {
  label: string;
  value: string;
  provenance: string;
  basis: string;
}

/** The same declared ratings used by preflight, with no manufacturer data inferred. */
export function componentReference(type: string, instance?: ComponentInstance, circuit?: Circuit) {
  const def = COMPONENT_DEFS[type];
  const document = circuit ?? createEmptyCircuit();
  const component =
    instance ??
    normalizeCircuitDocument({
      ...document,
      components: [{ id: 'catalogue-reference', type, x: 0, y: 0, state: {} }],
      wires: [],
    }).components[0]!;
  const capabilities = resolveDeviceCapabilities(component, document);
  function row<T>(
    label: string,
    rating: ElectricalRating<T>,
    format: (value: T) => string,
  ): ReferenceRow {
    return rating.status === 'known'
      ? {
          label,
          value: format(rating.value),
          provenance:
            rating.provenance === 'instance'
              ? 'Saved instance'
              : rating.provenance === 'catalogue'
                ? 'Catalogue declaration'
                : 'Teaching assumption',
          basis: rating.basis,
        }
      : { label, value: 'Not declared', provenance: 'Missing data', basis: rating.reason };
  }
  return {
    type,
    title: def?.label ?? type,
    family: capabilities.family,
    scope: instance ? 'Selected instance' : 'Catalogue defaults',
    terminals:
      def?.ports.map((port, index) => ({ index, label: port.label, role: port.type })) ?? [],
    groups: capabilities.groups.map((group) => ({
      id: group.id,
      role: group.role,
      terminals: group.ports.map((index) => def?.ports[index]?.label ?? String(index)),
      rows: [
        row('Supply kind', group.supplyKinds, (values) => values.join(', ')),
        row(
          group.voltageConvention === 'line-to-line'
            ? 'Nominal line-to-line voltage'
            : 'Nominal terminal-pair voltage',
          group.nominalVoltage,
          (value) => `${value} V`,
        ),
        row('Nominal consumption', group.nominalPowerWatts, (value) => `${value} W`),
        row('Maximum voltage', group.maximumVoltage, (value) => `${value} V`),
        row('Contact / device capacity', group.currentCapacityAmps, (value) => `${value} A`),
        row(
          'Operating voltage range',
          group.operatingVoltageRange,
          (value) => `${value.min}–${value.max} V`,
        ),
        group.frequencyHz.status === 'independent'
          ? {
              label: 'Frequency',
              value: 'Frequency independent',
              provenance: 'Declared model',
              basis: group.frequencyHz.basis,
            }
          : row('Frequency', group.frequencyHz, (values) => `${values.join(', ')} Hz`),
      ],
      law: group.loadLaw.kind,
      limitation:
        'approximation' in group.loadLaw
          ? group.loadLaw.approximation
          : 'reason' in group.loadLaw
            ? group.loadLaw.reason
            : 'Only the declared terminal connectivity is represented.',
    })),
    missingMetadata:
      'Manufacturer IP rating, breaking capacity, installation suitability and product certification are not declared by this teaching model. Consult the actual product documentation.',
  };
}
