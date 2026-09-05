/** Deterministic, reversible scene composition; no elapsed-time animation. */
export function spatialFrame(scroll: number, top: number, height: number, viewport: number, enabled = true) {
  const distance = Math.max(height - viewport, viewport * 0.65, 1);
  const progress = enabled ? Math.min(1, Math.max(0, (scroll - top) / distance)) : 0;
  return {
    progress,
    scale: 1 + progress * 0.12,
    foregroundScale: 1 + progress * 0.19,
    y: -progress * 24,
    foregroundY: -progress * 42,
  };
}
