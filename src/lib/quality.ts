// Detail / quality controls applied during PNT quantization.
// These settings directly affect how much detail survives ARK's tiny
// 25-color palette in-game.

import { ARK_PALETTE } from "./ark-palette";

export type DitherAlgo =
  | "none"
  | "floyd"        // Floyd-Steinberg (default, balanced)
  | "atkinson"     // Atkinson (softer, classic Mac)
  | "jarvis"       // Jarvis-Judice-Ninke (smoother gradients)
  | "stucki"       // Stucki (sharper than Jarvis)
  | "sierra"       // Sierra-3
  | "burkes"       // Burkes (fast)
  | "bayer4"       // Ordered 4×4 Bayer (clean pattern, no noise)
  | "bayer8";      // Ordered 8×8 Bayer (finer pattern)

export type ColorMapMode = "rgb" | "weighted" | "lab";

export interface QualityOptions {
  ditherAlgo: DitherAlgo;
  /** 0..100 — how strongly the error is propagated (higher = more dither). */
  ditherStrength: number;
  /** Color matching strategy. Lab is perceptually accurate, slower. */
  colorMap: ColorMapMode;
  /** 0..100 unsharp mask applied at target resolution before quantize. */
  preSharpen: number;
  /** Snake/zigzag error diffusion — reduces directional artifacts. */
  serpentine: boolean;
  /** 0..100 — preserve edges by reducing dither near them. */
  edgePreserve: number;
}

export const DEFAULT_QUALITY: QualityOptions = {
  ditherAlgo: "floyd",
  ditherStrength: 100,
  colorMap: "weighted",
  preSharpen: 0,
  serpentine: true,
  edgePreserve: 0,
};

// ---------- Color mapping ----------

// sRGB → linear → XYZ → Lab (D65)
function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X / xn), fy = f(Y / yn), fz = f(Z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// Pre-cache Lab values for the palette
const PALETTE_LAB = ARK_PALETTE.map((c) => ({
  index: c.index,
  lab: rgbToLab(c.r, c.g, c.b),
  r: c.r, g: c.g, b: c.b,
}));

export function findClosest(
  r: number, g: number, b: number, a: number,
  enabled: Set<number>,
  mode: ColorMapMode
): number {
  if (a < 128) return 0;
  let best = 0, bestD = Infinity;

  if (mode === "lab") {
    const [L, A, B] = rgbToLab(r, g, b);
    for (const c of PALETTE_LAB) {
      if (!enabled.has(c.index)) continue;
      const dL = L - c.lab[0], dA = A - c.lab[1], dB = B - c.lab[2];
      const d = dL * dL + dA * dA + dB * dB;
      if (d < bestD) { bestD = d; best = c.index; }
    }
  } else if (mode === "rgb") {
    for (const c of ARK_PALETTE) {
      if (!enabled.has(c.index)) continue;
      const dr = r - c.r, dg = g - c.g, db = b - c.b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) { bestD = d; best = c.index; }
    }
  } else {
    // weighted (perceptual approximation, original behavior)
    for (const c of ARK_PALETTE) {
      if (!enabled.has(c.index)) continue;
      const dr = r - c.r, dg = g - c.g, db = b - c.b;
      const d = (2 + r / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r) / 256) * db * db;
      if (d < bestD) { bestD = d; best = c.index; }
    }
  }
  return best;
}

// ---------- Dither kernels (offsets relative to current pixel) ----------
// [dx, dy, weight] — divided by total sum
type Kernel = { offsets: [number, number, number][]; div: number };

export const KERNELS: Record<Exclude<DitherAlgo, "none" | "bayer4" | "bayer8">, Kernel> = {
  floyd: { div: 16, offsets: [[1,0,7],[-1,1,3],[0,1,5],[1,1,1]] },
  atkinson: { div: 8, offsets: [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]] },
  jarvis: { div: 48, offsets: [
    [1,0,7],[2,0,5],
    [-2,1,3],[-1,1,5],[0,1,7],[1,1,5],[2,1,3],
    [-2,2,1],[-1,2,3],[0,2,5],[1,2,3],[2,2,1],
  ]},
  stucki: { div: 42, offsets: [
    [1,0,8],[2,0,4],
    [-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],
    [-2,2,1],[-1,2,2],[0,2,4],[1,2,2],[2,2,1],
  ]},
  sierra: { div: 32, offsets: [
    [1,0,5],[2,0,3],
    [-2,1,2],[-1,1,4],[0,1,5],[1,1,4],[2,1,2],
    [-1,2,2],[0,2,3],[1,2,2],
  ]},
  burkes: { div: 32, offsets: [
    [1,0,8],[2,0,4],
    [-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],
  ]},
};

// 4×4 Bayer
export const BAYER4 = [
  [ 0, 8, 2,10],
  [12, 4,14, 6],
  [ 3,11, 1, 9],
  [15, 7,13, 5],
];
// 8×8 Bayer
export const BAYER8 = [
  [ 0,32, 8,40, 2,34,10,42],
  [48,16,56,24,50,18,58,26],
  [12,44, 4,36,14,46, 6,38],
  [60,28,52,20,62,30,54,22],
  [ 3,35,11,43, 1,33, 9,41],
  [51,19,59,27,49,17,57,25],
  [15,47, 7,39,13,45, 5,37],
  [63,31,55,23,61,29,53,21],
];

// ---------- Unsharp mask (pre-sharpen at target resolution) ----------
export function unsharpMask(data: Uint8ClampedArray, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  const a = amount / 100; // 0..1
  // 3×3 box blur as the low-pass
  const blurred = new Float32Array(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const i = (ny * w + nx) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; n++;
        }
      }
      const i = (y * w + x) * 4;
      blurred[i] = r / n; blurred[i+1] = g / n; blurred[i+2] = b / n;
    }
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = Math.max(0, Math.min(255, data[i]   + a * (data[i]   - blurred[i])));
    data[i+1] = Math.max(0, Math.min(255, data[i+1] + a * (data[i+1] - blurred[i+1])));
    data[i+2] = Math.max(0, Math.min(255, data[i+2] + a * (data[i+2] - blurred[i+2])));
  }
}

// ---------- Edge magnitude map (Sobel, luminance) ----------
export function edgeMap(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
  }
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -lum[i-w-1] -2*lum[i-1] -lum[i+w-1]
        + lum[i-w+1] +2*lum[i+1] +lum[i+w+1];
      const gy =
        -lum[i-w-1] -2*lum[i-w] -lum[i-w+1]
        + lum[i+w-1] +2*lum[i+w] +lum[i+w+1];
      out[i] = Math.min(1, Math.sqrt(gx*gx + gy*gy) / 255);
    }
  }
  return out;
}
