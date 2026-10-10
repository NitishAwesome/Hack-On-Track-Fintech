// ============================================================
// FINOVA — Innovation Three: Alternative Investment Explorer
// lib/data/alternativeInvestments.ts
//
// Structured educational content for Indian retail investors:
// - REITs (Real Estate Investment Trusts)
// - InvITs (Infrastructure Investment Trusts)
// - Bonds & Fixed Income (Corporate Bonds, G-Secs, SDLs)
// - Multi-dimensional Comparison Matrix
// - Educational Cards & Common Misconceptions
// ============================================================

export type AlternativeCategory = 'reit' | 'invit' | 'bond';

export interface EducationalCardContent {
  title: string;
  items: string[];
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
    sebiRegulations: 'Regulated under SEBI (Real Estate Investment Trusts) Regulations, 2014',
    whatItIs:
      'A REIT is an investment vehicle that pools capital from retail and institutional investors to own, operate, or finance income-generating commercial real estate assets (such as Grade-A office parks, tech hubs, and shopping malls). In India, prominent examples include Embassy Office Parks REIT, Mindspace Business Parks REIT, Brookfield India Real Estate Trust, and Nexus Select Trust.',
    howExposureWorks:
      'Rather than buying physical commercial properties requiring tens of crores in capital, an investor buys listed units of the REIT on the NSE or BSE. The REIT collects commercial rent from multinational tenants and IT companies under long-term lease agreements (typically with Weighted Average Lease Expiry of 5–8 years and built-in contractual rent escalation clauses).',
    distributionMechanism:
      'Under SEBI regulations, a REIT is legally mandated to distribute at least 90% of its Net Distributable Cash Flows (NDCF) to unitholders at least semi-annually (most Indian REITs distribute quarterly). These distributions are typically composed of a combination of dividends, interest income, and return of debt/capital, each carrying specific Indian income tax treatments.',
    liquidityConsiderations:
      'REIT units trade on the secondary market of Indian stock exchanges (NSE and BSE) just like shares, with a minimum lot size of 1 unit. While liquidity is vastly superior to illiquid physical commercial property, daily trading volumes are significantly lower than Nifty 50 blue-chip equities.',
    interestRateSensitivity:
      'High inverse sensitivity. When the Reserve Bank of India (RBI) raises benchmark repo rates, yields on safe fixed-income instruments like 10-year Government Securities (G-Secs) rise. This narrows the spread between bond yields and REIT distribution yields, often exerting downward pricing pressure on REIT market units.',
    whyNotGuaranteed:
      'Distributions are NOT guaranteed returns. If commercial tenants downsize, default on leases, or demand rental concessions during an economic downturn, or if property maintenance and debt financing costs escalate, cash distributions will decrease. Moreover, the unit market price on the exchange can trade below your acquisition cost.',
    differencesSummary:
      'Compared to InvITs, REITs own perpetual physical real estate assets whose land values can appreciate over decades. Compared to stocks, REITs feature higher mandatory cash payouts but slower capital appreciation.',
    howItWorks: {
      title: 'How a REIT Operates in India',
      items: [
        'Sponsors establish the trust and transfer operational commercial real estate assets into Special Purpose Vehicles (SPVs).',
        'An independent trustee holds the assets on behalf of unitholders, and a professional investment manager manages leasing.',
        'Tenants pay commercial lease rentals monthly into the SPVs.',
        'SPVs upstream cash to the REIT trust after meeting operational expenses and debt service.',
        'Trust distributes >= 90% of net cash flow quarterly to unitholders on the record date.',
      ],
    },
    whereReturnsComeFrom: {
      title: 'Return Components for Investors',
      items: [
        'Quarterly Cash Distributions: Regular payouts from collected tenant rentals and loan interest.',
        'Contractual Rent Escalations: Typical 10–15% rent increases every 3 years built into commercial leases.',
        'Capital Appreciation: Market price increases of REIT units reflecting increases in Net Asset Value (NAV) of underlying properties.',
      ],
    },
    whatCanGoWrong: {
      title: 'Key Risks to Understand',
      items: [
        'Vacancy & Lease Expiry Risk: Large corporate tenants failing to renew leases upon expiry, leading to vacant office floors.',
        'Interest Rate Risk: Higher bond yields in the economy making REIT yields less competitive.',
        'Refinancing & Leverage Risk: REIT debt becoming more expensive to refinance when loans mature.',
        'Work-from-Home Headwinds: Structural changes in corporate office desk requirements impacting office demand.',
      ],
    },
    importantTerms: [
      {
        term: 'NDCF (Net Distributable Cash Flows)',
        definition: 'Cash remaining after operational expenses, taxes, and debt repayments; SEBI mandates >= 90% payout.',
      },
      {
        term: 'WALE (Weighted Average Lease Expiry)',
        definition: 'The average remaining duration of tenant leases, weighted by contracted rental area or income.',
      },
      {
        term: 'Cap Rate (Capitalisation Rate)',
        definition: 'The ratio of net operating income to the property market value; indicates property yields.',
      },
      {
        term: 'NAV (Net Asset Value)',
        definition: 'The fair market value of all underlying properties minus liabilities, divided by total outstanding units.',
      },
    ],
    questionsToResearch: [
      'What is the current portfolio occupancy rate across the REIT’s properties?',
      'Who are the top 5 tenants, and what percentage of total gross rental income do they represent?',
      'What is the REIT’s debt-to-asset ratio (SEBI cap is 49% without unitholder approval)?',
      'What proportion of the distribution is paid as dividend versus interest or return of capital for tax purposes?',
    ],
    commonMisconceptions: [
      {
        myth: 'REIT distributions are guaranteed fixed deposits with real estate backing.',
        reality: 'Distributions are variable and depend directly on actual tenant collections and interest costs. Capital can fluctuate daily on the stock exchange.',
      },
      {
        myth: 'Investing in a REIT gives you personal title to an office flat or floor.',
        reality: 'You own fractional units in a collective trust, not personal title to specific rooms or physical floors.',
      },
      {
        myth: 'All REIT distributions are completely tax-free in India.',
        reality: 'Distributions are broken into dividend, interest, and repayment components, each subject to specific tax rules based on SPV tax regimes.',
      },
    ],
    illustrativeExample: {
      title: 'Hypothetical Educational Illustration',
      description:
        'An investor holds 1,000 units of a REIT bought at ₹300 per unit (₹3,00,000 invested). Over one fiscal year, the REIT distributes ₹21 per unit in quarterly installments. The distribution yield is (₹21 / ₹300) = 7.0%. However, if the market price falls to ₹285 due to rising interest rates, the unrealized unit value becomes ₹2,85,000, bringing net annual total return to +2.0%.',
      disclaimer: 'Purely hypothetical mathematical illustration for education. Not an indicator or guarantee of past or future yields.',
    },
  },

  invit: {
    id: 'invit',
    name: 'Infrastructure Investment Trusts (InvITs)',
    shortName: 'InvITs',
    tagline: 'Fractional participation in national infrastructure like toll highways, power grids, and transmission lines',
    iconName: 'Zap',
    sebiRegulations: 'Regulated under SEBI (Infrastructure Investment Trusts) Regulations, 2014',
    whatItIs:
      'An InvIT is a trust that owns and manages revenue-generating infrastructure assets across roads, toll highways, power transmission lines, optical fiber cables, and renewable energy assets. In India, examples include POWERGRID Infrastructure Investment Trust (PGInvIT) and IRB InvIT Fund.',
    howExposureWorks:
      'Infrastructure projects require enormous long-term capital and extensive concession agreements granted by government bodies (such as NHAI for highways or CTU for power transmission). Publicly listed InvITs allow retail investors to participate in the steady cash flows generated by these concession assets with a minimum trading lot of 1 unit.',
    distributionMechanism:
      'Similar to REITs, SEBI mandates that InvITs distribute at least 90% of Net Distributable Cash Flows (NDCF) to unitholders at least semi-annually. Payouts commonly comprise interest from SPVs, dividends, and amortization/return of capital.',
    liquidityConsiderations:
      'Units are listed and traded on NSE and BSE. However, retail investor participation in InvITs is generally lower than equities, meaning bid-ask spreads can be wider and daily liquidity can be moderate to thin.',
    interestRateSensitivity:
      'Moderate to high sensitivity. Because infrastructure projects carry significant long-term bank loans and debentures, rising interest rates increase debt servicing costs and reduce the net cash available for distribution.',
    whyNotGuaranteed:
      'Returns are NOT guaranteed. Road traffic toll collections fluctuate with economic activity, monsoons, and alternative highway routes. For concession-based assets, the concession period has a finite end date (e.g. 20–30 years), meaning the asset will eventually revert to the government at zero residual value.',
    differencesSummary:
      'Crucial difference from REITs: Many infrastructure assets have finite concession lifespans (e.g., BOT toll roads that expire after 20 years). Unlike freehold land, which often appreciates perpetually, a concession asset’s intrinsic economic value amortizes toward zero as its concession expiry approaches.',
    howItWorks: {
      title: 'How an InvIT Operates in India',
      items: [
        'Infrastructure developers transfer completed, operational toll roads or power lines to the InvIT.',
        'Assets generate toll collections from vehicles or transmission tariffs from power distribution companies.',
        'Cash flows are used to maintain roads/grids and service project loans.',
        'Surplus cash flows (NDCF) are upstreamed to the trust.',
        'The trustee distributes >= 90% of NDCF to unitholders periodically.',
      ],
    },
    whereReturnsComeFrom: {
      title: 'Return Components for Investors',
      items: [
        'Periodic Cash Distributions: Steady distribution yields derived from long-term utility or concession revenues.',
        'Tariff Escalations: Inflation-indexed toll revisions or availability-based transmission tariffs.',
        'Return of Capital: Return of principal as project concession lifespans amortize over time.',
      ],
    },
    whatCanGoWrong: {
      title: 'Key Risks to Understand',
      items: [
        'Concession Expiry & Amortization: Asset value declining as remaining years on government concessions run down.',
        'Traffic Volume & GDP Sensitivity: Drop in highway commercial freight or commuter traffic during economic slumps.',
        'Regulatory & Tariff Revisions: Policy changes or regulatory delays in tariff determinations.',
        'Refinancing & Interest Costs: Escalating borrowing costs on leveraged infrastructure projects.',
      ],
    },
    importantTerms: [
      {
        term: 'Concession Period',
        definition: 'The contractual duration granted by authorities (e.g. NHAI) to build, operate, and collect revenues from the asset.',
      },
      {
        term: 'Availability-Based Tariff',
        definition: 'Tariffs paid for keeping power lines operational regardless of actual power transmitted (lower volume risk).',
      },
      {
        term: 'BOT (Build-Operate-Transfer)',
        definition: 'Contractual model where the trust operates the asset for a fixed period before handing it back to the government.',
      },
      {
        term: 'NDCF',
        definition: 'Net Distributable Cash Flows generated from project SPVs; subject to 90% mandatory distribution.',
      },
    ],
    questionsToResearch: [
      'Are the underlying assets toll-based (traffic risk) or availability-based (transmission tariff)?',
      'What is the weighted average remaining concession life of the asset portfolio?',
      'What is the credit rating of the InvIT (most AAA rated for senior debt)?',
      'How does the InvIT plan to replace expiring assets with new acquisitions?',
    ],
    commonMisconceptions: [
      {
        myth: 'An InvIT unit price will always appreciate like blue-chip stocks.',
        reality: 'If an InvIT holds BOT toll concessions without adding new projects, its underlying asset value decreases as the concession ends.',
      },
      {
        myth: 'Toll road revenues are completely immune to economic slowdowns.',
        reality: 'Commercial freight and trucking volumes are closely correlated with industrial GDP growth and fuel price cycles.',
      },
      {
        myth: 'InvITs are only accessible to ultra-wealthy institutional investors.',
        reality: 'SEBI reduced the minimum trading lot to 1 unit in 2021, making publicly listed InvITs fully accessible to retail investors.',
      },
    ],
    illustrativeExample: {
      title: 'Hypothetical Educational Illustration',
      description:
        'An investor holds 1,000 units of a power transmission InvIT purchased at ₹100 per unit (₹1,00,000 invested). The InvIT distributes ₹9 per unit over the year (9.0% distribution yield), consisting of ₹3 dividend, ₹4 interest, and ₹2 capital return. The capital return component reduces the unitholder’s cost basis for future capital gains calculations.',
      disclaimer: 'Purely hypothetical mathematical illustration for education. Not an indicator or guarantee of past or future yields.',
    },
  },

  bond: {
    id: 'bond',
    name: 'Bonds & Fixed Income Securities',
    shortName: 'Bonds',
    tagline: 'Contractual debt instruments providing defined coupon income, credit risk, and maturity redemption',
    iconName: 'Link2',
    sebiRegulations: 'Regulated under SEBI (Issue and Listing of Non-Convertible Securities) Regulations, 2021 & RBI',
    whatItIs:
      'A bond is a debt instrument where an investor lends capital to a borrower (either the Central Government, State Governments, or a Corporation) for a defined period at a predetermined coupon interest rate. Indian debt instruments include Government Securities (G-Secs), State Development Loans (SDLs), Public Sector Undertaking (PSU) Bonds, and Corporate Non-Convertible Debentures (NCDs).',
    howExposureWorks:
      'Unlike equities (which represent ownership) or REITs/InvITs (which distribute trust surplus), a bond is a contractual loan obligation. The issuer is legally bound to pay periodic coupon interest (annually, semi-annually, or monthly) and repay the principal face value at maturity.',
    distributionMechanism:
      'Coupon payments are contractually fixed as a percentage of the bond’s face value (par value, typically ₹1,000 or ₹1,00,000 in India). For example, a bond with a ₹1,000 face value and an 8.0% annual coupon pays exactly ₹80 per year until maturity.',
    liquidityConsiderations:
      'While bonds are listed on the debt segments of the NSE and BSE, secondary market trading volume for retail-sized lots of corporate bonds in India can be low. Retail investors often hold bonds until maturity or access liquid debt via Target Maturity Mutual Funds or G-Sec platforms (like RBI Retail Direct).',
    interestRateSensitivity:
      'Direct inverse relationship (Duration Risk). When general interest rates in the economy rise, newly issued bonds offer higher coupons. Consequently, existing bonds paying lower coupons drop in market price so that their effective yield matches prevailing market rates. The longer the maturity, the steeper the price decline.',
    whyNotGuaranteed:
      'Bonds are NOT completely risk-free. While Central Government G-Secs carry sovereign backing with virtually zero credit default risk, corporate bonds carry credit risk. If a corporate issuer suffers insolvency or debt distress, interest payments can be delayed or principal can be lost (as witnessed in historical Indian corporate debt defaults).',
    differencesSummary:
      'Bonds have legal priority over equity and REIT/InvIT unitholders in the capital structure during liquidation. However, bond returns are capped at the contracted coupon and do not benefit from company revenue growth or inflation.',
    howItWorks: {
      title: 'How Bonds Work in India',
      items: [
        'Issuer floats a bond issue with a defined Face Value (e.g. ₹1,000), Coupon Rate (e.g. 7.5%), and Maturity Date.',
        'SEBI-registered Credit Rating Agencies (CRISIL, ICRA, CARE, India Ratings) assign a credit rating (AAA down to D).',
        'Investors subscribe during the public issue or purchase on the secondary exchange.',
        'Issuer deposits periodic coupon interest directly into the investor’s bank account.',
        'On the maturity date, the issuer redeems the bond by returning the face value to the investor.',
      ],
    },
    whereReturnsComeFrom: {
      title: 'Return Components for Investors',
      items: [
        'Contractual Coupon Interest: Predetermined regular cash interest payments.',
        'Yield to Maturity (YTM): Total anticipated return if bought at a discount/premium and held until maturity.',
        'Capital Gains: Selling the bond above purchase price on the exchange when market interest rates fall.',
      ],
    },
    whatCanGoWrong: {
      title: 'Key Risks to Understand',
      items: [
        'Credit / Default Risk: The issuing company failing to pay coupon or redeem principal due to insolvency.',
        'Interest Rate (Duration) Risk: Market prices of long-tenure bonds falling during RBI rate hike cycles.',
        'Liquidity Risk: Inability to sell a corporate bond on the exchange before maturity without accepting a steep price discount.',
        'Inflation Risk: Fixed coupon returns failing to keep pace with retail inflation, eroding real purchasing power.',
      ],
    },
    importantTerms: [
      {
        term: 'Coupon Rate vs Yield',
        definition: 'Coupon is the fixed contract percentage on face value; Yield (YTM) is the actual return factoring in the market purchase price.',
      },
      {
        term: 'Maturity Date & Face Value',
        definition: 'The date on which the issuer repays the original nominal loan amount (face value).',
      },
      {
        term: 'Credit Rating (AAA to D)',
        definition: 'Independent assessment of default probability. AAA represents highest safety; D indicates default.',
      },
      {
        term: 'Duration',
        definition: 'A measure of how sensitive a bond’s market price is to a 1% change in prevailing interest rates.',
      },
    ],
    questionsToResearch: [
      'What is the credit rating of the bond, and has it been placed on a negative watch list?',
      'Is the bond secured by specific company assets or unsecured subordinated debt?',
      'What is the Yield to Maturity (YTM) compared to a risk-free Government Security of identical tenure?',
      'Is there a call option that allows the issuer to prematurely redeem the bond if interest rates decline?',
    ],
    commonMisconceptions: [
      {
        myth: 'All bonds are completely guaranteed and risk-free.',
        reality: 'Only Central Government G-Secs carry sovereign safety. Corporate bonds carry credit default risk that increases with lower credit ratings.',
      },
      {
        myth: 'If interest rates rise, my bond’s coupon payment decreases.',
        reality: 'The contracted coupon remains fixed. It is the bond’s market trading price on the secondary exchange that falls.',
      },
      {
        myth: 'You cannot sell a bond before its maturity date.',
        reality: 'Listed bonds can be traded on secondary exchanges, though liquidity and bid-ask spreads vary widely.',
      },
    ],
    illustrativeExample: {
      title: 'Hypothetical Educational Illustration',
      description:
        'An investor buys an AAA-rated corporate bond with a ₹1,00,000 face value, a 5-year tenure, and an 8.0% annual coupon. Each year, the investor receives ₹8,000 in coupon interest. At the end of Year 5, the issuer repays the ₹1,00,000 principal. If the investor needed to sell after Year 2 during a sharp RBI interest rate hike cycle, the bond might only fetch ₹96,000 on the secondary market.',
      disclaimer: 'Purely hypothetical mathematical illustration for education. Not an indicator or guarantee of past or future yields.',
    },
  },
};

