// ============================================================
// FINOVA — Innovation Three: Alternative Investment Explorer
// lib/data/alternativeInvestments.ts
//
// Structured educational content for Indian retail investors:
// - REITs (Real Estate Investment Trusts)
// - InvITs (Infrastructure Investment Trusts)
// - Bonds & Fixed Income (Corporate Bonds, G-Secs, SDLs)
// - Multi-dimensional Comparison Matrix
// - Educational Provenance & Primary Source References
// - Category-Specific Knowledge Checks & Guided Assessments
// ============================================================

export type AlternativeCategory = 'reit' | 'invit' | 'bond';

export interface EducationalCardContent {
  title: string;
  items: string[];
}

export interface EducationalSource {
  topic: string;
  sourceTitle: string;
  publisher: string;
  sourceUrl: string;
  lastReviewed: string;
  qualificationNote: string;
  jurisdiction: string;
}

export interface KnowledgeCheckQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AlternativeCategoryDetails {
  id: AlternativeCategory;
  name: string;
  shortName: string;
  tagline: string;
  iconName: string;
  sebiRegulations: string;
  whatItIs: string;
  howExposureWorks: string;
  distributionMechanism: string;
  liquidityConsiderations: string;
  interestRateSensitivity: string;
  whyNotGuaranteed: string;
  differencesSummary: string;
  howItWorks: EducationalCardContent;
  whereReturnsComeFrom: EducationalCardContent;
  whatCanGoWrong: EducationalCardContent;
  importantTerms: Array<{ term: string; definition: string }>;
  questionsToResearch: string[];
  commonMisconceptions: Array<{ myth: string; reality: string }>;
  illustrativeExample: {
    title: string;
    description: string;
    disclaimer: string;
  };
  sources: EducationalSource[];
  knowledgeCheck: KnowledgeCheckQuestion[];
}

export interface ComparisonRow {
  dimension: string;
  equity: string;
  reit: string;
  invit: string;
  bonds: string;
}

