import { useEffect, useRef, useState, type ReactNode } from 'react';

interface MenuProps {
  /** Contents of the trigger button. */
  label: ReactNode;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
  align?: 'left' | 'right';
  /** Called whenever the menu closes (to reset sub-views). */
  onClose?: () => void;
  /** Menu body; call `close` after an action. */
  children: (close: () => void) => ReactNode;
}

/** A button that opens a dropdown panel; closes on outside click or Escape. */
export function Menu({ label, ariaLabel, className = 'btn', disabled, title, align = 'left', onClose, children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      onClose?.();
      return;
    }
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={root}>
      <button
        type="button"
        className={className + (open ? ' open' : '')}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        title={title}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && (
        <div className={`menu-panel ${align}`} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
