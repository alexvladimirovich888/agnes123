import * as THREE from 'three';

let radialTex: THREE.Texture | null = null;

/** Soft round falloff texture shared by every glow sprite. */
export function getRadialTexture() {
  if (radialTex) return radialTex;
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  radialTex = new THREE.CanvasTexture(cv);
  return radialTex;
}

export const easeOutBack = (x: number) => {
  const c1 = 1.6;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
