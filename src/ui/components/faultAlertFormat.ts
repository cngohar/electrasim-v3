/**
 * Shared presentation of a protective-device operation, used by both the
 * blocking fault alert and the "What happened?" recap so the two never drift.
 */

export { formatClearingTime } from '@electrasim/domain/simulation/tripCurves';

/**
 * Which element inside the device operated. Naming it is the point: a thermal
 * trip means "the load is too big for this circuit", a magnetic trip means "a
 * fault current flowed", and a residual trip means "current went somewhere it
 * should not have" — three different faults with three different fixes.
 */
export const MECHANISM_LABEL: Record<'thermal' | 'magnetic' | 'residual' | 'arc', string> = {
  thermal: 'thermal element',
  magnetic: 'magnetic element',
  residual: 'residual coil',
  arc: 'arc detection',
};
