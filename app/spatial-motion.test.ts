import { describe, expect, it } from 'vitest';
import { spatialFrame } from './spatial-motion';

describe('scroll-linked spatial composition', () => {
  it('returns exactly to a scene when scrolling back, with no accumulated time', () => {
    const first = spatialFrame(650, 200, 1800, 900);
    spatialFrame(1100, 200, 1800, 900);
    expect(spatialFrame(650, 200, 1800, 900)).toEqual(first);
    expect(first.progress).toBe(.5);
  });
  it('stays stationary at rest and moves both layers forward monotonically', () => {
    const samples = [200, 500, 800, 1100].map((y) => spatialFrame(y, 200, 1800, 900));
    samples.slice(1).forEach((sample, index) => {
      expect(sample.scale).toBeGreaterThan(samples[index].scale);
      expect(sample.foregroundScale).toBeGreaterThan(sample.scale);
    });
    expect(spatialFrame(800,200,1800,900)).toEqual(spatialFrame(800,200,1800,900));
  });
  it('clamps overscroll, including short mobile sections', () => {
    expect(spatialFrame(-100,0,400,900).progress).toBe(0);
    expect(spatialFrame(5000,0,400,900).progress).toBe(1);
    expect(Number.isFinite(spatialFrame(20,0,0,0).scale)).toBe(true);
  });
  it('has identical static composition everywhere when motion is disabled', () => {
    expect(spatialFrame(9000,200,1800,900,false)).toEqual(spatialFrame(0,200,1800,900,false));
    expect(spatialFrame(9000,200,1800,900,false).scale).toBe(1);
  });
});
