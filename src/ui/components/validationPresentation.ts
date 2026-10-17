import type { ValidationIssue, ValidationReport } from '@electrasim/domain/circuitValidation';

export type CheckSectionId = 'connections' | 'ratings' | 'calculation' | 'teaching';
export function issueSection(issue: ValidationIssue): CheckSectionId {
  if (issue.category === 'cable_sizing' || /rating|voltage_mismatch/.test(issue.id))
    return 'ratings';
  if (['grounding', 'protection', 'compliance'].includes(issue.category)) return 'teaching';
  if (
    ['continuity', 'polarity', 'short_circuit'].includes(issue.category) ||
    /no_supply|no_wires|^input_|electrical_readiness/.test(issue.id)
  )
    return 'connections';
  return 'calculation';
}
/** Counts describe recorded checks/findings, never a percentage of physical safety. */
export function validationSections(report: ValidationReport) {
  const passed: Record<string, CheckSectionId> = {
    pass_continuity: 'connections',
    pass_polarity: 'connections',
    conductor_routing_ok: 'connections',
    pass_cable_sizing: 'ratings',
    pass_grounding: 'teaching',
    pass_protection: 'teaching',
    pass_rcd: 'teaching',
  };
  const incomplete = !!(report.isEmpty || report.isIncomplete);
  return (
    [
      {
        id: 'connections',
        label: 'Connections',
        note: 'Recorded source, terminal and conductor checks.',
        pending: incomplete ? 1 : 0,
      },
      {
        id: 'ratings',
        label: 'Ratings',
        note: 'Declared data and supported cable assumptions; missing values remain unassessed.',
        pending:
          incomplete ||
          report.issues.some(
            (i) => /unassessed|unknown/.test(i.id) && issueSection(i) === 'ratings',
          )
            ? 1
            : 0,
      },
      {
        id: 'calculation',
        label: 'Calculation',
        note: report.calculation?.current
          ? `Current result: ${report.calculation.status}. Device and physics limits still apply.`
          : 'Run the current circuit for calculation evidence.',
        pending: report.calculation?.current ? 0 : 1,
      },
      {
        id: 'teaching',
        label: 'Teaching rules',
        note: 'Limited design guidance. Installation compliance and physical safety remain unassessed.',
        pending: 1,
      },
    ] as const
  ).map((section) => ({
    ...section,
    checked:
      section.id === 'calculation'
        ? Number(!!report.calculation?.current)
        : report.passedChecks.filter((check) => passed[check.id] === section.id).length,
    attention: report.issues.filter(
      (issue) => issue.severity !== 'info' && issueSection(issue) === section.id,
    ).length,
  }));
}
