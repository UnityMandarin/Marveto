'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { assetPath } from './asset-path';
import {
  advanceHeroCinematicTime,
  heroCinematicDuration,
  type HeroCinematicDirection,
  heroScrollProgress,
  heroThreeVisibility,
  sampleHeroCinematic,
  sampleHeroOrbit,
  sampleHeroPortal,
} from './hero-three';

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
  ocean: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  oceanTime: { value: number };
  oceanOpacity: { value: number };
  cloudLayer: THREE.Group;
  cloudMaterial: THREE.MeshPhysicalMaterial;
  transitionCloudLayer: THREE.Group;
  transitionCloudMaterial: THREE.MeshPhysicalMaterial;
  fades: Array<{ material: THREE.Material; opacity: number }>;
  skyOpacity: { value: number };
  whirlpool: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  whirlpoolStrength: { value: number };
  whirlpoolTime: { value: number };
  axiomRoot: THREE.Group;
  axiomFades: Array<{ material: THREE.Material; opacity: number }>;
  axiomDomeOpacity: { value: number };
  axiomTime: { value: number };
  axiomPortalOpacity: { value: number };
  axiomCubeField: THREE.Group;
  axiomParticles: THREE.Points;
  axiomPulseLight: THREE.PointLight;
  worldSun: THREE.DirectionalLight;
  ownedTextures: THREE.Texture[];
}

