// A floating list closes on a press anywhere outside it, or on Escape (A4: Routine's folds open
// over the column rather than inside it, so the column never grows past the screen).
import { useEffect, useRef } from 'react';

export function useCloseOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      )
        close();
    };
    window.addEventListener('pointerdown', off);
    window.addEventListener('keydown', off);
    return () => {
      window.removeEventListener('pointerdown', off);
      window.removeEventListener('keydown', off);
    };
  }, [open, close]);
  return ref;
}
