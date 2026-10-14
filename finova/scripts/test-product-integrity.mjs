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
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
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

await test('technical studies use real observation periods, Wilder RSI and no reconstructed OHLCV', () => {
  const { sma, ema, rsi, technicalStudy, validOHLC, volumeDirection, researchPoints } = load('lib/research/technicals.ts');
  const closes = Array.from({ length: 220 }, (_, i) => i + 1);
  assert.equal(sma(closes, 20).at(-1), 210.5);
  assert.equal(sma(closes, 50).at(-1), 195.5);
  assert.equal(sma(closes, 200).at(-1), 120.5);
  assert.ok(Math.abs(ema(closes, 20).at(-1) - 210.5) < 1e-9);
  assert.equal(sma([1, 2], 3).at(-1), null);
  assert.equal(rsi(closes).at(-1), 100);
  assert.equal(rsi(Array(20).fill(100)).at(-1), 50);
  assert.equal(rsi([4, 3, 2, 1], 3).at(-1), 0);
  const wilder = rsi([44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28]);
  assert.ok(Math.abs(wilder.at(-1) - 70.464135021097) < 1e-9);
  assert.throws(() => sma(closes, 0)); assert.throws(() => ema(closes, -1)); assert.throws(() => rsi(closes, 1.2));
  const observations = closes.map((close, i) => ({ timestamp: 1700000000 + i * 86400, date: new Date((1700000000 + i * 86400) * 1000).toISOString(), close, open: close, low: Math.max(0.1, close - 2), high: close + 3, volume: 100 }));
  const original = JSON.stringify(observations), study = technicalStudy(observations, '1d');
  assert.equal(study.trend, 'Bullish indications'); assert.equal(study.support, 199); assert.equal(study.resistance, 223); assert.equal(study.avgVolume, 100); assert.equal(study.volumeRatio, 1);
  assert.equal(technicalStudy(observations, '1wk').trend, 'Insufficient data');
  assert.equal(technicalStudy(observations, '1wk').volatility, null);
  assert.equal(technicalStudy(observations.slice(0, 14), '1d').latest.rsi14, null);
  assert.equal(technicalStudy(observations.map(p => ({ ...p, volume: null })), '1d').avgVolume, null);
  assert.equal(technicalStudy(observations.map(p => ({ ...p, volume: 0 })), '1d').volumeRatio, null);
  const candle = { ...observations[100], open: 100, close: 101, high: 102, low: 99 };
  assert.equal(validOHLC(candle), true); assert.equal(volumeDirection(candle), 'up');
  assert.equal(volumeDirection({ ...candle, open: 102 }), 'down');
  assert.equal(volumeDirection({ ...candle, open: null }), 'neutral');
  assert.equal(validOHLC({ ...candle, high: 100 }), false);
  assert.equal(researchPoints([candle, candle, { ...candle, timestamp: 1, close: NaN }]).length, 1);
  assert.equal(JSON.stringify(observations), original);
});

await test('actual candle renderer preserves missing OHLC gaps and aligned up/down/unknown volume', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { createElement } = await import('react');
  const { PriceHistoryCanvas } = load('components/explorer/PriceHistoryCanvas.tsx');
  const records = [
    { timestamp: 1, date: '2026-01-01', open: 100, high: 111, low: 99, close: 110, volume: 50 },
    { timestamp: 2, date: '2026-01-02', open: 110, high: 111, low: 99, close: 100, volume: 80 },
    { timestamp: 3, date: '2026-01-03', open: null, high: null, low: null, close: 105, volume: 60 },
  ];
  const html = renderToStaticMarkup(createElement(PriceHistoryCanvas, { points: records, mode: 'candles', interval: '1d' }));
  assert.equal((html.match(/data-candle="true"/g) || []).length, 2);
  for (const direction of ['up', 'down', 'neutral']) assert.ok(html.includes(`data-volume-direction="${direction}"`));
  assert.ok(html.includes('3 actual observations')); assert.ok(html.includes('Zoom in chart'));
  const absent = renderToStaticMarkup(createElement(PriceHistoryCanvas, { points: records.map(p => ({ ...p, volume: null })), mode: 'line', interval: '1d' }));
  assert.ok(!absent.includes('data-volume-direction')); assert.ok(absent.includes('Volume unavailable'));
});

