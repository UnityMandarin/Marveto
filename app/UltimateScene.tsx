'use client';

import { useEffect, useRef } from 'react';
import { Geometry, Mesh, Program, Renderer, Texture, Transform } from 'ogl';
import { UltimateJourneyDefinition } from './concept-data';
import { clampJourneyProgress, sampleJourneyProgress } from './ultimate-journey';

const vertex = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uResolution;
  uniform vec2 uImage;
  uniform vec2 uPointer;
  uniform vec2 uFocal;
  uniform float uProgress;
  uniform float uExposure;
  uniform float uDepth;
  varying vec2 vUv;

  vec2 cover(vec2 uv) {
    float screenRatio = uResolution.x / max(uResolution.y, 1.0);
    float imageRatio = uImage.x / max(uImage.y, 1.0);
    vec2 scale = screenRatio < imageRatio ? vec2(screenRatio / imageRatio, 1.0) : vec2(1.0, imageRatio / screenRatio);
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    float progress = clamp(uProgress, 0.0, 1.0);
    float scale = 1.0 + progress * (0.08 + uDepth * 0.025);
    vec2 baseUv = uFocal + (vUv - uFocal) / scale;
    vec2 foregroundUv = uFocal + (vUv - uFocal) / (scale + 0.035 * uDepth);
    foregroundUv += uPointer * 0.0045 * smoothstep(0.05, 0.45, progress);
    vec3 base = texture2D(tMap, cover(baseUv)).rgb;
    vec3 foreground = texture2D(tMap, cover(foregroundUv)).rgb;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float matte = 1.0 - smoothstep(0.24, 0.48, length((vUv - uFocal) * vec2(aspect, 1.0)));
    vec3 color = mix(base, foreground, matte * 0.72);
    float highlight = smoothstep(0.72, 0.96, dot(foreground, vec3(0.2126, 0.7152, 0.0722)));
    color += foreground * highlight * matte * 0.04;
    color *= uExposure;
    float vignette = 1.0 - smoothstep(0.42, 0.92, length((vUv - 0.5) * vec2(0.78, 1.0)));
    color *= mix(0.82, 1.0, vignette);
    vec3 untouched = texture2D(tMap, cover(vUv)).rgb;
    color = mix(untouched, color, smoothstep(0.015, 0.16, progress));
    gl_FragColor = vec4(color, 1.0);
  }
`;

function geometry(gl: Renderer['gl']) {
  return new Geometry(gl, {
    position: { size: 3, data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  });
}

export default function UltimateScene({
  journey,
  image,
}: {
  journey: UltimateJourneyDefinition;
  image: string;
  accent: string;
  glow: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const shell = host?.closest<HTMLElement>('.concept-shell');
    if (!host || !shell) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.4),
        powerPreference: 'high-performance',
      });
    } catch {
      host.dataset.failed = 'true';
      return;
    }

    const gl = renderer.gl;
    gl.canvas.setAttribute('aria-hidden', 'true');
    gl.canvas.setAttribute('role', 'presentation');
    host.appendChild(gl.canvas);
    const scene = new Transform();
    const texture = new Texture(gl, {
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      generateMipmaps: false,
      anisotropy: Math.min(renderer.parameters.maxAnisotropy || 1, 4),
    });
    const resolution = { value: [1, 1] };
    const pointer = { value: [0, 0] };
    const progress = { value: 0 };
    const program = new Program(gl, {
      vertex,
      fragment,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        tMap: { value: texture },
        uResolution: resolution,
        uImage: { value: [1448, 1086] },
        uPointer: pointer,
        uFocal: { value: journey.focalPoint },
        uProgress: progress,
        uExposure: { value: journey.exposure },
        uDepth: { value: journey.depth },
      },
    });
    new Mesh(gl, { geometry: geometry(gl), program }).setParent(scene);

    let destroyed = false;
    let ready = false;
    let paused = document.hidden;
    let frame = 0;
    let progressTarget = 0;
    let progressCurrent = 0;
    let stops = journey.chapters.map((_, index) => index / (journey.chapters.length - 1));
    const travel = journey.chapters.map((item) => item.travel);
    const pointerState = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const requestRender = () => {
      if (!frame && !paused && !destroyed) frame = requestAnimationFrame(render);
    };

    const render = () => {
      frame = 0;
      if (!ready || paused || destroyed) return;
      progressCurrent += (progressTarget - progressCurrent) * 0.16;
      pointerState.x += (pointerState.targetX - pointerState.x) * 0.18;
      pointerState.y += (pointerState.targetY - pointerState.y) * 0.18;
      progress.value = progressCurrent;
      pointer.value = [pointerState.x, pointerState.y];
      renderer.render({ scene, clear: true, sort: false, frustumCull: false });
      const moving = Math.abs(progressTarget - progressCurrent) > 0.00008
        || Math.abs(pointerState.targetX - pointerState.x) > 0.0008
        || Math.abs(pointerState.targetY - pointerState.y) > 0.0008;
      if (moving) requestRender();
    };

    const updateScroll = () => {
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      progressTarget = sampleJourneyProgress(clampJourneyProgress(window.scrollY / maximum), stops, travel);
      shell.style.setProperty('--journey-progress', progressTarget.toFixed(4));
      requestRender();
    };

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height);
      resolution.value = [Math.round(width * renderer.dpr), Math.round(height * renderer.dpr)];
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      stops = journey.chapters.map((item, index) => {
        const chapter = shell.querySelector<HTMLElement>(`[data-journey-chapter="${item.id}"]`);
        if (!chapter) return index / (journey.chapters.length - 1);
        return clampJourneyProgress((chapter.getBoundingClientRect().top + window.scrollY) / maximum);
      });
      updateScroll();
    };

    const updatePointer = (event: PointerEvent) => {
      pointerState.targetX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointerState.targetY = (0.5 - event.clientY / Math.max(window.innerHeight, 1)) * 2;
      requestRender();
    };

    const visibility = () => {
      paused = document.hidden;
      if (paused && frame) cancelAnimationFrame(frame);
      frame = 0;
      if (!paused) requestRender();
    };

    const imageElement = new Image();
    imageElement.decoding = 'async';
    imageElement.onload = () => {
      if (destroyed) return;
      texture.image = imageElement;
      program.uniforms.uImage.value = [imageElement.naturalWidth, imageElement.naturalHeight];
      ready = true;
      progressCurrent = progressTarget;
      host.dataset.ready = 'true';
      shell.dataset.ultimateReady = 'true';
      requestRender();
    };
    imageElement.onerror = () => { host.dataset.failed = 'true'; };
    imageElement.src = image;

    resize();
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', updatePointer, { passive: true });
    document.addEventListener('visibilitychange', visibility);

    return () => {
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', updatePointer);
      document.removeEventListener('visibilitychange', visibility);
      shell.removeAttribute('data-ultimate-ready');
      shell.style.removeProperty('--journey-progress');
      program.remove();
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [image, journey]);

  return <div ref={hostRef} className="ultimate-journey" aria-hidden="true" />;
}
