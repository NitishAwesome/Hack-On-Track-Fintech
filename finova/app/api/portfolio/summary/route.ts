import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichHolding, buildPortfolioSummary, buildAssetAllocation, buildBrokerAllocation } from '@/lib/calculations/portfolio';
import { buildRiskMetrics } from '@/lib/calculations/risk';
import { DEMO_HOLDINGS } from '@/lib/demoData';
import type { Holding } from '@/types/portfolio';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // If user is not logged in or in preview mode, serve realistic demo portfolio
  if (authError || !user) {
    const demoEnriched = DEMO_HOLDINGS.map(enrichHolding);
    return NextResponse.json({
      summary: buildPortfolioSummary(demoEnriched),
      assetAllocation: buildAssetAllocation(demoEnriched),
      brokerAllocation: buildBrokerAllocation(demoEnriched),
      riskMetrics: buildRiskMetrics(demoEnriched),
      isDemo: true,
    });
  }

  const { data: rawHoldings, error } = await supabase
    .from('holdings')
    .select(`
      *,
      broker_account:broker_accounts(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If newly registered user has 0 holdings, provide clean 0-summary or demo option
  const holdings = (rawHoldings as Holding[]).map(enrichHolding);
  const summary = buildPortfolioSummary(holdings);
  const assetAllocation = buildAssetAllocation(holdings);
  const brokerAllocation = buildBrokerAllocation(holdings);
  const riskMetrics = buildRiskMetrics(holdings);

  return NextResponse.json({
    summary,
    assetAllocation,
    brokerAllocation,
    riskMetrics,
    isDemo: false,
  });
}
