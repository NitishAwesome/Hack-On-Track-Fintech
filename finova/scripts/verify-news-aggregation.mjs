// ============================================================
// FINOVA — Multi-Provider News Aggregation Verification Suite
// scripts/verify-news-aggregation.mjs
// ============================================================

import assert from 'node:assert';
import {
  canonicalizeUrl,
  normalizeTitleForDeduplication,
  computeTitleSimilarity,
  deduplicateAcrossProviders,
} from '../lib/news/aggregationService.ts';
import { normalizeMarketAuxArticle } from '../lib/news/providers/marketAuxProvider.ts';
import { normalizeGdeltArticle, parseGdeltDate } from '../lib/news/providers/gdeltProvider.ts';
import { cleanPublisherName } from '../lib/news/sourceCleaner.ts';
import { personalizeArticle } from '../lib/news/personalizationEngine.ts';

console.log('===========================================================');
console.log('FINOVA — Testing Multi-Provider News Aggregation Pipeline');
console.log('===========================================================');

let passedTests = 0;

// Test 1: Source Cleaner & Publisher Transparency
{
  assert.strictEqual(cleanPublisherName('economictimes.indiatimes.com'), 'The Economic Times');
  assert.strictEqual(cleanPublisherName('livemint.com'), 'Mint');
  assert.strictEqual(cleanPublisherName('business-standard.com'), 'Business Standard');
  assert.strictEqual(cleanPublisherName('reuters'), 'Reuters');
  assert.strictEqual(cleanPublisherName('moneycontrol.com'), 'Moneycontrol');
  // Must NOT output provider names as publisher
  assert.strictEqual(cleanPublisherName('MarketAux', 'https://reuters.com/business/123'), 'Reuters');
  assert.strictEqual(cleanPublisherName('GDELT', 'https://livemint.com/news/456'), 'Mint');
  console.log('[PASS] Test 1: Publisher Name Cleaner & Source Transparency');
  passedTests++;
}

// Test 2: GDELT Date Parsing
{
  const iso1 = parseGdeltDate('20261011T180500Z');
  assert.strictEqual(iso1, '2026-10-11T18:05:00.000Z');
  const iso2 = parseGdeltDate('20261010123045');
  assert.strictEqual(iso2, '2026-10-10T12:30:45.000Z');
  console.log('[PASS] Test 2: GDELT Date Parser Handles Multiple Formats');
  passedTests++;
}

