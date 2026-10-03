import { COMPONENT_DEFS } from '@electrasim/domain';
import { assessPlacement, placementVisible } from '@electrasim/domain/core/placement';
import { resolveDocumentSupply } from '@electrasim/domain/core/supplies';
import { supplyAtTarget } from '@electrasim/domain/core/supplyEditing';
import { useMemo } from 'react';
import { useElectricalEditing } from '../../store/electricalEditing';
import { useCircuitDocument } from '../../store/electricalReadiness';

export function usePlacementGuidance() {
  const circuit = useCircuitDocument();
  const target = useElectricalEditing((s) => s.activeSupply);
  const showAll = useElectricalEditing((s) => s.showAll);
  const supply = useMemo(
    () => supplyAtTarget(circuit, target) ?? resolveDocumentSupply(circuit),
    [circuit, target],
  );
  const results = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(COMPONENT_DEFS).map((type) => [
          type,
          assessPlacement(type, circuit, supply.model),
        ]),
      ),
    [circuit, supply],
  );
  return {
    results,
    supply,
    showAll,
    visible: (type: string) => !!results[type] && placementVisible(results[type]!, showAll),
    hint: (type: string) => {
      const r = results[type];
      return r?.independent
        ? 'Independent source / converter'
        : r?.status === 'compatible'
          ? 'Nominally compatible'
          : r?.status === 'incompatible'
            ? 'Incompatible supply'
            : 'Unassessed ratings / model';
    },
  };
}
