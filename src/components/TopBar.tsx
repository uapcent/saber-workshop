import { useState, type Dispatch } from 'react';
import { PRESETS, normalizeSaber } from '../data/models';
import { decodeSaber } from '../lib/saber';
import { MAX_SABERS, type Action, type WorkshopState } from '../state/workshop';
import { Menu } from './Menu';
import { StoreBell } from './StoreBell';

interface Props {
  state: WorkshopState;
  dispatch: Dispatch<Action>;
  notify: (message: string) => void;
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
        placeholder="Paste a share code"
        aria-label="Share code"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError(false);
        }}
      />
      <button className="btn" type="submit" disabled={!code.trim()}>
        Open
      </button>
      {error && <div className="menu-error">That code couldn't be read. Copy the whole code and try again.</div>}
    </form>
  );
}

/** Saber tabs (1 to 4) and the menu to add one from a preset, a saved design or a share code. */
export function TopBar({ state, dispatch, notify }: Props) {
  const full = state.slots.length >= MAX_SABERS;

  const openCode = (code: string) => {
    let saber = null;
    try {
      saber = normalizeSaber(decodeSaber(code));
    } catch {
      /* not a share code */
    }
    if (!saber) return false;
    dispatch({ type: 'add', saber });
    notify(`Opened “${saber.name || 'Untitled'}”.`);
    return true;
  };

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
            onClick={() => dispatch({ type: 'select', index: i })}
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
          {(close) => (
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
              <div className="menu-heading">Open a share code</div>
              <CodeInput onOpen={(code) => openCode(code) && (close(), true)} />
            </>
          )}
        </Menu>
      </nav>
      <div className="topbar-end">
        <StoreBell />
      </div>
    </header>
  );
}
