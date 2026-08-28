'use client';

import { useEffect, useRef } from 'react';
import { AtmospherePreset } from './concept-data';

interface Particle {
  x: number;
  y: number;
  depth: number;
  speed: number;
  phase: number;
  size: number;
}

function seededParticles(count: number): Particle[] {
  let seed = 14891;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    depth: 0.25 + random() * 0.75,
    speed: 0.08 + random() * 0.24,
    phase: random() * Math.PI * 2,
    size: 0.7 + random() * 2.4,
  }));
}

export default function PremiumAtmosphere({
  preset,
  accent,
  glow,
}: {
  preset: AtmospherePreset;
  accent: string;
  glow: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;

    const particles = seededParticles(preset.particleCount);
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
    let width = 1;
    let height = 1;
    let dpr = 1;
    let frame = 0;
    let scrollProgress = 0;
    let paused = document.hidden;

    const resize = () => {
      width = Math.max(window.innerWidth, 1);
      height = Math.max(window.innerHeight, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const updateScroll = () => {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      scrollProgress = Math.min(Math.max(window.scrollY / max, 0), 1);
    };

    const updatePointer = (event: PointerEvent) => {
      pointer.targetX = event.clientX / Math.max(width, 1);
      pointer.targetY = event.clientY / Math.max(height, 1);
    };

    const drawParticles = (time: number, drift = 1) => {
      context.save();
      context.globalCompositeOperation = 'screen';
      for (const particle of particles) {
        const travel = (time * particle.speed * preset.speed * drift + scrollProgress * particle.depth * 1.8) % 1.18;
        const x = ((particle.x + Math.sin(time * 0.17 + particle.phase) * 0.025 * particle.depth) % 1) * width;
        const y = ((particle.y + travel) % 1.12 - 0.06) * height;
        const radius = particle.size * particle.depth;
        context.globalAlpha = 0.12 + particle.depth * 0.34;
        context.fillStyle = particle.phase > Math.PI ? glow : accent;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    };

    const drawNetwork = (time: number) => {
      const centerX = width * (0.58 + (pointer.x - 0.5) * 0.09);
      const centerY = height * (0.46 + (pointer.y - 0.5) * 0.07);
      const radius = Math.min(width, height) * (0.21 + Math.sin(time * 0.45) * 0.012);

      context.save();
      context.globalCompositeOperation = 'screen';
      const beam = context.createLinearGradient(0, 0, width, 0);
      const beamX = (time * 0.055 + scrollProgress * 0.8) % 1;
      beam.addColorStop(Math.max(beamX - 0.18, 0), 'transparent');
      beam.addColorStop(beamX, accent);
      beam.addColorStop(Math.min(beamX + 0.18, 1), 'transparent');
      context.globalAlpha = 0.16;
      context.fillStyle = beam;
      context.fillRect(0, 0, width, height);

      for (let ring = 0; ring < 4; ring += 1) {
        context.globalAlpha = 0.12 + ring * 0.045;
        context.strokeStyle = ring % 2 ? glow : accent;
        context.lineWidth = 1 + ring * 0.35;
        context.beginPath();
        context.ellipse(centerX, centerY, radius * (0.48 + ring * 0.28), radius * (0.34 + ring * 0.16), time * 0.035 + ring * 0.25, 0, Math.PI * 2);
        context.stroke();
      }

      const nodes = particles.slice(0, Math.min(18, particles.length));
      context.lineWidth = 0.65;
      nodes.forEach((particle, index) => {
        const angle = particle.phase + time * particle.speed * 0.12 + scrollProgress * Math.PI;
        const orbit = radius * (0.7 + particle.depth * 1.5);
        const x = centerX + Math.cos(angle) * orbit;
        const y = centerY + Math.sin(angle * 1.27) * orbit * 0.48;
        const next = nodes[(index + 5) % nodes.length];
        const nextAngle = next.phase + time * next.speed * 0.12 + scrollProgress * Math.PI;
        const nextOrbit = radius * (0.7 + next.depth * 1.5);
        context.globalAlpha = 0.12;
        context.strokeStyle = glow;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(centerX + Math.cos(nextAngle) * nextOrbit, centerY + Math.sin(nextAngle * 1.27) * nextOrbit * 0.48);
        context.stroke();
        context.globalAlpha = 0.5;
        context.fillStyle = index % 2 ? glow : accent;
        context.fillRect(x - 1.5, y - 1.5, 3, 3);
      });
      context.restore();
      drawParticles(time, 0.42);
    };

    const drawArchitecture = (time: number) => {
      const horizon = height * (0.34 + (pointer.y - 0.5) * 0.05);
      const vanishingX = width * (0.52 + (pointer.x - 0.5) * 0.08);
      context.save();
      context.globalCompositeOperation = 'screen';

      const sunlight = context.createRadialGradient(
        width * ((time * 0.018 + 0.12) % 1.2),
        height * 0.12,
        0,
        width * ((time * 0.018 + 0.12) % 1.2),
        height * 0.12,
        Math.max(width, height) * 0.56,
      );
      sunlight.addColorStop(0, glow);
      sunlight.addColorStop(0.36, `${accent}55`);
      sunlight.addColorStop(1, 'transparent');
      context.globalAlpha = 0.18;
      context.fillStyle = sunlight;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = accent;
      context.lineWidth = 0.75;
      for (let index = -8; index <= 8; index += 1) {
        context.globalAlpha = 0.1 + (Math.abs(index) % 3) * 0.025;
        context.beginPath();
        context.moveTo(vanishingX, horizon);
        context.lineTo(width * 0.5 + index * width * 0.13, height);
        context.stroke();
      }
      for (let index = 0; index < 13; index += 1) {
        const depth = ((index / 13 + time * 0.025 * preset.speed + scrollProgress * 0.4) % 1);
        const y = horizon + Math.pow(depth, 2.2) * (height - horizon);
        context.globalAlpha = 0.08 + depth * 0.16;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const measureX = ((time * 0.08 + scrollProgress * 2.4) % 1.2 - 0.1) * width;
      context.globalAlpha = 0.32;
      context.strokeStyle = glow;
      context.setLineDash([5, 9]);
      context.beginPath();
      context.moveTo(measureX, 0);
      context.lineTo(measureX, height);
      context.stroke();
      context.setLineDash([]);
      context.restore();
      drawParticles(time, -0.2);
    };

    const drawBiomorphic = (time: number) => {
      context.save();
      context.globalCompositeOperation = 'screen';
      for (let index = 0; index < 6; index += 1) {
        const phase = time * (0.08 + index * 0.009) + index * 1.2 + scrollProgress * 2.2;
        const x = width * (0.12 + index * 0.17) + Math.sin(phase) * width * 0.08 + (pointer.x - 0.5) * 30;
        const y = height * (0.2 + (index % 3) * 0.28) + Math.cos(phase * 1.17) * height * 0.12 + (pointer.y - 0.5) * 24;
        const size = Math.min(width, height) * (0.18 + (index % 2) * 0.07);
        const gradient = context.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, index % 2 ? `${glow}99` : `${accent}88`);
        gradient.addColorStop(0.5, index % 2 ? `${accent}2a` : `${glow}24`);
        gradient.addColorStop(1, 'transparent');
        context.globalAlpha = 0.23;
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(x, y, size, size * (0.55 + Math.sin(phase) * 0.08), phase * 0.08, 0, Math.PI * 2);
        context.fill();
      }

      const pathY = height * (0.5 + Math.sin(time * 0.12) * 0.05);
      context.globalAlpha = 0.26;
      context.strokeStyle = glow;
      context.lineWidth = 1.1;
      context.beginPath();
      context.moveTo(-50, pathY);
      context.bezierCurveTo(width * 0.2, pathY - 170, width * 0.35, pathY + 170, width * 0.52, pathY);
      context.bezierCurveTo(width * 0.7, pathY - 150, width * 0.83, pathY + 120, width + 50, pathY - 20);
      context.stroke();
      context.restore();
      drawParticles(time, 0.16);
    };

    const render = (timeMs: number) => {
      const time = timeMs * 0.001;
      pointer.x += (pointer.targetX - pointer.x) * 0.035;
      pointer.y += (pointer.targetY - pointer.y) * 0.035;
      context.clearRect(0, 0, width, height);

      if (preset.kind === 'network') drawNetwork(time);
      else if (preset.kind === 'architecture') drawArchitecture(time);
      else drawBiomorphic(time);

      if (!paused) frame = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) frame = requestAnimationFrame(render);
    };

    resize();
    updateScroll();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', updatePointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    if (!paused) frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('pointermove', updatePointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [preset, accent, glow]);

  return <canvas ref={canvasRef} className="premium-atmosphere" aria-hidden="true" />;
}
