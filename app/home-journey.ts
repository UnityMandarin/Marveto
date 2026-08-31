import { clampJourneyProgress } from './ultimate-journey';

export type HomeChapterId =
  | 'surface'
  | 'signal'
  | 'axiom'
  | 'serein'
  | 'forma'
  | 'services'
  | 'process'
  | 'contact';

export interface HomeChapterDefinition {
  id: HomeChapterId;
  start: number;
  end: number;
  texture: string;
  palette: [string, string, string];
  focalPoint: [number, number];
  cameraTravel: number;
  distortion: number;
  fog: number;
  exposure: number;
  foregroundTone: 'dark' | 'light';
}

export const homeChapters: readonly HomeChapterDefinition[] = [
  {
    id: 'surface', start: 0, end: 0.14, texture: '/images/hero-ultimate.webp',
    palette: ['#eadfd2', '#756cff', '#ffb76f'], focalPoint: [0.69, 0.51],
    cameraTravel: 0.08, distortion: 0.18, fog: 0.08, exposure: 1.02, foregroundTone: 'dark',
  },
  {
    id: 'signal', start: 0.14, end: 0.27, texture: '/images/home-signal.webp',
    palette: ['#080b16', '#294fff', '#ffc487'], focalPoint: [0.5, 0.56],
    cameraTravel: 0.34, distortion: 0.68, fog: 0.28, exposure: 1.04, foregroundTone: 'light',
  },
  {
    id: 'axiom', start: 0.27, end: 0.39, texture: '/images/axiom.webp',
    palette: ['#040a24', '#315dff', '#dbe7ff'], focalPoint: [0.58, 0.47],
    cameraTravel: 0.58, distortion: 0.76, fog: 0.36, exposure: 1.08, foregroundTone: 'light',
  },
  {
    id: 'serein', start: 0.39, end: 0.51, texture: '/images/forma.webp',
    palette: ['#1b1918', '#ee7b47', '#d9e8ff'], focalPoint: [0.67, 0.55],
    cameraTravel: 0.7, distortion: 0.48, fog: 0.28, exposure: 0.98, foregroundTone: 'light',
  },
  {
    id: 'forma', start: 0.51, end: 0.65, texture: '/images/serein.webp',
    palette: ['#172329', '#e88a5c', '#c0afff'], focalPoint: [0.48, 0.5],
    cameraTravel: 0.8, distortion: 0.82, fog: 0.42, exposure: 1.04, foregroundTone: 'light',
  },
  {
    id: 'services', start: 0.65, end: 0.79, texture: '/images/home-signal.webp',
    palette: ['#080b15', '#755fff', '#ffac74'], focalPoint: [0.5, 0.49],
    cameraTravel: 0.88, distortion: 0.7, fog: 0.34, exposure: 0.96, foregroundTone: 'light',
  },
  {
    id: 'process', start: 0.79, end: 0.92, texture: '/images/home-horizon.webp',
    palette: ['#090b12', '#a894ff', '#ffd0a0'], focalPoint: [0.5, 0.54],
    cameraTravel: 0.94, distortion: 0.44, fog: 0.3, exposure: 1.02, foregroundTone: 'light',
  },
  {
    id: 'contact', start: 0.92, end: 1, texture: '/images/home-horizon.webp',
    palette: ['#05070d', '#6576ff', '#ffd5a8'], focalPoint: [0.5, 0.54],
    cameraTravel: 1, distortion: 0.18, fog: 0.2, exposure: 0.9, foregroundTone: 'light',
  },
] as const;

export interface HomeJourneySample {
  chapter: HomeChapterDefinition;
  index: number;
  progress: number;
  localProgress: number;
}

export function sampleHomeJourney(progress: number): HomeJourneySample {
  const clamped = clampJourneyProgress(progress);
  const index = homeChapters.findIndex((chapter, chapterIndex) => (
    clamped < chapter.end || chapterIndex === homeChapters.length - 1
  ));
  const chapter = homeChapters[Math.max(0, index)];
  const duration = Math.max(0.0001, chapter.end - chapter.start);
  return {
    chapter,
    index: Math.max(0, index),
    progress: clamped,
    localProgress: clampJourneyProgress((clamped - chapter.start) / duration),
  };
}

export function textureCrossfadeWeights(progress: number): number[] {
  const sample = sampleHomeJourney(progress);
  const weights = homeChapters.map(() => 0);
  const edge = 0.22;
  const next = Math.min(homeChapters.length - 1, sample.index + 1);
  const blend = sample.localProgress <= 1 - edge
    ? 0
    : (sample.localProgress - (1 - edge)) / edge;
  weights[sample.index] = 1 - blend;
  weights[next] += blend;
  return weights;
}

export function mapHomeScrollProgress(pageProgress: number, sectionStops: readonly number[]): number {
  const page = clampJourneyProgress(pageProgress);
  if (sectionStops.length !== homeChapters.length) return page;
  const stops = sectionStops.map(clampJourneyProgress);
  let index = 0;
  for (let candidate = 1; candidate < stops.length; candidate += 1) {
    if (page >= stops[candidate]) index = candidate;
  }
  const physicalStart = stops[index];
  const physicalEnd = index === stops.length - 1 ? 1 : Math.max(stops[index + 1], physicalStart + 0.0001);
  const local = clampJourneyProgress((page - physicalStart) / Math.max(physicalEnd - physicalStart, 0.0001));
  const chapter = homeChapters[index];
  return chapter.start + local * (chapter.end - chapter.start);
}

export function shouldUseHomeWebgl(options: {
  reducedMotion: boolean;
  finePointer: boolean;
  viewportWidth: number;
  webgl: boolean;
}): boolean {
  return options.webgl
    && !options.reducedMotion
    && options.finePointer
    && options.viewportWidth >= 820;
}

export function homeUltimateHref(slug: string): string {
  return `/concepts/${slug}/?tier=ultimate`;
}
