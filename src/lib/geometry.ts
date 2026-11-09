import { useId } from 'react';
import type { Finish, Profile } from '../types';
import { darken, lighten, luminance } from './color';

const f2 = (n: number) => n.toFixed(2);

/** Closed outline of a turned part: the profile above the axis, mirrored below it. */
export function outlinePath(profile: Profile, x0: number): string {
  const top = profile.map(([x, r]) => `${f2(x0 + x)},${f2(-r)}`);
  const bottom = [...profile].reverse().map(([x, r]) => `${f2(x0 + x)},${f2(r)}`);
  return `M${top.join(' L')} L${bottom.join(' L')}Z`;
}

/** Radius at x, interpolated along the profile. */
export function radiusAt(profile: Profile, x: number): number {
  for (let i = 1; i < profile.length; i++) {
    const [x1, r1] = profile[i - 1];
    const [x2, r2] = profile[i];
    if (x <= x2) return r1 + (r2 - r1) * ((x - x1) / (x2 - x1 || 1));
  }
  return profile[profile.length - 1][1];
}

export interface TurnedEdge {
  x: number;
  /** Half-height of the line: the smaller radius on either side of the edge. */
  r: number;
  /** Convex edges (shoulders) catch light; concave ones (inner corners) collect shadow. */
  convex: boolean;
  /** 0 to 1, how sharp the corner is. */
  strength: number;
}

const MIN_CORNER = 0.35; // rad (20°): gentler bends read as a smooth curve, not an edge

/** Circumferential edges a lathe leaves wherever the outline turns a corner. */
export function turnedEdges(profile: Profile): TurnedEdge[] {
  const edges: TurnedEdge[] = [];
  for (let i = 1; i < profile.length - 1; i++) {
    const [x0, r0] = profile[i - 1];
    const [x1, r1] = profile[i];
    const [x2, r2] = profile[i + 1];
    const turn = Math.atan2(r2 - r1, x2 - x1) - Math.atan2(r1 - r0, x1 - x0);
    if (Math.abs(turn) < MIN_CORNER) continue;
    const prev = edges[edges.length - 1];
    if (prev && x1 - prev.x < 0.6) continue;
    edges.push({ x: x1, r: Math.min(r0, r1, r2), convex: turn < 0, strength: Math.min(1, Math.abs(turn) / (Math.PI / 2)) });
  }
  return edges;
}

/**
 * Each straight run of the outline is a cone; cones facing the light (left, toward the pommel)
 * are a touch brighter, those facing away a touch darker. Returns [x0, x1, signed shade] bands.
 */
export function coneShading(profile: Profile): [number, number, number][] {
  const bands: [number, number, number][] = [];
  for (let i = 1; i < profile.length; i++) {
    const [x0, r0] = profile[i - 1];
    const [x1, r1] = profile[i];
    if (x1 - x0 < 0.05) continue;
    const shade = Math.atan2(r1 - r0, x1 - x0) / (Math.PI / 2); // -1 (facing right) .. 1 (facing left)
    if (Math.abs(shade) > 0.04) bands.push([x0, x1, shade]);
  }
  return bands;
}

export function starPath(cx: number, cy: number, R: number): string {
  let p = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    p += (i ? 'L' : 'M') + f2(cx + r * Math.cos(a)) + ',' + f2(cy + r * Math.sin(a));
  }
  return p + 'Z';
}

/** Vertical shading for a cylinder in the given finish: [offset, color] stops. */
export function shadingStops(f: Finish): [number, string][] {
  if (f.tones) {
    const [deep, shadow, body, light, high] = f.tones;
    // Lit from above: highlight a quarter of the way down, body color through the middle, shadow underneath.
    // Matte anodizing spreads the highlight into a broad soft band; gloss keeps it narrow and sharp.
    return f.sheen === 'gloss'
      ? [[0, deep], [0.12, shadow], [0.2, light], [0.25, high], [0.31, light], [0.42, body], [0.7, body], [0.88, shadow], [1, deep]]
      : [[0, deep], [0.1, shadow], [0.22, light], [0.32, high], [0.44, light], [0.6, body], [0.84, shadow], [1, deep]];
  }
  const c = f.color;
  const L = (t: number) => lighten(c, t);
  const D = (t: number) => darken(c, t);
  if (f.metallic) return [[0, D(0.55)], [0.1, D(0.15)], [0.26, L(0.62)], [0.36, L(0.22)], [0.56, c], [0.8, D(0.3)], [1, D(0.62)]];
  if (f.gloss) return [[0, '#000000'], [0.17, '#26262a'], [0.23, '#9d9da3'], [0.29, '#26262a'], [0.6, c], [1, '#000000']];
  if (luminance(c) > 0.6) return [[0, D(0.38)], [0.2, L(0.55)], [0.34, L(0.22)], [0.6, c], [0.85, D(0.12)], [1, D(0.36)]];
  return [[0, D(0.6)], [0.18, L(0.3)], [0.32, L(0.12)], [0.58, c], [0.85, D(0.3)], [1, D(0.62)]];
}

/** A document-unique id that is safe inside SVG `url(#…)` references. */
export function useSvgId(): string {
  return 'svg' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
}