// Test 3: MarketAux Article Normalization
{
  const rawMkt = {
    uuid: 'test-uuid-1234',
    title: 'RBI Monetary Policy: Repo rate held steady amid steady inflation',
    url: 'https://economictimes.indiatimes.com/news/economy/policy/rbi-rate.cms?utm_source=twitter',
    snippet: 'The Reserve Bank of India kept benchmark lending rates unchanged.',
    source: 'economictimes.indiatimes.com',
    published_at: '2026-10-11T12:00:00.000Z',
    image_url: 'https://img.etimg.com/thumb/msid-123.jpg',
    entities: [{ symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' }],
  };

  const norm = normalizeMarketAuxArticle(rawMkt);
  assert.ok(norm, 'Article must normalize successfully');
  assert.strictEqual(norm.source_provider, 'marketaux');
  assert.strictEqual(norm.source_name, 'The Economic Times');
  assert.strictEqual(norm.title, rawMkt.title);
  assert.deepStrictEqual(norm.symbols, ['HDFCBANK']);
  assert.strictEqual(norm.image_url, rawMkt.image_url);
  console.log('[PASS] Test 3: MarketAux Normalization & Entity Symbol Extraction');
  passedTests++;
}

// Test 4: GDELT Article Normalization
{
  const rawGdelt = {
    url: 'https://www.livemint.com/market/stock-market-news/tata-motors-ev-sales-grow.html',
    title: 'Tata Motors reports 20% surge in electric vehicle registrations',
    seendate: '20261011T091500Z',
    socialimage: 'https://images.livemint.com/img/tata-motors.jpg',
    domain: 'livemint.com',
    language: 'English',
  };

  const norm = normalizeGdeltArticle(rawGdelt);
  assert.ok(norm, 'GDELT article must normalize');
  assert.strictEqual(norm.source_provider, 'gdelt');
  assert.strictEqual(norm.source_name, 'Mint');
  assert.strictEqual(norm.pubDate, '2026-10-11T09:15:00.000Z');
  assert.strictEqual(norm.image_url, rawGdelt.socialimage);
  console.log('[PASS] Test 4: GDELT Normalization & Social Image Extraction');
  passedTests++;
}

// Test 5: URL Canonicalization
{
  const url1 = 'https://economictimes.indiatimes.com/news/article.cms?utm_source=feed&utm_medium=rss/';
  const url2 = 'https://economictimes.indiatimes.com/news/article.cms';
  assert.strictEqual(canonicalizeUrl(url1), canonicalizeUrl(url2));
  console.log('[PASS] Test 5: URL Canonicalization Strips UTM Tracking & Slashes');
  passedTests++;
}

// Test 6: Title Similarity & Token Jaccard
{
  const titleA = 'Reliance Industries Q2 Net Profit Rises 12% to Rs 19,000 Crore | The Economic Times';
  const titleB = 'RIL Q2 Profit Jumps 12% to Rs 19,000 Crore on Strong Retail Numbers - Livemint';
  const normA = normalizeTitleForDeduplication(titleA);
  const normB = normalizeTitleForDeduplication(titleB);
  assert.ok(!normA.includes('economic times'));
  assert.ok(!normB.includes('livemint'));

  const similarity = computeTitleSimilarity(
    'Reliance Q2 net profit rises 12 percent to 19000 crore on retail growth',
    'Reliance Q2 net profit rises 12 percent to 19000 crore as retail expands'
  );
  assert.ok(similarity > 0.60, 'Substantial word overlap detected');
  console.log('[PASS] Test 6: Headline Normalization & Similarity Matching');
  passedTests++;
}

// Test 7: Multi-Provider Deduplication & Quality Selection
{
  const lowQualityArticle = {
    article_id: 'art-gdelt-1',
    title: 'HDFC Bank reports quarterly loan growth of 15 percent',
    link: 'https://reuters.com/business/hdfc-bank-loans?ref=wire',
    description: null,
    source_name: 'Reuters',
    pubDate: '2026-10-11T10:00:00.000Z',
    retrieved_at: '2026-10-11T10:05:00.000Z',
    image_url: null,
    keywords: null,
    categories: null,
    source_provider: 'gdelt',
    language: 'en',
    freshness: 'TODAY',
  };

  const highQualityArticle = {
    article_id: 'art-mktaux-2',
    title: 'HDFC Bank reports quarterly loan growth of 15 percent',
    link: 'https://reuters.com/business/hdfc-bank-loans',
    description: 'India\'s largest private lender saw domestic advances increase 15% year-on-year.',
    source_name: 'Reuters',
    pubDate: '2026-10-11T10:00:00.000Z',
    retrieved_at: '2026-10-11T10:05:00.000Z',
    image_url: 'https://reuters.com/images/hdfc.jpg',
    keywords: ['Banking', 'Credit'],
    categories: ['Financial Services'],
    source_provider: 'marketaux',
    language: 'en',
    freshness: 'TODAY',
    symbols: ['HDFCBANK'],
  };

  const pool = [lowQualityArticle, highQualityArticle];
  const deduped = deduplicateAcrossProviders(pool);
  assert.strictEqual(deduped.length, 1, 'Duplicate must be condensed into single article');
  assert.strictEqual(deduped[0].image_url, 'https://reuters.com/images/hdfc.jpg', 'Higher quality version (with image & description) must win');
  assert.strictEqual(deduped[0].source_provider, 'marketaux');
  console.log('[PASS] Test 7: Deduplication Selects Highest-Quality Article Representation');
  passedTests++;
}

// Test 8: Portfolio Personalization with Multi-Provider Entities
{
  const userPortfolio = {
    user_id: 'user-test',
    holdings: [
      {
        symbol: 'RELIANCE',
        instrument_name: 'Reliance Industries Ltd',
        asset_class: 'equity',
        sector: 'Energy',
        current_value: 100000,
        invested_value: 80000,
      },
      {
        symbol: 'INFY',
        instrument_name: 'Infosys Ltd',
        asset_class: 'equity',
        sector: 'Information Technology',
        current_value: 50000,
        invested_value: 40000,
      },
    ],
    total_valued_capital: 150000,
    represented_sectors: ['Energy', 'Information Technology'],
    represented_asset_classes: ['equity'],
    is_valuation_complete: true,
  };

  const relianceArticle = {
    article_id: 'art-mkt-1',
    title: 'RIL green energy mega-project receives board sanction for Phase 2',
    link: 'https://economictimes.indiatimes.com/ril-green-energy',
    description: 'Reliance Industries is expanding renewable capacity in Gujarat.',
    source_name: 'The Economic Times',
    pubDate: '2026-10-11T14:00:00.000Z',
    retrieved_at: new Date().toISOString(),
    image_url: 'https://img.etimg.com/green.jpg',
    keywords: ['RIL', 'Energy'],
    categories: ['Energy'],
    source_provider: 'marketaux',
    language: 'en',
    freshness: 'LIVE',
    symbols: ['RELIANCE'],
  };

  const generalMacroArticle = {
    article_id: 'art-gdelt-2',
    title: 'India inflation eases to 4.2% as food prices stabilize across states',
    link: 'https://livemint.com/economy/cpi-inflation',
    description: 'Consumer price inflation fell within the RBI tolerance band.',
    source_name: 'Mint',
    pubDate: '2026-10-11T11:00:00.000Z',
    retrieved_at: new Date().toISOString(),
    image_url: 'https://livemint.com/inflation.jpg',
    keywords: ['Inflation', 'CPI'],
    categories: ['Economy'],
    source_provider: 'gdelt',
    language: 'en',
    freshness: 'TODAY',
  };

  const pReliance = personalizeArticle(relianceArticle, userPortfolio);
  assert.strictEqual(pReliance.relevance_category, 'DIRECT_HOLDING');
  assert.strictEqual(pReliance.matched_holding?.symbol, 'RELIANCE');
  assert.ok(pReliance.relevance_score > 70, 'Direct holding match must receive high relevance');

  const pMacro = personalizeArticle(generalMacroArticle, userPortfolio);
  assert.strictEqual(pMacro.relevance_category, 'GENERAL_MARKET');
  assert.ok(pReliance.relevance_score > pMacro.relevance_score, 'Direct holding ranks higher than general macro');
  console.log('[PASS] Test 8: Portfolio Personalization Ranks Direct Holdings Over Macro News');
  passedTests++;
}

console.log('===========================================================');
console.log(`Results: ${passedTests}/8 News Aggregation Unit Tests PASSED.`);
console.log('ALL NEWS AGGREGATION TESTS PASSED!');
console.log('===========================================================');
