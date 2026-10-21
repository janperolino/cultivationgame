import type { ReactNode } from 'react';
import type { ScreenId } from './screens.ts';

// The rail's and the top's glyphs (A2, docs/mockups/shell-study.html): thin outlines on a 24 grid,
// in currentColor so the rail's states and Settings' accent tint them. Icons are code, never art
// (docs/art-pipeline.md).

const SCREEN_ICONS: Record<ScreenId, string> = {
  // A lotus.
  cultivate:
    'M12 3c2 2.4 2 5.8 0 8.8-2-3-2-6.4 0-8.8zM5 7.5c3 0 5.6 2.4 6.2 5.6-3 0-5.6-2.4-6.2-5.6zM19 7.5c-3 0-5.6 2.4-6.2 5.6 3 0 5.6-2.4 6.2-5.6zM4 15.5h16c-1 2.8-4.2 4.5-8 4.5s-7-1.7-8-4.5z',
  // The day wheel, its hand at an hour.
  routine: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3.5 2.5',
  // A pill furnace on three legs, its lid's knob and a curl of smoke.
  crafts:
    'M6 10h12v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4zM5 10h14M9 7h6l1 3H8zM12 7V5.5M7.5 19l-1 2.5M16.5 19l1 2.5M12 19v2.5',
  // A folded map.
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  // A tree.
  trees: 'M12 21v-7M12 14c-4 0-7-2.5-7-6s3-5 7-5 7 1.5 7 5-3 6-7 6zM9 9l3 3 3-3',
  // A tied pouch.
  bag: 'M9 3h6l-1.5 3h-3zM8.5 7h7c3 2.5 4.5 5.5 4.5 8.5 0 3-2.5 5.5-5.5 5.5h-5C6.5 21 4 18.5 4 15.5 4 12.5 5.5 9.5 8.5 7z',
  // Crossed swords.
  // A person.
  character:
    'M12 3.5a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6zM4.5 20.5c0-4.2 3.4-7.5 7.5-7.5s7.5 3.3 7.5 7.5',
  // Two people.
  people:
    'M9 5a3.2 3.2 0 1 1 0 6.4A3.2 3.2 0 0 1 9 5zM3 20c0-3.4 2.7-6 6-6s6 2.6 6 6M16 6.2a2.6 2.6 0 1 1 0 5.2M17 14c2.6.4 4 2.8 4 6',
  // A bound book.
  chronicle: 'M6 3h13v15H8a2 2 0 0 0 0 4h11M6 3a2 2 0 0 0-2 2v14.5',
  // A sun of spokes.
  settings:
    'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
};

function Svg({ children, className }: { children: ReactNode; className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

/** A screen's glyph on the rail. */
export function ScreenIcon({ id }: { id: ScreenId }) {
  return (
    <Svg className="rail-icon">
      <path d={SCREEN_ICONS[id]} />
    </Svg>
  );
}

/** The rail's mark at its head: a hall's roof and pillars, the abode. */
export function AbodeMark() {
  return (
    <Svg className="rail-mark-icon">
      <path d="M3 9.5L12 4l9 5.5M5 9.5h14M6.5 10v8M10 10v8M14 10v8M17.5 10v8M4 19h16M3 21h18" />
    </Svg>
  );
}

/** Spirit stones' glyph: a cut stone. */
export function StoneGlyph() {
  return (
    <Svg className="top-glyph">
      <path d="M7 4h10l4.5 5.2L12 20.5 2.5 9.2z" />
    </Svg>
  );
}

/** Insight's glyph: a spark. */
export function InsightGlyph() {
  return (
    <Svg className="top-glyph">
      <path d="M11 3l1.7 5.6L18 10.5l-5.3 1.9L11 18l-1.7-5.6L4 10.5l5.3-1.9z" />
    </Svg>
  );
}
