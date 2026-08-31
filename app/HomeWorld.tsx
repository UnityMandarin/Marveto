'use client';

import { useEffect, useRef } from 'react';
import { Geometry, Mesh, Program, Renderer, RenderTarget, Texture, Transform } from 'ogl';
import { assetPath } from './asset-path';
import { homeChapters, mapHomeScrollProgress } from './home-journey';
import { clampJourneyProgress } from './ultimate-journey';

const vertex = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const worldFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tSurface;
  uniform sampler2D tSignal;
  uniform sampler2D tAxiom;
  uniform sampler2D tSerein;
  uniform sampler2D tForma;
  uniform sampler2D tHorizon;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uProgress;
  uniform float uTime;
  uniform float uQuality;
  varying vec2 vUv;

  #define PI 3.14159265359

  float sat(float value) { return clamp(value, 0.0, 1.0); }
  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }
  float noise21(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), local.x),
      mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + 1.0), local.x), local.y);
  }
  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.52;
    mat2 turn = mat2(0.80, -0.60, 0.60, 0.80);
    for (int octave = 0; octave < 4; octave++) {
      value += noise21(point) * amplitude;
      point = turn * point * 2.03 + 7.17;
      amplitude *= 0.5;
    }
    return value;
  }
  vec2 cover(vec2 uv, vec2 image) {
    float screenRatio = uResolution.x / max(uResolution.y, 1.0);
    float imageRatio = image.x / image.y;
    vec2 scale = screenRatio < imageRatio ? vec2(screenRatio / imageRatio, 1.0) : vec2(1.0, imageRatio / screenRatio);
    return (uv - 0.5) * scale + 0.5;
  }
  vec3 surface(vec2 uv) { return texture2D(tSurface, cover(uv, vec2(2048.0, 1152.0))).rgb; }
  vec3 signal(vec2 uv) { return texture2D(tSignal, cover(uv, vec2(2048.0, 1152.0))).rgb; }
  vec3 axiom(vec2 uv) { return texture2D(tAxiom, cover(uv, vec2(1448.0, 1086.0))).rgb; }
  vec3 serein(vec2 uv) { return texture2D(tSerein, cover(uv, vec2(1448.0, 1086.0))).rgb; }
  vec3 forma(vec2 uv) { return texture2D(tForma, cover(uv, vec2(1448.0, 1086.0))).rgb; }
  vec3 horizon(vec2 uv) { return texture2D(tHorizon, cover(uv, vec2(2048.0, 1152.0))).rgb; }

  vec3 journeyTexture(vec2 uv, float p) {
    if (p < 0.14) return mix(surface(uv), signal(uv), smoothstep(0.105, 0.14, p));
    if (p < 0.27) return mix(signal(uv), axiom(uv), smoothstep(0.235, 0.27, p));
    if (p < 0.39) return mix(axiom(uv), serein(uv), smoothstep(0.355, 0.39, p));
    if (p < 0.51) return mix(serein(uv), forma(uv), smoothstep(0.475, 0.51, p));
    if (p < 0.65) return mix(forma(uv), signal(uv), smoothstep(0.61, 0.65, p));
    if (p < 0.79) return mix(signal(uv), horizon(uv), smoothstep(0.75, 0.79, p));
    return horizon(uv);
  }

  vec2 warpedUv(vec2 uv, float p) {
    float active = smoothstep(0.008, 0.05, p);
    vec2 focal = mix(vec2(0.69, 0.51), vec2(0.5, 0.53), smoothstep(0.08, 0.32, p));
    vec2 delta = uv - focal;
    float zoom = 1.0 + p * 0.24 + smoothstep(0.18, 0.64, p) * 0.12;
    vec2 result = focal + delta / zoom;
    float waves = sin(delta.y * 19.0 + uTime * 0.18) * sin(delta.x * 12.0 - uTime * 0.12);
    float membrane = smoothstep(0.49, 0.55, p) * (1.0 - smoothstep(0.64, 0.68, p));
    result += normalize(delta + 0.0001) * waves * membrane * 0.009;
    result += uPointer * (0.003 + p * 0.003) * active;
    return result;
  }

  void main() {
    float p = sat(uProgress);
    vec2 uv = warpedUv(vUv, p);
    vec3 color = journeyTexture(uv, p);
    float active = smoothstep(0.008, 0.055, p);
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 point = (vUv - 0.5) * vec2(aspect, 1.0);
    float field = fbm(point * 3.1 + vec2(uTime * 0.025, -uTime * 0.018));

    float signalStage = smoothstep(0.12, 0.2, p) * (1.0 - smoothstep(0.37, 0.43, p));
    float radius = length(point);
    float angle = atan(point.y, point.x);
    float filaments = pow(1.0 - abs(sin(angle * 11.0 + field * 3.0 - p * 8.0)), 34.0);
    filaments *= smoothstep(0.06, 0.72, radius) * signalStage;
    color += vec3(0.20, 0.35, 1.0) * filaments * 0.42 * uQuality;

    float monolithStage = smoothstep(0.37, 0.43, p) * (1.0 - smoothstep(0.5, 0.54, p));
    float horizonY = -0.12;
    float perspective = 0.13 / max(abs(point.y - horizonY), 0.025);
    float lanes = pow(1.0 - abs(fract(point.x * perspective + 0.5) - 0.5) * 2.0, 28.0);
    color += vec3(1.0, 0.48, 0.22) * lanes * monolithStage * 0.18;

    float membraneStage = smoothstep(0.49, 0.55, p) * (1.0 - smoothstep(0.64, 0.69, p));
    float folds = pow(1.0 - abs(sin((point.x * 5.5 + field * 2.4) * PI)), 7.0);
    color += mix(vec3(0.36, 0.52, 1.0), vec3(1.0, 0.54, 0.28), field) * folds * membraneStage * 0.35;

    float strataStage = smoothstep(0.63, 0.68, p) * (1.0 - smoothstep(0.78, 0.82, p));
    float strata = pow(1.0 - abs(fract((vUv.y + field * 0.05) * 3.0) - 0.5) * 2.0, 18.0);
    color += mix(vec3(0.16, 0.27, 1.0), vec3(1.0, 0.55, 0.31), vUv.y) * strata * strataStage * 0.3;

    float processStage = smoothstep(0.77, 0.82, p) * (1.0 - smoothstep(0.91, 0.94, p));
    float gate = 0.0;
    for (int i = 0; i < 4; i++) {
      float depth = float(i) / 3.0;
      vec2 bounds = vec2(0.52 - depth * 0.11, 0.40 - depth * 0.07);
      vec2 q = abs(point - vec2(0.0, -0.02 + depth * 0.02)) - bounds;
      float frame = exp(-abs(max(q.x, q.y)) * (92.0 - depth * 26.0));
      gate += frame * (0.32 + depth * 0.3);
    }
    color += vec3(0.73, 0.72, 1.0) * gate * processStage * 0.24;

    float contactStage = smoothstep(0.9, 0.96, p);
    float convergence = exp(-length(point - vec2(0.0, -0.04)) * 4.6);
    color += vec3(1.0, 0.64, 0.34) * convergence * contactStage * 0.16;

    float fog = field * (0.025 + p * 0.045) * active;
    color += mix(vec3(0.12, 0.18, 0.38), vec3(0.55, 0.34, 0.22), vUv.y) * fog;
    float vignette = 1.0 - smoothstep(0.32, 0.86, length((vUv - 0.5) * vec2(0.82, 1.0)));
    color *= mix(0.72, 1.0, vignette * active + (1.0 - active));
    vec3 exactOpening = surface(vUv);
    color = mix(exactOpening, color, active);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const compositeFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uProgress;
  uniform float uBloom;
  varying vec2 vUv;
  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }
  vec3 toneMap(vec3 color) {
    return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
  }
  void main() {
    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    vec3 color = texture2D(tScene, vUv).rgb;
    vec3 blur = texture2D(tScene, vUv + vec2(px.x * 3.0, 0.0)).rgb;
    blur += texture2D(tScene, vUv - vec2(px.x * 3.0, 0.0)).rgb;
    blur += texture2D(tScene, vUv + vec2(0.0, px.y * 3.0)).rgb;
    blur += texture2D(tScene, vUv - vec2(0.0, px.y * 3.0)).rgb;
    blur *= 0.25;
    vec3 bloom = max(blur - 0.58, 0.0) * uBloom;
    float processed = smoothstep(0.012, 0.07, uProgress);
    color = mix(color, toneMap(color + bloom), processed);
    float separation = smoothstep(0.11, 0.6, uProgress) * (1.0 - smoothstep(0.85, 1.0, uProgress));
    color.r = mix(color.r, texture2D(tScene, vUv + vec2(px.x * 1.8, 0.0)).r, separation * 0.16);
    color.b = mix(color.b, texture2D(tScene, vUv - vec2(px.x * 1.8, 0.0)).b, separation * 0.18);
    color += (hash21(vUv * uResolution + fract(uTime) * 913.7) - 0.5) * 0.012 * processed;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function geometry(gl: Renderer['gl']) {
  return new Geometry(gl, {
    position: { size: 3, data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  });
}

const textureSources = [
  '/images/hero-ultimate.webp',
  '/images/home-signal.webp',
  '/images/axiom.webp',
  '/images/forma.webp',
  '/images/serein.webp',
  '/images/home-horizon.webp',
] as const;

export default function HomeWorld({ onReady, onFailure }: { onReady?: () => void; onFailure?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onFailureRef = useRef(onFailure);

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onFailureRef.current = onFailure; }, [onFailure]);

  useEffect(() => {
    const host = hostRef.current;
    const shell = host?.closest<HTMLElement>('.site-shell');
    if (!host || !shell) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !window.matchMedia('(pointer: fine)').matches || window.innerWidth < 820) {
      host.dataset.fallback = 'true';
      return;
    }

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: false, depth: false, stencil: false, antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5), powerPreference: 'high-performance',
      });
    } catch {
      host.dataset.failed = 'true';
      onFailureRef.current?.();
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.canvas.setAttribute('aria-hidden', 'true');
    gl.canvas.setAttribute('role', 'presentation');
    host.appendChild(gl.canvas);

    const placeholder = document.createElement('canvas');
    placeholder.width = 1;
    placeholder.height = 1;
    const placeholderContext = placeholder.getContext('2d');
    if (placeholderContext) {
      placeholderContext.fillStyle = '#0a0b12';
      placeholderContext.fillRect(0, 0, 1, 1);
    }
    const textures = textureSources.map(() => new Texture(gl, {
      image: placeholder, minFilter: gl.LINEAR, magFilter: gl.LINEAR, generateMipmaps: false,
      anisotropy: Math.min(renderer.parameters.maxAnisotropy || 1, 4),
    }));
    const fullscreen = geometry(gl);
    const worldScene = new Transform();
    const compositeScene = new Transform();
    const target = new RenderTarget(gl, { depth: false, stencil: false });
    const progress = { value: 0 };
    const resolution = { value: [1, 1] };
    const pointer = { value: [0, 0] };
    const time = { value: 0 };
    const quality = { value: 1 };

    const worldProgram = new Program(gl, {
      vertex, fragment: worldFragment, depthTest: false, depthWrite: false, cullFace: false,
      uniforms: {
        tSurface: { value: textures[0] }, tSignal: { value: textures[1] },
        tAxiom: { value: textures[2] }, tSerein: { value: textures[3] },
        tForma: { value: textures[4] }, tHorizon: { value: textures[5] },
        uResolution: resolution, uPointer: pointer, uProgress: progress, uTime: time, uQuality: quality,
      },
    });
    new Mesh(gl, { geometry: fullscreen, program: worldProgram }).setParent(worldScene);

    const compositeProgram = new Program(gl, {
      vertex, fragment: compositeFragment, depthTest: false, depthWrite: false, cullFace: false,
      uniforms: {
        tScene: { value: target.texture }, uResolution: resolution, uTime: time,
        uProgress: progress, uBloom: { value: 0.62 },
      },
    });
    new Mesh(gl, { geometry: fullscreen, program: compositeProgram }).setParent(compositeScene);

    let heroReady = false;
    let readyEmitted = false;
    let destroyed = false;
    let frame = 0;
    let paused = document.hidden;
    let dpr = renderer.dpr;
    let slowFrames = 0;
    let lastTime = performance.now();
    let scrollTarget = 0;
    let scrollSmooth = 0;
    let sectionStops = homeChapters.map((_, index) => index / homeChapters.length);
    const pointerState = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const loadTexture = (source: string, index: number) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (destroyed) return;
        textures[index].image = image;
        if (index === 0) {
          heroReady = true;
          textureSources.slice(1).forEach((nextSource, offset) => {
            window.setTimeout(() => loadTexture(nextSource, offset + 1), offset * 90);
          });
        }
      };
      image.onerror = () => {
        if (index === 0) {
          host.dataset.failed = 'true';
          onFailureRef.current?.();
        }
      };
      image.src = assetPath(source);
    };

    const updateScroll = () => {
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      scrollTarget = mapHomeScrollProgress(clampJourneyProgress(window.scrollY / maximum), sectionStops);
      shell.style.setProperty('--home-progress', scrollTarget.toFixed(4));
      shell.dataset.chapter = scrollTarget < 0.14 ? 'surface' : scrollTarget < 0.27 ? 'signal' :
        scrollTarget < 0.39 ? 'axiom' : scrollTarget < 0.51 ? 'serein' : scrollTarget < 0.65 ? 'forma' :
        scrollTarget < 0.79 ? 'services' : scrollTarget < 0.92 ? 'process' : 'contact';
    };
    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.dpr = dpr;
      renderer.setSize(width, height);
      target.setSize(Math.round(width * dpr), Math.round(height * dpr));
      resolution.value = [Math.round(width * dpr), Math.round(height * dpr)];
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      sectionStops = homeChapters.map((chapter, index) => {
        const section = shell.querySelector<HTMLElement>(`[data-home-chapter="${chapter.id}"]`);
        if (!section) return index / homeChapters.length;
        const raw = (section.getBoundingClientRect().top + window.scrollY) / maximum;
        return index === homeChapters.length - 1 ? Math.min(raw, 0.94) : clampJourneyProgress(raw);
      });
      updateScroll();
    };
    const updatePointer = (event: PointerEvent) => {
      pointerState.targetX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointerState.targetY = (0.5 - event.clientY / Math.max(window.innerHeight, 1)) * 2;
    };
    const render = (timeMs: number) => {
      if (destroyed || paused) return;
      const delta = Math.min(timeMs - lastTime, 100);
      lastTime = timeMs;
      slowFrames = delta > 26 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
      if (slowFrames > 85 && dpr > 1) {
        dpr = 1;
        quality.value = 0.7;
        compositeProgram.uniforms.uBloom.value = 0.42;
        host.dataset.quality = 'adaptive';
        slowFrames = 0;
        resize();
      }
      pointerState.x += (pointerState.targetX - pointerState.x) * 0.04;
      pointerState.y += (pointerState.targetY - pointerState.y) * 0.04;
      scrollSmooth += (scrollTarget - scrollSmooth) * 0.07;
      pointer.value = [pointerState.x, pointerState.y];
      progress.value = scrollSmooth;
      time.value = timeMs * 0.001;
      if (heroReady) {
        const fullComposite = window.innerWidth > 1100;
        if (fullComposite) {
          renderer.render({ scene: worldScene, target, clear: true, sort: false, frustumCull: false });
          renderer.render({ scene: compositeScene, clear: true, sort: false, frustumCull: false });
        } else {
          renderer.render({ scene: worldScene, clear: true, sort: false, frustumCull: false });
        }
        if (!readyEmitted) {
          readyEmitted = true;
          host.dataset.ready = 'true';
          shell.dataset.worldReady = 'true';
          onReadyRef.current?.();
        }
      }
      frame = requestAnimationFrame(render);
    };
    const visibility = () => {
      paused = document.hidden;
      if (!paused) { lastTime = performance.now(); frame = requestAnimationFrame(render); }
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      paused = true;
      host.dataset.failed = 'true';
      shell.removeAttribute('data-world-ready');
      onFailureRef.current?.();
      cancelAnimationFrame(frame);
    };

    loadTexture(textureSources[0], 0);
    resize();
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', updatePointer, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    gl.canvas.addEventListener('webglcontextlost', contextLost);
    if (!paused) frame = requestAnimationFrame(render);

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', updatePointer);
      document.removeEventListener('visibilitychange', visibility);
      gl.canvas.removeEventListener('webglcontextlost', contextLost);
      shell.removeAttribute('data-world-ready');
      shell.removeAttribute('data-chapter');
      shell.style.removeProperty('--home-progress');
      worldProgram.remove();
      compositeProgram.remove();
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <div ref={hostRef} className="home-world" aria-hidden="true" />;
}
