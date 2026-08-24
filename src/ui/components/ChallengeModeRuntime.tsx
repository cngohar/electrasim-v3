import { ChallengeModeSurfaces } from './ChallengeModeSurfaces';
import { ChallengePanel } from './ChallengePanel';

interface Props {
  isPhone: boolean;
  panelOpen: boolean;
}

/** Single lazy boundary for all Challenge Mode code and its optional panel. */
export function ChallengeModeRuntime({ isPhone, panelOpen }: Props) {
  return (
    <>
      <ChallengeModeSurfaces isPhone={isPhone} />
      {panelOpen && <ChallengePanel isPhone={isPhone} />}
    </>
  );
}
