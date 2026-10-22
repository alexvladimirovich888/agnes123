import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { AgentPalette } from '../../lib/palette';

/* ------------------------------------------------------------------ */
/* Holographic panels drawn on a canvas                               */
/* ------------------------------------------------------------------ */

function makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, color + '30');
  g.addColorStop(1, color + '08');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 26);
  ctx.fill();
  ctx.strokeStyle = color + 'cc';
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** PLUTUS: candlestick chart trending up. */
export function chartTexture(p: AgentPalette) {
  return makeCanvas(320, 220, (ctx) => {
    frame(ctx, 320, 220, p.accent);
    ctx.strokeStyle = p.accent + '33';
    ctx.lineWidth = 1;
    for (let y = 50; y < 200; y += 36) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(296, y);
      ctx.stroke();
    }
    const candles = [
      [150, 128, 168, 112, true],
      [130, 140, 150, 122, false],
      [138, 112, 146, 100, true],
      [116, 120, 126, 104, false],
      [118, 92, 124, 80, true],
      [96, 70, 104, 58, true],
      [74, 82, 86, 66, false],
      [80, 52, 88, 40, true],
    ] as const;
    candles.forEach(([open, close, low, high, up], i) => {
      const x = 40 + i * 32;
      const col = up ? '#4ade80' : '#ff6b81';
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, high);
      ctx.lineTo(x, low);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.fillRect(x - 8, Math.min(open, close), 16, Math.max(6, Math.abs(open - close)));
    });
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    candles.forEach(([, close], i) => (i ? ctx.lineTo(40 + i * 32, close) : ctx.moveTo(40, close)));
    ctx.stroke();
    ctx.fillStyle = p.glow;
    ctx.font = '600 22px Geist, system-ui, sans-serif';
    ctx.fillText('BTC +4.2%', 26, 38);
  });
}

/** HEPHAESTUS: a code window. */
export function codeTexture(p: AgentPalette) {
  return makeCanvas(320, 220, (ctx) => {
    frame(ctx, 320, 220, p.accent);
    ['#ff6b81', '#f2b544', '#4ade80'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(30 + i * 20, 30, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = p.glow;
    ctx.font = '700 46px "Geist Mono", ui-monospace, monospace';
    ctx.fillText('</>', 26, 100);
    const lines: [number, number, string][] = [
      [26, 130, p.accent],
      [26, 150, '#c4b1ff'],
      [46, 170, '#8ae9ff'],
      [46, 190, p.accent],
    ];
    const widths = [180, 120, 200, 90];
    lines.forEach(([x, y, c], i) => {
      ctx.fillStyle = c + 'cc';
      ctx.beginPath();
      ctx.roundRect(x, y - 8, widths[i], 9, 4);
      ctx.fill();
    });
    ctx.fillStyle = p.glow + '99';
    ctx.font = '500 18px "Geist Mono", ui-monospace, monospace';
    ctx.fillText('npm run ship', 140, 100);
  });
}

export const HoloPanel: React.FC<{
  texture: THREE.Texture;
  position: [number, number, number];
  rotationY?: number;
  activity: React.MutableRefObject<number>;
  seed?: number;
}> = ({ texture, position, rotationY = 0, activity, seed = 0 }) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [texture]
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed;
    const a = activity.current;
    mat.opacity = (0.5 + a * 0.5) * (0.92 + 0.08 * Math.sin(t * 23) * Math.sin(t * 7));
    mesh.current.position.y = position[1] + Math.sin(t * 1.4) * 0.06;
    mesh.current.scale.setScalar(0.92 + a * 0.12);
  });
  return (
    <mesh ref={mesh} position={position} rotation-y={rotationY} material={mat}>
      <planeGeometry args={[1.12, 0.77]} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* Hand-held items                                                     */
/* ------------------------------------------------------------------ */

/** PLUTUS flips a gold coin above his palm. */
export const FlipCoin: React.FC<{ gold: THREE.Material; reduced: boolean }> = ({ gold, reduced }) => {
  const g = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycle = (t % 2.6) / 2.6;
    const air = reduced ? 0 : Math.max(0, Math.sin(cycle * Math.PI * 1.4));
    g.current.position.y = 0.2 + air * 0.55;
    g.current.rotation.x = reduced ? 0.6 : cycle * Math.PI * 6;
  });
  return (
    <group ref={g} position={[0, 0.2, 0.05]}>
      <mesh material={gold}>
        <cylinderGeometry args={[0.13, 0.13, 0.035, 32]} />
      </mesh>
    </group>
  );
};

export const Hammer: React.FC<{ metal: THREE.Material; accent: THREE.Material }> = ({ metal, accent }) => (
  <group position={[0.05, 0.12, 0.08]} rotation={[0, 0, -0.5]} scale={1.3}>
    <mesh material={accent} position={[0, 0.05, 0]}>
      <cylinderGeometry args={[0.035, 0.04, 0.6, 12]} />
    </mesh>
    <mesh material={metal} position={[0, 0.38, 0]}>
      <boxGeometry args={[0.34, 0.15, 0.16]} />
    </mesh>
  </group>
);