await test('reviewed ownership reconciles official percentages and share counts without category overlap', () => {
  const { REVIEWED_OWNERSHIP, validateOwnership, getReviewedOwnership } = load('lib/research/shareholding.ts');
  const record = REVIEWED_OWNERSHIP.INFY;
  assert.equal(validateOwnership(record), true); assert.equal(record.reviewedAt, '2026-10-14');
  assert.equal(getReviewedOwnership('RELIANCE'), null);
  assert.equal(validateOwnership({ ...record, documentUrl: 'https://example.com/filing.pdf' }), false);
  assert.equal(validateOwnership({ ...record, groups: [...record.groups, record.groups[0]] }), false);
  assert.equal(validateOwnership({ ...record, totalShares: record.totalShares + 1 }), false);
  assert.equal(validateOwnership({ ...record, groups: record.groups.map((group, i) => i ? group : { ...group, percent: -1 }) }), false);
  assert.ok(!record.groups.some(group => group.id === 'dii')); // Mutually exclusive report categories, including mutual funds.
});

await test('annual financial growth requires matching scope, units, standard and reporting chronology', () => {
  const { comparableGrowth } = load('lib/research/financialPresentation.ts');
  const current = CURATED_FINANCIALS.TCS.find(metric => metric.id === 'revenue' && metric.period === 'FY2025–26');
  const previous = CURATED_FINANCIALS.TCS.find(metric => metric.id === 'revenue' && metric.period === 'FY2024–25');
  assert.ok(Math.abs(comparableGrowth(current, previous) - (267021 / 255324 - 1) * 100) < 1e-9);
  assert.equal(comparableGrowth(current, undefined), null);
  assert.equal(comparableGrowth(current, { ...previous, basis: 'Standalone' }), null);
  assert.equal(comparableGrowth(current, { ...previous, unit: 'USD' }), null);
  assert.equal(comparableGrowth(current, { ...previous, value: 0 }), null);
  assert.equal(comparableGrowth(current, { ...previous, periodEnd: current.periodEnd }), null);
});

await test('news AI reuses the actual backend with linked sources, server-owned context and explicit provider fallback', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  let prompt = '', failing = false;
  class OfflineGemini { getGenerativeModel() { return { generateContent: async (text) => { prompt = text; if (failing) throw new Error('Offline provider failure'); return { response: { text: () => 'What happened: supplied article. Why it matters: review filings. Potential implications: unknown. Uncertainties: excerpt only. Portfolio relevance: no verified holding. Sources: https://example.org/news' } }; } }; } }
  const route = loader({
    '@google/generative-ai': { GoogleGenerativeAI: OfflineGemini },
    '@/lib/ai/intelligenceEngine': { sanitizeUntrustedInput: (value, max = 2000) => String(value).slice(0, max) },
    '@/lib/news/portfolioContextResolver': { resolveServerPortfolioContext: async () => null },
    '@/lib/news/personalizationEngine': { consolidateUserHoldings: () => new Map(), matchesSymbolOrCompany: () => false },
  })('app/api/ai/explain/route.ts');
  const request = () => new Request('http://localhost/api/ai/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'news_article', stock: { symbol: 'INFY', name: 'Infosys', sector: 'Information Technology', portfolio_weight: 99 }, article: { title: 'Official filing reported by publisher', description: 'An excerpt, not an independently verified conclusion.', link: 'https://example.org/news', source_name: 'Example publisher', timestamp_display: 'Indexed 2026-10-14; publication unconfirmed' } }) });
  const oldWarn = console.warn;
  try {
    process.env.GEMINI_API_KEY = 'offline-test-only';
    const success = await (await route.POST(request())).json();
    assert.equal(success.source, 'gemini'); assert.equal(success.grounded_context.verified_portfolio_weight, null);
    assert.ok(prompt.includes('Source link: https://example.org/news')); assert.ok(prompt.includes('Uncertainties')); assert.ok(prompt.includes('GDELT indexing timestamps'));
    failing = true; console.warn = () => {};
    const fallback = await (await route.POST(request())).json();
    assert.equal(fallback.source, 'deterministic_fallback'); assert.ok(fallback.explanation.startsWith('AI analysis is unavailable.')); assert.ok(!fallback.explanation.includes('verified developments'));
  } finally { console.warn = oldWarn; if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey; }
});

