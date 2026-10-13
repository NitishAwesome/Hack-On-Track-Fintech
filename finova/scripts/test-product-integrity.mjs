// Offline behavioral tests. No credentials, network calls or connected databases.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
import { PGlite } from '@electric-sql/pglite';

const root = process.cwd();
function loader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(root, filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = new Module(filename);
    cache.set(filename, module);
    const nativeRequire = createRequire(filename);
    module.filename = filename;
    module.paths = Module._nodeModulePaths(path.dirname(filename));
    module.require = (id) => {
      if (id in overrides) return overrides[id];
      if (id.startsWith('@/') || id.startsWith('.')) {
        const target = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
        for (const candidate of [target, `${target}.ts`, `${target}.tsx`, path.join(target, 'index.ts')]) {
          if (fs.existsSync(candidate) && /\.tsx?$/.test(candidate)) return load(candidate);
        }
      }
      return nativeRequire(id);
    };
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
    module._compile(compiled.outputText, filename);
    return module.exports;
  }
  return load;
}
const load = loader();
const { enrichHolding, buildPortfolioSummary, buildAssetAllocation } = load('lib/calculations/portfolio.ts');
const { buildPerformanceSummary } = load('lib/calculations/performance.ts');
const { valuationBasis } = load('lib/calculations/valuationBasis.ts');
const { calculatePortfolioBeforeAfter } = load('lib/calculations/futureLab.ts');
const { computeUnifiedXRay } = load('lib/calculations/xray.ts');
const { alignPriceSeries } = load('lib/research/comparison.ts');
const { watchlistMutationOptions } = load('lib/research/watchlistClient.ts');
const { safeReturnPath } = load('lib/navigation.ts');
const { validateWatchlistInstrument, INDEX_IDENTITIES, SECTORS, sectorStocks } = load('lib/research/catalog.ts');
const { CURATED_FINANCIALS } = load('lib/research/financials.ts');
const { getVerifiedIpoSchedule } = load('lib/market/ipoData.ts');
const { isRecentArticle } = load('lib/news/temporalUtils.ts');
const { MarketDataService } = load('lib/services/marketData.ts');
const { goalPayloadFromForm, isGoalDate } = load('lib/goals/goalForm.ts');

