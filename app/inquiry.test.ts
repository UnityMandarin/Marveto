import { describe, expect, it } from 'vitest';
import { buildMailto, formatInquiry, Inquiry, validateInquiry } from './inquiry';
import { benefits, projects, siteConfig } from './site-data';

const complete: Inquiry = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  company: 'North Star',
  budget: '$5k–$10k',
  brief: 'We need a new launch site that makes a complex product feel immediate.',
};

describe('project inquiry', () => {
  it('requires the essential fields without requiring a company', () => {
    expect(validateInquiry({ ...complete, name: '', email: 'wrong', budget: '', brief: 'short' })).toEqual({
      name: 'Tell us your name.',
      email: 'Enter a valid email.',
      budget: 'Choose a working budget.',
      brief: 'Give us at least a sentence about the project.',
    });
    expect(validateInquiry({ ...complete, company: '' })).toEqual({});
  });

  it('formats a readable, privacy-preserving brief', () => {
    const text = formatInquiry(complete);
    expect(text).toContain('MARVETO — NEW PROJECT INQUIRY');
    expect(text).toContain('Company: North Star');
    expect(text).toContain(complete.brief);
  });

  it('encodes the brief into the configured email destination', () => {
    const link = buildMailto(siteConfig.contactEmail, complete);
    expect(link).toMatch(/^mailto:info@unitymandarin\.org\?/);
    expect(link).toContain('New%20project%20inquiry');
    expect(link).toContain(encodeURIComponent(complete.brief));
  });
});

describe('public content contracts', () => {
  it('keeps navigation on stable page anchors', () => {
    expect(siteConfig.navigation.map((item) => item.href)).toEqual(['#work', '#services', '#process', '#contact']);
  });

  it('publishes exactly three honestly labeled studio concepts', () => {
    expect(projects.map((project) => project.title)).toEqual(['Axiom', 'Serein', 'Forma']);
    expect(projects.map((project) => project.sector.split(' · ')[0])).toEqual(['Technology', 'Construction', 'Medical']);
    expect(projects.every((project) => project.sector.includes('Studio concept'))).toBe(true);
  });

  it('explains practical website value without guarantees', () => {
    expect(benefits).toHaveLength(6);
    expect(benefits.some((benefit) => benefit.title === 'Be taken seriously')).toBe(true);
    expect(benefits.map((benefit) => benefit.description).join(' ')).not.toMatch(/guarantee|guaranteed/i);
  });
});
