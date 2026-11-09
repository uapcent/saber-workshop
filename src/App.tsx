import { useEffect, useMemo, useRef, useState } from 'react';
import { Compare } from './components/Compare';
import type { PartKey } from './components/graphics/Hilt';
import { PartsList } from './components/PartsList';
import { PartsPanel } from './components/PartsPanel';
import { SaberCard } from './components/SaberCard';
import { SaberPanel } from './components/SaberPanel';
import { TopBar } from './components/TopBar';
import { totals } from './lib/saber';
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

  const slot = state.slots[state.active];
  const saber = slot.saber;
  const sums = useMemo(() => state.slots.map((s) => totals(s.saber)), [state.slots]);

  // A selection belongs to one saber; switching sabers starts with everything closed.
  useEffect(() => setSelected(null), [slot.uid]);

  const interaction = {
    selected,
    onSelect: (key: PartKey) => setSelected((cur) => (cur === key ? null : key)),
  };

  return (
    <>
      <TopBar state={state} dispatch={dispatch} notify={notify} />

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
            diameters. Parts marked “approx.” are scaled from a related part. Colors sampled from the store's product photos. Prices and stock
            from lamadiluce.it, 9 Nov 2026. Unofficial planning tool.
          </p>
        </main>
      </div>

      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
