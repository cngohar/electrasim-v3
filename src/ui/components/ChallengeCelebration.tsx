import { type CSSProperties, useEffect, useState } from 'react';
import { useDeclarativeChallengeStore } from '../../store/declarativeChallengeStore';

const CELEBRATION_PALETTES = [
  ['#2563eb', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e'],
  ['#0ea5e9', '#10b981', '#f97316', '#e11d48', '#7c3aed', '#eab308'],
  ['#4f46e5', '#06b6d4', '#f43f5e', '#84cc16', '#f59e0b', '#c026d3'],
] as const;

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  width: number;
  height: number;
  color: string;
  round: boolean;
}

interface FireworkBurst {
  left: string;
  top: string;
  delay: string;
  color: string;
  rays: number[];
}

interface MissionSpark {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  size: number;
}

interface CelebrationProfile {
  confetti: ConfettiPiece[];
  bursts: FireworkBurst[];
  missionSparks: MissionSpark[];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Generate a fresh visual profile for every completion, not every render. */
function createCelebrationProfile(): CelebrationProfile {
  const palette = CELEBRATION_PALETTES[Math.floor(Math.random() * CELEBRATION_PALETTES.length)]!;
  const confetti = Array.from({ length: 72 }, (_, index) => ({
    left: randomBetween(-2, 102),
    delay: randomBetween(0, 1.35),
    duration: randomBetween(3.7, 5.4),
    drift: randomBetween(-100, 100),
    rotate: randomBetween(0, 360),
    width: randomBetween(5, 9),
    height: randomBetween(9, 15),
    color: palette[index % palette.length]!,
    round: Math.random() > 0.72,
  }));
  const bursts = Array.from({ length: 3 }, (_, index) => {
    const rayCount = Math.floor(randomBetween(10, 16));
    const offset = randomBetween(0, 30);
    return {
      left: `${randomBetween(14, 86)}%`,
      top: `${randomBetween(16, 43)}%`,
      delay: `${index * 0.22 + randomBetween(0, 0.45)}s`,
      color: palette[(index * 2 + 1) % palette.length]!,
      rays: Array.from({ length: rayCount }, (_, ray) => offset + (ray * 360) / rayCount),
    };
  });
  const missionSparks = Array.from({ length: 36 }, () => ({
    left: randomBetween(0, 100),
    delay: randomBetween(0, 0.95),
    duration: randomBetween(2.6, 3.6),
    drift: randomBetween(-70, 70),
    size: randomBetween(4, 8),
  }));
  return { confetti, bursts, missionSparks };
}

/** Full-screen Easter egg shown for a short burst after a challenge completes. */
export function ChallengeCelebration() {
  const status = useDeclarativeChallengeStore((s) => s.status);
  const definition = useDeclarativeChallengeStore((s) => s.definition);
  const [visible, setVisible] = useState(false);
  const [profile, setProfile] = useState<CelebrationProfile>(() => createCelebrationProfile());

  useEffect(() => {
    if (status !== 'completed') {
      setVisible(false);
      return;
    }
    // The status transition is the completion event. A fresh profile makes
    // every retry look different while keeping the normal render stable.
    setProfile(createCelebrationProfile());
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5_200);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (!visible) return null;
  if (definition?.kind === 'tutorial') {
    return <FirstMissionCelebration sparks={profile.missionSparks} />;
  }

  return (
    <div
      data-challenge-celebration="challenge"
      className="pointer-events-none fixed inset-0 z-[45] overflow-hidden"
      aria-hidden="true"
    >
      <div className="challenge-celebration-wash" />
      {profile.bursts.map((burst) => (
        <div
          key={`${burst.left}-${burst.top}-${burst.delay}`}
          className="challenge-firework"
          style={{ left: burst.left, top: burst.top, animationDelay: burst.delay }}
        >
          {burst.rays.map((angle) => (
            <span
              key={angle}
              className="challenge-firework-ray"
              style={
                {
                  '--firework-angle': `${angle}deg`,
                  backgroundColor: burst.color,
                } as CSSProperties
              }
            />
          ))}
          <span className="challenge-firework-core" style={{ backgroundColor: burst.color }} />
        </div>
      ))}
      {profile.confetti.map((piece, index) => (
        <span
          key={index}
          className="challenge-confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              width: `${piece.width}px`,
              height: `${piece.height}px`,
              backgroundColor: piece.color,
              borderRadius: piece.round ? '999px' : '2px',
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              '--confetti-drift': `${piece.drift}px`,
              '--confetti-rotate': `${piece.rotate}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** A first-spark celebration deliberately different from the full challenge fireworks. */
function FirstMissionCelebration({ sparks }: { sparks: MissionSpark[] }) {
  return (
    <div
      data-challenge-celebration="mission"
      className="pointer-events-none fixed inset-0 z-[45] overflow-hidden"
      aria-hidden="true"
    >
      <div className="mission-celebration-wash" />
      <div className="mission-celebration-trace mission-celebration-trace-one" />
      <div className="mission-celebration-trace mission-celebration-trace-two" />
      <div className="mission-celebration-ring" />
      <div className="mission-celebration-banner">
        <span className="mission-celebration-kicker">FIRST SPARK</span>
        <strong>MISSION COMPLETE</strong>
        <span>Your first circuit is alive.</span>
      </div>
      {sparks.map((spark, index) => (
        <span
          key={index}
          className="mission-celebration-spark"
          style={
            {
              left: `${spark.left}%`,
              width: `${spark.size}px`,
              height: `${spark.size}px`,
              animationDelay: `${spark.delay}s`,
              animationDuration: `${spark.duration}s`,
              '--mission-drift': `${spark.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
