import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const INVESTMENT_TYPES = ['equity', 'reit', 'invit', 'bond'] as const;
type InvestmentType = typeof INVESTMENT_TYPES[number];

const CURATED_EXPLANATIONS: Record<InvestmentType, string> = {
  equity: `Equities represent direct ownership shares in listed Indian enterprises such as Reliance or TCS. When the business grows profits, you benefit through stock price appreciation and direct cash dividend distributions. While equities historically provide the highest wealth-building potential over 5+ year horizons, they experience price volatility and market cycles, making diversification essential.`,

  reit: `Real Estate Investment Trusts (REITs) like Embassy Office Parks and Mindspace allow everyday retail investors to co-own Grade-A commercial office parks, malls, and tech parks with just a few hundred rupees. Under SEBI regulations, REITs must pay out at least 90% of their net distributable cash flows to unit-holders as regular quarterly dividends. This gives you commercial property rental yields without the burden of buying physical buildings or handling tenant maintenance.`,

  invit: `Infrastructure Investment Trusts (InvITs) like PowerGrid InvIT or Bharat Highways pool capital to invest in long-term, revenue-producing national infrastructure like power transmission lines, highways, and toll roads. Similar to REITs, they are mandated to distribute 90% of operating cash flows to investors, offering attractive dividend yields (typically 8–11%) backed by contracted government and institutional cash flows.`,

  bond: `Bonds and Government Securities (G-Secs) are debt instruments where you lend capital to corporations or the Government of India in exchange for predictable, periodic interest (coupon) payments and full principal return upon maturity. Unlike equities, sovereign bonds carry virtually zero default risk and offer fixed predictability, making them the defensive backbone of a conservative or balanced wealth portfolio.`,
};

const EXPLAIN_PROMPTS: Record<InvestmentType, string> = {
  equity: `Explain what equity (stock market) investing is to a first-time Indian retail investor.
Cover: what it means to own a share, how returns are generated (capital appreciation + dividends),
typical risk level, and 2 pros/cons. Keep it concise, clear, and encouraging. Max 4 sentences.`,

  reit: `Explain what a REIT (Real Estate Investment Trust) is to a first-time Indian retail investor.
Cover: what REITs are, how they work in India (Embassy REIT context without naming it), 
minimum investment, dividend income aspect, and how it differs from buying physical property.
Max 4 sentences. Plain language.`,

  invit: `Explain what an InvIT (Infrastructure Investment Trust) is to a first-time Indian retail investor.
Cover: what infrastructure assets they hold (roads, pipelines, power), how income is distributed,
typical yield, and why they offer stable cash flows compared to equities.
Max 4 sentences. Simple, encouraging tone.`,

  bond: `Explain what bonds are to a first-time Indian retail investor.
Cover: what a bond is (lending money to companies/government), coupon payments, principal return at maturity,
how they compare to Fixed Deposits, and credit risk. Include a brief mention of Government Securities.
Max 4 sentences. Plain language.`,
};

// POST /api/ai/explain — explain an investment type
export async function POST(request: Request) {
  const { type } = await request.json().catch(() => ({}));

  if (!INVESTMENT_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid investment type' }, { status: 400 });
  }

  const investmentType = type as InvestmentType;

  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(EXPLAIN_PROMPTS[investmentType]);
      const text = result.response.text();

      return NextResponse.json({ explanation: text, type: investmentType, source: 'gemini' });
    } catch (err) {
      console.warn('Gemini explain error, using curated explanation:', err);
    }
  }

  return NextResponse.json({
    explanation: CURATED_EXPLANATIONS[investmentType],
    type: investmentType,
    source: 'curated',
  });
}
