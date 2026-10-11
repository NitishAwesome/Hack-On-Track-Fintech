import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { enrichHolding } from '@/lib/calculations/portfolio';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { resolveQuotesForHoldings } from '@/lib/market/holdingQuoteResolver';
import { MarketDataService } from '@/lib/services/marketData';
import type { Holding, AssetClass, Exchange, AccountType } from '@/types/portfolio';
import type { AssetCategory } from '@/types/database';

export const dynamic = 'force-dynamic';

function mapAssetTypeToClass(assetType?: string): AssetClass {
  if (assetType === 'STOCK') return 'equity';
  if (assetType === 'MUTUAL_FUND') return 'mf';
  if (assetType === 'REIT') return 'reit';
  if (assetType === 'INVIT') return 'invit';
  if (assetType === 'BOND') return 'bond';
  return 'equity';
}

function mapAssetClassToCategory(assetClass: AssetClass): AssetCategory {
  if (assetClass === 'mf') return 'MUTUAL_FUND';
  if (assetClass === 'reit') return 'REIT';
  if (assetClass === 'invit') return 'INVIT';
  if (assetClass === 'bond' || assetClass === 'sgb') return 'BOND';
  return 'STOCK';
}

// GET /api/portfolio/holdings — list all holdings
export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to view holdings.' },
          { status: 401 }
        );
      }

      const { data, error } = await supabase
        .from('holdings')
        .select(`
          id,
          user_id,
          broker_account_id,
          instrument_id,
          quantity,
          average_buy_price,
          currency,
          data_source,
          as_of,
          created_at,
          updated_at,
          broker_account:broker_accounts(*),
          instrument:instruments(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[API /api/portfolio/holdings GET] Supabase query error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to fetch holdings from cloud database.' },
          { status: 500 }
        );
      }

      type RawHoldingItem = {
        id: string;
        user_id: string;
        broker_account_id: string;
        instrument_id: string;
        quantity: number | string;
        average_buy_price: number | string;
        currency: string;
        data_source: string;
        as_of: string;
        created_at: string;
        updated_at: string;
        broker_account?: {
          id: string;
          user_id: string;
          broker_code?: string;
          display_name?: string;
          account_type?: string;
          color_hex?: string;
          created_at?: string;
        };
        instrument?: {
          id: string;
          symbol: string;
          instrument_name: string;
          asset_type: string;
          exchange: string;
          isin: string | null;
          sector?: string | null;
          industry?: string | null;
        };
      };

      const rawItems = (data as unknown as RawHoldingItem[]) || [];
      const quotesMap = await resolveQuotesForHoldings(
        rawItems.map((r) => ({
          symbol: r.instrument?.symbol,
          exchange: r.instrument?.exchange,
        }))
      );

      const holdings: Holding[] = rawItems.map((row) => {
        const inst = row.instrument;
        const broker = row.broker_account;
        const assetClass = mapAssetTypeToClass(inst?.asset_type);
        const sym = inst?.symbol ? inst.symbol.toUpperCase() : '';
        const quote = sym ? quotesMap.get(sym) : null;
        const hasValidQuote = Boolean(quote && quote.isValid && quote.price !== null && quote.price > 0);

        const current_price = hasValidQuote ? quote!.price : null;
        const price_updated_at = hasValidQuote ? quote!.price_timestamp : null;
        const price_source = hasValidQuote ? quote!.source : null;
        const price_status = hasValidQuote ? quote!.status : (quote?.status || 'UNAVAILABLE');
        const price_unavailability_reason = hasValidQuote ? null : (quote?.rejectionReason || 'Price unavailable');

        return {
          id: row.id,
          user_id: row.user_id,
          broker_account_id: row.broker_account_id,
          instrument_id: row.instrument_id,
          symbol: inst?.symbol || 'UNKNOWN',
          isin: inst?.isin || null,
          name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
          asset_class: assetClass,
          exchange: (inst?.exchange as Exchange) || 'NSE',
          quantity: Number(row.quantity),
          avg_buy_price: Number(row.average_buy_price),
          average_buy_price: Number(row.average_buy_price),
          current_price,
          currency: row.currency || 'INR',
          data_source: row.data_source || 'MANUAL',
          as_of: row.as_of,
          price_updated_at,
          price_source,
          price_status,
          price_unavailability_reason,
          created_at: row.created_at,
          updated_at: row.updated_at,
          sector: inst?.sector || null,
          industry: inst?.industry || null,
          broker_account: broker
            ? {
                id: broker.id,
                user_id: broker.user_id,
                broker_name: broker.display_name || broker.broker_code || 'Broker',
                display_name: broker.display_name,
                account_label: broker.display_name || null,
                account_type: (broker.account_type as AccountType) || 'broker',
                color_hex: broker.color_hex || '#3B82F6',
                is_active: true,
                created_at: broker.created_at || new Date().toISOString(),
              }
            : undefined,
        };
      });

      const enrichedHoldings = holdings.map(enrichHolding);
      return NextResponse.json({ holdings: enrichedHoldings, isDemo: false, storageMode: 'cloud' });
    } catch (err) {
      console.error('[API /api/portfolio/holdings GET] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service. Please check network and configuration.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode (Supabase unconfigured)
  const rawHoldings = PortfolioStorage.getHoldings();
  const brokers = PortfolioStorage.getBrokerAccounts();

  const holdingsWithInst = rawHoldings.map((h) => {
    const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
    return { h, inst };
  });

  const quotesMap = await resolveQuotesForHoldings(
    holdingsWithInst.map(({ inst }) => ({
      symbol: inst?.symbol,
      exchange: inst?.exchange,
    }))
  );

  const holdings: Holding[] = holdingsWithInst.map(({ h, inst }) => {
    const broker = brokers.find((b) => b.id === h.broker_account_id);
    const sym = inst?.symbol ? inst.symbol.toUpperCase() : '';
    const quote = sym ? quotesMap.get(sym) : null;
    const hasValidQuote = Boolean(quote && quote.isValid && quote.price !== null && quote.price > 0);

    const current_price = hasValidQuote ? quote!.price : null;
    const price_updated_at = hasValidQuote ? quote!.price_timestamp : null;
    const price_source = hasValidQuote ? quote!.source : null;
    const price_status = hasValidQuote ? quote!.status : (quote?.status || 'UNAVAILABLE');
    const price_unavailability_reason = hasValidQuote ? null : (quote?.rejectionReason || 'Price unavailable');
    const assetClass = mapAssetTypeToClass(inst?.asset_type);

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
      price_updated_at,
      price_source,
      price_status,
      price_unavailability_reason,
      created_at: h.created_at,
      updated_at: h.updated_at,
      sector: inst?.sector || null,
      industry: inst?.industry || null,
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
  return NextResponse.json({ holdings: enrichedHoldings, isDemo: true, storageMode: 'local' });
}

// POST /api/portfolio/holdings — add a new holding
export async function POST(request: Request) {
  const body = await request.json();

  const quantity = Number(body.quantity);
  const avgBuyPrice = Number(body.avg_buy_price ?? body.average_buy_price);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be a positive number greater than zero.' }, { status: 400 });
  }

  if (!Number.isFinite(avgBuyPrice) || avgBuyPrice < 0) {
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

  const assetCategory = mapAssetClassToCategory(assetClass);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to add a holding.' },
          { status: 401 }
        );
      }

      // 1. Verify broker account exists and belongs to this authenticated user
      const { data: broker, error: brokerErr } = await supabase
        .from('broker_accounts')
        .select('*')
        .eq('id', brokerAccountId)
        .eq('user_id', user.id)
        .single();

      if (brokerErr || !broker) {
        return NextResponse.json(
          { error: 'Specified broker account not found or access denied.' },
          { status: 400 }
        );
      }

      // 2. Resolve or register instrument in public.instruments
      let instrumentId: string;
      const { data: existingInst, error: instLookupErr } = await supabase
        .from('instruments')
        .select('*')
        .eq('symbol', symbol)
        .eq('exchange', exchange)
        .maybeSingle();

      if (instLookupErr) {
        console.error('[API /api/portfolio/holdings POST] Instrument lookup error:', instLookupErr.message);
        return NextResponse.json(
          { error: 'Database error: failed to resolve instrument catalog entry.' },
          { status: 500 }
        );
      }

      if (existingInst) {
        instrumentId = existingInst.id;
      } else {
        // Register custom instrument owned by user
        const { data: newInst, error: newInstErr } = await supabase
          .from('instruments')
          .insert({
            symbol,
            instrument_name: name,
            asset_type: assetCategory,
            exchange,
            isin,
            currency: 'INR',
            is_active: true,
            is_custom: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (newInstErr || !newInst) {
          console.error('[API /api/portfolio/holdings POST] Instrument creation error:', newInstErr?.message);
          return NextResponse.json(
            { error: 'Database error: failed to register instrument.' },
            { status: 500 }
          );
        }
        instrumentId = newInst.id;
      }

      // 3. LEDGER INTEGRITY CHECK: Reject direct holding creation if a ledger-managed position exists
      const { data: existingHolding } = await supabase
        .from('holdings')
        .select('id, is_ledger_managed')
        .eq('broker_account_id', brokerAccountId)
        .eq('instrument_id', instrumentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingHolding) {
        const { count: txCount } = await supabase
          .from('investment_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('broker_account_id', brokerAccountId)
          .eq('instrument_id', instrumentId);

        if (existingHolding.is_ledger_managed || (txCount !== null && txCount > 0)) {
          return NextResponse.json(
            {
              error: 'A ledger-managed position already exists for this instrument and broker account. Record BUY/SELL transactions in your tradebook to adjust this position.',
              code: 'LEDGER_MANAGED_HOLDING',
            },
            { status: 400 }
          );
        }
      }

      // 4. Upsert holding with composite uniqueness constraint (broker_account_id, instrument_id)
      const { data: holdingRow, error: holdingErr } = await supabase
        .from('holdings')
        .upsert(
          {
            user_id: user.id,
            broker_account_id: brokerAccountId,
            instrument_id: instrumentId,
            quantity,
            average_buy_price: avgBuyPrice,
            currency: 'INR',
            data_source: 'MANUAL',
            as_of: body.as_of || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'broker_account_id,instrument_id' }
        )
        .select(`*, broker_account:broker_accounts(*), instrument:instruments(*)`)
        .single();

      if (holdingErr || !holdingRow) {
        console.error('[API /api/portfolio/holdings POST] Holding insert error:', holdingErr?.message);
        return NextResponse.json(
          { error: 'Database error: failed to persist holding to cloud database.' },
          { status: 500 }
        );
      }

      const quote = await MarketDataService.getQuote(symbol, exchange);
      const hasValidQuote = Boolean(quote && quote.isValid);
      const current_price = hasValidQuote ? quote!.price : null;
      const price_updated_at = hasValidQuote ? quote!.price_timestamp : null;
      const price_source = hasValidQuote ? quote!.source : null;
      const price_status = hasValidQuote ? quote!.status : null;

      const holdingItem: Holding = {
        id: holdingRow.id,
        user_id: holdingRow.user_id,
        broker_account_id: holdingRow.broker_account_id,
        instrument_id: instrumentId,
        symbol,
        isin,
        name,
        asset_class: assetClass,
        exchange: exchange as Exchange,
        quantity,
        avg_buy_price: avgBuyPrice,
        average_buy_price: avgBuyPrice,
        current_price,
        currency: 'INR',
        data_source: 'MANUAL',
        as_of: holdingRow.as_of,
        price_updated_at,
        price_source,
        price_status,
        created_at: holdingRow.created_at,
        updated_at: holdingRow.updated_at,
        broker_account: {
          id: broker.id,
          user_id: broker.user_id,
          broker_name: broker.display_name || broker.broker_code,
          account_label: broker.display_name,
          account_type: broker.account_type,
          color_hex: broker.color_hex || '#3B82F6',
          is_active: true,
          created_at: broker.created_at,
        },
      };

      return NextResponse.json({ holding: enrichHolding(holdingItem), storageMode: 'cloud' }, { status: 201 });
    } catch (err) {
      console.error('[API /api/portfolio/holdings POST] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service. Please check network and configuration.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode
  const instrument = PortfolioStorage.resolveInstrument(
    symbol,
    name,
    assetCategory,
    exchange,
    isin
  );

  const existingHoldings = PortfolioStorage.getHoldings();
  const existingHolding = existingHoldings.find(
    (h) => h.broker_account_id === brokerAccountId && h.instrument_id === instrument.id
  );
  if (existingHolding) {
    const txCount = PortfolioStorage.getState().transactions.filter(
      (tx) => tx.broker_account_id === brokerAccountId && tx.instrument_id === instrument.id
    ).length;
    if (existingHolding.is_ledger_managed || txCount > 0) {
      return NextResponse.json(
        {
          error: 'A ledger-managed position already exists for this instrument and broker account. Record BUY/SELL transactions in your tradebook to adjust this position.',
          code: 'LEDGER_MANAGED_HOLDING',
        },
        { status: 400 }
      );
    }
  }

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
  const quote = await MarketDataService.getQuote(symbol, exchange);
  const hasValidQuote = Boolean(quote && quote.isValid);
  const current_price = hasValidQuote ? quote!.price : null;
  const price_updated_at = hasValidQuote ? quote!.price_timestamp : null;
  const price_source = hasValidQuote ? quote!.source : null;
  const price_status = hasValidQuote ? quote!.status : null;

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
    current_price,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: newHolding.as_of,
    price_updated_at,
    price_source,
    price_status,
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

  return NextResponse.json({ holding: enrichHolding(holdingItem), isDemo: true, storageMode: 'local' }, { status: 201 });
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

  if (numQty !== undefined && (!Number.isFinite(numQty) || numQty <= 0)) {
    return NextResponse.json({ error: 'Quantity must be a positive number greater than zero.' }, { status: 400 });
  }

  if (numPrice !== undefined && (!Number.isFinite(numPrice) || numPrice < 0)) {
    return NextResponse.json({ error: 'Average purchase price cannot be negative.' }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to update a holding.' },
          { status: 401 }
        );
      }

      // LEDGER PROTECTION CHECK: Verify holding and ensure it is not managed by transactions
      const { data: existingHolding, error: fetchErr } = await supabase
        .from('holdings')
        .select('id, user_id, broker_account_id, instrument_id, is_ledger_managed')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchErr || !existingHolding) {
        return NextResponse.json({ error: 'Holding not found or access denied.' }, { status: 404 });
      }

      const { count: txCount } = await supabase
        .from('investment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('broker_account_id', existingHolding.broker_account_id)
        .eq('instrument_id', existingHolding.instrument_id);

      if (existingHolding.is_ledger_managed || (txCount !== null && txCount > 0)) {
        return NextResponse.json(
          {
            error: 'This holding is managed by the transaction ledger. Direct position edits are disabled to maintain accounting consistency. Please edit or add transactions in your tradebook.',
            code: 'LEDGER_MANAGED_HOLDING',
          },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (numQty !== undefined) updateData.quantity = numQty;
      if (numPrice !== undefined) updateData.average_buy_price = numPrice;
      if (body.as_of) updateData.as_of = body.as_of;

      const { data, error } = await supabase
        .from('holdings')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id) // Enforces strict user isolation
        .select(`*, broker_account:broker_accounts(*), instrument:instruments(*)`)
        .single();

      if (error) {
        console.error('[API /api/portfolio/holdings PUT] Supabase update error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to update holding in cloud database.' },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json({ error: 'Holding not found or access denied.' }, { status: 404 });
      }

      type SingleHoldingRow = {
        id: string;
        user_id: string;
        broker_account_id: string;
        instrument_id: string;
        quantity: number | string;
        average_buy_price: number | string;
        currency: string;
        data_source: string;
        as_of: string;
        created_at: string;
        updated_at: string;
        broker_account?: {
          id: string;
          user_id: string;
          broker_code?: string;
          display_name?: string;
          account_type?: string;
          color_hex?: string;
          created_at?: string;
        };
        instrument?: {
          id: string;
          symbol: string;
          instrument_name: string;
          asset_type: string;
          exchange: string;
          isin: string | null;
        };
      };

      const row = data as unknown as SingleHoldingRow;
      const inst = row.instrument;
      const broker = row.broker_account;
      const quote = inst?.symbol ? await MarketDataService.getQuote(inst.symbol, inst.exchange) : null;
      const hasValidQuote = Boolean(quote && quote.isValid);
      const current_price = hasValidQuote ? quote!.price : null;
      const price_updated_at = hasValidQuote ? quote!.price_timestamp : null;
      const price_source = hasValidQuote ? quote!.source : null;
      const price_status = hasValidQuote ? quote!.status : null;

      const holdingItem: Holding = {
        id: row.id,
        user_id: row.user_id,
        broker_account_id: row.broker_account_id,
        instrument_id: row.instrument_id,
        symbol: inst?.symbol || 'UNKNOWN',
        isin: inst?.isin || null,
        name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
        asset_class: mapAssetTypeToClass(inst?.asset_type),
        exchange: (inst?.exchange as Exchange) || 'NSE',
        quantity: Number(row.quantity),
        avg_buy_price: Number(row.average_buy_price),
        average_buy_price: Number(row.average_buy_price),
        current_price,
        currency: row.currency || 'INR',
        data_source: row.data_source || 'MANUAL',
        as_of: row.as_of,
        price_updated_at,
        price_source,
        price_status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        broker_account: broker
          ? {
              id: broker.id,
              user_id: broker.user_id,
              broker_name: broker.display_name || broker.broker_code || 'Broker',
              account_label: broker.display_name || null,
              account_type: (broker.account_type as AccountType) || 'broker',
              color_hex: broker.color_hex || '#3B82F6',
              is_active: true,
              created_at: broker.created_at || new Date().toISOString(),
            }
          : undefined,
      };

      return NextResponse.json({ holding: enrichHolding(holdingItem), storageMode: 'cloud' });
    } catch (err) {
      console.error('[API /api/portfolio/holdings PUT] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service. Please check network and configuration.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode
  const existingHolding = PortfolioStorage.getHoldings().find((h) => h.id === id);
  if (!existingHolding) {
    return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
  }

  const localTxCount = PortfolioStorage.getState().transactions.filter(
    (tx) => tx.broker_account_id === existingHolding.broker_account_id && tx.instrument_id === existingHolding.instrument_id
  ).length;

  if (existingHolding.is_ledger_managed || localTxCount > 0) {
    return NextResponse.json(
      {
        error: 'This holding is managed by the transaction ledger. Direct position edits are disabled to maintain accounting consistency. Please edit or add transactions in your tradebook.',
        code: 'LEDGER_MANAGED_HOLDING',
      },
      { status: 400 }
    );
  }

  const updated = PortfolioStorage.updateHolding(id, {
    quantity: numQty,
    average_buy_price: numPrice,
    as_of: new Date().toISOString(),
  });

  if (!updated) {
    return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
  }

  const inst = PortfolioStorage.getInstrumentById(updated.instrument_id);
  const broker = PortfolioStorage.getBrokerAccounts().find((b) => b.id === updated.broker_account_id);
  const quote = inst?.symbol ? await MarketDataService.getQuote(inst.symbol, inst.exchange) : null;
  const hasValidQuote = Boolean(quote && quote.isValid);

  const holdingItem: Holding = {
    id: updated.id,
    user_id: updated.user_id,
    broker_account_id: updated.broker_account_id,
    instrument_id: updated.instrument_id,
    symbol: inst?.symbol || 'UNKNOWN',
    isin: inst?.isin || null,
    name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
    asset_class: mapAssetTypeToClass(inst?.asset_type),
    exchange: (inst?.exchange as Exchange) || 'NSE',
    quantity: updated.quantity,
    avg_buy_price: updated.average_buy_price,
    average_buy_price: updated.average_buy_price,
    current_price: hasValidQuote ? quote!.price : null,
    currency: updated.currency,
    data_source: updated.data_source,
    as_of: updated.as_of,
    price_updated_at: hasValidQuote ? quote!.price_timestamp : null,
    price_source: hasValidQuote ? quote!.source : null,
    price_status: hasValidQuote ? quote!.status : null,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    broker_account: broker
      ? {
          id: broker.id,
          user_id: broker.user_id,
          broker_name: broker.display_name || broker.broker_code,
          account_label: broker.display_name,
          account_type: broker.account_type,
          color_hex: broker.color_hex || '#3B82F6',
          is_active: true,
          created_at: broker.created_at,
        }
      : undefined,
  };

  return NextResponse.json({ holding: enrichHolding(holdingItem), isDemo: true, storageMode: 'local' });
}

// DELETE /api/portfolio/holdings?id=... — delete a holding
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Holding ID is required.' }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to delete a holding.' },
          { status: 401 }
        );
      }

      // Check holding existence and ledger-managed status
      const { data: existingHolding, error: fetchErr } = await supabase
        .from('holdings')
        .select('id, user_id, broker_account_id, instrument_id, is_ledger_managed')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchErr || !existingHolding) {
        return NextResponse.json({ error: 'Holding not found or access denied.' }, { status: 404 });
      }

      const { count: txCount } = await supabase
        .from('investment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('broker_account_id', existingHolding.broker_account_id)
        .eq('instrument_id', existingHolding.instrument_id);

      if (existingHolding.is_ledger_managed || (txCount !== null && txCount > 0)) {
        return NextResponse.json(
          {
            error: 'This holding is managed by the transaction ledger and cannot be deleted directly. Delete or reconcile the underlying transactions in your tradebook.',
            code: 'LEDGER_MANAGED_HOLDING',
          },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Enforces strict user isolation

      if (error) {
        console.error('[API /api/portfolio/holdings DELETE] Supabase delete error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to delete holding from cloud database.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, storageMode: 'cloud' });
    } catch (err) {
      console.error('[API /api/portfolio/holdings DELETE] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service. Please check network and configuration.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode
  const existingHolding = PortfolioStorage.getHoldings().find((h) => h.id === id);
  if (!existingHolding) {
    return NextResponse.json({ error: 'Holding not found.' }, { status: 404 });
  }

  const localTxCount = PortfolioStorage.getState().transactions.filter(
    (tx) => tx.broker_account_id === existingHolding.broker_account_id && tx.instrument_id === existingHolding.instrument_id
  ).length;

  if (existingHolding.is_ledger_managed || localTxCount > 0) {
    return NextResponse.json(
      {
        error: 'This holding is managed by the transaction ledger and cannot be deleted directly. Delete or reconcile the underlying transactions in your tradebook.',
        code: 'LEDGER_MANAGED_HOLDING',
      },
      { status: 400 }
    );
  }

  const deleted = PortfolioStorage.deleteHolding(id);
  return NextResponse.json({ success: deleted, isDemo: true, storageMode: 'local' });
}
