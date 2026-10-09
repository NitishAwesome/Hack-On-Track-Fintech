'use client';

// ============================================================
// FINOVA — Dynamic Stock & Instrument Search Dropdown
// Debounced catalog search across Symbol, Company Name, and ISIN
// with real-time live market quote resolution & verification.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, TrendingDown, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import type { InvestmentInstrumentRow } from '@/types/database';
import type { AssetClass } from '@/types/portfolio';
import { formatStockPrice } from '@/lib/utils';

interface LiveQuoteState {
  price: number | null;
  previousClose: number | null;
  day_change: number | null;
  day_change_pct: number | null;
  source: string;
  status: string;
  price_timestamp: string;
  isAvailable: boolean;
}

interface StockSearchDropdownProps {
  onSelect: (instrument: {
    symbol: string;
    name: string;
    isin: string;
    exchange: string;
    assetClass: AssetClass;
    livePrice?: number | null;
  }) => void;
  selectedSymbol?: string;
  className?: string;
}

function mapAssetTypeToClass(assetType?: string): AssetClass {
  if (assetType === 'STOCK') return 'equity';
  if (assetType === 'MUTUAL_FUND') return 'mf';
  if (assetType === 'REIT') return 'reit';
  if (assetType === 'INVIT') return 'invit';
  if (assetType === 'BOND') return 'bond';
  return 'equity';
}

