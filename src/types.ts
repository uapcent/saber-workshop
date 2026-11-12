/** A hilt outline: [x mm along the hilt from the pommel side, radius mm] pairs. */
export type Profile = [number, number][];

export type PartKind = 'emitter' | 'body' | 'pommel' | 'coupler' | 'ring';
export type MainPartKind = Exclude<PartKind, 'ring'>;
export type RingSlot = 'ringsTop' | 'ringsBottom';
export type Style = 'sword' | 'dagger' | 'staff';
export type Mask = 'standard' | 'extra';

/** A finish key from FINISHES, or `hex:#rrggbb` for a custom coating. */
export type FinishKey = string;

export interface PartChoice {
  model: string;
  finish: FinishKey;
}

export interface Saber {
  name: string;
  style: Style;
  blade: { on: boolean; color: string };
  emitter: PartChoice;
  ringsTop: PartChoice[];
  body: PartChoice;
  ringsBottom: PartChoice[];
  pommel: PartChoice;
  coupler: PartChoice;
  mask: Mask;
}

export interface Finish {
  name: string;
  color: string;
  /** Sold by the store (in at least one part). */
  store?: boolean;
  metallic?: boolean;
  gloss?: boolean;
  /**
   * Shading measured from the store photo: brightness percentiles 10, 30, 50, 75 and 92 of the part's
   * pixels (deep shadow, shadow, body, light, highlight). Without it shading is derived from `color`.
   */
  tones?: [string, string, string, string, string];
  /** Matte microtextured anodizing (broad soft highlight) or glossy (narrow sharp highlight). */
  sheen?: 'matte' | 'gloss';
  /** Surface texture: fine matte grain, or grain with glittering flakes. */
  texture?: 'grain' | 'sparkle';
  /** Stellar Eclipse: machined accents (the NXT emitter's slots) are cut back to bright bare metal. */
  polished?: boolean;
  custom?: boolean;
}

export interface PartModel {
  name: string;
  len: number;
  profile: Profile;
  /** Alternative outline with the extra pommel mask (Pommel Adaptor). */
  profileExtra?: Profile;
  /** Empty weight in grams, from the store's product description (or estimated from a part of the same shape). */
  weight?: number;
  legacy?: boolean;
  approx?: boolean;
  /** Edge lines drawn across the part (x mm). */
  facets?: number[];
  grooves?: number[];
  mark?: 'star' | 'tribe';
  /** Lines and holes drawn inside the outline (from data/details.json). */
  details?: SurfaceDetails;
}

/** mm; x along the hilt from the pommel side, y across it from the axis. */
export interface SurfaceDetails {
  /** [x, width, y0, y1] */
  grooves: [number, number, number, number][];
  /** [x, y, width, height] */
  holes: [number, number, number, number][];
  /** [x0, x1] */
  knurls: [number, number][];
  /** Areas of fine ribbing: [x0, x1, y0, y1] */
  ribs: [number, number, number, number][];
  /** Milled slots following a path, e.g. the NXT emitter's S-curves: points [x, y] and width. */
  slots?: { points: [number, number][]; width: number }[];
  /** Through-holes that show the blade's light when ignited: [x, y, diameter]. */
  lightHoles?: [number, number, number][];
}
