import { useEffect, useState } from 'react';
import { checkStore, type StoreUpdate, type UpdateKind } from '../lib/storeFeed';
import { Menu } from './Menu';

/** Updates already opened in this browser, so the badge only counts what's new to you. */
const SEEN_KEY = 'saberWorkshop.seenStoreUpdates';

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

const SECTIONS: { kinds: UpdateKind[]; title: string }[] = [
  { kinds: ['new'], title: 'In the store, not in the workshop yet' },
  { kinds: ['in-stock'], title: 'Back in stock' },
  { kinds: ['out-of-stock'], title: 'Now out of stock' },
  { kinds: ['price'], title: 'Price changes' },
  { kinds: ['gone'], title: 'No longer listed' },
];

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/** Top-bar bell: live comparison of the store with the workshop's catalog. */
export function StoreBell() {
  const [updates, setUpdates] = useState<StoreUpdate[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [seen, setSeen] = useState(readSeen);

  useEffect(() => {
    let alive = true;
    checkStore()
      .then((u) => alive && setUpdates(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const unseen = updates?.filter((u) => !seen.has(u.key)).length ?? 0;

  const markSeen = () => {
    if (!updates?.length) return;
    const next = new Set(updates.map((u) => u.key));
    setSeen(next);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
    } catch {
      /* not remembered: the badge will show again next visit */
    }
  };

  return (
    <Menu
      label={
        <>
          <BellIcon />
          {unseen > 0 && <span className="bell-badge">{unseen}</span>}
        </>
      }
      ariaLabel={unseen ? `Store updates, ${unseen} new` : 'Store updates'}
      className="btn ghost bell"
      align="right"
      onClose={markSeen}
    >
      {() => (
        <div className="bell-panel">
          <div className="bell-title">Store updates</div>
          {failed && <div className="menu-empty">Couldn't reach lamadiluce.it. Prices and stock are from 9 Nov 2026.</div>}
          {!failed && !updates && <div className="menu-empty">Checking the store…</div>}
          {updates?.length === 0 && <div className="menu-empty">Everything matches the store: no new parts, same prices and stock.</div>}
          {updates &&
            SECTIONS.map(({ kinds, title }) => {
              const items = updates.filter((u) => kinds.includes(u.kind));
              if (!items.length) return null;
              return (
                <div key={title}>
                  <div className="menu-heading">{title}</div>
                  {items.map((u) => (
                    <a key={u.key} className={'bell-item' + (seen.has(u.key) ? '' : ' unseen')} href={u.url} target="_blank" rel="noopener">
                      <span className="bell-item-title">{u.title}</span>
                      <span className="bell-item-detail">{u.detail}</span>
                    </a>
                  ))}
                </div>
              );
            })}
          {updates && updates.length > 0 && (
            <div className="bell-foot">Compared with the workshop's catalog of 9 Nov 2026. Links open the store.</div>
          )}
        </div>
      )}
    </Menu>
  );
}
