'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, Hash } from 'lucide-react';
import { EXPANDED_NSE_STOCKS, type CatalogInstrument } from '@/lib/market/stockCatalog';

interface StockSearchInputProps {
  onSelectStock: (stock: { symbol: string; name: string; exchange: string; isin: string; sector: string; industry: string }) => void;
  className?: string;
}

export function StockSearchInput({ onSelectStock, className = '' }: StockSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogInstrument[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced search across catalog
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim().toUpperCase();
      if (!trimmed) {
        setResults([]);
        setIsOpen(false);
        setIsSearching(false);
        return;
      }

      const filtered = EXPANDED_NSE_STOCKS.filter((item) => {
        const symbolMatch = item.symbol.toUpperCase().includes(trimmed);
        const nameMatch = item.name.toUpperCase().includes(trimmed);
        const isinMatch = item.isin?.toUpperCase().includes(trimmed);
        const sectorMatch = item.sector?.toUpperCase().includes(trimmed);
        const industryMatch = item.industry?.toUpperCase().includes(trimmed);
        return symbolMatch || nameMatch || isinMatch || sectorMatch || industryMatch;
      }).slice(0, 8); // Top 8 matches

      setResults(filtered);
      setIsOpen(true);
      setSelectedIndex(-1);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          selectItem(results[selectedIndex]);
        } else if (results.length > 0) {
          selectItem(results[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectItem = (item: CatalogInstrument) => {
    onSelectStock({
      symbol: item.symbol,
      name: item.name,
      exchange: 'NSE',
      isin: item.isin,
      sector: item.sector,
      industry: item.industry,
    });
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim() && results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search stocks by name, symbol (e.g. RELIANCE, TCS, INFY), ISIN, or sector..."
          className="w-full pl-10 pr-10 py-2.5 bg-card/80 border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="stock-search-results"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-raised transition"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          id="stock-search-results"
          className="absolute z-50 left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden backdrop-blur-md"
        >
          {isSearching ? (
            <div className="p-4 text-xs text-muted flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              Searching verified instrument catalog...
            </div>
          ) : results.length > 0 ? (
            <ul ref={listRef} role="listbox" className="max-h-80 overflow-y-auto py-1 divide-y divide-border/20">
              {results.map((item, idx) => {
                const isHighlighted = idx === selectedIndex;
                return (
                  <li
                    key={item.symbol}
                    role="option"
                    aria-selected={isHighlighted}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isHighlighted ? 'bg-surface-raised text-foreground' : 'hover:bg-surface-raised text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center shrink-0 text-brand font-bold text-xs">
                        {item.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{item.symbol}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-surface-raised text-muted border border-border">
                            NSE
                          </span>
                          <span className="text-[11px] text-muted truncate max-w-[120px] md:max-w-[200px]">
                            {item.sector}
                          </span>
                        </div>
                        <div className="text-xs text-muted truncate">{item.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted hidden sm:inline-flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />
                        {item.isin}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted" />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-xs text-muted">
              No verified Indian equity found matching <span className="text-foreground font-semibold">&quot;{query}&quot;</span>.
              <br />
              Try searching by ticker (e.g. RELIANCE, TCS) or sector (e.g. Technology, Banking).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
