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
  const frontLeft: [number, number, number] = [-4.25, -2.03, 1.42];
  const frontFacet: [number, number, number] = [0.55, -1.93, 1.78];
  const frontRight: [number, number, number] = [3.85, -2.04, 1.24];
  const rearRight: [number, number, number] = [1.78, -2.12, -3.12];
  const rearLeft: [number, number, number] = [-1.95, -2.05, -2.14];

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
  for (let face = 0; face < 5; face += 1) geometry.addGroup(face * 3, 3, face);
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

function skyBackgroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create sky background');

  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#79b6e5');
  sky.addColorStop(0.42, '#b8d9ed');
  sky.addColorStop(0.69, '#f3ded0');
  sky.addColorStop(1, '#d6e5ee');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sun = context.createRadialGradient(1540, 240, 12, 1540, 240, 420);
  sun.addColorStop(0, 'rgba(255, 247, 211, 0.92)');
  sun.addColorStop(0.16, 'rgba(255, 224, 178, 0.52)');
  sun.addColorStop(1, 'rgba(255, 222, 190, 0)');
  context.fillStyle = sun;
  context.fillRect(1050, 0, 998, 720);

  context.filter = 'blur(26px)';
  const cloudBands = [
    [160, 390, 470, 92], [610, 310, 340, 72], [1015, 430, 520, 105],
    [1510, 340, 390, 78], [1880, 510, 420, 100], [470, 580, 610, 82],
  ] as const;
  cloudBands.forEach(([x, y, width, height], index) => {
    const cloud = context.createRadialGradient(x, y, 8, x, y, width * 0.52);
    cloud.addColorStop(0, `rgba(255, 255, 255, ${index % 2 === 0 ? 0.46 : 0.34})`);
    cloud.addColorStop(0.48, 'rgba(255, 255, 255, 0.22)');
    cloud.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = cloud;
    context.beginPath();
    context.ellipse(x, y, width, height, -0.04 + index * 0.014, 0, Math.PI * 2);
    context.fill();
  });
  context.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const facetPalettes = [
  { wash: '#7cc7ff', accent: '#ffe0a3', line: '#174c8f' },
  { wash: '#b39cff', accent: '#ffbfd7', line: '#34276d' },
  { wash: '#ffc184', accent: '#fff2c4', line: '#80412f' },
  { wash: '#80e0df', accent: '#d8f8ff', line: '#125968' },
  { wash: '#9e8cff', accent: '#f5c8ff', line: '#3f2b78' },
] as const;

