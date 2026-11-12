import { CATALOG, FINISHES, type Listing } from '../data/catalog';
import { MODELS, PART_LABEL, STYLES } from '../data/models';
import type { Finish, FinishKey, PartChoice, PartKind, Saber, Style } from '../types';

export const eur = (n: number) => '€' + n.toFixed(2).replace('.', ',');
export const cm = (mm: number, digits = 1) => (mm / 10).toFixed(digits);

const HEX_PREFIX = 'hex:';
export const isCustomColor = (key: FinishKey) => key.startsWith(HEX_PREFIX);
export const customColor = (hex: string): FinishKey => HEX_PREFIX + hex;

export function finishOf(key: FinishKey): Finish {
  if (isCustomColor(key)) {
    const color = key.slice(HEX_PREFIX.length);
    return { name: `Custom ${color.toUpperCase()}`, color, custom: true };
  }
  return FINISHES[key] ?? FINISHES.aluminum;
}

export type PartStatus =
  | { kind: 'legacy' }
  | ({ kind: 'store' } & Listing)
  /** Not sold in this finish: buy the aluminum base (if sold) and have it coated. */
  | { kind: 'coat'; base: Listing | null };

export function partStatus(kind: PartKind, { model, finish }: PartChoice): PartStatus {
  if (MODELS[kind][model].legacy) return { kind: 'legacy' };
  const listings = CATALOG[`${kind}.${model}`] ?? {};
  const listing = listings[finish];
  if (listing) return { kind: 'store', ...listing };
  return { kind: 'coat', base: listings.aluminum ?? null };
}

export interface PartRow {
  label: string;
  kind: PartKind;
  choice: PartChoice;
  quantity: number;
  len: number;
  status: PartStatus;
}

/** Hilt parts in order from the emitter down, with quantities for the chosen style. */
export function partRows(s: Saber): PartRow[] {
  const staff = s.style === 'staff';
  // A staff is two identical halves; a sword or a dagger is one hilt.
  const row = (label: string, kind: PartKind, choice: PartChoice, quantity = staff ? 2 : 1): PartRow => ({
    label,
    kind,
    choice,
    quantity,
    len: MODELS[kind][choice.model].len,
    status: partStatus(kind, choice),
  });
  const pommelLabel =
    PART_LABEL.pommel + (s.pommel.model === 'adaptor' ? (s.mask === 'extra' ? ' · extra mask' : ' · standard mask') : '');
  return [
    row(PART_LABEL.emitter, 'emitter', s.emitter),
    ...s.ringsTop.map((r) => row('Ring (emitter side)', 'ring', r)),
    row(PART_LABEL.body, 'body', s.body),
    ...s.ringsBottom.map((r) => row(staff ? 'Ring (coupler side)' : 'Ring (pommel side)', 'ring', r)),
    staff ? row(PART_LABEL.coupler, 'coupler', s.coupler, 1) : row(pommelLabel, 'pommel', s.pommel),
  ];
}

export interface Totals {
  rows: PartRow[];
  /** Price of the parts sold in the chosen finish. */
  store: number;
  /** Price of aluminum bases for parts to be coated. */
  bases: number;
  toCoat: number;
  outOfStock: number;
  discontinued: number;
  /** Overall hilt length in mm (both halves and coupler for a staff). */
  length: number;
  /** Weight in grams of the hilt parts whose weight is known (no Anima, weights or blade). */
  weight: number;
  /** Names of the parts with no known weight. */
  unweighed: string[];
}

export function totals(s: Saber): Totals {
  const rows = partRows(s);
  const t: Totals = { rows, store: 0, bases: 0, toCoat: 0, outOfStock: 0, discontinued: 0, length: 0, weight: 0, unweighed: [] };
  for (const r of rows) {
    const model = MODELS[r.kind][r.choice.model];
    if (model.weight === undefined) t.unweighed.push(model.name);
    else t.weight += model.weight * r.quantity;
    const st = r.status;
    if (st.kind === 'legacy') t.discontinued += r.quantity;
    else if (st.kind === 'store') {
      t.store += st.price * r.quantity;
      if (!st.inStock) t.outOfStock += r.quantity;
    } else {
      t.toCoat += r.quantity;
      if (st.base) t.bases += st.base.price * r.quantity;
    }
  }
  const half = rows.filter((r) => r.kind !== 'coupler' && r.kind !== 'pommel').reduce((sum, r) => sum + r.len, 0);
  t.length = s.style === 'staff' ? 2 * half + MODELS.coupler[s.coupler.model].len : half + MODELS.pommel[s.pommel.model].len;
  return t;
}

/* ---------- Tournament rules: INCOM ITR 4.0.3, rule 4.1 (ranges include the tolerance) ---------- */

type LengthClass = 'Under 18 cm' | 'Short' | 'Short or Long' | 'Long' | 'Between Long and Staff' | 'Staff' | 'Over 54 cm';

