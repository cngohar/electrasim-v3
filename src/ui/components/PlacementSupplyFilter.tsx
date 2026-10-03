import { COMPONENT_DEFS } from '@electrasim/domain';
import { sourceInterface } from '@electrasim/domain/core/supplies';
import { supplyDescription } from '@electrasim/domain/core/supplyEditing';
import { useElectricalEditing } from '../../store/electricalEditing';
import { useCircuitDocument } from '../../store/electricalReadiness';
import { usePlacementGuidance } from '../hooks/usePlacementGuidance';

export function PlacementSupplyFilter() {
  const circuit = useCircuitDocument();
  const target = useElectricalEditing((s) => s.activeSupply);
  const { supply, showAll } = usePlacementGuidance();
  const sources = circuit.components.filter((c) =>
    ['ac-source', 'dc-source'].includes(sourceInterface(c.type) ?? ''),
  );
  const selected =
    target.kind === 'component' && sources.some((c) => c.id === target.componentId)
      ? target.componentId
      : '';
  return (
    <div className="space-y-1.5 border-b border-slate-200 p-2.5 text-[10px] text-slate-700 dark:border-slate-700 dark:text-slate-200">
      <label>
        Placement supply
        <select
          aria-label="Placement supply"
          className="mt-1 w-full rounded border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
          value={selected}
          onChange={(e) =>
            useElectricalEditing.setState({
              activeSupply: e.target.value
                ? { kind: 'component', componentId: e.target.value }
                : { kind: 'document' },
            })
          }
        >
          <option value="">Document supply</option>
          {sources.map((c) => (
            <option key={c.id} value={c.id}>
              {COMPONENT_DEFS[c.type]?.label} · {c.id}
            </option>
          ))}
        </select>
      </label>
      <p>{supplyDescription(supply)}</p>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => useElectricalEditing.setState({ showAll: e.target.checked })}
        />
        Show all / fault exercise
      </label>
      <p>
        {showAll
          ? 'Incompatible and unassessed parts are labeled. Membership requirements still apply.'
          : 'Nominally compatible parts plus independent sources/converters. Show all includes unknown ratings and models.'}
      </p>
    </div>
  );
}
