// ============================================================
// FINOVA — AI Intelligence Chat Types
// types/chat.ts
//
// Structured models for conversational financial research,
// source citations, portfolio grounding, and persistent history.
// ============================================================

export type AIChatRole = 'user' | 'assistant' | 'system';

export type AIChatSourceCategory =
  | 'portfolio'
  | 'xray'
  | 'risk_radar'
  | 'future_lab'
  | 'market_quote'
  | 'news'
  | 'sebi'
  | 'educational';

export interface AIChatSource {
  id: string;
  title: string;
  url?: string;
  publisher?: string;
  timestamp?: string;
  sourceCategory: AIChatSourceCategory;
  dataFreshness?: string;
  temporalNote?: string;
  relevantHolding?: string;
}

export interface PortfolioMetricSnapshot {
  totalInvested?: number;
  currentValuation?: number | null;
  pnl?: number | null;
  pnlPct?: number | null;
  topHolding?: string;
  topHoldingWeight?: number;
  riskLabel?: string;
  riskScore?: number;
  quoteCoveragePct?: number;
  hhi?: number;
  brokerCount?: number;
  holdingCount?: number;
  unpricedCount?: number;
}

export interface StockComparisonSnapshot {
  symbol: string;
  name: string;
  price: number | null;
  changePct: number | null;
  peRatio?: number | null;
  marketCap?: string | null;
  sector?: string | null;
  industry?: string | null;
  high52?: number | null;
  low52?: number | null;
  sourceTimestamp?: string | null;
  dataProvider?: string;
}

export interface SimulationSnapshot {
  scenarioTitle?: string;
  simulatedCapital?: number;
  additionalContribution?: number;
  equityPct?: number;
  bondPct?: number;
  goldPct?: number;
  keyTakeaway?: string;
}

export interface AIChatMessageMetadata {
  portfolioMetrics?: PortfolioMetricSnapshot;
  stockComparison?: StockComparisonSnapshot[];
  simulationResult?: SimulationSnapshot;
  persistenceStatus?: 'persisted' | 'session_fallback' | 'pending_migration';
  modelUsed?: string;
  intentCategory?: string;
  queryLatencyMs?: number;
}

export interface AIChatMessage {
  id: string;
  conversation_id: string;
  role: AIChatRole;
  content: string;
  sources?: AIChatSource[];
  metadata?: AIChatMessageMetadata;
  created_at: string;
  isPending?: boolean;
  isError?: boolean;
}

export interface AIChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message_preview?: string;
}

export interface ChatSendRequest {
  conversationId?: string;
  message: string;
  contextMode?: 'auto' | 'portfolio' | 'market' | 'news' | 'simulation' | 'education';
}

export interface ChatSendResponse {
  conversation: AIChatConversation;
  userMessage: AIChatMessage;
  assistantMessage: AIChatMessage;
  persistenceStatus: 'persisted' | 'session_fallback' | 'pending_migration';
  persistenceMessage?: string;
}
