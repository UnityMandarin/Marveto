'use client';

import { useEffect } from 'react';

/** Ease wheel input; retain native touch, keyboard, zoom and nested scrolling. */
export function useSmoothWheel() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let target = window.scrollY;
    let previous = 0;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; target = window.scrollY; };
    const tick = (time: number) => {
      const dt = Math.min(40, time - previous || 16.67);
      previous = time;
      target = Math.min(target, document.documentElement.scrollHeight - window.innerHeight);
      const distance = target - window.scrollY;
      window.scrollTo({ top: Math.abs(distance) < .6 ? target : window.scrollY + distance * (1 - Math.exp(-dt / 75)), behavior: 'instant' });
      if (Math.abs(distance) < .6) { frame = 0; return; }
      frame = requestAnimationFrame(tick);
    };
    const wheel = (event: WheelEvent) => {
      if (reduced.matches || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || document.body.classList.contains('no-scroll')) return;
      let node = event.target instanceof Element ? event.target : null;
      while (node && node !== document.body) {
        if (node.matches('input, textarea, select, [role="dialog"]')) return;
        if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return;
        node = node.parentElement;
      }
      event.preventDefault();
      if (!frame) target = window.scrollY;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      target = Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, target + delta));
      if (!frame) { previous = performance.now(); frame = requestAnimationFrame(tick); }
    };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('pointerdown', stop);
    window.addEventListener('keydown', stop);
    window.addEventListener('touchstart', stop, { passive: true });
    reduced.addEventListener('change', stop);
    return () => {
      stop();
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('keydown', stop);
      window.removeEventListener('touchstart', stop);
      reduced.removeEventListener('change', stop);
    };
  }, []);
}
