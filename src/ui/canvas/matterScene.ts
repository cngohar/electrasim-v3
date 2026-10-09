import { Bodies, type Body, Composite, Constraint, Engine } from 'matter-js';
import { MATTER_EFFECT_LIMIT, type MatterEffectKind } from './matterEffects';

export interface EffectAnchor {
  key: string;
  kind: MatterEffectKind;
  x: number;
  y: number;
  /** Wire tangent, or null for a device stress/damage halo. */
  tangent: { x: number; y: number } | null;
}

/** Isolated illustrative physics. No circuit, solver, store or wall-clock time input. */
export function createMatterScene(anchors: readonly EffectAnchor[]) {
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 0.35;
  const entries = anchors.slice(0, MATTER_EFFECT_LIMIT).map((anchor) => {
    const { x, y, tangent } = anchor;
    const bodies: Body[] = [];
    if (tangent) {
      const offsets = anchor.kind === 'damage' ? [-1, 1] : [0];
      for (const offset of offsets) {
        const body = Bodies.circle(x + tangent.x * offset * 6, y + tangent.y * offset * 6, 2, {
          frictionAir: 0.12,
          collisionFilter: { mask: 0 },
        });
        bodies.push(body);
        Composite.add(engine.world, body);
        const ends = offset === 0 ? [-1, 1] : [offset];
        for (const end of ends)
          Composite.add(
            engine.world,
            Constraint.create({
              pointA: { x: x + tangent.x * end * 24, y: y + tangent.y * end * 24 },
              bodyB: body,
              length: offset === 0 ? 26 : 18,
              stiffness: 0.25,
              damping: 0.15,
            }),
          );
      }
    } else {
      const body = Bodies.circle(x, y - 4, 2, { frictionAir: 0.15, collisionFilter: { mask: 0 } });
      bodies.push(body);
      Composite.add(engine.world, [
        body,
        Constraint.create({
          pointA: { x, y },
          bodyB: body,
          length: 8,
          stiffness: 0.2,
          damping: 0.15,
        }),
      ]);
    }
    return { anchor, bodies };
  });
  return {
    bodyCount: Composite.allBodies(engine.world).length,
    step() {
      // Two bounded 60 Hz substeps for a 30 Hz presentation. No catch-up on resume.
      Engine.update(engine, 1000 / 60);
      Engine.update(engine, 1000 / 60);
      return entries.map(({ anchor, bodies }) => {
        const { x, y, tangent } = anchor;
        const clamp = (n: number, origin: number) =>
          Math.max(origin - 32, Math.min(origin + 32, n));
        const point = (body: Body) => `${clamp(body.position.x, x)} ${clamp(body.position.y, y)}`;
        if (!tangent) {
          const radius = 13 + Math.min(5, Math.abs(bodies[0].position.y - y));
          return {
            key: anchor.key,
            d: `M ${x - radius} ${y} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
          };
        }
        const a = `${x - tangent.x * 24} ${y - tangent.y * 24}`;
        const b = `${x + tangent.x * 24} ${y + tangent.y * 24}`;
        return {
          key: anchor.key,
          d:
            anchor.kind === 'damage'
              ? `M ${a} Q ${a} ${point(bodies[0])} M ${b} Q ${b} ${point(bodies[1])}`
              : `M ${a} Q ${point(bodies[0])} ${b}`,
        };
      });
    },
    dispose() {
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    },
  };
}
