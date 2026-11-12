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

/* ---------- Share codes: base64 of the UTF-8 JSON (same format as v1) ---------- */

export function encodeSaber(s: Saber): string {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
}

export function decodeSaber(code: string): unknown {
  // Links carry the code in URL-safe base64 (- and _ instead of + and /, no padding).
  const b64 = code.trim().replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/* ---------- Share links: the share code in the URL hash, #s=<code> ---------- */

const LINK_HASH = /#s=([A-Za-z0-9+/=_-]+)/;

/** A link to this page that opens the saber. */
export function shareLink(s: Saber): string {
  const code = encodeSaber(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${location.pathname}#s=${code}`;
}

/** The share code inside a pasted link (or the text itself, for a bare v1 share code). */
export function shareCodeOf(text: string): string {
  return text.match(LINK_HASH)?.[1] ?? text.trim();
}

/** The share code in the current URL, if it is a share link. */
export function shareCodeInUrl(): string | null {
  return location.hash.match(LINK_HASH)?.[1] ?? null;
}
