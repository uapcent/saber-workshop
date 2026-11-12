import { useState, type Dispatch } from 'react';
import { BLADE_COLORS, PRESETS, STYLES } from '../data/models';
import { shareLink } from '../lib/saber';
import { isMuted, playIgnition, playRetraction, setMuted } from '../lib/sound';
import { MAX_SABERS, type Action } from '../state/workshop';
import type { Saber, Style } from '../types';
import { Menu } from './Menu';

interface Props {
  saber: Saber;
  index: number;
  count: number;
  dispatch: Dispatch<Action>;
  notify: (message: string) => void;
}

function ShareBox({ saber, notify }: { saber: Saber; notify: (m: string) => void }) {
  const link = shareLink(saber);
  return (
    <div className="share-box">
      <div className="menu-heading">Share link</div>
      <textarea readOnly value={link} aria-label="Share link" onFocus={(e) => e.target.select()} autoFocus />
      <button
        className="btn primary"
        onClick={() =>
          navigator.clipboard
            .writeText(link)
            .then(() => notify('Share link copied.'))
            .catch(() => notify('Select the link and copy it.'))
        }
      >
        Copy link
      </button>
      <div className="small">The link opens this saber in the workshop, as a new tab next to the reader's own sabers.</div>
    </div>
  );
}

/** The ⋯ menu: save, share, duplicate, replace with a preset, remove. */
function SaberActions({ saber, index, count, dispatch, notify }: Props) {
  const [view, setView] = useState<'main' | 'share' | 'presets'>('main');
  return (
    <Menu label="⋯" ariaLabel="Saber actions" className="btn icon" align="right" onClose={() => setView('main')}>
      {(close) => {
        if (view === 'share') return <ShareBox saber={saber} notify={notify} />;
        if (view === 'presets')
          return (
            <>
              <div className="menu-heading">Replace this saber with</div>
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  className="menu-item"
                  onClick={() => {
                    dispatch({ type: 'loadPreset', key });
                    close();
                  }}
                >
                  {p.name}
                </button>
              ))}
            </>
          );
        return (
          <>
            <button
              className="menu-item"
              onClick={() => {
                dispatch({ type: 'save' });
                notify(`Saved “${saber.name || 'Untitled'}” to your designs.`);
                close();
              }}
            >
              Save to my designs
            </button>
            <button className="menu-item" onClick={() => setView('share')}>
              Share link…
            </button>
            <button
              className="menu-item"
              disabled={count >= MAX_SABERS}
              onClick={() => {
                dispatch({ type: 'duplicate' });
                close();
              }}
            >
              Duplicate
            </button>
            <button className="menu-item" onClick={() => setView('presets')}>
              Replace with a preset…
            </button>
            <button
              className="menu-item danger"
              disabled={count <= 1}
              onClick={() => {
                dispatch({ type: 'remove', index });
                close();
              }}
            >
              Remove from workshop
            </button>
          </>
        );
      }}
    </Menu>
  );
}

function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted);
  return (
    <button
      type="button"
      className="btn icon ghost sound-toggle"
      aria-pressed={!muted}
      aria-label={muted ? 'Blade sounds off' : 'Blade sounds on'}
      title={muted ? 'Blade sounds off' : 'Blade sounds on'}
      onClick={() => {
        setMuted(!muted);
        setMutedState(!muted);
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4z" />
        {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
      </svg>
    </button>
  );
}

/** Everything about the saber that isn't a part: name, style and blade. */
export function SaberPanel(props: Props) {
  const { saber, dispatch } = props;
  return (
    <div className="sec saber-settings">
      <div className="row">
        <input type="text" aria-label="Saber name" value={saber.name} maxLength={60} placeholder="Name this saber" onChange={(e) => dispatch({ type: 'setName', name: e.target.value })} />
        <SaberActions {...props} />
      </div>

      <div className="seg" role="group" aria-label="Saber style">
        {(Object.keys(STYLES) as Style[]).map((style) => (
          <button
            key={style}
            className={'btn' + (saber.style === style ? ' on' : '')}
            aria-pressed={saber.style === style}
            title={STYLES[style].help}
            onClick={() => dispatch({ type: 'setStyle', style })}
          >
            {STYLES[style].name}
          </button>
        ))}
      </div>

      <div className="blade-row">
        <div className="row">
          <label className="chk" title={STYLES[saber.style].blade}>
            <input
              type="checkbox"
              checked={saber.blade.on}
              onChange={(e) => {
                (e.target.checked ? playIgnition : playRetraction)();
                dispatch({ type: 'setBlade', on: e.target.checked });
              }}
            />{' '}
            Blade
          </label>
          <SoundToggle />
        </div>
        <div className="row">
          {BLADE_COLORS.map((color) => (
            <button
              key={color}
              className={'dot' + (color === saber.blade.color ? ' on' : '')}
              style={{ background: color }}
              aria-label={`Blade color ${color}`}
              onClick={() => dispatch({ type: 'setBlade', color })}
            />
          ))}
          <input type="color" aria-label="Custom blade color" value={saber.blade.color} onChange={(e) => dispatch({ type: 'setBlade', color: e.target.value })} />
        </div>
      </div>
      <div className="small">
        {STYLES[saber.style].help} {STYLES[saber.style].blade}.
      </div>
    </div>
  );
}
