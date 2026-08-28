'use client';

import { useEffect, useRef } from 'react';
import { Box, Camera, Color, Mesh, Program, Renderer, Sphere, Torus, Transform, Vec3 } from 'ogl';
import { SceneChapterId, UltimateJourneyDefinition, UltimateWorldType } from './concept-data';

const vertex = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uDistort;
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    float wave = sin(position.y * 3.7 + position.x * 2.1 + uTime * 0.72) * uDistort;
    vec3 displaced = position + normal * wave;
    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uGlow;
  uniform vec3 uFogColor;
  uniform vec3 cameraPosition;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uLight;
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorld);
    vec3 lightDirection = normalize(vec3(-0.45 + sin(uTime * 0.18) * 0.18, 0.78, 0.58));
    float diffuse = dot(normal, lightDirection) * 0.5 + 0.5;
    float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 2.35);
    float pulse = sin(uTime * 0.82 + vWorld.z * 0.24 + vWorld.y * 1.7) * 0.07 + 0.93;
    vec3 surface = mix(uColor * (0.22 + diffuse * uLight), uGlow, fresnel * pulse);
    float distanceToCamera = length(cameraPosition - vWorld);
    float fog = smoothstep(12.0, 35.0, distanceToCamera);
    vec3 color = mix(surface, uFogColor, fog * 0.88);
    float alpha = uOpacity * (0.64 + fresnel * 0.36) * (1.0 - fog * 0.42);
    gl_FragColor = vec4(color, alpha);
  }
