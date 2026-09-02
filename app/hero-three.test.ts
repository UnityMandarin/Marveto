import { describe, expect, it } from 'vitest';
import { heroOrbitStart, heroOrbitSweep, heroScrollProgress, heroThreeVisibility, sampleHeroOrbit } from './hero-three';

describe('three-dimensional homepage hero', () => {
  it('keeps the mesh fixed while the camera completes a partial 180 degree orbit', () => {
    const opening = sampleHeroOrbit(0, 0);
    const closing = sampleHeroOrbit(1, 0);
    expect(opening.angle).toBeCloseTo(heroOrbitStart, 8);
    expect(closing.angle - opening.angle).toBeCloseTo(heroOrbitSweep, 8);
  });

  it('adds a restrained automatic idle orbit without changing the scroll endpoint', () => {
    const centered = sampleHeroOrbit(0, 0);
    const idle = sampleHeroOrbit(0, Math.PI / 2);
    expect(idle.angle).toBeGreaterThan(centered.angle);
    expect(idle.angle - centered.angle).toBeLessThan(Math.PI / 45);
    expect(sampleHeroOrbit(1, Math.PI / 2).angle).toBeCloseTo(sampleHeroOrbit(1, 0).angle, 8);
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
