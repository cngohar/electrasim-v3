import type { WireInstance } from '@electrasim/domain';
import { assessWireCapacity } from '@electrasim/domain/core/wireCapacity';
import { WIRE_AWG_MM2, resolveWireProperties } from '@electrasim/domain/core/wireProperties';
import { useCircuitStore } from '../../../store/circuitStore';

export const INSTALLATION_NAMES = {
  C: 'Clipped direct',
  B1: 'Conduit',
  A: 'Thermal insulation',
} as const;
const provenance = {
  wire: 'Saved wire value',
  'wire-awg': 'Saved AWG conversion',
  endpoint: 'Endpoint advice',
  default: 'Default assumption',
};

/** One resolved summary for saved Properties and the explicit Configure preview. */
export function WirePropertiesSummary({
  wire,
  caption = 'Saved wire properties',
}: { wire: WireInstance; caption?: string }) {
  const components = useCircuitStore((s) => s.components);
  const properties = resolveWireProperties(wire, new Map(components.map((c) => [c.id, c])));
  const capacity = assessWireCapacity(properties);
  const awg = Object.entries(WIRE_AWG_MM2).find(([, mm2]) => mm2 === properties.cableMm2)?.[0];
  return (
    <section className="wire-properties-summary" aria-label={caption}>
      <h4>{caption}</h4>
      <div className="wire-material-summary">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="var(--table-soft)" stroke="currentColor" />
          <circle
            cx="20"
            cy="20"
            r="11"
            fill={properties.material === 'copper' ? '#b77b47' : '#9aa5b3'}
            stroke="currentColor"
          />
        </svg>
        <div>
          <b>
            {awg ? `${awg} AWG${wire.gauge === Number(awg) ? '' : ' equivalent'} · ` : ''}
            {properties.cableMm2} mm²
          </b>
          <p>{properties.material === 'copper' ? 'Copper · Cu' : 'Aluminium · Al'}</p>
          <small>
            {provenance[properties.provenance.cableMm2]} ·{' '}
            {provenance[properties.provenance.material]}
          </small>
        </div>
      </div>
      <div className="wire-method-summary">
        <svg viewBox="0 0 48 36" aria-hidden="true">
          <rect
            x="3"
            y="4"
            width="42"
            height="28"
            rx="3"
            fill="var(--table-soft)"
            stroke="currentColor"
          />
          {properties.installationMethod === 'A' ? (
            <path d="m6 8 8 10-8 10m36-20-8 10 8 10" fill="none" stroke="currentColor" />
          ) : properties.installationMethod === 'B1' ? (
            <circle cx="24" cy="18" r="10" fill="none" stroke="currentColor" />
          ) : (
            <path d="M8 27H40M13 27V12M35 27V12" fill="none" stroke="currentColor" />
          )}
          <circle cx="24" cy="18" r="5" fill="none" stroke="currentColor" />
        </svg>
        <div>
          <b>
            Method {properties.installationMethod} ·{' '}
            {INSTALLATION_NAMES[properties.installationMethod]}
          </b>
          <small>
            {provenance[properties.provenance.installationMethod]} · teaching installation model
          </small>
        </div>
      </div>
      <dl>
        <div>
          <dt>
            Physical length<small>{provenance[properties.provenance.lengthMeters]}</small>
          </dt>
          <dd>{properties.lengthMeters} m</dd>
        </div>
        <div>
          <dt>
            Derating factor<small>{provenance[properties.provenance.deratingFactor]}</small>
          </dt>
          <dd>{properties.deratingFactor}</dd>
        </div>
        <div>
          <dt>
            Model resistance<small>20 °C material approximation</small>
          </dt>
          <dd>{Number(properties.resistanceOhms.toPrecision(5))} Ω</dd>
        </div>
        <div>
          <dt>
            Capacity
            <small>
              {capacity.status === 'estimated'
                ? 'Teaching estimate after derating'
                : 'No supported table row'}
            </small>
          </dt>
          <dd>
            {capacity.deratedAmps === null
              ? 'Not assessed for this area'
              : `${Number(capacity.deratedAmps.toFixed(3))} A estimated`}
          </dd>
        </div>
      </dl>
      {properties.material === 'aluminum' && (
        <p className="table-warning">
          Aluminium capacity uses the existing 0.78 copper-table approximation where a table row
          exists.
        </p>
      )}
      <details>
        <summary>Calculation and capacity assumptions</summary>
        <p>{capacity.basis}</p>
        <p>
          Resistance is calculated from the resolved area, material and physical length. Route
          geometry and conductor-role colours are independent of these properties.
        </p>
      </details>
    </section>
  );
}
