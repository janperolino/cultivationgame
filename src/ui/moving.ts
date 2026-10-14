// While the page scrolls or a canvas pans, every looping animation pauses (theme.css, `is-moving`).
// The panels' sheen and rim animate their own backgrounds, which repaints each panel and all
// inside it every frame; on a tall panel that repaint holds up the scroll, and parts of the page
// lag behind. Paused, a scroll or a drag only moves what is already painted.

/** How long after the last movement the animations wait to resume. */
const SETTLE_MS = 180;
let timer: number | undefined;

/** Marks the page as moving, until it has been still for a moment. */
export function markMoving(): void {
  const root = document.documentElement;
  if (!root.classList.contains('is-moving')) root.classList.add('is-moving');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => root.classList.remove('is-moving'), SETTLE_MS);
}
