// The dev console: ` (backquote) opens and closes it in dev builds. Type `help` for the commands;
// Up and Down walk the history, Tab completes a command name, Escape closes.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useGame } from '../store.ts';
import { COMMANDS, runCommand } from './commands.ts';

interface Line {
  kind: 'in' | 'out';
  text: string;
}

const HELLO: Line[] = [{ kind: 'out', text: 'Dev console. Type help. ` closes.' }];

export function DevConsole() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(HELLO);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '`') return;
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t !== inputRef.current;
      if (typing) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines, open]);

  if (!open) return null;

  const submit = () => {
    const line = input.trim();
    if (!line) return;
    const out = runCommand(line, useGame.getState());
    setHistory((h) => [line, ...h.filter((x) => x !== line)].slice(0, 50));
    setCursor(-1);
    setInput('');
    if (line.split(/\s+/)[0] === 'clear') {
      setLines([]);
      return;
    }
    const texts = Array.isArray(out) ? out : [out];
    const added: Line[] = [
      { kind: 'in', text: line },
      ...texts.map((text): Line => ({ kind: 'out', text })),
    ];
    setLines((l) => [...l, ...added].slice(-400));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(
        -1,
        Math.min(history.length - 1, cursor + (e.key === 'ArrowUp' ? 1 : -1)),
      );
      setCursor(next);
      setInput(next < 0 ? '' : history[next]!);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (input.includes(' ')) return;
      const matches = Object.keys(COMMANDS).filter((c) => c.startsWith(input));
      if (matches.length === 1) setInput(`${matches[0]} `);
      else if (matches.length > 1)
        setLines((l) => [...l, { kind: 'out', text: matches.join('  ') }]);
    }
  };

  return (
    <section className="dev-console" aria-label="Dev console">
      <div className="dev-log" ref={logRef}>
        {lines.map((l, i) => (
          <div key={i} className={l.kind === 'in' ? 'dev-in' : 'dev-out'}>
            {l.kind === 'in' ? `› ${l.text}` : l.text}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        className="dev-input"
        aria-label="Command"
        value={input}
        spellCheck={false}
        autoComplete="off"
        placeholder="help"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </section>
  );
}
