import { useEffect, useRef, useState } from 'react';
import { CATALOG, FINISHES } from '../data/catalog';
import { MODELS } from '../data/models';
import { customColor, eur, finishOf, isCustomColor, type PartStatus } from '../lib/saber';
import type { FinishKey, PartKind } from '../types';

const CUSTOM = '__custom__';

export function Swatch({ color }: { color: string }) {
  return <span className="sw" style={{ background: color }} />;
}

export function ModelSelect({ kind, value, onChange }: { kind: PartKind; value: string; onChange: (model: string) => void }) {
  const all = Object.entries(MODELS[kind]);
  const current = all.filter(([, m]) => !m.legacy);
  const legacy = all.filter(([, m]) => m.legacy);
  const options = (list: typeof all) =>
    list.map(([key, m]) => (
      <option key={key} value={key}>
        {m.name} · {(m.len / 10).toLocaleString('en', { maximumFractionDigits: 2 })} cm{m.approx ? ' (approx.)' : ''}
      </option>
    ));
  return (
    <select aria-label="Model" value={value} onChange={(e) => onChange(e.target.value)}>
      {legacy.length ? (
        <>
          <optgroup label="Current (EVO)">{options(current)}</optgroup>
          <optgroup label="Legacy (SSe, X2, Artiglio)">{options(legacy)}</optgroup>
        </>
      ) : (
        options(current)
      )}
    </select>
  );
}

/** One choosable finish in the list: color circle, name, and price or note. */
function FinishOption({ finishKey, color, name, note, selected, onPick }: { finishKey: string; color: string; name: string; note?: string; selected: boolean; onPick: (key: string) => void }) {
  return (
    <button type="button" role="option" aria-selected={selected} className={'finish-option' + (selected ? ' on' : '')} onClick={() => onPick(finishKey)}>
      <Swatch color={color} />
      <span className="finish-option-name">{name}</span>
      {note && <span className="finish-option-note">{note}</span>}
    </button>
  );
}

/**
 * Finish picker: a button showing the current finish's color, opening a list in which every finish
 * has its color circle (native selects can't show colors). The list opens in the page flow, so the
 * scrolling panel never clips it.
 */
export function FinishSelect({
  kind,
  model,
  value,
  onChange,
}: {
  kind: PartKind;
  model: string;
  value: FinishKey;
  onChange: (finish: FinishKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listings = CATALOG[`${kind}.${model}`] ?? {};
  const finishKeys = Object.keys(FINISHES);
  const otherStoreColors = finishKeys.filter((k) => FINISHES[k].store && !listings[k]);
  const coatings = finishKeys.filter((k) => !FINISHES[k].store);
  const custom = isCustomColor(value);
  const current = finishOf(value);
  const listing = listings[value];

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('.finish-option.on, .finish-option')?.focus();
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (key: string) => {
    onChange(key === CUSTOM ? customColor(current.color) : key);
    setOpen(false);
  };
  const option = (k: string, note?: string) => (
    <FinishOption key={k} finishKey={k} color={FINISHES[k].color} name={FINISHES[k].name} note={note} selected={k === value} onPick={pick} />
  );

  return (
    <div className="finish-select" ref={root}>
      <div className="row">
        <button type="button" className={'finish-trigger' + (open ? ' open' : '')} aria-haspopup="listbox" aria-expanded={open} aria-label="Finish" onClick={() => setOpen((o) => !o)}>
          <Swatch color={current.color} />
          <span className="finish-option-name">{current.name}</span>
          {listing && <span className="finish-option-note">{eur(listing.price)}</span>}
          <span className="finish-caret" aria-hidden="true">▾</span>
        </button>
        {custom && <input type="color" aria-label="Custom color" value={current.color} onChange={(e) => onChange(customColor(e.target.value))} />}
      </div>
      {open && (
        <div className="finish-list" role="listbox" aria-label="Finishes">
          <div className="finish-group">Sold for this part</div>
          {Object.entries(listings).map(([k, l]) => option(k, eur(l.price) + (l.inStock ? '' : ' · out of stock')))}
          {otherStoreColors.length > 0 && <div className="finish-group">Store colors, not sold for this part</div>}
          {otherStoreColors.map((k) => option(k, 'coat'))}
          <div className="finish-group">Custom coating</div>
          {coatings.map((k) => option(k))}
          <FinishOption finishKey={CUSTOM} color={custom ? current.color : '#888888'} name="Custom color…" selected={custom} onPick={pick} />
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: PartStatus }) {
  if (status.kind === 'legacy') return <span className="pill p-old">Discontinued</span>;
  if (status.kind === 'coat') return <span className="pill p-coat">Coat it</span>;
  return status.inStock ? <span className="pill p-ok">In stock</span> : <span className="pill p-out">Out of stock</span>;
}

export function StatusLine({ status }: { status: PartStatus }) {
  let detail: string;
  if (status.kind === 'legacy') detail = 'Not in the store. Use it if you already own one.';
  else if (status.kind === 'store') detail = eur(status.price);
  else if (status.base)
    detail = `Not sold in this finish. Base part in aluminum ${eur(status.base.price)}${status.base.inStock ? '' : ' (out of stock)'}`;
  else detail = 'Not sold in this finish';
  return (
    <div className="status">
      <StatusPill status={status} />
      <span>{detail}</span>
    </div>
  );
}
