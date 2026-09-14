'use client';

import { useEffect, useRef } from 'react';
import { assetPath } from './asset-path';

function seek(video: HTMLVideoElement | null, progress: number) {
  if (!video || video.seeking || !Number.isFinite(video.duration) || video.duration <= 0) return;
  const nextTime = Math.min(video.duration - 0.04, Math.max(0, progress) * video.duration);
  if (Math.abs(video.currentTime - nextTime) > 0.025) video.currentTime = nextTime;
}

export default function ScrollVideoWorld() {
  const root = useRef<HTMLDivElement>(null);
  const architecture = useRef<HTMLVideoElement>(null);
  const race = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const shell = root.current?.closest<HTMLElement>('.site-shell');
    const architectureVideo = architecture.current;
    const raceVideo = race.current;
    const hero = shell?.querySelector<HTMLElement>('[data-home-chapter="surface"]');
    const signal = shell?.querySelector<HTMLElement>('[data-home-chapter="signal"]');
    const raceChapter = shell?.querySelector<HTMLElement>('[data-home-chapter="axiom"]');
    if (!shell || !hero || !signal || !raceChapter) return;

    let architectureStart = 0;
    let architectureEnd = 1;
    let raceStart = 0;
    let raceEnd = 1;
    let scheduled = false;
    let frameId = 0;

    const measure = () => {
      architectureStart = hero.getBoundingClientRect().top + window.scrollY;
      architectureEnd = Math.max(architectureStart + 1, signal.getBoundingClientRect().top + window.scrollY + signal.offsetHeight - window.innerHeight);
      raceStart = raceChapter.getBoundingClientRect().top + window.scrollY;
      raceEnd = Math.max(raceStart + 1, raceStart + raceChapter.offsetHeight - window.innerHeight);
    };
    const update = () => {
      scheduled = false;
      const y = window.scrollY;
      seek(architectureVideo, Math.min(1, Math.max(0, (y - architectureStart) / (architectureEnd - architectureStart))));
      seek(raceVideo, Math.min(1, Math.max(0, (y - raceStart) / (raceEnd - raceStart))));

      const flashWindow = Math.max(window.innerHeight * 0.24, 180);
      const flashDistance = Math.abs(y - raceStart);
      const flash = flashDistance >= flashWindow ? 0 : Math.pow(1 - flashDistance / flashWindow, 2);
      const blend = Math.min(1, Math.max(0, (y - raceStart + flashWindow) / (flashWindow * 2)));
      const eased = blend * blend * (3 - 2 * blend);
      const exit = Math.min(1, Math.max(0, (y - raceEnd) / window.innerHeight));
      shell.style.setProperty('--film-blend', String(eased));
      shell.style.setProperty('--film-opacity', String(1 - exit * exit * (3 - 2 * exit)));
      shell.style.setProperty('--beam-flash', window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '0' : (flash * .7).toFixed(4));
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      frameId = window.requestAnimationFrame(update);
    };
    const refresh = () => { measure(); schedule(); };

    measure();
    update();
    architectureVideo?.addEventListener('loadedmetadata', schedule);
    raceVideo?.addEventListener('loadedmetadata', schedule);
    architectureVideo?.addEventListener('seeked', schedule);
    raceVideo?.addEventListener('seeked', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', refresh);
    return () => {
      architectureVideo?.removeEventListener('loadedmetadata', schedule);
      raceVideo?.removeEventListener('loadedmetadata', schedule);
      architectureVideo?.removeEventListener('seeked', schedule);
      raceVideo?.removeEventListener('seeked', schedule);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', refresh);
      shell.style.removeProperty('--beam-flash');
    };
  }, []);

  return (
    <div ref={root} className="scroll-video-world">
      <video ref={architecture} className="scroll-film scroll-film--architecture" src={assetPath('/videos/architectural-film.mp4')} muted playsInline preload="auto" tabIndex={-1} />
      <video ref={race} className="scroll-film scroll-film--race" src={assetPath('/videos/race-car.mp4')} muted playsInline preload="auto" tabIndex={-1} />
      <div className="scroll-film__grade" />
      <div className="beam-transition"><i /><b /></div>
      <div className="race-interface"><span>APEX / R-01</span><i /><span>Velocity is a language</span></div>
    </div>
  );
}

export function RaceScrollVideo() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const raceVideo = video.current;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      seek(raceVideo, window.scrollY / maximum);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(update);
    };
    update();
    raceVideo?.addEventListener('loadedmetadata', schedule);
    raceVideo?.addEventListener('seeked', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      raceVideo?.removeEventListener('loadedmetadata', schedule);
      raceVideo?.removeEventListener('seeked', schedule);
      window.removeEventListener('scroll', schedule);
    };
  }, []);

  return <video ref={video} className="race-concept-video" src={assetPath('/videos/race-car.mp4')} muted playsInline preload="auto" tabIndex={-1} />;
}
