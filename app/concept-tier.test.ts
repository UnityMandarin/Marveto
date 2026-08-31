import { describe, expect, it } from 'vitest';
import { concepts, tierDefinitions, tierOrder } from './concept-data';
import { parseExperienceTier, shouldLoadUltimateJourney, withExperienceTier } from './concept-tier';

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

  it('defines one continuous, background-led Ultimate journey for every concept', () => {
    expect(concepts.map((concept) => concept.ultimateJourney.mode)).toEqual([
      'signal',
      'monolith',
      'membrane',
    ]);
    for (const concept of concepts) {
      expect(concept.ultimateJourney.chapters.map((chapter) => chapter.id)).toEqual([
        'hero',
        'viewpoint',
        'capabilities',
        'process',
        'package',
      ]);
      expect(concept.ultimateJourney.chapters.map((chapter) => chapter.travel)).toEqual([0, 0.18, 0.48, 0.76, 1]);
      expect(concept.ultimateJourney.chapters.map((chapter) => chapter.atmosphere).every((value, index, values) => (
        index === 0 || value >= values[index - 1]
      ))).toBe(true);
      expect(concept.ultimateJourney.focalPoint.every((value) => value >= 0 && value <= 1)).toBe(true);
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

  it('keeps Premium image-led and loads Ultimate WebGL only for capable fine pointers', () => {
    expect(shouldLoadUltimateJourney('essential', false, true, true, true)).toBe(false);
    expect(shouldLoadUltimateJourney('premium', false, true, true, true)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', true, true, true, true)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', false, false, true, true)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', false, true, false, true)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', false, true, true, false)).toBe(false);
    expect(shouldLoadUltimateJourney('ultimate', false, true, true, true)).toBe(true);
  });
});
