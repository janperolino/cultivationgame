// The card beside a node on a fan (TreeFan.tsx): hovering or focusing a node shows it, it stays
// while the pointer crosses onto it so its Learn button can be pressed, and a click pins it open
// until it is closed, another node is pinned or the empty canvas is clicked. A hover over another
// node shows that one meanwhile, and the pinned card comes back after. The controls never change,
// so the fan's shapes can skip re-rendering while the view moves.
import { useMemo, useRef, useState } from 'react';

/** How long a card waits after the pointer leaves its node, so it can be reached. */
const GRACE_MS = 220;

export function useNodeTip<T extends { id: string }>() {
  const [hover, setHover] = useState<T | null>(null);
  const [pinned, setPinned] = useState<T | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const controls = useMemo(() => {
    const cancel = () => window.clearTimeout(timer.current);
    const leave = () => {
      cancel();
      timer.current = window.setTimeout(() => setHover(null), GRACE_MS);
    };
    return {
      enter(t: T) {
        cancel();
        setHover(t);
      },
      leave,
      /** Pins a card open, or closes it when it was the one pinned. */
      pin(t: T) {
        cancel();
        setHover(null);
        setPinned((p) => (p?.id === t.id ? null : t));
      },
      clear() {
        cancel();
        setHover(null);
        setPinned(null);
      },
      /** For the card itself: the pointer or focus on it keeps it open. */
      cardHandlers: {
        onPointerEnter: cancel,
        onPointerLeave: leave,
        onFocus: cancel,
        onBlur: leave,
      },
    };
  }, []);
  return { ...controls, shown: hover ?? pinned, pinned };
}