function createTerrainTexture(baseHex: number, accentHex: number): THREE.DataTexture {
  const size = 384;
  const data = new Uint8Array(size * size * 4);
  const base = new THREE.Color(baseHex);
  const accent = new THREE.Color(accentHex);
  const color = new THREE.Color();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const ridge = Math.sin(x * 0.041 + Math.sin(y * 0.019) * 2.8)
        + Math.sin(y * 0.057 - x * 0.013)
        + Math.sin((x + y) * 0.017);
      const detail = Math.sin(x * 0.23 + y * 0.11)
        + Math.cos(y * 0.31 - x * 0.17)
        + Math.sin((x - y) * 0.47) * 0.5;
      const grain = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const blend = Math.min(1, Math.max(0,
        0.43 + ridge * 0.12 + detail * 0.035 + (grain - Math.floor(grain)) * 0.12,
      ));
      color.lerpColors(base, accent, blend);
      const offset = (y * size + x) * 4;
      data[offset] = Math.round(color.r * 255);
      data[offset + 1] = Math.round(color.g * 255);
      data[offset + 2] = Math.round(color.b * 255);
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.55, 1.55);
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createIslandGeometry(seed: number, radius: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const points = 53;
  for (let index = 0; index < points; index += 1) {
    const angle = index / points * Math.PI * 2;
    const coastline = 1
      + Math.sin(angle * 3 + seed * 1.7) * 0.18
      + Math.cos(angle * 5 - seed * 0.8) * 0.1
      + Math.sin(angle * 9 + seed * 2.3) * 0.035;
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
    bevelSegments: 4,
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
  const ownedTextures: THREE.Texture[] = [
    createTerrainTexture(0x365b42, 0x809b62),
    createTerrainTexture(0x2b2830, 0x7b5b48),
    createTerrainTexture(0xc89f5e, 0xf2d899),
  ];
  const whirlpoolPhoto = new THREE.TextureLoader().load(assetPath('/images/whirlpool-reference.jpg'));
  whirlpoolPhoto.colorSpace = THREE.SRGBColorSpace;
  whirlpoolPhoto.wrapS = THREE.ClampToEdgeWrapping;
  whirlpoolPhoto.wrapT = THREE.ClampToEdgeWrapping;
  whirlpoolPhoto.minFilter = THREE.LinearMipmapLinearFilter;
  whirlpoolPhoto.magFilter = THREE.LinearFilter;
  whirlpoolPhoto.anisotropy = 4;
  ownedTextures.push(whirlpoolPhoto);
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
  const oceanTime = { value: 0 };
  const oceanOpacity = { value: 0 };
  const oceanMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTime: oceanTime,
      uOpacity: oceanOpacity,
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying vec3 vSurfaceNormal;
      varying float vWave;
      void main() {
        vec3 transformed = position;
        float longWave = sin(transformed.x * 0.68 + uTime * 0.48)
          + cos(transformed.z * 0.81 - uTime * 0.39);
        float crossWave = sin((transformed.x + transformed.z) * 1.73 - uTime * 0.72)
          + cos((transformed.x - transformed.z) * 2.21 + uTime * 0.57);
        float ripple = sin(transformed.x * 4.1 + transformed.z * 2.8 + uTime * 1.15);
        float wave = longWave * 0.055 + crossWave * 0.022 + ripple * 0.006;
        transformed.y += wave;
        float slopeX = cos(transformed.x * 0.68 + uTime * 0.48) * 0.037
          + cos((transformed.x + transformed.z) * 1.73 - uTime * 0.72) * 0.038;
        float slopeZ = -sin(transformed.z * 0.81 - uTime * 0.39) * 0.045
          + cos((transformed.x + transformed.z) * 1.73 - uTime * 0.72) * 0.038;
        vSurfaceNormal = normalize(normalMatrix * vec3(-slopeX, 1.0, -slopeZ));
        vec4 world = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = world.xyz;
        vWave = wave;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying vec3 vSurfaceNormal;
      varying float vWave;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDirection, normalize(vSurfaceNormal)), 0.0), 3.2);
        float movingDetail = sin(vWorldPosition.x * 2.8 + vWorldPosition.z * 3.7 - uTime * 0.8)
          * sin(vWorldPosition.z * 5.2 - uTime * 0.55);
        float sunTrack = pow(max(dot(normalize(vSurfaceNormal), normalize(vec3(-0.28, 0.9, 0.34))), 0.0), 38.0);
        vec3 deepWater = vec3(0.008, 0.16, 0.21);
        vec3 reflectedSky = vec3(0.24, 0.58, 0.68);
        vec3 color = mix(deepWater, reflectedSky, 0.2 + fresnel * 0.72);
        color += vec3(0.04, 0.12, 0.13) * movingDetail * 0.18;
        color += vec3(0.82, 0.88, 0.82) * sunTrack * (0.18 + fresnel * 0.82);
        color += vec3(0.02, 0.07, 0.08) * vWave;
        gl_FragColor = vec4(color, uOpacity);
      }
    `,
  });
  const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
  ocean.position.y = -1.9;
  ocean.receiveShadow = true;
  root.add(ocean);

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
    color: 0xffffff,
    map: ownedTextures[0],
    bumpMap: ownedTextures[0],
    bumpScale: 0.11,
    roughness: 0.78,
    clearcoat: 0.1,
    transparent: true,
    opacity: 0,
  });
  const islandCliff = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: ownedTextures[1],
    bumpMap: ownedTextures[1],
    bumpScale: 0.2,
    roughness: 0.9,
    transparent: true,
    opacity: 0,
  });
  const beachMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: ownedTextures[2],
    bumpMap: ownedTextures[2],
    bumpScale: 0.065,
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
    const treeCount = 11;
    const trees = new THREE.InstancedMesh(treeGeometry, vegetationMaterial, treeCount);
    const treeTransform = new THREE.Object3D();
    for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
      const treeAngle = treeIndex * 2.39996 + definition.seed;
      const treeDistance = definition.radius * (0.18 + (treeIndex % 3) * 0.17);
      treeTransform.position.set(
        definition.x + Math.cos(treeAngle) * treeDistance,
        -1.12 + (definition.seed % 3) * 0.035,
        definition.z + Math.sin(treeAngle) * treeDistance * 0.72,
      );
      const treeScale = 0.72 + ((treeIndex * 7 + definition.seed) % 5) * 0.11;
      treeTransform.scale.set(treeScale, 0.82 + treeScale * 0.25, treeScale);
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
    color: 0xf4f7ff,
    emissive: 0x294d75,
    emissiveIntensity: 0.28,
    roughness: 0.92,
    transmission: 0.02,
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

  const whirlpoolStrength = { value: 0 };
  const whirlpoolTime = { value: 0 };
  const whirlpoolGeometry = new THREE.PlaneGeometry(11, 11, 96, 96);
  whirlpoolGeometry.rotateX(-Math.PI / 2);
  const whirlpoolMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uStrength: whirlpoolStrength,
      uTime: whirlpoolTime,
      uPhoto: { value: whirlpoolPhoto },
    },
    vertexShader: `
      uniform float uStrength;
      uniform float uTime;
      varying float vRadius;
      varying float vAngle;
      varying float vDepth;
      varying vec2 vUv;
      void main() {
        vec3 transformed = position;
        float radius = length(transformed.xz);
        float angle = atan(transformed.z, transformed.x);
        float pull = exp(-radius * 0.56) * uStrength;
        float spin = pull * (2.2 + uStrength * 3.4);
        float cosine = cos(spin);
        float sine = sin(spin);
        transformed.xz = mat2(cosine, -sine, sine, cosine) * transformed.xz;
        transformed.y -= pull * 3.05;
        transformed.y += sin(radius * 8.5 - uTime * 2.2 + angle * 3.0) * 0.055 * uStrength;
        vRadius = radius;
        vAngle = angle + spin;
        vDepth = pull;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uStrength;
      uniform float uTime;
      uniform sampler2D uPhoto;
      varying float vRadius;
      varying float vAngle;
      varying float vDepth;
      varying vec2 vUv;
      vec2 rotateUv(vec2 value, float angle) {
        float cosine = cos(angle);
        float sine = sin(angle);
        return mat2(cosine, -sine, sine, cosine) * value;
      }
      void main() {
        float disk = 1.0 - smoothstep(4.5, 5.45, vRadius);
        float core = 1.0 - smoothstep(0.18, 1.25, vRadius);
        vec2 centered = vUv - 0.5;
        float photoRotation = -uTime * 0.035 - vDepth * 0.46;
        vec2 photoUv = rotateUv(centered, photoRotation);
        // Center-crop the supplied 808x576 photograph so its captured UI edge
        // never enters the circular vortex.
        photoUv = photoUv * vec2(0.713, 1.0) + 0.5;
        vec3 photograph = texture2D(uPhoto, clamp(photoUv, 0.002, 0.998)).rgb;
        float photographicFoam = smoothstep(0.58, 0.94,
          dot(photograph, vec3(0.299, 0.587, 0.114)));

        float spiralA = pow(0.5 + 0.5 * sin(vRadius * 9.0 - uTime * 1.7 + vAngle * 5.0), 8.0);
        float spiralB = pow(0.5 + 0.5 * sin(vRadius * 15.0 - uTime * 2.25 + vAngle * 9.0), 11.0);
        float spiralC = pow(0.5 + 0.5 * sin(vRadius * 23.0 - uTime * 2.8 + vAngle * 14.0), 15.0);
        float spiralD = pow(0.5 + 0.5 * sin(vRadius * 34.0 - uTime * 3.35 + vAngle * 21.0), 20.0);
        float brokenFoam = 0.66 + 0.34 * sin(vAngle * 17.0 + vRadius * 6.5 - uTime * 1.15);
        float foam = clamp(
          (spiralA * 0.42 + spiralB * 0.28 + spiralC * 0.2 + spiralD * 0.1) * brokenFoam
            + photographicFoam * 0.52 + vDepth * 0.09,
          0.0,
          1.0
        );
        vec3 deep = vec3(0.002, 0.035, 0.05);
        vec3 photographedWater = mix(photograph, vec3(0.0, 0.24, 0.29), 0.15);
        vec3 color = mix(photographedWater, deep, core * 0.94);
        color = mix(color, vec3(0.82, 0.94, 0.92), foam * 0.58);
        color *= 0.82 + smoothstep(0.1, 4.8, vRadius) * 0.24;
        float alpha = disk * uStrength * (0.68 + foam * 0.22 + core * 0.1);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const whirlpool = new THREE.Mesh(whirlpoolGeometry, whirlpoolMaterial);
  whirlpool.position.set(0.25, -1.69, 0.3);
  whirlpool.visible = false;
  whirlpool.renderOrder = 15;
  root.add(whirlpool);

  const axiomRoot = new THREE.Group();
  axiomRoot.visible = false;
  const axiomFades: PortalWorld['axiomFades'] = [];
  const axiomDomeOpacity = { value: 0 };
  const axiomTime = { value: 0 };
  const axiomPortalOpacity = { value: 0 };
  const underwaterDome = new THREE.Mesh(
    new THREE.SphereGeometry(26, 48, 28),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uOpacity: axiomDomeOpacity,
        uTime: axiomTime,
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uOpacity;
        uniform float uTime;
        varying vec3 vPosition;
        void main() {
          float depth = clamp(vPosition.y * 0.5 + 0.5, 0.0, 1.0);
          float causticA = sin(vPosition.x * 24.0 + uTime * 0.7 + sin(vPosition.z * 19.0));
          float causticB = sin(vPosition.z * 29.0 - uTime * 0.54 + sin(vPosition.x * 17.0));
          float caustic = pow(max(0.0, causticA * causticB), 3.0);
          vec3 abyss = vec3(0.004, 0.018, 0.06);
          vec3 water = vec3(0.015, 0.15, 0.3);
          vec3 color = mix(abyss, water, depth);
          color += vec3(0.02, 0.18, 0.28) * caustic * (0.3 + depth);
          gl_FragColor = vec4(color, uOpacity);
        }
      `,
    }),
  );
  underwaterDome.renderOrder = -90;
  axiomRoot.add(underwaterDome);

  const axiomFloorMaterial = new THREE.MeshBasicMaterial({
    color: 0x010715,
    transparent: true,
    opacity: 0,
  });
  const axiomFloor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), axiomFloorMaterial);
  axiomFloor.rotation.x = -Math.PI / 2;
  axiomFloor.position.y = -3.05;
  axiomRoot.add(axiomFloor);
  axiomFades.push({ material: axiomFloorMaterial, opacity: 1 });

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x184cff,
    emissive: 0x0d48ff,
    emissiveIntensity: 4.2,
    metalness: 0.72,
    roughness: 0.18,
    transparent: true,
    opacity: 0,
  });
  const gateway = new THREE.Group();
  const verticalGeometry = new THREE.BoxGeometry(0.22, 8.1, 0.34);
  const horizontalGeometry = new THREE.BoxGeometry(4.4, 0.22, 0.34);
  for (const x of [1.25, 5.65]) {
    const side = new THREE.Mesh(verticalGeometry, frameMaterial);
    side.position.set(x, 1.0, -3.4);
    gateway.add(side);
  }
  for (const y of [-3.05, 5.05]) {
    const edge = new THREE.Mesh(horizontalGeometry, frameMaterial);
    edge.position.set(3.45, y, -3.4);
    gateway.add(edge);
  }
  axiomRoot.add(gateway);
  axiomFades.push({ material: frameMaterial, opacity: 1 });

  const portalMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOpacity: axiomPortalOpacity,
      uTime: axiomTime,
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 point = vUv - 0.5;
        float horizon = exp(-abs(point.y + 0.32) * 38.0);
        float ray = exp(-abs(point.x + sin(point.y * 9.0 + uTime) * 0.025) * 18.0);
        float particles = pow(max(0.0, sin(vUv.x * 113.0 + sin(vUv.y * 89.0 + uTime))), 24.0);
        vec3 blue = vec3(0.01, 0.18, 0.8) * (0.28 + vUv.y);
        vec3 amber = vec3(1.0, 0.42, 0.12) * (horizon + ray * 0.75);
        gl_FragColor = vec4(blue + amber + particles * vec3(0.2, 0.65, 1.0), uOpacity * (0.42 + horizon + ray));
      }
    `,
  });
  const portalPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.05, 7.72), portalMaterial);
  portalPlane.position.set(3.45, 1, -3.42);
  axiomRoot.add(portalPlane);

  const axiomCubeField = new THREE.Group();
  const cubeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0b2868,
    emissive: 0x082e9c,
    emissiveIntensity: 1.25,
    metalness: 0.24,
    roughness: 0.12,
    transmission: 0.34,
    thickness: 0.8,
    transparent: true,
    opacity: 0,
  });
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x7ab5ff,
    wireframe: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeTransforms = new THREE.Object3D();
  const cubePositions: THREE.Vector3[] = [];
  const cubeCount = 21;
  const solidCubes = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, cubeCount);
  const wireCubes = new THREE.InstancedMesh(cubeGeometry, wireMaterial, cubeCount);
  for (let index = 0; index < cubeCount; index += 1) {
    const column = index % 6;
    const row = Math.floor(index / 6);
    const position = new THREE.Vector3(
      -5.8 + column * 1.38 + Math.sin(index * 2.17) * 0.42,
      -1.7 + row * 1.62 + Math.cos(index * 1.37) * 0.38,
      -3.8 + Math.sin(index * 0.91) * 3.3,
    );
    cubePositions.push(position);
    cubeTransforms.position.copy(position);
    cubeTransforms.rotation.set(index * 0.13, index * 0.21, index * 0.08);
    const size = 0.32 + (index % 5) * 0.13;
    cubeTransforms.scale.set(size, size * (1 + (index % 3) * 0.24), size);
    cubeTransforms.updateMatrix();
    solidCubes.setMatrixAt(index, cubeTransforms.matrix);
    cubeTransforms.scale.multiplyScalar(1.035);
    cubeTransforms.updateMatrix();
    wireCubes.setMatrixAt(index, cubeTransforms.matrix);
  }
  solidCubes.instanceMatrix.needsUpdate = true;
  wireCubes.instanceMatrix.needsUpdate = true;
  axiomCubeField.add(solidCubes, wireCubes);
  axiomRoot.add(axiomCubeField);
  axiomFades.push(
    { material: cubeMaterial, opacity: 0.72 },
    { material: wireMaterial, opacity: 0.82 },
  );

  const networkPositions: number[] = [];
  cubePositions.forEach((position, index) => {
    const next = cubePositions[(index + 1) % cubePositions.length];
    networkPositions.push(position.x, position.y, position.z, next.x, next.y, next.z);
    if (index % 3 === 0) networkPositions.push(position.x, position.y, position.z, 3.45, 1, -3.4);
  });
  const networkGeometry = new THREE.BufferGeometry();
  networkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(networkPositions, 3));
  const networkMaterial = new THREE.LineBasicMaterial({
    color: 0x79aaff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  axiomRoot.add(new THREE.LineSegments(networkGeometry, networkMaterial));
  axiomFades.push({ material: networkMaterial, opacity: 0.68 });

  const bubbleCount = 420;
  const bubblePositions = new Float32Array(bubbleCount * 3);
  for (let index = 0; index < bubbleCount; index += 1) {
    const seed = index * 12.9898;
    bubblePositions[index * 3] = Math.sin(seed * 1.17) * 11;
    bubblePositions[index * 3 + 1] = ((index * 47) % 191) / 191 * 12 - 4;
    bubblePositions[index * 3 + 2] = Math.cos(seed * 0.73) * 11;
  }
  const bubbleGeometry = new THREE.BufferGeometry();
  bubbleGeometry.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));
  const bubbleMaterial = new THREE.PointsMaterial({
    color: 0xa8ddff,
    size: 0.055,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const axiomParticles = new THREE.Points(bubbleGeometry, bubbleMaterial);
  axiomRoot.add(axiomParticles);
  axiomFades.push({ material: bubbleMaterial, opacity: 0.72 });

  const axiomPulseLight = new THREE.PointLight(0x2d75ff, 0, 20, 2);
  axiomPulseLight.position.set(2.2, 1.4, 0.8);
  axiomRoot.add(axiomPulseLight);
  const axiomAmberLight = new THREE.PointLight(0xff8545, 0, 14, 2);
  axiomAmberLight.position.set(3.45, -1.1, -2.7);
  axiomRoot.add(axiomAmberLight);
  axiomPulseLight.userData.amber = axiomAmberLight;
  root.add(axiomRoot);

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
    oceanTime,
    oceanOpacity,
    cloudLayer,
    cloudMaterial,
    transitionCloudLayer,
    transitionCloudMaterial,
    fades,
    skyOpacity,
    whirlpool,
    whirlpoolStrength,
    whirlpoolTime,
    axiomRoot,
    axiomFades,
    axiomDomeOpacity,
    axiomTime,
    axiomPortalOpacity,
    axiomCubeField,
    axiomParticles,
    axiomPulseLight,
    worldSun,
    ownedTextures,
  };
}

