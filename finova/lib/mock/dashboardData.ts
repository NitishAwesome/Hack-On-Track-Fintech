import {
  PortfolioSummaryData,
  AllocationSegment,
  HoldingItem,
  DiscoverInsightItem,
  MarketIndexItem,
  NewsItem,
  ChartDataPoint,
} from '@/types/dashboard';

// ─── Chart Data Generators for Time Ranges ────────────────────
const generate1DData = (): ChartDataPoint[] => [
  { timestamp: '09:15', label: '09:15', value: 2465000 },
  { timestamp: '10:00', label: '10:00', value: 2471200 },
  { timestamp: '11:00', label: '11:00', value: 2469400 },
  { timestamp: '12:00', label: '12:00', value: 2476800 },
  { timestamp: '13:00', label: '13:00', value: 2474100 },
  { timestamp: '14:00', label: '14:00', value: 2482300 },
  { timestamp: '14:45', label: '14:45', value: 2480500 },
  { timestamp: '15:30', label: '15:30', value: 2486420 },
];

const generate1WData = (): ChartDataPoint[] => [
  { timestamp: 'Mon', label: 'Mon', value: 2435000 },
  { timestamp: 'Tue', label: 'Tue', value: 2442000 },
  { timestamp: 'Wed', label: 'Wed', value: 2439800 },
  { timestamp: 'Thu', label: 'Thu', value: 2461000 },
  { timestamp: 'Fri', label: 'Fri', value: 2486420 },
];

const generate1MData = (): ChartDataPoint[] => [
  { timestamp: 'Week 1', label: 'W1', value: 2380000 },
  { timestamp: 'Week 2', label: 'W2', value: 2410500 },
  { timestamp: 'Week 3', label: 'W3', value: 2428900 },
  { timestamp: 'Week 4', label: 'W4', value: 2486420 },
];

const generateYTDData = (): ChartDataPoint[] => [
  { timestamp: 'Jan', label: 'Jan', value: 2190000 },
  { timestamp: 'Feb', label: 'Feb', value: 2245000 },
  { timestamp: 'Mar', label: 'Mar', value: 2280000 },
  { timestamp: 'Apr', label: 'Apr', value: 2340000 },
  { timestamp: 'May', label: 'May', value: 2395000 },
  { timestamp: 'Jun', label: 'Jun', value: 2486420 },
];

const generate1YData = (): ChartDataPoint[] => [
  { timestamp: 'Oct', label: 'Oct 23', value: 1892000 },
  { timestamp: 'Dec', label: 'Dec 23', value: 1980000 },
  { timestamp: 'Feb', label: 'Feb 24', value: 2095000 },
  { timestamp: 'Apr', label: 'Apr 24', value: 2210000 },
  { timestamp: 'Jun', label: 'Jun 24', value: 2345000 },
  { timestamp: 'Aug', label: 'Aug 24', value: 2410000 },
  { timestamp: 'Oct', label: 'Oct 24', value: 2486420 },
];

const generateAllData = (): ChartDataPoint[] => [
  { timestamp: '2021', label: '2021', value: 1250000 },
  { timestamp: '2022', label: '2022', value: 1540000 },
  { timestamp: '2023', label: '2023', value: 1920000 },
  { timestamp: '2024', label: '2024', value: 2486420 },
];

// ─── Portfolio Summary Data ───────────────────────────────────
export const MOCK_PORTFOLIO_SUMMARY: PortfolioSummaryData = {
  totalValue: 2486420,
  formattedTotalValue: '₹24,86,420',
  overallReturnAmount: 221400,
  overallReturnPercentage: 18.38,
  oneYearReturnPercentage: 31.4,
  todayChangeAmount: 18234,
  todayChangePercentage: 0.74,
  currency: 'INR',
  chartDataByRange: {
    '1D': generate1DData(),
    '1W': generate1WData(),
    '1M': generate1MData(),
    'YTD': generateYTDData(),
    '1Y': generate1YData(),
    'All': generateAllData(),
  },
};

