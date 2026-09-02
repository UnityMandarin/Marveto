'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { assetPath } from './asset-path';
import { heroScrollProgress, heroThreeVisibility, sampleHeroOrbit } from './hero-three';

const sourceSize = { width: 2048, height: 1152 };


function createDramaticPyramidGeometry(): THREE.BufferGeometry {
  // The broad +Z face meets the default hero camera first; the rear contracts into
  // a narrower, uneven footprint so every orbit angle reveals a new silhouette.
  const apex: [number, number, number] = [0.25, 1.88, 0.16];
  // Keep each silhouette ray intact, but carry every base corner far below the
  // viewport so the pyramid never exposes a cutoff edge during the full orbit.
  const frontLeft: [number, number, number] = [-14.31, -9.528, 2.176];
  const frontFacet: [number, number, number] = [0.73, -8.568, 2.752];
  const frontRight: [number, number, number] = [7.93, -8.968, 1.888];
  const rearRight: [number, number, number] = [3.69, -9.048, -5.088];
  const rearLeft: [number, number, number] = [-4.342, -8.808, -3.52];

  // Faces are intentionally unshared so their crisp, differing planes and UV
  // islands remain distinct. The UV spans are proportional to each face, which
  // preserves the existing high-resolution surface detail without mirroring it.
  const positions = new Float32Array([
    ...apex, ...frontLeft, ...frontFacet,
    ...apex, ...frontFacet, ...frontRight,
    ...apex, ...frontRight, ...rearRight,
    ...apex, ...rearRight, ...rearLeft,
    ...apex, ...rearLeft, ...frontLeft,

    ...frontLeft, ...frontRight, ...frontFacet,
    ...frontLeft, ...rearRight, ...frontRight,
    ...frontLeft, ...rearLeft, ...rearRight,
  ]);
  const uvs = new Float32Array([
    0.5, 0.98, 0.02, 0.04, 0.98, 0.04,
    0.5, 0.98, 0.02, 0.04, 0.98, 0.04,
    0.5, 0.98, 0.02, 0.04, 0.98, 0.04,
    0.5, 0.98, 0.02, 0.04, 0.98, 0.04,
    0.5, 0.98, 0.02, 0.04, 0.98, 0.04,

    0, 0, 1, 0, 0.5, 1,
    0, 0, 0.5, 1, 1, 0,
    0, 0, 1, 0.5, 0.6, 1,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.addGroup(0, 3, 0);
  geometry.addGroup(3, 3, 1);
  geometry.addGroup(6, 3, 2);
  geometry.addGroup(9, 3, 3);
  geometry.addGroup(12, 3, 4);
  geometry.addGroup(15, 9, 5);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function textureRegion(
  source: THREE.Texture,
  renderer: THREE.WebGLRenderer,
  region: { x: number; y: number; width: number; height: number },
): THREE.Texture {
  const texture = source.clone();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.offset.set(region.x / sourceSize.width, 1 - (region.y + region.height) / sourceSize.height);
  texture.repeat.set(region.width / sourceSize.width, region.height / sourceSize.height);
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export default function HeroThreeWorld() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const shell = host?.closest<HTMLElement>('.site-shell');
    const hero = shell?.querySelector<HTMLElement>('.hero-chapter');
    if (!host || !shell || !hero) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!webglAvailable() || reducedMotion) {
      host.dataset.fallback = 'true';
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth >= 1180 ? 2 : 1.35));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.setAttribute('role', 'presentation');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xd9cec4, 0.026);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    const target = new THREE.Vector3(0.8, 0.55, 0);
    const clock = new THREE.Clock();
    const sceneRoot = new THREE.Group();
    sceneRoot.position.set(2.15, -0.15, 0);
    scene.add(sceneRoot);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.045).texture;
    scene.environment = environment;

    // A low ambient level keeps the textured faces legible while preserving the
    // deep, cinematic separation visible in the reference.
    const hemi = new THREE.HemisphereLight(0xffead8, 0x161421, 0.06);
    scene.add(hemi);

    const keyTarget = new THREE.Object3D();
    keyTarget.position.set(2.15, 0.35, 0);
    scene.add(keyTarget);

    const key = new THREE.DirectionalLight(0xffd6a8, 22);
    key.position.set(-9, 2.7, 1.2);
    key.target = keyTarget;
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 9;
    key.shadow.camera.bottom = -9;
    key.shadow.bias = -0.00035;
    key.shadow.normalBias = 0.035;
    key.shadow.radius = 2.5;
    scene.add(key);

    // A focused amber source produces the hot streak across the pyramid while
    // its penumbra keeps the falloff natural as the scene orbits.
    const glintTarget = new THREE.Object3D();
    glintTarget.position.set(2.75, -0.3, 0.85);
    scene.add(glintTarget);
    const glint = new THREE.SpotLight(0xff9848, 52, 17, Math.PI * 0.085, 0.82, 1.9);
    glint.position.set(5.8, 3.1, 4.7);
    glint.target = glintTarget;
    glint.castShadow = true;
    glint.shadow.mapSize.set(1024, 1024);
    glint.shadow.bias = -0.00025;
    glint.shadow.normalBias = 0.025;
    scene.add(glint);

    // Cool backlight outlines the orb and separates the shadowed faces without
    // lifting their black level.
    const rim = new THREE.PointLight(0x617cff, 7, 17, 2);
    rim.position.set(5.8, 3.8, -4.4);
    scene.add(rim);

    let disposed = false;
    let frame = 0;
    let progressTarget = 0;
    let progressCurrent = 0;
    let idleAngle = 0;
    let lastElapsed = 0;
    let lastScrollAt = Number.NEGATIVE_INFINITY;
    const pointer = new THREE.Vector2();
    const textures: THREE.Texture[] = [];

    const loader = new THREE.TextureLoader();
    loader.load(
      assetPath('/images/hero-surface-v3.webp'),
      (source) => {
        if (disposed) {
          source.dispose();
          return;
        }
        source.colorSpace = THREE.SRGBColorSpace;
        source.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
        textures.push(source);

        const rightFaceMap = textureRegion(source, renderer, { x: 930, y: 535, width: 620, height: 420 });
        const pyramidMap = textureRegion(source, renderer, { x: 365, y: 535, width: 1683, height: 617 });
        const sphereMap = textureRegion(source, renderer, { x: 1060, y: 70, width: 610, height: 585 });
        const crystalMap = textureRegion(source, renderer, { x: 1580, y: 245, width: 468, height: 907 });
        const backdropMap = textureRegion(source, renderer, { x: 0, y: 0, width: 1050, height: 1152 });
        textures.push(rightFaceMap, pyramidMap, sphereMap, crystalMap, backdropMap);
        scene.background = backdropMap;

        const prismFaceMaterial = new THREE.MeshPhysicalMaterial({
          map: rightFaceMap,
          color: 0xffffff,
          metalness: 0.08,
          roughness: 0.22,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          envMapIntensity: 0.12,
        });
        // Every face keeps the same full-resolution texture; small physical tint
        // shifts reinforce the light direction so the orbit retains dramatic
        // light, cool shadow, and warm reflection zones at every angle.
        const coolShadowMaterial = prismFaceMaterial.clone();
        coolShadowMaterial.color.set(0x4f587b);
        coolShadowMaterial.metalness = 0.16;
        coolShadowMaterial.roughness = 0.3;

        const warmReflectionMaterial = prismFaceMaterial.clone();
        warmReflectionMaterial.color.set(0xffbd8e);
        warmReflectionMaterial.envMapIntensity = 0.22;

        const deepShadowMaterial = prismFaceMaterial.clone();
        deepShadowMaterial.color.set(0x33384d);
        deepShadowMaterial.metalness = 0.2;
        deepShadowMaterial.roughness = 0.34;

        const pearlFaceMaterial = prismFaceMaterial.clone();
        pearlFaceMaterial.color.set(0xe7e3f7);
        const pyramidBase = new THREE.MeshPhysicalMaterial({ color: 0x312f3b, metalness: 0.28, roughness: 0.48 });
        const pyramid = new THREE.Mesh(
          createDramaticPyramidGeometry(),
          [
            prismFaceMaterial,
            coolShadowMaterial,
            warmReflectionMaterial,
            deepShadowMaterial,
            pearlFaceMaterial,
            pyramidBase,
          ],
        );
        pyramid.castShadow = true;
        pyramid.receiveShadow = true;
        pyramid.rotation.y = -0.08;
        sceneRoot.add(pyramid);

        const sphereMaterial = new THREE.MeshPhysicalMaterial({
          map: sphereMap,
          color: 0xfffbf7,
          metalness: 0.04,
          roughness: 0.08,
          transmission: 0.28,
          thickness: 1.15,
          ior: 1.34,
          iridescence: 1,
          iridescenceIOR: 1.3,
          iridescenceThicknessRange: [120, 720],
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          envMapIntensity: 1.75,
        });
        sphereMaterial.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            float orbLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            float orbMaxChannel = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b);
            float orbMinChannel = min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b);
            float orbChroma = orbMaxChannel - orbMinChannel;
            float orbColorMask = smoothstep(0.035, 0.19, orbChroma);
            vec3 orbSaturated = mix(vec3(orbLuma), diffuseColor.rgb, 1.42);
            diffuseColor.rgb = mix(diffuseColor.rgb, orbSaturated * 0.82, orbColorMask);`,
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            float orbWhiteLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            float orbWhiteMax = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b);
            float orbWhiteMin = min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b);
            float orbWhiteChroma = orbWhiteMax - orbWhiteMin;
            float orbWhiteMask = smoothstep(0.42, 0.9, orbWhiteLuma)
              * (1.0 - smoothstep(0.045, 0.15, orbWhiteChroma));
            totalEmissiveRadiance += vec3(0.34, 0.325, 0.31) * orbWhiteMask;`,
          );
        };
        sphereMaterial.customProgramCacheKey = () => 'orb-selective-color-v1';
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.28, 96, 64), sphereMaterial);
        sphere.position.set(0.52, 2.65, -1.18);
        sphere.castShadow = true;
        sceneRoot.add(sphere);

        const crystalMaterial = new THREE.MeshPhysicalMaterial({
          map: crystalMap,
          color: 0xffc5d8,
          metalness: 0.02,
          roughness: 0.13,
          transmission: 0.5,
          thickness: 1.45,
          ior: 1.46,
          iridescence: 0.58,
          iridescenceIOR: 1.32,
          iridescenceThicknessRange: [180, 520],
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.9,
        });
        const crystalDefinitions = [
          { position: [3.15, 0.05, -0.65], scale: [0.95, 3.6, 0.9], rotation: [0.05, -0.28, -0.16] },
          { position: [4.2, -0.65, 0.35], scale: [0.8, 2.7, 0.82], rotation: [-0.03, 0.42, 0.18] },
          { position: [2.55, -0.95, 1.05], scale: [0.58, 2.05, 0.62], rotation: [0.14, 0.2, -0.3] },
          { position: [4.65, -1.15, -1.15], scale: [0.52, 1.75, 0.55], rotation: [-0.18, -0.12, 0.34] },
        ] as const;
        crystalDefinitions.forEach((definition, index) => {
          const geometry = new THREE.CylinderGeometry(0.54, 0.86, 1.8, 6, 1, false);
          const positions = geometry.attributes.position;
          for (let vertex = 0; vertex < positions.count; vertex += 1) {
            if (positions.getY(vertex) > 0.88) {
              positions.setX(vertex, positions.getX(vertex) * 0.1);
              positions.setZ(vertex, positions.getZ(vertex) * 0.1);
            }
          }
          positions.needsUpdate = true;
          geometry.computeVertexNormals();
          const crystal = new THREE.Mesh(geometry, index === 0 ? crystalMaterial : crystalMaterial.clone());
          crystal.position.set(
            definition.position[0],
            definition.position[1],
            definition.position[2],
          );
          crystal.scale.set(
            definition.scale[0],
            definition.scale[1],
            definition.scale[2],
          );
          crystal.rotation.set(
            definition.rotation[0],
            definition.rotation[1],
            definition.rotation[2],
          );
          crystal.castShadow = true;
          crystal.receiveShadow = true;
          sceneRoot.add(crystal);
        });



        const veilGeometry = new THREE.PlaneGeometry(24, 12, 48, 24);
        const veilPositions = veilGeometry.attributes.position;
        for (let vertex = 0; vertex < veilPositions.count; vertex += 1) {
          const x = veilPositions.getX(vertex);
          const y = veilPositions.getY(vertex);
          veilPositions.setZ(vertex, Math.sin(x * 0.32) * 0.48 + Math.cos(y * 0.46) * 0.22);
        }
        veilPositions.needsUpdate = true;
        veilGeometry.computeVertexNormals();
        const backVeil = new THREE.Mesh(
          veilGeometry,
          new THREE.MeshPhysicalMaterial({
            color: 0xf0b8c9,
            transparent: true,
            opacity: 0.075,
            roughness: 0.28,
            transmission: 0.35,
            thickness: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        backVeil.position.set(3.5, 2.2, -8.5);
        backVeil.rotation.y = -0.2;
        scene.add(backVeil);

        const sideVeil = backVeil.clone();
        sideVeil.geometry = veilGeometry.clone();
        sideVeil.material = (backVeil.material as THREE.MeshPhysicalMaterial).clone();
        (sideVeil.material as THREE.MeshPhysicalMaterial).color.set(0xbac2ff);
        (sideVeil.material as THREE.MeshPhysicalMaterial).opacity = 0.055;
        sideVeil.position.set(-7.5, 0.6, 1.5);
        sideVeil.rotation.set(0, Math.PI / 2.35, 0.08);
        scene.add(sideVeil);

        const particleCount = window.innerWidth >= 1180 ? 760 : 420;
        const particlePositions = new Float32Array(particleCount * 3);
        for (let index = 0; index < particleCount; index += 1) {
          const seed = index * 12.9898;
          particlePositions[index * 3] = Math.sin(seed) * 12 + 1.5;
          particlePositions[index * 3 + 1] = ((index * 37) % 113) / 113 * 9 - 3;
          particlePositions[index * 3 + 2] = Math.cos(seed * 0.73) * 12;
        }
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particles = new THREE.Points(
          particleGeometry,
          new THREE.PointsMaterial({
            color: 0xffe7df,
            size: window.innerWidth >= 1180 ? 0.034 : 0.026,
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
            sizeAttenuation: true,
          }),
        );
        scene.add(particles);

        host.dataset.ready = 'true';
        shell.dataset.threeReady = 'true';
        shell.style.setProperty('--hero-three-opacity', '1');
      },
      undefined,
      () => {
        host.dataset.failed = 'true';
      },
    );

    const measureScroll = () => {
      const top = hero.getBoundingClientRect().top + window.scrollY;
      progressTarget = heroScrollProgress({
        scrollY: window.scrollY,
        sectionTop: top,
        sectionHeight: hero.offsetHeight,
        viewportHeight: window.innerHeight,
      });
    };

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      measureScroll();
    };

    const pointerMove = (event: PointerEvent) => {
      pointer.set(
        (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2,
        (0.5 - event.clientY / Math.max(window.innerHeight, 1)) * 2,
      );
    };

    const scroll = () => {
      lastScrollAt = performance.now();
      measureScroll();
    };

    const render = () => {
      frame = requestAnimationFrame(render);
      const elapsed = clock.getElapsedTime();
      const delta = lastElapsed === 0 ? 0 : Math.min(elapsed - lastElapsed, 0.05);
      lastElapsed = elapsed;
      if (performance.now() - lastScrollAt > 700) idleAngle += delta * 0.055;
      progressCurrent += (progressTarget - progressCurrent) * 0.075;
      const orbit = sampleHeroOrbit(progressCurrent, idleAngle);
      const loadFramingLift = 0.73 * (1 - progressCurrent) * (1 - progressCurrent);
      const opacity = heroThreeVisibility(progressCurrent);
      host.style.opacity = opacity.toFixed(4);
      shell.style.setProperty('--hero-three-opacity', opacity.toFixed(4));

      camera.position.set(
        sceneRoot.position.x + 0.64 + Math.sin(orbit.angle) * orbit.radius,
        orbit.elevation + loadFramingLift + pointer.y * 0.11,
        Math.cos(orbit.angle) * orbit.radius,
      );
      target.set(sceneRoot.position.x - 0.64 + pointer.x * 0.09, 0.55 + loadFramingLift + pointer.y * 0.06, 0);
      camera.lookAt(target);
      renderer.render(scene, camera);
    };

    resize();
    measureScroll();
    render();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointerMove, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointerMove);
      shell.removeAttribute('data-three-ready');
      shell.style.removeProperty('--hero-three-opacity');
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="hero-three-world" aria-hidden="true" />;
}
