import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { BRAND } from '../../lib/palette';
import { getRadialTexture } from './fx';

const COLORS = [BRAND.volt, BRAND.gold, BRAND.ember, BRAND.prism].map((c) => new THREE.Color(c));

const colorUniforms = () => ({
  uC0: { value: COLORS[0] },
  uC1: { value: COLORS[1] },
  uC2: { value: COLORS[2] },
  uC3: { value: COLORS[3] },
});

const PALETTE_GLSL = /* glsl */ `
  uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
  vec3 palette4(float x) {
    x = fract(x) * 4.0;
    if (x < 1.0) return mix(uC0, uC1, smoothstep(0.0, 1.0, x));
    if (x < 2.0) return mix(uC1, uC2, smoothstep(0.0, 1.0, x - 1.0));
    if (x < 3.0) return mix(uC2, uC3, smoothstep(0.0, 1.0, x - 2.0));
    return mix(uC3, uC0, smoothstep(0.0, 1.0, x - 3.0));
  }
`;

/* ---------- glowing core ---------- */
const coreMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uEnergy: { value: 0 }, ...colorUniforms() },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vView; varying vec3 vPos;
      void main() {
        vPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${PALETTE_GLSL}
      uniform float uTime; uniform float uEnergy;
      varying vec3 vN; varying vec3 vView; varying vec3 vPos;
      void main() {
        float a = atan(vPos.z, vPos.x) / 6.28318 + 0.5;
        float swirl = a + vPos.y * 0.35 + uTime * 0.06 + 0.08 * sin(vPos.y * 5.0 + uTime * 1.3);
        vec3 col = palette4(swirl);
        float fres = pow(1.0 - max(dot(vN, vView), 0.0), 2.0);
        float flick = 0.5 + 0.5 * sin(vPos.y * 6.0 - uTime * 1.6 + a * 6.28318 * 2.0);
        vec3 hot = mix(vec3(1.0, 0.97, 1.0), col, 0.35 + 0.12 * flick) * 0.92;
        vec3 c = mix(hot * 1.15, col * 1.9, smoothstep(0.05, 0.9, fres)) + fres * fres * 0.8 + uEnergy * 0.08;
        gl_FragColor = vec4(c, 1.0);
      }`,
    toneMapped: false,
  });

/* ---------- conic gradient rings ---------- */
const ringMaterial = (offset: number) =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOffset: { value: offset }, ...colorUniforms() },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${PALETTE_GLSL}
      uniform float uTime; uniform float uOffset;
      varying vec3 vPos;
      void main() {
        float a = atan(vPos.y, vPos.x) / 6.28318 + 0.5;
        vec3 col = palette4(a + uOffset);
        float dash = smoothstep(0.0, 0.02, fract(a * 4.0 - uTime * 0.05) - 0.03);
        gl_FragColor = vec4(col * (1.2 + 0.4 * dash), 0.35 + 0.65 * dash);
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

/* ---------- inward-spiralling particles: the "source" flow ---------- */
function useParticles(count: number) {
  return useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const seed = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      seed[i * 3] = Math.random();
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
      const c = COLORS[i % 4];
      color.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uSpeed: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec3 aSeed; attribute vec3 aColor;
        uniform float uTime; uniform float uPixel; uniform float uSpeed;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float life = fract(aSeed.x + uTime * (0.035 + aSeed.y * 0.03) * uSpeed);
          float r = mix(7.5, 0.9, life);
          float ang = aSeed.z * 6.28318 + life * 3.2;
          float y = (aSeed.y - 0.5) * 3.0 * (1.0 - life);
          vec3 p = vec3(cos(ang) * r, y, sin(ang) * r * 0.62);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.4 + aSeed.y * 2.2) * uPixel * (12.0 / -mv.z);
          vColor = aColor;
          vAlpha = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.85, 1.0, life));
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(vColor * 1.4, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo, mat };
  }, [count]);
}

interface SourceCoreProps {
  /** 0..1 extra intensity, e.g. while an agent is hovered */
  energy?: number;
  /** scroll progress of the hero, drives a faster flow */
  flowRef?: React.MutableRefObject<number>;
  reducedMotion?: boolean;
  particles?: number;
}

export const SourceCore: React.FC<SourceCoreProps> = ({ energy = 0, flowRef, reducedMotion = false, particles = 520 }) => {
  const core = useMemo(coreMaterial, []);
  const ringA = useMemo(() => ringMaterial(0), []);
  const ringB = useMemo(() => ringMaterial(0.5), []);
  const flow = useParticles(particles);
  const radial = useMemo(() => getRadialTexture(), []);

  const coreMesh = useRef<THREE.Mesh>(null!);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const halo = useRef<THREE.Mesh>(null!);
  const e = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime * (reducedMotion ? 0.25 : 1);
    e.current = THREE.MathUtils.damp(e.current, energy, 3, dt);
    const scroll = flowRef?.current ?? 0;
    core.uniforms.uTime.value = t;
    core.uniforms.uEnergy.value = e.current + scroll;
    ringA.uniforms.uTime.value = t;
    ringB.uniforms.uTime.value = t;
    flow.mat.uniforms.uTime.value = t;
    flow.mat.uniforms.uPixel.value = state.gl.getPixelRatio();
    flow.mat.uniforms.uSpeed.value = 1 + scroll * 3 + e.current;
    const s = 1 + Math.sin(t * 1.8) * 0.025 + e.current * 0.06;
    coreMesh.current.scale.setScalar(s);
    coreMesh.current.rotation.y = t * 0.25;
    ring1.current.rotation.z = t * 0.18;
    ring2.current.rotation.z = -t * 0.12;
    (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + e.current * 0.12 + Math.sin(t * 1.8) * 0.05;
  });

  return (
    <group>
      <points geometry={flow.geo} material={flow.mat} frustumCulled={false} />
      <Billboard>
        <mesh ref={halo} renderOrder={-1}>
          <planeGeometry args={[8.5, 8.5]} />
          <meshBasicMaterial map={radial} color="#b9a6ff" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </Billboard>
      <mesh ref={coreMesh} material={core}>
        <icosahedronGeometry args={[1.1, 20]} />
      </mesh>
      <group rotation={[1.25, 0, 0.18]}>
        <mesh ref={ring1} material={ringA}>
          <torusGeometry args={[2.05, 0.024, 12, 240]} />
        </mesh>
      </group>
      <group rotation={[1.0, 0.55, -0.3]}>
        <mesh ref={ring2} material={ringB}>
          <torusGeometry args={[2.7, 0.015, 12, 280]} />
        </mesh>
      </group>
    </group>
  );
};
