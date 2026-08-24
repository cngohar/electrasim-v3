import { ChallengeCelebration } from './ChallengeCelebration';
import { ChallengeFocusOverlay } from './ChallengeFocusOverlay';
import { ChallengeHintOverlay } from './ChallengeHintOverlay';
import { ChallengeModeIndicator } from './ChallengeModeIndicator';
import { ChallengePauseOverlay } from './ChallengePauseOverlay';
import { ChallengeTutorialOverlay } from './ChallengeTutorialOverlay';

interface Props {
  isPhone: boolean;
}

/** Lazy-loaded chrome for Challenge Mode so the normal editor stays lean. */
export function ChallengeModeSurfaces({ isPhone }: Props) {
  return (
    <>
      <ChallengeTutorialOverlay />
      <ChallengeHintOverlay />
      <ChallengeFocusOverlay />
      <ChallengePauseOverlay />
      <ChallengeModeIndicator isPhone={isPhone} />
      <ChallengeCelebration />
    </>
  );
}
