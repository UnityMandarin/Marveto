export type AuthoredSceneId =
  | 'surface'
  | 'signal'
  | 'axiom'
  | 'serein'
  | 'forma'
  | 'services'
  | 'studio'
  | 'pricing'
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
    desktopBase: '/images/hero-surface-v3.webp',
    desktopAvif: '/images/hero-surface-v3.avif',
    mobileBase: '/images/hero-surface-mobile-v3.webp',
    mobileAvif: '/images/hero-surface-mobile-v3.avif',
    focalPoint: [0.7, 0.47],
    foregroundMask: [0.72, 0.47, 0.3, 0.1],
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
  studio: {
    id: 'studio',
    desktopBase: '/images/scene-process-v2.webp',
    desktopAvif: '/images/scene-process-v2.avif',
    mobileBase: '/images/scene-process-mobile-v2.webp',
    mobileAvif: '/images/scene-process-mobile-v2.avif',
    focalPoint: [0.58, 0.5],
    foregroundMask: [0.58, 0.5, 0.32, 0.15],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.7,
  },
  pricing: {
    id: 'pricing',
    desktopBase: '/images/home-horizon.webp',
    desktopAvif: '/images/home-horizon.avif',
    mobileBase: '/images/scene-contact-mobile-v3.webp',
    mobileAvif: '/images/scene-contact-mobile-v3.avif',
    focalPoint: [0.5, 0.57],
    foregroundMask: [0.5, 0.57, 0.34, 0.14],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.84,
  },
  contact: {
    id: 'contact',
    desktopBase: '/images/scene-contact-v3.webp',
    desktopAvif: '/images/scene-contact-v3.avif',
    mobileBase: '/images/scene-contact-mobile-v3.webp',
    mobileAvif: '/images/scene-contact-mobile-v3.avif',
    focalPoint: [0.5, 0.6],
    foregroundMask: [0.5, 0.59, 0.31, 0.12],
    cropDesktop: 'center',
    cropMobile: 'center',
    foregroundTone: 'light',
    exposure: 0.86,
  },
};

export const authoredSceneOrder = Object.keys(authoredScenes) as AuthoredSceneId[];

export function sceneForConcept(slug: string): AuthoredSceneAssetSet | undefined {
  if (slug === 'axiom' || slug === 'serein' || slug === 'forma') return authoredScenes[slug];
  return undefined;
}
