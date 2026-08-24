/**
 * Bulb animation profiles for different lighting technologies.
 * Each profile defines startup behavior, flicker patterns, and warm-up characteristics.
 */

export interface BulbAnimationProfile {
  /** Animation type identifier */
  type: 'led' | 'cfl' | 'fluorescent' | 'incandescent' | 'halogen';
  /** Startup time in milliseconds */
  startupTime: number;
  /** Whether the bulb flickers during startup */
  hasFlicker: boolean;
  /** Flicker pattern: number of flickers before stable */
  flickerCount: number;
  /** Flicker interval in milliseconds */
  flickerInterval: number;
  /** Warm-up time to reach full brightness (ms) */
  warmupTime: number;
  /** Initial opacity during off state */
  offOpacity: number;
  /** Animation easing function */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export const BULB_ANIMATION_PROFILES: Record<string, BulbAnimationProfile> = {
  led: {
    type: 'led',
    startupTime: 50,
    hasFlicker: false,
    flickerCount: 0,
    flickerInterval: 0,
    warmupTime: 100,
    offOpacity: 0.1,
    easing: 'ease-out',
  },
  cfl: {
    type: 'cfl',
    startupTime: 500,
    hasFlicker: true,
    flickerCount: 3,
    flickerInterval: 150,
    warmupTime: 2000,
    offOpacity: 0.05,
    easing: 'linear',
  },
  fluorescent: {
    type: 'fluorescent',
    startupTime: 800,
    hasFlicker: true,
    flickerCount: 5,
    flickerInterval: 100,
    warmupTime: 1500,
    offOpacity: 0.05,
    easing: 'linear',
  },
  incandescent: {
    type: 'incandescent',
    startupTime: 200,
    hasFlicker: false,
    flickerCount: 0,
    flickerInterval: 0,
    warmupTime: 500,
    offOpacity: 0.0,
    easing: 'ease-in',
  },
  halogen: {
    type: 'halogen',
    startupTime: 150,
    hasFlicker: false,
    flickerCount: 0,
    flickerInterval: 0,
    warmupTime: 400,
    offOpacity: 0.0,
    easing: 'ease-in',
  },
};

/**
 * Get the animation profile for a given bulb component type.
 * Falls back to LED profile if no specific match is found.
 */
export function getBulbAnimationProfile(componentType: string): BulbAnimationProfile {
  // Map component types to animation profiles
  const typeMap: Record<string, string> = {
    bulb: 'led',
    'bulb-smart-rgb': 'led',
    'led-downlight': 'led',
    'bulb-cfl': 'cfl',
    'tube-light': 'fluorescent',
    'bulb-incandescent': 'incandescent',
    'bulb-halogen': 'halogen',
  };

  const profileKey = typeMap[componentType] || 'led';
  return BULB_ANIMATION_PROFILES[profileKey] || BULB_ANIMATION_PROFILES.led;
}

/**
 * Calculate current opacity based on animation state.
 * @param profile - The bulb animation profile
 * @param energized - Whether the bulb is currently energized
 * @param timeSinceEnergized - Milliseconds since the bulb was energized
 * @returns Opacity value between 0 and 1
 */
export function calculateBulbOpacity(
  profile: BulbAnimationProfile,
  energized: boolean,
  timeSinceEnergized: number,
): number {
  if (!energized) {
    return profile.offOpacity;
  }

  const { startupTime, hasFlicker, flickerCount, flickerInterval, warmupTime, easing } = profile;
  const totalTime = startupTime + warmupTime;

  if (timeSinceEnergized >= totalTime) {
    return 1.0;
  }

  // Apply easing
  let progress = timeSinceEnergized / totalTime;
  switch (easing) {
    case 'ease-in':
      progress = progress * progress;
      break;
    case 'ease-out':
      progress = 1 - (1 - progress) * (1 - progress);
      break;
    case 'ease-in-out':
      progress = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
      break;
  }

  // Handle flicker pattern
  if (hasFlicker && timeSinceEnergized < startupTime) {
    const flickerPhase = Math.floor(timeSinceEnergized / flickerInterval);
    if (flickerPhase % 2 === 0 && flickerPhase < flickerCount * 2) {
      return profile.offOpacity + (1 - profile.offOpacity) * progress * 0.3;
    }
  }

  return profile.offOpacity + (1 - profile.offOpacity) * progress;
}
