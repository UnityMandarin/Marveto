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
