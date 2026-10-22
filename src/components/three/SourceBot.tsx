import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Billboard, RoundedBox } from '@react-three/drei';
import type { AgentPalette, BotKind } from '../../lib/palette';
import { getRadialTexture, easeOutBack, clamp01 } from './fx';
import { HoloPanel, chartTexture, codeTexture, FlipCoin, Hammer, Magnifier, MorphGem, Monocle, Goggles, Headset } from './BotProps';

export type AgentMood = 'idle' | 'attention' | 'speaking' | 'thinking' | 'talking' | 'error';

/** Vertical extent of a bot in local units, used to place labels and fit layouts. */
export const BOT_TOP = 1.85;
export const BOT_BOTTOM = -1.55;

const damp = THREE.MathUtils.damp;
const ERROR_RED = new THREE.Color('#ff4d5e');
const PEARL = '#eef0f6';

interface HeadSpec {
  shape: 'box' | 'sphere';
  size: [number, number, number];
  radius: number;
  visor: [number, number];
  front: number;
}

/** How each personality moves: bob speed, how often the eyes dart around, how far the head turns. */
const PERSONA: Record<BotKind, { bob: number; sac: [number, number]; turn: number }> = {
  plutus: { bob: 1.15, sac: [1.6, 3.4], turn: 0.32 }, // calm, deliberate analyst
  hephaestus: { bob: 2.2, sac: [0.7, 1.9], turn: 0.42 }, // restless builder
  hermes: { bob: 1.8, sac: [0.3, 1.0], turn: 0.5 }, // quick, always scanning
  proteus: { bob: 1.35, sac: [1.0, 2.6], turn: 0.4 }, // fluid, unhurried
};

const HEADS: Record<BotKind, HeadSpec> = {
  plutus: { shape: 'box', size: [1.72, 1.18, 1.25], radius: 0.46, visor: [1.3, 0.6], front: 0.625 },
  hephaestus: { shape: 'box', size: [1.56, 1.3, 1.28], radius: 0.3, visor: [1.18, 0.62], front: 0.64 },
  hermes: { shape: 'sphere', size: [1.52, 1.4, 1.42], radius: 0.71, visor: [1.02, 0.56], front: 0.74 },
  proteus: { shape: 'box', size: [1.5, 1.28, 1.28], radius: 0.52, visor: [1.12, 0.6], front: 0.64 },
};

interface SourceBotProps {
  kind: BotKind;
  palette: AgentPalette;
  mood: AgentMood;
  position?: [number, number, number];
  enterDelay?: number;
  reducedMotion?: boolean;
  lookAtPointer?: boolean;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  children?: React.ReactNode;
}

