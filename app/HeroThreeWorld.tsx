'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { assetPath } from './asset-path';
import { heroScrollProgress, heroThreeVisibility, sampleHeroOrbit, sampleHeroPortal } from './hero-three';

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

interface PortalWorld {
  root: THREE.Group;
  ocean: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
  cloudLayer: THREE.Group;
  cloudMaterial: THREE.MeshPhysicalMaterial;
  transitionCloudLayer: THREE.Group;
  transitionCloudMaterial: THREE.MeshPhysicalMaterial;
  fades: Array<{ material: THREE.Material; opacity: number }>;
  skyOpacity: { value: number };
}

function createIslandGeometry(seed: number, radius: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const points = 13;
  for (let index = 0; index < points; index += 1) {
    const angle = index / points * Math.PI * 2;
    const coastline = 1
      + Math.sin(angle * 3 + seed * 1.7) * 0.18
      + Math.cos(angle * 5 - seed * 0.8) * 0.1;
    const x = Math.cos(angle) * radius * coastline;
    const y = Math.sin(angle) * radius * coastline * (0.7 + (seed % 3) * 0.08);
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42 + (seed % 4) * 0.08,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: radius * 0.07,
    bevelThickness: 0.12,
    curveSegments: 2,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createPortalWorld(): PortalWorld {
  const root = new THREE.Group();
  root.visible = false;

  const fades: PortalWorld['fades'] = [];
  const skyOpacity = { value: 0 };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(28, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: { uOpacity: skyOpacity },
      vertexShader: `
        varying float vSkyHeight;
        void main() {
          vSkyHeight = normalize(position).y * 0.5 + 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vSkyHeight;
        void main() {
          vec3 horizon = vec3(0.83, 0.72, 0.64);
          vec3 middle = vec3(0.48, 0.66, 0.79);
          vec3 zenith = vec3(0.19, 0.36, 0.58);
          vec3 skyColor = mix(horizon, middle, smoothstep(0.2, 0.58, vSkyHeight));
          skyColor = mix(skyColor, zenith, smoothstep(0.56, 1.0, vSkyHeight));
          gl_FragColor = vec4(skyColor, uOpacity);
        }
      `,
    }),
  );
  sky.renderOrder = -100;
  root.add(sky);

  const oceanGeometry = new THREE.PlaneGeometry(28, 28, 88, 88);
  const oceanPositions = oceanGeometry.attributes.position;
  for (let index = 0; index < oceanPositions.count; index += 1) {
    const x = oceanPositions.getX(index);
    const y = oceanPositions.getY(index);
    const wave = Math.sin(x * 0.72 + y * 0.18) * 0.055
      + Math.cos(y * 0.9 - x * 0.12) * 0.038
      + Math.sin((x + y) * 1.7) * 0.018;
    oceanPositions.setZ(index, wave);
  }
  oceanPositions.needsUpdate = true;
  oceanGeometry.computeVertexNormals();
  oceanGeometry.rotateX(-Math.PI / 2);
  const oceanMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x176f91,
    metalness: 0.08,
    roughness: 0.2,
    transmission: 0.08,
    thickness: 0.7,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.5,
    transparent: true,
    opacity: 0,
  });
  const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
  ocean.position.y = -1.9;
  ocean.receiveShadow = true;
  root.add(ocean);
  fades.push({ material: oceanMaterial, opacity: 0.96 });

  const seabedMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0b3445,
    roughness: 0.72,
    transparent: true,
    opacity: 0,
  });
  const seabed = new THREE.Mesh(new THREE.CircleGeometry(18, 64), seabedMaterial);
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -2.22;
  root.add(seabed);
  fades.push({ material: seabedMaterial, opacity: 0.94 });

  const islandTop = new THREE.MeshPhysicalMaterial({
    color: 0x476f52,
    roughness: 0.78,
    clearcoat: 0.1,
    transparent: true,
    opacity: 0,
  });
  const islandCliff = new THREE.MeshPhysicalMaterial({
    color: 0x59473b,
    roughness: 0.9,
    transparent: true,
    opacity: 0,
  });
  const beachMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd9b879,
    roughness: 0.86,
    transparent: true,
    opacity: 0,
  });
  const vegetationMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x183f35,
    roughness: 0.88,
    transparent: true,
    opacity: 0,
  });
  fades.push(
    { material: islandTop, opacity: 1 },
    { material: islandCliff, opacity: 1 },
    { material: beachMaterial, opacity: 1 },
    { material: vegetationMaterial, opacity: 0.96 },
  );

  const islandDefinitions = [
    { x: -4.4, z: -2.6, radius: 2.25, seed: 1, rotation: 0.2 },
    { x: 0.2, z: -3.8, radius: 1.55, seed: 2, rotation: -0.45 },
    { x: 3.9, z: -1.1, radius: 2.05, seed: 3, rotation: 0.7 },
    { x: -1.8, z: 1.3, radius: 1.12, seed: 4, rotation: -0.2 },
    { x: 5.8, z: 3.2, radius: 0.9, seed: 5, rotation: 0.35 },
    { x: -6.2, z: 3.8, radius: 1.35, seed: 6, rotation: -0.75 },
    { x: 1.7, z: 4.6, radius: 0.72, seed: 7, rotation: 0.9 },
  ] as const;
  islandDefinitions.forEach((definition) => {
    const beach = new THREE.Mesh(
      createIslandGeometry(definition.seed + 17, definition.radius * 1.1),
      beachMaterial,
    );
    beach.position.set(definition.x, -1.91, definition.z);
    beach.rotation.y = definition.rotation;
    beach.scale.y = 0.28;
    beach.receiveShadow = true;
    root.add(beach);

    const island = new THREE.Mesh(
      createIslandGeometry(definition.seed, definition.radius),
      [islandTop, islandCliff],
    );
    island.position.set(definition.x, -1.82, definition.z);
    island.rotation.y = definition.rotation;
    island.castShadow = true;
    island.receiveShadow = true;
    root.add(island);

    const treeGeometry = new THREE.ConeGeometry(
      Math.max(0.08, definition.radius * 0.055),
      Math.max(0.32, definition.radius * 0.24),
      7,
    );
    const trees = new THREE.InstancedMesh(treeGeometry, vegetationMaterial, 5);
    const treeTransform = new THREE.Object3D();
    for (let treeIndex = 0; treeIndex < 5; treeIndex += 1) {
      const treeAngle = treeIndex * 2.39996 + definition.seed;
      const treeDistance = definition.radius * (0.18 + (treeIndex % 3) * 0.17);
      treeTransform.position.set(
        definition.x + Math.cos(treeAngle) * treeDistance,
        -1.12 + (definition.seed % 3) * 0.035,
        definition.z + Math.sin(treeAngle) * treeDistance * 0.72,
      );
      treeTransform.updateMatrix();
      trees.setMatrixAt(treeIndex, treeTransform.matrix);
    }
    trees.instanceMatrix.needsUpdate = true;
    trees.castShadow = true;
    root.add(trees);
  });

  const cloudLayer = new THREE.Group();
  const cloudGeometry = new THREE.SphereGeometry(0.46, 20, 14);
  const cloudMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfff9f1,
    roughness: 0.82,
    transmission: 0.14,
    thickness: 0.5,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, 45);
  const cloudTransform = new THREE.Object3D();
  let cloudIndex = 0;
  for (let cluster = 0; cluster < 9; cluster += 1) {
    const angle = cluster * 2.39996;
    const distance = 3.3 + (cluster % 4) * 1.55;
    const centerX = Math.cos(angle) * distance;
    const centerZ = Math.sin(angle) * distance;
    for (let puff = 0; puff < 5; puff += 1) {
      cloudTransform.position.set(
        centerX + Math.sin(puff * 2.1 + cluster) * 0.72,
        0.35 + (cluster % 3) * 0.42 + Math.cos(puff * 1.4) * 0.18,
        centerZ + Math.cos(puff * 1.7 + cluster) * 0.56,
      );
      cloudTransform.scale.set(1.18 + puff * 0.11, 0.5 + (puff % 2) * 0.14, 0.86 + (cluster % 2) * 0.16);
      cloudTransform.updateMatrix();
      clouds.setMatrixAt(cloudIndex, cloudTransform.matrix);
      cloudIndex += 1;
    }
  }
  clouds.instanceMatrix.needsUpdate = true;
  cloudLayer.add(clouds);
  root.add(cloudLayer);

  // A short cloud tunnel sits over the orb during the push-in. Rendering these
  // puffs without depth testing lets the cloud shapes emerge from the orb's
  // procedural surface before the sphere dissolves into the aerial world.
  const transitionCloudLayer = new THREE.Group();
  const transitionCloudGeometry = new THREE.SphereGeometry(0.52, 24, 16);
  const transitionCloudMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfffbf5,
    emissive: 0x5a718c,
    emissiveIntensity: 0.16,
    roughness: 0.92,
    transmission: 0.08,
    thickness: 0.38,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const transitionClouds = new THREE.InstancedMesh(
    transitionCloudGeometry,
    transitionCloudMaterial,
    28,
  );
  const transitionTransform = new THREE.Object3D();
  for (let puff = 0; puff < 28; puff += 1) {
    const band = Math.floor(puff / 7);
    const angle = puff * 2.39996 + band * 0.72;
    const radius = 0.48 + (puff % 4) * 0.3;
    transitionTransform.position.set(
      1.72 - band * 0.46 + Math.sin(puff * 1.17) * 0.14,
      Math.sin(angle) * radius * 0.64 + 0.08,
      Math.cos(angle) * radius,
    );
    const puffScale = 0.62 + (puff % 5) * 0.13;
    transitionTransform.scale.set(puffScale * 1.35, puffScale * 0.66, puffScale);
    transitionTransform.updateMatrix();
    transitionClouds.setMatrixAt(puff, transitionTransform.matrix);
  }
  transitionClouds.instanceMatrix.needsUpdate = true;
  transitionClouds.renderOrder = 40;
  transitionCloudLayer.add(transitionClouds);
  root.add(transitionCloudLayer);

  const worldSun = new THREE.DirectionalLight(0xffd6a5, 4.8);
  worldSun.position.set(-7, 10, 5);
  worldSun.castShadow = true;
  worldSun.shadow.mapSize.set(1024, 1024);
  worldSun.shadow.camera.left = -12;
  worldSun.shadow.camera.right = 12;
  worldSun.shadow.camera.top = 12;
  worldSun.shadow.camera.bottom = -12;
  root.add(worldSun);

  return {
    root,
    ocean,
    cloudLayer,
    cloudMaterial,
    transitionCloudLayer,
    transitionCloudMaterial,
    fades,
    skyOpacity,
  };
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const updatePixelRatio = () => {
      const pixelRatioCap = window.innerWidth >= 1180 ? 1.5 : 1.25;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    };
    updatePixelRatio();
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
    let lastShadowProgress = Number.NEGATIVE_INFINITY;
    let lastRenderedAt = 0;
    let heroInView = true;
    let needsImmediateFrame = true;
    const pointer = new THREE.Vector2();
    const textures: THREE.Texture[] = [];
    const sculptureObjects: THREE.Object3D[] = [];
    const atmosphereObjects: THREE.Object3D[] = [];
    const orbTransition = {
      cloudMorph: { value: 0 },
      time: { value: 0 },
    };
    let sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial> | null = null;
    let portalWorld: PortalWorld | null = null;

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
        sculptureObjects.push(pyramid);

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
          shader.uniforms.uCloudMorph = orbTransition.cloudMorph;
          shader.uniforms.uOrbTime = orbTransition.time;
          shader.fragmentShader = shader.fragmentShader.replace(
            'void main() {',
            `uniform float uCloudMorph;
            uniform float uOrbTime;
            float orbHash(vec2 point) {
              return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
            }
            float orbNoise(vec2 point) {
              vec2 cell = floor(point);
              vec2 local = fract(point);
              local = local * local * (3.0 - 2.0 * local);
              float a = orbHash(cell);
              float b = orbHash(cell + vec2(1.0, 0.0));
              float c = orbHash(cell + vec2(0.0, 1.0));
              float d = orbHash(cell + vec2(1.0, 1.0));
              return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
            }
            float orbFbm(vec2 point) {
              float value = 0.0;
              float amplitude = 0.55;
              for (int octave = 0; octave < 5; octave++) {
                value += orbNoise(point) * amplitude;
                point = point * 2.03 + vec2(4.1, 7.7);
                amplitude *= 0.48;
              }
              return value;
            }
            void main() {`,
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            float orbCloudBody = 0.0;
            if (uCloudMorph > 0.001) {
              vec2 orbCloudUv = vMapUv * vec2(18.0, 10.0) + vec2(uOrbTime * 0.018, 0.0);
              float orbCloudField = orbFbm(orbCloudUv);
              orbCloudBody = smoothstep(0.43, 0.62, orbCloudField);
              float orbCloudDetail = smoothstep(0.5, 0.72, orbFbm(orbCloudUv * 1.85 + 3.2));
              vec3 orbCloudShadow = vec3(0.16, 0.27, 0.42);
              vec3 orbCloudLight = vec3(1.0, 0.985, 0.95);
              vec3 orbCloudColor = mix(orbCloudShadow, orbCloudLight, orbCloudBody);
              orbCloudColor += orbCloudDetail * vec3(0.11, 0.09, 0.15);
              diffuseColor.rgb = mix(diffuseColor.rgb, orbCloudColor, uCloudMorph);
            }
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
            totalEmissiveRadiance += vec3(0.34, 0.325, 0.31) * orbWhiteMask;
            vec3 orbCloudEmission = mix(
              vec3(0.025, 0.065, 0.13),
              vec3(0.92, 0.95, 0.98),
              orbCloudBody
            );
            totalEmissiveRadiance += orbCloudEmission * uCloudMorph * 0.82;`,
          );
        };
        sphereMaterial.customProgramCacheKey = () => 'orb-cloud-portal-v2';
        sphereMaterial.transparent = true;
        sphere = new THREE.Mesh(new THREE.SphereGeometry(1.28, 96, 64), sphereMaterial);
        sphere.position.set(0.52, 2.65, -1.18);
        sphere.castShadow = true;
        sceneRoot.add(sphere);

        portalWorld = createPortalWorld();
        portalWorld.root.position.set(
          sceneRoot.position.x + sphere.position.x,
          sceneRoot.position.y + sphere.position.y,
          sphere.position.z,
        );
        scene.add(portalWorld.root);

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
          sculptureObjects.push(crystal);
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
        atmosphereObjects.push(backVeil);

        const sideVeil = backVeil.clone();
        sideVeil.geometry = veilGeometry.clone();
        sideVeil.material = (backVeil.material as THREE.MeshPhysicalMaterial).clone();
        (sideVeil.material as THREE.MeshPhysicalMaterial).color.set(0xbac2ff);
        (sideVeil.material as THREE.MeshPhysicalMaterial).opacity = 0.055;
        sideVeil.position.set(-7.5, 0.6, 1.5);
        sideVeil.rotation.set(0, Math.PI / 2.35, 0.08);
        scene.add(sideVeil);
        atmosphereObjects.push(sideVeil);

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
        atmosphereObjects.push(particles);

        host.dataset.ready = 'true';
        shell.dataset.threeReady = 'true';
        shell.style.setProperty('--hero-three-opacity', '1');
        lastShadowProgress = Number.NEGATIVE_INFINITY;
        renderer.shadowMap.needsUpdate = true;
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
      updatePixelRatio();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      measureScroll();
      needsImmediateFrame = true;
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

    const orbitPosition = new THREE.Vector3();
    const orbitTarget = new THREE.Vector3();
    const orbCenter = new THREE.Vector3();
    const orbApproach = new THREE.Vector3();
    const worldCameraPosition = new THREE.Vector3();
    const worldCameraTarget = new THREE.Vector3();
    const openingFog = new THREE.Color(0xd9cec4);
    const worldFog = new THREE.Color(0x8ca7b7);

    let renderFrame: FrameRequestCallback;
    const scheduleRender = () => {
      if (disposed || document.hidden || !heroInView || frame !== 0) return;
      frame = requestAnimationFrame(renderFrame);
    };
    const stopRendering = () => {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    renderFrame = (rafTime) => {
      frame = 0;
      if (disposed || document.hidden || !heroInView) return;
      const isInteracting = performance.now() - lastScrollAt < 900
        || Math.abs(progressTarget - progressCurrent) > 0.0005;
      const minimumFrameTime = isInteracting ? 1000 / 60 : 1000 / 30;
      if (!needsImmediateFrame && rafTime - lastRenderedAt < minimumFrameTime - 1) {
        scheduleRender();
        return;
      }
      needsImmediateFrame = false;
      lastRenderedAt = rafTime;
      const elapsed = clock.getElapsedTime();
      const delta = lastElapsed === 0 ? 0 : Math.min(elapsed - lastElapsed, 0.05);
      lastElapsed = elapsed;
      if (performance.now() - lastScrollAt > 700) idleAngle += delta * 0.055;
      progressCurrent += (progressTarget - progressCurrent) * 0.075;
      if (Math.abs(progressCurrent - lastShadowProgress) > 0.0015) {
        renderer.shadowMap.needsUpdate = true;
        lastShadowProgress = progressCurrent;
      }
      const portal = sampleHeroPortal(progressCurrent);
      const orbit = sampleHeroOrbit(portal.orbitProgress, idleAngle);
      const loadFramingLift = 0.73 * (1 - portal.orbitProgress) * (1 - portal.orbitProgress);
      const opacity = heroThreeVisibility(progressCurrent);
      host.style.opacity = opacity.toFixed(4);
      shell.style.setProperty('--hero-three-opacity', opacity.toFixed(4));
      shell.dataset.heroPortal = portal.worldReveal > 0.94
        ? 'world'
        : portal.cloudMorph > 0.08
          ? 'clouds'
          : portal.zoom > 0.04
            ? 'zoom'
            : 'orbit';

      orbitPosition.set(
        sceneRoot.position.x + 0.64 + Math.sin(orbit.angle) * orbit.radius,
        orbit.elevation + loadFramingLift + pointer.y * 0.11,
        Math.cos(orbit.angle) * orbit.radius,
      );
      orbitTarget.set(
        sceneRoot.position.x - 0.64 + pointer.x * 0.09,
        0.55 + loadFramingLift + pointer.y * 0.06,
        0,
      );
      orbCenter.set(
        sceneRoot.position.x + 0.52,
        sceneRoot.position.y + 2.65,
        -1.18,
      );
      orbApproach.set(orbCenter.x + 1.82, orbCenter.y + 0.08, orbCenter.z + 0.14);
      camera.position.copy(orbitPosition).lerp(orbApproach, portal.zoom);
      target.copy(orbitTarget).lerp(orbCenter, portal.zoom);

      orbTransition.cloudMorph.value = portal.cloudMorph;
      orbTransition.time.value = elapsed;
      if (sphere) {
        const sphereFade = Math.min(1, Math.max(0, (portal.worldReveal - 0.22) / 0.78));
        const sphereOpacity = Math.pow(1 - sphereFade, 1.18);
        sphere.visible = sphereOpacity > 0.008;
        sphere.material.opacity = sphereOpacity;
        sphere.material.depthWrite = sphereOpacity > 0.55;
        sphere.material.transmission = 0.28 * (1 - portal.cloudMorph) + 0.025 * portal.cloudMorph;
        sphere.material.roughness = 0.08 + portal.cloudMorph * 0.66;
        sphere.material.envMapIntensity = 1.75 - portal.cloudMorph * 0.92;
        sphere.material.iridescence = 1 - portal.cloudMorph * 0.96;
        sphere.material.clearcoat = 1 - portal.cloudMorph * 0.72;
        const sphereScale = 1 + portal.zoom * 0.1 + portal.cloudMorph * 0.07;
        sphere.scale.setScalar(sphereScale);
        sphere.rotation.y = elapsed * 0.025 + portal.cloudMorph * 0.38;
      }

      const sculptureVisible = portal.worldReveal < 0.32;
      sculptureObjects.forEach((object) => { object.visible = sculptureVisible; });
      const atmosphereVisible = portal.worldReveal < 0.18;
      atmosphereObjects.forEach((object) => { object.visible = atmosphereVisible; });

      if (portalWorld) {
        portalWorld.root.visible = portal.cloudMorph > 0.04;
        const worldScale = 0.62 + portal.worldReveal * 0.38;
        portalWorld.root.scale.setScalar(worldScale);
        portalWorld.root.rotation.y = -0.16 + portal.worldSettle * 0.3;
        portalWorld.fades.forEach(({ material, opacity: finalOpacity }) => {
          material.opacity = finalOpacity * portal.worldReveal;
        });
        portalWorld.cloudMaterial.opacity = 0.66 * portal.cloudMorph;
        const transitionCloudStrength = portal.cloudMorph * (1 - portal.worldReveal);
        portalWorld.transitionCloudMaterial.opacity = 0.76 * Math.pow(transitionCloudStrength, 0.72);
        portalWorld.skyOpacity.value = Math.min(1, Math.max(0, (portal.worldReveal - 0.16) / 0.84));
        portalWorld.ocean.position.y = -1.9 + Math.sin(elapsed * 0.42) * 0.022;
        portalWorld.cloudLayer.position.x = Math.sin(elapsed * 0.08) * 0.42;
        portalWorld.cloudLayer.position.z = Math.cos(elapsed * 0.065) * 0.3;
        portalWorld.transitionCloudLayer.rotation.x = elapsed * 0.012;
        portalWorld.transitionCloudLayer.rotation.y = elapsed * -0.018;

        worldCameraPosition.set(orbCenter.x + 5.8, orbCenter.y + 8.1, orbCenter.z + 10.6);
        worldCameraTarget.set(orbCenter.x, orbCenter.y - 1.35, orbCenter.z);
        camera.position.lerp(worldCameraPosition, portal.worldSettle);
        target.lerp(worldCameraTarget, portal.worldSettle);
      }

      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerpColors(openingFog, worldFog, portal.worldReveal);
        scene.fog.density = 0.026 - portal.worldReveal * 0.012;
      }
      camera.lookAt(target);
      renderer.render(scene, camera);
      scheduleRender();
    };

    const visibilityChange = () => {
      if (document.hidden) {
        stopRendering();
        return;
      }
      lastElapsed = clock.getElapsedTime();
      needsImmediateFrame = true;
      scheduleRender();
    };
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroInView = entry?.isIntersecting ?? true;
      if (!heroInView) {
        stopRendering();
        return;
      }
      lastElapsed = clock.getElapsedTime();
      needsImmediateFrame = true;
      scheduleRender();
    });

    resize();
    measureScroll();
    heroObserver.observe(hero);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointerMove, { passive: true });
    document.addEventListener('visibilitychange', visibilityChange);
    scheduleRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('visibilitychange', visibilityChange);
      heroObserver.disconnect();
      shell.removeAttribute('data-three-ready');
      shell.removeAttribute('data-hero-portal');
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