let passed = 0;
async function test(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}
function holding(symbol, price, quantity = 10, cost = 100, asset_class = 'equity') {
  return enrichHolding({ id: symbol, user_id: 'user-a', symbol, name: symbol, isin: `ISIN${symbol}`, exchange: 'NSE', asset_class, sector: symbol === 'TCS' ? 'Information Technology' : 'Energy', quantity, avg_buy_price: cost, current_price: price, price_status: price === null ? 'UNAVAILABLE' : 'DELAYED', price_updated_at: new Date().toISOString(), broker_account_id: 'broker-a', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
}
const complete = [holding('TCS', 120), holding('RELIANCE', 80)];
const partial = [holding('TCS', 120), holding('RELIANCE', null, 1000)];

await test('empty, partial, complete, stale and invalid valuations retain canonical coverage', () => {
  assert.equal(buildPortfolioSummary([]).total_current_value, 0);
  const full = buildPortfolioSummary(complete);
  assert.equal(full.total_current_value, 2000);
  assert.equal(full.total_absolute_return, 0);
  const incomplete = buildPortfolioSummary(partial);
  assert.equal(incomplete.total_current_value, null);
  assert.equal(incomplete.priced_current_value, 1200);
  assert.equal(incomplete.total_absolute_return, 200);
  assert.equal(incomplete.quote_coverage_pct, 50);
  for (const invalid of [null, 0, NaN, Infinity, -1]) {
    assert.equal(holding('UNKNOWN', invalid).current_value, null);
    assert.equal(holding('UNKNOWN', invalid).absolute_return_pct, null);
  }
  assert.equal(buildPortfolioSummary([{ ...complete[0], price_status: 'STALE' }]).is_valuation_complete, false);
  assert.equal(buildPerformanceSummary(partial, []).combined_performance_net, null);
  assert.equal(buildPerformanceSummary(partial, []).unrealized_pnl, incomplete.total_absolute_return);
  const basis = valuationBasis(partial);
  assert.equal(basis.total, 1200);
  assert.equal(basis.valueOf(partial[1]), 0);
  assert.equal(valuationBasis([holding('UNKNOWN', null)]).label, 'Invested cost basis');
  assert.equal(buildAssetAllocation(partial).reduce((sum, row) => sum + row.percentage, 0), 100);
});

await test('X-Ray, Future Lab and Dashboard use the same priced subset; simulations preserve holdings', () => {
  const before = JSON.stringify(partial);
  const xray = computeUnifiedXRay(partial, []);
  assert.equal(xray.summary.market_valued_capital, valuationBasis(partial).total);
  for (const strategy of Object.keys(load('lib/calculations/futureLab.ts').STRATEGY_TEMPLATES)) {
    const result = calculatePortfolioBeforeAfter(partial, [], 10000, strategy);
    assert.equal(result.baseline.valuationBase, 1200);
    assert.equal(result.simulated.newTotalValuation, 11200);
    assert.equal(result.baseline.assetClassBreakdown.reduce((sum, item) => sum + item.value, 0), 1200);
  }
  assert.equal(JSON.stringify(partial), before);
  const bonds = computeUnifiedXRay([holding('GS2030', 100, 10, 100, 'bond')], []).alternatives_breakdown;
  // The canonical engine must never infer AAA or actual maturity from a ticker.
  assert.ok(!JSON.stringify(bonds).includes('Zero Credit Risk'));
  assert.ok(!JSON.stringify(bonds).includes('AAA /'));
  assert.equal(bonds.bonds.maturity_ladder.unspecified.count, 1);
});

const point = (date, close) => ({ date, close, timestamp: Date.parse(date) / 1000 });
await test('comparison intersects dates, normalizes shared prices and excludes missing or invalid observations', () => {
  const result = alignPriceSeries([point('2026-01-01', 1), point('2026-01-02', 100), point('2026-01-03', 110), point('2026-01-04', 120)], [point('2026-01-02', 50), point('2026-01-04', 60), point('2026-01-05', 80)]);
  assert.deepEqual(result.points.map(item => item.date), ['2026-01-02', '2026-01-04']);
  assert.equal(result.points[0].first, 100);
  assert.equal(result.points[0].second, 100);
  assert.equal(result.firstPerformance, 20);
  assert.equal(result.secondPerformance, 20);
  assert.equal(alignPriceSeries([point('2026-01-02', 0), point('bad-date', 100)], [point('bad-date', 100)]).firstPerformance, null);
  assert.equal(alignPriceSeries([point('2026-01-02', 100), point('2026-01-03', 50)], [point('2026-01-02', 100), point('2026-01-03', 100)]).largeDiscontinuity, true);
  assert.equal(alignPriceSeries([point('2026-01-02', 100)], [point('2026-01-02', 100)]).points.length, 0);
});

await test('Follow validation, optimistic rollback, idempotence and account cache clearing', async () => {
  assert.equal(validateWatchlistInstrument('nifty50'), null);
  assert.equal(validateWatchlistInstrument('RELIANCE', 'BSE'), null);
  assert.equal(validateWatchlistInstrument('UNKNOWN'), null);
  assert.equal(validateWatchlistInstrument(' tcs ').symbol, 'TCS');
  const client = new QueryClient();
  const original = [{ symbol: 'TCS', exchange: 'NSE', created_at: '2026-01-01' }];
  client.setQueryData(['watchlist', 'user-a'], original);
  client.setQueryData(['watchlist', 'user-b'], []);
  const options = watchlistMutationOptions(client, 'user-a', async () => { throw new Error('Simulated failed write'); });
  const change = { symbol: 'RELIANCE', followed: true };
  const context = await options.onMutate(change);
  assert.equal(client.getQueryData(['watchlist', 'user-a']).length, 2);
  assert.deepEqual(client.getQueryData(['watchlist', 'user-b']), []);
  await assert.rejects(options.mutationFn(change));
  options.onError(new Error('failed'), change, context);
  assert.deepEqual(client.getQueryData(['watchlist', 'user-a']), original);
  await options.onMutate({ symbol: 'TCS', followed: true });
  assert.equal(client.getQueryData(['watchlist', 'user-a']).length, 1);
  client.clear();
  options.onError(new Error('late failure'), change, context);
  assert.equal(client.getQueryData(['watchlist', 'user-a']), undefined);
  await assert.rejects(watchlistMutationOptions(client, null).mutationFn(change));
});

await test('safe destinations, catalog sectors, official provenance and stable review dates', () => {
  for (const unsafe of ['https://bad.test', '//bad.test', '/\\bad.test', '/\nlogin']) assert.equal(safeReturnPath(unsafe), '/explore');
  assert.equal(safeReturnPath('/explore?tab=sectors&sector=Energy'), '/explore?tab=sectors&sector=Energy');
  assert.match(INDEX_IDENTITIES.NIFTY50.name, /Index/);
  assert.equal(SECTORS.reduce((sum, name) => sum + sectorStocks(name).length, 0), load('lib/market/stockCatalog.ts').EXPANDED_NSE_STOCKS.length);
  assert.equal(Object.keys(CURATED_FINANCIALS).length, 3);
  for (const metrics of Object.values(CURATED_FINANCIALS)) {
    assert.equal(metrics.length, 8);
    for (const metric of metrics) { assert.ok(metric.documentUrl.startsWith('https://')); assert.ok(metric.pdfPage > 0); assert.equal(metric.reviewedAt, '2026-10-13'); assert.equal(metric.basis, 'Consolidated'); }
  }
  const ipo = getVerifiedIpoSchedule();
  assert.equal(ipo.categories.listed.length, 2);
  assert.equal(ipo.categories.upcoming.length, 0);
  assert.equal(ipo.as_of, getVerifiedIpoSchedule().as_of);
  for (const item of ipo.categories.listed) { assert.match(item.official_link, /^https:\/\/nsearchives.nseindia.com/); assert.equal(item.price_band, null); }
});

await test('index research accepts encoded card URLs and canonical symbols without treating indices as equities', async () => {
  const notFound = new Error('Research not found');
  const route = loader({
    'next/navigation': { notFound: () => { throw notFound; } },
    './DedicatedStockDetailClient': { DedicatedStockDetailClient: () => null },
  })('app/(research)/explore/stocks/[symbol]/page.tsx');
  const { resolveYahooFinanceSymbol } = load('lib/market/symbolMapper.ts');
  for (const [ticker, canonical] of [['^NSEI', 'NIFTY50'], ['^BSESN', 'SENSEX'], ['^NSEBANK', 'BANKNIFTY']]) {
    for (const symbol of [ticker, encodeURIComponent(ticker), canonical]) {
      const props = { params: Promise.resolve({ symbol }) };
      const page = await route.default(props);
      const instrument = page.props.children.props.initialStock;
      assert.equal(instrument.symbol, canonical);
      assert.equal(instrument.name, INDEX_IDENTITIES[canonical].name);
      assert.equal(instrument.exchange, 'INDEX');
      assert.equal(resolveYahooFinanceSymbol(instrument.symbol, instrument.exchange), ticker);
      assert.ok((await route.generateMetadata(props)).title.startsWith(canonical));
    }
  }
  for (const [symbol, canonical] of [['RELIANCE', 'RELIANCE'], ['reliance.ns', 'RELIANCE'], ['M%26M', 'M&M']]) {
    const page = await route.default({ params: Promise.resolve({ symbol }) });
    assert.equal(page.props.children.props.initialStock.symbol, canonical);
    assert.equal(page.props.children.props.initialStock.exchange, 'NSE');
  }
  for (const symbol of ['UNKNOWN', '^UNKNOWN', '%ZZ', '%2F', '%255ENSEI']) {
    await assert.rejects(route.default({ params: Promise.resolve({ symbol }) }), error => error === notFound);
  }
});

await test('daily movement comes from the quote; selected-period movement remains separate', async () => {
  const quote = { symbol: 'TCS', exchange: 'NSE', price: 120, previousClose: 118, day_change: 2, day_change_pct: 1.69, price_timestamp: '2026-10-13T09:30:00Z', isValid: true, status: 'DELAYED' };
  MarketDataService.setProvider({ id: 'offline-test', sourceLabel: 'Offline provider', fetchQuote: async () => quote, fetchQuotes: async () => new Map([['TCS', quote]]), fetchHistoricalChart: async () => ({ symbol: 'TCS', points: [point('2026-09-13', 100), point('2026-10-13', 120)], currentPrice: 120, previousClose: 100, dayChange: 20, dayChangePercent: 20, periodChange: 20, periodChangePercent: 20, priceBasis: 'Unadjusted close' }), fetchIndices: async () => [] });
  MarketDataService.clearCache();
  const chart = await MarketDataService.getHistoricalChart('TCS', 'NSE', '1M');
  assert.equal(chart.dayChange, 2);
  assert.equal(chart.previousClose, 118);
  assert.equal(chart.periodChange, 20);
  assert.equal(chart.quoteTimestamp, quote.price_timestamp);
  const cached = await MarketDataService.getHistoricalChart('TCS', 'NSE', '1M');
  assert.equal(cached.quoteTimestamp, quote.price_timestamp);
});

await test('snapshot route ignores forged browser totals and refuses incomplete or guest valuations', async () => {
  let user = { id: 'user-a' }, captured;
  let summary = buildPortfolioSummary(complete);
  const server = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table) => { assert.equal(table, 'portfolio_snapshots'); return { upsert: (value) => { captured = value; return { select: () => ({ single: async () => ({ data: value, error: null }) }) }; } }; },
  };
  const routes = loader({ '@/lib/supabase/server': { createClient: async () => server }, '@/lib/supabase/config': { isSupabaseConfigured: () => true }, '../performance/route': { GET: async () => Response.json({ summary, performance: { realized_pnl: 25 } }) } })('app/api/portfolio/snapshots/route.ts');
  const response = await routes.POST(new Request('http://localhost/api/portfolio/snapshots', { method: 'POST', body: JSON.stringify({ portfolio_value: 9999999, user_id: 'user-b' }) }));
  assert.equal(response.status, 200);
  assert.equal(captured.portfolio_value, 2000);
  assert.equal(captured.user_id, 'user-a');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('Vary'), 'Cookie');
  summary = buildPortfolioSummary(partial);
  assert.equal((await routes.POST()).status, 409);
  user = null;
  assert.equal((await routes.POST()).status, 401);
});