function classOf(mm: number): LengthClass {
  if (mm < 178) return 'Under 18 cm';
  if (mm < 258) return 'Short';
  if (mm <= 262) return 'Short or Long';
  if (mm <= 322) return 'Long';
  if (mm < 358) return 'Between Long and Staff';
  if (mm <= 542) return 'Staff';
  return 'Over 54 cm';
}

const FITS: Record<Style, { ok: LengthClass[]; want: string }> = {
  sword: { ok: ['Long', 'Short or Long'], want: 'Long class (25.8 to 32.2 cm)' },
  dagger: { ok: ['Short', 'Short or Long'], want: 'Short class (17.8 to 26.2 cm)' },
  staff: { ok: ['Staff'], want: 'Staff class (35.8 to 54.2 cm)' },
};

/** Hilt weight without the blade, in grams: the whole staff, or each dagger. */
export const HILT_WEIGHT: Record<Style, [min: number, max: number]> = {
  sword: [440, 730],
  dagger: [340, 630],
  staff: [520, 830],
};

const grams = (g: number) => `${Math.round(g)} g`;

/**
 * Weight of the hilt parts against the rule. Only the parts are counted (no Anima or balance weights), so
 * a light build is fine (weights make it up) and only a build already over the maximum is a problem.
 */
export function weightCheck(t: Totals, style: Style): { text: string; problem?: string } {
  const [min, max] = HILT_WEIGHT[style];
  const unknown = [...new Set(t.unweighed)];
  const parts = unknown.length ? `at least ${grams(t.weight)}` : grams(t.weight);
  const text = `${parts} · rule ${min} to ${max} g`;
  if (t.weight > max) {
    const what = STYLES[style].name.toLowerCase();
    return { text, problem: `The hilt parts weigh ${parts}, over the ${max} g maximum for a ${what}, before the Anima.` };
  }
  return { text };
}

export function lengthClass(mm: number, style: Style): { name: LengthClass; problem?: string } {
  const name = classOf(mm);
  const fit = FITS[style];
  if (fit.ok.includes(name)) return { name };
  const what = STYLES[style].name.toLowerCase();
  return { name, problem: `At ${cm(mm)} cm this build is outside the ${fit.want} for a ${what}.` };
}

export function warnings(s: Saber, t: Totals = totals(s)): string[] {
  const w: string[] = [];
  if (['sse1', 'sse2'].includes(s.body.model)) {
    const body = MODELS.body[s.body.model].name;
    if (['sse3', 'artiglio'].includes(s.emitter.model) && !s.ringsTop.length)
      w.push(`The ${body} needs an extra ring under the ${MODELS.emitter[s.emitter.model].name}.`);
    if (['sse3std', 'sse3extra'].includes(s.pommel.model) && !s.ringsBottom.length)
      w.push(`The ${body} needs an extra ring above the ${MODELS.pommel[s.pommel.model].name}.`);
  }
  const problem = lengthClass(t.length, s.style).problem;
  if (problem) w.push(problem);
  const heavy = weightCheck(t, s.style).problem;
  if (heavy) w.push(heavy);
  return w;
}

/*
 * ---------- Share codes ----------
 *
 * The site has no server to store sabers under a short id, so the code carries the whole saber. v2 packs it
 * into a few bytes (about 12 characters plus the name); v1 codes, base64 of the saber's JSON, still open.
 *
 * v2 bytes, then URL-safe base64 without padding:
 *   0     version (2)
 *   1     style (bits 0-1) · extra mask (2) · blade on (3) · rings on the emitter side (4-6)
 *   2     rings on the other side (bits 0-2) · blade color: index in BLADE_COLORS, 31 = three RGB bytes follow (3-7)
 *   then  emitter, emitter-side rings, body, other rings, pommel, coupler: one byte each, model index
 *         (bits 5-7, 7 = index in the next byte) and finish index (bits 0-4, 30 = index in the next byte,
 *         31 = custom color, three RGB bytes follow)
 *   rest  name, UTF-8
 *
 * The index lists below are part of the format: only ever append to them.
 */
const CODE_FINISHES = ['aluminum', 'dark', 'stellar', 'blood', 'cobalt', 'viridian', 'violet', 'sideral', 'lunar', 'solar', 'ygg', 'cremisi', 'fume', 'giada', 'magma', 'zaffiro', 'white', 'bone', 'gold', 'brass', 'rose', 'bronze', 'gunmetal', 'gloss'];
const CODE_MODELS: Record<PartKind, string[]> = {
  emitter: ['evo', 'nxt', 'evo2', 'x2', 'sse1', 'sse2', 'sse3', 'artiglio'],
  body: ['evo', 'mini', 'sse1', 'sse3', 'sse2'],
  pommel: ['evo', 'mini', 'adaptor', 'sse1', 'sse3std', 'sse3extra', 'sse2'],
  coupler: ['classic', 'heavy', 'evo', 'maori'],
  ring: ['plain', 'thin', 'logo', 'tribe'],
};
const CODE_STYLES: Style[] = ['sword', 'dagger', 'staff'];
const CODE_BLADE_COLORS = ['#4aa3ff', '#3ddc6a', '#ff3b30', '#a259ff', '#f4f4f4', '#ffb22e'];
const CODE_VERSION = 2;

