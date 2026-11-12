import { useEffect, useRef, type Dispatch, type ReactNode } from 'react';
import { MODELS, PART_LABEL } from '../data/models';
import { cm, eur, finishOf, lengthClass, partStatus, weightCheck, type PartStatus, type Totals } from '../lib/saber';

/** What the weight counts, and which parts it is missing. */
function weightTitle(t: Totals): string {
  const unknown = [...new Set(t.unweighed)];
  return (
    'Empty hilt parts, from the store. The rule weighs the hilt without the blade, so the Anima and balance weights add to this.' +
    (unknown.length ? ` No weight known for: ${unknown.join(', ')}.` : '')
  );
}
import { MAX_RINGS, type Action } from '../state/workshop';
import type { PartChoice, PartKind, RingSlot, Saber } from '../types';
import type { PartKey } from './graphics/Hilt';
import { FinishSelect, ModelSelect, StatusLine, Swatch } from './PartPickers';

interface Props {
  saber: Saber;
  totals: Totals;
  selected: PartKey | null;
  onSelect: (key: PartKey | null) => void;
  dispatch: Dispatch<Action>;
}

function priceOf(st: PartStatus): string {
  if (st.kind === 'store') return eur(st.price);
  if (st.kind === 'coat') return 'Coat';
  return '—';
}

interface RowProps {
  label: string;
  kind: PartKind;
  choice: PartChoice;
  expanded: boolean;
  /** Rings are optional: drawn dashed, with a remove button on the summary line. */
  optional?: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<PartChoice>) => void;
  onRemove?: () => void;
  extra?: ReactNode;
}

/** One part: a compact summary line that opens into its model and finish pickers. */
function PartRow({ label, kind, choice, expanded, optional, onToggle, onChange, onRemove, extra }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const m = MODELS[kind][choice.model];
  const f = finishOf(choice.finish);
  const st = partStatus(kind, choice);
  const flag = st.kind === 'legacy' ? 'Discontinued' : st.kind === 'store' && !st.inStock ? 'Out of stock' : null;

  // Opened from the drawing: bring the row into view inside the panel.
  useEffect(() => {
    if (expanded) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [expanded]);

  return (
    <div ref={ref} className={'slot' + (expanded ? ' open' : '') + (optional ? ' optional' : '')}>
      <div className="slot-head">
        <button className="slot-toggle" aria-expanded={expanded} onClick={onToggle}>
          <span className="slot-label">{label}</span>
          <span className="slot-main">
            <span className="slot-model">{m.name}</span>
            <span className="slot-finish">
              <Swatch color={f.color} /> {f.name}
              {flag && <span className="slot-flag"> · {flag}</span>}
            </span>
          </span>
          <span className={'slot-price' + (st.kind === 'coat' ? ' coat' : '')}>{priceOf(st)}</span>
        </button>
        {onRemove ? (
          <button className="slot-remove" aria-label={`Remove ${m.name}`} title="Remove ring" onClick={onRemove}>
            ✕
          </button>
        ) : (
          // Same width as the remove button, so every price lines up in one column.
          <span className="slot-remove-space" aria-hidden="true" />
        )}
      </div>
      {expanded && (
        <div className="slot-body">
          <div className="row">
            <ModelSelect kind={kind} value={choice.model} onChange={(model) => onChange({ model })} />
          </div>
          {extra}
          <div className="row">
            <FinishSelect kind={kind} model={choice.model} value={choice.finish} onChange={(finish) => onChange({ finish })} />
          </div>
          <StatusLine status={st} />
        </div>
      )}
    </div>
  );
}

/** The parts you buy, in hilt order from the emitter down, with a running total. */
export function PartsPanel({ saber, totals: t, selected, onSelect, dispatch }: Props) {
  const staff = saber.style === 'staff';
  const toggle = (key: PartKey) => onSelect(selected === key ? null : key);

  const main = (kind: 'emitter' | 'body' | 'pommel' | 'coupler') => (
    <PartRow
      label={PART_LABEL[kind]}
      kind={kind}
      choice={saber[kind]}
      expanded={selected === kind}
      onToggle={() => toggle(kind)}
      onChange={(patch) => dispatch({ type: 'setPart', kind, patch })}
      extra={
        kind === 'pommel' && saber.pommel.model === 'adaptor' ? (
          <div className="row">
            <select aria-label="Pommel mask" value={saber.mask} onChange={(e) => dispatch({ type: 'setMask', mask: e.target.value as Saber['mask'] })}>
              <option value="standard">Standard pommel mask</option>
              <option value="extra">Extra pommel mask (flared)</option>
            </select>
          </div>
        ) : undefined
      }
    />
  );

  const rings = (slot: RingSlot) => (
    <>
      {saber[slot].map((ring, index) => {
        const key = `${slot}.${index}` as PartKey;
        return (
          <PartRow
            key={index}
            label="Ring"
            kind="ring"
            choice={ring}
            optional
            expanded={selected === key}
            onToggle={() => toggle(key)}
            onChange={(patch) => dispatch({ type: 'setRing', slot, index, patch })}
            onRemove={() => {
              dispatch({ type: 'removeRing', slot, index });
              onSelect(null);
            }}
          />
        );
      })}
      {saber[slot].length < MAX_RINGS && (
        <button
          className="add-ring"
          onClick={() => {
            dispatch({ type: 'addRing', slot });
            onSelect(`${slot}.${saber[slot].length}` as PartKey);
          }}
        >
          + Ring <span>optional</span>
        </button>
      )}
    </>
  );

  return (
    <div className="sec parts-panel">
      <h3>Parts</h3>
      {main('emitter')}
      {rings('ringsTop')}
      {main('body')}
      {rings('ringsBottom')}
      {main(staff ? 'coupler' : 'pommel')}
      <div className="parts-total">
        <div>
          <span>Store parts{staff ? ' (both halves)' : ''}</span>
          <b>{eur(t.store)}</b>
        </div>
        {t.toCoat > 0 && (
          <div className="small">
            <span>
              {t.toCoat} part{t.toCoat > 1 ? 's' : ''} to coat, aluminum bases
            </span>
            <span>{eur(t.bases)}</span>
          </div>
        )}
        <div className="small">
          <span>Hilt length</span>
          <span>
            {cm(t.length)} cm · {lengthClass(t.length, saber.style).name}
          </span>
        </div>
        <div className="small" title={weightTitle(t)}>
          <span>Hilt parts weight</span>
          <span>{weightCheck(t, saber.style).text}</span>
        </div>
      </div>
    </div>
  );
}