function facetGraphicTexture(
  source: THREE.Texture,
  renderer: THREE.WebGLRenderer,
  face: number,
): THREE.CanvasTexture {
  const size = 1536;
  const sourceBand = 617;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create pyramid artwork');

  const sampleX = 365 + Math.round((1683 - sourceBand) * (face / 4));
  context.drawImage(
    source.image as CanvasImageSource,
    sampleX,
    535,
    sourceBand,
    sourceBand,
    0,
    0,
    size,
    size,
  );

  const palette = facetPalettes[face];
  const atmosphere = context.createLinearGradient(0, 0, size, size);
  atmosphere.addColorStop(0, palette.wash);
  atmosphere.addColorStop(0.48, 'rgba(255, 255, 255, 0.12)');
  atmosphere.addColorStop(1, palette.accent);
  context.globalCompositeOperation = 'soft-light';
  context.globalAlpha = 0.9;
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, size, size);

  const depth = context.createLinearGradient(0, 0, size, size * 0.9);
  depth.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
  depth.addColorStop(0.55, palette.line);
  depth.addColorStop(1, 'rgba(5, 12, 28, 0.88)');
  context.globalCompositeOperation = 'multiply';
  context.globalAlpha = face === 0 ? 0.34 : 0.48;
  context.fillStyle = depth;
  context.fillRect(0, 0, size, size);

  context.globalCompositeOperation = 'screen';
  context.globalAlpha = 0.88;
  context.strokeStyle = palette.accent;
  context.lineWidth = 12;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (face === 0) {
    for (let ray = 0; ray < 14; ray += 1) {
      context.beginPath();
      context.moveTo(size * 0.08, size * 0.93);
      context.lineTo(size * (0.18 + ray * 0.075), size * (0.02 + (ray % 3) * 0.035));
      context.stroke();
    }
  } else if (face === 1) {
    for (let ring = 0; ring < 7; ring += 1) {
      context.beginPath();
      context.ellipse(
        size * 0.52,
        size * 0.82,
        size * (0.16 + ring * 0.085),
        size * (0.1 + ring * 0.065),
        -0.3,
        Math.PI,
        Math.PI * 2,
      );
      context.stroke();
    }
  } else if (face === 2) {
    for (let tier = 0; tier < 8; tier += 1) {
      const inset = size * (0.08 + tier * 0.055);
      const y = size * (0.1 + tier * 0.1);
      context.beginPath();
      context.moveTo(inset, y);
      context.lineTo(size * 0.5, y + size * 0.12);
      context.lineTo(size - inset, y);
      context.stroke();
    }
  } else if (face === 3) {
    for (let wave = 0; wave < 8; wave += 1) {
      const y = size * (0.12 + wave * 0.105);
      context.beginPath();
      context.moveTo(-size * 0.05, y);
      context.bezierCurveTo(
        size * 0.25,
        y - size * 0.16,
        size * 0.7,
        y + size * 0.18,
        size * 1.05,
        y - size * 0.04,
      );
      context.stroke();
    }
  } else {
    const nodes = [
      [0.12, 0.72], [0.27, 0.32], [0.43, 0.57], [0.58, 0.16],
      [0.72, 0.46], [0.87, 0.25], [0.82, 0.78], [0.51, 0.87],
    ];
    context.beginPath();
    nodes.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(size * x, size * y);
      else context.lineTo(size * x, size * y);
    });
    context.stroke();
    context.fillStyle = '#ffffff';
    nodes.forEach(([x, y], index) => {
      context.beginPath();
      context.arc(size * x, size * y, 9 + (index % 3) * 5, 0, Math.PI * 2);
      context.fill();
    });
  }

  context.globalCompositeOperation = 'overlay';
  context.globalAlpha = 0.7;
  context.strokeStyle = palette.line;
  context.lineWidth = 5;
  for (let detail = 0; detail < 9; detail += 1) {
    const offset = 48 + detail * 72;
    context.beginPath();
    context.moveTo(offset, size);
    context.lineTo(size, offset * 0.72);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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
    renderer.toneMappingExposure = 0.72;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth >= 1180 ? 2 : 1.35));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.setAttribute('role', 'presentation');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyBackground = skyBackgroundTexture();
    scene.background = skyBackground;
    scene.fog = new THREE.FogExp2(0xa8cce5, 0.012);
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

    const hemi = new THREE.HemisphereLight(0xe7f5ff, 0x424b61, 1.8);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffe3bd, 4.35);
    key.position.set(-5, 9, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 28;
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 9;
    key.shadow.camera.bottom = -9;
    scene.add(key);
    const rim = new THREE.PointLight(0x7a83ff, 14, 16, 1.8);
    rim.position.set(5.5, 3.5, -3.5);
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

        const pyramidFaceMaps = Array.from({ length: 5 }, (_, face) => facetGraphicTexture(source, renderer, face));
        const sphereMap = textureRegion(source, renderer, { x: 1060, y: 70, width: 610, height: 585 });
        const crystalMap = textureRegion(source, renderer, { x: 1580, y: 245, width: 468, height: 907 });
        textures.push(...pyramidFaceMaps, sphereMap, crystalMap);

        const faceEmissives = [0x17466f, 0x4b3470, 0x713d34, 0x145464, 0x44316f];
        const pyramidMaterials = pyramidFaceMaps.map((map, face) => new THREE.MeshPhysicalMaterial({
          map,
          color: 0xffffff,
          metalness: 0.18,
          roughness: 0.28,
          clearcoat: 0.82,
          clearcoatRoughness: 0.2,
          envMapIntensity: 1.48,
          emissive: faceEmissives[face],
          emissiveIntensity: 0.075,
        }));
        const pyramidBase = new THREE.MeshPhysicalMaterial({ color: 0x312f3b, metalness: 0.28, roughness: 0.48 });
        const pyramid = new THREE.Mesh(
          createDramaticPyramidGeometry(),
          [...pyramidMaterials, pyramidBase],
        );
        pyramid.castShadow = true;
        pyramid.receiveShadow = true;
        pyramid.rotation.y = -0.08;
        sceneRoot.add(pyramid);

        const sphereMaterial = new THREE.MeshPhysicalMaterial({
          map: sphereMap,
          color: 0xfff7f1,
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
          envMapIntensity: 2.1,
        });
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.28, 96, 64), sphereMaterial);
        sphere.position.set(-0.52, 2.05, 1.18);
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

        const floorMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xc9d8e4,
          roughness: 0.64,
          metalness: 0.01,
          clearcoat: 0.16,
          clearcoatRoughness: 0.5,
          envMapIntensity: 0.72,
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.08;
        floor.receiveShadow = true;
        scene.add(floor);

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
      const opacity = heroThreeVisibility(progressCurrent);
      host.style.opacity = opacity.toFixed(4);
      shell.style.setProperty('--hero-three-opacity', opacity.toFixed(4));

      camera.position.set(
        sceneRoot.position.x + Math.sin(orbit.angle) * orbit.radius,
        orbit.elevation + pointer.y * 0.11,
        Math.cos(orbit.angle) * orbit.radius,
      );
      target.set(sceneRoot.position.x - 1.28 + pointer.x * 0.09, 0.55 + pointer.y * 0.06, 0);
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
      skyBackground.dispose();
      environment.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="hero-three-world" aria-hidden="true" />;
}
