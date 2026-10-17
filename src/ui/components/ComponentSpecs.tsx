import type { Circuit, ComponentInstance } from '@electrasim/domain';
import { componentReference } from '@electrasim/domain/core/componentReference';

/** Shared by Properties and Specs; current readings belong to the Readings tab. */
export function ComponentSpecs({
  type,
  component,
  circuit,
}: { type: string; component?: ComponentInstance; circuit?: Circuit }) {
  const reference = componentReference(type, component, circuit);
  return (
    <section className="table-component-specs" aria-label="Declared model specifications">
      <h4>Declared model specifications</h4>
      <p>
        <b>{reference.scope}</b> · {reference.family}
      </p>
      <p>
        Consumption and contact capacity are separate declarations. These are model settings, not
        current readings.
      </p>
      {reference.groups.map((group) => (
        <details key={group.id} open={reference.groups.length === 1}>
          <summary>
            {group.role} · {group.terminals.join(' / ') || 'No terminals'}
          </summary>
          <dl>
            {group.rows.map((row) => (
              <div key={row.label}>
                <dt>
                  {row.label}
                  <small>{row.provenance}</small>
                </dt>
                <dd title={row.basis}>
                  {row.value}
                  <small>{row.basis}</small>
                </dd>
              </div>
            ))}
          </dl>
          <p>
            Model: {group.law}. {group.limitation}
          </p>
        </details>
      ))}
      {!reference.groups.length && <p>No terminal rating groups are declared for this entry.</p>}
      <details>
        <summary>Manufacturer data and assessment limits</summary>
        <p>{reference.missingMetadata}</p>
        <p>
          Missing data remains unassessed. Configure declared settings where supported and review
          the connected supply before running.
        </p>
      </details>
    </section>
  );
}
