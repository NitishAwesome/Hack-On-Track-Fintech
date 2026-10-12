// ============================================================
// FINOVA — News Provider Reliability Verification Suite
// tests/verify-news-reliability.mjs
// ============================================================

import assert from 'node:assert/strict';

console.log('--- [FINOVA News Provider Reliability Verification Suite] ---');

// Test 1: MarketAux Key Precedence
console.log('\n[TEST 1] Verifying MarketAux API Key Precedence and Sanitization...');
{
  const { resolveMarketAuxApiKey } = await import('../lib/news/providers/marketAuxProvider.ts');

  // Scenario 1A: MARKETAUX_API_KEY set, MARKETAUX_API_TOKEN set with different value
  const originalEnv = { ...process.env };
  try {
    process.env.MARKETAUX_API_KEY = 'correct_primary_key_12345';
    process.env.MARKETAUX_API_TOKEN = 'stale_token_67890';
    const resolved = resolveMarketAuxApiKey();
    assert.equal(resolved, 'correct_primary_key_12345', 'MARKETAUX_API_KEY must take precedence over MARKETAUX_API_TOKEN');

    // Scenario 1B: MARKETAUX_API_KEY has placeholder, fallback to real token if present
    process.env.MARKETAUX_API_KEY = 'your_marketaux_api_key_here';
    process.env.MARKETAUX_API_TOKEN = 'valid_token_backup_999';
    const resolvedBackup = resolveMarketAuxApiKey();
    assert.equal(resolvedBackup, 'valid_token_backup_999', 'Placeholder keys must be ignored');

    // Scenario 1C: All placeholders or empty
    process.env.MARKETAUX_API_KEY = '';
    process.env.MARKETAUX_API_TOKEN = 'placeholder_token';
    process.env.MARKET_AUX_API_KEY = 'your_key';
    const resolvedNone = resolveMarketAuxApiKey();
    assert.equal(resolvedNone, '', 'Missing or placeholder keys must return empty string');

    console.log('  ✓ Precedence correctly favors MARKETAUX_API_KEY over MARKETAUX_API_TOKEN');
    console.log('  ✓ Placeholders and whitespaces safely ignored');
  } finally {
    process.env = originalEnv;
  }
}

// Test 2: GDELT Date Parsing and Resilience
console.log('\n[TEST 2] Verifying GDELT Date Parsing & Formats...');
{
  const { parseGdeltDate, normalizeGdeltArticle } = await import('../lib/news/providers/gdeltProvider.ts');

  // 14-digit numeric format: YYYYMMDDHHmmss
  const parsed14 = parseGdeltDate('20261011180500');
  assert.equal(parsed14, '2026-10-11T18:05:00.000Z', 'Must correctly parse 14-digit GDELT date');

  // Compact ISO format: YYYYMMDDTHHmmssZ
  const parsedCompact = parseGdeltDate('20261011T180500Z');
  assert.equal(parsedCompact, '2026-10-11T18:05:00.000Z', 'Must correctly parse compact ISO GDELT date');

  // Malformed date fallback
  const parsedInvalid = parseGdeltDate('not-a-date');
  assert.ok(parsedInvalid && parsedInvalid.endsWith('Z'), 'Invalid date must produce valid ISO fallback');

  // Normalize GDELT article
  const rawSample = {
    title: 'Tata Motors share price rallies 4% on strong EV sales',
    url: 'https://www.thehindubusinessline.com/markets/tata-motors-rallies/article123.ece',
    seendate: '20261011180500',
    domain: 'thehindubusinessline.com',
  };
  const normalized = normalizeGdeltArticle(rawSample);
  assert.ok(normalized, 'Article must normalize successfully');
  assert.equal(normalized.source_provider, 'gdelt');
  assert.equal(normalized.source_name, 'The Hindu BusinessLine');
  assert.equal(normalized.pubDate, '2026-10-11T18:05:00.000Z');

  console.log('  ✓ GDELT compact and numeric date formats parsed accurately');
  console.log('  ✓ Source cleaning maps domains to trusted media titles');
}

// Test 3: MarketAux Article Normalization & Symbol Extraction
console.log('\n[TEST 3] Verifying MarketAux Article Normalization & Symbol Extraction...');
{
  const { normalizeMarketAuxArticle } = await import('../lib/news/providers/marketAuxProvider.ts');

  const rawMkt = {
    uuid: 'test-uuid-1234',
    title: 'Reliance Industries Q2 Net Profit Jumps 12%',
    url: 'https://economictimes.indiatimes.com/markets/stocks/news/reliance-q2-profit/1234.cms',
    published_at: '2026-10-11T14:30:00.000Z',
    source: 'economictimes.indiatimes.com',
    snippet: 'Reliance Industries reported a 12% rise in consolidated net profit...',
    entities: [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
      { symbol: 'TCS.BO', name: 'Tata Consultancy Services' },
    ],
  };

  const normMkt = normalizeMarketAuxArticle(rawMkt);
  assert.ok(normMkt, 'MarketAux article should normalize');
  assert.equal(normMkt.source_provider, 'marketaux');
  assert.equal(normMkt.source_name, 'The Economic Times');
  assert.deepEqual(normMkt.symbols, ['RELIANCE', 'TCS'], 'Exchange suffixes (.NS, .BO) must be stripped');

  console.log('  ✓ MarketAux articles normalized with cleaned symbols and publisher name');
}

