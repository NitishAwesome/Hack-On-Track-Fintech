import { NextResponse } from 'next/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import type { AssetClass } from '@/types/portfolio';
import type { AssetCategory } from '@/types/database';

interface ImportHoldingInput {
  symbol: string;
  name?: string;
  asset_class?: AssetClass;
  exchange?: string;
  quantity: number | string;
  avg_buy_price: number | string;
  broker_account_id?: string | null;
  isin?: string | null;
}

// POST /api/portfolio/holdings/import — bulk import holdings (from CSV)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: ImportHoldingInput[] = Array.isArray(body) ? body : body.holdings || [];
    const duplicateMode: 'replace' | 'update' | 'skip' = body.duplicate_mode || 'replace';
    const targetBrokerAccountId = body.broker_account_id;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No holdings provided for import' }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Ensure we have a valid broker account
    let brokerId = targetBrokerAccountId;
    if (!brokerId) {
      const existingBrokers = PortfolioStorage.getBrokerAccounts();
      if (existingBrokers.length > 0) {
        brokerId = existingBrokers[0].id;
      } else {
        const defaultBroker = PortfolioStorage.addBrokerAccount({
          user_id: 'current_user',
          broker_code: 'ZERODHA',
          display_name: 'Primary Demat Account',
          account_type: 'broker',
          connection_status: 'MANUAL',
          data_source: 'CSV',
          currency: 'INR',
          last_synced_at: new Date().toISOString(),
          broker_name: 'Zerodha',
          account_label: 'Primary Demat Account',
          color_hex: '#3B82F6',
          is_active: true,
        });
        brokerId = defaultBroker.id;
      }
    }

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const symbol = (row.symbol || '').toUpperCase().trim();
      if (!symbol) {
        errors.push(`Row ${i + 1}: Missing symbol`);
        continue;
      }

      const qty = Number(row.quantity);
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Row ${i + 1} (${symbol}): Quantity must be positive`);
        continue;
      }

      const avgPrice = Number(row.avg_buy_price);
      if (isNaN(avgPrice) || avgPrice < 0) {
        errors.push(`Row ${i + 1} (${symbol}): Purchase price cannot be negative`);
        continue;
      }

      const name = (row.name || symbol).trim();
      const assetClass: AssetClass = ['equity', 'reit', 'invit', 'bond', 'sgb', 'etf', 'mf'].includes(
        (row.asset_class || '').toLowerCase()
      )
        ? (row.asset_class!.toLowerCase() as AssetClass)
        : 'equity';

      let assetCategory = 'STOCK';
      if (assetClass === 'mf') assetCategory = 'MUTUAL_FUND';
      else if (assetClass === 'reit') assetCategory = 'REIT';
      else if (assetClass === 'invit') assetCategory = 'INVIT';
      else if (assetClass === 'bond' || assetClass === 'sgb') assetCategory = 'BOND';

      const exchange = (row.exchange || 'NSE').toUpperCase();
      const isin = row.isin?.trim() || null;
      const accountId = row.broker_account_id || brokerId;

      // Resolve instrument
      const instrument = PortfolioStorage.resolveInstrument(
        symbol,
        name,
        assetCategory as AssetCategory,
        exchange,
        isin
      );

      // Check for existing holding
      const existingHoldings = PortfolioStorage.getHoldings();
      const existing = existingHoldings.find(
        (h) => h.broker_account_id === accountId && h.instrument_id === instrument.id
      );

      if (existing) {
        if (duplicateMode === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateMode === 'replace') {
          PortfolioStorage.updateHolding(existing.id, {
            quantity: qty,
            average_buy_price: avgPrice,
            as_of: new Date().toISOString(),
          });
          importedCount++;
          continue;
        }
      }

      // Add or update
      PortfolioStorage.addHolding({
        user_id: 'current_user',
        broker_account_id: accountId,
        instrument_id: instrument.id,
        quantity: qty,
        average_buy_price: avgPrice,
        currency: 'INR',
        data_source: 'CSV',
        as_of: new Date().toISOString(),
      });
      importedCount++;
    }

    return NextResponse.json({
      success: true,
      count: importedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
