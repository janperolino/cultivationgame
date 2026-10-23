// The narrator's prose revealed at a steady pace (after P3.9c, Jan: the stream arrived in chunks
// and looked ugly). GLM sends its words in uneven bursts; the page shows them a few letters a frame
// instead, speeding up when a burst leaves it behind so it never lags more than about a second. The
// reveal carries over when the streamed text becomes the told turn, so nothing jumps at the end. A
// turn already told when the page opens shows whole, and so does everything under reduced motion.
import { useEffect, useRef, useState } from 'react';

/** Letters a second at the least, and the most the reveal may lag behind what has arrived. */
const PACE = 60;
const MOST_BEHIND = 1;

/** The text being revealed and how much of it shows, kept across the stream's end. */
let live: { text: string; n: number } | null = null;

/** Where a reveal of `text` starts: where the live one got to if `text` carries it on. */
function startOf(text: string, fresh: boolean): number {
  if (live && live.n > 0 && text.startsWith(live.text.slice(0, live.n))) return live.n;
  return fresh ? 0 : text.length;
}

/**
 * How much of `text` shows now. `fresh` text (streaming in) starts from nothing; anything else
 * shows whole unless it carries on the live reveal. `skip` shows the rest at once.
 */
export function useReveal(
  text: string,
  fresh: boolean,
  instant: boolean,
): { shown: string; done: boolean; skip: () => void } {
  const [n, setN] = useState(() => (instant ? text.length : startOf(text, fresh)));
  const at = useRef(n);
  const target = useRef(text);
  target.current = text;

  useEffect(() => {
    if (instant) {
      at.current = text.length;
      setN(text.length);
      return;
    }
    if (at.current >= text.length) {
      live = { text, n: at.current };
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const all = target.current.length;
      const behind = all - at.current;
      const rate = Math.max(PACE, behind / MOST_BEHIND);
      at.current = Math.min(all, at.current + rate * dt);
      live = { text: target.current, n: Math.floor(at.current) };
      setN(Math.floor(at.current));
      if (at.current < all) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, instant]);

  const shown = text.slice(0, Math.min(n, text.length));
  return {
    shown,
    done: shown.length >= text.length,
    skip: () => {
      at.current = target.current.length;
      live = { text: target.current, n: at.current };
      setN(at.current);
    },
  };
}
