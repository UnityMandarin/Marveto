export interface HeroOrbitFrame {
  angle: number;
  radius: number;
  elevation: number;
}

export interface HeroPortalFrame {
  orbitProgress: number;
  zoom: number;
  cloudMorph: number;
  worldReveal: number;
  worldSettle: number;
}

export type HeroCinematicPhase =
  | 'zoom'
  | 'clouds'
  | 'reading'
  | 'islands'
  | 'whirlpool'
  | 'blackout'
  | 'axiom'
  | 'complete';

export interface HeroCinematicFrame extends HeroPortalFrame {
  phase: HeroCinematicPhase;
  copyOpacity: number;
  whirlpool: number;
  darkness: number;
  axiomReveal: number;
  complete: boolean;
}

export const heroOrbitStart = -Math.PI * 0.06;
export const heroOrbitSweep = Math.PI;

export function clampHeroProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(start: number, end: number, value: number): number {
  const normalized = clampHeroProgress((value - start) / Math.max(end - start, 0.0001));
  return normalized * normalized * (3 - 2 * normalized);
}

export function sampleHeroOrbit(progress: number, idleAngle: number): HeroOrbitFrame {
  const clamped = clampHeroProgress(progress);
  const eased = smoothstep(0, 1, clamped);
  return {
    angle: heroOrbitStart + heroOrbitSweep * eased + idleAngle,
    radius: 9.2 - smoothstep(0.48, 1, clamped) * 0.75,
    elevation: 2.4 + Math.sin(clamped * Math.PI) * 0.32,
  };
}

export function sampleHeroPortal(progress: number): HeroPortalFrame {
  const clamped = clampHeroProgress(progress);
  return {
    orbitProgress: clampHeroProgress(clamped / 0.58),
    zoom: smoothstep(0.58, 0.78, clamped),
    cloudMorph: smoothstep(0.65, 0.8, clamped),
    worldReveal: smoothstep(0.8, 0.93, clamped),
    worldSettle: smoothstep(0.86, 0.985, clamped),
  };
}

export function sampleHeroCinematic(seconds: number): HeroCinematicFrame {
  const time = Math.max(0, seconds);
  const zoom = smoothstep(0, 2.2, time);
  const cloudMorph = smoothstep(1.25, 4.1, time);
  const copyOpacity = smoothstep(3.45, 4.25, time) * (1 - smoothstep(12.25, 13.05, time));
  const worldReveal = smoothstep(12.2, 15.8, time);
  const worldSettle = smoothstep(13.4, 16.8, time);
  const whirlpool = smoothstep(17.1, 22.15, time);
  const blackoutIn = smoothstep(21.35, 23.15, time);
  const axiomReveal = smoothstep(23.3, 26.1, time);
  const darkness = blackoutIn * (1 - smoothstep(24.2, 26.35, time));
  const complete = time >= 27;
  const phase: HeroCinematicPhase = complete
    ? 'complete'
    : time >= 23.15
      ? 'axiom'
      : time >= 21.35
        ? 'blackout'
        : time >= 17.1
          ? 'whirlpool'
          : time >= 12.2
            ? 'islands'
            : time >= 4.25
              ? 'reading'
              : time >= 1.25
                ? 'clouds'
                : 'zoom';

  return {
    phase,
    orbitProgress: 1,
    zoom,
    cloudMorph,
    worldReveal,
    worldSettle,
    copyOpacity,
    whirlpool,
    darkness,
    axiomReveal,
    complete,
  };
}

export function heroScrollProgress(options: {
  scrollY: number;
  sectionTop: number;
  sectionHeight: number;
  viewportHeight: number;
}): number {
  const distance = Math.max(options.sectionHeight - options.viewportHeight, 1);
  return clampHeroProgress((options.scrollY - options.sectionTop) / distance);
}

export function heroThreeVisibility(progress: number): number {
  return 1 - smoothstep(0.985, 1, clampHeroProgress(progress));
}