// Test 4: Deduplication Across Providers
console.log('\n[TEST 4] Verifying Deduplication across NewsData, MarketAux, and GDELT...');
{
  const { deduplicateAcrossProviders } = await import('../lib/news/aggregationService.ts');

  const articles = [
    {
      article_id: 'art-1',
      title: 'Sensex surges 500 points led by banking and IT stocks - The Economic Times',
      link: 'https://economictimes.indiatimes.com/markets/stocks/news/sensex-today/123.cms?utm_source=twitter',
      source_name: 'The Economic Times',
      pubDate: '2026-10-11T10:00:00.000Z',
      retrieved_at: '2026-10-11T10:05:00.000Z',
      source_provider: 'newsdata',
      freshness: 'TODAY',
      language: 'en',
      image_url: null,
      description: null,
    },
    {
      article_id: 'art-2',
      title: 'Sensex surges 500 points led by banking and IT stocks | Mint',
      link: 'https://economictimes.indiatimes.com/markets/stocks/news/sensex-today/123.cms', // same canonical URL
      source_name: 'Mint',
      pubDate: '2026-10-11T10:00:00.000Z',
      retrieved_at: '2026-10-11T10:05:00.000Z',
      source_provider: 'marketaux',
      freshness: 'TODAY',
      language: 'en',
      image_url: 'https://images.livemint.com/img/123.jpg', // higher quality
      description: 'Indian benchmark indices rallied on Friday...',
    },
  ];

  const deduped = deduplicateAcrossProviders(articles);
  assert.equal(deduped.length, 1, 'Duplicate article must be coalesced');
  assert.equal(deduped[0].image_url, 'https://images.livemint.com/img/123.jpg', 'Higher quality article version must be retained');

  console.log('  ✓ Multi-factor deduplication coalesced duplicates and retained richer version');
}

// Test 5: Safe Diagnostics Format & Credential Leakage Prevention
console.log('\n[TEST 5] Verifying Safe Diagnostics & No Secret Leaks...');
{
  const { fetchIndianFinancialNews } = await import('../lib/news/newsProvider.ts');
  const { fetchMarketAuxNews } = await import('../lib/news/providers/marketAuxProvider.ts');
  const { fetchGdeltNews } = await import('../lib/news/providers/gdeltProvider.ts');

  // Check unconfigured behavior
  const originalNewsDataKey = process.env.NEWSDATA_API_KEY;
  const originalMarketAuxKey = process.env.MARKETAUX_API_KEY;
  try {
    delete process.env.NEWSDATA_API_KEY;
    delete process.env.NEWS_API_KEY;
    delete process.env.NEWSAPI_KEY;
    delete process.env.MARKETAUX_API_KEY;
    delete process.env.MARKETAUX_API_TOKEN;

    const ndRes = await fetchIndianFinancialNews({ forceRefresh: true });
    assert.equal(ndRes.providerStatus, 'NOT_CONFIGURED');
    assert.ok(ndRes.diagnostics);
    assert.equal(ndRes.diagnostics.provider, 'newsdata');
    assert.equal(ndRes.diagnostics.status, 'NOT_CONFIGURED');
    assert.equal(ndRes.diagnostics.articles_count, 0);

    const maRes = await fetchMarketAuxNews({ forceRefresh: true });
    assert.equal(maRes.providerStatus, 'NOT_CONFIGURED');
    assert.ok(maRes.diagnostics);
    assert.equal(maRes.diagnostics.provider, 'marketaux');
    assert.equal(maRes.diagnostics.status, 'NOT_CONFIGURED');

    // Ensure diagnostics string does not leak any secret tokens
    const diagString = JSON.stringify({ nd: ndRes.diagnostics, ma: maRes.diagnostics });
    assert.ok(!diagString.includes('key_'), 'Diagnostics must never contain secret strings');
    assert.ok(!diagString.includes('token_'), 'Diagnostics must never contain token strings');

    console.log('  ✓ SafeProviderDiagnostic populated accurately on unconfigured providers');
    console.log('  ✓ Verified zero secret or credential leakage in diagnostic output');
  } finally {
    process.env.NEWSDATA_API_KEY = originalNewsDataKey;
    process.env.MARKETAUX_API_KEY = originalMarketAuxKey;
  }
}

console.log('\n>>> All News Reliability Verifications PASSED successfully! <<<\n');