export const SourceBot: React.FC<SourceBotProps> = ({
  kind,
  palette,
  mood,
  position = [0, 0, 0],
  enterDelay = 0,
  reducedMotion = false,
  lookAtPointer = true,
  onPointerOver,
  onPointerOut,
  onClick,
  children,
}) => {
  const head = HEADS[kind];
  const radial = useMemo(() => getRadialTexture(), []);
  const accent = useMemo(() => new THREE.Color(palette.accent), [palette]);
  const glow = useMemo(() => new THREE.Color(palette.glow), [palette]);

  /* ---------------- Materials ---------------- */
  const mats = useMemo(() => {
    const iridescent = kind === 'proteus';
    const shell = new THREE.MeshPhysicalMaterial({
      color: iridescent ? '#efeaff' : PEARL,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: iridescent ? 1 : 0,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [200, 800],
      envMapIntensity: 1.1,
      emissive: new THREE.Color(palette.glow),
      emissiveIntensity: 0,
    });
    const body = shell.clone();
    body.color = new THREE.Color(iridescent ? '#e4dcff' : palette.tint);
    const visor = new THREE.MeshPhysicalMaterial({
      color: '#07080f',
      roughness: 0.06,
      metalness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.4,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: kind === 'plutus' ? '#f0b545' : '#2b2e3f',
      metalness: kind === 'plutus' ? 1 : 0.6,
      roughness: kind === 'plutus' ? 0.22 : 0.35,
      envMapIntensity: 1.3,
    });
    const accentSolid = new THREE.MeshPhysicalMaterial({
      color: palette.accent,
      roughness: 0.25,
      clearcoat: 1,
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.25,
    });
    const lens = new THREE.MeshPhysicalMaterial({
      color: palette.accent,
      roughness: 0.05,
      clearcoat: 1,
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.55,
    });
    const gem = new THREE.MeshPhysicalMaterial({
      color: '#d9ccff',
      roughness: 0.15,
      clearcoat: 1,
      iridescence: 1,
      iridescenceIOR: 1.8,
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.35,
    });
    const eye = new THREE.MeshBasicMaterial({ color: palette.glow, toneMapped: false });
    const light = new THREE.MeshBasicMaterial({ color: palette.accent, toneMapped: false });
    return { shell, body, visor, metal, accentSolid, lens, gem, eye, light };
  }, [kind, palette]);

  /* ---------------- Geometry ---------------- */
  const geo = useMemo(
    () => ({
      pill: new THREE.CapsuleGeometry(0.068, 0.15, 8, 16),
      arc: new THREE.TorusGeometry(0.105, 0.036, 10, 28, Math.PI),
      smile: new THREE.TorusGeometry(0.09, 0.026, 8, 24, Math.PI),
      mouth: new THREE.CapsuleGeometry(0.03, 0.12, 6, 12),
      hand: new THREE.SphereGeometry(0.19, 20, 14),
      body: new THREE.SphereGeometry(0.62, 40, 28),
      dot: new THREE.SphereGeometry(0.06, 16, 12),
    }),
    []
  );

  /* ---------------- Refs ---------------- */
  const root = useRef<THREE.Group>(null!);
  const float = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const eyes = useRef<THREE.Group>(null!);
  const pills = useRef<(THREE.Mesh | null)[]>([]);
  const arcs = useRef<(THREE.Mesh | null)[]>([]);
  const mouthBar = useRef<THREE.Mesh>(null!);
  const mouthSmile = useRef<THREE.Mesh>(null!);
  const screenGlow = useRef<THREE.Mesh>(null!);
  const handL = useRef<THREE.Group>(null!);
  const handR = useRef<THREE.Group>(null!);
  const thruster = useRef<THREE.Mesh>(null!);
  const core = useRef<THREE.Mesh>(null!);
  const thinkDots = useRef<THREE.Group>(null!);
  const accessory = useRef<THREE.Group>(null!);
  const accessory2 = useRef<THREE.Group>(null!);
  const activity = useRef(0);
  const persona = PERSONA[kind];
  const panelTex = useMemo(
    () => (kind === 'plutus' ? chartTexture(palette) : kind === 'hephaestus' ? codeTexture(palette) : null),
    [kind, palette]
  );

  const st = useRef({
    born: -1,
    open: 0,
    happy: 0,
    squint: 0,
    talk: 0,
    think: 0,
    att: 0,
    err: 0,
    shake: 0,
    lookX: 0,
    lookY: 0,
    nextBlink: 1.5 + Math.random() * 2,
    blinkUntil: 0,
    sacX: 0,
    sacY: 0,
    nextSac: 1,
    lastPX: 0,
    lastPY: 0,
    pointerIdle: 0,
  });
  const prevMood = useRef<AgentMood>(mood);
  const world = useMemo(() => new THREE.Vector3(), []);
  const eyeColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const S = st.current;
    const m = reducedMotion ? 0.3 : 1;
    if (S.born < 0) S.born = t;

    if (mood === 'error' && prevMood.current !== 'error') S.shake = 1;
    prevMood.current = mood;

    /* --- mood → expression targets --- */
    const tgt = {
      happy: mood === 'attention' ? 1 : mood === 'talking' ? 0.75 : 0,
      squint: mood === 'thinking' ? 0.5 : 0,
      talk: mood === 'speaking' || mood === 'talking' ? 1 : 0,
      think: mood === 'thinking' ? 1 : 0,
      att: mood === 'attention' ? 1 : 0,
      err: mood === 'error' ? 1 : 0,
    };
    S.happy = damp(S.happy, tgt.happy, 9, dt);
    S.squint = damp(S.squint, tgt.squint, 6, dt);
    S.talk = damp(S.talk, tgt.talk, 6, dt);
    S.think = damp(S.think, tgt.think, 4, dt);
    S.att = damp(S.att, tgt.att, 7, dt);
    S.err = damp(S.err, tgt.err, 6, dt);
    S.shake = damp(S.shake, 0, 2.2, dt);

    /* --- entrance: pop in, then eyes switch on --- */
    const p = reducedMotion ? 1 : clamp01((t - S.born - enterDelay) / 0.9);
    const enter = p <= 0 ? 0 : easeOutBack(p);
    const eyesOn = reducedMotion ? 1 : clamp01((t - S.born - enterDelay - 0.75) / 0.25);
    root.current.visible = p > 0;
    root.current.scale.setScalar(Math.max(0.0001, enter));
    root.current.rotation.y = (1 - Math.min(1, enter)) * -1.4;

    /* --- blinking --- */
    if (t > S.nextBlink && mood !== 'thinking') {
      S.blinkUntil = t + 0.11;
      S.nextBlink = t + 2.2 + Math.random() * 3.6;
      if (Math.random() < 0.18) S.nextBlink = t + 0.28; // occasional double blink
    }
    const blinking = t < S.blinkUntil ? 1 : 0;
    const openTarget = eyesOn * (1 - blinking) * (1 - S.err * 0.55) * (1 + S.att * 0.12);
    S.open = damp(S.open, openTarget, blinking ? 40 : 18, dt);

    /* --- gaze: follow pointer, wander when it is idle --- */
    const px = state.pointer.x;
    const py = state.pointer.y;
    if (Math.abs(px - S.lastPX) + Math.abs(py - S.lastPY) > 0.002) S.pointerIdle = 0;
    else S.pointerIdle += dt;
    S.lastPX = px;
    S.lastPY = py;

    root.current.getWorldPosition(world);
    const wx = (px * state.viewport.width) / 2 - world.x;
    const wy = (py * state.viewport.height) / 2 - world.y;
    let gx = THREE.MathUtils.clamp(wx * 0.18, -1, 1);
    let gy = THREE.MathUtils.clamp(wy * 0.22, -1, 1);
    if (!lookAtPointer || S.pointerIdle > 2.5) {
      if (t > S.nextSac) {
        S.sacX = (Math.random() * 2 - 1) * 0.7;
        S.sacY = (Math.random() * 2 - 1) * 0.4;
        S.nextSac = t + persona.sac[0] + Math.random() * (persona.sac[1] - persona.sac[0]);
      }
      gx = S.sacX;
      gy = S.sacY;
    }
    if (S.think > 0.05) {
      gx = THREE.MathUtils.lerp(gx, 0.75, S.think);
      gy = THREE.MathUtils.lerp(gy, 0.8, S.think);
    }
    if (S.err > 0.05) gy = THREE.MathUtils.lerp(gy, -0.7, S.err);
    S.lookX = damp(S.lookX, gx, 14, dt);
    S.lookY = damp(S.lookY, gy, 14, dt);

    /* --- body motion --- */
    const bob = Math.sin(t * persona.bob + enterDelay * 4) * 0.09 * m;
    activity.current = Math.max(S.think, S.talk, S.att * 0.6);
    const talkBounce = Math.abs(Math.sin(t * 7)) * 0.05 * S.talk * m;
    const hop = S.att * 0.18;
    const shakeX = Math.sin(t * 60) * 0.12 * S.shake;
    float.current.position.set(shakeX, bob + talkBounce + hop, 0);
    float.current.rotation.z = Math.sin(t * 1.1 + enterDelay) * 0.03 * m;

    headRef.current.rotation.y = damp(headRef.current.rotation.y, S.lookX * persona.turn, 6, dt);
    headRef.current.rotation.x = damp(
      headRef.current.rotation.x,
      -S.lookY * 0.22 + Math.sin(t * 7) * 0.05 * S.talk * m,
      6,
      dt
    );
    headRef.current.rotation.z = damp(headRef.current.rotation.z, S.think * 0.16 - S.att * 0.06, 5, dt);
    bodyRef.current.rotation.y = damp(bodyRef.current.rotation.y, S.lookX * 0.15, 4, dt);
    const breathe = 1 + Math.sin(t * 2.1 + enterDelay) * 0.015 * m;
    bodyRef.current.scale.set(1, breathe, 1);

    if (kind === 'proteus') {
      const a = Math.sin(t * 1.3) * 0.045 * m;
      headRef.current.scale.set(1 + a, 1 - a, 1 + a * 0.5);
    }

    /* --- eyes --- */
    eyes.current.position.x = S.lookX * 0.09;
    eyes.current.position.y = S.lookY * 0.06;
    const openY = Math.max(0.02, S.open * (1 - S.happy) * (1 - S.squint * 0.55));
    pills.current.forEach((e) => e && (e.scale.y = openY));
    const arcScale = Math.max(0.0001, S.happy * eyesOn);
    arcs.current.forEach((e) => e && e.scale.setScalar(arcScale));
    eyeColor.copy(glow).lerp(ERROR_RED, Math.min(1, S.err + S.shake));
    mats.eye.color.copy(eyeColor);
    (screenGlow.current.material as THREE.MeshBasicMaterial).opacity = (0.22 + S.talk * 0.12 + S.att * 0.1) * eyesOn;
    (screenGlow.current.material as THREE.MeshBasicMaterial).color.copy(eyeColor);

    /* --- mouth --- */
    const speak = S.talk * (0.35 + 0.65 * Math.abs(Math.sin(t * 13) * Math.sin(t * 5.3)));
    mouthBar.current.scale.set(Math.max(0.0001, S.talk) * (0.8 + speak * 0.6), Math.max(0.0001, 0.6 + speak * 2.2), 1);
    mouthBar.current.visible = S.talk > 0.02;
    mouthSmile.current.scale.setScalar(Math.max(0.0001, S.happy * (1 - S.talk) * eyesOn));

    /* --- hands --- */
    const wave = S.att;
    handR.current.position.set(
      0.98 + wave * 0.12,
      -0.72 + wave * 0.95 + Math.sin(t * 1.7 + 1) * 0.05 * m,
      0.12 + wave * 0.2
    );
    handR.current.position.x += Math.sin(t * 10) * 0.09 * wave * m;
    const gest = S.talk * (Math.sin(t * 4.6) * 0.5 + 0.5) * m;
    handR.current.position.y += gest * 0.25;
    handL.current.position.set(
      -0.98 + S.think * 0.62,
      -0.72 + Math.sin(t * 1.7) * 0.05 * m + S.think * 0.52 + gest * 0.18 * Math.sin(t * 3.1 + 1),
      0.12 + S.think * 0.55
    );

    /* --- glow parts --- */
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    mats.shell.emissiveIntensity = S.att * 0.05 + S.think * 0.04 * pulse + S.err * 0.1;
    mats.light.color.copy(accent).lerp(ERROR_RED, Math.min(1, S.err + S.shake));
    core.current.scale.setScalar(1 + S.think * 0.25 * pulse + S.talk * 0.15 * Math.abs(Math.sin(t * 7)));
    const thr = thruster.current.material as THREE.MeshBasicMaterial;
    thr.opacity = (0.45 + 0.15 * Math.sin(t * 9) * m + S.att * 0.2) * Math.min(1, enter);
    thruster.current.scale.setScalar(1.25 + S.att * 0.3 + Math.sin(t * 12) * 0.04 * m);

    /* --- thinking dots orbit above the head --- */
    thinkDots.current.visible = S.think > 0.02;
    thinkDots.current.rotation.y = t * 2.2;
    thinkDots.current.scale.setScalar(Math.max(0.0001, S.think));
    thinkDots.current.children.forEach((c, i) => {
      c.position.y = Math.sin(t * 4 + i * 2) * 0.08;
    });

    /* --- accessories --- */
    if (accessory.current) {
      if (kind === 'plutus') {
        accessory.current.rotation.z = t * 0.6;
        accessory.current.position.y = 1.32 + Math.sin(t * 2) * 0.04 * m;
      } else if (kind === 'hephaestus') {
        const spark = 0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 7.3) + S.think * 0.4 * pulse;
        accessory.current.scale.setScalar(spark);
      } else if (kind === 'hermes') {
        const flap = Math.sin(t * (3 + S.talk * 6 + S.think * 4)) * (0.18 + S.att * 0.15) * m;
        accessory.current.rotation.y = 0.35 + flap;
        if (accessory2.current) accessory2.current.rotation.y = -0.35 - flap;
      } else if (kind === 'proteus') {
        accessory.current.rotation.y = t * (0.9 + S.think * 1.5);
        accessory.current.rotation.x = Math.sin(t * 0.5) * 0.4;
      }
    }
  });

  const vz = head.front - 0.04; // visor centre
  const ez = vz + 0.085; // eye plane

  return (
    <group position={position}>
      <group ref={root}>
        {/* hit volume */}
        <mesh position={[0, 0.15, 0]} onPointerOver={onPointerOver} onPointerOut={onPointerOut} onClick={onClick}>
          <boxGeometry args={[2.6, BOT_TOP - BOT_BOTTOM, 1.8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>

        <group ref={float}>
          {/* ---------- head ---------- */}
          <group ref={headRef} position={[0, 0.62, 0]}>
            {head.shape === 'box' ? (
              <RoundedBox args={head.size} radius={head.radius} smoothness={4} material={mats.shell} />
            ) : (
              <mesh material={mats.shell} scale={[head.size[0] / 1.42, head.size[1] / 1.42, 1]}>
                <sphereGeometry args={[0.71, 48, 32]} />
              </mesh>
            )}

            {/* visor */}
            <RoundedBox args={[head.visor[0], head.visor[1], 0.16]} radius={0.075} smoothness={3} position={[0, 0.02, vz]} material={mats.visor} />
            <mesh ref={screenGlow} position={[0, 0.02, vz + 0.082]}>
              <planeGeometry args={[head.visor[0] * 0.95, head.visor[1] * 1.2]} />
              <meshBasicMaterial map={radial} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </mesh>

            {/* eyes */}
            <group ref={eyes} position={[0, 0.04, ez]}>
              {[-1, 1].map((s, i) => (
                <group key={s} position={[s * 0.25, 0, 0]}>
                  <mesh ref={(el) => (pills.current[i] = el)} geometry={geo.pill} material={mats.eye} />
                  <mesh ref={(el) => (arcs.current[i] = el)} geometry={geo.arc} material={mats.eye} position={[0, -0.04, 0]} />
                </group>
              ))}
              <mesh ref={mouthBar} geometry={geo.mouth} material={mats.eye} position={[0, -0.21, 0]} rotation-z={Math.PI / 2} />
              <mesh ref={mouthSmile} geometry={geo.smile} material={mats.eye} position={[0, -0.13, 0]} rotation-z={Math.PI} />
            </group>

            {/* personality: head-worn items */}
            {kind === 'plutus' && <Monocle gold={mats.metal} at={[0.25, 0.04, ez + 0.02]} />}
            {kind === 'hephaestus' && <Goggles strap={mats.metal} frame={mats.metal} lens={mats.lens} head={head.size} />}
            {kind === 'hermes' && <Headset band={mats.metal} accent={mats.accentSolid} light={mats.light} />}

            {/* thinking dots */}
            <group ref={thinkDots} position={[0, 0.95, 0]} visible={false}>
              {[0, 1, 2].map((i) => {
                const a = (i / 3) * Math.PI * 2;
                return <mesh key={i} geometry={geo.dot} material={mats.light} position={[Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55]} />;
              })}
            </group>

            {/* ---------- per-agent accessories ---------- */}
            {kind === 'plutus' && (
              <>
                <group ref={accessory} position={[0, 1.32, 0]} rotation-x={Math.PI / 2.25}>
                  <mesh material={mats.metal}>
                    <torusGeometry args={[0.5, 0.055, 16, 64]} />
                  </mesh>
                  <mesh material={mats.metal} position={[0.5, 0, 0]} rotation-x={Math.PI / 2}>
                    <cylinderGeometry args={[0.15, 0.15, 0.045, 32]} />
                  </mesh>
                </group>
                {[-1, 1].map((s) => (
                  <mesh key={s} material={mats.metal} position={[s * 0.88, 0.02, 0]} rotation-z={Math.PI / 2}>
                    <cylinderGeometry args={[0.24, 0.24, 0.1, 40]} />
                  </mesh>
                ))}
              </>
            )}

            {kind === 'hephaestus' && (
              <>
                <mesh material={mats.metal} position={[0.32, 0.88, 0]}>
                  <cylinderGeometry args={[0.025, 0.03, 0.5, 12]} />
                </mesh>
                <group ref={accessory} position={[0.32, 1.17, 0]}>
                  <mesh material={mats.light}>
                    <sphereGeometry args={[0.1, 24, 16]} />
                  </mesh>
                  <Billboard>
                    <mesh>
                      <planeGeometry args={[0.7, 0.7]} />
                      <meshBasicMaterial map={radial} color={palette.accent} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
                    </mesh>
                  </Billboard>
                </group>
                {[-1, 1].map((s) => (
                  <group key={s} position={[s * 0.8, 0, 0]}>
                    <mesh material={mats.metal} rotation-z={Math.PI / 2}>
                      <cylinderGeometry args={[0.26, 0.26, 0.12, 6]} />
                    </mesh>
                    {[-0.09, 0, 0.09].map((y) => (
                      <mesh key={y} material={mats.light} position={[s * 0.065, y, 0]}>
                        <boxGeometry args={[0.02, 0.035, 0.26]} />
                      </mesh>
                    ))}
                  </group>
                ))}
              </>
            )}

            {kind === 'hermes' &&
              [1, -1].map((s) => (
                <group key={s} ref={s === 1 ? accessory : accessory2} position={[s * 0.68, 0.08, -0.1]} rotation-y={s * 0.35}>
                  {[0, 1, 2].map((k) => (
                    <group key={k} rotation-z={s * (0.55 - k * 0.32)}>
                      <mesh material={k === 0 ? mats.accentSolid : mats.shell} position={[s * (0.32 - k * 0.04), 0, -0.05 * k]} rotation-z={Math.PI / 2} scale={[1, 1, 0.32]}>
                        <capsuleGeometry args={[0.09, 0.42 - k * 0.1, 8, 16]} />
                      </mesh>
                    </group>
                  ))}
                </group>
              ))}

            {kind === 'proteus' && (
              <group ref={accessory}>
                {[0, 1, 2].map((i) => {
                  const a = (i / 3) * Math.PI * 2;
                  return (
                    <mesh key={i} material={i === 1 ? mats.accentSolid : mats.shell} position={[Math.cos(a) * 1.15, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.15]} rotation={[a, a * 0.5, 0]}>
                      <octahedronGeometry args={[0.13 + i * 0.03, 0]} />
                    </mesh>
                  );
                })}
              </group>
            )}
          </group>

          {/* ---------- neck + body ---------- */}
          <mesh material={mats.metal} position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.17, 0.2, 0.2, 24]} />
          </mesh>
          <group ref={bodyRef} position={[0, -0.78, 0]}>
            <mesh geometry={geo.body} material={mats.body} scale={[1, 1.04, 0.88]} />
            <group position={[0, 0.05, 0.53]}>
              <mesh material={mats.visor} scale={[1, 1, 0.4]}>
                <sphereGeometry args={[0.2, 32, 16]} />
              </mesh>
              <mesh ref={core} material={mats.light} position={[0, 0, 0.06]}>
                <torusGeometry args={[0.11, 0.032, 12, 40]} />
              </mesh>
            </group>
          </group>

          {/* hands */}
          <group ref={handR} position={[0.98, -0.72, 0.12]}>
            <mesh geometry={geo.hand} material={mats.shell} />
            {kind === 'hephaestus' && <Hammer metal={mats.metal} accent={mats.accentSolid} />}
            {kind === 'proteus' && <MorphGem material={mats.gem} reduced={reducedMotion} />}
          </group>
          <group ref={handL} position={[-0.98, -0.72, 0.12]}>
            <mesh geometry={geo.hand} material={mats.shell} />
            {kind === 'plutus' && <FlipCoin gold={mats.accentSolid} reduced={reducedMotion} />}
            {kind === 'hermes' && <Magnifier frame={mats.metal} glow={palette.glow} />}
          </group>

          {/* personality: holographic work panels */}
          {panelTex && kind === 'plutus' && <HoloPanel texture={panelTex} position={[1.3, 1.3, -0.55]} rotationY={-0.3} activity={activity} />}
          {panelTex && kind === 'hephaestus' && <HoloPanel texture={panelTex} position={[-1.3, 1.3, -0.55]} rotationY={0.3} activity={activity} seed={2} />}

          {/* hover thruster glow */}
          <Billboard position={[0, -1.48, 0]}>
            <mesh ref={thruster}>
              <planeGeometry args={[1, 0.55]} />
              <meshBasicMaterial map={radial} color={palette.accent} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </mesh>
          </Billboard>
        </group>

        {children}
      </group>
    </group>
  );
};
