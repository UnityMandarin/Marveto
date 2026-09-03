import { describe, expect, it } from 'vitest';
import {
  advanceHeroCinematicTime,
  heroCinematicDuration,
  heroOrbitStart,
  heroOrbitSweep,
  heroScrollProgress,
  heroThreeVisibility,
  sampleHeroCinematic,
  sampleHeroOrbit,
  sampleHeroPortal,
} from './hero-three';

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
    const base = { sectionTop: 0, sectionHeight: 3600, viewportHeight: 1000 };
    expect(heroScrollProgress({ ...base, scrollY: 0 })).toBe(0);
    expect(heroScrollProgress({ ...base, scrollY: 1300 })).toBe(0.5);
    expect(heroScrollProgress({ ...base, scrollY: 2600 })).toBe(1);
    expect(heroThreeVisibility(0.98)).toBe(1);
    expect(heroThreeVisibility(1)).toBe(0);
  });

  it('holds the orbit before zooming through clouds into the island world', () => {
    expect(sampleHeroPortal(0.5)).toMatchObject({ zoom: 0, cloudMorph: 0, worldReveal: 0 });
    expect(sampleHeroPortal(0.7).zoom).toBeGreaterThan(0.5);
    expect(sampleHeroPortal(0.72).cloudMorph).toBeGreaterThan(0);
    expect(sampleHeroPortal(0.84).worldReveal).toBeGreaterThan(0);
    expect(sampleHeroPortal(1)).toMatchObject({
      orbitProgress: 1,
      zoom: 1,
      cloudMorph: 1,
      worldReveal: 1,
      worldSettle: 1,
    });
  });

  it('runs the locked cinematic through reading, whirlpool, and underwater Axiom', () => {
    expect(sampleHeroCinematic(0).phase).toBe('zoom');
    expect(sampleHeroCinematic(5)).toMatchObject({ phase: 'reading', copyOpacity: 1 });
    expect(sampleHeroCinematic(13).copyOpacity).toBeLessThan(0.02);
    expect(sampleHeroCinematic(19).whirlpool).toBeGreaterThan(0);
    expect(sampleHeroCinematic(22).phase).toBe('blackout');
    expect(sampleHeroCinematic(25).axiomReveal).toBeGreaterThan(0);
    expect(sampleHeroCinematic(heroCinematicDuration)).toMatchObject({ phase: 'complete', complete: true });
  });

  it('plays the same cinematic timeline forward and backward without overshooting', () => {
    expect(advanceHeroCinematicTime(12, 2, 1)).toBe(14);
    expect(advanceHeroCinematicTime(12, 2, -1)).toBe(10);
    expect(advanceHeroCinematicTime(0.5, 2, -1)).toBe(0);
    expect(advanceHeroCinematicTime(heroCinematicDuration - 0.5, 2, 1)).toBe(heroCinematicDuration);
  });
});
