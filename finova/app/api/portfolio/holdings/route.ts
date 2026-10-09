import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { enrichHolding } from '@/lib/calculations/portfolio';
import type { Holding, AssetClass, Exchange } from '@/types/portfolio';
import type { AssetCategory } from '@/types/database';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('placeholder') && !url.includes('your_'));
}

// GET /api/portfolio/holdings — list all holdings
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();

  if (supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('holdings')
          .select(`*, broker_account:broker_accounts(*), instrument:instruments(*)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const holdings = (data as unknown as Holding[]).map(enrichHolding);
          return NextResponse.json({ holdings, isDemo: false });
        }
      }
    } catch {
      // Fallback
    }
  }

  // Persistent storage engine
  const rawHoldings = PortfolioStorage.getHoldings();
  const brokers = PortfolioStorage.getBrokerAccounts();

  const holdings: Holding[] = rawHoldings.map((h) => {
    const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
    const broker = brokers.find((b) => b.id === h.broker_account_id);
    const priceRecord = inst ? PortfolioStorage.getMarketPrice(inst.symbol) : null;

    // Convert asset_type ('STOCK' | 'MUTUAL_FUND' | 'REIT' | 'INVIT' | 'BOND') to AssetClass ('equity' | 'mf' | 'reit' | 'invit' | 'bond')
    let assetClass: AssetClass = 'equity';
    if (inst) {
      if (inst.asset_type === 'STOCK') assetClass = 'equity';
      else if (inst.asset_type === 'MUTUAL_FUND') assetClass = 'mf';
      else if (inst.asset_type === 'REIT') assetClass = 'reit';
      else if (inst.asset_type === 'INVIT') assetClass = 'invit';
      else if (inst.asset_type === 'BOND') assetClass = 'bond';
    }

    const current_price = priceRecord ? priceRecord.price : null;

    return {
      id: h.id,
      user_id: h.user_id,
      broker_account_id: h.broker_account_id,
      instrument_id: h.instrument_id,
      symbol: inst?.symbol || 'UNKNOWN',
      isin: inst?.isin || null,
      name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
      asset_class: assetClass,
      exchange: (inst?.exchange as Exchange) || 'NSE',
      quantity: h.quantity,
      avg_buy_price: h.average_buy_price,
      average_buy_price: h.average_buy_price,
      current_price,
      currency: h.currency,
      data_source: h.data_source,
      as_of: h.as_of,
      price_updated_at: priceRecord?.price_timestamp || null,
      created_at: h.created_at,
      updated_at: h.updated_at,
      broker_account: broker
        ? {
            id: broker.id,
            user_id: broker.user_id,
            broker_name: broker.display_name || broker.broker_code,
            display_name: broker.display_name,
            account_label: broker.display_name,
            account_type: broker.account_type,
            color_hex: broker.color_hex || '#3B82F6',
            is_active: true,
            created_at: broker.created_at,
          }
        : undefined,
    };
  });

  const enrichedHoldings = holdings.map(enrichHolding);
  return NextResponse.json({ holdings: enrichedHoldings, isDemo: false });
}

// POST /api/portfolio/holdings — add a new holding
export async function POST(request: Request) {
  const body = await request.json();

  const quantity = Number(body.quantity);
  const avgBuyPrice = Number(body.avg_buy_price ?? body.average_buy_price);

  if (!quantity || isNaN(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be a positive number greater than zero.' }, { status: 400 });
  }

  if (isNaN(avgBuyPrice) || avgBuyPrice < 0) {
    return NextResponse.json({ error: 'Average purchase price cannot be negative.' }, { status: 400 });
  }

  const brokerAccountId = body.broker_account_id;
  if (!brokerAccountId) {
    return NextResponse.json({ error: 'Broker account is required.' }, { status: 400 });
  }

  const symbol = (body.symbol || '').toUpperCase().trim();
  const name = (body.name || symbol).trim();
  const assetClass: AssetClass = body.asset_class || 'equity';
  const exchange = (body.exchange || 'NSE').toUpperCase();
  const isin = body.isin?.trim() || null;

  if (!symbol) {
    return NextResponse.json({ error: 'Instrument symbol or identifier is required.' }, { status: 400 });
  }

  // Map AssetClass to AssetCategory
  let assetCategory = 'STOCK';
  if (assetClass === 'mf') assetCategory = 'MUTUAL_FUND';
  else if (assetClass === 'reit') assetCategory = 'REIT';
  else if (assetClass === 'invit') assetCategory = 'INVIT';
  else if (assetClass === 'bond' || assetClass === 'sgb') assetCategory = 'BOND';

  // Resolve instrument
  const instrument = PortfolioStorage.resolveInstrument(
    symbol,
    name,
    assetCategory as AssetCategory,
    exchange,
    isin
  );

  const newHolding = PortfolioStorage.addHolding({
    user_id: 'current_user',
    broker_account_id: brokerAccountId,
    instrument_id: instrument.id,
    quantity,
    average_buy_price: avgBuyPrice,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: body.as_of || new Date().toISOString(),
  });

  const broker = PortfolioStorage.getBrokerAccounts().find((b) => b.id === brokerAccountId);
  const priceRecord = PortfolioStorage.getMarketPrice(symbol);

  const holdingItem: Holding = {
    id: newHolding.id,
    user_id: newHolding.user_id,
    broker_account_id: newHolding.broker_account_id,
    instrument_id: instrument.id,
    symbol: instrument.symbol,
    isin: instrument.isin,
    name: instrument.instrument_name,
    asset_class: assetClass,
    exchange: (instrument.exchange as Exchange) || 'NSE',
    quantity: newHolding.quantity,
    avg_buy_price: newHolding.average_buy_price,
    average_buy_price: newHolding.average_buy_price,
    current_price: priceRecord ? priceRecord.price : null,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: newHolding.as_of,
    price_updated_at: priceRecord?.price_timestamp || null,
    created_at: newHolding.created_at,
    updated_at: newHolding.updated_at,
    broker_account: broker
      ? {
          id: broker.id,
          user_id: broker.user_id,
          broker_name: broker.display_name,
          account_label: broker.display_name,
          account_type: broker.account_type,
          color_hex: broker.color_hex || '#3B82F6',
          is_active: true,
          created_at: broker.created_at,
        }
      : undefined,
  };

  return NextResponse.json({ holding: enrichHolding(holdingItem) }, { status: 201 });
}

// PUT /api/portfolio/holdings — edit an existing holding
export async function PUT(request: Request) {
  const body = await request.json();
  const { id, quantity, avg_buy_price, average_buy_price } = body;

  if (!id) {
    return NextResponse.json({ error: 'Holding ID is required.' }, { status: 400 });
  }

  const numQty = quantity !== undefined ? Number(quantity) : undefined;
  const numPrice = (avg_buy_price ?? average_buy_price) !== undefined ? Number(avg_buy_price ?? average_buy_price) : undefined;

  if (numQty !== undefined && (isNaN(numQty) || numQty <= 0)) {
    return NextResponse.json({ error: 'Quantity must be greater than zero.' }, { status: 400 });
  }

  if (numPrice !== undefined && (isNaN(numPrice) || numPrice < 0)) {
    return NextResponse.json({ error: 'Average purchase price cannot be negative.' }, { status: 400 });
  }

  const updated = PortfolioStorage.updateHolding(id, {
    quantity: numQty,
    average_buy_price: numPrice,
    as_of: new Date().toISOString(),
  });

  if (!updated) {
    return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
  }

  return NextResponse.json({ holding: updated });
}

// DELETE /api/portfolio/holdings?id=... — delete a holding
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Holding ID required' }, { status: 400 });
  }

  const deleted = PortfolioStorage.deleteHolding(id);
  return NextResponse.json({ success: deleted });
}
