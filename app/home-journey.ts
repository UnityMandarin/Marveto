import { authoredScenes, AuthoredSceneId, ForegroundTone } from './scene-registry';
import { clampJourneyProgress } from './ultimate-journey';

export type HomeChapterId = AuthoredSceneId;
export type HomeQualityMode = 'full' | 'balanced' | 'static';
export type CopyPhase = 'enter' | 'hold' | 'exit';

export interface HomeChapterDefinition {
  id: HomeChapterId;
  sceneId: AuthoredSceneId;
  start: number;
  end: number;
  copyWindow: readonly [number, number, number, number];
  camera: readonly [number, number];
  layerDepth: number;
  transitionStart: number;
  foregroundTone: ForegroundTone;
  conceptScene?: 'axiom' | 'serein' | 'forma';
}

const chapter = (
  id: HomeChapterId,
  start: number,
  end: number,
  camera: readonly [number, number],
  layerDepth: number,
  conceptScene?: 'axiom' | 'serein' | 'forma',
): HomeChapterDefinition => ({
  id,
  sceneId: id,
  start,
  end,
  copyWindow: id === 'surface' ? [0, 0, 0.4, 0.58] : [0.06, 0.18, 0.72, 0.94],
  camera,
  layerDepth,
  transitionStart: 0.8,
  foregroundTone: authoredScenes[id].foregroundTone,
  conceptScene,
});

export const homeChapters: readonly HomeChapterDefinition[] = [
  chapter('surface', 0, 0.12, [1, 1], 0),
  chapter('signal', 0.12, 0.23, [1.02, 1.1], 0.038),
  chapter('axiom', 0.23, 0.34, [1.01, 1.075], 0.044, 'axiom'),
  chapter('serein', 0.34, 0.45, [1.015, 1.065], 0.035, 'serein'),
  chapter('forma', 0.45, 0.56, [1.01, 1.08], 0.042, 'forma'),
  chapter('services', 0.56, 0.69, [1.015, 1.07], 0.034),
  chapter('studio', 0.69, 0.79, [1.01, 1.055], 0.026),
  chapter('pricing', 0.79, 0.91, [1.01, 1.06], 0.03),
  chapter('contact', 0.91, 1, [1.01, 1.035], 0.022),
] as const;

export interface HomeJourneySample {
  chapter: HomeChapterDefinition;
  index: number;
  progress: number;
  localProgress: number;
}

export interface JourneyFrame extends HomeJourneySample {
  nextChapter: HomeChapterDefinition;
  sceneWeights: readonly [number, number];
  transitionProgress: number;
  copyPhase: CopyPhase;
  copyOpacity: number;
  cameraScale: number;
  foregroundOffset: number;
}

export interface SurfaceCameraFrame {
  spin: number;
  push: number;
  crack: number;
  zoom: number;
  focus: readonly [number, number];
}

export const surfaceOrbFocus = [0.69, 0.705] as const;

function smoothstep(start: number, end: number, value: number): number {
  const t = clampJourneyProgress((value - start) / Math.max(end - start, 0.0001));
  return t * t * (3 - 2 * t);
}

export function sampleSurfaceCamera(progress: number): SurfaceCameraFrame {
  const clamped = clampJourneyProgress(progress);
  const spin = smoothstep(0.06, 0.58, clamped);
  const push = smoothstep(0.58, 1, clamped);
  const crack = smoothstep(0.76, 0.96, clamped);
  const orbit = Math.sin(spin * Math.PI);
  const orbitFocus: readonly [number, number] = [
    0.5 + 0.048 * orbit,
    0.5 + 0.018 * orbit,
  ];
  return {
    spin,
    push,
    crack,
    zoom: 1 + spin * 0.08 + push * 6.42,
    focus: [
      orbitFocus[0] + (surfaceOrbFocus[0] - orbitFocus[0]) * push,
      orbitFocus[1] + (surfaceOrbFocus[1] - orbitFocus[1]) * push,
    ],
  };
}

export function sampleHomeJourney(progress: number): HomeJourneySample {
  const clamped = clampJourneyProgress(progress);
  const index = homeChapters.findIndex((item, itemIndex) => (
    clamped < item.end || itemIndex === homeChapters.length - 1
  ));
  const safeIndex = Math.max(0, index);
  const active = homeChapters[safeIndex];
  const duration = Math.max(0.0001, active.end - active.start);
  return {
    chapter: active,
    index: safeIndex,
    progress: clamped,
    localProgress: clampJourneyProgress((clamped - active.start) / duration),
  };
}

export function sampleJourneyFrame(progress: number): JourneyFrame {
  const sample = sampleHomeJourney(progress);
  const nextChapter = homeChapters[Math.min(sample.index + 1, homeChapters.length - 1)];
  const transitionProgress = smoothstep(sample.chapter.transitionStart, 1, sample.localProgress);
  const [enterStart, holdStart, holdEnd, exitEnd] = sample.chapter.copyWindow;
  const copyOpacity = sample.localProgress < holdStart
    ? smoothstep(enterStart, holdStart, sample.localProgress)
    : sample.localProgress <= holdEnd
      ? 1
      : 1 - smoothstep(holdEnd, exitEnd, sample.localProgress);
  const copyPhase: CopyPhase = sample.localProgress < holdStart
    ? 'enter'
    : sample.localProgress <= holdEnd
      ? 'hold'
      : 'exit';
  const cameraScale = sample.chapter.camera[0]
    + (sample.chapter.camera[1] - sample.chapter.camera[0]) * sample.localProgress;
  return {
    ...sample,
    nextChapter,
    sceneWeights: [1 - transitionProgress, transitionProgress],
    transitionProgress,
    copyPhase,
    copyOpacity,
    cameraScale,
    foregroundOffset: sample.chapter.layerDepth * (sample.localProgress - 0.5),
  };
}

export function textureCrossfadeWeights(progress: number): number[] {
  const frame = sampleJourneyFrame(progress);
  const weights = homeChapters.map(() => 0);
  weights[frame.index] = frame.sceneWeights[0];
  weights[Math.min(frame.index + 1, homeChapters.length - 1)] += frame.sceneWeights[1];
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
  const active = homeChapters[index];
  return active.start + local * (active.end - active.start);
}

export function resolveHomeQuality(options: {
  reducedMotion: boolean;
  finePointer: boolean;
  viewportWidth: number;
  webgl: boolean;
}): HomeQualityMode {
  if (!options.webgl || options.reducedMotion || !options.finePointer || options.viewportWidth < 820) return 'static';
  return options.viewportWidth >= 1180 ? 'full' : 'balanced';
}

export function shouldUseHomeWebgl(options: Parameters<typeof resolveHomeQuality>[0]): boolean {
  return resolveHomeQuality(options) !== 'static';
}

export function homeUltimateHref(slug: string): string {
  return `/concepts/${slug}/?tier=ultimate`;
}
