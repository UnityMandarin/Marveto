export interface HeroOrbitFrame {
  angle: number;
  radius: number;
  elevation: number;
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
  return 1 - smoothstep(0.9, 1, clampHeroProgress(progress));
}