export default function HeroThreeWorld() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const shell = host?.closest<HTMLElement>('.site-shell');
    const hero = shell?.querySelector<HTMLElement>('.hero-chapter');
    const axiomSection = shell?.querySelector<HTMLElement>('.project-axiom');
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
    let sceneInView = true;
    let needsImmediateFrame = true;
    let cinematicElapsed = 0;
    let cinematicDirection: HeroCinematicDirection = 1;
    let cinematicStarted = false;
    let cinematicComplete = false;
    let cinematicReleased = false;
    let bodyOverflowBeforeCinematic = '';
    let lastScrollY = window.scrollY;
    let touchStartY = 0;
    const visibleSceneSections = new Set<Element>();
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
        textures.push(...portalWorld.ownedTextures);
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

    const beginCinematic = () => {
      if (cinematicStarted) return;
      cinematicStarted = true;
      cinematicComplete = false;
      cinematicReleased = false;
      cinematicDirection = 1;
      cinematicElapsed = 0;
      bodyOverflowBeforeCinematic = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      shell.dataset.cinematic = 'true';
    };

    const releaseCinematic = () => {
      if (cinematicReleased || cinematicDirection < 0) return;
      cinematicReleased = true;
      cinematicStarted = false;
      cinematicComplete = true;
      document.body.style.overflow = bodyOverflowBeforeCinematic;
      shell.dataset.cinematic = 'complete';
      if (!axiomSection) return;
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      const axiomTop = axiomSection.getBoundingClientRect().top + window.scrollY;
      // Land far enough into the project chapter for its authored Axiom title
      // to be fully present over the new underwater scene.
      const destination = axiomTop + axiomSection.offsetHeight * 0.24;
      window.scrollTo(0, destination);
      requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = previousScrollBehavior;
      });
    };

    const beginReverseCinematic = () => {
      if (cinematicStarted || !portalWorld || !sphere || shell.dataset.chapter !== 'axiom') return;
      cinematicStarted = true;
      cinematicComplete = false;
      cinematicReleased = false;
      cinematicDirection = -1;
      cinematicElapsed = heroCinematicDuration;
      bodyOverflowBeforeCinematic = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      shell.dataset.cinematic = 'true';
      host.style.opacity = '1';
      needsImmediateFrame = true;
      scheduleRender();
    };

    const releaseReverseCinematic = () => {
      if (cinematicReleased || cinematicDirection > 0) return;
      cinematicReleased = true;
      cinematicStarted = false;
      cinematicComplete = false;
      cinematicElapsed = 0;
      document.body.style.overflow = bodyOverflowBeforeCinematic;
      shell.removeAttribute('data-cinematic');
      shell.removeAttribute('data-cinematic-phase');
      if (!hero) return;
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      const heroRunway = Math.max(hero.offsetHeight - window.innerHeight, 1);
      progressTarget = 0.55;
      progressCurrent = 0.55;
      window.scrollTo(0, heroTop + heroRunway * 0.55);
      lastScrollY = window.scrollY;
      requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = previousScrollBehavior;
      });
    };

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
      const nextScrollY = window.scrollY;
      const scrollingBack = nextScrollY < lastScrollY - 3;
      lastScrollY = nextScrollY;
      if (scrollingBack) beginReverseCinematic();
      lastScrollAt = performance.now();
      measureScroll();
    };

    const wheel = (event: WheelEvent) => {
      if (event.deltaY >= -4 || cinematicStarted || shell.dataset.chapter !== 'axiom') return;
      event.preventDefault();
      beginReverseCinematic();
    };

    const touchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const touchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? touchStartY;
      if (currentY - touchStartY < 10 || cinematicStarted || shell.dataset.chapter !== 'axiom') return;
      event.preventDefault();
      beginReverseCinematic();
    };

    const orbitPosition = new THREE.Vector3();
    const orbitTarget = new THREE.Vector3();
    const orbCenter = new THREE.Vector3();
    const orbApproach = new THREE.Vector3();
    const worldCameraPosition = new THREE.Vector3();
    const worldCameraTarget = new THREE.Vector3();
    const vortexCameraPosition = new THREE.Vector3();
    const vortexCameraTarget = new THREE.Vector3();
    const axiomCameraPosition = new THREE.Vector3();
    const axiomCameraTarget = new THREE.Vector3();
    const openingFog = new THREE.Color(0xd9cec4);
    const cloudFog = new THREE.Color(0x8faabd);
    const worldFog = new THREE.Color(0x8ca7b7);
    const axiomFog = new THREE.Color(0x03152d);

    let renderFrame: FrameRequestCallback;
    const scheduleRender = () => {
      if (disposed || document.hidden || !sceneInView || frame !== 0) return;
      frame = requestAnimationFrame(renderFrame);
    };
    const stopRendering = () => {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    renderFrame = (rafTime) => {
      frame = 0;
      if (disposed || document.hidden || !sceneInView) return;
      const isInteracting = (cinematicStarted && !cinematicComplete)
        || performance.now() - lastScrollAt < 900
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
      if (!cinematicStarted && !cinematicComplete && progressTarget >= 0.585
        && shell.dataset.chapter !== 'axiom' && portalWorld && sphere) beginCinematic();
      if (cinematicStarted) {
        cinematicElapsed = advanceHeroCinematicTime(cinematicElapsed, delta, cinematicDirection);
      }
      if (performance.now() - lastScrollAt > 700) idleAngle += delta * 0.055;
      progressCurrent += (progressTarget - progressCurrent) * 0.075;
      const axiomChapterActive = shell.dataset.chapter === 'axiom';
      const cinematic = cinematicStarted
        ? sampleHeroCinematic(cinematicElapsed)
        : axiomChapterActive
          ? sampleHeroCinematic(heroCinematicDuration)
          : null;
      if (cinematicStarted && cinematicDirection > 0 && cinematic?.complete) releaseCinematic();
      if (cinematicStarted && cinematicDirection < 0 && cinematicElapsed <= 0) releaseReverseCinematic();
      const portal = cinematic ?? sampleHeroPortal(progressCurrent);
      const shadowProgress = cinematic
        ? cinematic.worldReveal + cinematic.whirlpool + cinematic.axiomReveal * 2
        : progressCurrent;
      if (Math.abs(shadowProgress - lastShadowProgress) > 0.0015) {
        renderer.shadowMap.needsUpdate = true;
        lastShadowProgress = shadowProgress;
      }
      const orbit = sampleHeroOrbit(portal.orbitProgress, idleAngle);
      const loadFramingLift = 0.73 * (1 - portal.orbitProgress) * (1 - portal.orbitProgress);
      const keepCinematicVisible = (cinematicStarted && !cinematicReleased)
        || (cinematicComplete && axiomChapterActive);
      const opacity = keepCinematicVisible ? 1 : heroThreeVisibility(progressCurrent);
      host.style.opacity = opacity.toFixed(4);
      shell.style.setProperty('--hero-three-opacity', opacity.toFixed(4));
      shell.style.setProperty('--cinematic-copy-opacity', (cinematic?.copyOpacity ?? 0).toFixed(4));
      shell.style.setProperty('--cinematic-blackout', (cinematic?.darkness ?? 0).toFixed(4));
      shell.style.setProperty('--axiom-reveal', (cinematic?.axiomReveal ?? 0).toFixed(4));
      if (cinematic) shell.dataset.cinematicPhase = cinematic.phase;
      shell.dataset.heroPortal = (cinematic?.axiomReveal ?? 0) > 0.02
        ? 'axiom'
        : portal.worldReveal > 0.94
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

      const sculptureVisible = portal.worldReveal < 0.32 && portal.cloudMorph < 0.22;
      sculptureObjects.forEach((object) => { object.visible = sculptureVisible; });
      const atmosphereVisible = portal.worldReveal < 0.18 && portal.cloudMorph < 0.22;
      atmosphereObjects.forEach((object) => { object.visible = atmosphereVisible; });

      if (portalWorld) {
        const whirlpoolStrength = cinematic?.whirlpool ?? 0;
        const axiomReveal = cinematic?.axiomReveal ?? 0;
        const surfaceWorldOpacity = 1 - axiomReveal;
        portalWorld.root.visible = portal.cloudMorph > 0.04 || axiomReveal > 0.001;
        const worldScale = 0.62 + portal.worldReveal * 0.38;
        portalWorld.root.scale.setScalar(worldScale);
        portalWorld.root.rotation.y = -0.16 + portal.worldSettle * 0.3;
        portalWorld.fades.forEach(({ material, opacity: finalOpacity }) => {
          material.opacity = finalOpacity * portal.worldReveal * surfaceWorldOpacity;
          material.depthWrite = surfaceWorldOpacity > 0.55;
        });
        portalWorld.cloudMaterial.opacity = 0.66 * portal.cloudMorph * surfaceWorldOpacity;
        const transitionCloudStrength = portal.cloudMorph * (1 - portal.worldReveal);
        portalWorld.transitionCloudMaterial.opacity = 0.88
          * Math.pow(transitionCloudStrength, 0.72)
          * surfaceWorldOpacity;
        const worldSky = Math.min(1, Math.max(0, (portal.worldReveal - 0.16) / 0.84));
        const cloudSky = Math.pow(transitionCloudStrength, 0.8);
        portalWorld.skyOpacity.value = Math.max(worldSky, cloudSky) * surfaceWorldOpacity;
        const environmentalTime = cinematic ? cinematicElapsed : elapsed;
        portalWorld.oceanTime.value = environmentalTime;
        portalWorld.oceanOpacity.value = 0.96 * portal.worldReveal * surfaceWorldOpacity;
        portalWorld.ocean.material.depthWrite = surfaceWorldOpacity > 0.55;
        portalWorld.ocean.position.y = -1.9 + Math.sin(environmentalTime * 0.42) * 0.022;
        portalWorld.cloudLayer.position.x = Math.sin(elapsed * 0.08) * 0.42;
        portalWorld.cloudLayer.position.z = Math.cos(elapsed * 0.065) * 0.3;
        portalWorld.transitionCloudLayer.rotation.x = elapsed * 0.012;
        portalWorld.transitionCloudLayer.rotation.y = elapsed * -0.018;
        portalWorld.whirlpool.visible = whirlpoolStrength > 0.002 && axiomReveal < 0.98;
        // Bring the vortex pattern in before the camera loses control, so the
        // viewer gets a readable whirlpool beat before the plunge.
        portalWorld.whirlpoolStrength.value = Math.pow(whirlpoolStrength, 0.45);
        portalWorld.whirlpoolTime.value = cinematic ? cinematicElapsed : elapsed;
        portalWorld.worldSun.intensity = 4.8 * surfaceWorldOpacity;

        portalWorld.axiomRoot.visible = axiomReveal > 0.001;
        portalWorld.axiomDomeOpacity.value = axiomReveal;
        portalWorld.axiomPortalOpacity.value = axiomReveal * (0.72 + Math.sin(elapsed * 1.3) * 0.08);
        portalWorld.axiomTime.value = elapsed;
        portalWorld.axiomFades.forEach(({ material, opacity: finalOpacity }) => {
          material.opacity = finalOpacity * axiomReveal;
        });
        portalWorld.axiomCubeField.rotation.y = Math.sin(elapsed * 0.17) * 0.075;
        portalWorld.axiomCubeField.position.y = Math.sin(elapsed * 0.42) * 0.08;
        portalWorld.axiomParticles.rotation.y = elapsed * 0.018;
        portalWorld.axiomParticles.position.y = (elapsed * 0.055) % 1.4;
        portalWorld.axiomPulseLight.intensity = axiomReveal * (5.2 + Math.sin(elapsed * 1.7) * 1.1);
        const amberLight = portalWorld.axiomPulseLight.userData.amber as THREE.PointLight | undefined;
        if (amberLight) amberLight.intensity = axiomReveal * (3.1 + Math.sin(elapsed * 1.13) * 0.65);

        worldCameraPosition.set(orbCenter.x + 5.8, orbCenter.y + 8.1, orbCenter.z + 10.6);
        worldCameraTarget.set(orbCenter.x, orbCenter.y - 1.35, orbCenter.z);
        camera.position.lerp(worldCameraPosition, portal.worldSettle);
        target.lerp(worldCameraTarget, portal.worldSettle);

        if (whirlpoolStrength > 0) {
          // A deterministic logarithmic descent: less than one full orbit over
          // five seconds, no shake, and the exact same path when played back.
          const descent = Math.pow(whirlpoolStrength, 1.08);
          const vortexCenterX = orbCenter.x + 0.25;
          const vortexCenterY = orbCenter.y - 1.72;
          const vortexCenterZ = orbCenter.z + 0.3;
          const startDx = worldCameraPosition.x - vortexCenterX;
          const startDz = worldCameraPosition.z - vortexCenterZ;
          const startRadius = Math.hypot(startDx, startDz);
          const startAngle = Math.atan2(startDz, startDx);
          const vortexAngle = startAngle + descent * Math.PI * 1.65;
          const vortexRadius = 0.24 + (startRadius - 0.24) * Math.pow(1 - descent, 1.18);
          vortexCameraPosition.set(
            vortexCenterX + Math.cos(vortexAngle) * vortexRadius,
            vortexCenterY + 9.82 * Math.pow(1 - descent, 1.08) - descent * 1.12,
            vortexCenterZ + Math.sin(vortexAngle) * vortexRadius,
          );
          vortexCameraTarget.set(
            vortexCenterX,
            vortexCenterY - descent * 0.42,
            vortexCenterZ,
          );
          camera.position.copy(vortexCameraPosition);
          target.lerp(vortexCameraTarget, descent);
        }

        if (axiomReveal > 0) {
          axiomCameraPosition.set(orbCenter.x + 8.4, orbCenter.y + 1.5, orbCenter.z + 10.8);
          axiomCameraTarget.set(orbCenter.x - 0.3, orbCenter.y - 0.65, orbCenter.z - 2.45);
          camera.position.lerp(axiomCameraPosition, axiomReveal);
          target.lerp(axiomCameraTarget, axiomReveal);
        }
      }

      const axiomLightBlend = cinematic?.axiomReveal ?? 0;
      key.intensity = 22 * (1 - axiomLightBlend * 0.9);
      glint.intensity = 52 * (1 - axiomLightBlend * 0.98);
      rim.intensity = 7 + axiomLightBlend * 5;
      hemi.intensity = 0.06 + axiomLightBlend * 0.09;

      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerpColors(openingFog, worldFog, portal.worldReveal);
        const cloudStage = portal.cloudMorph * (1 - portal.worldReveal);
        scene.fog.color.lerp(cloudFog, cloudStage * 0.72);
        if (cinematic?.axiomReveal) scene.fog.color.lerp(axiomFog, cinematic.axiomReveal);
        scene.fog.density = 0.026 - portal.worldReveal * 0.012 + (cinematic?.axiomReveal ?? 0) * 0.028;
      }
      camera.lookAt(target);
      if ((cinematic?.whirlpool ?? 0) > 0) {
        const controlledBank = cinematic!.whirlpool * 0.08
          + cinematic!.whirlpool * cinematic!.whirlpool * 0.1;
        camera.rotateZ(-controlledBank);
      }
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
    const sceneObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSceneSections.add(entry.target);
        else visibleSceneSections.delete(entry.target);
      });
      sceneInView = visibleSceneSections.size > 0;
      if (!sceneInView) {
        host.style.opacity = '0';
        shell.style.setProperty('--hero-three-opacity', '0');
        stopRendering();
        return;
      }
      lastElapsed = clock.getElapsedTime();
      needsImmediateFrame = true;
      scheduleRender();
    });

    resize();
    measureScroll();
    sceneObserver.observe(hero);
    if (axiomSection) sceneObserver.observe(axiomSection);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointerMove, { passive: true });
    document.addEventListener('visibilitychange', visibilityChange);
    scheduleRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('visibilitychange', visibilityChange);
      sceneObserver.disconnect();
      if (cinematicStarted) document.body.style.overflow = bodyOverflowBeforeCinematic;
      shell.removeAttribute('data-three-ready');
      shell.removeAttribute('data-hero-portal');
      shell.removeAttribute('data-cinematic');
      shell.removeAttribute('data-cinematic-phase');
      shell.style.removeProperty('--hero-three-opacity');
      shell.style.removeProperty('--cinematic-copy-opacity');
      shell.style.removeProperty('--cinematic-blackout');
      shell.style.removeProperty('--axiom-reveal');
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
