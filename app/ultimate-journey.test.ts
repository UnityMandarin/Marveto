import { describe, expect, it } from 'vitest';
import { clampJourneyProgress, sampleJourneyProgress } from './ultimate-journey';

describe('Ultimate journey progress', () => {
  it('clamps invalid and out-of-range scroll values', () => {
    expect(clampJourneyProgress(-2)).toBe(0);
    expect(clampJourneyProgress(0.42)).toBe(0.42);
    expect(clampJourneyProgress(4)).toBe(1);
    expect(clampJourneyProgress(Number.NaN)).toBe(0);
  });

  it('interpolates one continuous, monotonic journey through section stops', () => {
    const stops = [0, 0.16, 0.38, 0.66, 0.88];
    const travel = [0, 0.18, 0.48, 0.76, 1];
    const samples = Array.from({ length: 101 }, (_, index) => (
      sampleJourneyProgress(index / 100, stops, travel)
    ));

    expect(samples[0]).toBe(0);
    expect(samples.at(-1)).toBe(1);
    expect(samples.every((value, index) => index === 0 || value >= samples[index - 1])).toBe(true);
  });

  it('falls back to clamped page progress when keyframes are malformed', () => {
    expect(sampleJourneyProgress(0.64, [0], [0])).toBe(0.64);
    expect(sampleJourneyProgress(1.4, [0, 1], [0])).toBe(1);
  });
});
