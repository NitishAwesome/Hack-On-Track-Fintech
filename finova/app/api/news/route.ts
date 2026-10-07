import { NextResponse } from 'next/server';

const CURATED_NEWS = [
  {
    article_id: 'news-1',
    title: 'SEBI Streamlines REIT & InvIT Minimum Investment Sizes to Boost Retail Participation',
    link: 'https://www.moneycontrol.com',
    description: 'Capital markets regulator SEBI has enacted progressive guidelines easing trading lot requirements, making listed Real Estate & Infrastructure Investment Trusts more accessible to retail portfolios.',
    source_name: 'Economic Times',
    pubDate: new Date(Date.now() - 3600000 * 2).toISOString(),
    image_url: null,
    keywords: ['SEBI', 'REIT', 'InvIT', 'Regulations'],
  },
  {
    article_id: 'news-2',
    title: 'RBI Keeps Repo Rate Steady: Bond Yields Consolidate Around 7.05% Benchmark',
    link: 'https://www.livemint.com',
    description: 'The Monetary Policy Committee voted to maintain policy repo rates, signaling macroeconomic stability as institutional and retail investors lock in attractive yields on Government Securities.',
    source_name: 'LiveMint',
    pubDate: new Date(Date.now() - 3600000 * 5).toISOString(),
    image_url: null,
    keywords: ['RBI', 'Bonds', 'G-Sec', 'Monetary Policy'],
  },
  {
    article_id: 'news-3',
    title: 'Indian IT & Conglomerate Earnings Show Steady Cash Flow Resilience',
    link: 'https://www.business-standard.com',
    description: 'Leading index heavyweights including Reliance Industries and TCS reported healthy quarterly margin performance driven by domestic demand and digital transformation initiatives.',
    source_name: 'Business Standard',
    pubDate: new Date(Date.now() - 3600000 * 12).toISOString(),
    image_url: null,
    keywords: ['Earnings', 'Nifty 50', 'Reliance', 'TCS'],
  },
  {
    article_id: 'news-4',
    title: 'Sovereign Gold Bonds Continue Outperforming Physical Gold with 2.5% Annual Interest',
    link: 'https://www.financialexpress.com',
    description: 'Investors in RBI Sovereign Gold Bond tranches benefit from purity assurance, exemption from capital gains tax upon redemption, and bi-annual sovereign interest credits.',
    source_name: 'Financial Express',
    pubDate: new Date(Date.now() - 3600000 * 24).toISOString(),
    image_url: null,
    keywords: ['SGB', 'Gold', 'RBI', 'Tax Free'],
  },
];

// GET /api/news?symbols=RELIANCE,INFY
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '';

  if (process.env.NEWSDATA_API_KEY && !process.env.NEWSDATA_API_KEY.includes('your_')) {
    try {
      const query = symbolsParam
        ? `(${symbolsParam.split(',').slice(0, 3).join(' OR ')}) India stock`
        : 'India stock market investment';

      const url = new URL('https://newsdata.io/api/1/news');
      url.searchParams.set('apikey', process.env.NEWSDATA_API_KEY);
      url.searchParams.set('q', query);
      url.searchParams.set('country', 'in');
      url.searchParams.set('language', 'en');
      url.searchParams.set('category', 'business');
      url.searchParams.set('size', '10');

      const res = await fetch(url.toString(), {
        next: { revalidate: 1800 },
      });

      if (res.ok) {
        const json = await res.json();
        const articles = (json.results || []).map((a: Record<string, unknown>) => ({
          article_id: a.article_id,
          title: a.title,
          link: a.link,
          description: a.description,
          source_name: a.source_name,
          pubDate: a.pubDate,
          image_url: a.image_url || null,
          keywords: a.keywords || [],
        }));

        if (articles.length > 0) {
          return NextResponse.json({ articles });
        }
      }
    } catch (err) {
      console.warn('NewsData fetch error, serving curated feed:', err);
    }
  }

  return NextResponse.json({ articles: CURATED_NEWS, isCurated: true });
}