await test('stock news remounts private AI state on logout and account switching', () => {
  let owner = 'owner-alpha';
  const { StockNewsSection } = loader({ '@/components/providers/QueryProvider': { useSession: () => ({ userId: owner }) } })('components/explorer/StockNewsSection.tsx');
  const alpha = StockNewsSection({ symbol: 'INFY' });
  owner = 'owner-beta'; const beta = StockNewsSection({ symbol: 'INFY' });
  owner = null; const guest = StockNewsSection({ symbol: 'INFY' });
  assert.notEqual(alpha.key, beta.key); assert.notEqual(beta.key, guest.key);
  assert.equal(guest.props.userId, null);
});

await test('history request encoding, deliberate force refresh and malformed-provider errors retain the shared contract', async () => {
  const { readInstrumentHistory } = load('lib/hooks/useInstrumentHistory.ts');
  const oldFetch = globalThis.fetch; let url = '';
  try {
    globalThis.fetch = async input => { url = input; return { ok: true, json: async () => ({ symbol: 'GC=F', points: [], source: 'Offline test' }) }; };
    await readInstrumentHistory('GC=F', 'COMMODITY', '1Y', undefined, true);
    assert.ok(url.includes('symbol=GC%3DF')); assert.ok(url.endsWith('&force=true'));
    await readInstrumentHistory('M&M', 'NSE', '1M'); assert.ok(url.includes('M%26M')); assert.ok(!url.includes('force=true'));
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: 'Provider unavailable' }) });
    await assert.rejects(readInstrumentHistory('TCS', 'NSE', '1M'), /Provider unavailable/);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ points: null }) });
    await assert.rejects(readInstrumentHistory('TCS', 'NSE', '1M'), /Historical data is unavailable/);
  } finally { globalThis.fetch = oldFetch; }
});