export function StockSearchDropdown({
  onSelect,
  selectedSymbol,
  className = '',
}: StockSearchDropdownProps) {
  const [query, setQuery] = useState(selectedSymbol || '');
  const [prevSymbol, setPrevSymbol] = useState(selectedSymbol);
  const [results, setResults] = useState<InvestmentInstrumentRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state during render when prop changes (React recommended pattern)
  if (selectedSymbol !== prevSymbol) {
    setPrevSymbol(selectedSymbol);
    setQuery(selectedSymbol || '');
  }

  // Live quote state for selected/highlighted instrument
  const [activeQuote, setActiveQuote] = useState<LiveQuoteState | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  // Batch quotes for search results
  const [resultQuotes, setResultQuotes] = useState<Record<string, LiveQuoteState>>({});
  const [isResultQuotesLoading, setIsResultQuotesLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live quote when selectedSymbol changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchLiveQuote(selectedSymbol);
    }
  }, [selectedSymbol]);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      const timer = setTimeout(() => {
        setResults([]);
        setResultQuotes({});
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/instruments?q=${encodeURIComponent(trimmed)}&limit=25`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.instruments || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Batch fetch quotes when results change
  useEffect(() => {
    if (!results || results.length === 0) {
      return;
    }

    // Limit to top 15 results to minimize request payload
    const symbols = Array.from(
      new Set(results.slice(0, 15).map((r) => r.symbol.toUpperCase()).filter(Boolean))
    );
    if (symbols.length === 0) return;

    let isMounted = true;

    async function fetchBatchQuotes() {
      setIsResultQuotesLoading(true);
      try {
        const res = await fetch(
          `/api/market/quotes?symbols=${encodeURIComponent(symbols.join(','))}&exchange=NSE`
        );
        if (!res.ok) throw new Error('Batch quote fetch failed');
        const data = await res.json();
        if (!isMounted) return;

        const newQuotes: Record<string, LiveQuoteState> = {};
        for (const sym of symbols) {
          const q = data.quotes?.[sym];
          if (q && q.isValid && typeof q.price === 'number') {
            newQuotes[sym] = {
              price: q.price,
              previousClose: q.previousClose ?? null,
              day_change: q.day_change ?? null,
              day_change_pct: q.day_change_pct ?? null,
              source: q.source || 'Yahoo Finance / yfinance',
              status: q.status || 'DELAYED',
              price_timestamp: q.price_timestamp || new Date().toISOString(),
              isAvailable: true,
            };
          } else {
            newQuotes[sym] = {
              price: null,
              previousClose: null,
              day_change: null,
              day_change_pct: null,
              source: 'Market Provider',
              status: 'UNAVAILABLE',
              price_timestamp: new Date().toISOString(),
              isAvailable: false,
            };
          }
        }
        setResultQuotes(newQuotes);
      } catch {
        if (!isMounted) return;
        const fallbackQuotes: Record<string, LiveQuoteState> = {};
        for (const sym of symbols) {
          fallbackQuotes[sym] = {
            price: null,
            previousClose: null,
            day_change: null,
            day_change_pct: null,
            source: 'Market Provider',
            status: 'UNAVAILABLE',
            price_timestamp: new Date().toISOString(),
            isAvailable: false,
          };
        }
        setResultQuotes(fallbackQuotes);
      } finally {
        if (isMounted) setIsResultQuotesLoading(false);
      }
    }

    fetchBatchQuotes();

    return () => {
      isMounted = false;
    };
  }, [results]);

  // Fetch verified dynamic quote from /api/market/quotes
  async function fetchLiveQuote(symbol: string, exchange: string = 'NSE') {
    if (!symbol) return;
    setIsQuoteLoading(true);

    try {
      const res = await fetch(
        `/api/market/quotes?symbols=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`
      );
      if (!res.ok) throw new Error('Failed to fetch quote');
      const data = await res.json();
      const quote = data.quotes?.[symbol.toUpperCase()];

      if (quote && quote.isValid && typeof quote.price === 'number') {
        setActiveQuote({
          price: quote.price,
          previousClose: quote.previousClose ?? null,
          day_change: quote.day_change ?? null,
          day_change_pct: quote.day_change_pct ?? null,
          source: quote.source || 'Yahoo Finance / yfinance',
          status: quote.status || 'DELAYED',
          price_timestamp: quote.price_timestamp || new Date().toISOString(),
          isAvailable: true,
        });
      } else {
        setActiveQuote({
          price: null,
          previousClose: null,
          day_change: null,
          day_change_pct: null,
          source: 'Market Provider',
          status: 'UNAVAILABLE',
          price_timestamp: new Date().toISOString(),
          isAvailable: false,
        });
      }
    } catch {
      setActiveQuote({
        price: null,
        previousClose: null,
        day_change: null,
        day_change_pct: null,
        source: 'Market Provider',
        status: 'UNAVAILABLE',
        price_timestamp: new Date().toISOString(),
        isAvailable: false,
      });
    } finally {
      setIsQuoteLoading(false);
    }
  }

  function handleSelect(inst: InvestmentInstrumentRow, quote?: LiveQuoteState) {
    const mappedClass = mapAssetTypeToClass(inst.asset_type);
    setQuery(inst.symbol);
    setIsOpen(false);

    if (quote && quote.isAvailable) {
      setActiveQuote(quote);
    } else {
      fetchLiveQuote(inst.symbol, inst.exchange || 'NSE');
    }

    onSelect({
      symbol: inst.symbol,
      name: inst.instrument_name,
      isin: inst.isin || '',
      exchange: inst.exchange || 'NSE',
      assetClass: mappedClass,
      livePrice: quote?.isAvailable ? quote.price : null,
    });
  }

  function handleCustomSelect() {
    const cleanSym = query.trim().toUpperCase();
    if (!cleanSym) return;
    setIsOpen(false);
    fetchLiveQuote(cleanSym, 'NSE');

    onSelect({
      symbol: cleanSym,
      name: cleanSym,
      isin: '',
      exchange: 'NSE',
      assetClass: 'equity',
    });
  }

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      <label className="block text-xs font-semibold text-slate-300">
        Search Stock Catalog (Nifty 50, Mid-Cap, Small-Cap, REITs, ETFs)
      </label>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by company name, NSE symbol (e.g. COAL INDIA, HERO, TCS), or ISIN..."
          className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />

        {isLoading ? (
          <Loader2 className="w-4 h-4 text-blue-400 absolute right-3 top-3 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setActiveQuote(null);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 absolute right-3 top-3 font-semibold"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown Results */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-800">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              Searching NSE verified catalog...
            </div>
          ) : results.length > 0 ? (
            results.map((inst) => {
              const itemQuote = resultQuotes[inst.symbol.toUpperCase()];
              const hasPrice = itemQuote?.isAvailable && typeof itemQuote.price === 'number';

              return (
                <div
                  key={inst.id}
                  onClick={() => handleSelect(inst, itemQuote)}
                  className="p-3 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-100 group-hover:text-blue-400 font-mono">
                        {inst.symbol}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {inst.exchange || 'NSE'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-900/40">
                        {inst.asset_type}
                      </span>
                      {hasPrice && itemQuote.status && (
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                            itemQuote.status === 'LIVE'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                              : 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                          }`}
                        >
                          {itemQuote.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-200 truncate mt-0.5 font-medium">{inst.instrument_name}</div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                      {inst.sector && <span>{inst.sector}</span>}
                      {inst.isin && <span className="font-mono text-[10px] text-slate-500">ISIN: {inst.isin}</span>}
                      {hasPrice && itemQuote.price_timestamp && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(itemQuote.price_timestamp).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          IST
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
                    {isResultQuotesLoading && !itemQuote ? (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                        <span>Price...</span>
                      </div>
                    ) : hasPrice ? (
                      <>
                        <span className="text-sm font-bold font-mono text-slate-100">
                          {formatStockPrice(itemQuote.price)}
                        </span>
                        {itemQuote.day_change !== null && itemQuote.day_change_pct !== null ? (
                          <span
                            className={`text-[10px] font-mono font-medium flex items-center gap-0.5 ${
                              itemQuote.day_change > 0
                                ? 'text-emerald-400'
                                : itemQuote.day_change < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {itemQuote.day_change > 0 ? '+' : ''}
                            {itemQuote.day_change.toFixed(2)} ({itemQuote.day_change_pct > 0 ? '+' : ''}
                            {itemQuote.day_change_pct.toFixed(2)}%)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">INR</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        Price unavailable
                      </span>
                    )}
                    <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      Select →
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-slate-400">No exact catalog match found for &ldquo;{query}&rdquo;.</p>
              <button
                type="button"
                onClick={handleCustomSelect}
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600/30 text-blue-300 hover:bg-blue-600/40 border border-blue-500/40 transition-colors"
              >
                Use &ldquo;{query.trim().toUpperCase()}&rdquo; as Custom NSE Symbol
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Live Quote Preview Card */}
      {isQuoteLoading ? (
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
          Fetching live verified market quote for {query.toUpperCase()}...
        </div>
      ) : activeQuote ? (
        <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Verified Dynamic Quote
            </span>

            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                activeQuote.isAvailable
                  ? activeQuote.status === 'LIVE'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                    : 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
              }`}
            >
              {activeQuote.isAvailable ? activeQuote.status : 'Price Unavailable'}
            </span>
          </div>

          {activeQuote.isAvailable && activeQuote.price !== null ? (
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-bold font-mono text-slate-100">
                  {formatStockPrice(activeQuote.price)}
                </span>
                {activeQuote.previousClose !== null && (
                  <span className="text-[11px] text-slate-400 ml-2 font-mono">
                    Prev Close: {formatStockPrice(activeQuote.previousClose)}
                  </span>
                )}
              </div>

              {activeQuote.day_change !== null && activeQuote.day_change_pct !== null && (
                <div
                  className={`text-xs font-semibold flex items-center gap-1 font-mono ${
                    activeQuote.day_change > 0
                      ? 'text-emerald-400'
                      : activeQuote.day_change < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {activeQuote.day_change > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : activeQuote.day_change < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5" />
                  ) : null}
                  <span>
                    {activeQuote.day_change > 0 ? '+' : ''}
                    {activeQuote.day_change.toFixed(2)} ({activeQuote.day_change_pct > 0 ? '+' : ''}
                    {activeQuote.day_change_pct.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Quote currently offline or unavailable for this instrument. Manual entry is supported.</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-750">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {activeQuote.isAvailable && activeQuote.price_timestamp
                ? new Date(activeQuote.price_timestamp).toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) + ' IST'
                : 'Timestamp unavailable'}
            </span>
            <span>Source: {activeQuote.source}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
