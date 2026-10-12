// scripts/test-gdelt-fetch.mjs
import { fetchGdeltNews } from '../lib/news/providers/gdeltProvider.ts';

async function test() {
  console.log('Testing GDELT 2.0 Doc API directly...');
  const res = await fetchGdeltNews({ forceRefresh: true, limit: 10 });
  console.log('GDELT Provider Status:', res.providerStatus);
  console.log('GDELT Total Articles:', res.articles.length);
  if (res.articles.length > 0) {
    console.log('First article title:', res.articles[0].title);
    console.log('First article source:', res.articles[0].source_name);
    console.log('First article URL:', res.articles[0].link);
    console.log('First article image:', res.articles[0].image_url ? 'Has image' : 'No image');
  } else {
    console.log('Message / reason:', res.message);
  }
}

test().catch(console.error);