await test('recent research cards preserve benchmark identity and point units in both display settings', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const React = createRequire(import.meta.url)('react');
  const recent = [{ symbol: 'NIFTY50', name: 'Nifty 50 Index', exchange: 'INDEX' }, { symbol: '^BSESN', name: 'Sensex', exchange: 'BSE' }, { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE' }];
  const quotes = { NIFTY50: { price: 22000, day_change: 10, day_change_pct: 0.05 }, '^BSESN': { price: 73000, day_change: -10, day_change_pct: -0.01 }, RELIANCE: { price: 1000, day_change: 10, day_change_pct: 1 } };
  let stateCalls = 0, setting = 'absolute';
  const { RecentlyViewedStocks } = loader({
    react: { ...React, useState: () => [stateCalls++ === 0 ? recent : true, () => {}], useEffect: () => {} },
    'next/navigation': { useRouter: () => ({ push: () => { throw new Error('Rendering must not navigate'); } }) },
    '@/lib/hooks/useDisplayMetric': { useDisplayMetric: () => setting },
    '@/lib/hooks/useAutoQuotePoller': { useAutoQuotePoller: () => ({ quotes, freshnessLabel: 'Offline fixture', isRefreshing: false }) },
    '@/components/shared/CompanyLogo': { CompanyLogo: ({ symbol }) => React.createElement('span', null, `Company logo ${symbol}`) },
    '@/components/shared/MarketSparkline': { MarketSparkline: ({ symbol }) => React.createElement('span', null, `History ${symbol}`) },
  })('components/explorer/RecentlyViewedStocks.tsx');
  const absolute = renderToStaticMarkup(React.createElement(RecentlyViewedStocks));
  assert.ok(absolute.includes('22,000.00 pts')); assert.ok(absolute.includes('73,000.00 pts'));
  assert.ok(!absolute.includes('₹22,000')); assert.ok(!absolute.includes('₹73,000'));
  assert.ok(absolute.includes('10.00 pts')); assert.ok(absolute.includes('-10.00 pts')); assert.ok(absolute.includes('₹10.00'));
  assert.ok(absolute.includes('Nifty 50')); assert.ok(absolute.includes('S&amp;P BSE Sensex')); assert.ok(absolute.includes('3 instruments'));
  assert.ok(absolute.includes('Company logo RELIANCE')); assert.ok(!absolute.includes('Company logo NIFTY50'));
  stateCalls = 0; setting = 'percentage';
  const relative = renderToStaticMarkup(React.createElement(RecentlyViewedStocks));
  assert.ok(relative.includes('0.05%')); assert.ok(relative.includes('-0.01%')); assert.ok(relative.includes('₹1,000.00'));
});


await test('mini charts retain real observations, last observed sessions, neutral movement and safe 52W bounds', () => {
  const { observedPoints, miniHistory, week52Position } = load('lib/market/miniHistory.ts');
  const p = (date, close) => ({ date, timestamp: Date.parse(date), close });
  const asOf = Date.parse('2026-02-02T16:00:00Z');
  const observations = [p('2026-02-02T04:00:00Z', 103), p('2026-02-01T04:00:00Z', 90), p('2026-02-02T04:05:00Z', 101), p('2026-02-02T04:05:00Z', 102), p('2026-02-03T04:00:00Z', 500), p('bad', 100), p('2026-02-02T04:10:00Z', NaN)];
  const valid = observedPoints(observations, asOf);
  assert.equal(valid.length, 3); assert.deepEqual(valid.map(row => row.close), [90, 103, 102]);
  const response = { providerTicker: 'TCS.NS', range: '1D', interval: '5m', points: observations, exchangeTimezone: 'Asia/Kolkata' };
  const view = miniHistory(response, asOf);
  assert.deepEqual(view.points.map(row => row.close), [103, 102]); assert.equal(view.direction, 'loss');
  assert.ok(!view.label.includes('ended')); // The wall clock alone does not prove a completed session.
  response.regularSession = { start: Date.parse('2026-02-02T03:45:00Z'), end: Date.parse('2026-02-02T10:00:00Z') };
  assert.ok(miniHistory(response, asOf).label.includes('session ended'));
  assert.equal(miniHistory({ ...response, points: [p('2026-02-02T04:00:00Z', 100), p('2026-02-02T04:05:00Z', 100)] }, asOf).direction, 'neutral');
  assert.equal(miniHistory({ ...response, range: '1W' }, asOf).points.length, 3);
  assert.equal(miniHistory({ ...response, range: '1W' }, asOf).label, '1W history');
  const futures = { ...response, providerTicker: 'GC=F', exchangeTimezone: 'America/New_York', regularSession: { start: Date.parse('2026-02-01T23:00:00Z'), end: Date.parse('2026-02-02T22:00:00Z') }, points: [p('2026-02-01T23:05:00Z', 100), p('2026-02-02T03:00:00Z', 102), p('2026-02-02T06:00:00Z', 101)] };
  assert.equal(miniHistory(futures, asOf).points.length, 3); // Preserve the whole observed overnight futures session.
  assert.equal(week52Position(80, 100, 200), 0); assert.equal(week52Position(220, 100, 200), 100);
  assert.equal(week52Position(150, 100, 200), 50);
  for (const args of [[null, 100, 200], [100, null, 200], [100, 200, 100], [100, 100, 100], [Infinity, 100, 200]]) assert.equal(week52Position(...args), null);
});

await test('history queue bounds concurrency and removes cancelled queued work', async () => {
  const { createRequestQueue } = load('lib/market/requestQueue.ts');
  const run = createRequestQueue(4); let active = 0, peak = 0;
  const result = await Promise.all(Array.from({ length: 148 }, (_, index) => run(async () => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--; return index;
  })));
  assert.equal(result.length, 148); assert.equal(peak, 4);
  const serial = createRequestQueue(1); let release, abandonedRan = false;
  const first = serial(() => new Promise(resolve => { release = resolve; }));
  await new Promise(resolve => setImmediate(resolve));
  const controller = new AbortController();
  const cancelled = serial(async () => { abandonedRan = true; }, controller.signal);
  const rejected = assert.rejects(cancelled, { name: 'AbortError' });
  controller.abort(); await rejected;
  release(); await first; assert.equal(abandonedRan, false);
});