export const Magnifier: React.FC<{ frame: THREE.Material; glow: string }> = ({ frame: frameMat, glow }) => (
  <group position={[-0.02, 0.28, 0.1]} rotation={[0, 0, 0.35]}>
    <mesh material={frameMat} position={[0, 0.12, 0]}>
      <torusGeometry args={[0.17, 0.032, 12, 40]} />
    </mesh>
    <mesh position={[0, 0.12, 0]}>
      <circleGeometry args={[0.15, 32]} />
      <meshPhysicalMaterial color={glow} transparent opacity={0.28} roughness={0} transmission={0.3} side={THREE.DoubleSide} />
    </mesh>
    <mesh material={frameMat} position={[0, -0.17, 0]}>
      <cylinderGeometry args={[0.03, 0.035, 0.26, 10]} />
    </mesh>
  </group>
);

/** PROTEUS holds a gem that keeps changing shape. */
export const MorphGem: React.FC<{ material: THREE.Material; reduced: boolean }> = ({ material, reduced }) => {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const holder = useRef<THREE.Group>(null!);
  const geos = useMemo(
    () => [
      new THREE.OctahedronGeometry(0.17, 0),
      new THREE.BoxGeometry(0.24, 0.24, 0.24),
      new THREE.TorusGeometry(0.13, 0.05, 12, 32),
      new THREE.IcosahedronGeometry(0.16, 0),
    ],
    []
  );
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const period = 1.6;
    const idx = reduced ? 0 : Math.floor(t / period) % geos.length;
    const phase = (t % period) / period;
    meshes.current.forEach((m, i) => {
      if (!m) return;
      const target = i === idx ? (phase < 0.12 ? phase / 0.12 : phase > 0.88 ? (1 - phase) / 0.12 : 1) : 0;
      const s = THREE.MathUtils.damp(m.scale.x, target, 18, dt);
      m.scale.setScalar(Math.max(0.0001, s));
      m.visible = s > 0.01;
    });
    holder.current.rotation.set(t * 0.8, t * 1.3, 0);
    holder.current.position.y = 0.32 + Math.sin(t * 2) * 0.04;
  });
  return (
    <group ref={holder} position={[0, 0.32, 0.05]}>
      {geos.map((g, i) => (
        <mesh key={i} ref={(el) => (meshes.current[i] = el)} geometry={g} material={material} scale={0.0001} />
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Head-worn items                                                     */
/* ------------------------------------------------------------------ */

export const Monocle: React.FC<{ gold: THREE.Material; at: [number, number, number] }> = ({ gold, at }) => {
  const chain = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(at[0] + 0.1, at[1] - 0.1, at[2]),
      new THREE.Vector3(at[0] + 0.32, at[1] - 0.35, at[2] - 0.02),
      new THREE.Vector3(at[0] + 0.55, at[1] - 0.32, at[2] - 0.2),
    ]);
    return new THREE.TubeGeometry(curve, 24, 0.012, 6, false);
  }, [at]);
  return (
    <group>
      <mesh material={gold} position={at}>
        <torusGeometry args={[0.15, 0.024, 12, 40]} />
      </mesh>
      <mesh material={gold} geometry={chain} />
    </group>
  );
};

export const Goggles: React.FC<{
  strap: THREE.Material;
  frame: THREE.Material;
  lens: THREE.Material;
  head: [number, number, number];
}> = ({ strap, frame: frameMat, lens, head }) => {
  const [w, h, d] = head;
  return (
    <group position={[0, h / 2 - 0.2, 0]}>
      <mesh material={strap}>
        <boxGeometry args={[w + 0.04, 0.1, d + 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.26, 0.08, d / 2 + 0.02]} rotation-x={-0.35}>
          <mesh material={frameMat} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.17, 0.17, 0.14, 28]} />
          </mesh>
          <mesh material={lens} position={[0, 0, 0.072]}>
            <circleGeometry args={[0.13, 28]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Headset: React.FC<{ band: THREE.Material; accent: THREE.Material; light: THREE.Material }> = ({ band, accent, light }) => {
  const boom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.8, -0.1, 0.12),
      new THREE.Vector3(-0.7, -0.38, 0.45),
      new THREE.Vector3(-0.32, -0.42, 0.7),
    ]);
    return new THREE.TubeGeometry(curve, 24, 0.022, 8, false);
  }, []);
  return (
    <group>
      <mesh material={band} position={[0, 0.02, 0.05]}>
        <torusGeometry args={[0.8, 0.045, 12, 48, Math.PI]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={accent} position={[s * 0.77, 0, 0.05]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.2, 0.2, 0.16, 28]} />
        </mesh>
      ))}
      <mesh material={band} geometry={boom} />
      <mesh material={light} position={[-0.32, -0.42, 0.7]}>
        <sphereGeometry args={[0.05, 16, 12]} />
      </mesh>
    </group>
  );
};
