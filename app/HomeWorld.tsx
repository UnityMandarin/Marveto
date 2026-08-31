'use client';

import { useEffect, useRef, useState } from 'react';
import { Geometry, Mesh, Program, Renderer, RenderTarget, Texture, Transform } from 'ogl';
import { assetPath } from './asset-path';
import { homeChapters, HomeQualityMode, mapHomeScrollProgress, resolveHomeQuality, sampleJourneyFrame } from './home-journey';
import { authoredSceneOrder, authoredScenes } from './scene-registry';
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
  uniform sampler2D tServices;
  uniform sampler2D tProcess;
  uniform sampler2D tContact;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uSceneA;
  uniform float uSceneB;
  uniform float uMix;
  uniform float uScale;
  uniform float uLayerDepth;
  uniform vec4 uMaskA;
  uniform vec4 uMaskB;
  uniform float uExposureA;
  uniform float uExposureB;
  varying vec2 vUv;

  vec2 cover(vec2 uv, vec2 image) {
    float screenRatio = uResolution.x / max(uResolution.y, 1.0);
    float imageRatio = image.x / image.y;
    vec2 scale = screenRatio < imageRatio ? vec2(screenRatio / imageRatio, 1.0) : vec2(1.0, imageRatio / screenRatio);
    return (uv - 0.5) * scale + 0.5;
  }

  vec3 sampleScene(float scene, vec2 uv) {
    if (scene < 0.5) return texture2D(tSurface, cover(uv, vec2(2048.0, 1152.0))).rgb;
    if (scene < 1.5) return texture2D(tSignal, cover(uv, vec2(2048.0, 1152.0))).rgb;
    if (scene < 2.5) return texture2D(tAxiom, cover(uv, vec2(1448.0, 1086.0))).rgb;
    if (scene < 3.5) return texture2D(tSerein, cover(uv, vec2(1448.0, 1086.0))).rgb;
    if (scene < 4.5) return texture2D(tForma, cover(uv, vec2(1448.0, 1086.0))).rgb;
    if (scene < 5.5) return texture2D(tServices, cover(uv, vec2(1672.0, 938.0))).rgb;
    if (scene < 6.5) return texture2D(tProcess, cover(uv, vec2(1672.0, 938.0))).rgb;
    return texture2D(tContact, cover(uv, vec2(2048.0, 1152.0))).rgb;
  }

  float imageMask(vec2 uv, vec4 mask) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 delta = (uv - mask.xy) * vec2(aspect, 1.0);
    return 1.0 - smoothstep(mask.z - mask.w, mask.z + mask.w, length(delta));
  }

  vec3 authoredLayer(float scene, vec2 uv, vec4 mask, float exposure) {
    if (scene < 0.5) return sampleScene(scene, uv) * exposure;
    vec2 focal = mask.xy;
    vec2 baseUv = focal + (uv - focal) / uScale;
    vec2 foregroundUv = focal + (uv - focal) / (uScale + uLayerDepth);
    foregroundUv += uPointer * uLayerDepth * 0.12;
    vec3 base = sampleScene(scene, baseUv);
    vec3 foreground = sampleScene(scene, foregroundUv);
    float matte = imageMask(uv, mask);
    vec3 color = mix(base, foreground, matte * 0.72);
    float realHighlight = smoothstep(0.68, 0.96, dot(foreground, vec3(0.2126, 0.7152, 0.0722)));
    color += foreground * realHighlight * matte * 0.045;
    return color * exposure;
  }

  void main() {
    vec3 sceneA = authoredLayer(uSceneA, vUv, uMaskA, uExposureA);
    vec3 sceneB = authoredLayer(uSceneB, vUv, uMaskB, uExposureB);
    gl_FragColor = vec4(mix(sceneA, sceneB, uMix), 1.0);
  }
`;

const compositeFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform vec2 uResolution;
  uniform float uBloom;
  varying vec2 vUv;
  vec3 toneMap(vec3 color) {
    return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
  }
  void main() {
    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    vec3 color = texture2D(tScene, vUv).rgb;
    vec3 blur = texture2D(tScene, vUv + vec2(px.x * 2.5, 0.0)).rgb;
    blur += texture2D(tScene, vUv - vec2(px.x * 2.5, 0.0)).rgb;
    blur += texture2D(tScene, vUv + vec2(0.0, px.y * 2.5)).rgb;
    blur += texture2D(tScene, vUv - vec2(0.0, px.y * 2.5)).rgb;
    blur *= 0.25;
    vec3 bloom = max(blur - 0.78, 0.0) * uBloom;
    gl_FragColor = vec4(toneMap(color + bloom), 1.0);
  }
`;

