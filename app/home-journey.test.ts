import { describe, expect, it } from 'vitest';
import { homeChapters, homeUltimateHref, mapHomeScrollProgress, resolveHomeQuality, sampleHomeJourney, sampleJourneyFrame, shouldUseHomeWebgl, textureCrossfadeWeights } from './home-journey';
import { authoredSceneOrder, authoredScenes, sceneForConcept } from './scene-registry';

describe('home journey', () => {
  it('defines all eight approved chapters in order without gaps', () => {
    expect(homeChapters.map((chapter) => chapter.id)).toEqual([
      'surface', 'signal', 'axiom', 'serein', 'forma', 'services', 'process', 'contact',
    ]);
    expect(homeChapters[0].start).toBe(0);
    expect(homeChapters.at(-1)?.end).toBe(1);
    homeChapters.slice(1).forEach((chapter, index) => {
      expect(chapter.start).toBe(homeChapters[index].end);
      expect(chapter.start).toBeGreaterThan(homeChapters[index].start);
    });
  });

  it('clamps progress and samples monotonic local progress', () => {
    expect(sampleHomeJourney(-4).progress).toBe(0);
    expect(sampleHomeJourney(7).progress).toBe(1);
    expect(sampleHomeJourney(0.2).chapter.id).toBe('signal');
    expect(sampleHomeJourney(0.33).chapter.id).toBe('axiom');
    expect(sampleHomeJourney(0.95).chapter.id).toBe('contact');
    expect(sampleHomeJourney(0.145).localProgress).toBeLessThan(sampleHomeJourney(0.2).localProgress);
  });

  it('returns normalized crossfade weights', () => {
    for (const progress of [0, 0.13, 0.26, 0.5, 0.78, 0.91, 1]) {
      const weights = textureCrossfadeWeights(progress);
      expect(weights).toHaveLength(8);
      expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 6);
      weights.forEach((weight) => expect(weight).toBeGreaterThanOrEqual(0));
    }
  });

  it('holds every major heading fully readable for at least 35% of its chapter', () => {
    for (const chapter of homeChapters) {
      const [, holdStart, holdEnd] = chapter.copyWindow;
      expect(holdEnd - holdStart).toBeGreaterThanOrEqual(0.35);
      const midpoint = chapter.start + (chapter.end - chapter.start) * ((holdStart + holdEnd) / 2);
      const frame = sampleJourneyFrame(midpoint);
      expect(frame.copyPhase).toBe('hold');
      expect(frame.copyOpacity).toBe(1);
    }
  });

  it('is stable when sampled repeatedly at the same scroll position', () => {
    for (const progress of [0, 0.145, 0.332, 0.555, 0.777, 1]) {
      expect(sampleJourneyFrame(progress)).toEqual(sampleJourneyFrame(progress));
    }
  });

  it('maps physical section stops onto the authored journey contract', () => {
    const stops = [0, 0.16, 0.3, 0.43, 0.56, 0.7, 0.86, 0.94];
    expect(mapHomeScrollProgress(stops[2], stops)).toBeCloseTo(0.27);
    expect(mapHomeScrollProgress(stops[5], stops)).toBeCloseTo(0.65);
    expect(mapHomeScrollProgress(1, stops)).toBe(1);
    const samples = Array.from({ length: 101 }, (_, index) => mapHomeScrollProgress(index / 100, stops));
    samples.slice(1).forEach((sample, index) => expect(sample).toBeGreaterThanOrEqual(samples[index]));
  });

  it('selects WebGL only for capable motion-enabled devices', () => {
    const capable = { reducedMotion: false, finePointer: true, viewportWidth: 1440, webgl: true };
    expect(shouldUseHomeWebgl(capable)).toBe(true);
    expect(shouldUseHomeWebgl({ ...capable, reducedMotion: true })).toBe(false);
    expect(shouldUseHomeWebgl({ ...capable, finePointer: false })).toBe(false);
    expect(shouldUseHomeWebgl({ ...capable, viewportWidth: 640 })).toBe(false);
    expect(shouldUseHomeWebgl({ ...capable, webgl: false })).toBe(false);
    expect(resolveHomeQuality(capable)).toBe('full');
    expect(resolveHomeQuality({ ...capable, viewportWidth: 1024 })).toBe('balanced');
    expect(resolveHomeQuality({ ...capable, viewportWidth: 390 })).toBe('static');
  });

  it('keeps scene IDs, responsive plates, and concept artwork synchronized', () => {
    expect(authoredSceneOrder).toEqual(homeChapters.map((chapter) => chapter.sceneId));
    for (const scene of Object.values(authoredScenes)) {
      expect(scene.desktopBase).toMatch(/\.webp$/);
      expect(scene.desktopAvif).toMatch(/\.avif$/);
      expect(scene.mobileBase).toMatch(/\.webp$/);
      expect(scene.mobileAvif).toMatch(/\.avif$/);
    }
    expect(sceneForConcept('axiom')?.id).toBe('axiom');
    expect(sceneForConcept('serein')?.desktopBase).toBe('/images/forma.webp');
    expect(sceneForConcept('forma')?.desktopBase).toBe('/images/serein.webp');
  });

  it('preserves the Ultimate tier in every homepage concept handoff', () => {
    for (const slug of ['axiom', 'serein', 'forma']) {
      expect(homeUltimateHref(slug)).toBe(`/concepts/${slug}/?tier=ultimate`);
    }
  });
});
