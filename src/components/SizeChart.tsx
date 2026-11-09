import { useSvgId } from '../lib/geometry';
import { cm, lengthClass, type Totals } from '../lib/saber';
import type { Saber } from '../types';
import { Hilt } from './graphics/Hilt';

const AXIS_X = 62;
const COLUMN = 96;

/** Column labels have room for about 14 characters. */
const shortName = (name: string) => {
  const n = name.split(' · ')[0] || 'Untitled';
  return n.length > 14 ? n.slice(0, 13) + '…' : n;
};

/** Hilts standing upright on a mm scale, against the Polaris length classes. */
export function SizeChart({ sabers, totals }: { sabers: Saber[]; totals: Totals[] }) {
  const id = useSvgId();
  const anyStaff = sabers.some((s) => s.style === 'staff');
  const top = anyStaff ? 560 : 340;
  const W = AXIS_X + sabers.length * COLUMN + 14;
  const base = top + 18;
  const H = base + 32;
  const y = (mm: number) => base - mm;

  const bands: [number, number, number, string][] = [
    [180, 260, 0.04, 'SHORT'],
    [260, 320, 0.07, 'LONG'],
  ];
  const limits = [180, 260, 320];
  if (anyStaff) {
    bands.push([410, 540, 0.05, 'STAFF']);
    limits.push(410, 540);
  }
  const ticks = Array.from({ length: top / 10 + 1 }, (_, i) => i * 10);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Hilt lengths against the Polaris length classes" className="size-chart">
      {bands.map(([a, b, opacity, label]) => (
        <g key={label}>
          <rect x={AXIS_X - 4} y={y(b)} width={W - AXIS_X - 6} height={b - a} fill="#ffffff" opacity={opacity} />
          <text transform={`translate(${AXIS_X - 10},${y((a + b) / 2)}) rotate(-90)`} textAnchor="middle" className="band">
            {label}
          </text>
        </g>
      ))}
      {limits.map((v) => (
        <g key={v}>
          <line x1={AXIS_X - 4} x2={W - 10} y1={y(v)} y2={y(v)} stroke="#9b9ea6" strokeWidth={0.6} strokeDasharray="3 3" opacity={0.7} />
          <text x={W - 10} y={y(v) - 2.5} textAnchor="end" className="tick">
            {v / 10} cm
          </text>
        </g>
      ))}
      {ticks.map((mm) => {
        const major = mm % 50 === 0;
        return (
          <g key={mm}>
            <line x1={AXIS_X - 26} x2={AXIS_X - 26 + (major ? 7 : 4)} y1={y(mm)} y2={y(mm)} stroke="#6d717a" strokeWidth={0.6} />
            {major && (
              <text x={AXIS_X - 30} y={y(mm) + 2.6} textAnchor="end" className="tick">
                {mm / 10}
              </text>
            )}
          </g>
        );
      })}
      <line x1={AXIS_X - 26} x2={AXIS_X - 26} y1={y(0)} y2={y(top)} stroke="#6d717a" strokeWidth={0.6} />
      <line x1={AXIS_X - 4} x2={W - 10} y1={base} y2={base} stroke="#6d717a" strokeWidth={0.8} />

      {sabers.map((s, i) => {
        const len = totals[i].length;
        const cx = AXIS_X + i * COLUMN + COLUMN / 2;
        return (
          <g key={i}>
            <g transform={`translate(${cx},${base}) rotate(-90)`}>
              <Hilt id={`${id}-${i}`} saber={s} lit={false} />
            </g>
            <line x1={cx - 24} x2={cx + 24} y1={y(len)} y2={y(len)} stroke="#cfa955" strokeWidth={0.8} />
            <text x={cx} y={y(len) - 4} textAnchor="middle" className="value">
              {cm(len)} cm
            </text>
            <text x={cx} y={base + 13} textAnchor="middle" className="name">
              {shortName(s.name)}
            </text>
            <text x={cx} y={base + 24} textAnchor="middle" className="tick">
              {lengthClass(len, s.style).name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
