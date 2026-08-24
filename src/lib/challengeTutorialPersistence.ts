/** Local first-run flag for the Challenge Mode Mission 0 offer. */

export const FIRST_CHALLENGE_TUTORIAL_OFFER_KEY = 'electrasim:challenge-tutorial-offer:v1';

export function hasSeenFirstChallengeTutorialOffer(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(FIRST_CHALLENGE_TUTORIAL_OFFER_KEY) === '1';
  } catch {
    return false;
  }
}

export function markFirstChallengeTutorialOfferSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIRST_CHALLENGE_TUTORIAL_OFFER_KEY, '1');
  } catch {
    // A storage failure should never stop the learner entering Challenge Mode.
  }
}
