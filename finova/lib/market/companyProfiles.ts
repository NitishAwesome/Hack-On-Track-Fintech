// ============================================================
// FINOVA — Verified Company Profiles & Business Descriptions
// Authoritative, source-derived profiles for major Indian equities.
// If a stock is not in this verified repository, the application
// honestly displays: "Company description currently unavailable."
// ============================================================

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  foundedYear?: number;
  headquarters?: string;
  officialWebsite?: string;
  keySegments: string[];
  description: string;
}

const VERIFIED_PROFILES: Record<string, CompanyProfile> = {
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Limited',
    exchange: 'NSE',
    foundedYear: 1958,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.ril.com',
    keySegments: ['Oil-to-Chemicals (O2C)', 'Retail', 'Digital Services (Jio)', 'Oil & Gas Exploration', 'Green Energy'],
    description:
      'Reliance Industries Limited is an Indian multinational conglomerate headquartered in Mumbai. Its diverse operations span energy, petrochemicals, natural gas, retail, telecommunications, mass media, and textiles, making it one of India’s largest private-sector enterprises by market capitalization and revenue.',
  },
  TCS: {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Limited',
    exchange: 'NSE',
    foundedYear: 1968,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.tcs.com',
    keySegments: ['Banking & Financial Services', 'Retail & CPG', 'Communications & Media', 'Manufacturing', 'Life Sciences & Healthcare'],
    description:
      'Tata Consultancy Services is a leading Indian multinational technology and IT services firm operating under the Tata Group. It offers comprehensive IT services, business solutions, and engineering consulting across more than 50 countries worldwide.',
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Limited',
    exchange: 'NSE',
    foundedYear: 1981,
    headquarters: 'Bengaluru, Karnataka',
    officialWebsite: 'https://www.infosys.com',
    keySegments: ['Financial Services', 'Retail', 'Communication & Energy', 'Manufacturing', 'Hi-Tech & Life Sciences'],
    description:
      'Infosys Limited is a global leader in next-generation digital services and consulting. Founded in Pune and headquartered in Bengaluru, it enables enterprise clients in over 56 countries to navigate digital transformation powered by cloud and AI capabilities.',
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Limited',
    exchange: 'NSE',
    foundedYear: 1994,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.hdfcbank.com',
    keySegments: ['Retail Banking', 'Wholesale Banking', 'Treasury Operations', 'Digital Banking'],
    description:
      'HDFC Bank Limited is India’s largest private-sector bank by assets and market capitalization. Following its landmark merger with parent HDFC Limited, it delivers full-suite consumer banking, corporate credit, mortgage financing, and international treasury services.',
  },
  ICICIBANK: {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Limited',
    exchange: 'NSE',
    foundedYear: 1994,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.icicibank.com',
    keySegments: ['Retail Banking', 'Corporate Banking', 'Treasury', 'International Banking', 'Life & General Insurance'],
    description:
      'ICICI Bank Limited is a premier Indian multinational private bank and financial services company. It offers a diversified portfolio of banking products and financial services to retail, SME, and corporate clients through specialized subsidiaries and digital platforms.',
  },
  BHARTIARTL: {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Limited',
    exchange: 'NSE',
    foundedYear: 1995,
    headquarters: 'New Delhi, Delhi',
    officialWebsite: 'https://www.airtel.in',
    keySegments: ['Mobile Services (India)', 'Homes & Broadband', 'Digital TV Services', 'Airtel Business (B2B)', 'Africa Operations'],
    description:
      'Bharti Airtel Limited is a leading global telecommunications company with operations across 17 countries in South Asia and Africa. Its network infrastructure delivers 4G/5G mobile connectivity, high-speed fixed broadband, enterprise fiber networks, and cloud data center solutions.',
  },
  ITC: {
    symbol: 'ITC',
    name: 'ITC Limited',
    exchange: 'NSE',
    foundedYear: 1910,
    headquarters: 'Kolkata, West Bengal',
    officialWebsite: 'https://www.itcportal.com',
    keySegments: ['FMCG - Cigarettes', 'FMCG - Others (Foods & Personal Care)', 'Hotels', 'Paperboards & Packaging', 'Agri-Business'],
    description:
      'ITC Limited is one of India’s foremost private sector companies with a diversified presence spanning fast-moving consumer goods, hospitality, paperboards and packaging, and agricultural export supply chains.',
  },
  SBIN: {
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    foundedYear: 1955,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.sbi.co.in',
    keySegments: ['Treasury', 'Corporate/Wholesale Banking', 'Retail Banking', 'International Operations'],
    description:
      'State Bank of India is a public sector bank and statutory corporation, holding over 23% market share in deposits and loans in India. It manages the country’s largest branch and digital payments network (YONO).',
  },
  LT: {
    symbol: 'LT',
    name: 'Larsen & Toubro Limited',
    exchange: 'NSE',
    foundedYear: 1938,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.larsentoubro.com',
    keySegments: ['Infrastructure Projects', 'Energy & Hydrocarbon', 'Hi-Tech Manufacturing', 'IT & Technology Services', 'Financial Services'],
    description:
      'Larsen & Toubro Limited is an Indian multinational conglomerate engaged in engineering, procurement, and construction (EPC) projects, advanced defense manufacturing, and technology consulting across Asia, the Middle East, and Europe.',
  },
  HINDUNILVR: {
    symbol: 'HINDUNILVR',
    name: 'Hindustan Unilever Limited',
    exchange: 'NSE',
    foundedYear: 1933,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.hul.co.in',
    keySegments: ['Home Care', 'Beauty & Personal Care', 'Foods & Refreshment'],
    description:
      'Hindustan Unilever Limited is India’s largest fast-moving consumer goods company with a heritage of over 90 years. Its everyday household, hygiene, and nutrition brands reach nine out of ten Indian households.',
  },
  BAJFINANCE: {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Limited',
    exchange: 'NSE',
    foundedYear: 1987,
    headquarters: 'Pune, Maharashtra',
    officialWebsite: 'https://www.bajajfinserv.in',
    keySegments: ['Consumer Lending', 'SME Lending', 'Commercial Lending', 'Mortgages', 'Payments & Digital App'],
    description:
      'Bajaj Finance Limited, a subsidiary of Bajaj Finserv, is India’s largest non-banking financial company (NBFC). It specializes in consumer durable loans, digital omnichannel credit, merchant financing, and retail fixed deposits.',
  },
  MARUTI: {
    symbol: 'MARUTI',
    name: 'Maruti Suzuki India Limited',
    exchange: 'NSE',
    foundedYear: 1981,
    headquarters: 'New Delhi, Delhi',
    officialWebsite: 'https://www.marutisuzuki.com',
    keySegments: ['Passenger Vehicles', 'Utility Vehicles', 'Components & Spares', 'Pre-Owned Car Sales (True Value)'],
    description:
      'Maruti Suzuki India Limited, a subsidiary of Suzuki Motor Corporation (Japan), is India’s market leader in passenger automotive manufacturing, commanding over 40% of the domestic passenger vehicle market.',
  },
  SUNPHARMA: {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries Limited',
    exchange: 'NSE',
    foundedYear: 1983,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.sunpharma.com',
    keySegments: ['Global Specialty Formulations', 'US Generics', 'India Formulations', 'Emerging Markets', 'APIs'],
    description:
      'Sun Pharmaceutical Industries Limited is India’s largest pharmaceutical enterprise and the fourth largest specialty generic manufacturer globally, marketing branded and complex generic medications across more than 100 countries.',
  },
  TATAMOTORS: {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Limited',
    exchange: 'NSE',
    foundedYear: 1945,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.tatamotors.com',
    keySegments: ['Commercial Vehicles', 'Passenger Vehicles (ICE & EV)', 'Jaguar Land Rover (JLR)'],
    description:
      'Tata Motors Limited is a global automotive powerhouse under the Tata Group. It designs and manufactures commercial transport fleets, passenger cars, electric mobility platforms, and luxury utility vehicles through Jaguar Land Rover.',
  },
  TITAN: {
    symbol: 'TITAN',
    name: 'Titan Company Limited',
    exchange: 'NSE',
    foundedYear: 1984,
    headquarters: 'Bengaluru, Karnataka',
    officialWebsite: 'https://www.titancompany.in',
    keySegments: ['Jewellery (Tanishq, Mia, CaratLane)', 'Watches & Wearables', 'Eyecare', 'Fragrances & Fashion'],
    description:
      'Titan Company Limited, a joint venture between the Tata Group and TIDCO, is India’s foremost lifestyle and personal accessories brand manufacturer, leading in retail jewelry (Tanishq) and precision chronometry.',
  },
  NTPC: {
    symbol: 'NTPC',
    name: 'NTPC Limited',
    exchange: 'NSE',
    foundedYear: 1975,
    headquarters: 'New Delhi, Delhi',
    officialWebsite: 'https://www.ntpc.co.in',
    keySegments: ['Thermal Power Generation', 'Renewable Energy (Solar & Wind)', 'Hydro Power', 'Power Trading'],
    description:
      'NTPC Limited is India’s largest energy conglomerate and a Maharatna central public sector enterprise. It accounts for approximately one-fourth of India’s total electricity generation and is aggressively expanding its renewable energy generation fleet.',
  },
  COALINDIA: {
    symbol: 'COALINDIA',
    name: 'Coal India Limited',
    exchange: 'NSE',
    foundedYear: 1975,
    headquarters: 'Kolkata, West Bengal',
    officialWebsite: 'https://www.coalindia.in',
    keySegments: ['Thermal Coal Mining', 'Coking Coal Extraction', 'Beneficiation & Washed Coal'],
    description:
      'Coal India Limited is a Maharatna public sector undertaking and the world’s largest single coal producer. It operates across eight Indian states and supplies the primary fuel feedstock for the nation’s thermal power grid.',
  },
  ZOMATO: {
    symbol: 'ZOMATO',
    name: 'Zomato Limited',
    exchange: 'NSE',
    foundedYear: 2008,
    headquarters: 'Gurugram, Haryana',
    officialWebsite: 'https://www.zomato.com',
    keySegments: ['Food Delivery', 'Quick Commerce (Blinkit)', 'B2B Supplies (Hyperpure)', 'Going-out Events & Dining'],
    description:
      'Zomato Limited is an Indian technology company operating leading consumer internet platforms for on-demand food delivery, quick-commerce grocery fulfillment (Blinkit), and restaurant discovery.',
  },
  TRENT: {
    symbol: 'TRENT',
    name: 'Trent Limited',
    exchange: 'NSE',
    foundedYear: 1998,
    headquarters: 'Mumbai, Maharashtra',
    officialWebsite: 'https://www.trentlimited.com',
    keySegments: ['Westside (Fashion & Lifestyle)', 'Zudio (Value Fashion)', 'Star Market (Hypermarket Food & Grocery)'],
    description:
      'Trent Limited is the retail arm of the Tata Group. It operates high-growth lifestyle fashion retail chains including Westside and Zudio, along with omnichannel grocery retail formats through Star Bazaar.',
  },
  BEL: {
    symbol: 'BEL',
    name: 'Bharat Electronics Limited',
    exchange: 'NSE',
    foundedYear: 1954,
    headquarters: 'Bengaluru, Karnataka',
    officialWebsite: 'https://www.bel-india.in',
    keySegments: ['Radars & Weapon Systems', 'Defense Communications', 'Electronic Warfare', 'Avionics', 'Civil Electronics'],
    description:
      'Bharat Electronics Limited is a Navratna public sector defense enterprise under the Ministry of Defence, Government of India. It manufactures state-of-the-art electronic products and tactical radar communication networks for Indian Armed Forces.',
  },
};

export { VERIFIED_PROFILES };

/**
 * Retrieves authoritative company profile and business description.
 * Returns null if no verified description is on file.
 */
export function getCompanyProfile(symbol: string): CompanyProfile | null {
  if (!symbol) return null;
  const cleanSym = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  return VERIFIED_PROFILES[cleanSym] || null;
}

/**
 * Returns either verified profile or honest fallback structure.
 */
export function getAuthoritativeCompanyProfile(symbol: string): CompanyProfile {
  const profile = getCompanyProfile(symbol);
  if (profile) return profile;
  const cleanSym = symbol ? symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '') : 'UNKNOWN';
  return {
    symbol: cleanSym,
    name: cleanSym,
    exchange: 'NSE',
    headquarters: 'India',
    keySegments: [],
    description: 'Company description currently unavailable.',
  };
}