await test('provider failures preserve original quote timestamps and use negative-cache backoff', async () => {
  let fail = false, requests = 0;
  const quote = { symbol: 'TCS', price: 100, price_timestamp: '2026-10-13T09:30:00Z', received_at: '2026-10-13T10:00:00Z', status: 'DELAYED', isValid: true };
  MarketDataService.setProvider({ id: 'offline-failure', sourceLabel: 'Offline provider', fetchQuote: async () => { requests++; if (fail) throw new Error('429 simulated'); return quote; } });
  assert.equal((await MarketDataService.getQuote('TCS')).price, 100);
  fail = true;
  const stale = await MarketDataService.getQuote('TCS', 'NSE', { forceRefresh: true });
  assert.equal(stale.status, 'STALE');
  assert.equal(stale.price_timestamp, quote.price_timestamp);
  assert.equal(stale.received_at, quote.received_at);
  const before = requests;
  await MarketDataService.getQuote('TCS');
  assert.equal(requests, before);
  assert.equal(await MarketDataService.getQuote('UNKNOWN'), null);
  const failures = requests;
  assert.equal(await MarketDataService.getQuote('UNKNOWN'), null);
  assert.equal(requests, failures);
});

await test('missing provider session ranges remain unavailable and news dates drive Recent/Archive', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const now = Math.floor(Date.now() / 1000);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 100, regularMarketTime: now, currency: 'INR', previousClose: 99 }, timestamp: [now], indicators: { quote: [{ close: [100] }] } }] } }) });
    const { YFinanceMarketDataProvider } = load('lib/market/providers/yfinanceProvider.ts');
    const quote = await new YFinanceMarketDataProvider().fetchQuote('TCS');
    assert.ok(quote);
    assert.equal(quote.sessionOpen, null);
    assert.equal(quote.dayHigh, null);
    assert.equal(quote.dayLow, null);
    assert.equal(quote.day_change, 1);
  } finally { globalThis.fetch = originalFetch; }
  const now = Date.parse('2026-10-13T10:00:00Z');
  assert.equal(isRecentArticle({ pubDate: '2026-10-12T10:00:00Z' }, now), true);
  assert.equal(isRecentArticle({ pubDate: '2025-10-12T10:00:00Z' }, now), false);
  assert.equal(isRecentArticle({ pubDate: null }, now), false);
  assert.equal(isRecentArticle({ pubDate: 'invalid' }, now), false);
  assert.equal(isRecentArticle({ pubDate: '2026-10-14T10:00:00Z' }, now), false);
});

