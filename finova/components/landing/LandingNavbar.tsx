'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Product', href: '#product' },
    { label: 'Investments', href: '#investments' },
    { label: 'Insights', href: '#insights' },
    { label: 'Learn', href: '/learn' },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-200 select-none border-b',
        scrolled
          ? 'bg-surface/85 backdrop-blur-md border-border shadow-sm'
          : 'bg-background/70 backdrop-blur-sm border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg">
            <FinovaLogo size="sm" variant="horizontal" />
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold tracking-wide" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-muted hover:text-foreground transition-colors duration-150 py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/login"
            className="px-3.5 py-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors rounded-lg"
          >
            Sign In
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-border bg-surface text-muted hover:text-foreground transition-colors"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface/95 backdrop-blur-xl px-4 pt-3 pb-6 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 pb-4 border-b border-border text-sm font-medium">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-4 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold rounded-xl border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl shadow-sm hover:opacity-95 transition-opacity"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default LandingNavbar;
