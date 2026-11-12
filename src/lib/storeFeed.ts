import { useEffect, useState } from 'react';
import { FINISHES, SNAPSHOT, applyLivePrices, type LivePrices } from '../data/catalog';
import { MODELS } from '../data/models';
import type { PartKind } from '../types';

/**
 * Live store check, done entirely in the browser: lamadiluce.it runs WooCommerce, whose public
 * Store API lists every product with price and stock, and allows cross-origin reads. We compare it
 * with the catalog built into the app (src/data/catalog.ts) to tell what changed since then.
 */
const API = 'https://lamadiluce.it/wp-json/wc/store/v1/products';

/** Store categories that hold hilt parts (complete sabers, blades and internals are left out). */
const PART_CATEGORIES = ['emitters', 'main-bodies', 'pommels', 'rings', 'couplers'];
/** Store categories of complete sabers and saber parts, with their subcategories. */
const SABER_CATEGORIES = ['saber-parts', 'combat-ready-light-sabers', 'colored-polaris', 'polaris-basic', 'combat-blades', 'anima-components', 'weights'];
/** "Polaris EVO Mini Main Body – Mk90", "Polaris NXT Emitter – Solar Eclipse"… but not "Polaris EVO Hilt" or "Basic". */
const PART_NAME = /^Polaris\b.*\b(Emitter|Main Body|Pommel|Rings?|Coupler)\b/i;
/**
 * The full product list is slow to fetch (several pages, several seconds) and the store changes slowly,
 * so one check a day is kept in localStorage and reused by every visit and tab until the date changes.
 */
const CACHE_KEY = 'saberWorkshop.storeCheck.daily.v2';
/** Earlier caches, in shapes this version no longer reads. */
const OLD_CACHE_KEYS = ['saberWorkshop.storeCheck', 'saberWorkshop.storeCheck.daily'];
const today = () => new Date().toDateString();

interface StoreProduct {
  id: number;
  name: string;
  permalink: string;
  is_in_stock: boolean;
  is_password_protected: boolean;
  on_sale: boolean;
  prices: { price: string; regular_price: string; currency_minor_unit: number };
  categories: { slug: string }[];
}

/** `sale-part` and `sale-other`: on sale in the store, any product (a backpack too), split by sabers and parts and the rest. */
export type UpdateKind = 'new' | 'sale-part' | 'sale-other' | 'in-stock' | 'out-of-stock' | 'price' | 'gone';

export interface StoreUpdate {
  /** Stable across visits, so "seen" can be remembered. */
  key: string;
  kind: UpdateKind;
  title: string;
  detail: string;
  url: string;
}

export interface StoreCheck {
  /** When the store was read (ms since epoch). */
  time: number;
  updates: StoreUpdate[];
  /** Price and stock of every catalog product the store still lists. */
  live: LivePrices;
}

const decode = (html: string) => new DOMParser().parseFromString(html, 'text/html').documentElement.textContent ?? html;
const eur = (n: number) => '€' + n.toFixed(2).replace('.', ',');
const productUrl = (id: number) => `https://lamadiluce.it/?post_type=product&p=${id}`;

