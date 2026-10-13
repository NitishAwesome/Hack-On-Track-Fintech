import { NextResponse } from 'next/server';
import { VERIFIED_INDIAN_REITS } from '@/lib/data/reitData';
import { VERIFIED_INDIAN_INVITS } from '@/lib/data/invitData';
import { VERIFIED_INDIAN_BONDS } from '@/lib/data/bondData';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'reit' | 'invit' | 'bond' | null

  // Enhance REITs with any updated dynamic quote in PortfolioStorage
  const reits = VERIFIED_INDIAN_REITS.map((r) => {
    const marketPrice = PortfolioStorage.getMarketPrice(r.symbol, true);
    if (marketPrice && typeof marketPrice.price === 'number') {
      const price = marketPrice.price;
      const dayChange = marketPrice.day_change ?? r.dayChange;
      const dayChangePct = marketPrice.day_change_pct ?? r.dayChangePct;
      const yieldPct = r.trailingAnnualDpu === null ? null : Math.round((r.trailingAnnualDpu / price) * 10000) / 100;
      return {
        ...r,
        unitPrice: price,
        dayChange,
        dayChangePct,
        trailingYieldPct: yieldPct,
        high52w: marketPrice.high_52w ?? r.high52w,
        low52w: marketPrice.low_52w ?? r.low52w,
      };
    }
    return r;
  });

  // Enhance InvITs
  const invits = VERIFIED_INDIAN_INVITS.map((i) => {
    const marketPrice = PortfolioStorage.getMarketPrice(i.symbol, true);
    if (marketPrice && typeof marketPrice.price === 'number') {
      const price = marketPrice.price;
      const dayChange = marketPrice.day_change ?? i.dayChange;
      const dayChangePct = marketPrice.day_change_pct ?? i.dayChangePct;
      const yieldPct = i.trailingAnnualDpu === null ? null : Math.round((i.trailingAnnualDpu / price) * 10000) / 100;
      return {
        ...i,
        unitPrice: price,
        dayChange,
        dayChangePct,
        trailingYieldPct: yieldPct,
        high52w: marketPrice.high_52w ?? i.high52w,
        low52w: marketPrice.low_52w ?? i.low52w,
      };
    }
    return i;
  });

  // Enhance Bonds (honest pricing: only where secondary trade quote exists)
  const bonds = VERIFIED_INDIAN_BONDS.map((b) => {
    const marketPrice = PortfolioStorage.getMarketPrice(b.symbol, true);
    if (marketPrice && typeof marketPrice.price === 'number') {
      const price = marketPrice.price;
      const currentYield = Math.round(((b.faceValue * (b.couponRate / 100)) / price) * 10000) / 100;
      return {
        ...b,
        lastTradedPrice: price,
        isPriceAvailable: true,
        currentYieldPct: currentYield,
      };
    }
    return b;
  });

  if (type === 'reit') {
    return NextResponse.json({ success: true, reits });
  }
  if (type === 'invit') {
    return NextResponse.json({ success: true, invits });
  }
  if (type === 'bond') {
    return NextResponse.json({ success: true, bonds });
  }

  return NextResponse.json({
    success: true,
    data: {
      reits,
      invits,
      bonds,
    },
  });
}
