import { CURATED_FINANCIALS } from '@/lib/research/financials';
export interface ResearchService { getFinancials(symbol: string): typeof CURATED_FINANCIALS[string] }
export const researchService: ResearchService = { getFinancials: symbol => CURATED_FINANCIALS[symbol.toUpperCase()] || [] };