export const ALTERNATIVE_CATEGORIES: Record<AlternativeCategory, AlternativeCategoryDetails> = {
  reit: {
    id: 'reit',
    name: 'Real Estate Investment Trusts (REITs)',
    shortName: 'REITs',
    tagline: 'Exchange-traded exposure to institutional commercial real estate without property ownership',
    iconName: 'Building2',
    sebiRegulations: 'Regulated under SEBI (Real Estate Investment Trusts) Regulations, 2014 & Amendments',
    whatItIs:
      'A REIT is an investment trust that pools capital from retail and institutional investors to own, operate, or finance income-generating commercial real estate (such as Grade-A office tech parks, corporate campuses, and retail malls). In India, listed examples include Embassy Office Parks REIT, Mindspace Business Parks REIT, Brookfield India Real Estate Trust, and Nexus Select Trust.',
    howExposureWorks:
      'Rather than purchasing physical commercial property requiring tens of crores in capital, an investor buys publicly listed units of the REIT on the NSE or BSE. The REIT collects commercial rent from multinational and domestic enterprise tenants under long-term lease agreements (typically with a Weighted Average Lease Expiry of 5–8 years and contractual rent escalation clauses of 10–15% every 3 years).',
    distributionMechanism:
      'Under SEBI regulations, a REIT must distribute at least 90% of its Net Distributable Cash Flows (NDCF) to unitholders at least semi-annually (most Indian REITs distribute quarterly). Crucially, distributions are NOT solely dividends: they comprise dividends, interest income on SPV loans, and return of capital/debt repayment. Each component carries specific Indian income-tax implications under the Income-tax Act, 1961.',
    liquidityConsiderations:
      'REIT units trade on the secondary cash market of the NSE and BSE just like equity shares. Following SEBI circulars in July 2021, the minimum trading lot size was reduced from 200 units to just 1 unit (making entry possible for ₹300–₹400). While liquidity is vastly superior to physical property, daily trading volumes are lower than Nifty 50 large-cap stocks.',
    interestRateSensitivity:
      'High inverse sensitivity. When the Reserve Bank of India (RBI) raises benchmark repo rates, yields on risk-free 10-year Government Securities (G-Secs) increase. This narrows the spread between sovereign bond yields and REIT distribution yields, prompting secondary-market unit prices to adjust downward until their effective yields become competitive.',
    whyNotGuaranteed:
      'Distributions are strictly NOT guaranteed returns. If enterprise tenants downsize, default, or terminate leases early, or if property maintenance and debt financing costs escalate, cash distributions fall. Furthermore, REIT unit prices on the stock exchange fluctuate daily and can trade below your acquisition price.',
    differencesSummary:
      'Unlike InvITs, REITs own perpetual physical real estate assets whose underlying land value can appreciate over decades. Compared to equities, REITs mandate higher cash payouts but offer more moderate capital appreciation potential.',
    howItWorks: {
      title: 'How an Indian REIT Operates',
      items: [
        'Sponsors establish the trust and transfer operational commercial real estate into Special Purpose Vehicles (SPVs).',
        'An independent SEBI-registered trustee holds the assets on behalf of unitholders, and a professional investment manager manages property operations and tenant leasing.',
        'Tenants pay commercial lease rentals monthly into the SPVs.',
        'SPVs upstream cash to the REIT trust after meeting operational expenses, statutory taxes, and debt service obligations.',
        'The Trust distributes >= 90% of Net Distributable Cash Flows (NDCF) quarterly to unitholders on the declared record date.',
      ],
    },
    whereReturnsComeFrom: {
      title: 'Return Components for Investors',
      items: [
        'Quarterly Cash Distributions: Regular cash flow derived from collected tenant rentals and inter-corporate loan interest.',
        'Contractual Rent Escalations: Built-in 10–15% rental step-ups every 3 years across multi-year enterprise lease agreements.',
        'Capital Appreciation: Unit market price increases on NSE/BSE reflecting increases in property Net Asset Value (NAV).',
      ],
    },
    whatCanGoWrong: {
      title: 'Key Risks to Understand',
      items: [
        'Vacancy & Lease Expiry Risk: Large corporate tenants failing to renew leases upon expiry, leading to unrented office space.',
        'Interest Rate & Yield Spread Risk: Higher G-Sec yields in the economy putting downward pressure on REIT trading prices.',
        'Tenant Concentration Risk: Top 5 enterprise tenants accounting for a significant share of gross rental income.',
        'Refinancing & Leverage Risk: Rising borrowing costs when REIT debt matures and requires refinancing.',
      ],
    },
    importantTerms: [
      {
        term: 'NDCF (Net Distributable Cash Flows)',
        definition: 'Cash remaining after property operational expenses, taxes, and debt service; SEBI mandates >= 90% payout.',
      },
      {
        term: 'WALE (Weighted Average Lease Expiry)',
        definition: 'The average remaining duration of tenant leases, weighted by contracted rental area or income.',
      },
      {
        term: 'Cap Rate (Capitalisation Rate)',
        definition: 'The ratio of net operating income to the property market value; reflects asset-level yield.',
      },
      {
        term: 'NAV (Net Asset Value)',
        definition: 'The fair market value of all underlying properties minus liabilities, divided by total outstanding units.',
      },
      {
        term: 'Trading Lot Size',
        definition: 'The minimum number of units tradeable on the stock exchange; set by SEBI to 1 unit in July 2021.',
      },
    ],
    questionsToResearch: [
      'What is the current portfolio occupancy rate across the REIT’s operating properties?',
      'Who are the top 5 tenants, and what percentage of gross rental income do they contribute?',
      'What is the REIT’s Net Debt-to-Asset ratio (SEBI cap is 49% without unitholder special resolution)?',
      'What is the proportion of distribution paid as dividend versus interest versus return of capital for tax purposes?',
    ],
    commonMisconceptions: [
      {
        myth: 'REIT distributions are guaranteed fixed deposits with real estate backing.',
        reality: 'Distributions are variable and depend on tenant collections and borrowing costs. Capital can fluctuate daily on the exchange.',
      },
      {
        myth: 'Investing in a REIT gives you personal ownership title to a specific office floor.',
        reality: 'You own fractional units in a collective trust, not registered land titles to individual properties.',
      },
      {
        myth: 'All REIT distributions are 100% tax-free in India.',
        reality: 'Distributions are split into dividend, interest, and capital return. Each component is taxed according to the SPV tax regime under Indian tax law.',
      },
    ],
    illustrativeExample: {
      title: 'Hypothetical Educational Illustration',
      description:
        'An investor holds 1,000 units of a REIT bought at ₹300 per unit (₹3,00,000 invested). Over one fiscal year, the REIT distributes ₹21 per unit in quarterly installments. The distribution yield is (₹21 / ₹300) = 7.0%. If the market price falls to ₹285 due to an interest rate hike cycle, the market value of the units becomes ₹2,85,000, bringing net annual total return to +2.0%.',
      disclaimer: 'Purely hypothetical mathematical illustration for education. Not an indicator or guarantee of past or future yields.',
    },
    sources: [
      {
        topic: 'REIT Regulatory Framework',
        sourceTitle: 'SEBI (Real Estate Investment Trusts) Regulations, 2014 & Amendments',
        publisher: 'Securities and Exchange Board of India (SEBI)',
        sourceUrl: 'https://www.sebi.gov.in/legal/regulations/sep-2014/sebi-real-estate-investment-trusts-regulations-2014_28038.html',
        lastReviewed: 'October 2026',
        qualificationNote: 'Statutory regulatory framework governing REIT formation, 90% NDCF distribution mandate, and 49% leverage ceiling.',
        jurisdiction: 'India',
      },
      {
        topic: 'Trading Lot Size Rationalization',
        sourceTitle: 'SEBI Circular on Reduction in Minimum Trading Lot Size for REITs and InvITs to 1 Unit',
        publisher: 'SEBI Circular SEBI/HO/DDHS/DDHS_Div3/P/CIR/2021/600',
        sourceUrl: 'https://www.sebi.gov.in/legal/circulars/jul-2021/reduction-in-the-trading-lot-size-for-reits-and-invits_51458.html',
        lastReviewed: 'October 2026',
        qualificationNote: 'Standardized the secondary trading lot size to 1 unit on NSE and BSE.',
        jurisdiction: 'India',
      },
      {
        topic: 'Taxation of Trust Distributions',
        sourceTitle: 'Finance Act 2023 Provisions on Taxation of Distributions by Business Trusts (Section 56(2)(xii))',
        publisher: 'Ministry of Finance, Government of India',
        sourceUrl: 'https://incometaxindia.gov.in/',
        lastReviewed: 'October 2026',
        qualificationNote: 'Governs tax treatment of dividends, interest, and repayment of debt/capital distributions.',
        jurisdiction: 'India',
      },
    ],
    knowledgeCheck: [
      {
        id: 'reit-q1',
        question: 'Under SEBI regulations, what is the mandatory distribution requirement for an Indian REIT from its Net Distributable Cash Flows (NDCF)?',
        options: [
          'At least 50% distributed annually',
          'At least 90% distributed at least semi-annually (quarterly in practice)',
          '100% of gross tenant collections without deducting expenses',
          'Distributions are entirely optional at management discretion',
        ],
        correctIndex: 1,
        explanation: 'SEBI mandates that REITs distribute at least 90% of NDCF to unitholders at least semi-annually. In practice, listed Indian REITs declare distributions quarterly.',
      },
      {
        id: 'reit-q2',
        question: 'Are cash distributions from Indian REITs legally guaranteed returns?',
        options: [
          'Yes, they are guaranteed by SEBI and the Reserve Bank of India',
          'Yes, commercial tenant rent is contractually insured against default',
          'No, distributions depend on tenant collections, occupancy levels, and operational costs',
          'Yes, provided the REIT holds an AAA corporate credit rating',
        ],
        correctIndex: 2,
        explanation: 'Distributions are NOT guaranteed. If tenants vacate, demand concessions, or default, or if borrowing costs rise, distributions decrease. Exchange market prices also fluctuate daily.',
      },
      {
        id: 'reit-q3',
        question: 'What is the current minimum trading lot size for publicly listed REIT units on the NSE and BSE?',
        options: [
          '200 units (minimum ₹50,000)',
          '100 units (minimum ₹30,000)',
          '1 unit (typically ₹300–₹400 per unit)',
          '500 units (institutional only)',
        ],
        correctIndex: 2,
        explanation: 'SEBI rationalized the minimum trading lot size to 1 unit in July 2021, enabling retail investors to purchase single units on stock exchanges.',
      },
      {
        id: 'reit-q4',
        question: 'How do benchmark interest rate hikes by the Reserve Bank of India (RBI) typically affect REIT trading prices?',
        options: [
          'They always increase REIT prices because tenants pay higher rent',
          'They have zero impact on real estate valuations',
          'They narrow the yield spread vs safe G-Secs, typically exerting downward price pressure',
          'They convert all distributions into tax-free dividends',
        ],
        correctIndex: 2,
        explanation: 'Higher sovereign bond yields narrow the attractiveness of REIT distribution yields. Secondary market prices often fall so that distribution yields adjust upward to remain competitive.',
      },
    ],
  },

  invit: {
    id: 'invit',
    name: 'Infrastructure Investment Trusts (InvITs)',
    shortName: 'InvITs',
    tagline: 'Fractional participation in national infrastructure like toll highways, power grids, and transmission lines',
    iconName: 'Zap',
    sebiRegulations: 'Regulated under SEBI (Infrastructure Investment Trusts) Regulations, 2014 & Amendments',
    whatItIs:
      'An InvIT is an investment trust that owns, operates, and finances revenue-generating national infrastructure assets across toll expressways, power transmission grids, optical fiber networks, and renewable energy assets. In India, prominent examples include POWERGRID Infrastructure Investment Trust (PGInvIT) and IRB InvIT Fund.',
    howExposureWorks:
      'Infrastructure projects require massive long-term capital and long concession agreements granted by government authorities (such as NHAI for national highways or Central Transmission Utility for power grids). Publicly listed InvITs allow retail investors to participate in these steady cash flows with a minimum trading lot of 1 unit.',
    distributionMechanism:
      'Similar to REITs, SEBI mandates that InvITs distribute at least 90% of Net Distributable Cash Flows (NDCF) to unitholders at least semi-annually. Payouts commonly comprise SPV loan interest, dividends, and return of capital/amortization.',
    liquidityConsiderations:
      'Units are listed and traded on the NSE and BSE. However, retail trading volume is generally lower than blue-chip equities. Bid-ask spreads can be wider, and daily secondary liquidity is moderate to thin.',
    interestRateSensitivity:
      'High sensitivity. Infrastructure projects carry substantial long-term bank loans and debentures. Rising benchmark interest rates increase SPV debt servicing costs, reducing net cash flows available for unitholder distributions.',
    whyNotGuaranteed:
      'Returns are NOT guaranteed. Road traffic collections fluctuate with economic activity, monsoons, and competing routes. Crucially, for concession-based assets (such as BOT toll highways), the concession period has a finite end date (e.g. 15–25 years). At expiry, the asset reverts to the government authority at zero residual value.',
    differencesSummary:
      'Crucial structural difference from REITs: Many infrastructure assets have finite concession lifespans. Unlike perpetual freehold real estate land, which can appreciate over decades, a concession asset’s intrinsic economic value amortizes toward zero as its concession expiry approaches.',
    howItWorks: {
      title: 'How an Indian InvIT Operates',
      items: [
        'Infrastructure developers transfer completed, operational highway or transmission assets into Special Purpose Vehicles (SPVs).',
        'Assets generate toll collections from motorists or availability tariffs from state power distribution utilities.',
        'Project cash flows cover maintenance, lifecycle repaving, statutory taxes, and debt servicing.',
        'Net Distributable Cash Flows (NDCF) are upstreamed to the InvIT trust.',
        'The trustee distributes >= 90% of NDCF periodically to unitholders on the record date.',
      ],
    },
    whereReturnsComeFrom: {
      title: 'Return Components for Investors',
      items: [
        'Periodic Cash Distributions: Regular payouts derived from highway toll tariffs or power transmission availability fees.',
        'Tariff Escalations: Inflation-linked toll revisions or contractual tariff adjustments under long-term concession terms.',
        'Return of Capital Amortization: Cash returned to unitholders as concession assets amortize over their remaining contractual life.',
      ],
    },
    whatCanGoWrong: {
      title: 'Key Risks to Understand',
      items: [
        'Concession Expiry & Amortization: Asset value declining as remaining concession tenure decreases toward zero.',
        'Traffic Volume & Freight Risk: Toll collection shortfalls due to commercial freight slowdowns or alternative bypass routes.',
        'Offtaker Counterparty Risk: State electricity distribution companies (Discoms) delaying transmission tariff payments.',
        'Refinancing & Floating Debt Risk: Rising interest rates on leveraged project finance loans reducing net distributable cash.',
      ],
    },
    importantTerms: [
      {
        term: 'Concession Period',
        definition: 'Contractual duration granted by authorities (e.g. NHAI) to build, operate, and collect revenues from an asset before handing it back.',
      },
      {
        term: 'Availability-Based Tariff',
        definition: 'Fees paid for maintaining transmission grid availability (typically >=98%), carrying minimal volume/traffic risk.',
      },
      {
        term: 'BOT (Build-Operate-Transfer)',
        definition: 'Concession model where the trust operates the asset for a defined period before handing it back to the government at zero residual value.',
      },
      {
        term: 'NDCF',
        definition: 'Net Distributable Cash Flows generated by project SPVs; subject to mandatory 90% distribution to unitholders.',
      },
      {
        term: 'Trading Lot Size',
        definition: 'Standardized by SEBI to 1 unit on Indian stock exchanges in July 2021.',
      },
    ],
    questionsToResearch: [
      'Are the underlying assets toll-based (traffic volume risk) or availability-based (transmission tariff)?',
      'What is the weighted average remaining concession life across the asset portfolio?',
      'What is the credit rating of the InvIT’s senior debt (AAA vs lower)?',
      'How does the trust plan to replace expiring concession assets with new accretive project acquisitions?',
    ],
    commonMisconceptions: [
      {
        myth: 'An InvIT unit price will perpetually appreciate like blue-chip equities.',
        reality: 'If an InvIT holds BOT toll concessions without acquiring new assets, its underlying asset value decreases as the concession expiry nears.',
      },
      {
        myth: 'InvITs are completely conservative investments with guaranteed returns.',
        reality: 'InvITs carry project debt, counterparty delays, and traffic volume risks. Cash distributions and exchange trading prices can decline.',
      },
      {
        myth: 'InvITs are only accessible to institutional investors and require ₹10+ Lakhs.',
        reality: 'SEBI reduced the trading lot size to 1 unit in July 2021, making publicly listed InvITs accessible to all retail investors.',
      },
    ],
    illustrativeExample: {
      title: 'Hypothetical Educational Illustration',
      description:
        'An investor holds 1,000 units of a power transmission InvIT purchased at ₹100 per unit (₹1,00,000 invested). The InvIT distributes ₹9 per unit over the year (9.0% distribution yield), comprising ₹3 dividend, ₹4 interest, and ₹2 capital return. The capital return component reduces the unitholder’s acquisition cost basis for future capital gains calculations.',
      disclaimer: 'Purely hypothetical mathematical illustration for education. Not an indicator or guarantee of past or future yields.',
    },
    sources: [
      {
        topic: 'InvIT Regulatory Framework',
        sourceTitle: 'SEBI (Infrastructure Investment Trusts) Regulations, 2014 & Amendments',
        publisher: 'Securities and Exchange Board of India (SEBI)',
        sourceUrl: 'https://www.sebi.gov.in/legal/regulations/sep-2014/sebi-infrastructure-investment-trusts-regulations-2014_28037.html',
        lastReviewed: 'October 2026',
        qualificationNote: 'Statutory framework governing InvIT registration, asset eligibility, and 90% NDCF distribution rules.',
        jurisdiction: 'India',
      },
      {
        topic: 'Trading Lot Size Rationalization',
        sourceTitle: 'SEBI Circular on Reduction in Minimum Trading Lot Size for InvITs to 1 Unit',
        publisher: 'SEBI Circular SEBI/HO/DDHS/DDHS_Div3/P/CIR/2021/600',
        sourceUrl: 'https://www.sebi.gov.in/legal/circulars/jul-2021/reduction-in-the-trading-lot-size-for-reits-and-invits_51458.html',
        lastReviewed: 'October 2026',
        qualificationNote: 'Standardized secondary trading lot size to 1 unit on Indian stock exchanges.',
        jurisdiction: 'India',
      },
      {
        topic: 'National Monetisation Pipeline',
        sourceTitle: 'NITI Aayog National Monetisation Pipeline (NMP) Framework for InvITs',
        publisher: 'NITI Aayog & Ministry of Road Transport and Highways',
        sourceUrl: 'https://www.niti.gov.in/',
        lastReviewed: 'October 2026',
        qualificationNote: 'Policy framework for monetizing operational road and transmission infrastructure via InvIT structures.',
        jurisdiction: 'India',
      },
    ],
    knowledgeCheck: [
      {
        id: 'invit-q1',
        question: 'What is a critical structural difference between a commercial REIT and a concession-based InvIT?',
        options: [
          'REITs pay interest while InvITs only pay capital gains',
          'InvITs have no SEBI regulations or reporting standards',
          'Concession assets (like BOT toll roads) have finite lifespans and amortize toward zero at expiry',
          'InvITs are legally prohibited from paying quarterly distributions',
        ],
        correctIndex: 2,
        explanation: 'Unlike freehold real estate which can appreciate perpetually, BOT concessions expire after a defined term (e.g. 15–25 years) and revert to authorities at zero terminal value.',
      },
      {
        id: 'invit-q2',
        question: 'Why does an InvIT distribution frequently include a "Return of Capital" component?',
        options: [
          'Because the trust is going bankrupt',
          'To return principal as the underlying concession asset amortizes over its finite remaining life',
          'To avoid reporting taxes to the Indian Income Tax Department',
          'Because the law forbids InvITs from earning interest',
        ],
        correctIndex: 1,
        explanation: 'Because concession lifespans run down, a portion of cash returned represents capital return/amortization, which reduces the investor’s tax cost basis.',
      },
      {
        id: 'invit-q3',
        question: 'Which of the following describes the difference between availability-based and toll-based infrastructure assets?',
        options: [
          'Toll roads have zero revenue risk while power lines depend on traffic',
          'Availability-based assets earn tariffs for maintaining readiness (low traffic risk); toll roads depend on vehicle volumes',
          'Availability assets cannot be held inside an InvIT structure',
          'Toll roads are completely immune to economic slowdowns',
        ],
        correctIndex: 1,
        explanation: 'Power transmission lines receive availability payments for maintaining grid uptime regardless of power flow, whereas highway concessions carry freight and passenger traffic volume risk.',
      },
      {
        id: 'invit-q4',
        question: 'Are InvITs inherently risk-free investments suitable for conservative retail investors seeking guaranteed returns?',
        options: [
          'Yes, the Government of India guarantees all InvIT returns',
          'Yes, they are backed by sovereign insurance',
          'No, they carry project debt, concession amortization, traffic volatility, and floating interest rate risks',
          'Yes, provided the highway is part of the National Highway network',
        ],
        correctIndex: 2,
        explanation: 'InvITs carry project finance leverage, traffic volume risk, concession expiry, and counterparty delays. Returns and market prices are not guaranteed.',
      },
    ],
  },

  bond: {
    id: 'bond',
    name: 'Bonds & Fixed Income Securities',
    shortName: 'Bonds',
    tagline: 'Contractual debt instruments providing defined coupon income, credit risk, and maturity redemption',
    iconName: 'Link2',
    sebiRegulations: 'Regulated under SEBI (Issue and Listing of Non-Convertible Securities) Regulations, 2021 & RBI Guidelines',
    whatItIs:
      'A bond is a debt security where an investor lends capital to an issuer (Central Government, State Government, or Corporation) for a defined period at a predetermined coupon interest rate. Indian debt instruments include Central Government Securities (G-Secs), State Development Loans (SDLs), Treasury Bills, Public Sector Undertaking (PSU) Bonds, and Corporate Non-Convertible Debentures (NCDs).',
    howExposureWorks:
      'Unlike equities (which represent fractional business ownership) or REITs/InvITs (which distribute trust surplus), a bond is a contractual loan obligation. The issuer is legally bound to pay periodic coupon interest (annually, semi-annually, or monthly) and repay the principal face value at maturity.',
    distributionMechanism:
      'Coupon payments are contractually fixed as a percentage of the bond’s face value (par value, typically ₹1,000 or ₹1,00,000 in India). For instance, a bond with a ₹1,000 face value and an 8.0% annual coupon pays exactly ₹80 per year until maturity, regardless of whether secondary market prices rise or fall.',
    liquidityConsiderations:
      'While bonds are listed on the debt segments of the NSE and BSE, secondary market trading volumes for retail-sized lots of corporate bonds in India can be thin. Retail investors frequently hold bonds until maturity or access liquid debt via Target Maturity Mutual Funds or the RBI Retail Direct platform.',
    interestRateSensitivity:
      'Direct inverse relationship (Duration Risk). When benchmark interest rates in the economy rise, newly issued bonds offer higher coupons. Consequently, existing bonds paying lower coupons drop in secondary market price so that their effective yield matches prevailing market rates. The longer the maturity tenure, the steeper the price decline.',
    whyNotGuaranteed:
      'Bonds are NOT completely risk-free. While Central Government G-Secs carry sovereign backing with virtually zero credit default risk, corporate bonds carry credit default risk. If a corporate issuer suffers insolvency or debt distress, interest payments can be delayed or principal can be lost. Furthermore, selling a G-Sec before maturity during rate hike cycles can result in capital losses.',
    differencesSummary:
      'Bonds have legal priority over equity and REIT/InvIT unitholders in the capital structure during corporate liquidation. However, bond returns are capped at the contracted coupon and do not participate in enterprise profit growth or inflation.',
    howItWorks: {
      title: 'How Bonds Work in India',
      items: [
        'Issuer floats a debt issue specifying Face Value (e.g. ₹1,000), Coupon Rate (e.g. 7.5%), and Maturity Date.',
        'SEBI-registered Credit Rating Agencies (CRISIL, ICRA, CARE, India Ratings) assign a credit rating (AAA down to D).',
        'Investors subscribe during the public issue or purchase on secondary exchange debt segments or RBI Retail Direct.',
        'Issuer deposits periodic coupon interest directly into the investor’s bank account on scheduled coupon dates.',
        'On the maturity date, the issuer redeems the bond by returning the full nominal face value to the investor.',
      ],
    },
    whereReturnsComeFrom: {
      title: 'Return Components for Investors',
      items: [
        'Contractual Coupon Interest: Predetermined regular cash interest payments calculated on face value.',
        'Yield to Maturity (YTM): Total anticipated annualized return if purchased at current price and held until maturity.',
        'Capital Gains: Selling the bond above acquisition price on the secondary exchange when market interest rates fall.',
      ],
    },
    whatCanGoWrong: {
      title: 'Key Risks to Understand',
      items: [
        'Credit / Default Risk: The issuing corporation failing to pay coupon interest or redeem principal due to insolvency.',
        'Interest Rate (Duration) Risk: Market prices of long-tenure bonds falling during RBI interest rate hike cycles.',
        'Liquidity Risk: Inability to sell a corporate bond on the exchange before maturity without accepting a steep price haircut.',
        'Inflation Risk: Fixed coupon returns failing to keep pace with retail inflation, eroding real purchasing power.',
      ],
    },
    importantTerms: [
      {
        term: 'Coupon Rate vs Current Yield',
        definition: 'Coupon is the fixed contract percentage on face value; Current Yield is the annual coupon divided by the market purchase price.',
      },
      {
        term: 'Face Value (Par Value)',
        definition: 'The nominal capital amount borrowed per bond (typically ₹1,000 or ₹1,00,000 in India) returned at maturity.',
      },
      {
        term: 'YTM (Yield to Maturity)',
        definition: 'The annualized rate of return anticipated on a bond if held until maturity, factoring in purchase price, coupon frequency, and par redemption.',
      },
      {
        term: 'Credit Rating (AAA to D)',
        definition: 'Independent assessment of default probability. AAA represents highest safety; D indicates default.',
      },
      {
        term: 'Duration',
        definition: 'A measure of bond price sensitivity to a 1% change in prevailing interest rates; longer tenure means higher duration risk.',
      },
    ],
    questionsToResearch: [
      'What is the credit rating of the bond, and has the rating agency placed it on negative outlook or watch?',
      'Is the bond secured by specific corporate asset charges (Secured NCD) or unsecured subordinated debt?',
      'What is the Yield to Maturity (YTM) compared to a risk-free Government Security (G-Sec) of identical tenure?',
      'Is there an embedded Call Option allowing the issuer to prematurely redeem the bond if market rates fall?',
    ],
    commonMisconceptions: [
      {
        myth: 'All bonds are completely guaranteed and carry zero risk.',
        reality: 'Only Central Government G-Secs carry sovereign safety. Corporate bonds carry credit default risk that increases with lower credit ratings.',
      },
      {
        myth: 'Government Securities (G-Secs) have zero price volatility.',
        reality: 'While G-Secs have zero credit default risk, their market trading prices fluctuate significantly with RBI interest rate cycles.',
      },
      {
        myth: 'Coupon Rate and Current Yield are the exact same number.',
        reality: 'They are only equal when bought at par. If bought at a discount, current yield is higher; if bought at a premium, current yield is lower.',
      },
    ],
    illustrativeExample: {
      title: 'Hypothetical Educational Illustration',
      description:
        'An investor buys an AAA-rated corporate bond with a ₹1,00,000 face value, a 5-year tenure, and an 8.0% annual coupon. Each year, the investor receives ₹8,000 in coupon interest. At the end of Year 5, the issuer repays the ₹1,00,000 principal. If the investor needed to sell after Year 2 during a sharp RBI interest rate hike cycle, the bond might only fetch ₹96,000 on the secondary market.',
      disclaimer: 'Purely hypothetical mathematical illustration for education. Not an indicator or guarantee of past or future yields.',
    },
    sources: [
      {
        topic: 'Non-Convertible Securities Regulation',
        sourceTitle: 'SEBI (Issue and Listing of Non-Convertible Securities) Regulations, 2021',
        publisher: 'Securities and Exchange Board of India (SEBI)',
        sourceUrl: 'https://www.sebi.gov.in/legal/regulations/aug-2021/sebi-issue-and-listing-of-non-convertible-securities-regulations-2021_51745.html',
        lastReviewed: 'October 2026',
        qualificationNote: 'Statutory regulation governing corporate debenture issuance, credit rating mandates, and debenture trustee obligations.',
        jurisdiction: 'India',
      },
      {
        topic: 'Government Securities Framework',
        sourceTitle: 'Reserve Bank of India Master Direction on Government Securities and RBI Retail Direct',
        publisher: 'Reserve Bank of India (RBI)',
        sourceUrl: 'https://rbiretaildirect.org.in/',
        lastReviewed: 'October 2026',
        qualificationNote: 'Regulatory guidelines for retail participation in G-Secs, State Development Loans (SDLs), and Treasury Bills.',
        jurisdiction: 'India',
      },
      {
        topic: 'Secondary Exchange Debt Segment',
        sourceTitle: 'NSE India Corporate Debt Market Overview and Reporting Guidelines',
        publisher: 'National Stock Exchange of India (NSE)',
        sourceUrl: 'https://www.nseindia.com/market-data/debt-market',
        lastReviewed: 'October 2026',
        qualificationNote: 'Governs order-matching debt segments and secondary market settlement conventions.',
        jurisdiction: 'India',
      },
    ],
    knowledgeCheck: [
      {
        id: 'bond-q1',
        question: 'What is the mathematical difference between a bond’s Coupon Rate and its Current Yield?',
        options: [
          'They are always identical in every market situation',
          'Coupon is fixed on nominal Face Value; Current Yield is annual coupon divided by the market purchase price',
          'Current Yield includes corporate dividends while coupon does not',
          'Coupon rate changes daily on the stock exchange while Current Yield is frozen',
        ],
        correctIndex: 1,
        explanation: 'Coupon rate is contractually fixed on par value (e.g., 8% on ₹1,000 = ₹80). If you purchase the bond at a discount (e.g. ₹950), Current Yield is ₹80 / ₹950 = 8.42%.',
      },
      {
        id: 'bond-q2',
        question: 'If the Reserve Bank of India (RBI) initiates a cycle of interest rate hikes, what typically happens to existing fixed-rate bond prices on secondary exchanges?',
        options: [
          'Existing bond prices increase sharply',
          'Existing bond prices fall so that their effective yield matches the newly issued higher-rate bonds',
          'Bond prices remain completely static regardless of interest rates',
          'The issuer immediately doubles the contracted coupon payment',
        ],
        correctIndex: 1,
        explanation: 'This is Duration Risk. When interest rates rise, existing bonds paying lower coupon rates drop in market trading price until their yields align with newly issued debt.',
      },
      {
        id: 'bond-q3',
        question: 'Which of the following Indian debt instruments carries sovereign safety with zero credit default risk?',
        options: [
          'Subordinated NBFC debentures',
          'Central Government Securities (G-Secs) and Treasury Bills',
          'High-yield unsecured corporate debt',
          'AA-rated manufacturing bonds',
        ],
        correctIndex: 1,
        explanation: 'Central Government Securities are backed by sovereign guarantee and carry virtually zero credit default risk. All corporate bonds carry credit default risk.',
      },
      {
        id: 'bond-q4',
        question: 'Does an AAA credit rating from a SEBI-registered rating agency guarantee that a bond investor will never face losses?',
        options: [
          'Yes, AAA bonds are legally insured by the government against price drops',
          'Yes, rating agencies refund losses if a company defaults',
          'No, ratings evaluate relative default risk; bonds remain exposed to duration price risk, inflation, and potential future downgrades',
          'Yes, AAA bonds cannot be sold before maturity',
        ],
        correctIndex: 2,
        explanation: 'Credit ratings reflect creditworthiness at a point in time, not market price fluctuations. Even an AAA bond will lose trading market value if interest rates rise.',
      },
    ],
  },
};