await test('history identities deduplicate aliases and provider throttling blocks extra fallback traffic', async () => {
  const { historyQueryKey, readInstrumentHistory } = loader()('lib/market/historyClient.ts');
  assert.deepEqual(historyQueryKey('NIFTY50', 'NSE', '1D'), historyQueryKey('^NSEI', 'INDEX', '1D'));
  assert.deepEqual(historyQueryKey('SENSEX', 'NSE', '1W'), historyQueryKey('^BSESN', 'BSE', '1W'));
  assert.deepEqual(historyQueryKey('GOLDBEES.NS', 'NSE', '1D'), historyQueryKey('GOLDBEES', 'NSE', '1D'));
  assert.equal(historyQueryKey('GC=F', 'OTHER', '1D')[2], 'COMMODITY');
  const oldFetch = globalThis.fetch; let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return { status: 429, ok: false, headers: { get: () => '60' }, json: async () => ({ error: 'Rate limited' }) }; };
    await assert.rejects(readInstrumentHistory('TCS', 'NSE', '1D'), error => error.status === 429);
    await assert.rejects(readInstrumentHistory('INFY', 'NSE', '1W'), error => error.status === 429);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = oldFetch; }
});

await test('server history deduplicates concurrent views, caches observations separately and backs off failures', async () => {
  const original = MarketDataService.getProvider(); let calls = 0, active = 0, peak = 0;
  const provider = {
    id: 'offline-mini', name: 'Offline test', sourceLabel: 'Offline fixture',
    fetchQuote: async () => null,
    fetchHistoricalChart: async (symbol, exchange, range) => {
      calls++; active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 2)); active--;
      if (symbol === 'MISSING') return null;
      return { symbol, exchange, range, providerTicker: symbol + '.NS', interval: '5m', points: [{ date: '2026-01-01T04:00:00Z', timestamp: 1767240000000, close: 100 }, { date: '2026-01-01T04:05:00Z', timestamp: 1767240300000, close: 101 }], source: 'Offline fixture', retrievedAt: '2026-01-01T04:10:00Z', currentPrice: 101 };
    },
  };
  try {
    MarketDataService.setProvider(provider);
    const duplicates = await Promise.all(Array.from({ length: 10 }, () => MarketDataService.getHistoricalChart('TCS', 'NSE', '1D')));
    assert.equal(calls, 1); assert.equal(duplicates.length, 10);
    await MarketDataService.getHistoricalChart('TCS', 'NSE', '1D'); assert.equal(calls, 1);
    await Promise.all(['INFY', 'BHEL', 'HDFCBANK', 'RELIANCE', 'ITC', 'BEL'].map(symbol => MarketDataService.getHistoricalChart(symbol, 'NSE', '1D')));
    assert.ok(peak <= 4);
    await MarketDataService.getHistoricalChart('MISSING', 'NSE', '1D'); const afterMissing = calls;
    await MarketDataService.getHistoricalChart('MISSING', 'NSE', '1D'); assert.equal(calls, afterMissing);
    assert.equal(duplicates[0].retrievedAt, '2026-01-01T04:10:00Z');
  } finally { MarketDataService.setProvider(original); }
});