await test('Watchlist migration enforces two-user isolation and persistence in isolated PostgreSQL', async () => {
  const db = new PGlite();
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
  try {
    await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES ('${a}'), ('${b}'); CREATE ROLE authenticated; CREATE ROLE anon; GRANT USAGE ON SCHEMA public, auth TO authenticated, anon; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
    await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/20261013000000_user_watchlist.sql'), 'utf8'));
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${a}'; INSERT INTO public.user_watchlist(user_id,symbol) VALUES('${a}','TCS') ON CONFLICT DO NOTHING; INSERT INTO public.user_watchlist(user_id,symbol) VALUES('${a}','TCS') ON CONFLICT DO NOTHING;`);
    assert.equal((await db.query('SELECT * FROM public.user_watchlist')).rows.length, 1);
    await assert.rejects(db.exec(`INSERT INTO public.user_watchlist(user_id,symbol) VALUES('${b}','RELIANCE')`));
    await db.exec(`SET request.jwt.claim.sub = '${b}';`);
    assert.equal((await db.query('SELECT * FROM public.user_watchlist')).rows.length, 0);
    await db.exec(`DELETE FROM public.user_watchlist WHERE user_id='${a}'; INSERT INTO public.user_watchlist(user_id,symbol) VALUES('${b}','RELIANCE'); SET request.jwt.claim.sub = '${a}';`);
    assert.equal((await db.query('SELECT symbol FROM public.user_watchlist')).rows[0].symbol, 'TCS');
    await db.exec(`DELETE FROM public.user_watchlist WHERE symbol='TCS';`);
    assert.equal((await db.query('SELECT * FROM public.user_watchlist')).rows.length, 0);
    await db.exec(`RESET ROLE; SET ROLE anon;`);
    await assert.rejects(db.query('SELECT * FROM public.user_watchlist'));
  } finally { await db.close(); }
});

