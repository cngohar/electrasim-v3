/**
 * Declarative challenge types (plan §5).
 *
 * A challenge is data: what the learner must build, the parts they may use,
 * the rules that judge their circuit, the hints that guide them, and the
 * message they see when it works. No React, no store, no generator.
 */

import type { Circuit } from '../../types';
import type { ChallengeDifficulty } from '../types';
import type { Rule } from './rules';

/** Overall challenge state (plan §6). */
export type ChallengeState = 'not-started' | 'in-progress' | 'has-errors' | 'complete';

/** Stable, human-facing challenge id (plan §34: never stored in circuit JSON). */
export type ChallengeId =
  | 'first-lamp-tutorial'
  | 'protected-lamp'
  | 'push-button-doorbell'
  | 'rcbo-socket'
  | 'two-way-staircase'
  | 'open-neutral-repair'
  | 'reverse-polarity'
  | 'missing-earth'
  | 'distribution-board'
  | 'smart-lighting-relay'
  | 'rcbo-pump-feeder';

/** Distinguish the no-score first mission from regular Challenge Mode tasks. */
export type ChallengeKind = 'tutorial' | 'challenge';

/** One structured step shown in the objective panel (plan §5 `steps`). */
export interface ChallengeStep {
  /** Stable step key for tutorial progress and analytics. */
  id?: string;
  /** 1-based step number. */
  no: number;
  /** Plain-English instruction. */
  text: string;
  /** Rule ids that must pass before a guided/tutorial step advances. */
  completionRuleIds?: readonly string[];
  /** Optional on-canvas target shown by a tutorial coach. */
  visualTarget?: ChallengeVisualTarget;
}

/** A target the visual hint overlay can point at without coupling validation to coordinates. */
export type ChallengeVisualTarget =
  | {
      kind: 'component';
      componentType: string;
      /** Used only as a visual fallback before the component is placed. */
      fallback?: { x: number; y: number };
    }
  | {
      kind: 'port';
      componentType: string;
      portIndex: number;
      /** Used only as a visual fallback before the component is placed. */
      fallback?: { x: number; y: number };
    }
  | {
      kind: 'connection';
      from: { componentType: string; portIndex: number; occurrence?: number };
      to: { componentType: string; portIndex: number; occurrence?: number };
      /** Used only as a visual fallback before both endpoints are placed. */
      fallback?: { x: number; y: number };
    };

export interface ChallengeVisualHint {
  /** Short label shown next to the arrow. */
  label: string;
  target: ChallengeVisualTarget;
}

/** One progressive hint level (plan §10: concept → component → connection). */
export interface ChallengeHint {
  level: 1 | 2 | 3;
  text: string;
  /** Optional second hint type: an on-canvas arrow/target guide. */
  visual?: ChallengeVisualHint;
}

/**
 * A declarative challenge definition (plan §5).
 *
 * `starter` is the circuit loaded into the editor on start (possibly with a
 * deliberate fault for repair challenges). `rules` is the ordered checklist
 * the validator evaluates — including functional (interaction-evidence)
 * rules, which run the real simulator with evidence states (plan §8).
 */
export interface ChallengeDefinition {
  id: ChallengeId;
  version: number;
  title: string;
  difficulty: ChallengeDifficulty;
  /** Tutorial missions are guided step-by-step and do not use challenge scoring. */
  kind?: ChallengeKind;
  /** Audience gate for advanced exercises; omitted means Student Mode. */
  audience?: 'student' | 'pro';
  /** Estimated completion time in minutes (plan §23–§25). */
  estimatedMinutes: number;

  /** One-line goal (the headline). */
  objective: string;
  /** Short briefing paragraph. */
  brief: string;
  /** What the finished circuit teaches. */
  teaches: string;
  /** Ordered build/repair steps shown in the panel. */
  steps: ChallengeStep[];

  /** The circuit the learner starts from (repair challenges carry the fault). */
  starter: Circuit;
  /**
   * Component types the palette exposes during this challenge, or `null` for
   * the unrestricted palette. Placing anything outside the list produces a
   * warning rather than a rejection (plan §20).
   */
  allowedComponents: readonly string[] | null;

  /** The ordered rule checklist (plan §6, §8). */
  rules: Rule[];

  /** Three progressive hints (plan §10). */
  hints: ChallengeHint[];
  /** Completion message (plan §23–§25). */
  completionMessage: string;
}