await test('shared sparkline renders actual shapes, theme-aware movement, correct units and honest fallback', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const React = createRequire(import.meta.url)('react');
  let prices = [100, 103, 99, 105], range = '1D', currency = 'INR', missing = false;
  const { MarketSparkline } = loader({
    '@/lib/hooks/useVisibleElement': { useVisibleElement: () => ({ ref: null, visible: true }) },
    '@tanstack/react-query': { useQuery: ({ queryKey, enabled }) => enabled === false ? {} : { data: missing ? undefined : { symbol: 'TCS', providerTicker: 'TCS.NS', currency, range, interval: range === '1D' ? '5m' : '15m', points: prices.map((close, index) => ({ date: new Date(Date.parse('2026-01-01T04:00:00Z') + index * 300_000).toISOString(), close })), source: 'Offline fixture' }, isPending: false, isError: missing, error: missing ? new Error('Unavailable') : null } },
  })('components/shared/MarketSparkline.tsx');
  const markup = props => renderToStaticMarkup(React.createElement(MarketSparkline, { symbol: 'TCS', ...props }));
  const gain = markup(); assert.ok(gain.includes('rgb(var(--gain))')); assert.ok(gain.includes('polyline')); assert.ok(gain.includes('Offline fixture')); assert.ok(gain.includes('tabindex="0"'));
  prices = [105, 100, 104, 99]; const loss = markup(); assert.ok(loss.includes('rgb(var(--loss))')); assert.notEqual(gain.match(/polyline points="([^"]+)"/)[1], loss.match(/polyline points="([^"]+)"/)[1]);
  prices = [100, 100]; assert.ok(markup().includes('rgb(var(--muted))'));
  assert.ok(markup({ unit: 'pts' }).includes('100.00 pts')); assert.ok(!markup({ unit: 'pts' }).includes('₹100'));
  currency = 'USD'; assert.ok(markup({ unit: '/ troy oz' }).includes('$100.00 / troy oz'));
  range = '1W'; assert.ok(markup().includes('1W history'));
  missing = true; assert.ok(markup().includes('Trend unavailable')); assert.ok(!markup().includes('polyline'));
});

await test('missing intraday history uses a labeled weekly fallback while outages do not multiply requests', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const React = createRequire(import.meta.url)('react');
  const { HistoryRequestError, historyQueryKey } = load('lib/market/historyClient.ts');
  let status = 404; const enabled = [];
  const { MarketSparkline } = loader({
    '@/lib/hooks/useVisibleElement': { useVisibleElement: () => ({ ref: null, visible: true }) },
    '@/lib/market/historyClient': { HistoryRequestError, historyQueryKey },
    '@tanstack/react-query': { useQuery: options => {
      const range = options.queryKey.at(-1); enabled.push({ range, enabled: options.enabled });
      return range === '1D' ? { error: new HistoryRequestError('Unavailable', status), isPending: false, isError: true }
        : { data: { symbol: 'TCS', providerTicker: 'TCS.NS', range: '1W', interval: '15m', currency: 'INR', source: 'Offline fixture', points: [point('2026-01-01T04:00:00Z', 100), point('2026-01-02T04:00:00Z', 102)] } };
    } },
  })('components/shared/MarketSparkline.tsx');
  const render = () => renderToStaticMarkup(React.createElement(MarketSparkline, { symbol: 'TCS' }));
  assert.ok(render().includes('1W fallback')); assert.equal(enabled.at(-1).enabled, true);
  status = 500; assert.ok(render().includes('Trend unavailable')); assert.equal(enabled.at(-1).enabled, false);
  status = 429; assert.ok(render().includes('Trend unavailable')); assert.equal(enabled.at(-1).enabled, false);
});

await test('provider rate limits reach the API with Retry-After and failed client reads are negatively cached', async () => {
  const { HistoryProviderRateLimitError } = load('lib/market/providers/yfinanceProvider.ts');
  const route = loader({
    '@/lib/services/marketData': { MarketDataService: { getHistoricalChart: async () => { throw new HistoryProviderRateLimitError(45); } } },
    '@/lib/market/providers/yfinanceProvider': { HistoryProviderRateLimitError },
  })('app/api/market/history/route.ts');
  const response = await route.GET(new Request('http://localhost/api/market/history?symbol=TCS&range=1D'));
  assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '45');
  const client = loader()('lib/market/historyClient.ts');
  const oldFetch = globalThis.fetch; let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return { status: 404, ok: false, json: async () => ({ error: 'Missing history' }) }; };
    await assert.rejects(client.readInstrumentHistory('TCS', 'NSE', '1D'), /Missing history/);
    await assert.rejects(client.readInstrumentHistory('TCS', 'NSE', '1D'), /Missing history/); assert.equal(calls, 1);
    await assert.rejects(client.readInstrumentHistory('TCS', 'NSE', '1D', undefined, true), /Missing history/); assert.equal(calls, 2);
  } finally { globalThis.fetch = oldFetch; }
});

