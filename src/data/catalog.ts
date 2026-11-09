import type { Finish } from '../types';

/** Prices and stock: lamadiluce.it store, 9 Nov 2026. */

type Tones = NonNullable<Finish['tones']>;

/** Matte "Microtextured Color" anodizing of the EVO parts, tones sampled from the product photo. */
const microtextured = (name: string, tones: Tones, texture: Finish['texture'] = 'grain'): Finish => ({
  name,
  color: tones[2],
  tones,
  sheen: 'matte',
  texture,
  store: true,
});
/** Glossy anodizing of the thin rings, tones sampled from the product photo. */
const glossy = (name: string, tones: Tones): Finish => ({ name, color: tones[2], tones, sheen: 'gloss', store: true });

/*
 * Store finishes: tones are brightness percentiles (10/30/50/75/92) of the part's pixels in the
 * lamadiluce.it product photos, 9 Nov 2026. Solar Flare has only a photo of a lit saber, so its color is estimated.
 * The Cremisi and Magma highlights are toned down by hand: their top percentile caught white studio reflections.
 */
export const FINISHES: Record<string, Finish> = {
  aluminum: { name: 'Aluminum', color: '#a7a8ab', tones: ['#606163', '#88898c', '#a7a8ab', '#cfced2', '#e0e0e3'], sheen: 'gloss', metallic: true, store: true },
  dark: microtextured('Dark Matter', ['#121212', '#1d1d1e', '#2c2c2d', '#535557', '#767678']),
  stellar: { ...microtextured('Stellar Eclipse', ['#04060a', '#1b2225', '#2d353a', '#596264', '#94a0a2']), polished: true },
  blood: microtextured('Blood Moon', ['#730e0f', '#a7373a', '#d04d4f', '#f67778', '#fa9a99']),
  cobalt: microtextured('Cobalt Nebula', ['#193173', '#284289', '#3d5eb6', '#5d81d8', '#879edc']),
  viridian: microtextured('Viridian Aurora', ['#155836', '#21714f', '#3ba078', '#65be9e', '#85daba']),
  violet: microtextured('Violet Plasma', ['#64305e', '#7d4679', '#90548c', '#c17abb', '#d893d2']),
  sideral: microtextured('Sideral Dust', ['#2f2e32', '#59595f', '#6f7076', '#7f7f87', '#8b8b93'], 'sparkle'),
  lunar: microtextured('Lunar Mist', ['#595959', '#a1a1a1', '#b0b0b0', '#cfcfcf', '#e0e0e0']),
  solar: { name: 'Solar Flare', color: '#de5f1c', sheen: 'matte', texture: 'grain', store: true },
  ygg: microtextured('Yggdrasil Mantle', ['#533a2b', '#684a36', '#805d44', '#a17a5d', '#b58e6f']),
  cremisi: glossy('Cremisi', ['#52191c', '#5a1b1e', '#661e21', '#793133', '#a0565c']),
  fume: glossy('Fumé', ['#3e4859', '#485466', '#4e5c70', '#65758d', '#8b9fb9']),
  giada: glossy('Giada', ['#172f19', '#1e361f', '#223d23', '#365236', '#5c7165']),
  magma: glossy('Magma', ['#933222', '#a03724', '#ae4027', '#bf614d', '#d98a72']),
  zaffiro: glossy('Zaffiro', ['#063f85', '#08458f', '#0f4c96', '#2669b1', '#668dc4']),
  // Custom coatings (not sold by the store)
  white: { name: 'White', color: '#eceae5' },
  bone: { name: 'Bone / ivory', color: '#e0d8c3' },
  gold: { name: 'Gold', color: '#c9a144', metallic: true },
  brass: { name: 'Brass', color: '#b38c3b', metallic: true },
  rose: { name: 'Rose gold', color: '#c48c78', metallic: true },
  bronze: { name: 'Bronze', color: '#8c5b31', metallic: true },
  gunmetal: { name: 'Gunmetal', color: '#3c3f45', metallic: true },
  gloss: { name: 'Gloss black', color: '#0f0f11', gloss: true },
};

export interface Listing {
  id: number;
  price: number;
  inStock: boolean;
}

type RawListings = Record<string, [id: number, price: number, inStock: 0 | 1]>;

/** Store listings per `kind.model`, per finish: [product id, price €, in stock]. */
const RAW_CATALOG: Record<string, RawListings> = {
  'emitter.evo': { viridian: [3171, 47.5, 1], ygg: [2502, 47.5, 0], violet: [2500, 47.5, 0], sideral: [2497, 47.5, 1], lunar: [2495, 47.5, 0], dark: [2494, 47.5, 1], cobalt: [2493, 47.5, 1], blood: [2486, 47.5, 1], aluminum: [1896, 45, 1] },
  'emitter.nxt': { stellar: [4807, 80, 1], aluminum: [4775, 65, 1] },
  'emitter.evo2': { aluminum: [1598, 59, 1] },
  'body.evo': { cobalt: [2985, 125, 1], blood: [2983, 125, 1], dark: [2987, 125, 1], ygg: [2994, 125, 1], viridian: [2993, 125, 1], sideral: [2989, 125, 1], violet: [2991, 125, 1], aluminum: [1900, 99, 1] },
  'body.mini': { lunar: [2996, 90, 1], dark: [2913, 90, 1], aluminum: [1642, 75, 1] },
  'pommel.evo': { blood: [2998, 47.5, 1], sideral: [3002, 47.5, 1], dark: [3000, 47.5, 1], cobalt: [2999, 47.5, 1], violet: [3004, 47.5, 0], viridian: [3005, 47.5, 1], ygg: [3006, 47.5, 1], aluminum: [1902, 45, 0], solar: [2563, 59, 0] },
  'pommel.mini': { lunar: [3274, 40, 1], dark: [2918, 40, 1], aluminum: [1623, 35, 1] },
  'pommel.adaptor': { aluminum: [3452, 35, 1] },
  'ring.plain': { violet: [2556, 18, 0], viridian: [2443, 18, 1], sideral: [2422, 18, 1], solar: [2380, 18, 1], lunar: [2359, 18, 1], dark: [2338, 18, 1], cobalt: [2233, 18, 1], blood: [2170, 18, 1], aluminum: [2149, 8, 1] },
  'ring.thin': { magma: [4773, 12.5, 0], giada: [4771, 12.5, 1], cremisi: [4766, 12.5, 1], zaffiro: [4764, 12.5, 1], fume: [4768, 12.5, 1], aluminum: [1892, 8, 1] },
  'ring.logo': { aluminum: [1633, 14.5, 1] },
  'ring.tribe': { aluminum: [2924, 19.9, 1] },
  'coupler.classic': { aluminum: [2907, 20, 1] },
  'coupler.heavy': { aluminum: [3528, 20, 0] },
  'coupler.evo': { aluminum: [1504, 32.5, 1] },
  'coupler.maori': { aluminum: [5275, 55, 1] },
};

export const CATALOG: Record<string, Record<string, Listing>> = Object.fromEntries(
  Object.entries(RAW_CATALOG).map(([part, listings]) => [
    part,
    Object.fromEntries(
      Object.entries(listings).map(([finish, [id, price, inStock]]) => [finish, { id, price, inStock: inStock === 1 }]),
    ),
  ]),
);

export const productUrl = (id: number) => `https://lamadiluce.it/?post_type=product&p=${id}`;