await test('goal form payload creates and edits the canonical goal name without changing holdings', async () => {
  let user = { id: 'user-a' }, inserted, updated;
  const form = { goal_name: '  darbin  ', target_amount: '101000.50', current_amount: '40000.25', target_date: '2027-01-30', category: 'EDUCATION', priority: 'MEDIUM' };
  const { payload } = goalPayloadFromForm(form);
  assert.equal(payload.goal_name, 'darbin');
  assert.equal(payload.target_amount, 101000.50);
  assert.equal(payload.current_amount, 40000.25);
  assert.equal('name' in payload, false);
  for (const invalid of [
    { goal_name: ' ' }, { target_amount: 'Infinity' }, { target_amount: '0' },
    { current_amount: '-1' }, { current_amount: 'NaN' }, { target_date: '2027-02-30' },
  ]) assert.ok(goalPayloadFromForm({ ...form, ...invalid }).error);
  assert.equal(isGoalDate('2028-02-29'), true);
  assert.equal(isGoalDate('2027-02-29'), false);

  const server = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table) => {
      assert.equal(table, 'investment_goals');
      return {
        insert: (value) => { inserted = value; return { select: () => ({ single: async () => ({ data: { id: 'goal-a', ...value }, error: null }) }) }; },
        update: (value) => {
          updated = value;
          const filters = {};
          const query = { eq: (key, v) => { filters[key] = v; return query; }, select: () => query, single: async () => {
            assert.equal(filters.user_id, 'user-a'); assert.equal(filters.id, 'goal-a');
            return { data: { id: 'goal-a', ...inserted, ...value }, error: null };
          } };
          return query;
        },
      };
    },
  };
  const goalLoader = loader({ '@/lib/supabase/server': { createClient: async () => server }, '@/lib/supabase/config': { isSupabaseConfigured: () => true } });
  const create = goalLoader('app/api/goals/route.ts');
  const edit = goalLoader('app/api/goals/[id]/route.ts');
  const request = (body) => new Request('http://localhost/api/goals', { method: 'POST', body: JSON.stringify(body) });
  const response = await create.POST(request({ ...payload, user_id: 'user-b' }));
  assert.equal(response.status, 200);
  assert.equal(inserted.goal_name, 'darbin');
  assert.equal(inserted.user_id, 'user-a');
  assert.equal(inserted.status, 'ACTIVE');
  assert.equal((await response.json()).data.progress.goalName, 'darbin');
  inserted.status = 'PAUSED';
  const editResponse = await edit.PUT(request({ ...payload, goal_name: 'Education', current_amount: 101001 }), { params: Promise.resolve({ id: 'goal-a' }) });
  assert.equal(editResponse.status, 200);
  assert.equal(updated.goal_name, 'Education');
  assert.equal(updated.status, undefined);
  assert.equal((await editResponse.json()).data.status, 'PAUSED');
  assert.equal((await create.POST(request({ ...payload, target_amount: 'Infinity' }))).status, 400);
  assert.equal((await create.POST(request({ ...payload, target_date: '2027-02-30' }))).status, 400);
  user = null;
  assert.equal((await create.POST(request(payload))).status, 401);
});

