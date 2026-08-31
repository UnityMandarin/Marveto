export function clampJourneyProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function easedProgress(value: number): number {
  const amount = clampJourneyProgress(value);
  return amount * amount * (3 - 2 * amount);
}

export function sampleJourneyProgress(
  pageProgress: number,
  chapterStops: number[],
  travelKeyframes: number[],
): number {
  if (chapterStops.length < 2 || chapterStops.length !== travelKeyframes.length) {
    return clampJourneyProgress(pageProgress);
  }

  const page = clampJourneyProgress(pageProgress);
  let index = 0;
  for (let stop = 0; stop < chapterStops.length - 1; stop += 1) {
    if (page >= chapterStops[stop]) index = stop;
  }
  index = Math.min(index, chapterStops.length - 2);

  const start = clampJourneyProgress(chapterStops[index]);
  const end = Math.max(clampJourneyProgress(chapterStops[index + 1]), start + 0.001);
  const local = easedProgress((page - start) / (end - start));
  const from = clampJourneyProgress(travelKeyframes[index]);
  const to = clampJourneyProgress(travelKeyframes[index + 1]);
  return clampJourneyProgress(from + (to - from) * local);
}
