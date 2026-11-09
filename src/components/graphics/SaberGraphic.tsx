import { BLADE_RADIUS, STYLES } from '../../data/models';
import { lighten } from '../../lib/color';
import { useSvgId } from '../../lib/geometry';
import type { Saber } from '../../types';
import { Hilt, type HiltInteraction } from './Hilt';

/** How much blade the hilt cards show before cutting it off (mm). */
const STUB = 70;
/** The blade tube starts this far inside the emitter, so it never shows a gap at the mouth. */
const SEAT = 4;

/** Closed outline of a blade tube from x = 0 to `length`, with a rounded tip at the far end. */
function tubePath(length: number, r: number, tip: boolean): string {
  if (!tip) return `M0,${-r} H${length} V${r} H0 Z`;
  const t = Math.min(r * 1.15, length); // slightly elongated dome, like a LudoSport tip
  return `M0,${-r} H${length - t} A${t},${r} 0 0 1 ${length - t},${r} H0 Z`;
}

interface BladeProps {
  id: string;
  /** Id prefix of the shared <BladeDefs> (glow filter, unlit gradient). */
  defs: string;
  /** Where the blade leaves the emitter, and which way it points. */
  x: number;
  direction: 1 | -1;
  /** Visible length outside the emitter (mm). */
  length: number;
  color: string;
  on: boolean;
  /** Show only a stub fading out, instead of the whole blade with its tip. */
  cut: boolean;
}

function Blade({ id, defs, x, direction, length, color, on, cut }: BladeProps) {
  const L = (cut ? STUB : length) + SEAT;
  const r = BLADE_RADIUS;
  const tip = !cut;
  const maskId = `${id}-cut`;
  const fadeId = `${id}-fade`;
  return (
    <g transform={`translate(${x - direction * SEAT},0) scale(${direction},1)`} mask={cut ? `url(#${maskId})` : undefined}>
      {cut && (
        <defs>
          <linearGradient id={fadeId} gradientUnits="userSpaceOnUse" x1={L * 0.35} x2={L} y1={0} y2={0}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-10} y={-50} width={L + 40} height={100}>
            <rect x={-10} y={-50} width={L + 40} height={100} fill={`url(#${fadeId})`} />
          </mask>
        </defs>
      )}
      {on ? (
        <>
          <g filter={`url(#${defs}-glow)`} opacity={0.9}>
            <path d={tubePath(L, r + 5, tip)} fill={color} />
          </g>
          <path d={tubePath(L, r, tip)} fill={lighten(color, 0.45)} />
          <path d={tubePath(L, r * 0.55, tip)} transform={`translate(${tip ? -r * 0.2 : 0},0)`} fill="#ffffff" opacity={0.92} />
        </>
      ) : (
        // Unlit: frosted polycarbonate tube.
        <path d={tubePath(L, r, tip)} fill={`url(#${defs}-off)`} stroke="rgba(255,255,255,.22)" strokeWidth={0.5} />
      )}
    </g>
  );
}

function BladeDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`${id}-glow`} x="-20%" y="-150%" width="140%" height="400%">
        <feGaussianBlur stdDeviation={6.5} />
      </filter>
      <filter id={`${id}-shadow`} x="-10%" y="-300%" width="120%" height="700%">
        <feGaussianBlur stdDeviation={2.6} />
      </filter>
      <linearGradient id={`${id}-off`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity={0.08} />
        <stop offset=".25" stopColor="#ffffff" stopOpacity={0.3} />
        <stop offset=".6" stopColor="#ffffff" stopOpacity={0.12} />
        <stop offset="1" stopColor="#ffffff" stopOpacity={0.05} />
      </linearGradient>
    </defs>
  );
}

interface FigureProps {
  id: string;
  saber: Saber;
  hiltLength: number;
  /** Hilt-focused view: blades cut short. */
  cut: boolean;
  shadow?: boolean;
  interaction?: HiltInteraction;
}

/** One saber: hilt from x = 0 to hiltLength, blade(s) out of the emitter(s). */
export function SaberFigure({ id, saber, hiltLength, cut, shadow = false, interaction }: FigureProps) {
  const blade = { defs: id, length: STYLES[saber.style].bladeExtension, color: saber.blade.color, on: saber.blade.on, cut };
  return (
    <>
      <BladeDefs id={id} />
      {shadow && (
        <ellipse cx={hiltLength / 2} cy={31} rx={hiltLength / 2} ry={2.4} fill="#000" opacity={0.55} filter={`url(#${id}-shadow)`} />
      )}
      <Blade id={`${id}-b1`} x={hiltLength} direction={1} {...blade} />
      {saber.style === 'staff' && <Blade id={`${id}-b2`} x={0} direction={-1} {...blade} />}
      <Hilt id={`${id}-hilt`} saber={saber} lit interaction={interaction} />
    </>
  );
}

/** Horizontal extent [from, to] of a saber figure, in mm. */
export function figureExtent(saber: Saber, hiltLength: number, cut: boolean): [number, number] {
  const blade = (cut ? STUB : STYLES[saber.style].bladeExtension) + 12; // + glow
  return [saber.style === 'staff' ? -blade : -6, hiltLength + blade];
}

/** Hilt-focused card graphic: the hilt fills the frame and the blade is cut short. */
export function SaberGraphic({ saber, hiltLength, interaction }: { saber: Saber; hiltLength: number; interaction?: HiltInteraction }) {
  const id = useSvgId();
  const [from, to] = figureExtent(saber, hiltLength, true);
  const width = to - from;
  const label = saber.name || 'Untitled';
  return (
    <svg viewBox={`${from} -40 ${width} 80`} role="img" aria-label={label}>
      <SaberFigure id={id} saber={saber} hiltLength={hiltLength} cut shadow interaction={interaction} />
    </svg>
  );
}