`;

type JourneyGeometry = Box | Sphere | Torus;

interface JourneyMesh extends Mesh {
  journey?: {
    base: [number, number, number];
    phase: number;
    spin?: [number, number, number];
    float?: number;
    orbit?: number;
    orbitSpeed?: number;
  };
}

interface JourneyMaterial {
  program: Program;
  light: { value: number };
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function smoothstep(amount: number) {
  const clamped = Math.min(Math.max(amount, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function createMaterial(
  gl: Renderer['gl'],
  color: string,
  glow: string,
  fog: string,
  opacity: number,
  distort: number,
): JourneyMaterial {
  const light = { value: 0.9 };
  const program = new Program(gl, {
    vertex,
    fragment,
    transparent: true,
    cullFace: false,
    depthWrite: opacity > 0.8,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(color) },
      uGlow: { value: new Color(glow) },
      uFogColor: { value: new Color(fog) },
      uOpacity: { value: opacity },
      uDistort: { value: distort },
      uLight: light,
    },
  });
  return { program, light };
}

function roomDepth(index: number) {
  return index * -16;
}

export default function UltimateScene({
  journey,
  accent,
  glow,
}: {
  journey: UltimateJourneyDefinition;
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
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 1.25),
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
    gl.clearColor(0, 0, 0, 0);

    const world = new Transform();
    const camera = new Camera(gl, { fov: journey.chapters[0].camera.fov, near: 0.08, far: 120 });
    const cameraTarget = new Vec3();
    const meshes: JourneyMesh[] = [];
    const materials = {
      accent: createMaterial(gl, accent, glow, journey.fog, 0.82, 0.008),
      glow: createMaterial(gl, glow, '#ffffff', journey.fog, 0.68, 0.014),
      glass: createMaterial(gl, journey.fog, accent, journey.fog, 0.34, 0.032),
      solid: createMaterial(gl, accent, glow, journey.fog, 0.94, 0.003),
    };
    const materialList = Object.values(materials);

    const addMesh = (
      geometry: JourneyGeometry,
      material: JourneyMaterial,
      position: [number, number, number],
      scale: [number, number, number] = [1, 1, 1],
      rotation: [number, number, number] = [0, 0, 0],
      extras: Partial<NonNullable<JourneyMesh['journey']>> = {},
    ) => {
      const mesh = new Mesh(gl, { geometry, program: material.program }) as JourneyMesh;
      mesh.setParent(world);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      mesh.journey = {
        base: position,
        phase: extras.phase ?? meshes.length * 0.71,
        spin: extras.spin,
        float: extras.float,
        orbit: extras.orbit,
        orbitSpeed: extras.orbitSpeed,
      };
      meshes.push(mesh);
      return mesh;
    };

    const frameVertical = new Box(gl, { width: 0.16, height: 5.5, depth: 0.34 });
    const frameHorizontal = new Box(gl, { width: 6.5, height: 0.16, depth: 0.34 });
    const floorRail = new Box(gl, { width: 0.055, height: 0.035, depth: 14 });

    for (let chapterIndex = 0; chapterIndex < journey.chapters.length; chapterIndex += 1) {
      const z = roomDepth(chapterIndex);
      for (let rail = -3; rail <= 3; rail += 1) {
        addMesh(floorRail, materials.glass, [rail * 0.88, -2.72, z - 1.5], [1, 1, 1], [0, 0, 0], { phase: chapterIndex + rail });
      }
      if (chapterIndex < journey.chapters.length - 1) {
        const threshold = z - 8;
        addMesh(frameVertical, materials.accent, [-3.25, 0, threshold]);
        addMesh(frameVertical, materials.accent, [3.25, 0, threshold]);
        addMesh(frameHorizontal, materials.glow, [0, 2.72, threshold]);
        addMesh(frameHorizontal, materials.glass, [0, -2.72, threshold]);
      }
    }

    const createNetworkRoom = (chapterIndex: number) => {
      const z = roomDepth(chapterIndex);
      const nodeGeometry = new Sphere(gl, { radius: 0.12, widthSegments: 16, heightSegments: 12 });
      const glassBlock = new Box(gl, { width: 0.62, height: 0.62, depth: 0.62 });
      const portalGeometry = new Torus(gl, { radius: 1.45 + chapterIndex * 0.08, tube: 0.055, radialSegments: 18, tubularSegments: 72 });
      addMesh(portalGeometry, chapterIndex % 2 ? materials.glow : materials.accent, [0, 0.15, z - 1.5], [1, 1, 1], [Math.PI * 0.5, 0, chapterIndex * 0.22], { spin: [0.02, 0.045, 0.08], phase: chapterIndex });
      addMesh(portalGeometry, materials.glass, [0, 0.15, z - 2], [1.55, 1.55, 1.55], [Math.PI * 0.5, chapterIndex * 0.14, 0], { spin: [0.01, -0.025, -0.04], phase: chapterIndex + 1 });
      for (let index = 0; index < 9; index += 1) {
        const angle = (index / 9) * Math.PI * 2;
        const radius = 1.7 + (index % 3) * 0.48;
        addMesh(
          index % 3 === 0 ? glassBlock : nodeGeometry,
          index % 2 ? materials.glow : materials.accent,
          [Math.cos(angle) * radius, Math.sin(angle * 1.4) * 1.35, z - 1.6 + Math.sin(angle) * 1.15],
          index % 3 === 0 ? [0.62, 0.62, 0.62] : [1, 1, 1],
          [angle * 0.4, angle * 0.3, angle],
          { orbit: 0.18 + (index % 2) * 0.12, orbitSpeed: 0.12 + index * 0.007, spin: [0.04, 0.08, 0.025], phase: angle },
        );
      }
    };

    const createStructureRoom = (chapterIndex: number) => {
      const z = roomDepth(chapterIndex);
      const column = new Box(gl, { width: 0.12, height: 5.2, depth: 0.12 });
      const slab = new Box(gl, { width: 4.9, height: 0.12, depth: 3.45 });
      const brace = new Box(gl, { width: 0.08, height: 3.6, depth: 0.08 });
      [[-2.5, -2.1], [2.5, -2.1], [-2.5, 1.1], [2.5, 1.1]].forEach(([x, depth], index) => {
        addMesh(column, index % 2 ? materials.glow : materials.accent, [x, 0, z + depth], [1, 1, 1], [0, 0, 0], { phase: chapterIndex + index });
      });
      for (let level = 0; level < 6; level += 1) {
        addMesh(
          slab,
          level % 2 ? materials.glass : materials.accent,
          [(level - 2.5) * 0.08, -1.8 + level * 0.68, z - 1.15],
          [1, 1, 1],
          [0, (level - 2.5) * 0.025, 0],
          { float: 0.09 + level * 0.012, phase: level * 0.7 + chapterIndex },
        );
      }
      addMesh(brace, materials.glow, [-1.65, 0, z - 2.75], [1, 1, 1], [0, 0, -0.72]);
      addMesh(brace, materials.glow, [1.65, 0, z - 2.75], [1, 1, 1], [0, 0, 0.72]);
    };

    const createBiomorphicRoom = (chapterIndex: number) => {
      const z = roomDepth(chapterIndex);
      const core = new Sphere(gl, { radius: 0.82 + chapterIndex * 0.04, widthSegments: 34, heightSegments: 22 });
      const cell = new Sphere(gl, { radius: 0.13, widthSegments: 14, heightSegments: 10 });
      addMesh(core, chapterIndex % 2 ? materials.glow : materials.accent, [0, 0.12, z - 1.8], [1.05, 1.32, 0.86], [0, chapterIndex * 0.18, 0], { spin: [0.025, 0.045, 0.012], float: 0.13, phase: chapterIndex });
      [1.32, 1.72, 2.12].forEach((radius, index) => {
        const ring = new Torus(gl, { radius, tube: 0.022 + index * 0.012, radialSegments: 16, tubularSegments: 72 });
        addMesh(ring, index === 1 ? materials.glow : materials.glass, [0, 0.12, z - 1.8], [1, 1, 1], [Math.PI * (0.18 + index * 0.17), Math.PI * (0.1 + index * 0.11), 0], { spin: [0.035, index % 2 ? -0.06 : 0.055, 0.02], phase: index + chapterIndex });
      });
      for (let index = 0; index < 7; index += 1) {
        const angle = (index / 7) * Math.PI * 2;
        addMesh(
          cell,
          index % 2 ? materials.accent : materials.glow,
          [Math.cos(angle) * 2.15, Math.sin(angle * 1.35) * 1.3, z - 1.8 + Math.sin(angle) * 0.9],
          [1, 1, 1],
          [0, 0, 0],
          { orbit: 0.24, orbitSpeed: 0.09 + index * 0.009, float: 0.06, phase: angle },
        );
      }
    };

    const roomFactory: Record<UltimateWorldType, (index: number) => void> = {
      network: createNetworkRoom,
      structure: createStructureRoom,
      biomorphic: createBiomorphicRoom,
    };
    journey.chapters.forEach((_, index) => roomFactory[journey.world](index));

    const moteGeometry = new Sphere(gl, { radius: 0.035, widthSegments: 8, heightSegments: 6 });
    const moteCount = Math.round(26 * journey.density);
    for (let index = 0; index < moteCount; index += 1) {
      const lane = (index % 7) - 3;
      const depth = -2 - (index / Math.max(moteCount - 1, 1)) * 66;
      const moteScale = 0.65 + (index % 3) * 0.22;
      addMesh(
        moteGeometry,
        index % 3 ? materials.glow : materials.accent,
        [lane * 0.92 + Math.sin(index * 2.1) * 0.36, -2.2 + (index % 6) * 0.82, depth],
        [moteScale, moteScale, moteScale],
        [0, 0, 0],
        { float: 0.12, phase: index * 0.83 },
      );
    }

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let scrollTarget = 0;
    let scrollSmooth = 0;
    let chapterStops = journey.chapters.map((_, index) => index / (journey.chapters.length - 1));
    let activeChapter: SceneChapterId = 'hero';
    let frame = 0;
    let destroyed = false;
    let paused = document.hidden;

    const measureChapters = () => {
      const shellTop = shell.getBoundingClientRect().top + window.scrollY;
      const max = Math.max(shell.scrollHeight - window.innerHeight, 1);
      chapterStops = journey.chapters.map((chapter, index) => {
        const section = shell.querySelector<HTMLElement>(`[data-journey-chapter="${chapter.id}"]`);
        if (!section) return index / (journey.chapters.length - 1);
        const sectionTop = section.getBoundingClientRect().top + window.scrollY - shellTop;
        return Math.min(Math.max(sectionTop / max, 0), 1);
      });
      chapterStops[0] = 0;
      chapterStops[chapterStops.length - 1] = Math.min(chapterStops[chapterStops.length - 1], 0.88);
    };

    const updateScroll = () => {
      const shellTop = shell.getBoundingClientRect().top + window.scrollY;
      const max = Math.max(shell.scrollHeight - window.innerHeight, 1);
      scrollTarget = Math.min(Math.max((window.scrollY - shellTop) / max, 0), 1);
    };

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.perspective({ aspect: host.clientWidth / Math.max(host.clientHeight, 1) });
      measureChapters();
      updateScroll();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.targetX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 0.55;
      pointer.targetY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 0.38;
    };

    const keyframeAt = (progress: number) => {
      let index = 0;
      for (let stop = 0; stop < chapterStops.length - 1; stop += 1) {
        if (progress >= chapterStops[stop]) index = stop;
      }
      index = Math.min(index, journey.chapters.length - 2);
      const startStop = chapterStops[index];
      const endStop = chapterStops[index + 1];
      const local = smoothstep((progress - startStop) / Math.max(endStop - startStop, 0.001));
      return { local, from: journey.chapters[index], to: journey.chapters[index + 1] };
    };

    const render = (timeMs: number) => {
      if (destroyed || paused) return;
      const time = timeMs * 0.001;
      pointer.x += (pointer.targetX - pointer.x) * 0.04;
      pointer.y += (pointer.targetY - pointer.y) * 0.04;
      scrollSmooth += (scrollTarget - scrollSmooth) * 0.07;

      const { local, from, to } = keyframeAt(scrollSmooth);
      const fromCamera = from.camera;
      const toCamera = to.camera;
      const px = lerp(fromCamera.position[0], toCamera.position[0], local) + pointer.x;
      const py = lerp(fromCamera.position[1], toCamera.position[1], local) - pointer.y;
      const pz = lerp(fromCamera.position[2], toCamera.position[2], local);
      const tx = lerp(fromCamera.target[0], toCamera.target[0], local) + pointer.x * 0.28;
      const ty = lerp(fromCamera.target[1], toCamera.target[1], local) - pointer.y * 0.2;
      const tz = lerp(fromCamera.target[2], toCamera.target[2], local);
      camera.position.set(px, py, pz);
      cameraTarget.set(tx, ty, tz);
      camera.lookAt(cameraTarget);
      camera.rotation.z += lerp(fromCamera.roll ?? 0, toCamera.roll ?? 0, local);
      camera.fov = lerp(fromCamera.fov, toCamera.fov, local);
      camera.perspective({ aspect: host.clientWidth / Math.max(host.clientHeight, 1) });

      const nextChapter = local > 0.82 ? to : from;
      if (activeChapter !== nextChapter.id) {
        activeChapter = nextChapter.id;
        host.dataset.chapter = activeChapter;
        host.dataset.room = nextChapter.room;
      }

      const light = lerp(from.light, to.light, local);
      materialList.forEach((material) => {
        material.program.uniforms.uTime.value = time;
        material.light.value = light;
      });

      meshes.forEach((mesh) => {
        const motion = mesh.journey;
        if (!motion) return;
        const phase = motion.phase;
        if (motion.spin) {
          mesh.rotation.x += motion.spin[0] * 0.003;
          mesh.rotation.y += motion.spin[1] * 0.003;
          mesh.rotation.z += motion.spin[2] * 0.003;
        }
        if (motion.float) {
          mesh.position.y = motion.base[1] + Math.sin(time * 0.52 + phase) * motion.float;
        }
        if (motion.orbit) {
          const angle = time * (motion.orbitSpeed ?? 0.1) + phase;
          mesh.position.x = motion.base[0] + Math.cos(angle) * motion.orbit;
          mesh.position.z = motion.base[2] + Math.sin(angle) * motion.orbit;
        }
      });

      renderer.render({ scene: world, camera });
      frame = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) frame = requestAnimationFrame(render);
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      host.dataset.failed = 'true';
      paused = true;
      cancelAnimationFrame(frame);
    };

    resize();
    updateScroll();
    host.dataset.chapter = activeChapter;
    host.dataset.room = journey.chapters[0].room;
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
      materialList.forEach((material) => material.program.remove());
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [journey, accent, glow]);

  return <div ref={hostRef} className="ultimate-journey" aria-hidden="true" />;
}
