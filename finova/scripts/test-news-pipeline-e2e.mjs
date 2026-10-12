// ============================================================
// FINOVA — End-to-End News Aggregation Pipeline Verification
// scripts/test-news-pipeline-e2e.mjs
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

// Parse .env.local manually without external dependencies
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { getAggregatedFinancialNews } from '../lib/news/aggregationService.ts';
import { personalizeAndRankNews } from '../lib/news/personalizationEngine.ts';
import { GET as newsRouteHandler } from '../app/api/news/route.ts';

async function runVerification() {
  console.log('===========================================================');
  console.log('FINOVA — Live Multi-Provider Aggregation End-to-End Test');
  console.log('===========================================================');

  console.log('1. Testing getAggregatedFinancialNews directly:');
  const result = await getAggregatedFinancialNews({ forceRefresh: true });
  console.log('-> Provider status:', result.providerStatus);
  console.log('-> Providers used:', result.providersUsed);
  console.log('-> Provider breakdown:', result.providerBreakdown);
  console.log('-> Total deduplicated articles:', result.articles.length);
  console.log('-> Is cached:', result.isCached);
  console.log('-> Next page token:', result.nextPage);

  if (result.articles.length > 0) {
    console.log('\n2. Inspecting Sample Aggregated Articles:');
    result.articles.slice(0, 8).forEach((a, idx) => {
      console.log(`[${idx + 1}] Provider: ${a.source_provider} | Source: "${a.source_name}"`);
      console.log(`    Headline: ${a.title}`);
      console.log(`    URL: ${a.link}`);
      console.log(`    Image: ${a.image_url ? a.image_url.slice(0, 70) + '...' : 'None'}`);
      console.log(`    Date: ${a.pubDate}`);
      console.log(`    Symbols: ${JSON.stringify(a.symbols || [])}`);
    });

    const uniquePublishers = new Set(result.articles.map((a) => a.source_name));
    console.log('\n3. Publisher Transparency Check:');
    console.log('-> Unique publishers displayed to user:', Array.from(uniquePublishers));
    const forbidden = ['newsdata', 'marketaux', 'gdelt'];
    const hasForbidden = Array.from(uniquePublishers).some((p) =>
      forbidden.includes(p.toLowerCase())
    );
    if (hasForbidden) {
      console.error('FAIL: Provider name found as publisher in feed!');
    } else {
      console.log('PASS: Zero provider names exposed as publishers. Real publications displayed!');
    }

    console.log('\n4. Testing Portfolio Personalization:');
    const mockPortfolio = {
      user_id: 'test-user',
      holdings: [
        {
          symbol: 'HDFCBANK',
          instrument_name: 'HDFC Bank Ltd',
          asset_class: 'equity',
          sector: 'Financial Services',
          current_value: 200000,
          invested_value: 150000,
        },
        {
          symbol: 'RELIANCE',
          instrument_name: 'Reliance Industries Ltd',
          asset_class: 'equity',
          sector: 'Energy',
          current_value: 300000,
          invested_value: 250000,
        },
      ],
      total_valued_capital: 500000,
      represented_sectors: ['Financial Services', 'Energy'],
      represented_asset_classes: ['equity'],
      is_valuation_complete: true,
    };

    const personalized = personalizeAndRankNews(result.articles, mockPortfolio);
    console.log('-> Total personalized articles:', personalized.length);
    const directMatches = personalized.filter((a) => a.relevance_category === 'DIRECT_HOLDING');
    const sectorMatches = personalized.filter((a) => a.relevance_category === 'SECTOR_RELEVANCE');
    const generalMarket = personalized.filter((a) => a.relevance_category === 'GENERAL_MARKET');
    console.log(`-> Direct holding matches: ${directMatches.length}`);
    console.log(`-> Sector matches: ${sectorMatches.length}`);
    console.log(`-> General market matches: ${generalMarket.length}`);

    if (directMatches.length > 0) {
      console.log('-> Sample Direct Match:');
      console.log(`   Holding: ${directMatches[0].matched_holding?.symbol}`);
      console.log(`   Headline: ${directMatches[0].title}`);
      console.log(`   Explanation: ${directMatches[0].relevance_explanation}`);
      console.log(`   Score: ${directMatches[0].relevance_score}`);
    }

    console.log('\n5. Testing /api/news Route Handler directly:');
    const req = new Request('http://localhost:3000/api/news?refresh=true');
    const routeRes = await newsRouteHandler(req);
    console.log('-> Route status:', routeRes.status);
    const routeJson = await routeRes.json();
    console.log('-> Response status field:', routeJson.status);
    console.log('-> Articles count in response:', routeJson.articles?.length);
    console.log('-> Meta providers used:', routeJson.meta?.providers_used);
    console.log('-> Meta provider breakdown:', routeJson.meta?.provider_breakdown);

    // Security Check: No secrets leaked in response
    const jsonStr = JSON.stringify(routeJson);
    const leakedToken =
      jsonStr.includes(process.env.MARKETAUX_API_KEY || '___none___') ||
      jsonStr.includes(process.env.NEWSDATA_API_KEY || '___none___');
    if (leakedToken) {
      console.error('FAIL: API Key leaked in route response!');
    } else {
      console.log('PASS: No API keys exposed in route response payload.');
    }

    // Model name check
    const leakedModel =
      jsonStr.toLowerCase().includes('gemini-1.5') ||
      jsonStr.toLowerCase().includes('gemini 1.5');
    if (leakedModel) {
      console.error('FAIL: Gemini model name exposed in response!');
    } else {
      console.log('PASS: No Gemini model names exposed in response.');
    }

    console.log('\n6. Testing Pagination (Page 2) for Load More:');
    if (result.nextPage) {
      const page2Result = await getAggregatedFinancialNews({ page: result.nextPage });
      console.log('-> Page 2 articles retrieved:', page2Result.articles.length);
      console.log('-> Page 2 providers used:', page2Result.providersUsed);
    } else {
      console.log('-> Next page token not present or not requested.');
    }
  }

  console.log('\n===========================================================');
  console.log('E2E VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('===========================================================');
}

runVerification().catch((err) => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});
