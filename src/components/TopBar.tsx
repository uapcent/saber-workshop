import { useState, type Dispatch } from 'react';
import type { Saber } from '../types';
import { PRESETS, normalizeSaber } from '../data/models';
import { decodeSaber, shareCodeOf, totals } from '../lib/saber';
import type { StoreState } from '../lib/storeFeed';
import { MAX_SABERS, type Action, type WorkshopState } from '../state/workshop';
import { SaberGraphic } from './graphics/SaberGraphic';
import { Menu } from './Menu';
import { StoreBell } from './StoreBell';

interface Props {
  state: WorkshopState;
  dispatch: Dispatch<Action>;
  store: StoreState;
  /** A share link or code was pasted: show its saber (it joins the workshop only if the reader wants). */
  onShared: (saber: Saber) => void;
}

/** Paste box inside the Add menu: opens a share code as a new saber. */
function CodeInput({ onOpen }: { onOpen: (code: string) => boolean }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  return (
    <form
      className="menu-code"
      onSubmit={(e) => {
        e.preventDefault();
        setError(!onOpen(code));
      }}
    >
      <input
        type="text"
        placeholder="Paste a share link"
        aria-label="Share link or code"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError(false);
        }}
      />
      <button className="btn" type="submit" disabled={!code.trim()}>
        Open
      </button>
      {error && <div className="menu-error">That link couldn't be read. Copy the whole link and try again.</div>}
    </form>
  );
}

/**
 * Saber tabs (1 to 4) and the menu to add one from a preset, a saved design or a share code.
 * Desktop shows a row of tabs; phones show four fixed slots with a small drawing of each saber (CSS picks one).
 */
export function TopBar({ state, dispatch, store, onShared }: Props) {
  const full = state.slots.length >= MAX_SABERS;

  const openCode = (code: string) => {
    let saber = null;
    try {
      saber = normalizeSaber(decodeSaber(shareCodeOf(code)));
    } catch {
      /* not a share code */
    }
    if (!saber) return false;
    onShared(saber);
    return true;
  };

  const addMenu = (close: () => void) => (
    <>
      <div className="menu-heading">Start from a preset</div>
      {Object.entries(PRESETS).map(([key, p]) => (
        <button
          key={key}
          className="menu-item"
          onClick={() => {
            dispatch({ type: 'add', saber: p });
            close();
          }}
        >
          {p.name}
        </button>
      ))}
      <div className="menu-heading">Your saved designs</div>
      {state.saved.length === 0 && <div className="menu-empty">Save a saber from its ⋯ menu to keep it here.</div>}
      {state.saved.map((d, index) => (
        <div className="menu-row" key={index}>
          <button
            className="menu-item"
            onClick={() => {
              const saber = normalizeSaber(d.saber);
              if (saber) dispatch({ type: 'add', saber });
              close();
            }}
          >
            {d.name}
          </button>
          <button className="btn icon ghost" aria-label={`Delete saved design ${d.name}`} onClick={() => dispatch({ type: 'deleteSaved', index })}>
            ✕
          </button>
        </div>
      ))}
      <div className="menu-heading">Open a share link</div>
      <CodeInput onOpen={(code) => openCode(code) && (close(), true)} />
    </>
  );

  const select = (index: number) => dispatch({ type: 'select', index });
  const empty = Math.max(0, MAX_SABERS - state.slots.length - 1);

  return (
    <header className="topbar">
      <h1>Saber Workshop</h1>
      <nav className="saber-tabs" role="tablist" aria-label="Sabers">
        {state.slots.map((slot, i) => (
          <button
            key={slot.uid}
            role="tab"
            aria-selected={i === state.active}
            className={'saber-tab' + (i === state.active ? ' on' : '')}
            onClick={() => select(i)}
            title={slot.saber.name || 'Untitled'}
          >
            <span className="saber-tab-dot" style={{ background: slot.saber.blade.color }} />
            {slot.saber.name || 'Untitled'}
          </button>
        ))}
        <Menu
          label={<>+ Add saber</>}
          className="btn ghost add-saber"
          disabled={full}
          title={full ? `Up to ${MAX_SABERS} sabers` : undefined}
        >
          {addMenu}
        </Menu>
      </nav>
      {/* Phones: every saber always on screen, in fixed slots that never scroll. "+ Add" takes the next free slot. */}
      <nav className="saber-slots" role="tablist" aria-label="Sabers">
        {state.slots.map((slot, i) => {
          const name = slot.saber.name || 'Untitled';
          return (
            <button
              key={slot.uid}
              role="tab"
              aria-selected={i === state.active}
              aria-label={name}
              className={'saber-slot' + (i === state.active ? ' on' : '')}
              onClick={() => select(i)}
            >
              <span className="saber-slot-figure" aria-hidden="true">
                <SaberGraphic saber={slot.saber} hiltLength={totals(slot.saber).length} />
              </span>
              <span className="saber-slot-name">{name}</span>
            </button>
          );
        })}
        {!full && (
          <Menu label={<><span className="saber-slot-plus">+</span>Add</>} ariaLabel="Add saber" className="saber-slot add">
            {addMenu}
          </Menu>
        )}
        {Array.from({ length: empty }, (_, i) => (
          <span key={i} className="saber-slot-space" />
        ))}
      </nav>
      <div className="topbar-end">
        <StoreBell store={store} />
      </div>
    </header>
  );
}
