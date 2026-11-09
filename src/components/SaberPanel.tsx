import { useState, type Dispatch } from 'react';
import { BLADE_COLORS, PRESETS, STYLES } from '../data/models';
import { encodeSaber } from '../lib/saber';
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
  const code = encodeSaber(saber);
  return (
    <div className="share-box">
      <div className="menu-heading">Share code</div>
      <textarea readOnly value={code} aria-label="Share code" onFocus={(e) => e.target.select()} autoFocus />
      <button
        className="btn primary"
        onClick={() =>
          navigator.clipboard
            .writeText(code)
            .then(() => notify('Share code copied.'))
            .catch(() => notify('Select the code and copy it.'))
        }
      >
        Copy code
      </button>
      <div className="small">Anyone can open it with Add saber › Open a share code.</div>
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
              Share code…
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
        <label className="chk" title={STYLES[saber.style].blade}>
          <input type="checkbox" checked={saber.blade.on} onChange={(e) => dispatch({ type: 'setBlade', on: e.target.checked })} /> Blade
        </label>
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
