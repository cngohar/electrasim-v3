/**
 * Tour card placement — pure geometry so it can be unit-tested.
 *
 * Given the spotlighted target rect and the viewport, choose the side with
 * the most room (bottom → top → right → left preference on ties within a
 * side that fits) and clamp the card fully on-screen.
 */

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type Side = 'bottom' | 'top' | 'right' | 'left';

export interface CardPlacement {
  side: Side;
  top: number;
  left: number;
  /** Arrow offset along the card edge, px from the card's top-left corner. */
  arrow: number;
}

const GAP = 14; // spotlight ring → card gap
const MARGIN = 8; // viewport clamp margin

export function placeCard(
  target: Rect,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
): CardPlacement {
  const space: Record<Side, number> = {
    bottom: viewport.height - (target.top + target.height),
    top: target.top,
    right: viewport.width - (target.left + target.width),
    left: target.left,
  };

  const fits: Side[] = [];
  if (space.bottom >= card.height + GAP) fits.push('bottom');
  if (space.top >= card.height + GAP) fits.push('top');
  if (space.right >= card.width + GAP) fits.push('right');
  if (space.left >= card.width + GAP) fits.push('left');

  const side: Side =
    fits[0] ??
    ((['bottom', 'top', 'right', 'left'] as Side[]).sort((a, b) => space[b] - space[a])[0] ||
      'bottom');

  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;

  let top: number;
  let left: number;
  if (side === 'bottom') {
    top = target.top + target.height + GAP;
    left = cx - card.width / 2;
  } else if (side === 'top') {
    top = target.top - card.height - GAP;
    left = cx - card.width / 2;
  } else if (side === 'right') {
    top = cy - card.height / 2;
    left = target.left + target.width + GAP;
  } else {
    top = cy - card.height / 2;
    left = target.left - card.width - GAP;
  }

  // Clamp fully on-screen.
  left = Math.min(Math.max(left, MARGIN), viewport.width - card.width - MARGIN);
  top = Math.min(Math.max(top, MARGIN), viewport.height - card.height - MARGIN);

  // Arrow points back at the target centre from the card's edge.
  const arrow =
    side === 'bottom' || side === 'top'
      ? Math.min(Math.max(cx - left, 18), card.width - 18)
      : Math.min(Math.max(cy - top, 18), card.height - 18);

  return { side, top, left, arrow };
}
