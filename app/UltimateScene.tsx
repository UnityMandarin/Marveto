'use client';

import { useEffect, useRef } from 'react';
import { Box, Camera, Color, Mesh, Program, Renderer, Sphere, Torus, Transform } from 'ogl';
import { UltimateSceneType } from './concept-data';

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
    float ripple = sin(position.y * 4.0 + uTime * 0.9) * uDistort;
    vec3 displaced = position + normal * ripple;
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
  uniform vec3 cameraPosition;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 2.4);
    float light = dot(normalize(vNormal), normalize(vec3(-0.4, 0.8, 0.65))) * 0.5 + 0.5;
    float pulse = sin(uTime * 0.75 + vWorld.y * 2.0) * 0.08 + 0.92;
    vec3 color = mix(uColor * (0.34 + light * 0.72), uGlow, fresnel * pulse);
    gl_FragColor = vec4(color, uOpacity * (0.68 + fresnel * 0.32));
  }
`;

interface SceneMesh extends Mesh {
  extras?: { speed?: number; phase?: number; orbit?: number };
}

function createProgram(gl: Renderer['gl'], color: string, glow: string, opacity = 0.9, distort = 0.015) {
  return new Program(gl, {
    vertex,
    fragment,
    transparent: opacity < 1,
    cullFace: false,
    depthWrite: opacity >= 1,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(color) },
      uGlow: { value: new Color(glow) },
      uOpacity: { value: opacity },
      uDistort: { value: distort },
    },
  });
}

export default function UltimateScene({ scene, accent, glow }: { scene: UltimateSceneType; accent: string; glow: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio, 1.5),
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
    const sculpture = new Transform();
    sculpture.setParent(world);
    const camera = new Camera(gl, { fov: 34, near: 0.1, far: 100 });
    camera.position.set(0, 0, 7);
    const meshes: SceneMesh[] = [];
    const programs: Program[] = [];

    const addMesh = (
      geometry: Box | Sphere | Torus,
      color: string,
      opacity: number,
      distort: number,
    ) => {
      const program = createProgram(gl, color, glow, opacity, distort);
      programs.push(program);
      const mesh = new Mesh(gl, { geometry, program }) as SceneMesh;
      mesh.setParent(sculpture);
      meshes.push(mesh);
      return mesh;
    };

    if (scene === 'network') {
      const portal = addMesh(new Torus(gl, { radius: 1.18, tube: 0.13, radialSegments: 28, tubularSegments: 96 }), accent, 0.94, 0.018);
      portal.rotation.x = Math.PI * 0.5;
      portal.rotation.z = -0.28;
      portal.extras = { speed: 0.18 };

      const inner = addMesh(new Torus(gl, { radius: 0.72, tube: 0.035, radialSegments: 18, tubularSegments: 72 }), glow, 0.64, 0.008);
      inner.rotation.x = Math.PI * 0.35;
      inner.rotation.y = Math.PI * 0.2;
      inner.extras = { speed: -0.28 };

      const nodeGeometry = new Sphere(gl, { radius: 0.13, widthSegments: 20, heightSegments: 14 });
      for (let index = 0; index < 9; index += 1) {
        const angle = (index / 9) * Math.PI * 2;
        const node = addMesh(nodeGeometry, index % 2 ? glow : accent, 0.88, 0.028);
        node.position.set(Math.cos(angle) * 1.75, Math.sin(angle * 1.7) * 0.82, Math.sin(angle) * 0.72);
        node.scale.set(0.72 + (index % 3) * 0.2);
        node.extras = { speed: 0.3 + index * 0.025, phase: angle, orbit: 1.75 };
      }
    } else if (scene === 'structure') {
      const slabGeometry = new Box(gl, { width: 2.75, height: 0.16, depth: 1.65 });
      for (let index = 0; index < 7; index += 1) {
        const slab = addMesh(slabGeometry, index % 2 ? accent : glow, 0.76 + index * 0.025, 0.003);
        slab.position.y = -1.3 + index * 0.43;
        slab.position.x = (index - 3) * 0.045;
        slab.rotation.y = (index - 3) * 0.045;
        slab.extras = { speed: 0.05 + index * 0.008, phase: index * 0.7 };
      }
      const columnGeometry = new Box(gl, { width: 0.095, height: 3.25, depth: 0.095 });
      [[-1.05, -0.55], [1.05, -0.55], [-1.05, 0.55], [1.05, 0.55]].forEach(([x, z], index) => {
        const column = addMesh(columnGeometry, glow, 0.52, 0.002);
        column.position.set(x, 0, z);
        column.extras = { phase: index };
      });
      sculpture.rotation.x = -0.18;
      sculpture.rotation.y = -0.45;
    } else {
      const core = addMesh(new Sphere(gl, { radius: 0.92, widthSegments: 44, heightSegments: 28 }), glow, 0.9, 0.11);
      core.scale.set(1, 1.18, 0.9);
      core.extras = { speed: 0.1 };

      const radii = [1.25, 1.58, 1.9];
      radii.forEach((radius, index) => {
        const ring = addMesh(new Torus(gl, { radius, tube: 0.025 + index * 0.012, radialSegments: 18, tubularSegments: 96 }), index === 1 ? glow : accent, 0.48 + index * 0.12, 0.015);
        ring.rotation.x = Math.PI * (0.18 + index * 0.18);
        ring.rotation.y = Math.PI * (0.2 + index * 0.16);
        ring.extras = { speed: index % 2 ? -0.16 : 0.13, phase: index };
      });

      const cellGeometry = new Sphere(gl, { radius: 0.11, widthSegments: 18, heightSegments: 12 });
      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * Math.PI * 2;
        const cell = addMesh(cellGeometry, index % 2 ? accent : glow, 0.8, 0.045);
        cell.position.set(Math.cos(angle) * 1.65, Math.sin(angle * 1.35) * 0.68, Math.sin(angle) * 0.8);
        cell.extras = { speed: 0.24, phase: angle, orbit: 1.65 };
      }
    }

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let frame = 0;
    let destroyed = false;

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.perspective({ aspect: host.clientWidth / Math.max(host.clientHeight, 1) });
      sculpture.scale.set(host.clientWidth < 700 ? 0.72 : 1);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      pointer.targetX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 0.8;
      pointer.targetY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 0.55;
    };

    const render = (timeMs: number) => {
      if (destroyed) return;
      const time = timeMs * 0.001;
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;
      sculpture.rotation.y += ((time * 0.055 + pointer.x) - sculpture.rotation.y) * 0.035;
      sculpture.rotation.x += ((-pointer.y * 0.7) - sculpture.rotation.x) * 0.035;

      meshes.forEach((mesh, index) => {
        const speed = mesh.extras?.speed ?? 0;
        const phase = mesh.extras?.phase ?? index;
        mesh.rotation.z += speed * 0.0025;
        if (mesh.extras?.orbit) {
          const radius = mesh.extras.orbit;
          const angle = phase + time * speed;
          mesh.position.x = Math.cos(angle) * radius;
          mesh.position.z = Math.sin(angle) * 0.78;
          mesh.position.y += (Math.sin(angle * 1.6) * 0.76 - mesh.position.y) * 0.025;
        } else if (scene === 'structure' && index < 7) {
          mesh.position.x = Math.sin(time * 0.32 + phase) * 0.08;
        }
        mesh.program.uniforms.uTime.value = time;
      });

      renderer.render({ scene: world, camera });
      frame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    frame = requestAnimationFrame(render);

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      programs.forEach((program) => program.remove());
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [scene, accent, glow]);

  return <div ref={hostRef} className="ultimate-scene" aria-hidden="true" />;
}
