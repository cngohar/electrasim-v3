# Relay switching report — local verification, 2026-09-28

The user supplied a live-site contact report: energising relay coils did not operate the contacts, and manual operation appeared to energise both NO and NC. This investigation uses the V3 checkout only; the live site and its Cloudflare account were not accessed.

## Reproduction and cause

The pre-fix `simulation/traversal.ts` joined all terminals with the same rail type. On SPDT and industrial control relays that joined Coil+, COM, NO and NC. The generic switch gate also opened every path in the released position, so COM–NC never operated as a normally closed contact. No solver stage derived contact operation from coil supply. Multi-pole contactors shared the same inappropriate same-rail expansion.

## Phase assignment

The electrical fix belongs to **1.5, State, simulation and persistence**, before later visual effects. Phase 1.7 retains responsibility for the broader inspector and palette redesign; its controls must show the actual selected throw and automatic coil state. User confirmed: SPST and SPDT relays remain free; DPDT and industrial control relays remain Pro. Membership never changes relay physics.

Implemented locally:

- Explicit, isolated switch poles, including exclusive COM–NO / COM–NC selection and separate contactor phases.
- Ideal automatic coil control when either coil terminal is wired; both correct supply rails are required. An unwired coil supports manual bench testing. Coil and power contacts have no internal conductive connection.
- Bounded fixed-point resolution for control chains. Unstable feedback produces an error and leaves controlled contacts open rather than inventing a settled result.
- Derived coil state is returned by the solver and displayed without overwriting the saved manual switch state.
- DPDT NC1/NC2 are appended as ports 6/7, preserving the original six saved terminal indices.

Limitations: this is a static rail-continuity model. It does not assess coil pickup/dropout voltage, contact ratings beyond the modeled component fields, mechanical delays, coil transients or dynamic oscillators. Multi-pole contactors without coil terminals retain manual operation.

## Evidence

`packages/domain/src/simulation/relays.test.ts` covers manual NO/NC transfer, automatic operation/dropout, coil/contact isolation, DPDT pole isolation, contactor phase isolation, unstable feedback and free/Pro classification. The relay, template and generator/scenario selection gate passed 97 tests. An independent comparison against the pre-change Git HEAD generated 300 version-1 beginner/intermediate/advanced scenarios: all faulted circuit documents matched. Evidence: `.wrangler/phase15-legacy-generator-comparison.json` and `.wrangler/phase-1.5-relays.log`.

Phase 1.5 integration is verified in [the persistence audit](phase-1-persistence.md). The Chromium relay test imports a guest SPDT circuit, operates its coil supply with the keyboard and verifies exclusive NO/NC transfer, dropout, the derived accessible switch state and actual Comlink worker use.
