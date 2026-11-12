import { useEffect, useMemo, useRef, useState } from 'react';
import { Compare } from './components/Compare';
import type { PartKey } from './components/graphics/Hilt';
import type { Saber } from './types';
import { PartsList } from './components/PartsList';
import { PartsPanel } from './components/PartsPanel';
import { SaberCard } from './components/SaberCard';
import { SaberPanel } from './components/SaberPanel';
import { SharePreview } from './components/SharePreview';
import { TopBar } from './components/TopBar';
import { CATALOG_DATE } from './data/catalog';
import { normalizeSaber } from './data/models';
import { decodeSaber, shareCodeInUrl, totals } from './lib/saber';
import { useStoreCheck } from './lib/storeFeed';
import { MAX_SABERS } from './state/workshop';
import { useWorkshop } from './state/workshop';

function useToast(): [string, (message: string) => void] {
  const [message, setMessage] = useState('');
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (m: string) => {
    setMessage(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), 2600);
  };
  return [message, show];
}

export function App() {
  const [state, dispatch] = useWorkshop();
  const [selected, setSelected] = useState<PartKey | null>(null);
  const [toast, notify] = useToast();
  /** A saber from a share link, shown before it joins the workshop. */
  const [shared, setShared] = useState<Saber | null>(null);
  const store = useStoreCheck();
  const checkedAt = store.status === 'live' ? store.time : 0;

  const slot = state.slots[state.active];
  const saber = slot.saber;
  // checkedAt: live store prices arrived and replaced the catalog's, so the totals change.
  const sums = useMemo(() => state.slots.map((s) => totals(s.saber)), [state.slots, checkedAt]);

  // Share links (#s=<code>) open a preview of their saber, on load or when pasted into the address bar.
  useEffect(() => {
    const open = () => {
      const code = shareCodeInUrl();
      if (!code) return;
      // Clear the hash first so a reload (or React's second effect run) doesn't open the saber again.
      history.replaceState(null, '', location.pathname + location.search);
      let saber = null;
      try {
        saber = normalizeSaber(decodeSaber(code));
      } catch {
        /* not a share code */
      }
      if (saber) setShared(saber);
      else notify("That share link couldn't be read.");
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);

  // A selection belongs to one saber; switching sabers starts with everything closed.
  useEffect(() => setSelected(null), [slot.uid]);

  const interaction = {
    selected,
    onSelect: (key: PartKey) => setSelected((cur) => (cur === key ? null : key)),
  };

  return (
    <>
      <TopBar state={state} dispatch={dispatch} store={store} onShared={setShared} />

      <div className="app">
        <aside className="panel">
          <div className="panel-body">
            <SaberPanel saber={saber} index={state.active} count={state.slots.length} dispatch={dispatch} notify={notify} />
            <PartsPanel saber={saber} totals={sums[state.active]} selected={selected} onSelect={setSelected} dispatch={dispatch} />
          </div>
        </aside>

        <main className="stage">
          <div className="pinned">
            <SaberCard saber={saber} totals={sums[state.active]} interaction={interaction} />
          </div>
          <Compare slots={state.slots} totals={sums} active={state.active} dispatch={dispatch} />
          <PartsList saber={saber} totals={sums[state.active]} />
          <p className="note">
            Part outlines: SSe-3, Pommel Adaptor masks and coupler traced from the official Polaris exploded diagram (to scale, about 0.35 mm per
            pixel); SSe-1, SSe-2, X2, SSe-1/2 emitters and pommels from the official size chart (about 1.4 mm per pixel); EVO emitter, body and
            pommel measured from LamaDiLuce product photos and fitted to the published lengths (46, 180 and 34 mm visible) and 38 to 39 mm
            diameters. Parts marked “approx.” are scaled from a related part. Colors sampled from the store's product photos.{' '}
            {store.status === 'live'
              ? `Prices and stock from lamadiluce.it, checked today at ${new Date(store.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (once a day).`
              : store.status === 'checking'
                ? `Prices and stock from lamadiluce.it, ${CATALOG_DATE} (checking the store for current ones…).`
                : `Prices and stock from lamadiluce.it, ${CATALOG_DATE} (the store couldn't be reached).`}{' '}
            Unofficial planning tool.
          </p>
        </main>
      </div>

      {shared && (
        <SharePreview
          saber={shared}
          canOpen={state.slots.length < MAX_SABERS}
          maxSabers={MAX_SABERS}
          onClose={() => setShared(null)}
          onOpen={() => {
            dispatch({ type: 'add', saber: shared });
            notify(`Opened “${shared.name || 'Untitled'}” in the workshop.`);
            setShared(null);
          }}
          onSave={() => {
            dispatch({ type: 'saveSaber', saber: shared });
            notify(`Saved “${shared.name || 'Untitled'}” to your designs.`);
            setShared(null);
          }}
        />
      )}

      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