function fullscreenGeometry(gl: Renderer['gl']) {
  return new Geometry(gl, {
    position: { size: 3, data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  });
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function currentQuality(): HomeQualityMode {
  return resolveHomeQuality({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    finePointer: window.matchMedia('(pointer: fine)').matches,
    viewportWidth: window.innerWidth,
    webgl: webglAvailable(),
  });
}

export default function HomeWorld({ onReady, onFailure }: { onReady?: () => void; onFailure?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onFailureRef = useRef(onFailure);
  const [quality, setQuality] = useState<HomeQualityMode>('static');

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onFailureRef.current = onFailure; }, [onFailure]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(pointer: fine)');
    const update = () => setQuality(currentQuality());
    update();
    window.addEventListener('resize', update);
    reduced.addEventListener('change', update);
    pointer.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      reduced.removeEventListener('change', update);
      pointer.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const shell = host?.closest<HTMLElement>('.site-shell');
    if (!host || !shell) return;
    shell.dataset.quality = quality;
    if (quality === 'static') {
      host.dataset.fallback = 'true';
      shell.removeAttribute('data-world-ready');
      return;
    }
    delete host.dataset.fallback;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        dpr: quality === 'full' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1,
        powerPreference: 'high-performance',
      });
    } catch {
      host.dataset.failed = 'true';
      queueMicrotask(() => setQuality('static'));
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
    placeholder.getContext('2d')?.fillRect(0, 0, 1, 1);
    const textures = authoredSceneOrder.map(() => new Texture(gl, {
      image: placeholder,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      generateMipmaps: false,
      anisotropy: Math.min(renderer.parameters.maxAnisotropy || 1, 4),
    }));
    const geometry = fullscreenGeometry(gl);
    const worldScene = new Transform();
    const compositeScene = new Transform();
    const target = new RenderTarget(gl, { depth: false, stencil: false });
    const resolution = { value: [1, 1] };
    const pointer = { value: [0, 0] };
    const sceneA = { value: 0 };
    const sceneB = { value: 0 };
    const sceneMix = { value: 0 };
    const scale = { value: 1 };
    const layerDepth = { value: 0 };
    const maskA = { value: authoredScenes.surface.foregroundMask };
    const maskB = { value: authoredScenes.surface.foregroundMask };
    const exposureA = { value: 1 };
    const exposureB = { value: 1 };

    const worldProgram = new Program(gl, {
      vertex,
      fragment: worldFragment,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        tSurface: { value: textures[0] },
        tSignal: { value: textures[1] },
        tAxiom: { value: textures[2] },
        tSerein: { value: textures[3] },
        tForma: { value: textures[4] },
        tServices: { value: textures[5] },
        tProcess: { value: textures[6] },
        tContact: { value: textures[7] },
        uResolution: resolution,
        uPointer: pointer,
        uSceneA: sceneA,
        uSceneB: sceneB,
        uMix: sceneMix,
        uScale: scale,
        uLayerDepth: layerDepth,
        uMaskA: maskA,
        uMaskB: maskB,
        uExposureA: exposureA,
        uExposureB: exposureB,
      },
    });
    new Mesh(gl, { geometry, program: worldProgram }).setParent(worldScene);

    const compositeProgram = new Program(gl, {
      vertex,
      fragment: compositeFragment,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        tScene: { value: target.texture },
        uResolution: resolution,
        uBloom: { value: quality === 'full' ? 0.22 : 0 },
      },
    });
    new Mesh(gl, { geometry, program: compositeProgram }).setParent(compositeScene);

    let destroyed = false;
    let paused = document.hidden;
    let frame = 0;
    let ready = false;
    let scrollTarget = 0;
    let scrollCurrent = 0;
    let slowFrames = 0;
    let lastFrame = 0;
    let sectionStops = homeChapters.map((_, index) => index / homeChapters.length);
    const pointerState = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const setFrameUniforms = () => {
      const journey = sampleJourneyFrame(scrollCurrent);
      const nextIndex = Math.min(journey.index + 1, authoredSceneOrder.length - 1);
      const activeAsset = authoredScenes[journey.chapter.sceneId];
      const nextAsset = authoredScenes[journey.nextChapter.sceneId];
      sceneA.value = journey.index;
      sceneB.value = nextIndex;
      sceneMix.value = journey.transitionProgress;
      scale.value = journey.cameraScale;
      layerDepth.value = journey.chapter.layerDepth;
      maskA.value = activeAsset.foregroundMask;
      maskB.value = nextAsset.foregroundMask;
      exposureA.value = activeAsset.exposure;
      exposureB.value = nextAsset.exposure;
      pointer.value = [pointerState.x, pointerState.y];
      shell.dataset.chapter = journey.chapter.id;
      shell.dataset.copyPhase = journey.copyPhase;
      shell.style.setProperty('--home-progress', journey.progress.toFixed(4));
      shell.style.setProperty('--chapter-progress', journey.localProgress.toFixed(4));
      shell.style.setProperty('--copy-opacity', journey.copyOpacity.toFixed(4));
    };

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height);
      target.setSize(Math.round(width * renderer.dpr), Math.round(height * renderer.dpr));
      resolution.value = [Math.round(width * renderer.dpr), Math.round(height * renderer.dpr)];
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      sectionStops = homeChapters.map((item, index) => {
        const section = shell.querySelector<HTMLElement>(`[data-home-chapter="${item.id}"]`);
        if (!section) return index / homeChapters.length;
        const raw = (section.getBoundingClientRect().top + window.scrollY) / maximum;
        return index === homeChapters.length - 1 ? Math.min(raw, 0.94) : clampJourneyProgress(raw);
      });
      updateScroll();
    };

    const render = (timestamp: number) => {
      frame = 0;
      if (destroyed || paused || !ready) return;
      if (lastFrame) {
        const delta = timestamp - lastFrame;
        slowFrames = delta > 24 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
        if (quality === 'full' && slowFrames > 36) {
          host.dataset.quality = 'adaptive';
          setQuality('balanced');
          return;
        }
      }
      lastFrame = timestamp;
      scrollCurrent += (scrollTarget - scrollCurrent) * 0.16;
      pointerState.x += (pointerState.targetX - pointerState.x) * 0.18;
      pointerState.y += (pointerState.targetY - pointerState.y) * 0.18;
      setFrameUniforms();
      renderer.render({ scene: worldScene, target, clear: true, sort: false, frustumCull: false });
      renderer.render({ scene: compositeScene, clear: true, sort: false, frustumCull: false });
      const moving = Math.abs(scrollTarget - scrollCurrent) > 0.00008
        || Math.abs(pointerState.targetX - pointerState.x) > 0.0008
        || Math.abs(pointerState.targetY - pointerState.y) > 0.0008;
      if (moving) requestRender();
    };

    const requestRender = () => {
      if (!frame && !paused && !destroyed) frame = requestAnimationFrame(render);
    };

    const updateScroll = () => {
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      scrollTarget = mapHomeScrollProgress(clampJourneyProgress(window.scrollY / maximum), sectionStops);
      requestRender();
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

    const fail = () => {
      host.dataset.failed = 'true';
      shell.removeAttribute('data-world-ready');
      onFailureRef.current?.();
      setQuality('static');
    };

    const loadTexture = (index: number) => new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (!destroyed) textures[index].image = image;
        resolve();
      };
      image.onerror = () => reject(new Error(authoredSceneOrder[index]));
      image.src = assetPath(authoredScenes[authoredSceneOrder[index]].desktopBase);
    });

    const start = async () => {
      try {
        await loadTexture(0);
        if (destroyed) return;
        for (let index = 1; index < textures.length; index += 1) textures[index].image = textures[0].image;
        ready = true;
        scrollCurrent = scrollTarget;
        host.dataset.ready = 'true';
        shell.dataset.worldReady = 'true';
        onReadyRef.current?.();
        requestRender();
        await Promise.all(authoredSceneOrder.slice(1).map((_, offset) => loadTexture(offset + 1)));
        requestRender();
      } catch {
        fail();
      }
    };

    const contextLost = (event: Event) => {
      event.preventDefault();
      paused = true;
      fail();
    };

    resize();
    updateScroll();
    void start();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', updatePointer, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    gl.canvas.addEventListener('webglcontextlost', contextLost);

    return () => {
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', updatePointer);
      document.removeEventListener('visibilitychange', visibility);
      gl.canvas.removeEventListener('webglcontextlost', contextLost);
      shell.removeAttribute('data-world-ready');
      shell.removeAttribute('data-copy-phase');
      shell.style.removeProperty('--chapter-progress');
      shell.style.removeProperty('--copy-opacity');
      worldProgram.remove();
      compositeProgram.remove();
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [quality]);

  return <div ref={hostRef} className="home-world" data-quality={quality} aria-hidden="true" />;
}
