import { STYLES } from '../data/models';
import { cm, eur, lengthClass, warnings, type Totals } from '../lib/saber';
import type { Saber } from '../types';
import type { HiltInteraction } from './graphics/Hilt';
import { SaberGraphic } from './graphics/SaberGraphic';

interface Props {
  saber: Saber;
  totals: Totals;
  /** Clickable parts; without it the card is a still picture (e.g. a shared saber's preview). */
  interaction?: HiltInteraction;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** The saber being edited, pinned at the top of the workbench. Click a part to edit it. */
export function SaberCard({ saber, totals: t, interaction }: Props) {
  const summary = [
    STYLES[saber.style].name,
    `${cm(t.length)} cm · ${lengthClass(t.length, saber.style).name}`,
    `${eur(t.store)} in store parts`,
    t.toCoat && `${plural(t.toCoat, 'part')} to coat`,
    t.discontinued && `${t.discontinued} discontinued`,
    t.outOfStock && `${t.outOfStock} out of stock`,
  ].filter(Boolean);

  return (
    <div className="card">
      <div className="card-head">
        <b>{saber.name || 'Untitled'}</b>
        <span>{summary.join(' · ')}</span>
      </div>
      <SaberGraphic saber={saber} hiltLength={t.length} interaction={interaction} />
      <div className="card-foot">
        {warnings(saber, t).map((w) => (
          <div className="warnline" key={w}>
            {w}
          </div>
        ))}
        {interaction && (
          <div className="hint">
            <span className="hint-mouse">Click a part of the hilt to edit it.</span>
            <span className="hint-touch">Tap a part of the hilt to edit it.</span>
          </div>
        )}
      </div>
    </div>
  );
}
