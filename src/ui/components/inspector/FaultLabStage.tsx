import { COMPONENT_DEFS, type Circuit, type FaultTarget, type FaultType } from '@electrasim/domain';
import { useEffect, useRef } from 'react';
import { FaultApplicationPreview } from './FaultApplicationPreview';
import { FaultCircuitOverview } from './FaultTargetApplicationDiagram';
import type { FaultResponse } from './faultLabEvidence';

/** Matter moves two decorative conductor ends; static SVG describes the same gap. */
function useConductorMotion(enabled: boolean) {
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;
    void import('matter-js')
      .then(({ default: Matter }) => {
        if (disposed) return;
        const engine = Matter.Engine.create();
        engine.gravity.y = 0.25;
        const bodies = [Matter.Bodies.circle(0, 0, 4), Matter.Bodies.circle(0, 0, 4)];
        Matter.Composite.add(engine.world, bodies);
        let last = 0;
        const tick = (now: number) => {
          if (disposed || document.hidden) return;
          if (now - last >= 1000 / 30) {
            last = now;
            Matter.Engine.update(engine, 1000 / 60);
            for (const body of bodies) {
              Matter.Body.setPosition(body, { x: 0, y: Math.min(8, Math.max(0, body.position.y)) });
              if (body.position.y >= 8) Matter.Body.setVelocity(body, { x: 0, y: 0 });
            }
            ref.current?.setAttribute(
              'transform',
              `translate(0 ${bodies[0].position.y.toFixed(2)})`,
            );
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        cleanup = () => {
          Matter.Composite.clear(engine.world, false);
          Matter.Engine.clear(engine);
        };
      })
      .catch(() => {
        ref.current?.removeAttribute('transform');
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup?.();
      ref.current?.removeAttribute('transform');
    };
  }, [enabled]);
  return ref;
}

export function FaultLabStage({
  circuit,
  response,
  inside,
  playing,
  stage,
  reduced,
  suspended,
  appliedFault,
}: {
  circuit: Circuit;
  response: FaultResponse | null;
  inside: boolean;
  playing: boolean;
  stage: number;
  reduced: boolean;
  suspended: boolean;
  appliedFault: { type: FaultType; target: FaultTarget } | null;
}) {
  const opened =
    !!response &&
    !response.unassessed &&
    (response.damaged ||
      response.damage?.damaged ||
      response.faults.some((f) =>
        ['open-circuit', 'open-live', 'open-neutral', 'open-earth', 'terminal-disconnect'].includes(
          f.type,
        ),
      ));
  const short =
    !!response && !response.unassessed && response.faults.some((f) => f.type === 'short-circuit');
  const ends = useConductorMotion(
    !appliedFault && opened && playing && !reduced && !suspended && inside,
  );
  if (appliedFault && inside)
    return (
      <div className="fault-lab-stage" data-fault-stage={response ? 'captured' : 'awaiting-run'}>
        <FaultApplicationPreview
          circuit={circuit}
          target={appliedFault.target}
          type={appliedFault.type}
          applied
          captured={!!response}
          unassessed={response?.unassessed === true}
        />
      </div>
    );
  if (!inside)
    return (
      <div className="fault-lab-stage" data-fault-stage={response ? 'captured' : 'awaiting-run'}>
        <FaultCircuitOverview
          circuit={circuit}
          target={appliedFault?.target ?? response?.target ?? null}
        />
        <small>Saved connections and fault edits · run for electrical readings</small>
      </div>
    );
  const targetId =
    response?.target.type === 'port' ? response.target.componentId : response?.target.id;
  const component = circuit.components.find((c) => c.id === targetId);
  const isLamp = component && COMPONENT_DEFS[component.type]?.category === 'lighting';
  return (
    <div className="fault-lab-stage" data-fault-stage={response ? 'captured' : 'unavailable'}>
      <svg viewBox="0 0 680 410" role="img" aria-label="Representative selected-target cutaway">
        <title>Explanatory geometry; canonical circuit terminals are unchanged</title>
        <>
          <rect x="30" y="50" width="620" height="180" rx="28" fill="#142733" />
          <text x="48" y="77" fill="#a4becb" fontSize="12">
            {response?.label || 'Select a real circuit target'}
          </text>
          {response?.unassessed ? (
            <text x="340" y="145" textAnchor="middle" fill="#cfb482">
              Electrical consequence unassessed
            </text>
          ) : response?.target.type === 'wire' || response?.target.type === 'port' ? (
            <>
              <path
                d={opened ? 'M 80 140 H 315 M 365 140 H 600' : 'M 80 140 H 600'}
                stroke="#d9a276"
                strokeWidth="18"
                fill="none"
                strokeLinecap="round"
              />
              {opened && (
                <g ref={ends}>
                  <path
                    d="M 295 140 L 314 152 M 386 140 L 365 152"
                    stroke="#f2bf89"
                    strokeWidth="5"
                  />
                  <text x="340" y="185" textAnchor="middle" fill="#bdd0da">
                    Open path
                  </text>
                </g>
              )}
              <text x="85" y="210" fill="#96b2c1" fontSize="12">
                From terminal
              </text>
              <text x="505" y="210" fill="#96b2c1" fontSize="12">
                To terminal
              </text>
            </>
          ) : isLamp ? (
            <>
              {response?.energized && (
                <ellipse cx="340" cy="140" rx="66" ry="70" fill="#f0c46c" opacity="0.13" />
              )}
              <ellipse
                cx="340"
                cy="137"
                rx="41"
                ry="48"
                fill="none"
                stroke={response?.energized ? '#f0c46c' : '#94aabb'}
                strokeWidth="3"
              />
              <path
                d="M 325 180 V 205 H 355 V 180 M 327 158 L 337 136 L 343 158 L 353 136"
                fill="none"
                stroke="#beaa83"
                strokeWidth="3"
              />
            </>
          ) : (
            <>
              <path
                d={opened ? 'M 85 150 H 270 M 410 150 H 595' : 'M 85 150 H 595'}
                stroke="#b49978"
                strokeWidth="8"
                fill="none"
              />
              <rect
                x="240"
                y="100"
                width="200"
                height="100"
                rx="15"
                fill="#263e4e"
                stroke="#7e9dad"
              />
              <text x="340" y="145" textAnchor="middle" fill="#d6e2e8">
                {short
                  ? 'Declared L–N bridge'
                  : COMPONENT_DEFS[component?.type ?? '']?.label || 'Selected device'}
              </text>
              <text x="340" y="171" textAnchor="middle" fill="#a9becb" fontSize="12">
                {response ? 'Accepted state · inspect readings' : 'Run to capture a response'}
              </text>
            </>
          )}
          <text x="48" y="260" fill="#93afbd" fontSize="12">
            Causal walkthrough · stage {stage + 1} · no temperature or arc prediction
          </text>
          {response &&
            !response.unassessed &&
            response.protection.slice(0, 3).map((p, index) => (
              <g key={p.componentId} transform={`translate(${45 + index * 205} 290)`}>
                <rect width="185" height="90" rx="12" fill="#223c4b" stroke="#668b9f" />
                <text x="12" y="20" fill="#c5d7e0" fontSize="11">
                  {p.componentId} · {p.tripped ? 'tripped' : p.closed ? 'closed' : 'OFF'}
                </text>
                <path
                  d="M 20 55 H 62 M 125 55 H 165"
                  fill="none"
                  stroke="#bdb09b"
                  strokeWidth="4"
                />
                <path
                  d={p.closed ? 'M 62 55 H 125' : 'M 62 55 L 112 35'}
                  fill="none"
                  stroke="#e3bc80"
                  strokeWidth="4"
                />
                <text x="12" y="79" fill="#a9c1ce" fontSize="10">
                  Accepted contact position
                </text>
              </g>
            ))}
          {response?.damage && !response.unassessed && (
            <g transform="translate(45 390)">
              <rect width="590" height="5" rx="2" fill="#43515c" />
              <rect
                width={Math.min(
                  590,
                  Math.max(0, (response.damage.exposure / response.damage.budget) * 590),
                )}
                height="5"
                rx="2"
                fill="#dbaa76"
              />
              <title>
                Declared stress exposure {response.damage.exposure} / {response.damage.budget}{' '}
                {response.damage.unit}. No temperature is calculated.
              </title>
            </g>
          )}
        </>
      </svg>
      <small>Representative cutaway · presentation only</small>
    </div>
  );
}
