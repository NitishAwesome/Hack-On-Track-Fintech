'use client';

import { useId, useRef, useState, useEffect, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { navbarSearchResults, browseSearchHref } from '@/lib/research/globalSearch';

export function NavbarSearch({ inputRef: providedRef, autoFocus = false, onNavigate }: {
  inputRef?: RefObject<HTMLInputElement | null>; autoFocus?: boolean; onNavigate?: () => void;
}) {
  const router = useRouter();
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = providedRef || localRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(-1);
  const results = navbarSearchResults(query);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  function navigate(href: string) {
    setOpen(false); setQuery(''); setSelected(-1);
    onNavigate?.(); router.push(href);
  }
  function submit() {
    const exactQuery = query.trim().toLowerCase().replace(/\.(ns|bo)$/, '');
    const choice = selected >= 0 && open ? results[selected] : results.find(result => result.label.toLowerCase() === exactQuery) || (results.length === 1 ? results[0] : undefined);
    if (choice) navigate(choice.href);
    else if (query.trim()) navigate(browseSearchHref(query));
  }

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <form role="search" onSubmit={event => { event.preventDefault(); submit(); }} className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs border border-border bg-surface-raised focus-within:border-brand">
        <Search className="w-3.5 h-3.5 shrink-0 text-muted" />
        <input ref={inputRef} type="search" autoFocus={autoFocus} aria-label="Search stocks or pages" placeholder="Search stocks or pages..."
          className="bg-transparent min-w-0 w-full flex-1 text-foreground focus:outline-none placeholder:text-muted"
          value={query} role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls={`${id}-results`}
          aria-activedescendant={open && selected >= 0 && results[selected] ? `${id}-${selected}` : undefined}
          aria-keyshortcuts="/ Control+k Meta+k"
          onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setSelected(-1); setOpen(true); }}
          onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); submit(); }
            if (event.key === 'Escape') { setOpen(false); setSelected(-1); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); setOpen(true);
              if (results.length) setSelected(index => event.key === 'ArrowDown' ? (index + 1) % results.length : (index <= 0 ? results.length : index) - 1);
            }
          }} />
        {query && <button type="button" aria-label="Clear navbar search" onClick={() => { setQuery(''); setSelected(-1); inputRef.current?.focus(); }} className="text-muted hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        <button type="submit" disabled={!query.trim()} aria-label="Submit navbar search" className="rounded text-muted hover:text-brand disabled:opacity-40 p-0.5"><ArrowUpRight className="w-3.5 h-3.5" /></button>
      </form>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-full md:w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-xl z-50 overflow-hidden">
          <p className="px-3 py-2 text-[10px] text-muted border-b border-border">{query.trim() ? 'Stocks, indices and pages' : 'Quick navigation'} · ↑ ↓ to select · Enter to open</p>
          <ul id={`${id}-results`} role="listbox" aria-label="Navbar search results" className="max-h-[55vh] overflow-y-auto py-1">
            {results.map((result, index) => <li key={result.id} id={`${id}-${index}`} role="option" aria-selected={selected === index}
              onMouseDown={event => event.preventDefault()} onClick={() => navigate(result.href)} onMouseEnter={() => setSelected(index)}
              className={`cursor-pointer px-3 py-2.5 flex items-center gap-3 ${selected === index ? 'bg-surface-raised' : 'hover:bg-surface-raised'}`}>
              <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground truncate">{result.label}</p><p className="text-[11px] text-muted truncate">{result.detail}</p></div>
              <span className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5 shrink-0">{result.kind}</span>
            </li>)}
          </ul>
          {!results.length && <p role="status" className="text-xs text-muted px-3 py-3">No matching stock or page. Try a ticker, company, sector or page name.</p>}
          {query.trim() && <button type="button" onClick={() => navigate(browseSearchHref(query))} className="text-xs text-brand hover:bg-surface-raised px-3 py-3 border-t border-border w-full text-left">View all stock matches for “{query.trim()}” →</button>}
        </div>
      )}
    </div>
  );
}
