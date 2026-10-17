// A floating list closes on a press anywhere outside it, or on Escape (A4: Routine's folds open
// over the column rather than inside it, so the column never grows past the screen).
import { useEffect, useRef } from 'react';

export function useCloseOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  // The latest `close`, so an inline arrow from the caller doesn't resubscribe every render.
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      )
        closeRef.current();
    };
    window.addEventListener('pointerdown', off);
    window.addEventListener('keydown', off);
    return () => {
      window.removeEventListener('pointerdown', off);
      window.removeEventListener('keydown', off);
    };
  }, [open]);
  return ref;
}
