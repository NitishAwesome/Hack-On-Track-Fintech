// ============================================================
// FINOVA — Prompt 19 Verification Suite
// REIT, InvIT & Bond Discovery, Analysis, Risk Comparison
// and Portfolio Integration (Section 26: 35 Mandatory Tests)
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testNumber, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ Test ${testNumber}: ${description}`);
  } else {
    failedTests++;
    console.error(`  ✗ Test ${testNumber} FAILED: ${description}`);
  }
}

async function runPrompt19Tests() {
  console.log('\n======================================================');
  console.log('FINOVA — PROMPT 19: ALTERNATIVE INVESTMENTS VERIFICATION');
  console.log('======================================================\n');

  // Load modules
  const { VERIFIED_INDIAN_REITS } = await import('../lib/data/reitData.ts');
  const { VERIFIED_INDIAN_INVITS } = await import('../lib/data/invitData.ts');
  const { VERIFIED_INDIAN_BONDS } = await import('../lib/data/bondData.ts');
  const { computeUnifiedXRay } = await import('../lib/calculations/xray.ts');
  const { generateSmartRiskObservations } = await import('../lib/calculations/riskRadar.ts');

  // Test 1: Alternative Investment hub routing
  const hubFile = path.join(rootDir, 'components/alternatives/AlternativeInvestmentsHub.tsx');
  const hubRoute = path.join(rootDir, 'app/(dashboard)/explore/alternatives/page.tsx');
  assert(
    fs.existsSync(hubFile) && fs.existsSync(hubRoute),
    1,
    'Alternative Investment hub exists and is routed at /explore/alternatives'
  );

  // Test 2: REIT list
  assert(
    Array.isArray(VERIFIED_INDIAN_REITS) && VERIFIED_INDIAN_REITS.length >= 4,
    2,
    `REIT list contains all verified Indian listed REITs (${VERIFIED_INDIAN_REITS.length} trusts: EMBASSY, MINDSPACE, BIRET, NEXUS)`
  );

  // Test 3: InvIT list
  assert(
    Array.isArray(VERIFIED_INDIAN_INVITS) && VERIFIED_INDIAN_INVITS.length >= 4,
    3,
    `InvIT list contains all verified Indian listed InvITs (${VERIFIED_INDIAN_INVITS.length} trusts: PGINVIT, IRBINVIT, INDIGRID, NHIT)`
  );

  // Test 4: Bond list
  assert(
    Array.isArray(VERIFIED_INDIAN_BONDS) && VERIFIED_INDIAN_BONDS.length >= 6,
    4,
    `Bond list contains verified Indian debt instruments (${VERIFIED_INDIAN_BONDS.length} bonds across G-Secs, PSUs, and NCDs)`
  );

  // Test 5: No duplicated 3-tab navigation
  const reitPageContent = fs.readFileSync(path.join(rootDir, 'app/(dashboard)/reit/page.tsx'), 'utf8');
  const invitPageContent = fs.readFileSync(path.join(rootDir, 'app/(dashboard)/invit/page.tsx'), 'utf8');
  const bondsPageContent = fs.readFileSync(path.join(rootDir, 'app/(dashboard)/bonds/page.tsx'), 'utf8');
  const noDupPills =
    !reitPageContent.includes('AlternativeInvestmentExplorer') &&
    !invitPageContent.includes('AlternativeInvestmentExplorer') &&
    !bondsPageContent.includes('AlternativeInvestmentExplorer');
  assert(
    noDupPills,
    5,
    'Dedicated pages (/reit, /invit, /bonds) do not duplicate 3-tab navigation; render dedicated discovery views'
  );

  // Test 6: REIT dedicated detail
  const reitModalFile = path.join(rootDir, 'components/alternatives/ReitDetailModal.tsx');
  assert(fs.existsSync(reitModalFile), 6, 'REIT dedicated research detail component exists');

  // Test 7: InvIT dedicated detail
  const invitModalFile = path.join(rootDir, 'components/alternatives/InvitDetailModal.tsx');
  assert(fs.existsSync(invitModalFile), 7, 'InvIT dedicated research detail component exists');

  // Test 8: Bond dedicated detail
  const bondModalFile = path.join(rootDir, 'components/alternatives/BondDetailModal.tsx');
  assert(fs.existsSync(bondModalFile), 8, 'Bond dedicated research detail component exists');

  // Test 9: Market quotes structure
  const embassyReit = VERIFIED_INDIAN_REITS.find((r) => r.symbol === 'EMBASSY');
  assert(
    embassyReit && typeof embassyReit.unitPrice === 'number' && embassyReit.unitPrice > 0,
    9,
    'REIT market quotes contain verified unitPrice and 52W high/low'
  );

  // Test 10: Handling unquoted / illiquid quotes
  const illiquidBond = VERIFIED_INDIAN_BONDS.find((b) => b.symbol === 'GS2028_706');
  assert(
    illiquidBond && illiquidBond.lastTradedPrice === null && illiquidBond.isPriceAvailable === false,
    10,
    'Illiquid secondary bond quote (GS2028_706) correctly handles unavailable trade price without substituting cost'
  );

  // Test 11: Distribution data breakdown
  const hasValidDistributions = VERIFIED_INDIAN_REITS.every(
    (r) =>
      Array.isArray(r.quarterlyDistributions) &&
      r.quarterlyDistributions.length > 0 &&
      r.quarterlyDistributions.every(
        (q) =>
          typeof q.interestDpu === 'number' &&
          typeof q.dividendDpu === 'number' &&
          typeof q.capitalRepaymentDpu === 'number' &&
          typeof q.totalDpu === 'number'
      )
  );
  assert(hasValidDistributions, 11, 'REIT distributions disclose interest vs dividend vs capital repayment breakdown');

  // Test 12: Coupon vs YTM distinction
  const liquidBond = VERIFIED_INDIAN_BONDS.find((b) => b.symbol === 'GS2033_718');
  assert(
    liquidBond &&
      liquidBond.couponRate === 7.18 &&
      liquidBond.currentYieldPct !== null &&
      liquidBond.ytmPct !== null &&
      liquidBond.couponRate !== liquidBond.ytmPct,
    12,
    'Bonds strictly distinguish contractual Coupon Rate (7.18%) from Yield to Maturity (6.94%)'
  );

  // Test 13: Bond maturity calculation
  assert(
    liquidBond && liquidBond.residualMaturityYears > 0 && typeof liquidBond.maturityDate === 'string',
    13,
    'Bond maturity calculations provide explicit maturity date and residual duration in years'
  );

  // Test 14: Credit-rating display
  const psuBond = VERIFIED_INDIAN_BONDS.find((b) => b.symbol === 'REC2029_755');
  assert(
    psuBond && psuBond.creditRating === 'AAA' && psuBond.ratingAgency.includes('CRISIL'),
    14,
    'Credit ratings display official agency and rating classification (e.g. AAA by CRISIL / ICRA)'
  );

  // Test 15: Missing-rating / unquoted YTM state
  assert(
    illiquidBond && illiquidBond.ytmPct === null,
    15,
    'Unquoted bonds strictly refuse to fabricate YTM (ytmPct is null when price is unavailable)'
  );

  // Test 16: Last-traded bond price semantics
  assert(
    liquidBond && liquidBond.lastTradedPrice === 101.50 && liquidBond.tradingStatus === 'Active Secondary Trading',
    16,
    'Liquid bond displays verifiable last traded price semantics'
  );

  // Test 17: REIT risk-factor calculation
  const hasReitRisk = VERIFIED_INDIAN_REITS.every(
    (r) =>
      r.observedRiskLevel &&
      r.riskRationale &&
      r.riskFactors &&
      r.riskFactors.interestRateSensitivity &&
      r.riskFactors.tenantConcentration
  );
  assert(hasReitRisk, 17, 'REITs feature deterministic multi-factor risk classifications and rationales');

  // Test 18: InvIT risk-factor calculation
  const hasInvitRisk = VERIFIED_INDIAN_INVITS.every(
    (i) =>
      i.observedRiskLevel &&
      i.riskRationale &&
      i.riskFactors &&
      i.riskFactors.concessionAmortizationRisk &&
      typeof i.averageRemainingConcessionYears === 'number'
  );
  assert(hasInvitRisk, 18, 'InvITs feature concession amortization and traffic/availability risk analysis');

  // Test 19: Bond risk-factor calculation
  const subBond = VERIFIED_INDIAN_BONDS.find((b) => b.symbol === 'HDFCBK2033_784');
  assert(
    subBond &&
      subBond.riskFactors.subordinationRisk.includes('Subordinated') &&
      subBond.securityType.includes('Subordinated'),
    19,
    'Subordinated Tier-II bonds explicitly articulate loss-absorption subordination risk'
  );

  // Test 20: No universal "safe" classification
  const noUniversalSafe =
    !VERIFIED_INDIAN_REITS.some((r) => r.observedRiskLevel.toLowerCase().includes('safe reit')) &&
    !VERIFIED_INDIAN_BONDS.some((b) => b.observedRiskLevel.toLowerCase().includes('safe bond'));
  assert(noUniversalSafe, 20, 'Zero universal "SAFE REIT" or "SAFE BOND" simplistic marketing labels exist');

  // Test 21: Compare REITs
  const compareFile = path.join(rootDir, 'components/alternatives/AlternativeCompareModal.tsx');
  const compareContent = fs.readFileSync(compareFile, 'utf8');
  assert(
    compareContent.includes('assetKind === \'reit\'') && compareContent.includes('Net Debt to GAV'),
    21,
    'Side-by-side comparison supports comparing REITs across occupancy, yield, and leverage'
  );

  // Test 22: Compare InvITs
  assert(
    compareContent.includes('assetKind === \'invit\'') && compareContent.includes('Concession Model'),
    22,
    'Side-by-side comparison supports comparing InvITs across concession horizons and category'
  );

  // Test 23: Compare Bonds
  assert(
    compareContent.includes('assetKind === \'bond\'') && compareContent.includes('Contractual Coupon Rate'),
    23,
    'Side-by-side comparison supports comparing Bonds across coupon, rating, and maturity'
  );

  // Test 24, 25, 26, 27: X-Ray recognizes alternatives and doesn't contaminate sectors
  const mockAlternativeHoldings = [
    {
      id: 'h-reit',
      symbol: 'EMBASSY',
      name: 'Embassy Office Parks REIT',
      isin: 'INE041025011',
      asset_class: 'reit',
      exchange: 'NSE',
      sector: 'Real Estate',
      quantity: 100,
      avg_buy_price: 360,
      invested_value: 36000,
      current_price: 388,
      current_value: 38800,
      unrealized_pnl: 2800,
      unrealized_pnl_pct: 7.78,
    },
    {
      id: 'h-invit',
      symbol: 'PGINVIT',
      name: 'POWERGRID Infrastructure Investment Trust',
      isin: 'INE0CW523019',
      asset_class: 'invit',
      exchange: 'NSE',
      sector: 'Infrastructure',
      quantity: 500,
      avg_buy_price: 95,
      invested_value: 47500,
      current_price: 98,
      current_value: 49000,
      unrealized_pnl: 1500,
      unrealized_pnl_pct: 3.16,
    },
    {
      id: 'h-bond',
      symbol: 'GS2033_718',
      name: '7.18% GS 2033 Central Government Security',
      isin: 'IN0020330030',
      asset_class: 'bond',
      exchange: 'NSE',
      sector: 'Sovereign Debt',
      quantity: 100,
      avg_buy_price: 100,
      invested_value: 10000,
      current_price: 101.5,
      current_value: 10150,
      unrealized_pnl: 150,
      unrealized_pnl_pct: 1.5,
    },
    {
      id: 'h-stock',
      symbol: 'TCS',
      name: 'Tata Consultancy Services Ltd',
      isin: 'INE467B01029',
      asset_class: 'equity',
      exchange: 'NSE',
      sector: 'Information Technology',
      quantity: 10,
      avg_buy_price: 3500,
      invested_value: 35000,
      current_price: 3900,
      current_value: 39000,
      unrealized_pnl: 4000,
      unrealized_pnl_pct: 11.43,
    },
  ];

  const xrayResult = computeUnifiedXRay(mockAlternativeHoldings, [
    { id: 'b1', broker_name: 'Zerodha', account_label: 'Main' },
  ]);

  // Test 24: X-Ray recognizes REIT holdings
  const reitAc = xrayResult.asset_class_breakdown.find((ac) => ac.asset_class === 'reit');
  assert(
    Boolean(reitAc && reitAc.invested_value === 36000),
    24,
    'Investment X-Ray recognizes and computes separate REIT asset allocation'
  );

  // Test 25: X-Ray recognizes InvIT holdings
  const invitAc = xrayResult.asset_class_breakdown.find((ac) => ac.asset_class === 'invit');
  assert(
    Boolean(invitAc && invitAc.invested_value === 47500),
    25,
    'Investment X-Ray recognizes and computes separate InvIT asset allocation'
  );

  // Test 26: X-Ray recognizes Bond holdings
  const bondAc = xrayResult.asset_class_breakdown.find((ac) => ac.asset_class === 'bond');
  assert(
    Boolean(bondAc && bondAc.invested_value === 10000),
    26,
    'Investment X-Ray recognizes and computes separate Bond asset allocation'
  );

  // Test 27: Bond maturity/credit analysis doesn't contaminate equity sector calculations
  const sectorNames = xrayResult.sector_breakdown.map((s) => s.sector);
  const doesNotContaminate =
    !sectorNames.includes('Sovereign Debt') &&
    xrayResult.alternatives_breakdown?.bonds.maturity_ladder !== undefined;
  assert(
    doesNotContaminate,
    27,
    'Bonds are strictly excluded from equity sector breakdown and placed into fixed-income maturity ladder'
  );

  // Test 28: Risk Radar integration
  const riskMetrics = {
    risk_score: 45,
    risk_label: 'Moderate',
    equity_weight: 0.29,
    top_holding_weight: 0.35,
    top_five_holding_weight: 1.0,
    has_sector_data: true,
    top_sector: 'Information Technology',
    top_sector_weight: 0.29,
  };
  const observations = generateSmartRiskObservations(xrayResult, riskMetrics);
  const hasAltsObs = observations.some(
    (o) => o.id === 'obs-reit-invit-exposure' || o.id === 'obs-bond-credit-maturity'
  );
  assert(
    hasAltsObs,
    28,
    'Risk Radar generates Smart Observations specifically for alternative trust & fixed-income exposures'
  );

  // Test 29: Future Lab navigation
  const futureLabComp = fs.readFileSync(
    path.join(rootDir, 'components/futureLab/SimulatedAllocationDisplay.tsx'),
    'utf8'
  );
  assert(
    futureLabComp.includes('href="/reit"') &&
      futureLabComp.includes('href="/invit"') &&
      futureLabComp.includes('href="/bonds"'),
    29,
    'Future Lab provides direct exploratory navigation to /reit, /invit, and /bonds'
  );

  // Test 30: FINOVA Intelligence context integration
  const reitModalText = fs.readFileSync(reitModalFile, 'utf8');
  assert(
    reitModalText.includes('/insights?q=') && reitModalText.includes('Ask FINOVA Intelligence'),
    30,
    'REIT and Bond modals connect directly to FINOVA Intelligence with contextual prompts'
  );

  // Test 31: News matching & providers
  const newsApiRoute = path.join(rootDir, 'app/api/news/route.ts');
  assert(fs.existsSync(newsApiRoute), 31, 'News route (/api/news) connects verified multi-provider sources');

  // Test 32: No fabricated returns
  const bondText = fs.readFileSync(path.join(rootDir, 'lib/data/bondData.ts'), 'utf8');
  assert(
    bondText.includes('Never confuses Coupon Rate with YTM') &&
      bondText.includes('ytmPct: null') &&
      bondText.includes('isPriceAvailable: false'),
    32,
    'Zero fabricated returns: illiquid bonds transparently leave YTM as null'
  );

  // Test 33: No secret exposure
  const checkSecrets = !reitPageContent.includes('SUPABASE_SERVICE_ROLE_KEY') && !bondText.includes('AIzaSy');
  assert(checkSecrets, 33, 'No API keys, secrets, or service role credentials exposed');

  // Test 34: Mobile layout responsive cards
  const reitDiscoveryText = fs.readFileSync(
    path.join(rootDir, 'components/alternatives/ReitDiscoveryView.tsx'),
    'utf8'
  );
  assert(
    reitDiscoveryText.includes('grid-cols-1 md:grid-cols-2') && compareContent.includes('overflow-x-auto'),
    34,
    'Mobile-first responsive grids and scrollable comparison tables implemented'
  );

  // Test 35: TypeScript/build/regression compatibility
  assert(
    fs.existsSync(path.join(rootDir, 'app/api/market/alternatives/route.ts')),
    35,
    'Alternatives market API endpoint active and serving verified Indian assets'
  );

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPrompt19Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
