import { describe, expect, it } from 'vitest';
import { applyPackageSelection, buildMailto, formatInquiry, Inquiry, validateInquiry } from './inquiry';
import { benefits, marvetoReasons, packageOptionValue, pricingTierById, pricingTiers, projects, siteConfig } from './site-data';

const complete: Inquiry = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  company: 'North Star',
  preferredPackage: 'Premium — $999',
  brief: 'We need a new launch site that makes a complex product feel immediate.',
};

describe('project inquiry', () => {
  it('requires the essential fields without requiring a company', () => {
    expect(validateInquiry({ ...complete, name: '', email: 'wrong', preferredPackage: '', brief: 'short' })).toEqual({
      name: 'Tell us your name.',
      email: 'Enter a valid email.',
      preferredPackage: 'Choose a preferred package.',
      brief: 'Give us at least a sentence about the project.',
    });
    expect(validateInquiry({ ...complete, company: '' })).toEqual({});
  });

  it('formats a readable, privacy-preserving brief', () => {
    const text = formatInquiry(complete);
    expect(text).toContain('MARVETO — NEW PROJECT INQUIRY');
    expect(text).toContain('Company: North Star');
    expect(text).toContain('Preferred package: Premium — $999');
    expect(text).toContain(complete.brief);
  });

  it('encodes the brief into the configured email destination', () => {
    const link = buildMailto(siteConfig.contactEmail, complete);
    expect(link).toMatch(/^mailto:info@unitymandarin\.org\?/);
    expect(link).toContain('New%20project%20inquiry');
    expect(link).toContain(encodeURIComponent(complete.brief));
  });

  it('replaces only automatic package copy and preserves visitor-written briefs', () => {
    const empty = { ...complete, brief: '', preferredPackage: '' };
    const essential = applyPackageSelection(empty, 'Essential — $599', 'I would like Essential.', '');
    const premium = applyPackageSelection(essential.inquiry, 'Premium — $999', 'I would like Premium.', essential.automaticBrief);
    expect(premium.inquiry.brief).toBe('I would like Premium.');
    expect(premium.inquiry.preferredPackage).toBe('Premium — $999');

    const written = { ...premium.inquiry, brief: 'I need a service site with clear location pages and an appointment path.' };
    const ultimate = applyPackageSelection(written, 'Ultimate — $1,799', 'I would like Ultimate.', premium.automaticBrief);
    expect(ultimate.inquiry.brief).toBe(written.brief);
    expect(ultimate.inquiry.preferredPackage).toBe('Ultimate — $1,799');
  });
});

describe('public content contracts', () => {
  it('keeps navigation on stable page anchors', () => {
    expect(siteConfig.navigation.map((item) => item.href)).toEqual(['#work', '#why', '#pricing', '#contact']);
  });

  it('publishes exactly three honestly labeled studio concepts', () => {
    expect(projects.map((project) => project.title)).toEqual(['Axiom', 'Serein', 'Forma']);
    expect(projects.map((project) => project.sector.split(' · ')[0])).toEqual(['Technology', 'Construction', 'Medical']);
    expect(projects.every((project) => project.sector.includes('Studio concept'))).toBe(true);
  });

  it('publishes seven sourced, scannable reasons a website matters', () => {
    expect(benefits).toHaveLength(7);
    expect(benefits.map((benefit) => benefit.title)).toEqual([
      'Start before the first call',
      'Look established, not improvised',
      'Answer it once',
      'Get found when intent is high',
      'Turn interest into action',
      'Own the place people land',
      'Add without starting over',
    ]);
    for (const benefit of benefits) {
      const wordCount = benefit.description.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(40);
      expect(wordCount).toBeLessThanOrEqual(70);
      expect(benefit.description).not.toMatch(/guarantee|guaranteed|revolutionize|unlock|elevate|seamless|!/i);
      expect(benefit.source).toMatch(/20\d{2}$/);
      expect(benefit.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it('publishes the six approved Marveto proof points at the requested length', () => {
    expect(marvetoReasons).toHaveLength(6);
    expect(marvetoReasons.map((reason) => reason.title)).toEqual([
      'Ten days, with a defined finish',
      'Half now. Half when delivered.',
      'Revision costs stay visible',
      'Custom code, shaped around you',
      'Support remains available',
      'We handle the launch mechanics',
    ]);
    expect(marvetoReasons.map((reason) => reason.description)).toEqual([
      'Every Marveto tier is scheduled for delivery within 10 days or less. The scope is agreed before work starts, so you know the target, the delivery window, and which level of design and interaction you are purchasing.',
      'You pay 50% to begin and the remaining 50% when the website is delivered. If the completed site is non-functional, materially broken, causes technical problems, or clearly follows the wrong subject despite the instructions you provided, you receive a full refund.',
      'Essential includes three revisions, Premium includes four, and Ultimate includes five. Additional revisions cost $29, $59, or $149 respectively and remain within the selected design level. You see the included allowance and additional cost before paying a deposit.',
      'Every Marveto website is custom-coded for the agreed business and design level. During a booked session, we collect your information, priorities, and visual direction. That brief guides the content structure, interface, imagery, and interactions we create.',
      'Launch is not the last time you can reach Marveto. You can book free Zoom sessions for questions, technical support, or guidance. If your request changes the website, it counts as a revision and its price is confirmed before work begins.',
      'We help you obtain a domain, publish the website, connect the domain, and hand the completed site to you. The process covers the technical steps that often leave business owners with finished files but no properly launched website.',
    ]);
    for (const reason of marvetoReasons) {
      const wordCount = reason.description.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(30);
      expect(wordCount).toBeLessThanOrEqual(50);
      expect(reason.description).not.toMatch(/revolutionize|unlock|elevate|seamless|passionate|journey|!/i);
    }
  });

  it('uses one exact, cumulative package registry across the site', () => {
    expect(pricingTiers.map((tier) => tier.displayPrice)).toEqual(['$599', '$999', '$1,799']);
    expect(pricingTiers.map((tier) => tier.includedRevisions)).toEqual([3, 4, 5]);
    expect(pricingTiers.map((tier) => tier.additionalRevisionPrice)).toEqual([29, 59, 149]);
    expect(pricingTiers.every((tier) => tier.turnaround === '10 days or less')).toBe(true);
    expect(pricingTiers.find((tier) => tier.id === 'premium')?.badge).toBe('Recommended');
    expect(pricingTiers.find((tier) => tier.id === 'ultimate')?.badge).toBe('Max result');
    expect(pricingTiers[1].features[0]).toBe('Everything included in Essential');
    expect(pricingTiers[2].features[0]).toBe('Everything included in Premium');
    expect(pricingTiers.map(packageOptionValue)).toEqual([
      'Essential — $599', 'Premium — $999', 'Ultimate — $1,799',
    ]);
    expect(['essential', 'premium', 'ultimate'].map((id) => pricingTierById(id)?.displayPrice)).toEqual([
      '$599', '$999', '$1,799',
    ]);
  });
});
