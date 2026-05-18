export const STRATEGY_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'] as const;

export type StrategyColor = (typeof STRATEGY_COLORS)[number];
