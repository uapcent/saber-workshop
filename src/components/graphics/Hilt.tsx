import { MODELS } from '../../data/models';
import { darken, lighten, luminance, mix } from '../../lib/color';
import { coneShading, outlinePath, radiusAt, shadingStops, starPath, turnedEdges } from '../../lib/geometry';
import { finishOf } from '../../lib/saber';
import type { Mask, PartChoice, PartKind, Saber } from '../../types';

interface PartShapeProps {
  id: string;
  kind: PartKind;
  choice: PartChoice;
  x0: number;
  mask: Mask;
  /** Blade color shining through light holes, or null when the blade is off. */
  glow: string | null;
  /** Prefix of the texture filters defined by <HiltFilters>. */
  filters: string;
  /** Interactive hilts: which part is being edited, and what to do when a part is clicked. */
  interaction?: HiltInteraction;
  partKey?: PartKey;
}

/**
 * Identifies a part of a saber: a main part, or a ring by its group and position
 * (`ringsTop.0` is the ring right under the emitter).
 */
export type PartKey = 'emitter' | 'body' | 'pommel' | 'coupler' | `${'ringsTop' | 'ringsBottom'}.${number}`;

export interface HiltInteraction {
  selected: PartKey | null;
  onSelect: (key: PartKey) => void;
}

