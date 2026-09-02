import { describe, expect, it } from 'vitest';
import { heroOrbitStart, heroOrbitSweep, heroScrollProgress, heroThreeVisibility, sampleHeroOrbit } from './hero-three';

describe('three-dimensional homepage hero', () => {
  it('keeps the mesh fixed while the camera completes a partial 180 degree orbit', () => {
    const opening = sampleHeroOrbit(0, 0);
    const closing = sampleHeroOrbit(1, 0);
    expect(opening.angle).toBeCloseTo(heroOrbitStart, 8);
    expect(closing.angle - opening.angle).toBeCloseTo(heroOrbitSweep, 8);
  });

  it('adds a continuous automatic idle orbit without changing the 180 degree scroll span', () => {
    const idleAngle = Math.PI / 7;
    const opening = sampleHeroOrbit(0, idleAngle);
    const closing = sampleHeroOrbit(1, idleAngle);
    expect(opening.angle - sampleHeroOrbit(0, 0).angle).toBeCloseTo(idleAngle, 8);
    expect(closing.angle - opening.angle).toBeCloseTo(heroOrbitSweep, 8);
  });

  it('maps the sticky hero runway onto the orbit and fades only at the handoff', () => {
    const base = { sectionTop: 0, sectionHeight: 2400, viewportHeight: 1000 };
    expect(heroScrollProgress({ ...base, scrollY: 0 })).toBe(0);
    expect(heroScrollProgress({ ...base, scrollY: 700 })).toBe(0.5);
    expect(heroScrollProgress({ ...base, scrollY: 1400 })).toBe(1);
    expect(heroThreeVisibility(0.89)).toBe(1);
    expect(heroThreeVisibility(1)).toBe(0);
  });
});