await test('Dashboard consolidation never extends quoted prices to missing broker positions', () => {
  const { dashboardHoldings } = load('lib/dashboard/presentation.ts');
  const positions = [holding('TCS', 120), { ...holding('TCS', null, 50, 90), id: 'tcs-b', broker_account_id: 'broker-b' }, holding('RELIANCE', 80)];
  const original = JSON.stringify(positions);
  const rows = dashboardHoldings(positions);
  const tcs = rows.find(row => row.identity.symbol === 'TCS');
  assert.equal(tcs.quantity, 60);
  assert.equal(tcs.accounts, 2);
  assert.equal(tcs.currentValue, 1200);
  assert.equal(tcs.pricedInvested, 1000);
  assert.equal(tcs.pnl, 200);
  assert.equal(tcs.partial, true);
  assert.equal(tcs.weight, 60);
  assert.equal(rows.reduce((sum, row) => sum + row.weight, 0), 100);
  const noPrice = dashboardHoldings([holding('UNKNOWN', null)])[0];
  assert.equal(noPrice.currentValue, null); assert.equal(noPrice.pnl, null);
  assert.equal(noPrice.valueOnBasis, 1000); assert.equal(noPrice.weight, 100);
  const excluded = dashboardHoldings([...positions, holding('UNKNOWN', null)]).find(row => row.identity.symbol === 'UNKNOWN');
  assert.equal(excluded.currentValue, null); assert.equal(excluded.weight, null);
  assert.equal(JSON.stringify(positions), original);
});

await test('Dashboard history excludes unvalued, incomplete, foreign, invalid and future snapshots', () => {
  const { dashboardSnapshots } = load('lib/dashboard/presentation.ts');
  const record = { id: 'a', user_id: 'fixture', snapshot_date: '2026-10-01', currency: 'INR', completeness_status: 'COMPLETE', portfolio_value: 1100, invested_value: 1000, created_at: '2026-10-01T12:00:00Z' };
  const result = dashboardSnapshots([record,
    { ...record, snapshot_date: '2026-10-03', portfolio_value: null, invested_value: 9000 },
    { ...record, snapshot_date: '2026-10-04', completeness_status: 'PARTIAL' },
    { ...record, snapshot_date: '2026-10-05', currency: 'USD' },
    { ...record, snapshot_date: '2026-02-30' },
    { ...record, snapshot_date: '2026-10-15' },
    { ...record, snapshot_date: '2026-10-06', portfolio_value: Infinity },
    { ...record, snapshot_date: '2026-10-07', portfolio_value: -100 },
    { ...record, snapshot_date: '2026-10-08', portfolio_value: 0 },
    { ...record, portfolio_value: 1200, created_at: '2026-10-01T13:00:00Z' },
  ], '2026-10-14');
  assert.equal(result.length, 2); assert.equal(result[0].portfolio_value, 1200);
  assert.equal(result[1].portfolio_value, 0);
  assert.equal(dashboardSnapshots([{ ...record, portfolio_value: null }], '2026-10-14').length, 0);
});

await test('Dashboard metric rendering keeps unavailable returns separate from actual zero results', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const componentLoad = loader({ 'next/link': ({ children, ...props }) => React.createElement('a', props, children) });
  const { PortfolioSummaryMetrics } = componentLoad('components/dashboard/PortfolioSummaryMetrics.tsx');
  const unknown = renderToStaticMarkup(React.createElement(PortfolioSummaryMetrics, { summary: buildPortfolioSummary([holding('UNKNOWN', null)]) }));
  assert.ok(unknown.includes('Valued Subtotal'));
  assert.equal((unknown.match(/Unavailable/g) || []).length, 3);
  assert.ok(!unknown.includes('+0.00%'));
  const zero = renderToStaticMarkup(React.createElement(PortfolioSummaryMetrics, { summary: buildPortfolioSummary(complete) }));
  assert.ok(zero.includes('+0.00%')); assert.ok(zero.includes('Recorded investment positions'));
});

