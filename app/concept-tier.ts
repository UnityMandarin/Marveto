import { ExperienceTier, tierOrder } from './concept-data';

export function isExperienceTier(value: string | null): value is ExperienceTier {
  return value !== null && tierOrder.includes(value as ExperienceTier);
}

export function parseExperienceTier(search: string): ExperienceTier {
  const value = new URLSearchParams(search).get('tier');
  return isExperienceTier(value) ? value : 'premium';
}

export function withExperienceTier(url: string, tier: ExperienceTier): string {
  const next = new URL(url, 'https://marveto.local');
  next.searchParams.set('tier', tier);
  return `${next.pathname}${next.search}${next.hash}`;
}

export function shouldLoadPremiumAtmosphere(
  tier: ExperienceTier,
  reducedMotion: boolean,
): boolean {
  return tier === 'premium' && !reducedMotion;
}

export function shouldLoadUltimateJourney(
  tier: ExperienceTier,
  reducedMotion: boolean,
  finePointer: boolean,
  webglAvailable: boolean,
): boolean {
  return tier === 'ultimate' && !reducedMotion && finePointer && webglAvailable;
}
