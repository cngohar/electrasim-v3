/**
 * Learner-facing component labels.
 *
 * Re-exported from `domain/componentLabel`, which is where this rule now lives
 * so the canvas can obey it too: the Diagnosis Lab was describing a node as
 * "RCBO (20 A)" while the canvas drew it as "RCBO (32A 30mA)", because the
 * catalogue label embeds a default rating that the generated instance
 * overrides via `state.customMaxAmps`.
 *
 * Kept as a module in its own right because the challenge domain imports it
 * heavily and the indirection documents *why* raw `COMPONENT_DEFS[...].label`
 * must not be used in learner-facing copy.
 */

export { RATING_SUFFIX, instanceLabel, labelById } from '../../componentLabel';
