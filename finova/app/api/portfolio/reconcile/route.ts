import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { reconcileHoldingsWithTransactions } from '@/lib/calculations/realizedPnL';
import type { HoldingRow, InvestmentTransactionRow } from '@/types/database';

export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }

      const { data: holdings } = await supabase
        .from('holdings')
        .select(`
          *,
          broker_account:broker_accounts(*),
          instrument:instruments(*)
        `)
        .eq('user_id', user.id);

      const { data: transactions } = await supabase
        .from('investment_transactions')
        .select(`
          *,
          broker_account:broker_accounts(*),
          instrument:instruments(*)
        `)
        .eq('user_id', user.id);

      const results = reconcileHoldingsWithTransactions(
        (holdings || []) as HoldingRow[],
        (transactions || []) as InvestmentTransactionRow[]
      );

      // Populate instrument and broker names in results
      const enriched = results.map((r) => {
        const matchingH = (holdings || []).find(
          (h) => h.broker_account_id === r.broker_account_id && h.instrument_id === r.instrument_id
        );
        const matchingT = (transactions || []).find(
          (t) => t.broker_account_id === r.broker_account_id && t.instrument_id === r.instrument_id
        );
        const inst = matchingH?.instrument || matchingT?.instrument;
        const broker = matchingH?.broker_account || matchingT?.broker_account;

        return {
          ...r,
          symbol: inst?.symbol || r.symbol,
          broker_name: broker?.display_name || broker?.broker_name || 'Broker',
        };
      });

      return NextResponse.json({
        reconciliations: enriched,
        storageMode: 'cloud',
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Reconciliation check failed.' },
        { status: 500 }
      );
    }
  }

  // Local storage mode
  const holdings = PortfolioStorage.getHoldings('current_user');
  const { transactions } = PortfolioStorage.getTransactions('current_user');
  const brokers = PortfolioStorage.getBrokerAccounts();

  const results = reconcileHoldingsWithTransactions(holdings, transactions);
  const enriched = results.map((r) => {
    const inst = PortfolioStorage.getInstrumentById(r.instrument_id);
    const broker = brokers.find((b) => b.id === r.broker_account_id);
    return {
      ...r,
      symbol: inst?.symbol || r.symbol,
      broker_name: broker?.display_name || broker?.broker_name || 'Broker',
    };
  });

  return NextResponse.json({
    reconciliations: enriched,
    isDemo: true,
    storageMode: 'local',
  });
}
