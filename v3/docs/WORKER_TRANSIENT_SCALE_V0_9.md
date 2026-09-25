# Worker, transient, and scale hardening v0.9

Status: internally implemented and tested. Hardware/device-lab validation remains an external gate.

## Worker-hosted simulation

The Bun API injects `WorkerSimulationJobHost` into the portable HTTP application. Each simulation executes in a dedicated worker, outside the request event loop, with:

- a maximum of two concurrent workers;
- at most sixteen queued jobs;
- a five-second timeout;
- request abort propagation;
- worker termination as the cancellation boundary; and
- a one-job-per-worker lifecycle that prevents state leaking between circuits.

The portable HTTP application retains an inline fallback for isolated unit tests and non-server adapters. The production build emits both `dist/server.js` and `dist/simulation-worker.js`; the bundled server/worker pair was started and completed a real simulation request successfully.

## Transient motor inrush

Motor components may declare a bounded current multiplier up to 20× and an interval up to 10 seconds. During that interval the solver scales the branch's complex impedance, so protection and conductor calculations consume the transient current rather than a cosmetic overlay. Deterministic `motor.inrush_started` and `motor.inrush_settled` events mark the interval.

This is a bounded educational approximation. It is not a torque-speed model, manufacturer starting-current curve, or motor-protection selection result.

## Energy-flow evidence

The selected-component inspector now repeats solved voltage drop, current, and real power as readable text. Existing animated wire flow remains the spatial view, while the text is available under reduced motion and to assistive technology.

## Validation

- Worker output equals a queued second run for the same circuit.
- An already-aborted signal fails as `simulation_cancelled`.
- Motor startup current exceeds its settled value and emits both transition events.
- Strict TypeScript, Biome, the complete test suite, and both server and worker bundles pass.
- The generated production bundle pair was run on a separate port and returned engine version 0 with eleven snapshots.

## Remaining external gates

Hardware timing comparisons, representative low-power/mobile device testing, production capacity sizing, operational alert thresholds, and independent electrical-model review cannot be completed solely in this repository.
