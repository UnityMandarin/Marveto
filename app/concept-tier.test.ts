import { describe, expect, it } from 'vitest';
import { concepts, tierDefinitions, tierOrder } from './concept-data';
import { parseExperienceTier, shouldLoadPremiumAtmosphere, shouldLoadUltimateJourney, withExperienceTier } from './concept-tier';

describe('industry concepts', () => {
  it('defines one honest concept for each requested industry', () => {
    expect(concepts.map(({ slug, industry }) => ({ slug, industry }))).toEqual([
      { slug: 'axiom', industry: 'Technology' },
      { slug: 'serein', industry: 'Construction' },
      { slug: 'forma', industry: 'Medical' },
    ]);
    expect(concepts.every((concept) => concept.note.includes('studio concept'))).toBe(true);
  });

  it('publishes the three ordered quality levels without fixed pricing', () => {
    expect(tierOrder).toEqual(['essential', 'premium', 'ultimate']);
    expect(Object.values(tierDefinitions).map((tier) => tier.label)).toEqual(['Essential', 'Premium', 'Ultimate']);
    expect(JSON.stringify(tierDefinitions)).not.toMatch(/\$\d|guarantee/i);
  });

  it('defines a distinct five-room Ultimate journey and Premium atmosphere for every concept', () => {
    expect(concepts.map((concept) => concept.premiumAtmosphere.kind)).toEqual([
      'network',
      'architecture',
      'biomorphic',
    ]);
    expect(concepts.map((concept) => concept.ultimateJourney.world)).toEqual([
      'network',
      'structure',
      'biomorphic',
    ]);
    for (const concept of concepts) {
      expect(concept.ultimateJourney.chapters.map((chapter) => chapter.id)).toEqual([
        'hero',
        'viewpoint',
        'capabilities',
        'process',
        'package',
      ]);
      expect(new Set(concept.ultimateJourney.chapters.map((chapter) => chapter.room)).size).toBe(5);
      expect(concept.ultimateJourney.chapters.at(-1)?.camera.position[2]).toBeLessThan(-50);
    }
  });
});

describe('tier URL behavior', () => {
  it('defaults invalid or absent tiers to Premium', () => {
    expect(parseExperienceTier('')).toBe('premium');
    expect(parseExperienceTier('?tier=other')).toBe('premium');
  });

  it('reads and writes every shareable tier without losing the page or hash', () => {
    for (const tier of tierOrder) {
      expect(parseExperienceTier(`?tier=${tier}`)).toBe(tier);
      expect(withExperienceTier('/Marveto/concepts/axiom/?source=work#process', tier))
        .toBe(`/Marveto/concepts/axiom/?source=work&tier=${tier}#process`);
    }
  });

  it('loads Premium motion without WebGL and Ultimate only for capable fine pointers', () => {
    expect(shouldLoadPremiumAtmosphere('essential', false)).toBe(false);
    expect(shouldLoadPremiumAtmosphere('premium', false)).toBe(true);
    expect(shouldLoadPremiumAtmosphere('premium', true)).toBe(false);
    expect(shouldLoadPremiumAtmosphere('ultimate', false)).toBe(false);
    expect(shouldLoadUltimateJourney('essential', false, true, true)).toBe(false);
    expect(shouldLoadUltimateJourney('premium', false, true, true)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', true, true, true)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', false, false, true)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', false, true, false)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', false, true, true)).toBe(true);
  });
});
