import { useEffect, useReducer } from 'react';
import { PRESETS, normalizeSaber } from '../data/models';
import type { MainPartKind, Mask, PartChoice, RingSlot, Saber, Style } from '../types';

export const MAX_SABERS = 4;
export const MAX_RINGS = 6;
const MAX_SAVED = 30;
/** localStorage key, unchanged from v1 so existing designs carry over. */
const STORAGE_KEY = 'saberWorkshop.v1';

export interface SavedDesign {
  name: string;
  saber: Saber;
}

/** A saber open in the workshop. */
export interface Slot {
  /** Stable key for React lists. */
  uid: string;
  saber: Saber;
  /** Drawn in the compare section (to-scale view, size chart, summary). */
  compare: boolean;
}

export interface WorkshopState {
  active: number;
  slots: Slot[];
  saved: SavedDesign[];
}

export type Action =
  | { type: 'select'; index: number }
  | { type: 'add'; saber: Saber }
  | { type: 'duplicate' }
  | { type: 'remove'; index: number }
  | { type: 'toggleCompare'; index: number }
  | { type: 'loadPreset'; key: string }
  | { type: 'setName'; name: string }
  | { type: 'setStyle'; style: Style }
  | { type: 'setBlade'; on?: boolean; color?: string }
  | { type: 'setMask'; mask: Mask }
  | { type: 'setPart'; kind: MainPartKind; patch: Partial<PartChoice> }
  | { type: 'setRing'; slot: RingSlot; index: number; patch: Partial<PartChoice> }
  | { type: 'addRing'; slot: RingSlot }
  | { type: 'removeRing'; slot: RingSlot; index: number }
  | { type: 'save' }
  /** Keep a saber (e.g. one opened from a share link) in the saved designs without opening it. */
  | { type: 'saveSaber'; saber: Saber }
  | { type: 'deleteSaved'; index: number };

const copy = <T,>(o: T): T => structuredClone(o);
let uidCounter = 0;
const newSlot = (saber: Saber, compare = true): Slot => ({ uid: `s${Date.now().toString(36)}${uidCounter++}`, saber: copy(saber), compare });

function withActive(state: WorkshopState, update: (s: Saber) => Saber): WorkshopState {
  return { ...state, slots: state.slots.map((slot, i) => (i === state.active ? { ...slot, saber: update(slot.saber) } : slot)) };
}

function saveDesign(state: WorkshopState, s: Saber): WorkshopState {
  return { ...state, saved: [{ name: s.name || 'Untitled', saber: copy(s) }, ...state.saved].slice(0, MAX_SAVED) };
}

function reducer(state: WorkshopState, action: Action): WorkshopState {
  switch (action.type) {
    case 'select':
      return { ...state, active: Math.max(0, Math.min(action.index, state.slots.length - 1)) };
    case 'add':
      if (state.slots.length >= MAX_SABERS) return state;
      return { ...state, slots: [...state.slots, newSlot(action.saber)], active: state.slots.length };
    case 'duplicate': {
      if (state.slots.length >= MAX_SABERS) return state;
      const s = state.slots[state.active].saber;
      return { ...state, slots: [...state.slots, newSlot({ ...s, name: `${s.name || 'Untitled'} (copy)` })], active: state.slots.length };
    }
    case 'remove': {
      if (state.slots.length <= 1) return state;
      const slots = state.slots.filter((_, i) => i !== action.index);
      const active = action.index < state.active ? state.active - 1 : Math.min(state.active, slots.length - 1);
      return { ...state, slots, active };
    }
    case 'toggleCompare':
      return { ...state, slots: state.slots.map((s, i) => (i === action.index ? { ...s, compare: !s.compare } : s)) };
    case 'loadPreset':
      return PRESETS[action.key] ? withActive(state, () => copy(PRESETS[action.key])) : state;
    case 'setName':
      return withActive(state, (s) => ({ ...s, name: action.name }));
    case 'setStyle':
      return withActive(state, (s) => ({ ...s, style: action.style }));
    case 'setBlade':
      return withActive(state, (s) => ({ ...s, blade: { on: action.on ?? true, color: action.color ?? s.blade.color } }));
    case 'setMask':
      return withActive(state, (s) => ({ ...s, mask: action.mask }));
    case 'setPart':
      return withActive(state, (s) => ({ ...s, [action.kind]: { ...s[action.kind], ...action.patch } }));
    case 'setRing':
      return withActive(state, (s) => ({
        ...s,
        [action.slot]: s[action.slot].map((r, i) => (i === action.index ? { ...r, ...action.patch } : r)),
      }));
    case 'addRing':
      return withActive(state, (s) => {
        const rings = s[action.slot];
        if (rings.length >= MAX_RINGS) return s;
        const next = rings.length ? { ...rings[rings.length - 1] } : { model: 'plain', finish: 'aluminum' };
        return { ...s, [action.slot]: [...rings, next] };
      });
    case 'removeRing':
      return withActive(state, (s) => ({ ...s, [action.slot]: s[action.slot].filter((_, i) => i !== action.index) }));
    case 'save':
      return saveDesign(state, state.slots[state.active].saber);
    case 'saveSaber':
      return saveDesign(state, action.saber);
    case 'deleteSaved':
      return { ...state, saved: state.saved.filter((_, i) => i !== action.index) };
  }
}

/** Stored shape (same key as v1, which had exactly two sabers and no `compare`). */
interface Stored {
  state?: { active?: number; sabers?: unknown[]; compare?: boolean[] };
  saved?: SavedDesign[];
}

function loadInitial(): WorkshopState {
  let stored: Stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    /* unreadable: start fresh */
  }
  const saved = Array.isArray(stored.saved) ? stored.saved.filter((d) => normalizeSaber(d?.saber)) : [];
  const raw = Array.isArray(stored.state?.sabers) ? stored.state.sabers : [];
  const slots = raw
    .map((s, i) => {
      const saber = normalizeSaber(s);
      return saber && newSlot(saber, stored.state?.compare?.[i] ?? true);
    })
    .filter((s): s is Slot => !!s)
    .slice(0, MAX_SABERS);
  if (!slots.length) return { active: 0, slots: [newSlot(PRESETS.yin)], saved };
  const active = Math.min(Math.max(0, stored.state?.active ?? 0), slots.length - 1);
  return { active, slots, saved };
}

export function useWorkshop() {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  useEffect(() => {
    const stored: Stored = {
      state: { active: state.active, sabers: state.slots.map((s) => s.saber), compare: state.slots.map((s) => s.compare) },
      saved: state.saved,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* storage unavailable: designs just aren't remembered */
    }
  }, [state]);
  return [state, dispatch] as const;
}