export const COMPARISON_MATRIX: ComparisonRow[] = [
  {
    dimension: 'Nature of Underlying Asset',
    equity: 'Direct equity shares representing residual ownership in operating corporations (governed by SEBI LODR & Companies Act 2013)',
    reit: 'Grade-A commercial real estate (offices, tech parks, shopping malls) held via SPVs in a trust structure (SEBI REIT Regulations 2014)',
    invit: 'Revenue-generating national infrastructure (toll expressways, power grids) held via SPVs under concession contracts (SEBI InvIT Regulations 2014)',
    bonds: 'Contractual creditor debt claim on Government or Corporate issuers with specified seniority (SEBI NCS Regulations 2021 / RBI)',
  },
  {
    dimension: 'Mechanism for Generating Income',
    equity: 'Corporate net profits distributed at board discretion as dividends; zero mandatory payout requirement',
    reit: 'Mandatory >=90% payout of Net Distributable Cash Flow (NDCF) from commercial rental contracts and lease escalations',
    invit: 'Mandatory >=90% payout of Net Distributable Cash Flow (NDCF) from toll collections, transmission tariffs, and annuity fees',
    bonds: 'Contractually fixed coupon interest paid on nominal face value at regular intervals (semi-annual / annual)',
  },
  {
    dimension: 'Main Return Components',
    equity: 'Capital price appreciation + periodic dividends',
    reit: 'Quarterly cash distributions (dividends, interest, return of capital) + long-term unit price appreciation',
    invit: 'Periodic cash distributions (tariffs, interest) + return of capital / concession debt repayment amortization',
    bonds: 'Fixed regular coupon payments + face value principal repayment at maturity (or market gain if sold early)',
  },
  {
    dimension: 'Sensitivity to Interest Rates',
    equity: 'Indirect (influences corporate cost of borrowing and equity valuation multiples)',
    reit: 'High (yield spread vs 10-year G-Sec directly influences secondary market unit price)',
    invit: 'High (large long-term project debt servicing costs impact net distributable cash flows)',
    bonds: 'Direct inverse relationship (bond market prices fall when benchmark interest rates rise due to duration risk)',
  },
  {
    dimension: 'Is Income Guaranteed?',
    equity: 'NO. Corporate dividends are completely discretionary.',
    reit: 'NO. Cash flows fluctuate with tenant occupancies, lease renewals, and SPV operational expenses.',
    invit: 'NO. Distributions vary with traffic volumes, monsoon disruptions, maintenance costs, and concession expiry.',
    bonds: 'NO. Contractually promised, but exposed to issuer credit default risk (except sovereign Central G-Secs).',
  },
  {
    dimension: 'Secondary Market Liquidity',
    equity: 'Very High on NSE / BSE (1 share lot size, high daily turnover)',
    reit: 'Moderate on NSE / BSE (standardized 1 unit lot size under SEBI July 2021 circular; ₹300–₹400/unit)',
    invit: 'Moderate to Low on NSE / BSE (standardized 1 unit lot size under SEBI circular; trading volume varies by trust)',
    bonds: 'Low to Moderate for retail lots on exchange debt segments; higher in liquid Central G-Secs via RBI Retail Direct',
  },
  {
    dimension: 'Primary Investment Risks',
    equity: 'Business competition, macroeconomic recessions, equity market volatility',
    reit: 'Tenant lease non-renewal, IT sector desk down-sizing, rising borrowing costs, real estate supply overhang',
    invit: 'Finite concession lifespan expiry (BOT assets amortize to zero value at concession end), traffic shortfalls, debt refinancing',
    bonds: 'Issuer credit default/downgrade, duration price erosion if rates rise, inflation purchasing power risk',
  },
  {
    dimension: 'Key Research Checklist',
    equity: 'P/E multiple, revenue trajectory, ROCE, debt-to-equity, governance pedigree (SEBI LODR disclosures)',
    reit: 'Occupancy rate (e.g. >85%), WALE (>5 yrs), tenant credit profile, NDCF distribution mix, debt-to-GAV (SEBI <49% cap)',
    invit: 'Remaining concession lifespan (years to expiry), availability tariff factor, loan credit rating (AAA/AA), sponsor track record',
    bonds: 'Credit rating (AAA vs AA vs lower), security backing (Secured vs Unsecured), Yield to Maturity (YTM), cash flow debt service coverage',
  },
];
