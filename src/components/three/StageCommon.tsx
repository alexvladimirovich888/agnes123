import * as THREE from 'three';
import React from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { BRAND } from '../../lib/palette';
export { usePrefersReducedMotion, useCanHover } from './support';

/**
 * Studio lighting for the pearl-ceramic bots: a large soft key from the top-left,
 * coloured rim lights in the brand colours, and a reflective environment built
 * from light panels (no network assets).
 */
export const StageLights: React.FC = () => (
  <>
    <hemisphereLight args={['#f4f2ff', '#1a1630', 0.85]} />
    <directionalLight position={[-6, 9, 9]} intensity={1.7} />
    <directionalLight position={[7, 3, -6]} intensity={1.4} color={BRAND.volt} />
    <directionalLight position={[-7, 2, -6]} intensity={1.0} color={BRAND.prism} />
    <pointLight position={[0, -3, 4]} intensity={6} distance={14} color={BRAND.ember} />
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={3.2} position={[-3, 6, 7]} scale={[6, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="circle" intensity={1.6} position={[5, 4, 6]} scale={2} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.4} position={[9, 0, -2]} scale={[2, 8, 1]} color={BRAND.volt} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.2} position={[-9, 0, -2]} scale={[2, 8, 1]} color={BRAND.prism} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.8} position={[0, -6, 4]} scale={[10, 2, 1]} color={BRAND.gold} target={[0, 0, 0]} />
    </Environment>
  </>
);

/** Camera parallax that follows the cursor and dollies back as the hero scrolls away. */
export const CameraRig: React.FC<{
  target: [number, number, number];
  base: [number, number, number];
  strength?: number;
  scrollRef?: React.MutableRefObject<number>;
}> = ({ target, base, strength = 0.8, scrollRef }) => {
  const [tx, ty, tz] = target;
  const look = React.useMemo(() => new THREE.Vector3(tx, ty, tz), [tx, ty, tz]);
  useFrame((state, dt) => {
    const cam = state.camera;
    const p = scrollRef?.current ?? 0;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, base[0] + state.pointer.x * strength, 2.5, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, base[1] + state.pointer.y * strength * 0.45 + p * 1.5, 2.5, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, base[2] + p * 5, 4, dt);
    cam.lookAt(look);
  });
  return null;
};

export const configureRenderer = ({ gl }: { gl: THREE.WebGLRenderer }) => {
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.05;
};