// ─── Asset Allocation Segments ────────────────────────────────
export const MOCK_ALLOCATION_SEGMENTS: AllocationSegment[] = [
  {
    id: 'stocks',
    category: 'Stocks',
    name: 'Stocks',
    percentage: 46,
    value: 1143753,
    color: '#06b6d4', // Cyan
    itemCount: 8,
  },
  {
    id: 'bonds',
    category: 'Bonds',
    name: 'Bonds',
    percentage: 18,
    value: 447555,
    color: '#6366f1', // Indigo / Blue
    itemCount: 2,
  },
  {
    id: 'reits',
    category: 'REITs',
    name: 'REITs',
    percentage: 12,
    value: 298370,
    color: '#f59e0b', // Amber
    itemCount: 2,
  },
  {
    id: 'invits',
    category: 'InvITs',
    name: 'InvITs',
    percentage: 8,
    value: 198913,
    color: '#8b5cf6', // Purple
    itemCount: 1,
  },
  {
    id: 'mutual_funds',
    category: 'Mutual Funds',
    name: 'Mutual Funds',
    percentage: 10,
    value: 248642,
    color: '#10b981', // Emerald
    itemCount: 3,
  },
  {
    id: 'cash',
    category: 'Cash',
    name: 'Cash',
    percentage: 6,
    value: 149187,
    color: '#f43f5e', // Coral
    itemCount: 1,
  },
];

// ─── Holdings Data ────────────────────────────────────────────
export const MOCK_HOLDINGS: HoldingItem[] = [
  {
    id: 'rel',
    name: 'Reliance Industries',
    symbol: 'NSE: RELIANCE',
    exchange: 'NSE',
    category: 'Stocks',
    currentValue: 428100,
    change24hPercentage: 2.3,
    change24hAmount: 9630,
    portfolioWeightPercentage: 20,
    avatarColor: '#0284c7', // Sky Blue
    avatarInitial: 'R',
    shares: 143,
  },
  {
    id: 'tcs',
    name: 'TCS',
    symbol: 'NSE: TCS',
    exchange: 'NSE',
    category: 'Stocks',
    currentValue: 395200,
    change24hPercentage: -0.7,
    change24hAmount: -2780,
    portfolioWeightPercentage: 16,
    avatarColor: '#059669', // Emerald
    avatarInitial: 'T',
    shares: 99,
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    symbol: 'NSE: ICICIBANK',
    exchange: 'NSE',
    category: 'Stocks',
    currentValue: 145000,
    change24hPercentage: 1.8,
    change24hAmount: 2560,
    portfolioWeightPercentage: 12,
    avatarColor: '#f59e0b', // Orange/Amber
    avatarInitial: 'I',
    shares: 114,
  },
  {
    id: 'embassy',
    name: 'Embassy Office Parks REIT',
    symbol: 'NSE: EMBASSY',
    exchange: 'NSE',
    category: 'REITs',
    currentValue: 298400,
    change24hPercentage: 1.2,
    change24hAmount: 3540,
    portfolioWeightPercentage: 12,
    avatarColor: '#8b5cf6', // Violet
    avatarInitial: 'E',
    shares: 770,
  },
  {
    id: 'pginvit',
    name: 'PowerGrid InvIT',
    symbol: 'NSE: PGINVIT',
    exchange: 'NSE',
    category: 'InvITs',
    currentValue: 198900,
    change24hPercentage: 0.6,
    change24hAmount: 1180,
    portfolioWeightPercentage: 8,
    avatarColor: '#ec4899', // Pink
    avatarInitial: 'P',
    shares: 1745,
  },
  {
    id: 'gs2033',
    name: '7.26% GS 2033 Govt Bond',
    symbol: 'NSE: 726GS2033',
    exchange: 'NSE',
    category: 'Bonds',
    currentValue: 447500,
    change24hPercentage: 0.3,
    change24hAmount: 1340,
    portfolioWeightPercentage: 18,
    avatarColor: '#6366f1', // Indigo
    avatarInitial: 'B',
    shares: 4350,
  },
  {
    id: 'nifty50',
    name: 'Nifty 50 Index Fund',
    symbol: 'MF: NIFTY50',
    exchange: 'MF',
    category: 'Mutual Funds',
    currentValue: 248640,
    change24hPercentage: 0.9,
    change24hAmount: 2220,
    portfolioWeightPercentage: 10,
    avatarColor: '#14b8a6', // Teal
    avatarInitial: 'N',
    shares: 1120,
  },
  {
    id: 'cash_reserves',
    name: 'Liquid Cash & Reserves',
    symbol: 'RBI: LIQUID',
    exchange: 'RBI',
    category: 'Cash',
    currentValue: 149180,
    change24hPercentage: 0.0,
    change24hAmount: 0,
    portfolioWeightPercentage: 6,
    avatarColor: '#64748b', // Slate
    avatarInitial: 'C',
    shares: 1,
  },
];

