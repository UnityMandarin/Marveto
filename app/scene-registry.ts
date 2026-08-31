export type AuthoredSceneId =
  | 'surface'
  | 'signal'
  | 'axiom'
  | 'serein'
  | 'forma'
  | 'services'
  | 'process'
  | 'contact';

export type ForegroundTone = 'dark' | 'light';

export interface AuthoredSceneAssetSet {
  id: AuthoredSceneId;
  desktopBase: string;
  desktopAvif: string;
  mobileBase: string;
  mobileAvif: string;
  focalPoint: [number, number];
  foregroundMask: [number, number, number, number];
  cropDesktop: string;
  cropMobile: string;
  foregroundTone: ForegroundTone;
  exposure: number;
}

export const authoredScenes: Record<AuthoredSceneId, AuthoredSceneAssetSet> = {
  surface: {
    id: 'surface',
    desktopBase: '/images/hero-ultimate.webp',
    desktopAvif: '/images/hero-ultimate.avif',
    mobileBase: '/images/hero-portrait-v2.webp',
    mobileAvif: '/images/hero-portrait-v2.avif',
    focalPoint: [0.72, 0.48],
    foregroundMask: [0.77, 0.48, 0.31, 0.11],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'dark',
    exposure: 1,
  },
  signal: {
    id: 'signal',
    desktopBase: '/images/home-signal.webp',
    desktopAvif: '/images/home-signal.avif',
    mobileBase: '/images/scene-signal-mobile-v2.webp',
    mobileAvif: '/images/scene-signal-mobile-v2.avif',
    focalPoint: [0.51, 0.56],
    foregroundMask: [0.51, 0.58, 0.43, 0.16],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.94,
  },
  axiom: {
    id: 'axiom',
    desktopBase: '/images/axiom.webp',
    desktopAvif: '/images/axiom.avif',
    mobileBase: '/images/scene-axiom-mobile-v2.webp',
    mobileAvif: '/images/scene-axiom-mobile-v2.avif',
    focalPoint: [0.73, 0.51],
    foregroundMask: [0.76, 0.52, 0.3, 0.1],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.92,
  },
  serein: {
    id: 'serein',
    desktopBase: '/images/forma.webp',
    desktopAvif: '/images/forma.avif',
    mobileBase: '/images/scene-serein-mobile-v2.webp',
    mobileAvif: '/images/scene-serein-mobile-v2.avif',
    focalPoint: [0.7, 0.59],
    foregroundMask: [0.74, 0.56, 0.34, 0.13],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.92,
  },
  forma: {
    id: 'forma',
    desktopBase: '/images/serein.webp',
    desktopAvif: '/images/serein.avif',
    mobileBase: '/images/scene-forma-mobile-v2.webp',
    mobileAvif: '/images/scene-forma-mobile-v2.avif',
    focalPoint: [0.69, 0.46],
    foregroundMask: [0.68, 0.47, 0.39, 0.15],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.96,
  },
  services: {
    id: 'services',
    desktopBase: '/images/scene-services-v2.webp',
    desktopAvif: '/images/scene-services-v2.avif',
    mobileBase: '/images/scene-services-mobile-v2.webp',
    mobileAvif: '/images/scene-services-mobile-v2.avif',
    focalPoint: [0.63, 0.53],
    foregroundMask: [0.76, 0.66, 0.34, 0.14],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.9,
  },
  process: {
    id: 'process',
    desktopBase: '/images/scene-process-v2.webp',
    desktopAvif: '/images/scene-process-v2.avif',
    mobileBase: '/images/scene-process-mobile-v2.webp',
    mobileAvif: '/images/scene-process-mobile-v2.avif',
    focalPoint: [0.55, 0.52],
    foregroundMask: [0.53, 0.51, 0.34, 0.16],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.82,
  },
  contact: {
    id: 'contact',
    desktopBase: '/images/scene-contact-v2.webp',
    desktopAvif: '/images/scene-contact-v2.avif',
    mobileBase: '/images/scene-contact-mobile-v2.webp',
    mobileAvif: '/images/scene-contact-mobile-v2.avif',
    focalPoint: [0.69, 0.62],
    foregroundMask: [0.86, 0.64, 0.31, 0.13],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.8,
  },
};

export const authoredSceneOrder = Object.keys(authoredScenes) as AuthoredSceneId[];

export function sceneForConcept(slug: string): AuthoredSceneAssetSet | undefined {
  if (slug === 'axiom' || slug === 'serein' || slug === 'forma') return authoredScenes[slug];
  return undefined;
}
