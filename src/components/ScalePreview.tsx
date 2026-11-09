import { STYLES } from '../data/models';
import { useSvgId } from '../lib/geometry';
import type { Totals } from '../lib/saber';
import type { Saber } from '../types';
import { SaberFigure, figureExtent } from './graphics/SaberGraphic';

const ROW_HEIGHT = 60; // mm of drawing per saber row (blade glow included)

const metres = (mm: number) => (mm / 1000).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';

/** Both sabers complete with their LudoSport-length blades, side by side at the same scale. */
export function ScalePreview({ sabers, totals }: { sabers: Saber[]; totals: Totals[] }) {
  const id = useSvgId();
  const extents = sabers.map((s, i) => figureExtent(s, totals[i].length, false));
  // Every row shares one width so all sabers (and the ruler) are drawn at the same scale.
  const width = Math.max(...extents.map(([from, to]) => to - from)) + 10;
  const rulerEnd = Math.floor((width - 10) / 100) * 100;
  const font = width / 85; // ruler labels stay about 11 px whatever the drawing's width

  return (
    <section className="scale">
      <h3>Full length, to scale</h3>
      <div className="small">LudoSport blade standards: long 87 cm, staff 73 cm, short 60 cm outside the emitter.</div>
      {sabers.map((s, i) => {
        const [from] = extents[i];
        const blade = STYLES[s.style].bladeExtension;
        const overall = totals[i].length + (s.style === 'staff' ? 2 : 1) * blade;
        return (
          <div className="scale-row" key={i}>
            <div className="scale-label">
              <b>
                {s.name || 'Untitled'}
              </b>
              <span>{metres(overall)} overall</span>
            </div>
            <svg viewBox={`0 ${-ROW_HEIGHT / 2} ${width} ${ROW_HEIGHT}`} role="img" aria-label={`${s.name || 'Untitled'}, ${metres(overall)} overall`}>
              <g transform={`translate(${5 - from},0)`}>
                <SaberFigure id={`${id}-${i}`} saber={s} hiltLength={totals[i].length} cut={false} />
              </g>
            </svg>
          </div>
        );
      })}
      <svg className="scale-ruler" viewBox={`0 0 ${width} ${16 + font * 1.3}`} aria-hidden="true">
        <line x1={5} x2={5 + rulerEnd} y1={2} y2={2} stroke="#6d717a" strokeWidth={1.5} />
        {Array.from({ length: rulerEnd / 100 + 1 }, (_, i) => i * 100).map((mm) => (
          <g key={mm}>
            <line x1={5 + mm} x2={5 + mm} y1={2} y2={mm % 500 === 0 ? 14 : 9} stroke="#6d717a" strokeWidth={1.5} />
            {mm % 500 === 0 && (
              <text x={5 + mm} y={14 + font} fontSize={font} textAnchor={mm === 0 ? 'start' : mm + 250 > width ? 'end' : 'middle'} className="ruler-text">
                {mm / 10} cm
              </text>
            )}
          </g>
        ))}
      </svg>
    </section>
  );
}