await test('Investment research destinations preserve supported identity and avoid unsupported stock routes', () => {
  const { selectedBrokerAccount } = load('lib/investments/presentation.ts');
  const accounts = [{ id: 'first' }, { id: 'second' }];
  assert.equal(selectedBrokerAccount('', accounts), 'first');
  assert.equal(selectedBrokerAccount('second', accounts), 'second');
  assert.equal(selectedBrokerAccount('', []), '');
  const { researchReturnDestination } = load('lib/navigation.ts');
  assert.equal(researchReturnDestination('/investments'), '/investments');
  assert.equal(researchReturnDestination('/holdings?action=add'), '/holdings?action=add');
  assert.equal(researchReturnDestination('/explore?tab=browse&search=TCS'), '/explore?tab=browse&search=TCS');
  assert.equal(researchReturnDestination('https://example.com'), '/explore');
  assert.equal(researchReturnDestination('//example.com'), '/explore');
  assert.equal(researchReturnDestination('/login'), '/explore');
  const { holdingResearchDestination, hasHoldingPrice, holdingQuoteTimestamp, INVESTMENT_CATEGORIES } = load('lib/investments/presentation.ts');
  assert.equal(holdingResearchDestination({ ...holding('TCS', 100), symbol: 'TCS.NS', exchange: 'NSE' }, '/investments'), '/explore/stocks/TCS?from=%2Finvestments');
  assert.equal(holdingResearchDestination({ ...holding('RELIANCE', 100), exchange: 'NSE' }, '/holdings'), '/explore/stocks/RELIANCE?from=%2Fholdings');
  assert.equal(holdingResearchDestination({ ...holding('UNKNOWN', null), asset_class: 'bond' }), '/bonds');
  assert.equal(holdingResearchDestination({ ...holding('UNKNOWN', null), asset_class: 'reit' }), '/reit');
  assert.equal(holdingResearchDestination({ ...holding('UNKNOWN', null), asset_class: 'invit' }), '/invit');
  assert.ok(!holdingResearchDestination({ ...holding('TCS', 100), exchange: 'BSE' }).startsWith('/explore/stocks/'));
  assert.ok(!holdingResearchDestination(holding('UNSUPPORTED', null)).startsWith('/explore/stocks/'));
  assert.equal(hasHoldingPrice({ current_price: NaN }), false); assert.equal(hasHoldingPrice({ current_price: 0 }), false);
  assert.equal(hasHoldingPrice({ current_price: null }), false); assert.equal(hasHoldingPrice({ current_price: 100 }), true);
  assert.equal(holdingQuoteTimestamp('invalid'), null); assert.equal(holdingQuoteTimestamp(null), null);
  assert.ok(holdingQuoteTimestamp('2026-10-14T09:59:00Z').includes('IST'));
  assert.ok(INVESTMENT_CATEGORIES.some(tab => tab.assetClass === 'etf')); assert.ok(INVESTMENT_CATEGORIES.some(tab => tab.assetClass === 'sgb'));
});

await test('Investment summaries keep partial valuations honest and do not show failed reads as empty portfolios', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const componentLoad = loader({ 'next/link': ({ children, ...props }) => React.createElement('a', props, children) });
  const { InvestmentsSummary } = componentLoad('components/investments/InvestmentsSummary.tsx');
  const summary = buildPortfolioSummary([holding('TCS', 120), holding('UNKNOWN', null)]);
  const render = props => renderToStaticMarkup(React.createElement(InvestmentsSummary, { summary, loading: false, unavailable: false, brokerCount: 2, ...props }));
  assert.ok(render({}).includes('Valued Subtotal')); assert.ok(render({}).includes('1 of 2 positions quoted'));
  assert.ok(render({}).includes('Manual / imported')); assert.ok(!render({}).includes('verified quotes'));
  assert.ok(!render({ unavailable: true }).includes('₹')); assert.ok(render({ unavailable: true }).includes('Retry to load'));
  assert.ok(!render({ loading: true }).includes('₹')); assert.ok(render({ loading: true }).includes('Loading recorded data'));
  assert.ok(render({ brokerCount: null }).includes('Accounts unavailable'));
});

console.log(`${passed} product integrity groups passed. All tests ran offline.`);
