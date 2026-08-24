/**
 * Tour persistence — tiny, dependency-free localStorage helpers.
 *
 * Kept separate from `steps.ts` so always-mounted UI (the offer chip) can
 * check completion state without pulling the full tutorial copy into the
 * initial bundle; the step scripts load lazily with the overlay.
 */

export type TourId = 'student' | 'pro';

export const TOUR_DONE_KEY = (id: TourId) => `electrasim:tour:${id}:v1:done`;
export const TOUR_OFFER_DISMISSED_KEY = 'electrasim:tour:offer:v1:dismissed';

export function markTourDone(id: TourId): void {
  try {
    window.localStorage.setItem(TOUR_DONE_KEY(id), '1');
  } catch {
    /* private mode — the tour simply re-offers next visit */
  }
}

export function isTourDone(id: TourId): boolean {
  try {
    return window.localStorage.getItem(TOUR_DONE_KEY(id)) === '1';
  } catch {
    return false;
  }
}

export function dismissTourOffer(): void {
  try {
    window.localStorage.setItem(TOUR_OFFER_DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isTourOfferDismissed(): boolean {
  try {
    return window.localStorage.getItem(TOUR_OFFER_DISMISSED_KEY) === '1';
  } catch {
    return true;
  }
}