await test('navbar search resolves company, ISIN, sector, index and page destinations safely', () => {
  const { navbarSearchResults, browseSearchHref } = load('lib/research/globalSearch.ts');
  assert.equal(navbarSearchResults(' reliance.ns ')[0].label, 'RELIANCE');
  assert.equal(navbarSearchResults('Tata Consultancy')[0].label, 'TCS');
  assert.equal(navbarSearchResults('INE009A01021')[0].label, 'INFY');
  assert.ok(navbarSearchResults('Information Technology').some(result => result.kind === 'Stock'));
  const index = navbarSearchResults('Nifty 50').find(result => result.kind === 'Index');
  assert.ok(index.href.startsWith('/explore/stocks/NIFTY50?'));
  assert.equal(navbarSearchResults('Financial Goals')[0].href, '/goals');
  assert.equal(navbarSearchResults('strategy simulator').find(result => result.kind === 'Page').href, '/future-lab');
  assert.deepEqual(navbarSearchResults('no-such-stock-zzzz'), []);
  assert.equal(new URL(browseSearchHref('TCS & sector=Energy'), 'http://localhost').searchParams.get('search'), 'TCS & sector=Energy');
  const destination = new URL(navbarSearchResults('TCS')[0].href, 'http://localhost');
  assert.equal(new URL(destination.searchParams.get('from'), 'http://localhost').searchParams.get('search'), 'TCS');
});

await test('goal overview separates paused, cancelled, overfunded and overdue funding; scenarios never write goals', () => {
  const { calculateGoalProgress, calculateGoalContributionProjection } = load('lib/calculations/futureLab.ts');
  const { goalFundingSummary, goalStateLabel } = load('lib/goals/planning.ts');
  const now = new Date('2026-10-13T12:00:00Z');
  const goal = (id, status, target, current, date = '2027-01-13') => ({ id, status, goal_name: id, target_amount: target, current_amount: current, target_date: date, category: 'GENERAL', priority: 'MEDIUM', progress: calculateGoalProgress(target, current, date, id, id, now) });
  const active = goal('active', 'ACTIVE', 10000, 2000);
  const goals = [active, goal('paused', 'PAUSED', 20000, 1000), goal('funded', 'ACHIEVED', 10000, 12000), goal('due', 'ACTIVE', 10000, 1000, '2026-01-01'), goal('cancelled', 'CANCELLED', 90000, 80000)];
  const original = JSON.stringify(goals);
  const summary = goalFundingSummary(goals);
  assert.equal(summary.totalTarget, 50000);
  assert.equal(summary.recordedFunding, 16000);
  assert.equal(summary.remainingGap, 36000);
  assert.ok(Math.abs(summary.progressPct - 28) < 1e-8);
  assert.equal(summary.monthlySavings, active.progress.requiredMonthlyContributionZeroGrowth);
  assert.equal(summary.activeCount, 2);
  assert.equal(summary.dueNow, 1);
  assert.equal(summary.fundedCount, 1);
  assert.equal(goalStateLabel(goals[1]), 'Paused');
  assert.equal(goalStateLabel(goals[2]), 'Overfunded');
  assert.equal(goalStateLabel(goals[3]), 'Review deadline');
  const future = calculateGoalContributionProjection(10000, 2000, '2027-01-13', 1000, now);
  assert.equal(future.projectedFundingAtDeadline, 2000 + 1000 * future.remainingMonths);
  assert.equal(future.reachesTarget, false);
  const past = calculateGoalContributionProjection(10000, 1000, '2026-01-01', 99999, now);
  assert.equal(past.projectedContributionsTotal, 0);
  assert.equal(past.projectedGapAtDeadline, 9000);
  assert.equal(goalFundingSummary([]).progressPct, 0);
  assert.equal(JSON.stringify(goals), original);
});

console.log(`${passed} product integrity groups passed. All tests ran offline.`);
