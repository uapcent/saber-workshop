import { useEffect, useRef } from 'react';
import { totals } from '../lib/saber';
import type { Saber } from '../types';
import { PartsList } from './PartsList';
import { SaberCard } from './SaberCard';

interface Props {
  saber: Saber;
  /** False when the workshop already has the most sabers it can hold. */
  canOpen: boolean;
  maxSabers: number;
  onOpen: () => void;
  onSave: () => void;
  onClose: () => void;
}

/** A saber from a share link, shown on its own first: the reader decides whether to keep it. */
export function SharePreview({ saber, canOpen, maxSabers, onOpen, onSave, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const t = totals(saber);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="share-preview"
      aria-labelledby="share-preview-title"
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
    >
      <div className="share-preview-body">
        <div className="share-preview-head">
          <div>
            <div className="menu-heading">Shared with you</div>
            <h2 id="share-preview-title">{saber.name || 'Untitled'}</h2>
          </div>
          <button className="btn icon ghost" aria-label="Close" onClick={() => dialog.current?.close()}>
            ✕
          </button>
        </div>
        <SaberCard saber={saber} totals={t} />
        <PartsList saber={saber} totals={t} />
        <div className="share-preview-actions">
          {!canOpen && <span className="small">The workshop already has {maxSabers} sabers. Remove one to open this one.</span>}
          <button className="btn ghost" onClick={() => dialog.current?.close()}>
            Dismiss
          </button>
          <button className="btn" onClick={onSave}>
            Save to my designs
          </button>
          <button className="btn primary" disabled={!canOpen} onClick={onOpen} autoFocus={canOpen}>
            Open in the workshop
          </button>
        </div>
      </div>
    </dialog>
  );
}
