'use client';

import { useEffect, useRef } from 'react';
import { Color, Geometry, Mesh, Program, Renderer, RenderTarget, Texture, Transform } from 'ogl';
import { UltimateEnvironmentMode, UltimateJourneyDefinition } from './concept-data';
import { clampJourneyProgress, sampleJourneyProgress } from './ultimate-journey';

const fullscreenVertex = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const environmentFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uResolution;
  uniform vec2 uImage;
  uniform vec2 uPointer;
  uniform vec2 uFocal;
  uniform vec3 uAccent;
  uniform vec3 uGlow;
  uniform vec3 uFog;
  uniform float uTime;
  uniform float uProgress;
  uniform float uMode;
  uniform float uExposure;
  uniform float uDepth;
  uniform float uQuality;
  varying vec2 vUv;

  #define PI 3.14159265359

  float saturate(float value) {
    return clamp(value, 0.0, 1.0);
  }

  vec2 coverUv(vec2 uv, vec2 screen, vec2 image) {
    float screenRatio = screen.x / max(screen.y, 1.0);
    float imageRatio = image.x / max(image.y, 1.0);
    vec2 scale = screenRatio < imageRatio
      ? vec2(screenRatio / imageRatio, 1.0)
      : vec2(1.0, imageRatio / screenRatio);
    return (uv - 0.5) * scale + 0.5;
  }

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float noise21(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), local.x),
      mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + 1.0), local.x),
      local.y
    );
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

  float boxSdf(vec2 point, vec2 bounds) {
    vec2 delta = abs(point) - bounds;
    return length(max(delta, 0.0)) + min(max(delta.x, delta.y), 0.0);
  }

  vec3 sourceJourney(vec2 uv, float travel, float penetration) {
    vec3 surface = texture2D(tMap, coverUv(uv, uResolution, uImage)).rgb;
    vec2 focus = uFocal + uPointer * 0.012 * smoothstep(0.02, 0.7, travel);
    vec2 delta = uv - focus;
    float zoom = 1.0 + travel * (2.9 + uDepth * 1.25);
    float breathing = sin(uTime * 0.24 + length(delta) * 11.0) * 0.003 * travel;
    vec2 tunnelUv = focus + delta / zoom + normalize(delta + 0.0001) * breathing;
    vec3 tunnel = texture2D(tMap, coverUv(tunnelUv, uResolution, uImage)).rgb;
    vec3 depthColor = vec3(0.0);
    float weight = 0.0;

    for (int layer = 0; layer < 7; layer++) {
      float layerAmount = float(layer) / 6.0;
      float layerZoom = 1.0 + travel * (0.8 + layerAmount * 4.6);
      vec2 layerUv = focus + delta / layerZoom;
      vec3 sampleColor = texture2D(tMap, coverUv(layerUv, uResolution, uImage)).rgb;
      float layerWeight = mix(0.32, 1.0, layerAmount);
      depthColor += sampleColor * layerWeight;
      weight += layerWeight;
    }

    depthColor /= max(weight, 0.001);
    vec3 penetrated = mix(tunnel, depthColor, penetration * 0.56);
    return mix(surface, penetrated, smoothstep(0.02, 0.46, travel));
  }

  vec3 signalEnvironment(vec2 uv, float travel, float immersion) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 focus = uFocal + uPointer * 0.009;
    vec2 point = (uv - focus) * vec2(aspect, 1.0);
    float radius = length(point);
    float angle = atan(point.y, point.x);
    float flow = fbm(point * 3.4 + vec2(uTime * 0.035, -uTime * 0.022));
    float angular = abs(sin(angle * 9.0 + flow * 2.8));
    float filaments = pow(1.0 - angular, 28.0) * smoothstep(0.04, 0.68, radius);
    float depthBands = abs(fract(radius * (9.0 + uDepth * 3.0) - travel * 5.0 + flow * 0.25) - 0.5);
    depthBands = pow(1.0 - depthBands * 2.0, 18.0);
    float aperture = abs(boxSdf(point, vec2(0.17 + travel * 0.07, 0.29 + travel * 0.12)));
    float apertureLight = exp(-aperture * (42.0 - travel * 12.0));
    float core = exp(-radius * (7.5 - travel * 2.5));
    float mist = fbm(point * 2.2 - vec2(0.0, uTime * 0.018));
    vec3 color = mix(uFog * 0.52, uAccent * 0.48, saturate(mist * 0.7 + depthBands * 0.42));
    color += uGlow * (filaments * 0.72 + apertureLight * 1.4 + core * 1.15);
    color += uAccent * depthBands * 0.36;
    return color * mix(0.65, 1.2, immersion);
  }

  vec3 monolithEnvironment(vec2 uv, float travel, float immersion) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 point = (uv - vec2(0.5, 0.46)) * vec2(aspect, 1.0);
    point += uPointer * vec2(0.012, -0.008);
    float horizon = -0.17 + travel * 0.06;
    float vertical = point.y - horizon;
    float perspective = 0.16 / max(abs(vertical), 0.035);
    float lanes = abs(fract(point.x * perspective * 1.35 + 0.5) - 0.5);
    lanes = pow(1.0 - lanes * 2.0, 24.0);
    float plates = abs(fract(perspective * 0.34 - travel * 1.8) - 0.5);
    plates = pow(1.0 - plates * 2.0, 20.0);
    float wallPlane = smoothstep(0.72, 0.04, abs(point.x)) * smoothstep(0.7, 0.02, abs(vertical));
    float opening = exp(-abs(boxSdf(point - vec2(0.23, -0.02), vec2(0.16, 0.28))) * 32.0);
    float concrete = fbm(point * vec2(3.0, 5.2) + vec2(travel * 0.5, 0.0));
    float reflection = point.y < horizon ? 0.7 : 0.15;
    vec3 stone = mix(uFog * 0.78, uGlow * 0.38, concrete * 0.42 + wallPlane * 0.16);
    vec3 color = stone;
    color += uGlow * lanes * (0.22 + reflection * 0.45);
    color += uAccent * plates * (0.26 + immersion * 0.3);
    color += mix(uGlow, vec3(1.0), 0.35) * opening * 1.05;
    color *= 0.72 + smoothstep(-0.6, 0.65, point.y) * 0.32;
    return color;
  }

  vec3 membraneEnvironment(vec2 uv, float travel, float immersion) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 point = (uv - uFocal) * vec2(aspect, 1.0);
    point += uPointer * 0.01;
    float drift = uTime * 0.025;
    float field = fbm(point * 2.5 + vec2(drift, -drift * 0.7));
    float fine = fbm(point * 6.5 - vec2(drift * 1.8, drift));
    float folds = abs(sin((point.x * 5.8 + field * 2.7 - travel * 1.2) * PI));
    folds = pow(1.0 - folds, 5.0);
    float caustics = abs(sin((point.x + point.y * 0.65 + fine * 0.42) * 24.0 - uTime * 0.12));
    caustics = pow(1.0 - caustics, 12.0) * smoothstep(0.58, -0.52, point.y);
    float veil = smoothstep(0.9, 0.12, abs(point.x + sin(point.y * 3.2 + field) * 0.22));
    float sun = exp(-length(point - vec2(0.04, -0.08)) * (4.8 - travel * 1.2));
    vec3 color = mix(uFog * 0.6, uAccent * 0.42, field * 0.8);
    color = mix(color, uGlow * 0.72, veil * 0.28 + fine * 0.12);
    color += uGlow * folds * (0.46 + immersion * 0.36);
    color += mix(uAccent, vec3(1.0, 0.72, 0.42), 0.52) * sun * 0.95;
    color += vec3(0.65, 0.9, 0.92) * caustics * 0.32;
    return color;
  }

  void main() {
    float travel = saturate(uProgress);
    float penetration = smoothstep(0.18, 0.45, travel);
    float immersion = smoothstep(0.42, 0.82, travel);
    float horizon = smoothstep(0.78, 1.0, travel);
    vec2 uv = vUv;
    vec3 untouched = texture2D(tMap, coverUv(uv, uResolution, uImage)).rgb;
    vec3 source = sourceJourney(uv, travel, penetration);
    vec3 environment;

    if (uMode < 0.5) {
      environment = signalEnvironment(uv, travel, immersion);
    } else if (uMode < 1.5) {
      environment = monolithEnvironment(uv, travel, immersion);
    } else {
      environment = membraneEnvironment(uv, travel, immersion);
    }

    float environmentMix = saturate(immersion * 0.78 + horizon * 0.22);
    vec3 color = mix(source, environment, environmentMix);
    color += environment * penetration * (1.0 - immersion) * 0.22;
    color = mix(color, uFog, horizon * 0.14);
    color *= uExposure * mix(0.94, 1.06, uQuality);
    float vignette = 1.0 - smoothstep(0.34, 0.86, length((uv - 0.5) * vec2(0.82, 1.0)));
    color *= mix(0.72, 1.0, vignette);
    color = mix(untouched, color, smoothstep(0.015, 0.18, travel));
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
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
  }

  void main() {
    vec2 pixel = 1.0 / max(uResolution, vec2(1.0));
    vec3 color = texture2D(tScene, vUv).rgb;
    vec3 blur = vec3(0.0);
    blur += texture2D(tScene, vUv + pixel * vec2(-2.0, 0.0)).rgb;
    blur += texture2D(tScene, vUv + pixel * vec2(2.0, 0.0)).rgb;
    blur += texture2D(tScene, vUv + pixel * vec2(0.0, -2.0)).rgb;
    blur += texture2D(tScene, vUv + pixel * vec2(0.0, 2.0)).rgb;
    blur += texture2D(tScene, vUv + pixel * vec2(-1.4, -1.4)).rgb;
    blur += texture2D(tScene, vUv + pixel * vec2(1.4, -1.4)).rgb;
    blur += texture2D(tScene, vUv + pixel * vec2(-1.4, 1.4)).rgb;
    blur += texture2D(tScene, vUv + pixel * vec2(1.4, 1.4)).rgb;
    blur *= 0.125;
    vec3 bloom = max(blur - 0.58, 0.0) * (0.55 + smoothstep(0.18, 0.82, uProgress) * 0.45);
    float effect = smoothstep(0.015, 0.18, uProgress);
    vec3 processed = toneMap(color + bloom * uBloom);
    color = mix(color, processed, effect);
    float grain = hash21(vUv * uResolution + fract(uTime) * 913.7) - 0.5;
    color += grain * (0.018 - smoothstep(0.0, 1.0, uProgress) * 0.006) * effect;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const modeValues: Record<UltimateEnvironmentMode, number> = {
  signal: 0,
  monolith: 1,
  membrane: 2,
};

function createFullscreenGeometry(gl: Renderer['gl']) {
  return new Geometry(gl, {
    position: { size: 3, data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  });
}

export default function UltimateScene({
  journey,
  image,
  accent,
  glow,
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
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
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
    gl.clearColor(0, 0, 0, 1);

    const texture = new Texture(gl, {
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      generateMipmaps: false,
      anisotropy: Math.min(renderer.parameters.maxAnisotropy || 1, 4),
    });
    const geometry = createFullscreenGeometry(gl);
    const environmentScene = new Transform();
    const compositeScene = new Transform();
    const renderTarget = new RenderTarget(gl, { depth: false, stencil: false });
    const progressUniform = { value: 0 };
    const resolutionUniform = { value: [1, 1] };
    const pointerUniform = { value: [0, 0] };
    const timeUniform = { value: 0 };
    const qualityUniform = { value: 1 };

    const environmentProgram = new Program(gl, {
      vertex: fullscreenVertex,
      fragment: environmentFragment,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        tMap: { value: texture },
        uResolution: resolutionUniform,
        uImage: { value: [1448, 1086] },
        uPointer: pointerUniform,
        uFocal: { value: journey.focalPoint },
        uAccent: { value: new Color(accent) },
        uGlow: { value: new Color(glow) },
        uFog: { value: new Color(journey.fog) },
        uTime: timeUniform,
        uProgress: progressUniform,
        uMode: { value: modeValues[journey.mode] },
        uExposure: { value: journey.exposure },
        uDepth: { value: journey.depth },
        uQuality: qualityUniform,
      },
    });
    const environmentMesh = new Mesh(gl, { geometry, program: environmentProgram });
    environmentMesh.setParent(environmentScene);

    const compositeProgram = new Program(gl, {
      vertex: fullscreenVertex,
      fragment: compositeFragment,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        tScene: { value: renderTarget.texture },
        uResolution: resolutionUniform,
        uTime: timeUniform,
        uProgress: progressUniform,
        uBloom: { value: 0.72 },
      },
    });
    const compositeMesh = new Mesh(gl, { geometry, program: compositeProgram });
    compositeMesh.setParent(compositeScene);

    const source = new Image();
    source.decoding = 'async';
    let imageReady = false;
    let readyEmitted = false;
    source.onload = () => {
      texture.image = source;
      imageReady = true;
    };
    source.onerror = () => {
      host.dataset.failed = 'true';
      shell.removeAttribute('data-ultimate-ready');
    };
    source.src = image;

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let scrollTarget = 0;
    let scrollSmooth = 0;
    let frame = 0;
    let destroyed = false;
    let paused = document.hidden;
    let previousTime = performance.now();
    let slowFrameScore = 0;
    let dpr = renderer.dpr;
    let chapterStops = journey.chapters.map((_, index) => index / Math.max(journey.chapters.length - 1, 1));

    const measure = () => {
      const shellTop = shell.getBoundingClientRect().top + window.scrollY;
      const maxScroll = Math.max(shell.scrollHeight - window.innerHeight, 1);
      chapterStops = journey.chapters.map((chapter, index) => {
        const section = shell.querySelector<HTMLElement>(`[data-journey-chapter="${chapter.id}"]`);
        if (!section) return index / Math.max(journey.chapters.length - 1, 1);
        const sectionTop = section.getBoundingClientRect().top + window.scrollY - shellTop;
        return clampJourneyProgress(sectionTop / maxScroll);
      });
      chapterStops[0] = 0;
      chapterStops[chapterStops.length - 1] = Math.min(chapterStops[chapterStops.length - 1], 0.9);
    };

    const updateScroll = () => {
      const shellTop = shell.getBoundingClientRect().top + window.scrollY;
      const maxScroll = Math.max(shell.scrollHeight - window.innerHeight, 1);
      const pageProgress = clampJourneyProgress((window.scrollY - shellTop) / maxScroll);
      scrollTarget = sampleJourneyProgress(
        pageProgress,
        chapterStops,
        journey.chapters.map((chapter) => chapter.travel),
      );
    };

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.dpr = dpr;
      renderer.setSize(width, height);
      renderTarget.setSize(Math.round(width * dpr), Math.round(height * dpr));
      resolutionUniform.value = [Math.round(width * dpr), Math.round(height * dpr)];
      measure();
      updateScroll();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.targetX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointer.targetY = (0.5 - event.clientY / Math.max(window.innerHeight, 1)) * 2;
    };

    const render = (timeMs: number) => {
      if (destroyed || paused) return;
      const delta = Math.min(timeMs - previousTime, 100);
      previousTime = timeMs;
      if (delta > 26) slowFrameScore += 1;
      else slowFrameScore = Math.max(slowFrameScore - 2, 0);
      if (slowFrameScore > 90 && dpr > 1) {
        dpr = 1;
        qualityUniform.value = 0.7;
        compositeProgram.uniforms.uBloom.value = 0.5;
        slowFrameScore = 0;
        host.dataset.quality = 'adaptive';
        resize();
      }

      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;
      scrollSmooth += (scrollTarget - scrollSmooth) * 0.065;
      pointerUniform.value = [pointer.x, pointer.y];
      progressUniform.value = scrollSmooth;
      timeUniform.value = timeMs * 0.001;
      shell.style.setProperty('--journey-progress', scrollSmooth.toFixed(4));

      if (imageReady) {
        renderer.render({ scene: environmentScene, target: renderTarget, clear: true, sort: false, frustumCull: false });
        renderer.render({ scene: compositeScene, clear: true, sort: false, frustumCull: false });
        if (!readyEmitted) {
          readyEmitted = true;
          host.dataset.ready = 'true';
          shell.dataset.ultimateReady = 'true';
        }
      }

      frame = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) {
        previousTime = performance.now();
        frame = requestAnimationFrame(render);
      }
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      host.dataset.failed = 'true';
      shell.removeAttribute('data-ultimate-ready');
      paused = true;
      cancelAnimationFrame(frame);
    };

    resize();
    updateScroll();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    gl.canvas.addEventListener('webglcontextlost', onContextLost);
    if (!paused) frame = requestAnimationFrame(render);

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.canvas.removeEventListener('webglcontextlost', onContextLost);
      shell.removeAttribute('data-ultimate-ready');
      shell.style.removeProperty('--journey-progress');
      environmentProgram.remove();
      compositeProgram.remove();
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [journey, image, accent, glow]);

  return <div ref={hostRef} className="ultimate-journey" aria-hidden="true" />;
}