// ─── Discover & Insight Items ─────────────────────────────────
export const MOCK_DISCOVER_INSIGHTS: DiscoverInsightItem[] = [
  {
    id: 'ai-concentration',
    tag: 'PORTFOLIO ANALYSIS',
    badgeVariant: 'warning',
    title: 'AI Portfolio Insight',
    description: 'Your banking exposure is relatively concentrated.',
    category: 'Risk Diagnostic',
    actionText: 'View Details',
    actionHref: '/analysis',
    metadata: 'Portfolio Analysis',
  },
  {
    id: 'beyond-stocks',
    tag: 'BEYOND STOCKS',
    badgeVariant: 'info',
    title: 'Diversify Beyond Equities',
    description: 'Learn how REITs and InvITs can diversify a portfolio.',
    category: 'Alternative Assets',
    actionText: 'Explore Alternatives',
    actionHref: '/learn',
    metadata: 'Asset Education',
  },
  {
    id: 'bond-explorer',
    tag: 'FIXED INCOME',
    badgeVariant: 'brand',
    title: 'Bond Explorer',
    description: 'Understand fixed-income options for steady capital yields.',
    category: 'Debt Instruments',
    actionText: 'View Bonds',
    actionHref: '/bonds',
    metadata: 'Yield Analysis',
  },
];

// ─── Market Indices (Market Pulse) ────────────────────────────
export const MOCK_MARKET_INDICES: MarketIndexItem[] = [
  {
    id: 'nifty50',
    name: 'Nifty 50',
    currentValue: 24180.5,
    changeAmount: 142.3,
    changePercentage: 0.59,
    state: 'Open',
    lastUpdated: '15:30 IST',
  },
  {
    id: 'sensex',
    name: 'Sensex',
    currentValue: 79486.25,
    changeAmount: 412.1,
    changePercentage: 0.52,
    state: 'Open',
    lastUpdated: '15:30 IST',
  },
  {
    id: 'banknifty',
    name: 'Bank Nifty',
    currentValue: 51320.15,
    changeAmount: -88.4,
    changePercentage: -0.17,
    state: 'Open',
    lastUpdated: '15:30 IST',
  },
];

// ─── News Items ───────────────────────────────────────────────
export const MOCK_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-1',
    headline: 'ICICI Bank reports strong quarterly performance with 14.5% credit growth',
    source: 'Financial Express',
    publishedTimeAgo: '12 min ago',
    relatedAsset: 'Relevant to your portfolio',
    sentiment: 'positive',
    url: '#',
  },
  {
    id: 'news-2',
    headline: 'RBI holds repo rate steady; Sovereign bond yields soften to 6.94%',
    source: 'Livemint',
    publishedTimeAgo: '42 min ago',
    relatedAsset: '7.26% GS 2033 Bond',
    sentiment: 'neutral',
    url: '#',
  },
  {
    id: 'news-3',
    headline: 'SEBI lowers minimum trading lot size for REITs and InvITs to boost retail participation',
    source: 'Economic Times',
    publishedTimeAgo: '2 hours ago',
    relatedAsset: 'REITs & InvITs',
    sentiment: 'positive',
    url: '#',
  },
];
