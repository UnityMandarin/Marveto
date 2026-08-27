'use client';

import { useEffect, useRef } from 'react';
import { Camera, Geometry, Mesh, Program, Renderer, Texture, Transform } from 'ogl';
import { assetPath } from './asset-path';

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec3 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform vec2 uImage;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv, vec2 screen, vec2 image) {
    float screenRatio = screen.x / screen.y;
    float imageRatio = image.x / image.y;
    vec2 scale = screenRatio < imageRatio
      ? vec2(screenRatio / imageRatio, 1.0)
      : vec2(1.0, imageRatio / screenRatio);
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    vec2 uv = coverUv(vUv, uResolution, uImage);
    float d = distance(vUv, uMouse);
    float pulse = sin((vUv.y + uTime * 0.045) * 24.0) * 0.0018;
    float lens = smoothstep(0.34, 0.0, d) * 0.012;
    vec2 offset = normalize(vUv - uMouse + 0.0001) * lens;
    vec4 color = texture2D(tMap, uv + offset + vec2(pulse, 0.0));
    vec4 red = texture2D(tMap, uv + offset * 1.24 + vec2(pulse, 0.0));
    vec4 blue = texture2D(tMap, uv + offset * 0.82 - vec2(pulse, 0.0));
    color.r = mix(color.r, red.r, smoothstep(0.36, 0.0, d) * 0.3);
    color.b = mix(color.b, blue.b, smoothstep(0.36, 0.0, d) * 0.28);
    gl_FragColor = color;
  }
`;

export default function HeroCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let renderer: Renderer | undefined;
    let frame = 0;
    let destroyed = false;

    try {
      renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
    } catch {
      return;
    }

    const gl = renderer.gl;
    gl.canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(gl.canvas);

    const scene = new Transform();
    const camera = new Camera(gl);
    camera.position.z = 1;
    const geometry = new Geometry(gl, {
      position: { size: 3, data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]) },
      uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
    });
    const texture = new Texture(gl);
    const image = new Image();
    image.decoding = 'async';
    image.src = assetPath('/images/hero.webp');
    image.onload = () => { texture.image = image; };

    const mouse = { current: [0.5, 0.5], target: [0.5, 0.5] };
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        tMap: { value: texture },
        uTime: { value: 0 },
        uMouse: { value: mouse.current },
        uResolution: { value: [1, 1] },
        uImage: { value: [1672, 941] },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);

    const resize = () => {
      if (!host || !renderer) return;
      renderer.setSize(host.clientWidth, host.clientHeight);
      program.uniforms.uResolution.value = [host.clientWidth, host.clientHeight];
    };
    const pointer = (event: PointerEvent) => {
      mouse.target[0] = event.clientX / window.innerWidth;
      mouse.target[1] = 1 - event.clientY / window.innerHeight;
    };
    const render = (time: number) => {
      if (destroyed || !renderer) return;
      mouse.current[0] += (mouse.target[0] - mouse.current[0]) * 0.06;
      mouse.current[1] += (mouse.target[1] - mouse.current[1]) * 0.06;
      program.uniforms.uTime.value = time * 0.001;
      program.uniforms.uMouse.value = mouse.current;
      renderer.render({ scene, camera });
      frame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointer, { passive: true });
    frame = requestAnimationFrame(render);

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointer);
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <div ref={ref} className="hero-canvas" aria-hidden="true" />;
}
