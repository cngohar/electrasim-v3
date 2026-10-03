import type { Circuit } from '../types';
import {
  resolveDocumentSupply,
  resolveSourceProfile,
  sameSupplyModel,
  sourceInterface,
} from './supplies';

/** Grading uses the authored supply, even for imported or direct API submissions.
 * Construction exercises may add sources at the declared document supply;
 * diagnosis keeps the original source inventory and independent profiles.
 */
export function exerciseSupplyIssue(
  authored: Circuit,
  submitted: Circuit,
  allowNewSources = false,
): string | null {
  const expected = resolveDocumentSupply(authored).model;
  const issue =
    'Restore the exercise’s authored supply and source settings before submitting a repair.';
  if (!sameSupplyModel(expected, resolveDocumentSupply(submitted).model)) return issue;
  const sources = new Map(
    authored.components.filter((c) => sourceInterface(c.type)).map((c) => [c.id, c]),
  );
  for (const [id, source] of sources) {
    const current = submitted.components.find((c) => c.id === id);
    if (!current || current.type !== source.type) return issue;
    const before = resolveSourceProfile(source.type, source.state, authored);
    const after = resolveSourceProfile(current.type, current.state, submitted);
    if (!before || !after || !sameSupplyModel(before.model, after.model)) return issue;
  }
  for (const source of submitted.components.filter(
    (c) => sourceInterface(c.type) && !sources.has(c.id),
  )) {
    const profile = resolveSourceProfile(source.type, source.state, submitted);
    if (!allowNewSources || !profile || !sameSupplyModel(profile.model, expected)) return issue;
  }
  return null;
}
