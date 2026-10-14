"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChartNoAxesCombined, ChevronRight, Search, X } from "lucide-react";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { navbarSearchResults } from "@/lib/research/globalSearch";
import { findEquity, INDEX_IDENTITIES } from "@/lib/research/catalog";
import { getRecentlyViewed } from "@/lib/market/recentlyViewed";

interface Selection {
  symbol: string;
  name: string;
  exchange: string;
  isin: string;
  sector: string;
  industry: string;
}
function instrument(symbol: string): Selection | null {
  const stock = findEquity(symbol),
    index = INDEX_IDENTITIES[symbol];
  return stock
    ? { ...stock, exchange: "NSE" }
    : index
      ? {
          symbol,
          name: index.name,
          exchange: "INDEX",
          sector: `${index.exchange} benchmark`,
          isin: "",
          industry: "",
        }
      : null;
}
export function StockSearchInput({
  onSelectStock,
  className = "",
}: {
  onSelectStock: (stock: Selection) => void;
  className?: string;
}) {
  const id = useId(),
    containerRef = useRef<HTMLDivElement>(null),
    inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(-1);
  const searching = query !== debounced;
  const results = useMemo(
    () =>
      (debounced.trim()
        ? navbarSearchResults(debounced)
            .filter((result) => result.kind !== "Page")
            .map((result) => instrument(result.id))
        : recent.map(instrument)
      )
        .filter((stock): stock is Selection => !!stock)
        .slice(0, 8),
    [debounced, recent],
  );
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const select = (stock: Selection) => {
    onSelectStock(stock);
    setQuery("");
    setDebounced("");
    setOpen(false);
    setSelected(-1);
  };
  return (
    <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          size={18}
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setSelected(-1);
          }}
          onFocus={() => {
            setRecent(getRecentlyViewed().map((item) => item.symbol));
            setOpen(true);
          }}
          role="combobox"
          aria-label="Search stocks and indices"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-results`}
          aria-activedescendant={
            open && selected >= 0 ? `${id}-option-${selected}` : undefined
          }
          placeholder="Search by company, symbol, ISIN or sector…"
          className="w-full min-h-12 bg-surface-raised/40 border border-border rounded-xl pl-12 pr-11 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/50"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setSelected(-1);
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (results.length && !searching)
                setSelected((index) =>
                  event.key === "ArrowDown"
                    ? (index + 1) % results.length
                    : (index <= 0 ? results.length : index) - 1,
                );
            } else if (
              event.key === "Enter" &&
              open &&
              results.length &&
              !searching
            ) {
              event.preventDefault();
              select(results[Math.max(0, selected)]);
            }
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear stock search"
            className="absolute right-2 top-1/2 -translate-y-1/2 research-icon-button"
            onClick={() => {
              setQuery("");
              setDebounced("");
              setSelected(-1);
              inputRef.current?.focus();
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
          <p className="text-[10px] text-muted px-4 py-2 border-b border-border">
            {query
              ? "Supported stocks and benchmark indices"
              : "Recently viewed on this device"}{" "}
            · ↑ ↓ select · Enter open
          </p>
          {searching ? (
            <p role="status" className="px-4 py-5 text-xs text-muted">
              Searching the supported catalog…
            </p>
          ) : (
            <ul
              id={`${id}-results`}
              role="listbox"
              aria-label="Instrument search results"
              className="max-h-[50vh] overflow-y-auto"
            >
              {results.map((stock, index) => (
                <li
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={selected === index}
                  key={stock.symbol}
                  className={`min-h-16 px-4 py-3 flex items-center gap-3 cursor-pointer ${selected === index ? "bg-surface-raised" : "hover:bg-surface-raised/60"}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(stock)}
                  onMouseEnter={() => setSelected(index)}
                >
                  {stock.exchange === "INDEX" ? (
                    <div className="text-cyan-600 dark:text-cyan-400">
                      <ChartNoAxesCombined size={22} />
                    </div>
                  ) : (
                    <CompanyLogo
                      symbol={stock.symbol}
                      name={stock.name}
                      size="sm"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">
                      {stock.symbol}
                      <span className="ml-2 text-[10px] text-muted font-normal">
                        {stock.exchange}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted truncate mt-1">
                      {stock.name} · {stock.sector}
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-muted shrink-0" />
                </li>
              ))}
            </ul>
          )}
          {!searching && !results.length && (
            <p role="status" className="px-4 py-5 text-xs text-muted">
              {query
                ? "No supported instrument matches. Try its symbol, company name or ISIN."
                : "Open a stock to build your recent research list."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