function PartShape({ id, kind, choice, x0, mask, glow, filters, interaction, partKey }: PartShapeProps) {
  const m = MODELS[kind][choice.model];
  const profile = mask === 'extra' && m.profileExtra ? m.profileExtra : m.profile;
  const d = outlinePath(profile, x0);
  const f = finishOf(choice.finish);
  const gradId = `${id}-grad`;
  const clipId = `${id}-clip`;

  const edge = (x: number, dark: string, light: string) => {
    const r = radiusAt(profile, x) - 0.2;
    return (
      <g key={x}>
        <line x1={x0 + x} y1={-r} x2={x0 + x} y2={r} stroke={dark} strokeWidth={0.45} />
        <line x1={x0 + x + 0.5} y1={-r} x2={x0 + x + 0.5} y2={r} stroke={light} strokeWidth={0.35} />
      </g>
    );
  };
  // Lines read as engraved on light finishes and as polished edges on dark ones.
  const light = luminance(f.color) > 0.45;
  const shadow = (a: number) => `rgba(0,0,0,${(light ? a : a * 1.15).toFixed(3)})`;
  const shine = (a: number) => `rgba(255,255,255,${(light ? a * 0.8 : a * 1.3).toFixed(3)})`;
  const details = m.details;

  const selected = !!partKey && interaction?.selected === partKey;
  const clickable = !!partKey && !!interaction;

  return (
    <g
      className={clickable ? 'hilt-part' + (selected ? ' selected' : '') : undefined}
      onClick={clickable ? (e) => (e.stopPropagation(), interaction!.onSelect(partKey!)) : undefined}
    >
      {clickable && <title>{m.name}</title>}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          {shadingStops(f).map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={`url(#${gradId})`} />
      <g clipPath={`url(#${clipId})`}>
        {f.texture && (
          <rect x={x0} y={-24} width={m.len} height={48} filter={`url(#${filters}-grain)`} opacity={light ? 0.05 : 0.08} />
        )}
        {f.texture === 'sparkle' && <rect x={x0} y={-24} width={m.len} height={48} filter={`url(#${filters}-flakes)`} opacity={0.3} />}
        {coneShading(profile).map(([a, b, s]) => (
          <rect
            key={`cone${a}`}
            x={x0 + a}
            y={-25}
            width={b - a}
            height={50}
            fill={s > 0 ? '#ffffff' : '#000000'}
            opacity={Math.min(0.22, Math.abs(s) * (s > 0 ? 0.2 : 0.32))}
          />
        ))}
        {details?.ribs.map(([a, b, ya, yb]) => (
          <rect key={`rb${a},${ya}`} x={x0 + a} y={ya} width={b - a} height={yb - ya} fill={`url(#${filters}-ribs)`} opacity={light ? 0.7 : 1} />
        ))}
        {details?.knurls.map(([a, b]) => (
          <rect key={`kn${a}`} x={x0 + a} y={-25} width={b - a} height={50} fill={`url(#${filters}-knurl)`} opacity={light ? 0.6 : 0.9} />
        ))}
        {turnedEdges(profile).map((e) => (
          <g key={`edge${e.x}`}>
            <line
              x1={x0 + e.x}
              x2={x0 + e.x}
              y1={-25}
              y2={25}
              stroke={e.convex ? shine(0.08 + 0.14 * e.strength) : shadow(0.18 + 0.3 * e.strength)}
              strokeWidth={0.4}
            />
            <line
              x1={x0 + e.x + 0.45}
              x2={x0 + e.x + 0.45}
              y1={-25}
              y2={25}
              stroke={e.convex ? shadow(0.12 + 0.2 * e.strength) : shine(0.05 + 0.08 * e.strength)}
              strokeWidth={0.35}
            />
          </g>
        ))}
        {details?.grooves.map(([x, w, ya, yb]) => {
          // A line across most of the drawing is a groove all the way round: run it edge to edge.
          // Shorter ones are ribs or slots and keep their extent.
          const around = yb - ya > 1.2 * radiusAt(profile, x);
          const [y0, y1] = around ? [-25, 25] : [ya, yb];
          return (
            <g key={`gr${x},${ya}`}>
              <rect x={x0 + x - w / 2} y={y0} width={w} height={y1 - y0} rx={around ? 0 : Math.min(w, 0.5)} fill={shadow(0.45)} />
              <rect x={x0 + x + w / 2} y={y0} width={0.3} height={y1 - y0} fill={shine(0.14)} />
            </g>
          );
        })}
        {details?.slots?.map(({ points, width }, i) => {
          const pts = points.map(([x, y]) => `${(x0 + x).toFixed(2)},${y.toFixed(2)}`).join(' ');
          return (
            <g key={`sl${i}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
              {f.polished ? (
                <>
                  <polyline points={pts} stroke="rgba(0,0,0,.6)" strokeWidth={width + 0.5} />
                  <polyline points={pts} stroke="#d9dde2" strokeWidth={width} />
                  <polyline points={pts} stroke="#ffffff" strokeWidth={width * 0.3} opacity={0.7} transform="translate(0,-0.25)" />
                </>
              ) : (
                <>
                  <polyline points={pts} stroke={shadow(0.55)} strokeWidth={width} />
                  <polyline points={pts} stroke={shine(0.22)} strokeWidth={0.35} transform={`translate(0,${(width / 2).toFixed(2)})`} />
                </>
              )}
            </g>
          );
        })}
        {details?.lightHoles?.map(([x, y, size]) => (
          <g key={`lh${x},${y}`}>
            {glow && <circle cx={x0 + x} cy={y} r={size} fill={glow} opacity={0.35} />}
            <circle cx={x0 + x} cy={y} r={size / 2} fill="#060607" />
            {glow && <circle cx={x0 + x} cy={y} r={size * 0.36} fill={lighten(glow, 0.55)} />}
          </g>
        ))}
        {details?.holes.map(([x, y, w, h]) => (
          <g key={`ho${x},${y}`}>
            <rect x={x0 + x - h / 2} y={y - w / 2} width={h} height={w} rx={Math.min(w, h) / 2} fill="#08080a" opacity={0.9} />
            <rect x={x0 + x - h / 2 + 0.3} y={y + w / 2 - 0.45} width={Math.max(0, h - 0.6)} height={0.3} rx={0.15} fill={shine(0.25)} />
          </g>
        ))}
      </g>
      <path d={d} fill="none" stroke="rgba(0,0,0,.5)" strokeWidth={0.35} strokeLinejoin="round" />
      {m.facets?.map((x) => edge(x, 'rgba(0,0,0,.38)', 'rgba(255,255,255,.10)'))}
      {m.grooves?.map((x) => edge(x, 'rgba(0,0,0,.6)', 'rgba(255,255,255,.14)'))}
      {m.holes &&
        [24, 29.5, 35, 40.5, 46].flatMap((x) =>
          [-8, 0, 8].map((y) => <ellipse key={`${x},${y}`} cx={x0 + x} cy={y} rx={1.6} ry={2.6} fill="#060607" opacity={0.85} />),
        )}
      {m.mark === 'star' && (
        <path
          d={starPath(x0 + m.len / 2, 0, 3.4)}
          fill={luminance(f.color) > 0.5 ? darken(f.color, 0.45) : lighten(f.color, 0.55)}
          opacity={0.85}
        />
      )}
      {m.mark === 'tribe' && (
        <polyline
          points={Array.from({ length: 11 }, (_, i) => `${(x0 + (i % 2 ? m.len - 2 : 2)).toFixed(2)},${(-17 + i * 3.4).toFixed(2)}`).join(' ')}
          fill="none"
          stroke={mix(f.color, '#000000', 0.55)}
          strokeWidth={0.7}
          strokeLinejoin="round"
          opacity={0.8}
        />
      )}
      {clickable && <path className="hilt-part-hover" d={d} />}
      {selected && <path className="hilt-part-outline" d={d} />}
    </g>
  );
}

/** Texture filters used by finishes like Dark Matter (noise) and Sideral Dust (sparkle). */
function HiltFilters({ id }: { id: string }) {
  return (
    <defs>
      {/* Microtexture: fine, even grain, as much darker as lighter than the base, so it reads as a matte surface. */}
      <filter id={`${id}-grain`} x="0" y="0" width="1" height="1">
        <feTurbulence type="fractalNoise" baseFrequency="4.5" numOctaves={1} seed={4} />
        <feColorMatrix type="matrix" values="2.4 0 0 0 -.7  2.4 0 0 0 -.7  2.4 0 0 0 -.7  0 0 0 0 1" />
      </filter>
      {/* Sideral Dust: sparse, tiny bright flakes on top of the grain. */}
      <filter id={`${id}-flakes`} x="0" y="0" width="1" height="1">
        <feTurbulence type="fractalNoise" baseFrequency="3.2" numOctaves={1} seed={9} />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  9 0 0 0 -6.1" />
      </filter>
      <pattern id={`${id}-knurl`} width={1.4} height={1.4} patternUnits="userSpaceOnUse">
        <path d="M0,1.4 L1.4,0 M0,0 L1.4,1.4" stroke="rgba(0,0,0,.55)" strokeWidth={0.35} />
        <path d="M0.7,0 L0.7,0.01" stroke="rgba(255,255,255,.25)" strokeWidth={0.5} strokeLinecap="round" />
      </pattern>
      <pattern id={`${id}-ribs`} width={1.4} height={50} patternUnits="userSpaceOnUse">
        <rect x={0} width={0.55} height={50} fill="rgba(0,0,0,.5)" />
        <rect x={0.55} width={0.25} height={50} fill="rgba(255,255,255,.16)" />
      </pattern>
    </defs>
  );
}

/**
 * Parts of one hilt from the pommel end (x = 0) to the emitter. Both ring lists are ordered from the emitter
 * down: `ringsTop[0]` sits under the emitter, `ringsBottom[0]` under the body.
 */
function hiltParts(s: Saber, withPommel: boolean): { kind: PartKind; choice: PartChoice; key: PartKey }[] {
  const rings = (slot: 'ringsTop' | 'ringsBottom') => s[slot].map((choice, i) => ({ kind: 'ring' as const, choice, key: `${slot}.${i}` as PartKey }));
  return [
    ...(withPommel ? [{ kind: 'pommel' as const, choice: s.pommel, key: 'pommel' as const }] : []),
    ...rings('ringsBottom').reverse(),
    { kind: 'body', choice: s.body, key: 'body' },
    ...rings('ringsTop').reverse(),
    { kind: 'emitter', choice: s.emitter, key: 'emitter' },
  ];
}

interface HalfHiltProps {
  id: string;
  saber: Saber;
  withPommel: boolean;
  glow: string | null;
  filters: string;
  interaction?: HiltInteraction;
}

function HalfHilt({ id, saber, withPommel, glow, filters, interaction }: HalfHiltProps) {
  let x = 0;
  return (
    <>
      {hiltParts(saber, withPommel).map(({ kind, choice, key }, i) => {
        const x0 = x;
        x += MODELS[kind][choice.model].len;
        return (
          <PartShape
            key={i}
            id={`${id}-${i}`}
            kind={kind}
            choice={choice}
            x0={x0}
            mask={saber.mask}
            glow={glow}
            filters={filters}
            interaction={interaction}
            partKey={key}
          />
        );
      })}
    </>
  );
}

export function halfHiltLength(s: Saber): number {
  return hiltParts(s, s.style !== 'staff').reduce((sum, p) => sum + MODELS[p.kind][p.choice.model].len, 0);
}

/**
 * The whole hilt lying along the x axis from 0 to its length, centered on y = 0.
 * A staff is two mirrored halves joined by the coupler.
 */
export function Hilt({ id, saber, lit, interaction }: { id: string; saber: Saber; lit: boolean; interaction?: HiltInteraction }) {
  const glow = lit && saber.blade.on ? saber.blade.color : null;
  const common = { saber, glow, filters: id, interaction };
  if (saber.style !== 'staff') {
    return (
      <g>
        <HiltFilters id={id} />
        <HalfHilt id={`${id}-h`} withPommel {...common} />
      </g>
    );
  }
  const half = halfHiltLength(saber);
  const coupler = MODELS.coupler[saber.coupler.model].len;
  return (
    <g>
      <HiltFilters id={id} />
      <g transform={`translate(${half},0) scale(-1,1)`}>
        <HalfHilt id={`${id}-l`} withPommel={false} {...common} />
      </g>
      <PartShape
        id={`${id}-c`}
        kind="coupler"
        choice={saber.coupler}
        x0={half}
        mask={saber.mask}
        glow={glow}
        filters={id}
        interaction={interaction}
        partKey="coupler"
      />
      <g transform={`translate(${half + coupler},0)`}>
        <HalfHilt id={`${id}-r`} withPommel={false} {...common} />
      </g>
    </g>
  );
}