const toB64Url = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function fromB64Url(code: string): Uint8Array {
  const b64 = code.trim().replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

const rgbBytes = (hex: string) => {
  const n = parseInt(/^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '888888', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hexOf = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

export function encodeSaber(s: Saber): string {
  const out: number[] = [CODE_VERSION];
  const top = s.ringsTop.slice(0, 7);
  const bottom = s.ringsBottom.slice(0, 7);
  out.push(Math.max(0, CODE_STYLES.indexOf(s.style)) | (s.mask === 'extra' ? 4 : 0) | (s.blade.on ? 8 : 0) | (top.length << 4));
  const blade = CODE_BLADE_COLORS.indexOf(s.blade.color.toLowerCase());
  out.push(bottom.length | ((blade < 0 ? 31 : blade) << 3));
  if (blade < 0) out.push(...rgbBytes(s.blade.color));

  const part = (kind: PartKind, p: PartChoice) => {
    const m = Math.max(0, CODE_MODELS[kind].indexOf(p.model));
    const f = CODE_FINISHES.indexOf(p.finish);
    const custom = isCustomColor(p.finish);
    const fBits = custom ? 31 : f < 0 ? 0 : f < 30 ? f : 30;
    out.push((Math.min(m, 7) << 5) | fBits);
    if (m >= 7) out.push(m);
    if (fBits === 30) out.push(f);
    if (custom) out.push(...rgbBytes(p.finish.slice(HEX_PREFIX.length)));
  };
  part('emitter', s.emitter);
  top.forEach((r) => part('ring', r));
  part('body', s.body);
  bottom.forEach((r) => part('ring', r));
  part('pommel', s.pommel);
  part('coupler', s.coupler);
  out.push(...new TextEncoder().encode(s.name));
  return toB64Url(Uint8Array.from(out));
}

/** The saber in a v2 code, unchecked (normalizeSaber validates it). */
function decodeCompact(bytes: Uint8Array): unknown {
  let i = 1;
  const next = () => {
    if (i >= bytes.length) throw new Error('Share code is cut short');
    return bytes[i++];
  };
  const flags = next();
  const second = next();
  const bladeIndex = second >> 3;
  const color = bladeIndex === 31 ? hexOf(next(), next(), next()) : CODE_BLADE_COLORS[bladeIndex] ?? CODE_BLADE_COLORS[0];
  const part = (kind: PartKind): PartChoice => {
    const b = next();
    let m = b >> 5;
    let f = b & 31;
    if (m === 7) m = next();
    let finish: FinishKey;
    if (f === 31) finish = customColor(hexOf(next(), next(), next()));
    else {
      if (f === 30) f = next();
      finish = CODE_FINISHES[f] ?? 'aluminum';
    }
    return { model: CODE_MODELS[kind][m] ?? '', finish };
  };
  const emitter = part('emitter');
  const ringsTop = Array.from({ length: (flags >> 4) & 7 }, () => part('ring'));
  const body = part('body');
  const ringsBottom = Array.from({ length: second & 7 }, () => part('ring'));
  const pommel = part('pommel');
  const coupler = part('coupler');
  return {
    name: new TextDecoder().decode(bytes.slice(i)),
    style: CODE_STYLES[flags & 3] ?? 'sword',
    mask: flags & 4 ? 'extra' : 'standard',
    blade: { on: !!(flags & 8), color },
    emitter,
    ringsTop,
    body,
    ringsBottom,
    pommel,
    coupler,
  };
}

export function decodeSaber(code: string): unknown {
  const bytes = fromB64Url(code);
  // v1 codes are JSON, so their first byte is "{"; v2 codes start with the version.
  if (bytes[0] === CODE_VERSION) return decodeCompact(bytes);
  return JSON.parse(new TextDecoder().decode(bytes));
}

/* ---------- Share links: the share code in the URL hash, #s=<code> ---------- */

const LINK_HASH = /#s=([A-Za-z0-9+/=_-]+)/;

/** A link to this page that opens the saber. */
export function shareLink(s: Saber): string {
  return `${location.origin}${location.pathname}#s=${encodeSaber(s)}`;
}

/** The share code inside a pasted link (or the text itself, for a bare v1 share code). */
export function shareCodeOf(text: string): string {
  return text.match(LINK_HASH)?.[1] ?? text.trim();
}

/** The share code in the current URL, if it is a share link. */
export function shareCodeInUrl(): string | null {
  return location.hash.match(LINK_HASH)?.[1] ?? null;
}