async function fetchProducts(): Promise<StoreProduct[]> {
  const all: StoreProduct[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${API}?per_page=100&page=${page}`);
    if (!res.ok) throw new Error(`Store answered ${res.status}`);
    const batch: StoreProduct[] = await res.json();
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/** Our name for a catalog entry, e.g. "EVO Emitter · Lunar Mist". */
function catalogEntries() {
  const entries = new Map<number, { name: string; price: number; inStock: boolean }>();
  for (const [part, listings] of Object.entries(SNAPSHOT)) {
    const [kind, model] = part.split('.') as [PartKind, string];
    for (const [finish, l] of Object.entries(listings)) {
      const finishName = Object.keys(listings).length > 1 || finish !== 'aluminum' ? ` · ${FINISHES[finish].name}` : '';
      entries.set(l.id, { name: MODELS[kind][model].name + finishName, price: l.price, inStock: l.inStock });
    }
  }
  return entries;
}

/** Hilt parts in the store but not in the app, and stock, price or listing changes for the ones we have. */
let pending: Promise<StoreCheck> | null = null;

export async function checkStore(): Promise<StoreCheck> {
  try {
    sessionStorage.removeItem(OLD_CACHE_KEYS[0]);
    localStorage.removeItem(OLD_CACHE_KEYS[1]);
    const cached: StoreCheck | null = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached?.live && new Date(cached.time).toDateString() === today()) return cached;
  } catch {
    /* no cache */
  }
  // Calls made while a check is running (React's second effect run, say) wait for it instead of starting another.
  const check = await (pending ??= fetchProducts().then(compare).finally(() => (pending = null)));
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(check));
  } catch {
    /* not cached: the next visit checks again */
  }
  return check;
}

export type StoreState = { status: 'checking' } | { status: 'failed' } | ({ status: 'live' } & StoreCheck);

/** Reads the store once, overlays its prices and stock on the catalog, and re-renders when they arrive. */
export function useStoreCheck(): StoreState {
  const [state, setState] = useState<StoreState>({ status: 'checking' });
  useEffect(() => {
    let alive = true;
    checkStore()
      .then((check) => {
        if (!alive) return;
        applyLivePrices(check.live);
        setState({ status: 'live', ...check });
      })
      .catch(() => alive && setState({ status: 'failed' }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

function compare(products: StoreProduct[]): StoreCheck {
  const known = catalogEntries();
  const updates: StoreUpdate[] = [];
  const live: LivePrices = {};
  const listed = new Set<number>();

  for (const p of products) {
    listed.add(p.id);
    const unit = 10 ** p.prices.currency_minor_unit;
    const price = Number(p.prices.price) / unit;
    const regular = Number(p.prices.regular_price) / unit;
    const onSale = p.on_sale && regular - price > 0.005;
    const slugs = p.categories.map((c) => c.slug);
    const limited = slugs.includes('limited-edition');
    const ours = known.get(p.id);
    const url = p.permalink || productUrl(p.id);
    if (ours) live[p.id] = { price, inStock: p.is_in_stock, ...(onSale && { regular }), ...(limited && { limited }) };
    // Limited, members-only and uncategorized parts sit outside the part categories, so match their names too.
    const isHiltPart = slugs.some((s) => PART_CATEGORIES.includes(s)) || PART_NAME.test(decode(p.name));
    // Sale alerts group complete sabers and any saber part (blades and Anima components too) apart from the rest.
    const isPart = !!ours || isHiltPart || slugs.some((s) => SABER_CATEGORIES.includes(s));

    // Password-protected products are academy bulk deals, not something to buy from the site.
    if (onSale && !p.is_password_protected) {
      const off = Math.round((1 - price / regular) * 100);
      updates.push({
        // A new sale price is a new alert.
        key: `sale:${p.id}:${price}`,
        kind: isPart ? 'sale-part' : 'sale-other',
        title: ours?.name ?? decode(p.name),
        detail: `${eur(price)}, was ${eur(regular)} · −${off}%${limited ? ' · limited edition' : ''}${p.is_in_stock ? '' : ' · out of stock'}`,
        url,
      });
    }

    if (!ours) {
      if (!isHiltPart) continue;
      updates.push({
        key: `new:${p.id}`,
        kind: 'new',
        title: decode(p.name),
        detail: `${eur(price)} · ${p.is_in_stock ? 'in stock' : 'out of stock'}${limited ? ' · limited edition' : ''}${slugs.includes('restricted') ? ' · members only' : ''}`,
        url,
      });
      continue;
    }
    if (p.is_in_stock !== ours.inStock) {
      updates.push({
        key: `${p.is_in_stock ? 'in' : 'out'}:${p.id}`,
        kind: p.is_in_stock ? 'in-stock' : 'out-of-stock',
        title: ours.name,
        detail: p.is_in_stock ? `Back in stock · ${eur(price)}` : 'Now out of stock',
        url,
      });
    }
    // A price change that is the sale itself is already in the sale alert.
    if (Math.abs(price - ours.price) > 0.005 && !onSale) {
      updates.push({
        key: `price:${p.id}:${price}`,
        kind: 'price',
        title: ours.name,
        detail: `Now ${eur(price)}, was ${eur(ours.price)}`,
        url,
      });
    }
  }

  for (const [id, ours] of known) {
    if (!listed.has(id)) {
      updates.push({ key: `gone:${id}`, kind: 'gone', title: ours.name, detail: 'No longer listed in the store', url: productUrl(id) });
    }
  }
  return { time: Date.now(), updates, live };
}
