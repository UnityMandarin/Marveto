import { describe, expect, it } from 'vitest';
import { concepts, tierDefinitions, tierOrder } from './concept-data';
import { parseExperienceTier, shouldLoadUltimateScene, withExperienceTier } from './concept-tier';

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

  it('loads the Ultimate scene only for capable, motion-enabled fine pointers', () => {
    expect(shouldLoadUltimateScene('essential', false, true, true)).toBe(false);
    expect(shouldLoadUltimateScene('premium', false, true, true)).toBe(false);
    expect(shouldLoadUltimateScene('ultimate', true, true, true)).toBe(false);
    expect(shouldLoadUltimateScene('ultimate', false, false, true)).toBe(false);
    expect(shouldLoadUltimateScene('ultimate', false, true, false)).toBe(false);
    expect(shouldLoadUltimateScene('ultimate', false, true, true)).toBe(true);
  });
});

