// scripts/test-live-news-api.mjs
async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/news');
    const data = await res.json();
    console.log('API Response Status:', res.status);
    console.log('Success:', data.success);
    console.log('Total articles returned:', data.data?.length);
    console.log('Meta:', JSON.stringify(data.meta, null, 2));

    if (data.data && data.data.length > 0) {
      console.log('\n--- Sample 6 Articles ---');
      data.data.slice(0, 6).forEach((a, i) => {
        console.log(`[${i+1}] [Provider: ${a.source_provider}] Source: "${a.source_name}"`);
        console.log(`    Title: ${a.title}`);
        console.log(`    Image: ${a.image_url ? a.image_url.slice(0, 60) + '...' : 'None'}`);
        console.log(`    Symbols: ${JSON.stringify(a.symbols || [])}`);
        console.log(`    Relevance: ${a.relevance_category} (Score: ${a.relevance_score})`);
      });

      const providers = new Set(data.data.map(a => a.source_provider));
      console.log('\nAll providers in aggregated response:', Array.from(providers));

      const publishers = new Set(data.data.map(a => a.source_name));
      console.log('All publishers shown in response:', Array.from(publishers));

      // Security checks
      const jsonStr = JSON.stringify(data);
      const leakedKey = jsonStr.includes('8tMii10t20SwsdDgagTPIatGQXSXzSipSzGjN6fk') || 
                        jsonStr.includes('pub_');
      console.log('\nSecurity Check - API Key in payload:', leakedKey ? 'FAIL: KEY FOUND' : 'PASS: No API keys exposed');

      const leakedModel = jsonStr.includes('gemini-1.5') || jsonStr.includes('Gemini 1.5');
      console.log('Security Check - Internal model name in payload:', leakedModel ? 'FAIL: MODEL FOUND' : 'PASS: No model name exposed');

      // Test page 2 (load more)
      const resPage2 = await fetch('http://localhost:3000/api/news?page=2');
      const dataPage2 = await resPage2.json();
      console.log('\nPagination Check - Page 2 count:', dataPage2.data?.length, 'Success:', dataPage2.success);
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

main();
