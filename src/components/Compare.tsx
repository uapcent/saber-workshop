import type { Dispatch } from 'react';
import { STYLES } from '../data/models';
import { cm, eur, lengthClass, warnings, type Totals } from '../lib/saber';
import type { Action, Slot } from '../state/workshop';
import { ScalePreview } from './ScalePreview';
import { SizeChart } from './SizeChart';

interface Props {
  slots: Slot[];
  totals: Totals[];
  active: number;
  dispatch: Dispatch<Action>;
}

/** All sabers side by side: full length to scale, the size chart and a price summary. Each can be hidden. */
export function Compare({ slots, totals, active, dispatch }: Props) {
  const shown = slots.map((s, i) => ({ ...s, totals: totals[i], index: i })).filter((s) => s.compare);
  const sabers = shown.map((s) => s.saber);
  const sums = shown.map((s) => s.totals);

  return (
    <section className="compare">
      <div className="compare-head">
        <h2>Compare</h2>
        <div className="compare-toggles" role="group" aria-label="Sabers shown in compare">
          {slots.map((slot, i) => (
            <label key={slot.uid} className={'chip' + (slot.compare ? ' on' : '')}>
              <input type="checkbox" checked={slot.compare} onChange={() => dispatch({ type: 'toggleCompare', index: i })} />
              <span className="saber-tab-dot" style={{ background: slot.saber.blade.color }} />
              {slot.saber.name || 'Untitled'}
            </label>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">Tick a saber above to compare it.</div>
      ) : (
        <>
          <ScalePreview sabers={sabers} totals={sums} />
          <div className="compare-lower">
            <div className="compare-chart">
              <h3>Size chart</h3>
              <div className="small">Polaris length classes, InCom tolerance ±2 mm.</div>
              <SizeChart sabers={sabers} totals={sums} />
            </div>
            <div className="compare-summary">
              <h3>Summary</h3>
              <table>
                <thead>
                  <tr>
                    <th>Saber</th>
                    <th>Hilt</th>
                    <th className="num">Store parts</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s) => {
                    const t = s.totals;
                    const notes = [
                      t.toCoat && `${t.toCoat} to coat (bases ${eur(t.bases)})`,
                      t.outOfStock && `${t.outOfStock} out of stock`,
                      t.discontinued && `${t.discontinued} discontinued`,
                      warnings(s.saber, t).length && 'see warnings',
                    ].filter(Boolean);
                    return (
                      <tr key={s.uid} className={s.index === active ? 'current' : undefined}>
                        <td>
                          <button className="link" onClick={() => dispatch({ type: 'select', index: s.index })}>
                            {s.saber.name || 'Untitled'}
                          </button>
                          <div className="small">{STYLES[s.saber.style].name}</div>
                        </td>
                        <td>
                          {cm(t.length)} cm
                          <div className="small">{lengthClass(t.length, s.saber.style).name}</div>
                        </td>
                        <td className="num">{eur(t.store)}</td>
                        <td className="small">{notes.join(' · ') || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