export const COMPARISON_MATRIX: ComparisonRow[] = [
  {
    dimension: 'Nature of Underlying Asset',
    equity: 'Direct equity shares of listed companies',
    reit: 'Grade-A commercial real estate (offices, tech parks, malls)',
    invit: 'Infrastructure assets (toll highways, power transmission, telecom)',
    bonds: 'Contractual loans to Government or Corporate issuers',
  },
  {
    dimension: 'Mechanism for Generating Income',
    equity: 'Corporate profits distributed at board discretion as dividends',
    reit: 'Mandatory >=90% payout of Net Distributable Cash Flow from commercial rentals',
    invit: 'Mandatory >=90% payout of Net Distributable Cash Flow from toll & transmission tariffs',
    bonds: 'Contractually fixed coupon interest paid on face value',
  },
  {
    dimension: 'Main Return Components',
    equity: 'Capital price appreciation + periodic dividends',
    reit: 'Quarterly cash distributions (7–8% typical) + moderate unit appreciation',
    invit: 'Periodic cash distributions (8–10% typical) + return of capital amortization',
    bonds: 'Fixed regular coupon payments + face value repayment at maturity',
  },
  {
    dimension: 'Sensitivity to Interest Rates',
    equity: 'Indirect (affects corporate borrowing cost and valuation multiples)',
    reit: 'High (yield spread vs 10-year G-Sec directly influences unit pricing)',
    invit: 'High (large debt servicing costs on project SPVs)',
    bonds: 'Direct inverse relationship (bond market prices fall when interest rates rise)',
  },
  {
    dimension: 'Is Income Guaranteed?',
    equity: 'NO. Dividends are completely discretionary.',
    reit: 'NO. Distributions fluctuate with tenant occupancies and costs.',
    invit: 'NO. Cash flows vary with traffic volume and project operating costs.',
    bonds: 'NO. Promised contractually, but subject to issuer credit default risk.',
  },
  {
    dimension: 'Secondary Market Liquidity',
    equity: 'Very High on NSE / BSE',
    reit: 'Moderate on NSE / BSE (1 unit lot size)',
    invit: 'Moderate to Low on NSE / BSE (1 unit lot size)',
    bonds: 'Low to Moderate for retail lots on secondary exchange debt segments',
  },
  {
    dimension: 'Primary Investment Risks',
    equity: 'Market volatility, business competition, macroeconomic cycles',
    reit: 'Tenant lease expiries, interest rate hikes, office desk demand shifts',
    invit: 'Concession expiry amortization, traffic fluctuations, tariff revisions',
    bonds: 'Issuer credit default, interest rate duration risk, inflation erosion',
  },
  {
    dimension: 'Key Research Checklist',
    equity: 'P/E ratio, revenue growth, ROCE, debt-to-equity, management quality',
    reit: 'Occupancy rate, WALE, tenant credit quality, NDCF breakdown, cap rate',
    invit: 'Concession lifespan remaining, availability rate, debt rating, NDCF stability',
    bonds: 'Credit rating (AAA vs A), YTM, issuer debt profile, security backing',
  },
];
